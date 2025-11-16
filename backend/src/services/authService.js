const pool = require('../config/database');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rbacService = require('./rbacService');

class AuthService {
  async loginWithEmail(email, password) {
    const connection = await pool.getConnection();
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // 1) Try admin/users table first
      try {
        const [users] = await connection.query(
          `SELECT u.user_id, u.username, u.email, u.role, u.password_hash, u.role_id,
                  r.name as role_name, r.level as role_level
           FROM users u
           LEFT JOIN roles r ON u.role_id = r.role_id
           WHERE u.email = ? LIMIT 1`,
          [normalizedEmail]
        );
        if (users.length > 0) {
          const user = users[0];
          // Verify password using bcrypt
          if (!user.password_hash || user.password_hash.length === 0) {
            throw new Error('Account not set up. Please register first.');
          }
          
          // Check if password_hash is bcrypt (starts with $2a$, $2b$, or $2y$) or SHA256 (64 hex chars)
          const isBcryptHash = user.password_hash.startsWith('$2a$') || 
                               user.password_hash.startsWith('$2b$') || 
                               user.password_hash.startsWith('$2y$');
          
          let passwordValid = false;
          if (isBcryptHash) {
            // Use bcrypt comparison for new passwords
            passwordValid = await bcrypt.compare(password, user.password_hash);
          } else {
            // Legacy SHA256 hash comparison (for backward compatibility)
            const providedHash = crypto.createHash('sha256').update(password).digest('hex');
            passwordValid = providedHash === user.password_hash;
          }
          
          if (passwordValid) {
            const roleInfo = await rbacService.getUserRoleAndPermissions(user.user_id);
            return {
              id: user.user_id,
              name: user.username,
              email: user.email,
              role: roleInfo.role.toUpperCase(),
              permissions: roleInfo.permissions
            };
          }
          throw new Error('Invalid credentials');
        }
      } catch (err) {
        // If error is not "Invalid credentials", it might be table doesn't exist
        if (err.message === 'Invalid credentials') {
          throw err;
        }
      }

      // 2) Fall back to voters table - check if user account exists
      const [voters] = await connection.query(
        `SELECT voter_id, name, email 
         FROM voters 
         WHERE email = ? AND email IS NOT NULL AND email != '' 
         LIMIT 1`,
        [normalizedEmail]
      );
      if (voters.length === 0) {
        throw new Error('Email not registered. Please register first.');
      }
      const voter = voters[0];
      
      // Check if user account exists for this voter
      const [userAccounts] = await connection.query(
        `SELECT user_id, password_hash FROM users WHERE email = ? LIMIT 1`,
        [normalizedEmail]
      );
      
      if (userAccounts.length > 0) {
        // User account exists - verify password
        const userAccount = userAccounts[0];
        if (!userAccount.password_hash || userAccount.password_hash.length === 0) {
          throw new Error('Account not set up. Please register again.');
        }
        
        const isBcryptHash = userAccount.password_hash.startsWith('$2a$') || 
                             userAccount.password_hash.startsWith('$2b$') || 
                             userAccount.password_hash.startsWith('$2y$');
        
        let passwordValid = false;
        if (isBcryptHash) {
          passwordValid = await bcrypt.compare(password, userAccount.password_hash);
        } else {
          const providedHash = crypto.createHash('sha256').update(password).digest('hex');
          passwordValid = providedHash === userAccount.password_hash;
        }
        
        if (!passwordValid) {
          throw new Error('Invalid credentials');
        }
      } else {
        // No user account - require registration
        throw new Error('Account not found. Please register first.');
      }
      
      return {
        id: voter.voter_id,
        name: voter.name,
        email: voter.email,
        role: 'CITIZEN',
        permissions: []
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = new AuthService();


