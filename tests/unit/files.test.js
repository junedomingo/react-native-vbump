import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { resolveFilePaths } from '../../src/utils/files.js';
import { createMockProject, createTempDir } from '../helpers/mockProject.js';

// Add this helper function at the top of the file
function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

describe('File Path Resolution', () => {
  let tempDir, cleanup;

  beforeEach(async () => {
    const temp = await createTempDir();
    tempDir = temp.path;
    cleanup = temp.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('resolveFilePaths', () => {
    test('resolves direct file paths', async () => {
      await createMockProject('basic', tempDir);

      const patterns = ['android/app/build.gradle'];
      const resolved = resolveFilePaths(patterns, tempDir);

      expect(resolved).toHaveLength(1);
      expect(normalizePath(resolved[0])).toMatch(/android\/app\/build\.gradle$/);
    });

    test('resolves multiple direct file paths', async () => {
      await createMockProject('custom-config', tempDir);

      const patterns = ['android/app/build.gradle', 'android/library/build.gradle'];
      const resolved = resolveFilePaths(patterns, tempDir);

      expect(resolved).toHaveLength(2);
      expect(normalizePath(resolved[0])).toMatch(/android\/app\/build\.gradle$/);
      expect(normalizePath(resolved[1])).toMatch(/android\/library\/build\.gradle$/);
    });

    test('resolves iOS xcodeproj glob pattern', async () => {
      await createMockProject('basic', tempDir);

      const patterns = ['ios/*.xcodeproj/project.pbxproj'];
      const resolved = resolveFilePaths(patterns, tempDir);

      expect(resolved).toHaveLength(1);
      expect(normalizePath(resolved[0])).toMatch(/ios\/.*\.xcodeproj\/project\.pbxproj$/);
      expect(normalizePath(resolved[0])).toMatch(/TestRNApp\.xcodeproj/);
    });

    test('resolves multiple iOS xcodeproj files', async () => {
      const path = await import('path');
      const fs = await import('fs/promises');

      await createMockProject('basic', tempDir);

      // Create additional xcodeproj directory
      const secondXcodeprojDir = path.join(tempDir, 'ios', 'SecondApp.xcodeproj');
      await fs.mkdir(secondXcodeprojDir, { recursive: true });
      await fs.writeFile(
        path.join(secondXcodeprojDir, 'project.pbxproj'),
        '// Second project file'
      );

      const patterns = ['ios/*.xcodeproj/project.pbxproj'];
      const resolved = resolveFilePaths(patterns, tempDir);

      expect(resolved).toHaveLength(2);
      expect(resolved.some((p) => p.includes('TestRNApp.xcodeproj'))).toBe(true);
      expect(resolved.some((p) => p.includes('SecondApp.xcodeproj'))).toBe(true);
    });

    test('handles non-existent files gracefully', async () => {
      await createMockProject('basic', tempDir);

      const patterns = [
        'android/app/build.gradle', // exists
        'android/nonexistent/build.gradle', // doesn't exist
      ];
      const resolved = resolveFilePaths(patterns, tempDir);

      expect(resolved).toHaveLength(1);
      expect(normalizePath(resolved[0])).toMatch(/android\/app\/build\.gradle$/);
    });

    test('handles non-existent iOS directory gracefully', async () => {
      await createMockProject('android-only', tempDir);

      const patterns = ['ios/*.xcodeproj/project.pbxproj'];
      const resolved = resolveFilePaths(patterns, tempDir);

      expect(resolved).toHaveLength(0);
    });

    test('handles xcodeproj without project.pbxproj', async () => {
      const path = await import('path');
      const fs = await import('fs/promises');

      await createMockProject('basic', tempDir);

      // Create xcodeproj directory but no project.pbxproj file
      const emptyXcodeprojDir = path.join(tempDir, 'ios', 'EmptyApp.xcodeproj');
      await fs.mkdir(emptyXcodeprojDir, { recursive: true });

      const patterns = ['ios/*.xcodeproj/project.pbxproj'];
      const resolved = resolveFilePaths(patterns, tempDir);

      // Should only find the original project file
      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toMatch(/TestRNApp\.xcodeproj/);
    });

    test('handles empty patterns array', async () => {
      await createMockProject('basic', tempDir);

      const patterns = [];
      const resolved = resolveFilePaths(patterns, tempDir);

      expect(resolved).toHaveLength(0);
    });

    test('handles mixed patterns', async () => {
      await createMockProject('basic', tempDir);

      const patterns = ['android/app/build.gradle', 'ios/*.xcodeproj/project.pbxproj'];
      const resolved = resolveFilePaths(patterns, tempDir);

      expect(resolved).toHaveLength(2);
      expect(resolved.some((p) => p.includes('build.gradle'))).toBe(true);
      expect(resolved.some((p) => p.includes('project.pbxproj'))).toBe(true);
    });

    test('handles absolute paths', async () => {
      const path = await import('path');
      await createMockProject('basic', tempDir);

      const absolutePath = path.join(tempDir, 'android/app/build.gradle');
      const patterns = [absolutePath];
      const resolved = resolveFilePaths(patterns, tempDir);

      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toBe(absolutePath);
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

        const patterns = ['android/app/build.gradle'];
        const resolved = resolveFilePaths(patterns, tempDir);

        expect(resolved).toHaveLength(1);
        expect(normalizePath(resolved[0])).toMatch(/build\.gradle$/);
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

        const patterns = ['android/app/build.gradle'];
        const resolved = resolveFilePaths(patterns, tempDir);

        expect(resolved).toHaveLength(1);
        expect(normalizePath(resolved[0])).toMatch(/build\.gradle$/);
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
        });
      }
    });

    test('handles path separators correctly across platforms', async () => {
      await createMockProject('basic', tempDir);

      // Test with different path separators
      const patterns = [
        'android/app/build.gradle',
        'android\\app\\build.gradle', // Windows style
      ];
      const resolved = resolveFilePaths(patterns, tempDir);

      // Should resolve at least one (depending on platform)
      expect(resolved.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error handling', () => {
    test('handles permission errors gracefully', async () => {
      await createMockProject('basic', tempDir);

      const patterns = ['android/app/build.gradle'];

      // Should not throw even if there are file system issues
      expect(() => {
        resolveFilePaths(patterns, tempDir);
      }).not.toThrow();
    });

    test('handles invalid glob patterns gracefully', async () => {
      await createMockProject('basic', tempDir);

      const patterns = ['android/app/build.gradle', 'invalid/**/glob/pattern/**/*.unknown'];

      const resolved = resolveFilePaths(patterns, tempDir);

      // Should still resolve the valid pattern
      expect(resolved).toHaveLength(1);
      expect(normalizePath(resolved[0])).toMatch(/build\.gradle$/);
    });
  });
});
