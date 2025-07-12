/**
 * Version parsing and increment utilities
 * Handles semantic versioning operations for version strings
 */

/**
 * Parse semantic version string into components
 * Validates version format and extracts major, minor, patch numbers
 * @param {string} versionString - Version string in format "major.minor.patch"
 * @returns {Object} Object with major, minor, patch as integers
 * @throws {Error} If version format is invalid
 */
export function parseSemanticVersion(versionString) {
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${versionString}`);
  }
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
  };
}

/**
 * Increment semantic version based on type
 * Supports major, minor, and patch increments with proper reset behavior
 * @param {string} version - Current version string
 * @param {string} type - Increment type: 'major', 'minor', or 'patch'
 * @returns {string} New incremented version string
 * @throws {Error} If increment type is invalid
 */
export function incrementSemanticVersion(version, type = 'patch') {
  const parsed = parseSemanticVersion(version);

  switch (type) {
    case 'major':
      parsed.major++;
      parsed.minor = 0;
      parsed.patch = 0;
      break;
    case 'minor':
      parsed.minor++;
      parsed.patch = 0;
      break;
    case 'patch':
      parsed.patch++;
      break;
    default:
      throw new Error(`Invalid increment type: ${type}`);
  }

  return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

/**
 * Calculate new version based on current value and user input
 * Handles both custom versions and auto-increment scenarios
 * @param {string|boolean} userValue - User provided value or true for auto-increment
 * @param {string} currentValue - Current version value
 * @param {string} incrementType - Type of increment for auto-increment
 * @returns {string} New version string
 */
export function calculateNewSemanticVersion(userValue, currentValue, incrementType = 'patch') {
  if (userValue && userValue !== true) {
    return userValue;
  }
  return incrementSemanticVersion(currentValue, incrementType);
}

/**
 * Calculate new build number based on current value and user input
 * Handles both custom build numbers and auto-increment scenarios
 * @param {number|boolean} userValue - User provided value or true for auto-increment
 * @param {string|number} currentValue - Current build number value
 * @returns {number} New build number
 */
export function calculateNewBuildNumber(userValue, currentValue) {
  if (userValue && userValue !== true) {
    return parseInt(userValue);
  }
  return parseInt(currentValue) + 1;
}
