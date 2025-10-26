// app/admin_dashboard/edit_user/[soc_portal_id]/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { 
  FaUser, FaEnvelope, FaPhone, FaIdCard, FaBriefcase, 
  FaTint, FaVenusMars, FaCalendarAlt, FaArrowLeft,
  FaSave, FaSpinner, FaExclamationTriangle, FaCheckCircle,
  FaImage, FaEye, FaEyeSlash, FaLock, FaShieldAlt
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { toast } from 'react-hot-toast';
import { forwardRef } from 'react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Custom date input component
const CustomDateInput = forwardRef(({ value, onClick, error, placeholder }, ref) => (
  <div 
    ref={ref}
    onClick={onClick}
    className={`w-full px-4 py-3 rounded border ${
      error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400 cursor-pointer flex items-center`}
  >
    <FaCalendarAlt className="mr-3 text-blue-500 flex-shrink-0" />
    <span className={value ? "text-gray-800" : "text-gray-400"}>
      {value || placeholder}
    </span>
  </div>
));

CustomDateInput.displayName = "CustomDateInput";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const soc_portal_id = params.soc_portal_id;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    shortName: '',
    ngdId: '',
    dateOfBirth: null,
    joiningDate: null,
    resignDate: null,
    email: '',
    phone: '',
    emergencyContact: '',
    designation: '',
    bloodGroup: '',
    gender: '',
    roleType: '',
    status: 'Active',
    profilePhoto: null
  });
  
  const [originalData, setOriginalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
   try {
    setLoading(true);
    const response = await fetch(`/api/admin_dashboard/view_user/${soc_portal_id}`, {
      credentials: 'include' // ADD THIS LINE
    });
    const data = await response.json();
    
    if (response.ok && data.success) {
      const user = data.user;
      setOriginalData(user);
      
      // Convert date strings to Date objects for the form
      // The API now returns dates as 'YYYY-MM-DD' strings
      const parseDateString = (dateString) => {
      if (!dateString) return null;
      
      // Parse as local date (not UTC) to avoid timezone shifts
      const [year, month, day] = dateString.split('-');
      // Note: month is 0-indexed in Date constructor
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    };
      
      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        shortName: user.short_name || '',
        ngdId: user.ngd_id || '',
        dateOfBirth: parseDateString(user.date_of_birth),
        joiningDate: parseDateString(user.joining_date),
        resignDate: parseDateString(user.resign_date),
        email: user.email || '',
        phone: user.phone || '',
        emergencyContact: user.emergency_contact || '',
        designation: user.designation || '',
        bloodGroup: user.bloodgroup || '',
        gender: user.gender || '',
        roleType: user.role_type || '',
        status: user.status || 'Active',
        profilePhoto: null
      });
      setPreviewImage(user.profile_photo_url);
    } else {
      toast.error(data.message || 'Failed to load user data');
      router.push('/admin_dashboard/list_user');
    }
  } catch (error) {
    toast.error('Network error occurred');
    router.push('/admin_dashboard/list_user');
  } finally {
    setLoading(false);
  }
};

    if (soc_portal_id) {
      fetchUserData();
    }
  }, [soc_portal_id, router]);

// In the useEffect that checks for changes, replace the date comparison:
useEffect(() => {
  if (originalData) {
    // FIXED: Proper date comparison that handles timezones
    const formatDateForComparison = (date) => {
      if (!date) return '';
      
      // Create a date in local timezone without time component
      const localDate = new Date(date);
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Also fix the original data parsing to handle dates consistently
    const parseOriginalDate = (dateString) => {
      if (!dateString) return '';
      // Parse the date string as local date (not UTC)
      const [year, month, day] = dateString.split('-');
      return `${year}-${month}-${day}`;
    };

    const changes = 
      formData.firstName !== originalData.first_name ||
      formData.lastName !== originalData.last_name ||
      formData.shortName !== originalData.short_name ||
      formData.ngdId !== originalData.ngd_id ||
      formatDateForComparison(formData.dateOfBirth) !== parseOriginalDate(originalData.date_of_birth) ||
      formatDateForComparison(formData.joiningDate) !== parseOriginalDate(originalData.joining_date) ||
      (formData.resignDate ? formatDateForComparison(formData.resignDate) : '') !== 
        (originalData.resign_date ? parseOriginalDate(originalData.resign_date) : '') ||
      formData.email !== originalData.email ||
      formData.phone !== originalData.phone ||
      formData.emergencyContact !== (originalData.emergency_contact || '') ||
      formData.designation !== originalData.designation ||
      formData.bloodGroup !== originalData.bloodgroup ||
      formData.gender !== originalData.gender ||
      formData.roleType !== originalData.role_type ||
      formData.status !== originalData.status ||
      formData.profilePhoto !== null;

    setHasChanges(changes);
  }
}, [formData, originalData]);

  //seEffect for auto-status logic
useEffect(() => {
  if (formData.resignDate) {
    setFormData(prev => ({ ...prev, status: 'Resigned' }));
  } else if (formData.status === 'Resigned') {
    setFormData(prev => ({ ...prev, status: 'Active' }));
  }
}, [formData.resignDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDateChange = (date, field) => {
    setFormData(prev => ({ ...prev, [field]: date }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

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

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'firstName', 'lastName', 'shortName', 'ngdId', 'email', 
      'phone', 'designation', 'bloodGroup', 'gender', 'roleType', 'status'
    ];
    
    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'This field is required';
      }
    });

    const ngdIdRegex = /^NGD\d{6}$/;
    if (formData.ngdId && !ngdIdRegex.test(formData.ngdId)) {
      newErrors.ngdId = 'Must be NGD followed by 6 digits (e.g. NGD241079)';
    }
    
    const phoneRegex = /^(017|013|019|014|018|016|015)\d{8}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Must be 11 digits starting with 017,013,019,014,018,016 or 015';
    }

    // Emergency contact validation (optional)
    if (formData.emergencyContact && !phoneRegex.test(formData.emergencyContact)) {
      newErrors.emergencyContact = 'Must be 11 digits starting with 017,013,019,014,018,016 or 015';
    }
    
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }
    
    if (!formData.joiningDate) {
      newErrors.joiningDate = 'Joining date is required';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // Date validations
    const today = new Date();
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const age = today.getFullYear() - dob.getFullYear();
      
      if (age < 18) {
        newErrors.dateOfBirth = 'User must be at least 18 years old';
      }
    }
    
    if (formData.joiningDate && formData.joiningDate > today) {
      newErrors.joiningDate = 'Joining date cannot be in the future';
    }
    
    if (formData.resignDate) {
      if (formData.resignDate < formData.joiningDate) {
        newErrors.resignDate = 'Resign date cannot be before joining date';
      }
      if (formData.resignDate > today) {
        newErrors.resignDate = 'Resign date cannot be in the future';
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
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (value instanceof Date) {
          formDataToSend.append(key, value.toISOString());
        } else {
          formDataToSend.append(key, value);
        }
      }
    });
    
    if (formData.profilePhoto) {
      formDataToSend.append('profilePhoto', formData.profilePhoto);
    }

    const response = await fetch(`/api/admin_dashboard/edit_user/${soc_portal_id}`, {
      method: 'PUT',
      body: formDataToSend,
      credentials: 'include' // ADD THIS LINE
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to update user');
    }

    // SUCCESS TOAST
    toast.success('User updated successfully!', {
      duration: 5000,
      position: 'top-right'
    });

    // Show changed fields in a separate toast if there are changes
    if (result.changedFields && result.changedFields.length > 0) {
      setTimeout(() => {
        toast.success(`Changed: ${result.changedFields.join(', ')}`, {
          duration: 6000,
          position: 'top-right'
        });
      }, 500);
    }
    
    // Refresh the data
    const refreshResponse = await fetch(`/api/admin_dashboard/view_user/${soc_portal_id}`, {
      credentials: 'include' // ADD THIS LINE TOO
    });
    const refreshData = await refreshResponse.json();
    
    if (refreshResponse.ok && refreshData.success) {
      setOriginalData(refreshData.user);
      setHasChanges(false);
    }
    
  } catch (error) {
    toast.error(error.message || 'Failed to update user. Please try again.', {
      duration: 6000,
      position: 'top-right'
    });
  } finally {
    setSubmitting(false);
  }
};

  const getStatusColor = (status) => {
    return status === 'Active' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
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
                onClick={() => router.push(`/admin_dashboard/view_user/${soc_portal_id}`)}
                className="mr-4 p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <FaArrowLeft className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                  Edit User
                </h1>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(formData.status)} border`}>
              {formData.status}
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Profile Photo */}
              <div className="lg:col-span-1">
                <div className="flex flex-col items-center">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="relative mb-4"
                  >
                    {previewImage ? (
                      <Image 
                        className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                        src={previewImage} 
                        alt="Profile preview"
                        width={128}
                        height={128}
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white flex items-center justify-center shadow-lg">
                        <FaUser className="text-gray-400 text-3xl" />
                      </div>
                    )}
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                      <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center shadow-md">
                        <FaImage className="mr-1" />
                        <span>Change</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </motion.div>
                  {errors.profilePhoto && (
                    <p className="mt-1 text-sm text-red-600 text-center">{errors.profilePhoto}</p>
                  )}
                  
                  <div className="w-full mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                      <FaShieldAlt className="mr-2" />
                      User ID
                    </h3>
                    <p className="text-blue-900 font-mono">{soc_portal_id}</p>
                    <p className="text-xs text-blue-600 mt-1">This cannot be changed</p>
                  </div>
                </div>
              </div>

              {/* Right Column - Form Fields */}
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <FaUser className="mr-2 text-blue-500" />
                      Personal Information
                    </h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.firstName ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400`}
                      placeholder="John"
                    />
                    {errors.firstName && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" /> {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.lastName ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400`}
                      placeholder="Doe"
                    />
                    {errors.lastName && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" /> {errors.lastName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Short Name *
                    </label>
                    <input
                      type="text"
                      name="shortName"
                      value={formData.shortName}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.shortName ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400`}
                      placeholder="JD"
                    />
                    {errors.shortName && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" /> {errors.shortName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NGD ID *
                    </label>
                    <input
                      type="text"
                      name="ngdId"
                      value={formData.ngdId}
                      onChange={handleChange}
                      pattern="NGD\d{6}"
                      className={`w-full px-4 py-3 rounded border ${
                        errors.ngdId ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400`}
                      placeholder="NGD241079"
                    />
                    {errors.ngdId && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" /> {errors.ngdId}
                      </p>
                    )}
                  </div>

                  {/* Contact Information */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <FaEnvelope className="mr-2 text-blue-500" />
                      Contact Information
                    </h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400`}
                      placeholder="john.doe@nagad.com.bd"
                    />
                    {errors.email && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" /> {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      pattern="(017|013|019|014|018|016|015)\d{8}"
                      className={`w-full px-4 py-3 rounded border ${
                        errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400`}
                      placeholder="017XXXXXXXX"
                    />
                    {errors.phone && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" /> {errors.phone}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Contact
                    </label>
                    <input
                      type="tel"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleChange}
                      pattern="(017|013|019|014|018|016|015)\d{8}"
                      className={`w-full px-4 py-3 rounded border ${
                        errors.emergencyContact ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400`}
                      placeholder="017XXXXXXXX (Optional)"
                    />
                    {errors.emergencyContact && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" /> {errors.emergencyContact}
                      </p>
                    )}
                  </div>

                  {/* Professional Information */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <FaBriefcase className="mr-2 text-blue-500" />
                      Professional Information
                    </h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Designation *
                    </label>
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.designation ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400`}
                      placeholder="Security Analyst"
                    />
                    {errors.designation && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" /> {errors.designation}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role Type *
                    </label>
                    <select
                      name="roleType"
                      value={formData.roleType}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.roleType ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400`}
                    >
                      <option value="">Select Role Type</option>
                      <option value="SOC">SOC</option>
                      <option value="OPS">OPS</option>
                      <option value="CTO">CTO</option>
                      <option value="BI">BI</option>
                    </select>
                    {errors.roleType && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" /> {errors.roleType}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Blood Group *
                    </label>
                    <select
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.bloodGroup ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400`}
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                    {errors.bloodGroup && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" /> {errors.bloodGroup}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender *
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.gender ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400`}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.gender && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" /> {errors.gender}
                      </p>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <FaCalendarAlt className="mr-2 text-blue-500" />
                      Important Dates
                    </h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth *
                    </label>
                    <DatePicker
                      selected={formData.dateOfBirth}
                      onChange={(date) => handleDateChange(date, 'dateOfBirth')}
                      maxDate={new Date()}
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      scrollableYearDropdown
                      yearDropdownItemNumber={100}
                      dateFormat="dd/MM/yyyy"
                      customInput={
                        <CustomDateInput 
                          placeholder="Select date of birth" 
                          error={errors.dateOfBirth} 
                        />
                      }
                      wrapperClassName="w-full"
                    />
                    {errors.dateOfBirth && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" /> {errors.dateOfBirth}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Joining Date *
                    </label>
                    <DatePicker
                      selected={formData.joiningDate}
                      onChange={(date) => handleDateChange(date, 'joiningDate')}
                      maxDate={new Date()}
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      scrollableYearDropdown
                      yearDropdownItemNumber={15}
                      dateFormat="dd/MM/yyyy"
                      customInput={
                        <CustomDateInput 
                          placeholder="Select joining date" 
                          error={errors.joiningDate} 
                        />
                      }
                      wrapperClassName="w-full"
                    />
                    {errors.joiningDate && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" /> {errors.joiningDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resign Date
                    </label>
                    <DatePicker
                      selected={formData.resignDate}
                      onChange={(date) => handleDateChange(date, 'resignDate')}
                      minDate={formData.joiningDate}
                      maxDate={new Date()}
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      scrollableYearDropdown
                      yearDropdownItemNumber={15}
                      dateFormat="dd/MM/yyyy"
                      customInput={
                        <CustomDateInput 
                          placeholder="Select resign date" 
                          error={errors.resignDate} 
                        />
                      }
                      wrapperClassName="w-full"
                      isClearable
                    />
                    {errors.resignDate && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" /> {errors.resignDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status *
                    </label>
                    <select
  name="status"
  value={formData.status === 'Resigned' ? 'Active' : formData.status}
  onChange={handleChange}
  className={`w-full px-4 py-3 rounded border ${
    errors.status ? 'border-red-400 bg-red-50' : 'border-gray-300'
  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400`}
>
  <option value="Active">Active</option>
  <option value="Inactive">Inactive</option>
</select>
{formData.resignDate && (
  <p className="text-sm text-blue-600 mt-2 flex items-center">
    <FaExclamationTriangle className="mr-1" />
    Note: User will be automatically set to &quot;Resigned&quot; status when resign date is set.
  </p>
)}
                    {errors.status && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" /> {errors.status}
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-4 pt-6 border-t border-gray-200">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => router.push(`/admin_dashboard/view_user/${soc_portal_id}`)}
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
                        Update User
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}