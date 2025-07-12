import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { detectReactNativeProject, loadProjectConfiguration } from './utils/detection.js';
import { resolveFilePaths } from './utils/files.js';
import { parsePackageJsonVersion } from './utils/packageJson.js';
import { updateAndroidVersions } from './utils/android.js';
import { updateIOSVersions } from './utils/ios.js';
import { handleUserCancellation, displayResults, showNextSteps } from './utils/ui.js';
import {
  promptForPlatformSelection,
  promptForIncrementType,
  promptForConfirmation,
} from './utils/prompts.js';

// Load package.json
const packageJsonPath = new URL('../package.json', import.meta.url);
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const program = new Command();

/**
 * Map user-friendly CLI options to technical terms for internal use
 * This allows us to use clean option names while preserving technical accuracy
 */
function mapOptionsToTechnicalTerms(options) {
  return {
    ...options,
    // Map user-friendly options to technical terms
    versionCode: options.androidBuildNumber,
    versionName: options.androidAppVersion,
    currentProjectVersion: options.iosBuildNumber,
    marketingVersion: options.iosAppVersion,
  };
}

/**
 * Main function to handle platform selection and version updates
 * Orchestrates the entire version bump process including auto-detection,
 * user prompts, and file updates
 */
async function executeVersionBump(userOptions) {
  try {
    console.log(chalk.blue.bold('react-native-vbump') + '\n');

    // Map user-friendly options to technical terms
    const options = mapOptionsToTechnicalTerms(userOptions);

    // Auto-detect React Native project
    const projectRoot = options.projectPath || (await detectReactNativeProject());

    if (!projectRoot) {
      console.log(chalk.red.bold('❌ Error:'), chalk.red('Could not detect React Native project.'));
      console.log(
        chalk.gray(
          'Make sure you are in a React Native project directory or specify --project-path.'
        )
      );
      process.exit(1);
    }

    console.log(chalk.green(`✅ Detected React Native project: ${projectRoot}`));

    // Load configuration from project
    const config = await loadProjectConfiguration(projectRoot, options.config);
    options.projectRoot = projectRoot;

    // Resolve file paths using configuration
    const androidFiles = resolveFilePaths(config.android.files, projectRoot);
    const iosFiles = resolveFilePaths(config.ios.files, projectRoot);
    const packageJsonPath = path.join(projectRoot, config.packageJson);

    if (androidFiles.length === 0 && iosFiles.length === 0) {
      console.log(chalk.red.bold('❌ Error:'), chalk.red('No Android or iOS files found.'));
      console.log(chalk.gray('Check your file paths or create a vbump.config.js file.'));
      process.exit(1);
    }

    console.log(
      chalk.gray(`Found ${androidFiles.length} Android file(s), ${iosFiles.length} iOS file(s)`)
    );

    options.packageJsonPath = packageJsonPath;
    options.changes = [];

    // Determine which platforms to update based on options or user input
    const platforms = await determinePlatformsToUpdate(options);

    // Validate that the requested platforms have the necessary files
    const needsAndroidFiles = platforms.some(
      (p) => p.includes('android') || p === 'build-numbers-only'
    );
    const needsIOSFiles = platforms.some((p) => p.includes('ios') || p === 'build-numbers-only');

    if (needsAndroidFiles && androidFiles.length === 0) {
      console.log(chalk.red.bold('❌ Error:'), chalk.red('No Android or iOS files found.'));
      console.log(chalk.gray('Check your file paths or create a vbump.config.js file.'));
      process.exit(1);
    }

    if (needsIOSFiles && iosFiles.length === 0) {
      console.log(chalk.red.bold('❌ Error:'), chalk.red('No Android or iOS files found.'));
      console.log(chalk.gray('Check your file paths or create a vbump.config.js file.'));
      process.exit(1);
    }

    // Get increment type from options or user input
    const incrementType = await determineIncrementType(options, platforms);
    options.increment = incrementType;

    // Confirm changes before proceeding (unless dry run)
    await confirmChangesIfNeeded(options);

    // Execute platform updates based on selection
    await executePlatformUpdates(platforms, androidFiles, iosFiles, options);

    // Display results and next steps
    displayResults(options.changes);
    showNextSteps(options);
  } catch (error) {
    handleUserCancellation(error);
    console.log(chalk.red.bold('❌ Error:'), chalk.red(error.message));
    process.exit(1);
  }
}

/**
 * Determine which platforms to update based on command line options
 * or interactive user selection
 */
async function determinePlatformsToUpdate(options) {
  // Return platforms based on command line flags
  if (options.android && options.ios) {
    return ['android', 'ios'];
  } else if (options.android) {
    return ['android'];
  } else if (options.ios) {
    return ['ios'];
  } else if (options.androidBuildNumber !== undefined) {
    return ['android-code-only'];
  } else if (options.androidAppVersion !== undefined) {
    return ['android-name-only'];
  } else if (options.iosBuildNumber !== undefined) {
    return ['ios-version-only'];
  } else if (options.iosAppVersion !== undefined) {
    return ['ios-marketing-only'];
  } else if (options.buildNumbers) {
    return ['build-numbers-only'];
  }

  // No flags provided, prompt user for platform selection
  try {
    return await promptForPlatformSelection();
  } catch (error) {
    handleUserCancellation(error);
    throw error;
  }
}

/**
 * Determine increment type based on options or user input
 * Only prompts user if semantic versions will be updated
 */
async function determineIncrementType(options, platforms) {
  // Check if user explicitly provided --increment flag
  const userProvidedIncrement = process.argv.includes('--increment');

  // If user provided --increment, use it
  if (userProvidedIncrement) {
    return options.increment || 'patch';
  }

  // Check if user provided specific versions (not just flags)
  const hasSpecificVersions =
    (options.androidAppVersion && typeof options.androidAppVersion === 'string') ||
    (options.iosAppVersion && typeof options.iosAppVersion === 'string');

  // Skip prompting if user provided specific versions
  if (hasSpecificVersions) {
    return 'patch'; // Default, but won't be used since specific versions are provided
  }

  // Check if we're updating app versions (not just build numbers)
  const updatingAppVersions =
    platforms.includes('android') ||
    platforms.includes('ios') ||
    platforms.includes('android-name-only') ||
    platforms.includes('ios-marketing-only');

  // Show prompt if we're updating app versions (even in dry-run mode)
  if (updatingAppVersions) {
    // Skip prompting in test environment
    if (process.env.NODE_ENV === 'test') {
      return 'patch'; // Default for tests
    }

    try {
      // Get current version from package.json to show in prompt examples
      let currentVersion = '0.1.0'; // fallback
      try {
        if (options.packageJsonPath) {
          const packageVersionInfo = parsePackageJsonVersion(options.packageJsonPath);
          if (packageVersionInfo.version) {
            currentVersion = packageVersionInfo.version;
          }
        }
      } catch (error) {
        // Use fallback version if package.json can't be read
        console.log(
          chalk.gray('⚠️  Could not read current version from package.json, using generic examples')
        );
      }

      return await promptForIncrementType(currentVersion);
    } catch (error) {
      handleUserCancellation(error);
      throw error;
    }
  }

  // Default fallback
  return 'patch';
}

/**
 * Show confirmation prompt for non-dry-run operations
 * to prevent accidental file modifications
 */
async function confirmChangesIfNeeded(options) {
  if (!options.dryRun) {
    // Skip confirmation prompt in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    console.log(chalk.yellow.bold('\n⚠️  You are about to modify version files!'));

    try {
      const shouldProceed = await promptForConfirmation();
      if (!shouldProceed) {
        console.log(chalk.gray('\nOperation cancelled by user.'));
        process.exit(0);
      }
    } catch (error) {
      handleUserCancellation(error);
      throw error;
    }
  }
}

/**
 * Execute the actual platform updates based on user selection
 * Handles all different update scenarios (Android, iOS, both, partial)
 */
async function executePlatformUpdates(platforms, androidFiles, iosFiles, options) {
  // Update Android (full: both versionCode and versionName)
  if (platforms.includes('android')) {
    await updateAndroidVersions(androidFiles, options.versionCode, options.versionName, options);
  }

  // Update Android versionCode only
  if (platforms.includes('android-code-only')) {
    await updateAndroidVersions(
      androidFiles,
      options.versionCode,
      null, // versionName is not updated for code-only updates
      options
    );
  }

  // Update Android versionName only
  if (platforms.includes('android-name-only')) {
    await updateAndroidVersions(
      androidFiles,
      null, // versionCode is not updated for name-only updates
      options.versionName,
      options
    );
  }

  // Update iOS (full: both CURRENT_PROJECT_VERSION and MARKETING_VERSION)
  if (platforms.includes('ios')) {
    await updateIOSVersions(
      iosFiles,
      options.currentProjectVersion,
      options.marketingVersion,
      options
    );
  }

  // Update iOS CURRENT_PROJECT_VERSION only
  if (platforms.includes('ios-version-only')) {
    await updateIOSVersions(
      iosFiles,
      options.currentProjectVersion,
      null, // marketingVersion is not updated for version-only updates
      options
    );
  }

  // Update iOS MARKETING_VERSION only
  if (platforms.includes('ios-marketing-only')) {
    await updateIOSVersions(
      iosFiles,
      null, // currentProjectVersion is not updated for marketing-only updates
      options.marketingVersion,
      options
    );
  }

  // Update both build numbers only (versionCode + CURRENT_PROJECT_VERSION)
  if (platforms.includes('build-numbers-only')) {
    await updateAndroidVersions(
      androidFiles,
      options.versionCode,
      null, // versionName is not updated for build numbers only
      options
    );
    await updateIOSVersions(
      iosFiles,
      options.currentProjectVersion,
      null, // marketingVersion is not updated for build numbers only
      options
    );
  }
}

/**
 * Configure and setup the CLI program with all available options
 * Defines command line interface, options, and help text
 */
function setupCliProgram() {
  program
    .name('react-native-vbump')
    .description('A CLI tool to bump version numbers for React Native Android and iOS projects')
    .version(packageJson.version)
    .option(
      '-p, --project-path <path>',
      'path to React Native project (auto-detected if not specified)'
    )
    .option('-c, --config <path>', 'path to configuration file')

    // Platform selection options
    .option('-a, --android', 'update Android (app version + build number)')
    .option('-i, --ios', 'update iOS (app version + build number)')
    .option('--build-numbers', 'update build numbers only (internal versioning for both platforms)')

    // Granular update options - these imply "only" behavior
    .option(
      '--android-build-number [number]',
      'update Android build number only (versionCode) - auto-increment if no number provided'
    )
    .option(
      '--android-app-version [version]',
      'update Android app version only (versionName) - auto-increment patch if no version provided'
    )
    .option(
      '--ios-build-number [number]',
      'update iOS build number only (CURRENT_PROJECT_VERSION) - auto-increment if no number provided'
    )
    .option(
      '--ios-app-version [version]',
      'update iOS app version only (MARKETING_VERSION) - auto-increment patch if no version provided'
    )

    // Other options
    .option('--increment <type>', 'version increment type for app versions (major, minor, patch)')
    .option('--dry-run', 'show what would be updated without making changes')
    .action((options) => {
      executeVersionBump(options);
    });

  return program;
}

// Initialize and run the CLI program
const cliProgram = setupCliProgram();
cliProgram.parse(process.argv);

// Export functions for testing
export {
  executeVersionBump,
  determinePlatformsToUpdate,
  determineIncrementType,
  confirmChangesIfNeeded,
  executePlatformUpdates,
  setupCliProgram,
};
