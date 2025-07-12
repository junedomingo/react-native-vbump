import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

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
  try {
    // If custom config path provided, try to load it first
    if (customConfigPath) {
      const config = await loadConfigFromPath(customConfigPath);
      if (config) {
        return mergeConfigs(DEFAULT_CONFIG, config);
      }
    }

    // Search for standard config files
    const configFiles = [
      'vbump.config.js',
      'vbump.config.json',
      '.vbump.config.js',
      '.vbump.config.json',
    ];

    for (const configFile of configFiles) {
      const configPath = path.join(projectRoot, configFile);
      const config = await loadConfigFromPath(configPath);
      if (config) {
        return mergeConfigs(DEFAULT_CONFIG, config);
      }
    }

    return getDefaultConfig();
  } catch (error) {
    // If any error occurs during configuration loading, fall back to default
    console.warn(
      chalk.yellow(`Warning: Error loading configuration, using defaults: ${error.message}`)
    );
    return getDefaultConfig();
  }
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
    let config;
    if (configPath.endsWith('.js')) {
      // For ES modules, use dynamic import with file URL
      const configUrl = pathToFileURL(configPath).href;
      const configModule = await import(configUrl);
      config = configModule.default;
    } else {
      // For JSON files, read and parse
      const configContent = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(configContent);
    }

    // Validate that the loaded config is a valid configuration object
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      console.warn(
        chalk.yellow(
          `Warning: Invalid configuration in ${path.basename(configPath)}: must be an object`
        )
      );
      return null;
    }

    return config;
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
 * Deep merge two configuration objects
 * @param {Object} defaultConfig - Default configuration
 * @param {Object} userConfig - User configuration
 * @returns {Object} Merged configuration
 */
function mergeConfigs(defaultConfig, userConfig) {
  const result = {};

  // Merge each top-level key
  for (const key in defaultConfig) {
    if (userConfig[key] && typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
      result[key] = { ...defaultConfig[key], ...userConfig[key] };
    } else if (userConfig[key] !== undefined) {
      result[key] = userConfig[key];
    } else {
      result[key] = Array.isArray(defaultConfig[key])
        ? [...defaultConfig[key]]
        : typeof defaultConfig[key] === 'object'
          ? { ...defaultConfig[key] }
          : defaultConfig[key];
    }
  }

  // Add any keys that exist in userConfig but not in defaultConfig
  for (const key in userConfig) {
    if (!(key in defaultConfig)) {
      result[key] = userConfig[key];
    }
  }

  return result;
}

/**
 * Get default configuration object
 * Utility function to access default settings
 * @returns {Object} Default configuration (deep copy)
 */
export function getDefaultConfig() {
  return {
    android: {
      files: [...DEFAULT_CONFIG.android.files],
    },
    ios: {
      files: [...DEFAULT_CONFIG.ios.files],
    },
    packageJson: DEFAULT_CONFIG.packageJson,
  };
}
