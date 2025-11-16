const express = require('express');
const router = express.Router();
const grievanceController = require('../controllers/grievanceController');
const { requireMinimumRole, requirePermission } = require('../middleware/rbac');
const { authenticateToken } = require('../middleware/auth');

// POST /grievances - Create grievance (public - citizens can create)
router.post('/', grievanceController.createGrievance);

// GET /grievances - List grievances (requires admin role minimum)
router.get('/', requireMinimumRole('admin'), grievanceController.getAllGrievances);

// GET /grievances/ticket/:ticketNumber - Get by ticket (authenticated users)
router.get('/ticket/:ticketNumber', authenticateToken, grievanceController.getGrievanceByTicket);

// GET /grievances/:id - Get grievance (authenticated users)
router.get('/:id', authenticateToken, grievanceController.getGrievanceById);

// PUT /grievances/:id - Update grievance (requires admin role minimum)
router.put('/:id', requireMinimumRole('admin'), grievanceController.updateGrievance);

// POST /grievances/:id/reopen - Reopen grievance (requires admin role minimum)
router.post('/:id/reopen', requireMinimumRole('admin'), grievanceController.reopenGrievance);

module.exports = router;

