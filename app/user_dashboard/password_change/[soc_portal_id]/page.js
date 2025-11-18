// app/user_dashboard/password_change/[soc_portal_id]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FaLock, FaEye, FaEyeSlash, FaCheck, FaUser, FaKey, FaShieldAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';


export default function PasswordChangePage() {
  const router = useRouter();
  const params = useParams();
  const soc_portal_id = params.soc_portal_id;
  
  console.log('[PasswordChangePage] Component mounted');
  console.log(`[PasswordChangePage] Route params:`, params);
  console.log(`[PasswordChangePage] Extracted soc_portal_id: ${soc_portal_id}`);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [userData, setUserData] = useState(null);

  // Get user data
  useEffect(() => {
    console.log('[useEffect] Fetching user data...');
    console.log(`[useEffect] Using soc_portal_id: ${soc_portal_id}`);
    
    const fetchUserData = async () => {
      try {
        console.log(`[fetchUserData] Calling API: /api/user_dashboard/user_info?id=${soc_portal_id}`);
        
        const response = await fetch(`/api/user_dashboard/user_info?id=${soc_portal_id}`);
        const data = await response.json();
        
        console.log('[fetchUserData] API response:', {
          status: response.status,
          data: data
        });
        
        if (response.ok) {
          console.log('[fetchUserData] Setting user data:', data);
          setUserData(data);
        } else {
          console.error('[fetchUserData] Failed to fetch user data:', data.error);
          toast.error('Failed to load user information');
        }
      } catch (error) {
        console.error('[fetchUserData] Network error:', error);
        toast.error('Network error. Please try again.');
      }
    };

    if (soc_portal_id && soc_portal_id !== '[soc_portal_id]') {
      fetchUserData();
    } else {
      console.error('[useEffect] Invalid soc_portal_id:', soc_portal_id);
      toast.error('Invalid user ID');
    }
  }, [soc_portal_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`[handleChange] Field: ${name}, Value: ${value ? '*****' : 'empty'}`);
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Calculate password strength for new password
    if (name === 'newPassword') {
      console.log('[handleChange] Calculating password strength...');
      let strength = 0;
      if (value.length >= 8) strength += 1;
      if (value.length >= 12) strength += 1;
      if (/[A-Z]/.test(value)) strength += 1;
      if (/[a-z]/.test(value)) strength += 1;
      if (/[0-9]/.test(value)) strength += 1;
      if (/[^A-Za-z0-9]/.test(value)) strength += 1;
      
      console.log(`[handleChange] Password strength: ${strength}/6`);
      setPasswordStrength(strength);
    }
  };

  const togglePasswordVisibility = (field) => {
    console.log(`[togglePasswordVisibility] Toggling visibility for: ${field}`);
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Enhanced validation
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match!');
      return;
    }
    
    if (passwordStrength < 4) {
      toast.error('Password must be stronger!');
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/user_dashboard/password_change/${soc_portal_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Show success toast with custom duration and style
        toast.success('Password updated successfully!', {
          duration: 3000,
          position: 'top-right',
          icon: '🔒',
          style: {
            background: '#10B981',
            color: '#fff',
            fontWeight: 'bold',
          },
        });
        
        // Redirect after a delay to allow the toast to be seen
        setTimeout(() => {
          router.push('/user_dashboard');
        }, 2500);
      } else {
        console.error('Password update failed:', {
          status: response.status,
          error: result.error
        });
        toast.error(result.error || 'Password update failed');
      }
    } catch (error) {
      console.error('Network error:', {
        message: error.message,
        stack: error.stack
      });
      toast.error('Network error. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStrengthColor = (strength) => {
    if (strength <= 2) return 'bg-red-500';
    if (strength <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const strengthText = () => {
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 4) return 'Medium';
    return 'Strong';
  };

  // Calculate security level
  const getSecurityLevel = () => {
    if (!userData) return 'High';
    const lastLogin = new Date(userData.lastLogin);
    const today = new Date();
    const diffDays = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 90) return 'Low';
    if (diffDays > 30) return 'Medium';
    return 'High';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2"
          >
            Account Security
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 text-sm sm:text-base"
          >
            Update your password and security settings
          </motion.p>
        </div>

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded p-4 shadow-md flex items-center">
            <div className="bg-white/20 p-3 rounded-full mr-4">
              <FaUser className="text-xl" />
            </div>
            <div>
              <div className="text-xl font-bold">{userData?.id || 'A01SOCP'}</div>
              <div className="text-xs sm:text-sm mt-1">User ID</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded p-4 shadow-md flex items-center">
            <div className="bg-white/20 p-3 rounded-full mr-4">
              <FaKey className="text-xl" />
            </div>
            <div>
              <div className="text-xl font-bold">Last Updated</div>
              <div className="text-xs sm:text-sm mt-1">
                {userData?.lastLogin 
                  ? new Date(userData.lastLogin).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : 'Never'}
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white rounded p-4 shadow-md flex items-center">
            <div className="bg-white/20 p-3 rounded-full mr-4">
              <FaShieldAlt className="text-xl" />
            </div>
            <div>
              <div className="text-xl font-bold">Security Level</div>
              <div className="text-xs sm:text-sm mt-1">{getSecurityLevel()}</div>
            </div>
          </div>
        </motion.div>

        {/* Password Change Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded shadow-lg overflow-hidden border border-gray-200"
        >
          <div className="p-6 sm:p-8">
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <FaLock className="text-blue-600 text-xl" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                Change Password
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                      onClick={() => togglePasswordVisibility('current')}
                    >
                      {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                      onClick={() => togglePasswordVisibility('new')}
                    >
                      {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                      onClick={() => togglePasswordVisibility('confirm')}
                    >
                      {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Password Strength */}
                {formData.newPassword && (
                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <h3 className="font-medium text-gray-800 mb-3">Password Strength</h3>
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">
                        Strength Level:
                      </span>
                      <span className={`text-sm font-medium ${
                        passwordStrength <= 2 ? 'text-red-600' : 
                        passwordStrength <= 4 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {strengthText()} ({passwordStrength}/6)
                      </span>
                    </div>
                    
                    <div className="w-full h-2 bg-gray-200 rounded-full mb-4 overflow-hidden">
                      <div 
                        className={`h-full ${getStrengthColor(passwordStrength)} transition-all duration-300`}
                        style={{ width: `${(passwordStrength / 6) * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className={`flex items-center ${formData.newPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                        <FaCheck className="mr-2 text-xs" />
                        <span className="text-sm">At least 8 characters</span>
                      </div>
                      <div className={`flex items-center ${formData.newPassword.length >= 12 ? 'text-green-600' : 'text-gray-400'}`}>
                        <FaCheck className="mr-2 text-xs" />
                        <span className="text-sm">12+ characters (stronger)</span>
                      </div>
                      <div className={`flex items-center ${/[A-Z]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                        <FaCheck className="mr-2 text-xs" />
                        <span className="text-sm">Uppercase letters</span>
                      </div>
                      <div className={`flex items-center ${/[a-z]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                        <FaCheck className="mr-2 text-xs" />
                        <span className="text-sm">Lowercase letters</span>
                      </div>
                      <div className={`flex items-center ${/[0-9]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                        <FaCheck className="mr-2 text-xs" />
                        <span className="text-sm">Numbers</span>
                      </div>
                      <div className={`flex items-center ${/[^A-Za-z0-9]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                        <FaCheck className="mr-2 text-xs" />
                        <span className="text-sm">Special characters</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Security Tips */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded p-4"
                >
                  <div className="flex items-start">
                    <div className="bg-amber-100 p-2.5 rounded-full mr-4">
                      <FaShieldAlt className="text-amber-600 text-xl" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Password Security Tips</h3>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-start">
                          <FaCheck className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span>Use a combination of uppercase and lowercase letters</span>
                        </li>
                        <li className="flex items-start">
                          <FaCheck className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span>Include numbers and special characters (@, #, $, etc.)</span>
                        </li>
                        <li className="flex items-start">
                          <FaCheck className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span>Avoid using personal information like birthdays or names</span>
                        </li>
                        <li className="flex items-start">
                          <FaCheck className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span>Change your password every 90 days</span>
                        </li>
                        <li className="flex items-start">
                          <FaCheck className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span>Never share your password with anyone</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              </div>
            </form>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isUpdating || passwordStrength < 4}
                className={`px-6 py-3 rounded font-medium ${
                  isUpdating || passwordStrength < 4
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800'
                }`}
                onClick={handleSubmit}
              >
                {isUpdating ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : 'Change Password'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}