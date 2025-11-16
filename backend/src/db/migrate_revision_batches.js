/**
 * Migration: Create revision_batches and revision_flags tables
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

async function migrate() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    console.log('🔄 Creating revision_batches table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS revision_batches (
        batch_id INT AUTO_INCREMENT PRIMARY KEY,
        region VARCHAR(255) NOT NULL DEFAULT 'all',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status ENUM('draft', 'committed', 'cancelled') DEFAULT 'draft',
        merkle_root VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        committed_at DATETIME DEFAULT NULL,
        created_by INT,
        INDEX idx_status (status),
        INDEX idx_dates (start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('🔄 Creating revision_flags table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS revision_flags (
        flag_id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id INT NOT NULL,
        voter_id INT NOT NULL,
        flag_type ENUM('duplicate', 'deceased', 'address_mismatch', 'document_expired', 'other') DEFAULT 'other',
        reason TEXT,
        score DECIMAL(5,2) DEFAULT 0.0,
        status ENUM('pending', 'applied', 'rejected', 'resolved') DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME DEFAULT NULL,
        resolved_by INT DEFAULT NULL,
        FOREIGN KEY (batch_id) REFERENCES revision_batches(batch_id) ON DELETE CASCADE,
        FOREIGN KEY (voter_id) REFERENCES voters(voter_id) ON DELETE CASCADE,
        INDEX idx_batch (batch_id),
        INDEX idx_voter (voter_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Revision tables created successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrate;

