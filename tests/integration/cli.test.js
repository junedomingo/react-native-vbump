import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn } from 'child_process';
import { createMockProject, createTempDir, readFile } from '../helpers/mockProject.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.join(__dirname, '../../src/index.js');

describe('CLI Integration Tests', () => {
  let tempDir, cleanup;

  beforeEach(async () => {
    const temp = await createTempDir();
    tempDir = temp.path;
    cleanup = temp.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  // Helper function to run CLI commands
  const runCLI = (args, options = {}) => {
    return new Promise((resolve, reject) => {
      const { cwd = tempDir, input = '', timeout = 10000 } = options;

      const child = spawn('node', [CLI_PATH, ...args], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle timeout
      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error(`CLI command timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({ code, stdout, stderr });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });

      // Send input if provided
      if (input) {
        child.stdin.write(input);
        child.stdin.end();
      }
    });
  };

  describe('Version and Help', () => {
    test('shows version information', async () => {
      const result = await runCLI(['--version']);

      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    test('shows help information', async () => {
      const result = await runCLI(['--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('react-native-vbump');
      expect(result.stdout).toContain('--android');
      expect(result.stdout).toContain('--ios');
      expect(result.stdout).toContain('--dry-run');
    });
  });

  describe('Project Detection', () => {
    test('detects React Native project', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--dry-run', '--android', '--increment', 'patch']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('✅ Detected React Native project');
      expect(result.stdout).toContain('This was a dry run');
    });

    test('fails when not in React Native project', async () => {
      // Create a non-RN project
      const fs = await import('fs/promises');
      await fs.writeFile(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'regular-node-app', version: '1.0.0' })
      );

      const result = await runCLI(['--dry-run', '--android']);

      expect(result.code).toBe(1);
      expect(result.stdout).toContain('❌ Error');
      expect(result.stdout).toContain('Could not detect React Native project');
    });

    test('uses specified project path', async () => {
      await createMockProject('basic', tempDir);

      // Run from a different directory
      const result = await runCLI(
        ['--project-path', tempDir, '--dry-run', '--android', '--increment', 'patch'],
        { cwd: process.cwd() }
      );

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('✅ Detected React Native project');
    });
  });

  describe('Dry Run Mode', () => {
    test('shows changes without modifying files', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--dry-run', '--android', '--increment', 'minor']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('This was a dry run');
      expect(result.stdout).toContain('Version bump completed successfully');

      // Verify files were not modified
      const buildGradleContent = await readFile(path.join(tempDir, 'android/app/build.gradle'));
      expect(buildGradleContent).toContain('versionCode 1');
      expect(buildGradleContent).toContain('versionName "1.0.0"');
    });

    test('shows expected changes in table format', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--dry-run', '--android', '--increment', 'patch']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Android');
      expect(result.stdout).toContain('versionCode');
      expect(result.stdout).toContain('versionName');
      expect(result.stdout).toContain('1.0.1');
    });
  });

  describe('Android Updates', () => {
    test('updates Android versions', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--android', '--increment', 'minor']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Version bump completed successfully');

      // Verify files were modified
      const buildGradleContent = await readFile(path.join(tempDir, 'android/app/build.gradle'));
      expect(buildGradleContent).toContain('versionCode 2');
      expect(buildGradleContent).toContain('versionName "1.1.0"');

      const packageJsonContent = await readFile(path.join(tempDir, 'package.json'));
      const packageData = JSON.parse(packageJsonContent);
      expect(packageData.version).toBe('1.1.0');
    });

    test('updates Android build number only', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--android-build-number']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Version bump completed successfully');

      // Verify only build number was modified
      const buildGradleContent = await readFile(path.join(tempDir, 'android/app/build.gradle'));
      expect(buildGradleContent).toContain('versionCode 2');
      expect(buildGradleContent).toContain('versionName "1.0.0"'); // unchanged
    });

    test('updates Android app version only', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--android-app-version', '--increment', 'major']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Version bump completed successfully');

      // Verify only app version was modified
      const buildGradleContent = await readFile(path.join(tempDir, 'android/app/build.gradle'));
      expect(buildGradleContent).toContain('versionCode 1'); // unchanged
      expect(buildGradleContent).toContain('versionName "2.0.0"');
    });

    test('uses specific Android build number', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--android-build-number', '42']);

      expect(result.code).toBe(0);

      const buildGradleContent = await readFile(path.join(tempDir, 'android/app/build.gradle'));
      expect(buildGradleContent).toContain('versionCode 42');
    });

    test('uses specific Android app version', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--android-app-version', '3.1.4']);

      expect(result.code).toBe(0);

      const buildGradleContent = await readFile(path.join(tempDir, 'android/app/build.gradle'));
      expect(buildGradleContent).toContain('versionName "3.1.4"');
    });
  });

  describe('iOS Updates', () => {
    test('updates iOS versions', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--ios', '--increment', 'minor']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Version bump completed successfully');

      // Verify files were modified
      const pbxprojContent = await readFile(
        path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj')
      );
      expect(pbxprojContent).toContain('CURRENT_PROJECT_VERSION = 2;');
      expect(pbxprojContent).toContain('MARKETING_VERSION = 1.1.0;');
    });

    test('updates iOS build number only', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--ios-build-number']);

      expect(result.code).toBe(0);

      const pbxprojContent = await readFile(
        path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj')
      );
      expect(pbxprojContent).toContain('CURRENT_PROJECT_VERSION = 2;');
      expect(pbxprojContent).toContain('MARKETING_VERSION = 1.0.0;'); // unchanged
    });

    test('updates iOS app version only', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--ios-app-version', '--increment', 'major']);

      expect(result.code).toBe(0);

      const pbxprojContent = await readFile(
        path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj')
      );
      expect(pbxprojContent).toContain('CURRENT_PROJECT_VERSION = 1;'); // unchanged
      expect(pbxprojContent).toContain('MARKETING_VERSION = 2.0.0;');
    });

    test('uses specific iOS build number', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--ios-build-number', '99']);

      expect(result.code).toBe(0);

      const pbxprojContent = await readFile(
        path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj')
      );
      expect(pbxprojContent).toContain('CURRENT_PROJECT_VERSION = 99;');
    });

    test('uses specific iOS app version', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--ios-app-version', '3.1.4']);

      expect(result.code).toBe(0);

      const pbxprojContent = await readFile(
        path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj')
      );
      expect(pbxprojContent).toContain('MARKETING_VERSION = 3.1.4;');
    });
  });

  describe('Both Platforms', () => {
    test('updates both Android and iOS', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--android', '--ios', '--increment', 'patch']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Version bump completed successfully');

      // Verify Android files
      const buildGradleContent = await readFile(path.join(tempDir, 'android/app/build.gradle'));
      expect(buildGradleContent).toContain('versionCode 2');
      expect(buildGradleContent).toContain('versionName "1.0.1"');

      // Verify iOS files
      const pbxprojContent = await readFile(
        path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj')
      );
      expect(pbxprojContent).toContain('CURRENT_PROJECT_VERSION = 2;');
      expect(pbxprojContent).toContain('MARKETING_VERSION = 1.0.1;');
    });

    test('updates build numbers only for both platforms', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--build-numbers']);

      expect(result.code).toBe(0);

      // Verify build numbers were incremented
      const buildGradleContent = await readFile(path.join(tempDir, 'android/app/build.gradle'));
      expect(buildGradleContent).toContain('versionCode 2');
      expect(buildGradleContent).toContain('versionName "1.0.0"'); // unchanged

      const pbxprojContent = await readFile(
        path.join(tempDir, 'ios/TestRNApp.xcodeproj/project.pbxproj')
      );
      expect(pbxprojContent).toContain('CURRENT_PROJECT_VERSION = 2;');
      expect(pbxprojContent).toContain('MARKETING_VERSION = 1.0.0;'); // unchanged
    });
  });

  describe('Custom Configuration', () => {
    test('uses custom configuration file', async () => {
      await createMockProject('custom-config', tempDir);

      const result = await runCLI(['--android', '--increment', 'patch']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Version bump completed successfully');

      // Verify both app and library build.gradle files were updated
      const appBuildGradleContent = await readFile(path.join(tempDir, 'android/app/build.gradle'));
      expect(appBuildGradleContent).toContain('versionCode 11');
      expect(appBuildGradleContent).toContain('versionName "1.5.1"');

      const libBuildGradleContent = await readFile(
        path.join(tempDir, 'android/library/build.gradle')
      );
      expect(libBuildGradleContent).toContain('versionCode 11');
      expect(libBuildGradleContent).toContain('versionName "1.5.1"');
    });

    test('uses custom configuration file path', async () => {
      await createMockProject('basic', tempDir);

      // Create custom config
      const fs = await import('fs/promises');
      const customConfigPath = path.join(tempDir, 'my-custom-config.js');
      await fs.writeFile(
        customConfigPath,
        `
        export default {
          android: {
            files: ['android/app/build.gradle']
          },
          ios: {
            files: ['ios/*.xcodeproj/project.pbxproj']
          },
          packageJson: 'package.json'
        };
      `
      );

      const result = await runCLI([
        '--config',
        customConfigPath,
        '--android',
        '--increment',
        'patch',
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Version bump completed successfully');
    });
  });

  describe('Error Handling', () => {
    test('handles missing Android files gracefully', async () => {
      await createMockProject('ios-only', tempDir);

      const result = await runCLI(['--android', '--increment', 'patch']);

      expect(result.code).toBe(1);
      expect(result.stdout).toContain('❌ Error');
      expect(result.stdout).toContain('No Android or iOS files found');
    });

    test('handles missing iOS files gracefully', async () => {
      await createMockProject('android-only', tempDir);

      const result = await runCLI(['--ios', '--increment', 'patch']);

      expect(result.code).toBe(1);
      expect(result.stdout).toContain('❌ Error');
      expect(result.stdout).toContain('No Android or iOS files found');
    });

    test('handles invalid increment type', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--android', '--increment', 'invalid']);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Error');
    });
  });

  describe('Next Steps', () => {
    test('shows next steps after successful update', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--android', '--increment', 'patch']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('💡 Next steps:');
      expect(result.stdout).toContain('git add .');
      expect(result.stdout).toContain('git commit -m "chore: bump version"');
      expect(result.stdout).toContain('package.json version was also updated');
    });

    test('shows dry run warning', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--dry-run', '--android', '--increment', 'patch']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('⚠️  This was a dry run');
      expect(result.stdout).toContain('Remove --dry-run to apply the changes');
    });
  });

  describe('Cross-platform compatibility', () => {
    test('handles different path separators', async () => {
      await createMockProject('basic', tempDir);

      const result = await runCLI(['--android', '--increment', 'patch']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Version bump completed successfully');

      // Should work regardless of platform
      const buildGradleContent = await readFile(path.join(tempDir, 'android/app/build.gradle'));
      expect(buildGradleContent).toContain('versionCode 2');
    });
  });
});
