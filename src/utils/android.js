import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { calculateNewSemanticVersion, calculateNewBuildNumber } from './version.js';
import { updatePackageJsonVersion } from './packageJson.js';

/**
 * Update Android versions in multiple build.gradle files
 * Supports updating both versionCode and versionName or individually
 * @param {Array<string>} files - Array of build.gradle file paths
 * @param {number|boolean} versionCode - New version code or true for auto-increment
 * @param {string|boolean|null} versionName - New version name, true for auto-increment, or null to skip
 * @param {Object} options - Configuration options including dry run, project root, etc.
 * @returns {Array<Object>} Results for each file processed
 */
export async function updateAndroidVersions(files, versionCode, versionName, options = {}) {
  const results = [];

  for (const filePath of files) {
    const result = await processAndroidFile(filePath, versionCode, versionName, options);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Process a single Android build.gradle file for version updates
 * Handles file reading, version extraction, updating, and writing
 * @param {string} filePath - Path to build.gradle file
 * @param {number|boolean} versionCode - New version code or true for auto-increment
 * @param {string|boolean|null} versionName - New version name, true for auto-increment, or null to skip
 * @param {Object} options - Configuration options
 * @returns {Object|null} Result object or null if processing failed
 */
async function processAndroidFile(filePath, versionCode, versionName, options) {
  if (!fs.existsSync(filePath)) {
    console.warn(chalk.yellow(`⚠️  Android build.gradle not found: ${filePath}`));
    return null;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Extract current version values from file content
  const currentVersionCode = content.match(/versionCode\s+(\d+)/)?.[1];
  const currentVersionName = content.match(/versionName\s+"([^"]+)"/)?.[1];

  if (!currentVersionCode || !currentVersionName) {
    console.warn(chalk.yellow(`⚠️  Could not find version values in: ${filePath}`));
    return null;
  }

  console.log(
    chalk.cyan.bold(
      `Processing Android file: ${path.relative(options.projectRoot || process.cwd(), filePath)}`
    )
  );

  // Calculate new version values
  const newVersionCode = calculateNewBuildNumber(versionCode, currentVersionCode);
  const newVersionName =
    versionName !== null
      ? calculateNewSemanticVersion(versionName, currentVersionName, options.increment || 'patch')
      : currentVersionName;

  // Update file content with new versions
  content = updateAndroidFileContent(content, newVersionCode, newVersionName, versionName !== null);

  // Write updated content back to file (unless dry run)
  if (!options.dryRun) {
    fs.writeFileSync(filePath, content);
  }

  // Record changes for summary display
  recordAndroidChanges(
    filePath,
    currentVersionCode,
    newVersionCode,
    currentVersionName,
    newVersionName,
    versionName !== null,
    options
  );

  // Update package.json if this is the first Android file processed and versionName was updated
  if (!options.packageJsonUpdated && options.packageJsonPath && versionName !== null) {
    await updatePackageJsonVersion(options.packageJsonPath, newVersionName, options);
    options.packageJsonUpdated = true;
  }

  return {
    filePath,
    versionCode: newVersionCode,
    versionName: newVersionName,
  };
}

/**
 * Update the content of build.gradle file with new version values
 * Performs regex replacements for versionCode and optionally versionName
 * @param {string} content - Original file content
 * @param {number} newVersionCode - New version code value
 * @param {string} newVersionName - New version name value
 * @param {boolean} updateVersionName - Whether to update versionName
 * @returns {string} Updated file content
 */
function updateAndroidFileContent(content, newVersionCode, newVersionName, updateVersionName) {
  // Always update versionCode
  content = content.replace(/versionCode\s+\d+/, `versionCode ${newVersionCode}`);

  // Update versionName only if requested
  if (updateVersionName) {
    content = content.replace(/versionName\s+"[^"]+"/, `versionName "${newVersionName}"`);
  }

  return content;
}

/**
 * Record Android version changes for summary display
 * Tracks changes to both versionCode and versionName for final report
 * @param {string} filePath - Path to the file that was modified
 * @param {string} oldVersionCode - Previous version code
 * @param {number} newVersionCode - New version code
 * @param {string} oldVersionName - Previous version name
 * @param {string} newVersionName - New version name
 * @param {boolean} versionNameUpdated - Whether version name was actually updated
 * @param {Object} options - Configuration options containing changes array
 */
function recordAndroidChanges(
  filePath,
  oldVersionCode,
  newVersionCode,
  oldVersionName,
  newVersionName,
  versionNameUpdated,
  options
) {
  options.changes = options.changes || [];

  // Always record versionCode changes
  options.changes.push({
    platform: 'Android',
    file: path.relative(options.projectRoot || process.cwd(), filePath),
    item: 'versionCode',
    oldValue: oldVersionCode,
    newValue: newVersionCode,
  });

  // Record versionName changes only if it was updated
  if (versionNameUpdated) {
    options.changes.push({
      platform: 'Android',
      file: path.relative(options.projectRoot || process.cwd(), filePath),
      item: 'versionName',
      oldValue: oldVersionName,
      newValue: newVersionName,
    });
  }
}

/**
 * Parse Android version information from build.gradle file
 * Utility function for reading current version values without updating
 * @param {string} filePath - Path to build.gradle file
 * @returns {Object} Object with versionCode and versionName, or null values if not found
 * @throws {Error} If file doesn't exist
 */
export function parseAndroidVersions(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Android build.gradle not found at: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  const versionCodeMatch = content.match(/versionCode\s+(\d+)/);
  const versionNameMatch = content.match(/versionName\s+"([^"]+)"/);

  return {
    versionCode: versionCodeMatch ? parseInt(versionCodeMatch[1]) : null,
    versionName: versionNameMatch ? versionNameMatch[1] : null,
  };
}
