// app/user_dashboard/report_downtime/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaCalendarAlt, FaClock, FaExclamationTriangle, FaPaperPlane, 
  FaSpinner, FaCheckCircle, FaHistory, FaSyncAlt, FaPlus, FaMinus, FaChartBar
} from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import toast from 'react-hot-toast';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

// Add this validation function at the top of your component
const validateDateTime = (date, fieldName) => {
  if (!date) return { isValid: true };
  
  const now = new Date();
  const selectedDate = new Date(date);
  
  // Check if selected date/time is in the future
  if (selectedDate > now) {
    return {
      isValid: false,
      message: 'Cannot select future date or time'
    };
  }
  
  return { isValid: true };
};

// Custom MultiSelectDropdown Component
const MultiSelectDropdown = ({ 
  label, 
  name, 
  options, 
  selectedValues, 
  errors,
  required = false,
  onSelectChange,
  onSelectAll,
  onClearAll
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOptionClick = (option) => {
    const isCurrentlySelected = selectedValues.includes(option);
    onSelectChange(name, option, !isCurrentlySelected);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelectAll = () => {
    onSelectAll(name, options);
  };

  const handleClearAll = () => {
    onClearAll(name);
  };

  const removeOption = (option, e) => {
    e.stopPropagation();
    onSelectChange(name, option, false);
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <div 
          onClick={toggleDropdown}
          className={`min-h-[48px] p-3 border rounded bg-white cursor-pointer ${
            errors[name] ? 'border-red-400' : 'border-gray-300'
          } ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
        >
          <div className="flex flex-wrap gap-1">
  {selectedValues.map(value => (
    <span 
      key={value}
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
        value === 'ALL' 
          ? 'bg-green-100 text-green-800 border border-green-300' 
          : 'bg-blue-100 text-blue-800'
      }`}
    >
      {value}
      {value !== 'ALL' && ( // Don't show remove button for "ALL"
        <button
          type="button"
          onClick={(e) => removeOption(value, e)}
          className="ml-1 text-blue-600 hover:text-blue-800 text-xs w-3 h-3 flex items-center justify-center"
        >
          ×
        </button>
      )}
    </span>
  ))}
  {selectedValues.length === 0 && (
    <span className="text-gray-400 text-sm">Select options...</span>
  )}
</div>
        </div>
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg 
            className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Dropdown options */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 border border-gray-200 rounded bg-white shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2 border-b border-gray-100 bg-gray-50">
              <div className="flex justify-between text-xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>
            
            <div className="p-2 space-y-1">
  {options.map(option => {
    const isSelected = selectedValues.includes(option);
    const isAllOption = option === 'ALL';
    
    return (
      <div 
        key={option} 
        onClick={() => handleOptionClick(option)}
        className={`flex items-center space-x-2 p-2 rounded cursor-pointer ${
          isAllOption 
            ? 'bg-green-50 border border-green-200' 
            : 'hover:bg-gray-50'
        }`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          className={`rounded border-gray-300 focus:ring-blue-500 pointer-events-none ${
            isAllOption ? 'text-green-600' : 'text-blue-600'
          }`}
        />
        <span className={`text-sm flex-1 ${
          isAllOption ? 'text-green-700 font-medium' : 'text-gray-700'
        }`}>
          {option}
          {isAllOption && <span className="text-green-600 text-xs ml-2">(All Options)</span>}
        </span>
      </div>
    );
  })}
</div>
          </div>
        )}
      </div>

      {errors[name] && (
        <p className="text-sm text-red-600">{errors[name]}</p>
      )}
    </div>
  );
};

const ReportDowntime = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    issueTitle: '',
    categories: [],
    affectedChannel: ['ALL'],
    affectedPersona: ['ALL'],
    affectedMNO: ['ALL'],
    affectedPortal: ['ALL'],
    affectedType: ['ALL'],
    affectedService: ['ALL'],
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
    trackedBy: '',
    remark: ''
  });
  
  const [categoryTimes, setCategoryTimes] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [topIssues, setTopIssues] = useState([]);
  const [predefinedIssues, setPredefinedIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCategoriesManuallyModified, setIsCategoriesManuallyModified] = useState(false);

  // All categories
  const allCategories = [
    'SEND MONEY', 'CASHOUT', 'BILL PAYMENT', 'EMI PAYMENT', 
    'MERCHANT PAYMENT', 'MOBILE RECHARGE', 'ADD MONEY', 
    'TRANSFER MONEY', 'B2B', 'B2M', 'CASHIN', 
    'TRANSACTION HISTORY', 'RE-SUBMIT KYC', 'REGISTRATION', 'E-COM PAYMENT',
    'DEVICE CHANGE', 'PROFILE VISIBILITY', 'BLOCK OPERATION', 'LIFTING',
    'REFUND', 'DISBURSEMENT', 'REVERSAL', 'CLAWBACK', 'KYC OPERATIONS', 'PARTNER REGISTRATION',
    'REMITTANCE', 'BANK TO NAGAD'
  ];

  // Category mappings for automatic selection
const serviceToCategoriesMap = {
  'ALL TRANSACTIONS': [
    'SEND MONEY', 'CASHOUT', 'BILL PAYMENT', 'EMI PAYMENT', 
    'MERCHANT PAYMENT', 'MOBILE RECHARGE', 'ADD MONEY', 
    'TRANSFER MONEY', 'B2B', 'B2M', 'CASHIN', 
    'E-COM PAYMENT', 'REMITTANCE', 'BANK TO NAGAD'
  ],
  'TRANSACTION HISTORY': ['TRANSACTION HISTORY'],
  'RE-SUBMIT KYC': ['RE-SUBMIT KYC'],
  'REGISTRATION': ['REGISTRATION'],
  'PROFILE VISIBILITY': ['PROFILE VISIBILITY'],
  'BLOCK OPERATION': ['BLOCK OPERATION'],
  'LIFTING': ['LIFTING'],
  'REFUND': ['REFUND'],
  'DISBURSEMENT': ['DISBURSEMENT'],
  'REVERSAL': ['REVERSAL'],
  'KYC OPERATIONS': ['KYC OPERATIONS'],
  'PARTNER REGISTRATION': ['PARTNER REGISTRATION'],
  'DEVICE CHANGE': ['DEVICE CHANGE'],
  // SMS Channel specific mappings
  'E-COM PAYMENT': ['E-COM PAYMENT'],
  'KYC': ['RE-SUBMIT KYC'],
  // WEB + E-COM WEB specific mapping
  'RPG-WEB': ['E-COM PAYMENT']  // Add this mapping
};
  
  const impactTypes = ['FULL', 'PARTIAL'];
  const modalities = ['PLANNED', 'UNPLANNED'];
  const concerns = ['INTERNAL', 'EXTERNAL'];
  const [systemOptions, setSystemOptions] = useState([]);

  // All available options for dropdowns
  const allChannels = ['ALL', 'APP', 'USSD', 'WEB', 'SMS', 'MIDDLEWARE', 'INWARD SERVICE'];
  const allPersonas = ['ALL', 'CU', 'AG', 'DSO', 'DH'];
  const allMNOs = ['ALL', 'GRAMEENPHONE', 'BANGLALINK', 'ROBI/AIRTEL', 'TELETALK'];
  const allPortals = ['ALL', 'CC', 'SYS', 'DMS' , 'E-COM WEB'];
  const allTypes = ['ALL', 'REMITTANCE', 'BANK TO NAGAD'];

  // Update system options when concern changes
  useEffect(() => {
    if (formData.concern === 'INTERNAL') {
      setSystemOptions(['SYSTEM', 'DATABASE', 'NETWORK', 'MIDDLEWARE', 'SMS GATEWAY']);
    } else if (formData.concern === 'EXTERNAL') {
      setSystemOptions(['EXTERNAL', 'SMS GATEWAY']);
    } else {
      setSystemOptions([]);
    }
  }, [formData.concern]);

  // Fetch initial data
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
            trackedBy: userData.shortName || `${userData.firstName} ${userData.lastName}`
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
        console.error('Error fetching initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Auto-select categories when affected service changes
  useEffect(() => {
  if (isCategoriesManuallyModified) return;

  const selectedServices = formData.affectedService;
  const selectedChannels = formData.affectedChannel;
  const selectedPortals = formData.affectedPortal;
  
  console.log('Auto-select triggered:', {
    selectedServices,
    selectedChannels,
    selectedPortals,
    isCategoriesManuallyModified
  });

  // Check for special case: Only WEB + E-COM WEB + RPG-WEB
  const isOnlyWebWithEcomWebAndRpgWeb = 
    selectedChannels.length === 1 && 
    selectedChannels[0] === 'WEB' &&
    selectedPortals.length === 1 && 
    selectedPortals[0] === 'E-COM WEB' &&
    selectedServices.length === 1 && 
    selectedServices[0] === 'RPG-WEB';

  if (isOnlyWebWithEcomWebAndRpgWeb) {
    console.log('Special case detected: Only WEB + E-COM WEB + RPG-WEB, auto-selecting E-COM PAYMENT');
    setFormData(prev => ({
      ...prev,
      categories: ['E-COM PAYMENT']
    }));
    return;
  }

  // If ALL is selected, select all categories
  if (selectedServices.includes('ALL')) {
    setFormData(prev => ({
      ...prev,
      categories: [...allCategories]
    }));
    return;
  }

  // Auto-select based on service mappings
  const autoCategories = new Set();
  
  selectedServices.forEach(service => {
    if (serviceToCategoriesMap[service]) {
      serviceToCategoriesMap[service].forEach(category => {
        autoCategories.add(category);
      });
    }
    
    // Special handling for SMS channel services
    if (selectedChannels.includes('SMS')) {
      if (service === 'E-COM PAYMENT') {
        autoCategories.add('E-COM PAYMENT');
      }
      if (service === 'REGISTRATION') {
        autoCategories.add('REGISTRATION');
      }
      if (service === 'KYC') {
        autoCategories.add('RE-SUBMIT KYC');
      }
    }
  });

  // If specific services are selected, use auto-selected categories
  if (autoCategories.size > 0) {
    console.log('Auto-selected categories:', Array.from(autoCategories));
    setFormData(prev => ({
      ...prev,
      categories: Array.from(autoCategories)
    }));
  } else if (selectedServices.length > 0 && !selectedServices.includes('ALL')) {
    // If services are selected but no auto-mapping, clear categories
    console.log('No auto-mapping found, clearing categories');
    setFormData(prev => ({
      ...prev,
      categories: []
    }));
  }
}, [formData.affectedService, formData.affectedChannel, formData.affectedPortal, isCategoriesManuallyModified]);

  // Update category times
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

  // Add this helper function after the state declarations
const getOptionsForField = (fieldName) => {
  switch (fieldName) {
    case 'affectedChannel':
      return allChannels;
    case 'affectedPersona':
      return allPersonas;
    case 'affectedMNO':
      return allMNOs;
    case 'affectedPortal':
      return allPortals;
    case 'affectedType':
      return allTypes;
    case 'affectedService':
      return getAffectedServices();
    default:
      return [];
  }
};

  // Handle multiple selection for dropdowns
  const handleMultiSelectChange = (name, value, isSelected) => {
  console.log(`MultiSelect Change: ${name}, ${value}, ${isSelected}`);
  
  setFormData(prev => {
    const currentValues = prev[name] || [];
    const allOptions = getOptionsForField(name);
    
    // Special handling for affectedService when only one option is available (RPG-WEB case)
    if (name === 'affectedService' && allOptions.length === 1 && allOptions[0] === 'RPG-WEB') {
      if (isSelected) {
        return {
          ...prev,
          [name]: ['RPG-WEB']
        };
      } else {
        // Cannot deselect the only option
        return prev;
      }
    }
    
    const optionsWithoutAll = allOptions.filter(option => option !== 'ALL');
    
    if (isSelected) {
      // If selecting "ALL", clear other selections and select only "ALL"
      if (value === 'ALL') {
        console.log('Selecting ALL, clearing others');
        return {
          ...prev,
          [name]: ['ALL']
        };
      }
      
      // If selecting other options and "ALL" was selected, remove "ALL"
      let newValues;
      if (currentValues.includes('ALL')) {
        newValues = [value];
        console.log('Removing ALL, selecting:', value);
      } else {
        newValues = [...currentValues.filter(item => item !== 'ALL'), value];
        console.log('Adding to selection:', value, 'Current:', currentValues, 'New:', newValues);
      }
      
      // ✅ NEW: Check if user has selected ALL options (excluding "ALL")
      const selectedWithoutAll = newValues.filter(item => item !== 'ALL');
      const hasSelectedAllOptions = selectedWithoutAll.length === optionsWithoutAll.length;
      
      if (hasSelectedAllOptions && optionsWithoutAll.length > 0) {
        console.log('User selected all options, switching to ALL');
        return {
          ...prev,
          [name]: ['ALL']
        };
      }
      
      return {
        ...prev,
        [name]: newValues
      };
    } else {
      // Remove value
      const newValues = currentValues.filter(item => item !== value);
      console.log('Removing:', value, 'Current:', currentValues, 'New:', newValues);
      
      // If no values left, select "ALL" (unless it's the special single-option case)
      const finalValues = newValues.length === 0 && allOptions.includes('ALL') ? ['ALL'] : newValues;
      return {
        ...prev,
        [name]: finalValues
      };
    }
  });

  // Reset manual modification flag when ALL is selected in affected service
  if (name === 'affectedService' && value === 'ALL' && isSelected) {
    setIsCategoriesManuallyModified(false);
  }
};

  // Update the handleSelectAll function
const handleSelectAll = (name, allOptions) => {
  // ✅ Instead of selecting all individual options, just select "ALL"
  setFormData(prev => ({
    ...prev,
    [name]: ['ALL']
  }));

  if (name === 'affectedService') {
    setIsCategoriesManuallyModified(false);
  }
};

  /// Update the handleClearAll function
const handleClearAll = (name) => {
  setFormData(prev => ({
    ...prev,
    [name]: ['ALL'] // Clear means select "ALL"
  }));
};

  const toggleCategory = (category) => {
    setIsCategoriesManuallyModified(true);
    
    setFormData(prev => {
      const newCategories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];
      return { ...prev, categories: newCategories };
    });
  };

  // Handle select all categories
  const handleSelectAllCategories = () => {
    setIsCategoriesManuallyModified(true);
    setFormData(prev => ({
      ...prev,
      categories: [...allCategories]
    }));
    toast.success('All categories selected', {
      icon: '✅',
      position: 'top-right',
      duration: 2000
    });
  };

  // Handle clear all categories
  const handleClearAllCategories = () => {
    setIsCategoriesManuallyModified(true);
    setFormData(prev => ({ ...prev, categories: [] }));
    setErrors(prev => ({ ...prev, categories: "" }));
  };

  const applyIssueTemplate = (issue) => {
    setIsCategoriesManuallyModified(true);
    
    setFormData(prev => ({
    ...prev,
    issueTitle: issue.title,
    categories: issue.categories,
    affectedChannel: issue.template.affectedChannel || ['ALL'],
    affectedPersona: issue.template.affectedPersona || ['ALL'],
    affectedMNO: issue.template.affectedMNO || ['ALL'],
    affectedPortal: issue.template.affectedPortal || ['ALL'],
    affectedType: issue.template.affectedType || ['ALL'],
    affectedService: issue.template.affectedService || ['ALL'],
    impactType: issue.template.impactType || '',
    modality: issue.template.modality || '',
    reliabilityImpacted: issue.template.reliabilityImpacted || 'NO',
    systemUnavailability: issue.template.systemUnavailability || '',
    reason: issue.template.reason || '',
    resolution: issue.template.resolution || ''
  }));
  
  toast.success(`"${issue.title}" template applied`, {
    id: 'template-applied',
    icon: <FaSyncAlt className="text-blue-500" />,
    duration: 3000,
  });
};

  // Update duration and reliability when times change
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
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
    }

    // Automatically set reliabilityImpacted based on conditions
    if (formData.impactType === 'FULL' && formData.modality === 'UNPLANNED' && formData.concern === 'INTERNAL') {
      setFormData(prev => ({ ...prev, reliabilityImpacted: 'YES' }));
    } else {
      setFormData(prev => ({ ...prev, reliabilityImpacted: 'NO' }));
    }
  }, [formData.startTime, formData.endTime, formData.impactType, formData.modality, formData.concern]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDateTimeChange = (name, date) => {
  // Validate the selected date/time
  const validation = validateDateTime(date, name);
  
  if (!validation.isValid) {
    // Show toast notification
    toast.error(validation.message, {
      duration: 3000,
      position: 'top-right',
      icon: <FaExclamationTriangle className="text-red-500" />,
      style: {
        background: '#fef2f2',
        color: '#b91c1c',
        border: '1px solid #fecaca'
      }
    });
    
    // Clear the field if invalid
    setFormData(prev => ({ ...prev, [name]: null }));
    return;
  }
  
  // If valid, proceed with setting the date
  setFormData(prev => ({ ...prev, [name]: date }));
  
  if (name === 'startTime' || name === 'endTime') {
    const newCategoryTimes = { ...categoryTimes };
    Object.keys(newCategoryTimes).forEach(category => {
      newCategoryTimes[category][name] = date;
    });
    setCategoryTimes(newCategoryTimes);
  }
  
  if (errors[name]) {
    setErrors(prev => ({ ...prev, [name]: '' }));
  }
};

  const handleCategoryTimeChange = (category, name, date) => {
  // Validate the selected date/time for categories too
  const validation = validateDateTime(date, name);
  
  if (!validation.isValid) {
    toast.error(validation.message, {
      duration: 3000,
      position: 'top-right',
      icon: <FaExclamationTriangle className="text-red-500" />,
      style: {
        background: '#fef2f2',
        color: '#b91c1c',
        border: '1px solid #fecaca'
      }
    });
    return;
  }
  
  setCategoryTimes(prev => ({
    ...prev,
    [category]: {
      ...prev[category],
      [name]: date
    }
  }));

  // Clear category-specific errors when fixed
  if (errors.categoryTimes && errors.categoryTimes[category]) {
    setErrors(prev => {
      const newErrors = { ...prev };
      if (newErrors.categoryTimes) {
        delete newErrors.categoryTimes[category];
        if (Object.keys(newErrors.categoryTimes).length === 0) {
          delete newErrors.categoryTimes;
        }
      }
      return newErrors;
    });
  }
};

  // Comprehensive validation function
  const validateAllFields = () => {
    const newErrors = {};
    let hasErrors = false;

    // Required fields validation
    const requiredFields = {
      issueTitle: 'Issue title is required',
      impactType: 'Impact type is required',
      modality: 'Modality is required',
      startTime: 'Start time is required',
      endTime: 'End time is required',
      concern: 'Concern is required',
      reason: 'Reason is required',
      resolution: 'Resolution is required',
      systemUnavailability: 'System unavailability is required'
    };

    Object.entries(requiredFields).forEach(([field, message]) => {
      if (!formData[field]) {
        newErrors[field] = message;
        hasErrors = true;
      }
    });

    // Categories validation
    if (formData.categories.length === 0) {
      newErrors.categories = 'At least one category is required';
      hasErrors = true;
    }

    // Affected channel validation
    if (formData.affectedChannel.length === 0) {
      newErrors.affectedChannel = 'At least one channel is required';
      hasErrors = true;
    }

    // Main downtime period validation
    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      
      if (start > end) {
        newErrors.endTime = 'End time cannot be before start time';
        hasErrors = true;
      }

      // Check if duration is reasonable (not more than 30 days)
      const diffMs = end - start;
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (diffMs > thirtyDaysMs) {
        newErrors.endTime = 'Downtime duration cannot exceed 30 days';
        hasErrors = true;
      }

      if (diffMs <= 0) {
        newErrors.endTime = 'End time must be after start time';
        hasErrors = true;
      }
    }

    // Category times validation
    const categoryTimeErrors = {};
    Object.entries(categoryTimes).forEach(([category, times]) => {
      if (times.startTime && times.endTime) {
        const catStart = new Date(times.startTime);
        const catEnd = new Date(times.endTime);
        
        if (catStart > catEnd) {
          categoryTimeErrors[category] = `End time cannot be before start time for ${category}`;
          hasErrors = true;
        }

        // Check if category time is within main downtime period
        if (formData.startTime && formData.endTime) {
          const mainStart = new Date(formData.startTime);
          const mainEnd = new Date(formData.endTime);
          
          if (catStart < mainStart) {
            categoryTimeErrors[category] = `${category} start time cannot be before main start time`;
            hasErrors = true;
          }
          
          if (catEnd > mainEnd) {
            categoryTimeErrors[category] = `${category} end time cannot be after main end time`;
            hasErrors = true;
          }
        }
      } else if (!times.startTime || !times.endTime) {
        categoryTimeErrors[category] = `Both start and end times are required for ${category}`;
        hasErrors = true;
      }
    });

    if (Object.keys(categoryTimeErrors).length > 0) {
      newErrors.categoryTimes = categoryTimeErrors;
    }

    // Ticket link validation if ticket ID is provided
    if (formData.ticketId && !formData.ticketLink) {
      newErrors.ticketLink = 'Ticket link is required when ticket ID is provided';
      hasErrors = true;
    }

    // Future date validation for all date fields
    const now = new Date();
    if (formData.startTime && new Date(formData.startTime) > now) {
      newErrors.startTime = 'Cannot select future date or time';
      hasErrors = true;
    }

    if (formData.endTime && new Date(formData.endTime) > now) {
      newErrors.endTime = 'Cannot select future date or time';
      hasErrors = true;
    }

    // Validate all category times for future dates
    Object.entries(categoryTimes).forEach(([category, times]) => {
      if (times.startTime && new Date(times.startTime) > now) {
        categoryTimeErrors[category] = `Cannot select future date or time for ${category}`;
        hasErrors = true;
      }
      if (times.endTime && new Date(times.endTime) > now) {
        categoryTimeErrors[category] = `Cannot select future date or time for ${category}`;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    return { isValid: !hasErrors, errors: newErrors };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});
    
    // Comprehensive validation
    const validation = validateAllFields();
    
    if (!validation.isValid) {
      // Show all validation errors in toast
      const errorMessages = [];
      
      Object.entries(validation.errors).forEach(([field, message]) => {
        if (field === 'categoryTimes') {
          Object.values(message).forEach(catMessage => {
            errorMessages.push(catMessage);
          });
        } else {
          errorMessages.push(message);
        }
      });

      // Show all errors in a comprehensive toast
      if (errorMessages.length > 0) {
        toast.error(
          <div className="max-w-md">
            <div className="font-semibold text-red-800 mb-2 flex items-center">
              <FaExclamationTriangle className="mr-2" />
              Please fix the following errors:
            </div>
            <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
              {errorMessages.map((msg, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{msg}</span>
                </li>
              ))}
            </ul>
          </div>,
          {
            duration: 8000,
            position: 'top-right',
            style: {
              background: '#fef2f2',
              border: '1px solid #fecaca',
              maxWidth: '500px'
            }
          }
        );
      }
      
      return;
    }
    
    setIsSubmitting(true);
    
    try {
    const submissionData = {
      ...formData,
      categoryTimes,
      userInfo: {
        shortName: userInfo?.shortName,
        firstName: userInfo?.firstName,
        lastName: userInfo?.lastName,
        email: userInfo?.email
      }
    };
    
    console.debug('Submitting downtime data:', submissionData);
    
    const response = await fetch('/api/user_dashboard/report_downtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionData),
    });
    
    const result = await response.json();
    
    // ✅ FIX: Check both response.ok AND result.success
    if (response.ok && result.success) {
      const message = `Downtime reported successfully! ID: ${result.downtimeId}`;
      
      toast.success(message, {
        duration: 5000,
        position: 'top-right',
        icon: <FaCheckCircle className="text-green-500" />,
      });
        
        // Reset form
        setFormData({
          issueTitle: '',
          categories: [],
          affectedChannel: ['ALL'],
          affectedPersona: ['ALL'],
          affectedMNO: ['ALL'],
          affectedPortal: ['ALL'],
          affectedType: ['ALL'],
          affectedService: ['ALL'],
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
          trackedBy: userInfo?.shortName || `${userInfo?.firstName} ${userInfo?.lastName}`,
          remark: ''
        });
        setCategoryTimes({});
        setIsCategoriesManuallyModified(false);
        setErrors({});
        
        setTimeout(() => {
          router.push('/user_dashboard/downtime_log');
        }, 3000);
      } else {
      // ✅ FIX: Use the error message from the backend
      throw new Error(result.message || result.error || 'Failed to report downtime');
    }
  } catch (error) {
    console.error('Submission error:', error);
    toast.error(error.message || 'Failed to report downtime. Please try again.', {
      duration: 4000,
      position: 'top-right',
    });
  } finally {
    setIsSubmitting(false);
  }
};

  const formatDateTime = (date) => {
    if (!date) return 'Not set';
    const formatter = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Dhaka'
    });
    return formatter.format(new Date(date));
  };

  // Get affected services based on selected channels, personas, and portals
const getAffectedServices = () => {
  const services = new Set(['ALL']);
  
  console.log('Calculating services for:', {
    channels: formData.affectedChannel,
    personas: formData.affectedPersona,
    portals: formData.affectedPortal
  });

  // Check for specific WEB + E-COM WEB only scenario
  const isOnlyWebWithEcomWeb = 
    formData.affectedChannel.length === 1 && 
    formData.affectedChannel[0] === 'WEB' &&
    formData.affectedPortal.length === 1 && 
    formData.affectedPortal[0] === 'E-COM WEB';

  if (isOnlyWebWithEcomWeb) {
    console.log('Special case: Only WEB + E-COM WEB selected, returning only RPG-WEB');
    return ['RPG-WEB']; // Return only RPG-WEB without ALL
  }

  // Process each selected channel
  formData.affectedChannel.forEach(channel => {
    console.log(`Processing channel: ${channel}`);
    
    if (channel === 'APP') {
      // APP channel services based on persona
      if (formData.affectedPersona.includes('ALL') || 
          formData.affectedPersona.some(p => ['CU', 'AG'].includes(p))) {
        // Show all APP services for CU/AG or when ALL personas selected
        services.add('TRANSACTION HISTORY');
        services.add('RE-SUBMIT KYC');
        services.add('REGISTRATION');
      }

      // Add MOBILE RECHARGE only if CU is specifically included
      if (formData.affectedPersona.includes('CU')) {
        services.add('MOBILE RECHARGE');
      }
      
      if (formData.affectedPersona.includes('ALL') || 
          formData.affectedPersona.some(p => ['DSO', 'DH'].includes(p))) {
        // Show transaction history for DSO/DH
        services.add('TRANSACTION HISTORY');
      }
      
      services.add('ALL TRANSACTIONS');
      
    } else if (channel === 'USSD') {
      // USSD channel services
      services.add('ALL TRANSACTIONS');
      services.add('TRANSACTION HISTORY');
      
    } else if (channel === 'SMS') {
      // SMS channel services
      services.add('E-COM PAYMENT');
      services.add('REGISTRATION');
      services.add('KYC');
      services.add('ALL TRANSACTIONS');
      
    } else if (channel === 'WEB') {
      // WEB channel services based on portal selection
      if (formData.affectedPortal.includes('ALL') || formData.affectedPortal.includes('CC')) {
        services.add('PROFILE VISIBILITY');
        services.add('BLOCK OPERATION');
      }
      
      if (formData.affectedPortal.includes('ALL') || formData.affectedPortal.includes('SYS')) {
        services.add('LIFTING');
        services.add('REFUND');
        services.add('DISBURSEMENT');
        services.add('REVERSAL');
        services.add('KYC OPERATIONS');
        services.add('PARTNER REGISTRATION');
        services.add('CLAWBACK');
      }
      
      if (formData.affectedPortal.includes('ALL') || formData.affectedPortal.includes('DMS')) {
        services.add('LIFTING');
        services.add('REFUND');
        services.add('DISBURSEMENT');
      }

      if (formData.affectedPortal.includes('ALL') || formData.affectedPortal.includes('E-COM WEB')) {
        services.add('RPG-WEB');
      }
      
    } else if (channel === 'MIDDLEWARE') {
      // MIDDLEWARE channel services
      services.add('BILL-PAYMENT');
      
    } else if (channel === 'INWARD SERVICE') {
      // INWARD SERVICE channel services
      services.add('REMITTANCE');
      services.add('BANK TO NAGAD');
      services.add('ALL TRANSACTIONS');
    }
  });

  const result = Array.from(services).sort();
  console.log('Final available services:', result);
  return result;
};

  // Auto-select indicator component
  const AutoSelectIndicator = () => (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center text-sm text-green-600">
        <FaCheckCircle className="mr-1 text-xs" />
        <span>Categories are auto-selected based on affected services</span>
      </div>
      <button
        type="button"
        onClick={() => setIsCategoriesManuallyModified(true)}
        className="text-xs text-blue-600 hover:text-blue-800 underline"
      >
        Edit manually
      </button>
    </div>
  );

  return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded shadow-lg overflow-hidden">
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
                
                <button 
                  onClick={() => {
                    setFormData({
  issueTitle: '',
  categories: [],
  affectedChannel: ['ALL'],
  affectedPersona: ['ALL'],
  affectedMNO: ['ALL'],
  affectedPortal: ['ALL'],
  affectedType: ['ALL'],
  affectedService: ['ALL'],
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
  trackedBy: userInfo?.shortName || `${userInfo?.firstName} ${userInfo?.lastName}`,
  remark: ''
});
setCategoryTimes({});
setErrors({});
setIsCategoriesManuallyModified(false);
                    toast.success('Form reset successfully!', {
                      id: 'form-reset',
                      icon: '🔄',
                      duration: 3000,
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
                  {/* Date and Tracked By sections */}
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
                              year: 'numeric',
                              timeZone: 'Asia/Dhaka'
                            })
                          : 'Select start time to see date'}
                      </div>
                    </div>
                  </div>
                  
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
                  
                  <div className="md:col-span-2">
                    <MultiSelectDropdown
                      label="Affected Channel"
                      name="affectedChannel"
                      options={allChannels}
                      selectedValues={formData.affectedChannel}
                      errors={errors}
                      required={true}
                      onSelectChange={handleMultiSelectChange}
                      onSelectAll={handleSelectAll}
                      onClearAll={handleClearAll}
                    />
                  </div>

                  {/* Show additional fields only if ALL is not selected or other channels are selected */}
                  {(formData.affectedChannel.length > 0 && !formData.affectedChannel.includes('ALL')) && (
                    <>
                      {(formData.affectedChannel.includes('APP') || formData.affectedChannel.includes('MIDDLEWARE')) && (
                        <div className="md:col-span-2">
                          <MultiSelectDropdown
                            label="Affected Persona"
                            name="affectedPersona"
                            options={allPersonas}
                            selectedValues={formData.affectedPersona}
                            errors={errors}
                            onSelectChange={handleMultiSelectChange}
                            onSelectAll={handleSelectAll}
                            onClearAll={handleClearAll}
                          />
                        </div>
                      )}

                      {(formData.affectedChannel.includes('USSD') || formData.affectedChannel.includes('SMS')) && (
                        <div className="md:col-span-2">
                          <MultiSelectDropdown
                            label="Select MNO"
                            name="affectedMNO"
                            options={allMNOs}
                            selectedValues={formData.affectedMNO}
                            errors={errors}
                            onSelectChange={handleMultiSelectChange}
                            onSelectAll={handleSelectAll}
                            onClearAll={handleClearAll}
                          />
                        </div>
                      )}

                      {formData.affectedChannel.includes('WEB') && (
                        <div className="md:col-span-2">
                          <MultiSelectDropdown
                            label="Select Portal"
                            name="affectedPortal"
                            options={allPortals}
                            selectedValues={formData.affectedPortal}
                            errors={errors}
                            onSelectChange={handleMultiSelectChange}
                            onSelectAll={handleSelectAll}
                            onClearAll={handleClearAll}
                          />
                        </div>
                      )}

                      {formData.affectedChannel.includes('INWARD SERVICE') && (
                        <div className="md:col-span-2">
                          <MultiSelectDropdown
                            label="Select Type"
                            name="affectedType"
                            options={allTypes}
                            selectedValues={formData.affectedType}
                            errors={errors}
                            onSelectChange={handleMultiSelectChange}
                            onSelectAll={handleSelectAll}
                            onClearAll={handleClearAll}
                          />
                        </div>
                      )}

                      <div className="md:col-span-2">
                        <MultiSelectDropdown
                          label="Select Affected Service"
                          name="affectedService"
                          options={getAffectedServices()}
                          selectedValues={formData.affectedService}
                          errors={errors}
                          onSelectChange={handleMultiSelectChange}
                          onSelectAll={handleSelectAll}
                          onClearAll={handleClearAll}
                        />
                      </div>
                    </>
                  )}
                  
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
                            {!isCategoriesManuallyModified && (
                              <span className="text-green-600 ml-2">(Auto-selected based on services)</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={handleSelectAllCategories}
                          className="flex items-center bg-green-100 text-green-800 text-xs px-3 py-1.5 rounded hover:bg-green-200 transition-colors"
                        >
                          <FaPlus className="mr-1 text-[0.6rem]" />
                          Select All
                        </button>
                        
                        <div className="flex items-center bg-white border border-indigo-200 rounded-full px-2.5 py-0.5 shadow-inner">
                          <span className="text-xs font-bold text-indigo-700">{formData.categories.length}</span>
                          <span className="text-xs text-gray-500 ml-1">/{allCategories.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Auto-select indicator */}
                    {!isCategoriesManuallyModified && formData.affectedService.length > 0 && (
                      <AutoSelectIndicator />
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
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
                    
                    {errors.categories && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-center animate-pulse">
                        <FaExclamationTriangle className="text-red-500 text-sm mr-2 flex-shrink-0" />
                        <p className="text-red-700 text-sm">{errors.categories}</p>
                      </div>
                    )}
                    
                    {formData.categories.length > 0 && (
                      <div className="bg-indigo-50 rounded p-4 border border-indigo-100 mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <FaCheckCircle className="text-indigo-600 text-sm mr-1.5" />
                            <span className="text-sm font-medium text-indigo-700">Selected:</span>
                          </div>
                          <button 
                            type="button"
                            onClick={handleClearAllCategories}
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
                                type="button"
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
                  
                  {/* Rest of the form components (time selection, impact type, etc.) remain the same */}
                  {/* Main Downtime Period */}
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
          maxDate={new Date()} // Prevent future dates in the calendar
          filterTime={(time) => {
            // Filter out future times for the current day
            const now = new Date();
            const selectedTime = new Date(time);
            return selectedTime <= now;
          }}
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
          popperPlacement="bottom-start"
          popperModifiers={[
            {
              name: 'preventOverflow',
              options: {
                boundary: 'viewport',
                padding: 8,
              },
            },
          ]}
        />
        
        {formData.startTime && (
          <button 
            type="button"
            onClick={() => handleDateTimeChange('startTime', null)}
            className="absolute right-3 top-3 text-gray-400 hover:text-red-500 transition-colors"
            aria-label="Clear date"
          >
            ×
          </button>
        )}
      </div>
      
      <div className="mt-2 flex items-center text-xs text-blue-600">
        <FaExclamationTriangle className="mr-1 text-xs" />
        <span>Cannot select future dates or times</span>
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
          maxDate={new Date()} // Prevent future dates in the calendar
          filterTime={(time) => {
            // Filter out future times for the current day
            const now = new Date();
            const selectedTime = new Date(time);
            return selectedTime <= now;
          }}
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
          popperPlacement="bottom-start"
          popperModifiers={[
            {
              name: 'preventOverflow',
              options: {
                boundary: 'viewport',
                padding: 8,
              },
            },
          ]}
        />
        
        {formData.endTime && (
          <button 
            type="button"
            onClick={() => handleDateTimeChange('endTime', null)}
            className="absolute right-3 top-3 text-gray-400 hover:text-red-500 transition-colors"
            aria-label="Clear date"
          >
            ×
          </button>
        )}
      </div>
      
      <div className="mt-2 flex items-center text-xs text-blue-600">
        <FaExclamationTriangle className="mr-1 text-xs" />
        <span>Cannot select future dates or times</span>
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
      {formData.duration && formData.duration !== '00:00' && (
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
                  
                  {formData.categories.length > 0 && (
  <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-4">
    <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
      <FaClock className="mr-2 text-blue-600" />
      Per-Category Downtime Periods
    </h3>
    <p className="text-sm text-gray-600 mb-4">
      Defaults to main downtime period. Edit individual categories if needed.
      <span className="text-red-500 ml-2">Cannot select future dates or times.</span>
    </p>
    
    {/* Show category time errors summary */}
    {errors.categoryTimes && Object.keys(errors.categoryTimes).length > 0 && (
      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center mb-2">
          <FaExclamationTriangle className="text-red-500 mr-2" />
          <span className="font-semibold text-red-800">Category Time Errors:</span>
        </div>
        <ul className="text-sm text-red-700 space-y-1">
          {Object.entries(errors.categoryTimes).map(([category, error]) => (
            <li key={category}>• {error}</li>
          ))}
        </ul>
      </div>
    )}
    
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
        Category
      </th>
      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
        Start Time
      </th>
      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
        End Time
      </th>
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
        Duration
      </th>
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
        Status
      </th>
    </tr>
  </thead>
  <tbody className="bg-white divide-y divide-gray-200">
    {formData.categories.map(category => {
      const catTime = categoryTimes[category] || {};
      const startTime = catTime.startTime ? new Date(catTime.startTime) : null;
      const endTime = catTime.endTime ? new Date(catTime.endTime) : null;
      let duration = '';
      let hasError = errors.categoryTimes && errors.categoryTimes[category];
      
      if (startTime && endTime) {
        const diffMs = endTime - startTime;
        if (diffMs > 0) {
          const diffHrs = Math.floor(diffMs / 3600000);
          const diffMins = Math.floor((diffMs % 3600000) / 60000);
          duration = `${diffHrs.toString().padStart(2, '0')}:${diffMins.toString().padStart(2, '0')}`;
        }
      }
      
      return (
        <tr key={category} className={hasError ? 'bg-red-50' : 'hover:bg-gray-50'}>
          <td className="px-4 py-3 whitespace-nowrap">
            <span className="text-sm font-medium text-gray-900 truncate block max-w-[140px]" title={category}>
              {category}
            </span>
          </td>
          <td className="px-3 py-3 whitespace-nowrap">
            <DatePicker
              selected={startTime}
              onChange={(date) => handleCategoryTimeChange(category, 'startTime', date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={1}
              timeCaption="Time"
              dateFormat="dd/MM/yyyy HH:mm"
              maxDate={new Date()}
              filterTime={(time) => {
                const now = new Date();
                const selectedTime = new Date(time);
                return selectedTime <= now;
              }}
              customInput={
                <div className={`w-full px-3 py-2 rounded border flex items-center cursor-pointer transition-colors ${
                  hasError 
                    ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                }`}>
                  <FaCalendarAlt className={`mr-2 flex-shrink-0 ${
                    hasError ? 'text-red-500' : 'text-gray-500'
                  }`} />
                  <span className="text-sm text-gray-900 flex-grow truncate">
                    {startTime ? formatDateTime(startTime) : 'Select start'}
                  </span>
                </div>
              }
              className="w-full"
            />
          </td>
          <td className="px-3 py-3 whitespace-nowrap">
            <DatePicker
              selected={endTime}
              onChange={(date) => handleCategoryTimeChange(category, 'endTime', date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={1}
              timeCaption="Time"
              dateFormat="dd/MM/yyyy HH:mm"
              maxDate={new Date()}
              filterTime={(time) => {
                const now = new Date();
                const selectedTime = new Date(time);
                return selectedTime <= now;
              }}
              customInput={
                <div className={`w-full px-3 py-2 rounded border flex items-center cursor-pointer transition-colors ${
                  hasError 
                    ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                }`}>
                  <FaCalendarAlt className={`mr-2 flex-shrink-0 ${
                    hasError ? 'text-red-500' : 'text-gray-500'
                  }`} />
                  <span className="text-sm text-gray-900 flex-grow truncate">
                    {endTime ? formatDateTime(endTime) : 'Select end'}
                  </span>
                </div>
              }
              className="w-full"
            />
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            <div className={`px-3 py-2 rounded text-sm font-mono font-medium ${
              hasError 
                ? 'bg-red-100 text-red-900 border border-red-200' 
                : 'bg-gray-100 text-gray-900 border border-gray-200'
            }`}>
              {duration || '--:--'}
            </div>
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            {hasError ? (
              <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                <FaExclamationTriangle className="mr-1.5" />
                Error
              </span>
            ) : startTime && endTime ? (
              <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                <FaCheckCircle className="mr-1.5" />
                Valid
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                <FaExclamationTriangle className="mr-1.5" />
                Incomplete
              </span>
            )}
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
    </div>
  </div>
)}
                  
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
                  
                  <div className="space-y-4">
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
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      REMARK
                    </label>
                    <textarea
                      name="remark"
                      value={formData.remark}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400 min-h-[100px]"
                      placeholder="Additional remarks or notes"
                    />
                  </div>
                </div>
                
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
        
        {/* Sidebar components (Top Issues and Predefined Issues) remain the same */}
        <div className="space-y-6">
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