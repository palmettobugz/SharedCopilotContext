# Multi-Agent Coordination Skill

This skill teaches agents how to coordinate work in a multi-agent environment using SharedCopilotContext conventions.

## When to Use This Skill

- Working on SharedCopilotContext project
- Coordinating with other agents
- Updating shared context files
- Following multi-agent workflows

## Core Concepts

### 1. Shared Context File

The `context.md` file is the central coordination point:
- **Read first** - Understand current state before acting
- **Write after** - Update after significant actions
- **Atomic updates** - One logical change per update

### 2. Agent Handoffs

When delegating to another agent:

```markdown
## Handoff to [Agent Name]

### Task
[Clear, specific task description]

### Context
[What the agent needs to know from prior work]

### Inputs
- [File or data provided]
- [Relevant decisions made]

### Expected Output
[What to deliver when complete]
```

### 3. Status Updates

After completing work:

```markdown
## [Timestamp] [Agent Name] Complete

### Completed
- [What was done]

### Files Changed
- `path/to/file.js` - [Description of change]

### Verified
- [How it was tested/validated]

### Ready For
[Next agent or user review]
```

## Workflow Patterns

### Sequential (Simple Tasks)
```
User → Implementer → Tester → Docs → User
```

### Design-First (New Features)
```
User → Architect → [Review] → Implementer → Tester → Docs → User
```

### Parallel (Independent Tasks)
```
User → Orchestrator
           ├── Implementer (Feature A)
           ├── Implementer (Feature B)
           └── Docs (Update README)
       ← Orchestrator (Merge results) → User
```

## Communication Protocols

### Asking for Clarification
```markdown
## Question for [User/Agent]

### Context
[Why you're asking]

### Question
[Specific question]

### Options (if applicable)
1. [Option A] - [Pros/Cons]
2. [Option B] - [Pros/Cons]

### Recommendation
[Your suggested answer if you have one]
```

### Reporting Issues
```markdown
## Issue Found

### Description
[Clear problem statement]

### Reproduction
[Steps to reproduce]

### Impact
[What this affects]

### Suggested Fix
[If you have one]
```

## Best Practices

1. **Be Explicit** - State assumptions clearly
2. **Be Concise** - Respect context window limits
3. **Be Complete** - Include all necessary information in handoffs
4. **Be Consistent** - Follow established formats
5. **Be Collaborative** - Build on others' work, don't duplicate
