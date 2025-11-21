const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voterController');
const { validateVoterRegistration } = require('../middleware/voterValidation');
const { validate, biometricVerificationSchema } = require('../utils/validation');
const { requireMinimumRole, requirePermission } = require('../middleware/rbac');

// POST /voters - Register new voter (public - anyone can register)
router.post('/', validateVoterRegistration, voterController.createVoter);

// POST /voters/verify-biometric - Verify biometric (public for registration)
// MUST come before /:id route to avoid matching "verify-biometric" as an ID
router.post('/verify-biometric', validate(biometricVerificationSchema), voterController.verifyBiometric);

// GET /voters - List voters (requires voters.view permission)
// MUST come before /:id route to avoid matching empty path as ID
// GET /voters?aadhaar=XXX - Search by Aadhaar (public for landing page)
router.get('/', (req, res, next) => {
  // If searching by Aadhaar, allow public access (no auth required)
  if (req.query.aadhaar) {
    return voterController.getAllVoters(req, res, next);
  }
  // Otherwise require permission
  const middleware = requirePermission('voters.view');
  return middleware[0](req, res, (err) => {
    if (err) return next(err);
    return middleware[1](req, res, next);
  });
});

// GET /voters/:id - Read voter (requires voters.view permission)
// MUST come after / route to avoid matching empty path
router.get('/:id', ...requirePermission('voters.view'), voterController.getVoterById);

// PUT /voters/:id - Update voter (requires voters.edit permission)
router.put('/:id', ...requirePermission('voters.edit'), voterController.updateVoter);

// DELETE /voters/:id - Delete voter (requires voters.delete permission)
router.delete('/:id', ...requirePermission('voters.delete'), voterController.deleteVoter);

module.exports = router;

