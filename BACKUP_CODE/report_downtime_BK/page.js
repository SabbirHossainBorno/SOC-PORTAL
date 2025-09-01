//app/user_dashboard/report_downtime/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaCalendarAlt, FaClock, FaExclamationTriangle, FaPaperPlane, 
  FaSpinner, FaCheckCircle, FaHistory, FaSyncAlt, FaPlus, FaMinus, FaChartBar
} from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { toast, Toaster } from 'react-hot-toast';

const ReportDowntime = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    issueTitle: '',
    categories: [],
    impactedService: '',
    impactType: '',
    modality: '',
    reliabilityImpacted: 'NO',
    startTime: null,
    endTime: null,
    duration: '',
    concern: '',
    reason: '',
    resolution: '',
    ticketId: '',
    ticketLink: '',
    systemUnavailability: '',
    trackedBy: ''
  });
  
  const [categoryTimes, setCategoryTimes] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [topIssues, setTopIssues] = useState([]);
  const [predefinedIssues, setPredefinedIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // All available categories
  const allCategories = [
    'APP', 'USSD', 'WEB', 'ADD MONEY', 'BILL PAYMENT', 
    'E-COM PAYMENT', 'MOBILE RECHARGE', 'RESUBMIT KYC',
    'REGISTRATION', 'SMS', 'TRANSFER MONEY', 'REMITTANCE'
  ];
  
  // Impact types
  const impactTypes = ['FULL', 'PARTIAL'];
  
  // Modalities
  const modalities = ['PLANNED', 'UNPLANNED'];
  
  // Concerns
  const concerns = ['INTERNAL', 'EXTERNAL'];
  
  // System unavailability options
  const systemOptions = ['SYSTEM', 'DATABASE', 'NETWORK', 'MIDDLEWARE', 'EXTERNAL'];

  // Get user info, top issues, and predefined issues on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch user info
        const userResponse = await fetch('/api/user_dashboard/user_info');
        const userData = await userResponse.json();
        
        if (userResponse.ok) {
          setUserInfo(userData);
          setFormData(prev => ({
            ...prev,
            ticketId: '',
            ticketLink: '',
            // Use shortName if available, otherwise fallback to full name
            trackedBy: userData.shortName || 
                      `${userData.firstName} ${userData.lastName}`
          }));
        }
        
        // Fetch top issues
        const issuesResponse = await fetch('/api/user_dashboard/report_downtime');
        const issuesData = await issuesResponse.json();
        
        if (issuesResponse.ok) {
          setTopIssues(issuesData.topIssues || []);
        }
        
        // Fetch predefined issues
        const predefinedResponse = await fetch('/api/user_dashboard/report_downtime/pre_defined_issue');
        const predefinedData = await predefinedResponse.json();
        
        if (predefinedResponse.ok) {
          setPredefinedIssues(predefinedData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Initialize category times when categories change
  useEffect(() => {
    const newCategoryTimes = { ...categoryTimes };
    let hasChanges = false;
    
    formData.categories.forEach(category => {
      if (!newCategoryTimes[category]) {
        newCategoryTimes[category] = {
          startTime: formData.startTime,
          endTime: formData.endTime
        };
        hasChanges = true;
      }
    });
    
    // Remove unselected categories
    Object.keys(newCategoryTimes).forEach(category => {
      if (!formData.categories.includes(category)) {
        delete newCategoryTimes[category];
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setCategoryTimes(newCategoryTimes);
    }
  }, [formData.categories, formData.startTime, formData.endTime]);

  // Toggle category selection
  const toggleCategory = (category) => {
    setFormData(prev => {
      if (prev.categories.includes(category)) {
        return {
          ...prev,
          categories: prev.categories.filter(c => c !== category)
        };
      } else {
        return {
          ...prev,
          categories: [...prev.categories, category]
        };
      }
    });
  };

  // Apply issue template
  const applyIssueTemplate = (issue) => {
    setFormData(prev => ({
      ...prev,
      issueTitle: issue.title,
      categories: issue.categories,
      impactedService: issue.template.impactedService,
      impactType: issue.template.impactType,
      modality: issue.template.modality,
      reliabilityImpacted: issue.template.reliabilityImpacted,
      systemUnavailability: issue.template.systemUnavailability,
      reason: issue.template.reason,
      resolution: issue.template.resolution
    }));
    
    toast.success(`"${issue.title}" template applied`, {
      icon: <FaSyncAlt className="text-blue-500" />,
      position: 'top-right'
    });
  };

  // Calculate duration and reliability
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      // Calculate duration
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      
      if (start > end) {
        setErrors(prev => ({ ...prev, endTime: 'End time cannot be before start time' }));
        return;
      }
      
      const diffMs = end - start;
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);
      
      setFormData(prev => ({
        ...prev,
        duration: `${diffHrs.toString().padStart(2, '0')}:${diffMins.toString().padStart(2, '0')}`
      }));
      
      // Calculate reliability impacted
      if (formData.impactType === 'FULL' && formData.modality === 'UNPLANNED') {
        setFormData(prev => ({ ...prev, reliabilityImpacted: 'YES' }));
      } else {
        setFormData(prev => ({ ...prev, reliabilityImpacted: 'NO' }));
      }
    }
  }, [formData.startTime, formData.endTime, formData.impactType, formData.modality]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDateTimeChange = (name, date) => {
    setFormData(prev => ({ ...prev, [name]: date }));
    
    // Update all category times with the new main time
    if (name === 'startTime' || name === 'endTime') {
      const newCategoryTimes = { ...categoryTimes };
      Object.keys(newCategoryTimes).forEach(category => {
        newCategoryTimes[category][name] = date;
      });
      setCategoryTimes(newCategoryTimes);
    }
  };

  const handleCategoryTimeChange = (category, name, date) => {
    setCategoryTimes(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [name]: date
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'issueTitle', 'impactedService', 
      'impactType', 'modality', 'startTime', 
      'endTime', 'concern', 'reason', 'resolution',
      'systemUnavailability'
    ];
    
    // Validate categories
    if (formData.categories.length === 0) {
      newErrors.categories = 'At least one category is required';
    }
    
    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'This field is required';
      }
    });
    
    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      
      if (start > end) {
        newErrors.endTime = 'End time cannot be before start time';
      }
    }
    
    // Validate category times
    formData.categories.forEach(category => {
      const catTime = categoryTimes[category];
      if (catTime) {
        if (catTime.startTime && catTime.endTime) {
          const start = new Date(catTime.startTime);
          const end = new Date(catTime.endTime);
          
          if (start > end) {
            newErrors[`${category}-endTime`] = `End time cannot be before start time for ${category}`;
          }
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Prepare data to send
      const downtimeData = {
        ...formData,
        categoryTimes: categoryTimes
      };
      
      const response = await fetch('/api/user_dashboard/report_downtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(downtimeData),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        const message = formData.categories.length > 1
          ? `Downtime reported for ${formData.categories.length} categories! ID: ${result.downtimeId}`
          : `Downtime reported successfully! ID: ${result.downtimeId}`;
        
        toast.success(message, {
          duration: 5000,
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
        
        // Reset form after success
        setFormData({
          issueTitle: '',
          categories: [],
          impactedService: '',
          impactType: '',
          modality: '',
          reliabilityImpacted: 'NO',
          startTime: null,
          endTime: null,
          duration: '',
          concern: '',
          reason: '',
          resolution: '',
          ticketId: '',
          systemUnavailability: '',
          trackedBy: userInfo?.shortName || 
                    `${userInfo?.firstName} ${userInfo?.lastName}`
        });
        setCategoryTimes({});
        
        // Redirect after delay
        setTimeout(() => {
          router.push('/user_dashboard');
        }, 3000);
      } else {
        throw new Error(result.message || 'Failed to report downtime');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to report downtime. Please try again.', {
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

  // Custom input for date picker
  const CustomDateTimeInput = ({ value, onClick, placeholder }) => (
    <div 
      onClick={onClick}
      className={`w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400 cursor-pointer flex items-center ${
        !value ? 'text-gray-400' : ''
      }`}
    >
      <FaCalendarAlt className="mr-3 text-blue-500" />
      <span className="flex-grow">{value || placeholder}</span>
      <FaClock className="ml-auto text-blue-500" />
    </div>
  );


  // Format date and time for display
  const formatDateTime = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Category badge component
  const CategoryBadge = ({ category, selected }) => (
    <div 
      onClick={() => toggleCategory(category)}
      className={`px-3 py-2 rounded-full cursor-pointer transition-all flex items-center ${
        selected 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
      }`}
    >
      <span className="mr-2">{category}</span>
      {selected ? <FaMinus size={12} /> : <FaPlus size={12} />}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4 sm:px-6">
      <Toaster />
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORM SECTION - 2/3 width on large screens */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded shadow-lg overflow-hidden">
            {/* Form header with reset button */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-3 rounded bg-white/20 mr-4">
                    <FaExclamationTriangle className="text-2xl text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Downtime Report Form</h2>
                    <p className="text-blue-100 text-sm">Fill all required fields accurately</p>
                  </div>
                </div>
                
                {/* Reset Button */}
                <button 
                  onClick={() => {
                    // Reset form data
                    setFormData({
                      issueTitle: '',
                      categories: [],
                      impactedService: '',
                      impactType: '',
                      modality: '',
                      reliabilityImpacted: 'NO',
                      startTime: null,
                      endTime: null,
                      duration: '',
                      concern: '',
                      reason: '',
                      resolution: '',
                      ticketId: '',
                      systemUnavailability: '',
                      trackedBy: userInfo?.shortName || 
                                `${userInfo?.firstName} ${userInfo?.lastName}`
                    });
                    
                    // Reset category times
                    setCategoryTimes({});
                    
                    // Clear errors
                    setErrors({});
                    
                    // Show confirmation toast
                    toast.success('Form reset successfully!', {
                      icon: '🔄',
                      position: 'top-right',
                      style: {
                        background: '#f0fdf4',
                        color: '#15803d',
                        padding: '16px',
                        border: '1px solid #bbf7d0',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }
                    });
                  }}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-all group"
                  aria-label="Reset form"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    className="w-5 h-5 text-white group-hover:rotate-[-45deg] transition-transform"
                  >
                    <path 
                      fill="currentColor" 
                      d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Downtime Date */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded p-5 border border-blue-200 shadow-sm">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3 border-2 border-blue-300 shadow-inner">
                      <FaCalendarAlt className="text-blue-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Downtime Date
                      </label>
                      <p className="text-xs text-blue-600">
                        Based on start time selection
                      </p>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className={`w-full px-4 py-5 rounded ${
                      formData.startTime 
                        ? "bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 text-blue-800 font-bold" 
                        : "bg-white border-2 border-dashed border-gray-300 text-gray-400"
                    } text-center text-lg shadow-inner`}>
                      {formData.startTime 
                        ? new Date(formData.startTime).toLocaleDateString('en-GB', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                        : 'Select start time to see date'}
                    </div>
                  </div>
                </div>
                  
                  {/* Tracked By */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded p-5 border border-indigo-200 shadow-sm">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3 border-2 border-indigo-300 shadow-inner">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5 text-indigo-600" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Tracked By
                      </label>
                      <p className="text-xs text-indigo-600">
                        Automatically detected user
                      </p>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className={`w-full px-4 py-5 rounded ${
                      formData.trackedBy 
                        ? "bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-300 text-indigo-800 font-bold" 
                        : "bg-white border-2 border-dashed border-gray-300 text-gray-400"
                    } text-center text-lg shadow-inner`}>
                      {formData.trackedBy || 'User information will appear here'}
                    </div>
                  </div>
                </div>
                
                {/* Issue Title */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Title *
                  </label>
                  <input
                    type="text"
                    name="issueTitle"
                    value={formData.issueTitle}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded border ${
                      errors.issueTitle ? 'border-red-400' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400`}
                    placeholder="e.g., Delayed App Response"
                  />
                  {errors.issueTitle && (
                    <p className="mt-1 text-sm text-red-600">{errors.issueTitle}</p>
                  )}
                </div>
                
                {/* Responsive Single-Line Category Selection */}
                <div className="md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 rounded bg-indigo-500 flex items-center justify-center mr-2 shadow-sm">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-4 w-4 text-white" 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Affected Categories</h3>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Select impacted services <span className="text-red-500">*</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center bg-white border border-indigo-200 rounded-full px-2.5 py-0.5 shadow-inner">
                      <span className="text-xs font-bold text-indigo-700">{formData.categories.length}</span>
                      <span className="text-xs text-gray-500 ml-1">/{allCategories.length}</span>
                    </div>
                  </div>
                  
                  {/* Responsive Single-Line Category Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
                  {allCategories.map(category => {
                    const isSelected = formData.categories.includes(category);
                    return (
                      <div
                        key={category}
                        onClick={() => toggleCategory(category)}
                        className={`
                          relative p-2 rounded border cursor-pointer transition-colors
                          flex items-center justify-center
                          min-h-[40px] whitespace-nowrap overflow-hidden
                          ${isSelected
                            ? "border-indigo-500 bg-indigo-50 shadow-indigo-xs"
                            : "border-gray-200 bg-white hover:border-indigo-300"
                          }`
                        }
                      >
                        {isSelected && (
                          <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-2.5 w-2.5 text-white" 
                              viewBox="0 0 20 20" 
                              fill="currentColor"
                            >
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        
                        <span className={`text-xs font-medium ${
                          isSelected ? "text-indigo-700" : "text-gray-700"
                        } truncate max-w-full px-1`}>
                          {category}
                        </span>
                      </div>
                    );
                  })}
                </div>
                  
                  {/* Validation Error */}
                  {errors.categories && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-center animate-pulse">
                      <FaExclamationTriangle className="text-red-500 text-sm mr-2 flex-shrink-0" />
                      <p className="text-red-700 text-sm">{errors.categories}</p>
                    </div>
                  )}
                  
                  {/* Compact Selected Categories Preview */}
                  {formData.categories.length > 0 && (
                    <div className="bg-indigo-50 rounded p-4 border border-indigo-100 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <FaCheckCircle className="text-indigo-600 text-sm mr-1.5" />
                          <span className="text-sm font-medium text-indigo-700">Selected:</span>
                        </div>
                        <button 
                          onClick={() => {
                            setFormData(prev => ({...prev, categories: []}));
                            setErrors(prev => ({...prev, categories: ""}));
                          }}
                          className="text-xs text-red-600 hover:text-red-800 flex items-center"
                        >
                          <FaMinus className="mr-1 text-[0.6rem]" />
                          Clear all
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {formData.categories.map(category => (
                          <div 
                            key={category} 
                            className="flex items-center bg-white px-2.5 py-1 rounded-full text-xs border border-indigo-100 whitespace-nowrap"
                          >
                            <span className="text-indigo-700 font-medium truncate max-w-[120px]">{category}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCategory(category);
                              }}
                              className="ml-1.5 text-gray-400 hover:text-red-500"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                                
                {/* Main Downtime Section */}
                <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-6">
                  <h3 className="font-semibold text-gray-900 mb-5 flex items-center text-lg">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <FaClock className="text-blue-600" />
                    </div>
                    Main Downtime Period
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Start Date & Time */}
                    <div className="bg-blue-50 rounded p-5 border border-blue-100">
                      <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <FaCalendarAlt className="mr-2 text-blue-500" />
                        Start Date & Time *
                      </label>
                      
                      <div className="relative">
                        <DatePicker
                          selected={formData.startTime}
                          onChange={(date) => handleDateTimeChange('startTime', date)}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={1}
                          timeCaption="Time"
                          dateFormat="dd/MM/yyyy HH:mm"
                          customInput={
                            <div className={`relative cursor-pointer ${errors.startTime ? 'ring-2 ring-red-500 rounded' : ''}`}>
                              <div className="w-full px-4 py-3 rounded border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 flex items-center shadow-sm hover:border-blue-300 transition-colors">
                                <FaCalendarAlt className="text-blue-500 mr-3" />
                                <span className="flex-grow">
                                  {formData.startTime 
                                    ? formatDateTime(formData.startTime) 
                                    : 'Select start date & time'}
                                </span>
                              </div>
                            </div>
                          }
                          className="w-full"
                        />
                        
                        {formData.startTime && (
                          <button 
                            onClick={() => handleDateTimeChange('startTime', null)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-red-500 transition-colors"
                            aria-label="Clear date"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      
                      {errors.startTime && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <FaExclamationTriangle className="mr-1" /> {errors.startTime}
                        </p>
                      )}
                    </div>
                    
                    {/* End Date & Time */}
                    <div className="bg-blue-50 rounded p-5 border border-blue-100">
                      <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <FaCalendarAlt className="mr-2 text-blue-500" />
                        End Date & Time *
                      </label>
                      
                      <div className="relative">
                        <DatePicker
                          selected={formData.endTime}
                          onChange={(date) => handleDateTimeChange('endTime', date)}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={1}
                          timeCaption="Time"
                          dateFormat="dd/MM/yyyy HH:mm"
                          customInput={
                            <div className={`relative cursor-pointer ${errors.endTime ? 'ring-2 ring-red-500 rounded' : ''}`}>
                              <div className="w-full px-4 py-3 rounded border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 flex items-center shadow-sm hover:border-blue-300 transition-colors">
                                <FaCalendarAlt className="text-blue-500 mr-3" />
                                <span className="flex-grow">
                                  {formData.endTime 
                                    ? formatDateTime(formData.endTime) 
                                    : 'Select end date & time'}
                                </span>
                              </div>
                            </div>
                          }
                          className="w-full"
                        />
                        
                        {formData.endTime && (
                          <button 
                            onClick={() => handleDateTimeChange('endTime', null)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-red-500 transition-colors"
                            aria-label="Clear date"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      
                      {errors.endTime && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <FaExclamationTriangle className="mr-1" /> {errors.endTime}
                        </p>
                      )}
                    </div>
                    
                    {/* Duration */}
                    <div className="bg-indigo-50 rounded p-5 border border-indigo-100">
                      <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <FaClock className="mr-2 text-indigo-500" />
                        Duration (HH:MM)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="duration"
                          value={formData.duration || '00:00'}
                          readOnly
                          className="w-full px-4 py-3 rounded border border-indigo-200 bg-white text-gray-800 font-mono shadow-sm"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-gray-500">HRS</span>
                        </div>
                      </div>
                      {formData.duration && (
                        <p className="mt-2 text-sm text-indigo-600">
                          Total downtime duration
                        </p>
                      )}
                    </div>
                    
                    {/* Reliability Impacted */}
                    <div className={`rounded p-5 border ${
                      formData.reliabilityImpacted === 'YES' 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <FaExclamationTriangle className={`mr-2 ${
                          formData.reliabilityImpacted === 'YES' 
                            ? 'text-red-500' 
                            : 'text-green-500'
                        }`} />
                        Reliability Impacted
                      </label>
                      
                      <div className="flex items-center">
                        <div className={`text-lg font-bold px-4 py-2 rounded ${
                          formData.reliabilityImpacted === 'YES' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {formData.reliabilityImpacted}
                        </div>
                        
                        <div className="ml-4">
                          {formData.reliabilityImpacted === 'YES' ? (
                            <div className="flex items-center text-red-600">
                              <FaExclamationTriangle className="mr-1" />
                              <span className="text-sm">Will affect reliability metrics</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-green-600">
                              <FaCheckCircle className="mr-1" />
                              <span className="text-sm">No impact on reliability</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <p className="mt-2 text-xs text-gray-500">
                        Auto-calculated based on impact type and modality
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Per-Category Downtime Section */}
                {formData.categories.length > 0 && (
                  <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-4">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <FaClock className="mr-2 text-blue-600" />
                      Per-Category Downtime Periods
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Defaults to main downtime period. Edit individual categories if needed.
                    </p>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Start Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              End Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Duration (HH:MM)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {formData.categories.map(category => {
                            const catTime = categoryTimes[category] || {};
                            const startTime = catTime.startTime ? new Date(catTime.startTime) : null;
                            const endTime = catTime.endTime ? new Date(catTime.endTime) : null;
                            
                            // Calculate duration
                            let duration = '';
                            if (startTime && endTime) {
                              const diffMs = endTime - startTime;
                              if (diffMs > 0) {
                                const diffHrs = Math.floor(diffMs / 3600000);
                                const diffMins = Math.floor((diffMs % 3600000) / 60000);
                                duration = `${diffHrs.toString().padStart(2, '0')}:${diffMins.toString().padStart(2, '0')}`;
                              }
                            }
                            
                            return (
                              <tr key={category}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {category}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <DatePicker
                                    selected={startTime}
                                    onChange={(date) => handleCategoryTimeChange(category, 'startTime', date)}
                                    showTimeSelect
                                    timeFormat="HH:mm"
                                    timeIntervals={1}
                                    timeCaption="Time"
                                    dateFormat="dd/MM/yyyy HH:mm"
                                    customInput={<CustomDateTimeInput placeholder="Select start" />}
                                    className="w-full"
                                  />
                                  {startTime && (
                                    <p className="mt-1 text-xs text-gray-500">
                                      {formatDateTime(startTime)}
                                    </p>
                                  )}
                                  {errors[`${category}-startTime`] && (
                                    <p className="mt-1 text-xs text-red-600">{errors[`${category}-startTime`]}</p>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <DatePicker
                                    selected={endTime}
                                    onChange={(date) => handleCategoryTimeChange(category, 'endTime', date)}
                                    showTimeSelect
                                    timeFormat="HH:mm"
                                    timeIntervals={1}
                                    timeCaption="Time"
                                    dateFormat="dd/MM/yyyy HH:mm"
                                    customInput={<CustomDateTimeInput placeholder="Select end" />}
                                    className="w-full"
                                  />
                                  {endTime && (
                                    <p className="mt-1 text-xs text-gray-500">
                                      {formatDateTime(endTime)}
                                    </p>
                                  )}
                                  {errors[`${category}-endTime`] && (
                                    <p className="mt-1 text-xs text-red-600">{errors[`${category}-endTime`]}</p>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="bg-gray-100 px-3 py-2 rounded">
                                    {duration || 'N/A'}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* Impacted Service */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Impacted Service *
                  </label>
                  <input
                    type="text"
                    name="impactedService"
                    value={formData.impactedService}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded border ${
                      errors.impactedService ? 'border-red-400' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400`}
                    placeholder="e.g., Payment Gateway"
                  />
                  {errors.impactedService && (
                    <p className="mt-1 text-sm text-red-600">{errors.impactedService}</p>
                  )}
                </div>
                
                {/* Impact Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Impact Type *
                  </label>
                  <select
                    name="impactType"
                    value={formData.impactType}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded border ${
                      errors.impactType ? 'border-red-400' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800`}
                  >
                    <option value="">Select Impact Type</option>
                    {impactTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.impactType && (
                    <p className="mt-1 text-sm text-red-600">{errors.impactType}</p>
                  )}
                </div>
                
                {/* Modality */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modality *
                  </label>
                  <select
                    name="modality"
                    value={formData.modality}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded border ${
                      errors.modality ? 'border-red-400' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800`}
                  >
                    <option value="">Select Modality</option>
                    {modalities.map(mod => (
                      <option key={mod} value={mod}>{mod}</option>
                    ))}
                  </select>
                  {errors.modality && (
                    <p className="mt-1 text-sm text-red-600">{errors.modality}</p>
                  )}
                </div>
                
                {/* Concern */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Concern *
                  </label>
                  <select
                    name="concern"
                    value={formData.concern}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded border ${
                      errors.concern ? 'border-red-400' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800`}
                  >
                    <option value="">Select Concern</option>
                    {concerns.map(concern => (
                      <option key={concern} value={concern}>{concern}</option>
                    ))}
                  </select>
                  {errors.concern && (
                    <p className="mt-1 text-sm text-red-600">{errors.concern}</p>
                  )}
                </div>
                
                {/* System Unavailability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Unavailability *
                  </label>
                  <select
                    name="systemUnavailability"
                    value={formData.systemUnavailability}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded border ${
                      errors.systemUnavailability ? 'border-red-400' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800`}
                  >
                    <option value="">Select System Issue</option>
                    {systemOptions.map(sys => (
                      <option key={sys} value={sys}>{sys}</option>
                    ))}
                  </select>
                  {errors.systemUnavailability && (
                    <p className="mt-1 text-sm text-red-600">{errors.systemUnavailability}</p>
                  )}
                </div>
                
                {/* Ticket ID */}
                {/* Ticket ID and Link Section */}
                <div className="space-y-4">
                  {/* Ticket ID Field */}
                  <div className="bg-gray-50 rounded p-5 border border-gray-200">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5 text-gray-600" 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6a2 2 0 012-2V6zm3 2h10V6H5v2zm10 4H5v2h10v-2z" />
                        </svg>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Service Desk Ticket ID
                        </label>
                        <p className="text-xs text-gray-500">
                          Optional - for tracking purposes
                        </p>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <input
                        type="text"
                        name="ticketId"
                        value={formData.ticketId}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400"
                        placeholder="NAGAD-XXXX"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {formData.ticketId ? (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            ID Entered
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                            Optional
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Format: NAGAD-XXXX (e.g., NAGAD-1709)
                    </p>
                  </div>
                  
                  {/* Conditionally Render Ticket Link Field */}
                  {formData.ticketId && (
                    <div className="bg-blue-50 rounded p-5 border border-blue-200 animate-fadeIn">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-5 w-5 text-blue-600" 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                          </svg>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Ticket Link
                          </label>
                          <p className="text-xs text-gray-500">
                            Direct link to the service desk ticket
                          </p>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <input
                          type="text"
                          name="ticketLink"
                          value={formData.ticketLink}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400"
                          placeholder="https://servicedesk.example.com/tickets/NAGAD-1234"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            Required
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-blue-600">
                        <FaExclamationTriangle className="inline mr-1" />
                        Please provide the direct link to this ticket
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Reason */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason *
                  </label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded border ${
                      errors.reason ? 'border-red-400' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400 min-h-[100px]`}
                    placeholder="Explain the cause of the downtime"
                  />
                  {errors.reason && (
                    <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
                  )}
                </div>
                
                {/* Resolution */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolution *
                  </label>
                  <textarea
                    name="resolution"
                    value={formData.resolution}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded border ${
                      errors.resolution ? 'border-red-400' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400 min-h-[100px]`}
                    placeholder="Describe how the issue was resolved"
                  />
                  {errors.resolution && (
                    <p className="mt-1 text-sm text-red-600">{errors.resolution}</p>
                  )}
                </div>
              </div>
              
              {/* Special Notice for Multiple Categories */}
              {formData.categories.length > 1 && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FaExclamationTriangle className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        <strong>Note:</strong> You are reporting downtime for {formData.categories.length} categories. 
                        This will create separate records for each category under the same downtime ID.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Form Actions */}
              <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/user_dashboard')}
                  className="px-6 py-3 border border-gray-300 text-base font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className="px-6 py-3 border border-transparent text-base font-medium rounded text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all flex items-center justify-center min-w-[180px] shadow-md"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane className="mr-2" />
                      Report Downtime
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          </div>
        </div>
        
        {/* SIDEBAR SECTION - 1/3 width on large screens */}
        <div className="space-y-6">
          {/* Top Issues Panel */}
<div className="bg-white rounded shadow-lg overflow-hidden">
  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
    <div className="flex items-center">
      <div className="p-3 rounded bg-white/20 mr-4">
        <FaChartBar className="text-2xl text-white" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">Top Issues</h2>
        <p className="text-blue-100 text-sm">Most frequent incidents</p>
      </div>
    </div>
  </div>
  
  <div className="p-6">
    {isLoading ? (
      <div className="flex justify-center py-4">
        <FaSpinner className="animate-spin text-2xl text-blue-500" />
      </div>
    ) : topIssues.length > 0 ? (
      <div className="space-y-3">
        {topIssues.map((issue, index) => (
          <div 
            key={`top-${index}`}
            className="p-3 border border-gray-200 rounded bg-white"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-800 text-sm truncate pr-2">
                {issue.issue_title}
              </h3>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded whitespace-nowrap">
                {issue.incident_count} times
              </span>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center py-4">
        <p className="text-gray-600 text-sm">No frequent issues found</p>
      </div>
    )}
  </div>
</div>
          
          {/* Predefined Issues Panel */}
          <div className="bg-white rounded shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex items-center">
                <div className="p-3 rounded bg-white/20 mr-4">
                  <FaExclamationTriangle className="text-2xl text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Predefined Issues</h2>
                  <p className="text-blue-100 text-sm">Select to apply full template</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <FaSpinner className="animate-spin text-2xl text-blue-500" />
                </div>
              ) : predefinedIssues.length > 0 ? (
                <div className="space-y-4">
                  {predefinedIssues.map((issue, index) => (
                    <div 
                      key={index}
                      onClick={() => applyIssueTemplate(issue)}
                      className="p-4 border border-gray-200 rounded cursor-pointer hover:bg-blue-50 transition-colors group bg-blue-50 border-blue-200"
                    >
                      <h3 className="font-medium text-blue-800 group-hover:text-blue-900">
                        {issue.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {issue.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {issue.categories.slice(0, 3).map(cat => (
                          <span key={cat} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {cat}
                          </span>
                        ))}
                        {issue.categories.length > 3 && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            +{issue.categories.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No predefined issues found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDowntime;