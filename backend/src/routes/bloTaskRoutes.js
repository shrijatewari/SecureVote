const express = require('express');
const router = express.Router();
const bloTaskController = require('../controllers/bloTaskController');
const { requireMinimumRole, requirePermission } = require('../middleware/rbac');

// POST /tasks/assign - Assign task (requires ero role minimum)
router.post('/assign', requireMinimumRole('ero'), bloTaskController.assignTask);

// GET /tasks/blo/:blo_id - Get BLO tasks (requires blo role minimum)
router.get('/blo/:blo_id', requireMinimumRole('blo'), bloTaskController.getBLOTasks);

// GET /tasks/status/:status - Get tasks by status (requires admin role minimum)
router.get('/status/:status', requireMinimumRole('admin'), bloTaskController.getTasksByStatus);

// GET /tasks/:id - Get task by ID (requires blo role minimum)
router.get('/:id', requireMinimumRole('blo'), bloTaskController.getTaskById);

// POST /tasks/:task_id/submit - Submit task (requires blo role minimum)
router.post('/:task_id/submit', requireMinimumRole('blo'), bloTaskController.submitTask);

module.exports = router;

