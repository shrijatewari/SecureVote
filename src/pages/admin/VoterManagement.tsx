import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { voterService } from '../../services/api';
import AiButton from '../../components/AiButton';

export default function VoterManagement() {
  const [voters, setVoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'aadhaar' | 'epic' | 'mobile'>('name');
  const [selectedVoter, setSelectedVoter] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
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

  useEffect(() => {
    fetchVoters();
  }, [page]);

  const fetchVoters = async () => {
    try {
      setLoading(true);
      console.log(`🔍 Fetching voters - Page: ${page}, Limit: 20`);
      
      const response = await voterService.getAll(page, 20);
      console.log('📦 Full API response:', response);
      console.log('📦 Response.data:', response.data);
      console.log('📦 Response.data type:', typeof response.data);
      
      // Handle different response formats - be very thorough
      let votersData = [];
      let pagination = {};
      
      // Check all possible response structures
      if (response?.data) {
        // Case 1: response.data is an array directly
        if (Array.isArray(response.data)) {
          votersData = response.data;
          console.log('✅ Found voters as array in response.data');
        }
        // Case 2: response.data.voters exists
        else if (response.data.voters && Array.isArray(response.data.voters)) {
          votersData = response.data.voters;
          pagination = response.data.pagination || {};
          console.log('✅ Found voters in response.data.voters');
        }
        // Case 3: response.data.data.voters (nested)
        else if (response.data.data?.voters && Array.isArray(response.data.data.voters)) {
          votersData = response.data.data.voters;
          pagination = response.data.data.pagination || {};
          console.log('✅ Found voters in response.data.data.voters');
        }
        // Case 4: response.data.success && response.data.voters
        else if (response.data.success && response.data.voters && Array.isArray(response.data.voters)) {
          votersData = response.data.voters;
          pagination = response.data.pagination || {};
          console.log('✅ Found voters in response.data.voters (with success flag)');
        }
        // Case 5: Check if response.data itself has voter-like structure
        else if (response.data && typeof response.data === 'object') {
          console.log('⚠️  Response.data structure:', Object.keys(response.data));
          // Try to find any array that might be voters
          for (const key in response.data) {
            if (Array.isArray(response.data[key]) && key.toLowerCase().includes('voter')) {
              votersData = response.data[key];
              console.log(`✅ Found voters in response.data.${key}`);
              break;
            }
          }
        }
      }
      // Case 6: response.voters directly
      else if (response?.voters && Array.isArray(response.voters)) {
        votersData = response.voters;
        pagination = response.pagination || {};
        console.log('✅ Found voters in response.voters');
      }
      
      console.log(`✅ Parsed ${votersData.length} voters from response`);
      console.log('📊 Voters data sample:`, votersData.slice(0, 2));
      console.log('📊 Pagination:', pagination);
      
      if (votersData.length === 0) {
        console.warn('⚠️  No voters found in response. Full response:', JSON.stringify(response, null, 2));
      }
      
      setVoters(Array.isArray(votersData) ? votersData : []);
      const calculatedPages = pagination.totalPages || Math.ceil((pagination.total || votersData.length || 0) / 20) || 1;
      setTotalPages(calculatedPages);
      
      console.log(`✅ Set ${votersData.length} voters, ${calculatedPages} total pages`);
    } catch (error: any) {
      console.error('❌ Failed to fetch voters:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        fullError: error
      });
      
      // Show user-friendly error
      if (error.response?.status === 403) {
        alert('Access denied. You need "voters.view" permission to view voters. If you are superadmin, make sure backend was restarted.');
      } else if (error.response?.status === 401) {
        alert('Please log in to view voters.');
      } else if (error.response?.status === 404) {
        alert('API endpoint not found. Check if backend is running on port 3000.');
      } else {
        console.error('Unexpected error:', error);
      }
      
      setVoters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Fetch all voters for client-side filtering (or implement backend search)
      const response = await voterService.getAll(1, 1000);
      let allVoters = response.data?.voters || response.data?.data?.voters || response.voters || [];
      
      if (searchTerm) {
        allVoters = allVoters.filter((v: any) => {
          switch (searchType) {
            case 'name':
              return v.name?.toLowerCase().includes(searchTerm.toLowerCase());
            case 'aadhaar':
              return v.aadhaar_number?.includes(searchTerm);
            case 'epic':
              return v.epic_number?.includes(searchTerm);
            case 'mobile':
              return v.mobile_number?.includes(searchTerm);
            default:
              return true;
          }
        });
      }
      
      setVoters(allVoters);
      setPage(1);
      setTotalPages(1);
    } catch (error: any) {
      console.error('Search failed:', error);
      setVoters([]);
    } finally {
      setLoading(false);
    }
  };

  const maskAadhaar = (aadhaar: string) => {
    if (!aadhaar) return 'N/A';
    return `XXXX-XXXX-${aadhaar.slice(-4)}`;
  };

  useEffect(() => {
    if (selectedVoter) {
      setEditForm({
        name: selectedVoter.name || '',
        email: selectedVoter.email || '',
        mobile_number: selectedVoter.mobile_number || '',
        is_verified: !!selectedVoter.is_verified,
        gender: selectedVoter.gender || '',
        house_number: selectedVoter.house_number || '',
        street: selectedVoter.street || '',
        village_city: selectedVoter.village_city || '',
        district: selectedVoter.district || '',
        state: selectedVoter.state || '',
        pin_code: selectedVoter.pin_code || ''
      });
      setActionError('');
    } else {
      setEditForm(null);
    }
  }, [selectedVoter]);

  const handleUpdateVoter = async () => {
    if (!selectedVoter) return;
    setSaving(true);
    setActionError('');
    try {
      await voterService.update(selectedVoter.voter_id, editForm);
      await fetchVoters();
      setSelectedVoter(null);
    } catch (error: any) {
      setActionError(error.response?.data?.error || 'Failed to update voter');
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setSelectedVoter(null);
    setActionError('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Voter Management</h1>
              <p className="text-gray-600">Search, view, and manage voter records</p>
            </div>
            {/* AI Test Button */}
            <AiButton
              endpoint="recommend-action"
              payload={{
                issueType: "voter_management",
                context: "Managing voter records",
                severity: "info"
              }}
              buttonText="AI Help"
              buttonIcon="🤖"
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-navy focus:border-transparent"
            >
              <option value="name">Name</option>
              <option value="aadhaar">Aadhaar</option>
              <option value="epic">EPIC Number</option>
              <option value="mobile">Mobile Number</option>
            </select>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search by ${searchType}...`}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-navy focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-primary-navy text-white rounded-lg hover:bg-primary-royal transition-colors font-medium"
            >
              Search
            </button>
            <button
              onClick={() => {
                setSearchTerm('');
                fetchVoters();
              }}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Voters Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary-navy text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Voter ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Aadhaar</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">EPIC</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Mobile</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Loading voters...
                    </td>
                  </tr>
                ) : voters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      <div>
                        <p className="mb-2">No voters found</p>
                        <p className="text-xs text-gray-400">Make sure you're logged in as admin and have proper permissions</p>
                        <p className="text-xs text-gray-400 mt-1">Or run: npm --prefix backend run seed:voters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  voters.map((voter) => (
                    <tr key={voter.voter_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {voter.voter_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{voter.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {maskAadhaar(voter.aadhaar_number)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {voter.epic_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {voter.mobile_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            voter.is_verified
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {voter.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <Link
                            to={`/profile/${voter.voter_id}`}
                            className="text-primary-navy hover:text-primary-royal font-medium text-sm"
                          >
                            View
                          </Link>
                          {hasPermission('voters.edit') && (
                            <button
                              onClick={() => setSelectedVoter(voter)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              Edit
                            </button>
                          )}
                          {!hasPermission('voters.edit') && (
                            <span className="text-gray-400 text-xs" title="Permission Denied: Contact District Election Officer">
                              Edit
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedVoter && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Edit Voter</h2>
                <p className="text-sm text-gray-500">Voter ID #{selectedVoter.voter_id}</p>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            {actionError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Mobile Number</label>
                <input
                  type="tel"
                  value={editForm.mobile_number}
                  onChange={(e) => setEditForm({ ...editForm, mobile_number: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Verification Status</label>
                <select
                  value={editForm.is_verified ? 'verified' : 'pending'}
                  onChange={(e) => setEditForm({ ...editForm, is_verified: e.target.value === 'verified' })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/30"
                >
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Gender</label>
                <select
                  value={editForm.gender || ''}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/30"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">PIN Code</label>
                <input
                  type="text"
                  value={editForm.pin_code || ''}
                  onChange={(e) => setEditForm({ ...editForm, pin_code: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/30"
                />
              </div>
              <div className="md:col-span-2 grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">House Number</label>
                  <input
                    type="text"
                    value={editForm.house_number || ''}
                    onChange={(e) => setEditForm({ ...editForm, house_number: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Street</label>
                  <input
                    type="text"
                    value={editForm.street || ''}
                    onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">City / Village</label>
                  <input
                    type="text"
                    value={editForm.village_city || ''}
                    onChange={(e) => setEditForm({ ...editForm, village_city: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">District</label>
                  <input
                    type="text"
                    value={editForm.district || ''}
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">State</label>
                  <input
                    type="text"
                    value={editForm.state || ''}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/30"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateVoter}
                className="px-6 py-2 rounded-lg bg-primary-navy text-white hover:bg-primary-royal disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


