/**
 * Cross-platform path utilities for SharedCopilotContext
 * Handles Mac, Windows, and Linux path resolution
 */

import { homedir, platform } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Get the VS Code user data path based on platform
 * @returns {string} Path to VS Code user data directory
 */
export function getVSCodeUserDataPath() {
  const home = homedir();
  
  switch (platform()) {
    case 'darwin': // macOS
      return join(home, 'Library', 'Application Support', 'Code', 'User');
    case 'win32': // Windows
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Code', 'User');
    case 'linux':
      return join(home, '.config', 'Code', 'User');
    default:
      throw new Error(`Unsupported platform: ${platform()}`);
  }
}

/**
 * Get the workspace storage path for Copilot chat sessions
 * @returns {string} Path to workspace storage directory
 */
export function getWorkspaceStoragePath() {
  return join(getVSCodeUserDataPath(), 'workspaceStorage');
}

/**
 * Get glob pattern for finding chat session JSON files
 * @returns {string} Glob pattern for chat sessions
 */
export function getChatSessionsGlobPattern() {
  const storagePath = getWorkspaceStoragePath();
  return join(storagePath, '*', 'chatSessions', '*.json');
}

/**
 * Get the Copilot CLI config directory
 * @returns {string} Path to Copilot CLI config
 */
export function getCopilotCLIConfigPath() {
  return join(homedir(), '.copilot');
}

/**
 * Get the default context.md path for current working directory
 * @param {string} [workspaceRoot] - Optional workspace root override
 * @returns {string} Path to context.md
 */
export function getContextFilePath(workspaceRoot) {
  const root = workspaceRoot || process.cwd();
  return join(root, 'context.md');
}

/**
 * Check if we're running on Windows
 * @returns {boolean}
 */
export function isWindows() {
  return platform() === 'win32';
}

/**
 * Check if we're running on macOS
 * @returns {boolean}
 */
export function isMacOS() {
  return platform() === 'darwin';
}

/**
 * Get platform-specific line ending
 * @returns {string}
 */
export function getLineEnding() {
  return isWindows() ? '\r\n' : '\n';
}

/**
 * Normalize path separators for current platform
 * @param {string} filePath 
 * @returns {string}
 */
export function normalizePath(filePath) {
  if (isWindows()) {
    return filePath.replace(/\//g, '\\');
  }
  return filePath.replace(/\\/g, '/');
}

export default {
  getVSCodeUserDataPath,
  getWorkspaceStoragePath,
  getChatSessionsGlobPattern,
  getCopilotCLIConfigPath,
  getContextFilePath,
  isWindows,
  isMacOS,
  getLineEnding,
  normalizePath
};
