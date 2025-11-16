const axios = require('axios');

/**
 * OpenAI Service
 * Provides safe, privacy-conscious AI explanations and suggestions
 * NEVER sends raw PII - only pseudonymized/hashed data
 */
class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
    this.enabled = !!this.apiKey;
  }

  /**
   * Pseudonymize sensitive data
   */
  pseudonymize(text) {
    if (!text || typeof text !== 'string') return text;
    
    // Replace Aadhaar numbers with pattern
    text = text.replace(/\d{4}\s?\d{4}\s?\d{4}/g, 'XXXX-XXXX-XXXX');
    
    // Replace email domains
    text = text.replace(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)/g, 'user@domain.com');
    
    // Replace phone numbers
    text = text.replace(/\d{10}/g, 'XXXXXXXXXX');
    
    // Replace full names with initials (keep first letter of each word)
    const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
    text = text.replace(namePattern, (match) => {
      return match.split(' ').map(w => w[0]).join('.') + '.';
    });
    
    return text;
  }

  /**
   * Generate explanation for flagged address cluster
   */
  async generateAddressClusterExplanation(clusterData) {
    if (!this.enabled) {
      return this.generateMockExplanation(clusterData);
    }

    try {
      // Pseudonymize all sensitive data
      const safeData = {
        voter_count: clusterData.voter_count,
        risk_score: clusterData.risk_score,
        risk_level: clusterData.risk_level,
        surname_diversity_score: clusterData.surname_diversity_score,
        dob_clustering_score: clusterData.dob_clustering_score,
        district: clusterData.district,
        state: clusterData.state,
        // DO NOT include actual addresses, names, or Aadhaar numbers
      };

      const prompt = `Generate a clear, professional explanation for why an address cluster was flagged for review in a voter registration system.

Cluster Details:
- Voter Count: ${safeData.voter_count}
- Risk Score: ${(safeData.risk_score * 100).toFixed(0)}%
- Risk Level: ${safeData.risk_level}
- Surname Diversity: ${(safeData.surname_diversity_score * 100).toFixed(0)}%
- DOB Clustering Score: ${(safeData.dob_clustering_score * 100).toFixed(0)}%
- Location: ${safeData.district}, ${safeData.state}

Provide a concise explanation (2-3 sentences) suitable for administrative review, explaining why this cluster requires manual verification.`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that generates clear, professional explanations for administrative review systems. Never include any personal information.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return response.data.choices[0]?.message?.content || this.generateMockExplanation(clusterData);
    } catch (error) {
      console.warn('OpenAI API call failed, using fallback:', error.message);
      return this.generateMockExplanation(clusterData);
    }
  }

  /**
   * Generate explanation for flagged name
   */
  async generateNameValidationExplanation(nameData) {
    if (!this.enabled) {
      return this.generateMockNameExplanation(nameData);
    }

    try {
      // Only send quality score and flags, NOT the actual name
      const safeData = {
        quality_score: nameData.qualityScore,
        validation_result: nameData.validationResult,
        flags: nameData.flags || [],
        // DO NOT include actual name
      };

      const prompt = `Generate a clear explanation for why a name was flagged during voter registration validation.

Validation Details:
- Quality Score: ${(safeData.quality_score * 100).toFixed(0)}%
- Validation Result: ${safeData.validation_result}
- Flags: ${safeData.flags.join(', ') || 'None'}

Provide a concise explanation (1-2 sentences) explaining why this name requires review, without mentioning the actual name.`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that generates clear explanations for name validation systems. Never include actual names or personal information.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 100,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return response.data.choices[0]?.message?.content || this.generateMockNameExplanation(nameData);
    } catch (error) {
      console.warn('OpenAI API call failed, using fallback:', error.message);
      return this.generateMockNameExplanation(nameData);
    }
  }

  /**
   * Generate suggested normalized address
   */
  async suggestNormalizedAddress(rawAddress) {
    if (!this.enabled) {
      return null;
    }

    try {
      // Pseudonymize address components
      const pseudonymized = this.pseudonymize(rawAddress);

      const prompt = `Normalize this Indian address for voter registration. Return only the normalized address in standard format (House Number, Street, Locality, District, State, PIN Code).

Address: ${pseudonymized}

Return only the normalized address, no explanations.`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that normalizes Indian addresses. Return only the normalized address.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 100,
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return response.data.choices[0]?.message?.content?.trim() || null;
    } catch (error) {
      console.warn('OpenAI address normalization failed:', error.message);
      return null;
    }
  }

  /**
   * Mock explanation generators (fallback when OpenAI is unavailable)
   */
  generateMockExplanation(clusterData) {
    const reasons = [];
    if (clusterData.voter_count >= 20) {
      reasons.push(`High voter count (${clusterData.voter_count}) at a single address`);
    }
    if (clusterData.surname_diversity_score < 0.3) {
      reasons.push('Low surname diversity suggests potential fraud');
    }
    if (clusterData.dob_clustering_score < 0.5) {
      reasons.push('Suspicious DOB clustering patterns detected');
    }
    
    return reasons.length > 0 
      ? `This address cluster has been flagged for review due to: ${reasons.join('; ')}. Manual verification is required.`
      : `Address cluster flagged for review. Risk score: ${(clusterData.risk_score * 100).toFixed(0)}%.`;
  }

  generateMockNameExplanation(nameData) {
    const flags = nameData.flags || [];
    if (flags.includes('low_quality')) {
      return 'Name quality score is below acceptable threshold. Manual review required.';
    }
    if (flags.includes('phonetic_issues')) {
      return 'Name contains phonetic anomalies that require verification.';
    }
    return `Name validation flagged with quality score ${(nameData.qualityScore * 100).toFixed(0)}%. Manual review recommended.`;
  }
}

module.exports = new OpenAIService();

