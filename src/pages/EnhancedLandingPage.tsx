import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useAnimation, useInView } from 'framer-motion';
import { useSpring, animated, config } from '@react-spring/web';
import LanguageSelector from '../components/LanguageSelector';

export default function EnhancedLandingPage() {
  const { t } = useTranslation();
  const [showVoterStatus, setShowVoterStatus] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [voterStatus, setVoterStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Floating animation for shield icon
  const shieldAnimation = useSpring({
    from: { y: -20, opacity: 0 },
    to: { y: 0, opacity: 1 },
    config: { ...config.gentle, duration: 2000 },
    delay: 300,
  });

  // Pulse animation for SecureVote text
  const pulseAnimation = useSpring({
    from: { scale: 0.8, opacity: 0 },
    to: { scale: 1, opacity: 1 },
    config: { ...config.wobbly, duration: 1500 },
    delay: 600,
  });

  // Floating effect for shield
  const floatingAnimation = useSpring({
    from: { y: 0 },
    to: async (next) => {
      while (1) {
        await next({ y: -10 });
        await next({ y: 0 });
      }
    },
    config: { duration: 2000 },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCheckVoterStatus = async () => {
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      alert('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    setLoading(true);
    setVoterStatus(null);
    try {
      // Check database first - search for voter by Aadhaar
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/voters?aadhaar=${aadhaarNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          const voter = data.data[0];
          setVoterStatus({
            name: voter.name,
            aadhaar_masked: `XXXX-XXXX-${aadhaarNumber.substring(8)}`,
            status: voter.is_verified ? 'Verified' : 'Pending Verification',
            epic_number: voter.epic_number || 'Not Generated',
            polling_station: voter.polling_station || 'Not Assigned'
          });
        } else {
          // No voter found in database
          setVoterStatus({
            name: null,
            aadhaar_masked: `XXXX-XXXX-${aadhaarNumber.substring(8)}`,
            status: 'Not Registered',
            epic_number: null,
            polling_station: null
          });
        }
      } else {
        throw new Error('Failed to check voter status');
      }
    } catch (error) {
      console.error('Error checking voter status:', error);
      alert('Error checking voter status. Please try again.');
      setVoterStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 10,
      },
    },
  };

  const cardVariants = {
    hidden: { scale: 0.8, opacity: 0, y: 50 },
    visible: {
      scale: 1,
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    },
    hover: {
      scale: 1.05,
      y: -10,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 17,
      },
    },
  };

  const iconVariants = {
    hover: {
      rotate: [0, -10, 10, -10, 0],
      scale: 1.1,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-navy via-primary-royal to-primary-light relative overflow-hidden">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => {
          const randomX = typeof window !== 'undefined' ? Math.random() * window.innerWidth : Math.random() * 1920;
          const randomY = typeof window !== 'undefined' ? Math.random() * window.innerHeight : Math.random() * 1080;
          return (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full"
              initial={{
                x: randomX,
                y: randomY,
              }}
              animate={{
                y: [null, typeof window !== 'undefined' ? Math.random() * window.innerHeight : Math.random() * 1080],
                x: [null, typeof window !== 'undefined' ? Math.random() * window.innerWidth : Math.random() * 1920],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                repeatType: 'reverse' as const,
                ease: 'linear',
              }}
            />
          );
        })}
      </div>

      {/* Header with India Flag Emblem */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm relative z-10"
      >
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <motion.div
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <motion.div
              className="w-14 h-14 bg-gradient-to-br from-orange-500 to-green-600 rounded-full flex items-center justify-center shadow-lg"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-white font-bold text-xl">🇮🇳</span>
            </motion.div>
            <div>
              <h1 className="text-xl font-heading font-bold text-primary-navy">
                Digital Voter Portal
              </h1>
              <p className="text-xs text-gray-600">Election Commission of India</p>
            </div>
          </motion.div>
          <div className="flex items-center space-x-4">
            <LanguageSelector compact={true} showLabel={false} />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/login" className="text-primary-navy hover:underline font-medium">{t('login')}</Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/register" className="bg-primary-navy text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-royal transition shadow-md">
                {t('register')}
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16 relative z-10">
        <motion.div
          initial="hidden"
          animate={mounted ? "visible" : "hidden"}
          variants={containerVariants}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <motion.div className="mb-8 flex flex-col items-center" variants={itemVariants}>
            <animated.div
              style={{
                ...shieldAnimation,
                ...floatingAnimation,
              }}
              className="relative"
            >
              <motion.div
                className="inline-flex items-center justify-center bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm rounded-full p-8 shadow-2xl"
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(255, 255, 255, 0.4)',
                    '0 0 0 20px rgba(255, 255, 255, 0)',
                    '0 0 0 0 rgba(255, 255, 255, 0)',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <motion.svg
                  className="w-20 h-20 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </motion.svg>
              </motion.div>
            </animated.div>
            <animated.p
              style={pulseAnimation}
              className="text-white text-2xl font-semibold tracking-[0.3em] mt-6 uppercase"
            >
              SecureVote
            </animated.p>
          </motion.div>
          
          <motion.h1
            variants={itemVariants}
            className="text-5xl font-heading font-bold text-white mb-6 drop-shadow-lg"
          >
            {t('tamper_proof_verification')}
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="text-xl text-white/95 mb-12 font-light"
          >
            {t('secure_platform')}
          </motion.p>
        </motion.div>

        {/* Quick Service Tiles - DigiLocker Style */}
        <motion.div
          initial="hidden"
          animate={mounted ? "visible" : "hidden"}
          variants={containerVariants}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {/* Check Voter Status */}
          <motion.div
            variants={cardVariants}
            whileHover="hover"
            className="card hover:shadow-2xl transition-all duration-300 bg-white"
          >
            <div className="text-center p-6">
              <motion.div
                variants={iconVariants}
                whileHover="hover"
                className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
              >
                <motion.svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={{
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </motion.svg>
              </motion.div>
              <h3 className="font-bold text-lg text-gray-800 mb-3">{t('check_voter_status')}</h3>
              <p className="text-sm text-gray-600 mb-4">{t('enter_aadhaar')}</p>
              
              {!showVoterStatus ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowVoterStatus(true)}
                  className="btn-primary w-full"
                >
                  {t('check_now')}
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <motion.input
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    type="text"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder={t('enter_aadhaar')}
                    className="input-field"
                    maxLength={12}
                  />
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCheckVoterStatus}
                      className="btn-primary flex-1"
                      disabled={loading}
                    >
                      {loading ? (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          ⏳
                        </motion.span>
                      ) : (
                        t('verify_otp')
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setShowVoterStatus(false);
                        setVoterStatus(null);
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </motion.button>
                  </div>
                  {voterStatus && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`mt-4 p-4 border rounded-lg text-left ${
                        voterStatus.status === 'Verified' 
                          ? 'bg-green-50 border-green-200' 
                          : voterStatus.status === 'Not Registered'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      {voterStatus.status === 'Verified' ? (
                        <>
                          <motion.p
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="text-sm font-semibold text-green-800 mb-2"
                          >
                            ✓ {t('voter_verified')}
                          </motion.p>
                          <p className="text-xs text-gray-600">{t('name')}: {voterStatus.name}</p>
                          <p className="text-xs text-gray-600">{t('aadhaar')}: {voterStatus.aadhaar_masked}</p>
                          <p className="text-xs text-gray-600">{t('epic_number')}: {voterStatus.epic_number}</p>
                        </>
                      ) : voterStatus.status === 'Not Registered' ? (
                        <>
                          <motion.p
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="text-sm font-semibold text-red-800 mb-2"
                          >
                            ✗ Not Registered
                          </motion.p>
                          <p className="text-xs text-gray-600">This Aadhaar number is not registered in the voter database.</p>
                          <p className="text-xs text-gray-600 mt-2">Please register to vote.</p>
                        </>
                      ) : (
                        <>
                          <motion.p
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="text-sm font-semibold text-yellow-800 mb-2"
                          >
                            ⏳ Pending Verification
                          </motion.p>
                          <p className="text-xs text-gray-600">{t('name')}: {voterStatus.name}</p>
                          <p className="text-xs text-gray-600">{t('aadhaar')}: {voterStatus.aadhaar_masked}</p>
                          <p className="text-xs text-gray-600">Status: Verification pending</p>
                        </>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Find Polling Station */}
          <motion.div variants={cardVariants} whileHover="hover">
            <Link to="/find-polling-station" className="card hover:shadow-2xl transition-all duration-300 bg-white block">
              <div className="text-center p-6">
                <motion.div
                  variants={iconVariants}
                  whileHover="hover"
                  className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                >
                  <motion.svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </motion.svg>
                </motion.div>
                <h3 className="font-bold text-lg text-gray-800 mb-3">{t('find_polling_station')}</h3>
                <p className="text-sm text-gray-600 mb-4">{t('find_polling_station')}</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary w-full"
                >
                  {t('find_polling_station')}
                </motion.button>
              </div>
            </Link>
          </motion.div>

          {/* Submit Grievance */}
          <motion.div variants={cardVariants} whileHover="hover">
            <Link to="/grievance" className="card hover:shadow-2xl transition-all duration-300 bg-white block">
              <div className="text-center p-6">
                <motion.div
                  variants={iconVariants}
                  whileHover="hover"
                  className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                >
                  <motion.svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </motion.svg>
                </motion.div>
                <h3 className="font-bold text-lg text-gray-800 mb-3">{t('grievance')}</h3>
                <p className="text-sm text-gray-600 mb-4">{t('grievance')}</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary w-full"
                >
                  {t('grievance')}
                </motion.button>
              </div>
            </Link>
          </motion.div>

          {/* Track Application */}
          <motion.div variants={cardVariants} whileHover="hover">
            <Link to="/track-application" className="card hover:shadow-2xl transition-all duration-300 bg-white block">
              <div className="text-center p-6">
                <motion.div
                  variants={iconVariants}
                  whileHover="hover"
                  className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                >
                  <motion.svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{
                      pathLength: [0, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: 'reverse',
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </motion.svg>
                </motion.div>
                <h3 className="font-bold text-lg text-gray-800 mb-3">Track Application</h3>
                <p className="text-sm text-gray-600 mb-4">Check your registration status</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary w-full"
                >
                  Track Now
                </motion.button>
              </div>
            </Link>
          </motion.div>

          {/* Download Voter ID */}
          <motion.div variants={cardVariants} whileHover="hover" className="card hover:shadow-2xl transition-all duration-300 bg-white">
            <div className="text-center p-6">
              <motion.div
                variants={iconVariants}
                whileHover="hover"
                className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
              >
                <motion.svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={{
                    y: [0, -5, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </motion.svg>
              </motion.div>
              <h3 className="font-bold text-lg text-gray-800 mb-3">Download Voter ID</h3>
              <p className="text-sm text-gray-600 mb-4">Get your digital e-EPIC card</p>
              <Link to="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary w-full"
                >
                  Download EPIC
                </motion.button>
              </Link>
            </div>
          </motion.div>

          {/* View Elections */}
          <motion.div variants={cardVariants} whileHover="hover">
            <Link to="/elections" className="card hover:shadow-2xl transition-all duration-300 bg-white block">
              <div className="text-center p-6">
                <motion.div
                  variants={iconVariants}
                  whileHover="hover"
                  className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                >
                  <motion.svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </motion.svg>
                </motion.div>
                <h3 className="font-bold text-lg text-gray-800 mb-3">View Elections</h3>
                <p className="text-sm text-gray-600 mb-4">Browse upcoming and active elections</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary w-full"
                >
                  View Elections
                </motion.button>
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="bg-white/10 backdrop-blur-sm border-t border-white/20 mt-20 relative z-10"
      >
        <div className="container mx-auto px-6 py-8">
          <div className="grid md:grid-cols-3 gap-8 text-white/80">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <h4 className="font-semibold text-white mb-4">About</h4>
              <p className="text-sm">Secure, transparent, and tamper-proof voter verification system powered by blockchain technology.</p>
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.4 }}
            >
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/register" className="hover:text-white transition">Register as Voter</Link></li>
                <li><Link to="/grievance" className="hover:text-white transition">Submit Grievance</Link></li>
                <li><Link to="/track-application" className="hover:text-white transition">Track Application</Link></li>
                <li><Link to="/audit-logs" className="hover:text-white transition">Audit Logs</Link></li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1.6 }}
            >
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <p className="text-sm">Election Commission of India</p>
              <p className="text-sm">Email: support@eci.gov.in</p>
              <p className="text-sm">Helpline: 1800-XXX-XXXX</p>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="border-t border-white/20 mt-8 pt-8 text-center text-sm text-white/60"
          >
            <p>&copy; 2024 Digital Voter Verification System. All rights reserved.</p>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
}
