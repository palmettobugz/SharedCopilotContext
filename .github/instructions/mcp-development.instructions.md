---
applyTo: "**/mcp/**,**/mcp-server.js"
---

# MCP Development Instructions

## MCP SDK Usage
- Import from `@modelcontextprotocol/sdk/server/index.js`
- Use `StdioServerTransport` for CLI communication
- Register handlers with schema objects, not strings

## Tool Definitions
- Tools are actions the AI can perform
- Include clear descriptions for each tool
- Define input schemas with JSON Schema format

```javascript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "tool_name",
    description: "What the tool does",
    inputSchema: {
      type: "object",
      properties: { ... },
      required: ["..."]
    }
  }]
}));
```

## Resource Definitions
- Resources are read-only data sources
- Use URI scheme: `context://` for this project
- Support template URIs for dynamic resources

## Prompt Definitions
- Prompts are pre-built conversation starters
- Include argument definitions
- Return array of message objects

## Error Handling
- Return proper MCP error responses
- Include error codes and messages
- Log server-side for debugging
