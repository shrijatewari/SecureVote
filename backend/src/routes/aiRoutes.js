/**
 * AI Services Routes
 * Routes for calling AI microservices
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /ai/health
 * Health check for all AI services (PUBLIC - no auth required)
 * This endpoint ignores any authentication tokens sent
 */
router.get('/health', (req, res, next) => {
  // Explicitly skip authentication for health check
  aiController.healthCheck(req, res, next);
});

// All other routes require authentication
router.use(authenticateToken);

/**
 * POST /ai/duplicates/predict
 * Predict if two records are duplicates
 */
router.post('/duplicates/predict', aiController.predictDuplicate.bind(aiController));

/**
 * POST /ai/duplicates/batch-run
 * Run batch duplicate detection
 */
router.post('/duplicates/batch-run', aiController.batchDetectDuplicates.bind(aiController));

/**
 * POST /ai/address/normalize
 * Normalize address
 */
router.post('/address/normalize', aiController.normalizeAddress.bind(aiController));

/**
 * POST /ai/address/fraud-detect
 * Detect fraudulent addresses
 */
router.post('/address/fraud-detect', aiController.detectAddressFraud.bind(aiController));

/**
 * POST /ai/deceased/match
 * Match deceased records
 */
router.post('/deceased/match', aiController.matchDeceased.bind(aiController));

/**
 * POST /ai/documents/verify
 * Verify document (OCR + fake detection)
 */
router.post('/documents/verify', aiController.verifyDocument.bind(aiController));

/**
 * POST /ai/forgery/verify
 * Verify notice/communication for forgery
 */
router.post('/forgery/verify', aiController.verifyNotice.bind(aiController));

/**
 * POST /ai/biometrics/face-match
 * Match face embeddings
 */
router.post('/biometrics/face-match', aiController.matchFace.bind(aiController));

/**
 * POST /ai/biometrics/fingerprint-match
 * Match fingerprint templates
 */
router.post('/biometrics/fingerprint-match', aiController.matchFingerprint.bind(aiController));

module.exports = router;


