/**
 * Extended SIEM Controller - Comprehensive Security Dashboard APIs
 * Implements all 10 sections of the Security & SIEM Dashboard
 */

const siemServiceExtended = require('../services/siemServiceExtended');
const siemService = require('../services/siemService');

/**
 * 1. Get Security Overview Stats
 */
const getSecurityOverview = async (req, res) => {
  try {
    const periodDays = parseInt(req.query.period) || 7;
    const stats = await siemServiceExtended.getSecurityOverview(periodDays);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting security overview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 2. Get Event Timeline
 */
const getEventTimeline = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const filters = {
      severity: req.query.severity,
      event_type: req.query.event_type,
      source_ip: req.query.source_ip,
      user_id: req.query.user_id ? parseInt(req.query.user_id) : null,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const events = await siemServiceExtended.getEventTimeline(limit, filters);
    res.json({ success: true, data: events, count: events.length });
  } catch (error) {
    console.error('Error getting event timeline:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 3. Get Threat Heatmap Data
 */
const getThreatHeatmap = async (req, res) => {
  try {
    const periodDays = parseInt(req.query.period) || 7;
    const heatmapData = await siemServiceExtended.getThreatHeatmap(periodDays);
    res.json({ success: true, data: heatmapData });
  } catch (error) {
    console.error('Error getting threat heatmap:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 4. Get Anomalies
 */
const getAnomalies = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      severity: req.query.severity,
      anomaly_type: req.query.anomaly_type
    };
    const anomalies = await siemServiceExtended.getAnomalies(filters);
    res.json({ success: true, data: anomalies, count: anomalies.length });
  } catch (error) {
    console.error('Error getting anomalies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Resolve Anomaly
 */
const resolveAnomaly = async (req, res) => {
  try {
    const { anomalyId } = req.params;
    const { resolution_status, notes } = req.body;
    const resolvedBy = req.user.user_id;

    if (!resolution_status) {
      return res.status(400).json({ success: false, error: 'resolution_status is required' });
    }

    const result = await siemServiceExtended.resolveAnomaly(
      anomalyId,
      resolvedBy,
      resolution_status,
      notes
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error resolving anomaly:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 5. Get Admin Activity
 */
const getAdminActivity = async (req, res) => {
  try {
    const filters = {
      admin_id: req.query.admin_id ? parseInt(req.query.admin_id) : null,
      role: req.query.role,
      module: req.query.module,
      action: req.query.action,
      risk_level: req.query.risk_level,
      start_date: req.query.start_date
    };
    const activities = await siemServiceExtended.getAdminActivity(filters);
    res.json({ success: true, data: activities, count: activities.length });
  } catch (error) {
    console.error('Error getting admin activity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 6. Get Hash Chain Status
 */
const getHashChainStatus = async (req, res) => {
  try {
    const status = await siemServiceExtended.getHashChainStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Error getting hash chain status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Verify Hash Chain
 */
const verifyHashChain = async (req, res) => {
  try {
    const verifiedBy = req.user.user_id;
    const result = await siemServiceExtended.verifyHashChain(verifiedBy);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error verifying hash chain:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 7. Get IP Blocks
 */
const getIPBlocks = async (req, res) => {
  try {
    const activeOnly = req.query.active !== 'false';
    const blocks = await siemServiceExtended.getIPBlocks(activeOnly);
    res.json({ success: true, data: blocks, count: blocks.length });
  } catch (error) {
    console.error('Error getting IP blocks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Block IP
 */
const blockIP = async (req, res) => {
  try {
    const { ip_address, reason, expires_at, block_type } = req.body;
    const blockedBy = req.user.user_id;

    if (!ip_address) {
      return res.status(400).json({ success: false, error: 'ip_address is required' });
    }

    const result = await siemServiceExtended.blockIP(
      ip_address,
      reason,
      blockedBy,
      expires_at,
      block_type || 'manual'
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error blocking IP:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Unblock IP
 */
const unblockIP = async (req, res) => {
  try {
    const { ip_address } = req.body;
    if (!ip_address) {
      return res.status(400).json({ success: false, error: 'ip_address is required' });
    }

    const result = await siemServiceExtended.unblockIP(ip_address);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error unblocking IP:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Rate Limit Logs
 */
const getRateLimitLogs = async (req, res) => {
  try {
    const periodHours = parseInt(req.query.period) || 24;
    const logs = await siemServiceExtended.getRateLimitLogs(periodHours);
    res.json({ success: true, data: logs, count: logs.length });
  } catch (error) {
    console.error('Error getting rate limit logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 8. Get Security Alerts
 */
const getSecurityAlerts = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      severity: req.query.severity
    };
    const alerts = await siemServiceExtended.getSecurityAlerts(filters);
    res.json({ success: true, data: alerts, count: alerts.length });
  } catch (error) {
    console.error('Error getting security alerts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Acknowledge Alert
 */
const acknowledgeAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const acknowledgedBy = req.user.user_id;

    const result = await siemServiceExtended.acknowledgeAlert(alertId, acknowledgedBy);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Resolve Alert
 */
const resolveAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolution_notes } = req.body;
    const resolvedBy = req.user.user_id;

    const result = await siemServiceExtended.resolveAlert(alertId, resolvedBy, resolution_notes);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 9. Get Security Risk Score
 */
const getSecurityRiskScore = async (req, res) => {
  try {
    const riskScore = await siemServiceExtended.getSecurityRiskScore();
    res.json({ success: true, data: riskScore });
  } catch (error) {
    console.error('Error getting security risk score:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 10. Get BLO Device Monitoring
 */
const getBLODeviceMonitoring = async (req, res) => {
  try {
    const devices = await siemServiceExtended.getBLODeviceMonitoring();
    res.json({ success: true, data: devices, count: devices.length });
  } catch (error) {
    console.error('Error getting BLO device monitoring:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getSecurityOverview,
  getEventTimeline,
  getThreatHeatmap,
  getAnomalies,
  resolveAnomaly,
  getAdminActivity,
  getHashChainStatus,
  verifyHashChain,
  getIPBlocks,
  blockIP,
  unblockIP,
  getRateLimitLogs,
  getSecurityAlerts,
  acknowledgeAlert,
  resolveAlert,
  getSecurityRiskScore,
  getBLODeviceMonitoring
};

