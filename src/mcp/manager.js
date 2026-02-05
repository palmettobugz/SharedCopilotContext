/**
 * Context Manager - High-level context management logic
 * Handles reading, writing, and managing context.md files
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { getContextFilePath, getLineEnding } from '../utils/paths.js';

const LINE_ENDING = getLineEnding();

/**
 * Context management class for MCP server
 */
export class ContextManager {
  /**
   * Read the context.md file from a workspace
   * @param {string} [workspace] - Workspace root path (defaults to cwd)
   * @returns {Promise<Object>} Context content and metadata
   * @throws {Error} If file not found or read error
   */
  async readContext(workspace) {
    const contextPath = getContextFilePath(workspace);
    
    if (!existsSync(contextPath)) {
      throw new Error(`context.md not found at ${contextPath}. Run init_context tool first.`);
    }
    
    try {
      const content = readFileSync(contextPath, 'utf-8');
      const stats = statSync(contextPath);
      
      // Count sessions in the file
      const sessionMatches = content.match(/^## Session/gm) || [];
      const sessionCount = sessionMatches.length;
      
      return {
        content,
        metadata: {
          path: contextPath,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
         sessionCount
        }
      };
    } catch (error) {
      throw new Error(`Failed to read context.md: ${error.message}`);
    }
  }
  
  /**
   * Append content to the context.md file with timestamp
   * @param {string} [workspace] - Workspace root path
   * @param {string} content - Content to append
   * @param {string} [title] - Optional session title
   * @returns {Promise<Object>} Success confirmation with timestamp
   * @throws {Error} If file not found or write error
   */
  async appendContext(workspace, content, title) {
    const contextPath = getContextFilePath(workspace);
    
    if (!existsSync(contextPath)) {
      throw new Error(`context.md not found at ${contextPath}. Run init_context tool first.`);
    }
    
    if (!content || content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }
    
    try {
      const now = new Date();
      const timestamp = now.toISOString().replace('T', ' ').substring(0, 16);
      
      // Build the new entry
      const sessionTitle = title ? `${title}` : timestamp;
      const newEntry = `${LINE_ENDING}## Session ${sessionTitle}${LINE_ENDING}${LINE_ENDING}${content.trim()}${LINE_ENDING}${LINE_ENDING}---${LINE_ENDING}`;
      
      // Read existing content and append
      const existingContent = readFileSync(contextPath, 'utf-8');
      const updatedContent = existingContent + newEntry;
      
      writeFileSync(contextPath, updatedContent, 'utf-8');
      
      return {
        success: true,
        timestamp,
        path: contextPath
      };
    } catch (error) {
      throw new Error(`Failed to append to context.md: ${error.message}`);
    }
  }
}

export default ContextManager;
