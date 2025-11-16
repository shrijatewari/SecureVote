const revisionBatchService = require('../services/revisionBatchService');
const { requireMinimumRole } = require('../middleware/rbac');

class RevisionBatchController {
  async getAllBatches(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status || null;
      
      const result = await revisionBatchService.getAllBatches(page, limit, status);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async runDryRun(req, res, next) {
    try {
      const result = await revisionBatchService.runDryRun(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async commitBatch(req, res, next) {
    try {
      const result = await revisionBatchService.commitBatch(req.params.batchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getBatchFlags(req, res, next) {
    try {
      const flags = await revisionBatchService.getBatchFlags(req.params.batchId);
      res.json({ success: true, data: { flags } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RevisionBatchController();

