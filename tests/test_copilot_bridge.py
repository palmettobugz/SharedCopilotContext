#!/usr/bin/env python3
"""
Playwright tests for Copilot Bridge Agent via COMMS Console.

Tests @copilot command handling through the COMMS chat interface.

Requirements:
    pip install playwright pytest-playwright
    playwright install chromium

Prerequisites:
    1. COMMS Console running on sf1 (http://star-force-one.local:5052)
    2. Copilot Bridge Agent running (npm run bridge)

Run with:
    pytest tests/test_copilot_bridge.py -v --headed  # See browser
    pytest tests/test_copilot_bridge.py -v           # Headless
"""

import re
import pytest
from playwright.sync_api import Page, expect, sync_playwright

# Configuration
COMMS_URL = "http://star-force-one.local:5052/"
COMMS_PROXY_URL = "https://192.168.4.3:8443/comms/"

# Timeouts
BRIDGE_RESPONSE_TIMEOUT = 15_000  # 15 seconds (no LLM, should be fast)
PAGE_LOAD_TIMEOUT = 10_000


@pytest.fixture(scope="function")
def page():
    """Create browser context that ignores SSL cert errors (for proxy)."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(ignore_https_errors=True)
        page = context.new_page()
        yield page
        page.close()
        context.close()
        browser.close()


def send_message(page: Page, message: str):
    """Helper to send a message via the COMMS input field."""
    input_field = page.locator("#message-input")
    input_field.fill(message)
    page.locator(".send-btn").click()


def wait_for_copilot_response(page: Page, contains_text: str, timeout: int = BRIDGE_RESPONSE_TIMEOUT):
    """Wait for a response from the Copilot Bridge containing specific text."""
    # Look for messages from copilot-bridge or containing the expected text
    page.wait_for_function(
        f"""
        () => {{
            const msgs = document.querySelector('#messages');
            if (!msgs) return false;
            const text = msgs.innerText;
            return text.includes('Copilot') && text.includes('{contains_text}');
        }}
        """,
        timeout=timeout
    )


class TestCopilotBridgeOnline:
    """Tests that the Copilot Bridge is online and responding."""

    def test_bridge_appears_in_entities(self, page: Page):
        """Copilot Bridge should appear in the online entities list."""
        page.goto(COMMS_URL, timeout=PAGE_LOAD_TIMEOUT)
        page.wait_for_timeout(3000)  # Wait for SSE connection
        
        # Check API for online entities
        response = page.evaluate("""
            async () => {
                const res = await fetch('/api/online');
                return await res.json();
            }
        """)
        
        entity_ids = [e["id"] for e in response.get("entities", [])]
        assert "copilot-bridge" in entity_ids, (
            f"Copilot Bridge not online. Found entities: {entity_ids}"
        )

    def test_bridge_sends_online_message(self, page: Page):
        """Copilot Bridge should announce when it comes online."""
        page.goto(COMMS_URL, timeout=PAGE_LOAD_TIMEOUT)
        page.wait_for_timeout(3000)
        
        # The bridge should have sent an online message
        # Check recent messages for the announcement
        response = page.evaluate("""
            async () => {
                const res = await fetch('/api/messages?limit=50');
                return await res.json();
            }
        """)
        
        messages = response.get("messages", [])
        copilot_messages = [
            m for m in messages 
            if "copilot" in m.get("sender_id", "").lower()
        ]
        
        assert len(copilot_messages) > 0, "No messages from Copilot Bridge found"


class TestCopilotHelp:
    """Tests for @copilot help command."""

    def test_help_returns_command_list(self, page: Page):
        """@copilot help should return list of available commands."""
        page.goto(COMMS_URL, timeout=PAGE_LOAD_TIMEOUT)
        page.wait_for_timeout(2000)
        
        send_message(page, "@copilot help")
        
        # Wait for response containing command list
        wait_for_copilot_response(page, "Commands")
        
        messages = page.locator("#messages")
        expect(messages).to_contain_text("recent")
        expect(messages).to_contain_text("search")
        expect(messages).to_contain_text("context")
        expect(messages).to_contain_text("status")


class TestCopilotRecent:
    """Tests for @copilot recent command."""

    def test_recent_returns_session_list(self, page: Page):
        """@copilot recent should return list of chat sessions."""
        page.goto(COMMS_URL, timeout=PAGE_LOAD_TIMEOUT)
        page.wait_for_timeout(2000)
        
        send_message(page, "@copilot recent")
        
        # Wait for response with session list
        wait_for_copilot_response(page, "Chat Sessions")
        
        messages = page.locator("#messages")
        # Should contain session count or "No chat sessions"
        messages_text = messages.inner_text()
        assert "Sessions" in messages_text or "No chat sessions" in messages_text

    def test_recent_with_limit(self, page: Page):
        """@copilot recent 5 should return limited number of sessions."""
        page.goto(COMMS_URL, timeout=PAGE_LOAD_TIMEOUT)
        page.wait_for_timeout(2000)
        
        send_message(page, "@copilot recent 5")
        
        wait_for_copilot_response(page, "Sessions")
        
        # Response should mention the limit
        messages = page.locator("#messages")
        messages_text = messages.inner_text()
        # Either shows "Last 5" or fewer if not enough sessions
        assert "Last" in messages_text or "No chat sessions" in messages_text

    def test_all_chats_alias(self, page: Page):
        """@copilot all should work as alias for recent with high limit."""
        page.goto(COMMS_URL, timeout=PAGE_LOAD_TIMEOUT)
        page.wait_for_timeout(2000)
        
        send_message(page, "@copilot all")
        
        wait_for_copilot_response(page, "Sessions")


class TestCopilotSearch:
    """Tests for @copilot search command."""

    def test_search_returns_results(self, page: Page):
        """@copilot search <query> should return matching sessions."""
        page.goto(COMMS_URL, timeout=PAGE_LOAD_TIMEOUT)
        page.wait_for_timeout(2000)
        
        send_message(page, "@copilot search MCP")
        
        # Wait for response with search results
        try:
            wait_for_copilot_response(page, "Found")
        except:
            # May return "No results" which is also valid
            wait_for_copilot_response(page, "No results")
        
        messages = page.locator("#messages")
        messages_text = messages.inner_text()
        assert "Found" in messages_text or "No results" in messages_text

    def test_search_with_no_results(self, page: Page):
        """@copilot search <unlikely query> should handle no results gracefully."""
        page.goto(COMMS_URL, timeout=PAGE_LOAD_TIMEOUT)
        page.wait_for_timeout(2000)
        
        # Use an unlikely search term
        send_message(page, "@copilot search xyzzy12345nonexistent")
        
        wait_for_copilot_response(page, "No results")


class TestCopilotContext:
    """Tests for @copilot context command."""

    def test_context_returns_content(self, page: Page):
        """@copilot context should return context.md content."""
        page.goto(COMMS_URL, timeout=PAGE_LOAD_TIMEOUT)
        page.wait_for_timeout(2000)
        
        send_message(page, "@copilot context")
        
        # Wait for response with context content
        wait_for_copilot_response(page, "context.md")
        
        messages = page.locator("#messages")
        messages_text = messages.inner_text()
        # Should contain markdown header or "No context.md"
        assert "context.md" in messages_text


class TestCopilotStatus:
    """Tests for @copilot status command."""

    def test_status_returns_bridge_info(self, page: Page):
        """@copilot status should return bridge status information."""
        page.goto(COMMS_URL, timeout=PAGE_LOAD_TIMEOUT)
        page.wait_for_timeout(2000)
        
        send_message(page, "@copilot status")
        
        wait_for_copilot_response(page, "Status")
        
        messages = page.locator("#messages")
        expect(messages).to_contain_text("Agent ID")
        expect(messages).to_contain_text("COMMS")
        expect(messages).to_contain_text("Connected")


class TestCopilotUnknownCommand:
    """Tests for unknown command handling."""

    def test_unknown_command_shows_help_hint(self, page: Page):
        """Unknown @copilot command should suggest using help."""
        page.goto(COMMS_URL, timeout=PAGE_LOAD_TIMEOUT)
        page.wait_for_timeout(2000)
        
        send_message(page, "@copilot xyzzy")
        
        wait_for_copilot_response(page, "Unknown")
        
        messages = page.locator("#messages")
        expect(messages).to_contain_text("help")


class TestCopilotResponseFormat:
    """Tests for response formatting."""

    def test_response_uses_emoji(self, page: Page):
        """Copilot Bridge responses should use appropriate emoji."""
        page.goto(COMMS_URL, timeout=PAGE_LOAD_TIMEOUT)
        page.wait_for_timeout(2000)
        
        send_message(page, "@copilot status")
        
        wait_for_copilot_response(page, "Status")
        
        messages = page.locator("#messages")
        messages_text = messages.inner_text()
        # Should contain checkmark or other status emoji
        assert "✅" in messages_text or "❌" in messages_text or "🌐" in messages_text

    def test_response_has_sender_name(self, page: Page):
        """Copilot Bridge messages should show sender name."""
        page.goto(COMMS_URL, timeout=PAGE_LOAD_TIMEOUT)
        page.wait_for_timeout(2000)
        
        send_message(page, "@copilot help")
        
        wait_for_copilot_response(page, "Commands")
        
        # The message should show "Copilot" as sender
        messages = page.locator("#messages")
        expect(messages).to_contain_text("Copilot")


class TestCopilotViaProxy:
    """Tests for accessing Copilot Bridge via nginx proxy (cross-subnet)."""

    def test_proxy_copilot_help(self, page: Page):
        """@copilot help should work via proxy path."""
        page.goto(COMMS_PROXY_URL, timeout=PAGE_LOAD_TIMEOUT)
        page.wait_for_timeout(2000)
        
        send_message(page, "@copilot help")
        
        wait_for_copilot_response(page, "Commands")
        
        messages = page.locator("#messages")
        expect(messages).to_contain_text("recent")

    def test_proxy_copilot_status(self, page: Page):
        """@copilot status should work via proxy path."""
        page.goto(COMMS_PROXY_URL, timeout=PAGE_LOAD_TIMEOUT)
        page.wait_for_timeout(2000)
        
        send_message(page, "@copilot status")
        
        wait_for_copilot_response(page, "Status")
        
        messages = page.locator("#messages")
        expect(messages).to_contain_text("Connected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--headed"])
