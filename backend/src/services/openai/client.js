/**
 * OpenAI Client Wrapper
 * Provides secure, rate-limited access to OpenAI API
 * NEVER sends PII - all data must be sanitized before calling this
 */

const OpenAI = require('openai');
const crypto = require('crypto');

class OpenAIClient {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  OPENAI_API_KEY not set. OpenAI features will be disabled.');
      this.client = null;
      return;
    }

    // Initialize OpenAI client with timeout
    this.client = new OpenAI({
      apiKey: apiKey,
      timeout: parseInt(process.env.OPENAI_API_TIMEOUT_MS || '20000', 10),
      maxRetries: 2,
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '800', 10);
  }

  /**
   * Check if OpenAI is available
   */
  isAvailable() {
    return this.client !== null;
  }

  /**
   * Generate chat completion with safety checks
   * @param {Object} params - { messages, temperature, max_tokens }
   * @returns {Promise<Object>} OpenAI response
   */
  async chatCompletion(params) {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    const {
      messages = [],
      temperature = 0.3, // Lower temperature for more deterministic responses
      max_tokens = this.maxTokens,
    } = params;

    // Safety check: Ensure no PII in messages
    const messagesStr = JSON.stringify(messages);
    const piiPatterns = [
      /\d{12}/g, // Aadhaar numbers
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email
      /\d{10}/g, // Phone numbers
    ];

    for (const pattern of piiPatterns) {
      if (pattern.test(messagesStr)) {
        throw new Error('PII detected in OpenAI request. All data must be sanitized first.');
      }
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: temperature,
        max_tokens: max_tokens,
        response_format: { type: 'json_object' }, // Force JSON responses for structured data
      });

      return {
        content: response.choices[0]?.message?.content || '',
        usage: response.usage || {},
        model: response.model,
        finish_reason: response.choices[0]?.finish_reason || 'stop',
      };
    } catch (error) {
      // Handle OpenAI API errors
      if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else if (error.status === 401) {
        throw new Error('OpenAI API key invalid. Please check configuration.');
      } else if (error.status === 500) {
        throw new Error('OpenAI service temporarily unavailable. Please try again.');
      }
      throw new Error(`OpenAI API error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Generate a unique request ID for tracking
   */
  generateRequestId() {
    return crypto.randomUUID();
  }
}

// Export singleton instance
module.exports = new OpenAIClient();

