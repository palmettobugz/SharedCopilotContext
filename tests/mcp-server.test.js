import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { ContextManager } from '../src/mcp/manager.js';
import { tools, handleToolCall } from '../src/mcp/tools.js';
import { resources, handleResourceRead } from '../src/mcp/resources.js';
import { prompts, handlePromptGet } from '../src/mcp/prompts.js';

// Test setup
const TEST_WORKSPACE = join(process.cwd(), 'tests', 'fixtures', 'test-workspace');
const TEST_CONTEXT_PATH = join(TEST_WORKSPACE, 'context.md');

// Setup test workspace before all tests
before(() => {
  if (!existsSync(TEST_WORKSPACE)) {
    mkdirSync(TEST_WORKSPACE, { recursive: true });
  }
});

// Cleanup after all tests
after(() => {
  if (existsSync(TEST_WORKSPACE)) {
    rmSync(TEST_WORKSPACE, { recursive: true, force: true });
  }
});

// ============================================================================
// 1. ContextManager Tests
// ============================================================================

describe('ContextManager', () => {
  const manager = new ContextManager();
  
  beforeEach(() => {
    // Clean up before each test
    if (existsSync(TEST_CONTEXT_PATH)) {
      rmSync(TEST_CONTEXT_PATH);
    }
  });
  
  describe('initContext', () => {
    it('should create context.md with template', async () => {
      const result = await manager.initContext(TEST_WORKSPACE);
      assert.strictEqual(result.success, true);
      assert.ok(existsSync(TEST_CONTEXT_PATH));
      
      const content = readFileSync(TEST_CONTEXT_PATH, 'utf-8');
      assert.ok(content.includes('# Shared Copilot Context'));
    });
    
    it('should fail if context.md already exists', async () => {
      // Create file first
      await manager.initContext(TEST_WORKSPACE);
      
      // Try again, should fail
      await assert.rejects(
        () => manager.initContext(TEST_WORKSPACE),
        /already exists/
      );
    });
    
    it('should accept optional project info', async () => {
      const result = await manager.initContext(
        TEST_WORKSPACE,
        'TestProject',
        'A test project'
      );
      
      const content = readFileSync(TEST_CONTEXT_PATH, 'utf-8');
      assert.ok(content.includes('TestProject'));
      assert.ok(content.includes('A test project'));
    });
  });
  
  describe('readContext', () => {
    it('should read existing context.md', async () => {
      // Create test context
      writeFileSync(TEST_CONTEXT_PATH, '# Test Context\n\nSome content here.');
      
      const result = await manager.readContext(TEST_WORKSPACE);
      assert.ok(result.content.includes('Test Context'));
      assert.strictEqual(typeof result.metadata.size, 'number');
      assert.ok(result.metadata.path.includes('context.md'));
    });
    
    it('should fail if context.md does not exist', async () => {
      await assert.rejects(
        () => manager.readContext(TEST_WORKSPACE),
        /not found/
      );
    });
    
    it('should count sessions correctly', async () => {
      const content = `# Context\n\n## Session 1\n\n---\n\n## Session 2\n\n---`;
      writeFileSync(TEST_CONTEXT_PATH, content);
      
      const result = await manager.readContext(TEST_WORKSPACE);
      assert.strictEqual(result.metadata.sessionCount, 2);
    });
  });
  
  describe('appendContext', () => {
    beforeEach(async () => {
      // Create initial context
      await manager.initContext(TEST_WORKSPACE);
    });
    
    it('should append content with timestamp', async () => {
      const result = await manager.appendContext(
        TEST_WORKSPACE,
        'Test content',
        'Test Session'
      );
      
      assert.strictEqual(result.success, true);
      
      const content = readFileSync(TEST_CONTEXT_PATH, 'utf-8');
      assert.ok(content.includes('Test content'));
      assert.ok(content.includes('Test Session'));
    });
    
    it('should fail with empty content', async () => {
      await assert.rejects(
        () => manager.appendContext(TEST_WORKSPACE, ''),
        /empty/
      );
    });
  });
  
  describe('getSummary', () => {
    it('should return summary stats', async () => {
      const content = `# Context\n\n## Session 1\n\nContent here.\n\n---`;
      writeFileSync(TEST_CONTEXT_PATH, content);
      
      const result = await manager.getSummary(TEST_WORKSPACE);
      assert.strictEqual(result.exists, true);
      assert.ok(result.stats.lines > 0);
      assert.ok(result.stats.words > 0);
      assert.strictEqual(result.stats.sessions, 1);
    });
    
    it('should handle missing file gracefully', async () => {
      const result = await manager.getSummary(TEST_WORKSPACE);
      assert.strictEqual(result.exists, false);
    });
  });
  
  describe('searchConversations', () => {
    it('should find matching sessions', async () => {
      // This test requires VS Code session files
      // For now, test that it doesn't crash with no sessions
      const result = await manager.searchConversations('test', { limit: 5 });
      assert.ok(Array.isArray(result.results));
      assert.strictEqual(typeof result.totalFound, 'number');
    });
  });
  
  describe('exportConversation', () => {
    it('should export conversation to context', async () => {
      // This requires real session files to test fully
      // Test error case: invalid session ID
      await manager.initContext(TEST_WORKSPACE);
      
      await assert.rejects(
        () => manager.exportConversation('nonexistent', TEST_WORKSPACE),
        /not found/
      );
    });
  });
});

// ============================================================================
// 2. Tools Tests
// ============================================================================

describe('MCP Tools', () => {
  beforeEach(() => {
    if (!existsSync(TEST_WORKSPACE)) {
      mkdirSync(TEST_WORKSPACE, { recursive: true });
    }
    if (existsSync(TEST_CONTEXT_PATH)) {
      rmSync(TEST_CONTEXT_PATH);
    }
  });
  
  it('should export 7 tools', () => {
    assert.strictEqual(tools.length, 7);
    
    const toolNames = tools.map(t => t.name);
    assert.ok(toolNames.includes('read_context'));
    assert.ok(toolNames.includes('append_context'));
    assert.ok(toolNames.includes('init_context'));
    assert.ok(toolNames.includes('export_conversation'));
    assert.ok(toolNames.includes('search_conversations'));
    assert.ok(toolNames.includes('comms_broadcast'));
    assert.ok(toolNames.includes('get_context_summary'));
  });
  
  it('each tool should have required fields', () => {
    for (const tool of tools) {
      assert.ok(tool.name);
      assert.ok(tool.description);
      assert.ok(tool.inputSchema);
      assert.strictEqual(tool.inputSchema.type, 'object');
    }
  });
  
  describe('handleToolCall', () => {
    it('should handle read_context', async () => {
      writeFileSync(TEST_CONTEXT_PATH, '# Test');
      
      const result = await handleToolCall('read_context', { workspace: TEST_WORKSPACE });
      assert.ok(result.content);
      assert.ok(result.content[0].text.includes('Test'));
    });
    
    it('should handle init_context', async () => {
      const result = await handleToolCall('init_context', { workspace: TEST_WORKSPACE });
      assert.ok(result.content);
      const data = JSON.parse(result.content[0].text);
      assert.strictEqual(data.success, true);
    });
    
    it('should handle append_context', async () => {
      // First init
      await handleToolCall('init_context', { workspace: TEST_WORKSPACE });
      
      // Then append
      const result = await handleToolCall('append_context', { 
        workspace: TEST_WORKSPACE,
        content: 'Test append' 
      });
      assert.ok(result.content);
      const data = JSON.parse(result.content[0].text);
      assert.strictEqual(data.success, true);
    });
    
    it('should handle get_context_summary', async () => {
      writeFileSync(TEST_CONTEXT_PATH, '# Test\n## Session 1\n---');
      
      const result = await handleToolCall('get_context_summary', { workspace: TEST_WORKSPACE });
      assert.ok(result.content);
      const data = JSON.parse(result.content[0].text);
      assert.strictEqual(data.exists, true);
      assert.strictEqual(data.stats.sessions, 1);
    });
    
    it('should handle search_conversations', async () => {
      const result = await handleToolCall('search_conversations', { 
        query: 'test',
        limit: 5 
      });
      assert.ok(result.content);
      const data = JSON.parse(result.content[0].text);
      assert.ok(Array.isArray(data.results));
    });
    
    it('should throw McpError for unknown tool', async () => {
      await assert.rejects(
        () => handleToolCall('nonexistent_tool', {}),
        (error) => {
          assert.ok(error.message.includes('Unknown tool'));
          return true;
        }
      );
    });
    
    it('should throw McpError for missing required parameter', async () => {
      await assert.rejects(
        () => handleToolCall('append_context', { workspace: TEST_WORKSPACE }),
        (error) => {
          assert.ok(error.message.includes('required'));
          return true;
        }
      );
    });
  });
});

// ============================================================================
// 3. Resources Tests
// ============================================================================

describe('MCP Resources', () => {
  let oldWorkspace;
  
  before(() => {
    // Save old workspace env
    oldWorkspace = process.env.WORKSPACE;
  });
  
  after(() => {
    // Restore workspace env
    if (oldWorkspace !== undefined) {
      process.env.WORKSPACE = oldWorkspace;
    } else {
      delete process.env.WORKSPACE;
    }
  });
  
  beforeEach(() => {
    if (!existsSync(TEST_WORKSPACE)) {
      mkdirSync(TEST_WORKSPACE, { recursive: true });
    }
    if (existsSync(TEST_CONTEXT_PATH)) {
      rmSync(TEST_CONTEXT_PATH);
    }
  });
  
  it('should export 5 resources', () => {
    assert.strictEqual(resources.length, 5);
    
    const uris = resources.map(r => r.uri);
    assert.ok(uris.includes('context://current'));
    assert.ok(uris.includes('context://sessions'));
    assert.ok(uris.includes('context://comms'));
    assert.ok(uris.includes('context://comms/status'));
    assert.ok(uris.some(u => u.includes('context://sessions/{id}')));
  });
  
  it('each resource should have required fields', () => {
    for (const resource of resources) {
      assert.ok(resource.uri);
      assert.ok(resource.name);
      assert.ok(resource.mimeType);
      assert.ok(resource.description);
    }
  });
  
  describe('handleResourceRead', () => {
    it('should handle context://current', async () => {
      writeFileSync(TEST_CONTEXT_PATH, '# Test Content');
      
      // Set WORKSPACE env
      process.env.WORKSPACE = TEST_WORKSPACE;
      
      const result = await handleResourceRead('context://current');
      assert.ok(result.contents);
      assert.strictEqual(result.contents[0].mimeType, 'text/markdown');
      assert.ok(result.contents[0].text.includes('Test Content'));
    });
    
    it('should handle context://sessions', async () => {
      const result = await handleResourceRead('context://sessions');
      assert.ok(result.contents);
      assert.strictEqual(result.contents[0].mimeType, 'application/json');
      
      const data = JSON.parse(result.contents[0].text);
      assert.ok(Array.isArray(data));
    });
    
    it('should handle context://sessions/{id}', async () => {
      // Test with invalid ID (should fail gracefully)
      await assert.rejects(
        () => handleResourceRead('context://sessions/invalid-id'),
        (error) => {
          assert.ok(error.message.includes('not found') || error.message.includes('Session'));
          return true;
        }
      );
    });
    
    it('should throw McpError for unknown resource', async () => {
      await assert.rejects(
        () => handleResourceRead('context://invalid'),
        (error) => {
          assert.ok(error.message.includes('Unknown resource'));
          return true;
        }
      );
    });
  });
});

// ============================================================================
// 4. Prompts Tests
// ============================================================================

describe('MCP Prompts', () => {
  let oldWorkspace;
  
  before(() => {
    // Save old workspace env
    oldWorkspace = process.env.WORKSPACE;
  });
  
  after(() => {
    // Restore workspace env
    if (oldWorkspace !== undefined) {
      process.env.WORKSPACE = oldWorkspace;
    } else {
      delete process.env.WORKSPACE;
    }
  });
  
  beforeEach(() => {
    if (!existsSync(TEST_WORKSPACE)) {
      mkdirSync(TEST_WORKSPACE, { recursive: true });
    }
    if (existsSync(TEST_CONTEXT_PATH)) {
      rmSync(TEST_CONTEXT_PATH);
    }
  });
  
  it('should export 2 prompts', () => {
    assert.strictEqual(prompts.length, 2);
    
    const names = prompts.map(p => p.name);
    assert.ok(names.includes('read_and_continue'));
    assert.ok(names.includes('summarize_and_save'));
  });
  
  it('each prompt should have required fields', () => {
    for (const prompt of prompts) {
      assert.ok(prompt.name);
      assert.ok(prompt.description);
      assert.ok(Array.isArray(prompt.arguments));
    }
  });
  
  describe('handlePromptGet', () => {
    it('should handle read_and_continue', async () => {
      writeFileSync(TEST_CONTEXT_PATH, '# Test Context\n\nSome content.');
      
      process.env.WORKSPACE = TEST_WORKSPACE;
      
      const result = await handlePromptGet('read_and_continue', {});
      assert.ok(result.messages);
      assert.ok(result.messages[0].content.text.includes('Test Context'));
      assert.ok(result.messages[0].content.text.includes('Read the project context'));
    });
    
    it('should handle summarize_and_save with message_count', async () => {
      const result = await handlePromptGet('summarize_and_save', { message_count: 42 });
      assert.ok(result.messages);
      assert.ok(result.messages[0].content.text.includes('42 messages'));
      assert.ok(result.messages[0].content.text.includes('Summarize'));
    });
    
    it('should handle summarize_and_save without message_count', async () => {
      const result = await handlePromptGet('summarize_and_save', {});
      assert.ok(result.messages);
      assert.ok(result.messages[0].content.text.includes('Summarize'));
    });
    
    it('should throw McpError for unknown prompt', async () => {
      await assert.rejects(
        () => handlePromptGet('nonexistent_prompt', {}),
        (error) => {
          assert.ok(error.message.includes('Unknown prompt'));
          return true;
        }
      );
    });
  });
});

// ============================================================================
// 5. Integration Tests
// ============================================================================

describe('Integration Tests', () => {
  const manager = new ContextManager();
  
  beforeEach(() => {
    if (!existsSync(TEST_WORKSPACE)) {
      mkdirSync(TEST_WORKSPACE, { recursive: true });
    }
    if (existsSync(TEST_CONTEXT_PATH)) {
      rmSync(TEST_CONTEXT_PATH);
    }
  });
  
  it('should complete full context lifecycle', async () => {
    // 1. Initialize
    const initResult = await manager.initContext(TEST_WORKSPACE, 'IntegrationTest', 'Test project');
    assert.strictEqual(initResult.success, true);
    assert.ok(existsSync(TEST_CONTEXT_PATH));
    
    // 2. Read
    const readResult = await manager.readContext(TEST_WORKSPACE);
    assert.ok(readResult.content.includes('IntegrationTest'));
    // Template includes "## Session History" which matches the session pattern
    assert.strictEqual(readResult.metadata.sessionCount, 1);
    
    // 3. Append first session
    const append1 = await manager.appendContext(TEST_WORKSPACE, 'First session content', 'Session 1');
    assert.strictEqual(append1.success, true);
    
    // 4. Append second session
    const append2 = await manager.appendContext(TEST_WORKSPACE, 'Second session content', 'Session 2');
    assert.strictEqual(append2.success, true);
    
    // 5. Read again and verify session count
    const readResult2 = await manager.readContext(TEST_WORKSPACE);
    assert.strictEqual(readResult2.metadata.sessionCount, 3);
    assert.ok(readResult2.content.includes('First session content'));
    assert.ok(readResult2.content.includes('Second session content'));
    
    // 6. Get summary
    const summary = await manager.getSummary(TEST_WORKSPACE);
    assert.strictEqual(summary.exists, true);
    assert.strictEqual(summary.stats.sessions, 3);
    assert.ok(summary.stats.words > 0);
    assert.ok(summary.stats.lines > 0);
  });
  
  it('should handle tool-based workflow', async () => {
    // Initialize via tool
    await handleToolCall('init_context', { workspace: TEST_WORKSPACE });
    
    // Append via tool
    await handleToolCall('append_context', {
      workspace: TEST_WORKSPACE,
      content: 'Tool-based content',
      title: 'Tool Session'
    });
    
    // Read via tool
    const readResult = await handleToolCall('read_context', { workspace: TEST_WORKSPACE });
    const data = JSON.parse(readResult.content[0].text);
    assert.ok(data.content.includes('Tool-based content'));
    assert.ok(data.content.includes('Tool Session'));
    
    // Get summary via tool
    const summaryResult = await handleToolCall('get_context_summary', { workspace: TEST_WORKSPACE });
    const summaryData = JSON.parse(summaryResult.content[0].text);
    assert.strictEqual(summaryData.exists, true);
    // Template includes "## Session History" plus our appended session
    assert.strictEqual(summaryData.stats.sessions, 2);
  });
});

// ============================================================================
// 6. Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  const manager = new ContextManager();
  
  beforeEach(() => {
    if (!existsSync(TEST_WORKSPACE)) {
      mkdirSync(TEST_WORKSPACE, { recursive: true });
    }
    if (existsSync(TEST_CONTEXT_PATH)) {
      rmSync(TEST_CONTEXT_PATH);
    }
  });
  
  it('should handle missing context.md gracefully', async () => {
    await assert.rejects(
      () => manager.readContext(TEST_WORKSPACE),
      /not found/
    );
    
    await assert.rejects(
      () => manager.appendContext(TEST_WORKSPACE, 'content'),
      /not found/
    );
  });
  
  it('should handle empty content', async () => {
    await manager.initContext(TEST_WORKSPACE);
    
    await assert.rejects(
      () => manager.appendContext(TEST_WORKSPACE, ''),
      /empty/
    );
    
    await assert.rejects(
      () => manager.appendContext(TEST_WORKSPACE, '   '),
      /empty/
    );
  });
  
  it('should handle invalid workspace paths', async () => {
    const invalidPath = '/nonexistent/path/that/definitely/does/not/exist';
    
    await assert.rejects(
      () => manager.readContext(invalidPath),
      /not found/
    );
  });
  
  it('should handle double initialization', async () => {
    await manager.initContext(TEST_WORKSPACE);
    
    await assert.rejects(
      () => manager.initContext(TEST_WORKSPACE),
      /already exists/
    );
  });
});
