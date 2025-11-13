// app/components/ForgotPasswordModal.js
'use client';

import { useState } from 'react';
import { 
  FaTimes, 
  FaEnvelope, 
  FaKey, 
  FaCheck, 
  FaSpinner, 
  FaShieldAlt,
  FaUserShield,
  FaRocket,
  FaLock,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: email, 2: code, 3: new password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [codeSent, setCodeSent] = useState(false);

  const resetForm = () => {
    setStep(1);
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setLoading(false);
    setMessage({ type: '', text: '' });
    setCodeSent(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSendCode = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    // Email domain validation
    const emailRegex = /^[^\s@]+@nagad\.com\.bd$/;
    if (!emailRegex.test(email)) {
      setMessage({ 
        type: 'error', 
        text: 'Email must be @nagad.com.bd domain' 
      });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'sendCode', 
          email: email 
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setCodeSent(true);
        setStep(2);
        setMessage({ 
          type: 'success', 
          text: '📧 Verification code sent to your email address!' 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: '🚨 Network error. Please check your connection and try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter the 6-digit verification code' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'verifyCode', 
          email: email,
          code: code
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setStep(3);
        setMessage({ 
          type: 'success', 
          text: '✅ Code verified successfully! Set your new password.' 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: '🚨 Verification failed. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '🔒 Passwords do not match' });
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setMessage({ 
        type: 'error', 
        text: '🔐 Password must be 8+ characters with uppercase, lowercase, and number' 
      });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'resetPassword', 
          email: email,
          code: code,
          newPassword: newPassword
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: '🎉 Password reset successfully! You can now login with your new password.' 
        });
        
        // Auto close after success
        setTimeout(() => {
          handleClose();
        }, 3000);
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: '🚨 Password reset failed. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop with blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ 
            type: "spring",
            damping: 30,
            stiffness: 300
          }}
          className="relative bg-white/95 backdrop-blur-xl rounded shadow-2xl border border-white/20 max-w-md w-full p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded mb-4 shadow-lg"
            >
              <FaLock className="text-white text-2xl" />
            </motion.div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Reset Your Password
            </h2>
            <p className="text-gray-600 text-sm">
              Secure password recovery process
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-between items-center mb-8 relative">
            <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 -z-10">
              <motion.div 
                className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${(step - 1) * 50}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex flex-col items-center z-10">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 ${
                    step >= stepNumber 
                      ? 'bg-gradient-to-br from-blue-500 to-purple-500 border-transparent text-white shadow-lg' 
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {step > stepNumber ? <FaCheck className="text-xs" /> : stepNumber}
                </motion.div>
                <span className={`text-xs mt-2 font-medium transition-colors ${
                  step >= stepNumber ? 'text-blue-600 font-semibold' : 'text-gray-500'
                }`}>
                  {stepNumber === 1 ? 'Verify' : stepNumber === 2 ? 'Code' : 'Reset'}
                </span>
              </div>
            ))}
          </div>

          {/* Step 1: Enter Email */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  <FaEnvelope className="inline mr-2 text-blue-500" />
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 placeholder-gray-500"
                    placeholder="your.email@nagad.com.bd"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2 ml-1">
                  Enter your registered Nagad email address
                </p>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSendCode}
                disabled={!email || loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin mr-3" />
                    Sending Secure Code...
                  </>
                ) : (
                  <>
                    <FaUserShield className="mr-3" />
                    Send Verification Code
                  </>
                )}
              </motion.button>
            </motion.div>
          )}

          {/* Step 2: Enter Code */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded border border-blue-200">
                <div className="flex items-center">
                  <FaEnvelope className="text-blue-500 mr-3 text-lg" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">
                      Code Sent To:
                    </p>
                    <p className="text-blue-900 font-medium">{email}</p>
                    {codeSent && (
                      <p className="text-xs text-green-600 mt-1 flex items-center">
                        <FaCheck className="mr-1" />
                        Verification Code Sent Successfully
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  <FaShieldAlt className="inline mr-2 text-purple-500" />
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-xl font-mono tracking-widest font-semibold text-gray-800 placeholder-gray-400 transition-all duration-300"
                  placeholder="000000"
                  maxLength={6}
                  disabled={loading}
                />
                <p className="text-xs text-gray-600 mt-2 text-center">
                  Enter the 6-digit security code from your email
                </p>
              </div>
              
              <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50 transition-all duration-300 disabled:opacity-50"
                >
                  ← Back
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleVerifyCode}
                  disabled={code.length !== 6 || loading}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Code →
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded border border-green-200">
                <div className="flex items-center">
                  <FaCheck className="text-green-500 mr-3 text-lg" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      Identity Verified
                    </p>
                    <p className="text-green-900 text-sm">Now set your new secure password</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  <FaLock className="inline mr-2 text-blue-500" />
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 pr-12"
                    placeholder="Enter new password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  <FaLock className="inline mr-2 text-purple-500" />
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-800 pr-12"
                    placeholder="Confirm new password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <p className="text-sm font-semibold text-gray-800 mb-3">🔐 Password Requirements</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center ${newPassword.length >= 8 ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                    <FaCheck className={`mr-2 text-xs ${newPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'}`} />
                    8+ Characters
                  </div>
                  <div className={`flex items-center ${/[a-z]/.test(newPassword) ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                    <FaCheck className={`mr-2 text-xs ${/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`} />
                    Lowercase
                  </div>
                  <div className={`flex items-center ${/[A-Z]/.test(newPassword) ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                    <FaCheck className={`mr-2 text-xs ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`} />
                    Uppercase
                  </div>
                  <div className={`flex items-center ${/\d/.test(newPassword) ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                    <FaCheck className={`mr-2 text-xs ${/\d/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`} />
                    Number
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50 transition-all duration-300 disabled:opacity-50"
                >
                  ← Back
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleResetPassword}
                  disabled={!newPassword || !confirmPassword || loading}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Securing...
                    </>
                  ) : (
                    <>
                      <FaRocket className="mr-2" />
                      Reset Password
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Message Display */}
          {message.text && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`mt-6 p-4 rounded border-2 backdrop-blur-sm ${
                message.type === 'error' 
                  ? 'bg-red-50/80 border-red-200 text-red-800' 
                  : 'bg-green-50/80 border-green-200 text-green-800'
              }`}
            >
              <div className="flex items-start">
                <div className={`flex-shrink-0 p-1 rounded ${
                  message.type === 'error' ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  {message.type === 'error' ? (
                    <FaTimes className="text-red-600 text-sm" />
                  ) : (
                    <FaCheck className="text-green-600 text-sm" />
                  )}
                </div>
                <span className="text-sm font-medium ml-3">{message.text}</span>
              </div>
            </motion.div>
          )}

          {/* Close Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all duration-300"
          >
            <FaTimes />
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ForgotPasswordModal;