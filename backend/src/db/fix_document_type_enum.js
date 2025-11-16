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

async function fixDocumentTypeEnum() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('🔧 Fixing document_type ENUM in voter_documents table...');
    
    // First, check if the table exists
    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'voter_documents'",
      [dbConfig.database]
    );
    
    if (tables.length === 0) {
      console.log('⚠️  Table voter_documents does not exist. Creating it with correct ENUM...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS voter_documents (
          document_id INT AUTO_INCREMENT PRIMARY KEY,
          voter_id INT NOT NULL,
          document_type ENUM('aadhaar', 'address_proof', 'photo', 'signature', 'disability_cert', 'birth_cert', 'marriage_cert', 'affidavit', 'age_proof', 'identity_proof', 'other') NOT NULL,
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
      console.log('✅ Table voter_documents created with correct ENUM');
    } else {
      // Table exists, alter the ENUM
      console.log('📝 Altering document_type ENUM...');
      
      // MySQL doesn't support direct ENUM modification, so we need to:
      // 1. Add a temporary column with the new ENUM
      // 2. Copy data (mapping old values to new ones)
      // 3. Drop old column and rename new one
      
      try {
        // Add temporary column
        await connection.query(`
          ALTER TABLE voter_documents 
          ADD COLUMN document_type_new ENUM('aadhaar', 'address_proof', 'photo', 'signature', 'disability_cert', 'birth_cert', 'marriage_cert', 'affidavit', 'age_proof', 'identity_proof', 'other') AFTER document_type
        `);
        
        // Map old values to new values
        await connection.query(`
          UPDATE voter_documents 
          SET document_type_new = CASE
            WHEN document_type = 'photograph' THEN 'photo'
            WHEN document_type = 'age_proof' THEN 'age_proof'
            WHEN document_type = 'identity_proof' THEN 'identity_proof'
            WHEN document_type = 'address_proof' THEN 'address_proof'
            WHEN document_type = 'other' THEN 'other'
            ELSE document_type
          END
        `);
        
        // Drop old column
        await connection.query(`ALTER TABLE voter_documents DROP COLUMN document_type`);
        
        // Rename new column
        await connection.query(`ALTER TABLE voter_documents CHANGE COLUMN document_type_new document_type ENUM('aadhaar', 'address_proof', 'photo', 'signature', 'disability_cert', 'birth_cert', 'marriage_cert', 'affidavit', 'age_proof', 'identity_proof', 'other') NOT NULL`);
        
        console.log('✅ document_type ENUM updated successfully');
      } catch (error) {
        // If column already exists or other error, try simpler approach
        if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column')) {
          console.log('⚠️  Temporary column already exists, trying alternative approach...');
          await connection.query(`ALTER TABLE voter_documents DROP COLUMN document_type_new`);
          await connection.query(`
            ALTER TABLE voter_documents 
            MODIFY COLUMN document_type ENUM('aadhaar', 'address_proof', 'photo', 'signature', 'disability_cert', 'birth_cert', 'marriage_cert', 'affidavit', 'age_proof', 'identity_proof', 'other') NOT NULL
          `);
          console.log('✅ document_type ENUM updated using MODIFY');
        } else {
          // Try direct MODIFY if the column structure allows
          try {
            await connection.query(`
              ALTER TABLE voter_documents 
              MODIFY COLUMN document_type ENUM('aadhaar', 'address_proof', 'photo', 'signature', 'disability_cert', 'birth_cert', 'marriage_cert', 'affidavit', 'age_proof', 'identity_proof', 'other') NOT NULL
            `);
            console.log('✅ document_type ENUM updated using MODIFY');
          } catch (modifyError) {
            console.error('❌ Error updating ENUM:', modifyError.message);
            throw modifyError;
          }
        }
      }
    }
    
    console.log('✅ Document type ENUM fix completed');
  } catch (error) {
    console.error('❌ Error fixing document_type ENUM:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run if called directly
if (require.main === module) {
  fixDocumentTypeEnum()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = fixDocumentTypeEnum;

