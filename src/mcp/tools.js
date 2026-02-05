/**
 * MCP Tools - Tool implementations for SharedCopilotContext
 */

import { ContextManager } from './manager.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { existsSync, readFileSync, writeFileSync, statSync } from 'fs';
import { glob } from 'glob';
import { getContextFilePath, getChatSessionsGlobPattern } from '../utils/paths.js';
import { parseChatSession, formatForExport, generateTitle } from '../utils/parser.js';
import { sendMessage } from './comms.js';

const manager = new ContextManager();

/**
 * Tool definitions for MCP server
 */
export const tools = [
  {
    name: 'read_context',
    description: 'Read the current workspace\'s context.md file',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Optional workspace root path. Defaults to WORKSPACE env var or CWD.'
        },
        format: {
          type: 'string',
          enum: ['markdown', 'plain'],
          default: 'markdown',
          description: 'Output format'
        }
      }
    }
  },
  {
    name: 'append_context',
    description: 'Append a new entry to the context.md file with timestamp',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Content to append'
        },
        workspace: {
          type: 'string',
          description: 'Optional workspace root path'
        },
        title: {
          type: 'string',
          description: 'Optional session title (defaults to timestamp)'
        }
      },
      required: ['content']
    }
  },
  {
    name: 'init_context',
    description: 'Create a new context.md file with template',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Optional workspace root path'
        },
        projectName: {
          type: 'string',
          description: 'Optional project name for template'
        },
        projectDescription: {
          type: 'string',
          description: 'Optional project description'
        }
      }
    }
  },
  {
    name: 'export_conversation',
    description: 'Export a VS Code chat session to context.md',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Chat session file path or index number'
        },
        workspace: {
          type: 'string',
          description: 'Optional workspace root path'
        },
        format: {
          type: 'string',
          enum: ['full', 'summary'],
          default: 'summary',
          description: 'Export format'
        }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'search_conversations',
    description: 'Search VS Code Copilot chat history for keywords',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        limit: {
          type: 'integer',
          default: 10,
          description: 'Maximum results to return'
        },
        dateFrom: {
          type: 'string',
          description: 'Filter from date (ISO format)'
        },
        dateTo: {
          type: 'string',
          description: 'Filter to date (ISO format)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_context_summary',
    description: 'Get statistics about context.md',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Optional workspace root path'
        }
      }
    }
  },
  {
    name: 'comms_broadcast',
    description: 'Broadcast a message to the COMMS system',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Message content'
        },
        message_type: {
          type: 'string',
          enum: ['status', 'question', 'info', 'alert'],
          default: 'info',
          description: 'Message type'
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata'
        }
      },
      required: ['content']
    }
  }
];

/**
 * Handle tool calls
 * @param {string} name - Tool name
 * @param {Object} args - Tool arguments
 * @returns {Promise<Object>} Tool result
 */
export async function handleToolCall(name, args) {
  const workspace = args.workspace || process.env.WORKSPACE;
  
  try {
    switch (name) {
      case 'read_context': {
        const result = await manager.readContext(workspace);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      case 'append_context': {
        if (!args.content) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Content parameter is required'
          );
        }
        const result = await manager.appendContext(workspace, args.content, args.title);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      case 'init_context': {
        const result = await manager.initContext(workspace, args.projectName, args.projectDescription);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      case 'export_conversation': {
        if (!args.sessionId) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'sessionId parameter is required'
          );
        }
        const result = await manager.exportConversation(args.sessionId, workspace, args.format || 'summary');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      case 'search_conversations': {
        if (!args.query) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'query parameter is required'
          );
        }
        const result = await manager.searchConversations(args.query, {
          limit: args.limit || 10,
          dateFrom: args.dateFrom,
          dateTo: args.dateTo
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      case 'get_context_summary': {
        const result = await manager.getSummary(workspace);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      case 'comms_broadcast': {
        if (!args.content) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Content parameter is required'
          );
        }
        const result = await sendMessage(
          args.content,
          args.message_type || 'info',
          args.metadata || {}
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    
    // Convert regular errors to MCP errors
    if (error.message.includes('not found')) {
      throw new McpError(
        ErrorCode.InvalidParams,
        error.message
      );
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error.message}`
    );
  }
}
