/**
 * OpenAI Call Logger
 * Logs all OpenAI API calls to database for audit and compliance
 */

const pool = require('../../config/database');

class OpenAILogger {
  /**
   * Log OpenAI API call
   * @param {Object} logData - { requestId, userId, role, endpoint, redactedPayload, responseSummary, latencyMs }
   */
  async logCall(logData) {
    const connection = await pool.getConnection();
    try {
      const {
        request_id,
        user_id,
        role,
        endpoint,
        redacted_payload,
        response_summary,
        latency_ms,
      } = logData;

      await connection.query(
        `INSERT INTO openai_call_logs 
         (request_id, user_id, role, endpoint, redacted_payload, response_summary, latency_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          request_id,
          user_id || null,
          role || null,
          endpoint,
          JSON.stringify(redacted_payload),
          JSON.stringify(response_summary),
          latency_ms || null,
        ]
      );
    } catch (error) {
      // Log error but don't throw - logging failure shouldn't break the API call
      console.error('Failed to log OpenAI call:', error.message);
    } finally {
      connection.release();
    }
  }

  /**
   * Get call history for a user
   */
  async getUserCallHistory(userId, limit = 50) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT request_id, endpoint, latency_ms, created_at 
         FROM openai_call_logs 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [userId, limit]
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Get call statistics
   */
  async getCallStats(timeWindowHours = 24) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT 
           COUNT(*) as total_calls,
           AVG(latency_ms) as avg_latency,
           COUNT(DISTINCT user_id) as unique_users,
           COUNT(DISTINCT endpoint) as unique_endpoints
         FROM openai_call_logs
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
        [timeWindowHours]
      );
      return rows[0] || {};
    } finally {
      connection.release();
    }
  }

  /**
   * Clean up old logs (retention policy)
   */
  async cleanupOldLogs(retentionDays = 30) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        `DELETE FROM openai_call_logs 
         WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [retentionDays]
      );
      return result.affectedRows;
    } finally {
      connection.release();
    }
  }
}

module.exports = new OpenAILogger();

