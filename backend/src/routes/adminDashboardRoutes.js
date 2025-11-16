const express = require('express');
const router = express.Router();
const { requireMinimumRole, requirePermission } = require('../middleware/rbac');
const adminDashboardController = require('../controllers/adminDashboardController');

// All admin routes require minimum role of 'admin' (excludes citizens)
// GET /api/admin/dashboard/stats
router.get('/dashboard/stats', requireMinimumRole('admin'), adminDashboardController.getStats.bind(adminDashboardController));

// GET /api/admin/dashboard/graphs
router.get('/dashboard/graphs', requireMinimumRole('admin'), adminDashboardController.getGraphs.bind(adminDashboardController));

// GET /api/admin/dashboard/ai-status
router.get('/dashboard/ai-status', requireMinimumRole('admin'), adminDashboardController.getAIStatus.bind(adminDashboardController));

module.exports = router;



