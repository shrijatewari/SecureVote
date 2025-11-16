const pool = require('../config/database');

/**
 * Address Anomaly Detection Service
 * Detects suspicious address clusters and patterns
 */
class AddressAnomalyDetectionService {
  /**
   * Detect address clusters (multiple voters at same address)
   */
  async detectAddressClusters(thresholds = { low: 6, medium: 12, high: 20 }) {
    const connection = await pool.getConnection();
    try {
      // Find addresses with multiple voters
      const [clusters] = await connection.query(`
        SELECT 
          address_hash,
          normalized_address,
          COUNT(DISTINCT voter_id) as voter_count,
          GROUP_CONCAT(DISTINCT district SEPARATOR ', ') as districts,
          GROUP_CONCAT(DISTINCT state SEPARATOR ', ') as states,
          GROUP_CONCAT(DISTINCT name SEPARATOR '|') as names,
          GROUP_CONCAT(DISTINCT father_name SEPARATOR '|') as father_names,
          GROUP_CONCAT(DISTINCT dob SEPARATOR ',') as dobs,
          AVG(address_quality_score) as avg_quality_score,
          MIN(created_at) as first_registration,
          MAX(created_at) as last_registration
        FROM voters
        WHERE address_hash IS NOT NULL 
          AND registration_status != 'rejected'
        GROUP BY address_hash, normalized_address
        HAVING voter_count >= ?
        ORDER BY voter_count DESC
      `, [thresholds.low]);

      const flags = [];

      for (const cluster of clusters) {
        // Calculate risk score
        let riskScore = 0.0;
        let riskLevel = 'low';

        // Base risk from voter count
        if (cluster.voter_count >= thresholds.high) {
          riskScore += 0.5;
          riskLevel = 'high';
        } else if (cluster.voter_count >= thresholds.medium) {
          riskScore += 0.3;
          riskLevel = 'medium';
        } else {
          riskScore += 0.1;
        }

        // Surname diversity check
        const surnames = new Set();
        const names = (cluster.names || '').split('|').filter(Boolean);
        names.forEach(name => {
          const parts = name.trim().split(/\s+/);
          if (parts.length > 0) {
            surnames.add(parts[parts.length - 1].toLowerCase());
          }
        });

        const surnameDiversity = surnames.size / Math.max(cluster.voter_count, 1);
        const surnameDiversityScore = Math.min(surnameDiversity, 1.0);

        if (surnameDiversityScore < 0.3) {
          riskScore += 0.2;
          if (riskLevel === 'low') riskLevel = 'medium';
        }

        // DOB clustering check
        const dobs = (cluster.dobs || '').split(',').filter(Boolean);
        const dobCounts = {};
        dobs.forEach(dob => {
          dobCounts[dob] = (dobCounts[dob] || 0) + 1;
        });

        const maxDobCount = Math.max(...Object.values(dobCounts), 0);
        const dobClusteringScore = 1.0 - (maxDobCount / cluster.voter_count);

        if (dobClusteringScore < 0.5) {
          riskScore += 0.2;
          if (riskLevel === 'low') riskLevel = 'medium';
          if (riskLevel === 'medium') riskLevel = 'high';
        }

        // Registration time clustering
        const firstReg = new Date(cluster.first_registration);
        const lastReg = new Date(cluster.last_registration);
        const timeSpanDays = (lastReg - firstReg) / (1000 * 60 * 60 * 24);

        if (cluster.voter_count > 10 && timeSpanDays < 7) {
          riskScore += 0.2;
          if (riskLevel !== 'high') riskLevel = riskLevel === 'low' ? 'medium' : 'high';
        }

        // Normalize risk score
        riskScore = Math.min(riskScore, 1.0);

        // Check if flag already exists
        const [existing] = await connection.query(
          'SELECT id, status FROM address_cluster_flags WHERE address_hash = ?',
          [cluster.address_hash]
        );

        if (existing.length > 0 && existing[0].status === 'resolved') {
          continue; // Skip resolved flags
        }

        const topExamples = names.slice(0, 5).map((name, idx) => ({
          voter_id: null, // Would need to join to get actual IDs
          name: name.trim(),
          registration_date: cluster.first_registration
        }));

        if (existing.length > 0) {
          // Update existing flag
          await connection.query(
            `UPDATE address_cluster_flags 
             SET voter_count = ?, risk_score = ?, risk_level = ?, 
                 surname_diversity_score = ?, dob_clustering_score = ?,
                 top_examples = ?, updated_at = NOW()
             WHERE address_hash = ?`,
            [
              cluster.voter_count,
              riskScore,
              riskLevel,
              surnameDiversityScore,
              dobClusteringScore,
              JSON.stringify(topExamples),
              cluster.address_hash
            ]
          );
        } else {
          // Create new flag
          await connection.query(
            `INSERT INTO address_cluster_flags 
             (address_hash, normalized_address, region, district, state, voter_count, 
              risk_score, risk_level, surname_diversity_score, dob_clustering_score, top_examples)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cluster.address_hash,
              cluster.normalized_address,
              cluster.districts,
              cluster.districts.split(',')[0] || null,
              cluster.states.split(',')[0] || null,
              cluster.voter_count,
              riskScore,
              riskLevel,
              surnameDiversityScore,
              dobClusteringScore,
              JSON.stringify(topExamples)
            ]
          );
        }

        flags.push({
          address_hash: cluster.address_hash,
          voter_count: cluster.voter_count,
          risk_score: riskScore,
          risk_level: riskLevel
        });
      }

      return {
        flagsCreated: flags.length,
        flags,
        thresholds
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get address cluster flags
   */
  async getAddressFlags(filters = {}) {
    const connection = await pool.getConnection();
    try {
      let query = 'SELECT * FROM address_cluster_flags WHERE 1=1';
      const params = [];

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.risk_level) {
        query += ' AND risk_level = ?';
        params.push(filters.risk_level);
      }

      if (filters.district) {
        query += ' AND district = ?';
        params.push(filters.district);
      }

      if (filters.state) {
        query += ' AND state = ?';
        params.push(filters.state);
      }

      query += ' ORDER BY risk_score DESC, voter_count DESC LIMIT ?';
      params.push(filters.limit || 100);

      const [flags] = await connection.query(query, params);
      return flags;
    } finally {
      connection.release();
    }
  }

  /**
   * Assign flag to reviewer
   */
  async assignFlag(flagId, assignedTo, assignedRole) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'UPDATE address_cluster_flags SET assigned_to = ?, status = "under_review", updated_at = NOW() WHERE id = ?',
        [assignedTo, flagId]
      );

      // Create review task
      await connection.query(
        `INSERT INTO review_tasks 
         (task_type, assigned_to, assigned_role, status, priority, details)
         VALUES ('address_cluster_review', ?, ?, 'open', 'high', ?)`,
        [
          assignedTo,
          assignedRole,
          JSON.stringify({ address_cluster_flag_id: flagId })
        ]
      );

      return { success: true };
    } finally {
      connection.release();
    }
  }

  /**
   * Resolve address cluster flag
   */
  async resolveFlag(flagId, resolvedBy, action, notes) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `UPDATE address_cluster_flags 
         SET status = ?, resolved_by = ?, resolution_notes = ?, updated_at = NOW()
         WHERE id = ?`,
        [action === 'approved' ? 'resolved' : 'false_positive', resolvedBy, notes, flagId]
      );

      return { success: true };
    } finally {
      connection.release();
    }
  }
}

module.exports = new AddressAnomalyDetectionService();

