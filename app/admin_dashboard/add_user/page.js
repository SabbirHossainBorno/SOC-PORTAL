// app/admin_dashboard/add_user/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaUserPlus, FaSpinner, FaCheckCircle, 
  FaExclamationTriangle, FaCalendarAlt,
  FaIdCard, FaEnvelope, FaPhone, FaBriefcase,
  FaTint, FaVenusMars, FaLock, FaImage, FaEye, FaEyeSlash
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import toast, { Toaster } from 'react-hot-toast';
import { forwardRef } from 'react';
import Image from 'next/image';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

export default function AddUserPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    shortName: '',
    ngdId: '',
    dateOfBirth: null,
    joiningDate: null,
    email: '',
    phone: '',
    designation: '',
    bloodGroup: '',
    gender: '',
    password: '',
    roleType: '',
    status: 'Active',
    profilePhoto: null
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Calculate password strength
    let strength = 0;
    const password = formData.password;
    
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  }, [formData.password]);

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
      'phone', 'designation', 'bloodGroup', 'gender',
      'password', 'roleType'
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
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (formData.password && !passwordRegex.test(formData.password)) {
      newErrors.password = 'Password does not meet requirements';
    }
    
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
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

      const response = await fetch('/api/admin_dashboard/add_user', {
        method: 'POST',
        body: formDataToSend
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create user');
      }

      toast.success('User created successfully!', {
        duration: 4000,
        position: 'top-right',
        icon: <FaCheckCircle className="text-green-500" />,
        style: {
          background: '#f0fdf4',
          color: '#15803d',
          padding: '16px',
          border: '1px solid #bbf7d0',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }
      });
      
      setFormData({
        firstName: '',
        lastName: '',
        shortName: '',
        ngdId: '',
        dateOfBirth: null,
        joiningDate: null,
        email: '',
        phone: '',
        designation: '',
        bloodGroup: '',
        gender: '',
        password: '',
        roleType: '',
        status: 'Active',
        profilePhoto: null
      });
      setPreviewImage(null);
      
      setTimeout(() => {
        router.push('/admin_dashboard/list_user');
      }, 3000);
    } catch (error) {
      toast.error(error.message || 'Failed to create user. Please try again.', {
        duration: 4000,
        position: 'top-right',
        icon: <FaExclamationTriangle className="text-red-500" />,
        style: {
          background: '#fef2f2',
          color: '#b91c1c',
          padding: '16px',
          border: '1px solid #fecaca',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (formData.password.length === 0) return '';
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 4) return 'Medium';
    return 'Strong';
  };

  const CustomDateInput = forwardRef(({ value, onClick, error, placeholder }, ref) => (
    <div 
      ref={ref}
      onClick={onClick}
      className={`w-full px-4 py-3 rounded border ${
        error ? 'border-red-400' : 'border-gray-300'
      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400 cursor-pointer flex items-center`}
    >
      <FaCalendarAlt className="mr-3 text-blue-500 flex-shrink-0" />
      <span className={value ? "text-gray-800" : "text-gray-400"}>
        {value || placeholder}
      </span>
    </div>
  ));

  CustomDateInput.displayName = "CustomDateInput";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <Toaster />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto"
      >
        <div className="text-center mb-10">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-3xl sm:text-4xl font-bold text-gray-800 mb-3"
          >
            Create New User Account
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-gray-600 max-w-xl mx-auto"
          >
            Add new team members to the SOC Portal with appropriate roles and permissions
          </motion.p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-white rounded border border-gray-200 shadow-md overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded bg-blue-100 mr-4">
                  <FaUserPlus className="text-2xl text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">New User Information</h2>
                  <p className="text-gray-600 text-sm">Complete all required fields</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/admin_dashboard/list_user')}
                className="mt-3 sm:mt-0 px-4 py-2 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              >
                View All Users
              </motion.button>
            </div>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="flex flex-col items-center mb-6">
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
                      <FaImage className="text-gray-400 text-3xl" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                    <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center shadow-md">
                      <FaImage className="mr-1" />
                      <span>Upload</span>
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
                  <p className="mt-1 text-sm text-red-600">{errors.profilePhoto}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaUserPlus className="mr-2 text-blue-500" />
                    First Name *
                  </label>
                  <motion.div whileHover={{ scale: 1.01 }}>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.firstName ? 'border-red-400' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400`}
                      placeholder="John"
                    />
                  </motion.div>
                  {errors.firstName && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <FaExclamationTriangle className="mr-1" /> {errors.firstName}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaUserPlus className="mr-2 text-blue-500" />
                    Last Name *
                  </label>
                  <motion.div whileHover={{ scale: 1.01 }}>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.lastName ? 'border-red-400' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400`}
                      placeholder="Doe"
                    />
                  </motion.div>
                  {errors.lastName && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <FaExclamationTriangle className="mr-1" /> {errors.lastName}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="shortName" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaUserPlus className="mr-2 text-blue-500" />
                    Short Name *
                  </label>
                  <motion.div whileHover={{ scale: 1.01 }}>
                    <input
                      type="text"
                      id="shortName"
                      name="shortName"
                      value={formData.shortName}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.shortName ? 'border-red-400' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400`}
                      placeholder="Doe"
                    />
                  </motion.div>
                  {errors.shortName && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <FaExclamationTriangle className="mr-1" /> {errors.shortName}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="ngdId" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaIdCard className="mr-2 text-blue-500" />
                    NGD ID *
                  </label>
                  <motion.div whileHover={{ scale: 1.01 }}>
                    <input
                      type="text"
                      id="ngdId"
                      name="ngdId"
                      value={formData.ngdId}
                      onChange={handleChange}
                      pattern="NGD\d{6}"
                      title="NGD followed by 6 digits (e.g. NGD241079)"
                      className={`w-full px-4 py-3 rounded border ${
                        errors.ngdId ? 'border-red-400' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400`}
                      placeholder="NGD241079"
                    />
                  </motion.div>
                  {errors.ngdId && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <FaExclamationTriangle className="mr-1" /> {errors.ngdId}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaEnvelope className="mr-2 text-blue-500" />
                    Email Address *
                  </label>
                  <motion.div whileHover={{ scale: 1.01 }}>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.email ? 'border-red-400' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400`}
                      placeholder="john.doe@nagad.com.bd"
                    />
                  </motion.div>
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <FaExclamationTriangle className="mr-1" /> {errors.email}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaPhone className="mr-2 text-blue-500" />
                    Phone Number *
                  </label>
                  <motion.div whileHover={{ scale: 1.01 }}>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      pattern="(017|013|019|014|018|016|015)\d{8}"
                      title="11 digits starting with 017,013,019,014,018,016 or 015"
                      className={`w-full px-4 py-3 rounded border ${
                        errors.phone ? 'border-red-400' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400`}
                      placeholder="017XXXXXXXX"
                    />
                  </motion.div>
                  {errors.phone && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <FaExclamationTriangle className="mr-1" /> {errors.phone}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="designation" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaBriefcase className="mr-2 text-blue-500" />
                    Designation *
                  </label>
                  <motion.div whileHover={{ scale: 1.01 }}>
                    <input
                      type="text"
                      id="designation"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.designation ? 'border-red-400' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400`}
                      placeholder="Security Analyst"
                    />
                  </motion.div>
                  {errors.designation && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <FaExclamationTriangle className="mr-1" /> {errors.designation}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaTint className="mr-2 text-blue-500" />
                    Blood Group *
                  </label>
                  <motion.div whileHover={{ scale: 1.01 }}>
                    <select
                      id="bloodGroup"
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.bloodGroup ? 'border-red-400' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400`}
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
                  </motion.div>
                  {errors.bloodGroup && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <FaExclamationTriangle className="mr-1" /> {errors.bloodGroup}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaVenusMars className="mr-2 text-blue-500" />
                    Gender *
                  </label>
                  <motion.div whileHover={{ scale: 1.01 }}>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.gender ? 'border-red-400' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400`}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </motion.div>
                  {errors.gender && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <FaExclamationTriangle className="mr-1" /> {errors.gender}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="roleType" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaIdCard className="mr-2 text-blue-500" />
                    Role Type *
                  </label>
                  <motion.div whileHover={{ scale: 1.01 }}>
                    <select
                      id="roleType"
                      name="roleType"
                      value={formData.roleType}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded border ${
                        errors.roleType ? 'border-red-400' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400`}
                      required
                    >
                      <option value="">Select Role Type</option>
                      <option value="SOC">SOC</option>
                      <option value="OPS">OPS</option>
                      <option value="CTO">CTO</option>
                      <option value="BI">BI</option>
                    </select>
                  </motion.div>
                  {errors.roleType && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <FaExclamationTriangle className="mr-1" /> {errors.roleType}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaCalendarAlt className="mr-2 text-blue-500" />
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
                    todayButton="Today"
                    dateFormat="dd/MM/yyyy"
                    customInput={
                      <CustomDateInput 
                        placeholder="Select date of birth" 
                        error={errors.dateOfBirth} 
                      />
                    }
                    wrapperClassName="w-full"
                    popperPlacement="bottom-start"
                  />
                  {errors.dateOfBirth && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <FaExclamationTriangle className="mr-1" /> {errors.dateOfBirth}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaCalendarAlt className="mr-2 text-blue-500" />
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
                    todayButton="Today"
                    dateFormat="dd/MM/yyyy"
                    customInput={
                      <CustomDateInput 
                        placeholder="Select joining date" 
                        error={errors.joiningDate} 
                      />
                    }
                    wrapperClassName="w-full"
                    popperPlacement="bottom-start"
                  />
                  {errors.joiningDate && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <FaExclamationTriangle className="mr-1" /> {errors.joiningDate}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaIdCard className="mr-2 text-blue-500" />
                    Status
                  </label>
                  <div className="relative">
                    <div className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 flex items-center">
                      <span>Active</span>
                    </div>
                    <input
                      type="hidden"
                      name="status"
                      value="Active"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    New users are always set to Active status
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaCalendarAlt className="mr-2 text-blue-500" />
                    Resign Date
                  </label>
                  <div className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 text-gray-600 flex items-center">
                    <FaCalendarAlt className="mr-2 text-blue-500" />
                    <span>Not applicable for new users</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Can be set later if needed
                  </p>
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaLock className="mr-2 text-blue-500" />
                    Password *
                  </label>
                  <div className="relative">
                    <motion.div whileHover={{ scale: 1.01 }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded border ${
                          errors.password ? 'border-red-400' : 'border-gray-300'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400 pr-10`}
                        placeholder="••••••••"
                      />
                    </motion.div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  
                  {formData.password && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">
                          Password Strength: 
                          <span className={`ml-2 ${passwordStrength <= 2 ? 'text-red-600' : passwordStrength <= 4 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {getPasswordStrengthText()}
                          </span>
                        </span>
                        <span className="text-xs text-gray-600">
                          {passwordStrength}/5
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getPasswordStrengthColor()} transition-all duration-300`} 
                          style={{ width: `${passwordStrength * 20}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3">
                    <p className="text-xs text-gray-600">
                      Password must contain at least:
                    </p>
                    <ul className="grid grid-cols-2 gap-1 mt-1 text-xs text-gray-600">
                      <li className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600' : ''}`}>
                        {formData.password.length >= 8 ? <FaCheckCircle className="mr-1 text-xs" /> : <span className="mr-1.5">•</span>}
                        8 characters
                      </li>
                      <li className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}`}>
                        {/[A-Z]/.test(formData.password) ? <FaCheckCircle className="mr-1 text-xs" /> : <span className="mr-1.5">•</span>}
                        Uppercase letter
                      </li>
                      <li className={`flex items-center ${/[a-z]/.test(formData.password) ? 'text-green-600' : ''}`}>
                        {/[a-z]/.test(formData.password) ? <FaCheckCircle className="mr-1 text-xs" /> : <span className="mr-1.5">•</span>}
                        Lowercase letter
                      </li>
                      <li className={`flex items-center ${/[0-9]/.test(formData.password) ? 'text-green-600' : ''}`}>
                        {/[0-9]/.test(formData.password) ? <FaCheckCircle className="mr-1 text-xs" /> : <span className="mr-1.5">•</span>}
                        Number
                      </li>
                      <li className={`flex items-center ${/[^A-Za-z0-9]/.test(formData.password) ? 'text-green-600' : ''}`}>
                        {/[^A-Za-z0-9]/.test(formData.password) ? <FaCheckCircle className="mr-1 text-xs" /> : <span className="mr-1.5">•</span>}
                        Special character
                      </li>
                    </ul>
                  </div>
                  
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <FaExclamationTriangle className="mr-1" /> {errors.password}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-10 flex flex-col-reverse sm:flex-row sm:justify-end gap-4">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => router.push('/admin_dashboard/list_user')}
                  className="px-6 py-3.5 border border-gray-300 text-base font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                  disabled={isSubmitting}
                >
                  Cancel
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="px-6 py-3.5 border border-transparent text-base font-medium rounded text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all flex items-center justify-center min-w-[180px] shadow-md"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Creating User...
                    </>
                  ) : (
                    'Create User Account'
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-6 bg-blue-50 rounded border border-blue-100 p-5"
        >
          <h3 className="text-lg font-medium text-gray-800 flex items-center mb-3">
            <FaExclamationTriangle className="mr-2 text-blue-500" />
            Important Information
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              All fields marked with * are required
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              New users are always created with Active status
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Resign date is not applicable for new users and can be set later
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Passwords are securely hashed and never stored in plain text
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Profile photos must be JPG, PNG, or WebP and under 5MB
            </li>
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
}