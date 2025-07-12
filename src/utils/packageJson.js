import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

/**
 * Update package.json version to match mobile app versions
 * Ensures consistency between package.json and mobile platform versions
 * @param {string} packageJsonPath - Path to package.json file
 * @param {string} newVersion - New version string to set
 * @param {Object} options - Configuration options including dry run and changes tracking
 * @returns {Object|null} Result object with version, or null if failed
 */
export async function updatePackageJsonVersion(packageJsonPath, newVersion, options = {}) {
  if (!fs.existsSync(packageJsonPath)) {
    console.warn(chalk.yellow(`⚠️  package.json not found: ${packageJsonPath}`));
    return null;
  }

  const content = fs.readFileSync(packageJsonPath, 'utf8');
  const packageData = JSON.parse(content);

  const currentVersion = packageData.version;

  if (!currentVersion) {
    console.warn(chalk.yellow('⚠️  Could not find current version in package.json'));
    return null;
  }

  console.log(chalk.cyan.bold('Processing package.json version...'));

  // Update version in package data
  packageData.version = newVersion;

  // Write updated content back to file (unless dry run)
  if (!options.dryRun) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2) + '\n');
  }

  // Record change for summary display
  recordPackageJsonChange(packageJsonPath, currentVersion, newVersion, options);

  return { version: newVersion };
}

/**
 * Record package.json version change for summary display
 * Tracks version changes for final report
 * @param {string} packageJsonPath - Path to package.json file
 * @param {string} oldVersion - Previous version
 * @param {string} newVersion - New version
 * @param {Object} options - Configuration options containing changes array
 */
function recordPackageJsonChange(packageJsonPath, oldVersion, newVersion, options) {
  options.changes = options.changes || [];
  options.changes.push({
    platform: 'Package.json',
    file: path.relative(options.projectRoot || process.cwd(), packageJsonPath),
    item: 'version',
    oldValue: oldVersion,
    newValue: newVersion,
  });
}

/**
 * Parse package.json version information
 * Utility function for reading current version without updating
 * @param {string} packageJsonPath - Path to package.json file
 * @returns {Object} Object with version, or null if not found
 * @throws {Error} If file doesn't exist or contains invalid JSON
 */
export function parsePackageJsonVersion(packageJsonPath) {
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found at: ${packageJsonPath}`);
  }

  const content = fs.readFileSync(packageJsonPath, 'utf8');
  const packageData = JSON.parse(content);

  return {
    version: packageData.version || null,
  };
}
