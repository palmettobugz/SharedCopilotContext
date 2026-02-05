/**
 * Response Formatter - Format MCP results for COMMS chat display
 */

import { getAvailableCommands } from './command-parser.js';

/**
 * Format a list of sessions for chat display
 * @param {Array} sessions - Array of session objects
 * @param {number} limit - Max sessions to show
 * @returns {string} Formatted response
 */
export function formatSessionList(sessions, limit = 30) {
  if (!sessions || sessions.length === 0) {
    return '📋 No chat sessions found.';
  }
  
  const displayed = sessions.slice(0, limit);
  const lines = [`📋 **Last ${displayed.length} Chat Sessions**\n`];
  
  displayed.forEach((session, index) => {
    const num = (index + 1).toString().padStart(2, ' ');
    const title = session.title || 'Untitled';
    const date = formatDate(session.date);
    const msgs = session.messageCount || '?';
    
    // Truncate long titles
    const maxTitleLen = 40;
    const displayTitle = title.length > maxTitleLen 
      ? title.substring(0, maxTitleLen - 3) + '...'
      : title;
    
    lines.push(`${num}. ${displayTitle} (${date}, ${msgs} msgs)`);
  });
  
  if (sessions.length > limit) {
    lines.push(`\n_...and ${sessions.length - limit} more sessions_`);
  }
  
  return lines.join('\n');
}

/**
 * Format search results for chat display
 * @param {Object} results - Search results object
 * @param {string} query - Original search query
 * @returns {string} Formatted response
 */
export function formatSearchResults(results, query) {
  if (!results || !results.results || results.results.length === 0) {
    return `🔍 No results found for "${query}"`;
  }
  
  const lines = [`🔍 **Found ${results.results.length} matches for "${query}"**\n`];
  
  results.results.slice(0, 10).forEach((result, index) => {
    const num = (index + 1).toString().padStart(2, ' ');
    const source = result.source || 'Unknown';
    const preview = result.preview 
      ? truncate(result.preview, 60)
      : '';
    
    lines.push(`${num}. ${source}`);
    if (preview) {
      lines.push(`    _"${preview}"_`);
    }
  });
  
  if (results.results.length > 10) {
    lines.push(`\n_...and ${results.results.length - 10} more results_`);
  }
  
  return lines.join('\n');
}

/**
 * Format context.md content for chat display
 * @param {string} content - Raw context content
 * @returns {string} Formatted response
 */
export function formatContext(content) {
  if (!content) {
    return '📄 No context.md found in workspace.';
  }
  
  // Truncate if too long for chat
  const maxLen = 1500;
  if (content.length > maxLen) {
    const truncated = content.substring(0, maxLen);
    const lastNewline = truncated.lastIndexOf('\n');
    const cleanTruncate = lastNewline > 0 ? truncated.substring(0, lastNewline) : truncated;
    
    return `📄 **context.md** (truncated)\n\n${cleanTruncate}\n\n_...content truncated (${content.length} chars total)_`;
  }
  
  return `📄 **context.md**\n\n${content}`;
}

/**
 * Format export result for chat display
 * @param {Object} result - Export result
 * @param {string} sessionId - Session identifier
 * @returns {string} Formatted response
 */
export function formatExportResult(result, sessionId) {
  if (!result || !result.success) {
    return `❌ Failed to export session: ${result?.error || 'Unknown error'}`;
  }
  
  return `✅ **Session Exported**\n\nSession "${sessionId}" has been appended to context.md.\n\nMessages: ${result.messageCount || '?'}\nFormat: ${result.format || 'summary'}`;
}

/**
 * Format status check for chat display
 * @param {Object} status - Status object
 * @returns {string} Formatted response
 */
export function formatStatus(status) {
  const lines = ['✅ **Copilot Bridge Status**\n'];
  
  lines.push(`Agent ID: ${status.agentId || 'copilot-bridge'}`);
  lines.push(`Station: ${status.station || 'Unknown'}`);
  lines.push(`COMMS: ${status.commsConnected ? 'Connected' : 'Disconnected'} (${status.commsUrl || 'N/A'})`);
  lines.push(`Uptime: ${status.uptime || 'N/A'}`);
  
  if (status.sessionsIndexed !== undefined) {
    lines.push(`Sessions indexed: ${status.sessionsIndexed}`);
  }
  
  return lines.join('\n');
}

/**
 * Format help message for chat display
 * @returns {string} Formatted response
 */
export function formatHelp() {
  const commands = getAvailableCommands();
  const lines = ['🌐 **Copilot Bridge Commands**\n'];
  
  commands.forEach(({ command, description }) => {
    lines.push(`• \`@copilot ${command}\` - ${description}`);
  });
  
  lines.push('\n**Examples:**');
  lines.push('• `@copilot recent 10` - Show last 10 sessions');
  lines.push('• `@copilot search MCP` - Find sessions mentioning MCP');
  lines.push('• `@copilot context` - Show current context');
  
  return lines.join('\n');
}

/**
 * Format unknown command response
 * @param {string} text - The unrecognized command text
 * @returns {string} Formatted response
 */
export function formatUnknown(text) {
  return `❓ Unknown command: "${text}"\n\nType \`@copilot help\` to see available commands.`;
}

/**
 * Format an error response
 * @param {string} message - Error message
 * @returns {string} Formatted response
 */
export function formatError(message) {
  return `❌ Error: ${message}`;
}

// Helper functions

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function truncate(text, maxLen) {
  if (!text || text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + '...';
}
