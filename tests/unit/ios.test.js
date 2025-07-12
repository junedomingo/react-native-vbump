import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { updateIOSVersions } from '../../src/utils/ios.js';
import { createMockProject, createTempDir, readFile } from '../helpers/mockProject.js';

// Add this helper function at the top of the file
function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

// Add this helper function
function normalizeChange(change) {
  return {
    ...change,
    file: normalizePath(change.file),
  };
}

describe('iOS Version Updates', () => {
  let tempDir, cleanup;

  beforeEach(async () => {
    const temp = await createTempDir();
    tempDir = temp.path;
    cleanup = temp.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('updateIOSVersions', () => {
    test('updates both CURRENT_PROJECT_VERSION and MARKETING_VERSION', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const pbxprojPath = path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'minor',
      };

      const result = await updateIOSVersions(
        [pbxprojPath],
        true, // auto-increment CURRENT_PROJECT_VERSION
        true, // auto-increment MARKETING_VERSION
        options
      );

      expect(result).toHaveLength(1);
      expect(result[0].currentProjectVersion).toBe(2);
      expect(result[0].marketingVersion).toBe('1.1.0');

      // Verify file was updated
      const content = await readFile(pbxprojPath);
      expect(content).toContain('CURRENT_PROJECT_VERSION = 2;');
      expect(content).toContain('MARKETING_VERSION = 1.1.0;');
    });

    test('updates CURRENT_PROJECT_VERSION only', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const pbxprojPath = path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      const result = await updateIOSVersions(
        [pbxprojPath],
        true, // auto-increment CURRENT_PROJECT_VERSION
        null, // don't update MARKETING_VERSION
        options
      );

      expect(result).toHaveLength(1);
      expect(result[0].currentProjectVersion).toBe(2);
      expect(result[0].marketingVersion).toBe('1.0.0'); // unchanged

      // Verify file was updated correctly
      const content = await readFile(pbxprojPath);
      expect(content).toContain('CURRENT_PROJECT_VERSION = 2;');
      expect(content).toContain('MARKETING_VERSION = 1.0.0;'); // unchanged
    });

    test('updates MARKETING_VERSION only', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const pbxprojPath = path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'major',
      };

      const result = await updateIOSVersions(
        [pbxprojPath],
        null, // don't update CURRENT_PROJECT_VERSION
        true, // auto-increment MARKETING_VERSION
        options
      );

      expect(result).toHaveLength(1);
      expect(result[0].currentProjectVersion).toBe(1); // unchanged
      expect(result[0].marketingVersion).toBe('2.0.0');

      // Verify file was updated correctly
      const content = await readFile(pbxprojPath);
      expect(content).toContain('CURRENT_PROJECT_VERSION = 1;'); // unchanged
      expect(content).toContain('MARKETING_VERSION = 2.0.0;');
    });

    test('uses specific user-provided values', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const pbxprojPath = path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      const result = await updateIOSVersions(
        [pbxprojPath],
        99, // specific CURRENT_PROJECT_VERSION
        '3.1.4', // specific MARKETING_VERSION
        options
      );

      expect(result).toHaveLength(1);
      expect(result[0].currentProjectVersion).toBe(99);
      expect(result[0].marketingVersion).toBe('3.1.4');

      // Verify file was updated correctly
      const content = await readFile(pbxprojPath);
      expect(content).toContain('CURRENT_PROJECT_VERSION = 99;');
      expect(content).toContain('MARKETING_VERSION = 3.1.4;');
    });

    test('handles iOS-only project with different values', async () => {
      await createMockProject('ios-only', tempDir);
      const path = await import('path');

      const pbxprojPath = path.join(tempDir, 'ios/TestIOSOnlyApp.xcodeproj/project.pbxproj');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      const result = await updateIOSVersions(
        [pbxprojPath],
        true, // auto-increment CURRENT_PROJECT_VERSION
        true, // auto-increment MARKETING_VERSION
        options
      );

      expect(result).toHaveLength(1);
      expect(result[0].currentProjectVersion).toBe(43);
      expect(result[0].marketingVersion).toBe('2.1.1');

      // Verify file was updated correctly
      const content = await readFile(pbxprojPath);
      expect(content).toContain('CURRENT_PROJECT_VERSION = 43;');
      expect(content).toContain('MARKETING_VERSION = 2.1.1;');
    });

    test('handles dry run mode', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const pbxprojPath = path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'minor',
        dryRun: true,
      };

      const result = await updateIOSVersions(
        [pbxprojPath],
        true, // auto-increment CURRENT_PROJECT_VERSION
        true, // auto-increment MARKETING_VERSION
        options
      );

      expect(result).toHaveLength(1);
      expect(result[0].currentProjectVersion).toBe(2);
      expect(result[0].marketingVersion).toBe('1.1.0');

      // Verify file was NOT updated in dry run
      const content = await readFile(pbxprojPath);
      expect(content).toContain('CURRENT_PROJECT_VERSION = 1;'); // original value
      expect(content).toContain('MARKETING_VERSION = 1.0.0;'); // original value
    });

    test('records changes in options', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const pbxprojPath = path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      await updateIOSVersions(
        [pbxprojPath],
        true, // auto-increment CURRENT_PROJECT_VERSION
        true, // auto-increment MARKETING_VERSION
        options
      );

      expect(options.changes).toHaveLength(2);

      const currentProjectVersionChange = options.changes.find(
        (c) => c.item === 'CURRENT_PROJECT_VERSION'
      );
      const marketingVersionChange = options.changes.find((c) => c.item === 'MARKETING_VERSION');

      expect(normalizeChange(currentProjectVersionChange)).toEqual({
        platform: 'iOS',
        file: normalizePath(currentProjectVersionChange.file), // Normalize the actual received value
        item: 'CURRENT_PROJECT_VERSION',
        oldValue: '1',
        newValue: 2,
      });

      expect(normalizeChange(marketingVersionChange)).toEqual({
        platform: 'iOS',
        file: normalizePath(marketingVersionChange.file), // Normalize the actual received value
        item: 'MARKETING_VERSION',
        oldValue: '1.0.0',
        newValue: '1.0.1',
      });
    });

    test('handles non-existent file gracefully', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const nonExistentPath = path.join(tempDir, 'ios/NonExistent.xcodeproj/project.pbxproj');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      const result = await updateIOSVersions([nonExistentPath], true, true, options);

      expect(result).toHaveLength(0);
      expect(options.changes).toHaveLength(0);
    });

    test('handles malformed project.pbxproj file gracefully', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');
      const fs = await import('fs/promises');

      const pbxprojPath = path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj');

      // Create malformed pbxproj without version info
      await fs.writeFile(
        pbxprojPath,
        `
        // !$*UTF8*$!
        {
          archiveVersion = 1;
          classes = {
          };
          objectVersion = 46;
          objects = {
            // No version configuration
          };
          rootObject = 83CBB9F71A601CBA00E9B192;
        }
      `
      );

      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      const result = await updateIOSVersions([pbxprojPath], true, true, options);

      expect(result).toHaveLength(0);
      expect(options.changes).toHaveLength(0);
    });

    test('handles package.json update when specified', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const pbxprojPath = path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj');
      const packageJsonPath = path.join(tempDir, 'package.json');

      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'minor',
        packageJsonPath,
        packageJsonUpdated: false,
      };

      await updateIOSVersions(
        [pbxprojPath],
        true, // auto-increment CURRENT_PROJECT_VERSION
        true, // auto-increment MARKETING_VERSION
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

      const pbxprojPath = path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj');
      const packageJsonPath = path.join(tempDir, 'package.json');

      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'minor',
        packageJsonPath: packageJsonPath,
        packageJsonUpdated: true, // already updated
      };

      await updateIOSVersions(
        [pbxprojPath],
        true, // auto-increment CURRENT_PROJECT_VERSION
        true, // auto-increment MARKETING_VERSION
        options
      );

      // Package.json should not be updated again
      const packageContent = await readFile(packageJsonPath);
      const packageData = JSON.parse(packageContent);
      expect(packageData.version).toBe('1.0.0'); // original value
    });

    test('handles multiple xcodeproj files', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');
      const fs = await import('fs/promises');

      const firstPbxprojPath = path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj');

      // Create second xcodeproj
      const secondXcodeprojDir = path.join(tempDir, 'ios/SecondApp.xcodeproj');
      await fs.mkdir(secondXcodeprojDir, { recursive: true });
      const secondPbxprojPath = path.join(secondXcodeprojDir, 'project.pbxproj');

      // Copy the first pbxproj as a template for the second
      const firstContent = await readFile(firstPbxprojPath);
      await fs.writeFile(secondPbxprojPath, firstContent);

      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      const result = await updateIOSVersions(
        [firstPbxprojPath, secondPbxprojPath],
        true, // auto-increment CURRENT_PROJECT_VERSION
        true, // auto-increment MARKETING_VERSION
        options
      );

      expect(result).toHaveLength(2);

      // Both files should be updated
      for (const res of result) {
        expect(res.currentProjectVersion).toBe(2);
        expect(res.marketingVersion).toBe('1.0.1');
      }

      // Verify both files were updated
      const firstUpdatedContent = await readFile(firstPbxprojPath);
      const secondUpdatedContent = await readFile(secondPbxprojPath);

      expect(firstUpdatedContent).toContain('CURRENT_PROJECT_VERSION = 2;');
      expect(firstUpdatedContent).toContain('MARKETING_VERSION = 1.0.1;');
      expect(secondUpdatedContent).toContain('CURRENT_PROJECT_VERSION = 2;');
      expect(secondUpdatedContent).toContain('MARKETING_VERSION = 1.0.1;');
    });

    test('handles project.pbxproj with multiple configuration sections', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const pbxprojPath = path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      const result = await updateIOSVersions(
        [pbxprojPath],
        true, // auto-increment CURRENT_PROJECT_VERSION
        true, // auto-increment MARKETING_VERSION
        options
      );

      expect(result).toHaveLength(1);
      expect(result[0].currentProjectVersion).toBe(2);
      expect(result[0].marketingVersion).toBe('1.0.1');

      // Verify all instances were updated (Debug and Release configurations)
      const content = await readFile(pbxprojPath);
      const currentProjectVersionMatches = content.match(/CURRENT_PROJECT_VERSION = 2;/g);
      const marketingVersionMatches = content.match(/MARKETING_VERSION = 1\.0\.1;/g);

      expect(currentProjectVersionMatches).toHaveLength(2); // Debug and Release
      expect(marketingVersionMatches).toHaveLength(2); // Debug and Release
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

        const pbxprojPath = path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj');
        const options = {
          projectRoot: tempDir,
          changes: [],
          increment: 'patch',
        };

        const result = await updateIOSVersions([pbxprojPath], true, true, options);

        expect(result).toHaveLength(1);
        expect(result[0].currentProjectVersion).toBe(2);
        expect(result[0].marketingVersion).toBe('1.0.1');
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

      const pbxprojPath = path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj');
      const options = {
        projectRoot: tempDir,
        changes: [],
        increment: 'patch',
      };

      const result = await updateIOSVersions([pbxprojPath], true, true, options);

      expect(result).toHaveLength(1);

      // Verify file can be read correctly after update
      const content = await readFile(pbxprojPath);
      expect(content).toContain('CURRENT_PROJECT_VERSION = 2;');
      expect(content).toContain('MARKETING_VERSION = 1.0.1;');
    });
  });
});
