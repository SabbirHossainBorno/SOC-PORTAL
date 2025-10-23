// app/user_dashboard/document_hub/access_form_log/page.js
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaSearch, FaFilter, FaEdit, FaFileExcel,
  FaDownload, FaTimes, FaSpinner, FaChartBar, FaUserCheck,
  FaUserTimes, FaListAlt, FaEye, FaExternalLinkAlt, FaSync,
  FaPlus, FaFilePdf, FaIdCard, FaEnvelope, FaPhone, FaBuilding,
  FaCalendarAlt, FaUserTag, FaHistory, FaEllipsisV, FaInfoCircle,
  FaFile, FaCopy, FaCheck, FaPlusCircle, FaEdit as FaEditIcon,
  FaFileAlt, FaUpload
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Select from 'react-select';
import ExcelJS from 'exceljs';
import { useRouter } from 'next/navigation';
import { formatAuditMessage } from '../../../../lib/auditUtils';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

const statusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' }
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
    minHeight: '42px',
    fontSize: '0.875rem'
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#e5e7eb' : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#1f2937',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem'
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: '#e5e7eb',
    borderRadius: '0.375rem'
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#1f2937',
    fontWeight: '500',
    fontSize: '0.875rem'
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
    color: '#6b7280',
    fontStyle: 'italic'
  }),
  input: (provided) => ({
    ...provided,
    color: '#1f2937'
  })
};

// Function to refine audit messages and remove 'undefined' values
const refineAuditMessage = (message, actionType) => {
  if (message === 'No changes detected') return message;
  
  // Split the message into parts, removing the actionType prefix
  const messageParts = message.replace(`${actionType}: `, '').split('; ');
  
  // Filter out changes where old_value is 'undefined' for CREATE actions
  const refinedParts = actionType === 'CREATE'
    ? messageParts.filter(part => !part.includes("from 'undefined'"))
    : messageParts;
  
  // Clean up specific fields
  const cleanedParts = refinedParts.map(part => {
    // Remove redundant effective_date format changes
    if (part.includes('effective_date') && part.includes('T04:00:00.000Z')) {
      return null;
    }
    // Simplify 'Added revoke_date: ' to indicate no value
    if (part.includes('Added revoke_date: ')) {
      return 'Set revoke_date to empty';
    }
    // Simplify 'Removed' for null/undefined
    if (part.includes('Removed') && part.includes(': undefined') || part.includes(': null')) {
      return part.replace(/: undefined|: null/, ' to empty');
    }
    return part;
  }).filter(part => part !== null);

  return cleanedParts.length > 0 ? cleanedParts.join('; ') : 'No significant changes';
};

// Function to combine related UPDATE and DOCUMENT_UPDATE events
const combineAuditEvents = (auditTrail) => {
  if (!auditTrail || auditTrail.length === 0) return [];

  const combined = [];
  let i = 0;

  while (i < auditTrail.length) {
    const current = auditTrail[i];
    
    // If it's a CREATE event, add it directly
    if (current.action_type === 'CREATE') {
      combined.push(current);
      i++;
      continue;
    }

    // Check for UPDATE followed by DOCUMENT_UPDATE within 5 minutes
    if (
      current.action_type === 'UPDATE' &&
      i + 1 < auditTrail.length &&
      auditTrail[i + 1].action_type === 'DOCUMENT_UPDATE' &&
      Math.abs(new Date(auditTrail[i + 1].changed_at) - new Date(current.changed_at)) <= 5 * 60 * 1000
    ) {
      const docUpdate = auditTrail[i + 1];
      combined.push({
        ...current,
        action_type: 'UPDATE_WITH_DOCUMENT',
        changes: [
          ...(current.changes || []),
          ...(docUpdate.changes || [{ field: 'document', action: 'MODIFIED', old_value: null, new_value: 'Updated document' }])
        ],
        version: Math.max(current.version, docUpdate.version),
        changed_at: current.changed_at, // Use the UPDATE timestamp
        ip_address: current.ip_address, // Use the UPDATE IP
        changed_by: current.changed_by // Use the UPDATE changed_by
      });
      i += 2; // Skip the DOCUMENT_UPDATE
    } else {
      combined.push(current);
      i++;
    }
  }

  return combined;
};

export default function AccessFormLog() {
  const [accessForms, setAccessForms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [portalOptions, setPortalOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [auditTrail, setAuditTrail] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const searchTimeoutRef = useRef(null);
  const router = useRouter();

  const [uploadingVersion, setUploadingVersion] = useState(null);
const [uploadFile, setUploadFile] = useState(null);
const [uploadRemark, setUploadRemark] = useState('');
const [isUploading, setIsUploading] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    portal_name: [],
    role: [],
    status: [],
    track_by: '',
    effective_date_from: '',
    effective_date_to: '',
    revoke_date_from: '',
    revoke_date_to: ''
  });

  // Fetch options from API
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setOptionsLoading(true);
        const response = await fetch('/api/user_dashboard/document_hub/access_form_log/access_form_options');
        const result = await response.json();
        
        if (result.success) {
          setPortalOptions(result.portalOptions);
          setRoleOptions(result.roleOptions);
        } else {
          toast.error('Failed to fetch options');
        }
      } catch (error) {
        console.error('Error fetching options:', error);
        toast.error('Failed to fetch options');
      } finally {
        setOptionsLoading(false);
      }
    };

    fetchOptions();
  }, []);

  // Fetch access forms data
  const fetchAccessForms = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', pagination.limit.toString());
      
      // Add search term if provided
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '' && !(Array.isArray(value) && value.length === 0)) {
          if (Array.isArray(value)) {
            params.append(key, value.map(v => v.value).join(','));
          } else {
            params.append(key, value);
          }
        }
      });

      const response = await fetch(`/api/user_dashboard/document_hub/access_form_log?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setAccessForms(result.data);
        setStats(result.stats);
        setPagination(result.pagination);
        
        // Show message if no results found
        if (result.data.length === 0 && (searchTerm.trim() || Object.values(filters).some(v => v && v !== ''))) {
          toast.error('No matching records found');
        }
      } else {
        toast.error(result.message || 'Failed to fetch access forms');
      }
    } catch (error) {
      console.error('Error fetching access forms:', error);
      toast.error('Failed to fetch access forms');
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination.limit, searchTerm]);

  // Auto-refresh when filters or search term change
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      fetchAccessForms(1);
    }, 500);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters, searchTerm, fetchAccessForms]);

  // Fetch audit trail when modal opens and combine events
  useEffect(() => {
    if (showDetailsModal && selectedForm?.af_tracking_id) {
      const fetchAuditTrail = async () => {
        try {
          setAuditLoading(true);
          const response = await fetch(`/api/user_dashboard/document_hub/access_form_edit/${selectedForm.af_tracking_id}/audit`);
          const result = await response.json();
          
          if (result.success) {
            setAuditTrail(combineAuditEvents(result.audit_trail));
          } else {
            toast.error(result.message || 'Failed to fetch audit trail');
            setAuditTrail([]);
          }
        } catch (error) {
          console.error('Error fetching audit trail:', error);
          toast.error('Failed to fetch audit trail');
          setAuditTrail([]);
        } finally {
          setAuditLoading(false);
        }
      };

      fetchAuditTrail();
    }
  }, [showDetailsModal, selectedForm]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      portal_name: [],
      role: [],
      status: [],
      track_by: '',
      effective_date_from: '',
      effective_date_to: '',
      revoke_date_from: '',
      revoke_date_to: ''
    });
    setSearchTerm('');
  };

  const handleExport = async () => {
    if (!exportFrom && !exportTo) {
      toast.error('Please specify at least one AF Tracking ID range');
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      
      // Add AF Tracking ID range filter
      if (exportFrom) params.append('af_tracking_id_from', exportFrom);
      if (exportTo) params.append('af_tracking_id_to', exportTo);
      
      // Include search term
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      // Include all current filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '' && !(Array.isArray(value) && value.length === 0)) {
          if (Array.isArray(value)) {
            params.append(key, value.map(v => v.value).join(','));
          } else {
            params.append(key, value);
          }
        }
      });

      const response = await fetch(`/api/user_dashboard/document_hub/access_form_log?${params}&limit=1000`);
      const result = await response.json();
      
      if (result.success) {
        // Create a new Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Access Forms');

        // Define columns
        worksheet.columns = [
          { header: 'AF Tracking ID', key: 'af_tracking_id', width: 15 },
          { header: 'Access Form Type', key: 'access_form_type', width: 15 },
          { header: 'NGD ID', key: 'ngd_id', width: 12 },
          { header: 'User Name', key: 'user_name', width: 20 },
          { header: 'Email', key: 'email', width: 25 },
          { header: 'Mobile Number', key: 'mobile_number', width: 15 },
          { header: 'Division', key: 'division', width: 20 },
          { header: 'Department', key: 'department', width: 20 },
          { header: 'Portal Names', key: 'portal_name', width: 25 },
          { header: 'Roles', key: 'role', width: 25 },
          { header: 'Effective Date', key: 'effective_date', width: 15 },
          { header: 'Revoke Date', key: 'revoke_date', width: 15 },
          { header: 'Status', key: 'status', width: 10 },
          { header: 'Remark', key: 'remark', width: 30 },
          { header: 'Additional Info', key: 'additional_info', width: 30 },
          { header: 'Tracked By', key: 'track_by', width: 15 },
          { header: 'Created At', key: 'created_at', width: 15 },
          { header: 'Updated At', key: 'updated_at', width: 15 },
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE5E7EB' },
        };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Add data rows
        result.data.forEach(item => {
          worksheet.addRow({
            af_tracking_id: item.af_tracking_id,
            access_form_type: item.access_form_type || 'Single',
            ngd_id: item.ngd_id,
            user_name: item.user_name,
            email: item.email,
            mobile_number: item.mobile_number || '',
            division: item.division || '',
            department: item.department || '',
            portal_name: Array.isArray(item.portal_name) ? item.portal_name.join(', ') : item.portal_name,
            role: item.role,
            effective_date: item.effective_date ? new Date(item.effective_date).toLocaleDateString('en-US') : '-',
            revoke_date: item.revoke_date ? new Date(item.revoke_date).toLocaleDateString('en-US') : '-',
            status: item.status,
            remark: item.remark || '',
            additional_info: item.additional_info || '',
            track_by: item.track_by,
            created_at: item.created_at ? new Date(item.created_at).toLocaleDateString('en-US') : '-',
            updated_at: item.updated_at ? new Date(item.updated_at).toLocaleDateString('en-US') : '-',
          });
        });

        // Apply borders to all cells
        worksheet.eachRow((row, rowNumber) => {
          row.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          });
        });

        // Generate Excel file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `Access_Forms_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(link.href);

        toast.success('Export completed successfully!');
      } else {
        toast.error(result.message || 'Failed to export data');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

const handleDocumentUpload = async (version) => {
  if (!uploadFile) {
    toast.error('Please select a PDF file to upload');
    return;
  }

  setIsUploading(true);
  try {
    const formData = new FormData();
    formData.append('version', version);
    formData.append('document', uploadFile);
    formData.append('audit_remark', uploadRemark);

    const response = await fetch(`/api/user_dashboard/document_hub/access_form_edit/${selectedForm.af_tracking_id}/upload_document`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      toast.success('Document uploaded successfully');
      // Reset upload state
      setUploadFile(null);
      setUploadRemark('');
      setUploadingVersion(null);
      
      // Refresh audit trail
      const auditResponse = await fetch(`/api/user_dashboard/document_hub/access_form_edit/${selectedForm.af_tracking_id}/audit`);
      const auditResult = await auditResponse.json();
      
      if (auditResult.success) {
        setAuditTrail(auditResult.audit_trail);
      }

      // Optional: Reset modal state
      setShowDetailsModal(false);
      setSelectedForm(null);

      // Redirect to access_form_log page after a short delay
      setTimeout(() => {
        router.push('/user_dashboard/document_hub/access_form_log');
      }, 1500);
    } else {
      toast.error(result.message || 'Failed to upload document');
    }
  } catch (error) {
    console.error('Error uploading document:', error);
    toast.error('Failed to upload document');
  } finally {
    setIsUploading(false);
  }
};

const handleFileChange = (e, version, currentRemark) => {
  const file = e.target.files[0];
  if (file && file.type !== 'application/pdf') {
    toast.error('Only PDF files are allowed');
    return;
  }
  setUploadFile(file);
  setUploadingVersion(version);
  // Pre-fill the remark with the current value if it exists
  if (currentRemark && !uploadRemark) {
    setUploadRemark(currentRemark);
  }
};

  const openDocument = (documentLocation) => {
    if (documentLocation) {
      window.open(documentLocation, '_blank');
    } else {
      toast.error('No document available');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Dhaka'
    });
  };

  const formatDateOnly = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Dhaka'
  });
};

  const viewFormDetails = (form) => {
    setSelectedForm(form);
    setShowDetailsModal(true);
  };

  const getAccessFormTypeLabel = (type) => {
    switch (type) {
      case 'Single': return 'Single Access';
      case 'Multiple': return 'Multiple Access';
      case 'CustomerService': return 'Customer Service';
      default: return type || 'Single Access';
    }
  };

  // Helper function to get icon and color for action type
  const getActionIconAndColor = (actionType) => {
    switch (actionType) {
      case 'CREATE':
        return { icon: <FaPlusCircle />, color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'UPDATE':
        return { icon: <FaEditIcon />, color: 'text-blue-600', bgColor: 'bg-blue-100' };
      case 'UPDATE_WITH_DOCUMENT':
        return { icon: <FaEditIcon />, color: 'text-blue-600', bgColor: 'bg-blue-100' };
      case 'DOCUMENT_UPDATE':
        return { icon: <FaFileAlt />, color: 'text-amber-600', bgColor: 'bg-amber-100' };
      default:
        return { icon: <FaInfoCircle />, color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Access Form Log</h1>
                <p className="text-gray-600 mt-2">Track and manage all access form records in one place</p>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => router.push('/user_dashboard/document_hub/access_form_tracker')}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <FaPlus className="mr-2" />
                  New Access Form
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <FaFilter className="mr-2" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
                <button
                  onClick={() => fetchAccessForms(1)}
                  className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors shadow-sm"
                >
                  <FaSync className="mr-2" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                <FaListAlt className="text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Forms</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                <FaUserCheck className="text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-800">{stats.active}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
                <FaUserTimes className="text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-800">{stats.inactive}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters Section */}
        <div className="bg-white rounded shadow-sm p-6 border border-gray-200 mb-8">
          {/* Search Box */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="Search by AF ID, NGD ID, name, email, additional info, etc..."
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <FaTimes className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Filters Section */}
          {showFilters && (
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Portal Names</label>
                  {optionsLoading ? (
                    <div className="flex justify-center items-center h-10">
                      <FaSpinner className="animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <Select
                      isMulti
                      options={portalOptions}
                      value={filters.portal_name}
                      onChange={(selected) => handleFilterChange('portal_name', selected)}
                      styles={customStyles}
                      classNamePrefix="select"
                      placeholder="Select portals..."
                    />
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                  {optionsLoading ? (
                    <div className="flex justify-center items-center h-10">
                      <FaSpinner className="animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <Select
                      isMulti
                      options={roleOptions}
                      value={filters.role}
                      onChange={(selected) => handleFilterChange('role', selected)}
                      styles={customStyles}
                      classNamePrefix="select"
                      placeholder="Select roles..."
                    />
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <Select
                    isMulti
                    options={statusOptions}
                    value={filters.status}
                    onChange={(selected) => handleFilterChange('status', selected)}
                    styles={customStyles}
                    classNamePrefix="select"
                    placeholder="Select status..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tracked By</label>
                  <input
                    type="text"
                    value={filters.track_by}
                    onChange={(e) => handleFilterChange('track_by', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
                    placeholder="Tracker name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Effective Date From</label>
                  <input
                    type="date"
                    value={filters.effective_date_from}
                    onChange={(e) => handleFilterChange('effective_date_from', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Effective Date To</label>
                  <input
                    type="date"
                    value={filters.effective_date_to}
                    onChange={(e) => handleFilterChange('effective_date_to', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Revoke Date From</label>
                  <input
                    type="date"
                    value={filters.revoke_date_from}
                    onChange={(e) => handleFilterChange('revoke_date_from', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Revoke Date To</label>
                  <input
                    type="date"
                    value={filters.revoke_date_to}
                    onChange={(e) => handleFilterChange('revoke_date_to', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <button
                  onClick={handleClearFilters}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors flex items-center shadow-sm"
                >
                  <FaTimes className="mr-2" />
                  Clear All Filters
                </button>
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={exportFrom}
                      onChange={(e) => setExportFrom(e.target.value)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
                      placeholder="From AF ID"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="text"
                      value={exportTo}
                      onChange={(e) => setExportTo(e.target.value)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
                      placeholder="To AF ID"
                    />
                  </div>
                  
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="px-6 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors flex items-center shadow-sm"
                  >
                    {isExporting ? (
                      <FaSpinner className="animate-spin mr-2" />
                    ) : (
                      <FaFileExcel className="mr-2" />
                    )}
                    Export
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <FaSpinner className="animate-spin text-4xl text-blue-600" />
            </div>
          ) : accessForms.length === 0 ? (
            <div className="text-center py-12">
              <FaListAlt className="mx-auto text-4xl text-gray-400 mb-4" />
              <p className="text-gray-600">No access forms found</p>
              <p className="text-sm text-gray-500 mt-1">
                {searchTerm || Object.values(filters).some(v => v && v !== '') 
                  ? 'Try adjusting your search or filters' 
                  : 'No records available'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        AF Tracking ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Access Form Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Portal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accessForms.map((form) => (
                      <tr key={form.af_tracking_id} className="hover:bg-gray-50 transition-colors">
                        {/* AF Tracking ID */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="p-2 rounded-full bg-blue-100 text-blue-600 mr-3">
                              <FaIdCard className="text-lg" />
                            </div>
                            <div>
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">{form.af_tracking_id}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Access Form Type */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            {getAccessFormTypeLabel(form.access_form_type)}
                          </span>
                        </td>
                        
                        {/* User Details */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{form.user_name}</div>
                          <div className="text-sm text-blue-600">{form.email}</div>
                        </td>
                        
                        {/* Portal */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {Array.isArray(form.portal_name) 
                              ? form.portal_name.join(', ') 
                              : form.portal_name}
                          </div>
                        </td>
                        
                        {/* Role */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {form.role}
                          </div>
                        </td>
                        
                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                            form.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {form.status}
                          </span>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => viewFormDetails(form)}
                              className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50 transition-colors"
                              title="View Details"
                            >
                              <FaEye className="text-lg" />
                            </button>
                            
                            <button
                              onClick={() => router.push(`/user_dashboard/document_hub/access_form_edit/${form.af_tracking_id}`)}
                              className="text-indigo-600 hover:text-indigo-900 p-2 rounded hover:bg-indigo-50 transition-colors"
                              title="Edit Form"
                            >
                              <FaEdit className="text-lg" />
                            </button>
                            
                            <button
                              onClick={() => openDocument(form.document_location)}
                              className="text-amber-600 hover:text-amber-900 p-2 rounded hover:bg-amber-50 transition-colors"
                              title="View Document"
                            >
                              <FaFile className="text-lg" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} results
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => fetchAccessForms(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-3 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => fetchAccessForms(pageNum)}
                          className={`px-3 py-2 border rounded text-sm font-medium transition-colors ${
                            pagination.page === pageNum
                              ? 'border-blue-500 bg-blue-500 text-white'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    {pagination.pages > 5 && (
                      <span className="px-3 py-2 text-sm text-gray-700">...</span>
                    )}
                    
                    <button
                      onClick={() => fetchAccessForms(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="px-3 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Access Form Details</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedForm.af_tracking_id}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
                >
                  <FaTimes className="text-lg" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Basic Information</h4>
                    
                    <div className="space-y-3">

                      <div>
      <span className="text-xs text-gray-500 block">Initial Effective Date</span>
      <span className="text-sm font-medium text-gray-900">
        {selectedForm.effective_date ? formatDateOnly(selectedForm.effective_date) : 'N/A'}
      </span>
    </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Access Form Type</span>
                        <span className="text-sm font-medium text-gray-900">
                          {getAccessFormTypeLabel(selectedForm.access_form_type)}
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-xs text-gray-500 block">NGD ID</span>
                        <span className="text-sm font-medium text-gray-900">{selectedForm.ngd_id}</span>
                      </div>
                      
                      <div>
                        <span className="text-xs text-gray-500 block">User Name</span>
                        <span className="text-sm font-medium text-gray-900">{selectedForm.user_name}</span>
                      </div>
                      
                      <div>
                        <span className="text-xs text-gray-500 block">Email</span>
                        <span className="text-sm font-medium text-blue-600">{selectedForm.email}</span>
                      </div>
                      
                      <div>
                        <span className="text-xs text-gray-500 block">Mobile Number</span>
                        <span className="text-sm font-medium text-gray-900">{selectedForm.mobile_number || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Department Info</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-gray-500 block">Division</span>
                        <span className="text-sm font-medium text-gray-900">{selectedForm.division || 'N/A'}</span>
                      </div>
                      
                      <div>
                        <span className="text-xs text-gray-500 block">Department</span>
                        <span className="text-sm font-medium text-gray-900">{selectedForm.department || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right Column */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Access Details</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-gray-500 block">Portal Names</span>
                        <span className="text-sm font-medium text-gray-900">
                          {Array.isArray(selectedForm.portal_name) 
                            ? selectedForm.portal_name.join(', ') 
                            : selectedForm.portal_name}
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-xs text-gray-500 block">Roles</span>
                        <span className="text-sm font-medium text-gray-900">{selectedForm.role}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs text-gray-500 block">Effective Date</span>
                          <span className="text-sm font-medium text-gray-900">{formatDate(selectedForm.effective_date)}</span>
                        </div>
                        
                        <div>
                          <span className="text-xs text-gray-500 block">Revoke Date</span>
                          <span className="text-sm font-medium text-gray-900">{selectedForm.revoke_date ? formatDate(selectedForm.revoke_date) : 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs text-gray-500 block">Status</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                            selectedForm.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedForm.status}
                          </span>
                        </div>
                        
                        <div>
                          <span className="text-xs text-gray-500 block">Tracked By</span>
                          <span className="text-sm font-medium text-gray-900">{selectedForm.track_by}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Timestamps</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-gray-500 block">Created At</span>
                        <span className="text-sm font-medium text-gray-900">{formatDate(selectedForm.created_at)}</span>
                      </div>
                      
                      <div>
                        <span className="text-xs text-gray-500 block">Last Updated</span>
                        <span className="text-sm font-medium text-gray-900">{formatDate(selectedForm.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Additional Info Sections (Full Width) */}
              {selectedForm.remark && (
                <div className="mt-4 bg-gray-50 p-4 rounded">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Remark</h4>
                  <p className="text-sm text-gray-900">{selectedForm.remark}</p>
                </div>
              )}
              
              {selectedForm.additional_info && (
                <div className="mt-4 bg-gray-50 p-4 rounded">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Additional Information</h4>
                  <p className="text-sm text-gray-900">{selectedForm.additional_info}</p>
                </div>
              )}
              
              {/* Audit Trail Section */}
              <div className="mt-4 bg-gray-50 p-4 rounded">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                  <FaHistory className="mr-2" />
                  Audit Trail
                </h4>
                
                {auditLoading ? (
                  <div className="flex justify-center items-center py-4">
                    <FaSpinner className="animate-spin text-2xl text-blue-600" />
                  </div>
                ) : auditTrail.length === 0 ? (
                  <div className="text-center py-4">
                    <FaHistory className="mx-auto text-2xl text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">No audit trail records found</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                    
{auditTrail.map((audit) => {
  const { icon, color, bgColor } = getActionIconAndColor(audit.action_type);
  
  return (
    <div key={audit.serial} className="relative mb-6 last:mb-0">
      {/* Timeline Dot */}
      <div className={`absolute left-2.5 w-4 h-4 rounded-full ${bgColor} border-2 border-white`}></div>
      
      {/* Content */}
      <div className="ml-10 bg-white p-4 rounded shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`p-2 rounded-full ${bgColor} ${color} mr-3`}>
              {icon}
            </div>
            <div>
  <h5 className="text-sm font-semibold text-gray-800">
    {audit.action_type === 'CREATE' ? 'Form Created' : 'Form Updated'}
    {` (Version ${audit.version})`}
  </h5>
  <p className="text-xs text-gray-500">
    By {audit.updated_by} on {formatDate(audit.created_at)} from IP {audit.ip_address} | Last Updated : {formatDate(audit.updated_at)}
  </p>
  {/* Show effective date for this version */}
  {audit.effective_date && (
    <p className="text-xs text-green-600 font-medium mt-1">
      Effective Date for this version: {formatDateOnly(audit.effective_date)}
    </p>
  )}
</div>
          </div>
        </div>
        
        {/* Audit Info */}
        <div className="mt-2">
          <p className="text-sm text-gray-700">
            {audit.audit_info}
          </p>
        </div>
        
        {/* Audit Remark (if exists) */}
        {audit.audit_remark && (
          <div className="mt-2 p-2 bg-gray-100 rounded">
            <p className="text-xs text-gray-500">Audit Remark:</p>
            <p className="text-sm text-gray-700">{audit.audit_remark}</p>
          </div>
        )}
        
        {/* Document Action */}
        <div className="mt-3">
          {audit.document_location ? (
            <button
              onClick={() => openDocument(audit.document_location)}
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <FaFilePdf className="mr-1" />
              View Document
            </button>
          ) : (
            <div className="mt-3">
              {uploadingVersion === audit.version ? (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm">
                  <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                    <FaUpload className="mr-2" />
                    Upload Document for Version {audit.version}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">
                        Select PDF File
                      </label>
                      <div className="flex items-center">
                        <label className="flex-1 cursor-pointer">
                          <div className="px-4 py-3 bg-white border-2 border-dashed border-blue-400 rounded flex items-center justify-between hover:border-blue-600 transition-colors">
                            <span className={`text-sm font-medium ${uploadFile ? 'text-gray-900' : 'text-gray-600'}`}>
                              {uploadFile ? uploadFile.name : 'Choose PDF file...'}
                            </span>
                            <FaUpload className="text-blue-600" />
                          </div>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => handleFileChange(e, audit.version, audit.audit_remark)}
                            className="hidden"
                          />
                        </label>
                        {uploadFile && (
                          <button
                            onClick={() => setUploadFile(null)}
                            className="ml-3 p-2 text-red-600 hover:text-red-800 transition-colors"
                            title="Remove file"
                          >
                            <FaTimes />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Only PDF files are accepted</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">
                        Audit Remark
                      </label>
                      <textarea
                        value={uploadRemark}
                        onChange={(e) => setUploadRemark(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                        placeholder="Add a remark for this document upload"
                      />
                      {audit.audit_remark && (
                        <p className="text-xs text-gray-600 mt-1">
                          Current remark: <span className="font-medium">{audit.audit_remark}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-4 pt-3 border-t border-blue-200">
                    <button
                      onClick={() => {
                        setUploadingVersion(null);
                        setUploadFile(null);
                        setUploadRemark('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDocumentUpload(audit.version)}
                      disabled={isUploading || !uploadFile}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium flex items-center"
                    >
                      {isUploading ? (
                        <>
                          <FaSpinner className="animate-spin mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <FaUpload className="mr-2" />
                          Upload Document
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded border border-amber-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-amber-100 rounded-full mr-3">
                      <FaFilePdf className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-800">No document attached</p>
                      <p className="text-xs text-amber-600">Upload a PDF to complete this record</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setUploadingVersion(audit.version);
                      setUploadRemark(audit.audit_remark || '');
                    }}
                    className="flex items-center px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors font-medium"
                  >
                    <FaUpload className="mr-2" />
                    Upload Document
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    );
  })}
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openDocument(selectedForm.document_location)}
                  className="flex items-center px-4 py-2 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded transition-colors"
                >
                  <FaFile className="mr-2" />
                  View Document
                </button>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => router.push(`/user_dashboard/document_hub/access_form_edit/${selectedForm.af_tracking_id}`)}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                >
                  <FaEdit className="mr-2" />
                  Edit Form
                </button>
                
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}