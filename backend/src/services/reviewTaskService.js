const pool = require('../config/database');

/**
 * Review Task Service
 * Manages review tasks for flagged registrations
 */
class ReviewTaskService {
  /**
   * Create review task
   */
  async createTask(taskData) {
    const connection = await pool.getConnection();
    try {
      const {
        voter_id,
        task_type,
        priority = 'medium',
        assigned_to = null,
        assigned_role = null,
        details = {},
        validation_scores = {},
        flags = []
      } = taskData;

      const [result] = await connection.query(
        `INSERT INTO review_tasks 
         (voter_id, task_type, priority, assigned_to, assigned_role, details, validation_scores, flags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          voter_id,
          task_type,
          priority,
          assigned_to,
          assigned_role,
          JSON.stringify(details),
          JSON.stringify(validation_scores),
          JSON.stringify(flags)
        ]
      );

      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * Get review tasks
   */
  async getTasks(filters = {}) {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT t.*, 
               v.name as voter_name,
               v.aadhaar_number,
               v.email,
               v.mobile_number
        FROM review_tasks t
        LEFT JOIN voters v ON t.voter_id = v.voter_id
        WHERE 1=1
      `;
      const params = [];

      if (filters.status) {
        query += ' AND t.status = ?';
        params.push(filters.status);
      }

      if (filters.task_type) {
        query += ' AND t.task_type = ?';
        params.push(filters.task_type);
      }

      if (filters.assigned_to) {
        query += ' AND t.assigned_to = ?';
        params.push(filters.assigned_to);
      }

      if (filters.assigned_role) {
        query += ' AND t.assigned_role = ?';
        params.push(filters.assigned_role);
      }

      if (filters.priority) {
        query += ' AND t.priority = ?';
        params.push(filters.priority);
      }

      query += ' ORDER BY t.priority DESC, t.created_at DESC LIMIT ?';
      params.push(filters.limit || 100);

      const [tasks] = await connection.query(query, params);
      
      // Parse JSON fields
      return tasks.map(task => ({
        ...task,
        details: typeof task.details === 'string' ? JSON.parse(task.details || '{}') : task.details,
        validation_scores: typeof task.validation_scores === 'string' ? JSON.parse(task.validation_scores || '{}') : task.validation_scores,
        flags: typeof task.flags === 'string' ? JSON.parse(task.flags || '[]') : task.flags
      }));
    } finally {
      connection.release();
    }
  }

  /**
   * Assign task
   */
  async assignTask(taskId, assignedTo, assignedRole) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'UPDATE review_tasks SET assigned_to = ?, assigned_role = ?, status = "in_progress", updated_at = NOW() WHERE task_id = ?',
        [assignedTo, assignedRole, taskId]
      );

      return { success: true };
    } finally {
      connection.release();
    }
  }

  /**
   * Resolve task
   */
  async resolveTask(taskId, resolvedBy, action, notes) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Update task
      await connection.query(
        `UPDATE review_tasks 
         SET status = ?, resolution_action = ?, resolution_notes = ?, resolved_by = ?, resolved_at = NOW(), updated_at = NOW()
         WHERE task_id = ?`,
        ['resolved', action, notes, resolvedBy, taskId]
      );

      // Get task details
      const [tasks] = await connection.query('SELECT * FROM review_tasks WHERE task_id = ?', [taskId]);
      const task = tasks[0];

      if (task && task.voter_id) {
        // Update voter registration status
        if (action === 'approved') {
          await connection.query(
            'UPDATE voters SET registration_status = "active" WHERE voter_id = ?',
            [task.voter_id]
          );
        } else if (action === 'rejected') {
          await connection.query(
            'UPDATE voters SET registration_status = "rejected", review_reason = ? WHERE voter_id = ?',
            [notes || 'Rejected by reviewer', task.voter_id]
          );
        }
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(assignedTo = null) {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT 
          task_type,
          status,
          priority,
          COUNT(*) as count
        FROM review_tasks
        WHERE 1=1
      `;
      const params = [];

      if (assignedTo) {
        query += ' AND assigned_to = ?';
        params.push(assignedTo);
      }

      query += ' GROUP BY task_type, status, priority';

      const [stats] = await connection.query(query, params);
      return stats;
    } finally {
      connection.release();
    }
  }
}

module.exports = new ReviewTaskService();

