/**
 * MCP Tools - Tool implementations for SharedCopilotContext
 */

import { ContextManager } from './manager.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

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
