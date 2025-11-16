const express = require('express');
const router = express.Router();
const revisionController = require('../controllers/revisionController');
const revisionBatchController = require('../controllers/revisionBatchController');
const { authenticateToken } = require('../middleware/auth');
const { requireMinimumRole } = require('../middleware/rbac');

// Revision Announcements
// POST /revision/announce (admin)
router.post('/announce', authenticateToken, revisionController.createAnnouncement);

// GET /revision/announcements (public - active)
router.get('/announcements', revisionController.getActiveAnnouncements);

// GET /revision/announcements/all (admin)
router.get('/announcements/all', authenticateToken, revisionController.getAllAnnouncements);

// GET /revision/announcements/:id
router.get('/announcements/:id', revisionController.getAnnouncementById);

// Revision Batches (Dry-run & Commit)
// GET /revision/batches - Get all batches
router.get('/batches', requireMinimumRole('deo'), revisionBatchController.getAllBatches);

// POST /revision/dry-run - Run dry-run revision
router.post('/dry-run', requireMinimumRole('deo'), revisionBatchController.runDryRun);

// POST /revision/batches/:batchId/commit - Commit batch
router.post('/batches/:batchId/commit', requireMinimumRole('deo'), revisionBatchController.commitBatch);

// GET /revision/batches/:batchId/flags - Get batch flags
router.get('/batches/:batchId/flags', requireMinimumRole('deo'), revisionBatchController.getBatchFlags);

module.exports = router;

