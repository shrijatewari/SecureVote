const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

async function runExtendedMigrations() {
  const connection = await mysql.createConnection({
    ...dbConfig,
    database: process.env.DB_NAME || 'voting_system'
  });

  try {
    console.log('🔄 Running extended migrations for government-grade features...\n');

    // Add extended fields to voters table (check if columns exist first)
    const [existingColumns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'voters'
    `, [process.env.DB_NAME || 'voting_system']);
    
    const columnNames = existingColumns.map(c => c.COLUMN_NAME);
    
    if (!columnNames.includes('gender')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN gender ENUM('male', 'female', 'other') AFTER dob
      `);
    }
    
    if (!columnNames.includes('father_name')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN father_name VARCHAR(255) AFTER gender
      `);
    }
    
    if (!columnNames.includes('mother_name')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN mother_name VARCHAR(255) AFTER father_name
      `);
    }
    
    if (!columnNames.includes('guardian_name')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN guardian_name VARCHAR(255) AFTER mother_name
      `);
    }
    
    if (!columnNames.includes('mobile_number')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN mobile_number VARCHAR(10) AFTER guardian_name
      `);
    }
    
    if (!columnNames.includes('email')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN email VARCHAR(255) AFTER mobile_number
      `);
    }
    
    if (!columnNames.includes('house_number')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN house_number VARCHAR(100) AFTER email
      `);
    }
    
    if (!columnNames.includes('street')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN street VARCHAR(255) AFTER house_number
      `);
    }
    
    if (!columnNames.includes('village_city')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN village_city VARCHAR(255) AFTER street
      `);
    }
    
    if (!columnNames.includes('district')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN district VARCHAR(255) AFTER village_city
      `);
    }
    
    if (!columnNames.includes('state')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN state VARCHAR(255) AFTER district
      `);
    }
    
    if (!columnNames.includes('pin_code')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN pin_code VARCHAR(6) AFTER state
      `);
    }
    
    if (!columnNames.includes('application_status')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN application_status ENUM('submitted', 'under_review', 'field_verification', 'approved', 'rejected', 'epic_generated') DEFAULT 'submitted' AFTER is_verified
      `);
    }
    
    if (!columnNames.includes('application_id')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN application_id VARCHAR(20) UNIQUE AFTER application_status
      `);
    }
    
    if (!columnNames.includes('polling_station_id')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN polling_station_id INT AFTER application_id
      `);
    }
    
    if (!columnNames.includes('epic_number')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN epic_number VARCHAR(20) UNIQUE AFTER polling_station_id
      `);
    }
    
    if (!columnNames.includes('family_head_id')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN family_head_id INT AFTER epic_number
      `);
    }
    
    if (!columnNames.includes('is_indian_citizen')) {
      await connection.query(`
        ALTER TABLE voters 
        ADD COLUMN is_indian_citizen BOOLEAN DEFAULT TRUE AFTER family_head_id
      `);
    }
    
    /* Original query that doesn't work in MySQL:
    await connection.query(`
      ALTER TABLE voters 
      ADD COLUMN IF NOT EXISTS gender ENUM('male', 'female', 'other') AFTER dob,
      ADD COLUMN IF NOT EXISTS father_name VARCHAR(255) AFTER gender,
      ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255) AFTER father_name,
      ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(255) AFTER mother_name,
      ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(10) AFTER guardian_name,
      ADD COLUMN IF NOT EXISTS email VARCHAR(255) AFTER mobile_number,
      ADD COLUMN IF NOT EXISTS house_number VARCHAR(100) AFTER email,
      ADD COLUMN IF NOT EXISTS street VARCHAR(255) AFTER house_number,
      ADD COLUMN IF NOT EXISTS village_city VARCHAR(255) AFTER street,
      ADD COLUMN IF NOT EXISTS district VARCHAR(255) AFTER village_city,
      ADD COLUMN IF NOT EXISTS state VARCHAR(255) AFTER district,
      ADD COLUMN IF NOT EXISTS pin_code VARCHAR(6) AFTER state,
      ADD COLUMN IF NOT EXISTS application_status ENUM('submitted', 'under_review', 'field_verification', 'approved', 'rejected', 'epic_generated') DEFAULT 'submitted' AFTER is_verified,
      ADD COLUMN IF NOT EXISTS application_id VARCHAR(20) UNIQUE AFTER application_status,
      ADD COLUMN IF NOT EXISTS polling_station_id INT AFTER application_id,
      ADD COLUMN IF NOT EXISTS epic_number VARCHAR(20) UNIQUE AFTER polling_station_id,
      ADD COLUMN IF NOT EXISTS family_head_id INT AFTER epic_number,
      ADD COLUMN IF NOT EXISTS is_indian_citizen BOOLEAN DEFAULT TRUE AFTER family_head_id;
    `).catch(() => {}); // Ignore if columns already exist
    */
    
    console.log('✅ Extended voters table with KYC fields');

    // Create documents table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS voter_documents (
        document_id INT AUTO_INCREMENT PRIMARY KEY,
        voter_id INT NOT NULL,
        document_type ENUM('address_proof', 'age_proof', 'photograph', 'identity_proof', 'other') NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        encrypted_path VARCHAR(500),
        file_size INT,
        mime_type VARCHAR(100),
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (voter_id) REFERENCES voters(voter_id) ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX idx_voter_id (voter_id),
        INDEX idx_document_type (document_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table: voter_documents created');

    // Create polling_stations table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS polling_stations (
        station_id INT AUTO_INCREMENT PRIMARY KEY,
        station_code VARCHAR(20) UNIQUE NOT NULL,
        station_name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        district VARCHAR(255) NOT NULL,
        state VARCHAR(255) NOT NULL,
        pin_code VARCHAR(6),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        capacity INT DEFAULT 1000,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_station_code (station_code),
        INDEX idx_district (district),
        INDEX idx_state (state)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table: polling_stations created');

    // Create grievances table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS grievances (
        grievance_id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_number VARCHAR(20) UNIQUE NOT NULL,
        voter_id INT,
        aadhaar_number VARCHAR(12),
        issue_type ENUM('wrong_details', 'duplicate_entry', 'missing_name', 'deceased_not_removed', 'wrong_polling_station', 'other') NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status ENUM('open', 'in_progress', 'resolved', 'closed', 'reopened') DEFAULT 'open',
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        assigned_to INT,
        resolution TEXT,
        resolved_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (voter_id) REFERENCES voters(voter_id) ON DELETE SET NULL ON UPDATE CASCADE,
        INDEX idx_ticket_number (ticket_number),
        INDEX idx_status (status),
        INDEX idx_issue_type (issue_type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table: grievances created');

    // Create grievance_attachments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS grievance_attachments (
        attachment_id INT AUTO_INCREMENT PRIMARY KEY,
        grievance_id INT NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (grievance_id) REFERENCES grievances(grievance_id) ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX idx_grievance_id (grievance_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table: grievance_attachments created');

    // Create users table (for admin roles and citizen accounts)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('citizen', 'blo', 'ero', 'deo', 'ceo', 'eci') DEFAULT 'citizen',
        voter_id INT NULL,
        district VARCHAR(255),
        state VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        last_login DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_voter_id (voter_id),
        FOREIGN KEY (voter_id) REFERENCES voters(voter_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table: users created');
    
    // Add voter_id column if it doesn't exist (for linking users to voters)
    try {
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS voter_id INT NULL,
        ADD INDEX IF NOT EXISTS idx_voter_id (voter_id),
        ADD FOREIGN KEY IF NOT EXISTS (voter_id) REFERENCES voters(voter_id) ON DELETE SET NULL
      `);
    } catch (err) {
      // Column might already exist, ignore error
      if (!err.message.includes('Duplicate column')) {
        console.warn('⚠️  Could not add voter_id column:', err.message);
      }
    }

    // Create otp_verifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        otp_id INT AUTO_INCREMENT PRIMARY KEY,
        identifier VARCHAR(255) NOT NULL,
        otp_type ENUM('aadhaar', 'email', 'mobile') NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        expires_at DATETIME NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        verified_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_identifier (identifier),
        INDEX idx_otp_code (otp_code),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table: otp_verifications created');

    // Create notifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id INT AUTO_INCREMENT PRIMARY KEY,
        voter_id INT,
        user_id INT,
        type ENUM('registration', 'approval', 'rejection', 'polling_reminder', 'booth_change', 'duplicate_flag', 'death_match', 'grievance_update') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        channel ENUM('sms', 'email', 'push', 'in_app') NOT NULL,
        sent_at DATETIME NULL,
        read_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (voter_id) REFERENCES voters(voter_id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX idx_voter_id (voter_id),
        INDEX idx_type (type),
        INDEX idx_sent_at (sent_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table: notifications created');

    // Create application_tracking table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS application_tracking (
        track_id INT AUTO_INCREMENT PRIMARY KEY,
        application_id VARCHAR(20) NOT NULL,
        voter_id INT NOT NULL,
        status ENUM('submitted', 'under_review', 'field_verification', 'approved', 'rejected', 'epic_generated') NOT NULL,
        status_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        changed_by INT,
        remarks TEXT,
        FOREIGN KEY (voter_id) REFERENCES voters(voter_id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
        INDEX idx_application_id (application_id),
        INDEX idx_voter_id (voter_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table: application_tracking created');

    // Add foreign key for polling_station_id in voters
    const [fkPolling] = await connection.query(`
      SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'voters' AND CONSTRAINT_NAME = 'fk_polling_station'
    `, [process.env.DB_NAME || 'voting_system']);
    
    if (fkPolling.length === 0) {
      await connection.query(`
        ALTER TABLE voters
        ADD CONSTRAINT fk_polling_station
        FOREIGN KEY (polling_station_id) REFERENCES polling_stations(station_id) ON DELETE SET NULL ON UPDATE CASCADE
      `).catch(() => {});
    }

    // Add foreign key for family_head_id in voters
    const [fkFamily] = await connection.query(`
      SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'voters' AND CONSTRAINT_NAME = 'fk_family_head'
    `, [process.env.DB_NAME || 'voting_system']);
    
    if (fkFamily.length === 0) {
      await connection.query(`
        ALTER TABLE voters
        ADD CONSTRAINT fk_family_head
        FOREIGN KEY (family_head_id) REFERENCES voters(voter_id) ON DELETE SET NULL ON UPDATE CASCADE
      `).catch(() => {});
    }

    console.log('\n🎉 Extended migrations completed successfully!');
    await connection.end();
  } catch (error) {
    console.error('❌ Extended migration error:', error.message);
    await connection.end();
    throw error;
  }
}

runExtendedMigrations()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

