# react-native-vbump

A CLI tool to automatically increment version numbers for React Native projects

[![npm version](https://badge.fury.io/js/react-native-vbump.svg)](https://badge.fury.io/js/react-native-vbump)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🤖 **Android support**: Updates `versionCode` and `versionName` in `build.gradle`
- 🍎 **iOS support**: Updates `CURRENT_PROJECT_VERSION` and `MARKETING_VERSION` in `project.pbxproj`
- 📁 **Multiple file support**: Configure multiple Android/iOS files via config file
- 👆🏼 **Interactive mode**: Professional prompts using Inquirer.js
- ✅ **Dry-run mode**: Preview changes without making modifications
- 🎛️ **Granular control**: Update specific version components individually

## 🚀 Installation

### Global Installation (Recommended)
```bash
npm install -g react-native-vbump
```

### Using npx (No Installation)
```bash
npx react-native-vbump
```

### Project Installation
```bash
npm install --save-dev react-native-vbump
```

## 📖 Usage

### Quick Start

```bash
# Run in any React Native project directory
react-native-vbump

# Or use the short alias
rnvb

# Using npx (no installation required)
npx react-native-vbump
```

### Interactive Mode

The tool provides an interactive mode with professional prompts:

1. **Auto-detect** your React Native project
2. **Choose platforms** to update (Android, iOS, or both)
3. **Select increment type** (patch, minor, major)
4. **Confirm changes** before applying

## ⚙️ Configuration (Optional)

The tool works out-of-the-box with standard React Native projects. Optionally, create a `vbump.config.js` file in your project root to customize file paths:

```javascript
export default {
  android: {
    files: [
      'android/app/build.gradle',
      'android/library/build.gradle',
      // Add more Android modules
    ]
  },
  ios: {
    files: [
      // Auto-detect all .xcodeproj files
      'ios/*.xcodeproj/project.pbxproj',
      // Or specify explicit paths
      'ios/MyApp.xcodeproj/project.pbxproj',
      'ios/MyAppExtension.xcodeproj/project.pbxproj'
    ]
  },
  packageJson: 'package.json'
};
```

Supported config file names:
- `vbump.config.js`
- `vbump.config.json`
- `.vbump.config.js`
- `.vbump.config.json`

## 🎯 Auto-Detection

The tool automatically detects React Native projects by:

1. **Searching upward** from current directory
2. **Checking package.json** for React Native dependencies
3. **Verifying structure** (android/ios directories exist)
4. **Loading configuration** if available

## 📋 Command Options

| Option                            | Description                                                   |
| --------------------------------- | ------------------------------------------------------------- |
| `-p, --project-path <path>`       | Path to React Native project (auto-detected if not specified) |
| `-c, --config <path>`             | Path to configuration file                                    |
| `-a, --android`                   | Update Android versions only                                  |
| `-i, --ios`                       | Update iOS versions only                                      |
| `--build-numbers`                 | Update only build numbers (both platforms)                    |
| `--android-build-number [number]` | Update only Android build number (versionCode)                |
| `--android-app-version [version]` | Update only Android app version (versionName)                 |
| `--ios-build-number [number]`     | Update only iOS build number (CURRENT_PROJECT_VERSION)        |
| `--ios-app-version [version]`     | Update only iOS app version (MARKETING_VERSION)               |
| `--increment <type>`              | Increment type: major, minor, patch (default: patch)          |
| `--dry-run`                       | Preview changes without applying them                         |

## 📊 Examples

### Basic Usage
```bash
# Interactive mode with auto-detection
npx react-native-vbump

# Update both platforms with patch increment
npx react-native-vbump --android --ios

# Preview changes
npx react-native-vbump --dry-run
```

### Granular Updates
```bash
# Update only Android build number
npx react-native-vbump --android-build-number

# Update only iOS app version
npx react-native-vbump --ios-app-version "2.1.0"

# Update build numbers for both platforms
npx react-native-vbump --build-numbers
```

### CI/CD Integration
```bash
# Update build numbers for automated builds
npx react-native-vbump --build-numbers

# Update with specific version for release
npx react-native-vbump --android --ios --android-app-version "2.1.0" --ios-app-version "2.1.0"
```

### Custom Configuration
```bash
# Use custom config file
npx react-native-vbump --config ./build-configs/version.config.js

# Run from different directory
npx react-native-vbump --project-path ./my-rn-app
```

## 🔧 Version Logic

- **versionCode** (Android): Integer build number (e.g., 591 → 592)
- **versionName** (Android): Semantic version (e.g., "2.12.0" → "2.12.1")
- **CURRENT_PROJECT_VERSION** (iOS): Integer build number (e.g., 1 → 2)
- **MARKETING_VERSION** (iOS): Semantic version (e.g., "2.12.0" → "2.12.1")

## 🛠️ Development

```bash
# Clone repository
git clone https://github.com/junedomingo/react-native-vbump.git
cd react-native-vbump

# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## 📦 Requirements

- **Node.js**: 16.0.0 or higher
- **React Native project** with standard structure
- **Platform files**: `android/app/build.gradle` and/or `ios/*.xcodeproj/project.pbxproj`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[MIT](https://github.com/junedomingo/react-native-vbump?tab=MIT-1-ov-file) © [June Domingo](https://github.com/junedomingo)