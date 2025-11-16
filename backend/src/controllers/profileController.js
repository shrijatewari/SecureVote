const profileService = require('../services/profileService');

async function getProfile(req, res, next) {
  try {
    // ALWAYS return 200 OK - never return 401/403
    // Check if user is admin - admins don't have voter profiles
    const userRole = req.user?.role?.toLowerCase();
    if (userRole && userRole !== 'citizen') {
      return res.status(200).json({ 
        success: true, 
        data: null,
        message: 'Admin users do not have voter profiles'
      });
    }
    
    // Get voter ID from params, user token, or request body
    let voterId = null;
    if (req.params.id && req.params.id !== '') {
      voterId = parseInt(req.params.id);
    } else if (req.user?.voter_id) {
      voterId = parseInt(req.user.voter_id);
    } else if (req.user?.id) {
      voterId = parseInt(req.user.id);
    }
    
    if (!voterId || isNaN(voterId)) {
      return res.status(200).json({ 
        success: true, 
        data: null,
        message: 'No voter profile associated with this account'
      });
    }
    
    const profile = await profileService.getProfile(voterId);
    if (!profile) {
      // Return 200 with null instead of 404 to prevent session expired alerts
      return res.status(200).json({ 
        success: true, 
        data: null,
        message: 'Profile not found'
      });
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Get profile error:', error);
    // Always return 200 OK even on error to prevent session expired alerts
    res.status(200).json({ 
      success: false, 
      data: null,
      error: error.message || 'Failed to load profile'
    });
  }
}

async function updateProfile(req, res, next) {
  try {
    let voterId = parseInt(req.params.id);
    
    // If no ID in params, try to get from user token or body
    if (!voterId || isNaN(voterId)) {
      voterId = parseInt(req.user?.voter_id || req.body.voter_id);
    }
    
    if (!voterId || isNaN(voterId)) {
      return res.status(400).json({ error: 'Voter ID required' });
    }
    
    console.log('Updating profile for voter:', voterId);
    const updated = await profileService.updateProfile(voterId, req.body);
    res.json({ success: true, data: updated, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    
    // Handle date format errors specifically
    if (error.code === 'ER_TRUNCATED_WRONG_VALUE' || error.code === 1292) {
      const errorMsg = error.message || '';
      if (errorMsg.includes('date') || errorMsg.includes('dob') || errorMsg.includes('Incorrect date value')) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid date format. Please use YYYY-MM-DD format (e.g., 2006-06-19).',
          details: 'The date value provided could not be processed. Please check the date format and try again.'
        });
      }
    }
    
    // Handle other database errors
    if (error.code && error.code.startsWith('ER_')) {
      return res.status(400).json({ 
        success: false,
        error: 'Database error occurred while updating profile.',
        details: error.message || 'Please check your input and try again.'
      });
    }
    
    next(error);
  }
}

async function getCompletionStatus(req, res, next) {
  try {
    // ALWAYS return 200 OK - never return 401/403
    // Check if user is admin - admins don't have voter profiles
    const userRole = req.user?.role?.toLowerCase();
    if (userRole && userRole !== 'citizen') {
      return res.status(200).json({ 
        success: true, 
        data: { 
          completionPercentage: 0, 
          completedSections: [],
          checkpoints: {}
        },
        message: 'Admin users do not have voter profiles'
      });
    }
    
    // Get voter ID from params, user token, or request body
    let voterId = null;
    if (req.params.id && req.params.id !== '') {
      voterId = parseInt(req.params.id);
    } else if (req.user?.voter_id) {
      voterId = parseInt(req.user.voter_id);
    } else if (req.user?.id) {
      voterId = parseInt(req.user.id);
    }
    
    if (!voterId || isNaN(voterId)) {
      return res.status(200).json({ 
        success: true, 
        data: { 
          completionPercentage: 0, 
          completedSections: [],
          checkpoints: {}
        },
        message: 'No voter profile associated with this account'
      });
    }
    
    const status = await profileService.getCompletionStatus(voterId);
    // Ensure checkpoints exists
    if (!status.checkpoints) {
      status.checkpoints = {};
    }
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Get completion status error:', error);
    // ALWAYS return 200 OK even on error to prevent session expired alerts
    res.status(200).json({ 
      success: true, 
      data: { 
        completionPercentage: 0, 
        completedSections: [],
        checkpoints: {}
      },
      message: error.message || 'Failed to load completion status'
    });
  }
}

async function verifyContact(req, res, next) {
  try {
    const voterId = parseInt(req.params.id || req.user?.voter_id || req.body.voter_id);
    const { type, verified } = req.body;
    
    if (!voterId) {
      return res.status(400).json({ error: 'Voter ID required' });
    }
    if (!type) {
      return res.status(400).json({ error: 'Type (mobile/email) required' });
    }
    
    await profileService.verifyContact(voterId, type, verified === true);
    res.json({ success: true, message: `${type} verification updated` });
  } catch (error) {
    console.error('Verify contact error:', error);
    next(error);
  }
}

async function addFamilyRelation(req, res, next) {
  try {
    const voterId = parseInt(req.params.id || req.user?.voter_id);
    if (!voterId) {
      return res.status(400).json({ error: 'Voter ID required' });
    }
    const relationId = await profileService.addFamilyRelation(voterId, req.body);
    res.json({ success: true, data: { relation_id: relationId }, message: 'Family relation added' });
  } catch (error) {
    next(error);
  }
}

async function getFamilyRelations(req, res, next) {
  try {
    const voterId = parseInt(req.params.id || req.user?.voter_id);
    if (!voterId) {
      return res.status(400).json({ error: 'Voter ID required' });
    }
    const relations = await profileService.getFamilyRelations(voterId);
    res.json({ success: true, data: relations });
  } catch (error) {
    next(error);
  }
}

async function removeFamilyRelation(req, res, next) {
  try {
    const { relationId } = req.params;
    await profileService.removeFamilyRelation(parseInt(relationId));
    res.json({ success: true, message: 'Family relation removed' });
  } catch (error) {
    next(error);
  }
}

async function importFromDigiLocker(req, res, next) {
  try {
    const voterId = parseInt(req.params.id || req.user?.voter_id);
    const { aadhaar_number } = req.body;
    if (!voterId || !aadhaar_number) {
      return res.status(400).json({ error: 'Voter ID and Aadhaar number required' });
    }
    const data = await profileService.importFromDigiLocker(voterId, aadhaar_number);
    res.json({ success: true, data, message: 'Data imported from DigiLocker (mock)' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getCompletionStatus,
  verifyContact,
  addFamilyRelation,
  getFamilyRelations,
  removeFamilyRelation,
  importFromDigiLocker
};

