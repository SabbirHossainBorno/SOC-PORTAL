// app/user_dashboard/document_hub/other_document_tracker/device_tracker/edit/[dt_id]/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  FaMobile, FaSimCard, FaUser, FaCalendarAlt,
  FaPaperPlane, FaSpinner, FaTimes, FaArrowLeft,
  FaSave, FaIdCard, FaInfoCircle, FaBullseye,
  FaCheckCircle, FaExclamationTriangle, FaExclamationCircle,
  FaEdit, FaUnlink
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Select from 'react-select';

const personaOptions = [
  { value: 'Customer', label: 'Customer' },
  { value: 'Agent', label: 'Agent' },
  { value: 'DSO', label: 'DSO' },
  { value: 'Merchant', label: 'Merchant' },
  { value: 'Distributor', label: 'Distributor' },
  { value: 'Super Distributor', label: 'Super Distributor' }
];

const deviceStatusOptions = [
  { value: 'Working', label: 'Working' },
  { value: 'Not Working', label: 'Not Working' }
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

export default function EditDeviceTracker() {
  const router = useRouter();
  const params = useParams();
  const dt_id = params.dt_id;

    // Add these states for permission checking
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);

  const [formData, setFormData] = useState({
    sim_1: '',
    sim_1_persona: '',
    sim_2: '',
    sim_2_persona: '',
    purpose: '',
    handover_to: '',
    handover_date: '',
    return_date: '',
    remark: '',
    device_status: 'Working',
    device_status_details: ''
  });
  
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
  const checkEditPermission = async () => {
    try {
      const cookies = document.cookie.split(';');
      const socPortalIdCookie = cookies.find(c => c.trim().startsWith('socPortalId='));
      const roleTypeCookie = cookies.find(c => c.trim().startsWith('roleType='));
      
      if (socPortalIdCookie && roleTypeCookie) {
        const socPortalId = socPortalIdCookie.split('=')[1];
        const roleType = roleTypeCookie.split('=')[1];

        const response = await fetch(
          `/api/admin_dashboard/role_permission/role_management/user_permissions?soc_portal_id=${socPortalId}&role_type=${roleType}`
        );
        const data = await response.json();
        
        if (data.success) {
          // Check for base path permission (simplified)
          const editPermission = data.permissions.includes(
            '/user_dashboard/document_hub/other_document_tracker/device_tracker/edit'
          );
          
          setHasEditPermission(editPermission);
          
          if (!editPermission) {
            toast.error('You do not have permission to edit access forms');
            return;
          }
        } else {
          toast.error('Failed to verify permissions');
          return;
        }
      } else {
        toast.error('User information not found');
        return;
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      toast.error('Error verifying permissions');
    } finally {
      setPermissionLoading(false);
    }
  };

  checkEditPermission();
}, [router]);

  
  
  // New state for duplicate checks and unbind popup
  const [duplicateChecks, setDuplicateChecks] = useState({
    sim_1: { checking: false, exists: false, existingDevice: null },
    sim_2: { checking: false, exists: false, existingDevice: null }
  });
  
  const [unbindPopup, setUnbindPopup] = useState({
    open: false,
    device: null,
    field: null,
    simNumber: null,
    loading: false
  });

  // Debounced duplicate check
  // In the checkDuplicate function in the edit page, update the API call:
const checkDuplicate = useCallback(async (field, value, currentDeviceId) => {
  // Don't check if value is too short or empty
  if (!value || value.length < 5) {
    setDuplicateChecks(prev => ({
      ...prev,
      [field]: { checking: false, exists: false, existingDevice: null }
    }));
    return;
  }

  // Only check SIM when it's exactly 11 digits
  if (field.startsWith('sim') && value.length !== 11) {
    setDuplicateChecks(prev => ({
      ...prev,
      [field]: { checking: false, exists: false, existingDevice: null }
    }));
    return;
  }

  setDuplicateChecks(prev => ({
    ...prev,
    [field]: { ...prev[field], checking: true }
  }));

  try {
    // Pass the current device ID to exclude it from duplicate checks
    const response = await fetch(`/api/user_dashboard/document_hub/other_document_tracker/device_tracker/check-duplicate?field=${field}&value=${value}&excludeDevice=${currentDeviceId}`);
    
    if (response.ok) {
      const result = await response.json();
      
      setDuplicateChecks(prev => ({
        ...prev,
        [field]: {
          checking: false,
          exists: result.exists,
          existingDevice: result.existingDevice,
          isSim: result.isSim
        }
      }));

      if (result.exists && result.isSim) {
  // For SIM duplicates, show a different toast with unbind option
  toast.error(
    (t) => (
      <div className="flex items-center">
        <FaExclamationCircle className="text-red-500 mr-2" />
        <span>
          {field.toUpperCase()} &quot;{value}&quot; is already bound to device {result.existingDevice?.dt_id}
        </span>
        <button
          type="button" // Add this
          onClick={(e) => {
            e.stopPropagation(); // Add this
            e.preventDefault(); // Add this
            setUnbindPopup({
              open: true,
              device: result.existingDevice,
              field: field,
              simNumber: value
            });
            toast.dismiss(t.id);
          }}
          className="ml-3 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
        >
          <FaUnlink className="inline mr-1" />
          Unbind
        </button>
      </div>
    ),
    {
      duration: 8000,
      icon: '⚠️'
    }
  );
} else if (result.exists) {
        toast.error(`${field.toUpperCase()} "${value}" already exists in device ${result.existingDevice?.dt_id || 'unknown'}`, {
          duration: 5000,
          icon: '⚠️'
        });
      }
    } else {
      // If API fails, don't block the user, just mark as not checking
      setDuplicateChecks(prev => ({
        ...prev,
        [field]: { checking: false, exists: false, existingDevice: null }
      }));
    }
  } catch (error) {
    console.error('Error checking duplicate:', error);
    // On error, don't block the user
    setDuplicateChecks(prev => ({
      ...prev,
      [field]: { checking: false, exists: false, existingDevice: null }
    }));
  }
}, []);

  // Fetch device data and user info
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch device information
        const deviceResponse = await fetch(`/api/user_dashboard/document_hub/other_document_tracker/device_tracker/${dt_id}`);
        
        if (!deviceResponse.ok) {
          throw new Error('Failed to fetch device information');
        }
        
        const deviceData = await deviceResponse.json();
        
        if (deviceData.success) {
          setDeviceInfo(deviceData.data);
          // Pre-fill form with existing data
          setFormData({
            sim_1: deviceData.data.sim_1 || '',
            sim_1_persona: deviceData.data.sim_1_persona || '',
            sim_2: deviceData.data.sim_2 || '',
            sim_2_persona: deviceData.data.sim_2_persona || '',
            purpose: deviceData.data.purpose || '',
            handover_to: deviceData.data.handover_to || '',
            handover_date: deviceData.data.handover_date || '',
            return_date: deviceData.data.return_date || '',
            remark: deviceData.data.remark || '',
            device_status: deviceData.data.device_status || 'Working',
            device_status_details: deviceData.data.device_status_details || ''
          });
        } else {
          throw new Error(deviceData.message);
        }

        // Fetch user information
        const userResponse = await fetch('/api/user_dashboard/user_info');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserInfo(userData);
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load device information');
        router.push('/user_dashboard/document_hub/other_document_log/device_tracker_log');
      } finally {
        setIsLoading(false);
      }
    };

    if (dt_id) {
      fetchData();
    }
  }, [dt_id, router]);

  // Enhanced handleChange with proper debouncing for SIM fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Clear any existing duplicate status when user changes the value
    if (['sim_1', 'sim_2'].includes(name)) {
      setDuplicateChecks(prev => ({
        ...prev,
        [name]: { checking: false, exists: false, existingDevice: null }
      }));
    }
  };

  // Enhanced useEffect with proper debouncing for SIM fields
  useEffect(() => {
  const debounceTimers = {};
  
  const checkField = (field, value) => {
    if (debounceTimers[field]) {
      clearTimeout(debounceTimers[field]);
    }
    
    debounceTimers[field] = setTimeout(() => {
      if (value && field.startsWith('sim') && value.length === 11) {
        checkDuplicate(field, value, dt_id); // Pass current device ID
      }
    }, 800); // Increased debounce time to 800ms
  };

  checkField('sim_1', formData.sim_1);
  checkField('sim_2', formData.sim_2);

  return () => {
    Object.values(debounceTimers).forEach(timer => clearTimeout(timer));
  };
}, [formData.sim_1, formData.sim_2, checkDuplicate, dt_id]);

  // Handle SIM unbinding
  const handleUnbindSim = async () => {
  setUnbindPopup(prev => ({ ...prev, loading: true }));
  
  try {
    const response = await fetch('/api/user_dashboard/document_hub/other_document_tracker/device_tracker/unbind-sim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId: unbindPopup.device.dt_id,
        simNumber: unbindPopup.simNumber  // Remove the 'field' parameter
      })
    });

    const result = await response.json();

    if (result.success) {
      toast.success('SIM unbound successfully!');
      
      // Clear the duplicate status for the field
      setDuplicateChecks(prev => ({
        ...prev,
        [unbindPopup.field]: { checking: false, exists: false, existingDevice: null }
      }));

      // Close popup
      setUnbindPopup({ open: false, device: null, field: null, simNumber: null, loading: false });
    } else {
      toast.error(result.message || 'Failed to unbind SIM');
      setUnbindPopup(prev => ({ ...prev, loading: false }));
    }
  } catch (error) {
    console.error('Error unbinding SIM:', error);
    toast.error('Failed to unbind SIM');
    setUnbindPopup(prev => ({ ...prev, loading: false }));
  }
};

  const handlePersonaChange = (field, selectedOption) => {
    setFormData(prev => ({ ...prev, [field]: selectedOption?.value || '' }));
  };

  const handleStatusChange = (selectedOption) => {
    setFormData(prev => ({ 
      ...prev, 
      device_status: selectedOption?.value || 'Working',
      device_status_details: selectedOption?.value === 'Working' ? '' : prev.device_status_details
    }));
  };

  // Validate SIM number format
  const isValidSIM = (sim) => {
    if (!sim) return true; // SIM is optional
    const validPrefixes = ['017', '013', '019', '014', '016', '018', '015'];
    return /^\d{11}$/.test(sim) && validPrefixes.includes(sim.substring(0, 3));
  };

  const validateForm = () => {
    const newErrors = {};
    
    // SIM 1 validation
    if (formData.sim_1 && !isValidSIM(formData.sim_1)) {
      newErrors.sim_1 = 'SIM must be 11 digits starting with 017, 013, 019, 014, 016, 018, or 015';
    } else if (formData.sim_1 && duplicateChecks.sim_1.exists) {
      newErrors.sim_1 = `SIM 1 already exists in device ${duplicateChecks.sim_1.existingDevice?.dt_id || 'another device'}`;
    }
    
    // SIM 2 validation
    if (formData.sim_2 && !isValidSIM(formData.sim_2)) {
      newErrors.sim_2 = 'SIM must be 11 digits starting with 017, 013, 019, 014, 016, 018, or 015';
    } else if (formData.sim_2 && duplicateChecks.sim_2.exists) {
      newErrors.sim_2 = `SIM 2 already exists in device ${duplicateChecks.sim_2.existingDevice?.dt_id || 'another device'}`;
    }
    
    // Check for duplicate SIM numbers within the same form
    if (formData.sim_1 && formData.sim_2 && formData.sim_1 === formData.sim_2) {
      newErrors.sim_2 = 'SIM 2 cannot be the same as SIM 1';
    }
    
    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose is required';
    }

    // Device status details validation when status is "Not Working"
    if (formData.device_status === 'Not Working' && !formData.device_status_details.trim()) {
      newErrors.device_status_details = 'Reason is required when device status is "Not Working"';
    }
    
    // Only validate return_date if both dates are provided
    if (formData.handover_date && formData.return_date && new Date(formData.return_date) <= new Date(formData.handover_date)) {
      newErrors.return_date = 'Return date must be after handover date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // In handleSubmit function of the edit page, update the success handling:
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) {
    toast.error('Please fix validation errors');
    return;
  }

  // Final duplicate check before submission
  const hasDuplicates = Object.values(duplicateChecks).some(check => check.exists);
  if (hasDuplicates) {
    toast.error('Please resolve duplicate SIM numbers before submitting');
    return;
  }
  
  setIsSubmitting(true);
  
  try {
    const response = await fetch(`/api/user_dashboard/document_hub/other_document_tracker/device_tracker/${dt_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      toast.success('Device information updated successfully!');
      
      // Show toast for auto-created SIMs
      if (result.auto_created_sims_count > 0) {
        const simCount = result.auto_created_sims_count;
        
        if (simCount === 1) {
          toast.success('1 New SIM Added To SIM Tracker', {
            duration: 5000,
            icon: '✅'
          });
        } else if (simCount === 2) {
          toast.success('2 New SIMs Added To SIM Tracker', {
            duration: 5000,
            icon: '✅'
          });
        }
      }
      
      // Redirect to device log page after success
      setTimeout(() => {
        router.push('/user_dashboard/document_hub/other_document_log/device_tracker_log');
      }, 2000);
    } else {
      toast.error(result.message || 'Failed to update device information');
    }
  } catch (error) {
    console.error('Error updating device information:', error);
    toast.error('Failed to update device information');
  } finally {
    setIsSubmitting(false);
  }
};

  // Helper function to render duplicate status
  const renderDuplicateStatus = (field) => {
  const check = duplicateChecks[field];
  
  if (check.checking) {
    return (
      <div className="flex items-center mt-1 text-blue-600 text-sm">
        <FaSpinner className="animate-spin mr-1 text-xs" />
        Checking for duplicates...
      </div>
    );
  }
  
  if (check.exists) {
    if (field.startsWith('sim') && check.existingDevice) {
      return (
        <div className="flex items-center justify-between mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm">
          <div className="flex items-center text-red-600">
            <FaExclamationCircle className="mr-2 text-xs" />
            <span>
              This SIM is already bound to device <strong>{check.existingDevice.dt_id}</strong>
              {check.existingDevice.brand_name && (
                <span> ({check.existingDevice.brand_name} {check.existingDevice.device_model})</span>
              )}
            </span>
          </div>
          <button
            type="button" // Add this
            onClick={(e) => {
              e.stopPropagation(); // Add this
              e.preventDefault(); // Add this
              setUnbindPopup({
                open: true,
                device: check.existingDevice,
                field: field,
                simNumber: formData[field]
              });
            }}
            className="flex items-center px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
          >
            <FaUnlink className="mr-1" />
            Unbind
          </button>
        </div>
      );
    } else {
      return (
        <div className="flex items-center mt-1 text-red-600 text-sm">
          <FaExclamationCircle className="mr-1 text-xs" />
          Already exists in device {check.existingDevice?.dt_id || 'another device'}
          {check.existingDevice?.brand_name && (
            <span className="ml-1">({check.existingDevice.brand_name} {check.existingDevice.device_model})</span>
          )}
        </div>
      );
    }
  }
  
  if (formData[field] && field.startsWith('sim') && formData[field].length === 11) {
    return (
      <div className="flex items-center mt-1 text-green-600 text-sm">
        <FaCheckCircle className="mr-1 text-xs" />
        No duplicates found
      </div>
    );
  }
  
  return null;
};

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Loading device information...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!deviceInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <FaExclamationCircle className="text-4xl text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Device Not Found</h2>
            <p className="text-gray-600 mb-6">The device you&apos;re trying to edit doesn&apos;t exist.</p>
            <button
              onClick={() => router.push('/user_dashboard/document_hub/other_document_log/device_tracker_log')}
              className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Back to Device Log
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Unbind SIM Popup */}
      {unbindPopup.open && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-2xl max-w-md w-full border border-gray-300">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                  <FaUnlink className="text-red-600 text-lg" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Unbind SIM</h3>
              </div>
              
              <p className="text-gray-700 mb-2">
                Are you sure you want to unbind this SIM from device?
              </p>
              
              {unbindPopup.device && (
                <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                  <p className="font-medium text-red-800 mb-2">Device Information:</p>
                  <div className="space-y-1 text-sm text-red-700">
                    <p><strong>Device ID:</strong> {unbindPopup.device.dt_id}</p>
                    <p><strong>Brand:</strong> {unbindPopup.device.brand_name}</p>
                    <p><strong>Model:</strong> {unbindPopup.device.device_model}</p>
                    <p><strong>IMEI 1:</strong> {unbindPopup.device.imei_1}</p>
                    {unbindPopup.device.imei_2 && (
                      <p><strong>IMEI 2:</strong> {unbindPopup.device.imei_2}</p>
                    )}
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-600 mb-6">
                This will remove the SIM from the existing device so you can use it for a new device.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setUnbindPopup({ open: false, device: null, field: null, simNumber: null, loading: false })}
                  disabled={unbindPopup.loading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnbindSim}
                  disabled={unbindPopup.loading}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {unbindPopup.loading ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Unbinding...
                    </>
                  ) : (
                    <>
                      <FaUnlink className="mr-2" />
                      Yes, Unbind
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded shadow-lg overflow-hidden border border-gray-300">
          {/* Header */}
          <div className="relative px-8 py-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white border-b border-white/10 shadow-md">
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => router.push('/user_dashboard/document_hub/other_document_log/device_tracker_log')}
                  className="mr-4 p-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
                >
                  <FaArrowLeft />
                </button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                    Edit Device Information
                  </h1>
                  <p className="text-blue-200 mt-1 text-sm md:text-base">
                    Update device details for {deviceInfo.dt_id}
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
              {/* Device Information Section (Read-only) */}
              <div className="bg-slate-50 p-6 rounded border border-slate-300">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mr-3">
                    <FaMobile className="text-slate-600" />
                  </div>
                  Device Information (Read Only)
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tracking ID
                    </label>
                    <input
                      type="text"
                      value={deviceInfo.dt_id}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      value={deviceInfo.brand_name}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Device Model
                    </label>
                    <input
                      type="text"
                      value={deviceInfo.device_model}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IMEI 1
                    </label>
                    <input
                      type="text"
                      value={deviceInfo.imei_1}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed font-mono"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IMEI 2
                    </label>
                    <input
                      type="text"
                      value={deviceInfo.imei_2 || 'N/A'}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed font-mono"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Originally Tracked By
                    </label>
                    <input
                      type="text"
                      value={deviceInfo.track_by}
                      disabled
                      className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Editable SIM Information Section */}
              <div className="bg-green-50 p-6 rounded border border-green-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <FaSimCard className="text-green-700" />
                  </div>
                  SIM Information (Editable)
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* SIM 1 */}
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-gray-800 flex items-center">
                      <FaSimCard className="mr-2 text-green-600" />
                      SIM 1 (Optional)
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        SIM Number
                      </label>
                      <input
                        type="text"
                        name="sim_1"
                        value={formData.sim_1}
                        onChange={handleChange}
                        maxLength={11}
                        className={`w-full px-4 py-3 rounded border ${
                          errors.sim_1 ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        } transition-all placeholder-gray-500 text-gray-900`}
                        placeholder="11-digit SIM number"
                      />
                      {errors.sim_1 && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <FaTimes className="mr-1 text-xs" /> {errors.sim_1}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Must be 11 digits starting with 017, 013, 019, 014, 016, 018, or 015
                      </p>
                      {renderDuplicateStatus('sim_1')}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Persona Type (Optional)
                      </label>
                      <Select
                        options={personaOptions}
                        value={personaOptions.find(opt => opt.value === formData.sim_1_persona)}
                        onChange={(selected) => handlePersonaChange('sim_1_persona', selected)}
                        styles={customStyles}
                        className="rounded"
                        classNamePrefix="select"
                        placeholder="Select persona type..."
                        isClearable
                      />
                    </div>
                  </div>
                  
                  {/* SIM 2 */}
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-gray-800 flex items-center">
                      <FaSimCard className="mr-2 text-green-600" />
                      SIM 2 (Optional)
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        SIM Number
                      </label>
                      <input
                        type="text"
                        name="sim_2"
                        value={formData.sim_2}
                        onChange={handleChange}
                        maxLength={11}
                        className={`w-full px-4 py-3 rounded border ${
                          errors.sim_2 ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        } transition-all placeholder-gray-500 text-gray-900`}
                        placeholder="11-digit SIM number"
                      />
                      {errors.sim_2 && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <FaTimes className="mr-1 text-xs" /> {errors.sim_2}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Must be 11 digits starting with 017, 013, 019, 014, 016, 018, or 015
                      </p>
                      {renderDuplicateStatus('sim_2')}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Persona Type (Optional)
                      </label>
                      <Select
                        options={personaOptions}
                        value={personaOptions.find(opt => opt.value === formData.sim_2_persona)}
                        onChange={(selected) => handlePersonaChange('sim_2_persona', selected)}
                        styles={customStyles}
                        className="rounded"
                        classNamePrefix="select"
                        placeholder="Select persona type..."
                        isClearable
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Editable Device Status and Purpose */}
              <div className="bg-blue-50 p-6 rounded border border-blue-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <FaMobile className="text-blue-700" />
                  </div>
                  Device Status & Purpose (Editable)
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Device Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Device Status *
                    </label>
                    <Select
                      options={deviceStatusOptions}
                      value={deviceStatusOptions.find(opt => opt.value === formData.device_status)}
                      onChange={handleStatusChange}
                      styles={customStyles}
                      className="rounded"
                      classNamePrefix="select"
                      placeholder="Select device status..."
                    />
                  </div>

                  {/* Device Status Details - Show only when status is "Not Working" */}
                  {formData.device_status === 'Not Working' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Reason for Not Working *
                      </label>
                      <textarea
                        name="device_status_details"
                        value={formData.device_status_details}
                        onChange={handleChange}
                        rows={3}
                        className={`w-full px-4 py-3 rounded border ${
                          errors.device_status_details ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        } transition-all placeholder-gray-500 text-gray-900 resize-none`}
                        placeholder="Please provide details about why the device is not working..."
                      />
                      {errors.device_status_details && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <FaTimes className="mr-1 text-xs" /> {errors.device_status_details}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Purpose Field */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Purpose *
                    </label>
                    <textarea
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleChange}
                      rows={3}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.purpose ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      } transition-all placeholder-gray-500 text-gray-900 resize-none`}
                      placeholder="Describe the purpose of this device"
                    />
                    {errors.purpose && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.purpose}
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
                      Handover To
                    </label>
                    <input
                      type="text"
                      name="handover_to"
                      value={formData.handover_to}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all placeholder-gray-500 text-gray-900"
                      placeholder="Person receiving the device (optional)"
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
                    className="w-full px-4 py-3 rounded border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all placeholder-gray-500 text-gray-900 resize-none"
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
                  onClick={() => router.push('/user_dashboard/document_hub/other_document_log/device_tracker_log')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || Object.values(duplicateChecks).some(check => check.exists)}
                  className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded shadow-md hover:shadow-lg transition-all disabled:opacity-70 font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      Update Device Information
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