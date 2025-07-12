import inquirer from 'inquirer';
import chalk from 'chalk';
import { incrementSemanticVersion } from './version.js';

/**
 * Prompt user to select which platforms to update
 * Provides interactive selection with descriptive options
 * @returns {Array<string>} Selected platforms array
 */
export async function promptForPlatformSelection() {
  const platformAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'platforms',
      message: chalk.white.bold('Which platform(s) would you like to update?'),
      choices: [
        {
          name: `Both platforms (app version + build number)`,
          value: ['android', 'ios'],
        },
        {
          name: `Android (app version + build number)`,
          value: ['android'],
        },
        {
          name: `iOS (app version + build number)`,
          value: ['ios'],
        },
        {
          name: `Both platforms (build numbers only)`,
          value: ['build-numbers-only'],
        },
        // Advanced options with technical details
        {
          name: `Android build number only (versionCode)`,
          value: ['android-code-only'],
        },
        {
          name: `iOS build number only (CURRENT_PROJECT_VERSION)`,
          value: ['ios-version-only'],
        },
      ],
      default: 0, // Default to "Both platforms"
    },
  ]);

  return platformAnswer.platforms;
}

/**
 * Prompt user to select version increment type
 * Provides clear examples of what each increment type does based on current version
 * @param {string} currentVersion - Current version to use for examples (fallback to generic if not provided)
 * @returns {string} Selected increment type
 */
export async function promptForIncrementType(currentVersion = '2.12.0') {
  // Generate dynamic examples based on current version
  let patchExample, minorExample, majorExample;

  try {
    patchExample = `${currentVersion} → ${incrementSemanticVersion(currentVersion, 'patch')}`;
    minorExample = `${currentVersion} → ${incrementSemanticVersion(currentVersion, 'minor')}`;
    majorExample = `${currentVersion} → ${incrementSemanticVersion(currentVersion, 'major')}`;
  } catch (error) {
    // Fallback to generic examples if current version is invalid
    patchExample = '2.12.0 → 2.12.1';
    minorExample = '2.12.0 → 2.13.0';
    majorExample = '2.12.0 → 3.0.0';
  }

  const incrementAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'increment',
      message: chalk.white.bold('What type of version increment?'),
      choices: [
        {
          name: `🔧 Patch (${patchExample}) - Bug fixes`,
          value: 'patch',
        },
        {
          name: `⬆️  Minor (${minorExample}) - New features`,
          value: 'minor',
        },
        {
          name: `🚀 Major (${majorExample}) - Breaking changes`,
          value: 'major',
        },
      ],
      default: 0, // Default to patch
    },
  ]);

  return incrementAnswer.increment;
}

/**
 * Prompt user for confirmation before making changes
 * Safety prompt to prevent accidental file modifications
 * @returns {boolean} True if user confirms, false if cancelled
 */
export async function promptForConfirmation() {
  const confirmAnswer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message: chalk.cyan('Are you sure you want to proceed with the version update?'),
      default: false,
    },
  ]);

  return confirmAnswer.proceed;
}
