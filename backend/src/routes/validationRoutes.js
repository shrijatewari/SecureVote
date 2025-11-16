const express = require('express');
const router = express.Router();
const validationController = require('../controllers/validationController');
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requireMinimumRole } = require('../middleware/rbac');

// Public validation endpoints (for frontend pre-validation)
router.post('/address', validationController.validateAddress);
router.post('/name', validationController.validateName);

// Admin endpoints for anomaly detection
router.post('/anomaly/run-address-cluster', 
  authenticateToken,
  requireMinimumRole('ero'),
  validationController.runAddressClusterDetection
);

router.get('/address/flags',
  authenticateToken,
  requirePermission('anomaly.view'),
  validationController.getAddressFlags
);

router.post('/address/flags/:flag_id/assign',
  authenticateToken,
  requirePermission('anomaly.assign'),
  validationController.assignAddressFlag
);

router.post('/address/flags/:flag_id/resolve',
  authenticateToken,
  requirePermission('anomaly.resolve'),
  validationController.resolveAddressFlag
);

// Review tasks endpoints
router.get('/review-tasks',
  authenticateToken,
  requirePermission('review.view'),
  validationController.getReviewTasks
);

router.post('/review-tasks/:task_id/assign',
  authenticateToken,
  requirePermission('review.assign'),
  validationController.assignReviewTask
);

router.post('/review-tasks/:task_id/resolve',
  authenticateToken,
  requirePermission('review.resolve'),
  validationController.resolveReviewTask
);

router.get('/review-tasks/statistics',
  authenticateToken,
  requirePermission('review.view'),
  validationController.getReviewTaskStatistics
);

// Notifications endpoint
router.get('/notifications',
  authenticateToken,
  notificationController.getNotifications
);

module.exports = router;

