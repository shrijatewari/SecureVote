const pool = require('../config/database');

/**
 * Name Validation Service
 * Validates parent/guardian names for quality and plausibility
 */
class NameValidationService {
  /**
   * Basic regex and token validation
   */
  validateBasicRules(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, reason: 'Name is required' };
    }

    const trimmed = name.trim();

    // Minimum length check
    if (trimmed.length < 4) {
      return { valid: false, reason: 'Name too short (minimum 4 characters)' };
    }

    // Maximum length check
    if (trimmed.length > 100) {
      return { valid: false, reason: 'Name too long (maximum 100 characters)' };
    }

    // Check for digits
    if (/\d/.test(trimmed)) {
      return { valid: false, reason: 'Name cannot contain digits' };
    }

    // Check for invalid special characters (allow hyphen, space, apostrophe, period)
    if (/[^a-zA-Z\s\.\-\']/.test(trimmed)) {
      return { valid: false, reason: 'Name contains invalid characters' };
    }

    // Split into tokens
    const tokens = trimmed.split(/\s+/).filter(t => t.length > 0);

    // Check minimum token length
    if (tokens.some(t => t.length < 2 && t !== 'I' && t !== 'A')) {
      return { valid: false, reason: 'Each name part must be at least 2 characters' };
    }

    // Check for repetition patterns (e.g., "aaaaa", "xyzxyz")
    for (const token of tokens) {
      if (token.length > 1) {
        // Check if all characters are the same
        if (/^(.)\1+$/.test(token)) {
          return { valid: false, reason: 'Name contains repeated characters' };
        }

        // Check for suspicious patterns
        const suspiciousPatterns = [
          /^asdf/i,
          /^qwerty/i,
          /^test/i,
          /^demo/i,
          /^sample/i,
          /^fake/i,
          /^dummy/i,
          /^xyz/i,
          /^abc/i
        ];

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(token)) {
            return { valid: false, reason: 'Name contains suspicious pattern' };
          }
        }
      }
    }

    return { valid: true };
  }

  /**
   * Simple Soundex implementation for phonetic matching
   */
  soundex(name) {
    const s = name.toUpperCase();
    let soundex = s[0];
    const mapping = {
      'B': '1', 'F': '1', 'P': '1', 'V': '1',
      'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
      'D': '3', 'T': '3',
      'L': '4',
      'M': '5', 'N': '5',
      'R': '6'
    };

    for (let i = 1; i < s.length && soundex.length < 4; i++) {
      const char = s[i];
      if (mapping[char] && mapping[char] !== soundex[soundex.length - 1]) {
        soundex += mapping[char];
      }
    }

    return soundex.padEnd(4, '0');
  }

  /**
   * Check phonetic sanity
   */
  checkPhoneticSanity(name) {
    const tokens = name.trim().split(/\s+/);
    
    for (const token of tokens) {
      if (token.length < 2) continue;

      // Check if token has at least one consonant
      const hasConsonant = /[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/.test(token);
      const hasVowel = /[aeiouAEIOU]/.test(token);

      if (!hasConsonant) {
        return { valid: false, reason: 'Name token lacks consonants' };
      }

      if (!hasVowel && token.length > 2) {
        return { valid: false, reason: 'Name token lacks vowels' };
      }

      // Check vowel-to-consonant ratio
      const vowelCount = (token.match(/[aeiouAEIOU]/g) || []).length;
      const consonantCount = (token.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) || []).length;
      
      if (consonantCount > 0 && vowelCount / consonantCount > 3) {
        return { valid: false, reason: 'Unbalanced vowel-consonant ratio' };
      }
    }

    return { valid: true };
  }

  /**
   * Lookup name frequency from database
   */
  async lookupNameFrequency(nameTokens, nameType = 'first_name') {
    const connection = await pool.getConnection();
    try {
      let totalScore = 0;
      let foundCount = 0;

      for (const token of nameTokens) {
        const [rows] = await connection.query(
          'SELECT frequency_score FROM name_frequency_lookup WHERE name_token = ? AND name_type = ?',
          [token.toLowerCase(), nameType]
        );

        if (rows.length > 0) {
          totalScore += rows[0].frequency_score;
          foundCount++;
        }
      }

      if (nameTokens.length === 0) return 0.0;

      // Average score weighted by found tokens
      const avgScore = foundCount > 0 ? totalScore / nameTokens.length : 0.0;
      
      // Bonus for finding tokens in database
      const foundRatio = foundCount / nameTokens.length;
      
      return Math.min(avgScore * 0.7 + foundRatio * 0.3, 1.0);
    } finally {
      connection.release();
    }
  }

  /**
   * Calculate name quality score
   */
  async calculateQualityScore(name, nameType = 'first_name') {
    // Start with basic validation
    const basicCheck = this.validateBasicRules(name);
    if (!basicCheck.valid) {
      return {
        score: 0.0,
        valid: false,
        reason: basicCheck.reason,
        flags: ['basic_validation_failed']
      };
    }

    const tokens = name.trim().split(/\s+/).filter(t => t.length > 0);
    let score = 1.0;
    const flags = [];

    // Length score (20%)
    const lengthScore = Math.min(name.length / 20, 1.0) * 0.2;
    score = score * 0.8 + lengthScore;

    // Token count score (15%)
    const tokenCountScore = Math.min(tokens.length / 3, 1.0) * 0.15;
    score = score * 0.85 + tokenCountScore;

    // Phonetic sanity (15%)
    const phoneticCheck = this.checkPhoneticSanity(name);
    if (!phoneticCheck.valid) {
      score *= 0.5;
      flags.push('phonetic_issues');
    }

    // Dictionary/frequency lookup (30%)
    const frequencyScore = await this.lookupNameFrequency(tokens, nameType);
    score = score * 0.7 + frequencyScore * 0.3;

    // Character distribution (10%)
    const uniqueChars = new Set(name.toLowerCase().replace(/\s/g, '')).size;
    const charDiversityScore = Math.min(uniqueChars / 10, 1.0) * 0.1;
    score = score * 0.9 + charDiversityScore;

    // Check for common patterns (10%)
    const commonPatterns = [
      /^[A-Z]\.\s/, // Initials like "A. Kumar"
      /\s[A-Z]\.$/, // Last initial
    ];
    
    let patternScore = 0.1;
    for (const pattern of commonPatterns) {
      if (pattern.test(name)) {
        patternScore = 0.1; // Valid pattern
        break;
      }
    }
    score = score * 0.9 + patternScore;

    // Final score normalization
    const finalScore = Math.max(0.0, Math.min(1.0, score));

    // Determine flags
    if (finalScore < 0.4) {
      flags.push('low_quality');
    } else if (finalScore < 0.7) {
      flags.push('medium_quality');
    }

    return {
      score: parseFloat(finalScore.toFixed(2)),
      valid: finalScore >= 0.4,
      flags,
      tokens,
      soundex: this.soundex(tokens[0] || '')
    };
  }

  /**
   * Validate name with full pipeline
   */
  async validateName(name, nameType = 'first_name') {
    const result = await this.calculateQualityScore(name, nameType);
    
    return {
      name,
      normalized: name.trim(),
      qualityScore: result.score,
      valid: result.valid,
      flags: result.flags,
      reason: result.reason,
      soundex: result.soundex,
      tokens: result.tokens,
      validationResult: result.score >= 0.8 ? 'passed' : 
                       result.score >= 0.5 ? 'flagged' : 'rejected'
    };
  }
}

module.exports = new NameValidationService();

