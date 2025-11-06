//app/user_dashboard/document_hub/other_document_tracker/sim_tracker/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaSimCard, FaUser, FaCalendarAlt, FaMobile,
  FaPaperPlane, FaSpinner, FaTimes, FaArrowLeft,
  FaSave, FaIdCard, FaInfoCircle, FaCheckCircle,
  FaExclamationCircle, FaSearch, FaLink
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Select from 'react-select';

const personaOptions = [
  { value: 'N/A', label: 'N/A' },
  { value: 'Customer', label: 'Customer' },
  { value: 'Agent', label: 'Agent' },
  { value: 'DSO', label: 'DSO' },
  { value: 'DH', label: 'DH' },
  { value: 'Merchant', label: 'Merchant' },
  { value: 'Distributor', label: 'Distributor' },
  { value: 'Super Distributor', label: 'Super Distributor' }
];

const profileTypeOptions = {
  'N/A': [
    { value: 'NOT_APPLICABLE', label: 'NOT APPLICABLE' }
  ],
  'Customer': [
    { value: 'FULL', label: 'FULL' },
    { value: 'RESTRICTED', label: 'RESTRICTED' },
    { value: 'DISBURSEMENT', label: 'DISBURSEMENT' },
    { value: 'PRELIMINARY', label: 'PRELIMINARY' },
    { value: 'LIMITED', label: 'LIMITED' }
  ],
  'Agent': [
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'SUSPEND', label: 'SUSPEND' },
    { value: 'CS BAR', label: 'CS BAR' }
  ],
  'DSO': [
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'SUSPEND', label: 'SUSPEND' },
    { value: 'CS BAR', label: 'CS BAR' }
  ],
  'DH': [
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'SUSPEND', label: 'SUSPEND' },
    { value: 'CS BAR', label: 'CS BAR' }
  ],
  'Merchant': [
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'SUSPEND', label: 'SUSPEND' },
    { value: 'CS BAR', label: 'CS BAR' }
  ],
  'Distributor': [
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'SUSPEND', label: 'SUSPEND' },
    { value: 'CS BAR', label: 'CS BAR' }
  ],
  'Super Distributor': [
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'SUSPEND', label: 'SUSPEND' },
    { value: 'CS BAR', label: 'CS BAR' }
  ]
};

const msisdnStatusOptions = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
  { value: 'DAMAGE', label: 'DAMAGE' }
];

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: '#f9fafb',
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

// MNO mapping based on prefix
const getMNOFromMSISDN = (msisdn) => {
  if (!msisdn || msisdn.length < 3) return '';
  
  const prefix = msisdn.substring(0, 3);
  switch (prefix) {
    case '017':
    case '013':
      return 'Grameenphone';
    case '019':
    case '014':
      return 'Banglalink';
    case '018':
      return 'Robi';
    case '016':
      return 'Airtel';
    case '015':
      return 'Teletalk';
    default:
      return '';
  }
};

export default function SimTracker() {
  const router = useRouter();
  const [formData, setFormData] = useState({
  msisdn: '',
  mno: '',
  assigned_persona: '',
  profile_type: '',
  msisdn_status: 'ACTIVE',
  device_tag: '',
  handed_over: '',
  handover_date: '',
  return_date: '',
  remark: ''
});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [duplicateCheck, setDuplicateCheck] = useState({
    checking: false,
    exists: false,
    existingSim: null
  });
  const [deviceSearch, setDeviceSearch] = useState({
    loading: false,
    devices: [],
    showDropdown: false
  });

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

  // Auto-detect MNO when MSISDN changes
  useEffect(() => {
    if (formData.msisdn && formData.msisdn.length >= 3) {
      const mno = getMNOFromMSISDN(formData.msisdn);
      setFormData(prev => ({ ...prev, mno }));
    } else {
      setFormData(prev => ({ ...prev, mno: '' }));
    }
  }, [formData.msisdn]);

  // Check for duplicate MSISDN
  const checkDuplicateMSISDN = useCallback(async (msisdn) => {
    if (!msisdn || msisdn.length !== 11) {
      setDuplicateCheck({ checking: false, exists: false, existingSim: null });
      return;
    }

    setDuplicateCheck(prev => ({ ...prev, checking: true }));

    try {
      const response = await fetch(`/api/user_dashboard/document_hub/other_document_tracker/sim_tracker/check-duplicate?msisdn=${msisdn}`);
      
      if (response.ok) {
        const result = await response.json();
        setDuplicateCheck({
          checking: false,
          exists: result.exists,
          existingSim: result.existingSim
        });

        if (result.exists) {
          toast.error(`MSISDN "${msisdn}" already exists in SIM ${result.existingSim?.st_id || 'another SIM'}`, {
            duration: 5000,
            icon: '⚠️'
          });
        }
      } else {
        setDuplicateCheck({ checking: false, exists: false, existingSim: null });
      }
    } catch (error) {
      console.error('Error checking duplicate MSISDN:', error);
      setDuplicateCheck({ checking: false, exists: false, existingSim: null });
    }
  }, []);

  // Search devices by MSISDN
  const searchDevicesByMSISDN = useCallback(async (msisdn) => {
    if (!msisdn || msisdn.length !== 11) {
      setDeviceSearch({ loading: false, devices: [], showDropdown: false });
      return;
    }

    setDeviceSearch(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch(`/api/user_dashboard/document_hub/other_document_tracker/sim_tracker/search-devices?msisdn=${msisdn}`);
      
      if (response.ok) {
        const result = await response.json();
        setDeviceSearch({
          loading: false,
          devices: result.devices || [],
          showDropdown: true
        });
      } else {
        setDeviceSearch({ loading: false, devices: [], showDropdown: false });
      }
    } catch (error) {
      console.error('Error searching devices:', error);
      setDeviceSearch({ loading: false, devices: [], showDropdown: false });
    }
  }, []);

  // Enhanced handleChange with debouncing
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Handle MSISDN changes
    if (name === 'msisdn') {
      setDuplicateCheck({ checking: false, exists: false, existingSim: null });
      setDeviceSearch({ loading: false, devices: [], showDropdown: false });
      setFormData(prev => ({ ...prev, device_tag: '' }));
    }
  };

  // Debounced effects for duplicate check and device search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.msisdn && formData.msisdn.length === 11) {
        checkDuplicateMSISDN(formData.msisdn);
        searchDevicesByMSISDN(formData.msisdn);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.msisdn, checkDuplicateMSISDN, searchDevicesByMSISDN]);

  const handlePersonaChange = (selectedOption) => {
  const persona = selectedOption?.value || '';
  
  if (persona === 'N/A') {
    // Auto-select "NOT_APPLICABLE" for profile type when N/A is selected
    setFormData(prev => ({ 
      ...prev, 
      assigned_persona: persona,
      profile_type: 'NOT_APPLICABLE'
    }));
  } else {
    setFormData(prev => ({ 
      ...prev, 
      assigned_persona: persona,
      profile_type: '' // Reset profile type when switching to non-N/A persona
    }));
  }
};

  const handleProfileTypeChange = (selectedOption) => {
    setFormData(prev => ({ ...prev, profile_type: selectedOption?.value || '' }));
  };

  const handleStatusChange = (selectedOption) => {
    setFormData(prev => ({ ...prev, msisdn_status: selectedOption?.value || 'ACTIVE' }));
  };

  const handleDeviceSelect = (device) => {
    setFormData(prev => ({ ...prev, device_tag: device.dt_id }));
    setDeviceSearch(prev => ({ ...prev, showDropdown: false }));
  };

  // Validate MSISDN format
  const isValidMSISDN = (msisdn) => {
    if (!msisdn) return false;
    const validPrefixes = ['017', '013', '019', '014', '016', '018', '015'];
    return /^\d{11}$/.test(msisdn) && validPrefixes.includes(msisdn.substring(0, 3));
  };

  const validateForm = () => {
  const newErrors = {};
  
  if (!formData.msisdn.trim()) {
    newErrors.msisdn = 'MSISDN is required';
  } else if (!isValidMSISDN(formData.msisdn)) {
    newErrors.msisdn = 'MSISDN must be 11 digits starting with 017, 013, 019, 014, 016, 018, or 015';
  } else if (duplicateCheck.exists) {
    newErrors.msisdn = `MSISDN already exists in SIM ${duplicateCheck.existingSim?.st_id || 'another SIM'}`;
  }
  
  if (!formData.assigned_persona) {
    newErrors.assigned_persona = 'Assigned Persona is required';
  }
  
  // For N/A persona, we'll auto-select "NOT_APPLICABLE", so no validation needed
  // For other personas, profile type is required
  if (formData.assigned_persona && formData.assigned_persona !== 'N/A' && !formData.profile_type) {
    newErrors.profile_type = 'Profile Type is required';
  }
  
  if (!formData.msisdn_status) {
    newErrors.msisdn_status = 'MSISDN Status is required';
  }

  // Only validate return_date if both dates are provided
  if (formData.handover_date && formData.return_date && new Date(formData.return_date) <= new Date(formData.handover_date)) {
    newErrors.return_date = 'Return date must be after handover date';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

// In your handleSubmit function, add better error handling:
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) {
    toast.error('Please fix validation errors before submitting');
    return;
  }

  if (duplicateCheck.exists) {
    toast.error('Please resolve duplicate MSISDN before submitting');
    return;
  }
  
  setIsSubmitting(true);
  
  try {
    const response = await fetch('/api/user_dashboard/document_hub/other_document_tracker/sim_tracker', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      // Handle HTTP errors (4xx, 5xx)
      throw new Error(result.message || `HTTP error! status: ${response.status}`);
    }
    
    if (result.success) {
      toast.success('SIM information saved successfully!');
      
      // Reset form
      setFormData({
        msisdn: '',
        mno: '',
        assigned_persona: '',
        profile_type: '',
        msisdn_status: 'ACTIVE',
        device_tag: '',
        handed_over: '',
        handover_date: '',
        return_date: '',
        remark: ''
      });

      setDuplicateCheck({ checking: false, exists: false, existingSim: null });
      setDeviceSearch({ loading: false, devices: [], showDropdown: false });
      
      // Redirect to SIM log page after success
      setTimeout(() => {
        router.push('/user_dashboard/document_hub/other_document_log/sim_tracker_log');
      }, 2000);
    } else {
      // Handle API success: false responses
      toast.error(result.message || 'Failed to save SIM information');
    }
  } catch (error) {
    console.error('Error saving SIM information:', error);
    
    // Show appropriate error message
    if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
      toast.error('Network error. Please check your connection and try again.');
    } else if (error.message.includes('HTTP error! status: 400')) {
      toast.error('Invalid data. Please check all fields and try again.');
    } else if (error.message.includes('HTTP error! status: 500')) {
      toast.error('Server error. Please try again later.');
    } else {
      toast.error(error.message || 'Failed to save SIM information');
    }
  } finally {
    setIsSubmitting(false);
  }
};

  // Render duplicate status
  const renderDuplicateStatus = () => {
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
          Already exists in SIM {duplicateCheck.existingSim?.st_id || 'another SIM'}
          {duplicateCheck.existingSim?.assigned_persona && (
            <span className="ml-1">({duplicateCheck.existingSim.assigned_persona})</span>
          )}
        </div>
      );
    }
    
    if (formData.msisdn && formData.msisdn.length === 11 && !duplicateCheck.exists) {
      return (
        <div className="flex items-center mt-1 text-green-600 text-sm">
          <FaCheckCircle className="mr-1 text-xs" />
          No duplicates found
        </div>
      );
    }
    
    return null;
  };

  // Render device search results
  const renderDeviceSearch = () => {
    if (!deviceSearch.showDropdown || deviceSearch.devices.length === 0) return null;

    return (
      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
        {deviceSearch.devices.map((device) => (
          <div
            key={device.dt_id}
            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            onClick={() => handleDeviceSelect(device)}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">{device.dt_id}</p>
                <p className="text-sm text-gray-600">
                  {device.brand_name} {device.device_model} • IMEI: {device.imei_1}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Tracked by: {device.track_by} • {new Date(device.created_at).toLocaleDateString()}
                </p>
              </div>
              <FaLink className="text-blue-500 mt-1 flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded shadow-lg overflow-hidden border border-gray-300">
          {/* Header */}
          <div className="relative px-8 py-6 bg-gradient-to-r from-green-900 to-teal-900 text-white border-b border-white/10 shadow-md">
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
                    SIM Tracker
                  </h1>
                  <p className="text-green-200 mt-1 text-sm md:text-base">
                    Track and manage SIM information
                  </p>
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex items-center space-x-2">
                <div className="p-2 bg-white/20 rounded">
                  <FaSimCard className="text-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* SIM Information Section */}
              <div className="bg-green-50 p-6 rounded border border-green-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <FaSimCard className="text-green-700" />
                  </div>
                  SIM Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      MSISDN (SIM Number) *
                    </label>
                    <input
                      type="text"
                      name="msisdn"
                      value={formData.msisdn}
                      onChange={handleChange}
                      maxLength={11}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.msisdn ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      } transition-all placeholder-gray-500 text-gray-900`}
                      placeholder="11-digit SIM number"
                    />
                    {errors.msisdn && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.msisdn}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Must be 11 digits starting with 017, 013, 019, 014, 016, 018, or 015
                    </p>
                    {renderDuplicateStatus()}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      MNO (Mobile Network Operator) *
                    </label>
                    <input
                      type="text"
                      name="mno"
                      value={formData.mno}
                      readOnly
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically detected from MSISDN
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Assigned Persona *
                    </label>
                    <Select
                      options={personaOptions}
                      value={personaOptions.find(opt => opt.value === formData.assigned_persona)}
                      onChange={handlePersonaChange}
                      styles={customStyles}
                      className="rounded"
                      classNamePrefix="select"
                      placeholder="Select assigned persona..."
                    />
                    {errors.assigned_persona && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.assigned_persona}
                      </p>
                    )}
                  </div>

                  <div>
  <label className="block text-sm font-medium text-gray-900 mb-2">
    Profile Type *
  </label>
  <Select
    options={profileTypeOptions[formData.assigned_persona] || []}
    value={(profileTypeOptions[formData.assigned_persona] || []).find(opt => opt.value === formData.profile_type)}
    onChange={handleProfileTypeChange}
    styles={customStyles}
    className="rounded"
    classNamePrefix="select"
    placeholder={
      formData.assigned_persona 
        ? "Select profile type..." 
        : "Select persona first"
    }
    isDisabled={!formData.assigned_persona}
  />
  {errors.profile_type && (
    <p className="mt-2 text-sm text-red-600 flex items-center">
      <FaTimes className="mr-1 text-xs" /> {errors.profile_type}
    </p>
  )}
  {formData.assigned_persona === 'N/A' && (
    <p className="text-xs text-gray-500 mt-1">
      Profile type automatically set to &quot;NOT APPLICABLE&quot; for N/A persona
    </p>
  )}
</div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      MSISDN Status *
                    </label>
                    <Select
                      options={msisdnStatusOptions}
                      value={msisdnStatusOptions.find(opt => opt.value === formData.msisdn_status)}
                      onChange={handleStatusChange}
                      styles={customStyles}
                      className="rounded"
                      classNamePrefix="select"
                      placeholder="Select MSISDN status..."
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Device Tag (Auto-detected)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="device_tag"
                        value={formData.device_tag}
                        readOnly
                        className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed pr-10"
                        placeholder="Will auto-detect if SIM is bound to any device"
                      />
                      {deviceSearch.loading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <FaSpinner className="animate-spin text-blue-500" />
                        </div>
                      )}
                      {!deviceSearch.loading && formData.msisdn && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <FaSearch className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    {renderDeviceSearch()}
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically detected from device tracker
                    </p>
                  </div>
                </div>
              </div>

              {/* Handover Information Section */}
              <div className="bg-purple-50 p-6 rounded border border-purple-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                    <FaUser className="text-purple-700" />
                  </div>
                  Handover Information (Optional)
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Handed Over To
                    </label>
                    <input
                      type="text"
                      name="handed_over"
                      value={formData.handed_over}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all placeholder-gray-500 text-gray-900"
                      placeholder="Person receiving the SIM (optional)"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Handover Date
                      </label>
                      <input
                        type="date"
                        name="handover_date"
                        value={formData.handover_date}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Return Date
                      </label>
                      <input
                        type="date"
                        name="return_date"
                        value={formData.return_date}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded border ${
                          errors.return_date ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        } transition-all text-gray-900`}
                      />
                      {errors.return_date && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <FaTimes className="mr-1 text-xs" /> {errors.return_date}
                        </p>
                      )}
                    </div>
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
                    placeholder="Any additional remarks or notes..."
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
                      <div className="p-3 bg-green-100 rounded">
                        <FaIdCard className="text-green-600 text-2xl" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-gray-300">
                <button
                  type="button"
                  onClick={() => router.push('/user_dashboard/document_hub/other_document_tracker')}
                  className="mr-4 px-6 py-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || duplicateCheck.exists}
                  className="flex items-center px-8 py-3 bg-gradient-to-r from-green-700 to-teal-800 text-white rounded shadow-md hover:shadow-lg transition-all disabled:opacity-70 font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      Save SIM Information
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