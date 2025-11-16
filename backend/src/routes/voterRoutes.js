const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voterController');
const { validateVoterRegistration } = require('../middleware/voterValidation');
const { validate, biometricVerificationSchema } = require('../utils/validation');
const { requireMinimumRole, requirePermission } = require('../middleware/rbac');

// POST /voters - Register new voter (public - anyone can register)
router.post('/', validateVoterRegistration, voterController.createVoter);

// GET /voters/:id - Read voter (requires admin role minimum)
router.get('/:id', requireMinimumRole('admin'), voterController.getVoterById);

// GET /voters - List voters (requires admin role minimum)
router.get('/', requireMinimumRole('admin'), voterController.getAllVoters);

// PUT /voters/:id - Update voter (requires admin role minimum)
router.put('/:id', requireMinimumRole('admin'), voterController.updateVoter);

// DELETE /voters/:id - Delete voter (requires deo role minimum)
router.delete('/:id', requireMinimumRole('deo'), voterController.deleteVoter);

// POST /voters/verify-biometric - Verify biometric (public for registration)
router.post('/verify-biometric', validate(biometricVerificationSchema), voterController.verifyBiometric);

module.exports = router;

