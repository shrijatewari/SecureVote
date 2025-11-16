import { useState, useEffect } from 'react';
import { deathRecordService } from '../services/api';

export default function DeathRecordSyncDashboard() {
  const [deathRecords, setDeathRecords] = useState<any[]>([]);
  const [syncFlags, setSyncFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<'dry-run' | 'apply'>('dry-run');
  const [threshold, setThreshold] = useState(0.9);
  const [userRole, setUserRole] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  useEffect(() => {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUserRole((parsed.role || 'CITIZEN').toUpperCase());
        setUserPermissions(parsed.permissions || []);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (userRole === 'SUPERADMIN') return true;
    if (userPermissions.includes(permission)) return true;
    for (const perm of userPermissions) {
      if (perm.endsWith('.*')) {
        const prefix = perm.replace('.*', '');
        if (permission.startsWith(prefix + '.')) {
          return true;
        }
      }
    }
    return false;
  };

  const runSync = async () => {
    setLoading(true);
    setError('');
    setRunning(true);
    try {
      const result = await deathRecordService.runSync({ mode, threshold });
      const data = result.data?.data || result.data || {};
      alert(`Death record sync ${mode === 'dry-run' ? 'completed (dry-run)' : 'applied'}! Found ${data.matched || data.matched_count || 0} matches, ${data.flagged || 0} flags created.`);
      loadSyncFlags();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to run death record sync');
    } finally {
      setLoading(false);
      setRunning(false);
    }
  };

  const loadSyncFlags = async () => {
    try {
      const result = await deathRecordService.getDeathSyncFlags();
      setSyncFlags(result.data.flags || []);
    } catch (err: any) {
      console.error('Failed to load sync flags:', err);
    }
  };

  const markVoterDeceased = async (voterId: number) => {
    try {
      await deathRecordService.markVoterDeceased(voterId, {
        death_date: new Date().toISOString().split('T')[0],
        verified_by: 1
      });
      alert('Voter marked as deceased successfully!');
      loadSyncFlags();
    } catch (err: any) {
      alert('Failed to mark voter as deceased: ' + (err.response?.data?.error || err.message));
    }
  };

  useEffect(() => {
    loadDeathRecords();
    loadSyncFlags();
  }, []);

  const loadDeathRecords = async () => {
    try {
      const result = await deathRecordService.getAll(1, 100);
      setDeathRecords(result.data.death_records || []);
    } catch (err: any) {
      console.error('Failed to load death records:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Death Record Sync Dashboard</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Controls */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Sync Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'dry-run' | 'apply')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="dry-run">Dry Run (Preview Only)</option>
                  <option value="apply">Apply Changes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Match Threshold</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex items-end">
                {hasPermission('death_records.upload') || hasPermission('death_records.view') ? (
                  <button
                    onClick={runSync}
                    disabled={loading || running || (mode === 'apply' && !hasPermission('death_records.upload'))}
                    className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    title={mode === 'apply' && !hasPermission('death_records.upload') ? 'Permission Denied: Only DEO/CEO can apply changes' : ''}
                  >
                    {running ? 'Syncing...' : `Run Sync (${mode})`}
                  </button>
                ) : (
                  <div className="w-full text-sm text-gray-500 italic text-center py-2">
                    No permission to run sync
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sync Flags */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Pending Verification</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voter</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Death Record</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {syncFlags.map((flag, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">ID: {flag.voter_id}</p>
                          <p className="text-sm text-gray-500">{flag.voter?.name || 'N/A'}</p>
                          <p className="text-xs text-gray-400">{flag.aadhaar_number}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm text-gray-900">Death Date: {flag.death_record?.death_date || 'N/A'}</p>
                          <p className="text-xs text-gray-500">Source: {flag.death_record?.source || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {((flag.match_score || 0) * 100).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          flag.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          flag.status === 'verified' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {flag.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {flag.status === 'pending' && (
                          <div className="flex space-x-2">
                            {hasPermission('death_records.approve') ? (
                              <>
                                <button
                                  onClick={() => markVoterDeceased(flag.voter_id)}
                                  className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                  title="Mark voter as deceased"
                                >
                                  Mark Deceased
                                </button>
                                <button
                                  onClick={() => {/* Reject flag */}}
                                  className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                                  title="Reject death record flag"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 italic" title="Permission Denied: Contact District Election Officer">
                                No action permission
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {syncFlags.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No pending verification flags.
                </div>
              )}
            </div>
          </div>

          {/* Death Records */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Death Records</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aadhaar</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Death Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deathRecords.slice(0, 50).map((record, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.aadhaar_number ? `${record.aadhaar_number.slice(0, 4)}****${record.aadhaar_number.slice(8)}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.death_date || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.source || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          record.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {record.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

