import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { profileService } from '../services/api';
import BiometricCapture from '../components/BiometricCapture';
import OTPVerification from '../components/OTPVerification';
import DocumentUpload from '../components/DocumentUpload';
import { biometricService } from '../services/api';
import LanguageSelector from '../components/LanguageSelector';

interface ProfileData {
  name?: string;
  gender?: string;
  dob?: string;
  father_name?: string;
  mother_name?: string;
  guardian_name?: string;
  marital_status?: string;
  spouse_name?: string;
  mobile_number?: string;
  email?: string;
  alternate_mobile?: string;
  house_number?: string;
  street?: string;
  village_city?: string;
  district?: string;
  state?: string;
  pin_code?: string;
  pan_number?: string;
  ration_card_number?: string;
  driving_license_number?: string;
  passport_number?: string;
  education_level?: string;
  occupation?: string;
  disability_status?: boolean;
  income_range?: string;
  special_category?: string;
}

export default function UpdateProfile() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('personal');
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState<ProfileData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completion, setCompletion] = useState<any>(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpType, setOtpType] = useState<'mobile' | 'email' | 'aadhaar'>('mobile');
  const [biometricData, setBiometricData] = useState<any>(null);
  const { t } = useTranslation();

  useEffect(() => {
    // Check if user is admin - admins don't have voter profiles
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const role = (user.role || 'citizen').toLowerCase();
        if (role !== 'citizen') {
          // Admin users don't have voter profiles
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Check if user is logged in
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Please log in to access your profile.');
        window.location.href = '/login';
        return;
      }

      // Check if user is admin - skip profile loading for admins
      const userData = localStorage.getItem('user_data');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          const role = (user.role || 'citizen').toLowerCase();
          if (role !== 'citizen') {
            // Admin users don't have voter profiles - redirect to admin dashboard
            navigate('/admin');
            return;
          }
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }

      // Get voter ID from user data
      let voterId = null;
      if (userData) {
        try {
          const user = JSON.parse(userData);
          voterId = user.voter_id || user.id;
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
      
      const [profileRes, completionRes] = await Promise.all([
        voterId ? profileService.getProfile(voterId) : profileService.getProfile(),
        voterId ? profileService.getCompletionStatus(voterId) : profileService.getCompletionStatus()
      ]);
      
      console.log('Profile loaded:', profileRes.data);
      console.log('Completion status:', completionRes.data);
      
      // Handle admin users or users without voter profiles
      if (profileRes.data?.success) {
        if (profileRes.data?.data === null || profileRes.data?.message) {
          // Admin user or no voter profile - redirect to appropriate dashboard
          const userData = localStorage.getItem('user_data');
          if (userData) {
            try {
              const user = JSON.parse(userData);
              const role = (user.role || 'citizen').toLowerCase();
              if (role !== 'citizen') {
                navigate('/admin');
                return;
              }
            } catch (e) {}
          }
          // Citizen without profile - show empty form
          setProfile(null);
          setFormData({});
        } else {
          setProfile(profileRes.data.data);
          setFormData(profileRes.data.data);
        }
      } else {
        console.error('Profile data not found:', profileRes.data);
        const errorMsg = profileRes.data?.error || 'Failed to load profile. Please try logging in again.';
        // Don't show alert for admin users
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            const role = (user.role || 'citizen').toLowerCase();
            if (role !== 'citizen') {
              navigate('/admin');
              return;
            }
          } catch (e) {}
        }
        if (!errorMsg.includes('Admin users') && !errorMsg.includes('No voter profile')) {
          alert(errorMsg);
        }
        if (errorMsg.includes('token') || errorMsg.includes('expired')) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          window.location.href = '/login';
        }
      }
      
      if (completionRes.data?.success && completionRes.data?.data) {
        setCompletion(completionRes.data.data);
      } else if (completionRes.data?.success && completionRes.data?.data === null) {
        // Admin user - set empty completion
        setCompletion({ completionPercentage: 0, completedSections: [] });
      }
    } catch (error: any) {
      console.error('Failed to load profile:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to load profile';
      
      // Check if user is admin - admins don't have voter profiles
      const userData = localStorage.getItem('user_data');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          const role = (user.role || 'citizen').toLowerCase();
          if (role !== 'citizen') {
            // Admin users don't have voter profiles - redirect to admin dashboard
            navigate('/admin');
            return;
          }
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
      
      // Handle token expiration only for actual token errors
      if ((errorMsg.includes('token') || errorMsg.includes('expired') || error.response?.status === 401) && 
          !errorMsg.includes('Voter ID required') && !errorMsg.includes('Profile not found')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        alert('Your session has expired. Please log in again.');
        window.location.href = '/login';
        return;
      }
      
      // Don't show error for admin users trying to access profile
      if (errorMsg.includes('Voter ID required') || errorMsg.includes('Invalid or expired token')) {
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            const role = (user.role || 'citizen').toLowerCase();
            if (role !== 'citizen') {
              navigate('/admin');
              return;
            }
          } catch (e) {}
        }
      }
      
      alert(`Error loading profile: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (section?: string) => {
    if (!profile?.voter_id) {
      alert('Profile not loaded. Please refresh the page.');
      return;
    }

    setSaving(true);
    try {
      console.log('Updating profile:', { voterId: profile.voter_id, formData });
      
      // Pre-process date fields to ensure correct format
      const processedData = { ...formData };
      if (processedData.dob) {
        // Convert date to YYYY-MM-DD format if it's an ISO string
        try {
          const dateValue = processedData.dob;
          if (typeof dateValue === 'string' && dateValue.includes('T')) {
            const dateObj = new Date(dateValue);
            if (!isNaN(dateObj.getTime())) {
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              processedData.dob = `${year}-${month}-${day}`;
              console.log(`Converted DOB from ${dateValue} to ${processedData.dob}`);
            }
          }
        } catch (e) {
          console.warn('Failed to pre-process DOB:', e);
        }
      }
      
      const response = await profileService.updateProfile(profile.voter_id, processedData);
      console.log('Update response:', response);
      
      if (response.data.success) {
        setProfile(response.data.data);
        await loadProfile();
        alert('✅ Profile updated successfully!');
      } else {
        throw new Error(response.data.error || 'Update failed');
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      
      // Handle date format errors with user-friendly message
      const errorResponse = error.response?.data;
      if (errorResponse?.error && (
        errorResponse.error.includes('date') || 
        errorResponse.error.includes('Invalid date format') ||
        errorResponse.error.includes('YYYY-MM-DD')
      )) {
        alert(`⚠️ Date Format Error\n\n${errorResponse.error}\n\n${errorResponse.details || 'Please check your date of birth and ensure it\'s in the correct format (YYYY-MM-DD).'}`);
      } else if (errorResponse?.error) {
        alert(`❌ Error: ${errorResponse.error}\n\n${errorResponse.details || ''}`);
      } else {
        const errorMsg = error.response?.data?.message || error.message || 'Failed to update profile';
        alert(`❌ Error: ${errorMsg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyContact = async (type: 'mobile' | 'email' | 'aadhaar') => {
    setOtpType(type);
    setShowOTPModal(true);
  };

  const handleOTPVerify = async (verified: boolean) => {
    if (!verified) {
      setShowOTPModal(false);
      return;
    }

    if (!profile?.voter_id) {
      alert('Profile not loaded. Please refresh the page.');
      setShowOTPModal(false);
      return;
    }

    try {
      const voterId = profile.voter_id;
      const type = otpType === 'email' ? 'email' : 'mobile';
      
      console.log('Verifying contact:', { voterId, type });
      
      const response = await profileService.verifyContact(voterId, type, true);
      console.log('Verification response:', response);
      
      await loadProfile();
      setShowOTPModal(false);
      alert('Verification successful!');
    } catch (error: any) {
      console.error('Verification error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to update verification status';
      alert(errorMsg);
    }
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage < 50) return 'bg-red-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-navy mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'personal', name: 'Personal Details', icon: '👤' },
    { id: 'contact', name: 'Contact Details', icon: '📞' },
    { id: 'address', name: 'Address Details', icon: '📍' },
    { id: 'identification', name: 'Identification', icon: '🆔' },
    { id: 'demographic', name: 'Demographics', icon: '📊' },
    { id: 'family', name: 'Family & Household', icon: '👨‍👩‍👧‍👦' },
    { id: 'voter', name: 'Voter-Specific', icon: '🗳️' },
    { id: 'documents', name: 'Documents', icon: '📄' },
    { id: 'biometric', name: 'Biometrics', icon: '🔐' },
    { id: 'nri', name: 'NRI Details', icon: '🌍' },
    { id: 'security', name: 'Security Settings', icon: '🔒' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'consent', name: 'Consent & Declarations', icon: '✅' },
    { id: 'review', name: 'Review & Submit', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-gray-light py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Progress Bar */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-heading font-bold text-gray-800 mb-2">Update Profile</h1>
              <p className="text-gray-600">Complete your profile to unlock all features</p>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSelector compact={true} showLabel={false} />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {completion?.completionPercentage || 0}%
                </div>
                <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getCompletionColor(completion?.completionPercentage || 0)} transition-all`}
                    style={{ width: `${completion?.completionPercentage || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Checkpoints */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {Object.entries(completion?.checkpoints || {}).map(([key, value]: [string, any]) => (
              <div
                key={key}
                className={`p-2 rounded-lg border-2 ${
                  value ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 text-sm">
                  <span>{value ? '✅' : '❌'}</span>
                  <span className="capitalize">{key.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="md:col-span-1">
            <div className="card sticky top-4">
              <h3 className="font-bold text-gray-800 mb-4">Sections</h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition ${
                      activeSection === section.id
                        ? 'bg-primary-navy text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{section.icon}</span>
                    {section.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            {/* Personal Details Section */}
            {activeSection === 'personal' && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">👤 Personal Details</h2>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                      <select
                        value={formData.gender || ''}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                        className="input-field"
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                      <input
                        type="date"
                        value={formData.dob || ''}
                        onChange={(e) => handleInputChange('dob', e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
                      <select
                        value={formData.marital_status || ''}
                        onChange={(e) => handleInputChange('marital_status', e.target.value)}
                        className="input-field"
                      >
                        <option value="">Select</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Father's Name *</label>
                      <input
                        type="text"
                        value={formData.father_name || ''}
                        onChange={(e) => handleInputChange('father_name', e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mother's Name</label>
                      <input
                        type="text"
                        value={formData.mother_name || ''}
                        onChange={(e) => handleInputChange('mother_name', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Name</label>
                      <input
                        type="text"
                        value={formData.guardian_name || ''}
                        onChange={(e) => handleInputChange('guardian_name', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    {formData.marital_status === 'Married' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Spouse Name</label>
                        <input
                          type="text"
                          value={formData.spouse_name || ''}
                          onChange={(e) => handleInputChange('spouse_name', e.target.value)}
                          className="input-field"
                        />
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleSave('personal')} className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Personal Details'}
                  </button>
                </div>
              </div>
            )}

            {/* Contact Details Section */}
            {activeSection === 'contact' && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">📞 Contact Details</h2>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number *</label>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={formData.mobile_number || ''}
                          onChange={(e) => handleInputChange('mobile_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="input-field flex-1"
                          maxLength={10}
                          required
                        />
                        <button
                          onClick={() => handleVerifyContact('mobile')}
                          className={`px-4 py-2 rounded-lg ${
                            profile?.mobile_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {profile?.mobile_verified ? '✅ Verified' : 'Verify'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email ID *</label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="input-field flex-1"
                          required
                        />
                        <button
                          onClick={() => handleVerifyContact('email')}
                          className={`px-4 py-2 rounded-lg ${
                            profile?.email_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {profile?.email_verified ? '✅ Verified' : 'Verify'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Alternate Mobile</label>
                      <input
                        type="tel"
                        value={formData.alternate_mobile || ''}
                        onChange={(e) => handleInputChange('alternate_mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="input-field"
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <button onClick={() => handleSave('contact')} className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Contact Details'}
                  </button>
                </div>
              </div>
            )}

            {/* Address Details Section */}
            {activeSection === 'address' && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">📍 Address Details</h2>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">House No / Building *</label>
                      <input
                        type="text"
                        value={formData.house_number || ''}
                        onChange={(e) => handleInputChange('house_number', e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Street / Locality *</label>
                      <input
                        type="text"
                        value={formData.street || ''}
                        onChange={(e) => handleInputChange('street', e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Village / Town / City *</label>
                      <input
                        type="text"
                        value={formData.village_city || ''}
                        onChange={(e) => handleInputChange('village_city', e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">District *</label>
                      <input
                        type="text"
                        value={formData.district || ''}
                        onChange={(e) => handleInputChange('district', e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                      <select
                        value={formData.state || ''}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className="input-field"
                        required
                      >
                        <option value="">Select State</option>
                        <option value="Andhra Pradesh">Andhra Pradesh</option>
                        <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                        <option value="Assam">Assam</option>
                        <option value="Bihar">Bihar</option>
                        <option value="Chhattisgarh">Chhattisgarh</option>
                        <option value="Goa">Goa</option>
                        <option value="Gujarat">Gujarat</option>
                        <option value="Haryana">Haryana</option>
                        <option value="Himachal Pradesh">Himachal Pradesh</option>
                        <option value="Jharkhand">Jharkhand</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Kerala">Kerala</option>
                        <option value="Madhya Pradesh">Madhya Pradesh</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Manipur">Manipur</option>
                        <option value="Meghalaya">Meghalaya</option>
                        <option value="Mizoram">Mizoram</option>
                        <option value="Nagaland">Nagaland</option>
                        <option value="Odisha">Odisha</option>
                        <option value="Punjab">Punjab</option>
                        <option value="Rajasthan">Rajasthan</option>
                        <option value="Sikkim">Sikkim</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Telangana">Telangana</option>
                        <option value="Tripura">Tripura</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="Uttarakhand">Uttarakhand</option>
                        <option value="West Bengal">West Bengal</option>
                        <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                        <option value="Chandigarh">Chandigarh</option>
                        <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                        <option value="Ladakh">Ladakh</option>
                        <option value="Lakshadweep">Lakshadweep</option>
                        <option value="Puducherry">Puducherry</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">PIN Code *</label>
                      <input
                        type="text"
                        value={formData.pin_code || ''}
                        onChange={(e) => handleInputChange('pin_code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="input-field"
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Note:</strong> Address proof document upload is mandatory for verification.
                    </p>
                  </div>
                  <button onClick={() => handleSave('address')} className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Address Details'}
                  </button>
                </div>
              </div>
            )}

            {/* Identification Section */}
            {activeSection === 'identification' && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">🆔 Identification Details</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <p className="text-sm text-gray-700">
                      <strong>Aadhaar Number:</strong> {profile?.aadhaar_number ? 
                        `${profile.aadhaar_number.slice(0, 4)}****${profile.aadhaar_number.slice(-4)}` : 
                        'Not provided'}
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number</label>
                      <input
                        type="text"
                        value={formData.pan_number || ''}
                        onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
                        className="input-field"
                        maxLength={10}
                        placeholder="ABCDE1234F"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Driving License</label>
                      <input
                        type="text"
                        value={formData.driving_license_number || ''}
                        onChange={(e) => handleInputChange('driving_license_number', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Passport Number</label>
                      <input
                        type="text"
                        value={formData.passport_number || ''}
                        onChange={(e) => handleInputChange('passport_number', e.target.value.toUpperCase())}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ration Card Number</label>
                      <input
                        type="text"
                        value={formData.ration_card_number || ''}
                        onChange={(e) => handleInputChange('ration_card_number', e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <button
                      onClick={async () => {
                        try {
                          setSaving(true);
                          const response = await profileService.importFromDigiLocker(
                            profile.voter_id,
                            profile.aadhaar_number
                          );
                          if (response.data?.success) {
                            const fieldsUpdated = response.data.data?.fields_updated || 0;
                            alert(`✅ Successfully imported ${fieldsUpdated} fields from DigiLocker!\n\nYour profile has been updated with:\n- Personal details\n- Identification documents\n- Address information\n- Education & occupation`);
                            await loadProfile();
                          } else {
                            alert('Data imported from DigiLocker (mock)');
                            await loadProfile();
                          }
                        } catch (error: any) {
                          console.error('DigiLocker import error:', error);
                          alert(`Failed to import from DigiLocker: ${error.response?.data?.error || error.message || 'Unknown error'}`);
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className="text-green-700 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={saving}
                    >
                      {saving ? '⏳ Importing...' : '📥 Import from DigiLocker (Mock)'}
                    </button>
                    <p className="text-xs text-gray-600 mt-2">
                      Click to import mock data from DigiLocker including personal details, identification documents, and address information.
                    </p>
                  </div>
                  <button onClick={() => handleSave('identification')} className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Identification Details'}
                  </button>
                </div>
              </div>
            )}

            {/* Demographic Section */}
            {activeSection === 'demographic' && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 Demographic & Social Details</h2>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Education Level *</label>
                      <select
                        value={formData.education_level || ''}
                        onChange={(e) => handleInputChange('education_level', e.target.value)}
                        className="input-field"
                        required
                      >
                        <option value="">Select</option>
                        <option value="Illiterate">Illiterate</option>
                        <option value="Primary">Primary</option>
                        <option value="Middle">Middle</option>
                        <option value="High School">High School</option>
                        <option value="Higher Secondary">Higher Secondary</option>
                        <option value="Graduate">Graduate</option>
                        <option value="Post Graduate">Post Graduate</option>
                        <option value="Professional">Professional</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Occupation *</label>
                      <input
                        type="text"
                        value={formData.occupation || ''}
                        onChange={(e) => handleInputChange('occupation', e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Income Range</label>
                      <select
                        value={formData.income_range || ''}
                        onChange={(e) => handleInputChange('income_range', e.target.value)}
                        className="input-field"
                      >
                        <option value="">Select</option>
                        <option value="Below 1 Lakh">Below ₹1 Lakh</option>
                        <option value="1-3 Lakhs">₹1-3 Lakhs</option>
                        <option value="3-5 Lakhs">₹3-5 Lakhs</option>
                        <option value="5-10 Lakhs">₹5-10 Lakhs</option>
                        <option value="Above 10 Lakhs">Above ₹10 Lakhs</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Special Category</label>
                      <select
                        value={formData.special_category || ''}
                        onChange={(e) => handleInputChange('special_category', e.target.value)}
                        className="input-field"
                      >
                        <option value="">None</option>
                        <option value="Senior Citizen">Senior Citizen</option>
                        <option value="Armed Forces">Armed Forces</option>
                        <option value="Student">Student</option>
                        <option value="NRI">NRI</option>
                        <option value="Migrant Worker">Migrant Worker</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.disability_status || false}
                          onChange={(e) => handleInputChange('disability_status', e.target.checked)}
                          className="w-5 h-5"
                        />
                        <span className="text-sm font-medium text-gray-700">I have a disability (certificate upload required)</span>
                      </label>
                    </div>
                  </div>
                  <button onClick={() => handleSave('demographic')} className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Demographic Details'}
                  </button>
                </div>
              </div>
            )}

            {/* Family Linking Section */}
            {activeSection === 'family' && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">👨‍👩‍👧‍👦 Family Linking</h2>
                <FamilyLinkingSection voterId={profile?.voter_id} />
              </div>
            )}

            {/* Documents Section */}
            {activeSection === 'documents' && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">📄 Document Upload</h2>
                <p className="text-gray-600 mb-4">Upload required documents for verification</p>
                {profile?.voter_id ? (
                  <DocumentUpload
                    voterId={profile.voter_id}
                    onUploadComplete={loadProfile}
                  />
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-gray-700">Please complete personal details first.</p>
                  </div>
                )}
              </div>
            )}

            {/* Biometric Section */}
            {activeSection === 'biometric' && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">🔐 Biometric Details</h2>
                {profile?.voter_id ? (
                  <BiometricCapture
                    voterId={profile.voter_id}
                    onCapture={async (faceEmbedding, faceHash, fingerprintTemplate, fingerprintHash, livenessPassed) => {
                      try {
                        setSaving(true);
                        // Register face biometric
                        await biometricService.registerFace(profile.voter_id, faceEmbedding, faceHash, livenessPassed);
                        // Register fingerprint biometric
                        await biometricService.registerFingerprint(profile.voter_id, fingerprintTemplate, fingerprintHash);
                        alert('Biometric data registered successfully!');
                        setBiometricData({ faceEmbedding, faceHash, fingerprintTemplate, fingerprintHash, livenessPassed });
                        await loadProfile();
                      } catch (error: any) {
                        alert(error.response?.data?.error || error.message || 'Failed to register biometric data');
                      } finally {
                        setSaving(false);
                      }
                    }}
                    onCancel={() => {}}
                    mode="register"
                  />
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    Please complete your profile first to register biometrics.
                  </div>
                )}
              </div>
            )}

            {/* Voter-Specific Section */}
            {activeSection === 'voter' && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">🗳️ Voter-Specific Information</h2>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="first_time_voter" checked={(formData as any).is_first_time_voter || false} onChange={(e) => handleInputChange('is_first_time_voter', e.target.checked)} className="w-5 h-5" />
                      <label htmlFor="first_time_voter" className="text-sm font-medium text-gray-700">First-time Voter</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="migrant_worker" checked={(formData as any).is_migrant_worker || false} onChange={(e) => handleInputChange('is_migrant_worker', e.target.checked)} className="w-5 h-5" />
                      <label htmlFor="migrant_worker" className="text-sm font-medium text-gray-700">Migrant Worker</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="needs_disability_assistance" checked={(formData as any).needs_disability_assistance || false} onChange={(e) => handleInputChange('needs_disability_assistance', e.target.checked)} className="w-5 h-5" />
                      <label htmlFor="needs_disability_assistance" className="text-sm font-medium text-gray-700">Needs Disability Assistance</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="needs_braille_ballot" checked={(formData as any).needs_braille_ballot || false} onChange={(e) => handleInputChange('needs_braille_ballot', e.target.checked)} className="w-5 h-5" />
                      <label htmlFor="needs_braille_ballot" className="text-sm font-medium text-gray-700">Needs Braille Ballot</label>
                    </div>
                  </div>
                  <button onClick={() => handleSave('voter')} className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Voter Details'}</button>
                </div>
              </div>
            )}

            {/* NRI Section */}
            {activeSection === 'nri' && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">🌍 NRI-Specific Details</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <input type="checkbox" id="is_nri" checked={(formData as any).is_nri || false} onChange={(e) => handleInputChange('is_nri', e.target.checked)} className="w-5 h-5" />
                    <label htmlFor="is_nri" className="text-sm font-medium text-gray-700">I am an NRI Voter</label>
                  </div>
                  {(formData as any).is_nri && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-gray-700 mb-2">Country of Residence</label><input type="text" value={(formData as any).country_of_residence || ''} onChange={(e) => handleInputChange('country_of_residence', e.target.value)} className="input-field" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-2">Embassy/Consulate Jurisdiction</label><input type="text" value={(formData as any).embassy_jurisdiction || ''} onChange={(e) => handleInputChange('embassy_jurisdiction', e.target.value)} className="input-field" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-2">Visa Type</label><input type="text" value={(formData as any).visa_type || ''} onChange={(e) => handleInputChange('visa_type', e.target.value)} className="input-field" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-2">OCI/PIO Status</label><input type="text" value={(formData as any).oci_pio_status || ''} onChange={(e) => handleInputChange('oci_pio_status', e.target.value)} className="input-field" /></div>
                      <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-2">Foreign Address</label><textarea value={(formData as any).foreign_address || ''} onChange={(e) => handleInputChange('foreign_address', e.target.value)} className="input-field" rows={3} /></div>
                    </div>
                  )}
                  <button onClick={() => handleSave('nri')} className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save NRI Details'}</button>
                </div>
              </div>
            )}

            {/* Security Settings Section */}
            {activeSection === 'security' && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">🔒 Security & Authentication Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="two_factor" checked={(formData as any).two_factor_enabled || false} onChange={(e) => handleInputChange('two_factor_enabled', e.target.checked)} className="w-5 h-5" />
                    <label htmlFor="two_factor" className="text-sm font-medium text-gray-700">Enable Two-Factor Authentication</label>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Security Question 1</label><input type="text" value={(formData as any).security_question_1 || ''} onChange={(e) => handleInputChange('security_question_1', e.target.value)} className="input-field" placeholder="e.g., What was your first pet's name?" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Answer 1</label><input type="password" value={(formData as any).security_answer_1 || ''} onChange={(e) => handleInputChange('security_answer_1', e.target.value)} className="input-field" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Security Question 2</label><input type="text" value={(formData as any).security_question_2 || ''} onChange={(e) => handleInputChange('security_question_2', e.target.value)} className="input-field" placeholder="e.g., What city were you born in?" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Answer 2</label><input type="password" value={(formData as any).security_answer_2 || ''} onChange={(e) => handleInputChange('security_answer_2', e.target.value)} className="input-field" /></div>
                  </div>
                  <button onClick={() => handleSave('security')} className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Security Settings'}</button>
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">🔔 Communication & Notifications Settings</h2>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><label className="text-sm font-medium text-gray-700">Receive SMS Updates</label><input type="checkbox" checked={(formData as any).receive_sms_updates !== false} onChange={(e) => handleInputChange('receive_sms_updates', e.target.checked)} className="w-5 h-5" /></div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><label className="text-sm font-medium text-gray-700">Receive Email Updates</label><input type="checkbox" checked={(formData as any).receive_email_updates !== false} onChange={(e) => handleInputChange('receive_email_updates', e.target.checked)} className="w-5 h-5" /></div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><label className="text-sm font-medium text-gray-700">Election Reminders</label><input type="checkbox" checked={(formData as any).receive_election_reminders !== false} onChange={(e) => handleInputChange('receive_election_reminders', e.target.checked)} className="w-5 h-5" /></div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><label className="text-sm font-medium text-gray-700">Booth Change Alerts</label><input type="checkbox" checked={(formData as any).receive_booth_change_alerts !== false} onChange={(e) => handleInputChange('receive_booth_change_alerts', e.target.checked)} className="w-5 h-5" /></div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><label className="text-sm font-medium text-gray-700">Grievance Status Alerts</label><input type="checkbox" checked={(formData as any).receive_grievance_alerts !== false} onChange={(e) => handleInputChange('receive_grievance_alerts', e.target.checked)} className="w-5 h-5" /></div>
                  </div>
                  <button onClick={() => handleSave('notifications')} className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Notification Settings'}</button>
                </div>
              </div>
            )}

            {/* Consent & Declarations Section */}
            {activeSection === 'consent' && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">✅ Digital Consent & Declarations</h2>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg"><input type="checkbox" id="consent_citizen" checked={(formData as any).consent_indian_citizen || false} onChange={(e) => handleInputChange('consent_indian_citizen', e.target.checked)} className="w-5 h-5 mt-1" required /><label htmlFor="consent_citizen" className="text-sm font-medium text-gray-700">I confirm I am an Indian citizen *</label></div>
                    <div className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg"><input type="checkbox" id="consent_details" checked={(formData as any).consent_details_correct || false} onChange={(e) => handleInputChange('consent_details_correct', e.target.checked)} className="w-5 h-5 mt-1" required /><label htmlFor="consent_details" className="text-sm font-medium text-gray-700">I confirm all details are correct *</label></div>
                    <div className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg"><input type="checkbox" id="consent_biometric" checked={(formData as any).consent_biometric_verification || false} onChange={(e) => handleInputChange('consent_biometric_verification', e.target.checked)} className="w-5 h-5 mt-1" /><label htmlFor="consent_biometric" className="text-sm font-medium text-gray-700">I allow biometric verification (recommended)</label></div>
                    <div className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg"><input type="checkbox" id="consent_residency" checked={(formData as any).consent_residency_confirmed || false} onChange={(e) => handleInputChange('consent_residency_confirmed', e.target.checked)} className="w-5 h-5 mt-1" required /><label htmlFor="consent_residency" className="text-sm font-medium text-gray-700">I confirm residency at given address *</label></div>
                    <div className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg"><input type="checkbox" id="consent_eci" checked={(formData as any).consent_eci_matching || false} onChange={(e) => handleInputChange('consent_eci_matching', e.target.checked)} className="w-5 h-5 mt-1" required /><label htmlFor="consent_eci" className="text-sm font-medium text-gray-700">I authorize ECI to match my information with official registries *</label></div>
                  </div>
                  <button onClick={() => { handleInputChange('consent_date', new Date().toISOString()); handleSave('consent'); }} className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Consents'}</button>
                </div>
              </div>
            )}

            {/* Review & Submit Section */}
            {activeSection === 'review' && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Review & Submit</h2>
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2"><strong>Profile Completion:</strong> {completion?.completionPercentage || 0}%</p>
                    <p className="text-sm text-gray-600">Please review all sections before final submission. Once submitted, your profile will be sent for verification.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-800">Verification Checkpoints:</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(completion?.checkpoints || {}).map(([key, value]: [string, any]) => (
                        <div key={key} className={`p-2 rounded ${value ? 'bg-green-50' : 'bg-red-50'}`}>
                          <span className="text-sm">{value ? '✅' : '❌'} {key.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={async () => { if (confirm('Submit profile for verification? This action cannot be undone.')) { setSaving(true); try { await handleSave('review'); alert('Profile submitted successfully! It will be reviewed by officials.'); } catch (error) { alert('Failed to submit profile'); } finally { setSaving(false); } } }} className="btn-primary flex-1" disabled={saving || (completion?.completionPercentage || 0) < 80}>{saving ? 'Submitting...' : 'Submit for Verification'}</button>
                    <button onClick={() => setActiveSection('personal')} className="btn-secondary">Edit Profile</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOTPModal && (
        <OTPVerification
          otpType={otpType === 'mobile' ? 'mobile' : otpType === 'email' ? 'email' : 'aadhaar'}
          identifier={otpType === 'email' ? (formData.email || '') : (formData.mobile_number || '')}
          onVerify={handleOTPVerify}
          onCancel={() => setShowOTPModal(false)}
        />
      )}
    </div>
  );
}

// Family Linking Component
function FamilyLinkingSection({ voterId }: { voterId?: number }) {
  const [relations, setRelations] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    relation_type: '',
    related_aadhaar: '',
    related_name: ''
  });

  useEffect(() => {
    if (voterId) {
      loadRelations();
    }
  }, [voterId]);

  const loadRelations = async () => {
    try {
      const response = await profileService.getFamilyRelations(voterId);
      setRelations(response.data.data);
    } catch (error) {
      console.error('Failed to load relations:', error);
    }
  };

  const handleAdd = async () => {
    try {
      await profileService.addFamilyRelation(voterId!, formData);
      await loadRelations();
      setShowAddForm(false);
      setFormData({ relation_type: '', related_aadhaar: '', related_name: '' });
      alert('Family relation added successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add relation');
    }
  };

  const handleRemove = async (relationId: number) => {
    if (confirm('Remove this family relation?')) {
      try {
        await profileService.removeFamilyRelation(relationId);
        await loadRelations();
        alert('Relation removed successfully!');
      } catch (error) {
        alert('Failed to remove relation');
      }
    }
  };

  return (
    <div>
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="btn-primary mb-4"
      >
        + Add Family Member
      </button>

      {showAddForm && (
        <div className="p-4 bg-gray-50 rounded-lg mb-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Relation Type</label>
              <select
                value={formData.relation_type}
                onChange={(e) => setFormData({ ...formData, relation_type: e.target.value })}
                className="input-field"
              >
                <option value="">Select</option>
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="spouse">Spouse</option>
                <option value="son">Son</option>
                <option value="daughter">Daughter</option>
                <option value="brother">Brother</option>
                <option value="sister">Sister</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Number (Optional)</label>
              <input
                type="text"
                value={formData.related_aadhaar}
                onChange={(e) => setFormData({ ...formData, related_aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                className="input-field"
                maxLength={12}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={formData.related_name}
                onChange={(e) => setFormData({ ...formData, related_name: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} className="btn-primary">Add</button>
              <button onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {relations.map((rel) => (
          <div key={rel.relation_id} className="p-4 border-2 border-gray-200 rounded-lg flex justify-between items-center">
            <div>
              <p className="font-semibold capitalize">{rel.relation_type}</p>
              <p className="text-sm text-gray-600">{rel.related_name || rel.related_voter_name || 'N/A'}</p>
              {rel.related_aadhaar && (
                <p className="text-xs text-gray-500">
                  Aadhaar: {rel.related_aadhaar.slice(0, 4)}****{rel.related_aadhaar.slice(-4)}
                </p>
              )}
            </div>
            <button
              onClick={() => handleRemove(rel.relation_id)}
              className="text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ))}
        {relations.length === 0 && (
          <p className="text-gray-500 text-center py-8">No family relations added yet</p>
        )}
      </div>
    </div>
  );
}


