//app/user_dashboard/document_hub/other_document_tracker/sim_tracker/edit/[st_id]/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  FaSimCard, FaUser, FaCalendarAlt, FaMobile,
  FaPaperPlane, FaSpinner, FaTimes, FaArrowLeft,
  FaSave, FaIdCard, FaInfoCircle, FaBullseye,
  FaCheckCircle, FaExclamationTriangle, FaExclamationCircle,
  FaEdit, FaSearch, FaLink
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Select from 'react-select';

const personaOptions = [
  { value: 'Customer', label: 'Customer' },
  { value: 'Agent', label: 'Agent' },
  { value: 'DSO', label: 'DSO' },
  { value: 'DH', label: 'DH' },
  { value: 'Merchant', label: 'Merchant' },
  { value: 'Distributor', label: 'Distributor' },
  { value: 'Super Distributor', label: 'Super Distributor' }
];

const profileTypeOptions = {
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
    borderColor: state.isFocused ? '#10b981' : '#d1d5db',
    borderRadius: '0.5rem',
    padding: '0.25rem',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(16, 185, 129, 0.2)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#10b981' : '#9ca3af'
    },
    minHeight: '42px'
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#10b981' : state.isFocused ? '#e5e7eb' : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#1f2937',
    padding: '0.5rem 1rem'
  })
};

export default function EditSimTracker() {
  const router = useRouter();
  const params = useParams();
  const st_id = params.st_id;

  const [formData, setFormData] = useState({
    assigned_persona: '',
    profile_type: '',
    msisdn_status: 'ACTIVE',
    handed_over: '',
    handover_date: '',
    return_date: '',
    remark: ''
  });
  
  const [simInfo, setSimInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [currentDeviceInfo, setCurrentDeviceInfo] = useState(null);
  const [isCheckingCurrentDevice, setIsCheckingCurrentDevice] = useState(false);
  
  // State for device checking
  const [deviceCheck, setDeviceCheck] = useState({
    loading: false,
    devices: [],
    showResults: false
  });

  // Add this useEffect after your existing useEffect hooks
useEffect(() => {
  const fetchCurrentDeviceInfo = async () => {
    if (simInfo?.device_tag) {
      setIsCheckingCurrentDevice(true);
      try {
        const response = await fetch(`/api/user_dashboard/document_hub/other_document_tracker/device_tracker/${simInfo.device_tag}`);
        
        if (response.ok) {
          const deviceData = await response.json();
          if (deviceData.success) {
            setCurrentDeviceInfo(deviceData.data);
          }
        }
      } catch (error) {
        console.error('Error fetching current device info:', error);
      } finally {
        setIsCheckingCurrentDevice(false);
      }
    } else {
      setCurrentDeviceInfo(null);
    }
  };

  if (simInfo) {
    fetchCurrentDeviceInfo();
  }
}, [simInfo]);

  // Fetch SIM data and user info
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch SIM information
        const simResponse = await fetch(`/api/user_dashboard/document_hub/other_document_tracker/sim_tracker/${st_id}`);
        
        if (!simResponse.ok) {
          throw new Error('Failed to fetch SIM information');
        }
        
        const simData = await simResponse.json();
        
        if (simData.success) {
          setSimInfo(simData.data);
          // Pre-fill form with existing data
          setFormData({
            assigned_persona: simData.data.assigned_persona || '',
            profile_type: simData.data.profile_type || '',
            msisdn_status: simData.data.msisdn_status || 'ACTIVE',
            handed_over: simData.data.handed_over || '',
            handover_date: simData.data.handover_date || '',
            return_date: simData.data.return_date || '',
            remark: simData.data.remark || ''
          });
        } else {
          throw new Error(simData.message);
        }

        // Fetch user information
        const userResponse = await fetch('/api/user_dashboard/user_info');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserInfo(userData);
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load SIM information');
        router.push('/user_dashboard/document_hub/other_document_log/sim_tracker_log');
      } finally {
        setIsLoading(false);
      }
    };

    if (st_id) {
      fetchData();
    }
  }, [st_id, router]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle persona change - reset profile type when persona changes
  const handlePersonaChange = (selectedOption) => {
    const persona = selectedOption?.value || '';
    setFormData(prev => ({ 
      ...prev, 
      assigned_persona: persona,
      profile_type: '' // Reset profile type when persona changes
    }));
  };

  const handleProfileTypeChange = (selectedOption) => {
    setFormData(prev => ({ ...prev, profile_type: selectedOption?.value || '' }));
  };

  const handleStatusChange = (selectedOption) => {
    setFormData(prev => ({ ...prev, msisdn_status: selectedOption?.value || 'ACTIVE' }));
  };

// Check for devices bound to this SIM
const handleCheckDevices = async () => {
  if (!simInfo?.msisdn) {
    toast.error('No MSISDN available to check');
    return;
  }

  setDeviceCheck({ loading: true, devices: [], showResults: false });

  try {
    const response = await fetch(`/api/user_dashboard/document_hub/other_document_tracker/sim_tracker/check-devices?msisdn=${simInfo.msisdn}`);
    
    if (!response.ok) {
      throw new Error('Failed to check devices');
    }

    const result = await response.json();
    
    if (result.success) {
      setDeviceCheck({
        loading: false,
        devices: result.devices || [],
        showResults: true
      });

      if (result.devices.length === 0) {
        toast.success('No devices found bound to this SIM');
      } else {
        toast.success(`Found ${result.devices.length} device(s) bound to this SIM`);
      }
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error checking devices:', error);
    toast.error('Failed to check devices');
    setDeviceCheck({ loading: false, devices: [], showResults: false });
  }
};

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.assigned_persona) {
      newErrors.assigned_persona = 'Assigned Persona is required';
    }
    
    if (!formData.profile_type) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/user_dashboard/document_hub/other_document_tracker/sim_tracker/${st_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('SIM information updated successfully!');
        
        // Redirect to SIM log page after success
        setTimeout(() => {
          router.push('/user_dashboard/document_hub/other_document_log/sim_tracker_log');
        }, 1500);
      } else {
        toast.error(result.message || 'Failed to update SIM information');
      }
    } catch (error) {
      console.error('Error updating SIM information:', error);
      toast.error('Failed to update SIM information');
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
              <FaSpinner className="animate-spin text-4xl text-green-600 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Loading SIM information...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!simInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <FaExclamationCircle className="text-4xl text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">SIM Not Found</h2>
            <p className="text-gray-600 mb-6">The SIM you&apos;re trying to edit doesn&apos;t exist.</p>
            <button
              onClick={() => router.push('/user_dashboard/document_hub/other_document_log/sim_tracker_log')}
              className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Back to SIM Log
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
          <div className="relative px-8 py-6 bg-gradient-to-r from-green-900 to-emerald-900 text-white border-b border-white/10 shadow-md">
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => router.push('/user_dashboard/document_hub/other_document_log/sim_tracker_log')}
                  className="mr-4 p-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
                >
                  <FaArrowLeft />
                </button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                    Edit SIM Information
                  </h1>
                  <p className="text-green-200 mt-1 text-sm md:text-base">
                    Update SIM details for {simInfo.st_id}
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
              {/* SIM Information Section (Read-only) */}
              <div className="bg-slate-50 p-6 rounded border border-slate-300">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mr-3">
                    <FaSimCard className="text-slate-600" />
                  </div>
                  SIM Information (Read Only)
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tracking ID
                    </label>
                    <input
                      type="text"
                      value={simInfo.st_id}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      MSISDN
                    </label>
                    <input
                      type="text"
                      value={simInfo.msisdn}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed font-mono"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      MNO
                    </label>
                    <input
                      type="text"
                      value={simInfo.mno}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Originally Tracked By
                    </label>
                    <input
                      type="text"
                      value={simInfo.track_by}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                </div>

{/* Device Binding Section */}
<div className="mt-6 pt-6 border-t border-slate-300">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h3 className="text-md font-semibold text-gray-900 mb-2">
        Device Binding Status
      </h3>
      <p className="text-sm text-gray-700">
        {simInfo?.device_tag 
          ? "This SIM is currently bound to a device" 
          : "Check if this SIM is currently bound to any devices"
        }
      </p>
    </div>
    
    {/* Show Check Button only if no device tag exists */}
    {!simInfo?.device_tag && (
      <button
        type="button"
        onClick={handleCheckDevices}
        disabled={deviceCheck.loading}
        className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl font-medium"
      >
        {deviceCheck.loading ? (
          <>
            <FaSpinner className="animate-spin mr-2" />
            Checking...
          </>
        ) : (
          <>
            <FaSearch className="mr-2" />
            Check Device Binding
          </>
        )}
      </button>
    )}
  </div>

  {/* Show Current Device Info if device tag exists */}
  {simInfo?.device_tag && (
    <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
      <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
        <FaLink className="mr-2" />
        Currently Bound Device
      </h4>
      
      {isCheckingCurrentDevice ? (
        <div className="flex items-center justify-center py-4">
          <FaSpinner className="animate-spin text-blue-600 mr-2" />
          <span className="text-blue-800 font-medium">Loading device information...</span>
        </div>
      ) : currentDeviceInfo ? (
        <div className="bg-white p-4 rounded border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-semibold text-gray-900">Device ID:</span>
              <span className="ml-2 text-blue-700 font-bold">{currentDeviceInfo.dt_id}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Brand/Model:</span>
              <span className="ml-2 text-gray-800">{currentDeviceInfo.brand_name} {currentDeviceInfo.device_model}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">IMEI 1:</span>
              <span className="ml-2 font-mono text-gray-800">{currentDeviceInfo.imei_1}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">IMEI 2:</span>
              <span className="ml-2 font-mono text-gray-800">{currentDeviceInfo.imei_2 || 'N/A'}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Tracked By:</span>
              <span className="ml-2 text-gray-800">{currentDeviceInfo.track_by}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Device Status:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                currentDeviceInfo.device_status === 'Working' 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                {currentDeviceInfo.device_status}
              </span>
            </div>
            {currentDeviceInfo.device_status === 'Not Working' && currentDeviceInfo.device_status_details && (
              <div className="md:col-span-2">
                <span className="font-semibold text-gray-900">Status Details:</span>
                <span className="ml-2 text-amber-800 font-medium">{currentDeviceInfo.device_status_details}</span>
              </div>
            )}
            <div className="md:col-span-2">
              <span className="font-semibold text-gray-900">Purpose:</span>
              <span className="ml-2 text-gray-800">{currentDeviceInfo.purpose}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 p-3 rounded border border-amber-300">
          <div className="flex items-center text-amber-900">
            <FaExclamationCircle className="mr-2" />
            <span className="font-medium">
              This SIM is tagged with device <strong>{simInfo.device_tag}</strong>, but the device information could not be loaded.
            </span>
          </div>
        </div>
      )}
    </div>
  )}

  {/* Device Check Results (for manual checks when no device tag exists) */}
  {!simInfo?.device_tag && deviceCheck.showResults && (
    <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
      <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
        <FaLink className="mr-2" />
        Device Binding Results
      </h4>
      
      {deviceCheck.devices.length === 0 ? (
        <p className="text-blue-800 font-medium">
          No devices are currently bound to this SIM.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-blue-800 font-semibold">
            Found {deviceCheck.devices.length} device(s) bound to this SIM:
          </p>
          {deviceCheck.devices.map((device) => (
            <div key={device.dt_id} className="bg-white p-3 rounded border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-semibold text-gray-900">Device ID:</span>
                  <span className="ml-2 text-blue-700 font-bold">{device.dt_id}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Brand/Model:</span>
                  <span className="ml-2 text-gray-800">{device.brand_name} {device.device_model}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">IMEI 1:</span>
                  <span className="ml-2 font-mono text-gray-800">{device.imei_1}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Tracked By:</span>
                  <span className="ml-2 text-gray-800">{device.track_by}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-semibold text-gray-900">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                    device.device_status === 'Working' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {device.device_status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )}
</div>
              </div>

              {/* Editable SIM Status and Persona Section */}
              <div className="bg-green-50 p-6 rounded border border-green-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <FaSimCard className="text-green-700" />
                  </div>
                  SIM Status & Persona (Editable)
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Assigned Persona */}
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

                  {/* Profile Type */}
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
                      placeholder={formData.assigned_persona ? "Select profile type..." : "Select persona first"}
                      isDisabled={!formData.assigned_persona}
                    />
                    {errors.profile_type && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.profile_type}
                      </p>
                    )}
                  </div>

                  {/* MSISDN Status */}
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
                    {errors.msisdn_status && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.msisdn_status}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Editable Handover Information Section */}
              <div className="bg-purple-50 p-6 rounded border border-purple-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                    <FaUser className="text-purple-700" />
                  </div>
                  Handover Information (Editable)
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
                      className="w-full px-4 py-3 rounded border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all placeholder-gray-500 text-gray-900"
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
                        className="w-full px-4 py-3 rounded border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-gray-900"
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
                          errors.return_date ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200'
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
                    className="w-full px-4 py-3 rounded border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all placeholder-gray-500 text-gray-900 resize-none"
                    placeholder="Any additional remarks or notes..."
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
                      <div className="p-3 bg-green-100 rounded">
                        <FaIdCard className="text-green-600 text-2xl" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-gray-300 space-x-4">
                <button
                  type="button"
                  onClick={() => router.push('/user_dashboard/document_hub/other_document_log/sim_tracker_log')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center px-8 py-3 bg-gradient-to-r from-green-700 to-emerald-800 text-white rounded shadow-md hover:shadow-lg transition-all disabled:opacity-70 font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      Update SIM Information
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