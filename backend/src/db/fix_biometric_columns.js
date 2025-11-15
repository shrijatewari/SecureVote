const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'voting_system'
};

async function fixBiometricColumns() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('🔧 Fixing biometric columns to ensure they are nullable...\n');

    // Fix fingerprint_hash
    try {
      await connection.query(`
        ALTER TABLE voters 
        MODIFY COLUMN fingerprint_hash VARCHAR(255) NULL DEFAULT NULL
      `);
      console.log('✅ Fixed fingerprint_hash column');
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        // Column doesn't exist, add it
        await connection.query(`
          ALTER TABLE voters 
          ADD COLUMN fingerprint_hash VARCHAR(255) NULL DEFAULT NULL
        `);
        console.log('✅ Added fingerprint_hash column');
      } else {
        console.log(`⏭️  fingerprint_hash: ${error.message}`);
      }
    }

    // Fix face_embedding_hash
    try {
      await connection.query(`
        ALTER TABLE voters 
        MODIFY COLUMN face_embedding_hash VARCHAR(255) NULL DEFAULT NULL
      `);
      console.log('✅ Fixed face_embedding_hash column');
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        // Column doesn't exist, add it
        await connection.query(`
          ALTER TABLE voters 
          ADD COLUMN face_embedding_hash VARCHAR(255) NULL DEFAULT NULL
        `);
        console.log('✅ Added face_embedding_hash column');
      } else {
        console.log(`⏭️  face_embedding_hash: ${error.message}`);
      }
    }

    console.log('\n🎉 Biometric columns fixed!');
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await connection.end();
    throw error;
  }
}

fixBiometricColumns()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fix failed:', error);
    process.exit(1);
  });

