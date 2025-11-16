import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BiometricCapture from '../components/BiometricCapture';
import OTPVerification from '../components/OTPVerification';
import { voterService, biometricService, otpService } from '../services/api';
import LanguageSelector from '../components/LanguageSelector';

export default function VoterRegistration() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  // Ensure i18n is ready
  useEffect(() => {
    if (!i18n.isInitialized) {
      i18n.init();
    }
  }, [i18n]);
  const [step, setStep] = useState<'details' | 'email-otp' | 'mobile-otp' | 'biometric'>('details');
  const [showBiometric, setShowBiometric] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    aadhaar_number: '',
    email: '',
    mobile_number: '',
    password: '',
    confirmPassword: '',
    father_name: '',
    mother_name: '',
    gender: 'Male',
    house_number: '',
    street: '',
    village_city: '',
    district: '',
    state: '',
    pin_code: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailOTPSent, setEmailOTPSent] = useState(false);
  const [mobileOTPSent, setMobileOTPSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailOTPCode, setEmailOTPCode] = useState<string>('');
  const [mobileOTPCode, setMobileOTPCode] = useState<string>('');
  const [emailOTPInput, setEmailOTPInput] = useState<string>('');
  const [mobileOTPInput, setMobileOTPInput] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.name || formData.name.trim().length < 3) {
      setError('Full name is required (minimum 3 characters)');
      return false;
    }

    if (!formData.dob) {
      setError('Date of birth is required');
      return false;
    } else {
      const dobDate = new Date(formData.dob);
      if (Number.isNaN(dobDate.getTime())) {
        setError('Please enter a valid date of birth');
        return false;
      }
      const today = new Date();
      if (dobDate > today) {
        setError('Date of birth cannot be in the future');
        return false;
      }
      let age = today.getFullYear() - dobDate.getFullYear();
      const hasBirthdayPassed =
        today.getMonth() > dobDate.getMonth() ||
        (today.getMonth() === dobDate.getMonth() && today.getDate() >= dobDate.getDate());
      if (!hasBirthdayPassed) {
        age -= 1;
      }
      if (age < 18) {
        setError('You must be at least 18 years old to register to vote');
        return false;
      }
    }

    if (!formData.aadhaar_number || !/^\d{12}$/.test(formData.aadhaar_number)) {
      setError('Valid 12-digit Aadhaar number is required');
      return false;
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Valid email address is required');
      return false;
    }

    if (!formData.mobile_number || !/^[6-9]\d{9}$/.test(formData.mobile_number)) {
      setError('Valid 10-digit mobile number is required (must start with 6-9)');
      return false;
    }

    if (!formData.father_name || formData.father_name.trim().length < 3) {
      setError("Father's name is required (minimum 3 characters)");
      return false;
    }

    if (!formData.gender) {
      setError('Gender is required');
      return false;
    }

    if (!formData.house_number || formData.house_number.trim().length < 1) {
      setError('House/Building number is required');
      return false;
    }

    if (!formData.street || formData.street.trim().length < 3) {
      setError('Street/Area is required (minimum 3 characters)');
      return false;
    }

    if (!formData.village_city || formData.village_city.trim().length < 2) {
      setError('Village/City is required (minimum 2 characters)');
      return false;
    }

    if (!formData.district || formData.district.trim().length < 2) {
      setError('District is required (minimum 2 characters)');
      return false;
    }

    if (!formData.state || formData.state.trim().length < 2) {
      setError('State is required (minimum 2 characters)');
      return false;
    }

    if (!formData.pin_code || !/^\d{6}$/.test(formData.pin_code)) {
      setError('Valid 6-digit PIN code is required');
      return false;
    }

    // Password validation
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (!/(?=.*[a-z])/.test(formData.password)) {
      setError('Password must contain at least one lowercase letter');
      return false;
    }

    if (!/(?=.*[A-Z])/.test(formData.password)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }

    if (!/(?=.*\d)/.test(formData.password)) {
      setError('Password must contain at least one number');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSendEmailOTP = async () => {
    setError('');
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Valid email address is required');
      return;
    }

    try {
      setLoading(true);
      const response = await otpService.sendEmail(formData.email);
      const otpCode = response.data?.data?.otp_code || response.data?.otp_code;
      if (otpCode) {
        setEmailOTPCode(otpCode);
        setEmailOTPSent(true);
      } else {
        throw new Error('OTP code not received from server');
      }
    } catch (err: any) {
      console.error('Email OTP error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to send email OTP';
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Network error: Please check your internet connection and ensure the backend server is running.');
      } else {
        setError(`Failed to send email OTP: ${errorMsg}`);
      }
      setEmailOTPSent(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOTP = async (otp: string) => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await otpService.verify(formData.email, 'email', otp);
      if (response.data?.success || response.data?.data?.verified) {
        setEmailVerified(true);
        setStep('mobile-otp');
        // Auto-send mobile OTP
        setTimeout(() => handleSendMobileOTP(), 500);
      } else {
        setError('Invalid OTP. Please check and try again.');
      }
    } catch (err: any) {
      console.error('Email OTP verification error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Invalid OTP. Please try again.';
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Network error: Please check your internet connection and ensure the backend server is running.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMobileOTP = async () => {
    setError('');
    if (!formData.mobile_number || !/^[6-9]\d{9}$/.test(formData.mobile_number)) {
      setError('Valid 10-digit mobile number is required');
      return;
    }

    try {
      setLoading(true);
      const response = await otpService.sendMobile(formData.mobile_number);
      const otpCode = response.data?.data?.otp_code || response.data?.otp_code;
      if (otpCode) {
        setMobileOTPCode(otpCode);
        setMobileOTPSent(true);
      } else {
        throw new Error('OTP code not received from server');
      }
    } catch (err: any) {
      console.error('Mobile OTP error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to send mobile OTP';
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Network error: Please check your internet connection and ensure the backend server is running.');
      } else {
        setError(`Failed to send mobile OTP: ${errorMsg}`);
      }
      setMobileOTPSent(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMobileOTP = async (otp: string) => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await otpService.verify(formData.mobile_number, 'mobile', otp);
      if (response.data?.success || response.data?.data?.verified) {
        setMobileVerified(true);
        // Move to biometric step after successful mobile verification
        setStep('biometric');
        setShowBiometric(true);
      } else {
        setError('Invalid OTP. Please check and try again.');
      }
    } catch (err: any) {
      console.error('Mobile OTP verification error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Invalid OTP. Please try again.';
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Network error: Please check your internet connection and ensure the backend server is running.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    // Start with email OTP verification
    setStep('email-otp');
    handleSendEmailOTP();
  };

  const handleBiometricCapture = async (
    faceEmbedding: number[],
    faceHash: string,
    fingerprintTemplate: number[],
    fingerprintHash: string,
    livenessPassed: boolean
  ) => {
    setLoading(true);
    setError('');

    try {
      console.log('Starting registration with biometrics...');
      console.log('Email verified:', emailVerified, 'Mobile verified:', mobileVerified);
      
      // Create voter with all details (including verified status)
      console.log('Creating voter record with all details...');
      const voterResponse = await voterService.create({
        name: formData.name.trim(),
        dob: formData.dob,
        aadhaar_number: formData.aadhaar_number,
        email: formData.email.toLowerCase().trim(),
        mobile_number: formData.mobile_number,
        father_name: formData.father_name.trim(),
        mother_name: formData.mother_name?.trim() || null,
        gender: formData.gender,
        house_number: formData.house_number.trim(),
        street: formData.street.trim(),
        village_city: formData.village_city.trim(),
        district: formData.district.trim(),
        state: formData.state.trim(),
        pin_code: formData.pin_code,
        email_verified: emailVerified,
        mobile_verified: mobileVerified,
        is_verified: false,
      });

      const voterId = voterResponse.data.data.voter_id;
      console.log('✅ Voter created with ID:', voterId);

      // Register face biometric
      console.log('🔐 Registering face biometric...');
      try {
        const faceResult = await biometricService.registerFace(voterId, faceEmbedding, faceHash, livenessPassed);
        console.log('✅ Face registered:', faceResult.data);
      } catch (faceErr: any) {
        console.error('Face registration error:', faceErr);
        // Check if it's a duplicate biometric error
        if (faceErr.response?.data?.error?.includes('DUPLICATE') || faceErr.message?.includes('DUPLICATE')) {
          throw new Error(`Face biometric already exists: ${faceErr.response?.data?.error || faceErr.message}`);
        }
        throw faceErr;
      }

      // Register fingerprint biometric
      console.log('🔐 Registering fingerprint biometric...');
      try {
        const fingerprintResult = await biometricService.registerFingerprint(voterId, fingerprintTemplate, fingerprintHash);
        console.log('✅ Fingerprint registered:', fingerprintResult.data);
      } catch (fingerprintErr: any) {
        console.error('Fingerprint registration error:', fingerprintErr);
        // Check if it's a duplicate biometric error
        if (fingerprintErr.response?.data?.error?.includes('DUPLICATE') || fingerprintErr.message?.includes('DUPLICATE')) {
          throw new Error(`Fingerprint biometric already exists: ${fingerprintErr.response?.data?.error || fingerprintErr.message}`);
        }
        throw fingerprintErr;
      }

      setShowBiometric(false);
      setStep('details');
      
      // Success message with all verification details
      const successMessage = `🎉 Registration Successful!\n\n` +
        `Voter ID: ${voterId}\n\n` +
        `Verification Status:\n` +
        `✓ Email: ${emailVerified ? 'Verified' : 'Pending'}\n` +
        `✓ Mobile: ${mobileVerified ? 'Verified' : 'Pending'}\n` +
        `✓ Face Biometric: Registered\n` +
        `✓ Fingerprint Biometric: Registered\n` +
        `✓ Liveness Check: ${livenessPassed ? 'Passed' : 'Not verified'}\n\n` +
        `Your registration is complete! You can now access the dashboard.`;
      
      alert(successMessage);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);
      let errorMessage = 'Registration failed. Please try again.';

      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        errorMessage = 'Network error: Please check your internet connection and ensure the backend server is running.';
      } else if (err.response?.data) {
        if (err.response.data.details && Array.isArray(err.response.data.details)) {
          errorMessage = err.response.data.details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      // Check if it's a duplicate error
      if (errorMessage.includes('DUPLICATE') || errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        errorMessage = `⚠️ ${errorMessage}\n\nThis information or biometric data is already registered in the system. Please contact support if you believe this is an error.`;
      }

      setError(errorMessage);
      setShowBiometric(false);
      setStep('biometric');
    } finally {
      setLoading(false);
    }
  };

  // Biometric capture step (Step 4 - after email and mobile verification)
  if (step === 'biometric' && showBiometric) {
    return (
      <div className="relative">
        <div className="absolute top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Step 4: Biometric Capture</h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-2">
            <p className="text-xs text-green-800">
              ✓ Step 1: Personal Details - Completed<br />
              ✓ Step 2: Email Verification - Completed<br />
              ✓ Step 3: Mobile Verification - Completed<br />
              ⏳ Step 4: Biometric Capture - In Progress
            </p>
          </div>
          <p className="text-xs text-gray-600 mb-2">
            Please capture your face and fingerprint to complete registration.
          </p>
        </div>
        <BiometricCapture
          voterId={undefined} // Will be set after voter creation
          onCapture={handleBiometricCapture}
          onCancel={() => {
            setShowBiometric(false);
            setStep('mobile-otp');
            setError('Biometric capture cancelled. Please complete biometric registration to finish.');
          }}
          mode="register"
        />
      </div>
    );
  }

  // Email OTP verification step
  if (step === 'email-otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Step 2: Verify Email Address</h2>
              <span className="text-sm text-gray-500">2/4</span>
            </div>
            <p className="text-gray-600 mb-2">Test OTP for:</p>
            <p className="text-lg font-semibold text-gray-800 mb-4">{formData.email}</p>
            
            {/* Test OTP Display */}
            {emailOTPCode && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 text-white text-center mb-4">
                <p className="text-sm font-medium mb-2">🧪 TEST MODE - Use this OTP:</p>
                <p className="text-4xl font-bold tracking-widest font-mono mb-2">{emailOTPCode}</p>
                <p className="text-xs opacity-90">In production, this would be sent to your email</p>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                ✓ Step 1: Personal Details - Completed<br />
                ⏳ Step 2: Email Verification - In Progress<br />
                ⏸ Step 3: Mobile Verification - Pending<br />
                ⏸ Step 4: Biometric Capture - Pending
              </p>
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          {!emailOTPSent ? (
            <button
              onClick={handleSendEmailOTP}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter 6-digit OTP
                </label>
                <input
                  type="text"
                  value={emailOTPInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setEmailOTPInput(value);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
                {emailOTPCode && (
                  <button
                    onClick={() => setEmailOTPInput(emailOTPCode)}
                    className="mt-2 w-full px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg font-medium transition-colors border border-green-300"
                  >
                    🔄 Auto-fill OTP: {emailOTPCode}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('details');
                    setError('');
                    setEmailOTPSent(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (emailOTPInput) {
                      handleVerifyEmailOTP(emailOTPInput);
                    }
                  }}
                  disabled={loading || emailOTPInput.length !== 6}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              setStep('details');
              setError('');
              setEmailOTPSent(false);
            }}
            className="mt-4 text-blue-600 hover:text-blue-800 font-medium w-full text-center"
          >
            ← Back to registration form
          </button>
        </div>
      </div>
    );
  }

  // Mobile OTP verification step
  if (step === 'mobile-otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Step 3: Verify Mobile Number</h2>
              <span className="text-sm text-gray-500">3/4</span>
            </div>
            <p className="text-gray-600 mb-2">Test OTP for:</p>
            <p className="text-lg font-semibold text-gray-800 mb-4">+91 {formData.mobile_number}</p>
            
            {/* Test OTP Display */}
            {mobileOTPCode && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 text-white text-center mb-4">
                <p className="text-sm font-medium mb-2">🧪 TEST MODE - Use this OTP:</p>
                <p className="text-4xl font-bold tracking-widest font-mono mb-2">{mobileOTPCode}</p>
                <p className="text-xs opacity-90">In production, this would be sent via SMS</p>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                ✓ Step 1: Personal Details - Completed<br />
                ✓ Step 2: Email Verification - Completed<br />
                ⏳ Step 3: Mobile Verification - In Progress<br />
                ⏸ Step 4: Biometric Capture - Pending
              </p>
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          {!mobileOTPSent ? (
            <button
              onClick={handleSendMobileOTP}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter 6-digit OTP
                </label>
                <input
                  type="text"
                  value={mobileOTPInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setMobileOTPInput(value);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
                {mobileOTPCode && (
                  <button
                    onClick={() => setMobileOTPInput(mobileOTPCode)}
                    className="mt-2 w-full px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg font-medium transition-colors border border-green-300"
                  >
                    🔄 Auto-fill OTP: {mobileOTPCode}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('email-otp');
                    setError('');
                    setMobileOTPSent(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (mobileOTPInput) {
                      handleVerifyMobileOTP(mobileOTPInput);
                    }
                  }}
                  disabled={loading || mobileOTPInput.length !== 6}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              setStep('email-otp');
              setError('');
              setMobileOTPSent(false);
            }}
            className="mt-4 text-blue-600 hover:text-blue-800 font-medium w-full text-center"
          >
            ← Back to email verification
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-4">
                <h1 className="text-3xl font-bold text-gray-800">{t?.('register') || 'Voter Registration'}</h1>
                <LanguageSelector compact={true} showLabel={false} />
              </div>
              <span className="text-sm text-gray-500">{t?.('step') || 'Step'} 1/4</span>
            </div>
            <p className="text-gray-600 mb-4">Complete your voter registration in 4 simple steps</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                ⏳ Step 1: Personal Details - In Progress<br />
                ⏸ Step 2: Email Verification - Pending<br />
                ⏸ Step 3: Mobile Verification - Pending<br />
                ⏸ Step 4: Biometric Capture - Pending
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Details Section */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Personal Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhaar Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="aadhaar_number"
                    value={formData.aadhaar_number}
                    onChange={handleInputChange}
                    maxLength={12}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="12-digit Aadhaar number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Transgender">Transgender</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Father's Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="father_name"
                    value={formData.father_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter father's name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mother's Name
                  </label>
                  <input
                    type="text"
                    name="mother_name"
                    value={formData.mother_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter mother's name (optional)"
                  />
                </div>
              </div>
            </div>

            {/* Contact Details Section */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Contact Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your.email@example.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">We'll send an OTP to verify this email</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="mobile_number"
                    value={formData.mobile_number}
                    onChange={handleInputChange}
                    maxLength={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10-digit mobile number"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">We'll send an OTP to verify this number</p>
                </div>
              </div>

              {/* Password Section */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Account Security</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Minimum 8 characters"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Must contain uppercase, lowercase, and number
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Re-enter password"
                      required
                    />
                    {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Address Details Section */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Address Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    House/Building Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="house_number"
                    value={formData.house_number}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="House/Building number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street/Area <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Street, Area, Locality"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Village/City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="village_city"
                    value={formData.village_city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Village/Town/City"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="District"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pin_code"
                    value={formData.pin_code}
                    onChange={handleInputChange}
                    maxLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="6-digit PIN code"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Continue to Verification'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
