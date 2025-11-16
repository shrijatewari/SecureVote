const pool = require('../config/database');

/**
 * Validation Audit Service
 * Logs validation decisions for audit trail
 */
class ValidationAuditService {
  /**
   * Log validation result
   */
  async logValidation(validationData) {
    const connection = await pool.getConnection();
    try {
      const {
        voter_id,
        validation_type,
        validation_result,
        quality_scores = {},
        flags = [],
        decision_reason = null,
        reviewed_by = null
      } = validationData;

      await connection.query(
        `INSERT INTO validation_audit_log 
         (voter_id, validation_type, validation_result, quality_scores, flags, decision_reason, reviewed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          voter_id,
          validation_type,
          validation_result,
          JSON.stringify(quality_scores),
          JSON.stringify(flags),
          decision_reason,
          reviewed_by
        ]
      );

      return { success: true };
    } finally {
      connection.release();
    }
  }

  /**
   * Get validation audit logs
   */
  async getValidationLogs(filters = {}) {
    const connection = await pool.getConnection();
    try {
      let query = 'SELECT * FROM validation_audit_log WHERE 1=1';
      const params = [];

      if (filters.voter_id) {
        query += ' AND voter_id = ?';
        params.push(filters.voter_id);
      }

      if (filters.validation_type) {
        query += ' AND validation_type = ?';
        params.push(filters.validation_type);
      }

      if (filters.validation_result) {
        query += ' AND validation_result = ?';
        params.push(filters.validation_result);
      }

      if (filters.start_date) {
        query += ' AND created_at >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ' AND created_at <= ?';
        params.push(filters.end_date);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(filters.limit || 100);

      const [logs] = await connection.query(query, params);
      
      return logs.map(log => ({
        ...log,
        quality_scores: typeof log.quality_scores === 'string' ? JSON.parse(log.quality_scores || '{}') : log.quality_scores,
        flags: typeof log.flags === 'string' ? JSON.parse(log.flags || '[]') : log.flags
      }));
    } finally {
      connection.release();
    }
  }
}

module.exports = new ValidationAuditService();

