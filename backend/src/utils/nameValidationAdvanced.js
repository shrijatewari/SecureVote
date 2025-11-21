/**
 * Advanced Name Validation Utilities
 * Implements production-grade name validation using multiple detection methods
 */

const { isInDictionary, fuzzyMatch, calculateSimilarity } = require('./indianNamesDictionary');

/**
 * Calculate Shannon Entropy of a string
 * High entropy = random, Low entropy = repetitive
 */
function calculateEntropy(str) {
  const len = str.length;
  if (len === 0) return 0;
  
  const freq = {};
  for (const char of str.toLowerCase()) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const probability = count / len;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}

/**
 * Check for repeated characters (e.g., "aaaaa", "qqqqq")
 */
function hasExcessiveRepetition(str, maxRepeat = 3) {
  return /([a-zA-Z])\1{3,}/.test(str);
}

/**
 * Check for keyboard patterns (e.g., "qwerty", "asdf")
 */
function isKeyboardPattern(str) {
  const keyboardRows = [
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
    'qwerty',
    'asdf',
    'hjkl',
    'zxcv'
  ];
  
  const lowerStr = str.toLowerCase();
  for (const row of keyboardRows) {
    if (lowerStr.includes(row) && row.length >= 4) {
      return true;
    }
  }
  
  return false;
}

/**
 * N-gram probability model for Indian names
 * Common n-grams in Indian names have higher probability
 */
function calculateNgramScore(str) {
  const commonBigrams = [
    'ra', 'ka', 'na', 'sh', 'ti', 'je', 'vi', 'in', 'ku', 'pr',
    'ma', 'la', 'ga', 'ha', 'pa', 'sa', 'ta', 'va', 'ya', 'da',
    'ba', 'ja', 'wa', 'fa', 'za', 'xa', 'ca', 'qa', 'ea', 'oa'
  ];
  
  const commonTrigrams = [
    'ind', 'kum', 'pri', 'mal', 'raj', 'ram', 'shy', 'krish', 'vish',
    'gan', 'han', 'lak', 'bha', 'dev', 'nar', 'vas', 'yash', 'moh',
    'rav', 'amit', 'anil', 'arju', 'deep', 'gau', 'hars', 'isha', 'jaya'
  ];
  
  const lowerStr = str.toLowerCase().replace(/[^a-z]/g, '');
  if (lowerStr.length < 2) return 0;
  
  let bigramScore = 0;
  let trigramScore = 0;
  let bigramCount = 0;
  let trigramCount = 0;
  
  // Check bigrams
  for (let i = 0; i < lowerStr.length - 1; i++) {
    const bigram = lowerStr.substring(i, i + 2);
    bigramCount++;
    if (commonBigrams.includes(bigram)) {
      bigramScore++;
    }
  }
  
  // Check trigrams
  for (let i = 0; i < lowerStr.length - 2; i++) {
    const trigram = lowerStr.substring(i, i + 3);
    trigramCount++;
    if (commonTrigrams.some(t => trigram.includes(t) || t.includes(trigram))) {
      trigramScore++;
    }
  }
  
  const bigramRatio = bigramCount > 0 ? bigramScore / bigramCount : 0;
  const trigramRatio = trigramCount > 0 ? trigramScore / trigramCount : 0;
  
  return (bigramRatio * 0.6 + trigramRatio * 0.4);
}

/**
 * Detect if string is likely a valid Indian name based on character patterns
 */
function hasValidIndianPattern(str) {
  const lowerStr = str.toLowerCase();
  
  // Common Indian name patterns
  const validPatterns = [
    /^[a-z]{2,15}$/, // Simple name
    /^[a-z]+\s+[a-z]+$/, // First Last
    /^[a-z]+\s+[a-z]+\s+[a-z]+$/, // First Middle Last
    /^[a-z]\.\s+[a-z]+$/, // Initial Last (A. Kumar)
  ];
  
  // Check if matches valid pattern
  const matchesPattern = validPatterns.some(pattern => pattern.test(lowerStr.trim()));
  
  if (!matchesPattern) return false;
  
  // Check for valid character distribution
  const vowels = (lowerStr.match(/[aeiou]/g) || []).length;
  const consonants = (lowerStr.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
  
  // Valid names should have reasonable vowel-consonant ratio
  if (consonants > 0 && vowels / consonants < 0.1) return false;
  if (vowels === 0 && lowerStr.length > 3) return false;
  
  return true;
}

/**
 * Check if name contains suspicious patterns
 */
function hasSuspiciousPatterns(str) {
  const lowerStr = str.toLowerCase();
  
  // Suspicious patterns
  const suspicious = [
    /^test/i,
    /^demo/i,
    /^sample/i,
    /^fake/i,
    /^dummy/i,
    /^xyz/i,
    /^abc/i,
    /^123/i,
    /test$/i,
    /demo$/i,
    /sample$/i,
    /fake$/i,
    /dummy$/i,
    /xyz$/i,
    /abc$/i,
    /123$/i
  ];
  
  return suspicious.some(pattern => pattern.test(lowerStr));
}

/**
 * Comprehensive name validation using all methods
 */
function validateNameAdvanced(name, options = {}) {
  if (!name || typeof name !== 'string') {
    return { valid: false, reason: 'Name is required', score: 0 };
  }
  
  const trimmed = name.trim();
  const tokens = trimmed.split(/\s+/).filter(t => t.length > 0);
  
  // 1. Basic length check
  if (trimmed.length < 3) {
    return { valid: false, reason: 'Name too short (minimum 3 characters)', score: 0 };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, reason: 'Name too long (maximum 50 characters)', score: 0 };
  }
  
  // 2. Check for invalid characters
  if (!/^[A-Za-z\s\.\-\']+$/.test(trimmed)) {
    return { valid: false, reason: 'Name contains invalid characters', score: 0 };
  }
  
  // 3. Check for numbers
  if (/\d/.test(trimmed)) {
    return { valid: false, reason: 'Name cannot contain digits', score: 0 };
  }
  
  // 4. Check for excessive repetition
  if (hasExcessiveRepetition(trimmed)) {
    return { valid: false, reason: 'Name contains excessive repeated characters', score: 0 };
  }
  
  // 5. Check for keyboard patterns
  if (isKeyboardPattern(trimmed)) {
    return { valid: false, reason: 'Name contains keyboard pattern', score: 0 };
  }
  
  // 6. Check for suspicious patterns
  if (hasSuspiciousPatterns(trimmed)) {
    return { valid: false, reason: 'Name contains suspicious pattern', score: 0 };
  }
  
  // 7. Entropy check
  const entropy = calculateEntropy(trimmed.replace(/\s/g, ''));
  if (entropy < 2.0) {
    return { valid: false, reason: 'Name is too repetitive', score: 0 };
  }
  if (entropy > 4.5) {
    return { valid: false, reason: 'Name appears to be random characters', score: 0 };
  }
  
  // 8. Check each token
  let dictionaryMatches = 0;
  let fuzzyMatches = 0;
  let totalScore = 0;
  
  for (const token of tokens) {
    if (token.length < 2) continue;
    
    // Check vowels
    const hasVowel = /[aeiou]/.test(token.toLowerCase());
    if (!hasVowel && token.length > 3) {
      return { valid: false, reason: `Token "${token}" has no vowels`, score: 0 };
    }
    
    // Check consonant clusters
    if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(token)) {
      return { valid: false, reason: `Token "${token}" has excessive consonant cluster`, score: 0 };
    }
    
    // Dictionary check
    if (isInDictionary(token)) {
      dictionaryMatches++;
      totalScore += 1.0;
    } else if (fuzzyMatch(token, 0.85)) {
      fuzzyMatches++;
      totalScore += 0.8;
    } else {
      // N-gram score
      const ngramScore = calculateNgramScore(token);
      totalScore += ngramScore * 0.6;
      
      // Pattern check
      if (hasValidIndianPattern(token)) {
        totalScore += 0.3;
      }
    }
  }
  
  // Calculate final score
  const avgScore = tokens.length > 0 ? totalScore / tokens.length : 0;
  const finalScore = Math.min(avgScore, 1.0);
  
  // Decision threshold
  const threshold = options.strict ? 0.7 : 0.5;
  const isValid = finalScore >= threshold;
  
  // Build reason if invalid
  let reason = null;
  if (!isValid) {
    if (dictionaryMatches === 0 && fuzzyMatches === 0) {
      reason = 'Name does not match known Indian name patterns';
    } else if (finalScore < threshold) {
      reason = 'Name has low similarity to valid Indian names';
    }
  }
  
  return {
    valid: isValid,
    reason: reason,
    score: finalScore,
    dictionaryMatches,
    fuzzyMatches,
    entropy,
    ngramScore: calculateNgramScore(trimmed)
  };
}

module.exports = {
  validateNameAdvanced,
  calculateEntropy,
  hasExcessiveRepetition,
  isKeyboardPattern,
  calculateNgramScore,
  hasValidIndianPattern,
  hasSuspiciousPatterns
};

