import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Create a mock React Native project in a temporary directory
 * @param {string} type - Type of project (basic, ios-only, android-only, custom-config)
 * @param {string} tempDir - Target directory
 * @returns {Promise<string>} - Path to created project
 */
export async function createMockProject(type = 'basic', tempDir) {
  const fixturePath = path.join(__dirname, '..', 'fixtures', `${type}-rn-project`);

  // Copy fixture to temp directory
  await copyDirectory(fixturePath, tempDir);
  return tempDir;
}

/**
 * Copy directory recursively
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Create a temporary directory and clean it up after test
 * @param {string} prefix - Directory prefix
 * @returns {Promise<{path: string, cleanup: Function}>}
 */
export async function createTempDir(prefix = 'vbump-test-') {
  const os = await import('os');
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));

  const cleanup = async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  return { path: tempDir, cleanup };
}

/**
 * Read file content from a path
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} - File content
 */
export async function readFile(filePath) {
  return await fs.readFile(filePath, 'utf8');
}

/**
 * Write content to a file
 * @param {string} filePath - Path to file
 * @param {string} content - Content to write
 */
export async function writeFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>}
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
