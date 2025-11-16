const mysql = require('mysql2/promise');
require('dotenv').config();
const crypto = require('crypto');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'voting_system'
};

async function ensureUsersSeeded() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    console.log('🔐 Ensuring users are seeded...\n');

    // Ensure users table exists with correct role enum
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('citizen', 'blo', 'ero', 'deo', 'ceo', 'eci', 'admin') DEFAULT 'citizen',
        district VARCHAR(255),
        state VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // Update role enum if 'admin' is missing
    try {
      await connection.query(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('citizen', 'blo', 'ero', 'deo', 'ceo', 'eci', 'admin') DEFAULT 'citizen'
      `);
    } catch (e) {
      // Ignore if already correct
    }

    // Seed admin users
    const adminUsers = [
      { email: 'admin1@election.gov.in', password: 'admin1', role: 'eci', username: 'ECI Admin' },
      { email: 'admin2@election.gov.in', password: 'admin2', role: 'blo', username: 'BLO Officer' },
      { email: 'admin3@election.gov.in', password: 'admin3', role: 'ero', username: 'ERO Officer' },
      { email: 'admin4@election.gov.in', password: 'admin4', role: 'deo', username: 'DEO Officer' },
      { email: 'admin5@election.gov.in', password: 'admin5', role: 'ceo', username: 'CEO Officer' }
    ];

    for (const user of adminUsers) {
      const passwordHash = crypto.createHash('sha256').update(user.password).digest('hex');
      await connection.query(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           username = VALUES(username),
           password_hash = VALUES(password_hash),
           role = VALUES(role)`,
        [user.username, user.email, passwordHash, user.role]
      );
      console.log(`✅ ${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
    }

    // Seed a test citizen voter (only if doesn't exist)
    try {
      const [existing] = await connection.query(
        `SELECT voter_id FROM voters WHERE email = ? LIMIT 1`,
        ['citizen1@example.com']
      );
      
      if (existing.length === 0) {
        await connection.query(
          `INSERT INTO voters (name, email, mobile_number, aadhaar_number, dob, is_verified, biometric_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE email = VALUES(email)`,
          ['Test Citizen', 'citizen1@example.com', '9876543210', '999999999999', '1990-05-15', true, 'a'.repeat(64)]
        );
        console.log(`✅ CITIZEN: citizen1@example.com / any`);
      } else {
        console.log(`✅ CITIZEN: citizen1@example.com / any (already exists)`);
      }
    } catch (err) {
      console.log(`⚠️  Could not seed citizen voter: ${err.message}`);
    }

    console.log('\n🎉 All users seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin Dashboard:');
    console.log('  Email: admin1@election.gov.in');
    console.log('  Password: admin1');
    console.log('\nCitizen Dashboard:');
    console.log('  Email: citizen1@example.com');
    console.log('  Password: any');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await connection.end();
  } catch (err) {
    console.error('❌ Error seeding users:', err);
    await connection.end();
    throw err;
  }
}

if (require.main === module) {
  ensureUsersSeeded()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = ensureUsersSeeded;

