/**
 * MCP Resources - Resource definitions for SharedCopilotContext
 */

import { ContextManager } from './manager.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

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
