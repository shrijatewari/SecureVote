const pool = require('../config/database');
const { validateNameAdvanced } = require('../utils/nameValidationAdvanced');
const { isInDictionary, fuzzyMatch } = require('../utils/indianNamesDictionary');

/**
 * Name Validation Service
 * Validates parent/guardian names for quality and plausibility
 * Uses multi-layer validation: structural rules, dictionary checks, n-gram models, entropy detection
 */
class NameValidationService {
  /**
   * Basic regex and token validation (Enhanced with advanced checks)
   */
  validateBasicRules(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, reason: 'Name is required' };
    }

    const trimmed = name.trim();

    // Minimum length check
    if (trimmed.length < 3) {
      return { valid: false, reason: 'Name too short (minimum 3 characters)' };
    }

    // Maximum length check
    if (trimmed.length > 50) {
      return { valid: false, reason: 'Name too long (maximum 50 characters)' };
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
        if (/^(.)\1{3,}$/.test(token)) {
          return { valid: false, reason: 'Name contains excessive repeated characters' };
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
        
        // Enhanced: Check for random-looking strings (like "dfojgoidf")
        // If token has no vowels and length > 3, reject
        if (!/[aeiouAEIOU]/.test(token) && token.length > 3) {
          return { valid: false, reason: 'Name contains invalid pattern (no vowels detected)' };
        }
        
        // Check for excessive consonant clusters
        if (/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{4,}/.test(token)) {
          return { valid: false, reason: 'Name contains invalid consonant sequence' };
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
   * Check phonetic sanity - Enhanced to detect random character strings
   */
  checkPhoneticSanity(name) {
    const tokens = name.trim().split(/\s+/);
    
    for (const token of tokens) {
      if (token.length < 2) continue;

      const lowerToken = token.toLowerCase();
      
      // Check if token has at least one consonant
      const hasConsonant = /[bcdfghjklmnpqrstvwxyz]/.test(lowerToken);
      const hasVowel = /[aeiou]/.test(lowerToken);

      if (!hasConsonant) {
        return { valid: false, reason: 'Name token lacks consonants' };
      }

      // CRITICAL: Names without vowels are almost always invalid (except very short ones)
      if (!hasVowel && token.length > 3) {
        return { valid: false, reason: 'Name contains invalid pattern (no vowels)' };
      }

      // Check vowel-to-consonant ratio
      const vowelCount = (lowerToken.match(/[aeiou]/g) || []).length;
      const consonantCount = (lowerToken.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
      
      // If too many consonants relative to vowels, likely invalid
      if (consonantCount > 0 && vowelCount === 0 && token.length > 3) {
        return { valid: false, reason: 'Name contains invalid pattern (no vowels)' };
      }
      
      // Check for excessive consonant clusters (more than 3 consecutive consonants)
      if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(token)) {
        return { valid: false, reason: 'Name contains invalid consonant cluster' };
      }
      
      // Check vowel-to-consonant ratio - too many consonants is suspicious
      if (consonantCount > 0 && vowelCount / consonantCount < 0.2 && token.length > 4) {
        return { valid: false, reason: 'Name has too many consonants (likely invalid)' };
      }
      
      // Check for keyboard patterns (qwerty, asdf, etc.)
      const keyboardPatterns = [
        /^[qwerty]+$/i,
        /^[asdf]+$/i,
        /^[zxcv]+$/i,
        /^[hjkl]+$/i,
        /^[uiop]+$/i,
        /^[bnm]+$/i
      ];
      
      for (const pattern of keyboardPatterns) {
        if (pattern.test(token)) {
          return { valid: false, reason: 'Name contains keyboard pattern (invalid)' };
        }
      }
      
      // Check for random character patterns (like "dfojgoidf")
      // Detect if characters are too random (high entropy but no valid structure)
      if (token.length > 5) {
        const charFrequency = {};
        for (const char of lowerToken) {
          charFrequency[char] = (charFrequency[char] || 0) + 1;
        }
        
        // If no character appears more than once and length > 5, suspicious
        const maxFreq = Math.max(...Object.values(charFrequency));
        if (maxFreq === 1 && token.length > 6) {
          return { valid: false, reason: 'Name appears to be random characters' };
        }
        
        // Check for alternating consonant-vowel patterns that are too regular (suspicious)
        const pattern = lowerToken.split('').map(c => /[aeiou]/.test(c) ? 'V' : 'C').join('');
        if (pattern.length > 6 && /^(VC){3,}$|^(CV){3,}$/.test(pattern)) {
          // This might be valid, but check if it looks like a real name
          // If it's all unique characters in a pattern, suspicious
          if (new Set(lowerToken).size === lowerToken.length) {
            return { valid: false, reason: 'Name pattern appears artificial' };
          }
        }
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
   * Calculate name quality score (Enhanced with advanced validation)
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

    // Run advanced validation
    const advancedCheck = validateNameAdvanced(name, { strict: true });
    if (!advancedCheck.valid) {
      return {
        score: advancedCheck.score,
        valid: false,
        reason: advancedCheck.reason || 'Name failed advanced validation',
        flags: ['advanced_validation_failed'],
        dictionaryMatches: advancedCheck.dictionaryMatches,
        fuzzyMatches: advancedCheck.fuzzyMatches,
        entropy: advancedCheck.entropy,
        ngramScore: advancedCheck.ngramScore
      };
    }

    const tokens = name.trim().split(/\s+/).filter(t => t.length > 0);
    let score = advancedCheck.score; // Start with advanced validation score
    const flags = [];

    // Dictionary check boost (if not already counted)
    let dictionaryScore = 0;
    let fuzzyScore = 0;
    for (const token of tokens) {
      if (isInDictionary(token)) {
        dictionaryScore += 1.0;
      } else if (fuzzyMatch(token, 0.85)) {
        fuzzyScore += 0.8;
      }
    }
    
    if (tokens.length > 0) {
      const dictAvg = (dictionaryScore + fuzzyScore) / tokens.length;
      score = score * 0.7 + dictAvg * 0.3;
    }

    // Phonetic sanity (15%)
    const phoneticCheck = this.checkPhoneticSanity(name);
    if (!phoneticCheck.valid) {
      score *= 0.5;
      flags.push('phonetic_issues');
    }

    // Dictionary/frequency lookup (20%)
    const frequencyScore = await this.lookupNameFrequency(tokens, nameType);
    score = score * 0.8 + frequencyScore * 0.2;

    // Character distribution (10%)
    const uniqueChars = new Set(name.toLowerCase().replace(/\s/g, '')).size;
    const charDiversityScore = Math.min(uniqueChars / 10, 1.0) * 0.1;
    score = score * 0.9 + charDiversityScore;

    // Check for common patterns (5%)
    const commonPatterns = [
      /^[A-Z]\.\s/, // Initials like "A. Kumar"
      /\s[A-Z]\.$/, // Last initial
    ];
    
    let patternScore = 0.05;
    for (const pattern of commonPatterns) {
      if (pattern.test(name)) {
        patternScore = 0.05; // Valid pattern
        break;
      }
    }
    score = score * 0.95 + patternScore;

    // Final score normalization
    const finalScore = Math.max(0.0, Math.min(1.0, score));

    // Determine flags
    if (finalScore < 0.5) {
      flags.push('low_quality');
    } else if (finalScore < 0.7) {
      flags.push('medium_quality');
    }

    return {
      score: parseFloat(finalScore.toFixed(2)),
      valid: finalScore >= 0.5,
      flags,
      tokens,
      soundex: this.soundex(tokens[0] || ''),
      dictionaryMatches: advancedCheck.dictionaryMatches,
      fuzzyMatches: advancedCheck.fuzzyMatches,
      entropy: advancedCheck.entropy,
      ngramScore: advancedCheck.ngramScore
    };
  }

  /**
   * Validate name with full pipeline (Enhanced with advanced validation)
   */
  async validateName(name, nameType = 'first_name', options = {}) {
    // First run basic validation
    const basicCheck = this.validateBasicRules(name);
    if (!basicCheck.valid) {
      return {
        name,
        normalized: name.trim(),
        qualityScore: 0.0,
        valid: false,
        flags: ['basic_validation_failed'],
        reason: basicCheck.reason,
        soundex: null,
        tokens: [],
        validationResult: 'rejected',
        dictionaryMatches: 0,
        fuzzyMatches: 0,
        entropy: 0,
        ngramScore: 0
      };
    }

    // Run advanced validation
    const advancedCheck = validateNameAdvanced(name, { strict: options.strict !== false });
    if (!advancedCheck.valid) {
      return {
        name,
        normalized: name.trim(),
        qualityScore: advancedCheck.score,
        valid: false,
        flags: ['advanced_validation_failed'],
        reason: advancedCheck.reason || 'Name failed advanced validation checks',
        soundex: this.soundex(name.trim().split(/\s+/)[0] || ''),
        tokens: name.trim().split(/\s+/).filter(t => t.length > 0),
        validationResult: 'rejected',
        dictionaryMatches: advancedCheck.dictionaryMatches,
        fuzzyMatches: advancedCheck.fuzzyMatches,
        entropy: advancedCheck.entropy,
        ngramScore: advancedCheck.ngramScore
      };
    }

    // Run quality score calculation (includes dictionary lookup)
    const result = await this.calculateQualityScore(name, nameType);
    
    // Determine validation result
    let validationResult = 'rejected';
    if (result.score >= 0.7) {
      validationResult = 'passed';
    } else if (result.score >= 0.5) {
      validationResult = 'flagged';
    }
    
    return {
      name,
      normalized: name.trim(),
      qualityScore: result.score,
      valid: result.valid && validationResult !== 'rejected',
      flags: result.flags,
      reason: result.reason,
      soundex: result.soundex,
      tokens: result.tokens,
      validationResult,
      dictionaryMatches: result.dictionaryMatches || advancedCheck.dictionaryMatches,
      fuzzyMatches: result.fuzzyMatches || advancedCheck.fuzzyMatches,
      entropy: result.entropy || advancedCheck.entropy,
      ngramScore: result.ngramScore || advancedCheck.ngramScore
    };
  }
}

module.exports = new NameValidationService();

