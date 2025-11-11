// app/user_dashboard/document_hub/other_document_tracker/portal_tracker/edit/[pt_id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  FaGlobe, FaUser, FaLock, FaInfoCircle,
  FaPaperPlane, FaSpinner, FaTimes, FaArrowLeft,
  FaSave, FaIdCard, FaCheckCircle, FaExclamationCircle,
  FaEdit, FaEye, FaEyeSlash
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

export default function EditPortalTracker() {
  const router = useRouter();
  const params = useParams();
  const pt_id = params.pt_id;

  const [formData, setFormData] = useState({
    user_identifier: '',
    password: '',
    remark: ''
  });
  
  const [portalInfo, setPortalInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch portal data and user info
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch portal information
        const portalResponse = await fetch(`/api/user_dashboard/document_hub/other_document_tracker/portal_tracker/${pt_id}`);
        
        if (!portalResponse.ok) {
          throw new Error('Failed to fetch portal information');
        }
        
        const portalData = await portalResponse.json();
        
        if (portalData.success) {
          setPortalInfo(portalData.data);
          // Pre-fill form with existing data
          setFormData({
            user_identifier: portalData.data.user_identifier || '',
            password: portalData.data.password || '',
            remark: portalData.data.remark || ''
          });
        } else {
          throw new Error(portalData.message);
        }

        // Fetch user information
        const userResponse = await fetch('/api/user_dashboard/user_info');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserInfo(userData);
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load portal information');
        router.push('/user_dashboard/document_hub/other_document_log/portal_tracker_log');
      } finally {
        setIsLoading(false);
      }
    };

    if (pt_id) {
      fetchData();
    }
  }, [pt_id, router]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.user_identifier?.trim()) {
      newErrors.user_identifier = 'User ID/Email/Phone Number is required';
    }
    
    if (!formData.password?.trim()) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/user_dashboard/document_hub/other_document_tracker/portal_tracker/${pt_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Portal information updated successfully!');
        
        // Redirect to portal log page after success
        setTimeout(() => {
          router.push('/user_dashboard/document_hub/other_document_log/portal_tracker_log');
        }, 1500);
      } else {
        toast.error(result.message || 'Failed to update portal information');
      }
    } catch (error) {
      console.error('Error updating portal information:', error);
      toast.error('Failed to update portal information');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <FaSpinner className="animate-spin text-4xl text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Loading portal information...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!portalInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <FaExclamationCircle className="text-4xl text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Portal Not Found</h2>
            <p className="text-gray-600 mb-6">The portal you&apos;re trying to edit doesn&apos;t exist.</p>
            <button
              onClick={() => router.push('/user_dashboard/document_hub/other_document_log/portal_tracker_log')}
              className="px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Back to Portal Log
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded shadow-lg overflow-hidden border border-gray-300">
          {/* Header */}
          <div className="relative px-8 py-6 bg-gradient-to-r from-purple-900 to-indigo-900 text-white border-b border-white/10 shadow-md">
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => router.push('/user_dashboard/document_hub/other_document_log/portal_tracker_log')}
                  className="mr-4 p-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
                >
                  <FaArrowLeft />
                </button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                    Edit Portal Information
                  </h1>
                  <p className="text-purple-200 mt-1 text-sm md:text-base">
                    Update portal credentials for {portalInfo.pt_id}
                  </p>
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex items-center space-x-2">
                <div className="p-2 bg-white/20 rounded">
                  <FaEdit className="text-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Portal Information Section (Read-only) */}
              <div className="bg-slate-50 p-6 rounded border border-slate-300">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mr-3">
                    <FaGlobe className="text-slate-600" />
                  </div>
                  Portal Information (Read Only)
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tracking ID
                    </label>
                    <input
                      type="text"
                      value={portalInfo.pt_id}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed font-mono"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Portal Category
                    </label>
                    <input
                      type="text"
                      value={portalInfo.portal_category}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Portal Name
                    </label>
                    <input
                      type="text"
                      value={portalInfo.portal_name}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <input
                      type="text"
                      value={portalInfo.role}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Portal URL
                    </label>
                    <input
                      type="text"
                      value={portalInfo.portal_url}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed break-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Originally Tracked By
                    </label>
                    <input
                      type="text"
                      value={portalInfo.track_by}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Created Date
                    </label>
                    <input
                      type="text"
                      value={new Date(portalInfo.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Editable Access Information Section */}
              <div className="bg-purple-50 p-6 rounded border border-purple-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                    <FaLock className="text-purple-700" />
                  </div>
                  Access Information (Editable)
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      User ID / Email / Phone Number *
                    </label>
                    <input
                      type="text"
                      name="user_identifier"
                      value={formData.user_identifier}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.user_identifier ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                      } transition-all placeholder-gray-500 text-gray-900`}
                      placeholder="Username, email, or phone number"
                    />
                    {errors.user_identifier && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.user_identifier}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded border ${
                          errors.password ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                        } transition-all placeholder-gray-500 text-gray-900 pr-12`}
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-2"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.password}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Editable Additional Information */}
              <div className="bg-gray-50 p-6 rounded border border-gray-300">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                    <FaInfoCircle className="text-gray-700" />
                  </div>
                  Additional Information (Editable)
                </h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Remark (Optional)
                  </label>
                  <textarea
                    name="remark"
                    value={formData.remark}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 rounded border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all placeholder-gray-500 text-gray-900 resize-none"
                    placeholder="Any additional remarks or notes about this portal access..."
                  />
                </div>
                
                {/* Update By Info */}
                {userInfo && (
                  <div className="mt-6 p-4 bg-white rounded border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Updated By</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {userInfo.shortName || userInfo.short_name || userInfo.name || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          SOC Portal ID: {userInfo.id || userInfo.soc_portal_id || 'N/A'}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded">
                        <FaIdCard className="text-purple-600 text-2xl" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-gray-300 space-x-4">
                <button
                  type="button"
                  onClick={() => router.push('/user_dashboard/document_hub/other_document_log/portal_tracker_log')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center px-8 py-3 bg-gradient-to-r from-purple-700 to-indigo-800 text-white rounded shadow-md hover:shadow-lg transition-all disabled:opacity-70 font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      Update Portal Information
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}