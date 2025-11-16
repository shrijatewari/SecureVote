import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  adminService
} from '../services/api';
import LanguageSelector from '../components/LanguageSelector';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const COLORS = ['#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#2196F3', '#42A5F5'];

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeModule, setActiveModule] = useState('overview');
  const [stats, setStats] = useState({
    totalVoters: 0,
    verifiedVoters: 0,
    pendingVerification: 0,
    totalElections: 0,
    activeElections: 0,
    totalVotes: 0,
    duplicates: 0,
    duplicatesMerged: 0,
    duplicatesMarkedGhost: 0,
    duplicatesRejected: 0,
    deceasedPending: 0,
    revisionBatches: 0,
    grievancesPending: 0,
    bloTasksPending: 0,
    suspiciousAddresses: 0,
    epicGeneratedToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [aiHealth, setAIHealth] = useState<any>({});

  useEffect(() => {
    fetchStats();
    fetchChartData();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await adminService.getStats();
      const data = res.data?.data || res.data || {};
      setStats({
        totalVoters: data.totalVoters || 0,
        verifiedVoters: data.verifiedVoters || 0,
        pendingVerification: data.pendingVerification || 0,
        totalElections: stats.totalElections, // keep previous if not provided
        activeElections: stats.activeElections,
        totalVotes: stats.totalVotes,
        duplicates: data.duplicates || 0,
        duplicatesMerged: data.duplicatesMerged || 0,
        duplicatesMarkedGhost: data.duplicatesMarkedGhost || 0,
        duplicatesRejected: data.duplicatesRejected || 0,
        deceasedPending: data.deathRecords || 0,
        revisionBatches: data.revisionBatches || 0,
        grievancesPending: data.grievancesPending || 0,
        bloTasksPending: data.bloTasksPending || 0,
        suspiciousAddresses: stats.suspiciousAddresses,
        epicGeneratedToday: data.epicGeneratedToday || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const res = await adminService.getGraphs();
      const data = res.data?.data || res.data || {};
      const regs = (data.registrations || []).map((r: any) => ({
        name: r.month || '',
        voters: Number(r.count || 0),
        verified: undefined
      }));
      setChartData(regs);
      setStatusDistribution(data.verificationDistribution || []);
    } catch (e) {
      console.warn('Graphs unavailable, using placeholders');
      setChartData([]);
      setStatusDistribution([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    navigate('/');
  };

  const metricCards = [
    {
      id: 'voters',
      title: 'Total Registered Voters',
      value: stats.totalVoters,
      icon: '👥',
      color: 'bg-blue-500',
      link: '/admin/voters',
    },
    {
      id: 'verified',
      title: 'Verified Voters',
      value: stats.verifiedVoters,
      icon: '✅',
      color: 'bg-green-500',
      link: '/admin/voters?status=verified',
    },
    {
      id: 'duplicates',
      title: 'Flagged Duplicates',
      value: stats.duplicates,
      icon: '🔍',
      color: 'bg-red-500',
      link: '/admin/duplicates',
    },
    {
      id: 'duplicates-merged',
      title: 'Duplicates Merged',
      value: stats.duplicatesMerged,
      icon: '🔗',
      color: 'bg-green-600',
      link: '/admin/duplicates?action=merged',
    },
    {
      id: 'duplicates-ghost',
      title: 'Marked as Ghost',
      value: stats.duplicatesMarkedGhost,
      icon: '👻',
      color: 'bg-yellow-600',
      link: '/admin/duplicates?action=ghost',
    },
    {
      id: 'duplicates-rejected',
      title: 'Duplicates Rejected',
      value: stats.duplicatesRejected,
      icon: '❌',
      color: 'bg-gray-600',
      link: '/admin/duplicates?action=rejected',
    },
    {
      id: 'deceased',
      title: 'Deceased Pending Approval',
      value: stats.deceasedPending,
      icon: '⚰️',
      color: 'bg-gray-600',
      link: '/admin/death-records',
    },
    {
      id: 'revision',
      title: 'Active Revision Batches',
      value: stats.revisionBatches,
      icon: '📋',
      color: 'bg-purple-500',
      link: '/admin/revision',
    },
    {
      id: 'grievances',
      title: 'Pending Grievances',
      value: stats.grievancesPending,
      icon: '📝',
      color: 'bg-orange-500',
      link: '/admin/grievances',
    },
    {
      id: 'blo-tasks',
      title: 'BLO Tasks Pending',
      value: stats.bloTasksPending,
      icon: '📋',
      color: 'bg-indigo-500',
      link: '/admin/blo-tasks',
    },
    {
      id: 'epic',
      title: 'EPIC Generated Today',
      value: stats.epicGeneratedToday,
      icon: '🆔',
      color: 'bg-teal-500',
      link: '/admin/epic',
    },
  ];

  const modules = [
    { id: 'overview', name: 'Dashboard Overview', icon: '📊', path: '/admin' },
    { id: 'ai', name: 'AI Services', icon: '🤖', path: '/admin/ai-services' },
    { id: 'voters', name: 'Voter Management', icon: '👥', path: '/admin/voters' },
    { id: 'revision', name: 'Roll Revision', icon: '📋', path: '/admin/revision' },
    { id: 'duplicates', name: 'Duplicate Detection', icon: '🔍', path: '/admin/duplicates' },
    { id: 'deceased', name: 'Death Record Sync', icon: '⚰️', path: '/admin/death-records' },
    { id: 'blo', name: 'BLO Field Verification', icon: '📍', path: '/admin/blo-tasks' },
    { id: 'grievances', name: 'Grievance Management', icon: '📝', path: '/admin/grievances' },
    { id: 'address', name: 'Address Analytics', icon: '🗺️', path: '/admin/address-clusters' },
    { id: 'documents', name: 'Document Verification', icon: '📄', path: '/admin/documents' },
    { id: 'biometric', name: 'Biometric Operations', icon: '🔐', path: '/admin/biometric' },
    { id: 'communications', name: 'Official Communications', icon: '📢', path: '/admin/communications' },
    { id: 'security', name: 'Security & Audit', icon: '🛡️', path: '/admin/security' },
    { id: 'multilingual', name: 'Content Management', icon: '🌐', path: '/admin/content' },
    { id: 'elections', name: 'Election Management', icon: '🗳️', path: '/admin/elections' },
    { id: 'settings', name: 'System Settings', icon: '⚙️', path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-primary-navy text-white flex flex-col shadow-2xl">
        {/* Header with India Emblem */}
        <div className="p-6 border-b border-blue-700">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-green-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">🇮🇳</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">ECI Admin Portal</h1>
              <p className="text-xs text-blue-200">Election Commission</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          {modules.map((module) => (
            <Link
              key={module.id}
              to={module.path}
              onClick={() => setActiveModule(module.id)}
              className={`flex items-center space-x-3 px-6 py-3 mx-2 rounded-lg transition-all ${
                activeModule === module.id || location.pathname === module.path
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white'
              }`}
            >
              <span className="text-xl">{module.icon}</span>
              <span className="text-sm font-medium">{module.name}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-blue-700">
          <div className="flex items-center justify-between mb-2">
            <LanguageSelector compact={true} showLabel={false} />
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
          <div className="px-8 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">System Overview</h2>
              <p className="text-sm text-gray-600">Monitor and manage all election operations</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-navy mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading dashboard data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {metricCards.map((card) => (
                  <Link
                    key={card.id}
                    to={card.link}
                    className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all p-6 border-l-4 border-transparent hover:border-primary-navy group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform`}>
                        {card.icon}
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-800">{card.value.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">{card.title}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-primary-navy font-medium group-hover:underline">
                        View Details →
                      </p>
                    </div>
                  </Link>
                ))}
                
                {/* AI Services Card */}
                <Link
                  to="/admin/ai-services"
                  className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg hover:shadow-2xl transition-all p-6 border-l-4 border-purple-700 group text-white"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform">
                      🤖
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-white">6</p>
                      <p className="text-xs text-white/80 mt-1">AI Services</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-xs text-white font-medium group-hover:underline">
                      Manage AI Services →
                    </p>
                  </div>
                </Link>
              </div>

              {/* Charts Section */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Registration Trend */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Voter Registration Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="voters" stroke="#0D47A1" strokeWidth={2} name="Total Voters" />
                      <Line type="monotone" dataKey="verified" stroke="#0FA958" strokeWidth={2} name="Verified" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Status Distribution */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Voter Status Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick Actions & Recent Activity */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Link
                      to="/admin/revision/run"
                      className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                    >
                      <span className="text-2xl">🔄</span>
                      <div>
                        <p className="font-semibold text-gray-800">Run Revision Dry-Run</p>
                        <p className="text-xs text-gray-600">Generate revision flags without committing</p>
                      </div>
                    </Link>
                    <Link
                      to="/admin/duplicates/run"
                      className="flex items-center space-x-3 p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                    >
                      <span className="text-2xl">🔍</span>
                      <div>
                        <p className="font-semibold text-gray-800">Scan for Duplicates</p>
                        <p className="text-xs text-gray-600">Run duplicate detection algorithm</p>
                      </div>
                    </Link>
                    <Link
                      to="/admin/death-records/sync"
                      className="flex items-center space-x-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      <span className="text-2xl">⚰️</span>
                      <div>
                        <p className="font-semibold text-gray-800">Sync Death Records</p>
                        <p className="text-xs text-gray-600">Import and match civil registry data</p>
                      </div>
                    </Link>
                    <Link
                      to="/admin/transparency/merkle"
                      className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                    >
                      <span className="text-2xl">🔐</span>
                      <div>
                        <p className="font-semibold text-gray-800">Generate Merkle Root</p>
                        <p className="text-xs text-gray-600">Create tamper-proof snapshot</p>
                      </div>
                    </Link>
                    <Link
                      to="/admin/ai-services"
                      className="flex items-center space-x-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
                    >
                      <span className="text-2xl">🤖</span>
                      <div>
                        <p className="font-semibold text-gray-800">AI Services Dashboard</p>
                        <p className="text-xs text-gray-600">Test and monitor AI microservices</p>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-lg">✅</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">Revision batch committed</p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-lg">🔍</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">15 duplicates detected</p>
                        <p className="text-xs text-gray-500">4 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-lg">📝</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">New grievance received</p>
                        <p className="text-xs text-gray-500">6 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-lg">📍</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">BLO task completed</p>
                        <p className="text-xs text-gray-500">8 hours ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
