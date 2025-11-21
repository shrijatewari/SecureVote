const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'voting_system',
};

/**
 * Create comprehensive SIEM (Security Information and Event Management) tables
 * This migration creates all tables needed for the Security & SIEM Dashboard
 */

async function migrateSIEMTables() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('🔒 Creating SIEM database tables...\n');

    // 1. security_events table (if not exists, enhance it)
    console.log('📊 Creating/enhancing security_events table...');
    
    // Check if table exists and get column type
    const [existingTable] = await connection.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'security_events' AND COLUMN_NAME = 'event_id'`,
      [dbConfig.database]
    );
    
    const eventIdType = existingTable.length > 0 ? existingTable[0].COLUMN_TYPE.includes('BIGINT') ? 'BIGINT' : 'INT' : 'INT';
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        event_id ${eventIdType} AUTO_INCREMENT PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
        source_ip VARCHAR(45),
        user_id INT,
        action VARCHAR(255),
        details JSON,
        risk_score INT DEFAULT 50,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        device_fingerprint VARCHAR(255),
        geolocation JSON,
        user_agent TEXT,
        session_id VARCHAR(255),
        INDEX idx_event_type (event_type),
        INDEX idx_severity (severity),
        INDEX idx_source_ip (source_ip),
        INDEX idx_user_id (user_id),
        INDEX idx_timestamp (timestamp),
        INDEX idx_risk_score (risk_score),
        INDEX idx_event_type_timestamp (event_type, timestamp),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created security_events table');

    // 2. admin_activity_logs table
    console.log('📊 Creating admin_activity_logs table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        admin_role VARCHAR(50),
        module VARCHAR(100),
        action VARCHAR(255) NOT NULL,
        target_type VARCHAR(100),
        target_id INT,
        details JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        risk_level ENUM('low', 'medium', 'high') DEFAULT 'low',
        INDEX idx_admin_id (admin_id),
        INDEX idx_module (module),
        INDEX idx_action (action),
        INDEX idx_timestamp (timestamp),
        INDEX idx_risk_level (risk_level),
        INDEX idx_admin_timestamp (admin_id, timestamp),
        FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created admin_activity_logs table');

    // 3. ip_blocks table
    console.log('📊 Creating ip_blocks table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ip_blocks (
        block_id INT AUTO_INCREMENT PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL UNIQUE,
        reason VARCHAR(255),
        blocked_by INT,
        blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        is_active BOOLEAN DEFAULT TRUE,
        block_type ENUM('manual', 'automatic', 'rate_limit', 'suspicious') DEFAULT 'automatic',
        INDEX idx_ip_address (ip_address),
        INDEX idx_is_active (is_active),
        INDEX idx_expires_at (expires_at),
        FOREIGN KEY (blocked_by) REFERENCES users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created ip_blocks table');

    // 4. security_anomalies table
    console.log('📊 Creating security_anomalies table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS security_anomalies (
        anomaly_id BIGINT AUTO_INCREMENT PRIMARY KEY,
        anomaly_type VARCHAR(100) NOT NULL,
        severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
        score DECIMAL(5,2),
        event_id ${eventIdType},
        user_id INT,
        source_ip VARCHAR(45),
        description TEXT,
        context JSON,
        detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        resolved_by INT,
        resolution_status ENUM('pending', 'investigating', 'false_positive', 'resolved', 'ignored') DEFAULT 'pending',
        recommended_action TEXT,
        INDEX idx_anomaly_type (anomaly_type),
        INDEX idx_severity (severity),
        INDEX idx_resolution_status (resolution_status),
        INDEX idx_detected_at (detected_at),
        INDEX idx_user_id (user_id),
        FOREIGN KEY (event_id) REFERENCES security_events(event_id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
        FOREIGN KEY (resolved_by) REFERENCES users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created security_anomalies table');

    // 5. hash_chain_verification table
    console.log('📊 Creating hash_chain_verification table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS hash_chain_verification (
        verification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
        chain_type VARCHAR(50) NOT NULL,
        block_id BIGINT,
        previous_hash VARCHAR(255),
        current_hash VARCHAR(255),
        computed_hash VARCHAR(255),
        is_valid BOOLEAN,
        verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        verified_by INT,
        error_message TEXT,
        INDEX idx_chain_type (chain_type),
        INDEX idx_is_valid (is_valid),
        INDEX idx_verified_at (verified_at),
        FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created hash_chain_verification table');

    // 6. blo_device_monitoring table
    console.log('📊 Creating blo_device_monitoring table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS blo_device_monitoring (
        device_id INT AUTO_INCREMENT PRIMARY KEY,
        blo_id INT NOT NULL,
        device_fingerprint VARCHAR(255) UNIQUE,
        device_name VARCHAR(255),
        last_seen_at DATETIME,
        last_location_lat DECIMAL(10,8),
        last_location_lng DECIMAL(11,8),
        expected_location_lat DECIMAL(10,8),
        expected_location_lng DECIMAL(11,8),
        location_mismatch BOOLEAN DEFAULT FALSE,
        is_online BOOLEAN DEFAULT FALSE,
        app_version VARCHAR(50),
        os_version VARCHAR(100),
        suspicious_activity_count INT DEFAULT 0,
        INDEX idx_blo_id (blo_id),
        INDEX idx_device_fingerprint (device_fingerprint),
        INDEX idx_is_online (is_online),
        INDEX idx_location_mismatch (location_mismatch),
        FOREIGN KEY (blo_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created blo_device_monitoring table');

    // 7. security_alerts table
    console.log('📊 Creating security_alerts table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS security_alerts (
        alert_id BIGINT AUTO_INCREMENT PRIMARY KEY,
        alert_type VARCHAR(100) NOT NULL,
        severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
        title VARCHAR(255) NOT NULL,
        message TEXT,
        source_event_id ${eventIdType},
        source_anomaly_id BIGINT,
        affected_user_id INT,
        affected_ip VARCHAR(45),
        status ENUM('new', 'acknowledged', 'investigating', 'resolved', 'false_positive') DEFAULT 'new',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        acknowledged_at DATETIME,
        acknowledged_by INT,
        resolved_at DATETIME,
        resolved_by INT,
        resolution_notes TEXT,
        INDEX idx_alert_type (alert_type),
        INDEX idx_severity (severity),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (source_event_id) REFERENCES security_events(event_id) ON DELETE SET NULL,
        FOREIGN KEY (source_anomaly_id) REFERENCES security_anomalies(anomaly_id) ON DELETE SET NULL,
        FOREIGN KEY (affected_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
        FOREIGN KEY (acknowledged_by) REFERENCES users(user_id) ON DELETE SET NULL,
        FOREIGN KEY (resolved_by) REFERENCES users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created security_alerts table');

    // 8. rate_limit_logs table
    console.log('📊 Creating rate_limit_logs table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_logs (
        log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
        ip_address VARCHAR(45),
        user_id INT,
        endpoint VARCHAR(255),
        request_count INT DEFAULT 1,
        window_start DATETIME,
        window_end DATETIME,
        blocked BOOLEAN DEFAULT FALSE,
        INDEX idx_ip_address (ip_address),
        INDEX idx_user_id (user_id),
        INDEX idx_endpoint (endpoint),
        INDEX idx_window_start (window_start),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created rate_limit_logs table');

    console.log('\n✅ All SIEM tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating SIEM tables:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run if called directly
if (require.main === module) {
  migrateSIEMTables()
    .then(() => {
      console.log('\n✅ SIEM migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ SIEM migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateSIEMTables;

