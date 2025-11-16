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

async function increaseLockTimeout() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('🔧 Increasing MySQL lock wait timeout...');
    
    // Increase global lock wait timeout to 60 seconds
    await connection.query('SET GLOBAL innodb_lock_wait_timeout = 60');
    console.log('✅ Global innodb_lock_wait_timeout set to 60 seconds');
    
    // Also set session timeout
    await connection.query('SET SESSION innodb_lock_wait_timeout = 60');
    console.log('✅ Session innodb_lock_wait_timeout set to 60 seconds');
    
    // Verify
    const [global] = await connection.query('SHOW VARIABLES LIKE "innodb_lock_wait_timeout"');
    console.log(`✅ Verified: innodb_lock_wait_timeout = ${global[0].Value} seconds`);
    
  } catch (error) {
    console.error('❌ Error increasing lock timeout:', error.message);
    // If global setting fails (permissions), at least set session
    try {
      await connection.query('SET SESSION innodb_lock_wait_timeout = 60');
      console.log('⚠️  Set session timeout only (global requires SUPER privilege)');
    } catch (e) {
      console.error('❌ Failed to set session timeout:', e.message);
    }
  } finally {
    await connection.end();
  }
}

// Run if called directly
if (require.main === module) {
  increaseLockTimeout()
    .then(() => {
      console.log('✅ Lock timeout configuration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Configuration failed:', error);
      process.exit(1);
    });
}

module.exports = increaseLockTimeout;

