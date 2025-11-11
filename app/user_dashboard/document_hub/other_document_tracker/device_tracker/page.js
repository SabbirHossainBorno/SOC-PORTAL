// app/user_dashboard/document_hub/other_document_tracker/device_tracker/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaMobile, FaSimCard, FaUser, FaCalendarAlt,
  FaPaperPlane, FaSpinner, FaTimes, FaArrowLeft,
  FaSave, FaIdCard, FaInfoCircle, FaBullseye,
  FaCheckCircle, FaExclamationTriangle, FaExclamationCircle,
  FaTrash, FaUnlink
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

export default function DeviceTracker() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    brand_name: '',
    device_model: '',
    imei_1: '',
    imei_2: '',
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [duplicateChecks, setDuplicateChecks] = useState({
    imei_1: { checking: false, exists: false, existingDevice: null },
    imei_2: { checking: false, exists: false, existingDevice: null },
    sim_1: { checking: false, exists: false, existingDevice: null },
    sim_2: { checking: false, exists: false, existingDevice: null }
  });
  
  // New state for unbind popup
  const [unbindPopup, setUnbindPopup] = useState({
    open: false,
    device: null,
    field: null,
    simNumber: null,
    loading: false
  });

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/user_dashboard/user_info');
        
        if (!response.ok) {
          throw new Error('Failed to fetch user info');
        }
        
        const userData = await response.json();
        setUserInfo(userData);
        
      } catch (error) {
        console.error('Error fetching user info:', error);
        toast.error('Failed to load user information');
      }
    };

    fetchUserInfo();
  }, []);

  // Debounced duplicate check
  const checkDuplicate = useCallback(async (field, value) => {
    // Don't check if value is too short or empty
    if (!value || value.length < 5) {
      setDuplicateChecks(prev => ({
        ...prev,
        [field]: { checking: false, exists: false, existingDevice: null }
      }));
      return;
    }

    // Only check IMEI when it's exactly 15 digits
    if (field.startsWith('imei') && value.length !== 15) {
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
      const response = await fetch(`/api/user_dashboard/document_hub/other_document_tracker/device_tracker/check-duplicate?field=${field}&value=${value}`);
      
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
                  onClick={() => {
                    setUnbindPopup({
  open: true,
  device: result.existingDevice,
  field: result.duplicateField, // Use the field from the API response
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

  // Enhanced handleChange with proper debouncing
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Clear any existing duplicate status when user changes the value
    if (['imei_1', 'imei_2', 'sim_1', 'sim_2'].includes(name)) {
      setDuplicateChecks(prev => ({
        ...prev,
        [name]: { checking: false, exists: false, existingDevice: null }
      }));
    }
  };

  // Enhanced useEffect with proper debouncing
  useEffect(() => {
    const debounceTimers = {};
    
    const checkField = (field, value) => {
      if (debounceTimers[field]) {
        clearTimeout(debounceTimers[field]);
      }
      
      debounceTimers[field] = setTimeout(() => {
        if (value && 
            ((field.startsWith('imei') && value.length === 15) || 
             (field.startsWith('sim') && value.length === 11))) {
          checkDuplicate(field, value);
        }
      }, 800); // Increased debounce time to 800ms
    };

    checkField('imei_1', formData.imei_1);
    checkField('imei_2', formData.imei_2);
    checkField('sim_1', formData.sim_1);
    checkField('sim_2', formData.sim_2);

    return () => {
      Object.values(debounceTimers).forEach(timer => clearTimeout(timer));
    };
  }, [formData.imei_1, formData.imei_2, formData.sim_1, formData.sim_2, checkDuplicate]);

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
        simNumber: unbindPopup.simNumber
      })
    });

    const result = await response.json();

    if (result.success) {
      toast.success('SIM unbound successfully!');
      
      // Clear the duplicate status for the field and re-check
      const fieldToClear = unbindPopup.field;
      
      // Reset the duplicate check state
      setDuplicateChecks(prev => ({
        ...prev,
        [fieldToClear]: { checking: false, exists: false, existingDevice: null }
      }));

      // Re-check the current value to update the status
      if (formData[fieldToClear] && formData[fieldToClear].length === 11) {
        // Set checking state first
        setDuplicateChecks(prev => ({
          ...prev,
          [fieldToClear]: { ...prev[fieldToClear], checking: true }
        }));

        // Perform the duplicate check again
        setTimeout(async () => {
          try {
            const recheckResponse = await fetch(`/api/user_dashboard/document_hub/other_document_tracker/device_tracker/check-duplicate?field=${fieldToClear}&value=${formData[fieldToClear]}&excludeDevice=${dt_id}`);
            
            if (recheckResponse.ok) {
              const recheckResult = await recheckResponse.json();
              
              setDuplicateChecks(prev => ({
                ...prev,
                [fieldToClear]: {
                  checking: false,
                  exists: recheckResult.exists,
                  existingDevice: recheckResult.existingDevice,
                  isSim: recheckResult.isSim
                }
              }));
            }
          } catch (error) {
            console.error('Error rechecking duplicate:', error);
            setDuplicateChecks(prev => ({
              ...prev,
              [fieldToClear]: { checking: false, exists: false, existingDevice: null }
            }));
          }
        }, 500);
      }

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
    
    if (!formData.brand_name.trim()) {
      newErrors.brand_name = 'Brand name is required';
    }
    
    if (!formData.device_model.trim()) {
      newErrors.device_model = 'Device model is required';
    }
    
    if (!formData.imei_1.trim()) {
      newErrors.imei_1 = 'IMEI 1 is required';
    } else if (!/^\d{15}$/.test(formData.imei_1)) {
      newErrors.imei_1 = 'IMEI must be 15 digits';
    } else if (duplicateChecks.imei_1.exists) {
      newErrors.imei_1 = `IMEI 1 already exists in device ${duplicateChecks.imei_1.existingDevice?.dt_id || 'another device'}`;
    }
    
    if (formData.imei_2 && !/^\d{15}$/.test(formData.imei_2)) {
      newErrors.imei_2 = 'IMEI must be 15 digits';
    } else if (formData.imei_2 && duplicateChecks.imei_2.exists) {
      newErrors.imei_2 = `IMEI 2 already exists in device ${duplicateChecks.imei_2.existingDevice?.dt_id || 'another device'}`;
    }
    
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
    
    // Check for duplicate IMEI numbers within the same form
    if (formData.imei_1 && formData.imei_2 && formData.imei_1 === formData.imei_2) {
      newErrors.imei_2 = 'IMEI 2 cannot be the same as IMEI 1';
    }
    
    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose is required';
    }

    // Device status details validation when status is "Not Working"
    if (formData.device_status === 'Not Working' && !formData.device_status_details.trim()) {
      newErrors.device_status_details = 'Reason is required when device status is "Not Working"';
    }
    
    // Handover fields are now optional
    // No validation for handover_to, handover_date, return_date
    
    // Only validate return_date if both dates are provided
    if (formData.handover_date && formData.return_date && new Date(formData.return_date) <= new Date(formData.handover_date)) {
      newErrors.return_date = 'Return date must be after handover date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

// In handleSubmit function, after successful response
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) {
    toast.error('Please fix validation errors');
    return;
  }

  // Final duplicate check before submission
  const hasDuplicates = Object.values(duplicateChecks).some(check => check.exists);
  if (hasDuplicates) {
    toast.error('Please resolve duplicate IMEI or SIM numbers before submitting');
    return;
  }
  
  setIsSubmitting(true);
  
  try {
    const response = await fetch('/api/user_dashboard/document_hub/other_document_tracker/device_tracker', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      toast.success('Device information saved successfully!');
      
      // Show toast for auto-created SIMs - Show count only (1/2)
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
        // If somehow more than 2, we don't show (shouldn't happen)
      }
      
      // Reset form
      setFormData({
        brand_name: '',
        device_model: '',
        imei_1: '',
        imei_2: '',
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

      // Reset duplicate checks
      setDuplicateChecks({
        imei_1: { checking: false, exists: false, existingDevice: null },
        imei_2: { checking: false, exists: false, existingDevice: null },
        sim_1: { checking: false, exists: false, existingDevice: null },
        sim_2: { checking: false, exists: false, existingDevice: null }
      });
      
      // Redirect to device log page after success
      setTimeout(() => {
        router.push('/user_dashboard/document_hub/other_document_log/device_tracker_log');
      }, 3000);
    } else {
      if (result.message?.includes('duplicate') || result.message?.includes('already exists')) {
        toast.error(result.message);
      } else {
        toast.error(result.message || 'Failed to save device information');
      }
    }
  } catch (error) {
    console.error('Error saving device information:', error);
    toast.error('Failed to save device information');
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
  
  // Only show duplicate warning if exists is true
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
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
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
  
  // Show success message only when we have a valid SIM and no duplicates
  if (formData[field] && field.startsWith('sim') && formData[field].length === 11 && !check.exists) {
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
      {/* Unbind SIM Popup */}
      {unbindPopup.open && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          
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
                  onClick={() => router.push('/user_dashboard/document_hub/other_document_tracker')}
                  className="mr-4 p-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
                >
                  <FaArrowLeft />
                </button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                    Device Tracker
                  </h1>
                  <p className="text-blue-200 mt-1 text-sm md:text-base">
                    Track and manage device information
                  </p>
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex items-center space-x-2">
                <div className="p-2 bg-white/20 rounded">
                  <FaMobile className="text-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Device Information Section */}
              <div className="bg-blue-50 p-6 rounded border border-blue-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <FaMobile className="text-blue-700" />
                  </div>
                  Device Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      name="brand_name"
                      value={formData.brand_name}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.brand_name ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      } transition-all placeholder-gray-500 text-gray-900`}
                      placeholder="e.g., Samsung, Apple, Xiaomi"
                    />
                    {errors.brand_name && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.brand_name}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Device Model *
                    </label>
                    <input
                      type="text"
                      name="device_model"
                      value={formData.device_model}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.device_model ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      } transition-all placeholder-gray-500 text-gray-900`}
                      placeholder="e.g., Galaxy S23, iPhone 15"
                    />
                    {errors.device_model && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.device_model}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      IMEI 1 *
                    </label>
                    <input
                      type="text"
                      name="imei_1"
                      value={formData.imei_1}
                      onChange={handleChange}
                      maxLength={15}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.imei_1 ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      } transition-all placeholder-gray-500 text-gray-900`}
                      placeholder="15-digit IMEI number"
                    />
                    {errors.imei_1 && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.imei_1}
                      </p>
                    )}
                    {renderDuplicateStatus('imei_1')}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      IMEI 2
                    </label>
                    <input
                      type="text"
                      name="imei_2"
                      value={formData.imei_2}
                      onChange={handleChange}
                      maxLength={15}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.imei_2 ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      } transition-all placeholder-gray-500 text-gray-900`}
                      placeholder="15-digit IMEI number (optional)"
                    />
                    {errors.imei_2 && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaTimes className="mr-1 text-xs" /> {errors.imei_2}
                      </p>
                    )}
                    {renderDuplicateStatus('imei_2')}
                  </div>

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

              {/* SIM Information Section */}
              <div className="bg-green-50 p-6 rounded border border-green-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <FaSimCard className="text-green-700" />
                  </div>
                  SIM Information (Optional)
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
                      <div className="p-3 bg-blue-100 rounded">
                        <FaIdCard className="text-blue-600 text-2xl" />
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
                  disabled={isSubmitting || Object.values(duplicateChecks).some(check => check.exists)}
                  className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded shadow-md hover:shadow-lg transition-all disabled:opacity-70 font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      Save Device Information
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