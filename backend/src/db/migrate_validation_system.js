const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'voting_system',
  multipleStatements: true
};

async function migrateValidationSystem() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('🔧 Creating validation system tables and columns...');
    
    // 1. Add columns to voters table
    console.log('📝 Adding validation columns to voters table...');
    
    try {
      await connection.query(`
        ALTER TABLE voters
          ADD COLUMN IF NOT EXISTS normalized_address TEXT,
          ADD COLUMN IF NOT EXISTS address_hash CHAR(64),
          ADD COLUMN IF NOT EXISTS address_quality_score FLOAT DEFAULT 1.0,
          ADD COLUMN IF NOT EXISTS name_quality_score FLOAT DEFAULT 1.0,
          ADD COLUMN IF NOT EXISTS registration_status ENUM('active','pending_review','rejected') DEFAULT 'pending_review',
          ADD COLUMN IF NOT EXISTS registration_source ENUM('web','kiosk','blo') DEFAULT 'web',
          ADD COLUMN IF NOT EXISTS geocode_latitude DECIMAL(10, 8),
          ADD COLUMN IF NOT EXISTS geocode_longitude DECIMAL(11, 8),
          ADD COLUMN IF NOT EXISTS geocode_confidence FLOAT DEFAULT 0.0,
          ADD COLUMN IF NOT EXISTS validation_flags JSON,
          ADD COLUMN IF NOT EXISTS review_reason TEXT
      `);
    } catch (error) {
      // If columns already exist, try adding them individually
      const columns = [
        { name: 'normalized_address', sql: 'ADD COLUMN normalized_address TEXT' },
        { name: 'address_hash', sql: 'ADD COLUMN address_hash CHAR(64)' },
        { name: 'address_quality_score', sql: 'ADD COLUMN address_quality_score FLOAT DEFAULT 1.0' },
        { name: 'name_quality_score', sql: 'ADD COLUMN name_quality_score FLOAT DEFAULT 1.0' },
        { name: 'registration_status', sql: "ADD COLUMN registration_status ENUM('active','pending_review','rejected') DEFAULT 'pending_review'" },
        { name: 'registration_source', sql: "ADD COLUMN registration_source ENUM('web','kiosk','blo') DEFAULT 'web'" },
        { name: 'geocode_latitude', sql: 'ADD COLUMN geocode_latitude DECIMAL(10, 8)' },
        { name: 'geocode_longitude', sql: 'ADD COLUMN geocode_longitude DECIMAL(11, 8)' },
        { name: 'geocode_confidence', sql: 'ADD COLUMN geocode_confidence FLOAT DEFAULT 0.0' },
        { name: 'validation_flags', sql: 'ADD COLUMN validation_flags JSON' },
        { name: 'review_reason', sql: 'ADD COLUMN review_reason TEXT' }
      ];
      
      for (const col of columns) {
        try {
          await connection.query(`ALTER TABLE voters ${col.sql}`);
          console.log(`✅ Added column: ${col.name}`);
        } catch (e) {
          if (!e.message.includes('Duplicate column')) {
            console.warn(`⚠️  Column ${col.name} might already exist: ${e.message}`);
          }
        }
      }
    }
    
    console.log('✅ Voters table updated');
    
    // 2. Create address_cluster_flags table
    console.log('📝 Creating address_cluster_flags table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS address_cluster_flags (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        address_hash CHAR(64) NOT NULL,
        normalized_address TEXT,
        region VARCHAR(255),
        district VARCHAR(255),
        state VARCHAR(255),
        voter_count INT DEFAULT 0,
        risk_score FLOAT DEFAULT 0.0,
        risk_level ENUM('low','medium','high','critical') DEFAULT 'low',
        top_examples JSON,
        surname_diversity_score FLOAT DEFAULT 1.0,
        dob_clustering_score FLOAT DEFAULT 1.0,
        geospatial_cluster_id INT,
        status ENUM('open','under_review','resolved','false_positive') DEFAULT 'open',
        assigned_to INT,
        resolved_by INT,
        resolution_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_address_hash (address_hash),
        INDEX idx_status (status),
        INDEX idx_risk_level (risk_level),
        INDEX idx_assigned_to (assigned_to)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ address_cluster_flags table created');
    
    // 3. Create review_tasks table
    console.log('📝 Creating review_tasks table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS review_tasks (
        task_id BIGINT AUTO_INCREMENT PRIMARY KEY,
        voter_id INT,
        task_type ENUM('address_verification','name_verification','document_check','biometric_verification','duplicate_review','address_cluster_review') NOT NULL,
        priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
        assigned_to INT NULL,
        assigned_role ENUM('blo','ero','deo','cro') NULL,
        status ENUM('open','in_progress','resolved','rejected','escalated') DEFAULT 'open',
        details JSON,
        validation_scores JSON,
        flags JSON,
        resolution_action ENUM('approved','rejected','escalated','needs_more_info') NULL,
        resolution_notes TEXT,
        resolved_by INT NULL,
        resolved_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (voter_id) REFERENCES voters(voter_id) ON DELETE CASCADE,
        INDEX idx_voter_id (voter_id),
        INDEX idx_task_type (task_type),
        INDEX idx_status (status),
        INDEX idx_assigned_to (assigned_to),
        INDEX idx_priority (priority)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ review_tasks table created');
    
    // 4. Create name_frequency_lookup table (for name validation)
    console.log('📝 Creating name_frequency_lookup table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS name_frequency_lookup (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name_token VARCHAR(100) NOT NULL,
        name_type ENUM('first_name','last_name','father_name','mother_name','guardian_name') NOT NULL,
        frequency_score FLOAT DEFAULT 0.0,
        region VARCHAR(100),
        language VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_name_type (name_token, name_type),
        INDEX idx_name_token (name_token),
        INDEX idx_frequency_score (frequency_score)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ name_frequency_lookup table created');
    
    // 5. Create address_validation_cache table (for geocoding cache)
    console.log('📝 Creating address_validation_cache table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS address_validation_cache (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        address_hash CHAR(64) NOT NULL UNIQUE,
        normalized_address TEXT,
        geocode_latitude DECIMAL(10, 8),
        geocode_longitude DECIMAL(11, 8),
        geocode_confidence FLOAT,
        geocode_provider VARCHAR(50),
        quality_score FLOAT,
        validation_result JSON,
        cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        INDEX idx_address_hash (address_hash),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ address_validation_cache table created');
    
    // 6. Create validation_audit_log table (for tracking validation decisions)
    console.log('📝 Creating validation_audit_log table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS validation_audit_log (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        voter_id INT,
        validation_type ENUM('address','name','document','biometric','duplicate','cluster') NOT NULL,
        validation_result ENUM('passed','flagged','rejected') NOT NULL,
        quality_scores JSON,
        flags JSON,
        decision_reason TEXT,
        reviewed_by INT NULL,
        reviewed_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (voter_id) REFERENCES voters(voter_id) ON DELETE CASCADE,
        INDEX idx_voter_id (voter_id),
        INDEX idx_validation_type (validation_type),
        INDEX idx_validation_result (validation_result),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ validation_audit_log table created');
    
    // 7. Seed common Indian names for frequency lookup
    console.log('📝 Seeding name frequency lookup...');
    const commonNames = [
      // Common first names
      { token: 'rajesh', type: 'first_name', score: 0.95 },
      { token: 'priya', type: 'first_name', score: 0.95 },
      { token: 'kumar', type: 'last_name', score: 0.98 },
      { token: 'singh', type: 'last_name', score: 0.98 },
      { token: 'patel', type: 'last_name', score: 0.97 },
      { token: 'sharma', type: 'last_name', score: 0.97 },
      { token: 'reddy', type: 'last_name', score: 0.96 },
      { token: 'rao', type: 'last_name', score: 0.95 },
      { token: 'naidu', type: 'last_name', score: 0.94 },
      { token: 'iyer', type: 'last_name', score: 0.93 },
      { token: 'iyengar', type: 'last_name', score: 0.92 },
      { token: 'menon', type: 'last_name', score: 0.91 },
      { token: 'nair', type: 'last_name', score: 0.95 },
      { token: 'pillai', type: 'last_name', score: 0.90 },
      { token: 'devi', type: 'last_name', score: 0.94 },
      { token: 'bai', type: 'last_name', score: 0.92 },
      { token: 'lal', type: 'last_name', score: 0.93 },
      { token: 'das', type: 'last_name', score: 0.91 },
      { token: 'dutta', type: 'last_name', score: 0.90 },
      { token: 'bose', type: 'last_name', score: 0.89 },
      { token: 'banerjee', type: 'last_name', score: 0.88 },
      { token: 'chatterjee', type: 'last_name', score: 0.87 },
      { token: 'mukherjee', type: 'last_name', score: 0.86 },
      { token: 'gupta', type: 'last_name', score: 0.96 },
      { token: 'jain', type: 'last_name', score: 0.94 },
      { token: 'agarwal', type: 'last_name', score: 0.93 },
      { token: 'goel', type: 'last_name', score: 0.91 },
      { token: 'mittal', type: 'last_name', score: 0.90 },
      { token: 'bansal', type: 'last_name', score: 0.89 },
      { token: 'garg', type: 'last_name', score: 0.88 },
      { token: 'malhotra', type: 'last_name', score: 0.87 },
      { token: 'kapoor', type: 'last_name', score: 0.86 },
      { token: 'khanna', type: 'last_name', score: 0.85 },
      { token: 'mehta', type: 'last_name', score: 0.92 },
      { token: 'shah', type: 'last_name', score: 0.94 },
      { token: 'desai', type: 'last_name', score: 0.91 },
      { token: 'joshi', type: 'last_name', score: 0.90 },
      { token: 'pandey', type: 'last_name', score: 0.89 },
      { token: 'tiwari', type: 'last_name', score: 0.88 },
      { token: 'mishra', type: 'last_name', score: 0.87 },
      { token: 'verma', type: 'last_name', score: 0.86 },
      { token: 'yadav', type: 'last_name', score: 0.95 },
      { token: 'khan', type: 'last_name', score: 0.97 },
      { token: 'ahmed', type: 'last_name', score: 0.95 },
      { token: 'hussain', type: 'last_name', score: 0.94 },
      { token: 'ali', type: 'last_name', score: 0.96 },
      { token: 'rahman', type: 'last_name', score: 0.93 },
      { token: 'sheikh', type: 'last_name', score: 0.92 }
    ];
    
    for (const name of commonNames) {
      try {
        await connection.query(
          `INSERT INTO name_frequency_lookup (name_token, name_type, frequency_score)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE frequency_score = VALUES(frequency_score)`,
          [name.token, name.type, name.score]
        );
      } catch (e) {
        // Ignore duplicates
      }
    }
    console.log(`✅ Seeded ${commonNames.length} common names`);
    
    // 8. Create indexes on voters table for performance
    console.log('📝 Creating indexes...');
    try {
      await connection.query(`
        CREATE INDEX IF NOT EXISTS idx_address_hash ON voters(address_hash);
        CREATE INDEX IF NOT EXISTS idx_registration_status ON voters(registration_status);
        CREATE INDEX IF NOT EXISTS idx_address_quality ON voters(address_quality_score);
        CREATE INDEX IF NOT EXISTS idx_name_quality ON voters(name_quality_score);
      `);
    } catch (e) {
      console.warn('⚠️  Some indexes might already exist:', e.message);
    }
    
    console.log('✅ Validation system migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run if called directly
if (require.main === module) {
  migrateValidationSystem()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateValidationSystem;

