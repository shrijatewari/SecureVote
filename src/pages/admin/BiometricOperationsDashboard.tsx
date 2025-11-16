import { useState, useEffect } from 'react';
import { biometricAdminService } from '../../services/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#2196F3', '#42A5F5', '#64B5F6', '#90CAF9'];

export default function BiometricOperationsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalBiometrics: 0,
    faceVerified: 0,
    fingerprintVerified: 0,
    pendingVerification: 0,
    biometricMismatches: 0,
    aiFaceFailures: 0,
    aiFingerprintFailures: 0,
    highRiskFlags: 0
  });
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [fraudFlags, setFraudFlags] = useState<any[]>([]);
  const [fraudClusters, setFraudClusters] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [searchVoterId, setSearchVoterId] = useState('');
  const [voterBiometric, setVoterBiometric] = useState<any>(null);
  const [compareVoter1, setCompareVoter1] = useState('');
  const [compareVoter2, setCompareVoter2] = useState('');
  const [compareResult, setCompareResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    if (activeTab === 'pending') fetchPendingVerifications();
    if (activeTab === 'fraud') fetchFraudFlags();
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'enrollments') fetchEnrollments();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const res = await biometricAdminService.getStats();
      setStats(res.data?.data || res.data || {});
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchPendingVerifications = async () => {
    try {
      const res = await biometricAdminService.getPendingVerifications(1, 50);
      setPendingVerifications(res.data?.verifications || res.data || []);
    } catch (error) {
      console.error('Failed to fetch pending verifications:', error);
    }
  };

  const fetchFraudFlags = async () => {
    try {
      const res = await biometricAdminService.getFraudFlags();
      setFraudFlags(res.data?.flags || res.data || []);
      const clustersRes = await biometricAdminService.getFraudClusters();
      setFraudClusters(clustersRes.data?.clusters || clustersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch fraud flags:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await biometricAdminService.getLogs(1, 50);
      setLogs(res.data?.logs || res.data || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const fetchEnrollments = async () => {
    try {
      const res = await biometricAdminService.getEnrollments(1, 50);
      setEnrollments(res.data?.enrollments || res.data || []);
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
    }
  };

  const handleSearchVoter = async () => {
    if (!searchVoterId) return;
    try {
      const res = await biometricAdminService.getVoterBiometric(parseInt(searchVoterId));
      setVoterBiometric(res.data?.data || res.data || null);
    } catch (error) {
      alert('Failed to fetch voter biometric: ' + (error as any).message);
    }
  };

  const handleCompareFaces = async () => {
    if (!compareVoter1 || !compareVoter2) {
      alert('Please enter both voter IDs');
      return;
    }
    setLoading(true);
    try {
      const res = await biometricAdminService.compareFaces(parseInt(compareVoter1), parseInt(compareVoter2));
      setCompareResult({ type: 'face', ...res.data?.data || res.data });
    } catch (error) {
      alert('Failed to compare faces: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompareFingerprints = async () => {
    if (!compareVoter1 || !compareVoter2) {
      alert('Please enter both voter IDs');
      return;
    }
    setLoading(true);
    try {
      const res = await biometricAdminService.compareFingerprints(parseInt(compareVoter1), parseInt(compareVoter2));
      setCompareResult({ type: 'fingerprint', ...res.data?.data || res.data });
    } catch (error) {
      alert('Failed to compare fingerprints: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (biometricId: number) => {
    if (!confirm('Approve this biometric verification?')) return;
    try {
      await biometricAdminService.approveBiometric(biometricId);
      alert('Biometric approved successfully!');
      fetchPendingVerifications();
      fetchStats();
    } catch (error) {
      alert('Failed to approve: ' + (error as any).message);
    }
  };

  const handleReject = async (biometricId: number) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await biometricAdminService.rejectBiometric(biometricId, reason);
      alert('Biometric rejected successfully!');
      fetchPendingVerifications();
      fetchStats();
    } catch (error) {
      alert('Failed to reject: ' + (error as any).message);
    }
  };

  const handleRequestRecapture = async (biometricId: number) => {
    if (!confirm('Request re-capture of biometric data?')) return;
    try {
      await biometricAdminService.requestRecapture(biometricId);
      alert('Re-capture requested successfully!');
      fetchPendingVerifications();
    } catch (error) {
      alert('Failed to request re-capture: ' + (error as any).message);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'search', name: 'Voter Search', icon: '🔍' },
    { id: 'compare', name: 'Face/Fingerprint Match', icon: '🔬' },
    { id: 'pending', name: 'Verification Queue', icon: '⏳' },
    { id: 'fraud', name: 'Fraud Detection', icon: '🚨' },
    { id: 'logs', name: 'Audit Logs', icon: '📋' },
    { id: 'enrollments', name: 'Enrollments', icon: '📝' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🔐 Biometric Operations Dashboard</h1>
          <p className="text-gray-600">Comprehensive biometric management and fraud detection</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { title: 'Total Biometrics', value: stats.totalBiometrics, color: 'bg-blue-500' },
                { title: 'Face Verified', value: stats.faceVerified, color: 'bg-green-500' },
                { title: 'Fingerprint Verified', value: stats.fingerprintVerified, color: 'bg-teal-500' },
                { title: 'Pending Verification', value: stats.pendingVerification, color: 'bg-yellow-500' },
                { title: 'Biometric Mismatches', value: stats.biometricMismatches, color: 'bg-red-500' },
                { title: 'AI Face Failures', value: stats.aiFaceFailures, color: 'bg-orange-500' },
                { title: 'AI Fingerprint Failures', value: stats.aiFingerprintFailures, color: 'bg-pink-500' },
                { title: 'High-Risk Flags', value: stats.highRiskFlags, color: 'bg-red-600' }
              ].map((card, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
                  <p className="text-sm text-gray-600 mb-2">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-800">{card.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Voter Search Tab */}
        {activeTab === 'search' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Search Voter Biometric Profile</h2>
            <div className="flex gap-4 mb-6">
              <input
                type="number"
                placeholder="Enter Voter ID"
                value={searchVoterId}
                onChange={(e) => setSearchVoterId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={handleSearchVoter}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Search
              </button>
            </div>
            {voterBiometric && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold mb-2">Voter: {voterBiometric.name}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Aadhaar:</strong> {voterBiometric.aadhaar_number || 'N/A'}</div>
                  <div><strong>Email:</strong> {voterBiometric.email || 'N/A'}</div>
                  <div><strong>Face Hash:</strong> {voterBiometric.face_hash ? `${voterBiometric.face_hash.slice(0, 20)}...` : 'Not registered'}</div>
                  <div><strong>Fingerprint Hash:</strong> {voterBiometric.fingerprint_hash ? `${voterBiometric.fingerprint_hash.slice(0, 20)}...` : 'Not registered'}</div>
                  <div><strong>Face Verified:</strong> {voterBiometric.face_verified ? '✅ Yes' : '❌ No'}</div>
                  <div><strong>Fingerprint Verified:</strong> {voterBiometric.fingerprint_verified ? '✅ Yes' : '❌ No'}</div>
                  <div><strong>Status:</strong> {voterBiometric.status || 'pending'}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compare Tab */}
        {activeTab === 'compare' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Compare Biometrics</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Voter ID 1</label>
                <input
                  type="number"
                  value={compareVoter1}
                  onChange={(e) => setCompareVoter1(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Voter ID 2</label>
                <input
                  type="number"
                  value={compareVoter2}
                  onChange={(e) => setCompareVoter2(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-4 mb-6">
              <button
                onClick={handleCompareFaces}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Compare Faces
              </button>
              <button
                onClick={handleCompareFingerprints}
                disabled={loading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Compare Fingerprints
              </button>
            </div>
            {compareResult && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold mb-2">Comparison Result ({compareResult.type})</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Similarity:</strong> {(compareResult.similarity * 100).toFixed(2)}%</div>
                  <div><strong>Confidence:</strong> {compareResult.confidence}</div>
                  <div><strong>Risk Level:</strong> <span className={`px-2 py-1 rounded ${
                    compareResult.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                    compareResult.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>{compareResult.risk_level}</span></div>
                  {compareResult.distance && <div><strong>Distance:</strong> {compareResult.distance.toFixed(4)}</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pending Verifications Tab */}
        {activeTab === 'pending' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Verification Queue</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Voter ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Aadhaar</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Face Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Fingerprint Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingVerifications.map((v: any) => (
                    <tr key={v.biometric_id || v.voter_id}>
                      <td className="px-4 py-3 text-sm">{v.voter_id}</td>
                      <td className="px-4 py-3 text-sm">{v.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{v.aadhaar_number || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{v.face_verified ? '✅ Verified' : '⏳ Pending'}</td>
                      <td className="px-4 py-3 text-sm">{v.fingerprint_verified ? '✅ Verified' : '⏳ Pending'}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(v.biometric_id || v.voter_id)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(v.biometric_id || v.voter_id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleRequestRecapture(v.biometric_id || v.voter_id)}
                            className="px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                          >
                            Re-capture
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Fraud Detection Tab */}
        {activeTab === 'fraud' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">🚨 High-Risk Fraud Flags</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Voter 1</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Voter 2</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Similarity</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {fraudFlags.map((flag: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm">{flag.voter1_name || flag.voter_id_1}</td>
                        <td className="px-4 py-3 text-sm">{flag.voter2_name || flag.voter_id_2}</td>
                        <td className="px-4 py-3 text-sm">{flag.type}</td>
                        <td className="px-4 py-3 text-sm">{(flag.similarity_score * 100).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded ${
                            flag.risk_level === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>{flag.risk_level}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">🔍 Suspicious Clusters</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Fingerprint Hash</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Cluster Size</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Voter IDs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {fraudClusters.map((cluster: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm font-mono">{cluster.fingerprint_hash?.slice(0, 20)}...</td>
                        <td className="px-4 py-3 text-sm">{cluster.cluster_size}</td>
                        <td className="px-4 py-3 text-sm">{cluster.voter_ids}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Biometric Audit Logs</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Voter 1</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Voter 2</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Similarity</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Confidence</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm">{log.voter1_name || log.voter_id_1}</td>
                      <td className="px-4 py-3 text-sm">{log.voter2_name || log.voter_id_2}</td>
                      <td className="px-4 py-3 text-sm">{log.type}</td>
                      <td className="px-4 py-3 text-sm">{(log.similarity_score * 100).toFixed(2)}%</td>
                      <td className="px-4 py-3 text-sm">{log.confidence}</td>
                      <td className="px-4 py-3 text-sm">{new Date(log.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Enrollments Tab */}
        {activeTab === 'enrollments' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">New Biometric Enrollments</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Voter ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Aadhaar</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Enrolled</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {enrollments.map((enrollment: any) => (
                    <tr key={enrollment.biometric_id || enrollment.voter_id}>
                      <td className="px-4 py-3 text-sm">{enrollment.voter_id}</td>
                      <td className="px-4 py-3 text-sm">{enrollment.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{enrollment.aadhaar_number || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{enrollment.status || 'pending'}</td>
                      <td className="px-4 py-3 text-sm">{new Date(enrollment.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleApprove(enrollment.biometric_id || enrollment.voter_id)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

