//app/user_dashboard/settings/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  FaUser, FaPhone, FaSave, FaSpinner, FaExclamationTriangle, 
  FaCheckCircle, FaImage, FaArrowLeft, FaShieldAlt,
  FaUserCircle, FaMobileAlt, FaIdCard
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState({
    profilePhotoUrl: '',
    emergencyContact: '',
    phone: ''
  });
  const [formData, setFormData] = useState({
    profilePhoto: null,
    emergencyContact: ''
  });
  const [previewImage, setPreviewImage] = useState('');
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current user settings
  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user_dashboard/settings', {
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          setUserData(data.settings);
          setFormData({
            profilePhoto: null,
            emergencyContact: data.settings.emergencyContact || ''
          });
          setPreviewImage(data.settings.profilePhotoUrl);
        } else {
          throw new Error(data.message || 'Failed to load settings');
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchUserSettings();
  }, []);

  // Check for changes
  useEffect(() => {
    const changes = 
      formData.profilePhoto !== null ||
      formData.emergencyContact !== userData.emergencyContact;
    
    setHasChanges(changes);
  }, [formData, userData]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.match('image.*')) {
      setErrors(prev => ({ ...prev, profilePhoto: 'Only image files are allowed' }));
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, profilePhoto: 'File size exceeds 5MB limit' }));
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);
    
    setFormData(prev => ({ ...prev, profilePhoto: file }));
    setErrors(prev => ({ ...prev, profilePhoto: '' }));
  };

  const handleEmergencyContactChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, emergencyContact: value }));
    
    // Clear error when user types
    if (errors.emergencyContact) {
      setErrors(prev => ({ ...prev, emergencyContact: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Emergency contact validation (optional field)
    if (formData.emergencyContact && formData.emergencyContact !== '') {
      const phoneRegex = /^(017|013|019|014|018|016|015)\d{8}$/;
      if (!phoneRegex.test(formData.emergencyContact)) {
        newErrors.emergencyContact = 'Must be 11 digits starting with 017,013,019,014,018,016 or 015';
      }
      
      // Check if emergency contact is same as primary phone
      if (formData.emergencyContact === userData.phone) {
        newErrors.emergencyContact = 'Emergency contact cannot be the same as your primary phone number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix validation errors before submitting', {
        duration: 4000,
        position: 'top-right'
      });
      return;
    }

    if (!hasChanges) {
      toast.error('No changes detected', {
        duration: 4000,
        position: 'top-right'
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const formDataToSend = new FormData();
      
      if (formData.profilePhoto) {
        formDataToSend.append('profilePhoto', formData.profilePhoto);
      }
      
      if (formData.emergencyContact !== userData.emergencyContact) {
        formDataToSend.append('emergencyContact', formData.emergencyContact);
      }

      const response = await fetch('/api/user_dashboard/settings', {
        method: 'PUT',
        body: formDataToSend,
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update settings');
      }

      // Show success message
      toast.success('Settings updated successfully!', {
        duration: 5000,
        position: 'top-right',
        icon: <FaCheckCircle className="text-green-500" />
      });

      // Refresh user data
      const refreshResponse = await fetch('/api/user_dashboard/settings', {
        credentials: 'include'
      });
      const refreshData = await refreshResponse.json();
      
      if (refreshResponse.ok && refreshData.success) {
        setUserData(refreshData.settings);
        setFormData(prev => ({
          profilePhoto: null,
          emergencyContact: refreshData.settings.emergencyContact || ''
        }));
        setHasChanges(false);
      }
      
    } catch (error) {
      console.error('Error updating settings:', error);
      
      // Check for specific error messages from API
      if (error.message.includes('already registered')) {
        toast.error(error.message, {
          duration: 6000,
          position: 'top-right',
          icon: <FaExclamationTriangle className="text-red-500" />
        });
      } else {
        toast.error(error.message || 'Failed to update settings. Please try again.', {
          duration: 6000,
          position: 'top-right',
          icon: <FaExclamationTriangle className="text-red-500" />
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const clearEmergencyContact = () => {
    setFormData(prev => ({ ...prev, emergencyContact: '' }));
  };

    if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center mb-4 sm:mb-0">
              <button
                onClick={() => router.push('/user_dashboard')}
                className="mr-4 p-2 bg-white rounded shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <FaArrowLeft className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                  Account Settings
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage your profile photo and emergency contact information
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Navigation & Info */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded shadow-sm border border-gray-200 p-6 mb-6"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FaUserCircle className="mr-2 text-blue-500" />
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/user_dashboard')}
                  className="w-full text-left px-4 py-3 rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-gray-800">Back to Dashboard</div>
                  <div className="text-sm text-gray-600">Return to main dashboard</div>
                </button>
                
                <button
                  onClick={() => router.push('/user_dashboard/profile')}
                  className="w-full text-left px-4 py-3 rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-gray-800">View Profile</div>
                  <div className="text-sm text-gray-600">See your complete profile</div>
                </button>
              </div>
            </motion.div>

            {/* Security Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-blue-50 rounded border border-blue-200 p-6"
            >
              <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                <FaShieldAlt className="mr-2" />
                Security Notes
              </h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Profile photos are visible to authorized personnel only
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Emergency contact should be different from your primary phone
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  All changes are logged for security purposes
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  You will receive notifications for important changes
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Right Column - Settings Form */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="p-6">
                {/* Profile Photo Section */}
                <div className="mb-8 pb-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <FaImage className="mr-3 text-blue-500" />
                    Profile Photo
                  </h3>
                  
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    {/* Current Photo */}
                    <div className="flex flex-col items-center">
                      <div className="relative mb-4">
                        {previewImage ? (
                          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                            <Image 
                              src={previewImage}
                              alt="Profile preview"
                              fill
                              style={{ objectFit: 'cover' }}
                              unoptimized
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/api/storage/user_dp/default_DP.png';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white flex items-center justify-center shadow-lg">
                            <FaUser className="text-gray-400 text-4xl" />
                          </div>
                        )}
                      </div>
                      
                      <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center shadow-md transition-colors">
                        <FaImage className="mr-2" />
                        Change Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Photo Guidelines */}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-700 mb-3">Photo Guidelines</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center">
                          <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0" />
                          Use a clear, recent photo of yourself
                        </li>
                        <li className="flex items-center">
                          <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0" />
                          Supported formats: JPG, PNG, WebP
                        </li>
                        <li className="flex items-center">
                          <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0" />
                          Maximum file size: 5MB
                        </li>
                        <li className="flex items-center">
                          <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0" />
                          Square images work best
                        </li>
                      </ul>
                      
                      {errors.profilePhoto && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                          <p className="text-red-700 text-sm flex items-center">
                            <FaExclamationTriangle className="mr-2 flex-shrink-0" />
                            {errors.profilePhoto}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Section */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <FaMobileAlt className="mr-3 text-blue-500" />
                    Emergency Contact
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Current Phone (Read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <FaPhone className="mr-2 text-gray-500" />
                        Primary Phone Number
                      </label>
                      <div className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-50 text-gray-600 flex items-center">
                        <FaIdCard className="mr-3 text-gray-500 flex-shrink-0" />
                        <span>{userData.phone || 'Not set'}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Primary phone cannot be changed here
                      </p>
                    </div>

                    {/* Emergency Contact Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <FaMobileAlt className="mr-2 text-blue-500" />
                        Emergency Contact Number
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={formData.emergencyContact}
                          onChange={handleEmergencyContactChange}
                          placeholder="017XXXXXXXX (Optional)"
                          pattern="(017|013|019|014|018|016|015)\d{8}"
                          className={`w-full px-4 py-3 rounded border ${
                            errors.emergencyContact ? 'border-red-400 bg-red-50' : 'border-gray-300'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400 pr-10`}
                        />
                        {formData.emergencyContact && (
                          <button
                            type="button"
                            onClick={clearEmergencyContact}
                            className="absolute right-3 top-3.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="Clear emergency contact"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      
                      {errors.emergencyContact ? (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <FaExclamationTriangle className="mr-1 flex-shrink-0" /> 
                          {errors.emergencyContact}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-gray-500">
                          Optional - Must be different from your primary phone
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Emergency Contact Guidelines */}
                  <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                      <FaShieldAlt className="mr-2" />
                      About Emergency Contact
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Should be a trusted family member or friend</li>
                      <li>• Must be a different number from your primary phone</li>
                      <li>• Will be used only in case of emergencies</li>
                      <li>• Cannot be the same as any other user&apos;s primary or emergency contact</li>
                    </ul>
                  </div>
                </div>

                {/* Current Settings Summary */}
                <div className="mb-8 p-4 bg-gray-50 rounded border border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-3">Current Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Profile Photo:</span>
                      <span className="ml-2 text-gray-800">
                        {formData.profilePhoto ? 'New photo selected' : 'Current photo'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Emergency Contact:</span>
                      <span className="ml-2 text-gray-800">
                        {formData.emergencyContact || userData.emergencyContact || 'Not set'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-4 pt-6 border-t border-gray-200">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => router.push('/user_dashboard')}
                    className="px-6 py-3 border border-gray-300 text-base font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                    disabled={submitting}
                  >
                    Cancel
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: hasChanges ? 1.05 : 1 }}
                    whileTap={{ scale: hasChanges ? 0.98 : 1 }}
                    type="submit"
                    className={`flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all ${
                      hasChanges 
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-md' 
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                    disabled={submitting || !hasChanges}
                  >
                    {submitting ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <FaSave className="mr-2" />
                        Save Changes
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>

            {/* Change History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 bg-white rounded shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FaShieldAlt className="mr-2 text-green-500" />
                Security Information
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  All changes to your account settings are securely logged and monitored. 
                  You will receive notifications for any important updates to your account.
                </p>
                <p>
                  If you notice any unauthorized changes, please contact the SOC team immediately.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}