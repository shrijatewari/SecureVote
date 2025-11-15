import { useState, useEffect } from 'react';
import { otpService } from '../services/api';

interface OTPVerificationProps {
  identifier: string;
  otpType: 'aadhaar' | 'email' | 'mobile';
  onVerify: (verified: boolean) => void;
  onCancel: () => void;
}

export default function OTPVerification({ identifier, otpType, onVerify, onCancel }: OTPVerificationProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(timer - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const [testOTP, setTestOTP] = useState<string>('');

  const sendOTP = async () => {
    setSending(true);
    setError('');
    try {
      let response;
      if (otpType === 'aadhaar') {
        response = await otpService.sendAadhaar(identifier);
      } else if (otpType === 'email') {
        response = await otpService.sendEmail(identifier);
      } else {
        response = await otpService.sendMobile(identifier);
      }
      
      // Store test OTP for display
      const otpCode = response.data?.data?.otp_code || response.data?.otp_code;
      if (otpCode) {
        setTestOTP(otpCode);
      }
      
      setOtpSent(true);
      setTimer(60); // 60 second timer
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setSending(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await otpService.verify(identifier, otpType, otp);
      if (response.data.success) {
        onVerify(true);
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const getIdentifierLabel = () => {
    if (otpType === 'aadhaar') {
      return `Aadhaar: XXXX-XXXX-${identifier.substring(8)}`;
    } else if (otpType === 'email') {
      return `Email: ${identifier}`;
    } else {
      return `Mobile: +91 ${identifier}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">OTP Verification</h2>
        <p className="text-gray-600 mb-6">{getIdentifierLabel()}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {!otpSent ? (
          <div className="space-y-4">
            <p className="text-gray-600">We'll send a verification code to your {otpType}.</p>
            <button
              onClick={sendOTP}
              className="btn-primary w-full"
              disabled={sending}
            >
              {sending ? 'Sending...' : `Send OTP to ${otpType}`}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Test OTP Display */}
            {testOTP && (
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-4 text-white text-center">
                <p className="text-sm font-medium mb-2">🧪 TEST MODE - Use this OTP:</p>
                <p className="text-3xl font-bold tracking-widest font-mono">{testOTP}</p>
                <p className="text-xs mt-2 opacity-90">In production, this would be sent to your {otpType}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter 6-digit OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
              {testOTP && (
                <button
                  onClick={() => setOtp(testOTP)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Click to auto-fill test OTP
                </button>
              )}
            </div>

            {timer > 0 && (
              <p className="text-sm text-gray-600 text-center">
                Resend OTP in {timer} seconds
              </p>
            )}

            {timer === 0 && (
              <button
                onClick={sendOTP}
                className="text-primary-navy hover:underline text-sm w-full text-center"
              >
                Resend OTP
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={verifyOTP}
                className="btn-primary flex-1"
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

