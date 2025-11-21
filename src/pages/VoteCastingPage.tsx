import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { candidateService, voteService, profileService } from '../services/api';

export default function VoteCastingPage() {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [blockedReason, setBlockedReason] = useState<string>('');

  useEffect(() => {
    if (electionId) {
      checkProfileCompletion();
      fetchCandidates();
    }
  }, [electionId]);

  const checkProfileCompletion = async () => {
    try {
      const userData = localStorage.getItem('user_data');
      let voterId = null;
      
      if (userData) {
        try {
          const user = JSON.parse(userData);
          voterId = user.voter_id || user.id;
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
      
      if (!voterId) {
        setProfileComplete(false);
        setBlockedReason('Please log in to cast your vote.');
        return;
      }

      const response = await profileService.getCompletionStatus(voterId);
      const completionData = response.data?.data;
      
      if (!completionData) {
        setProfileComplete(false);
        setBlockedReason('Profile not found. Please complete registration.');
        return;
      }

      const mandatoryCheckpoints = [
        'aadhaar_otp',
        'email_otp',
        'mobile_otp',
        'address_doc',
        'personal_info',
        'biometrics',
      ];

      const checkpoints = completionData.checkpoints || {};
      const allMandatoryComplete = mandatoryCheckpoints.every(
        key => checkpoints[key] === true
      );

      if (!allMandatoryComplete || completionData.completionPercentage < 100) {
        setProfileComplete(false);
        const incomplete = mandatoryCheckpoints.filter(key => !checkpoints[key]);
        const incompleteNames = incomplete.map(k => {
          const names: { [key: string]: string } = {
            'aadhaar_otp': 'Aadhaar OTP Verification',
            'email_otp': 'Email Verification',
            'mobile_otp': 'Mobile Verification',
            'address_doc': 'Address Document',
            'personal_info': 'Personal Information',
            'biometrics': 'Biometric Registration'
          };
          return names[k] || k.replace('_', ' ');
        });
        setBlockedReason(`Your profile is ${completionData.completionPercentage || 0}% complete. Please complete: ${incompleteNames.join(', ')}`);
      } else {
        setProfileComplete(true);
      }
    } catch (error) {
      console.error('Failed to check profile completion:', error);
      setProfileComplete(false);
      setBlockedReason('Unable to verify profile completion. Please try again.');
    }
  };

  const fetchCandidates = async () => {
    try {
      const response = await candidateService.getAll(1, 100, Number(electionId));
      setCandidates(response.data.candidates || []);
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selectedCandidate || !electionId) return;

    // Double-check profile completion before allowing vote
    if (profileComplete === false) {
      const confirmGoToProfile = confirm(
        `🚫 Cannot Cast Vote\n\n${blockedReason}\n\nWould you like to complete your profile now?`
      );
      if (confirmGoToProfile) {
        navigate('/update-profile');
      }
      return;
    }

    // Re-check if still null (loading)
    if (profileComplete === null) {
      // Re-check completion status
      await checkProfileCompletion();
      if (profileComplete === false) {
        const confirmGoToProfile = confirm(
          `🚫 Cannot Cast Vote\n\n${blockedReason}\n\nWould you like to complete your profile now?`
        );
        if (confirmGoToProfile) {
          navigate('/update-profile');
        }
        return;
      }
      alert('Please wait while we verify your profile completion...');
      return;
    }

    setSubmitting(true);
    try {
      // Get voter_id from logged-in user
      const userData = localStorage.getItem('user_data');
      let voterId = null;
      
      if (userData) {
        try {
          const user = JSON.parse(userData);
          voterId = user.voter_id || user.id;
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
      
      if (!voterId) {
        alert('Please log in to cast your vote.');
        navigate('/login');
        return;
      }
      
      await voteService.create({
        voter_id: voterId,
        candidate_id: selectedCandidate,
        election_id: Number(electionId),
      });

      alert('✅ Vote cast successfully! Thank you for participating in the election.');
      navigate('/dashboard');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to cast vote';
      
      // Check if it's a profile completion error
      if (errorMsg.includes('Profile incomplete') || errorMsg.includes('incomplete')) {
        const confirmGoToProfile = confirm(
          `🚫 Cannot Cast Vote\n\n${errorMsg}\n\nWould you like to complete your profile now?`
        );
        if (confirmGoToProfile) {
          navigate('/update-profile');
        }
      } else {
        alert(`❌ Error: ${errorMsg}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Show blocking message if profile incomplete
  if (profileComplete === false) {
    return (
      <div className="min-h-screen bg-gray-light py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="card bg-red-50 border-2 border-red-300">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🔒</div>
              <h1 className="text-2xl font-bold text-red-800 mb-4">Voting Blocked</h1>
              <p className="text-gray-700 mb-2">{blockedReason}</p>
              <p className="text-sm text-gray-600 mb-6">
                Election-sensitive activities require a complete profile with all mandatory verifications.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => navigate('/update-profile')}
                  className="btn-primary"
                >
                  Complete Profile Now →
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn-secondary"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-light py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-heading font-bold text-gray-800 mb-8">Cast Your Vote</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-navy"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Select a Candidate</h2>
              <div className="space-y-3">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.candidate_id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                      selectedCandidate === candidate.candidate_id
                        ? 'border-primary-navy bg-primary-light'
                        : 'border-gray-border hover:border-primary-royal'
                    }`}
                    onClick={() => setSelectedCandidate(candidate.candidate_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{candidate.name}</h3>
                        {candidate.manifesto && (
                          <p className="text-sm text-gray-600 mt-1">{candidate.manifesto.substring(0, 100)}...</p>
                        )}
                      </div>
                      {selectedCandidate === candidate.candidate_id && (
                        <div className="w-6 h-6 bg-primary-navy rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-secondary flex-1"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleVote}
                className="btn-primary flex-1"
                disabled={!selectedCandidate || submitting}
              >
                {submitting ? 'Casting Vote...' : 'Cast Vote'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

