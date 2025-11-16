const pool = require('../config/database');

async function safeScalar(query, params = []) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(query, params);
    const v = rows && rows[0] && Object.values(rows[0])[0];
    return Number(v || 0);
  } catch (e) {
    return 0;
  } finally {
    connection.release();
  }
}

async function safeRows(query, params = []) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(query, params);
    return rows || [];
  } catch (e) {
    return [];
  } finally {
    connection.release();
  }
}

class AdminDashboardService {
  async getStats() {
    const [
      totalVoters,
      verifiedVoters,
      pendingVerification,
      duplicateFlags,
      duplicatesMerged,
      duplicatesMarkedGhost,
      duplicatesRejected,
      deathRecords,
      revisionBatches,
      grievancesPending,
      bloTasksPending,
      epicGeneratedToday
    ] = await Promise.all([
      safeScalar('SELECT COUNT(*) AS c FROM voters'),
      safeScalar('SELECT COUNT(*) AS c FROM voters WHERE is_verified = 1'),
      safeScalar('SELECT COUNT(*) AS c FROM voters WHERE is_verified = 0'),
      safeScalar('SELECT COUNT(*) AS c FROM duplicate_checks WHERE resolved = 0'),
      safeScalar("SELECT COUNT(*) AS c FROM duplicate_checks WHERE resolution_action = 'merged'"),
      safeScalar("SELECT COUNT(*) AS c FROM duplicate_checks WHERE resolution_action = 'ghost'"),
      safeScalar("SELECT COUNT(*) AS c FROM duplicate_checks WHERE resolution_action = 'rejected'"),
      safeScalar('SELECT COUNT(*) AS c FROM death_records'),
      safeScalar('SELECT COUNT(*) AS c FROM revision_batches'),
      safeScalar(`SELECT COUNT(*) AS c FROM grievances WHERE status IN ('open','in_progress','reopened')`),
      safeScalar(`SELECT COUNT(*) AS c FROM blo_tasks WHERE status IN ('pending','in-progress')`),
      safeScalar(`SELECT COUNT(*) AS c FROM voters WHERE DATE(created_at)=CURDATE() AND (application_status='epic_generated' OR 1=1)`)
    ]);

    return {
      totalVoters,
      verifiedVoters,
      pendingVerification,
      duplicates: duplicateFlags,
      duplicatesMerged,
      duplicatesMarkedGhost,
      duplicatesRejected,
      deathRecords,
      revisionBatches,
      grievancesPending,
      bloTasksPending,
      epicGeneratedToday
    };
  }

  async getGraphs() {
    // Monthly registrations (last 6 months)
    const registrations = await safeRows(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
      FROM voters
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    // Verification distribution
    const verified = await safeScalar(`SELECT COUNT(*) FROM voters WHERE is_verified=1`);
    const unverified = await safeScalar(`SELECT COUNT(*) FROM voters WHERE is_verified=0`);

    // Duplicate trend (last 6 months by flagged_date)
    const duplicateTrend = await safeRows(`
      SELECT DATE_FORMAT(flagged_date, '%Y-%m') AS month, COUNT(*) AS count
      FROM duplicate_checks
      WHERE flagged_date IS NOT NULL
        AND flagged_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(flagged_date, '%Y-%m')
      ORDER BY month ASC
    `);

    return {
      registrations,
      verificationDistribution: [
        { name: 'Verified', value: verified },
        { name: 'Unverified', value: unverified }
      ],
      duplicateTrend
    };
  }
}

module.exports = new AdminDashboardService();



