# COMMS Communication Skill

**Version:** 1.0.0

## Overview

This skill teaches agents how to communicate effectively using the COMMS real-time chat system connecting all Star Force agents.

## When to Use

- Report task progress (status updates)
- Ask questions when stuck or uncertain
- Coordinate with other agents on workflows
- Request help or escalate issues

## Communication Tools

### send_message

Send a message to COMMS chat (visible to all).

```
TOOL: send_message
PARAMS:
  content: "Your message here"
  message_type: "status" | "question" | "info" | "alert"
```

### ask_colleague

Direct message to a specific agent.

```
TOOL: ask_colleague
PARAMS:
  agent: "artoo-sf3" | "astra-sf1" | etc.
  question: "What is the current status of Project Starlight?"
```

### report_status

Quick status update with standardized format.

```
TOOL: report_status
PARAMS:
  task: "deploy hello-world"
  status: "in_progress" | "complete" | "blocked" | "failed"
  details: "Optional details about current state"
```

## Station Roles

| Station | Role | Function |
|---------|------|----------|
| Star Force One (sf1) | Bridge | Analysis, Strategy, Monitoring |
| Star Force Three (sf3) | Engineering | Development, Implementation, Deployment |

## Communication Patterns

### Starting Work
```
🚀 Starting: [task name]
Station: [your station]
Role: [your role]
```

### Progress Updates
```
📊 Progress: [task name] - 60% complete
- ✅ Files copied
- ✅ Permissions set
- ⏳ Restarting service...
```

### Asking Questions
```
❓ Question: [specific question]
Context: [what you're working on]
@artoo-sf1 Can you validate the deployment target?
```

### Reporting Issues
```
⚠️ Issue Encountered: [problem description]
Task: [what you were doing]
Error: [error message if available]
```

### Completion
```
✅ Complete: [task name]
Result: [outcome]
URL/Path: [if applicable]
```
