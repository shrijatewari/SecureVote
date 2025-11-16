const addressValidationService = require('../services/addressValidationService');
const nameValidationService = require('../services/nameValidationService');
const addressAnomalyService = require('../services/addressAnomalyDetectionService');
const reviewTaskService = require('../services/reviewTaskService');
const auditLogService = require('../services/auditLogService');
const openAIService = require('../services/openAIService');

/**
 * Validate address
 */
async function validateAddress(req, res, next) {
  try {
    const addressComponents = req.body;
    
    const result = await addressValidationService.validateAddress(addressComponents);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Address validation error:', error);
    next(error);
  }
}

/**
 * Validate name
 */
async function validateName(req, res, next) {
  try {
    const { name, name_type = 'first_name' } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const result = await nameValidationService.validateName(name, name_type);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Name validation error:', error);
    next(error);
  }
}

/**
 * Run address cluster detection
 */
async function runAddressClusterDetection(req, res, next) {
  try {
    const thresholds = req.body.thresholds || { low: 6, medium: 12, high: 20 };
    
    const result = await addressAnomalyService.detectAddressClusters(thresholds);
    
    // Log audit event
    try {
      await auditLogService.logAction({
        action_type: 'anomaly_detection',
        entity_type: 'address_cluster',
        actor_id: req.user?.id,
        metadata: JSON.stringify({
          flags_created: result.flagsCreated,
          thresholds
        })
      });
    } catch (e) {
      console.warn('Audit log failed:', e.message);
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Address cluster detection error:', error);
    next(error);
  }
}

/**
 * Get address flags
 */
async function getAddressFlags(req, res, next) {
  try {
    const filters = {
      status: req.query.status,
      risk_level: req.query.risk_level,
      district: req.query.district,
      state: req.query.state,
      limit: parseInt(req.query.limit) || 100
    };
    
    const flags = await addressAnomalyService.getAddressFlags(filters);
    
    // Add AI-generated explanations for each flag
    const flagsWithExplanations = await Promise.all(
      flags.map(async (flag) => {
        try {
          const explanation = await openAIService.generateAddressClusterExplanation({
            voter_count: flag.voter_count,
            risk_score: flag.risk_score,
            risk_level: flag.risk_level,
            surname_diversity_score: flag.surname_diversity_score || 1.0,
            dob_clustering_score: flag.dob_clustering_score || 1.0,
            district: flag.district,
            state: flag.state
          });
          return {
            ...flag,
            ai_explanation: explanation
          };
        } catch (e) {
          console.warn('Failed to generate AI explanation for flag:', flag.id, e.message);
          return flag;
        }
      })
    );
    
    res.json({
      success: true,
      data: flagsWithExplanations
    });
  } catch (error) {
    console.error('Get address flags error:', error);
    next(error);
  }
}

/**
 * Assign address flag
 */
async function assignAddressFlag(req, res, next) {
  try {
    const { flag_id } = req.params;
    const { assigned_to, assigned_role } = req.body;
    
    if (!assigned_to || !assigned_role) {
      return res.status(400).json({ error: 'assigned_to and assigned_role required' });
    }
    
    await addressAnomalyService.assignFlag(flag_id, assigned_to, assigned_role);
    
    res.json({
      success: true,
      message: 'Flag assigned successfully'
    });
  } catch (error) {
    console.error('Assign flag error:', error);
    next(error);
  }
}

/**
 * Resolve address flag
 */
async function resolveAddressFlag(req, res, next) {
  try {
    const { flag_id } = req.params;
    const { action, notes } = req.body;
    
    if (!action || !['approved', 'rejected', 'false_positive'].includes(action)) {
      return res.status(400).json({ error: 'Valid action required (approved/rejected/false_positive)' });
    }
    
    await addressAnomalyService.resolveFlag(flag_id, req.user?.id, action, notes);
    
    res.json({
      success: true,
      message: 'Flag resolved successfully'
    });
  } catch (error) {
    console.error('Resolve flag error:', error);
    next(error);
  }
}

/**
 * Get review tasks
 */
async function getReviewTasks(req, res, next) {
  try {
    const filters = {
      status: req.query.status,
      task_type: req.query.task_type,
      assigned_to: req.query.assigned_to ? parseInt(req.query.assigned_to) : req.user?.id,
      assigned_role: req.query.assigned_role,
      priority: req.query.priority,
      limit: parseInt(req.query.limit) || 100
    };
    
    const tasks = await reviewTaskService.getTasks(filters);
    
    // Add AI-generated explanations for name validation tasks
    const tasksWithExplanations = await Promise.all(
      tasks.map(async (task) => {
        if (task.task_type === 'name_verification' && task.validation_scores) {
          try {
            const nameScores = task.validation_scores;
            const explanation = await openAIService.generateNameValidationExplanation({
              qualityScore: nameScores.father_name || nameScores.mother_name || nameScores.guardian_name || 0.5,
              validationResult: task.flags?.includes('low_quality') ? 'rejected' : 'flagged',
              flags: task.flags || []
            });
            return {
              ...task,
              ai_explanation: explanation
            };
          } catch (e) {
            console.warn('Failed to generate AI explanation for task:', task.task_id, e.message);
            return task;
          }
        }
        return task;
      })
    );
    
    res.json({
      success: true,
      data: tasksWithExplanations
    });
  } catch (error) {
    console.error('Get review tasks error:', error);
    next(error);
  }
}

/**
 * Assign review task
 */
async function assignReviewTask(req, res, next) {
  try {
    const { task_id } = req.params;
    const { assigned_to, assigned_role } = req.body;
    
    if (!assigned_to || !assigned_role) {
      return res.status(400).json({ error: 'assigned_to and assigned_role required' });
    }
    
    await reviewTaskService.assignTask(task_id, assigned_to, assigned_role);
    
    res.json({
      success: true,
      message: 'Task assigned successfully'
    });
  } catch (error) {
    console.error('Assign task error:', error);
    next(error);
  }
}

/**
 * Resolve review task
 */
async function resolveReviewTask(req, res, next) {
  try {
    const { task_id } = req.params;
    const { action, notes } = req.body;
    
    if (!action || !['approved', 'rejected', 'escalated', 'needs_more_info'].includes(action)) {
      return res.status(400).json({ error: 'Valid action required' });
    }
    
    await reviewTaskService.resolveTask(task_id, req.user?.id, action, notes);
    
    // Log audit event
    try {
      await auditLogService.logAction({
        action_type: 'review_task_resolved',
        entity_type: 'review_task',
        entity_id: task_id,
        actor_id: req.user?.id,
        metadata: JSON.stringify({ action, notes })
      });
    } catch (e) {
      console.warn('Audit log failed:', e.message);
    }
    
    res.json({
      success: true,
      message: 'Task resolved successfully'
    });
  } catch (error) {
    console.error('Resolve task error:', error);
    next(error);
  }
}

/**
 * Get review task statistics
 */
async function getReviewTaskStatistics(req, res, next) {
  try {
    const assignedTo = req.query.assigned_to ? parseInt(req.query.assigned_to) : req.user?.id;
    
    const stats = await reviewTaskService.getTaskStatistics(assignedTo);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get task statistics error:', error);
    next(error);
  }
}

module.exports = {
  validateAddress,
  validateName,
  runAddressClusterDetection,
  getAddressFlags,
  assignAddressFlag,
  resolveAddressFlag,
  getReviewTasks,
  assignReviewTask,
  resolveReviewTask,
  getReviewTaskStatistics
};

