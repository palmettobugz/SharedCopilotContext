/**
 * MCP Resources - Resource definitions for SharedCopilotContext
 */

import { ContextManager } from './manager.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { existsSync } from 'fs';
import { glob } from 'glob';
import { getChatSessionsGlobPattern } from '../utils/paths.js';
import { parseChatSession, summarizeConversation } from '../utils/parser.js';
import { checkCommsStatus, getMessages, parseCommsUri } from './comms.js';

const manager = new ContextManager();

/**
 * Resource definitions for MCP server
 */
export const resources = [
  {
    uri: 'context://current',
    name: 'Current Context',
    mimeType: 'text/markdown',
    description: 'The current workspace\'s context.md file content'
  },
  {
    uri: 'context://sessions',
    name: 'Chat Sessions List',
    mimeType: 'application/json',
    description: 'List of all VS Code Copilot chat sessions with metadata'
  },
  {
    uri: 'context://sessions/{id}',
    name: 'Individual Chat Session',
    mimeType: 'application/json',
    description: 'Full content of a specific chat session'
  },
  {
    uri: 'context://comms',
    name: 'COMMS Messages',
    mimeType: 'application/json',
    description: 'Recent messages from COMMS'
  },
  {
    uri: 'context://comms/status',
    name: 'COMMS Status',
    mimeType: 'application/json',
    description: 'COMMS system health'
  }
];

/**
 * Handle resource read requests
 * @param {string} uri - Resource URI
 * @returns {Promise<Object>} Resource content
 */
export async function handleResourceRead(uri) {
  const workspace = process.env.WORKSPACE;
  
  try {
    if (uri === 'context://current') {
      const result = await manager.readContext(workspace);
      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: result.content
          }
        ]
      };
    }
    
    if (uri === 'context://sessions') {
      try {
        const pattern = getChatSessionsGlobPattern();
        const files = await glob(pattern, { windowsPathsNoEscape: true });
        
        const sessions = [];
        
        for (const file of files) {
          try {
            const session = parseChatSession(file);
            if (session) {
              const summary = summarizeConversation(session);
              sessions.push({
                id: file,
                title: summary.title,
                date: summary.date,
                messageCount: summary.messageCount
              });
            }
          } catch (error) {
            // Skip unparseable sessions
            continue;
          }
        }
        
        // Sort by date descending (most recent first)
        sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(sessions, null, 2)
            }
          ]
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to list sessions: ${error.message}`
        );
      }
    }
    
    // Check if it's a specific session request: context://sessions/{id}
    if (uri.startsWith('context://sessions/')) {
      const sessionId = uri.replace('context://sessions/', '');
      
      try {
        let sessionFile = sessionId;
        
        // Try direct path first
        if (!existsSync(sessionId)) {
          // Find by pattern
          const pattern = getChatSessionsGlobPattern();
          const files = await glob(pattern, { windowsPathsNoEscape: true });
          
          // Try numeric index
          const index = parseInt(sessionId, 10);
          if (!isNaN(index) && index >= 0 && index < files.length) {
            sessionFile = files[index];
          } else {
            // Try partial match
            const match = files.find(f => f.includes(sessionId));
            if (!match) {
              throw new Error(`Session not found: ${sessionId}`);
            }
            sessionFile = match;
          }
        }
        
        const session = parseChatSession(sessionFile);
        if (!session) {
          throw new Error(`Failed to parse session: ${sessionFile}`);
        }
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(session, null, 2)
            }
          ]
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to read session: ${error.message}`
        );
      }
    }
    
    // COMMS resources
    if (uri === 'context://comms/status') {
      try {
        const status = await checkCommsStatus();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(status, null, 2)
            }
          ]
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to get COMMS status: ${error.message}`
        );
      }
    }
    
    if (uri === 'context://comms' || uri.startsWith('context://comms?')) {
      try {
        const parsed = parseCommsUri(uri);
        const result = await getMessages(parsed.limit, parsed.messageType);
        
        if (result.offline) {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  offline: true,
                  error: result.error,
                  messages: []
                }, null, 2)
              }
            ]
          };
        }
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to get COMMS messages: ${error.message}`
        );
      }
    }
    
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Unknown resource URI: ${uri}`
    );
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Resource read failed: ${error.message}`
    );
  }
}
