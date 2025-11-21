import { useState, useEffect } from 'react';
import { siemService } from '../../services/api';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function SecuritySIEMDashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [periodDays, setPeriodDays] = useState(7);
  const [loading, setLoading] = useState(true);
  
  // Section 1: Overview Stats
  const [overview, setOverview] = useState<any>(null);
  
  // Section 2: Event Timeline
  const [events, setEvents] = useState<any[]>([]);
  
  // Section 3: Threat Heatmap
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  
  // Section 4: Anomalies
  const [anomalies, setAnomalies] = useState<any[]>([]);
  
  // Section 5: Admin Activity
  const [adminActivity, setAdminActivity] = useState<any[]>([]);
  
  // Section 6: Hash Chain
  const [hashChainStatus, setHashChainStatus] = useState<any>(null);
  
  // Section 7: IP Blocks
  const [ipBlocks, setIpBlocks] = useState<any[]>([]);
  const [rateLimitLogs, setRateLimitLogs] = useState<any[]>([]);
  
  // Section 8: Security Alerts
  const [alerts, setAlerts] = useState<any[]>([]);
  
  // Section 9: Risk Score
  const [riskScore, setRiskScore] = useState<any>(null);
  
  // Section 10: BLO Devices
  const [bloDevices, setBLODevices] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeSection) {
        case 'overview':
          const overviewRes = await siemService.getOverview(periodDays);
          console.log('Overview response:', overviewRes);
          setOverview(overviewRes.data?.data || overviewRes.data || null);
          break;
        case 'timeline':
          const eventsRes = await siemService.getEventTimeline(200);
          console.log('Events response:', eventsRes);
          setEvents(eventsRes.data?.data || eventsRes.data || []);
          break;
        case 'heatmap':
          const heatmapRes = await siemService.getThreatHeatmap(periodDays);
          console.log('Heatmap response:', heatmapRes);
          setHeatmapData(heatmapRes.data?.data || heatmapRes.data || []);
          break;
        case 'anomalies':
          const anomaliesRes = await siemService.getAnomalies({ status: 'pending' });
          console.log('Anomalies response:', anomaliesRes);
          setAnomalies(anomaliesRes.data?.data || anomaliesRes.data || []);
          break;
        case 'admin-activity':
          const adminRes = await siemService.getAdminActivity();
          console.log('Admin activity response:', adminRes);
          setAdminActivity(adminRes.data?.data || adminRes.data || []);
          break;
        case 'hash-chain':
          const hashRes = await siemService.getHashChainStatus();
          console.log('Hash chain response:', hashRes);
          setHashChainStatus(hashRes.data?.data || hashRes.data || null);
          break;
        case 'ip-blocks':
          const [blocksRes, rateRes] = await Promise.all([
            siemService.getIPBlocks(true),
            siemService.getRateLimitLogs(24)
          ]);
          console.log('IP blocks response:', blocksRes);
          console.log('Rate limit response:', rateRes);
          setIpBlocks(blocksRes.data?.data || blocksRes.data || []);
          setRateLimitLogs(rateRes.data?.data || rateRes.data || []);
          break;
        case 'alerts':
          const alertsRes = await siemService.getSecurityAlerts({ status: 'new' });
          console.log('Alerts response:', alertsRes);
          setAlerts(alertsRes.data?.data || alertsRes.data || []);
          break;
        case 'risk-score':
          const riskRes = await siemService.getSecurityRiskScore();
          console.log('Risk score response:', riskRes);
          setRiskScore(riskRes.data?.data || riskRes.data || null);
          break;
        case 'blo-devices':
          const bloRes = await siemService.getBLODeviceMonitoring();
          console.log('BLO devices response:', bloRes);
          setBLODevices(bloRes.data?.data || bloRes.data || []);
          break;
      }
    } catch (error: any) {
      console.error(`Error loading ${activeSection}:`, error);
      console.error('Error details:', error.response?.data || error.message);
      console.error('Full error:', error);
      console.error('Request URL:', error.config?.url);
      console.error('Request baseURL:', error.config?.baseURL);
      // Don't show alert for 404s - just log to console
      if (error.response?.status !== 404) {
        alert(`Error loading ${activeSection}: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, periodDays]);

  const resolveAnomaly = async (anomalyId: number, status: string) => {
    try {
      await siemService.resolveAnomaly(anomalyId, status, 'Resolved via dashboard');
      loadData();
      alert('Anomaly resolved successfully');
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const verifyHashChain = async () => {
    try {
      setLoading(true);
      const res = await siemService.verifyHashChain();
      alert(`Hash chain verification completed. Status: ${res.data?.data?.chain_health || 'unknown'}`);
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const blockIP = async (ip: string, reason: string) => {
    try {
      await siemService.blockIP(ip, reason);
      alert('IP blocked successfully');
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const unblockIP = async (ip: string) => {
    try {
      await siemService.unblockIP(ip);
      alert('IP unblocked successfully');
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const acknowledgeAlert = async (alertId: number) => {
    try {
      await siemService.acknowledgeAlert(alertId);
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const resolveAlert = async (alertId: number, notes: string) => {
    try {
      await siemService.resolveAlert(alertId, notes);
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const sections = [
    { id: 'overview', name: 'Security Overview', icon: '📊' },
    { id: 'timeline', name: 'Event Timeline', icon: '📅' },
    { id: 'heatmap', name: 'Threat Heatmap', icon: '🗺️' },
    { id: 'anomalies', name: 'Anomaly Detection', icon: '🔍' },
    { id: 'admin-activity', name: 'Admin Activity', icon: '👤' },
    { id: 'hash-chain', name: 'Hash Chain', icon: '🔗' },
    { id: 'ip-blocks', name: 'IP Blocks & Rate Limits', icon: '🚫' },
    { id: 'alerts', name: 'Security Alerts', icon: '🚨' },
    { id: 'risk-score', name: 'Risk Score', icon: '⚠️' },
    { id: 'blo-devices', name: 'BLO Devices', icon: '📱' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Security & SIEM Dashboard</h1>
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600">Period (days):</label>
            <input
              type="number"
              value={periodDays}
              onChange={(e) => setPeriodDays(parseInt(e.target.value) || 7)}
              className="w-20 px-3 py-1 border rounded"
              min="1"
              max="30"
            />
          </div>
        </div>

        {/* Section Navigation */}
        <div className="mb-6 flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {section.icon} {section.name}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            {/* Section 1: Overview */}
            {activeSection === 'overview' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Security Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Total Events</div>
                    <div className="text-3xl font-bold text-blue-600">{overview?.total_events || 0}</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Unique IPs</div>
                    <div className="text-3xl font-bold text-red-600">{overview?.unique_ips || 0}</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Affected Users</div>
                    <div className="text-3xl font-bold text-yellow-600">{overview?.affected_users || 0}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Avg Risk Score</div>
                    <div className="text-3xl font-bold text-purple-600">
                      {overview?.avg_risk_score ? Math.round(overview.avg_risk_score) : 0}
                    </div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Anomalies Today</div>
                    <div className="text-3xl font-bold text-orange-600">{overview?.detected_anomalies_today || 0}</div>
                  </div>
                  <div className="bg-pink-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Failed Logins</div>
                    <div className="text-3xl font-bold text-pink-600">{overview?.failed_logins || 0}</div>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Blocked Requests</div>
                    <div className="text-3xl font-bold text-indigo-600">{overview?.blocked_requests || 0}</div>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Integrity Failures</div>
                    <div className="text-3xl font-bold text-teal-600">{overview?.integrity_failures || 0}</div>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">High Severity Alerts</div>
                    <div className="text-3xl font-bold text-rose-600">{overview?.high_severity_alerts || 0}</div>
                  </div>
                  <div className="bg-cyan-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">API Abuse Attempts</div>
                    <div className="text-3xl font-bold text-cyan-600">{overview?.api_abuse_attempts || 0}</div>
                  </div>
                </div>
                {!overview && !loading && (
                  <div className="text-center py-4 text-yellow-600 text-sm">
                    ⚠️ Data not loaded. Check browser console for API response.
                  </div>
                )}
              </div>
            )}

            {/* Section 2: Event Timeline */}
            {activeSection === 'timeline' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Event Timeline ({events.length} events)</h2>
                {events.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Score</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {events.slice(0, 50).map((event: any) => (
                        <tr key={event.event_id}>
                          <td className="px-4 py-3 text-sm">{new Date(event.timestamp).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">{event.source_ip}</td>
                          <td className="px-4 py-3 text-sm">{event.user_email || event.user_id || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">{event.event_type}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              event.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              event.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              event.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {event.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{event.risk_score}</td>
                          <td className="px-4 py-3 text-sm">{event.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No events found ({events.length} loaded). Check browser console for API response.
                  </div>
                )}
              </div>
            )}

            {/* Section 3: Threat Heatmap */}
            {activeSection === 'heatmap' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Threat Heatmap ({heatmapData.length} locations)</h2>
                {heatmapData.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {heatmapData.slice(0, 20).map((item: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="font-semibold">{item.ip}</div>
                      <div className="text-sm text-gray-600">{item.country}, {item.city}</div>
                      <div className="mt-2">
                        <span className="text-sm">Attacks: </span>
                        <span className="font-bold text-red-600">{item.attack_count}</span>
                      </div>
                      <div>
                        <span className="text-sm">Max Risk: </span>
                        <span className="font-bold">{item.maxRisk}</span>
                      </div>
                    </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No heatmap data ({heatmapData.length} loaded). Check console.
                  </div>
                )}
              </div>
            )}

            {/* Section 4: Anomalies */}
            {activeSection === 'anomalies' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Anomaly Detection Center ({anomalies.length} anomalies)</h2>
                {anomalies.length > 0 ? (
                  <div className="space-y-4">
                    {anomalies.map((anomaly: any) => (
                    <div key={anomaly.anomaly_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{anomaly.anomaly_type}</div>
                          <div className="text-sm text-gray-600">{anomaly.description}</div>
                          <div className="mt-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              anomaly.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              anomaly.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {anomaly.severity}
                            </span>
                            <span className="ml-2 text-sm">Score: {anomaly.score}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => resolveAnomaly(anomaly.anomaly_id, 'false_positive')}
                            className="px-3 py-1 bg-gray-200 rounded text-sm"
                          >
                            False Positive
                          </button>
                          <button
                            onClick={() => resolveAnomaly(anomaly.anomaly_id, 'resolved')}
                            className="px-3 py-1 bg-green-200 rounded text-sm"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No anomalies found ({anomalies.length} loaded).
                  </div>
                )}
              </div>
            )}

            {/* Section 5: Admin Activity */}
            {activeSection === 'admin-activity' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Admin Activity Monitoring ({adminActivity.length} activities)</h2>
                {adminActivity.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {adminActivity.slice(0, 50).map((activity: any) => (
                        <tr key={activity.log_id}>
                          <td className="px-4 py-3 text-sm">{new Date(activity.timestamp).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">{activity.admin_email || activity.admin_id}</td>
                          <td className="px-4 py-3 text-sm">{activity.module}</td>
                          <td className="px-4 py-3 text-sm">{activity.action}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              activity.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                              activity.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {activity.risk_level}
                            </span>
                          </td>
                        </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No admin activity found ({adminActivity.length} loaded).
                  </div>
                )}
              </div>
            )}

            {/* Section 6: Hash Chain */}
            {activeSection === 'hash-chain' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Hash Chain Integrity</h2>
                {hashChainStatus ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <div className="text-lg font-semibold">Chain Status</div>
                          <div className={`text-2xl font-bold ${
                            hashChainStatus.chain_health === 'healthy' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {hashChainStatus.chain_health?.toUpperCase() || 'UNKNOWN'}
                          </div>
                        </div>
                        <button
                          onClick={verifyHashChain}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          disabled={loading}
                        >
                          {loading ? 'Verifying...' : 'Run Verification'}
                        </button>
                      </div>
                      {hashChainStatus.chain_status && (
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div>
                            <div className="text-sm text-gray-600">Total Blocks</div>
                            <div className="text-xl font-bold">{hashChainStatus.chain_status.total_blocks || 0}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Valid Blocks</div>
                            <div className="text-xl font-bold text-green-600">{hashChainStatus.chain_status.valid_blocks || 0}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Invalid Blocks</div>
                            <div className="text-xl font-bold text-red-600">{hashChainStatus.chain_status.invalid_blocks || 0}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Hash chain status not loaded. Click "Run Verification" to check.
                  </div>
                )}
              </div>
            )}

            {/* Section 7: IP Blocks */}
            {activeSection === 'ip-blocks' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">IP Blocking & Rate Limiting</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Blocked IPs ({ipBlocks.length})</h3>
                    {ipBlocks.length > 0 ? (
                      <div className="space-y-2">
                        {ipBlocks.map((block: any) => (
                        <div key={block.block_id} className="border rounded p-3 flex justify-between items-center">
                          <div>
                            <div className="font-semibold">{block.ip_address}</div>
                            <div className="text-sm text-gray-600">{block.reason}</div>
                          </div>
                          <button
                            onClick={() => unblockIP(block.ip_address)}
                            className="px-3 py-1 bg-green-200 rounded text-sm"
                          >
                            Unblock
                          </button>
                        </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">No blocked IPs ({ipBlocks.length} loaded)</div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Rate Limit Logs (Last 24h) ({rateLimitLogs.length})</h3>
                    {rateLimitLogs.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {rateLimitLogs.slice(0, 20).map((log: any) => (
                        <div key={log.log_id} className="border rounded p-3">
                          <div className="font-semibold">{log.ip_address || log.user_email || 'Unknown'}</div>
                          <div className="text-sm text-gray-600">{log.endpoint}</div>
                          <div className="text-sm">Requests: {log.request_count}</div>
                        </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">No rate limit logs ({rateLimitLogs.length} loaded)</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Section 8: Security Alerts */}
            {activeSection === 'alerts' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Security Alerts ({alerts.length} alerts)</h2>
                {alerts.length > 0 ? (
                  <div className="space-y-4">
                    {alerts.map((alert: any) => (
                    <div key={alert.alert_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{alert.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{alert.message}</div>
                          <div className="mt-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {alert.severity}
                            </span>
                            <span className="ml-2 text-sm text-gray-600">
                              {new Date(alert.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => acknowledgeAlert(alert.alert_id)}
                            className="px-3 py-1 bg-blue-200 rounded text-sm"
                          >
                            Acknowledge
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt('Resolution notes:');
                              if (notes) resolveAlert(alert.alert_id, notes);
                            }}
                            className="px-3 py-1 bg-green-200 rounded text-sm"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No security alerts found ({alerts.length} loaded).
                  </div>
                )}
              </div>
            )}

            {/* Section 9: Risk Score */}
            {activeSection === 'risk-score' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Security Risk Score & Recommendations</h2>
                {riskScore ? (
                  <div className="space-y-6">
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-lg font-semibold">Overall Risk Score</div>
                          <div className={`text-4xl font-bold ${
                            riskScore.risk_score >= 80 ? 'text-red-600' :
                            riskScore.risk_score >= 60 ? 'text-orange-600' :
                            riskScore.risk_score >= 40 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {riskScore.risk_score}/100
                          </div>
                          <div className="text-sm text-gray-600 mt-1">Risk Level: {riskScore.risk_level}</div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Recommendations:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {riskScore.recommendations?.map((rec: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-700">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Risk score not loaded ({riskScore ? 'loaded' : 'null'}).
                  </div>
                )}
              </div>
            )}

            {/* Section 10: BLO Devices */}
            {activeSection === 'blo-devices' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">BLO Device Monitoring ({bloDevices.length} devices)</h2>
                {bloDevices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">BLO</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Seen</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location Mismatch</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bloDevices.map((device: any) => (
                        <tr key={device.device_id}>
                          <td className="px-4 py-3 text-sm">{device.blo_name || device.blo_email}</td>
                          <td className="px-4 py-3 text-sm">{device.device_name || device.device_fingerprint}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              device.is_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {device.is_online ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : 'Never'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {device.location_mismatch ? (
                              <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                                Yes ({device.distance_from_expected?.toFixed(1)} km)
                              </span>
                            ) : (
                              <span className="text-gray-500">No</span>
                            )}
                          </td>
                        </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No BLO devices found ({bloDevices.length} loaded).
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

