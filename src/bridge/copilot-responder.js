#!/usr/bin/env node
/**
 * Copilot Bridge Agent - Connects @copilot mentions in COMMS to MCP tools
 * 
 * Polls COMMS for messages, responds to @copilot commands with
 * VS Code Copilot conversation history data.
 * 
 * Usage:
 *   node src/bridge/copilot-responder.js
 *   COMMS_URL=http://192.168.4.3:5052 node src/bridge/copilot-responder.js
 */

import { parseCommand, mentionsCopilot } from './command-parser.js';
import {
  formatSessionList,
  formatSearchResults,
  formatContext,
  formatExportResult,
  formatStatus,
  formatHelp,
  formatUnknown,
  formatError
} from './response-formatter.js';
import { ContextManager } from '../mcp/manager.js';
import { handleResourceRead } from '../mcp/resources.js';
import { getMessages, sendMessage as commsSend, checkCommsStatus } from '../mcp/comms.js';

// Configuration
const COMMS_URL = process.env.COMMS_URL || 'http://star-force-one.local:5052';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL) || 2000;
const AGENT_ID = 'copilot-bridge';
const AGENT_NAME = '🌐 Copilot (SharedContext)';

/**
 * Copilot Bridge Responder
 */
class CopilotResponder {
  constructor() {
    this.agentId = AGENT_ID;
    this.agentName = AGENT_NAME;
    this.commsUrl = COMMS_URL;
    this.pollInterval = POLL_INTERVAL;
    this.running = false;
    this.seenMessageIds = new Set();
    this.startTime = null;
    this.manager = new ContextManager();
  }
  
  /**
   * Start the responder
   */
  async start() {
    console.log(`🌐 Copilot Bridge Agent starting...`);
    console.log(`   Agent ID: ${this.agentId}`);
    console.log(`   COMMS: ${this.commsUrl}`);
    console.log(`   Poll interval: ${this.pollInterval}ms`);
    
    // Check COMMS connectivity
    const status = await checkCommsStatus();
    if (status.offline) {
      console.error(`❌ Cannot reach COMMS: ${status.error}`);
      console.log(`   Will retry on poll...`);
    } else {
      console.log(`✅ COMMS connected`);
    }
    
    this.running = true;
    this.startTime = Date.now();
    
    // Send online message
    await this.sendResponse(`${this.agentName} online. Type \`@copilot help\` for commands.`);
    
    // Start polling
    await this.pollLoop();
  }
  
  /**
   * Stop the responder
   */
  async stop() {
    console.log(`\n🔴 Copilot Bridge going offline...`);
    this.running = false;
    await this.sendResponse(`${this.agentName} going offline.`);
  }
  
  /**
   * Main polling loop
   */
  async pollLoop() {
    while (this.running) {
      try {
        const result = await getMessages(20);
        
        if (!result.offline && result.messages) {
          for (const msg of result.messages) {
            await this.processMessage(msg);
          }
        }
      } catch (error) {
        console.error(`Poll error: ${error.message}`);
      }
      
      // Wait for next poll
      await this.sleep(this.pollInterval);
    }
  }
  
  /**
   * Process a single message
   * @param {Object} message - COMMS message object
   */
  async processMessage(message) {
    const msgId = message.id;
    
    // Skip if already processed
    if (this.seenMessageIds.has(msgId)) {
      return;
    }
    this.seenMessageIds.add(msgId);
    
    // Keep set from growing too large
    if (this.seenMessageIds.size > 200) {
      const arr = Array.from(this.seenMessageIds);
      this.seenMessageIds = new Set(arr.slice(-100));
    }
    
    // Skip our own messages
    const senderId = (message.sender_id || '').toLowerCase();
    if (senderId === this.agentId) {
      return;
    }
    
    // Check for @copilot mention
    const content = message.content || '';
    if (!mentionsCopilot(content)) {
      return;
    }
    
    console.log(`📨 Processing: ${content.substring(0, 50)}...`);
    
    // Parse command
    const parsed = parseCommand(content);
    if (!parsed) {
      return;
    }
    
    // Execute command
    let response;
    try {
      response = await this.executeCommand(parsed);
    } catch (error) {
      console.error(`Command error: ${error.message}`);
      response = formatError(error.message);
    }
    
    // Send response
    if (response) {
      await this.sendResponse(response);
      console.log(`✅ Responded to ${parsed.command}`);
    }
  }
  
  /**
   * Execute a parsed command
   * @param {Object} parsed - Parsed command object
   * @returns {Promise<string>} Response text
   */
  async executeCommand(parsed) {
    const { command, args } = parsed;
    
    switch (command) {
      case 'list_sessions':
        return await this.handleListSessions(args.limit || 30);
      
      case 'search_context':
        return await this.handleSearch(args.query);
      
      case 'read_context':
        return await this.handleReadContext();
      
      case 'export_conversation':
        return await this.handleExport(args.sessionId);
      
      case 'status':
        return await this.handleStatus();
      
      case 'help':
        return formatHelp();
      
      case 'unknown':
      default:
        return formatUnknown(args.text || parsed.raw);
    }
  }
  
  /**
   * Handle list_sessions command
   */
  async handleListSessions(limit) {
    try {
      const result = await handleResourceRead('context://sessions');
      const sessions = JSON.parse(result.contents[0].text);
      return formatSessionList(sessions, limit);
    } catch (error) {
      return formatError(`Failed to list sessions: ${error.message}`);
    }
  }
  
  /**
   * Handle search command
   */
  async handleSearch(query) {
    try {
      const result = await this.manager.searchConversations(query, { limit: 10 });
      return formatSearchResults(result, query);
    } catch (error) {
      return formatError(`Search failed: ${error.message}`);
    }
  }
  
  /**
   * Handle read_context command
   */
  async handleReadContext() {
    try {
      const result = await this.manager.readContext();
      return formatContext(result.content);
    } catch (error) {
      return formatError(`Failed to read context: ${error.message}`);
    }
  }
  
  /**
   * Handle export command
   */
  async handleExport(sessionId) {
    try {
      const result = await this.manager.exportConversation(sessionId, undefined, 'summary');
      return formatExportResult({ success: true, ...result }, sessionId);
    } catch (error) {
      return formatExportResult({ success: false, error: error.message }, sessionId);
    }
  }
  
  /**
   * Handle status command
   */
  async handleStatus() {
    const commsStatus = await checkCommsStatus();
    
    // Count sessions
    let sessionsIndexed = 0;
    try {
      const result = await handleResourceRead('context://sessions');
      const sessions = JSON.parse(result.contents[0].text);
      sessionsIndexed = sessions.length;
    } catch {
      // Ignore
    }
    
    const uptime = this.formatUptime(Date.now() - this.startTime);
    
    return formatStatus({
      agentId: this.agentId,
      station: 'Local',
      commsConnected: !commsStatus.offline,
      commsUrl: this.commsUrl,
      uptime,
      sessionsIndexed
    });
  }
  
  /**
   * Send a response to COMMS
   * @param {string} text - Response text
   * @returns {Promise<boolean>} Success
   */
  async sendResponse(text) {
    try {
      const response = await fetch(`${this.commsUrl}/api/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender_id: this.agentId,
          sender_name: this.agentName,
          sender_type: 'agent',
          content: text,
          message_type: 'response'
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error(`Failed to send response: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Format uptime duration
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
  
  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main entry point
async function main() {
  const responder = new CopilotResponder();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await responder.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await responder.stop();
    process.exit(0);
  });
  
  try {
    await responder.start();
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
