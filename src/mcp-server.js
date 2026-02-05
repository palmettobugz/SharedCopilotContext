#!/usr/bin/env node

/**
 * MCP Server for SharedCopilotContext
 * 
 * Provides Model Context Protocol interface for accessing context.md
 * and VS Code Copilot conversation history.
 * 
 * Usage:
 *   node src/mcp-server.js
 *   
 * Environment Variables:
 *   WORKSPACE - Workspace root path (defaults to cwd)
 *   LOG_LEVEL - Logging level (error, warn, info, debug)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { tools, handleToolCall } from './mcp/tools.js';
import { resources, handleResourceRead } from './mcp/resources.js';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * Log to stderr (stdout is used for MCP protocol)
 */
function log(level, message, ...args) {
  if (LOG_LEVEL === 'error' && level !== 'error') return;
  if (LOG_LEVEL === 'warn' && !['error', 'warn'].includes(level)) return;
  if (LOG_LEVEL === 'info' && ['debug'].includes(level)) return;
  
  console.error(`[${level.toUpperCase()}] ${message}`, ...args);
}

/**
 * Main entry point
 */
async function main() {
  log('info', 'Starting SharedCopilotContext MCP server...');
  log('info', `Workspace: ${process.env.WORKSPACE || process.cwd()}`);
  
  // Create MCP server
  const server = new Server(
    {
      name: 'shared-copilot-context',
      version: '1.0.0'
    },
    {
      capabilities: {
        resources: {},
        tools: {}
      }
    }
  );
  
  // Register list resources handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    log('debug', 'resources/list called');
    return { resources };
  });
  
  // Register read resource handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    log('debug', `resources/read called: ${uri}`);
    return await handleResourceRead(uri);
  });
  
  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    log('debug', 'tools/list called');
    return { tools };
  });
  
  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    log('debug', `tools/call called: ${name}`);
    return await handleToolCall(name, args || {});
  });
  
  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  log('info', 'MCP server started successfully');
  log('info', `Available tools: ${tools.map(t => t.name).join(', ')}`);
  log('info', `Available resources: ${resources.map(r => r.uri).join(', ')}`);
}

// Error handling
process.on('uncaughtException', (error) => {
  log('error', 'Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  log('error', 'Unhandled rejection:', error);
  process.exit(1);
});

// Start server
main().catch((error) => {
  log('error', 'Fatal error:', error);
  process.exit(1);
});
