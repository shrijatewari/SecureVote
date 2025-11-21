/**
 * Extended SIEM Routes - Comprehensive Security Dashboard APIs
 * Implements all 10 sections of the Security & SIEM Dashboard
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const siemControllerExtended = require('../controllers/siemControllerExtended');
const siemController = require('../controllers/siemController');

// All routes require authentication and security.view permission
router.use(auth);
router.use(checkPermission('security.view'));

// 1. Security Overview Stats
router.get('/overview', siemControllerExtended.getSecurityOverview);

// 2. Event Timeline
router.get('/events/timeline', siemControllerExtended.getEventTimeline);

// 3. Threat Heatmap
router.get('/threats/heatmap', siemControllerExtended.getThreatHeatmap);

// 4. Anomaly Detection Center
router.get('/anomalies', siemControllerExtended.getAnomalies);
router.post('/anomalies/:anomalyId/resolve', checkPermission('security.manage'), siemControllerExtended.resolveAnomaly);

// 5. Admin Activity Monitoring
router.get('/admin-activity', siemControllerExtended.getAdminActivity);

// 6. Hash Chain Verification
router.get('/hash-chain/status', siemControllerExtended.getHashChainStatus);
router.post('/hash-chain/verify', checkPermission('security.manage'), siemControllerExtended.verifyHashChain);

// 7. IP Blocking & Rate Limiting
router.get('/ip-blocks', siemControllerExtended.getIPBlocks);
router.post('/ip-blocks/block', checkPermission('security.manage'), siemControllerExtended.blockIP);
router.post('/ip-blocks/unblock', checkPermission('security.manage'), siemControllerExtended.unblockIP);
router.get('/rate-limits', siemControllerExtended.getRateLimitLogs);

// 8. Security Alerts
router.get('/alerts', siemControllerExtended.getSecurityAlerts);
router.post('/alerts/:alertId/acknowledge', checkPermission('security.manage'), siemControllerExtended.acknowledgeAlert);
router.post('/alerts/:alertId/resolve', checkPermission('security.manage'), siemControllerExtended.resolveAlert);

// 9. Security Risk Score & Recommendations
router.get('/risk-score', siemControllerExtended.getSecurityRiskScore);

// 10. BLO Device Monitoring
router.get('/blo-devices', siemControllerExtended.getBLODeviceMonitoring);

// Legacy routes (for backward compatibility)
router.get('/stats', siemController.getSecurityStats);
router.get('/suspicious-logins', siemController.detectSuspiciousLogins);
router.post('/events', siemController.logSecurityEvent);

module.exports = router;

