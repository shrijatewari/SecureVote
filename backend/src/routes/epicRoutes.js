const express = require('express');
const router = express.Router();
const epicController = require('../controllers/epicController');
const { requireMinimumRole, requirePermission } = require('../middleware/rbac');
const { authenticateToken } = require('../middleware/auth');

// GET /epic/:epicNumber - Get EPIC details (authenticated users)
router.get('/:epicNumber', authenticateToken, epicController.getEPICDetails);

// GET /epic/:epicNumber/download - Download EPIC (authenticated users)
router.get('/:epicNumber/download', authenticateToken, epicController.downloadEPIC);

// GET /epic/voter/:voterId/generate - Generate EPIC (requires ero role minimum)
router.get('/voter/:voterId/generate', requireMinimumRole('ero'), epicController.generateEPICForVoter);

module.exports = router;

