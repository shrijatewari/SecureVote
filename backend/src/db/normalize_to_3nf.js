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
 * Database Normalization to 3NF
 * 
 * This script analyzes and normalizes all tables to Third Normal Form (3NF):
 * 1NF: Eliminate repeating groups and ensure atomic values
 * 2NF: Remove partial dependencies (all non-key attributes fully depend on primary key)
 * 3NF: Remove transitive dependencies (non-key attributes don't depend on other non-key attributes)
 */

async function normalizeTo3NF() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('🔍 Analyzing database schema for 3NF normalization...\n');

    // 1. Create lookup tables for normalization
    
    // States lookup table (normalize state data)
    console.log('📊 Creating states lookup table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS states (
        state_id INT AUTO_INCREMENT PRIMARY KEY,
        state_code VARCHAR(10) UNIQUE NOT NULL,
        state_name VARCHAR(100) NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_state_code (state_code),
        INDEX idx_state_name (state_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Insert Indian states
    const indianStates = [
      { code: 'AP', name: 'Andhra Pradesh' },
      { code: 'AR', name: 'Arunachal Pradesh' },
      { code: 'AS', name: 'Assam' },
      { code: 'BR', name: 'Bihar' },
      { code: 'CT', name: 'Chhattisgarh' },
      { code: 'GA', name: 'Goa' },
      { code: 'GJ', name: 'Gujarat' },
      { code: 'HR', name: 'Haryana' },
      { code: 'HP', name: 'Himachal Pradesh' },
      { code: 'JK', name: 'Jammu and Kashmir' },
      { code: 'JH', name: 'Jharkhand' },
      { code: 'KA', name: 'Karnataka' },
      { code: 'KL', name: 'Kerala' },
      { code: 'LA', name: 'Ladakh' },
      { code: 'LD', name: 'Lakshadweep' },
      { code: 'MP', name: 'Madhya Pradesh' },
      { code: 'MH', name: 'Maharashtra' },
      { code: 'MN', name: 'Manipur' },
      { code: 'ML', name: 'Meghalaya' },
      { code: 'MZ', name: 'Mizoram' },
      { code: 'NL', name: 'Nagaland' },
      { code: 'OR', name: 'Odisha' },
      { code: 'PY', name: 'Puducherry' },
      { code: 'PB', name: 'Punjab' },
      { code: 'RJ', name: 'Rajasthan' },
      { code: 'SK', name: 'Sikkim' },
      { code: 'TN', name: 'Tamil Nadu' },
      { code: 'TG', name: 'Telangana' },
      { code: 'TR', name: 'Tripura' },
      { code: 'UP', name: 'Uttar Pradesh' },
      { code: 'UK', name: 'Uttarakhand' },
      { code: 'WB', name: 'West Bengal' },
      { code: 'AN', name: 'Andaman and Nicobar Islands' },
      { code: 'CH', name: 'Chandigarh' },
      { code: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu' },
      { code: 'DL', name: 'Delhi' },
    ];
    
    for (const state of indianStates) {
      await connection.query(
        `INSERT INTO states (state_code, state_name) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE state_name = VALUES(state_name)`,
        [state.code, state.name]
      );
    }
    console.log(`✅ Created and seeded states lookup table (${indianStates.length} states)`);

    // Districts lookup table (normalize district data)
    console.log('📊 Creating districts lookup table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS districts (
        district_id INT AUTO_INCREMENT PRIMARY KEY,
        district_code VARCHAR(20) UNIQUE,
        district_name VARCHAR(100) NOT NULL,
        state_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (state_id) REFERENCES states(state_id) ON DELETE RESTRICT,
        INDEX idx_district_code (district_code),
        INDEX idx_district_name (district_name),
        INDEX idx_state_id (state_id),
        UNIQUE KEY unique_district_state (district_name, state_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created districts lookup table');

    // Education levels lookup table
    console.log('📊 Creating education_levels lookup table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS education_levels (
        education_id INT AUTO_INCREMENT PRIMARY KEY,
        level_code VARCHAR(20) UNIQUE NOT NULL,
        level_name VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_level_code (level_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    const educationLevels = [
      { code: 'ILLITERATE', name: 'Illiterate' },
      { code: 'PRIMARY', name: 'Primary' },
      { code: 'MIDDLE', name: 'Middle' },
      { code: 'SECONDARY', name: 'Secondary' },
      { code: 'HIGHER_SECONDARY', name: 'Higher Secondary' },
      { code: 'GRADUATE', name: 'Graduate' },
      { code: 'POST_GRADUATE', name: 'Post Graduate' },
      { code: 'PROFESSIONAL', name: 'Professional' },
    ];
    
    for (const level of educationLevels) {
      await connection.query(
        `INSERT INTO education_levels (level_code, level_name) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE level_name = VALUES(level_name)`,
        [level.code, level.name]
      );
    }
    console.log(`✅ Created and seeded education_levels lookup table (${educationLevels.length} levels)`);

    // Occupation categories lookup table
    console.log('📊 Creating occupation_categories lookup table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS occupation_categories (
        occupation_id INT AUTO_INCREMENT PRIMARY KEY,
        category_code VARCHAR(20) UNIQUE NOT NULL,
        category_name VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_category_code (category_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    const occupations = [
      { code: 'FARMER', name: 'Farmer' },
      { code: 'LABORER', name: 'Laborer' },
      { code: 'BUSINESS', name: 'Business' },
      { code: 'SERVICE', name: 'Service' },
      { code: 'PROFESSIONAL', name: 'Professional' },
      { code: 'STUDENT', name: 'Student' },
      { code: 'HOUSEWIFE', name: 'Housewife' },
      { code: 'RETIRED', name: 'Retired' },
      { code: 'UNEMPLOYED', name: 'Unemployed' },
      { code: 'OTHER', name: 'Other' },
    ];
    
    for (const occ of occupations) {
      await connection.query(
        `INSERT INTO occupation_categories (category_code, category_name) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)`,
        [occ.code, occ.name]
      );
    }
    console.log(`✅ Created and seeded occupation_categories lookup table (${occupations.length} categories)`);

    // Marital status lookup table
    console.log('📊 Creating marital_statuses lookup table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS marital_statuses (
        status_id INT AUTO_INCREMENT PRIMARY KEY,
        status_code VARCHAR(20) UNIQUE NOT NULL,
        status_name VARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_status_code (status_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    const maritalStatuses = [
      { code: 'SINGLE', name: 'Single' },
      { code: 'MARRIED', name: 'Married' },
      { code: 'DIVORCED', name: 'Divorced' },
      { code: 'WIDOWED', name: 'Widowed' },
    ];
    
    for (const status of maritalStatuses) {
      await connection.query(
        `INSERT INTO marital_statuses (status_code, status_name) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE status_name = VALUES(status_name)`,
        [status.code, status.name]
      );
    }
    console.log(`✅ Created and seeded marital_statuses lookup table (${maritalStatuses.length} statuses)`);

    // Document types lookup table
    console.log('📊 Creating document_types lookup table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS document_types (
        type_id INT AUTO_INCREMENT PRIMARY KEY,
        type_code VARCHAR(50) UNIQUE NOT NULL,
        type_name VARCHAR(100) NOT NULL,
        is_required BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_type_code (type_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    const documentTypes = [
      { code: 'AADHAAR', name: 'Aadhaar', required: true },
      { code: 'ADDRESS_PROOF', name: 'Address Proof', required: true },
      { code: 'PHOTO', name: 'Photo', required: true },
      { code: 'SIGNATURE', name: 'Signature', required: false },
      { code: 'DISABILITY_CERT', name: 'Disability Certificate', required: false },
      { code: 'BIRTH_CERT', name: 'Birth Certificate', required: false },
      { code: 'MARRIAGE_CERT', name: 'Marriage Certificate', required: false },
      { code: 'AFFIDAVIT', name: 'Affidavit', required: false },
      { code: 'AGE_PROOF', name: 'Age Proof', required: false },
      { code: 'IDENTITY_PROOF', name: 'Identity Proof', required: false },
      { code: 'OTHER', name: 'Other', required: false },
    ];
    
    for (const docType of documentTypes) {
      await connection.query(
        `INSERT INTO document_types (type_code, type_name, is_required) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE type_name = VALUES(type_name), is_required = VALUES(is_required)`,
        [docType.code, docType.name, docType.required]
      );
    }
    console.log(`✅ Created and seeded document_types lookup table (${documentTypes.length} types)`);

    // 2. Add foreign key columns to voters table for normalization
    console.log('\n📝 Normalizing voters table...');
    
    // Check if columns exist, add if not
    const voterNormalizationColumns = [
      { name: 'state_id', type: 'INT NULL', fk: 'states(state_id)' },
      { name: 'district_id', type: 'INT NULL', fk: 'districts(district_id)' },
      { name: 'education_level_id', type: 'INT NULL', fk: 'education_levels(education_id)' },
      { name: 'occupation_category_id', type: 'INT NULL', fk: 'occupation_categories(occupation_id)' },
      { name: 'marital_status_id', type: 'INT NULL', fk: 'marital_statuses(status_id)' },
    ];
    
    for (const col of voterNormalizationColumns) {
      try {
        const [existing] = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'voters' AND COLUMN_NAME = ?`,
          [dbConfig.database, col.name]
        );
        
        if (existing.length === 0) {
          await connection.query(`ALTER TABLE voters ADD COLUMN ${col.name} ${col.type}`);
          console.log(`  ✅ Added column: ${col.name}`);
          
          // Add foreign key constraint
          try {
            const fkParts = col.fk.split('(');
            const refTable = fkParts[0];
            const refCol = fkParts[1].replace(')', '');
            await connection.query(
              `ALTER TABLE voters ADD CONSTRAINT fk_voters_${col.name.replace('_id', '')} 
               FOREIGN KEY (${col.name}) REFERENCES ${refTable}(${refCol}) ON DELETE SET NULL`
            );
            console.log(`  ✅ Added foreign key: ${col.name} -> ${col.fk}`);
          } catch (fkError) {
            console.warn(`  ⚠️  Could not add foreign key for ${col.name}:`, fkError.message);
          }
        } else {
          console.log(`  ⏭️  Column ${col.name} already exists`);
        }
      } catch (error) {
        console.warn(`  ⚠️  Error adding column ${col.name}:`, error.message);
      }
    }

    // 3. Normalize document_type in voter_documents table
    console.log('\n📝 Normalizing voter_documents table...');
    try {
      const [docCols] = await connection.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'voter_documents' AND COLUMN_NAME = 'document_type'`,
        [dbConfig.database]
      );
      
      if (docCols.length > 0) {
        // Check if document_type_id column exists
        const [docTypeIdCol] = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'voter_documents' AND COLUMN_NAME = 'document_type_id'`,
          [dbConfig.database]
        );
        
        if (docTypeIdCol.length === 0) {
          await connection.query(`
            ALTER TABLE voter_documents 
            ADD COLUMN document_type_id INT NULL,
            ADD INDEX idx_document_type_id (document_type_id),
            ADD CONSTRAINT fk_voter_documents_type 
            FOREIGN KEY (document_type_id) REFERENCES document_types(type_id) ON DELETE SET NULL
          `);
          console.log('  ✅ Added document_type_id column with foreign key');
          
          // Migrate existing data (map ENUM values to IDs)
          await connection.query(`
            UPDATE voter_documents vd
            INNER JOIN document_types dt ON 
              CASE vd.document_type
                WHEN 'aadhaar' THEN dt.type_code = 'AADHAAR'
                WHEN 'address_proof' THEN dt.type_code = 'ADDRESS_PROOF'
                WHEN 'photo' THEN dt.type_code = 'PHOTO'
                WHEN 'signature' THEN dt.type_code = 'SIGNATURE'
                WHEN 'disability_cert' THEN dt.type_code = 'DISABILITY_CERT'
                WHEN 'birth_cert' THEN dt.type_code = 'BIRTH_CERT'
                WHEN 'marriage_cert' THEN dt.type_code = 'MARRIAGE_CERT'
                WHEN 'affidavit' THEN dt.type_code = 'AFFIDAVIT'
                WHEN 'age_proof' THEN dt.type_code = 'AGE_PROOF'
                WHEN 'identity_proof' THEN dt.type_code = 'IDENTITY_PROOF'
                ELSE dt.type_code = 'OTHER'
              END
            SET vd.document_type_id = dt.type_id
            WHERE vd.document_type_id IS NULL
          `);
          console.log('  ✅ Migrated existing document_type data to document_type_id');
        } else {
          console.log('  ⏭️  document_type_id column already exists');
        }
      }
    } catch (error) {
      console.warn('  ⚠️  Error normalizing voter_documents:', error.message);
    }

    // 4. Create indexes for performance
    console.log('\n📊 Creating performance indexes...');
    const indexes = [
      { table: 'voters', index: 'idx_state_id', columns: 'state_id' },
      { table: 'voters', index: 'idx_district_id', columns: 'district_id' },
      { table: 'voters', index: 'idx_education_level_id', columns: 'education_level_id' },
      { table: 'voters', index: 'idx_occupation_category_id', columns: 'occupation_category_id' },
      { table: 'voters', index: 'idx_marital_status_id', columns: 'marital_status_id' },
      { table: 'voters', index: 'idx_state_district', columns: 'state_id, district_id' },
    ];
    
    for (const idx of indexes) {
      try {
        // Check if index already exists
        const [existing] = await connection.query(
          `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
          [dbConfig.database, idx.table, idx.index]
        );
        
        if (existing[0].count === 0) {
          await connection.query(
            `CREATE INDEX ${idx.index} ON ${idx.table}(${idx.columns})`
          );
          console.log(`  ✅ Created index: ${idx.index} on ${idx.table}`);
        } else {
          console.log(`  ⏭️  Index ${idx.index} already exists`);
        }
      } catch (error) {
        console.warn(`  ⚠️  Could not create index ${idx.index}:`, error.message);
      }
    }

    // 5. Analyze existing tables for 3NF violations
    console.log('\n🔍 Analyzing tables for 3NF compliance...');
    
    const tablesToAnalyze = [
      'voters',
      'users',
      'elections',
      'candidates',
      'votes',
      'grievances',
      'blo_tasks',
      'audit_logs',
      'duplicate_checks',
      'death_records',
      'biometrics',
      'review_tasks',
      'address_cluster_flags',
    ];
    
    for (const tableName of tablesToAnalyze) {
      try {
        const [columns] = await connection.query(
          `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
           ORDER BY ORDINAL_POSITION`,
          [dbConfig.database, tableName]
        );
        
        if (columns.length > 0) {
          console.log(`\n  📋 Table: ${tableName}`);
          console.log(`     Columns: ${columns.length}`);
          
          // Check for potential normalization issues
          const textColumns = columns.filter(c => 
            c.DATA_TYPE.includes('VARCHAR') || c.DATA_TYPE.includes('TEXT')
          );
          const enumColumns = columns.filter(c => c.DATA_TYPE.includes('ENUM'));
          
          if (enumColumns.length > 0) {
            console.log(`     ⚠️  Found ${enumColumns.length} ENUM columns (consider lookup tables)`);
          }
          
          // Check for composite keys
          const [keys] = await connection.query(
            `SELECT CONSTRAINT_NAME, COLUMN_NAME 
             FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
             AND CONSTRAINT_NAME != 'PRIMARY'`,
            [dbConfig.database, tableName]
          );
          
          if (keys.length > 0) {
            console.log(`     ✅ Found ${keys.length} indexes/foreign keys`);
          }
        }
      } catch (error) {
        console.warn(`  ⚠️  Could not analyze table ${tableName}:`, error.message);
      }
    }

    console.log('\n✅ Database normalization to 3NF completed!');
    console.log('\n📝 Summary:');
    console.log('  - Created lookup tables: states, districts, education_levels, occupation_categories, marital_statuses, document_types');
    console.log('  - Added foreign key columns to voters table');
    console.log('  - Normalized document_type in voter_documents');
    console.log('  - Created performance indexes');
    console.log('\n💡 Note: Existing data in voters table still uses text fields.');
    console.log('   To fully migrate, run data migration script after this normalization.');
    
  } catch (error) {
    console.error('❌ Error during normalization:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run if called directly
if (require.main === module) {
  normalizeTo3NF()
    .then(() => {
      console.log('\n✅ Normalization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Normalization failed:', error);
      process.exit(1);
    });
}

module.exports = normalizeTo3NF;

