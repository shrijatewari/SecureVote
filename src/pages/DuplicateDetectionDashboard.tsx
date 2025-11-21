import { useState, useEffect } from 'react';
import { duplicateService, mlDuplicateService } from '../services/api';
import AiExplainPanel from '../components/AiExplainPanel';

export default function DuplicateDetectionDashboard() {
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [mlResults, setMlResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [scope, setScope] = useState('all');
  const [threshold, setThreshold] = useState(0.85);
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
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

  const runDuplicateDetection = async () => {
    setLoading(true);
    setError('');
    setRunning(true);
    try {
      const result = await duplicateService.runDetection({ scope, threshold, district, state });
      // Handle different response formats
      const duplicatesData = result.data?.duplicates || result.data?.data?.duplicates || [];
      const duplicatesFound = Array.isArray(duplicatesData) ? duplicatesData.length : 0;
      setDuplicates(Array.isArray(duplicatesData) ? duplicatesData : []);
      alert(`Duplicate detection completed! Found ${duplicatesFound} potential duplicates.`);
      // Reload duplicates after detection
      await loadDuplicates();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to run duplicate detection');
    } finally {
      setLoading(false);
      setRunning(false);
    }
  };

  const runMLDetection = async () => {
    setLoading(true);
    setError('');
    setRunning(true);
    try {
      const result = await mlDuplicateService.detectDuplicatesML({
        scope,
        threshold,
        use_face_embeddings: true,
        use_fingerprint: true,
        district: district || undefined,
        state: state || undefined
      });
      const mlData = result.data?.data || result.data || {};
      setMlResults(mlData);
      const duplicatesData = mlData.duplicates || [];
      setDuplicates(Array.isArray(duplicatesData) ? duplicatesData : []);
      alert(`ML duplicate detection completed! Found ${mlData.duplicates_found || duplicatesData.length || 0} duplicates.`);
      // Reload duplicates after detection
      await loadDuplicates();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to run ML duplicate detection');
    } finally {
      setLoading(false);
      setRunning(false);
    }
  };

  const resolveDuplicate = async (duplicateId: number, action: string) => {
    try {
      await duplicateService.resolve(duplicateId, { action, note: `Resolved as ${action}` });
      alert('Duplicate resolved successfully!');
      // Reload duplicates
      await loadDuplicates();
    } catch (err: any) {
      alert('Failed to resolve duplicate: ' + (err.response?.data?.error || err.message));
    }
  };

  useEffect(() => {
    loadDuplicates();
  }, []);

  const loadDuplicates = async () => {
    try {
      setLoading(true);
      const result = await duplicateService.getAll(1, 100, false);
      // Handle different response formats
      const duplicatesData = result.data?.duplicates || result.data?.data?.duplicates || result.data || [];
      if (Array.isArray(duplicatesData)) {
        setDuplicates(duplicatesData);
      } else if (duplicatesData && typeof duplicatesData === 'object' && duplicatesData.duplicates) {
        setDuplicates(duplicatesData.duplicates);
      } else {
        setDuplicates([]);
      }
    } catch (err: any) {
      console.error('Failed to load duplicates:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load duplicates');
      setDuplicates([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Duplicate Voter Detection Dashboard</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Controls */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Detection Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">All Voters</option>
                  <option value="district">District</option>
                  <option value="state">State</option>
                </select>
              </div>
              {scope === 'district' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter district"
                  />
                </div>
              )}
              {scope === 'state' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter state"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Similarity Threshold</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex space-x-4 mt-4">
              {hasPermission('duplicates.view') ? (
                <>
                  <button
                    onClick={runDuplicateDetection}
                    disabled={loading || running}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {running ? 'Running...' : 'Run Basic Detection'}
                  </button>
                  <button
                    onClick={runMLDetection}
                    disabled={loading || running}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {running ? 'Running...' : 'Run ML Detection'}
                  </button>
                </>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  You don't have permission to run duplicate detection. Contact your administrator.
                </div>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Duplicate Detection Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Flagged Duplicates</p>
                <p className="text-2xl font-bold text-blue-600">{duplicates.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Unresolved</p>
                <p className="text-2xl font-bold text-orange-600">{duplicates.filter((d: any) => !d.resolved).length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{duplicates.filter((d: any) => d.resolved).length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Threshold</p>
                <p className="text-2xl font-bold text-gray-600">{(threshold * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>

          {/* ML Results Summary */}
          {mlResults && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">ML Detection Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Duplicates</p>
                  <p className="text-2xl font-bold text-purple-600">{mlResults.duplicates_found || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Models Used</p>
                  <p className="text-sm text-gray-800">{mlResults.ml_models_used?.join(', ') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Threshold</p>
                  <p className="text-sm text-gray-800">{mlResults.threshold || threshold}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Scope</p>
                  <p className="text-sm text-gray-800">{mlResults.scope || scope}</p>
                </div>
              </div>
            </div>
          )}

          {/* Duplicates Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voter 1</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voter 2</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Similarity Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {duplicates.map((dup, idx) => (
                  <tr key={dup.check_id || dup.duplicate_id || idx}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">ID: {dup.voter_id_1 || dup.voter_1?.voter_id || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{dup.voter1_name || dup.voter_1?.name || dup.data_1?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-400">{dup.voter1_aadhaar || dup.voter_1?.aadhaar_number || dup.data_1?.aadhaar_number || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">ID: {dup.voter_id_2 || dup.voter_2?.voter_id || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{dup.voter2_name || dup.voter_2?.name || dup.data_2?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-400">{dup.voter2_aadhaar || dup.voter_2?.aadhaar_number || dup.data_2?.aadhaar_number || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {((dup.similarity_score || dup.ensemble_score || 0) * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        dup.confidence === 'very_high' ? 'bg-red-100 text-red-800' :
                        dup.confidence === 'high' ? 'bg-orange-100 text-orange-800' :
                        dup.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {dup.confidence || 'medium'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2 flex-wrap gap-2">
                        <AiExplainPanel
                          issueType="duplicate_voter"
                          region={dup.district || '[District]'}
                          sampleCount={1}
                          aggregatedFlags={[`similarity_${dup.similarity_score || 0}`]}
                          metrics={{
                            similarity_score: dup.similarity_score || dup.ensemble_score || 0,
                            match_fields: dup.match_fields || [],
                            confidence: dup.confidence || 'medium',
                          }}
                        />
                        {hasPermission('duplicates.resolve') ? (
                          <>
                            <button
                              onClick={() => resolveDuplicate(dup.check_id || dup.duplicate_id || idx, 'merge')}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              title="Merge duplicate records"
                            >
                              Merge
                            </button>
                            <button
                              onClick={() => resolveDuplicate(dup.check_id || dup.duplicate_id || idx, 'mark-as-ghost')}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                              title="Mark as ghost (fraudulent) records"
                            >
                              Mark Ghost
                            </button>
                            <button
                              onClick={() => resolveDuplicate(dup.check_id || dup.duplicate_id || idx, 'reject')}
                              className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                              title="Reject duplicate flag"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {duplicates.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                {error ? error : 'No duplicates found. Run detection to find potential duplicates.'}
              </div>
            )}
            {loading && (
              <div className="text-center py-8 text-gray-500">
                Loading duplicates...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

