#!/usr/bin/env node

/**
 * SharedCopilotContext - Phase 1: Shared Text File System
 * 
 * A CLI tool for managing shared context between GitHub Copilot sessions
 * in VS Code and the Copilot CLI.
 * 
 * Usage:
 *   shared-context init [--workspace <path>]   Initialize context.md
 *   shared-context read [--workspace <path>]   Read and output context
 *   shared-context append <content>            Append content with timestamp
 *   shared-context summary                     Show context summary
 *   shared-context help                        Show this help
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getContextFilePath, getLineEnding } from './utils/paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LINE_ENDING = getLineEnding();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

/**
 * Get the initial content template for context.md
 */
function getInitialTemplate() {
  const now = new Date().toISOString();
  return `# Shared Copilot Context

> This file enables context sharing between GitHub Copilot sessions in VS Code and CLI.
> AI agents should read this file at session start and append summaries at session end.

## Instructions for Agents

Read this file for prior conversation context. At the end of your session, append a summary using the format below.

## Project Overview

<!-- Add project description here -->

## Session History

<!-- Session summaries will be appended below -->

---

*Context file initialized: ${now}*
`;
}

/**
 * Initialize context.md in the workspace
 */
function initContext(workspacePath) {
  const contextPath = getContextFilePath(workspacePath);
  
  if (existsSync(contextPath)) {
    console.log(`${colors.yellow}⚠ context.md already exists at:${colors.reset} ${contextPath}`);
    console.log(`${colors.dim}Use 'shared-context read' to view contents${colors.reset}`);
    return false;
  }
  
  try {
    const content = getInitialTemplate();
    writeFileSync(contextPath, content, 'utf-8');
    console.log(`${colors.green}✓ Created context.md at:${colors.reset} ${contextPath}`);
    console.log(`${colors.dim}Edit the Project Overview section to add project details${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error creating context.md:${colors.reset}`, error.message);
    return false;
  }
}

/**
 * Read and output the context file
 */
function readContext(workspacePath, options = {}) {
  const contextPath = getContextFilePath(workspacePath);
  
  if (!existsSync(contextPath)) {
    if (options.silent) {
      return null;
    }
    console.error(`${colors.red}✗ context.md not found at:${colors.reset} ${contextPath}`);
    console.log(`${colors.dim}Run 'shared-context init' to create one${colors.reset}`);
    return null;
  }
  
  try {
    const content = readFileSync(contextPath, 'utf-8');
    
    if (options.raw) {
      // Raw output for piping to other tools
      process.stdout.write(content);
    } else {
      console.log(`${colors.cyan}━━━ context.md ━━━${colors.reset}`);
      console.log(content);
      console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━${colors.reset}`);
    }
    
    return content;
  } catch (error) {
    console.error(`${colors.red}✗ Error reading context.md:${colors.reset}`, error.message);
    return null;
  }
}

/**
 * Append content to the context file with timestamp
 */
function appendContext(content, workspacePath) {
  const contextPath = getContextFilePath(workspacePath);
  
  if (!existsSync(contextPath)) {
    console.error(`${colors.red}✗ context.md not found at:${colors.reset} ${contextPath}`);
    console.log(`${colors.dim}Run 'shared-context init' first${colors.reset}`);
    return false;
  }
  
  if (!content || content.trim().length === 0) {
    console.error(`${colors.red}✗ No content provided to append${colors.reset}`);
    return false;
  }
  
  try {
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 16);
    
    const newEntry = `${LINE_ENDING}## Session ${timestamp}${LINE_ENDING}${LINE_ENDING}${content.trim()}${LINE_ENDING}${LINE_ENDING}---${LINE_ENDING}`;
    
    const existingContent = readFileSync(contextPath, 'utf-8');
    const updatedContent = existingContent + newEntry;
    
    writeFileSync(contextPath, updatedContent, 'utf-8');
    console.log(`${colors.green}✓ Appended to context.md${colors.reset}`);
    console.log(`${colors.dim}Timestamp: ${timestamp}${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error appending to context.md:${colors.reset}`, error.message);
    return false;
  }
}

/**
 * Show a summary of the context file
 */
function showSummary(workspacePath) {
  const contextPath = getContextFilePath(workspacePath);
  
  if (!existsSync(contextPath)) {
    console.error(`${colors.red}✗ context.md not found${colors.reset}`);
    return;
  }
  
  try {
    const content = readFileSync(contextPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    
    // Count sessions
    const sessionMatches = content.match(/^## Session/gm) || [];
    const sessionCount = sessionMatches.length;
    
    // Get file size
    const sizeBytes = Buffer.byteLength(content, 'utf-8');
    const sizeKB = (sizeBytes / 1024).toFixed(2);
    
    // Get word count
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    
    console.log(`${colors.cyan}━━━ Context Summary ━━━${colors.reset}`);
    console.log(`${colors.bright}Path:${colors.reset}     ${contextPath}`);
    console.log(`${colors.bright}Sessions:${colors.reset} ${sessionCount}`);
    console.log(`${colors.bright}Lines:${colors.reset}    ${lines.length}`);
    console.log(`${colors.bright}Words:${colors.reset}    ${wordCount}`);
    console.log(`${colors.bright}Size:${colors.reset}     ${sizeKB} KB`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Error reading context.md:${colors.reset}`, error.message);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
${colors.cyan}${colors.bright}SharedCopilotContext${colors.reset} - Share context between Copilot sessions

${colors.bright}USAGE${colors.reset}
  shared-context <command> [options]

${colors.bright}COMMANDS${colors.reset}
  ${colors.green}init${colors.reset}                    Create context.md in current directory
  ${colors.green}read${colors.reset}                    Output context.md contents
  ${colors.green}read --raw${colors.reset}              Output raw content (for piping)
  ${colors.green}append${colors.reset} "<content>"      Append content with timestamp
  ${colors.green}summary${colors.reset}                 Show context file statistics
  ${colors.green}help${colors.reset}                    Show this help message

${colors.bright}OPTIONS${colors.reset}
  --workspace <path>      Specify workspace root (default: cwd)
  --raw                   Output raw content without formatting

${colors.bright}EXAMPLES${colors.reset}
  ${colors.dim}# Initialize context in current project${colors.reset}
  shared-context init

  ${colors.dim}# Read context for review${colors.reset}
  shared-context read

  ${colors.dim}# Append a session summary${colors.reset}
  shared-context append "Implemented user auth. Files: auth.js, login.vue"

  ${colors.dim}# Pipe context to clipboard (macOS)${colors.reset}
  shared-context read --raw | pbcopy

${colors.bright}INTEGRATION${colors.reset}
  In Copilot CLI, start with: "Read context.md and continue from last session"
  In VS Code, use @workspace context or reference context.md directly
`);
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const parsed = {
    command: null,
    content: null,
    workspace: null,
    raw: false
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (arg === '--workspace' && args[i + 1]) {
      parsed.workspace = args[i + 1];
      i += 2;
    } else if (arg === '--raw') {
      parsed.raw = true;
      i++;
    } else if (!parsed.command) {
      parsed.command = arg;
      i++;
    } else if (parsed.command === 'append' && !parsed.content) {
      // Collect remaining args as content
      parsed.content = args.slice(i).join(' ');
      break;
    } else {
      i++;
    }
  }
  
  return parsed;
}

/**
 * Main entry point
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }
  
  const parsed = parseArgs(args);
  
  switch (parsed.command) {
    case 'init':
      initContext(parsed.workspace);
      break;
      
    case 'read':
      readContext(parsed.workspace, { raw: parsed.raw });
      break;
      
    case 'append':
      if (!parsed.content) {
        console.error(`${colors.red}✗ No content provided${colors.reset}`);
        console.log(`${colors.dim}Usage: shared-context append "Your summary here"${colors.reset}`);
        process.exit(1);
      }
      appendContext(parsed.content, parsed.workspace);
      break;
      
    case 'summary':
      showSummary(parsed.workspace);
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      console.error(`${colors.red}✗ Unknown command: ${parsed.command}${colors.reset}`);
      showHelp();
      process.exit(1);
  }
}

main();
