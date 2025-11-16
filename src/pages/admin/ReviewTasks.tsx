import React, { useState, useEffect } from 'react';
import validationService, { ReviewTask } from '../../services/validationService';

export default function ReviewTasks() {
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    task_type: '',
    priority: ''
  });
  const [selectedTask, setSelectedTask] = useState<ReviewTask | null>(null);
  const [resolutionAction, setResolutionAction] = useState<'approved' | 'rejected' | 'escalated' | 'needs_more_info'>('approved');
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    loadTasks();
  }, [filters]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await validationService.getReviewTasks({
        ...filters,
        limit: 100
      });
      setTasks(data);
    } catch (error: any) {
      console.error('Failed to load review tasks:', error);
      alert('Failed to load review tasks: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (task: ReviewTask) => {
    if (!resolutionNotes.trim() && resolutionAction !== 'approved') {
      alert('Please provide resolution notes');
      return;
    }

    try {
      await validationService.resolveReviewTask(task.task_id, resolutionAction, resolutionNotes);
      alert('Task resolved successfully');
      setSelectedTask(null);
      setResolutionNotes('');
      loadTasks();
    } catch (error: any) {
      console.error('Failed to resolve task:', error);
      alert('Failed to resolve task: ' + (error.response?.data?.error || error.message));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Review Tasks</h1>
        <p className="text-gray-600">Manage flagged registrations requiring manual review</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Task Type</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={filters.task_type}
              onChange={(e) => setFilters({ ...filters, task_type: e.target.value })}
            >
              <option value="">All</option>
              <option value="address_verification">Address Verification</option>
              <option value="name_verification">Name Verification</option>
              <option value="document_check">Document Check</option>
              <option value="biometric_verification">Biometric Verification</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Priority</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            >
              <option value="">All</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No review tasks found</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flags</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task) => (
                <tr key={task.task_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">#{task.task_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div>{task.voter_name || `Voter #${task.voter_id}`}</div>
                    {task.aadhaar_number && (
                      <div className="text-gray-500 text-xs">{task.aadhaar_number}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{task.task_type.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-block w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></span>
                    <span className="ml-2 text-sm capitalize">{task.priority}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {task.flags && task.flags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {task.flags.slice(0, 3).map((flag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                            {flag}
                          </span>
                        ))}
                        {task.flags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                            +{task.flags.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {task.status !== 'resolved' && (
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resolution Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Resolve Review Task #{selectedTask.task_id}</h2>
            
            <div className="mb-4">
              <p><strong>Voter:</strong> {selectedTask.voter_name || `Voter #${selectedTask.voter_id}`}</p>
              <p><strong>Task Type:</strong> {selectedTask.task_type.replace('_', ' ')}</p>
              <p><strong>Priority:</strong> {selectedTask.priority}</p>
              
              {selectedTask.flags && selectedTask.flags.length > 0 && (
                <div className="mt-2">
                  <strong>Flags:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTask.flags.map((flag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask.validation_scores && (
                <div className="mt-2">
                  <strong>Validation Scores:</strong>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedTask.validation_scores, null, 2)}
                  </pre>
                </div>
              )}

              {selectedTask.ai_explanation && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">🤖 AI Explanation:</p>
                  <p className="text-sm text-blue-800">{selectedTask.ai_explanation}</p>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Resolution Action</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={resolutionAction}
                onChange={(e) => setResolutionAction(e.target.value as any)}
              >
                <option value="approved">Approve</option>
                <option value="rejected">Reject</option>
                <option value="escalated">Escalate</option>
                <option value="needs_more_info">Needs More Info</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Resolution Notes</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Enter resolution notes..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedTask(null);
                  setResolutionNotes('');
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolve(selectedTask)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Resolve Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

