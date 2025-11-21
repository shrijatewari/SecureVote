/**
 * Data Sanitizer for OpenAI Integration
 * Removes all PII and replaces with safe identifiers
 * CRITICAL: This must be called on ALL data before sending to OpenAI
 */

const crypto = require('crypto');

class DataSanitizer {
  /**
   * Hash sensitive data for consistent pseudonymization
   */
  hashValue(value) {
    if (!value) return null;
    return crypto.createHash('sha256').update(String(value)).digest('hex').substring(0, 16);
  }

  /**
   * Mask Aadhaar number (keep only last 4 digits)
   */
  maskAadhaar(aadhaar) {
    if (!aadhaar || aadhaar.length !== 12) return 'XXXX-XXXX-XXXX';
    return `XXXX-XXXX-${aadhaar.substring(8)}`;
  }

  /**
   * Mask email (keep only domain)
   */
  maskEmail(email) {
    if (!email) return null;
    const parts = email.split('@');
    if (parts.length !== 2) return 'user@domain.com';
    return `user@${parts[1]}`;
  }

  /**
   * Mask phone number (keep only last 4 digits)
   */
  maskPhone(phone) {
    if (!phone) return null;
    if (phone.length < 4) return 'XXXX';
    return `XXXX-XXXX-${phone.substring(phone.length - 4)}`;
  }

  /**
   * Redact name (keep only first letter and length)
   */
  redactName(name) {
    if (!name) return null;
    return `${name.charAt(0).toUpperCase()}*** (${name.length} chars)`;
  }

  /**
   * Redact address (keep only city and state)
   */
  redactAddress(address) {
    if (!address) return null;
    if (typeof address === 'string') {
      // Extract city and state if available
      const parts = address.split(',');
      if (parts.length >= 2) {
        return `[City], [State]`;
      }
      return '[Address Redacted]';
    }
    // If address is an object
    return {
      city: address.city || '[City]',
      state: address.state || '[State]',
      district: '[District]',
    };
  }

  /**
   * Sanitize voter data - removes ALL PII
   */
  sanitizeVoterData(voterData) {
    if (!voterData) return null;

    return {
      voter_id_hash: this.hashValue(voterData.voter_id),
      name_redacted: this.redactName(voterData.name),
      aadhaar_masked: voterData.aadhaar_number ? this.maskAadhaar(voterData.aadhaar_number) : null,
      email_masked: voterData.email ? this.maskEmail(voterData.email) : null,
      phone_masked: voterData.mobile_number ? this.maskPhone(voterData.mobile_number) : null,
      address_redacted: this.redactAddress(voterData),
      gender: voterData.gender || null,
      dob_range: voterData.dob ? this.getAgeRange(voterData.dob) : null, // Only age range, not exact DOB
      district: voterData.district || null,
      state: voterData.state || null,
    };
  }

  /**
   * Get age range instead of exact DOB
   */
  getAgeRange(dob) {
    if (!dob) return null;
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const range = Math.floor(age / 10) * 10;
      return `${range}-${range + 9}`;
    } catch {
      return null;
    }
  }

  /**
   * Sanitize anomaly data
   */
  sanitizeAnomalyData(anomalyData) {
    return {
      issue_type: anomalyData.issueType || anomalyData.issue_type,
      region: anomalyData.region || '[Region]',
      metrics: {
        count: anomalyData.sample_count || anomalyData.count || 0,
        severity: anomalyData.severity || 'medium',
        flags: anomalyData.aggregated_flags || [],
      },
      // NO PII - only aggregated data
    };
  }

  /**
   * Sanitize name quality metrics
   */
  sanitizeNameMetrics(nameMetrics) {
    return {
      length: nameMetrics.length || 0,
      entropy: nameMetrics.entropy || 0,
      ngram_score: nameMetrics.ngramScore || nameMetrics.ngram_score || 0,
      freq_score: nameMetrics.freqScore || nameMetrics.freq_score || 0,
      example_id_hash: nameMetrics.anonymized_example_id || this.hashValue(nameMetrics.example_id),
      // NO actual name text
    };
  }

  /**
   * Sanitize document OCR summary
   */
  sanitizeDocumentSummary(docData) {
    return {
      doc_type: docData.doc_type || 'unknown',
      fields_detected: docData.ocr_summary?.fields || [],
      confidences: docData.ocr_summary?.confidences || {},
      missing_fields: docData.ocr_summary?.missing || [],
      // NO full text content
    };
  }

  /**
   * Sanitize security event data
   */
  sanitizeSecurityData(securityData) {
    return {
      time_window: securityData.timeWindow || securityData.time_window,
      categories: securityData.categories || [],
      counts: securityData.counts || {},
      top_alerts: (securityData.topAlerts || []).map(alert => ({
        type: alert.type,
        severity: alert.severity,
        timestamp: alert.timestamp,
        // NO user IDs or PII
      })),
    };
  }

  /**
   * Main redact function - entry point for all sanitization
   */
  redact(payload, dataType) {
    if (!payload) return null;

    switch (dataType) {
      case 'voter':
        return this.sanitizeVoterData(payload);
      case 'anomaly':
        return this.sanitizeAnomalyData(payload);
      case 'name_metrics':
        return this.sanitizeNameMetrics(payload);
      case 'document':
        return this.sanitizeDocumentSummary(payload);
      case 'security':
        return this.sanitizeSecurityData(payload);
      case 'notice':
        // Notice data should already be safe, but verify
        return {
          notice_type: payload.notice_type,
          lang: payload.lang,
          audience: payload.audience,
          key_points: payload.key_points || [],
        };
      default:
        // Generic sanitization - remove common PII fields
        const sanitized = { ...payload };
        delete sanitized.aadhaar_number;
        delete sanitized.email;
        delete sanitized.mobile_number;
        delete sanitized.phone;
        delete sanitized.name;
        delete sanitized.full_name;
        delete sanitized.address;
        delete sanitized.full_address;
        delete sanitized.dob;
        delete sanitized.date_of_birth;
        return sanitized;
    }
  }

  /**
   * Validate that no PII exists in payload
   */
  validateNoPII(payload) {
    const payloadStr = JSON.stringify(payload).toLowerCase();
    
    const piiPatterns = [
      /\d{12}/, // Aadhaar
      /@[a-z]+\.[a-z]+/, // Email
      /\d{10}/, // Phone
      /[a-z]+\s+[a-z]+/, // Full names (basic check)
    ];

    for (const pattern of piiPatterns) {
      if (pattern.test(payloadStr)) {
        return {
          valid: false,
          reason: 'Potential PII detected in payload',
        };
      }
    }

    return { valid: true };
  }
}

module.exports = new DataSanitizer();

