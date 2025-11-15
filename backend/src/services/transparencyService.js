/**
 * Transparency Service
 * Generates merkle roots, public audit proofs, and sanitized exports
 */

const crypto = require('crypto');
const pool = require('../config/database');

class TransparencyService {
  /**
   * Generate merkle root for a given date
   * Creates a hash tree of all audit logs for that day
   */
  async generateMerkleRoot(date) {
    const connection = await pool.getConnection();
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      // Get all audit logs for the date
      const [logs] = await connection.query(
        `SELECT log_id, action_type, entity_type, entity_id, voter_id, timestamp, current_hash
         FROM audit_logs
         WHERE DATE(timestamp) = ?
         ORDER BY timestamp ASC`,
        [targetDate]
      );
      
      if (logs.length === 0) {
        return {
          date: targetDate,
          merkle_root: null,
          total_records: 0,
          message: 'No records found for this date'
        };
      }
      
      // Build merkle tree
      const leaves = logs.map(log => 
        crypto.createHash('sha256')
          .update(JSON.stringify({
            log_id: log.log_id,
            action: log.action_type,
            entity: log.entity_type,
            entity_id: log.entity_id,
            hash: log.current_hash,
            timestamp: log.timestamp
          }))
          .digest('hex')
      );
      
      // Compute merkle root (simplified - in production use proper tree)
      let merkleRoot = this.computeMerkleRoot(leaves);
      
      // Sign the root
      const signature = this.signData(merkleRoot);
      
      // Store in database
      await connection.query(
        `INSERT INTO transparency_merkle_roots (date, merkle_root, total_records, signature)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         merkle_root = VALUES(merkle_root),
         total_records = VALUES(total_records),
         signature = VALUES(signature),
         published_at = NOW()`,
        [targetDate, merkleRoot, logs.length, signature]
      );
      
      return {
        date: targetDate,
        merkle_root: merkleRoot,
        total_records: logs.length,
        signature: signature,
        published_at: new Date().toISOString()
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Compute merkle root from leaves (simplified binary tree)
   */
  computeMerkleRoot(leaves) {
    if (leaves.length === 0) return null;
    if (leaves.length === 1) return leaves[0];
    
    let level = [...leaves];
    
    while (level.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < level.length; i += 2) {
        if (i + 1 < level.length) {
          const hash = crypto.createHash('sha256')
            .update(level[i] + level[i + 1])
            .digest('hex');
          nextLevel.push(hash);
        } else {
          nextLevel.push(level[i]);
        }
      }
      level = nextLevel;
    }
    
    return level[0];
  }

  /**
   * Sign data with server private key (mock - in production use HSM/KMS)
   */
  signData(data) {
    const privateKey = process.env.SIGNING_KEY || 'default_signing_key_change_in_production';
    return crypto.createHmac('sha256', privateKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Get merkle root for a date
   */
  async getMerkleRoot(date) {
    const connection = await pool.getConnection();
    try {
      const [roots] = await connection.query(
        'SELECT * FROM transparency_merkle_roots WHERE date = ?',
        [date]
      );
      return roots[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all published merkle roots
   */
  async getAllMerkleRoots(page = 1, limit = 30) {
    const connection = await pool.getConnection();
    try {
      const offset = (page - 1) * limit;
      const [roots] = await connection.query(
        'SELECT * FROM transparency_merkle_roots ORDER BY date DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      
      const [count] = await connection.query('SELECT COUNT(*) as total FROM transparency_merkle_roots');
      
      return {
        roots,
        pagination: {
          page,
          limit,
          total: count[0].total,
          totalPages: Math.ceil(count[0].total / limit)
        }
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Generate sanitized export (removes PII)
   */
  async generateSanitizedExport(region = null) {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT 
          voter_id,
          CASE 
            WHEN LENGTH(name) > 0 THEN CONCAT(LEFT(name, 1), REPEAT('*', LENGTH(name) - 1))
            ELSE '***'
          END as masked_name,
          YEAR(dob) as birth_year,
          CONCAT('****', RIGHT(aadhaar_number, 4)) as masked_aadhaar,
          district,
          state,
          pin_code,
          is_verified,
          created_at
        FROM voters
        WHERE 1=1
      `;
      const params = [];
      
      if (region) {
        if (region.district) {
          query += ' AND district = ?';
          params.push(region.district);
        }
        if (region.state) {
          query += ' AND state = ?';
          params.push(region.state);
        }
      }
      
      query += ' ORDER BY created_at DESC';
      
      const [voters] = await connection.query(query, params);
      
      return {
        export_date: new Date().toISOString(),
        region: region || 'all',
        total_records: voters.length,
        data: voters
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Verify a voter record exists (returns signed proof)
   */
  async verifyVoterRecord(voterId) {
    const connection = await pool.getConnection();
    try {
      const [voters] = await connection.query(
        `SELECT voter_id, name, aadhaar_number, dob, is_verified, created_at
         FROM voters
         WHERE voter_id = ?`,
        [voterId]
      );
      
      if (voters.length === 0) {
        return null;
      }
      
      const voter = voters[0];
      
      // Create proof
      const proofData = {
        voter_id: voter.voter_id,
        exists: true,
        is_verified: voter.is_verified,
        timestamp: new Date().toISOString()
      };
      
      const proofHash = crypto.createHash('sha256')
        .update(JSON.stringify(proofData))
        .digest('hex');
      
      const signature = this.signData(proofHash);
      
      return {
        proof: proofData,
        hash: proofHash,
        signature: signature,
        verification_url: `/api/transparency/verify-proof?hash=${proofHash}`
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = new TransparencyService();

