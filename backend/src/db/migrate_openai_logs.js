/**
 * Migration: Create openai_call_logs table
 * Stores audit trail of all OpenAI API calls
 */

const pool = require('../config/database');

async function migrateOpenAILogs() {
  const connection = await pool.getConnection();
  try {
    console.log('Creating openai_call_logs table...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS openai_call_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        request_id CHAR(36) NOT NULL,
        user_id BIGINT NULL,
        role VARCHAR(50) NULL,
        endpoint VARCHAR(100) NOT NULL,
        redacted_payload JSON NOT NULL,
        response_summary JSON NULL,
        latency_ms INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_request_id (request_id),
        INDEX idx_user_id (user_id),
        INDEX idx_endpoint (endpoint),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ openai_call_logs table created successfully');
  } catch (error) {
    console.error('❌ Error creating openai_call_logs table:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateOpenAILogs()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateOpenAILogs;

