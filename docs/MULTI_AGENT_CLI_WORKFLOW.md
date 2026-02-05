# Multi-Agent CLI Workflow

> Using GitHub Copilot CLI agents with SharedCopilotContext for coordinated work

## Overview

The `copilot` CLI supports custom agents defined in `.github/agents/`. This document describes how to use multiple CLI agents in coordination, using SharedCopilotContext as the shared state mechanism.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Terminal 1     │     │  Terminal 2     │     │  Terminal 3     │
│  Orchestrator   │     │  Architect      │     │  Implementer    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  append task plan     │  append design        │  append code
         ▼                       ▼                       ▼
    ┌─────────────────────────────────────────────────────────┐
    │                     context.md                          │
    │              (SharedCopilotContext)                     │
    └─────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
    ┌─────────────────────────────────────────────────────────┐
    │                   COMMS Console                         │
    │              (star-force-one.local:5052)                │
    └─────────────────────────────────────────────────────────┘
```

## Available Agents

| Agent | CLI Selection | Purpose | Invokable By |
|-------|---------------|---------|--------------|
| **Orchestrator** | 8 | Coordinates work, breaks down tasks | User |
| **Architect** | 2 | Design decisions, API specs | Orchestrator |
| **Implementer** | 7 | Writes code, implements features | Orchestrator |
| **Tester** | 9 | Validates, writes tests | Orchestrator |
| **Docs** | 5 | Documentation updates | Orchestrator |
| **FleetOps** | 6 | Deployment to Star Force machines | Orchestrator |
| **ContextSync** | 4 | Cross-session context management | Orchestrator |
| **Constellation** | 3 | COMMS integration | Orchestrator |

## CLI Agent Fields

The `copilot` CLI supports these frontmatter fields:

| Field | Supported | Note |
|-------|-----------|------|
| `name` | ✅ Yes | Agent display name |
| `description` | ✅ Yes | Short description |
| `tools` | ✅ Yes | Available tools |
| `model` | ⚠️ Ignored | VS Code only |
| `agents` | ⚠️ Ignored | VS Code subagent orchestration |
| `skills` | ⚠️ Ignored | VS Code skills |
| `user-invokable` | ⚠️ Ignored | VS Code only |

## Workflow Patterns

### Pattern 1: Sequential Handoff

Three terminals, each running a different agent. Agents communicate via context.md.

#### Terminal 1: Orchestrator

```bash
cd ~/Workspace/localdev
copilot
# Select: 8. Orchestrator

# Initial prompt:
"Read SharedCopilotContext/context.md and plan the Phase 6 deployment. 
Break down the work into tasks for Architect and Implementer.
Append your task breakdown to context.md with header '## Orchestrator Plan'"
```

#### Terminal 2: Architect  

```bash
cd ~/Workspace/localdev
copilot
# Select: 2. Architect

# After Orchestrator completes:
"Read SharedCopilotContext/context.md to see Orchestrator's plan.
Design the deployment architecture for Phase 6.
Append your design to context.md with header '## Architect Design'"
```

#### Terminal 3: Implementer

```bash
cd ~/Workspace/localdev
copilot
# Select: 7. Implementer

# After Architect completes:
"Read SharedCopilotContext/context.md for Architect's design.
Implement the deployment script based on the design.
Report completion to context.md with header '## Implementer Report'"
```

### Pattern 2: COMMS-based Coordination

Agents post updates to COMMS for real-time visibility.

#### Post status to COMMS:

```bash
# From any agent terminal
curl -X POST http://star-force-one.local:5052/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": "orchestrator-cli",
    "sender_name": "🎯 Orchestrator (CLI)",
    "sender_type": "agent",
    "content": "Task breakdown complete. Architect, please review context.md for design work."
  }'
```

#### Agent identity mapping:

| Agent | sender_id | sender_name |
|-------|-----------|-------------|
| Orchestrator | `orchestrator-cli` | 🎯 Orchestrator (CLI) |
| Architect | `architect-cli` | 📐 Architect (CLI) |
| Implementer | `implementer-cli` | 🔧 Implementer (CLI) |
| Tester | `tester-cli` | 🧪 Tester (CLI) |
| Docs | `docs-cli` | 📚 Docs (CLI) |
| FleetOps | `fleetops-cli` | 🚀 FleetOps (CLI) |

### Pattern 3: Hybrid (context.md + COMMS)

1. **Work artifacts** → context.md (plans, designs, code references)
2. **Status updates** → COMMS (handoffs, blockers, completions)
3. **Query history** → `@copilot recent` in COMMS

## Helper Commands

### Append to context.md

```bash
cd ~/Workspace/localdev/SharedCopilotContext
node src/shared-context.js append "## Agent Session

Your session summary here..."
```

### Read current context

```bash
node src/shared-context.js read | head -100
```

### Post to COMMS (one-liner)

```bash
# Usage: ./post-comms.sh "agent-id" "Agent Name" "message"
curl -sX POST http://star-force-one.local:5052/api/send \
  -H "Content-Type: application/json" \
  -d "{\"sender_id\":\"$1\",\"sender_name\":\"$2\",\"content\":\"$3\"}"
```

### Check @copilot in COMMS

Go to COMMS Console or use:
```bash
curl -s http://star-force-one.local:5052/api/messages?limit=10 | jq '.messages[].content'
```

## Example Session: Phase 6 Deployment

### Step 1: Orchestrator Plans

```
Terminal 1 (Orchestrator):
> Read context.md and create a deployment plan for Phase 6: Star Force Deployment.
> The plan should include:
> 1. What needs to be deployed (SharedCopilotContext MCP server + Bridge)
> 2. Target machines (sf1, sf3)
> 3. Tasks for Architect (deployment design) and Implementer (scripts)
> Append the plan to context.md.
```

### Step 2: Architect Designs

```
Terminal 2 (Architect):
> Read context.md for Orchestrator's Phase 6 plan.
> Design the deployment architecture:
> - How will MCP server run on Star Force machines?
> - Systemd service? Docker? Direct node?
> - How will VS Code connect to remote MCP?
> Append your design to context.md.
```

### Step 3: Implementer Builds

```
Terminal 3 (Implementer):
> Read context.md for Architect's deployment design.
> Create:
> 1. deploy.sh script for installing on sf1/sf3
> 2. systemd service file for copilot-bridge
> 3. Instructions for VS Code MCP client configuration
> Commit the files and report completion to context.md.
```

### Step 4: Tester Validates

```
Terminal 4 (Tester):
> Read context.md for deployment artifacts.
> Test the deployment:
> 1. Run deploy.sh on sf3 (or simulate)
> 2. Verify bridge starts and connects to COMMS
> 3. Test @copilot commands from COMMS
> Report test results to context.md.
```

## Enhancement Roadmap

### Proposed: CLI Agent Helpers

Add to each `.agent.md` instructions:

```markdown
## CLI Context Commands

When running in CLI mode, use these to coordinate:

- **Read context**: `cat SharedCopilotContext/context.md`
- **Append update**: `node SharedCopilotContext/src/shared-context.js append "your update"`
- **Post to COMMS**: `curl -X POST http://star-force-one.local:5052/api/send -d '...'`
```

### Proposed: Handoff Script

Create `scripts/agent-handoff.sh`:

```bash
#!/bin/bash
# Posts agent handoff to COMMS
# Usage: ./agent-handoff.sh from-agent to-agent "message"

FROM_AGENT=$1
TO_AGENT=$2
MESSAGE=$3

curl -sX POST http://star-force-one.local:5052/api/send \
  -H "Content-Type: application/json" \
  -d "{
    \"sender_id\": \"${FROM_AGENT}-cli\",
    \"sender_name\": \"${FROM_AGENT} (CLI)\",
    \"sender_type\": \"agent\",
    \"content\": \"🔄 Handing off to ${TO_AGENT}: ${MESSAGE}\"
  }"
```

### Proposed: Agent Field Cleanup

Remove warning-generating fields from `.agent.md` files for cleaner CLI experience:

| Remove | Keep |
|--------|------|
| `model` | `name` |
| `agents` | `description` |
| `skills` | `tools` |
| `user-invokable` | |
| `disable-model-invocation` | |

## Related Files

- [orchestrator.agent.md](../../.github/agents/orchestrator.agent.md)
- [architect.agent.md](../../.github/agents/architect.agent.md)
- [implementer.agent.md](../../.github/agents/implementer.agent.md)
- [context.md](../context.md)
- [copilot-responder.js](../src/bridge/copilot-responder.js)
