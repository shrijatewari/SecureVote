import { useState } from 'react';
import { endToEndVerificationService } from '../services/api';

export default function EndToEndVerificationPage() {
  const [voteId, setVoteId] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [verification, setVerification] = useState<any>(null);
  const [reference, setReference] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateReference = async () => {
    if (!voteId) {
      setError('Please enter a vote ID');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await endToEndVerificationService.generateVoteReference(parseInt(voteId));
      if (result.data?.success && result.data?.data) {
        setReference(result.data.data);
        setError('');
      } else if (result.data) {
        setReference(result.data);
        setError('');
      } else {
        setError('Failed to generate reference. Please check if the vote ID exists.');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to generate reference';
      setError(errorMsg);
      console.error('Generate reference error:', err);
    } finally {
      setLoading(false);
    }
  };

  const verifyReference = async () => {
    if (!referenceCode) {
      setError('Please enter a reference code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await endToEndVerificationService.verifyVoteReference(referenceCode);
      if (result.data?.success && result.data?.data) {
        setVerification(result.data.data);
        setError('');
      } else if (result.data) {
        setVerification(result.data);
        setError('');
      } else {
        setError('Failed to verify reference. Please check your reference code.');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to verify reference';
      setError(errorMsg);
      console.error('Verify reference error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">End-to-End Vote Verification</h1>
          <p className="text-gray-600 mb-8">
            Verify that your vote was recorded correctly without revealing your choice.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Generate Reference */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Generate Vote Reference</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vote ID</label>
                <input
                  type="number"
                  value={voteId}
                  onChange={(e) => setVoteId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter your vote ID"
                />
              </div>
              <button
                onClick={generateReference}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Reference'}
              </button>
              {reference && (
                <div className="bg-white border border-blue-300 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Reference Code:</p>
                  <p className="text-lg font-mono font-bold text-blue-600 mb-2">{reference.reference_code}</p>
                  <p className="text-sm text-gray-600">{reference.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Verify Reference */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Verify Vote Reference</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Code</label>
                <input
                  type="text"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono"
                  placeholder="Enter reference code"
                />
              </div>
              <button
                onClick={verifyReference}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Reference'}
              </button>
              {verification && (
                <div className={`border rounded-lg p-4 ${
                  verification.valid ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                }`}>
                  <p className={`text-lg font-semibold mb-2 ${verification.valid ? 'text-green-600' : 'text-red-600'}`}>
                    {verification.valid ? '✅ Verified' : '❌ Verification Failed'}
                  </p>
                  <p className="text-sm text-gray-600">{verification.message}</p>
                  {verification.election_id && (
                    <p className="text-sm text-gray-600 mt-2">Election ID: {verification.election_id}</p>
                  )}
                  {verification.timestamp && (
                    <p className="text-sm text-gray-600">Timestamp: {verification.timestamp}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

