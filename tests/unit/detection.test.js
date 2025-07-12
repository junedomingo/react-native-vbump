import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  detectReactNativeProject,
  loadProjectConfiguration,
  getDefaultConfig,
} from '../../src/utils/detection.js';
import { createMockProject, createTempDir } from '../helpers/mockProject.js';

describe('Project Detection', () => {
  let tempDir, cleanup;

  beforeEach(async () => {
    const temp = await createTempDir();
    tempDir = temp.path;
    cleanup = temp.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('detectReactNativeProject', () => {
    test('detects basic React Native project', async () => {
      await createMockProject('basic', tempDir);

      const result = await detectReactNativeProject(tempDir);
      expect(result).toBe(tempDir);
    });

    test('detects iOS-only React Native project', async () => {
      await createMockProject('ios-only', tempDir);

      const result = await detectReactNativeProject(tempDir);
      expect(result).toBe(tempDir);
    });

    test('detects Android-only React Native project', async () => {
      await createMockProject('android-only', tempDir);

      const result = await detectReactNativeProject(tempDir);
      expect(result).toBe(tempDir);
    });

    test('returns null for non-React Native project', async () => {
      // Create a regular Node.js project without React Native
      await createMockProject('basic', tempDir);

      // Replace package.json with non-RN dependencies
      const fs = await import('fs/promises');
      const path = await import('path');
      await fs.writeFile(
        path.join(tempDir, 'package.json'),
        JSON.stringify(
          {
            name: 'test-node-app',
            version: '1.0.0',
            dependencies: {
              express: '^4.18.0',
              lodash: '^4.17.21',
            },
          },
          null,
          2
        )
      );

      const result = await detectReactNativeProject(tempDir);
      expect(result).toBe(null);
    });

    test('returns null for project with RN dependencies but no platform folders', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Create package.json with RN dependencies but no android/ios folders
      await fs.writeFile(
        path.join(tempDir, 'package.json'),
        JSON.stringify(
          {
            name: 'test-rn-app',
            version: '1.0.0',
            dependencies: {
              'react-native': '^0.73.0',
            },
          },
          null,
          2
        )
      );

      const result = await detectReactNativeProject(tempDir);
      expect(result).toBe(null);
    });

    test('searches up directory tree for React Native project', async () => {
      const path = await import('path');
      const fs = await import('fs/promises');

      // Create RN project in root
      await createMockProject('basic', tempDir);

      // Create nested directory
      const nestedDir = path.join(tempDir, 'nested', 'deep', 'folder');
      await fs.mkdir(nestedDir, { recursive: true });

      // Should find RN project in parent directory
      const result = await detectReactNativeProject(nestedDir);
      expect(result).toBe(tempDir);
    });

    test('handles corrupted package.json gracefully', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Create invalid JSON
      await fs.writeFile(path.join(tempDir, 'package.json'), '{ invalid json content');

      const result = await detectReactNativeProject(tempDir);
      expect(result).toBe(null);
    });
  });

  describe('loadProjectConfiguration', () => {
    test('loads default configuration when no config file exists', async () => {
      await createMockProject('basic', tempDir);

      const config = await loadProjectConfiguration(tempDir);

      expect(config).toEqual({
        android: {
          files: ['android/app/build.gradle'],
        },
        ios: {
          files: ['ios/*.xcodeproj/project.pbxproj'],
        },
        packageJson: 'package.json',
      });
    });

    test('loads custom JavaScript configuration', async () => {
      await createMockProject('custom-config', tempDir);

      const config = await loadProjectConfiguration(tempDir);

      expect(config.android.files).toContain('android/app/build.gradle');
      expect(config.android.files).toContain('android/library/build.gradle');
      expect(config.ios.files).toContain('ios/TestCustomConfigApp.xcodeproj/project.pbxproj');
    });

    test('loads custom configuration from specified path', async () => {
      const path = await import('path');
      const fs = await import('fs/promises');

      await createMockProject('basic', tempDir);

      // Create custom config file
      const customConfigPath = path.join(tempDir, 'custom-vbump.config.js');
      await fs.writeFile(
        customConfigPath,
        `
        export default {
          android: {
            files: ['custom/android/path/build.gradle']
          },
          ios: {
            files: ['custom/ios/path/project.pbxproj']
          },
          packageJson: 'custom-package.json'
        };
      `
      );

      const config = await loadProjectConfiguration(tempDir, customConfigPath);

      expect(config.android.files).toContain('custom/android/path/build.gradle');
      expect(config.ios.files).toContain('custom/ios/path/project.pbxproj');
      expect(config.packageJson).toBe('custom-package.json');
    });

    test('loads JSON configuration file', async () => {
      const path = await import('path');
      const fs = await import('fs/promises');

      await createMockProject('basic', tempDir);

      // Create JSON config file
      const jsonConfigPath = path.join(tempDir, 'vbump.config.json');
      await fs.writeFile(
        jsonConfigPath,
        JSON.stringify(
          {
            android: {
              files: ['json/android/build.gradle'],
            },
            ios: {
              files: ['json/ios/project.pbxproj'],
            },
            packageJson: 'json-package.json',
          },
          null,
          2
        )
      );

      const config = await loadProjectConfiguration(tempDir);

      expect(config.android.files).toContain('json/android/build.gradle');
      expect(config.ios.files).toContain('json/ios/project.pbxproj');
      expect(config.packageJson).toBe('json-package.json');
    });

    test('handles invalid configuration file gracefully', async () => {
      const path = await import('path');
      const fs = await import('fs/promises');

      await createMockProject('basic', tempDir);

      // Create invalid JS config - valid syntax but invalid export
      const invalidConfigPath = path.join(tempDir, 'vbump.config.js');
      await fs.writeFile(invalidConfigPath, 'export default "this is not a valid config object";');

      const config = await loadProjectConfiguration(tempDir);

      // Should fallback to default config
      expect(config).toEqual(getDefaultConfig());
    });

    test('searches for configuration files in order', async () => {
      const path = await import('path');
      const fs = await import('fs/promises');

      await createMockProject('basic', tempDir);

      // Create multiple config files
      await fs.writeFile(
        path.join(tempDir, '.vbump.config.json'),
        JSON.stringify({ android: { files: ['dotfile.gradle'] } })
      );
      await fs.writeFile(
        path.join(tempDir, 'vbump.config.js'),
        'export default { android: { files: ["primary.gradle"] } };'
      );

      const config = await loadProjectConfiguration(tempDir);

      // Should use the first found file (vbump.config.js has higher priority)
      expect(config.android.files).toContain('primary.gradle');
    });
  });

  describe('getDefaultConfig', () => {
    test('returns default configuration object', () => {
      const config = getDefaultConfig();

      expect(config).toEqual({
        android: {
          files: ['android/app/build.gradle'],
        },
        ios: {
          files: ['ios/*.xcodeproj/project.pbxproj'],
        },
        packageJson: 'package.json',
      });
    });

    test('returns a copy of the default config', () => {
      const config1 = getDefaultConfig();
      const config2 = getDefaultConfig();

      // Should be equal but not the same object
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);

      // Modifying one should not affect the other
      config1.android.files.push('modified.gradle');
      expect(config2.android.files).not.toContain('modified.gradle');
    });
  });

  describe('Cross-platform compatibility', () => {
    test('handles Windows paths correctly', async () => {
      // Mock Windows environment
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });

      try {
        await createMockProject('basic', tempDir);
        const result = await detectReactNativeProject(tempDir);
        expect(result).toBe(tempDir);
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
        });
      }
    });

    test('handles Unix paths correctly', async () => {
      // Mock Unix environment
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });

      try {
        await createMockProject('basic', tempDir);
        const result = await detectReactNativeProject(tempDir);
        expect(result).toBe(tempDir);
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
        });
      }
    });
  });
});
