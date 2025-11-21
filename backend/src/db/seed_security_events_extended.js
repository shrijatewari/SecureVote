const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'voting_system',
};

/**
 * Extended Security Events Seeding - At least 15 records per table
 */

async function seedSecurityEventsExtended() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('🔒 Seeding extended security events (15+ records per table)...\n');

    // Get user IDs
    const [users] = await connection.query('SELECT user_id, role, email FROM users LIMIT 20');
    const userIds = users.map(u => u.user_id);
    
    if (userIds.length === 0) {
      console.log('⚠️  No users found. Please seed users first.');
      return;
    }

    // Clear existing data
    console.log('🗑️  Clearing existing security data...');
    await connection.query('DELETE FROM security_alerts');
    await connection.query('DELETE FROM security_anomalies');
    await connection.query('DELETE FROM ip_blocks');
    await connection.query('DELETE FROM rate_limit_logs');
    await connection.query('DELETE FROM security_events');
    await connection.query('DELETE FROM admin_activity_logs');
    await connection.query('DELETE FROM blo_device_monitoring');
    console.log('✅ Cleared existing data');

    const eventTypes = [
      'login', 'failed_login', 'logout', 'password_change', 'password_reset',
      'admin_action', 'voter_edit', 'biometric_submission', 'document_upload',
      'api_abuse', 'rate_limit', 'suspicious_activity', 'hash_chain_failure',
      'geo_location_mismatch', 'device_change', 'privilege_escalation',
      'data_export', 'bulk_operation', 'audit_log_access', 'ip_blocked'
    ];

    const severities = ['low', 'medium', 'high', 'critical'];
    const sourceIPs = [
      '192.168.1.100', '10.0.0.50', '172.16.0.25', '203.0.113.45',
      '198.51.100.123', '192.0.2.67', '203.0.113.89', '198.51.100.234',
      '192.0.2.156', '203.0.113.12', '198.51.100.78', '192.0.2.89',
      '103.45.67.89', '142.93.45.12', '185.199.108.153', '140.82.112.3',
      '151.101.1.140', '172.217.164.110', '216.58.192.142', '104.16.132.127'
    ];

    const actions = [
      'User logged in', 'Failed login attempt', 'Password changed',
      'Voter record updated', 'Biometric data submitted', 'Document uploaded',
      'API rate limit exceeded', 'Suspicious API pattern detected',
      'Hash chain verification failed', 'Admin privilege accessed',
      'Bulk voter export', 'Audit log accessed', 'IP blocked',
      'Anomaly detected', 'Security alert triggered', 'Device registered',
      'Location mismatch detected', 'Unusual activity pattern', 'Data export initiated'
    ];

    // 1. SECURITY EVENTS - At least 50 events
    console.log('\n📊 Creating security events (50+ events)...');
    const events = [];
    const now = new Date();
    
    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 24);
      const minutesAgo = Math.floor(Math.random() * 60);
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - daysAgo);
      timestamp.setHours(timestamp.getHours() - hoursAgo);
      timestamp.setMinutes(timestamp.getMinutes() - minutesAgo);

      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const sourceIP = sourceIPs[Math.floor(Math.random() * sourceIPs.length)];
      const userId = userIds[Math.floor(Math.random() * userIds.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      
      let riskScore = 50;
      if (severity === 'critical') riskScore = 90 + Math.floor(Math.random() * 10);
      else if (severity === 'high') riskScore = 70 + Math.floor(Math.random() * 20);
      else if (severity === 'medium') riskScore = 40 + Math.floor(Math.random() * 30);
      else riskScore = 20 + Math.floor(Math.random() * 20);

      const details = {
        browser: ['Chrome', 'Firefox', 'Safari', 'Edge'][Math.floor(Math.random() * 4)],
        os: ['Windows', 'macOS', 'Linux', 'Android', 'iOS'][Math.floor(Math.random() * 5)],
        user_agent: `Mozilla/5.0`,
        session_id: `session_${Math.random().toString(36).substr(2, 9)}`
      };

      events.push([
        eventType,
        severity,
        sourceIP,
        userId,
        action,
        JSON.stringify(details),
        riskScore,
        timestamp
      ]);
    }

    await connection.query(
      `INSERT INTO security_events 
       (event_type, severity, source_ip, user_id, action, details, risk_score, timestamp)
       VALUES ?`,
      [events]
    );
    console.log(`✅ Created ${events.length} security events`);

    // Get event IDs for linking
    const [eventRows] = await connection.query('SELECT event_id, risk_score, severity FROM security_events ORDER BY timestamp DESC LIMIT 50');

    // 2. SECURITY ANOMALIES - At least 20 anomalies
    console.log('\n📊 Creating security anomalies (20+ anomalies)...');
    const anomalyTypes = [
      'unusual_login_location', 'rapid_api_calls', 'privilege_escalation',
      'suspicious_device', 'failed_login_attack', 'data_exfiltration',
      'hash_chain_break', 'geo_mismatch', 'offline_activity', 'bulk_export',
      'unusual_access_pattern', 'privilege_abuse', 'suspicious_timing'
    ];

    for (let i = 0; i < 20; i++) {
      const event = eventRows[Math.floor(Math.random() * Math.min(eventRows.length, 20))];
      const anomalyType = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)];
      const severity = event.severity || (event.risk_score >= 90 ? 'critical' : event.risk_score >= 80 ? 'high' : 'medium');
      
      await connection.query(
        `INSERT INTO security_anomalies 
         (anomaly_type, severity, score, event_id, user_id, source_ip, description, context, resolution_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          anomalyType,
          severity,
          event.risk_score,
          event.event_id,
          eventRows[Math.floor(Math.random() * Math.min(eventRows.length, 10))].user_id || userIds[0],
          sourceIPs[Math.floor(Math.random() * sourceIPs.length)],
          `Detected ${anomalyType} with risk score ${event.risk_score}. Requires investigation.`,
          JSON.stringify({ 
            detected_at: new Date().toISOString(), 
            auto_detected: true,
            pattern: anomalyType,
            confidence: 0.7 + Math.random() * 0.3
          }),
          i < 5 ? 'pending' : i < 10 ? 'investigating' : i < 15 ? 'false_positive' : 'resolved'
        ]
      );
    }
    console.log('✅ Created 20 security anomalies');

    // 3. SECURITY ALERTS - At least 20 alerts
    console.log('\n📊 Creating security alerts (20+ alerts)...');
    const alertTypes = ['critical_threat', 'high_risk_event', 'suspicious_activity', 'anomaly_detected', 'integrity_failure'];
    
    for (let i = 0; i < 20; i++) {
      const event = eventRows[Math.floor(Math.random() * Math.min(eventRows.length, 20))];
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const severity = event.severity || (event.risk_score >= 90 ? 'critical' : event.risk_score >= 80 ? 'high' : 'medium');
      
      await connection.query(
        `INSERT INTO security_alerts 
         (alert_type, severity, title, message, source_event_id, affected_user_id, affected_ip, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          alertType,
          severity,
          `Security Alert ${i + 1}: ${eventTypes[Math.floor(Math.random() * eventTypes.length)]}`,
          `High-risk security event detected: ${actions[Math.floor(Math.random() * actions.length)]}. Immediate investigation recommended. Event ID: ${event.event_id}`,
          event.event_id,
          userIds[Math.floor(Math.random() * userIds.length)],
          sourceIPs[Math.floor(Math.random() * sourceIPs.length)],
          i < 5 ? 'new' : i < 10 ? 'acknowledged' : i < 15 ? 'investigating' : 'resolved'
        ]
      );
    }
    console.log('✅ Created 20 security alerts');

    // 4. IP BLOCKS - At least 15 blocks
    console.log('\n📊 Creating IP blocks (15+ blocks)...');
    const blockReasons = [
      'Multiple failed login attempts',
      'Suspicious activity pattern',
      'Rate limit exceeded',
      'Geographic anomaly detected',
      'Known malicious IP',
      'Automated bot detected',
      'Brute force attack',
      'Manual block by admin'
    ];

    for (let i = 0; i < 15; i++) {
      const ip = sourceIPs[i % sourceIPs.length];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Math.floor(Math.random() * 30));
      
      await connection.query(
        `INSERT INTO ip_blocks (ip_address, reason, blocked_by, expires_at, block_type, is_active)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE reason = VALUES(reason), is_active = VALUES(is_active)`,
        [
          ip,
          blockReasons[Math.floor(Math.random() * blockReasons.length)],
          userIds[0],
          expiresAt,
          i < 5 ? 'automatic' : 'manual',
          i < 12 ? true : false // Some expired blocks
        ]
      );
    }
    console.log('✅ Created 15 IP blocks');

    // 5. RATE LIMIT LOGS - At least 20 logs
    console.log('\n📊 Creating rate limit logs (20+ logs)...');
    const endpoints = [
      '/api/voters', '/api/auth/login', '/api/otp/send', '/api/documents/upload',
      '/api/biometric/register', '/api/admin/dashboard/stats', '/api/security/events'
    ];

    for (let i = 0; i < 20; i++) {
      const windowStart = new Date();
      windowStart.setHours(windowStart.getHours() - Math.floor(Math.random() * 24));
      const windowEnd = new Date(windowStart);
      windowEnd.setHours(windowEnd.getHours() + 1);

      await connection.query(
        `INSERT INTO rate_limit_logs 
         (ip_address, user_id, endpoint, request_count, window_start, window_end, blocked)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sourceIPs[Math.floor(Math.random() * sourceIPs.length)],
          Math.random() > 0.5 ? userIds[Math.floor(Math.random() * userIds.length)] : null,
          endpoints[Math.floor(Math.random() * endpoints.length)],
          5 + Math.floor(Math.random() * 50),
          windowStart,
          windowEnd,
          Math.random() > 0.7
        ]
      );
    }
    console.log('✅ Created 20 rate limit logs');

    // 6. ADMIN ACTIVITY LOGS - At least 20 logs
    console.log('\n📊 Creating admin activity logs (20+ logs)...');
    const modules = [
      'voter_management', 'duplicate_detection', 'death_records', 'biometric_ops',
      'document_verification', 'grievance_management', 'epic_management', 'security'
    ];
    const adminActions = [
      'viewed voters', 'edited voter', 'approved voter', 'rejected voter',
      'merged duplicates', 'marked ghost', 'approved biometric', 'blocked IP',
      'viewed audit logs', 'exported data', 'changed settings'
    ];

    for (let i = 0; i < 20; i++) {
      const adminId = userIds[Math.floor(Math.random() * Math.min(userIds.length, 5))]; // Use first 5 as admins
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - Math.floor(Math.random() * 48));

      await connection.query(
        `INSERT INTO admin_activity_logs 
         (admin_id, admin_role, module, action, target_type, target_id, details, ip_address, user_agent, risk_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          adminId,
          users.find(u => u.user_id === adminId)?.role || 'admin',
          modules[Math.floor(Math.random() * modules.length)],
          adminActions[Math.floor(Math.random() * adminActions.length)],
          'voter',
          Math.floor(Math.random() * 100) + 1,
          JSON.stringify({ 
            timestamp: timestamp.toISOString(),
            changes: { field: 'status', old_value: 'pending', new_value: 'approved' }
          }),
          sourceIPs[Math.floor(Math.random() * sourceIPs.length)],
          'Mozilla/5.0',
          Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
        ]
      );
    }
    console.log('✅ Created 20 admin activity logs');

    // 7. BLO DEVICE MONITORING - At least 15 devices
    console.log('\n📊 Creating BLO device monitoring (15+ devices)...');
    const bloUsers = users.filter(u => u.role?.toLowerCase().includes('blo')).slice(0, 10);
    
    if (bloUsers.length > 0) {
      for (let i = 0; i < 15; i++) {
        const blo = bloUsers[i % bloUsers.length];
        const lastSeen = new Date();
        lastSeen.setHours(lastSeen.getHours() - Math.floor(Math.random() * 72));
        
        const lat = 19.0760 + (Math.random() - 0.5) * 5;
        const lng = 72.8777 + (Math.random() - 0.5) * 5;
        const expectedLat = lat + (Math.random() - 0.5) * 0.1;
        const expectedLng = lng + (Math.random() - 0.5) * 0.1;

        await connection.query(
          `INSERT INTO blo_device_monitoring 
           (blo_id, device_fingerprint, device_name, last_seen_at, last_location_lat, last_location_lng, 
            expected_location_lat, expected_location_lng, is_online, app_version, os_version, suspicious_activity_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             last_seen_at = VALUES(last_seen_at),
             last_location_lat = VALUES(last_location_lat),
             last_location_lng = VALUES(last_location_lng),
             is_online = VALUES(is_online)`,
          [
            blo.user_id,
            `device_${blo.user_id}_${i}`,
            `BLO Device ${i + 1}`,
            lastSeen,
            lat,
            lng,
            expectedLat,
            expectedLng,
            Math.random() > 0.3,
            `1.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}`,
            `Android ${10 + Math.floor(Math.random() * 5)}`,
            Math.floor(Math.random() * 5)
          ]
        );
      }
      console.log('✅ Created 15 BLO device monitoring records');
    } else {
      console.log('⚠️  No BLO users found, skipping BLO device monitoring');
    }

    console.log('\n✅ Extended security events seeding completed!');
    console.log('\n📊 Summary:');
    console.log(`  - Security Events: ${events.length}`);
    console.log(`  - Security Anomalies: 20`);
    console.log(`  - Security Alerts: 20`);
    console.log(`  - IP Blocks: 15`);
    console.log(`  - Rate Limit Logs: 20`);
    console.log(`  - Admin Activity Logs: 20`);
    console.log(`  - BLO Device Monitoring: ${bloUsers.length > 0 ? 15 : 0}`);
    
  } catch (error) {
    console.error('❌ Error seeding security events:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedSecurityEventsExtended()
    .then(() => {
      console.log('\n✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedSecurityEventsExtended;

