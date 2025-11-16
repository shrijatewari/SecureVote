const pool = require('../config/database');
const addressValidationService = require('./addressValidationService');
const nameValidationService = require('./nameValidationService');
const reviewTaskService = require('./reviewTaskService');
const auditLogService = require('./auditLogService');

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

        // BIOMETRIC-BASED DUPLICATE DETECTION
        // Only block registration if face_hash or fingerprint_hash matches (same person)
        // Allow email/mobile/Aadhaar duplicates - they will be flagged by AI duplicate detection later
        
        const normalizedEmail = voterData.email ? voterData.email.toLowerCase().trim() : null;
        const normalizedMobile = voterData.mobile_number ? voterData.mobile_number.trim() : null;
        const normalizedAadhaar = voterData.aadhaar_number ? voterData.aadhaar_number.trim() : null;
        
        // Check for biometric duplicates (face_hash or fingerprint_hash)
        const faceHash = voterData.face_embedding_hash || null;
        const fingerprintHash = voterData.fingerprint_hash || null;
        
        if (faceHash || fingerprintHash) {
          let biometricQuery = 'SELECT b.voter_id, v.name, v.aadhaar_number, v.email FROM biometrics b JOIN voters v ON b.voter_id = v.voter_id WHERE ';
          const biometricParams = [];
          
          if (faceHash && fingerprintHash) {
            biometricQuery += '(b.face_hash = ? OR b.fingerprint_hash = ?)';
            biometricParams.push(faceHash, fingerprintHash);
          } else if (faceHash) {
            biometricQuery += 'b.face_hash = ?';
            biometricParams.push(faceHash);
          } else if (fingerprintHash) {
            biometricQuery += 'b.fingerprint_hash = ?';
            biometricParams.push(fingerprintHash);
          }
          
          if (biometricParams.length > 0) {
            const [existingBiometric] = await connection.query(biometricQuery, biometricParams);
            if (existingBiometric.length > 0) {
              await connection.rollback();
              connection.release();
              const existing = existingBiometric[0];
              throw new Error(`DUPLICATE BIOMETRIC DETECTED! This face/fingerprint already belongs to Voter ID: ${existing.voter_id}, Name: ${existing.name}, Aadhaar: ${existing.aadhaar_number}. You cannot register the same person twice.`);
            }
          }
        }
        
        // Log warnings for email/mobile/Aadhaar matches (but don't block)
        if (normalizedEmail && normalizedEmail.length > 0 && normalizedEmail !== 'null' && normalizedEmail !== 'undefined') {
          const [existingEmail] = await connection.query(
            'SELECT voter_id, name, aadhaar_number FROM voters WHERE email = ? AND email IS NOT NULL AND email != "" LIMIT 1',
            [normalizedEmail]
          );
          if (existingEmail.length > 0) {
            console.warn(`⚠️  Email ${normalizedEmail} already exists (Voter ID: ${existingEmail[0].voter_id}), but allowing registration - will be flagged by AI duplicate detection`);
          }
        }

        if (normalizedMobile && normalizedMobile.length > 0 && normalizedMobile !== 'null' && normalizedMobile !== 'undefined') {
          const [existingMobile] = await connection.query(
            'SELECT voter_id, name, aadhaar_number FROM voters WHERE mobile_number = ? AND mobile_number IS NOT NULL AND mobile_number != "" LIMIT 1',
            [normalizedMobile]
          );
          if (existingMobile.length > 0) {
            console.warn(`⚠️  Mobile ${normalizedMobile} already exists (Voter ID: ${existingMobile[0].voter_id}), but allowing registration - will be flagged by AI duplicate detection`);
          }
        }

        if (normalizedAadhaar && normalizedAadhaar.length > 0) {
          const [existingAadhaar] = await connection.query(
            'SELECT voter_id, name, email FROM voters WHERE aadhaar_number = ? LIMIT 1',
            [normalizedAadhaar]
          );
          if (existingAadhaar.length > 0) {
            console.warn(`⚠️  Aadhaar ${normalizedAadhaar} already exists (Voter ID: ${existingAadhaar[0].voter_id}), but allowing registration - will be flagged by AI duplicate detection`);
          }
        }

        // ========== VALIDATION PIPELINE ==========
        // 1. Address Validation
        let addressValidation = null;
        let registrationStatus = 'active';
        const validationFlags = [];
        
        if (voterData.house_number || voterData.street || voterData.village_city) {
          try {
            addressValidation = await addressValidationService.validateAddress({
              house_number: voterData.house_number,
              street: voterData.street,
              village_city: voterData.village_city,
              district: voterData.district,
              state: voterData.state,
              pin_code: voterData.pin_code
            });

            if (!addressValidation.valid) {
              if (addressValidation.validationResult === 'rejected') {
                await connection.rollback();
                connection.release();
                throw new Error(`Address validation failed: ${addressValidation.flags.join(', ')}. Please provide a valid address.`);
              } else {
                registrationStatus = 'pending_review';
                validationFlags.push(...addressValidation.flags);
              }
            }
          } catch (addrError) {
            console.warn('Address validation error (non-blocking):', addrError.message);
            // Continue with registration but flag for review
            registrationStatus = 'pending_review';
            validationFlags.push('address_validation_error');
          }
        }

        // 2. Name Validation (Father Name)
        let fatherNameValidation = null;
        if (voterData.father_name) {
          try {
            fatherNameValidation = await nameValidationService.validateName(voterData.father_name, 'father_name');
            
            if (!fatherNameValidation.valid || fatherNameValidation.validationResult === 'rejected') {
              await connection.rollback();
              connection.release();
              throw new Error(`Father name validation failed: ${fatherNameValidation.reason || 'Invalid name format'}. Please provide a valid father's name.`);
            } else if (fatherNameValidation.validationResult === 'flagged') {
              registrationStatus = 'pending_review';
              validationFlags.push('father_name_flagged');
            }
          } catch (nameError) {
            if (nameError.message.includes('validation failed')) {
              throw nameError; // Re-throw validation failures
            }
            console.warn('Name validation error:', nameError.message);
            registrationStatus = 'pending_review';
            validationFlags.push('name_validation_error');
          }
        }

        // 3. Name Validation (Mother Name if provided)
        let motherNameValidation = null;
        if (voterData.mother_name) {
          try {
            motherNameValidation = await nameValidationService.validateName(voterData.mother_name, 'mother_name');
            if (motherNameValidation.validationResult === 'flagged') {
              validationFlags.push('mother_name_flagged');
            }
          } catch (e) {
            // Non-blocking for mother name
          }
        }

        // 4. Name Validation (Guardian Name if provided)
        let guardianNameValidation = null;
        if (voterData.guardian_name) {
          try {
            guardianNameValidation = await nameValidationService.validateName(voterData.guardian_name, 'guardian_name');
            if (guardianNameValidation.validationResult === 'flagged') {
              validationFlags.push('guardian_name_flagged');
            }
          } catch (e) {
            // Non-blocking for guardian name
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
          'fingerprint_hash', 'face_embedding_hash',
          'normalized_address', 'address_hash', 'address_quality_score', 'name_quality_score',
          'registration_status', 'registration_source', 'geocode_latitude', 'geocode_longitude',
          'geocode_confidence', 'validation_flags'
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
          tempFaceHash,
          addressValidation?.normalized || null,
          addressValidation?.addressHash || null,
          addressValidation?.qualityScore || 1.0,
          fatherNameValidation?.qualityScore || 1.0,
          registrationStatus,
          voterData.registration_source || 'web',
          addressValidation?.geocode?.latitude || null,
          addressValidation?.geocode?.longitude || null,
          addressValidation?.geocode?.confidence || null,
          JSON.stringify(validationFlags)
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
        const voterId = result.insertId;
        
        // Create user account with password if password is provided
        if (voterData.password && voterData.email) {
          try {
            const bcrypt = require('bcryptjs');
            const passwordHash = await bcrypt.hash(voterData.password, 10);
            const username = voterData.email.split('@')[0]; // Use email prefix as username
            
            // Check if voter_id column exists in users table
            const [columns] = await connection.query(
              `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'voter_id'`
            );
            
            if (columns.length > 0) {
              // voter_id column exists - link user to voter
              await connection.query(
                `INSERT INTO users (username, email, password_hash, role, voter_id, district, state, created_at)
                 VALUES (?, ?, ?, 'citizen', ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE
                 password_hash = VALUES(password_hash),
                 role = VALUES(role),
                 voter_id = VALUES(voter_id)`,
                [username, normalizedEmail, passwordHash, voterId, voterData.district || null, voterData.state || null]
              );
            } else {
              // voter_id column doesn't exist - create without linking
              await connection.query(
                `INSERT INTO users (username, email, password_hash, role, district, state, created_at)
                 VALUES (?, ?, ?, 'citizen', ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE
                 password_hash = VALUES(password_hash),
                 role = VALUES(role)`,
                [username, normalizedEmail, passwordHash, voterData.district || null, voterData.state || null]
              );
            }
            
            console.log('✅ User account created for voter:', voterId);
          } catch (userErr) {
            // Log error but don't fail voter registration if user creation fails
            console.warn('⚠️  User account creation failed (non-critical):', userErr.message);
          }
        }
        
        await connection.commit();
        connection.release();
        
        console.log('✅ Voter created successfully with ID:', voterId);
        
        // Create review tasks if registration is pending
        if (registrationStatus === 'pending_review' && validationFlags.length > 0) {
          setImmediate(async () => {
            try {
              const taskTypes = [];
              const taskDetails = {
                validation_flags: validationFlags,
                address_quality_score: addressValidation?.qualityScore,
                name_quality_score: fatherNameValidation?.qualityScore
              };

              if (validationFlags.some(f => f.includes('address'))) {
                taskTypes.push('address_verification');
              }
              if (validationFlags.some(f => f.includes('name'))) {
                taskTypes.push('name_verification');
              }

              for (const taskType of taskTypes) {
                await reviewTaskService.createTask({
                  voter_id: voterId,
                  task_type: taskType,
                  priority: validationFlags.length > 2 ? 'high' : 'medium',
                  details: taskDetails,
                  validation_scores: {
                    address: addressValidation?.qualityScore,
                    father_name: fatherNameValidation?.qualityScore,
                    mother_name: motherNameValidation?.qualityScore,
                    guardian_name: guardianNameValidation?.qualityScore
                  },
                  flags: validationFlags
                });
              }
            } catch (err) {
              console.warn('Review task creation failed:', err.message);
            }
          });
        }

        // Log validation audit
        if (addressValidation || fatherNameValidation) {
          setImmediate(async () => {
            try {
              const validationAuditService = require('./validationAuditService');
              if (addressValidation) {
                await validationAuditService.logValidation({
                  voter_id: voterId,
                  validation_type: 'address',
                  validation_result: addressValidation.validationResult,
                  quality_scores: { address: addressValidation.qualityScore },
                  flags: addressValidation.flags
                });
              }
              if (fatherNameValidation) {
                await validationAuditService.logValidation({
                  voter_id: voterId,
                  validation_type: 'name',
                  validation_result: fatherNameValidation.validationResult,
                  quality_scores: { father_name: fatherNameValidation.qualityScore },
                  flags: fatherNameValidation.flags
                });
              }
            } catch (err) {
              console.warn('Validation audit log failed:', err.message);
            }
          });
        }
        
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
                mobile: voterData.mobile_number,
                registration_status: registrationStatus,
                validation_flags: validationFlags
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

  async getVoterByAadhaar(aadhaarNumber) {
    const connection = await pool.getConnection();
    try {
      const [voters] = await connection.query(
        `SELECT voter_id, name, email, mobile_number, aadhaar_number, dob, 
                epic_number, is_verified, polling_station, created_at
         FROM voters 
         WHERE aadhaar_number = ? 
         LIMIT 1`,
        [aadhaarNumber]
      );
      return voters[0] || null;
    } finally {
      connection.release();
    }
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

