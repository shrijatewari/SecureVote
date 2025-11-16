/**
 * Seed Biometric Data
 * Creates biometric records for testing
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'voting_system'
};

async function seedBiometricData() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    console.log('🌱 Seeding biometric data...\n');

    // Ensure biometrics table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS biometrics (
        biometric_id INT AUTO_INCREMENT PRIMARY KEY,
        voter_id INT NOT NULL,
        face_hash VARCHAR(255),
        face_embedding_hash VARCHAR(255),
        fingerprint_hash VARCHAR(255),
        fingerprint_template_hash VARCHAR(255),
        face_verified BOOLEAN DEFAULT FALSE,
        fingerprint_verified BOOLEAN DEFAULT FALSE,
        status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (voter_id) REFERENCES voters(voter_id) ON DELETE CASCADE,
        INDEX idx_voter_id (voter_id),
        INDEX idx_face_hash (face_hash),
        INDEX idx_fingerprint_hash (fingerprint_hash)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure biometric_scores table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS biometric_scores (
        score_id INT AUTO_INCREMENT PRIMARY KEY,
        voter_id_1 INT NOT NULL,
        voter_id_2 INT NOT NULL,
        type ENUM('face', 'fingerprint') NOT NULL,
        similarity_score DECIMAL(5,4) DEFAULT 0,
        face_match_score DECIMAL(5,4),
        fingerprint_match_score DECIMAL(5,4),
        confidence ENUM('low', 'medium', 'high') DEFAULT 'medium',
        risk_level ENUM('low', 'medium', 'high') DEFAULT 'low',
        status ENUM('match', 'mismatch', 'pending') DEFAULT 'pending',
        ai_response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (voter_id_1) REFERENCES voters(voter_id) ON DELETE CASCADE,
        FOREIGN KEY (voter_id_2) REFERENCES voters(voter_id) ON DELETE CASCADE,
        INDEX idx_voter_1 (voter_id_1),
        INDEX idx_voter_2 (voter_id_2),
        INDEX idx_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Get first 20 voters
    const [voters] = await connection.query(
      'SELECT voter_id FROM voters ORDER BY voter_id LIMIT 20'
    );

    if (voters.length === 0) {
      console.log('⚠️  No voters found. Please seed voters first.');
      return;
    }

    // Check biometrics table schema
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometrics'`
    );
    const columnNames = columns.map(c => c.COLUMN_NAME);
    
    // Seed biometrics for voters
    for (const voter of voters) {
      const faceHash = `face_${voter.voter_id}_${Date.now()}`;
      const fingerprintHash = `fingerprint_${voter.voter_id}_${Date.now()}`;
      
      const fields = ['voter_id', 'face_hash', 'fingerprint_hash'];
      const values = [voter.voter_id, faceHash, fingerprintHash];
      
      // Add verification fields based on schema
      if (columnNames.includes('is_face_verified')) {
        fields.push('is_face_verified');
        values.push(Math.random() > 0.3);
      } else if (columnNames.includes('face_verified')) {
        fields.push('face_verified');
        values.push(Math.random() > 0.3);
      }
      
      if (columnNames.includes('is_fingerprint_verified')) {
        fields.push('is_fingerprint_verified');
        values.push(Math.random() > 0.3);
      } else if (columnNames.includes('fingerprint_verified')) {
        fields.push('fingerprint_verified');
        values.push(Math.random() > 0.3);
      }
      
      if (columnNames.includes('status')) {
        fields.push('status');
        values.push(Math.random() > 0.2 ? 'verified' : 'pending');
      }
      
      const placeholders = fields.map(() => '?').join(', ');
      const updateClause = fields.filter(f => f !== 'voter_id').map(f => `${f} = VALUES(${f})`).join(', ');
      
      await connection.query(
        `INSERT INTO biometrics (${fields.join(', ')})
         VALUES (${placeholders})
         ON DUPLICATE KEY UPDATE ${updateClause}`,
        values
      );
    }

    console.log(`✅ Seeded biometrics for ${voters.length} voters`);

    // Check biometric_scores table schema
    const [scoreColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_scores'`
    );
    const scoreColumnNames = scoreColumns.map(c => c.COLUMN_NAME);
    
    // Seed some biometric comparisons
    for (let i = 0; i < 10; i++) {
      const voter1 = voters[Math.floor(Math.random() * voters.length)];
      const voter2 = voters[Math.floor(Math.random() * voters.length)];
      
      if (voter1.voter_id === voter2.voter_id) continue;
      
      const similarity = Math.random();
      const type = Math.random() > 0.5 ? 'face' : 'fingerprint';
      const confidence = similarity > 0.7 ? 'high' : similarity > 0.4 ? 'medium' : 'low';
      
      const fields = ['voter_id_1', 'voter_id_2', 'type', 'similarity_score', 'confidence', 'risk_level', 'status'];
      const values = [
        voter1.voter_id,
        voter2.voter_id,
        type,
        similarity,
        confidence,
        similarity > 0.7 ? 'high' : similarity > 0.4 ? 'medium' : 'low',
        similarity > 0.5 ? 'match' : 'mismatch'
      ];
      
      if (scoreColumnNames.includes('combined_confidence')) {
        fields.push('combined_confidence');
        values.push(confidence);
      }
      
      const placeholders = fields.map(() => '?').join(', ');
      
      await connection.query(
        `INSERT INTO biometric_scores (${fields.join(', ')})
         VALUES (${placeholders})`,
        values
      );
    }

    console.log('✅ Seeded biometric comparisons');

    console.log('\n🎉 Biometric data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  seedBiometricData()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedBiometricData;

