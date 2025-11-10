// app/user_dashboard/document_hub/access_form_tracker/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaUpload, FaFileExcel, FaPaperPlane,
  FaSpinner, FaCheckCircle, FaTimes, FaDownload,
  FaPlus, FaMinus, FaInfoCircle, FaExclamationTriangle
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Select from 'react-select';
import debounce from 'lodash/debounce';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

const portalOptions = [
  { value: 'CS', label: 'CS' },
  { value: 'CC', label: 'CC' },
  { value: 'S0', label: 'S0' },
  { value: 'FI', label: 'FI' },
  { value: 'DMS', label: 'DMS' },
  { value: 'SYS', label: 'SYS' },
  { value: 'EC', label: 'EC' },
  { value: 'SSL', label: 'SSL' },
  { value: 'Admin', label: 'Admin' },
  { value: 'CSE', label: 'CSE' },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'PAM', label: 'PAM' },
  { value: 'TM', label: 'TM' },
  { value: 'TOC', label: 'TOC' },
  { value: 'CDM', label: 'CDM' },
  { value: 'CDMHA', label: 'CDMHA' },
  { value: 'LEA/External Affairs', label: 'LEA/External Affairs' },
  { value: 'Digital & CLM', label: 'Digital & CLM' },
  { value: 'ADG DB', label: 'ADG DB' },
  { value: 'AML/CFT', label: 'AML/CFT' },
  { value: 'LEA Compliance', label: 'LEA Compliance' },
  { value: 'FE', label: 'FE' },
  { value: 'Ops Navigator', label: 'Ops Navigator' },
  { value: 'Other', label: 'Other' }
];

const roleOptions = [
  { value: 'LEA', label: 'LEA' },
  { value: 'CUS Bulk Reg', label: 'CUS Bulk Reg' },
  { value: 'TOC-Biller', label: 'TOC-Biller' },
  { value: 'LEA-Compliance', label: 'LEA-Compliance' },
  { value: 'Campaign Management', label: 'Campaign Management' },
  { value: 'TM', label: 'TM' },
  { value: 'CO', label: 'CO' },
  { value: 'Nagad Sheba Operation', label: 'Nagad Sheba Operation' },
  { value: 'Sales', label: 'Sales' },
  { value: 'FH', label: 'FH' },
  { value: 'Customer Service Point', label: 'Customer Service Point' },
  { value: 'CC', label: 'CC' },
  { value: 'CS', label: 'CS' },
  { value: 'SOE', label: 'SOE' },
  { value: 'Staging', label: 'Staging' },
  { value: 'FE', label: 'FE' },
  { value: 'SPM', label: 'SPM' },
  { value: 'Operational Monitor', label: 'Operational Monitor' },
  { value: 'EC', label: 'EC' },
  { value: 'System', label: 'System' },
  { value: 'SOH', label: 'SOH' },
  { value: 'Network', label: 'Network' },
  { value: 'Infra', label: 'Infra' },
  { value: 'CSE', label: 'CSE' },
  { value: 'TOC', label: 'TOC' },
  { value: 'OPS', label: 'OPS' },
  { value: 'Admin (Super User)', label: 'Admin (Super User)' },
  { value: 'QR', label: 'QR' },
  { value: 'CC-Recon', label: 'CC-Recon' },
  { value: 'View Only', label: 'View Only' },
  { value: 'Report', label: 'Report' },
  { value: 'Refund Initiation', label: 'Refund Initiation' },
  { value: 'Legal', label: 'Legal' },
  { value: 'Compliance', label: 'Compliance' },
  { value: 'DQM', label: 'DQM' },
  { value: 'SSL-Add Money', label: 'SSL-Add Money' },
  { value: 'SSL-Transfer Money', label: 'SSL-Transfer Money' },
  { value: 'CC-Operation', label: 'CC-Operation' },
  { value: 'QA', label: 'QA' },
  { value: 'TL', label: 'TL' },
  { value: 'DM', label: 'DM' },
  { value: 'CSR', label: 'CSR' },
  { value: 'Banner', label: 'Banner' },
  { value: 'Contact Center Agent', label: 'Contact Center Agent' },
  { value: 'Push Notification', label: 'Push Notification' },
  { value: 'PAM', label: 'PAM' },
  { value: 'Bulk Disbursement', label: 'Bulk Disbursement' },
  { value: 'SOC-Biller', label: 'SOC-Biller' },
  { value: 'SOC', label: 'SOC' },
  { value: 'SSL', label: 'SSL' },
  { value: 'RMS', label: 'RMS' },
  { value: 'Finance Executive', label: 'Finance Executive' },
  { value: 'CSQC', label: 'CSQC' },
  { value: 'MCQC', label: 'MCQC' },
  { value: 'CDMHM', label: 'CDMHM' },
  { value: 'AGQCN', label: 'AGQCN' },
  { value: 'Edit Only', label: 'Edit Only' },
  { value: 'Other', label: 'Other' }
];

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: '#f9fafb',
    borderColor: state.isFocused ? '#1e40af' : '#374151',
    borderRadius: '0.375rem',
    padding: '0.25rem',
    boxShadow: state.isFocused ? '0 0 0 1px #1e40af' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#1e40af' : '#1f2937'
    }
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#1e40af' : state.isFocused ? '#e5e7eb' : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#111827',
    padding: '0.5rem 1rem'
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: '#e5e7eb',
    borderRadius: '0.25rem'
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#111827',
    fontWeight: '500'
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: '#4b5563',
    ':hover': {
      backgroundColor: '#dc2626',
      color: '#ffffff'
    }
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#374151',
    fontStyle: 'italic'
  }),
  input: (provided) => ({
    ...provided,
    color: '#111827'
  })
};

const accessFormTypeOptions = [
  { value: 'Single', label: 'Single Access' },
  { value: 'Multiple', label: 'Multiple Access' },
  { value: 'CustomerService', label: 'Customer Service' }
];

export default function AccessFormTracker() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    ngd_id: '',
    user_name: '',
    email: '',
    mobile_number: '',
    division: '',
    department: '',
    portal_name: [],
    custom_portal_name: '',
    role: [],
    custom_role: '',
    effective_date: '',
    revoke_date: '',
    status: 'Active',
    remark: '',
    access_form_type: 'Single',
    additional_info: ''
  });
  const [documentFile, setDocumentFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [bulkUploadMode, setBulkUploadMode] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkResults, setBulkResults] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [existingRecords, setExistingRecords] = useState({
    ngd_id: null,
    email: null,
    mobile_number: null
  });
  const [validationLoading, setValidationLoading] = useState({
    ngd_id: false,
    email: false,
    mobile_number: false
  });

  useEffect(() => {
    const fetchUserInfo = async () => {
  try {
    setIsLoading(true);
    const response = await fetch('/api/user_dashboard/user_info');
    
    if (!response.ok) {
      throw new Error('Failed to fetch user information');
    }
    
    const userData = await response.json();
    
    // The API returns the user data directly, not wrapped in a "data" property
    setUserInfo(userData);
  } catch (error) {
    console.error('Error fetching user info:', error);
    toast.error('Failed to load user information');
  } finally {
    setIsLoading(false);
  }
};
    
    fetchUserInfo();
  }, []);

  useEffect(() => {
  // Clear validation when form type changes
  setExistingRecords({
    ngd_id: null,
    email: null,
  });
}, [formData.access_form_type]);

// Add debounced validation functions
  const validateNGDId = debounce(async (ngdId, formType) => {
  if (!ngdId || !/^NGD\d{4,}$/.test(ngdId) || formType === 'CustomerService') {
    setExistingRecords(prev => ({ ...prev, ngd_id: null }));
    return;
  }
  
  setValidationLoading(prev => ({ ...prev, ngd_id: true }));
  try {
    const response = await fetch(`/api/user_dashboard/document_hub/access_form_tracker/validate?field=ngd_id&value=${ngdId}&formType=${formType}`);
    const data = await response.json();
    setExistingRecords(prev => ({ ...prev, ngd_id: data.exists ? data.records : null }));
  } catch (error) {
    console.error('Validation error:', error);
  } finally {
    setValidationLoading(prev => ({ ...prev, ngd_id: false }));
  }
}, 500);

  const validateEmail = debounce(async (email, formType) => {
  if (!email || !/^[^\s@]+@nagad\.com\.bd$/.test(email) || formType === 'CustomerService') {
    setExistingRecords(prev => ({ ...prev, email: null }));
    return;
  }
  
  setValidationLoading(prev => ({ ...prev, email: true }));
  try {
    const response = await fetch(`/api/user_dashboard/document_hub/access_form_tracker/validate?field=email&value=${email}&formType=${formType}`);
    const data = await response.json();
    setExistingRecords(prev => ({ ...prev, email: data.exists ? data.records : null }));
  } catch (error) {
    console.error('Validation error:', error);
  } finally {
    setValidationLoading(prev => ({ ...prev, email: false }));
  }
}, 500);

  const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
  
  // Skip validation for Customer Service type
  if (formData.access_form_type === 'CustomerService') {
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    return;
  }
  
  // Clear validation when field is empty
  if (!value) {
    setExistingRecords(prev => ({ ...prev, [name]: null }));
    setValidationLoading(prev => ({ ...prev, [name]: false }));
  } else {
    // Trigger validation only for non-empty values, passing the form type
    if (name === 'ngd_id') validateNGDId(value, formData.access_form_type);
    if (name === 'email') validateEmail(value, formData.access_form_type);
  }
  
  if (errors[name]) {
    setErrors(prev => ({ ...prev, [name]: '' }));
  }
};

  const handlePortalChange = (selectedOptions) => {
    setFormData(prev => ({ 
      ...prev, 
      portal_name: selectedOptions 
    }));
  };

  const handleRoleChange = (selectedOptions) => {
    setFormData(prev => ({ 
      ...prev, 
      role: selectedOptions 
    }));
  };

  const handleDocumentChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    setDocumentFile(file);
  };

  const handleBulkFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Only Excel files are allowed');
      return;
    }

    try {
      // Read the Excel file to count rows
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new (await import('exceljs')).Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.worksheets[0];
      let count = 0;
      
      worksheet.eachRow(() => {
        count++;
      });
      
      // Subtract 1 for header row
      setRowCount(count > 0 ? count - 1 : 0);
      setBulkFile(file);
    } catch (error) {
      console.error('Error reading Excel file:', error);
      toast.error('Failed to read Excel file. Please check the format.');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.ngd_id) {
      newErrors.ngd_id = 'NGD ID is required';
    } else if (!/^NGD\d{4,}$/.test(formData.ngd_id)) {
      newErrors.ngd_id = 'NGD ID must be in format NGDXXXX';
    }
    
    if (!formData.user_name) {
      newErrors.user_name = 'User name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@nagad\.com\.bd$/.test(formData.email)) {
      newErrors.email = 'Email must be @nagad.com.bd';
    }
    
    // Additional info is required for Multiple and Customer Service types
  if ((formData.access_form_type === 'Multiple' || formData.access_form_type === 'CustomerService') && !formData.additional_info) {
    newErrors.additional_info = 'Additional information is required for this form type';
  }
  
  // Mobile validation (if provided)
  if (formData.mobile_number && !/^01[3-9]\d{8}$/.test(formData.mobile_number)) {
    newErrors.mobile_number = 'Invalid mobile number format';
  }
  
  // Portal and role validation (always required)
  if (formData.portal_name.length === 0) {
    newErrors.portal_name = 'At least one portal is required';
  } else {
    const hasOther = formData.portal_name.some(p => p.value === 'Other');
    if (hasOther && !formData.custom_portal_name) {
      newErrors.custom_portal_name = 'Custom portal name is required when "Other" is selected';
    }
  }
  
  if (formData.role.length === 0) {
    newErrors.role = 'At least one role is required';
  } else {
    const hasOther = formData.role.some(r => r.value === 'Other');
    if (hasOther && !formData.custom_role) {
      newErrors.custom_role = 'Custom role is required when "Other" is selected';
    }
  }
  
  // Effective date is always required
  if (!formData.effective_date) {
    newErrors.effective_date = 'Effective date is required';
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
    const submitData = new FormData();
    submitData.append('access_form_type', formData.access_form_type);
    submitData.append('ngd_id', formData.ngd_id);
    submitData.append('user_name', formData.user_name);
    submitData.append('email', formData.email);
    submitData.append('mobile_number', formData.mobile_number);
    submitData.append('division', formData.division);
    submitData.append('department', formData.department);
    submitData.append('additional_info', formData.additional_info);
    
    // Process portal names
    const portalNames = formData.portal_name.map(p => 
      p.value === 'Other' ? formData.custom_portal_name : p.value
    );
    submitData.append('portal_name', portalNames.join(','));
    
    // Process roles
    const roles = formData.role.map(r => 
      r.value === 'Other' ? formData.custom_role : r.value
    );
    submitData.append('role', roles.join(','));
    
    submitData.append('custom_portal_name', formData.custom_portal_name);
    submitData.append('custom_role', formData.custom_role);
    submitData.append('effective_date', formData.effective_date);
    submitData.append('revoke_date', formData.revoke_date);
    submitData.append('status', formData.status);
    submitData.append('remark', formData.remark);
    
    if (documentFile) {
      submitData.append('document', documentFile);
    }
    
    const response = await fetch('/api/user_dashboard/document_hub/access_form_tracker', {
      method: 'POST',
      body: submitData
    });
    
    const result = await response.json();
    
    if (result.success) {
      toast.success(`Access form added successfully! Tracking ID: ${result.af_tracking_id}`);
      
      // Reset form
      setFormData({
        ngd_id: '',
        user_name: '',
        email: '',
        mobile_number: '',
        division: '',
        department: '',
        portal_name: [],
        custom_portal_name: '',
        role: [],
        custom_role: '',
        effective_date: '',
        revoke_date: '',
        status: 'Active',
        remark: '',
        access_form_type: 'Single',
        additional_info: ''
      });
      setDocumentFile(null);
      setExistingRecords({
        ngd_id: null,
        email: null,
        mobile_number: null
      });
    } else {
      toast.error(result.message || 'Failed to add access form');
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    toast.error('Failed to add access form');
  } finally {
    setIsSubmitting(false);
  }
};

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    
    if (!bulkFile) {
      toast.error('Please select an Excel file');
      return;
    }
    
    setIsSubmitting(true);
    setUploadProgress(0);
    
    try {
      const submitData = new FormData();
      submitData.append('action', 'bulk-upload');
      submitData.append('file', bulkFile);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 300);
      
      const response = await fetch('/api/user_dashboard/document_hub/access_form_tracker', {
        method: 'POST',
        body: submitData
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const result = await response.json();
      
      if (result.success) {
        setBulkResults(result.results || []);
        const successCount = result.results ? result.results.filter(r => r.success).length : 0;
        const totalCount = result.results ? result.results.length : 0;
        toast.success(`Bulk upload processed. ${successCount} out of ${totalCount} entries successful`);
        setBulkFile(null);
        setRowCount(0);
      } else {
        toast.error(result.message || 'Failed to process bulk upload');
      }
    } catch (error) {
      console.error('Error processing bulk upload:', error);
      toast.error('Failed to process bulk upload');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const downloadTemplate = async () => {
    try {
      const link = document.createElement('a');
    link.href = '/api/storage/access_form/access_form_base_formate_excel/Default_Formate_Access_Form_Tracker.xlsx';
    link.download = 'Access_Form_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Template downloaded successfully!', {
      icon: '📋',
      duration: 3000,
      position: 'top-right'
    });
  } catch (error) {
    console.error('Error downloading template:', error);
    toast.error('Failed to download template. Please contact support.', {
      duration: 5000,
      position: 'top-right'
    });
  }
};

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-700">Loading user information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded shadow-lg overflow-hidden border border-gray-300">
          <div className="relative px-8 py-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white border-b border-white/10 shadow-md">
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                  Access Form Tracker
                </h1>
                <p className="text-blue-200 mt-1 text-sm md:text-base">
                  A centralized system to track and manage access forms across Nagad portals
                </p>
              </div>
              {bulkUploadMode && (
                <div className="mt-4 md:mt-0">
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center px-5 py-2 bg-white text-blue-900 font-medium rounded shadow hover:bg-gray-100 transition-colors"
                  >
                    <FaDownload className="mr-2 text-lg" />
                    Download Template
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <div className="flex space-x-2 bg-gray-200 p-1 rounded">
                <button
                  onClick={() => setBulkUploadMode(false)}
                  className={`px-5 py-2 rounded transition-all ${!bulkUploadMode ? 'bg-white shadow-sm text-blue-800 font-medium' : 'text-gray-700 hover:text-gray-900'}`}
                >
                  Single Entry
                </button>
                <button
                  onClick={() => setBulkUploadMode(true)}
                  className={`px-5 py-2 rounded transition-all ${bulkUploadMode ? 'bg-white shadow-sm text-blue-800 font-medium' : 'text-gray-700 hover:text-gray-900'}`}
                >
                  Bulk Upload
                </button>
              </div>
            </div>
            
            {!bulkUploadMode ? (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-blue-50 rounded border border-blue-200">
                    <h2 className="md:col-span-2 text-lg font-semibold text-gray-900 flex items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <FaPlus className="text-blue-700" />
                      </div>
                      Basic Information
                    </h2>
                    
                    {/* Add Access Form Type field */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Access Form Type *
                      </label>
                      <Select
                        options={accessFormTypeOptions}
                        value={accessFormTypeOptions.find(opt => opt.value === formData.access_form_type)}
                        onChange={(selected) => setFormData(prev => ({ ...prev, access_form_type: selected.value }))}
                        styles={customStyles}
                        className="rounded"
                        classNamePrefix="select"
                        placeholder="Select access form type..."
                      />
                    </div>
                    
<div>
  <label className="block text-sm font-medium text-gray-900 mb-2">
    NGD ID {formData.access_form_type !== 'CustomerService' && '*'}
  </label>
  <input
    type="text"
    name="ngd_id"
    value={formData.ngd_id}
    onChange={handleChange}
    className={`w-full px-4 py-3 rounded border ${errors.ngd_id ? 'border-red-600 ring-2 ring-red-300' : 'border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-300'} transition-all placeholder-gray-600 placeholder-opacity-80 text-gray-900`}
    placeholder="NGDXXXX"
  />
  {errors.ngd_id && <p className="mt-2 text-sm text-red-700 flex items-center"><FaTimes className="mr-1 text-xs" /> {errors.ngd_id}</p>}
  {formData.access_form_type !== 'CustomerService' && validationLoading.ngd_id && (
    <p className="mt-2 text-sm text-blue-700 flex items-center">
      <FaSpinner className="animate-spin mr-1 text-xs" /> Checking...
    </p>
  )}
  {formData.access_form_type !== 'CustomerService' && existingRecords.ngd_id && (
    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
      <p className="text-sm text-yellow-800 flex items-center">
        <FaExclamationTriangle className="mr-1 text-xs" />
        This NGD ID already has {existingRecords.ngd_id.length} access form(s):
      </p>
      <ul className="text-xs text-yellow-700 mt-1 ml-4 list-disc">
        {existingRecords.ngd_id.slice(0, 3).map((record, index) => (
          <li key={index}>
            {record.user_name} - {record.portal_name} ({record.status})
          </li>
        ))}
        {existingRecords.ngd_id.length > 3 && (
          <li>...and {existingRecords.ngd_id.length - 3} more</li>
        )}
      </ul>
    </div>
  )}
</div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        User Name *
                      </label>
                      <input
                        type="text"
                        name="user_name"
                        value={formData.user_name}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded border ${errors.user_name ? 'border-red-600 ring-2 ring-red-300' : 'border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-300'} transition-all placeholder-gray-600 placeholder-opacity-80 text-gray-900`}
                        placeholder="Full name"
                      />
                      {errors.user_name && <p className="mt-2 text-sm text-red-700 flex items-center"><FaTimes className="mr-1 text-xs" /> {errors.user_name}</p>}
                    </div>
                    
<div>
  <label className="block text-sm font-medium text-gray-900 mb-2">
    Email {formData.access_form_type !== 'CustomerService' && '*'}
  </label>
  <input
    type="email"
    name="email"
    value={formData.email}
    onChange={handleChange}
    className={`w-full px-4 py-3 rounded border ${errors.email ? 'border-red-600 ring-2 ring-red-300' : 'border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-300'} transition-all placeholder-gray-600 placeholder-opacity-80 text-gray-900`}
    placeholder="user@nagad.com.bd"
  />
  {errors.email && <p className="mt-2 text-sm text-red-700 flex items-center"><FaTimes className="mr-1 text-xs" /> {errors.email}</p>}
  {formData.access_form_type !== 'CustomerService' && validationLoading.email && (
    <p className="mt-2 text-sm text-blue-700 flex items-center">
      <FaSpinner className="animate-spin mr-1 text-xs" /> Checking...
    </p>
  )}
  {formData.access_form_type !== 'CustomerService' && existingRecords.email && (
    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
      <p className="text-sm text-yellow-800 flex items-center">
        <FaExclamationTriangle className="mr-1 text-xs" />
        This email already has {existingRecords.email.length} access form(s):
      </p>
      <ul className="text-xs text-yellow-700 mt-1 ml-4 list-disc">
        {existingRecords.email.slice(0, 3).map((record, index) => (
          <li key={index}>
            {record.user_name} - {record.portal_name} ({record.status})
          </li>
        ))}
        {existingRecords.email.length > 3 && (
          <li>...and {existingRecords.email.length - 3} more</li>
        )}
      </ul>
    </div>
  )}
</div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        name="mobile_number"
                        value={formData.mobile_number}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded border ${errors.mobile_number ? 'border-red-600 ring-2 ring-red-300' : 'border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-300'} transition-all placeholder-gray-600 placeholder-opacity-80 text-gray-900`}
                        placeholder="01XXXXXXXXX"
                      />
                      {errors.mobile_number && <p className="mt-2 text-sm text-red-700 flex items-center"><FaTimes className="mr-1 text-xs" /> {errors.mobile_number}</p>}
                    </div>
                    
                    {/* Show Additional Information field for Multiple and Customer Service types */}
{(formData.access_form_type === 'Multiple' || formData.access_form_type === 'CustomerService') && (
  <div className="md:col-span-2">
    <label className="block text-sm font-medium text-gray-900 mb-2">
      Additional Information *
      {formData.access_form_type === 'CustomerService' && (
        <span className="text-blue-600 ml-2">(NDG ID, EMAIL ETC.)</span>
      )}
    </label>
    <textarea
      name="additional_info"
      value={formData.additional_info}
      onChange={handleChange}
      rows={3}
      className={`w-full px-4 py-3 rounded border ${errors.additional_info ? 'border-red-600 ring-2 ring-red-300' : 'border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-300'} transition-all placeholder-gray-600 placeholder-opacity-80 text-gray-900`}
      placeholder={
        formData.access_form_type === 'CustomerService' 
          ? "Provide details about multiple IDs, emails, or other information" 
          : "Provide details about multiple IDs, emails, or other information"
      }
    />
    {errors.additional_info && <p className="mt-2 text-sm text-red-700 flex items-center"><FaTimes className="mr-1 text-xs" /> {errors.additional_info}</p>}
  </div>
)}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Division
                      </label>
                      <input
                        type="text"
                        name="division"
                        value={formData.division}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded border border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-300 transition-all placeholder-gray-600 placeholder-opacity-80 text-gray-900"
                        placeholder="Division name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Department
                      </label>
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded border border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-300 transition-all placeholder-gray-600 placeholder-opacity-80 text-gray-900"
                        placeholder="Department name"
                      />
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-indigo-50 rounded border border-indigo-200">
                    <h2 className="md:col-span-2 text-lg font-semibold text-gray-900 flex items-center">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                        <FaPlus className="text-indigo-700" />
                      </div>
                      Access Details
                    </h2>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Portal Name(s) *
                      </label>
                      <Select
                        isMulti
                        options={portalOptions}
                        value={formData.portal_name}
                        onChange={handlePortalChange}
                        styles={customStyles}
                        className={`rounded ${errors.portal_name ? 'ring-2 ring-red-300' : ''}`}
                        classNamePrefix="select"
                        placeholder="Select portal(s)..."
                      />
                      {errors.portal_name && <p className="mt-2 text-sm text-red-700 flex items-center"><FaTimes className="mr-1 text-xs" /> {errors.portal_name}</p>}
                    </div>
                    
                    {formData.portal_name.some(p => p.value === 'Other') && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Custom Portal Name *
                        </label>
                        <input
                          type="text"
                          name="custom_portal_name"
                          value={formData.custom_portal_name}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 rounded border ${errors.custom_portal_name ? 'border-red-600 ring-2 ring-red-300' : 'border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-300'} transition-all placeholder-gray-600 placeholder-opacity-80 text-gray-900`}
                          placeholder="Enter custom portal name"
                        />
                        {errors.custom_portal_name && <p className="mt-2 text-sm text-red-700 flex items-center"><FaTimes className="mr-1 text-xs" /> {errors.custom_portal_name}</p>}
                      </div>
                    )}
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Role(s) *
                      </label>
                      <Select
                        isMulti
                        options={roleOptions}
                        value={formData.role}
                        onChange={handleRoleChange}
                        styles={customStyles}
                        className={`rounded ${errors.role ? 'ring-2 ring-red-300' : ''}`}
                        classNamePrefix="select"
                        placeholder="Select role(s)..."
                      />
                      {errors.role && <p className="mt-2 text-sm text-red-700 flex items-center"><FaTimes className="mr-1 text-xs" /> {errors.role}</p>}
                    </div>
                    
                    {formData.role.some(r => r.value === 'Other') && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Custom Role *
                        </label>
                        <input
                          type="text"
                          name="custom_role"
                          value={formData.custom_role}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 rounded border ${errors.custom_role ? 'border-red-600 ring-2 ring-red-300' : 'border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-300'} transition-all placeholder-gray-600 placeholder-opacity-80 text-gray-900`}
                          placeholder="Enter custom role"
                        />
                        {errors.custom_role && <p className="mt-2 text-sm text-red-700 flex items-center"><FaTimes className="mr-1 text-xs" /> {errors.custom_role}</p>}
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Effective Date *
                      </label>
                      <input
                        type="date"
                        name="effective_date"
                        value={formData.effective_date}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded border ${errors.effective_date ? 'border-red-600 ring-2 ring-red-300' : 'border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-300'} transition-all placeholder-gray-600 placeholder-opacity-80 text-gray-900`}
                        placeholder="Select effective date"
                      />
                      {errors.effective_date && <p className="mt-2 text-sm text-red-700 flex items-center"><FaTimes className="mr-1 text-xs" /> {errors.effective_date}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Revoke Date
                      </label>
                      <input
                        type="date"
                        name="revoke_date"
                        value={formData.revoke_date}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded border border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-300 transition-all placeholder-gray-600 placeholder-opacity-80 text-gray-900"
                        placeholder="Select revoke date"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Status *
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded border border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-300 transition-all bg-white text-gray-900"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 p-6 bg-gray-50 rounded border border-gray-300">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                        <FaPlus className="text-gray-700" />
                      </div>
                      Additional Information
                    </h2>
                    
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Remark
                      </label>
                      <textarea
                        name="remark"
                        value={formData.remark}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-4 py-3 rounded border border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-300 transition-all placeholder-gray-600 placeholder-opacity-80 text-gray-900"
                        placeholder="Additional remarks or notes"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Upload Soft Copy Of Form (PDF only)
                      </label>
                      <div className="flex items-center">
                        <label className="flex-1 cursor-pointer">
                          <div className="px-4 py-3 bg-white border-2 border-dashed border-gray-400 rounded flex items-center justify-between hover:border-blue-600 transition-colors">
                            <span className={`${documentFile ? 'text-gray-900' : 'text-gray-500'}`}>
                              {documentFile ? documentFile.name : 'Choose PDF file...'}
                            </span>
                            <FaUpload className="text-gray-600" />
                          </div>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleDocumentChange}
                            className="hidden"
                          />
                        </label>
                        {documentFile && (
                          <button
                            type="button"
                            onClick={() => setDocumentFile(null)}
                            className="ml-3 p-2 text-red-700 hover:text-red-900 transition-colors"
                          >
                            <FaTimes />
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-gray-700">Only PDF files are allowed. Max size: 5MB</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-6 border-t border-gray-300">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded shadow-md hover:shadow-lg transition-all disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane className="mr-2" />
                        Submit Access Form
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 bg-gray-50 rounded border border-gray-300">
                <form onSubmit={handleBulkUpload} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      Upload Excel File for Bulk Processing
                    </label>
                    <div className="flex items-center">
                      <label className="flex-1 cursor-pointer">
                        <div className="px-4 py-3 bg-white border-2 border-dashed border-gray-400 rounded flex items-center justify-between hover:border-blue-600 transition-colors">
                          <span className={`${bulkFile ? 'text-gray-900' : 'text-gray-500'}`}>
                            {bulkFile ? bulkFile.name : 'Choose Excel file...'}
                          </span>
                          <FaFileExcel className="text-green-600" />
                        </div>
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleBulkFileChange}
                          className="hidden"
                        />
                      </label>
                      {bulkFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setBulkFile(null);
                            setRowCount(0);
                          }}
                          className="ml-3 p-2 text-red-700 hover:text-red-900 transition-colors"
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                      Download the template for correct format. Multiple portal names and roles should be comma-separated.
                    </p>
                    
                    {rowCount > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-sm text-blue-800">
                          <FaInfoCircle className="inline mr-1" />
                          <strong>{rowCount}</strong> records found in the Excel file.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {uploadProgress > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Upload Progress</span>
                        <span className="text-sm font-medium text-gray-700">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting || !bulkFile}
                      className="flex items-center px-8 py-3 bg-gradient-to-r from-green-700 to-teal-700 text-white rounded shadow-md hover:shadow-lg transition-all disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <>
                          <FaSpinner className="animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FaUpload className="mr-2" />
                          Process Bulk Upload
                        </>
                      )}
                    </button>
                  </div>
                </form>
                
                {bulkResults.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-300">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Upload Results</h3>
                    <div className="overflow-x-auto rounded border border-gray-300">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                              NGD ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                              User Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                              Message
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-300">
                          {bulkResults.map((result, index) => (
                            <tr key={index} className={result.success ? 'bg-green-50' : 'bg-red-50'}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {result.row.ngd_id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {result.row.user_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${result.success ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
                                  {result.success ? 'Success' : 'Failed'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {result.message}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                      <p className="text-sm text-gray-700">
                        <strong>Summary:</strong> {bulkResults.filter(r => r.success).length} successful,{' '}
                        {bulkResults.filter(r => !r.success).length} failed out of {bulkResults.length} total records.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="mt-8 p-6 bg-blue-50 rounded border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FaInfoCircle className="mr-2 text-blue-600" />
                    Excel File Format Guide
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Your Excel file should follow the format of the provided template. The template includes the following columns:
                  </p>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border border-gray-300">Column</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border border-gray-300">Description</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border border-gray-300">Required</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border border-gray-300">Example</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">ngd_id</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">NGD ID (format: NGDXXXX)</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Yes</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">NGD1234</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">user_name</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Full name of user</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Yes</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">John Doe</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">email</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Email address (@nagad.com.bd)</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Yes</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">john.doe@nagad.com.bd</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">mobile_number</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Mobile number (optional)</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">No</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">01712345678</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">division</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Division name (optional)</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">No</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">IT</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">department</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Department name (optional)</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">No</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Software Development</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">portal_name</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Portal names (comma-separated)</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Yes</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">CS,CC,SYS</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">role</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Roles (comma-separated)</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Yes</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Admin,View Only</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">effective_date</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Effective date (YYYY-MM-DD)</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Yes</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">2023-01-15</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">revoke_date</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Revoke date (YYYY-MM-DD, optional)</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">No</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">2023-12-31</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">status</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Status (Active/Inactive)</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Yes</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Active</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">remark</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">Remarks (optional)</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">No</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300">New employee access</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Download the template using the button above to ensure proper formatting.
                      Multiple values for portal_name and role should be comma-separated (e.g., &quot;CS,CC,SYS&quot;).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}