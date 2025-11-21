/**
 * OpenAI Routes
 * All routes require authentication and RBAC
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const openaiController = require('../controllers/openaiController');

// Rate limiting by role
const getRateLimit = (windowMs, max) => {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    message: 'Too many OpenAI requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Role-based rate limits
const admin2RateLimit = getRateLimit(60 * 60 * 1000, 30); // 30 per hour
const admin3RateLimit = getRateLimit(60 * 60 * 1000, 120); // 120 per hour
const admin4RateLimit = getRateLimit(60 * 60 * 1000, 500); // 500 per hour
const admin5RateLimit = getRateLimit(60 * 60 * 1000, 1000); // 1000 per hour

// Global rate limit (10k per day)
const globalRateLimit = getRateLimit(24 * 60 * 60 * 1000, 10000);

// Apply authentication and global rate limit to all routes
router.use(authenticateToken);
router.use(globalRateLimit);

// Explain anomaly - Admin2+ (admin, ero, deo, ceo, eci)
router.post(
  '/explain-anomaly',
  admin2RateLimit,
  ...requireRole('admin', 'ero', 'deo', 'ceo', 'eci'),
  (req, res, next) => openaiController.explainAnomaly(req, res, next)
);

// Recommend action - Admin2+
router.post(
  '/recommend-action',
  admin2RateLimit,
  ...requireRole('admin', 'ero', 'deo', 'ceo', 'eci'),
  (req, res, next) => openaiController.recommendAction(req, res, next)
);

// Summarize security - Admin3+ (deo, ceo, eci)
router.post(
  '/summarize-security',
  admin3RateLimit,
  ...requireRole('deo', 'ceo', 'eci'),
  (req, res, next) => openaiController.summarizeSecurity(req, res, next)
);

// Explain name quality - Admin2+
router.post(
  '/name-quality-explain',
  admin2RateLimit,
  ...requireRole('admin', 'ero', 'deo', 'ceo', 'eci'),
  (req, res, next) => openaiController.explainNameQuality(req, res, next)
);

// Document summary - Admin2+ or DocVerifier
router.post(
  '/document-summary',
  admin2RateLimit,
  ...requireRole('admin', 'ero', 'deo', 'ceo', 'eci', 'DOC_VERIFIER'),
  (req, res, next) => openaiController.documentSummary(req, res, next)
);

// Generate notice - Admin3+
router.post(
  '/generate-notice',
  admin3RateLimit,
  ...requireRole('deo', 'ceo', 'eci'),
  (req, res, next) => openaiController.generateNotice(req, res, next)
);

// Debug prompt - Admin5 (ECI) only
router.post(
  '/debug-prompt',
  admin5RateLimit,
  ...requireRole('eci'),
  (req, res, next) => openaiController.debugPrompt(req, res, next)
);

// Get call history - All authenticated admins
router.get(
  '/history',
  ...requireRole('admin', 'ero', 'deo', 'ceo', 'eci'),
  (req, res, next) => openaiController.getCallHistory(req, res, next)
);

// Get call statistics - Admin3+
router.get(
  '/stats',
  ...requireRole('deo', 'ceo', 'eci'),
  (req, res, next) => openaiController.getCallStats(req, res, next)
);

module.exports = router;

