import React, { useState, useEffect } from 'react';
import validationService, { AddressFlag } from '../../services/validationService';

export default function AddressFlags() {
  const [flags, setFlags] = useState<AddressFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    risk_level: '',
    district: '',
    state: ''
  });
  const [selectedFlag, setSelectedFlag] = useState<AddressFlag | null>(null);
  const [resolutionAction, setResolutionAction] = useState<'approved' | 'rejected' | 'false_positive'>('approved');
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    loadFlags();
  }, [filters]);

  const loadFlags = async () => {
    try {
      setLoading(true);
      const data = await validationService.getAddressFlags({
        ...filters,
        limit: 100
      });
      setFlags(data);
    } catch (error: any) {
      console.error('Failed to load address flags:', error);
      alert('Failed to load address flags: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (flag: AddressFlag) => {
    if (!resolutionNotes.trim() && resolutionAction !== 'approved') {
      alert('Please provide resolution notes');
      return;
    }

    try {
      await validationService.resolveAddressFlag(flag.id, resolutionAction, resolutionNotes);
      alert('Flag resolved successfully');
      setSelectedFlag(null);
      setResolutionNotes('');
      loadFlags();
    } catch (error: any) {
      console.error('Failed to resolve flag:', error);
      alert('Failed to resolve flag: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleRunDetection = async () => {
    try {
      setLoading(true);
      const result = await validationService.runAddressClusterDetection();
      alert(`Detection completed: ${result.flagsCreated} flags created/updated`);
      loadFlags();
    } catch (error: any) {
      console.error('Failed to run detection:', error);
      alert('Failed to run detection: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'false_positive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Address Cluster Flags</h1>
          <p className="text-gray-600">Detect and manage suspicious address clusters</p>
        </div>
        <button
          onClick={handleRunDetection}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Run Detection
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Risk Level</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={filters.risk_level}
              onChange={(e) => setFilters({ ...filters, risk_level: e.target.value })}
            >
              <option value="">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">District</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={filters.district}
              onChange={(e) => setFilters({ ...filters, district: e.target.value })}
              placeholder="Filter by district"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">State</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={filters.state}
              onChange={(e) => setFilters({ ...filters, state: e.target.value })}
              placeholder="Filter by state"
            />
          </div>
        </div>
      </div>

      {/* Flags List */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : flags.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No address flags found</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voter Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {flags.map((flag) => (
                <tr key={flag.id}>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium">{flag.normalized_address || 'N/A'}</div>
                    {flag.district && (
                      <div className="text-gray-500 text-xs">{flag.district}, {flag.state}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{flag.voter_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${getRiskColor(flag.risk_level)}`}
                          style={{ width: `${flag.risk_score * 100}%` }}
                        ></div>
                      </div>
                      <span>{(flag.risk_score * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getRiskColor(flag.risk_level)}`}>
                      {flag.risk_level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(flag.status)}`}>
                      {flag.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {flag.status !== 'resolved' && flag.status !== 'false_positive' && (
                      <button
                        onClick={() => setSelectedFlag(flag)}
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
      {selectedFlag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Resolve Address Flag #{selectedFlag.id}</h2>
            
            <div className="mb-4">
              <p><strong>Address:</strong> {selectedFlag.normalized_address || 'N/A'}</p>
              <p><strong>Voter Count:</strong> {selectedFlag.voter_count}</p>
              <p><strong>Risk Score:</strong> {(selectedFlag.risk_score * 100).toFixed(2)}%</p>
              <p><strong>Risk Level:</strong> {selectedFlag.risk_level}</p>
              {selectedFlag.district && (
                <p><strong>Location:</strong> {selectedFlag.district}, {selectedFlag.state}</p>
              )}
              {selectedFlag.ai_explanation && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">🤖 AI Explanation:</p>
                  <p className="text-sm text-blue-800">{selectedFlag.ai_explanation}</p>
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
                <option value="approved">Approve (Resolve)</option>
                <option value="rejected">Reject</option>
                <option value="false_positive">Mark as False Positive</option>
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
                  setSelectedFlag(null);
                  setResolutionNotes('');
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolve(selectedFlag)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Resolve Flag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

