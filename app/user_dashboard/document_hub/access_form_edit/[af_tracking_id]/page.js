//app/user_dashboard/document_hub/access_form_edit/[af_tracking_id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FaUpload, FaPaperPlane, FaSpinner, FaTimes, FaDownload,
  FaArrowLeft, FaEye, FaHistory, FaSave, FaFilePdf
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Select from 'react-select';

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

export default function AccessFormEdit() {
  const params = useParams();
  const router = useRouter();
  const af_tracking_id = params.af_tracking_id;

  // Add access form type options
  const accessFormTypeOptions = [
    { value: 'Single', label: 'Single Access' },
    { value: 'Multiple', label: 'Multiple Access' },
    { value: 'CustomerService', label: 'Customer Service' }
  ];
  
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
    document_location: '',
    track_by: '',
    created_at: '',
    updated_at: '',
    access_form_type: '', // Don't set a default, it will be populated from the API
    audit_remark: '' // Add audit remark field
});
  
  const [documentFile, setDocumentFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [documentHistory, setDocumentHistory] = useState([]);

// Replace the useEffect hook with this updated version
useEffect(() => {
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch user info - handle the direct response format
      const userResponse = await fetch('/api/user_dashboard/user_info');
      const userData = await userResponse.json();
      
      // The API returns user data directly, not wrapped in success/data
      setUserInfo(userData);
      
      // Fetch access form data - this API seems to use the success/data format
      const formResponse = await fetch(`/api/user_dashboard/document_hub/access_form_edit/${af_tracking_id}`);
      const formResult = await formResponse.json();
      
      if (formResult.success) {
        const data = formResult.data;
        
        // Format dates for input fields (YYYY-MM-DD)
        const formatDateForInput = (dateString) => {
          if (!dateString) return '';
          const date = new Date(dateString);
          return date.toISOString().split('T')[0];
        };
        
        // Process portal names (convert comma-separated string to array of options)
        const portalNames = data.portal_name.split(',').map(name => {
          const trimmedName = name.trim();
          const option = portalOptions.find(opt => opt.value === trimmedName);
          return option || { value: trimmedName, label: trimmedName };
        });
        
        // Check if any portal name is not in the standard options
        const hasCustomPortal = portalNames.some(p => !portalOptions.find(opt => opt.value === p.value));
        
        // Process roles (convert comma-separated string to array of options)
        const roles = data.role.split(',').map(role => {
          const trimmedRole = role.trim();
          const option = roleOptions.find(opt => opt.value === trimmedRole);
          return option || { value: trimmedRole, label: trimmedRole };
        });
        
        // Check if any role is not in the standard options
        const hasCustomRole = roles.some(r => !roleOptions.find(opt => opt.value === r.value));
        
        setFormData({
        ...data,
        portal_name: portalNames,
        custom_portal_name: hasCustomPortal ? data.portal_name : '',
        role: roles,
        custom_role: hasCustomRole ? data.role : '',
        effective_date: formatDateForInput(data.effective_date),
        revoke_date: formatDateForInput(data.revoke_date),
        access_form_type: data.access_form_type || '', // Get from API or empty string
        additional_info: data.additional_info || '' // Get from API or empty string
      });
        
        // Fetch document history
        await fetchDocumentHistory(af_tracking_id);
      } else {
        toast.error(formResult.message || 'Failed to fetch access form data');
        router.push('/user_dashboard/document_hub/access_form_log');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
      router.push('/user_dashboard/document_hub/access_form_log');
    } finally {
      setIsLoading(false);
    }
  };
  
  fetchData();
}, [af_tracking_id, router]);

  const fetchDocumentHistory = async (trackingId) => {
    try {
      const response = await fetch(`/api/user_dashboard/document_hub/access_form_edit/${trackingId}/documents`);
      const result = await response.json();
      
      if (result.success) {
        setDocumentHistory(result.documents);
      }
    } catch (error) {
      console.error('Error fetching document history:', error);
    }
  };

  

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePortalChange = (selectedOptions) => {
    setFormData(prev => ({ 
      ...prev, 
      portal_name: selectedOptions 
    }));
    
    // Check if "Other" is selected
    const hasOther = selectedOptions.some(opt => opt.value === 'Other');
    if (!hasOther) {
      setFormData(prev => ({ ...prev, custom_portal_name: '' }));
    }
  };

  const handleRoleChange = (selectedOptions) => {
    setFormData(prev => ({ 
      ...prev, 
      role: selectedOptions 
    }));
    
    // Check if "Other" is selected
    const hasOther = selectedOptions.some(opt => opt.value === 'Other');
    if (!hasOther) {
      setFormData(prev => ({ ...prev, custom_role: '' }));
    }
  };

  const handleDocumentChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    setDocumentFile(file);
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
    
    if (formData.mobile_number && !/^01[3-9]\d{8}$/.test(formData.mobile_number)) {
      newErrors.mobile_number = 'Invalid mobile number format';
    }
    
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
    submitData.append('action', 'update');
    submitData.append('af_tracking_id', af_tracking_id);
    submitData.append('ngd_id', formData.ngd_id);
    submitData.append('user_name', formData.user_name);
    submitData.append('email', formData.email);
    submitData.append('mobile_number', formData.mobile_number);
    submitData.append('division', formData.division);
    submitData.append('department', formData.department);
    submitData.append('access_form_type', formData.access_form_type);
    submitData.append('additional_info', formData.additional_info);
    submitData.append('audit_remark', formData.audit_remark || '');
    console.log('Submitting with audit remark:', formData.audit_remark || '');
    
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
    
    // Debug: Log form data before sending
    console.debug('Submitting access form update with data:', Object.fromEntries(submitData));
    
    const response = await fetch('/api/user_dashboard/document_hub/access_form_edit/update_access_form', {
      method: 'POST',
      body: submitData
    });
    
    const result = await response.json();
    
    if (result.success) {
      toast.success('Access form updated successfully!');
      
      // Refresh document history
      await fetchDocumentHistory(af_tracking_id);
      
      // Reset document file
      setDocumentFile(null);
    } else {
      toast.error(result.message || 'Failed to update access form');
    }
  } catch (error) {
    console.error('Error updating form:', error);
    toast.error('Failed to update access form');
  } finally {
    setIsSubmitting(false);
  }
};

  const viewDocument = (documentUrl) => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    } else {
      toast.error('No document available');
    }
  };

  const formatDate = (dateString) => {
  if (!dateString) return '-';
  
  // Convert to Asia/Dhaka timezone
  const date = new Date(dateString);
  const options = {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  return date.toLocaleDateString('en-US', options);
};

const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  
  // Convert to Asia/Dhaka timezone
  const date = new Date(dateString);
  const options = {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return date.toLocaleString('en-US', options);
};

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-700">Loading access form data...</p>
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
              {/* Title Section */}
              <div className="flex items-center">
                <button
                  onClick={() => router.push('/user_dashboard/document_hub/access_form_log')}
                  className="mr-4 p-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
                >
                  <FaArrowLeft />
                </button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                    Edit Access Form
                  </h1>
                  <p className="text-blue-200 mt-1 text-sm md:text-base">
                    Tracking ID: {af_tracking_id}
                  </p>
                </div>
              </div>

            </div>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-blue-50 rounded border border-blue-200">
                  <h2 className="md:col-span-2 text-lg font-semibold text-gray-900 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <FaHistory className="text-blue-700" />
                    </div>
                    Basic Information
                  </h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      NGD ID *
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
                      Email *
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
                  
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded border border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tracked By</label>
                      <p className="text-sm text-gray-900">{formData.track_by}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                      <p className="text-sm text-gray-900">{formatDateTime(formData.created_at)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                      <p className="text-sm text-gray-900">{formatDateTime(formData.updated_at)}</p>
                    </div>
                  </div>
                </div>

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
                      className="w-full px-4 py-3 rounded border border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-300 transition-all placeholder-gray-600 placeholder-opacity-80 text-gray-900"
                      placeholder={
                        formData.access_form_type === 'CustomerService' 
                          ? "Provide details about multiple IDs, emails, or other information" 
                          : "Provide details about multiple IDs, emails, or other information"
                      }
                    />
                  </div>
                  
                  
                )}
                
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-indigo-50 rounded border border-indigo-200">
                  <h2 className="md:col-span-2 text-lg font-semibold text-gray-900 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                      <FaHistory className="text-indigo-700" />
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
                      <FaHistory className="text-gray-700" />
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

                  <div className="mb-6">
  <label className="block text-sm font-medium text-gray-900 mb-2">
    Audit Remark (for this update)
  </label>
  <textarea
    name="audit_remark"
    value={formData.audit_remark || ''}
    onChange={handleChange}
    rows={2}
    className="w-full px-4 py-3 rounded border border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-300 transition-all placeholder-gray-600 placeholder-opacity-80 text-gray-900"
    placeholder="Add a remark about this specific update"
  />
</div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Update Document (PDF only)
                    </label>
                    <div className="flex items-center">
                      <label className="flex-1 cursor-pointer">
                        <div className="px-4 py-3 bg-white border-2 border-dashed border-gray-400 rounded flex items-center justify-between hover:border-blue-600 transition-colors">
                          <span className={`${documentFile ? 'text-gray-900' : 'text-gray-500'}`}>
                            {documentFile ? documentFile.name : 'Choose PDF file to update...'}
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
                    <p className="mt-2 text-sm text-gray-700">
                      Uploading a new document will create a new version. Previous versions will be preserved.
                    </p>
                  </div>
                  
                  {documentHistory.length > 0 && (
                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-3">Document History</h3>
                      <div className="space-y-2">
                        {documentHistory.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                            <div className="flex items-center">
                              <FaFilePdf className="text-red-600 mr-2" />
                              <span className="text-sm text-gray-700">{doc.version}</span>
                              <span className="text-sm text-gray-500 ml-2">({formatDate(doc.uploaded_at)})</span>
                            </div>
                            <button
                              onClick={() => viewDocument(doc.url)}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                            >
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end pt-6 border-t border-gray-300">
                <button
                  type="button"
                  onClick={() => router.push('/user_dashboard/document_hub/access_form_log')}
                  className="mr-4 px-6 py-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded shadow-md hover:shadow-lg transition-all disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      Update Access Form
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