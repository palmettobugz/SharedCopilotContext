/**
 * Command Parser - Parse @copilot commands from COMMS messages
 */

/**
 * Command patterns with their corresponding handlers
 */
const COMMAND_PATTERNS = [
  // recent [N] - List recent sessions
  {
    pattern: /^(?:recent|chats?|sessions?)(?:\s+(\d+))?$/i,
    command: 'list_sessions',
    extractArgs: (match) => ({ limit: parseInt(match[1]) || 30 })
  },
  // all - List all sessions (alias for recent with high limit)
  {
    pattern: /^all(?:\s+chats?|\s+sessions?)?$/i,
    command: 'list_sessions',
    extractArgs: () => ({ limit: 100 })
  },
  // search <query> - Search sessions
  {
    pattern: /^search\s+(.+)$/i,
    command: 'search_context',
    extractArgs: (match) => ({ query: match[1].trim() })
  },
  // find <query> - Alias for search
  {
    pattern: /^find\s+(.+)$/i,
    command: 'search_context',
    extractArgs: (match) => ({ query: match[1].trim() })
  },
  // context - Read current context.md
  {
    pattern: /^context$/i,
    command: 'read_context',
    extractArgs: () => ({})
  },
  // export <id> - Export specific session
  {
    pattern: /^export\s+(.+)$/i,
    command: 'export_conversation',
    extractArgs: (match) => ({ sessionId: match[1].trim() })
  },
  // status - Health check
  {
    pattern: /^status$/i,
    command: 'status',
    extractArgs: () => ({})
  },
  // help - Show available commands
  {
    pattern: /^help$/i,
    command: 'help',
    extractArgs: () => ({})
  }
];

/**
 * Parse a @copilot command from message content
 * @param {string} content - Full message content
 * @returns {Object|null} Parsed command or null if not a copilot command
 */
export function parseCommand(content) {
  // Check for @copilot mention
  const mentionPattern = /@copilot\s+(.+)/i;
  const mentionMatch = content.match(mentionPattern);
  
  if (!mentionMatch) {
    return null;
  }
  
  const commandText = mentionMatch[1].trim();
  
  // Try each pattern
  for (const { pattern, command, extractArgs } of COMMAND_PATTERNS) {
    const match = commandText.match(pattern);
    if (match) {
      return {
        command,
        args: extractArgs(match),
        raw: commandText
      };
    }
  }
  
  // Unknown command
  return {
    command: 'unknown',
    args: { text: commandText },
    raw: commandText
  };
}

/**
 * Check if a message mentions @copilot
 * @param {string} content - Message content
 * @returns {boolean}
 */
export function mentionsCopilot(content) {
  return /@copilot\b/i.test(content);
}

/**
 * Get list of available commands for help text
 * @returns {Array<Object>}
 */
export function getAvailableCommands() {
  return [
    { command: 'recent [N]', description: 'List last N chat sessions (default: 30)' },
    { command: 'all', description: 'List all available sessions' },
    { command: 'search <query>', description: 'Search sessions for a keyword' },
    { command: 'context', description: 'Show current context.md content' },
    { command: 'export <id>', description: 'Export a specific session' },
    { command: 'status', description: 'Show bridge status' },
    { command: 'help', description: 'Show this help message' }
  ];
}
