const { authenticateToken } = require('./auth');

/**
 * Role-Based Access Control (RBAC) Middleware
 * Implements tiered access control for different officer levels
 * 
 * Role Hierarchy (highest to lowest):
 * 1. eci - Election Commission of India (Full access)
 * 2. ceo - Chief Electoral Officer (State level)
 * 3. deo - District Election Officer (District level)
 * 4. ero - Electoral Registration Officer (Constituency level)
 * 5. blo - Booth Level Officer (Booth level)
 * 6. admin - General Admin (Limited admin access)
 * 7. citizen - Citizen/Voter (Public access only)
 */

// Define role hierarchy and permissions
const ROLE_HIERARCHY = {
  eci: 7,    // Highest level - full system access
  ceo: 6,    // State level - can manage districts
  deo: 5,    // District level - can manage constituencies
  ero: 4,    // Constituency level - can manage booths
  blo: 3,    // Booth level - limited to assigned booth
  admin: 2,  // General admin - limited admin functions
  citizen: 1 // Lowest level - public access only
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
  const userLevel = ROLE_HIERARCHY[userRole?.toLowerCase()] || 1;
  const minLevel = ROLE_HIERARCHY[minimumRole?.toLowerCase()] || 1;
  return userLevel >= minLevel;
}

/**
 * Require authentication and specific role(s)
 */
function requireRole(...allowedRoles) {
  return [
    authenticateToken,
    (req, res, next) => {
      const userRole = req.user?.role?.toLowerCase() || 'citizen';
      
      if (!allowedRoles.includes(userRole)) {
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
 * Require specific permission
 */
function requirePermission(permission) {
  return [
    authenticateToken,
    (req, res, next) => {
      const userRole = req.user?.role?.toLowerCase() || 'citizen';
      
      if (!hasPermission(userRole, permission)) {
        return res.status(403).json({
          error: 'Access denied',
          message: `This endpoint requires permission: ${permission}`,
          yourRole: userRole
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

