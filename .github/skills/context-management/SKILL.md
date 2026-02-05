# Context Management Skill

**Version:** 1.0.0

## Overview

This skill teaches agents how to manage shared context using the SharedCopilotContext MCP server and tools.

## Core Concept

SharedCopilotContext enables AI agents to share conversation history and context across:
- GitHub Copilot in VS Code
- GitHub Copilot CLI
- Other AI coding agents via MCP

## Available MCP Tools

### read_context

Read the current shared context file.

```javascript
{
  "name": "read_context",
  "arguments": {}
}
// Returns: Current context.md content
```

### append_context

Append new content to the context file.

```javascript
{
  "name": "append_context",
  "arguments": {
    "content": "## Update\n- Completed feature X",
    "section": "optional-section-name"
  }
}
```

### init_context

Initialize a new context file for a project.

```javascript
{
  "name": "init_context",
  "arguments": {
    "projectName": "my-project",
    "description": "Project description"
  }
}
```

### export_conversation

Export a Copilot conversation to context.

```javascript
{
  "name": "export_conversation",
  "arguments": {
    "sessionId": "session-uuid",
    "format": "markdown"
  }
}
```

### search_conversations

Search across Copilot conversation history.

```javascript
{
  "name": "search_conversations",
  "arguments": {
    "query": "search term"
  }
}
```

### get_context_summary

Get a summary of the current context.

```javascript
{
  "name": "get_context_summary",
  "arguments": {}
}
```

## MCP Resources

| Resource URI | Description |
|--------------|-------------|
| `context://current` | Current active context.md |
| `context://sessions` | List of available Copilot sessions |
| `context://sessions/{id}` | Specific session content |

## Best Practices

1. **Update regularly** - Append status updates after major actions
2. **Use sections** - Organize context with clear section headers
3. **Include timestamps** - Prefix updates with ISO timestamps
4. **Summarize periodically** - Condense old context to save tokens
5. **Export important sessions** - Save valuable Copilot conversations

## Context File Structure

```markdown
# Project Context

## Current Status
- Phase: Implementation
- Last Update: 2026-02-05T10:00:00Z

## Recent Actions
- [timestamp] Completed feature X
- [timestamp] Fixed bug Y

## Active Tasks
1. Implement feature Z
2. Write tests for module A

## Key Decisions
- Decision 1: Rationale
- Decision 2: Rationale
```
