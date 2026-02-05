/**
 * MCP Prompts - Prompt templates for SharedCopilotContext
 */

import { ContextManager } from './manager.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

const manager = new ContextManager();

/**
 * Prompt definitions for MCP server
 */
export const prompts = [
  {
    name: 'read_and_continue',
    description: 'Read context.md and continue from where you left off',
    arguments: [
      {
        name: 'workspace',
        description: 'Optional workspace root path',
        required: false
      }
    ]
  },
  {
    name: 'summarize_and_save',
    description: 'Summarize the current session and save to context.md',
    arguments: [
      {
        name: 'message_count',
        description: 'Number of messages in current session',
        required: true
      },
      {
        name: 'workspace',
        description: 'Optional workspace root path',
        required: false
      }
    ]
  }
];

/**
 * Handle prompt get requests
 * @param {string} name - Prompt name
 * @param {Object} args - Prompt arguments
 * @returns {Promise<Object>} Prompt with filled template
 */
export async function handlePromptGet(name, args) {
  const workspace = args.workspace || process.env.WORKSPACE;
  
  try {
    switch (name) {
      case 'read_and_continue': {
        // Read context.md content
        const result = await manager.readContext(workspace);
        const context = result.content;
        
        // Fill template
        const prompt = `Read the project context from context.md, understand the current state, and continue working on the task. Pay attention to:
- Recent sessions and decisions
- Open items and unfinished work
- Project conventions and patterns

Here's the context:

${context}

What would you like me to help with?`;
        
        return {
          description: 'Read context and continue working',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: prompt
              }
            }
          ]
        };
      }
      
      case 'summarize_and_save': {
        const messageCount = args.message_count || 0;
        
        const prompt = `Summarize the current conversation session and append it to context.md. Include:
- What was accomplished
- Any decisions made
- Files modified
- Next steps or open items

Current session has ${messageCount} messages.`;
        
        return {
          description: 'Summarize session and save to context',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: prompt
              }
            }
          ]
        };
      }
      
      default:
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unknown prompt: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Prompt generation failed: ${error.message}`
    );
  }
}
