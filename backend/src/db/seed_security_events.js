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
 * Seed comprehensive security events for SIEM Dashboard testing
 */

async function seedSecurityEvents() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('🔒 Seeding security events...\n');

    // Get some user IDs
    const [users] = await connection.query('SELECT user_id, role FROM users LIMIT 10');
    const userIds = users.map(u => u.user_id);
    
    if (userIds.length === 0) {
      console.log('⚠️  No users found. Please seed users first.');
      return;
    }

    const eventTypes = [
      'login', 'failed_login', 'logout', 'password_change', 'password_reset',
      'admin_action', 'voter_edit', 'biometric_submission', 'document_upload',
      'api_abuse', 'rate_limit', 'suspicious_activity', 'hash_chain_failure',
      'geo_location_mismatch', 'device_change', 'privilege_escalation',
      'data_export', 'bulk_operation', 'audit_log_access'
    ];

    const severities = ['low', 'medium', 'high', 'critical'];
    const sourceIPs = [
      '192.168.1.100', '10.0.0.50', '172.16.0.25', '203.0.113.45',
      '198.51.100.123', '192.0.2.67', '203.0.113.89', '198.51.100.234',
      '192.0.2.156', '203.0.113.12', '198.51.100.78', '192.0.2.89'
    ];

    const actions = [
      'User logged in', 'Failed login attempt', 'Password changed',
      'Voter record updated', 'Biometric data submitted', 'Document uploaded',
      'API rate limit exceeded', 'Suspicious API pattern detected',
      'Hash chain verification failed', 'Admin privilege accessed',
      'Bulk voter export', 'Audit log accessed', 'IP blocked',
      'Anomaly detected', 'Security alert triggered'
    ];

    const events = [];
    const now = new Date();
    
    // Generate events for the last 7 days
    for (let i = 0; i < 500; i++) {
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
      
      // Risk score based on severity
      let riskScore = 50;
      if (severity === 'critical') riskScore = 90 + Math.floor(Math.random() * 10);
      else if (severity === 'high') riskScore = 70 + Math.floor(Math.random() * 20);
      else if (severity === 'medium') riskScore = 40 + Math.floor(Math.random() * 30);
      else riskScore = 20 + Math.floor(Math.random() * 20);

      const details = {
        browser: ['Chrome', 'Firefox', 'Safari', 'Edge'][Math.floor(Math.random() * 4)],
        os: ['Windows', 'macOS', 'Linux', 'Android', 'iOS'][Math.floor(Math.random() * 5)],
        user_agent: `Mozilla/5.0 (${Math.random() > 0.5 ? 'Windows' : 'Mac'})`,
        session_id: `session_${Math.random().toString(36).substr(2, 9)}`
      };

      const geolocation = {
        country: ['India', 'USA', 'China', 'Russia', 'Unknown'][Math.floor(Math.random() * 5)],
        city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'][Math.floor(Math.random() * 5)],
        lat: 19.0760 + (Math.random() - 0.5) * 10,
        lng: 72.8777 + (Math.random() - 0.5) * 10
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

    // Insert events in batches
    const batchSize = 100;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      await connection.query(
        `INSERT INTO security_events 
         (event_type, severity, source_ip, user_id, action, details, risk_score, timestamp)
         VALUES ?`,
        [batch]
      );
      console.log(`  ✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)}`);
    }

    // Create some anomalies
    console.log('\n📊 Creating security anomalies...');
    const anomalyTypes = [
      'unusual_login_location', 'rapid_api_calls', 'privilege_escalation',
      'suspicious_device', 'failed_login_attack', 'data_exfiltration',
      'hash_chain_break', 'geo_mismatch', 'offline_activity'
    ];

    const [recentEvents] = await connection.query(
      `SELECT event_id, user_id, source_ip, risk_score FROM security_events 
       WHERE risk_score >= 70 ORDER BY timestamp DESC LIMIT 50`
    );

    for (const event of recentEvents) {
      const anomalyType = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)];
      const severity = event.risk_score >= 90 ? 'critical' : event.risk_score >= 80 ? 'high' : 'medium';
      
      await connection.query(
        `INSERT INTO security_anomalies 
         (anomaly_type, severity, score, event_id, user_id, source_ip, description, context, resolution_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          anomalyType,
          severity,
          event.risk_score,
          event.event_id,
          event.user_id,
          event.source_ip,
          `Detected ${anomalyType} with risk score ${event.risk_score}`,
          JSON.stringify({ detected_at: new Date().toISOString(), auto_detected: true })
        ]
      );
    }
    console.log(`  ✅ Created ${recentEvents.length} anomalies`);

    // Create some security alerts
    console.log('\n📊 Creating security alerts...');
    const [highRiskEvents] = await connection.query(
      `SELECT event_id, user_id, source_ip, severity, action FROM security_events 
       WHERE severity IN ('high', 'critical') ORDER BY timestamp DESC LIMIT 30`
    );

    for (const event of highRiskEvents) {
      await connection.query(
        `INSERT INTO security_alerts 
         (alert_type, severity, title, message, source_event_id, affected_user_id, affected_ip, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'new')`,
        [
          event.severity === 'critical' ? 'critical_threat' : 'high_risk_event',
          event.severity,
          `Security Alert: ${event.action}`,
          `High-risk security event detected: ${event.action}. Immediate investigation recommended.`,
          event.event_id,
          event.user_id,
          event.source_ip
        ]
      );
    }
    console.log(`  ✅ Created ${highRiskEvents.length} security alerts`);

    // Create some IP blocks
    console.log('\n📊 Creating IP blocks...');
    const suspiciousIPs = sourceIPs.slice(0, 3);
    for (const ip of suspiciousIPs) {
      await connection.query(
        `INSERT INTO ip_blocks (ip_address, reason, blocked_by, block_type, is_active)
         VALUES (?, ?, ?, 'automatic', TRUE)
         ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
        [
          ip,
          'Multiple failed login attempts detected',
          userIds[0] // First admin user
        ]
      );
    }
    console.log(`  ✅ Created ${suspiciousIPs.length} IP blocks`);

    console.log('\n✅ Security events seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding security events:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedSecurityEvents()
    .then(() => {
      console.log('\n✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedSecurityEvents;

