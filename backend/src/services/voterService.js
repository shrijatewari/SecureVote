const pool = require('../config/database');

class VoterService {
  async createVoter(voterData) {
    let connection;
    let retries = 3;
    while (retries > 0) {
      connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

      // Check for duplicate email (normalized to lowercase)
      const normalizedEmail = voterData.email ? voterData.email.toLowerCase().trim() : null;
      if (normalizedEmail) {
        const [existingEmail] = await connection.query(
          'SELECT voter_id, name, aadhaar_number FROM voters WHERE LOWER(TRIM(email)) = ?',
          [normalizedEmail]
        );
        if (existingEmail.length > 0) {
          await connection.rollback();
          throw new Error(`Email ${normalizedEmail} is already registered with Voter ID: ${existingEmail[0].voter_id}, Name: ${existingEmail[0].name}, Aadhaar: ${existingEmail[0].aadhaar_number}`);
        }
      }

      // Check for duplicate mobile
      if (voterData.mobile_number) {
        const [existingMobile] = await connection.query(
          'SELECT voter_id, name, aadhaar_number FROM voters WHERE mobile_number = ?',
          [voterData.mobile_number]
        );
        if (existingMobile.length > 0) {
          await connection.rollback();
          throw new Error(`Mobile number ${voterData.mobile_number} is already registered with Voter ID: ${existingMobile[0].voter_id}, Name: ${existingMobile[0].name}, Aadhaar: ${existingMobile[0].aadhaar_number}`);
        }
      }

      // Check for duplicate Aadhaar (already checked by UNIQUE constraint, but provide better error)
      const [existingAadhaar] = await connection.query(
        'SELECT voter_id, name, email, mobile_number FROM voters WHERE aadhaar_number = ?',
        [voterData.aadhaar_number]
      );
      if (existingAadhaar.length > 0) {
        await connection.rollback();
        throw new Error(`Aadhaar number ${voterData.aadhaar_number} is already registered with Voter ID: ${existingAadhaar[0].voter_id}, Name: ${existingAadhaar[0].name}, Email: ${existingAadhaar[0].email}, Mobile: ${existingAadhaar[0].mobile_number}`);
      }

      // Generate temporary hash if not provided (will be updated by biometric service)
      const crypto = require('crypto');
      const tempHash = (voterData.biometric_hash && voterData.biometric_hash.length >= 32) 
        ? voterData.biometric_hash 
        : crypto.randomBytes(32).toString('hex');
      
      // Build dynamic query with mandatory fields
      // normalizedEmail already declared above, just normalize gender
      const normalizedGender = voterData.gender ? 
        voterData.gender.charAt(0).toUpperCase() + voterData.gender.slice(1).toLowerCase() : null;
      
      const fields = [
        'name', 'dob', 'aadhaar_number', 'biometric_hash', 'is_verified',
        'email', 'mobile_number', 'father_name', 'gender',
        'house_number', 'street', 'village_city', 'district', 'state', 'pin_code'
      ];
      const values = [
        voterData.name ? voterData.name.trim() : null,
        voterData.dob,
        voterData.aadhaar_number,
        tempHash,
        voterData.is_verified || false,
        normalizedEmail,
        voterData.mobile_number,
        voterData.father_name ? voterData.father_name.trim() : null,
        normalizedGender,
        voterData.house_number ? voterData.house_number.trim() : null,
        voterData.street ? voterData.street.trim() : null,
        voterData.village_city ? voterData.village_city.trim() : null,
        voterData.district ? voterData.district.trim() : null,
        voterData.state ? voterData.state.trim() : null,
        voterData.pin_code
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
      
      // Log audit event
      const auditService = require('./auditLogService');
      await auditService.logAction({
        action_type: 'voter_registered',
        entity_type: 'voter',
        entity_id: result.insertId,
        actor_id: result.insertId,
        metadata: JSON.stringify({
          name: voterData.name,
          aadhaar: voterData.aadhaar_number,
          email: voterData.email,
          mobile: voterData.mobile_number
        })
      });
      
      // Create application if voter created successfully
      if (result.insertId) {
        try {
          const applicationService = require('./applicationService');
          await applicationService.createApplication(result.insertId);
        } catch (err) {
          console.warn('Application creation failed:', err.message);
        }
      }
      
        await connection.commit();
        const voter = await this.getVoterById(result.insertId);
        connection.release();
        return voter;
      } catch (error) {
        await connection.rollback();
        connection.release();
        
        // Retry on deadlock
        if (error.code === 'ER_LOCK_DEADLOCK' && retries > 1) {
          retries--;
          await new Promise(resolve => setTimeout(resolve, 50 * (4 - retries))); // Exponential backoff
          continue;
        }
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

