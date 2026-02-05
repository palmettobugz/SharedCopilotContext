/**
 * Context Manager - High-level context management logic
 * Handles reading, writing, and managing context.md files
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { getContextFilePath, getLineEnding, getChatSessionsGlobPattern } from '../utils/paths.js';
import { parseChatSession, formatForExport, generateTitle, summarizeConversation } from '../utils/parser.js';
import { glob } from 'glob';

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
  
  /**
   * Initialize a new context.md file with template
   * @param {string} [workspace] - Workspace root path
   * @param {string} [projectName] - Optional project name
   * @param {string} [projectDescription] - Optional project description
   * @returns {Promise<Object>} Success confirmation
   * @throws {Error} If file already exists or write error
   */
  async initContext(workspace, projectName, projectDescription) {
    const contextPath = getContextFilePath(workspace);
    
    if (existsSync(contextPath)) {
      throw new Error(`context.md already exists at ${contextPath}`);
    }
    
    try {
      const now = new Date().toISOString();
      let template = `# Shared Copilot Context

> This file enables context sharing between GitHub Copilot sessions in VS Code and CLI.
> AI agents should read this file at session start and append summaries at session end.

## Instructions for Agents

Read this file for prior conversation context. At the end of your session, append a summary using the format below.

## Project Overview

`;
      
      if (projectName) {
        template += `**${projectName}**\n\n`;
      }
      
      if (projectDescription) {
        template += `${projectDescription}\n\n`;
      } else {
        template += `<!-- Add project description here -->\n\n`;
      }
      
      template += `## Session History

<!-- Session summaries will be appended below -->

---

*Context file initialized: ${now}*
`;
      
      writeFileSync(contextPath, template, 'utf-8');
      
      return {
        success: true,
        path: contextPath,
        template: 'standard'
      };
    } catch (error) {
      throw new Error(`Failed to create context.md: ${error.message}`);
    }
  }
  
  /**
   * Export a conversation to context.md
   * @param {string} sessionId - Session file path or identifier
   * @param {string} [workspace] - Workspace root path
   * @param {string} [format='summary'] - Export format (full or summary)
   * @returns {Promise<Object>} Export result
   * @throws {Error} If session not found or context.md doesn't exist
   */
  async exportConversation(sessionId, workspace, format = 'summary') {
    const contextPath = getContextFilePath(workspace);
    
    if (!existsSync(contextPath)) {
      throw new Error(`context.md not found at ${contextPath}. Run init_context tool first.`);
    }
    
    try {
      // Find session file
      let sessionFile = sessionId;
      if (!existsSync(sessionId)) {
        // Try to find by pattern
        const pattern = getChatSessionsGlobPattern();
        const files = await glob(pattern, { windowsPathsNoEscape: true });
        
        // If sessionId is a number, treat as index
        const index = parseInt(sessionId, 10);
        if (!isNaN(index) && index >= 0 && index < files.length) {
          sessionFile = files[index];
        } else {
          // Try to find by partial match
          const match = files.find(f => f.includes(sessionId));
          if (!match) {
            throw new Error(`Session not found: ${sessionId}`);
          }
          sessionFile = match;
        }
      }
      
      // Parse session
      const session = parseChatSession(sessionFile);
      if (!session) {
        throw new Error(`Failed to parse session: ${sessionFile}`);
      }
      
      // Format and append
      const formatted = formatForExport(session);
      const existingContent = readFileSync(contextPath, 'utf-8');
      writeFileSync(contextPath, existingContent + LINE_ENDING + formatted, 'utf-8');
      
      const title = generateTitle(session);
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
      
      return {
        success: true,
        exported: {
          title,
          messageCount: session.requests.length,
          timestamp
        }
      };
    } catch (error) {
      throw new Error(`Failed to export conversation: ${error.message}`);
    }
  }
  
  /**
   * Search conversations for a query
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {number} [options.limit=10] - Maximum results
   * @param {string} [options.dateFrom] - Filter from date
   * @param {string} [options.dateTo] - Filter to date
   * @returns {Promise<Object>} Search results
   * @throws {Error} If query is empty or search fails
   */
  async searchConversations(query, options = {}) {
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }
    
    try {
      const pattern = getChatSessionsGlobPattern();
      const files = await glob(pattern, { windowsPathsNoEscape: true });
      
      if (files.length === 0) {
        return {
          results: [],
          totalFound: 0
        };
      }
      
      const results = [];
      const queryLower = query.toLowerCase();
      const dateFrom = options.dateFrom ? new Date(options.dateFrom) : null;
      const dateTo = options.dateTo ? new Date(options.dateTo) : null;
      
      for (const file of files) {
        const session = parseChatSession(file);
        if (!session || session.requests.length === 0) continue;
        
        // Date filter
        if (dateFrom && session.modifiedAt < dateFrom) continue;
        if (dateTo && session.modifiedAt > dateTo) continue;
        
        // Search in messages
        let matchCount = 0;
        const snippets = [];
        
        for (const request of session.requests) {
          if (request.userMessage && request.userMessage.toLowerCase().includes(queryLower)) {
            matchCount++;
            snippets.push({
              text: request.userMessage.substring(0, 100) + (request.userMessage.length > 100 ? '...' : ''),
              type: 'user'
            });
          }
          if (request.response && request.response.toLowerCase().includes(queryLower)) {
            matchCount++;
            snippets.push({
              text: request.response.substring(0, 100) + (request.response.length > 100 ? '...' : ''),
              type: 'assistant'
            });
          }
        }
        
        if (matchCount > 0) {
          const summary = summarizeConversation(session);
          results.push({
            sessionId: file,
            title: summary.title,
            date: summary.date,
            relevance: matchCount / session.requests.length,
            snippets: snippets.slice(0, 3) // Limit to 3 snippets per session
          });
        }
      }
      
      // Sort by relevance descending
      results.sort((a, b) => b.relevance - a.relevance);
      
      const limit = options.limit || 10;
      return {
        results: results.slice(0, limit),
        totalFound: results.length
      };
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }
  
  /**
   * Get summary statistics about context.md
   * @param {string} [workspace] - Workspace root path
   * @returns {Promise<Object>} Context summary
   * @throws {Error} If read error occurs
   */
  async getSummary(workspace) {
    const contextPath = getContextFilePath(workspace);
    
    if (!existsSync(contextPath)) {
      return {
        path: contextPath,
        exists: false,
        stats: null,
        lastModified: null,
        recentSessions: []
      };
    }
    
    try {
      const content = readFileSync(contextPath, 'utf-8');
      const stats = statSync(contextPath);
      const lines = content.split(/\r?\n/);
      
      // Count sessions
      const sessionMatches = content.match(/^## Session/gm) || [];
      const sessionCount = sessionMatches.length;
      
      // Count words
      const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
      
      // Extract recent sessions
      const recentSessions = [];
      const sessionRegex = /^## Session (.+?)$\n([\s\S]*?)(?=\n##|\n---)/gm;
      let match;
      let count = 0;
      
      while ((match = sessionRegex.exec(content)) !== null && count < 3) {
        const preview = match[2].trim().substring(0, 100).replace(/\n/g, ' ');
        recentSessions.push({
          timestamp: match[1],
          preview: preview + (match[2].length > 100 ? '...' : '')
        });
        count++;
      }
      
      return {
        path: contextPath,
        exists: true,
        stats: {
          size: stats.size,
          lines: lines.length,
          words: wordCount,
          sessions: sessionCount
        },
        lastModified: stats.mtime.toISOString(),
        recentSessions: recentSessions.reverse() // Most recent first
      };
    } catch (error) {
      throw new Error(`Failed to get summary: ${error.message}`);
    }
  }
}

export default ContextManager;
