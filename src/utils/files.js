import fs from 'fs';
import path from 'path';

/**
 * Resolve file patterns to actual file paths
 * Supports glob patterns (specifically for *.xcodeproj) and regular paths
 * @param {Array<string>} patterns - Array of file path patterns
 * @param {string} projectRoot - Root directory of the project
 * @returns {Array<string>} Array of resolved file paths that exist
 */
export function resolveFilePaths(patterns, projectRoot) {
  const resolvedPaths = [];

  for (const pattern of patterns) {
    const resolvedPattern = resolveFilePattern(pattern, projectRoot);
    resolvedPaths.push(...resolvedPattern);
  }

  return resolvedPaths;
}

/**
 * Resolve a single file pattern to one or more actual paths
 * Handles both glob patterns and direct file paths
 * @param {string} pattern - File path pattern
 * @param {string} projectRoot - Root directory of the project
 * @returns {Array<string>} Array of resolved file paths
 */
function resolveFilePattern(pattern, projectRoot) {
  const fullPattern = path.isAbsolute(pattern) ? pattern : path.join(projectRoot, pattern);

  if (pattern.includes('*')) {
    return resolveGlobPattern(pattern, projectRoot);
  } else {
    return resolveDirectPath(fullPattern);
  }
}

/**
 * Resolve glob pattern to matching file paths
 * Currently supports *.xcodeproj pattern for iOS projects
 * @param {string} pattern - Original pattern (e.g., "ios/*.xcodeproj/project.pbxproj")
 * @param {string} projectRoot - Project root directory
 * @returns {Array<string>} Array of matching file paths
 */
function resolveGlobPattern(pattern, projectRoot) {
  const resolvedPaths = [];

  // Handle iOS xcodeproj pattern specifically
  if (pattern.includes('*.xcodeproj')) {
    // Extract the directory part before the glob (e.g., "ios" from "ios/*.xcodeproj/project.pbxproj")
    const patternParts = pattern.split('*');
    const dirPart = patternParts[0]; // "ios/"
    // const filePart = patternParts[1]; // ".xcodeproj/project.pbxproj"

    const searchDir = path.join(projectRoot, dirPart);

    if (!fs.existsSync(searchDir)) {
      return resolvedPaths;
    }

    const files = fs.readdirSync(searchDir);

    // Look for .xcodeproj directories
    const xcodeprojDirs = files.filter((file) => {
      const fullPath = path.join(searchDir, file);
      return fs.statSync(fullPath).isDirectory() && file.endsWith('.xcodeproj');
    });

    for (const xcodeprojDir of xcodeprojDirs) {
      // Construct the full path to project.pbxproj
      const pbxprojPath = path.join(searchDir, xcodeprojDir, 'project.pbxproj');

      if (fs.existsSync(pbxprojPath)) {
        resolvedPaths.push(pbxprojPath);
      }
    }
  }

  return resolvedPaths;
}

/**
 * Resolve direct file path (non-glob)
 * @param {string} fullPath - Complete file path
 * @returns {Array<string>} Array with single path if file exists, empty array otherwise
 */
function resolveDirectPath(fullPath) {
  if (fs.existsSync(fullPath)) {
    return [fullPath];
  }
  return [];
}
