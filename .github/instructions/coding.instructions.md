---
applyTo: "**/*.js,**/*.mjs"
---

# JavaScript Coding Instructions

## Module System
- Use ES Modules (`import`/`export`)
- All imports must include `.js` extension
- Use `#!/usr/bin/env node` shebang for CLI scripts

## Code Style
- Use `const` by default, `let` when reassignment needed
- Use template literals for string interpolation
- Prefer arrow functions for callbacks
- Use async/await over raw Promises

## Error Handling
- Wrap async operations in try/catch
- Provide meaningful error messages
- Log errors with context (file, operation)

## Documentation
- JSDoc comments for all public functions
- Include @param and @returns tags
- Add @example for non-obvious usage

## Project-Specific
- Use chalk for colored output
- Use path utilities from `./utils/paths.js`
- Log with emoji prefixes for visual clarity
