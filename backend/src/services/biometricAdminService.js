/**
 * Biometric Admin Service
 * Comprehensive biometric operations for admin dashboard
 */

const pool = require('../config/database');
const aiClient = require('./aiClient');

class BiometricAdminService {
  async getStats() {
    const connection = await pool.getConnection();
    try {
      const [
        totalBiometrics,
        faceVerified,
        fingerprintVerified,
        pendingVerification,
        biometricMismatches,
        aiFaceFailures,
        aiFingerprintFailures,
        highRiskFlags
      ] = await Promise.all([
        this.safeScalar('SELECT COUNT(*) AS c FROM biometrics', connection),
        this.safeScalar("SELECT COUNT(*) AS c FROM biometrics WHERE face_hash IS NOT NULL AND face_verified = 1", connection),
        this.safeScalar("SELECT COUNT(*) AS c FROM biometrics WHERE fingerprint_hash IS NOT NULL AND fingerprint_verified = 1", connection),
        this.safeScalar("SELECT COUNT(*) AS c FROM biometrics WHERE (face_verified = 0 OR fingerprint_verified = 0) AND status = 'pending'", connection),
        this.safeScalar("SELECT COUNT(*) AS c FROM biometric_scores WHERE similarity_score < 0.5 AND status = 'mismatch'", connection),
        this.safeScalar("SELECT COUNT(*) AS c FROM biometric_scores WHERE face_match_score < 0.3 AND type = 'face'", connection),
        this.safeScalar("SELECT COUNT(*) AS c FROM biometric_scores WHERE fingerprint_match_score < 0.3 AND type = 'fingerprint'", connection),
        this.safeScalar("SELECT COUNT(*) AS c FROM biometric_scores WHERE risk_level = 'high'", connection)
      ]);

      return {
        totalBiometrics,
        faceVerified,
        fingerprintVerified,
        pendingVerification,
        biometricMismatches,
        aiFaceFailures,
        aiFingerprintFailures,
        highRiskFlags
      };
    } finally {
      connection.release();
    }
  }

  async getVoterBiometric(voterId) {
    const connection = await pool.getConnection();
    try {
      const [biometrics] = await connection.query(
        `SELECT b.*, v.name, v.email, v.aadhaar_number, v.dob
         FROM biometrics b
         JOIN voters v ON b.voter_id = v.voter_id
         WHERE b.voter_id = ?`,
        [voterId]
      );
      
      if (biometrics.length === 0) {
        return null;
      }
      
      return biometrics[0];
    } finally {
      connection.release();
    }
  }

  async compareFaces(voterId1, voterId2) {
    const connection = await pool.getConnection();
    try {
      const [bio1] = await connection.query(
        'SELECT face_embedding_hash, face_hash FROM biometrics WHERE voter_id = ?',
        [voterId1]
      );
      const [bio2] = await connection.query(
        'SELECT face_embedding_hash, face_hash FROM biometrics WHERE voter_id = ?',
        [voterId2]
      );
      
      if (!bio1[0] || !bio2[0]) {
        throw new Error('One or both voters do not have face biometrics');
      }
      
      // Call AI service
      const aiResult = await aiClient.faceMatch({
        embedding1: bio1[0].face_embedding_hash,
        embedding2: bio2[0].face_embedding_hash
      });
      
      // Store comparison
      await connection.query(
        `INSERT INTO biometric_scores (voter_id_1, voter_id_2, type, similarity_score, confidence, risk_level, ai_response)
         VALUES (?, ?, 'face', ?, ?, ?, ?)`,
        [
          voterId1,
          voterId2,
          aiResult.similarity || 0,
          aiResult.confidence || 'medium',
          aiResult.similarity > 0.7 ? 'high' : aiResult.similarity > 0.4 ? 'medium' : 'low',
          JSON.stringify(aiResult)
        ]
      );
      
      return {
        voter_id_1: voterId1,
        voter_id_2: voterId2,
        similarity: aiResult.similarity || 0,
        confidence: aiResult.confidence || 'medium',
        distance: aiResult.distance || 0,
        risk_level: aiResult.similarity > 0.7 ? 'high' : aiResult.similarity > 0.4 ? 'medium' : 'low'
      };
    } finally {
      connection.release();
    }
  }

  async compareFingerprints(voterId1, voterId2) {
    const connection = await pool.getConnection();
    try {
      const [bio1] = await connection.query(
        'SELECT fingerprint_hash, fingerprint_template FROM biometrics WHERE voter_id = ?',
        [voterId1]
      );
      const [bio2] = await connection.query(
        'SELECT fingerprint_hash, fingerprint_template FROM biometrics WHERE voter_id = ?',
        [voterId2]
      );
      
      if (!bio1[0] || !bio2[0]) {
        throw new Error('One or both voters do not have fingerprint biometrics');
      }
      
      // Call AI service
      const aiResult = await aiClient.fingerprintMatch({
        template1: bio1[0].fingerprint_template || bio1[0].fingerprint_hash,
        template2: bio2[0].fingerprint_template || bio2[0].fingerprint_hash
      });
      
      // Store comparison
      await connection.query(
        `INSERT INTO biometric_scores (voter_id_1, voter_id_2, type, similarity_score, confidence, risk_level, ai_response)
         VALUES (?, ?, 'fingerprint', ?, ?, ?, ?)`,
        [
          voterId1,
          voterId2,
          aiResult.similarity || 0,
          aiResult.confidence || 'medium',
          aiResult.similarity > 0.7 ? 'high' : aiResult.similarity > 0.4 ? 'medium' : 'low',
          JSON.stringify(aiResult)
        ]
      );
      
      return {
        voter_id_1: voterId1,
        voter_id_2: voterId2,
        similarity: aiResult.similarity || 0,
        confidence: aiResult.confidence || 'medium',
        match_score: aiResult.match_score || 0,
        risk_level: aiResult.similarity > 0.7 ? 'high' : aiResult.similarity > 0.4 ? 'medium' : 'low'
      };
    } finally {
      connection.release();
    }
  }

  async getPendingVerifications(page = 1, limit = 10) {
    const connection = await pool.getConnection();
    try {
      const offset = (page - 1) * limit;
      const [verifications] = await connection.query(
        `SELECT b.*, v.name, v.email, v.aadhaar_number
         FROM biometrics b
         JOIN voters v ON b.voter_id = v.voter_id
         WHERE b.status = 'pending' OR (b.face_verified = 0 OR b.fingerprint_verified = 0)
         ORDER BY b.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      
      const [count] = await connection.query(
        `SELECT COUNT(*) AS total FROM biometrics WHERE status = 'pending' OR (face_verified = 0 OR fingerprint_verified = 0)`
      );
      
      return {
        verifications,
        total: count[0].total,
        page,
        limit
      };
    } finally {
      connection.release();
    }
  }

  async approveBiometric(biometricId, approvedBy) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `UPDATE biometrics 
         SET face_verified = 1, fingerprint_verified = 1, status = 'approved', verified_at = NOW(), verified_by = ?
         WHERE biometric_id = ?`,
        [approvedBy, biometricId]
      );
      
      return { success: true, biometric_id: biometricId };
    } finally {
      connection.release();
    }
  }

  async rejectBiometric(biometricId, reason, rejectedBy) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `UPDATE biometrics 
         SET status = 'rejected', rejection_reason = ?, rejected_at = NOW(), rejected_by = ?
         WHERE biometric_id = ?`,
        [reason, rejectedBy, biometricId]
      );
      
      return { success: true, biometric_id: biometricId };
    } finally {
      connection.release();
    }
  }

  async requestRecapture(biometricId, requestedBy) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `UPDATE biometrics 
         SET status = 'recapture_requested', recapture_requested_at = NOW(), recapture_requested_by = ?
         WHERE biometric_id = ?`,
        [requestedBy, biometricId]
      );
      
      return { success: true, biometric_id: biometricId };
    } finally {
      connection.release();
    }
  }

  async getFraudFlags() {
    const connection = await pool.getConnection();
    try {
      const [flags] = await connection.query(
        `SELECT bs.*, v1.name as voter1_name, v2.name as voter2_name
         FROM biometric_scores bs
         JOIN voters v1 ON bs.voter_id_1 = v1.voter_id
         JOIN voters v2 ON bs.voter_id_2 = v2.voter_id
         WHERE bs.risk_level = 'high' OR bs.similarity_score > 0.7
         ORDER BY bs.similarity_score DESC
         LIMIT 50`
      );
      
      return flags;
    } finally {
      connection.release();
    }
  }

  async getFraudClusters() {
    const connection = await pool.getConnection();
    try {
      // Find clusters of similar fingerprints/faces
      const [clusters] = await connection.query(
        `SELECT fingerprint_hash, COUNT(*) as cluster_size, GROUP_CONCAT(voter_id) as voter_ids
         FROM biometrics
         WHERE fingerprint_hash IS NOT NULL
         GROUP BY fingerprint_hash
         HAVING COUNT(*) > 1
         ORDER BY cluster_size DESC
         LIMIT 20`
      );
      
      return clusters;
    } finally {
      connection.release();
    }
  }

  async getLogs(page = 1, limit = 50) {
    const connection = await pool.getConnection();
    try {
      const offset = (page - 1) * limit;
      const [logs] = await connection.query(
        `SELECT bs.*, v1.name as voter1_name, v2.name as voter2_name
         FROM biometric_scores bs
         LEFT JOIN voters v1 ON bs.voter_id_1 = v1.voter_id
         LEFT JOIN voters v2 ON bs.voter_id_2 = v2.voter_id
         ORDER BY bs.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      
      const [count] = await connection.query('SELECT COUNT(*) AS total FROM biometric_scores');
      
      return {
        logs,
        total: count[0].total,
        page,
        limit
      };
    } finally {
      connection.release();
    }
  }

  async getEnrollments(page = 1, limit = 10) {
    const connection = await pool.getConnection();
    try {
      const offset = (page - 1) * limit;
      const [enrollments] = await connection.query(
        `SELECT b.*, v.name, v.email, v.aadhaar_number
         FROM biometrics b
         JOIN voters v ON b.voter_id = v.voter_id
         WHERE b.status = 'pending' AND b.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         ORDER BY b.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      
      const [count] = await connection.query(
        `SELECT COUNT(*) AS total FROM biometrics WHERE status = 'pending' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
      );
      
      return {
        enrollments,
        total: count[0].total,
        page,
        limit
      };
    } finally {
      connection.release();
    }
  }

  async approveEnrollment(biometricId, approvedBy) {
    return this.approveBiometric(biometricId, approvedBy);
  }

  async safeScalar(query, connection, params = []) {
    try {
      const [rows] = await connection.query(query, params);
      const v = rows && rows[0] && Object.values(rows[0])[0];
      return Number(v || 0);
    } catch (e) {
      return 0;
    }
  }
}

module.exports = new BiometricAdminService();

