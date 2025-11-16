/**
 * AI Services Client
 * HTTP client for calling AI microservices
 */

const axios = require('axios');

// AI Service URLs (in production, use environment variables)
const AI_SERVICES = {
  duplicate: process.env.AI_DUPLICATE_SERVICE_URL || 'http://localhost:8001',
  address: process.env.AI_ADDRESS_SERVICE_URL || 'http://localhost:8002',
  deceased: process.env.AI_DECEASED_SERVICE_URL || 'http://localhost:8003',
  document: process.env.AI_DOCUMENT_SERVICE_URL || 'http://localhost:8004',
  forgery: process.env.AI_FORGERY_SERVICE_URL || 'http://localhost:8005',
  biometric: process.env.AI_BIOMETRIC_SERVICE_URL || 'http://localhost:8006',
};

const MOCK_RESPONSES = {
  duplicate: {
    duplicate_probability: 0.82,
    confidence: 0.91,
    recommendation: 'review',
    features: {
      name_similarity: 0.94,
      dob_similarity: 1,
      address_similarity: 0.88,
      phone_similarity: 0.4
    },
    algorithm_flags: ['name_similarity', 'address_match']
  },
  batchDuplicate: {
    matches: [
      { voter_id_1: 1, voter_id_2: 2, probability: 0.82, confidence: 0.91 }
    ],
    threshold: 0.7
  },
  normalizedAddress: {
    normalized_address: {
      house_number: '123',
      street: 'Main Street',
      village_city: 'Delhi',
      district: 'New Delhi',
      state: 'Delhi',
      pin_code: '110001'
    },
    confidence: 0.94
  },
  fraud: (address) => {
    // Stricter fraud detection - flag suspicious addresses
    const suspiciousPatterns = [
      /^(x|y|z|test|demo|sample|fake|dummy|abc|xyz|xxx|yyy|zzz)/i,
      /^(x|y|z|test|demo|sample|fake|dummy|abc|xyz|xxx|yyy|zzz)$/i,
      /^[xyz]{1,3}$/i,
      /test/i,
      /demo/i,
      /sample/i,
      /fake/i,
      /dummy/i
    ];
    
    const addressStr = JSON.stringify(address).toLowerCase();
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(addressStr));
    
    if (isSuspicious) {
      return {
        is_fraud: true,
        risk_score: 0.95,
        reasons: ['Suspicious address pattern detected', 'Address contains test/dummy data', 'Invalid address format'],
        cluster_id: 'FRAUD-FLAG-001'
      };
    }
    
    return {
      is_fraud: false,
      risk_score: 0.18,
      reasons: ['Address history clean', 'Geo tag verified'],
      cluster_id: 'CLUSTER-MOCK-001'
    };
  },
  cluster: {
    suspicious_clusters: [],
    insights: []
  },
  deceased: {
    match_probability: 0.12,
    confidence: 0.76,
    reasons: ['No matching death record found']
  },
  document: {
    is_fake: false,
    confidence: 0.89,
    ocr_data: {
      name: 'Sample Citizen',
      dob: '1990-05-15',
      aadhaar: 'XXXX XXXX 1234'
    },
    validation_errors: []
  },
  forgery: {
    is_tampered: false,
    confidence: 0.93,
    hash_match: true
  },
  face: {
    match_probability: 0.67,
    similarity_score: 0.64,
    confidence: 0.72
  },
  fingerprint: {
    match_probability: 0.59,
    minutiae_score: 0.57,
    confidence: 0.69
  }
};

function fallback(service, error) {
  console.warn(`[AI Mock] ${service} service unavailable, returning mock data. Reason: ${error.message}`);
  const mock = MOCK_RESPONSES[service];
  if (!mock) {
    throw new Error(`${service} service failed: ${error.message}`);
  }
  return mock;
}

class AIClient {
  /**
   * Predict if two records are duplicates
   */
  async predictDuplicate(record1, record2) {
    try {
      const response = await axios.post(
        `${AI_SERVICES.duplicate}/predict-duplicate`,
        { record1, record2 },
        { timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      return fallback('duplicate', error);
    }
  }

  /**
   * Run batch duplicate detection
   */
  async batchDetectDuplicates(records, threshold = 0.7) {
    try {
      const response = await axios.post(
        `${AI_SERVICES.duplicate}/batch-run`,
        { records, threshold },
        { timeout: 120000 } // 120 seconds for batch operations
      );
      return response.data;
    } catch (error) {
      return fallback('batchDuplicate', error);
    }
  }

  /**
   * Normalize address
   */
  async normalizeAddress(address) {
    try {
      const response = await axios.post(
        `${AI_SERVICES.address}/normalize`,
        { address },
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      return fallback('normalizedAddress', error);
    }
  }

  /**
   * Detect fraudulent addresses
   */
  async detectAddressFraud(address) {
    try {
      const response = await axios.post(
        `${AI_SERVICES.address}/fraud-detect`,
        { address },
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      // Use function fallback for fraud detection
      const fraudMock = MOCK_RESPONSES.fraud;
      if (typeof fraudMock === 'function') {
        return fraudMock(address);
      }
      return fallback('fraud', error);
    }
  }

  /**
   * Analyze address clusters
   */
  async analyzeAddressClusters(addresses) {
    try {
      const response = await axios.post(
        `${AI_SERVICES.address}/cluster-analysis`,
        addresses,
        { timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      return fallback('cluster', error);
    }
  }

  /**
   * Match deceased records
   */
  async matchDeceased(voterRecord, deathRecord) {
    try {
      const response = await axios.post(
        `${AI_SERVICES.deceased}/match-deceased`,
        { voter_record: voterRecord, death_record: deathRecord },
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      return fallback('deceased', error);
    }
  }

  /**
   * Verify document (OCR + fake detection)
   */
  async verifyDocument(documentBase64, documentType) {
    try {
      const response = await axios.post(
        `${AI_SERVICES.document}/verify-document`,
        { document_base64: documentBase64, document_type: documentType },
        { timeout: 15000 }
      );
      return response.data;
    } catch (error) {
      return fallback('document', error);
    }
  }

  /**
   * Verify notice/communication for forgery
   */
  async verifyNotice(documentBase64, originalHash) {
    try {
      const response = await axios.post(
        `${AI_SERVICES.forgery}/verify-notice`,
        { document_base64: documentBase64, original_hash: originalHash },
        { timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      return fallback('forgery', error);
    }
  }

  /**
   * Match face embeddings
   */
  async matchFace(embedding1, embedding2) {
    try {
      const response = await axios.post(
        `${AI_SERVICES.biometric}/match-face`,
        { embedding1, embedding2 },
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      return fallback('face', error);
    }
  }

  /**
   * Match fingerprint templates
   */
  async matchFingerprint(template1, template2) {
    try {
      const response = await axios.post(
        `${AI_SERVICES.biometric}/match-fingerprint`,
        { template1, template2 },
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      return fallback('fingerprint', error);
    }
  }

  /**
   * Health check for all AI services
   */
  async healthCheck() {
    const health = {};
    for (const [service, url] of Object.entries(AI_SERVICES)) {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 2000 });
        health[service] = { status: 'ok', ...response.data };
      } catch (error) {
        health[service] = { status: 'error', error: error.message };
      }
    }
    return health;
  }
}

module.exports = new AIClient();


