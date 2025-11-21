const { authenticateToken } = require('./auth');
const pool = require('../config/database');

/**
 * Role-Based Access Control (RBAC) Middleware
 * Implements comprehensive RBAC with roles and permissions
 * 
 * Role Hierarchy (highest to lowest):
 * 1. SUPERADMIN - Full system access
 * 2. CEO - Chief Electoral Officer (State level)
 * 3. DEO - District Election Officer (District level)
 * 4. ERO - Electoral Registration Officer (Constituency level)
 * 5. CRO - Chief Returning Officer
 * 6. DOC_VERIFIER - Document Verification Officer
 * 7. AI_AUDITOR - AI Auditor
 * 8. BLO - Booth Level Officer
 * 9. PRESIDING_OFFICER - Presiding Officer
 * 10. HELPDESK - Helpdesk Officer
 * 11. VIEW_ONLY - Read-only access
 * 12. citizen - Citizen/Voter (Public access only)
 */

// Legacy role hierarchy for backward compatibility
const ROLE_HIERARCHY = {
  SUPERADMIN: 10,
  CEO: 9,
  DEO: 8,
  ERO: 7,
  CRO: 7,
  DOC_VERIFIER: 6,
  AI_AUDITOR: 6,
  BLO: 5,
  PRESIDING_OFFICER: 5,
  HELPDESK: 4,
  VIEW_ONLY: 1,
  citizen: 1,
  // Legacy mappings
  superadmin: 10,
  eci: 10,
  ceo: 9,
  deo: 8,
  ero: 7,
  blo: 5,
  admin: 8
};

// Define permissions for each role
const ROLE_PERMISSIONS = {
  eci: [
    'admin.*',           // All admin functions
    'voters.*',          // Full voter management
    'elections.*',       // Election management
    'revision.*',        // Roll revision
    'death-records.*',   // Death record sync
    'duplicates.*',      // Duplicate detection
    'grievances.*',      // Grievance management
    'epic.*',            // EPIC management
    'ai-services.*',     // AI services
    'data-import.*',     // Data import
    'security.*',        // Security/SIEM
    'transparency.*',    // Transparency portal
    'audit.*',           // Audit logs
    'blo-tasks.*',       // BLO task management
    'communications.*'    // Communications
  ],
  ceo: [
    'admin.dashboard',   // Dashboard access
    'voters.read',       // Read voters
    'voters.update',     // Update voters
    'elections.read',    // Read elections
    'revision.read',     // Read revision data
    'revision.commit',   // Commit revisions
    'death-records.read', // Read death records
    'death-records.sync', // Sync death records
    'duplicates.read',   // Read duplicates
    'grievances.*',      // Full grievance access
    'epic.read',         // Read EPIC
    'epic.generate',     // Generate EPIC
    'ai-services.read',  // Read AI services
    'data-import.read',  // Read imports
    'transparency.read', // Read transparency
    'audit.read',        // Read audit logs
    'blo-tasks.read',    // Read BLO tasks
    'communications.read' // Read communications
  ],
  deo: [
    'admin.dashboard',   // Dashboard access
    'voters.read',       // Read voters in district
    'voters.update',     // Update voters in district
    'elections.read',    // Read elections
    'revision.read',     // Read revision data
    'revision.dry-run',  // Dry run revisions
    'death-records.read', // Read death records
    'duplicates.read',   // Read duplicates
    'grievances.read',   // Read grievances
    'grievances.update', // Update grievances
    'epic.read',         // Read EPIC
    'epic.generate',     // Generate EPIC
    'blo-tasks.read',    // Read BLO tasks
    'blo-tasks.assign',  // Assign BLO tasks
    'communications.read' // Read communications
  ],
  ero: [
    'admin.dashboard',   // Dashboard access
    'voters.read',       // Read voters in constituency
    'voters.update',     // Update voters in constituency
    'revision.read',     // Read revision data
    'revision.dry-run',  // Dry run revisions
    'duplicates.read',   // Read duplicates
    'grievances.read',   // Read grievances
    'grievances.update', // Update grievances
    'epic.read',         // Read EPIC
    'epic.generate',     // Generate EPIC
    'blo-tasks.read',    // Read BLO tasks
    'blo-tasks.assign',  // Assign BLO tasks
    'communications.read' // Read communications
  ],
  blo: [
    'admin.dashboard',   // Dashboard access (limited)
    'voters.read',       // Read assigned voters only
    'blo-tasks.read',    // Read own tasks
    'blo-tasks.submit',  // Submit tasks
    'grievances.read',   // Read grievances
    'grievances.create', // Create grievances
    'communications.read' // Read communications
  ],
  admin: [
    'admin.dashboard',   // Dashboard access
    'voters.read',       // Read voters
    'voters.update',     // Update voters
    'grievances.read',   // Read grievances
    'grievances.update', // Update grievances
    'epic.read',         // Read EPIC
    'communications.read' // Read communications
  ],
  citizen: [
    'profile.read',      // Own profile
    'profile.update',    // Update own profile
    'grievances.create', // Create grievances
    'grievances.read',   // Read own grievances
    'epic.download',     // Download own EPIC
    'transparency.read', // Read transparency data
    'communications.read' // Read public communications
  ]
};

/**
 * Check if user has permission
 */
function hasPermission(userRole, requiredPermission) {
  const role = (userRole || 'citizen').toLowerCase();
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.citizen;
  
  // Check exact match
  if (permissions.includes(requiredPermission)) {
    return true;
  }
  
  // Check wildcard permissions (e.g., 'admin.*' matches 'admin.dashboard')
  const permissionParts = requiredPermission.split('.');
  for (const perm of permissions) {
    if (perm.endsWith('.*')) {
      const prefix = perm.replace('.*', '');
      if (requiredPermission.startsWith(prefix + '.')) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if user role is at least the minimum required level
 */
function hasMinimumRole(userRole, minimumRole) {
  const userRoleUpper = (userRole || '').toUpperCase();
  const minRoleUpper = (minimumRole || '').toUpperCase();
  
  // Map legacy roles
  const roleMappings = {
    'ECI': 'SUPERADMIN',
    'ADMIN': 'DEO',
    'SUPERADMIN': 'SUPERADMIN',
    'SUPERADMIN': 'SUPERADMIN' // Also handle lowercase
  };
  
  // Normalize role names (handle both uppercase and lowercase)
  const normalizedUserRole = userRoleUpper === 'SUPERADMIN' || userRole?.toLowerCase() === 'superadmin' ? 'SUPERADMIN' : userRoleUpper;
  const normalizedMinRole = minRoleUpper === 'SUPERADMIN' || minimumRole?.toLowerCase() === 'superadmin' ? 'SUPERADMIN' : minRoleUpper;
  
  const mappedUserRole = roleMappings[normalizedUserRole] || normalizedUserRole;
  const mappedMinRole = roleMappings[normalizedMinRole] || normalizedMinRole;
  
  // SUPERADMIN/ECI always passes (check both uppercase and lowercase)
  if (mappedUserRole === 'SUPERADMIN' || mappedUserRole === 'ECI' || 
      userRole?.toLowerCase() === 'superadmin' || userRole?.toLowerCase() === 'eci') {
    return true;
  }
  
  const userLevel = ROLE_HIERARCHY[mappedUserRole] || ROLE_HIERARCHY[userRoleUpper] || ROLE_HIERARCHY[userRoleUpper?.toLowerCase()] || 1;
  const minLevel = ROLE_HIERARCHY[mappedMinRole] || ROLE_HIERARCHY[minRoleUpper] || ROLE_HIERARCHY[minRoleUpper?.toLowerCase()] || 1;
  return userLevel >= minLevel;
}

/**
 * Require authentication and specific role(s)
 */
function requireRole(...allowedRoles) {
  return [
    authenticateToken,
    (req, res, next) => {
      const userRole = (req.user?.role || 'citizen').toUpperCase();
      const allowedRolesUpper = allowedRoles.map(r => r.toUpperCase());
      
      // Also check legacy role mappings
      const roleMappings = {
        'ECI': 'SUPERADMIN',
        'SUPERADMIN': 'SUPERADMIN',
        'CEO': 'CEO',
        'DEO': 'DEO',
        'ERO': 'ERO',
        'BLO': 'BLO',
        'ADMIN': 'DEO'
      };
      
      const mappedRole = roleMappings[userRole] || userRole;
      
      // SUPERADMIN always passes (has access to everything)
      if (userRole === 'SUPERADMIN' || req.user?.role?.toLowerCase() === 'superadmin') {
        return next();
      }
      
      if (!allowedRolesUpper.includes(userRole) && !allowedRolesUpper.includes(mappedRole)) {
        return res.status(403).json({
          error: 'Access denied',
          message: `This endpoint requires one of the following roles: ${allowedRoles.join(', ')}`,
          yourRole: userRole
        });
      }
      
      next();
    }
  ];
}

/**
 * Require minimum role level
 */
function requireMinimumRole(minimumRole) {
  return [
    authenticateToken,
    (req, res, next) => {
      const userRole = req.user?.role?.toLowerCase() || 'citizen';
      
      if (!hasMinimumRole(userRole, minimumRole)) {
        return res.status(403).json({
          error: 'Access denied',
          message: `This endpoint requires role level: ${minimumRole} or higher`,
          yourRole: userRole,
          requiredRole: minimumRole
        });
      }
      
      next();
    }
  ];
}

/**
 * Require specific permission (database-backed)
 */
function requirePermission(permission) {
  return [
    authenticateToken,
    async (req, res, next) => {
      const userId = req.user?.id || req.user?.user_id;
      const userRole = req.user?.role?.toUpperCase() || 'CITIZEN';
      const userPermissions = req.user?.permissions || [];
      
      // Check if user has permission in token
      let hasPerm = userPermissions.includes(permission);
      
      // Check wildcard permissions
      if (!hasPerm) {
        for (const perm of userPermissions) {
          if (perm.endsWith('.*')) {
            const prefix = perm.replace('.*', '');
            if (permission.startsWith(prefix + '.')) {
              hasPerm = true;
              break;
            }
          }
        }
      }
      
      // Fallback to legacy permission check
      if (!hasPerm) {
        hasPerm = hasPermission(userRole, permission);
      }
      
      // If still no permission, check database
      if (!hasPerm && userId) {
        try {
          const rbacService = require('../services/rbacService');
          hasPerm = await rbacService.checkPermission(userId, permission);
        } catch (e) {
          console.warn('Failed to check permission from DB:', e.message);
        }
      }
      
      if (!hasPerm) {
        return res.status(403).json({
          error: 'Access denied',
          message: `This endpoint requires permission: ${permission}`,
          yourRole: userRole,
          yourPermissions: userPermissions
        });
      }
      
      next();
    }
  ];
}

/**
 * Check if user is admin (any non-citizen role)
 */
function isAdmin(userRole) {
  const role = (userRole || 'citizen').toLowerCase();
  return role !== 'citizen';
}

module.exports = {
  requireRole,
  requireMinimumRole,
  requirePermission,
  hasPermission,
  hasMinimumRole,
  isAdmin,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS
};

