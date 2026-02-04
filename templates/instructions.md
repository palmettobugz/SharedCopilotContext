# Instructions for AI Agents

This document provides guidance for GitHub Copilot (VS Code and CLI) and other AI coding agents on using the shared context system.

## Overview

The `context.md` file in the workspace root serves as a shared memory between AI agent sessions. It enables context continuity across:
- GitHub Copilot in VS Code
- GitHub Copilot CLI (`copilot` command)
- Other AI coding assistants

## For AI Agents: How to Use This System

### At Session Start
1. **Locate** `context.md` in the workspace root directory
2. **Read** the file contents to understand prior conversation history
3. **Parse** the sections to identify:
   - Previous decisions made
   - Code patterns established
   - Outstanding tasks or issues
   - User preferences noted
4. **Use** relevant context as background for your responses

### During the Session
- Reference prior context when making suggestions
- Maintain consistency with established patterns
- Note any significant decisions or changes for later summary

### At Session End
- Append a summary section using this format:

```markdown
## Session [YYYY-MM-DD HH:MM]: [Brief Title]

### Key Points
- [Major decisions or changes made]
- [New patterns or conventions established]
- [Important context for future sessions]

### Files Modified
- `path/to/file.ext` - [What was changed]

### Open Items
- [Any unfinished tasks or known issues]

---
```

## Integration Examples

### GitHub Copilot CLI
When using the `copilot` CLI, you can reference the context file:
```bash
# The agent can read context.md automatically if it exists in the workspace
copilot
# Then ask: "Read context.md and continue from where we left off"
```

### VS Code Copilot Chat
In VS Code Copilot Chat:
- Reference `@workspace` to include workspace context
- Explicitly mention `context.md` for historical context
- Use "Read context.md first" as a prompt prefix

### Programmatic Access
```bash
# Read current context
node shared-context.js read

# Append new content
node shared-context.js append "Session summary here"

# Initialize new context file
node shared-context.js init
```

## File Structure

The `context.md` file follows this structure:

```markdown
# Shared Copilot Context

## Project Overview
[Auto-generated or user-provided project description]

## Session History
[Chronological session summaries appended here]

## Notes
[Persistent notes and preferences]
```

## Best Practices

1. **Be Concise**: Summaries should be brief but informative
2. **Be Specific**: Include file paths and function names when relevant
3. **Be Actionable**: Note open items clearly for follow-up
4. **Avoid Duplication**: Don't repeat information already in the file
5. **Timestamp Everything**: Always include dates for context aging
