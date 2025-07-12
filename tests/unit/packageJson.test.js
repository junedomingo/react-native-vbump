import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { updatePackageJsonVersion, parsePackageJsonVersion } from '../../src/utils/packageJson.js';
import { createMockProject, createTempDir, readFile } from '../helpers/mockProject.js';

describe('Package.json Version Management', () => {
  let tempDir, cleanup;

  beforeEach(async () => {
    const temp = await createTempDir();
    tempDir = temp.path;
    cleanup = temp.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('updatePackageJsonVersion', () => {
    test('updates version in package.json', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const packageJsonPath = path.join(tempDir, 'package.json');
      const options = {
        projectRoot: tempDir,
        changes: [],
      };

      const result = await updatePackageJsonVersion(packageJsonPath, '2.0.0', options);

      expect(result).toEqual({ version: '2.0.0' });

      // Verify file was updated
      const content = await readFile(packageJsonPath);
      const packageData = JSON.parse(content);
      expect(packageData.version).toBe('2.0.0');
    });

    test('records changes in options', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const packageJsonPath = path.join(tempDir, 'package.json');
      const options = {
        projectRoot: tempDir,
        changes: [],
      };

      await updatePackageJsonVersion(packageJsonPath, '1.5.0', options);

      expect(options.changes).toHaveLength(1);
      expect(options.changes[0]).toEqual({
        platform: 'Package.json',
        file: 'package.json',
        item: 'version',
        oldValue: '1.0.0',
        newValue: '1.5.0',
      });
    });

    test('handles dry run mode', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const packageJsonPath = path.join(tempDir, 'package.json');
      const options = {
        projectRoot: tempDir,
        changes: [],
        dryRun: true,
      };

      const result = await updatePackageJsonVersion(packageJsonPath, '3.0.0', options);

      expect(result).toEqual({ version: '3.0.0' });

      // Verify file was NOT updated in dry run
      const content = await readFile(packageJsonPath);
      const packageData = JSON.parse(content);
      expect(packageData.version).toBe('1.0.0'); // original value
    });

    test('handles non-existent package.json gracefully', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const nonExistentPath = path.join(tempDir, 'nonexistent-package.json');
      const options = {
        projectRoot: tempDir,
        changes: [],
      };

      const result = await updatePackageJsonVersion(nonExistentPath, '2.0.0', options);

      expect(result).toBe(null);
      expect(options.changes).toHaveLength(0);
    });

    test('handles package.json without version field gracefully', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');
      const fs = await import('fs/promises');

      const packageJsonPath = path.join(tempDir, 'package.json');

      // Create package.json without version field
      await fs.writeFile(
        packageJsonPath,
        JSON.stringify(
          {
            name: 'test-app',
            private: true,
            scripts: {
              start: 'node index.js',
            },
          },
          null,
          2
        )
      );

      const options = {
        projectRoot: tempDir,
        changes: [],
      };

      const result = await updatePackageJsonVersion(packageJsonPath, '1.0.0', options);

      expect(result).toBe(null);
      expect(options.changes).toHaveLength(0);
    });

    test('handles different package.json projects', async () => {
      await createMockProject('ios-only', tempDir);
      const path = await import('path');

      const packageJsonPath = path.join(tempDir, 'package.json');
      const options = {
        projectRoot: tempDir,
        changes: [],
      };

      const result = await updatePackageJsonVersion(packageJsonPath, '2.2.0', options);

      expect(result).toEqual({ version: '2.2.0' });

      // Verify original version was 2.1.0
      expect(options.changes[0].oldValue).toBe('2.1.0');
      expect(options.changes[0].newValue).toBe('2.2.0');
    });

    test('preserves package.json formatting', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const packageJsonPath = path.join(tempDir, 'package.json');
      const options = {
        projectRoot: tempDir,
        changes: [],
      };

      // Get original content to verify formatting
      const originalContent = await readFile(packageJsonPath);
      const originalData = JSON.parse(originalContent);

      await updatePackageJsonVersion(packageJsonPath, '1.1.0', options);

      // Verify formatting is preserved (2-space indentation + newline)
      const updatedContent = await readFile(packageJsonPath);
      const updatedData = JSON.parse(updatedContent);

      expect(updatedData.version).toBe('1.1.0');
      expect(updatedData.name).toBe(originalData.name);
      expect(updatedData.private).toBe(originalData.private);
      expect(updatedContent).toMatch(/\n$/); // ends with newline
      expect(updatedContent).toContain('  "version": "1.1.0"'); // 2-space indent
    });

    test('handles corrupted package.json gracefully', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');
      const fs = await import('fs/promises');

      const packageJsonPath = path.join(tempDir, 'package.json');

      // Create corrupted JSON
      await fs.writeFile(packageJsonPath, '{ invalid json content');

      const options = {
        projectRoot: tempDir,
        changes: [],
      };

      // Should throw an error for corrupted JSON
      await expect(updatePackageJsonVersion(packageJsonPath, '2.0.0', options)).rejects.toThrow();
    });

    test('handles relative path in changes', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const packageJsonPath = path.join(tempDir, 'package.json');
      const options = {
        projectRoot: tempDir,
        changes: [],
      };

      await updatePackageJsonVersion(packageJsonPath, '1.5.0', options);

      // Should record relative path
      expect(options.changes[0].file).toBe('package.json');
    });

    test('handles absolute path without projectRoot', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const packageJsonPath = path.join(tempDir, 'package.json');
      const options = {
        changes: [],
        // No projectRoot specified
      };

      await updatePackageJsonVersion(packageJsonPath, '1.5.0', options);

      // Should still work and record the change
      expect(options.changes).toHaveLength(1);
      expect(options.changes[0].newValue).toBe('1.5.0');
    });
  });

  describe('parsePackageJsonVersion', () => {
    test('parses version from package.json', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const packageJsonPath = path.join(tempDir, 'package.json');

      const result = parsePackageJsonVersion(packageJsonPath);

      expect(result).toEqual({ version: '1.0.0' });
    });

    test('parses version from different projects', async () => {
      await createMockProject('ios-only', tempDir);
      const path = await import('path');

      const packageJsonPath = path.join(tempDir, 'package.json');

      const result = parsePackageJsonVersion(packageJsonPath);

      expect(result).toEqual({ version: '2.1.0' });
    });

    test('handles package.json without version field', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');
      const fs = await import('fs/promises');

      const packageJsonPath = path.join(tempDir, 'package.json');

      // Create package.json without version field
      await fs.writeFile(
        packageJsonPath,
        JSON.stringify(
          {
            name: 'test-app',
            private: true,
          },
          null,
          2
        )
      );

      const result = parsePackageJsonVersion(packageJsonPath);

      expect(result).toEqual({ version: null });
    });

    test('throws error for non-existent package.json', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');

      const nonExistentPath = path.join(tempDir, 'nonexistent-package.json');

      expect(() => parsePackageJsonVersion(nonExistentPath)).toThrow(
        `package.json not found at: ${nonExistentPath}`
      );
    });

    test('throws error for corrupted package.json', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');
      const fs = await import('fs/promises');

      const packageJsonPath = path.join(tempDir, 'package.json');

      // Create corrupted JSON
      await fs.writeFile(packageJsonPath, '{ invalid json content');

      expect(() => parsePackageJsonVersion(packageJsonPath)).toThrow();
    });

    test('handles empty package.json', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');
      const fs = await import('fs/promises');

      const packageJsonPath = path.join(tempDir, 'package.json');

      // Create empty JSON object
      await fs.writeFile(packageJsonPath, '{}');

      const result = parsePackageJsonVersion(packageJsonPath);

      expect(result).toEqual({ version: null });
    });

    test('handles package.json with version as number', async () => {
      await createMockProject('basic', tempDir);
      const path = await import('path');
      const fs = await import('fs/promises');

      const packageJsonPath = path.join(tempDir, 'package.json');

      // Create package.json with version as number (unusual but possible)
      await fs.writeFile(
        packageJsonPath,
        JSON.stringify(
          {
            name: 'test-app',
            version: 1.0,
          },
          null,
          2
        )
      );

      const result = parsePackageJsonVersion(packageJsonPath);

      expect(result).toEqual({ version: 1.0 });
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

        const packageJsonPath = path.join(tempDir, 'package.json');
        const options = {
          projectRoot: tempDir,
          changes: [],
        };

        const result = await updatePackageJsonVersion(packageJsonPath, '2.0.0', options);

        expect(result).toEqual({ version: '2.0.0' });

        // Verify file was updated
        const content = await readFile(packageJsonPath);
        const packageData = JSON.parse(content);
        expect(packageData.version).toBe('2.0.0');
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

      const packageJsonPath = path.join(tempDir, 'package.json');
      const options = {
        projectRoot: tempDir,
        changes: [],
      };

      await updatePackageJsonVersion(packageJsonPath, '2.0.0', options);

      // Verify file can be read correctly after update
      const content = await readFile(packageJsonPath);
      const packageData = JSON.parse(content);
      expect(packageData.version).toBe('2.0.0');
    });
  });
});
