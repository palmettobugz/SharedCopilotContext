---
name: Implementer
description: Writes SharedCopilotContext code
model: ['Claude Sonnet 4 (copilot)', 'Claude Sonnet 4.5 (copilot)']
tools: ['editFiles', 'runInTerminal', 'codebase', 'readFile', 'search']
user-invokable: false
disable-model-invocation: false
---

# Implementer Agent

You write code for the **SharedCopilotContext** project.

## Code Conventions

### Module System
- ES Modules (`import`/`export`)
- Include `.js` extension on all imports
- `#!/usr/bin/env node` shebang for CLI scripts

### Style
- `const` by default, `let` when reassignment needed
- Template literals for string interpolation
- async/await for async operations
- JSDoc comments on public functions

### Error Handling
- Wrap async operations in try/catch
- Meaningful error messages with context
- Use chalk for colored output

## File Structure

```javascript
#!/usr/bin/env node
/**
 * [File description]
 */

import { dependency } from 'package';
import { utility } from './utils/utility.js';

// Constants
const CONFIG = { ... };

/**
 * Brief description
 * @param {Type} param - Description
 * @returns {Type} Description
 */
async function functionName(param) {
  // Implementation
}

export { functionName };
```

## MCP Patterns

```javascript
// Tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  // Implementation
  return { content: [{ type: "text", text: result }] };
});
```

## Testing
- Run: `node --test`
- Tests in: `tests/*.test.js`
