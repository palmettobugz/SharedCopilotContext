#!/usr/bin/env node

/**
 * Copilot Menu - Terminal-based viewer for VS Code Copilot conversation history
 * 
 * Features:
 * - Locates and parses VS Code Copilot chat session JSON files
 * - Displays conversations with ASCII art menu
 * - Allows viewing full conversations or exporting to context.md
 */

import { createInterface } from 'readline';
import { glob } from 'glob';
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { 
  getChatSessionsGlobPattern, 
  getContextFilePath,
  getLineEnding 
} from './utils/paths.js';
import { 
  parseChatSession, 
  generateTitle, 
  formatForExport,
  summarizeConversation 
} from './utils/parser.js';

const LINE_ENDING = getLineEnding();

// ANSI color codes
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgCyan: '\x1b[46m'
};

/**
 * ASCII art banner
 */
function printBanner() {
  console.log(`
${c.cyan}╔══════════════════════════════════════════════════════════════╗
║                                                                ║
║   ${c.bright}${c.white}   ██████╗ ██████╗ ██████╗ ██╗██╗      ██████╗ ████████╗   ${c.cyan}║
║   ${c.bright}${c.white}  ██╔════╝██╔═══██╗██╔══██╗██║██║     ██╔═══██╗╚══██╔══╝   ${c.cyan}║
║   ${c.bright}${c.white}  ██║     ██║   ██║██████╔╝██║██║     ██║   ██║   ██║      ${c.cyan}║
║   ${c.bright}${c.white}  ██║     ██║   ██║██╔═══╝ ██║██║     ██║   ██║   ██║      ${c.cyan}║
║   ${c.bright}${c.white}  ╚██████╗╚██████╔╝██║     ██║███████╗╚██████╔╝   ██║      ${c.cyan}║
║   ${c.bright}${c.white}   ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝    ╚═╝      ${c.cyan}║
║                                                                ║
║   ${c.dim}${c.white}         Conversation History Browser${c.reset}${c.cyan}                       ║
║                                                                ║
╚══════════════════════════════════════════════════════════════╝${c.reset}
`);
}

/**
 * Load all chat sessions from VS Code workspace storage
 */
async function loadChatSessions() {
  const pattern = getChatSessionsGlobPattern();
  
  console.log(`${c.dim}Searching for conversations...${c.reset}`);
  
  try {
    const files = await glob(pattern, { windowsPathsNoEscape: true });
    
    if (files.length === 0) {
      console.log(`${c.yellow}No chat sessions found.${c.reset}`);
      console.log(`${c.dim}Pattern: ${pattern}${c.reset}`);
      return [];
    }
    
    const sessions = [];
    
    for (const file of files) {
      const session = parseChatSession(file);
      if (session && session.requests.length > 0) {
        sessions.push(session);
      }
    }
    
    // Sort by modification date, newest first
    sessions.sort((a, b) => b.modifiedAt - a.modifiedAt);
    
    return sessions;
  } catch (error) {
    console.error(`${c.red}Error loading sessions:${c.reset}`, error.message);
    return [];
  }
}

/**
 * Display the conversation list menu
 */
function displayMenu(sessions, page = 0, pageSize = 10) {
  const start = page * pageSize;
  const end = Math.min(start + pageSize, sessions.length);
  const totalPages = Math.ceil(sessions.length / pageSize);
  
  console.log(`\n${c.cyan}┌──────────────────────────────────────────────────────────────┐${c.reset}`);
  console.log(`${c.cyan}│${c.reset}  ${c.bright}COPILOT CONVERSATION HISTORY${c.reset}                               ${c.cyan}│${c.reset}`);
  console.log(`${c.cyan}│${c.reset}  ${c.dim}Page ${page + 1} of ${totalPages} (${sessions.length} total)${c.reset}                              ${c.cyan}│${c.reset}`);
  console.log(`${c.cyan}├──────────────────────────────────────────────────────────────┤${c.reset}`);
  
  for (let i = start; i < end; i++) {
    const session = sessions[i];
    const summary = summarizeConversation(session);
    const num = (i + 1).toString().padStart(2, ' ');
    const title = summary.title.substring(0, 42).padEnd(42, ' ');
    const date = summary.date.padEnd(10, ' ');
    
    console.log(`${c.cyan}│${c.reset}  ${c.green}${num}.${c.reset} ${title} ${c.dim}${date}${c.reset} ${c.cyan}│${c.reset}`);
  }
  
  console.log(`${c.cyan}├──────────────────────────────────────────────────────────────┤${c.reset}`);
  console.log(`${c.cyan}│${c.reset}  ${c.yellow}n${c.reset}: Next page  ${c.yellow}p${c.reset}: Prev page  ${c.yellow}e${c.reset}: Export  ${c.yellow}q${c.reset}: Quit            ${c.cyan}│${c.reset}`);
  console.log(`${c.cyan}└──────────────────────────────────────────────────────────────┘${c.reset}`);
  
  return { start, end, totalPages };
}

/**
 * Display a single conversation
 */
function displayConversation(session) {
  const summary = summarizeConversation(session);
  
  console.log(`\n${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  console.log(`${c.bright}${summary.title}${c.reset}`);
  console.log(`${c.dim}Date: ${summary.date} | Messages: ${summary.messageCount}${c.reset}`);
  console.log(`${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}\n`);
  
  for (const request of session.requests) {
    if (request.userMessage) {
      console.log(`${c.green}┌─ USER ─────────────────────────────────────────────────────${c.reset}`);
      console.log(`${c.green}│${c.reset} ${request.userMessage.split('\n').join(`\n${c.green}│${c.reset} `)}`);
      console.log(`${c.green}└────────────────────────────────────────────────────────────${c.reset}\n`);
    }
    
    if (request.response) {
      console.log(`${c.blue}┌─ COPILOT ───────────────────────────────────────────────────${c.reset}`);
      // Truncate long responses
      const response = request.response.length > 2000 
        ? request.response.substring(0, 2000) + '\n... [truncated]'
        : request.response;
      console.log(`${c.blue}│${c.reset} ${response.split('\n').join(`\n${c.blue}│${c.reset} `)}`);
      console.log(`${c.blue}└────────────────────────────────────────────────────────────${c.reset}\n`);
    }
  }
}

/**
 * Export a conversation to context.md
 */
function exportToContext(session, workspacePath) {
  const contextPath = getContextFilePath(workspacePath);
  const formatted = formatForExport(session);
  
  try {
    if (!existsSync(contextPath)) {
      // Create with header first
      const header = `# Shared Copilot Context\n\n## Exported Conversations\n\n`;
      writeFileSync(contextPath, header + formatted, 'utf-8');
    } else {
      appendFileSync(contextPath, '\n' + formatted, 'utf-8');
    }
    
    console.log(`${c.green}✓ Exported to:${c.reset} ${contextPath}`);
    return true;
  } catch (error) {
    console.error(`${c.red}✗ Export failed:${c.reset}`, error.message);
    return false;
  }
}

/**
 * Main interactive menu loop
 */
async function main() {
  printBanner();
  
  const sessions = await loadChatSessions();
  
  if (sessions.length === 0) {
    console.log(`\n${c.yellow}No conversations found in VS Code Copilot history.${c.reset}`);
    console.log(`${c.dim}Start a chat in VS Code first, then run this tool again.${c.reset}\n`);
    process.exit(0);
  }
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  let currentPage = 0;
  const pageSize = 10;
  
  const prompt = () => {
    const { totalPages } = displayMenu(sessions, currentPage, pageSize);
    
    rl.question(`\n${c.cyan}Enter choice:${c.reset} `, (answer) => {
      const input = answer.trim().toLowerCase();
      
      if (input === 'q' || input === 'quit') {
        console.log(`\n${c.dim}Goodbye!${c.reset}\n`);
        rl.close();
        process.exit(0);
      }
      
      if (input === 'n' || input === 'next') {
        if (currentPage < totalPages - 1) {
          currentPage++;
        } else {
          console.log(`${c.yellow}Already on last page${c.reset}`);
        }
        prompt();
        return;
      }
      
      if (input === 'p' || input === 'prev') {
        if (currentPage > 0) {
          currentPage--;
        } else {
          console.log(`${c.yellow}Already on first page${c.reset}`);
        }
        prompt();
        return;
      }
      
      // Check for export command: "e <number>"
      if (input.startsWith('e ')) {
        const num = parseInt(input.substring(2), 10);
        if (!isNaN(num) && num > 0 && num <= sessions.length) {
          exportToContext(sessions[num - 1]);
        } else {
          console.log(`${c.red}Invalid number. Use: e <number>${c.reset}`);
        }
        prompt();
        return;
      }
      
      // Check for number selection
      const num = parseInt(input, 10);
      if (!isNaN(num) && num > 0 && num <= sessions.length) {
        displayConversation(sessions[num - 1]);
        
        rl.question(`\n${c.cyan}[Enter] Back to menu, [e] Export, [q] Quit:${c.reset} `, (subAnswer) => {
          const subInput = subAnswer.trim().toLowerCase();
          
          if (subInput === 'q') {
            rl.close();
            process.exit(0);
          }
          
          if (subInput === 'e') {
            exportToContext(sessions[num - 1]);
          }
          
          prompt();
        });
        return;
      }
      
      console.log(`${c.red}Invalid input. Enter a number, n/p for pages, or q to quit.${c.reset}`);
      prompt();
    });
  };
  
  prompt();
}

main().catch(error => {
  console.error(`${c.red}Fatal error:${c.reset}`, error);
  process.exit(1);
});
