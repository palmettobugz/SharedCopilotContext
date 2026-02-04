/**
 * Parser utilities for VS Code Copilot chat session JSON files
 */

import { readFileSync, statSync } from 'fs';

/**
 * Parse a chat session JSON file and extract conversation data
 * @param {string} filePath - Path to the JSON file
 * @returns {Object|null} Parsed conversation data or null if invalid
 */
export function parseChatSession(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    if (!data.requests || !Array.isArray(data.requests)) {
      return null;
    }
    
    const fileStats = statSync(filePath);
    
    return {
      filePath,
      version: data.version || 1,
      responderUsername: data.responderUsername || 'GitHub Copilot',
      initialLocation: data.initialLocation || 'panel',
      modifiedAt: fileStats.mtime,
      createdAt: fileStats.birthtime,
      requests: data.requests.map(parseRequest).filter(Boolean)
    };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Parse a single request from the chat session
 * @param {Object} request - Raw request object
 * @returns {Object|null} Parsed request or null
 */
function parseRequest(request) {
  if (!request || !request.message) {
    return null;
  }
  
  const userMessage = request.message.text || '';
  const responseContent = extractResponseContent(request.response);
  
  return {
    id: request.requestId,
    userMessage,
    response: responseContent,
    variableData: request.variableData?.variables || []
  };
}

/**
 * Extract readable content from response array
 * @param {Array} response - Response array from chat session
 * @returns {string} Concatenated response text
 */
function extractResponseContent(response) {
  if (!response || !Array.isArray(response)) {
    return '';
  }
  
  const contentParts = [];
  
  for (const part of response) {
    switch (part.kind) {
      case 'markdownContent':
        if (part.content?.value) {
          contentParts.push(part.content.value);
        }
        break;
      case 'textEditGroup':
        // Code edits - summarize
        if (part.edits?.length) {
          contentParts.push(`[Code edits: ${part.edits.length} changes]`);
        }
        break;
      case 'codeblockUri':
        contentParts.push(`[Code block: ${part.uri || 'unnamed'}]`);
        break;
      case 'thinking':
        // Skip thinking/reasoning blocks
        break;
      case 'toolInvocationSerialized':
        if (part.pastTenseMessage?.value) {
          contentParts.push(`[Tool: ${part.pastTenseMessage.value}]`);
        }
        break;
    }
  }
  
  return contentParts.join('\n\n');
}

/**
 * Generate a title from conversation content
 * @param {Object} conversation - Parsed conversation object
 * @returns {string} Generated title
 */
export function generateTitle(conversation) {
  if (!conversation || !conversation.requests || conversation.requests.length === 0) {
    return 'Empty Conversation';
  }
  
  const firstMessage = conversation.requests[0].userMessage;
  
  if (!firstMessage) {
    return 'Untitled Conversation';
  }
  
  // Truncate to first 60 characters, ending at word boundary
  const maxLength = 60;
  if (firstMessage.length <= maxLength) {
    return firstMessage.replace(/\n/g, ' ').trim();
  }
  
  const truncated = firstMessage.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 20) {
    return truncated.substring(0, lastSpace).replace(/\n/g, ' ').trim() + '...';
  }
  
  return truncated.replace(/\n/g, ' ').trim() + '...';
}

/**
 * Format a conversation for export to context.md
 * @param {Object} conversation - Parsed conversation object
 * @returns {string} Formatted markdown string
 */
export function formatForExport(conversation) {
  if (!conversation || !conversation.requests) {
    return '';
  }
  
  const title = generateTitle(conversation);
  const date = conversation.modifiedAt 
    ? conversation.modifiedAt.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  
  let output = `## Session: ${title}\n`;
  output += `**Date:** ${date}\n\n`;
  
  for (const request of conversation.requests) {
    if (request.userMessage) {
      output += `### User\n${request.userMessage}\n\n`;
    }
    if (request.response) {
      output += `### Copilot\n${request.response}\n\n`;
    }
  }
  
  output += `---\n\n`;
  
  return output;
}

/**
 * Summarize a conversation for quick display
 * @param {Object} conversation - Parsed conversation object
 * @returns {Object} Summary object with title, date, messageCount
 */
export function summarizeConversation(conversation) {
  return {
    title: generateTitle(conversation),
    date: conversation.modifiedAt 
      ? conversation.modifiedAt.toLocaleDateString()
      : 'Unknown',
    messageCount: conversation.requests?.length || 0,
    filePath: conversation.filePath
  };
}

export default {
  parseChatSession,
  generateTitle,
  formatForExport,
  summarizeConversation
};
