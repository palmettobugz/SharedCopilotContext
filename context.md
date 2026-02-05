# Shared Copilot Context

> This file enables context sharing between GitHub Copilot sessions in VS Code and CLI.
> AI agents should read this file at session start and append summaries at session end.

## Instructions for Agents

Read this file for prior conversation context. At the end of your session, append a summary using the format below.

## Project Overview

**SharedCopilotContext** is a multi-platform tool for sharing conversation history between GitHub Copilot in VS Code, GitHub Copilot CLI, and other AI agents via MCP.

### Repository
- **GitHub**: https://github.com/palmettobugz/SharedCopilotContext
- **Local Path**: `/Users/merlin/Workspace/localdev/SharedCopilotContext`

### Tech Stack
- **Runtime**: Node.js 18+ (ES Modules)
- **Dependencies**: chalk, chokidar, express, glob, socket.io

### Project Phases
| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Shared text file system (`context.md`) | ✅ Complete |
| 2 | Terminal menu with ASCII art | ✅ Complete |
| 3 | MCP Server (pivoted from WebSockets) | 🔄 Not Started |
| 4 | Polish, testing, Agent Skills | ⏳ Pending |

### Multi-Agent Setup
- **Agents**: Orchestrator, Architect, Implementer, Tester, Docs
- **Models**: Claude Sonnet 4.5 and Claude Sonnet 4 (no OpenAI)
- **Location**: `.github/agents/`
- **Skills**: `.github/skills/coordination/`

## Session History

<!-- Session summaries will be appended below -->

---

*Context file initialized: 2026-02-04T20:07:24.010Z*

## Session 2026-02-04 20:07

Initialized SharedCopilotContext project with Phase 1 and Phase 2 tools. Created shared-context.js CLI for managing context.md and copilot-menu.js for browsing VS Code Copilot history.

---

## Session 2026-02-04 20:45 - Multi-Agent Setup

### Action
Established multi-agent workflow infrastructure for the project.

### Changes Made
- Created `.github/agents/` with 5 specialized agents:
  - `orchestrator.agent.md` - Coordinates work, delegates to subagents
  - `architect.agent.md` - Design decisions, API specs
  - `implementer.agent.md` - Writes code, fixes bugs
  - `tester.agent.md` - Validation and tests
  - `docs.agent.md` - Documentation maintenance
- Created `copilot-instructions.md` - Project-wide AI agent guidelines
- Created `.github/skills/coordination/SKILL.md` - Multi-agent coordination skill
- Updated `context.md` with project state

### Model Configuration
All agents use Claude models only (per user request):
- Primary: Claude Sonnet 4.5 (copilot)
- Fallback: Claude Sonnet 4 (copilot)

### How It Works
1. **Agent Files** (`.agent.md`) define specialized roles with model preferences and allowed tools
2. **Instructions File** (`copilot-instructions.md`) provides project-wide rules
3. **Context File** (`context.md`) serves as shared state for coordination
4. **Skills** (`.github/skills/`) provide reusable domain expertise

### Invoking Agents (VS Code)
- Type `@Orchestrator` in chat to coordinate tasks
- Type `@Architect` for design questions
- Type `@Implementer` for code changes
- Type `@Tester` for validation
- Type `@Docs` for documentation

### Next Steps
1. Test the multi-agent workflow with a real task
2. Begin Phase 3: MCP Server implementation
3. Consider using Background agents for parallel work

---
