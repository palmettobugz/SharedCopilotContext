/**
 * COMMS Integration - Bridge with ai-lab-constellation COMMS API
 */

const COMMS_API_URL = process.env.COMMS_API_URL || 'http://star-force-one.local:5052';
const COMMS_TIMEOUT = parseInt(process.env.COMMS_TIMEOUT) || 5000;

/**
 * Check COMMS system status
 * @returns {Promise<Object>} Status object with health info or offline flag
 */
export async function checkCommsStatus() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), COMMS_TIMEOUT);
    
    // COMMS API uses /api/online for health check
    const response = await fetch(`${COMMS_API_URL}/api/online`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      return { offline: true, error: `Status check failed: ${response.status}` };
    }
    
    const status = await response.json();
    return { ...status, offline: false };
  } catch (error) {
    console.error('[COMMS] Status check failed:', error.message);
    
    if (error.name === 'AbortError') {
      return { offline: true, error: 'COMMS timeout' };
    }
    return { offline: true, error: error.message };
  }
}

/**
 * Send a message to the COMMS system
 * @param {string} content - Message content
 * @param {string} messageType - Message type (status,question,info,alert)
 * @param {Object} metadata - Optional metadata
 * @returns {Promise<Object>} Send result with success/offline status
 */
export async function sendMessage(content, messageType = 'info', metadata = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), COMMS_TIMEOUT);
    
    const payload = {
      content,
      message_type: messageType,
      ...metadata
    };
    
    const response = await fetch(`${COMMS_API_URL}/api/messages`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      return { offline: true, error: `Send failed: ${response.status}` };
    }
    
    const result = await response.json();
    return { ...result, offline: false, success: true };
  } catch (error) {
    console.error('[COMMS] Send message failed:', error.message);
    
    if (error.name === 'AbortError') {
      return { offline: true, error: 'COMMS timeout' };
    }
    return { offline: true, error: error.message };
  }
}

/**
 * Get messages from the COMMS system
 * @param {number} limit - Maximum number of messages to return
 * @param {string} messageType - Filter by message type (optional)
 * @returns {Promise<Object>} Messages array or offline status
 */
export async function getMessages(limit = 50, messageType = null) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), COMMS_TIMEOUT);
    
    let url = `${COMMS_API_URL}/api/messages?limit=${limit}`;
    if (messageType) {
      url += `&message_type=${messageType}`;
    }
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      return { offline: true, error: `Get messages failed: ${response.status}` };
    }
    
    const data = await response.json();
    // COMMS API returns { messages: [...] } - extract the array
    const messages = Array.isArray(data) ? data : (data.messages || []);
    return { messages, offline: false };
  } catch (error) {
    console.error('[COMMS] Get messages failed:', error.message);
    
    if (error.name === 'AbortError') {
      return { offline: true, error: 'COMMS timeout' };
    }
    return { offline: true, error: error.message };
  }
}

/**
 * Parse COMMS URI to extract parameters
 * @param {string} uri - COMMS resource URI
 * @returns {Object} Parsed URI components
 */
export function parseCommsUri(uri) {
  const url = new URL(uri);
  const params = new URLSearchParams(url.search);
  
  return {
    path: url.pathname,
    query: Object.fromEntries(params.entries()),
    limit: parseInt(params.get('limit')) || 50,
    messageType: params.get('message_type') || null
  };
}