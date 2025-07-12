import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// Default configuration for React Native projects
const DEFAULT_CONFIG = {
  android: {
    files: ['android/app/build.gradle'],
  },
  ios: {
    files: ['ios/*.xcodeproj/project.pbxproj'],
  },
  packageJson: 'package.json',
};

/**
 * Auto-detect React Native project by searching upward from current directory
 * Looks for package.json with React Native dependencies and typical project structure
 * @param {string} startDir - Directory to start searching from
 * @returns {string|null} Project root path or null if not found
 */
export async function detectReactNativeProject(startDir = process.cwd()) {
  let currentDir = startDir;
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const packageJsonPath = path.join(currentDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // Check if it's a React Native project by looking for RN dependencies
        if (hasReactNativeDependencies(packageJson)) {
          // Verify typical RN structure exists (at least one platform directory)
          const androidPath = path.join(currentDir, 'android');
          const iosPath = path.join(currentDir, 'ios');

          if (fs.existsSync(androidPath) || fs.existsSync(iosPath)) {
            return currentDir;
          }
        }
      } catch (error) {
        // Invalid package.json, continue searching upward
      }
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Check if package.json contains React Native dependencies
 * Looks for react-native or related packages in dependencies or devDependencies
 * @param {Object} packageJson - Parsed package.json content
 * @returns {boolean} True if React Native dependencies found
 */
function hasReactNativeDependencies(packageJson) {
  const reactNativePackages = ['react-native', '@react-native-community/cli', 'react-native-cli'];

  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  return reactNativePackages.some((pkg) => allDependencies[pkg]);
}

/**
 * Load project configuration from config file or use defaults
 * Searches for various config file formats and merges with defaults
 * @param {string} projectRoot - Root directory of the project
 * @param {string} customConfigPath - Optional custom config file path
 * @returns {Object} Configuration object with android, ios, and packageJson settings
 */
export async function loadProjectConfiguration(projectRoot, customConfigPath = null) {
  // If custom config path provided, try to load it first
  if (customConfigPath) {
    const config = await loadConfigFromPath(customConfigPath);
    if (config) {
      return { ...DEFAULT_CONFIG, ...config };
    }
  }

  // Search for standard config files
  const configFiles = [
    'version-up.config.js',
    'version-up.config.json',
    '.version-up.config.js',
    '.version-up.config.json',
  ];

  for (const configFile of configFiles) {
    const configPath = path.join(projectRoot, configFile);
    const config = await loadConfigFromPath(configPath);
    if (config) {
      return { ...DEFAULT_CONFIG, ...config };
    }
  }

  return DEFAULT_CONFIG;
}

/**
 * Load configuration from a specific file path
 * Handles both JavaScript and JSON config files
 * @param {string} configPath - Path to config file
 * @returns {Object|null} Configuration object or null if loading failed
 */
async function loadConfigFromPath(configPath) {
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    if (configPath.endsWith('.js')) {
      // For ES modules, use dynamic import
      const configModule = await import(configPath);
      return configModule.default;
    } else {
      // For JSON files, read and parse
      const configContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configContent);
    }
  } catch (error) {
    console.warn(
      chalk.yellow(
        `Warning: Could not load config from ${path.basename(configPath)}: ${error.message}`
      )
    );
    return null;
  }
}

/**
 * Get default configuration object
 * Utility function to access default settings
 * @returns {Object} Default configuration
 */
export function getDefaultConfig() {
  return { ...DEFAULT_CONFIG };
}
