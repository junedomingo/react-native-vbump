import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { calculateNewSemanticVersion, calculateNewBuildNumber } from './version.js';
import { updatePackageJsonVersion } from './packageJson.js';

/**
 * Update iOS versions in multiple project.pbxproj files
 * Supports updating both CURRENT_PROJECT_VERSION and MARKETING_VERSION or individually
 * @param {Array<string>} files - Array of project.pbxproj file paths
 * @param {number|boolean} currentProjectVersion - New project version or true for auto-increment
 * @param {string|boolean|null} marketingVersion - New marketing version, true for auto-increment, or null to skip
 * @param {Object} options - Configuration options including dry run, project root, etc.
 * @returns {Array<Object>} Results for each file processed
 */
export async function updateIOSVersions(
  files,
  currentProjectVersion,
  marketingVersion,
  options = {}
) {
  const results = [];

  for (const filePath of files) {
    const result = await processIOSFile(filePath, currentProjectVersion, marketingVersion, options);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Process a single iOS project.pbxproj file for version updates
 * Handles file reading, version extraction, updating, and writing
 * @param {string} filePath - Path to project.pbxproj file
 * @param {number|boolean} currentProjectVersion - New project version or true for auto-increment
 * @param {string|boolean|null} marketingVersion - New marketing version, true for auto-increment, or null to skip
 * @param {Object} options - Configuration options
 * @returns {Object|null} Result object or null if processing failed
 */
async function processIOSFile(filePath, currentProjectVersion, marketingVersion, options) {
  if (!fs.existsSync(filePath)) {
    console.warn(chalk.yellow(`⚠️  iOS project.pbxproj not found: ${filePath}`));
    return null;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Find current values (there might be multiple occurrences in the file)
  const currentProjectVersionMatches = content.match(/CURRENT_PROJECT_VERSION = (\d+);/g);
  const marketingVersionMatches = content.match(/MARKETING_VERSION = ([^;]+);/g);

  if (!currentProjectVersionMatches || !marketingVersionMatches) {
    console.warn(chalk.yellow(`⚠️  Could not find version values in: ${filePath}`));
    return null;
  }

  // Extract the first occurrence values for processing
  const currentProjectVersionValue = currentProjectVersionMatches[0].match(/(\d+)/)[1];
  const marketingVersionValue = marketingVersionMatches[0].match(/MARKETING_VERSION = ([^;]+);/)[1];

  console.log(
    chalk.cyan.bold(
      `Processing iOS file: ${path.relative(options.projectRoot || process.cwd(), filePath)}`
    )
  );

  // Calculate new version values
  const newCurrentProjectVersion =
    currentProjectVersion !== null
      ? calculateNewBuildNumber(currentProjectVersion, currentProjectVersionValue)
      : parseInt(currentProjectVersionValue);
  const newMarketingVersion =
    marketingVersion !== null
      ? calculateNewSemanticVersion(
          marketingVersion,
          marketingVersionValue,
          options.increment || 'patch'
        )
      : marketingVersionValue;

  // Update file content with new versions (updates all occurrences)
  content = updateIOSFileContent(
    content,
    newCurrentProjectVersion,
    newMarketingVersion,
    currentProjectVersion !== null,
    marketingVersion !== null
  );

  // Write updated content back to file (unless dry run)
  if (!options.dryRun) {
    fs.writeFileSync(filePath, content);
  }

  // Record changes for summary display
  recordIOSChanges(
    filePath,
    currentProjectVersionValue,
    newCurrentProjectVersion,
    marketingVersionValue,
    newMarketingVersion,
    currentProjectVersion !== null,
    marketingVersion !== null,
    options
  );

  // Update package.json if this is the first iOS file processed and marketingVersion was updated
  if (!options.packageJsonUpdated && options.packageJsonPath && marketingVersion !== null) {
    await updatePackageJsonVersion(options.packageJsonPath, newMarketingVersion, options);
    options.packageJsonUpdated = true;
  }

  return {
    filePath,
    currentProjectVersion: newCurrentProjectVersion,
    marketingVersion: newMarketingVersion,
  };
}

/**
 * Update the content of project.pbxproj file with new version values
 * Performs regex replacements for CURRENT_PROJECT_VERSION and optionally MARKETING_VERSION
 * Updates all occurrences in the file to maintain consistency
 * @param {string} content - Original file content
 * @param {number} newCurrentProjectVersion - New current project version value
 * @param {string} newMarketingVersion - New marketing version value
 * @param {boolean} updateCurrentProjectVersion - Whether to update CURRENT_PROJECT_VERSION
 * @param {boolean} updateMarketingVersion - Whether to update MARKETING_VERSION
 * @returns {string} Updated file content
 */
function updateIOSFileContent(
  content,
  newCurrentProjectVersion,
  newMarketingVersion,
  updateCurrentProjectVersion,
  updateMarketingVersion
) {
  // Update CURRENT_PROJECT_VERSION only if requested (all occurrences)
  if (updateCurrentProjectVersion) {
    content = content.replace(
      /CURRENT_PROJECT_VERSION = \d+;/g,
      `CURRENT_PROJECT_VERSION = ${newCurrentProjectVersion};`
    );
  }

  // Update MARKETING_VERSION only if requested (all occurrences)
  if (updateMarketingVersion) {
    content = content.replace(
      /MARKETING_VERSION = [^;]+;/g,
      `MARKETING_VERSION = ${newMarketingVersion};`
    );
  }

  return content;
}

/**
 * Record iOS version changes for summary display
 * Tracks changes to both CURRENT_PROJECT_VERSION and MARKETING_VERSION for final report
 * @param {string} filePath - Path to the file that was modified
 * @param {string} oldCurrentProjectVersion - Previous current project version
 * @param {number} newCurrentProjectVersion - New current project version
 * @param {string} oldMarketingVersion - Previous marketing version
 * @param {string} newMarketingVersion - New marketing version
 * @param {boolean} currentProjectVersionUpdated - Whether current project version was actually updated
 * @param {boolean} marketingVersionUpdated - Whether marketing version was actually updated
 * @param {Object} options - Configuration options containing changes array
 */
function recordIOSChanges(
  filePath,
  oldCurrentProjectVersion,
  newCurrentProjectVersion,
  oldMarketingVersion,
  newMarketingVersion,
  currentProjectVersionUpdated,
  marketingVersionUpdated,
  options
) {
  options.changes = options.changes || [];

  // Record CURRENT_PROJECT_VERSION changes only if it was updated
  if (currentProjectVersionUpdated) {
    options.changes.push({
      platform: 'iOS',
      file: path.relative(options.projectRoot || process.cwd(), filePath),
      item: 'CURRENT_PROJECT_VERSION',
      oldValue: oldCurrentProjectVersion,
      newValue: newCurrentProjectVersion,
    });
  }

  // Record MARKETING_VERSION changes only if it was updated
  if (marketingVersionUpdated) {
    options.changes.push({
      platform: 'iOS',
      file: path.relative(options.projectRoot || process.cwd(), filePath),
      item: 'MARKETING_VERSION',
      oldValue: oldMarketingVersion,
      newValue: newMarketingVersion,
    });
  }
}

/**
 * Parse iOS version information from project.pbxproj file
 * Utility function for reading current version values without updating
 * @param {string} filePath - Path to project.pbxproj file
 * @returns {Object} Object with currentProjectVersion and marketingVersion, or null values if not found
 * @throws {Error} If file doesn't exist
 */
export function parseIOSVersions(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`iOS project.pbxproj not found at: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  const currentProjectVersionMatch = content.match(/CURRENT_PROJECT_VERSION = (\d+);/);
  const marketingVersionMatch = content.match(/MARKETING_VERSION = ([^;]+);/);

  return {
    currentProjectVersion: currentProjectVersionMatch
      ? parseInt(currentProjectVersionMatch[1])
      : null,
    marketingVersion: marketingVersionMatch ? marketingVersionMatch[1] : null,
  };
}
