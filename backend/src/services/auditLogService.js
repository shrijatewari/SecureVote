const pool = require('../config/database');

class AuditLogService {
  async getAuditLogs(filters = {}, page = 1, limit = 10) {
    const connection = await pool.getConnection();
    try {
      const offset = (page - 1) * limit;
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params = [];

      if (filters.entity_type) {
        query += ' AND entity_type = ?';
        params.push(filters.entity_type);
      }

      if (filters.action_type) {
        query += ' AND action_type = ?';
        params.push(filters.action_type);
      }

      if (filters.voter_id) {
        query += ' AND voter_id = ?';
        params.push(filters.voter_id);
      }

      if (filters.election_id) {
        query += ' AND election_id = ?';
        params.push(filters.election_id);
      }

      if (filters.start_date) {
        query += ' AND timestamp >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ' AND timestamp <= ?';
        params.push(filters.end_date);
      }

      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await connection.query(query, params);

      // Get total count (build same query without LIMIT/OFFSET)
      let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
      const countParams = [];

      if (filters.entity_type) {
        countQuery += ' AND entity_type = ?';
        countParams.push(filters.entity_type);
      }

      if (filters.action_type) {
        countQuery += ' AND action_type = ?';
        countParams.push(filters.action_type);
      }

      if (filters.voter_id) {
        countQuery += ' AND voter_id = ?';
        countParams.push(filters.voter_id);
      }

      if (filters.election_id) {
        countQuery += ' AND election_id = ?';
        countParams.push(filters.election_id);
      }

      if (filters.start_date) {
        countQuery += ' AND timestamp >= ?';
        countParams.push(filters.start_date);
      }

      if (filters.end_date) {
        countQuery += ' AND timestamp <= ?';
        countParams.push(filters.end_date);
      }

      const [countRows] = await connection.query(countQuery, countParams);

      return {
        audit_logs: rows,
        pagination: {
          page,
          limit,
          total: countRows[0].total,
          totalPages: Math.ceil(countRows[0].total / limit)
        }
      };
    } finally {
      connection.release();
    }
  }

  async verifyAuditHashChain() {
    const connection = await pool.getConnection();
    try {
      const { verifyHashChain } = require('../utils/hashChain');
      return await verifyHashChain(connection, 'audit_logs');
    } finally {
      connection.release();
    }
  }

  async logAction(data) {
    const connection = await pool.getConnection();
    try {
      const { generateHash, getLastAuditHash } = require('../utils/hashChain');
      const timestamp = new Date();
      const previousHash = await getLastAuditHash(connection);
      
      const logData = {
        action_type: data.action_type,
        entity_type: data.entity_type,
        timestamp: timestamp.toISOString(),
        entity_id: data.entity_id || null,
        actor_id: data.actor_id || null
      };
      
      const currentHash = generateHash(previousHash, logData, timestamp.toISOString());
      
      await connection.query(
        `INSERT INTO audit_logs 
         (action_type, entity_type, entity_id, actor_id, timestamp, previous_hash, current_hash, details) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.action_type,
          data.entity_type,
          data.entity_id || null,
          data.actor_id || null,
          timestamp,
          previousHash,
          currentHash,
          data.metadata || JSON.stringify({})
        ]
      );
      
      return { success: true, hash: currentHash };
    } catch (error) {
      console.error('Audit log error:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new AuditLogService();

