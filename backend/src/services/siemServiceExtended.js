/**
 * Extended SIEM Service - Comprehensive Security Information and Event Management
 * Implements all 10 sections of the Security & SIEM Dashboard
 */

const pool = require('../config/database');
const crypto = require('crypto');

class SIEMServiceExtended {
  /**
   * 1. SECURITY OVERVIEW STATS
   * Get comprehensive security statistics for dashboard widgets
   */
  async getSecurityOverview(periodDays = 7) {
    const connection = await pool.getConnection();
    try {
      const [overview] = await connection.query(
        `SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT source_ip) as unique_ips,
          COUNT(DISTINCT user_id) as affected_users,
          AVG(risk_score) as avg_risk_score,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_alerts,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_alerts,
          COUNT(CASE WHEN event_type = 'failed_login' THEN 1 END) as failed_logins,
          COUNT(CASE WHEN event_type = 'rate_limit' THEN 1 END) as blocked_requests,
          COUNT(CASE WHEN event_type = 'hash_chain_failure' THEN 1 END) as integrity_failures,
          COUNT(CASE WHEN event_type LIKE '%api_abuse%' THEN 1 END) as api_abuse_attempts
        FROM security_events
        WHERE timestamp > DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [periodDays]
      );

      // Get today's anomalies
      const [todayAnomalies] = await connection.query(
        `SELECT COUNT(*) as count FROM security_anomalies 
         WHERE DATE(detected_at) = CURDATE() AND resolution_status = 'pending'`
      );

      // Get high-severity alerts
      const [highSeverityAlerts] = await connection.query(
        `SELECT COUNT(*) as count FROM security_alerts 
         WHERE severity IN ('high', 'critical') AND status != 'resolved'`
      );

      return {
        ...overview[0],
        detected_anomalies_today: todayAnomalies[0].count,
        high_severity_alerts: highSeverityAlerts[0].count,
        period_days: periodDays
      };
    } finally {
      connection.release();
    }
  }

  /**
   * 2. EVENT TIMELINE
   * Get recent security events with full details
   */
  async getEventTimeline(limit = 200, filters = {}) {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT 
          e.*,
          u.email as user_email,
          u.role as user_role,
          u.name as user_name
        FROM security_events e
        LEFT JOIN users u ON e.user_id = u.user_id
        WHERE 1=1
      `;
      const params = [];

      if (filters.severity) {
        query += ' AND e.severity = ?';
        params.push(filters.severity);
      }

      if (filters.event_type) {
        query += ' AND e.event_type = ?';
        params.push(filters.event_type);
      }

      if (filters.source_ip) {
        query += ' AND e.source_ip = ?';
        params.push(filters.source_ip);
      }

      if (filters.user_id) {
        query += ' AND e.user_id = ?';
        params.push(filters.user_id);
      }

      if (filters.start_date) {
        query += ' AND e.timestamp >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ' AND e.timestamp <= ?';
        params.push(filters.end_date);
      }

      query += ' ORDER BY e.timestamp DESC LIMIT ?';
      params.push(limit);

      const [events] = await connection.query(query, params);

      // Parse JSON details
      return events.map(event => ({
        ...event,
        details: typeof event.details === 'string' ? JSON.parse(event.details) : event.details,
        geolocation: typeof event.geolocation === 'string' ? JSON.parse(event.geolocation || '{}') : event.geolocation
      }));
    } finally {
      connection.release();
    }
  }

  /**
   * 3. THREAT HEATMAP
   * Get IP geolocation data for threat heatmap
   */
  async getThreatHeatmap(periodDays = 7) {
    const connection = await pool.getConnection();
    try {
      const [heatmapData] = await connection.query(
        `SELECT 
          source_ip,
          COUNT(*) as attack_count,
          MAX(risk_score) as max_risk,
          COUNT(DISTINCT user_id) as affected_users,
          JSON_EXTRACT(geolocation, '$.country') as country,
          JSON_EXTRACT(geolocation, '$.city') as city,
          JSON_EXTRACT(geolocation, '$.lat') as latitude,
          JSON_EXTRACT(geolocation, '$.lng') as longitude
        FROM security_events
        WHERE timestamp > DATE_SUB(NOW(), INTERVAL ? DAY)
          AND source_ip IS NOT NULL
          AND geolocation IS NOT NULL
        GROUP BY source_ip, JSON_EXTRACT(geolocation, '$.country')
        ORDER BY attack_count DESC
        LIMIT 500`,
        [periodDays]
      );

      return heatmapData.map(item => ({
        ip: item.source_ip,
        count: item.attack_count,
        maxRisk: item.max_risk,
        affectedUsers: item.affected_users,
        country: item.country?.replace(/"/g, '') || 'Unknown',
        city: item.city?.replace(/"/g, '') || 'Unknown',
        lat: parseFloat(item.latitude) || null,
        lng: parseFloat(item.longitude) || null
      }));
    } finally {
      connection.release();
    }
  }

  /**
   * 4. ANOMALY DETECTION CENTER
   * Get detected anomalies with AI-powered analysis
   */
  async getAnomalies(filters = {}) {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT 
          a.*,
          e.event_type,
          e.source_ip,
          e.timestamp as event_timestamp,
          u.email as user_email,
          u.role as user_role
        FROM security_anomalies a
        LEFT JOIN security_events e ON a.event_id = e.event_id
        LEFT JOIN users u ON a.user_id = u.user_id
        WHERE 1=1
      `;
      const params = [];

      if (filters.status) {
        query += ' AND a.resolution_status = ?';
        params.push(filters.status);
      } else {
        query += " AND a.resolution_status = 'pending'";
      }

      if (filters.severity) {
        query += ' AND a.severity = ?';
        params.push(filters.severity);
      }

      if (filters.anomaly_type) {
        query += ' AND a.anomaly_type = ?';
        params.push(filters.anomaly_type);
      }

      query += ' ORDER BY a.detected_at DESC LIMIT 100';
      const [anomalies] = await connection.query(query, params);

      return anomalies.map(anomaly => ({
        ...anomaly,
        context: typeof anomaly.context === 'string' ? JSON.parse(anomaly.context || '{}') : anomaly.context
      }));
    } finally {
      connection.release();
    }
  }

  /**
   * Resolve an anomaly
   */
  async resolveAnomaly(anomalyId, resolvedBy, resolutionStatus, notes) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `UPDATE security_anomalies 
         SET resolution_status = ?,
             resolved_at = NOW(),
             resolved_by = ?,
             recommended_action = ?
         WHERE anomaly_id = ?`,
        [resolutionStatus, resolvedBy, notes, anomalyId]
      );
      return { success: true };
    } finally {
      connection.release();
    }
  }

  /**
   * 5. ADMIN ACTIVITY MONITORING
   * Track all admin actions for privilege misuse detection
   */
  async getAdminActivity(filters = {}) {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT 
          a.*,
          u.email as admin_email,
          u.role as admin_role,
          u.name as admin_name
        FROM admin_activity_logs a
        JOIN users u ON a.admin_id = u.user_id
        WHERE 1=1
      `;
      const params = [];

      if (filters.admin_id) {
        query += ' AND a.admin_id = ?';
        params.push(filters.admin_id);
      }

      if (filters.role) {
        query += ' AND a.admin_role = ?';
        params.push(filters.role);
      }

      if (filters.module) {
        query += ' AND a.module = ?';
        params.push(filters.module);
      }

      if (filters.action) {
        query += ' AND a.action LIKE ?';
        params.push(`%${filters.action}%`);
      }

      if (filters.risk_level) {
        query += ' AND a.risk_level = ?';
        params.push(filters.risk_level);
      }

      if (filters.start_date) {
        query += ' AND a.timestamp >= ?';
        params.push(filters.start_date);
      }

      query += ' ORDER BY a.timestamp DESC LIMIT 500';
      const [activities] = await connection.query(query, params);

      return activities.map(activity => ({
        ...activity,
        details: typeof activity.details === 'string' ? JSON.parse(activity.details || '{}') : activity.details
      }));
    } finally {
      connection.release();
    }
  }

  /**
   * Log admin activity
   */
  async logAdminActivity(activityData) {
    const connection = await pool.getConnection();
    try {
      const {
        admin_id,
        admin_role,
        module,
        action,
        target_type,
        target_id,
        details,
        ip_address,
        user_agent,
        risk_level
      } = activityData;

      await connection.query(
        `INSERT INTO admin_activity_logs 
         (admin_id, admin_role, module, action, target_type, target_id, details, ip_address, user_agent, risk_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          admin_id,
          admin_role,
          module,
          action,
          target_type,
          target_id,
          JSON.stringify(details || {}),
          ip_address,
          user_agent,
          risk_level || 'low'
        ]
      );

      return { success: true };
    } finally {
      connection.release();
    }
  }

  /**
   * 6. HASH CHAIN VERIFICATION
   * Verify integrity of audit log hash chain
   */
  async getHashChainStatus() {
    const connection = await pool.getConnection();
    try {
      // Get latest verification
      const [latestVerification] = await connection.query(
        `SELECT * FROM hash_chain_verification 
         ORDER BY verified_at DESC LIMIT 1`
      );

      // Get audit log chain status
      const [chainStatus] = await connection.query(
        `SELECT 
          COUNT(*) as total_blocks,
          COUNT(CASE WHEN is_valid = TRUE THEN 1 END) as valid_blocks,
          COUNT(CASE WHEN is_valid = FALSE THEN 1 END) as invalid_blocks,
          MAX(verified_at) as last_verification
        FROM hash_chain_verification`
      );

      return {
        latest_verification: latestVerification[0] || null,
        chain_status: chainStatus[0],
        chain_health: chainStatus[0].invalid_blocks === 0 ? 'healthy' : 'compromised'
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Run hash chain verification
   */
  async verifyHashChain(verifiedBy) {
    const connection = await pool.getConnection();
    try {
      // Get all audit logs ordered by timestamp
      const [auditLogs] = await connection.query(
        `SELECT log_id, action, details, timestamp, previous_hash 
         FROM audit_logs 
         ORDER BY timestamp ASC`
      );

      let previousHash = null;
      let invalidCount = 0;

      for (const log of auditLogs) {
        const currentHash = crypto
          .createHash('sha256')
          .update(`${log.log_id}${log.action}${log.details}${previousHash || ''}`)
          .digest('hex');

        const isValid = log.previous_hash === previousHash;

        await connection.query(
          `INSERT INTO hash_chain_verification 
           (chain_type, block_id, previous_hash, current_hash, computed_hash, is_valid, verified_by)
           VALUES ('audit_log', ?, ?, ?, ?, ?, ?)`,
          [
            log.log_id,
            previousHash,
            log.previous_hash,
            currentHash,
            isValid,
            verifiedBy
          ]
        );

        if (!isValid) invalidCount++;
        previousHash = currentHash;
      }

      return {
        success: true,
        total_blocks: auditLogs.length,
        invalid_blocks: invalidCount,
        chain_health: invalidCount === 0 ? 'healthy' : 'compromised'
      };
    } finally {
      connection.release();
    }
  }

  /**
   * 7. IP BLOCKING & RATE LIMITING
   * Manage IP blocks and rate limit logs
   */
  async getIPBlocks(activeOnly = true) {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT 
          b.*,
          u.email as blocked_by_email
        FROM ip_blocks b
        LEFT JOIN users u ON b.blocked_by = u.user_id
        WHERE 1=1
      `;

      if (activeOnly) {
        query += ` AND b.is_active = TRUE 
                   AND (b.expires_at IS NULL OR b.expires_at > NOW())`;
      }

      query += ' ORDER BY b.blocked_at DESC';
      const [blocks] = await connection.query(query);

      return blocks;
    } finally {
      connection.release();
    }
  }

  /**
   * Block an IP address
   */
  async blockIP(ipAddress, reason, blockedBy, expiresAt = null, blockType = 'manual') {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `INSERT INTO ip_blocks (ip_address, reason, blocked_by, expires_at, block_type)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           reason = VALUES(reason),
           blocked_by = VALUES(blocked_by),
           expires_at = VALUES(expires_at),
           is_active = TRUE,
           blocked_at = NOW()`,
        [ipAddress, reason, blockedBy, expiresAt, blockType]
      );

      return { success: true };
    } finally {
      connection.release();
    }
  }

  /**
   * Unblock an IP address
   */
  async unblockIP(ipAddress) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `UPDATE ip_blocks SET is_active = FALSE WHERE ip_address = ?`,
        [ipAddress]
      );

      return { success: true };
    } finally {
      connection.release();
    }
  }

  /**
   * Get rate limit logs
   */
  async getRateLimitLogs(periodHours = 24) {
    const connection = await pool.getConnection();
    try {
      const [logs] = await connection.query(
        `SELECT 
          r.*,
          u.email as user_email
        FROM rate_limit_logs r
        LEFT JOIN users u ON r.user_id = u.user_id
        WHERE r.window_start > DATE_SUB(NOW(), INTERVAL ? HOUR)
        ORDER BY r.window_start DESC
        LIMIT 500`,
        [periodHours]
      );

      return logs;
    } finally {
      connection.release();
    }
  }

  /**
   * 8. SECURITY ALERTS
   * Get security alerts requiring attention
   */
  async getSecurityAlerts(filters = {}) {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT 
          a.*,
          u.email as affected_user_email,
          u.role as affected_user_role,
          e.event_type as source_event_type,
          e.severity as source_severity
        FROM security_alerts a
        LEFT JOIN users u ON a.affected_user_id = u.user_id
        LEFT JOIN security_events e ON a.source_event_id = e.event_id
        WHERE 1=1
      `;
      const params = [];

      if (filters.status) {
        query += ' AND a.status = ?';
        params.push(filters.status);
      } else {
        query += " AND a.status IN ('new', 'acknowledged', 'investigating')";
      }

      if (filters.severity) {
        query += ' AND a.severity = ?';
        params.push(filters.severity);
      }

      query += ' ORDER BY a.created_at DESC LIMIT 200';
      const [alerts] = await connection.query(query, params);

      return alerts;
    } finally {
      connection.release();
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `UPDATE security_alerts 
         SET status = 'acknowledged',
             acknowledged_at = NOW(),
             acknowledged_by = ?
         WHERE alert_id = ?`,
        [acknowledgedBy, alertId]
      );

      return { success: true };
    } finally {
      connection.release();
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId, resolvedBy, resolutionNotes) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `UPDATE security_alerts 
         SET status = 'resolved',
             resolved_at = NOW(),
             resolved_by = ?,
             resolution_notes = ?
         WHERE alert_id = ?`,
        [resolvedBy, resolutionNotes, alertId]
      );

      return { success: true };
    } finally {
      connection.release();
    }
  }

  /**
   * 9. SECURITY RISK SCORE & RECOMMENDATIONS
   * Generate AI-powered security risk analysis
   */
  async getSecurityRiskScore() {
    const connection = await pool.getConnection();
    try {
      // Calculate risk score based on multiple factors
      const [riskFactors] = await connection.query(
        `SELECT 
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_events,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_events,
          COUNT(CASE WHEN resolution_status = 'pending' THEN 1 END) as pending_anomalies,
          COUNT(CASE WHEN status = 'new' THEN 1 END) as new_alerts,
          COUNT(DISTINCT source_ip) as suspicious_ips_24h,
          COUNT(CASE WHEN event_type = 'failed_login' THEN 1 END) as failed_logins_24h
        FROM security_events e
        LEFT JOIN security_anomalies a ON e.event_id = a.event_id
        LEFT JOIN security_alerts al ON e.event_id = al.source_event_id
        WHERE e.timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)`
      );

      const factors = riskFactors[0];
      
      // Calculate weighted risk score (0-100)
      let riskScore = 0;
      riskScore += factors.critical_events * 10;
      riskScore += factors.high_events * 5;
      riskScore += factors.pending_anomalies * 3;
      riskScore += factors.new_alerts * 2;
      riskScore += Math.min(factors.suspicious_ips_24h * 2, 20);
      riskScore += Math.min(factors.failed_logins_24h, 20);

      riskScore = Math.min(riskScore, 100);

      // Generate recommendations
      const recommendations = [];
      if (factors.critical_events > 0) {
        recommendations.push('Critical security events detected. Immediate investigation required.');
      }
      if (factors.pending_anomalies > 10) {
        recommendations.push('High number of pending anomalies. Review anomaly detection center.');
      }
      if (factors.failed_logins_24h > 50) {
        recommendations.push('Excessive failed login attempts detected. Consider enabling IP blocking.');
      }
      if (factors.suspicious_ips_24h > 20) {
        recommendations.push('Multiple suspicious IP addresses detected. Review threat heatmap.');
      }

      return {
        risk_score: riskScore,
        risk_level: riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
        factors: factors,
        recommendations: recommendations.length > 0 ? recommendations : ['System security status is normal.'],
        last_updated: new Date().toISOString()
      };
    } finally {
      connection.release();
    }
  }

  /**
   * 10. BLO DEVICE MONITORING
   * Monitor BLO field devices and geo-location
   */
  async getBLODeviceMonitoring() {
    const connection = await pool.getConnection();
    try {
      const [devices] = await connection.query(
        `SELECT 
          d.*,
          u.email as blo_email,
          u.name as blo_name,
          u.role as blo_role
        FROM blo_device_monitoring d
        JOIN users u ON d.blo_id = u.user_id
        ORDER BY d.last_seen_at DESC`
      );

      // Calculate location mismatches
      const devicesWithMismatch = devices.map(device => {
        let distance = null;
        if (device.last_location_lat && device.expected_location_lat) {
          // Haversine distance calculation
          const R = 6371; // Earth radius in km
          const dLat = (device.last_location_lat - device.expected_location_lat) * Math.PI / 180;
          const dLng = (device.last_location_lng - device.expected_location_lng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(device.expected_location_lat * Math.PI / 180) *
                    Math.cos(device.last_location_lat * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          distance = R * c; // Distance in km
        }

        return {
          ...device,
          distance_from_expected: distance,
          location_mismatch: distance !== null && distance > 5 // 5km threshold
        };
      });

      return devicesWithMismatch;
    } finally {
      connection.release();
    }
  }

  /**
   * Update BLO device location
   */
  async updateBLODeviceLocation(bloId, deviceFingerprint, lat, lng, deviceInfo = {}) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `INSERT INTO blo_device_monitoring 
         (blo_id, device_fingerprint, last_seen_at, last_location_lat, last_location_lng, is_online, device_name, app_version, os_version)
         VALUES (?, ?, NOW(), ?, ?, TRUE, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           last_seen_at = NOW(),
           last_location_lat = VALUES(last_location_lat),
           last_location_lng = VALUES(last_location_lng),
           is_online = TRUE,
           device_name = VALUES(device_name),
           app_version = VALUES(app_version),
           os_version = VALUES(os_version)`,
        [
          bloId,
          deviceFingerprint,
          lat,
          lng,
          deviceInfo.deviceName || null,
          deviceInfo.appVersion || null,
          deviceInfo.osVersion || null
        ]
      );

      return { success: true };
    } finally {
      connection.release();
    }
  }
}

module.exports = new SIEMServiceExtended();

