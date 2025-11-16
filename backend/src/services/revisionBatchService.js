/**
 * Revision Batch Service
 * Handles dry-run and commit workflow for roll revisions
 */

const pool = require('../config/database');
const crypto = require('crypto');

class RevisionBatchService {
  /**
   * Get all revision batches
   */
  async getAllBatches(page = 1, limit = 10, status = null) {
    const connection = await pool.getConnection();
    try {
      const offset = (page - 1) * limit;
      let query = 'SELECT * FROM revision_batches';
      const params = [];
      
      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const [batches] = await connection.query(query, params);
      const [countResult] = await connection.query(
        'SELECT COUNT(*) as total FROM revision_batches' + (status ? ' WHERE status = ?' : ''),
        status ? [status] : []
      );
      
      return {
        batches,
        total: countResult[0].total,
        page,
        limit
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Run dry-run revision
   */
  async runDryRun(options = {}) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { region = 'all', district, state } = options;
      
      // Create revision batch with 'draft' status
      const merkleRoot = crypto.createHash('sha256')
        .update(`${Date.now()}-${region}`)
        .digest('hex');
      
      const [batchResult] = await connection.query(
        `INSERT INTO revision_batches (region, start_date, end_date, status, merkle_root, created_at)
         VALUES (?, ?, ?, 'draft', ?, NOW())`,
        [
          region,
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          merkleRoot
        ]
      );
      
      const batchId = batchResult.insertId;
      
      // Find flags (duplicates, deceased, etc.)
      const flags = [];
      
      // Check for duplicate voters
      const [duplicates] = await connection.query(`
        SELECT v1.voter_id as voter_id_1, v2.voter_id as voter_id_2,
               v1.name as name_1, v2.name as name_2,
               v1.aadhaar_number as aadhaar_1, v2.aadhaar_number as aadhaar_2
        FROM voters v1
        JOIN voters v2 ON v1.voter_id < v2.voter_id
        WHERE v1.aadhaar_number = v2.aadhaar_number
           OR (v1.email = v2.email AND v1.email IS NOT NULL AND v1.email != '')
           OR (v1.mobile_number = v2.mobile_number AND v1.mobile_number IS NOT NULL)
        LIMIT 50
      `);
      
      for (const dup of duplicates) {
        const [flagResult] = await connection.query(
          `INSERT INTO revision_flags (batch_id, voter_id, flag_type, reason, score, status)
           VALUES (?, ?, 'duplicate', ?, 0.85, 'pending')`,
          [batchId, dup.voter_id_1, `Potential duplicate with voter ${dup.voter_id_2}`]
        );
        flags.push({
          flag_id: flagResult.insertId,
          batch_id: batchId,
          voter_id: dup.voter_id_1,
          flag_type: 'duplicate',
          reason: `Potential duplicate with voter ${dup.voter_id_2}`,
          score: 0.85,
          status: 'pending'
        });
      }
      
      // Check for deceased voters
      const [deceased] = await connection.query(`
        SELECT v.voter_id, dr.death_date
        FROM voters v
        JOIN death_records dr ON v.aadhaar_number = dr.aadhaar_number
        WHERE v.is_active = 1
        LIMIT 20
      `);
      
      for (const dec of deceased) {
        const [flagResult] = await connection.query(
          `INSERT INTO revision_flags (batch_id, voter_id, flag_type, reason, score, status)
           VALUES (?, ?, 'deceased', ?, 0.95, 'pending')`,
          [batchId, dec.voter_id, `Voter marked as deceased on ${dec.death_date}`]
        );
        flags.push({
          flag_id: flagResult.insertId,
          batch_id: batchId,
          voter_id: dec.voter_id,
          flag_type: 'deceased',
          reason: `Voter marked as deceased on ${dec.death_date}`,
          score: 0.95,
          status: 'pending'
        });
      }
      
      await connection.commit();
      
      return {
        batch_id: batchId,
        flags: flags,
        flags_count: flags.length
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Commit revision batch
   */
  async commitBatch(batchId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Get batch
      const [batches] = await connection.query(
        'SELECT * FROM revision_batches WHERE batch_id = ?',
        [batchId]
      );
      
      if (batches.length === 0) {
        throw new Error('Revision batch not found');
      }
      
      const batch = batches[0];
      
      if (batch.status !== 'draft') {
        throw new Error(`Cannot commit batch with status: ${batch.status}`);
      }
      
      // Get all pending flags
      const [flags] = await connection.query(
        'SELECT * FROM revision_flags WHERE batch_id = ? AND status = ?',
        [batchId, 'pending']
      );
      
      // Apply changes based on flags
      for (const flag of flags) {
        if (flag.flag_type === 'deceased') {
          await connection.query(
            'UPDATE voters SET is_active = 0 WHERE voter_id = ?',
            [flag.voter_id]
          );
        }
        // Mark flag as applied
        await connection.query(
          'UPDATE revision_flags SET status = ? WHERE flag_id = ?',
          ['applied', flag.flag_id]
        );
      }
      
      // Update batch status
      await connection.query(
        'UPDATE revision_batches SET status = ?, committed_at = NOW() WHERE batch_id = ?',
        ['committed', batchId]
      );
      
      await connection.commit();
      
      return {
        batch_id: batchId,
        flags_applied: flags.length,
        status: 'committed'
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get batch flags
   */
  async getBatchFlags(batchId) {
    const connection = await pool.getConnection();
    try {
      const [flags] = await connection.query(
        `SELECT rf.*, v.name as voter_name, v.aadhaar_number, v.email
         FROM revision_flags rf
         LEFT JOIN voters v ON rf.voter_id = v.voter_id
         WHERE rf.batch_id = ?
         ORDER BY rf.score DESC`,
        [batchId]
      );
      return flags;
    } finally {
      connection.release();
    }
  }
}

module.exports = new RevisionBatchService();

