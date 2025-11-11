// app/user_dashboard/document_hub/other_document_tracker/portal_tracker/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaCog, FaUser, FaCalendarAlt, FaGlobe,
  FaPaperPlane, FaSpinner, FaTimes, FaArrowLeft,
  FaSave, FaIdCard, FaInfoCircle, FaCheckCircle,
  FaExclamationCircle, FaSearch, FaLink, FaLock
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Select from 'react-select';

const portalCategoryOptions = [
  { value: 'Staging Web', label: 'Staging Web' },
  { value: 'Live Web', label: 'Live Web' },
  { value: 'GPCMP', label: 'GPCMP' },
  { value: 'Remittance', label: 'Remittance' },
  { value: 'Ticket', label: 'Ticket' },
  { value: 'Service Desk', label: 'Service Desk' },
  { value: 'Add Money', label: 'Add Money' },
  { value: 'TM & CCBP', label: 'TM & CCBP' },
  { value: 'Website Monitor', label: 'Website Monitor' },
  { value: 'Kibana', label: 'Kibana' },
  { value: 'Grafana', label: 'Grafana' },
  { value: 'EIP Trend', label: 'EIP Trend' },
  { value: 'Notification', label: 'Notification' },
  { value: 'Queue Monitor', label: 'Queue Monitor' },
  { value: 'DB Monitor', label: 'DB Monitor' },
  { value: 'Biller Monitor', label: 'Biller Monitor' },
  { value: 'Campaign Monitor', label: 'Campaign Monitor' },
  { value: 'OPS Navigator', label: 'OPS Navigator' },
  { value: 'F5 Dashboard', label: 'F5 Dashboard' },
  { value: 'Zabbix', label: 'Zabbix' }
];

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: state.isDisabled ? '#f3f4f6' : '#f9fafb',
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    borderRadius: '0.5rem',
    padding: '0.25rem',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#3b82f6' : '#9ca3af'
    },
    minHeight: '42px'
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#e5e7eb' : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#1f2937',
    padding: '0.5rem 1rem'
  })
};

export default function PortalTracker() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    portal_category: '',
    portal_name: '',
    portal_url: '',
    user_identifier: '',
    password: '',
    role: '',
    remark: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [duplicateCheck, setDuplicateCheck] = useState({
    checking: false,
    exists: false,
    existingPortal: null
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/user_dashboard/user_info');
        if (!response.ok) throw new Error('Failed to fetch user info');
        const userData = await response.json();
        setUserInfo(userData);
      } catch (error) {
        console.error('Error fetching user info:', error);
        toast.error('Failed to load user information');
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    // Check for pre-filled data from sessionStorage
    const prefillData = sessionStorage.getItem('portal_prefill_data');
    
    if (prefillData) {
      try {
        const data = JSON.parse(prefillData);
        console.log('Prefill data received:', data); // Debug log
        
        setFormData(prev => ({
          ...prev,
          portal_url: data.portal_url || '',
          portal_name: data.portal_name || '',
          portal_category: data.portal_category || ''
        }));
        
        // Set read-only state for pre-filled fields
        setIsReadOnly(data.isReadOnly || false);
        
        console.log('Form data after prefill:', { // Debug log
          portal_url: data.portal_url,
          portal_name: data.portal_name,
          portal_category: data.portal_category,
          isReadOnly: data.isReadOnly
        });
        
      } catch (error) {
        console.error('Error parsing prefill data:', error);
        toast.error('Error loading pre-filled data');
      }
    }
  }, []);

  // Auto-fill portal category from portal name when category is empty
  useEffect(() => {
    if (!formData.portal_category && formData.portal_name) {
      const matchingCategory = portalCategoryOptions.find(
        category => category.value.toLowerCase().includes(formData.portal_name.toLowerCase()) ||
                   formData.portal_name.toLowerCase().includes(category.value.toLowerCase())
      );
      
      if (matchingCategory) {
        setFormData(prev => ({ ...prev, portal_category: matchingCategory.value }));
      }
    }
  }, [formData.portal_name, formData.portal_category]);

  // Check for duplicate Portal URL + Role + User combination
  const checkDuplicateURL = useCallback(async (url, role, userIdentifier) => {
    if (!url || !role || !userIdentifier) {
      setDuplicateCheck({ checking: false, exists: false, existingPortal: null });
      return;
    }

    // Skip duplicate check for pre-filled URLs when adding new role
    if (isReadOnly) {
      setDuplicateCheck({ checking: false, exists: false, existingPortal: null });
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setDuplicateCheck({ checking: false, exists: false, existingPortal: null });
      return;
    }

    setDuplicateCheck(prev => ({ ...prev, checking: true }));

    try {
      const response = await fetch(
        `/api/user_dashboard/document_hub/other_document_tracker/portal_tracker?url=${encodeURIComponent(url)}&role=${encodeURIComponent(role)}&user=${encodeURIComponent(userIdentifier)}`
      );
      
      if (response.ok) {
        const result = await response.json();
        setDuplicateCheck({
          checking: false,
          exists: result.exists,
          existingPortal: result.existingPortal
        });

        if (result.exists) {
          toast.error(`Portal URL with same role and user already exists in Portal ${result.existingPortal?.pt_id || 'another portal'}`, {
            duration: 5000,
            icon: '⚠️'
          });
        }
      } else {
        setDuplicateCheck({ checking: false, exists: false, existingPortal: null });
      }
    } catch (error) {
      console.error('Error checking duplicate:', error);
      setDuplicateCheck({ checking: false, exists: false, existingPortal: null });
    }
  }, [isReadOnly]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Don't allow changes to read-only fields
    if (isReadOnly && (name === 'portal_url' || name === 'portal_name' || name === 'portal_category')) {
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Handle URL changes
    if (name === 'portal_url') {
      setDuplicateCheck({ checking: false, exists: false, existingPortal: null });
    }
  };

  const handleCategoryChange = (selectedOption) => {
    // Don't allow changes to read-only fields
    if (isReadOnly) return;
    
    setFormData(prev => ({ ...prev, portal_category: selectedOption?.value || '' }));
  };

  // Update the useEffect to include all three fields
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.portal_url && formData.role && formData.user_identifier) {
        checkDuplicateURL(formData.portal_url, formData.role, formData.user_identifier);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.portal_url, formData.role, formData.user_identifier, checkDuplicateURL]);

  // Validate URL format
  const isValidURL = (url) => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.portal_category?.trim()) {
      newErrors.portal_category = 'Portal Category is required';
    }
    
    if (!formData.portal_name?.trim()) {
      newErrors.portal_name = 'Portal Name is required';
    }
    
    if (!formData.portal_url?.trim()) {
      newErrors.portal_url = 'Portal URL is required';
    } else if (!isValidURL(formData.portal_url)) {
      newErrors.portal_url = 'Please enter a valid URL (e.g., https://example.com)';
    } else if (duplicateCheck.exists && !isReadOnly) {
      newErrors.portal_url = `Portal URL with same role and user already exists in Portal ${duplicateCheck.existingPortal?.pt_id || 'another portal'}`;
    }
    
    if (!formData.user_identifier?.trim()) {
      newErrors.user_identifier = 'User ID/Email/Phone Number is required';
    }
    
    if (!formData.password?.trim()) {
      newErrors.password = 'Password is required';
    }
    
    if (!formData.role?.trim()) {
      newErrors.role = 'Role is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix validation errors before submitting');
      return;
    }

    if (duplicateCheck.exists && !isReadOnly) {
      toast.error('Please resolve duplicate Portal URL before submitting');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/user_dashboard/document_hub/other_document_tracker/portal_tracker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }
      
      if (result.success) {
        const successMessage = isReadOnly 
          ? 'New role added to portal successfully!' 
          : 'Portal information saved successfully!';
        
        toast.success(successMessage);
        
        // Reset form
        setFormData({
          portal_category: '',
          portal_name: '',
          portal_url: '',
          user_identifier: '',
          password: '',
          role: '',
          remark: ''
        });

        setDuplicateCheck({ checking: false, exists: false, existingPortal: null });
        setIsReadOnly(false);
        
        // Redirect to portal log page after success
        setTimeout(() => {
          router.push('/user_dashboard/document_hub/other_document_log/portal_tracker_log');
        }, 2000);
      } else {
        toast.error(result.message || 'Failed to save portal information');
      }
    } catch (error) {
      console.error('Error saving portal information:', error);
      
      if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else if (error.message.includes('HTTP error! status: 400')) {
        toast.error('Invalid data. Please check all fields and try again.');
      } else if (error.message.includes('HTTP error! status: 500')) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error(error.message || 'Failed to save portal information');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render duplicate status
  const renderDuplicateStatus = () => {
    if (isReadOnly) {
      return (
        <div className="flex items-center mt-1 text-blue-600 text-sm">
          <FaInfoCircle className="mr-1 text-xs" />
          Adding new role to existing portal
        </div>
      );
    }
    
    if (duplicateCheck.checking) {
      return (
        <div className="flex items-center mt-1 text-blue-600 text-sm">
          <FaSpinner className="animate-spin mr-1 text-xs" />
          Checking for duplicates...
        </div>
      );
    }
    
    if (duplicateCheck.exists) {
      return (
        <div className="flex items-center mt-1 text-red-600 text-sm">
          <FaExclamationCircle className="mr-1 text-xs" />
          Already exists in Portal {duplicateCheck.existingPortal?.pt_id || 'another portal'}
          {duplicateCheck.existingPortal?.portal_name && (
            <span className="ml-1">({duplicateCheck.existingPortal.portal_name})</span>
          )}
        </div>
      );
    }
    
    if (formData.portal_url && isValidURL(formData.portal_url) && !duplicateCheck.exists) {
      return (
        <div className="flex items-center mt-1 text-green-600 text-sm">
          <FaCheckCircle className="mr-1 text-xs" />
          No duplicates found
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded shadow-lg overflow-hidden border border-gray-300">
          {/* Header */}
          <div className="relative px-8 py-6 bg-gradient-to-r from-purple-900 to-indigo-900 text-white border-b border-white/10 shadow-md">
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => router.push('/user_dashboard/document_hub/other_document_tracker')}
                  className="mr-4 p-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
                >
                  <FaArrowLeft />
                </button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                    {isReadOnly ? 'Add New Role to Portal' : 'Portal Tracker'}
                  </h1>
                  <p className="text-purple-200 mt-1 text-sm md:text-base">
                    {isReadOnly ? 'Add a new role to existing portal' : 'Track and manage portal access information'}
                  </p>
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex items-center space-x-2">
                {isReadOnly && (
                  <div className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-medium">
                    Adding Role
                  </div>
                )}
                <div className="p-2 bg-white/20 rounded">
                  <FaCog className="text-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Portal Information Section */}
              <div className="bg-purple-50 p-6 rounded border border-purple-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                    <FaGlobe className="text-purple-700" />
                  </div>
                  Portal Information
                  {isReadOnly && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      Pre-filled from existing portal
                    </span>
                  )}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Portal Category *
                      {isReadOnly && <span className="text-blue-600 text-xs ml-1">(Pre-filled)</span>}
                    </label>
                    <Select
                      options={portalCategoryOptions}
                      value={portalCategoryOptions.find(opt => opt.value === formData.portal_category)}
                      onChange={handleCategoryChange}
                      styles={customStyles}
                      className="rounded"
                      classNamePrefix="select"
                      placeholder="Select portal category..."
                      isDisabled={isReadOnly}
                    />
                    {errors.portal_category && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.portal_category}
                      </p>
                    )}
                    {!isReadOnly && (
                      <p className="text-xs text-gray-500 mt-1">
                        Will auto-suggest based on portal name if left empty
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Portal Name *
                      {isReadOnly && <span className="text-blue-600 text-xs ml-1">(Pre-filled)</span>}
                    </label>
                    <input
                      type="text"
                      name="portal_name"
                      value={formData.portal_name}
                      onChange={handleChange}
                      readOnly={isReadOnly}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.portal_name ? 'border-red-500 ring-2 ring-red-200' : 
                        isReadOnly ? 'border-gray-300 bg-gray-100 cursor-not-allowed text-gray-700' : 
                        'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      } transition-all placeholder-gray-500`}
                      placeholder="Enter portal name"
                    />
                    {errors.portal_name && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.portal_name}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Portal URL *
                      {isReadOnly && <span className="text-blue-600 text-xs ml-1">(Pre-filled)</span>}
                    </label>
                    <input
                      type="url"
                      name="portal_url"
                      value={formData.portal_url}
                      onChange={handleChange}
                      readOnly={isReadOnly}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.portal_url ? 'border-red-500 ring-2 ring-red-200' : 
                        isReadOnly ? 'border-gray-300 bg-gray-100 cursor-not-allowed text-gray-700' : 
                        'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      } transition-all placeholder-gray-500`}
                      placeholder="https://example.com"
                    />
                    {errors.portal_url && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.portal_url}
                      </p>
                    )}
                    {renderDuplicateStatus()}
                  </div>
                </div>
              </div>

              {/* Rest of your form remains the same... */}
              {/* Access Information Section */}
              <div className="bg-blue-50 p-6 rounded border border-blue-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <FaLock className="text-blue-700" />
                  </div>
                  Access Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      User ID / Email / Phone Number *
                    </label>
                    <input
                      type="text"
                      name="user_identifier"
                      value={formData.user_identifier}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.user_identifier ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      } transition-all placeholder-gray-500 text-gray-900`}
                      placeholder="Username, email, or phone number"
                    />
                    {errors.user_identifier && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.user_identifier}
                      </p>
                    )}
                  </div>

                  <div className="relative">
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
                          errors.password ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        } transition-all placeholder-gray-500 text-gray-900 pr-10`}
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <FaTimes /> : <FaLock />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.password}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Role *
                    </label>
                    <input
                      type="text"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.role ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      } transition-all placeholder-gray-500 text-gray-900`}
                      placeholder="e.g., Admin, User, Viewer, etc."
                    />
                    {errors.role && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.role}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-gray-50 p-6 rounded border border-gray-300">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                    <FaInfoCircle className="text-gray-700" />
                  </div>
                  Additional Information
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
                    className="w-full px-4 py-3 rounded border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all placeholder-gray-500 text-gray-900 resize-none"
                    placeholder="Any additional remarks or notes about this portal access..."
                  />
                </div>
                
                {/* Tracked By Info */}
                {userInfo && (
                  <div className="mt-6 p-4 bg-white rounded border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Tracked By</p>
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
              <div className="flex justify-end pt-6 border-t border-gray-300">
                <button
                  type="button"
                  onClick={() => {
                    setIsReadOnly(false);
                    router.push('/user_dashboard/document_hub/other_document_tracker');
                  }}
                  className="mr-4 px-6 py-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (duplicateCheck.exists && !isReadOnly)}
                  className="flex items-center px-8 py-3 bg-gradient-to-r from-purple-700 to-indigo-800 text-white rounded shadow-md hover:shadow-lg transition-all disabled:opacity-70 font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      {isReadOnly ? 'Adding Role...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      {isReadOnly ? 'Add New Role' : 'Save Portal Information'}
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