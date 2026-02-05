---
name: Context Sharing with SharedCopilotContext
description: Best practices for managing shared context across AI agent sessions
version: 1.0.0
applies_to: [all agents]
prerequisites: [SharedCopilotContext installed, MCP server configured]
---

# Agent Skill: Context Sharing with SharedCopilotContext

## Overview

This skill teaches AI agents how to effectively use SharedCopilotContext to maintain persistent memory across sessions, coordinate with other agents, and preserve important knowledge from conversations.

SharedCopilotContext is a system that provides:
- **context.md** - A persistent markdown file for shared memory
- **MCP Server** - Model Context Protocol server with tools, resources, and prompts
- **CLI Tools** - Command-line utilities for manual context management
- **Chat Export** - Mechanisms to preserve VS Code conversation history

---

## Section A: When to Use This Skill

Apply this skill in these scenarios:

### ✅ **Starting a New Session**
- User continues work in an existing project
- Multiple agents have worked on the codebase
- Prior decisions or patterns need to be honored
- Project structure or conventions are established

### ✅ **Ending a Session with Progress**
- Significant features implemented
- Important architectural decisions made
- New patterns or conventions established
- Blockers or issues discovered
- Files created or substantially modified

### ✅ **Multi-Agent Collaboration**
- Handing off work to another agent
- Working in parallel with specialists (@Architect, @Implementer, etc.)
- Resuming after another agent's session
- Coordinating across different expertise areas

### ✅ **Knowledge Preservation**
- User asks to "save this for later"
- Complex debugging process with lessons learned
- Important conversation worth documenting
- Creating onboarding materials or documentation

### ✅ **Resuming Work After Time**
- User returns after days/weeks away
- Need to understand what was done previously
- Checking status of incomplete features
- Reviewing decisions made in absence

### ❌ **When NOT to Use**
- Completely new, isolated task with no project history
- Exploratory or experimental work with no conclusions
- Simple one-off questions or minor tweaks
- User explicitly requests no context recording

---

## Section B: Core Concepts

### 🧠 **context.md as Shared Memory**

Think of `context.md` as the project's long-term memory:
- **Persistent** - Survives across sessions, agents, and time
- **Cumulative** - New sessions append, never overwrite
- **Workspace-specific** - Each project has its own context
- **Human-readable** - Markdown format, accessible to both humans and AI
- **Version-controlled** - Can be committed to git for team sharing

### 💬 **VS Code Chat History**

Chat sessions are detailed conversation logs:
- **Ephemeral** - Stored in VS Code's local database
- **Detailed** - Contains full conversation threads
- **Searchable** - Can be queried for specific topics
- **Exportable** - Can be saved to context.md when valuable

### 🔧 **MCP Tools vs CLI Tools**

**Use MCP Tools when:**
- Working within an agent session
- Need automated, integrated workflows
- Building agent-to-agent communication
- Implementing programmatic access

**Use CLI commands when:**
- User wants manual control
- Testing or debugging context system
- Scripting in shell environments
- Direct user-driven operations

### 📝 **Session Summaries**

Good session summaries include:
- **What** - What was accomplished or attempted
- **Why** - Key decisions and rationale
- **Where** - Specific files and locations
- **Next** - Follow-up items or blockers

Good session summaries exclude:
- Full conversation transcripts
- Every minor iteration or attempt
- Irrelevant exploratory tangents
- Redundant information already in context

### 🧹 **Context Hygiene**

Keep context valuable and manageable:
- **Concise** - Summaries, not transcripts
- **Relevant** - Current project state and decisions
- **Organized** - Clear session boundaries with timestamps
- **Archived** - Move old sessions to separate files when needed
- **Secure** - Never store credentials, API keys, or sensitive data

---

## Section C: Decision Trees

### Decision 1: Should I Read context.md?

```
START
  ↓
Is this an existing project? ────NO───→ Skip reading, start fresh
  ↓ YES
  ↓
Does context.md exist? ────NO───→ Consider creating with init_context
  ↓ YES
  ↓
Is user continuing prior work or asking about project state? ────NO───→ Optional: Skim for patterns
  ↓ YES
  ↓
✅ READ context.md using read_context tool or read_and_continue prompt
  ↓
Parse for:
  - Recent session summaries (what's been done)
  - Current project status (what's the state)
  - Established patterns (how things are done)
  - Next steps or TODOs (what's pending)
  - Preferences or conventions (user's style)
  ↓
Acknowledge to user what you learned
```

### Decision 2: Should I Append to context.md?

```
START
  ↓
Did this session produce tangible results? ────NO───→ Skip appending
  ↓ YES
  ↓
Evaluate scope: Are changes significant? ────NO───→ Consider skipping
  ↓ YES                                              (threshold: >5 minutes work
  ↓                                                  or >2 files or 1 key decision)
User ending session or requesting save? ────NO───→ Wait for session end
  ↓ YES
  ↓
Gather summary information:
  - Accomplishments (features, fixes, improvements)
  - Files modified (specific paths)
  - Key decisions (architectural, technical)
  - Next steps (TODOs, blockers, ideas)
  ↓
✅ APPEND using append_context tool or summarize_and_save prompt
  ↓
Keep it concise: 3-5 paragraphs, specific details
```

### Decision 3: Should I Use MCP Tools or CLI?

```
Context needed for...?
  ↓
  ├── Agent workflow during session → Use MCP tools
  │   Examples:
  │   - Reading context at session start
  │   - Appending context at session end
  │   - Searching past conversations
  │   - Exporting specific chat sessions
  │
  ├── User's manual operation → Suggest CLI commands
  │   Examples:
  │   - sctx show (user wants to view)
  │   - sctx add "note" (user providing content)
  │   - sctx export (user managing exports)
  │
  └── Scripting or automation → Could use either
      - MCP for agent-driven automation
      - CLI for shell scripts and pipelines
```

### Decision 4: Should I Export This Conversation?

```
START
  ↓
Was this conversation valuable? ────NO───→ Skip export
  ↓ YES (valuable = educational, debugged complex issue,
  ↓      made important decisions, user requested it)
  ↓
Does conversation contain sensitive data? ────YES───→ Warn user, ask permission
  ↓ NO
  ↓
Choose format:
  ├── Full detail needed? → format: 'full'
  │   Use for: debugging logs, complete documentation
  │
  └── Summary sufficient? → format: 'summary'
      Use for: session notes, overview for other agents
  ↓
✅ Use export_conversation tool with sessionId
  ↓
Conversation is saved to context.md automatically
```

---

## Section D: Workflow Patterns

### Pattern 1: Session Start - Context Reading

**Scenario:** User continues work on an existing project

**Steps:**
1. Check if `context.md` exists (use `stat_context` or `get_context_summary`)
2. If exists: Use `read_context` tool or `read_and_continue` prompt
3. Parse the context for:
   - **Recent sessions** - What happened last time?
   - **Current state** - What's implemented, what's pending?
   - **Patterns** - File structure, naming conventions, tech choices
   - **TODOs** - Any explicit next steps or blockers?
4. Acknowledge what you learned from context
5. Ask user how to proceed based on what you now know

**Example:**
```
User: "Let's continue working on the authentication system"

Agent (internal reasoning):
- Existing project → check for context.md
- Uses read_and_continue prompt
- Reads: "Session 2026-02-04: Started JWT auth, added middleware in src/auth/"
- Sees pattern: All auth code goes in src/auth/, tests required

Agent: "I see from the context that you started JWT authentication yesterday, 
with middleware in src/auth/. You have login/logout working but noted that 
password reset is still needed. Should I continue by implementing the password 
reset functionality?"
```

### Pattern 2: Session End - Context Writing

**Scenario:** Session produces significant results

**Steps:**
1. **Evaluate:** Did this session make progress worth recording?
   - Created/modified ≥2 files?
   - Made architectural or technical decisions?
   - Implemented a feature or fixed a significant bug?
   - Established patterns others should follow?

2. **If yes, gather:**
   - What was accomplished (features, fixes)
   - Key decisions made (and why)
   - Files modified (specific paths)
   - Next steps or blockers

3. **Use tool:** `append_context` or `summarize_and_save` prompt

4. **Keep summary concise:** 3-5 paragraphs, avoid verbosity

5. **Include specifics:** File names, function names, key choices

**Example:**
```
User: "Great, that works! Thanks!"

Agent (internal reasoning):
- Just implemented OAuth2 integration
- Modified 4 files, added new dependency
- This is significant → should append context

Agent: "I'll save a summary of what we accomplished to context.md."

[Uses append_context tool with]:
## Session 2026-02-05 14:30: OAuth2 Integration

### Accomplished
- Integrated OAuth2 with Google and GitHub providers
- Added passport.js dependency and configuration
- Created callback routes for OAuth flow
- Updated user model to store OAuth provider info

### Files Modified
- package.json (added passport, passport-google-oauth20, passport-github2)
- src/auth/oauth.js (created - passport strategies)
- src/routes/oauth.js (created - callback routes)
- src/models/user.js (modified - added provider fields)

### Key Decisions
- Using passport.js for OAuth abstraction
- Storing provider tokens encrypted in database
- Supporting multiple OAuth providers per user

### Next Steps
- Add frontend OAuth buttons
- Implement account linking for existing users
- Add OAuth to mobile app
```

### Pattern 3: Conversation Export

**Scenario:** Valuable conversation worth preserving

**Steps:**
1. Identify Chat sessions worth preserving:
   - Complex debugging that reached solution
   - Important design discussions
   - User explicitly asks to "save this"
   - Educational value for future agents/users

2. Use `export_conversation` tool with:
   - `sessionId` - The chat session ID
   - `format` - 'full' (detailed) or 'summary' (brief)
   - Optional: `title` for easy identification

3. Content automatically appended to context.md

4. Useful for:
   - Documentation and onboarding
   - Debugging logs and postmortems
   - Design decision records
   - Training examples

**Example:**
```
User: "Can you save this debugging session? It might help others."

Agent: "I'll export this conversation to context.md for future reference."

[Uses export_conversation with format: 'summary']:
## Exported Conversation: Debugging Memory Leak (2026-02-05 15:45)

**Issue:** Node.js process growing to 2GB RAM over 24 hours

**Investigation Process:**
- Profiled with Chrome DevTools, found event listeners not cleaning up
- Identified issue in src/events/handler.js - listeners added but never removed
- WebSocket connections keeping references alive

**Solution:**
- Added cleanup in disconnect handler
- Implemented WeakMap for connection tracking  
- Added process.on('exit') cleanup hook

**Files Changed:**
- src/events/handler.js (fixed listener cleanup)
- src/websocket/server.js (added WeakMap tracking)

**Lesson:** Always pair `.on()` with `.removeListener()` or use `.once()`
```

### Pattern 4: Multi-Agent Coordination

**Scenario:** Multiple agents working on same project

**Steps:**
1. **Agent A (Session 1):**
   - Reads context at start (sees prior state)
   - Works on Feature X
   - Appends context at end with summary

2. **Agent B (Session 2):**
   - Reads context at start
   - **Sees Agent A's work** (Feature X complete)
   - Continues with Feature Y, building on X
   - Appends context at end

3. **Agent C (Session 3):**
   - Reads context at start
   - **Sees both Agent A and Agent B's work**
   - Can reference or extend either feature
   - Continues pattern

**Benefits:**
- **Parallel work** - Agents can work on different features
- **Clean handoffs** - No repeated explanations needed
- **Specialization** - @Architect designs, @Implementer codes, @Tester validates
- **Continuity** - Work continues seamlessly across agents

**Example:**
```
Agent @Architect (Session 1):
→ Reads context, designs database schema
→ Appends: "Designed user/post/comment schema, see docs/schema.md"

Agent @Implementer (Session 2):
→ Reads context, sees schema design
→ Implements models based on schema
→ Appends: "Implemented Sequelize models per schema, in src/models/"

Agent @Tester (Session 3):
→ Reads context, sees models implemented
→ Writes tests for models
→ Appends: "Added model tests, found issue with comment cascade delete, fixed"

All agents stay coordinated through context.md!
```

---

## Section E: Best Practices

### 📖 **For Context Reading**

**DO:**
- ✅ Always read at session start for existing projects
- ✅ Pay attention to timestamps - old context may be stale
- ✅ Look for established patterns (file structure, naming, tools)
- ✅ Note user preferences or conventions mentioned
- ✅ Check for explicit TODOs or next steps
- ✅ Acknowledge what you learned from context to the user

**DON'T:**
- ❌ Skip reading when user says "continue where we left off"
- ❌ Ignore timestamps - 6-month-old context may be outdated
- ❌ Contradict established patterns without discussing first
- ❌ Assume context is complete - ask follow-up questions

### ✍️ **For Context Writing**

**DO:**
- ✅ Write for the next agent/session, not just yourself
- ✅ Include specific file paths and locations
- ✅ Explain *why* decisions were made, not just *what*
- ✅ Use timestamps (automatic with MCP tools)
- ✅ Keep it concise but informative (3-5 paragraphs)
- ✅ List next steps or known issues
- ✅ Always append - never overwrite

**DON'T:**
- ❌ Dump entire transcripts - summarize key points
- ❌ Include every exploratory dead end (unless lesson learned)
- ❌ Overwrite existing context (use append_context tool)
- ❌ Write novels - be concise
- ❌ Omit file names - be specific
- ❌ Forget to mention blockers or issues

### 🔍 **For Search and Discovery**

**DO:**
- ✅ Use `search_conversations` to find prior discussions
- ✅ Filter by date ranges to find recent relevant work
- ✅ Look for similar problems solved before
- ✅ Reference past solutions rather than reinventing
- ✅ Use search before asking user to repeat information

**DON'T:**
- ❌ Reinvent solutions that exist in prior conversations
- ❌ Ask user to re-explain things documented in context
- ❌ Ignore valuable lessons from past debugging sessions

### 🚫 **What NOT to Do**

**Never:**
- 🚫 Store credentials, API keys, passwords, tokens
- 🚫 Include user's personal information without permission
- 🚫 Overwrite context.md - always append
- 🚫 Make context monolithic - archive old sections when needed
- 🚫 Skip reading context when user continues existing work
- 🚫 Write context that only you understand - write for others

**Avoid:**
- ⚠️ Vague summaries ("worked on some files")
- ⚠️ Omitting file paths ("modified the handler")
- ⚠️ Skipping the "why" (decisions without rationale)
- ⚠️ Including dead-end explorations without lessons
- ⚠️ Making context too verbose or too terse

---

## Section F: Example Prompts and Workflows

### Example 1: Starting Fresh on Existing Project

**Scenario:** User asks for help, project has history

```
User: "Help me add a new feature to handle file uploads"

Agent (internal reasoning):
1. Check for context.md - exists!
2. Use read_and_continue prompt to load context
3. Reads context, discovers:
   - Recent work on image processing pipeline
   - Pattern: All uploads go through src/uploads/ handler
   - Convention: Use multer middleware
   - File storage: AWS S3 configured
   - Tests required before merge

Agent response:
"I've reviewed the project context. I see you have an existing upload system 
using multer middleware in src/uploads/, with files stored in AWS S3. You 
recently added image processing capabilities. 

For the new file upload feature, should I follow the same pattern? What file 
types do you want to support, and does this need the same image processing 
pipeline or is it different?"

[Agent now builds on existing patterns instead of suggesting different approach]
```

### Example 2: Ending Productive Session

**Scenario:** Substantial work completed, session ends

```
User: "Perfect! That's everything I needed today, thanks!"

Agent (internal reasoning):
1. Evaluate this session:
   - Added complete authentication system
   - Modified 5 files
   - Implemented JWT + OAuth
   - Added comprehensive tests
   - Made decision on token refresh strategy
2. This is significant progress → should append context
3. Use append_context tool with structured summary

Agent response:
"Great! I'll add a summary of what we accomplished today to context.md so you 
can resume easily next time."

[Agent uses append_context]:
---
Content appended to context.md:

## Session 2026-02-05 16:20: Complete Authentication System

### Accomplished
- Implemented full authentication system with JWT and OAuth2
- Added login/logout endpoints with token management
- Integrated Google and GitHub OAuth providers
- Created authentication middleware for protected routes
- Implemented token refresh mechanism
- Added comprehensive test coverage (87% auth module)

### Files Modified
- src/auth/jwt.js (created - JWT token generation/validation)
- src/auth/oauth.js (created - OAuth2 passport strategies)
- src/auth/middleware.js (created - protect route middleware)
- src/routes/auth.js (modified - added OAuth callback routes)
- tests/auth.test.js (created - auth system tests)

### Key Decisions
- **Token refresh strategy**: Sliding window (7-day refresh, 24-hour access)
- **OAuth provider choice**: Google + GitHub (can extend to others)
- **Password hashing**: bcrypt with cost factor 12
- **Session storage**: Redis for token blacklist on logout

### Next Steps
- Add password reset flow via email
- Implement rate limiting on login endpoint (prevent brute force)
- Add 2FA/MFA support
- Create admin dashboard for user management

### Notes
- OAuth tokens stored encrypted in DB
- Refresh tokens rotate on use (one-time use)
- Consider implementing refresh token rotation for enhanced security
---
```

### Example 3: Finding Prior Solutions

**Scenario:** User asks about something discussed before

```
User: "How did we set up error logging again? I want to add more logs."

Agent (internal reasoning):
1. This sounds like it was discussed before
2. Use search_conversations with query: "error logging Winston"
3. Finds conversation from 2 weeks ago with detailed setup
4. Retrieves that session or checks if it's in context.md

Agent response:
"I found the error logging setup from February 1st. You configured Winston 
logger with three transports:

- `logs/error.log` - Error level and above
- `logs/combined.log` - All levels  
- Console - Development only

The configuration is in src/utils/logger.js. You set up custom formatting with 
timestamps and JSON structure for easy parsing. 

Would you like me to extend this configuration? What kind of logs do you want 
to add?"

[Agent avoids making user re-explain and builds on existing setup]
```

### Example 4: Multi-Agent Handoff

**Scenario:** Specialist agents coordinating

```
User: "@architect Can you design the API for the notification system?"

@Architect:
[Reads context, sees existing API patterns]
"I've designed the notification API following your existing REST patterns:

**Endpoints:**
- POST /api/notifications/send
- GET /api/notifications/:userId
- PATCH /api/notifications/:id/read
- DELETE /api/notifications/:id

**Schema:** See docs/api/notifications.md

I'll add this to context for @implementer."

[Appends to context.md with design details]

---

User: "@implementer Please implement the notification API that @architect designed"

@Implementer:
[Reads context, sees @architect's design]
"I see @architect designed the notification API in docs/api/notifications.md. 
I'll implement the endpoints following the schema.

[Implements code...]

Done! Implementation in src/api/notifications.js following the design. 
Added to context for @tester."

[Appends implementation details to context.md]

---

User: "@tester Can you test the notification system?"

@Tester:
[Reads context, sees design and implementation]
"I see the notification API design and implementation. I'll write tests covering:
- All endpoints from the spec
- Schema validation
- Error handling
- Edge cases

[Writes tests...]

Tests complete with 94% coverage. Found and fixed one issue with date formatting.
All tests passing!"

[Appends test results to context.md]

---

Seamless handoff through context.md - no repeated explanations needed!
```

---

## Section G: Integration with MCP Server

### 🔧 **Available Tools**

Use these tools in your agent workflows:

| Tool | Purpose | When to Use |
|------|---------|-------------|
| **read_context** | Read current workspace context.md | Session start, checking status |
| **append_context** | Add timestamped entry to context.md | Session end, saving progress |
| **init_context** | Create new context.md file | New project, first session |
| **get_context_summary** | Get file statistics and metadata | Checking if context exists, getting info |
| **export_conversation** | Export VS Code chat session | Preserving valuable conversations |
| **search_conversations** | Search past chat history | Finding prior discussions or solutions |

**Tool Selection Guide:**

```
Need to...
├── Read context at session start
│   └── Use: read_context (workspace: current dir)
│
├── Save progress at session end  
│   └── Use: append_context (content: summary, workspace: current dir)
│
├── Check if context exists
│   └── Use: get_context_summary (workspace: current dir)
│
├── Find past discussions on topic X
│   └── Use: search_conversations (query: "topic X")
│
├── Save this valuable conversation
│   └── Use: export_conversation (sessionId: current, format: summary|full)
│
└── Start fresh context file
    └── Use: init_context (workspace: current dir, template: default|minimal)
```

### 📦 **Available Resources**

Access read-only information via resources:

| Resource | Content | When to Use |
|----------|---------|-------------|
| **context://current** | Current workspace context.md | Background reading, reference |
| **context://sessions** | List of all chat sessions | Browsing available conversations |
| **context://sessions/{id}** | Specific chat session content | Reading past conversation details |

**Usage:**
- Resources are **read-only** - use tools to modify
- Resources provide **structured data** for programmatic access
- Use resources when you need information but not to take action

### 🎯 **Available Prompts**

Pre-configured workflows with auto-filled context:

| Prompt | Purpose | Auto-Fills |
|--------|---------|------------|
| **read_and_continue** | Read context and continue work | workspace path, context content |
| **summarize_and_save** | Create session summary and save | session details, accomplishments |

**Prompt vs Tool:**
- **Prompts** guide you through common workflows with pre-filled context
- **Tools** give you specific operations for custom workflows
- Use prompts for standard patterns, tools for specific needs

**Example:**
```
Using read_and_continue prompt:
→ Automatically loads context from current workspace
→ Presents context with pre-filled continuation suggestions
→ You just ask follow-up questions or start work

Using read_context tool:
→ You explicitly call with parameters
→ You get raw context content
→ You parse and act on it manually
```

### 🎨 **Integration Patterns**

**Pattern: Automatic Context Awareness**
```javascript
// At session start
1. Check workspace for context.md
2. If exists: Use read_and_continue prompt OR read_context tool
3. Parse and acknowledge what you learned
4. Proceed with user's request using context knowledge
```

**Pattern: Automatic Context Updates**
```javascript
// At session end
1. Evaluate significance of session
2. If significant: Use summarize_and_save prompt OR append_context tool
3. Include: accomplishments, files, decisions, next steps
4. Confirm to user that context was updated
```

**Pattern: Conversation Search Before Answering**
```javascript
// When user asks "how did we..." or "what was..."
1. Use search_conversations tool with relevant query
2. Check results for prior discussions
3. If found: Reference that information
4. If not found: Proceed with fresh answer
```

**Pattern: Selective Conversation Export**
```javascript
// When conversation has lasting value
1. Identify valuable sessions (debugging, design, decisions)
2. Use export_conversation with appropriate format:
   - 'summary' for brief session notes
   - 'full' for detailed debugging logs
3. Content automatically appended to context.md
```

---

## Section H: Skill Evolution

### 🚀 **Current Capabilities (v1.0.0)**

This skill covers:
- Session-based context reading and writing
- Conversation export and search
- Multi-agent coordination via context.md
- Best practices for context hygiene
- Integration with MCP tools, resources, and prompts

### 🔮 **Future Extensions**

As SharedCopilotContext evolves, this skill may expand to include:

**Context Archival Strategies**
- When to move old sessions to archive files
- How to maintain manageable context size
- Semantic versioning of context (breaking changes)
- Automated archival based on age or size thresholds

**Team-Wide Context Sharing**
- Multi-user scenarios (shared project context)
- Conflict resolution when multiple users append simultaneously
- User-specific vs shared context sections
- Context merge strategies for collaboration

**Context Search and Retrieval**
- Semantic search across context history
- Full-text search within conversation exports
- Tag-based organization and filtering
- Context summarization across multiple sessions

**Integration with GitHub Copilot Memory**
- Syncing local context.md ↔ cloud memory
- Migrating important context to persistent cloud storage
- Choosing what stays local vs what goes to cloud
- Bidirectional sync strategies

**Context Quality Metrics**
- Measuring context freshness and relevance
- Detecting stale or contradictory information
- Suggesting when to archive or update sections
- Quality scoring for session summaries

**Advanced Multi-Agent Patterns**
- Agent specialization with context partitions
- Parallel work with automatic merge
- Dependency tracking between agent sessions
- Context-based agent routing and delegation

### 📝 **Version History**

**v1.0.0 (2026-02-05)**
- Initial skill release
- Core concepts and workflows
- MCP integration guide
- Best practices and examples

---

## Summary

This skill enables you to:

1. ✅ **Maintain memory** across sessions using context.md
2. ✅ **Coordinate with other agents** through shared context
3. ✅ **Preserve valuable conversations** via export
4. ✅ **Make informed decisions** about when to read/write context
5. ✅ **Follow best practices** for context hygiene and quality
6. ✅ **Use MCP tools effectively** in your workflows

### Quick Reference Card

**Starting a session:** Read context → Acknowledge what you learned → Continue work
**Ending a session:** Evaluate significance → Append summary → Confirm to user  
**Finding past info:** Search conversations → Reference findings → Build on it
**Multi-agent work:** Read others' context → Do your work → Append your context

**Remember:** Write for the next agent, not just yourself. Context is shared memory!

---

## Questions or Issues?

If this skill needs clarification or updating:
- File an issue at the SharedCopilotContext repository
- Suggest improvements via pull request
- Update this skill as the system evolves

**Stay coordinated, stay context-aware!** 🎯
