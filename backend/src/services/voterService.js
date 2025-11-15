const pool = require('../config/database');

class VoterService {
  async createVoter(voterData) {
    let connection;
    let retries = 3;
    while (retries > 0) {
      connection = await pool.getConnection();
      try {
        // Set lock wait timeout to 10 seconds
        await connection.query('SET innodb_lock_wait_timeout = 10');
        await connection.beginTransaction();

        // Check for duplicate email (only if email is provided and not empty)
        const normalizedEmail = voterData.email ? voterData.email.toLowerCase().trim() : null;
        if (normalizedEmail && normalizedEmail.length > 0 && normalizedEmail !== 'null' && normalizedEmail !== 'undefined') {
          console.log('Checking duplicate email:', normalizedEmail);
          const [existingEmail] = await connection.query(
            'SELECT voter_id, name, aadhaar_number FROM voters WHERE email = ? AND email IS NOT NULL AND email != "" AND email != "null" LIMIT 1',
            [normalizedEmail]
          );
          console.log('Email check result:', existingEmail.length, existingEmail);
          if (existingEmail.length > 0) {
            await connection.rollback();
            connection.release();
            throw new Error(`Email ${normalizedEmail} is already registered with Voter ID: ${existingEmail[0].voter_id}, Name: ${existingEmail[0].name}, Aadhaar: ${existingEmail[0].aadhaar_number}`);
          }
        }

        // Check for duplicate mobile (only if mobile is provided and not empty)
        const normalizedMobile = voterData.mobile_number ? voterData.mobile_number.trim() : null;
        if (normalizedMobile && normalizedMobile.length > 0 && normalizedMobile !== 'null' && normalizedMobile !== 'undefined') {
          console.log('Checking duplicate mobile:', normalizedMobile);
          const [existingMobile] = await connection.query(
            'SELECT voter_id, name, aadhaar_number FROM voters WHERE mobile_number = ? AND mobile_number IS NOT NULL AND mobile_number != "" AND mobile_number != "null" LIMIT 1',
            [normalizedMobile]
          );
          console.log('Mobile check result:', existingMobile.length, existingMobile);
          if (existingMobile.length > 0) {
            await connection.rollback();
            connection.release();
            throw new Error(`Mobile number ${normalizedMobile} is already registered with Voter ID: ${existingMobile[0].voter_id}, Name: ${existingMobile[0].name}, Aadhaar: ${existingMobile[0].aadhaar_number}`);
          }
        }

        // Check for duplicate Aadhaar (Aadhaar is always required, so always check)
        if (voterData.aadhaar_number && voterData.aadhaar_number.trim().length > 0) {
          const normalizedAadhaar = voterData.aadhaar_number.trim();
          console.log('Checking duplicate Aadhaar:', normalizedAadhaar);
          const [existingAadhaar] = await connection.query(
            'SELECT voter_id, name, email, mobile_number FROM voters WHERE aadhaar_number = ? LIMIT 1',
            [normalizedAadhaar]
          );
          console.log('Aadhaar check result:', existingAadhaar.length, existingAadhaar);
          if (existingAadhaar.length > 0) {
            await connection.rollback();
            connection.release();
            throw new Error(`Aadhaar number ${normalizedAadhaar} is already registered with Voter ID: ${existingAadhaar[0].voter_id}, Name: ${existingAadhaar[0].name}, Email: ${existingAadhaar[0].email}, Mobile: ${existingAadhaar[0].mobile_number}`);
          }
        }

        // Generate temporary hash if not provided (will be updated by biometric service)
        const crypto = require('crypto');
        const tempHash = (voterData.biometric_hash && voterData.biometric_hash.length >= 32) 
          ? voterData.biometric_hash 
          : crypto.randomBytes(32).toString('hex');
        
        // Generate temporary hashes for fingerprint and face if not provided
        const tempFingerprintHash = voterData.fingerprint_hash || null;
        const tempFaceHash = voterData.face_embedding_hash || null;
        
        // Build dynamic query with mandatory fields
        // normalizedEmail already declared above, just normalize gender
        const normalizedGender = voterData.gender ? 
          voterData.gender.charAt(0).toUpperCase() + voterData.gender.slice(1).toLowerCase() : null;
        
        const fields = [
          'name', 'dob', 'aadhaar_number', 'biometric_hash', 'is_verified',
          'email', 'mobile_number', 'father_name', 'gender',
          'house_number', 'street', 'village_city', 'district', 'state', 'pin_code',
          'fingerprint_hash', 'face_embedding_hash'
        ];
        const values = [
          voterData.name ? voterData.name.trim() : null,
          voterData.dob,
          voterData.aadhaar_number ? voterData.aadhaar_number.trim() : null,
          tempHash,
          voterData.is_verified || false,
          normalizedEmail && normalizedEmail.length > 0 ? normalizedEmail : null,
          normalizedMobile && normalizedMobile.length > 0 ? normalizedMobile : null,
          voterData.father_name ? voterData.father_name.trim() : null,
          normalizedGender,
          voterData.house_number ? voterData.house_number.trim() : null,
          voterData.street ? voterData.street.trim() : null,
          voterData.village_city ? voterData.village_city.trim() : null,
          voterData.district ? voterData.district.trim() : null,
          voterData.state ? voterData.state.trim() : null,
          voterData.pin_code,
          tempFingerprintHash,
          tempFaceHash
        ];

        // Add optional extended fields if provided
        const optionalFields = [
          'mother_name', 'guardian_name',
          'is_indian_citizen', 'family_head_id'
        ];

        optionalFields.forEach(field => {
          if (voterData[field] !== undefined && voterData[field] !== null) {
            fields.push(field);
            values.push(voterData[field]);
          }
        });

        // Email and mobile verification status (will be set after OTP verification)
        if (voterData.email_verified !== undefined) {
          fields.push('email_verified');
          values.push(voterData.email_verified || false);
        }

        if (voterData.mobile_verified !== undefined) {
          fields.push('mobile_verified');
          values.push(voterData.mobile_verified || false);
        }

        const placeholders = fields.map(() => '?').join(', ');
        const query = `INSERT INTO voters (${fields.join(', ')}) VALUES (${placeholders})`;
        
        const [result] = await connection.query(query, values);
        
        await connection.commit();
        const voterId = result.insertId;
        connection.release();
        
        console.log('✅ Voter created successfully with ID:', voterId);
        
        // Log audit event (outside transaction to avoid lock timeout)
        setImmediate(async () => {
          try {
            const auditService = require('./auditLogService');
            await auditService.logAction({
              action_type: 'voter_registered',
              entity_type: 'voter',
              entity_id: voterId,
              actor_id: voterId,
              metadata: JSON.stringify({
                name: voterData.name,
                aadhaar: voterData.aadhaar_number,
                email: voterData.email,
                mobile: voterData.mobile_number
              })
            });
          } catch (err) {
            console.warn('Audit log failed:', err.message);
          }
        });
        
        // Create application if voter created successfully (outside transaction)
        if (voterId) {
          setImmediate(async () => {
            try {
              const applicationService = require('./applicationService');
              await applicationService.createApplication(voterId);
            } catch (err) {
              console.warn('Application creation failed:', err.message);
            }
          });
        }
        
        const voter = await this.getVoterById(voterId);
        return voter;
      } catch (error) {
        if (connection) {
          try {
            await connection.rollback();
          } catch (rollbackErr) {
            console.error('Rollback error:', rollbackErr.message);
          }
          connection.release();
        }
        
        // Handle database UNIQUE constraint errors (from database level)
        if (error.code === 'ER_DUP_ENTRY') {
          console.error('Database duplicate entry error:', error.sqlMessage);
          const sqlMessage = error.sqlMessage || '';
          
          if (sqlMessage.includes('aadhaar_number')) {
            throw new Error(`Aadhaar number is already registered. Please use a different Aadhaar number.`);
          } else if (sqlMessage.includes('email')) {
            throw new Error(`Email is already registered. Please use a different email address.`);
          } else if (sqlMessage.includes('mobile_number')) {
            throw new Error(`Mobile number is already registered. Please use a different mobile number.`);
          } else {
            throw new Error(`Duplicate entry detected: This information is already registered in the system.`);
          }
        }
        
        // Retry on deadlock or lock timeout
        if ((error.code === 'ER_LOCK_DEADLOCK' || error.code === 'ER_LOCK_WAIT_TIMEOUT') && retries > 1) {
          retries--;
          const backoffDelay = 100 * (4 - retries); // Exponential backoff: 100ms, 200ms, 300ms
          console.warn(`Lock error (${error.code}), retrying in ${backoffDelay}ms... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }
        
        console.error('Voter creation error:', error.message, error.code);
        throw error;
      }
    }
    throw new Error('Failed to create voter after retries');
  }

  async getVoterById(voterId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT * FROM voters WHERE voter_id = ?',
        [voterId]
      );
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  async getVoterByAadhaar(aadhaarNumber) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT * FROM voters WHERE aadhaar_number = ?',
        [aadhaarNumber]
      );
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  async getAllVoters(page = 1, limit = 10) {
    const connection = await pool.getConnection();
    try {
      const offset = (page - 1) * limit;
      const [rows] = await connection.query(
        'SELECT * FROM voters ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      const [countRows] = await connection.query('SELECT COUNT(*) as total FROM voters');
      return {
        voters: rows,
        pagination: {
          page,
          limit,
          total: countRows[0].total,
          totalPages: Math.ceil(countRows[0].total / limit)
        }
      };
    } finally {
      connection.release();
    }
  }

  async updateVoter(voterId, voterData) {
    const connection = await pool.getConnection();
    try {
      const updates = [];
      const values = [];

      if (voterData.name) {
        updates.push('name = ?');
        values.push(voterData.name);
      }
      if (voterData.dob) {
        updates.push('dob = ?');
        values.push(voterData.dob);
      }
      if (voterData.biometric_hash) {
        updates.push('biometric_hash = ?');
        values.push(voterData.biometric_hash);
      }
      if (voterData.is_verified !== undefined) {
        updates.push('is_verified = ?');
        values.push(voterData.is_verified);
      }

      if (updates.length === 0) {
        return await this.getVoterById(voterId);
      }

      values.push(voterId);
      await connection.query(
        `UPDATE voters SET ${updates.join(', ')} WHERE voter_id = ?`,
        values
      );
      return await this.getVoterById(voterId);
    } finally {
      connection.release();
    }
  }

  async deleteVoter(voterId) {
    const connection = await pool.getConnection();
    try {
      await connection.query('DELETE FROM voters WHERE voter_id = ?', [voterId]);
      return { success: true };
    } finally {
      connection.release();
    }
  }

  async verifyBiometric(aadhaarNumber, biometricHash) {
    const connection = await pool.getConnection();
    try {
      const voter = await this.getVoterByAadhaar(aadhaarNumber);
      if (!voter) {
        return { verified: false, message: 'Voter not found' };
      }

      if (voter.biometric_hash === biometricHash) {
        await this.updateVoter(voter.voter_id, { is_verified: true });
        return { verified: true, voter };
      }

      return { verified: false, message: 'Biometric hash mismatch' };
    } finally {
      connection.release();
    }
  }

  async checkDeathRecord(aadhaarNumber) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT * FROM death_records WHERE aadhaar_number = ?',
        [aadhaarNumber]
      );
      return rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }
}

module.exports = new VoterService();

