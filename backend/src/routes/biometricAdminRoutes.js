const express = require('express');
const router = express.Router();
const biometricAdminController = require('../controllers/biometricAdminController');
const { requireMinimumRole } = require('../middleware/rbac');

// All routes require minimum DEO role
router.use(requireMinimumRole('deo'));

// GET /admin/biometrics/stats - Overview stats
router.get('/stats', biometricAdminController.getStats);

// GET /admin/biometrics/voter/:id - Get voter biometric profile
router.get('/voter/:id', biometricAdminController.getVoterBiometric);

// POST /admin/biometrics/face-match - Compare two voters' faces
router.post('/face-match', biometricAdminController.compareFaces);

// POST /admin/biometrics/fingerprint-match - Compare fingerprints
router.post('/fingerprint-match', biometricAdminController.compareFingerprints);

// GET /admin/biometrics/pending - Get verification queue
router.get('/pending', biometricAdminController.getPendingVerifications);

// POST /admin/biometrics/:id/approve - Approve biometric
router.post('/:id/approve', biometricAdminController.approveBiometric);

// POST /admin/biometrics/:id/reject - Reject biometric
router.post('/:id/reject', biometricAdminController.rejectBiometric);

// POST /admin/biometrics/:id/recapture-request - Request re-capture
router.post('/:id/recapture-request', biometricAdminController.requestRecapture);

// GET /admin/biometrics/fraud-flags - Get fraud detection flags
router.get('/fraud-flags', biometricAdminController.getFraudFlags);

// GET /admin/biometrics/fraud-clusters - Get suspicious clusters
router.get('/fraud-clusters', biometricAdminController.getFraudClusters);

// GET /admin/biometrics/logs - Get biometric audit logs
router.get('/logs', biometricAdminController.getLogs);

// GET /admin/biometrics/enrollments - Get enrollment queue
router.get('/enrollments', biometricAdminController.getEnrollments);

// POST /admin/biometrics/enrollment/:id/approve - Approve enrollment
router.post('/enrollment/:id/approve', biometricAdminController.approveEnrollment);

module.exports = router;

