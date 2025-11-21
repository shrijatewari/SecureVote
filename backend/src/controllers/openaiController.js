/**
 * OpenAI Controller
 * Handles all OpenAI API endpoints with strict PII protection
 */

const openaiClient = require('../services/openai/client');
const sanitizer = require('../services/openai/sanitizer');
const prompts = require('../services/openai/prompts');
const openaiLogger = require('../services/openai/openaiLogger');

class OpenAIController {
  /**
   * Explain anomaly
   * POST /api/ai/openai/explain-anomaly
   */
  async explainAnomaly(req, res, next) {
    const startTime = Date.now();
    const requestId = openaiClient.generateRequestId();
    
    try {
      if (!openaiClient.isAvailable()) {
        return res.status(503).json({
          error: 'OpenAI service not configured',
          message: 'OPENAI_API_KEY not set',
        });
      }

      const { issueType, region, metrics, sample_count, aggregated_flags } = req.body;

      // Sanitize input
      const sanitizedData = sanitizer.redact({
        issueType,
        region,
        metrics,
        sample_count,
        aggregated_flags,
      }, 'anomaly');

      // Validate no PII
      const validation = sanitizer.validateNoPII(sanitizedData);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid request',
          message: validation.reason,
        });
      }

      // Build prompt
      const promptData = prompts.explainAnomaly(sanitizedData);
      const messages = [
        { role: 'system', content: promptData.system },
        { role: 'user', content: promptData.user },
      ];

      // Call OpenAI
      const response = await openaiClient.chatCompletion({
        messages,
        temperature: 0.3,
      });

      const latencyMs = Date.now() - startTime;
      const responseData = JSON.parse(response.content || '{}');

      // Log call
      await openaiLogger.logCall({
        request_id: requestId,
        user_id: req.user?.id || null,
        role: req.user?.role || null,
        endpoint: 'explain-anomaly',
        redacted_payload: sanitizedData,
        response_summary: {
          explanation_length: responseData.explanation?.length || 0,
          confidence: responseData.confidence,
          actions_count: responseData.recommended_actions?.length || 0,
        },
        latency_ms: latencyMs,
      });

      res.json({
        success: true,
        request_id: requestId,
        data: responseData,
        latency_ms: latencyMs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Recommend action
   * POST /api/ai/openai/recommend-action
   */
  async recommendAction(req, res, next) {
    const startTime = Date.now();
    const requestId = openaiClient.generateRequestId();
    
    try {
      if (!openaiClient.isAvailable()) {
        return res.status(503).json({
          error: 'OpenAI service not configured',
        });
      }

      const { issueType, context, severity, suggested_actions } = req.body;

      const sanitizedData = sanitizer.redact({
        issueType,
        context,
        severity,
        suggested_actions,
      }, 'anomaly');

      const promptData = prompts.recommendAction(sanitizedData);
      const messages = [
        { role: 'system', content: promptData.system },
        { role: 'user', content: promptData.user },
      ];

      const response = await openaiClient.chatCompletion({ messages });
      const latencyMs = Date.now() - startTime;
      const responseData = JSON.parse(response.content || '{}');

      await openaiLogger.logCall({
        request_id: requestId,
        user_id: req.user?.id,
        role: req.user?.role,
        endpoint: 'recommend-action',
        redacted_payload: sanitizedData,
        response_summary: {
          steps_count: responseData.recommended_steps?.length || 0,
          priority: responseData.priority,
        },
        latency_ms: latencyMs,
      });

      res.json({
        success: true,
        request_id: requestId,
        data: responseData,
        latency_ms: latencyMs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Summarize security events
   * POST /api/ai/openai/summarize-security
   */
  async summarizeSecurity(req, res, next) {
    const startTime = Date.now();
    const requestId = openaiClient.generateRequestId();
    
    try {
      if (!openaiClient.isAvailable()) {
        return res.status(503).json({ error: 'OpenAI service not configured' });
      }

      const { timeWindow, categories, counts, topAlerts } = req.body;

      const sanitizedData = sanitizer.redact({
        timeWindow,
        categories,
        counts,
        topAlerts,
      }, 'security');

      const promptData = prompts.summarizeSecurity(sanitizedData);
      const messages = [
        { role: 'system', content: promptData.system },
        { role: 'user', content: promptData.user },
      ];

      const response = await openaiClient.chatCompletion({ messages });
      const latencyMs = Date.now() - startTime;
      const responseData = JSON.parse(response.content || '{}');

      await openaiLogger.logCall({
        request_id: requestId,
        user_id: req.user?.id,
        role: req.user?.role,
        endpoint: 'summarize-security',
        redacted_payload: sanitizedData,
        response_summary: {
          summary_length: responseData.summary?.length || 0,
          severity: responseData.severity_overall,
        },
        latency_ms: latencyMs,
      });

      res.json({
        success: true,
        request_id: requestId,
        data: responseData,
        latency_ms: latencyMs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Explain name quality flag
   * POST /api/ai/openai/name-quality-explain
   */
  async explainNameQuality(req, res, next) {
    const startTime = Date.now();
    const requestId = openaiClient.generateRequestId();
    
    try {
      if (!openaiClient.isAvailable()) {
        return res.status(503).json({ error: 'OpenAI service not configured' });
      }

      const { name_metrics, anonymized_example_id } = req.body;

      const sanitizedData = sanitizer.redact({
        name_metrics,
        anonymized_example_id,
      }, 'name_metrics');

      const promptData = prompts.explainNameQuality(sanitizedData.name_metrics);
      const messages = [
        { role: 'system', content: promptData.system },
        { role: 'user', content: promptData.user },
      ];

      const response = await openaiClient.chatCompletion({ messages });
      const latencyMs = Date.now() - startTime;
      const responseData = JSON.parse(response.content || '{}');

      await openaiLogger.logCall({
        request_id: requestId,
        user_id: req.user?.id,
        role: req.user?.role,
        endpoint: 'name-quality-explain',
        redacted_payload: sanitizedData,
        response_summary: {
          recommendation: responseData.recommendation,
          confidence: responseData.confidence,
        },
        latency_ms: latencyMs,
      });

      res.json({
        success: true,
        request_id: requestId,
        data: responseData,
        latency_ms: latencyMs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Document summary
   * POST /api/ai/openai/document-summary
   */
  async documentSummary(req, res, next) {
    const startTime = Date.now();
    const requestId = openaiClient.generateRequestId();
    
    try {
      if (!openaiClient.isAvailable()) {
        return res.status(503).json({ error: 'OpenAI service not configured' });
      }

      const { ocr_summary, doc_type } = req.body;

      const sanitizedData = sanitizer.redact({
        ocr_summary,
        doc_type,
      }, 'document');

      const promptData = prompts.documentSummary(sanitizedData);
      const messages = [
        { role: 'system', content: promptData.system },
        { role: 'user', content: promptData.user },
      ];

      const response = await openaiClient.chatCompletion({ messages });
      const latencyMs = Date.now() - startTime;
      const responseData = JSON.parse(response.content || '{}');

      await openaiLogger.logCall({
        request_id: requestId,
        user_id: req.user?.id,
        role: req.user?.role,
        endpoint: 'document-summary',
        redacted_payload: sanitizedData,
        response_summary: {
          requires_review: responseData.requires_review,
          confidence: responseData.confidence,
        },
        latency_ms: latencyMs,
      });

      res.json({
        success: true,
        request_id: requestId,
        data: responseData,
        latency_ms: latencyMs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate notice
   * POST /api/ai/openai/generate-notice
   */
  async generateNotice(req, res, next) {
    const startTime = Date.now();
    const requestId = openaiClient.generateRequestId();
    
    try {
      if (!openaiClient.isAvailable()) {
        return res.status(503).json({ error: 'OpenAI service not configured' });
      }

      const { notice_type, lang, audience, key_points } = req.body;

      const sanitizedData = sanitizer.redact({
        notice_type,
        lang,
        audience,
        key_points,
      }, 'notice');

      const promptData = prompts.generateNotice(sanitizedData);
      const messages = [
        { role: 'system', content: promptData.system },
        { role: 'user', content: promptData.user },
      ];

      const response = await openaiClient.chatCompletion({
        messages,
        temperature: 0.7, // Slightly higher for creative writing
        max_tokens: 1200,
      });
      const latencyMs = Date.now() - startTime;
      const responseData = JSON.parse(response.content || '{}');

      await openaiLogger.logCall({
        request_id: requestId,
        user_id: req.user?.id,
        role: req.user?.role,
        endpoint: 'generate-notice',
        redacted_payload: sanitizedData,
        response_summary: {
          short_length: responseData.short_notice?.length || 0,
          long_length: responseData.long_notice?.length || 0,
        },
        latency_ms: latencyMs,
      });

      res.json({
        success: true,
        request_id: requestId,
        data: responseData,
        latency_ms: latencyMs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Debug prompt (Admin5 only)
   * POST /api/ai/openai/debug-prompt
   */
  async debugPrompt(req, res, next) {
    const startTime = Date.now();
    const requestId = openaiClient.generateRequestId();
    
    try {
      if (!openaiClient.isAvailable()) {
        return res.status(503).json({ error: 'OpenAI service not configured' });
      }

      const { issue, context, logs_summary } = req.body;

      // Extra sanitization for debug endpoint
      const sanitizedData = sanitizer.redact({
        issue,
        context,
        logs_summary,
      }, 'anomaly');

      const promptData = prompts.debugPrompt(sanitizedData);
      const messages = [
        { role: 'system', content: promptData.system },
        { role: 'user', content: promptData.user },
      ];

      const response = await openaiClient.chatCompletion({ messages });
      const latencyMs = Date.now() - startTime;
      const responseData = JSON.parse(response.content || '{}');

      await openaiLogger.logCall({
        request_id: requestId,
        user_id: req.user?.id,
        role: req.user?.role,
        endpoint: 'debug-prompt',
        redacted_payload: sanitizedData,
        response_summary: {
          analysis_length: responseData.analysis?.length || 0,
        },
        latency_ms: latencyMs,
      });

      res.json({
        success: true,
        request_id: requestId,
        data: responseData,
        latency_ms: latencyMs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get call history
   * GET /api/ai/openai/history
   */
  async getCallHistory(req, res, next) {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit || '50', 10);

      const history = await openaiLogger.getUserCallHistory(userId, limit);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get call statistics
   * GET /api/ai/openai/stats
   */
  async getCallStats(req, res, next) {
    try {
      const hours = parseInt(req.query.hours || '24', 10);
      const stats = await openaiLogger.getCallStats(hours);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OpenAIController();

