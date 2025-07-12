import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { updateAndroidVersions } from '../../src/utils/android.js';
import { createMockProject, createTempDir, readFile } from '../helpers/mockProject.js';

// Add this helper function at the top of the file
function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

describe('Android Version Updates', () => {
  let tempDir, cleanup;

  beforeEach(async () => {
    const temp = await createTempDir();
    tempDir = temp.path;
    cleanup = temp.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('updateAndroidVersions', () => {
    test('updates both versionCode and versionName', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const buildGradlePath = path.join(tempDir, 'android/app/build.gradle');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'minor',
      };

      const result = await updateAndroidVersions(
        [buildGradlePath],
        true, // auto-increment versionCode
        true, // auto-increment versionName
        options
      );

      expect(result).toHaveLength(1);
      expect(result[0].versionCode).toBe(2);
      expect(result[0].versionName).toBe('1.1.0');

      // Verify file was updated
      const content = await readFile(buildGradlePath);
      expect(content).toContain('versionCode 2');
      expect(content).toContain('versionName "1.1.0"');
    });

    test('updates versionCode only', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const buildGradlePath = path.join(tempDir, 'android/app/build.gradle');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      const result = await updateAndroidVersions(
        [buildGradlePath],
        true, // auto-increment versionCode
        null, // don't update versionName
        options
      );

      expect(result).toHaveLength(1);
      expect(result[0].versionCode).toBe(2);
      expect(result[0].versionName).toBe('1.0.0'); // unchanged

      // Verify file was updated correctly
      const content = await readFile(buildGradlePath);
      expect(content).toContain('versionCode 2');
      expect(content).toContain('versionName "1.0.0"'); // unchanged
    });

    test('updates versionName only', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const buildGradlePath = path.join(tempDir, 'android/app/build.gradle');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'major',
      };

      const result = await updateAndroidVersions(
        [buildGradlePath],
        null, // don't update versionCode
        true, // auto-increment versionName
        options
      );

      expect(result).toHaveLength(1);
      expect(result[0].versionCode).toBe(1); // unchanged
      expect(result[0].versionName).toBe('2.0.0');

      // Verify file was updated correctly
      const content = await readFile(buildGradlePath);
      expect(content).toContain('versionCode 1'); // unchanged
      expect(content).toContain('versionName "2.0.0"');
    });

    test('uses specific user-provided values', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const buildGradlePath = path.join(tempDir, 'android/app/build.gradle');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      const result = await updateAndroidVersions(
        [buildGradlePath],
        42, // specific versionCode
        '3.1.4', // specific versionName
        options
      );

      expect(result).toHaveLength(1);
      expect(result[0].versionCode).toBe(42);
      expect(result[0].versionName).toBe('3.1.4');

      // Verify file was updated correctly
      const content = await readFile(buildGradlePath);
      expect(content).toContain('versionCode 42');
      expect(content).toContain('versionName "3.1.4"');
    });

    test('handles multiple Android files', async () => {
      await createMockProject('custom-config', tempDir);
      const path = await import('path');

      const appBuildGradlePath = path.join(tempDir, 'android/app/build.gradle');
      const libBuildGradlePath = path.join(tempDir, 'android/library/build.gradle');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      const result = await updateAndroidVersions(
        [appBuildGradlePath, libBuildGradlePath],
        true, // auto-increment versionCode
        true, // auto-increment versionName
        options
      );

      expect(result).toHaveLength(2);

      // Both files should be updated
      for (const res of result) {
        expect(res.versionCode).toBe(11);
        expect(res.versionName).toBe('1.5.1');
      }

      // Verify both files were updated
      const appContent = await readFile(appBuildGradlePath);
      const libContent = await readFile(libBuildGradlePath);

      expect(appContent).toContain('versionCode 11');
      expect(appContent).toContain('versionName "1.5.1"');
      expect(libContent).toContain('versionCode 11');
      expect(libContent).toContain('versionName "1.5.1"');
    });

    test('handles dry run mode', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const buildGradlePath = path.join(tempDir, 'android/app/build.gradle');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'minor',
        dryRun: true,
      };

      const result = await updateAndroidVersions(
        [buildGradlePath],
        true, // auto-increment versionCode
        true, // auto-increment versionName
        options
      );

      expect(result).toHaveLength(1);
      expect(result[0].versionCode).toBe(2);
      expect(result[0].versionName).toBe('1.1.0');

      // Verify file was NOT updated in dry run
      const content = await readFile(buildGradlePath);
      expect(content).toContain('versionCode 1'); // original value
      expect(content).toContain('versionName "1.0.0"'); // original value
    });

    test('records changes in options', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const buildGradlePath = path.join(tempDir, 'android/app/build.gradle');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      await updateAndroidVersions(
        [buildGradlePath],
        true, // auto-increment versionCode
        true, // auto-increment versionName
        options
      );

      expect(options.changes).toHaveLength(2);

      const versionCodeChange = options.changes.find((c) => c.item === 'versionCode');
      const versionNameChange = options.changes.find((c) => c.item === 'versionName');

      expect(versionCodeChange).toEqual({
        platform: 'Android',
        file: normalizePath('android/app/build.gradle'),
        item: 'versionCode',
        oldValue: '1',
        newValue: 2,
      });

      expect(versionNameChange).toEqual({
        platform: 'Android',
        file: normalizePath('android/app/build.gradle'),
        item: 'versionName',
        oldValue: '1.0.0',
        newValue: '1.0.1',
      });
    });

    test('handles non-existent file gracefully', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const nonExistentPath = path.join(tempDir, 'android/nonexistent/build.gradle');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      const result = await updateAndroidVersions([nonExistentPath], true, true, options);

      expect(result).toHaveLength(0);
      expect(options.changes).toHaveLength(0);
    });

    test('handles malformed build.gradle file gracefully', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');
      const fs = await import('fs/promises');

      const buildGradlePath = path.join(tempDir, 'android/app/build.gradle');

      // Create malformed build.gradle without version info
      await fs.writeFile(
        buildGradlePath,
        `
        apply plugin: "com.android.application"

        android {
            compileSdkVersion 34

            defaultConfig {
                applicationId "com.testapp"
                minSdkVersion 21
                targetSdkVersion 34
            }
        }
      `
      );

      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      const result = await updateAndroidVersions([buildGradlePath], true, true, options);

      expect(result).toHaveLength(0);
      expect(options.changes).toHaveLength(0);
    });

    test('handles package.json update when specified', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const buildGradlePath = path.join(tempDir, 'android/app/build.gradle');
      const packageJsonPath = path.join(tempDir, 'package.json');

      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'minor',
        packageJsonPath: packageJsonPath,
        packageJsonUpdated: false,
      };

      await updateAndroidVersions(
        [buildGradlePath],
        true, // auto-increment versionCode
        true, // auto-increment versionName
        options
      );

      expect(options.packageJsonUpdated).toBe(true);

      // Verify package.json was updated
      const packageContent = await readFile(packageJsonPath);
      const packageData = JSON.parse(packageContent);
      expect(packageData.version).toBe('1.1.0');
    });

    test('skips package.json update when already updated', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const buildGradlePath = path.join(tempDir, 'android/app/build.gradle');
      const packageJsonPath = path.join(tempDir, 'package.json');

      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'minor',
        packageJsonPath: packageJsonPath,
        packageJsonUpdated: true, // already updated
      };

      await updateAndroidVersions(
        [buildGradlePath],
        true, // auto-increment versionCode
        true, // auto-increment versionName
        options
      );

      // Package.json should not be updated again
      const packageContent = await readFile(packageJsonPath);
      const packageData = JSON.parse(packageContent);
      expect(packageData.version).toBe('1.0.0'); // original value
    });

    test('handles different version formats in build.gradle', async () => {
      await createMockProject('android-only', tempDir);
      const path = await import('path');

      const buildGradlePath = path.join(tempDir, 'android/app/build.gradle');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      const result = await updateAndroidVersions([buildGradlePath], true, true, options);

      expect(result).toHaveLength(1);
      expect(result[0].versionCode).toBe(26);
      expect(result[0].versionName).toBe('3.2.2');
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
        const path = await import('path');

        const buildGradlePath = path.join(tempDir, 'android/app/build.gradle');
        const options = {
          projectRoot: tempDir,
          changes: [],
          increment: 'patch',
        };

        const result = await updateAndroidVersions([buildGradlePath], true, true, options);

        expect(result).toHaveLength(1);
        expect(result[0].versionCode).toBe(2);
        expect(result[0].versionName).toBe('1.0.1');
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
        });
      }
    });

    test('handles file encoding correctly', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const buildGradlePath = path.join(tempDir, 'android/app/build.gradle');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      const result = await updateAndroidVersions([buildGradlePath], true, true, options);

      expect(result).toHaveLength(1);

      // Verify file can be read correctly after update
      const content = await readFile(buildGradlePath);
      expect(content).toContain('versionCode 2');
      expect(content).toContain('versionName "1.0.1"');
    });
  });
});
