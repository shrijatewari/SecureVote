const biometricAdminService = require('../services/biometricAdminService');
const aiClient = require('../services/aiClient');

class BiometricAdminController {
  async getStats(req, res, next) {
    try {
      const stats = await biometricAdminService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async getVoterBiometric(req, res, next) {
    try {
      const biometric = await biometricAdminService.getVoterBiometric(req.params.id);
      res.json({ success: true, data: biometric });
    } catch (error) {
      next(error);
    }
  }

  async compareFaces(req, res, next) {
    try {
      const { voter_id_1, voter_id_2 } = req.body;
      if (!voter_id_1 || !voter_id_2) {
        return res.status(400).json({ success: false, error: 'Both voter_id_1 and voter_id_2 are required' });
      }
      const result = await biometricAdminService.compareFaces(parseInt(voter_id_1), parseInt(voter_id_2));
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Compare faces error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to compare faces' });
    }
  }

  async compareFingerprints(req, res, next) {
    try {
      const { voter_id_1, voter_id_2 } = req.body;
      const result = await biometricAdminService.compareFingerprints(voter_id_1, voter_id_2);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getPendingVerifications(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const result = await biometricAdminService.getPendingVerifications(page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async approveBiometric(req, res, next) {
    try {
      const result = await biometricAdminService.approveBiometric(req.params.id, req.user?.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async rejectBiometric(req, res, next) {
    try {
      const { reason } = req.body;
      const result = await biometricAdminService.rejectBiometric(req.params.id, reason, req.user?.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async requestRecapture(req, res, next) {
    try {
      const result = await biometricAdminService.requestRecapture(req.params.id, req.user?.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getFraudFlags(req, res, next) {
    try {
      const flags = await biometricAdminService.getFraudFlags();
      res.json({ success: true, data: { flags } });
    } catch (error) {
      next(error);
    }
  }

  async getFraudClusters(req, res, next) {
    try {
      const clusters = await biometricAdminService.getFraudClusters();
      res.json({ success: true, data: { clusters } });
    } catch (error) {
      next(error);
    }
  }

  async getLogs(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const result = await biometricAdminService.getLogs(page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getEnrollments(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const result = await biometricAdminService.getEnrollments(page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async approveEnrollment(req, res, next) {
    try {
      const result = await biometricAdminService.approveEnrollment(req.params.id, req.user?.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BiometricAdminController();

