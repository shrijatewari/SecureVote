/**
 * Complete RBAC Seed Data
 * Seeds roles, permissions, and assigns permissions to roles
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'voting_system'
};

async function seedRBAC() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    console.log('🌱 Seeding RBAC data...\n');

    // 1. Insert Roles
    const roles = [
      { name: 'SUPERADMIN', description: 'Full system access. Manages roles, AI thresholds, security.', level: 10 },
      { name: 'CEO', description: 'State-level chief officer; approves revisions, large-scale actions.', level: 9 },
      { name: 'DEO', description: 'District officer; manages BLOs, tasks, district operations.', level: 8 },
      { name: 'ERO', description: 'Electoral registration officer; approves voter changes.', level: 7 },
      { name: 'CRO', description: 'Chief Returning Officer; in charge of counting & results.', level: 7 },
      { name: 'BLO', description: 'Booth Level Officer; handles field verification, biometric recapture.', level: 5 },
      { name: 'DOC_VERIFIER', description: 'Document Verification Officer; manages document OCR approvals.', level: 6 },
      { name: 'AI_AUDITOR', description: 'AI Auditor; reviews AI scores, fraud flags.', level: 6 },
      { name: 'HELPDESK', description: 'Helpdesk Officer; only grievance management.', level: 4 },
      { name: 'PRESIDING_OFFICER', description: 'Presiding Officer; manages polling station operations.', level: 5 },
      { name: 'VIEW_ONLY', description: 'Read-only access for audits.', level: 1 }
    ];

    const roleMap = {};
    for (const role of roles) {
      const [result] = await connection.query(
        `INSERT INTO roles (name, description, level)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description), level = VALUES(level)`,
        [role.name, role.description, role.level]
      );
      const roleId = result.insertId || (await connection.query(`SELECT role_id FROM roles WHERE name = ?`, [role.name]))[0][0].role_id;
      roleMap[role.name] = roleId;
      console.log(`✅ Role: ${role.name} (ID: ${roleId})`);
    }

    // 2. Insert Permissions
    const permissions = [
      // Dashboard
      { key: 'dashboard.view', description: 'View dashboard overview', module: 'dashboard' },
      
      // Voter Management
      { key: 'voters.view', description: 'View voter records', module: 'voters' },
      { key: 'voters.edit', description: 'Edit voter records', module: 'voters' },
      { key: 'voters.approve', description: 'Approve voter updates', module: 'voters' },
      { key: 'voters.assign_blo', description: 'Assign BLO to voters', module: 'voters' },
      { key: 'voters.delete', description: 'Delete voter records', module: 'voters' },
      
      // Roll Revision
      { key: 'revision.view_flags', description: 'View revision flags', module: 'revision' },
      { key: 'revision.approve_flags', description: 'Approve revision flags', module: 'revision' },
      { key: 'revision.dry_run', description: 'Run dry-run revision', module: 'revision' },
      { key: 'revision.commit', description: 'Commit revision batch', module: 'revision' },
      
      // Duplicate Detection
      { key: 'duplicates.view', description: 'View duplicate records', module: 'duplicates' },
      { key: 'duplicates.resolve', description: 'Resolve duplicates (merge/mark ghost)', module: 'duplicates' },
      
      // Death Records
      { key: 'death_records.upload', description: 'Upload death record CSV', module: 'death_records' },
      { key: 'death_records.approve', description: 'Approve death record removal', module: 'death_records' },
      { key: 'death_records.view', description: 'View death records', module: 'death_records' },
      
      // BLO Tasks
      { key: 'blo_tasks.view', description: 'View BLO tasks', module: 'blo_tasks' },
      { key: 'blo_tasks.submit', description: 'Submit BLO task completion', module: 'blo_tasks' },
      { key: 'blo_tasks.assign', description: 'Assign BLO tasks', module: 'blo_tasks' },
      
      // Document Verification
      { key: 'documents.approve', description: 'Approve documents', module: 'documents' },
      { key: 'documents.view_ocr', description: 'View OCR results', module: 'documents' },
      
      // AI Services
      { key: 'ai.view_logs', description: 'View AI service logs', module: 'ai' },
      { key: 'ai.change_thresholds', description: 'Change AI thresholds', module: 'ai' },
      { key: 'ai.retrain', description: 'Retrain AI models', module: 'ai' },
      
      // Grievances
      { key: 'grievances.view', description: 'View grievances', module: 'grievances' },
      { key: 'grievances.manage', description: 'Manage grievances (assign/respond)', module: 'grievances' },
      
      // EPIC
      { key: 'epic.view', description: 'View EPIC records', module: 'epic' },
      { key: 'epic.generate', description: 'Generate EPIC', module: 'epic' },
      
      // Biometric Operations
      { key: 'biometric.view', description: 'View biometric operations', module: 'biometric' },
      { key: 'biometric.approve', description: 'Approve biometric verification', module: 'biometric' },
      { key: 'biometric.compare', description: 'Compare biometrics', module: 'biometric' },
      
      // Security & Audit
      { key: 'security.view', description: 'View security logs', module: 'security' },
      { key: 'security.manage', description: 'Manage security settings', module: 'security' },
      
      // System Settings
      { key: 'settings.view', description: 'View system settings', module: 'settings' },
      { key: 'settings.manage', description: 'Manage system settings', module: 'settings' },
      { key: 'settings.manage_roles', description: 'Manage roles and permissions', module: 'settings' }
    ];

    const permissionMap = {};
    for (const perm of permissions) {
      const [result] = await connection.query(
        `INSERT INTO permissions (key_name, description, module)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description), module = VALUES(module)`,
        [perm.key, perm.description, perm.module]
      );
      const permId = result.insertId || (await connection.query(`SELECT permission_id FROM permissions WHERE key_name = ?`, [perm.key]))[0][0].permission_id;
      permissionMap[perm.key] = permId;
    }

    console.log(`✅ Inserted ${permissions.length} permissions\n`);

    // 3. Assign Permissions to Roles (EXACT MATRIX FROM USER REQUIREMENTS)
    const rolePermissions = {
      SUPERADMIN: Object.keys(permissionMap), // All permissions - root access
      
      CEO: [
        // Dashboard
        'dashboard.view',
        // AI Services - can view AND modify
        'ai.view_logs', 'ai.change_thresholds', 'ai.retrain',
        // Voter Management - full access
        'voters.view', 'voters.edit', 'voters.approve', 'voters.assign_blo',
        // Roll Revision - can commit (highest risk)
        'revision.view_flags', 'revision.approve_flags', 'revision.dry_run', 'revision.commit',
        // Duplicate Detection - can split accidental merges
        'duplicates.view', 'duplicates.resolve',
        // Death Records - can upload CSV
        'death_records.upload', 'death_records.approve', 'death_records.view',
        // BLO Tasks - can assign
        'blo_tasks.view', 'blo_tasks.assign',
        // Grievances - full access
        'grievances.view', 'grievances.manage',
        // Address Analytics
        'voters.view', // For address clusters
        // Document Verification
        'documents.view_ocr', 'documents.approve',
        // Biometric Operations
        'biometric.view', 'biometric.approve', 'biometric.compare',
        // Official Communications - can publish with signature
        'voters.view', // For communications
        // Security & Audit
        'security.view', 'security.manage',
        // Content Management
        'settings.view', // For FAQ and multilingual
        // Election Management
        'voters.view', // For elections
        // System Settings - can change configs but not roles
        'settings.view', 'settings.manage'
      ],
      
      DEO: [
        // Dashboard
        'dashboard.view',
        // AI Services - view only
        'ai.view_logs',
        // Voter Management - can assign BLO
        'voters.view', 'voters.edit', 'voters.approve', 'voters.assign_blo',
        // Roll Revision - can dry-run but NOT commit
        'revision.view_flags', 'revision.approve_flags', 'revision.dry_run',
        // Duplicate Detection - can split accidental merges
        'duplicates.view', 'duplicates.resolve',
        // Death Records - can upload CSV
        'death_records.upload', 'death_records.approve', 'death_records.view',
        // BLO Tasks - can assign
        'blo_tasks.view', 'blo_tasks.assign',
        // Grievances - full access
        'grievances.view', 'grievances.manage',
        // Address Analytics - can assign BLO check
        'voters.view',
        // Document Verification
        'documents.view_ocr', 'documents.approve',
        // Biometric Operations
        'biometric.view', 'biometric.approve', 'biometric.compare',
        // Official Communications - can create notice
        'voters.view',
        // Security & Audit - view only
        'security.view',
        // Content Management
        'settings.view',
        // Election Management - can manage polling stations
        'voters.view'
      ],
      
      ERO: [
        // Dashboard
        'dashboard.view',
        // AI Services - view predictions only
        'ai.view_logs',
        // Voter Management - can approve edits
        'voters.view', 'voters.edit', 'voters.approve',
        // Roll Revision - can approve flags
        'revision.view_flags', 'revision.approve_flags',
        // Duplicate Detection - can resolve
        'duplicates.view', 'duplicates.resolve',
        // Death Records - can approve removal
        'death_records.approve', 'death_records.view',
        // BLO Tasks - view only
        'blo_tasks.view',
        // Grievances - full access
        'grievances.view', 'grievances.manage',
        // Address Analytics - can flag suspicious
        'voters.view',
        // Document Verification
        'documents.view_ocr', 'documents.approve',
        // Biometric Operations - can approve
        'biometric.view', 'biometric.approve',
        // Official Communications - can verify documents
        'voters.view',
        // EPIC
        'epic.view', 'epic.generate'
      ],
      
      BLO: [
        // Dashboard
        'dashboard.view',
        // Voter Management - view only
        'voters.view',
        // BLO Tasks - can view and submit
        'blo_tasks.view', 'blo_tasks.submit',
        // Biometric Operations - can view and request recapture
        'biometric.view'
        // NOTE: BLO does NOT have grievances.view according to matrix
      ],
      
      CRO: [
        // Dashboard
        'dashboard.view',
        // Voter Management - view only
        'voters.view',
        // BLO Tasks - view only
        'blo_tasks.view',
        // Election Management - can manage candidates
        'voters.view'
      ],
      
      DOC_VERIFIER: [
        // Dashboard
        'dashboard.view',
        // Voter Management - view only
        'voters.view',
        // Document Verification - can approve/reject
        'documents.view_ocr', 'documents.approve'
      ],
      
      AI_AUDITOR: [
        // Dashboard
        'dashboard.view',
        // AI Services - view logs only
        'ai.view_logs',
        // Voter Management - view only
        'voters.view',
        // Duplicate Detection - view only
        'duplicates.view',
        // Address Analytics - view clusters
        'voters.view',
        // Biometric Operations - view fraud flags
        'biometric.view',
        // Security & Audit - can verify hash-chain
        'security.view'
      ],
      
      HELPDESK: [
        // Dashboard
        'dashboard.view',
        // Grievances - view and respond
        'grievances.view', 'grievances.manage'
      ],
      
      PRESIDING_OFFICER: [
        // Dashboard
        'dashboard.view',
        // Voter Management - view only
        'voters.view',
        // BLO Tasks - view only
        'blo_tasks.view'
      ],
      
      VIEW_ONLY: [
        // Dashboard - read-only
        'dashboard.view',
        // Voter Management - read-only
        'voters.view',
        // Grievances - read-only
        'grievances.view',
        // BLO Tasks - read-only
        'blo_tasks.view'
      ]
    };

    // Clear existing role_permissions
    await connection.query('DELETE FROM role_permissions');

    for (const [roleName, permKeys] of Object.entries(rolePermissions)) {
      const roleId = roleMap[roleName];
      if (!roleId) continue;

      for (const permKey of permKeys) {
        const permId = permissionMap[permKey];
        if (permId) {
          await connection.query(
            `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
            [roleId, permId]
          );
        }
      }
      console.log(`✅ Assigned ${permKeys.length} permissions to ${roleName}`);
    }

    // 4. Update existing users to have role_id
    console.log('\n🔄 Updating existing users with role_id...');
    
    // Map existing role enum to new role_id
    const roleMapping = {
      'eci': 'SUPERADMIN',
      'ceo': 'CEO',
      'deo': 'DEO',
      'ero': 'ERO',
      'blo': 'BLO',
      'admin': 'DEO' // Default admin to DEO
    };

    for (const [oldRole, newRole] of Object.entries(roleMapping)) {
      const roleId = roleMap[newRole];
      if (roleId) {
        await connection.query(
          `UPDATE users SET role_id = ? WHERE role = ? AND role_id IS NULL`,
          [roleId, oldRole]
        );
      }
    }

    // Assign specific users to specific roles
    const userRoleAssignments = [
      { email: 'admin1@election.gov.in', role: 'SUPERADMIN' },
      { email: 'admin2@election.gov.in', role: 'BLO' },
      { email: 'admin3@election.gov.in', role: 'ERO' },
      { email: 'admin4@election.gov.in', role: 'DEO' },
      { email: 'admin5@election.gov.in', role: 'CEO' }
    ];

    for (const assignment of userRoleAssignments) {
      const roleId = roleMap[assignment.role];
      if (roleId) {
        await connection.query(
          `UPDATE users SET role_id = ? WHERE email = ?`,
          [roleId, assignment.email]
        );
        console.log(`✅ Assigned ${assignment.email} → ${assignment.role}`);
      }
    }

    console.log('\n🎉 RBAC seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  seedRBAC()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedRBAC;

