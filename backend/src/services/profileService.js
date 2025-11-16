const pool = require('../config/database');
const crypto = require('crypto');

/**
 * Profile Service
 * Handles comprehensive profile updates and completion tracking
 */
class ProfileService {
  /**
   * Calculate profile completion percentage
   */
  async calculateCompletion(voterId) {
    const connection = await pool.getConnection();
    try {
      const [voter] = await connection.query(
        'SELECT * FROM voters WHERE voter_id = ?',
        [voterId]
      );

      if (!voter[0]) {
        throw new Error('Voter not found');
      }

      const v = voter[0];
      let completed = 0;
      let total = 0;

      // Personal Details (20%)
      total += 5;
      if (v.name) completed++;
      if (v.gender) completed++;
      if (v.dob) completed++;
      if (v.father_name) completed++;
      if (v.profile_photo_url) completed++;

      // Contact Details (15%)
      total += 3;
      if (v.mobile_number) completed++;
      if (v.email) completed++;
      if (v.mobile_verified || v.email_verified) completed++;

      // Address Details (20%)
      total += 5;
      if (v.house_number || v.street) completed++;
      if (v.village_city) completed++;
      if (v.district) completed++;
      if (v.state) completed++;
      if (v.pin_code) completed++;

      // Identification (15%)
      total += 3;
      if (v.aadhaar_number) completed++;
      if (v.pan_number || v.driving_license_number || v.passport_number) completed++;
      if (v.epic_number) completed++;

      // Demographics (10%)
      total += 2;
      if (v.education_level) completed++;
      if (v.occupation) completed++;

      // Biometrics (10%)
      total += 2;
      if (v.biometric_hash) completed++;
      if (v.is_verified) completed++;

      // Documents (10%)
      total += 2;
      if (v.address_proof_url) completed++;
      if (v.address_verified) completed++;

      const percentage = Math.round((completed / total) * 100);

      // Update completion percentage
      await connection.query(
        'UPDATE voters SET profile_completion_percentage = ?, profile_last_updated = NOW() WHERE voter_id = ?',
        [percentage, voterId]
      );

      return percentage;
    } finally {
      connection.release();
    }
  }

  /**
   * Get profile completion status
   */
  async getCompletionStatus(voterId) {
    const connection = await pool.getConnection();
    try {
      const [voter] = await connection.query(
        'SELECT profile_completion_percentage, kyc_status FROM voters WHERE voter_id = ?',
        [voterId]
      );

      if (!voter[0]) {
        throw new Error('Voter not found');
      }

      const [checkpoints] = await connection.query(
        'SELECT checkpoint_type, is_completed FROM profile_verification_checkpoints WHERE voter_id = ?',
        [voterId]
      );

      const checkpointMap = {};
      checkpoints.forEach(cp => {
        checkpointMap[cp.checkpoint_type] = cp.is_completed;
      });

      return {
        completionPercentage: voter[0].profile_completion_percentage || 0,
        kycStatus: voter[0].kyc_status || 'pending',
        checkpoints: {
          aadhaar_otp: checkpointMap['aadhaar_otp'] || false,
          email_otp: checkpointMap['email_otp'] || false,
          mobile_otp: checkpointMap['mobile_otp'] || false,
          address_doc: checkpointMap['address_doc'] || false,
          personal_info: checkpointMap['personal_info'] || false,
          biometrics: checkpointMap['biometrics'] || false,
          family_linking: checkpointMap['family_linking'] || false,
        }
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Update profile
   */
  async updateProfile(voterId, profileData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get current values for history
      const [current] = await connection.query(
        'SELECT * FROM voters WHERE voter_id = ?',
        [voterId]
      );

      if (!current[0]) {
        throw new Error('Voter not found');
      }

      const currentVoter = current[0];
      const fieldsToUpdate = [];
      const values = [];
      const historyEntries = [];

      // Build update query dynamically - ALL FIELDS
      const allowedFields = [
        // Personal Information
        'name', 'gender', 'dob', 'father_name', 'mother_name', 'guardian_name',
        'marital_status', 'spouse_name', 'profile_photo_url', 'signature_url', 'preferred_language',
        // Contact Information
        'mobile_number', 'email', 'alternate_mobile', 'emergency_contact_number',
        // Address Details
        'house_number', 'street', 'village_city', 'district', 'state', 'pin_code', 'taluka',
        'permanent_house_number', 'permanent_street', 'permanent_village_city', 'permanent_district',
        'permanent_taluka', 'permanent_state', 'permanent_pin_code',
        'gis_latitude', 'gis_longitude', 'same_as_aadhaar_address', 'same_as_permanent_address',
        // Identification
        'pan_number', 'ration_card_number', 'driving_license_number', 'passport_number', 'aadhaar_qr_url',
        // Demographic
        'education_level', 'occupation', 'disability_status', 'disability_type', 'disability_certificate_url',
        'income_range', 'special_category', 'caste_community', 'minority_status',
        // Family & Household
        'head_of_family', 'household_size', 'household_type',
        // Voter-Specific
        'is_first_time_voter', 'is_migrant_worker', 'is_nri', 'preferred_polling_station_id',
        'needs_disability_assistance', 'needs_braille_ballot',
        // Documents
        'address_proof_url', 'aadhaar_copy_url', 'birth_certificate_url', 'marriage_certificate_url', 'affidavit_url',
        // Biometric
        'face_embedding_hash', 'biometric_reverification_date', 'liveness_check_passed',
        // NRI-Specific
        'country_of_residence', 'foreign_address', 'embassy_jurisdiction', 'visa_type', 'oci_pio_status',
        // Security
        'two_factor_enabled', 'security_question_1', 'security_answer_1', 'security_question_2', 'security_answer_2',
        // Notifications
        'receive_sms_updates', 'receive_email_updates', 'receive_election_reminders',
        'receive_booth_change_alerts', 'receive_grievance_alerts',
        // Consent
        'consent_indian_citizen', 'consent_details_correct', 'consent_biometric_verification',
        'consent_residency_confirmed', 'consent_eci_matching', 'consent_date'
      ];

      // Date fields that need format conversion (ISO datetime -> DATE)
      const dateFields = ['dob', 'biometric_reverification_date', 'consent_date'];
      
      // Helper function to convert any date format to YYYY-MM-DD
      const convertToDateString = (value) => {
        if (!value) return value;
        
        try {
          // If already in YYYY-MM-DD format, return as is
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
          }
          
          // Try to parse as Date object
          const dateObj = new Date(value);
          if (!isNaN(dateObj.getTime())) {
            // Format as YYYY-MM-DD
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        } catch (e) {
          console.warn(`Failed to parse date value: ${value}`, e);
        }
        
        return value; // Return original if conversion fails
      };
      
      for (const field of allowedFields) {
        if (profileData[field] !== undefined) {
          const oldValue = currentVoter[field];
          let newValue = profileData[field];
          
          // Convert ISO datetime strings to DATE format (YYYY-MM-DD) for date fields
          if (dateFields.includes(field) && newValue) {
            newValue = convertToDateString(newValue);
            console.log(`Converted ${field} from ${profileData[field]} to ${newValue}`);
          }

          if (oldValue !== newValue) {
            fieldsToUpdate.push(`${field} = ?`);
            values.push(newValue);
            historyEntries.push({
              field_name: field,
              old_value: oldValue,
              new_value: newValue
            });
          }
        }
      }

      if (fieldsToUpdate.length > 0) {
        values.push(voterId);
        await connection.query(
          `UPDATE voters SET ${fieldsToUpdate.join(', ')}, profile_last_updated = NOW() WHERE voter_id = ?`,
          values
        );

        // Save history
        for (const entry of historyEntries) {
          await connection.query(
            `INSERT INTO profile_update_history (voter_id, field_name, old_value, new_value, update_reason)
             VALUES (?, ?, ?, ?, ?)`,
            [voterId, entry.field_name, entry.old_value, entry.new_value, 'User update']
          );
        }
      }

      // Update completion percentage
      await this.calculateCompletion(voterId);

      // Update personal_info checkpoint if basic fields are complete
      const [updated] = await connection.query(
        'SELECT name, gender, dob, father_name FROM voters WHERE voter_id = ?',
        [voterId]
      );
      if (updated[0].name && updated[0].gender && updated[0].dob && updated[0].father_name) {
        await this.updateCheckpoint(voterId, 'personal_info', true);
      }

      await connection.commit();

      return await this.getProfile(voterId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get full profile
   */
  async getProfile(voterId) {
    const connection = await pool.getConnection();
    try {
      const [voters] = await connection.query(
        'SELECT * FROM voters WHERE voter_id = ?',
        [voterId]
      );

      if (!voters[0]) {
        throw new Error('Voter not found');
      }

      return voters[0];
    } finally {
      connection.release();
    }
  }

  /**
   * Update verification checkpoint
   */
  async updateCheckpoint(voterId, checkpointType, isCompleted, remarks = null) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `INSERT INTO profile_verification_checkpoints 
         (voter_id, checkpoint_type, is_completed, completed_at, remarks)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         is_completed = VALUES(is_completed),
         completed_at = IF(VALUES(is_completed) = TRUE, NOW(), completed_at),
         remarks = VALUES(remarks)`,
        [voterId, checkpointType, isCompleted, isCompleted ? new Date() : null, remarks]
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Verify mobile/email
   */
  async verifyContact(voterId, type, verified) {
    const connection = await pool.getConnection();
    try {
      const field = type === 'mobile' ? 'mobile_verified' : 'email_verified';
      await connection.query(
        `UPDATE voters SET ${field} = ? WHERE voter_id = ?`,
        [verified, voterId]
      );

      const checkpointType = type === 'mobile' ? 'mobile_otp' : 'email_otp';
      await this.updateCheckpoint(voterId, checkpointType, verified);
    } finally {
      connection.release();
    }
  }

  /**
   * Add family relation
   */
  async addFamilyRelation(voterId, relationData) {
    const connection = await pool.getConnection();
    try {
      // Check if related voter exists by Aadhaar
      let relatedVoterId = null;
      if (relationData.related_aadhaar) {
        const [related] = await connection.query(
          'SELECT voter_id FROM voters WHERE aadhaar_number = ?',
          [relationData.related_aadhaar]
        );
        if (related.length > 0) {
          relatedVoterId = related[0].voter_id;
        }
      }

      const [result] = await connection.query(
        `INSERT INTO family_relations 
         (voter_id, related_voter_id, relation_type, related_aadhaar, related_name)
         VALUES (?, ?, ?, ?, ?)`,
        [
          voterId,
          relatedVoterId,
          relationData.relation_type,
          relationData.related_aadhaar || null,
          relationData.related_name || null
        ]
      );

      // Update checkpoint
      await this.updateCheckpoint(voterId, 'family_linking', true);

      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * Get family relations
   */
  async getFamilyRelations(voterId) {
    const connection = await pool.getConnection();
    try {
      const [relations] = await connection.query(
        `SELECT fr.*, v.name as related_voter_name, v.aadhaar_number as related_voter_aadhaar
         FROM family_relations fr
         LEFT JOIN voters v ON fr.related_voter_id = v.voter_id
         WHERE fr.voter_id = ?
         ORDER BY fr.created_at DESC`,
        [voterId]
      );

      return relations;
    } finally {
      connection.release();
    }
  }

  /**
   * Remove family relation
   */
  async removeFamilyRelation(relationId) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'DELETE FROM family_relations WHERE relation_id = ?',
        [relationId]
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Mock DigiLocker import
   */
  async importFromDigiLocker(voterId, aadhaarNumber) {
    const connection = await pool.getConnection();
    try {
      // This is a mock implementation
      // In real system, this would call DigiLocker API
      const mockData = {
        name: 'Rajesh Kumar',
        dob: '1990-05-15',
        gender: 'male',
        father_name: 'Suresh Kumar',
        mother_name: 'Priya Kumar',
        pan_number: 'ABCDE1234F',
        driving_license_number: 'DL-01-2020-1234567',
        passport_number: 'A12345678',
        ration_card_number: 'RC123456789',
        house_number: '123',
        street: 'MG Road',
        village_city: 'Bangalore',
        district: 'Bangalore Urban',
        state: 'Karnataka',
        pin_code: '560001',
        education_level: 'Graduate',
        occupation: 'Software Engineer',
        marital_status: 'Married',
        spouse_name: 'Sunita Kumar'
      };

      // Actually update the voter profile with mock data
      const updateFields = [];
      const updateValues = [];
      
      // Map mock data to database fields
      if (mockData.name) {
        updateFields.push('name = ?');
        updateValues.push(mockData.name);
      }
      if (mockData.dob) {
        updateFields.push('dob = ?');
        updateValues.push(mockData.dob);
      }
      if (mockData.gender) {
        updateFields.push('gender = ?');
        updateValues.push(mockData.gender);
      }
      if (mockData.father_name) {
        updateFields.push('father_name = ?');
        updateValues.push(mockData.father_name);
      }
      if (mockData.mother_name) {
        updateFields.push('mother_name = ?');
        updateValues.push(mockData.mother_name);
      }
      if (mockData.pan_number) {
        updateFields.push('pan_number = ?');
        updateValues.push(mockData.pan_number);
      }
      if (mockData.driving_license_number) {
        updateFields.push('driving_license_number = ?');
        updateValues.push(mockData.driving_license_number);
      }
      if (mockData.passport_number) {
        updateFields.push('passport_number = ?');
        updateValues.push(mockData.passport_number);
      }
      if (mockData.ration_card_number) {
        updateFields.push('ration_card_number = ?');
        updateValues.push(mockData.ration_card_number);
      }
      if (mockData.house_number) {
        updateFields.push('house_number = ?');
        updateValues.push(mockData.house_number);
      }
      if (mockData.street) {
        updateFields.push('street = ?');
        updateValues.push(mockData.street);
      }
      if (mockData.village_city) {
        updateFields.push('village_city = ?');
        updateValues.push(mockData.village_city);
      }
      if (mockData.district) {
        updateFields.push('district = ?');
        updateValues.push(mockData.district);
      }
      if (mockData.state) {
        updateFields.push('state = ?');
        updateValues.push(mockData.state);
      }
      if (mockData.pin_code) {
        updateFields.push('pin_code = ?');
        updateValues.push(mockData.pin_code);
      }
      if (mockData.education_level) {
        updateFields.push('education_level = ?');
        updateValues.push(mockData.education_level);
      }
      if (mockData.occupation) {
        updateFields.push('occupation = ?');
        updateValues.push(mockData.occupation);
      }
      if (mockData.marital_status) {
        updateFields.push('marital_status = ?');
        updateValues.push(mockData.marital_status);
      }
      if (mockData.spouse_name) {
        updateFields.push('spouse_name = ?');
        updateValues.push(mockData.spouse_name);
      }

      if (updateFields.length > 0) {
        updateValues.push(voterId);
        await connection.query(
          `UPDATE voters SET ${updateFields.join(', ')}, profile_last_updated = NOW() WHERE voter_id = ?`,
          updateValues
        );
        
        // Log audit event
        setImmediate(async () => {
          try {
            const auditService = require('./auditLogService');
            await auditService.logAction({
              action_type: 'profile_updated',
              entity_type: 'voter',
              entity_id: voterId,
              actor_id: voterId,
              metadata: JSON.stringify({
                source: 'digilocker_import',
                fields_updated: updateFields.length
              })
            });
          } catch (err) {
            console.warn('Audit log failed:', err.message);
          }
        });
      }

      // Recalculate completion percentage
      await this.calculateCompletion(voterId);

      return {
        ...mockData,
        message: 'Data successfully imported from DigiLocker',
        fields_updated: updateFields.length
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = new ProfileService();

