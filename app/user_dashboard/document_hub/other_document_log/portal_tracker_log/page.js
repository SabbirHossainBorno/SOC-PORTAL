// app/user_dashboard/document_hub/other_document_log/portal_tracker_log/page.js
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaCog, FaArrowLeft, FaSearch, FaEye, 
  FaEdit, FaSpinner, FaSync,
  FaFilter, FaDownload, FaPlus, FaTimes,
  FaCheckCircle, FaExclamationTriangle,
  FaCaretDown, FaCaretUp, FaCopy,
  FaGlobe, FaUser, FaLock, FaEyeSlash,
  FaChevronDown, FaChevronRight, FaLink
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

// Enhanced Portal Details Modal Component - Shows ALL roles for the same URL
const PortalDetailsModal = ({ portalGroup, isOpen, onClose, onEdit, canCreatePortal, copyToClipboard, onAddRole }) => {
  const [visiblePasswords, setVisiblePasswords] = useState({});

  if (!isOpen || !portalGroup || portalGroup.portals.length === 0) return null;

  const mainPortal = portalGroup.portals[0];

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const togglePasswordVisibility = (portalId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [portalId]: !prev[portalId]
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded shadow-lg mr-4">
                <FaGlobe className="text-white text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Portal Details - {mainPortal.portal_name}
                </h2>
                <p className="text-slate-600 mt-1">
                  {portalGroup.portals.length} role{portalGroup.portals.length > 1 ? 's' : ''} for {mainPortal.portal_url}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {canCreatePortal && (
                <button
                  onClick={onAddRole}
                  className="flex items-center px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <FaPlus className="mr-2" />
                  Add New Role
                </button>
              )}
              <button
                onClick={onClose}
                className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-8">
          {/* Common Portal Information */}
          <div className="bg-slate-50 p-6 rounded border border-slate-200 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center mr-3">
                <FaGlobe className="text-purple-600" />
              </div>
              Common Portal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-500">Portal Name</label>
                <p className="text-slate-800 font-semibold mt-1 text-lg">{mainPortal.portal_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Category</label>
                <p className="text-slate-800 font-semibold mt-1">{mainPortal.portal_category}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-500">Portal URL</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-slate-800 font-semibold flex-1 bg-white p-3 rounded border border-slate-200 truncate">
                    {mainPortal.portal_url}
                  </p>
                  <button
                    onClick={() => copyToClipboard(mainPortal.portal_url, 'Portal URL')}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                    title="Copy URL"
                  >
                    <FaCopy className="text-sm" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* All Roles Section */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded border border-blue-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center mr-3">
                <FaUser className="text-blue-600" />
              </div>
              All Roles & Access Information ({portalGroup.portals.length} role{portalGroup.portals.length > 1 ? 's' : ''})
            </h3>
            
            <div className="space-y-4">
              {portalGroup.portals.map((portal, index) => (
                <div
                  key={portal.pt_id}
                  className="bg-white rounded border border-slate-200 p-6 hover:shadow-sm transition-shadow"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Role and Basic Info */}
                    <div className="lg:col-span-3">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-slate-500">Role</label>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-3 py-1.5 rounded text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                              {portal.role}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-500">Tracked By</label>
                          <p className="text-slate-800 font-semibold mt-1">{portal.track_by}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-500">Portal ID</label>
                          <p className="text-slate-800 font-mono font-semibold mt-1 text-sm">{portal.pt_id}</p>
                        </div>
                      </div>
                    </div>

                    {/* User Identifier */}
<div className="lg:col-span-3">
  <div>
    <label className="text-sm font-medium text-slate-500">User ID / Email / Phone</label>
    <div className="flex items-center gap-2 mt-1">
      <div className={`font-semibold flex-1 p-3 rounded border break-all ${
        portal.user_identifier === 'Individual'
          ? 'text-orange-600 font-bold bg-orange-50 border-orange-200'
          : 'text-slate-800 bg-slate-50 border-slate-200'
      }`}>
        {portal.user_identifier}
      </div>
      <button
        onClick={() => copyToClipboard(portal.user_identifier, 'User ID')}
        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
        title="Copy User ID"
      >
        <FaCopy className="text-sm" />
      </button>
    </div>
  </div>
</div>

{/* Password */}
<div className="lg:col-span-3">
  <div>
    <label className="text-sm font-medium text-slate-500">Password</label>
    <div className="flex items-center gap-2 mt-1">
      {portal.password === 'Individual' ? (
        <div className="font-mono font-bold text-red-600 bg-red-50 p-3 rounded border border-red-200 flex-1 break-all">
          Individual
        </div>
      ) : (
        <div className="flex-1 flex items-center">
          <p className="text-slate-800 font-mono font-semibold bg-slate-50 p-3 rounded border border-slate-200 flex-1 break-all">
            {visiblePasswords[portal.pt_id] ? portal.password : '••••••••••••'}
          </p>
        </div>
      )}
      <div className="flex gap-1 flex-shrink-0">
        {portal.password !== 'Individual' && (
          <>
            <button
              onClick={() => togglePasswordVisibility(portal.pt_id)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title={visiblePasswords[portal.pt_id] ? 'Hide Password' : 'Show Password'}
            >
              {visiblePasswords[portal.pt_id] ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
            </button>
            <button
              onClick={() => copyToClipboard(portal.password, 'Password')}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Copy Password"
            >
              <FaCopy className="text-sm" />
            </button>
          </>
        )}
        {portal.password === 'Individual' && (
          <button
            onClick={() => copyToClipboard(portal.password, 'Password')}
            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Copy Password"
          >
            <FaCopy className="text-sm" />
          </button>
        )}
      </div>
    </div>
  </div>
</div>

                    {/* Actions */}
                    <div className="lg:col-span-3">
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => onEdit(portal)}
                          className="flex items-center justify-center px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors font-medium"
                          title="Edit Role"
                        >
                          <FaEdit className="mr-2" />
                          Edit Role
                        </button>
                        {portal.remark && (
                          <div className="mt-2">
                            <label className="text-sm font-medium text-slate-500">Remarks</label>
                            <p className="text-slate-600 text-sm mt-1 bg-slate-50 p-2 rounded border border-slate-200">
                              {portal.remark}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Created: {formatDate(portal.created_at)}</span>
                      <span>Last updated: {formatDate(portal.updated_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-8 py-6 rounded">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-600">
              Showing {portalGroup.portals.length} role{portalGroup.portals.length > 1 ? 's' : ''} for this portal
            </div>
            <div className="flex space-x-4">
              {canCreatePortal && (
                <button
                  onClick={onAddRole}
                  className="flex items-center px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-medium"
                >
                  <FaPlus className="mr-2" />
                  Add New Role
                </button>
              )}
              <button
                onClick={onClose}
                className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 transition-colors font-medium"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Grouped Portal Row Component
const GroupedPortalRow = ({ 
  portalUrl, 
  portals, 
  category, 
  isExpanded, 
  onToggle, 
  onViewDetails, 
  onEdit, 
  copyToClipboard, 
  visiblePasswords, 
  togglePasswordVisibility,
  canCreatePortal,
  onAddRole
}) => {
  const mainPortal = portals[0];
  const router = useRouter();

  return (
    <>
      {/* Main Row - Group Header */}
      <tr className="bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer" onClick={onToggle}>
        <td className="px-6 py-4 border-b border-slate-200">
  <div className="flex items-center">
    <div className="flex items-center mr-3 text-purple-600">
      {isExpanded ? <FaChevronDown className="text-sm" /> : <FaChevronRight className="text-sm" />}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <FaLink className="text-purple-500 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900 truncate">
            {mainPortal.portal_name}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span className="truncate flex-1">{portalUrl}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(portalUrl, 'Portal URL');
              }}
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
              title="Copy URL"
            >
              <FaCopy className="text-xs" />
            </button>
          </div>
          <div className="text-xs text-slate-500">
            {portals.length} role{portals.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  </div>
</td>
        
        <td className="px-6 py-4 border-b border-slate-200">
          <span className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
            {category}
          </span>
        </td>
        
        <td className="px-6 py-4 border-b border-slate-200">
          <div className="flex flex-wrap gap-1">
            {portals.slice(0, 3).map((portal, index) => (
              <span
                key={portal.pt_id}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
              >
                {portal.role}
              </span>
            ))}
            {portals.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                +{portals.length - 3} more
              </span>
            )}
          </div>
        </td>
        
        <td className="px-6 py-4 border-b border-slate-200">
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails({ portal_url: portalUrl, portals, portal_category: category });
              }}
              className="flex items-center px-3 py-1.5 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition-colors text-sm"
              title="View All Details"
            >
              <FaEye className="mr-1" />
              View All
            </button>
            {canCreatePortal && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddRole(mainPortal);
                }}
                className="flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors text-sm"
                title="Add New Role"
              >
                <FaPlus className="mr-1" />
                Add Role
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Content - Role Details */}
      {isExpanded && (
        <tr className="bg-slate-25">
          <td colSpan="4" className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-75">
            <div className="ml-8 border-l-2 border-purple-200 pl-4">
              <div className="space-y-3">
                {portals.map((portal, index) => (
                  <div
                    key={portal.pt_id}
                    className="bg-white rounded border border-slate-200 p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                      {/* Role and User Info */}
                      <div className="lg:col-span-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center px-3 py-1 rounded text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            {portal.role}
                          </span>
                        </div>
                      </div>

                      {/* User Identifier in expanded row */}
<div className="lg:col-span-3">
  <div className="flex items-center gap-2">
    <div className={`text-sm truncate flex-1 ${
      portal.user_identifier === 'Individual' 
        ? 'text-orange-600 font-bold bg-orange-50 px-3 py-2 rounded border border-orange-200' 
        : 'text-slate-800 font-medium'
    }`}>
      {portal.user_identifier}
    </div>
    <button
      onClick={() => copyToClipboard(portal.user_identifier, 'User ID')}
      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
      title="Copy User ID"
    >
      <FaCopy className="text-xs" />
    </button>
  </div>
</div>

{/* Password in expanded row */}
<div className="lg:col-span-3">
  <div className="flex items-center gap-2">
    {portal.password === 'Individual' ? (
      <div className="text-sm font-mono font-bold text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200 flex-1">
        Individual
      </div>
    ) : (
      <div className="text-sm font-mono font-semibold text-slate-800 flex-1">
        {visiblePasswords[portal.pt_id] ? portal.password : '••••••••••••'}
      </div>
    )}
    <div className="flex gap-1 flex-shrink-0">
      {portal.password !== 'Individual' && (
        <>
          <button
            onClick={() => togglePasswordVisibility(portal.pt_id)}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title={visiblePasswords[portal.pt_id] ? 'Hide Password' : 'Show Password'}
          >
            {visiblePasswords[portal.pt_id] ? <FaEyeSlash className="text-xs" /> : <FaEye className="text-xs" />}
          </button>
          <button
            onClick={() => copyToClipboard(portal.password, 'Password')}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Copy Password"
          >
            <FaCopy className="text-xs" />
          </button>
        </>
      )}
      {portal.password === 'Individual' && (
        <button
          onClick={() => copyToClipboard(portal.password, 'Password')}
          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Copy Password"
        >
          <FaCopy className="text-xs" />
        </button>
      )}
    </div>
  </div>
</div>

                      {/* Actions */}
                      <div className="lg:col-span-3">
                        <div className="flex space-x-2 justify-end">
                          <button
                            onClick={() => onEdit(portal)}
                            className="flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors text-sm"
                            title="Edit Role"
                          >
                            <FaEdit className="mr-1" />
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Portal ID: {portal.pt_id}</span>
                        <span>Created: {new Date(portal.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default function PortalTrackerLog({ authInfo }) {
  const router = useRouter();
  const [portals, setPortals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPortalGroup, setSelectedPortalGroup] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});

  // Enhanced auth handling
  const [effectiveAuthInfo, setEffectiveAuthInfo] = useState(authInfo);
  
  useEffect(() => {
    if (!authInfo?.role) {
      fetch('/api/check_auth')
        .then(res => res.json())
        .then(data => {
          if (data.authenticated) {
            setEffectiveAuthInfo(data);
          }
        })
        .catch(err => console.error('Failed to fetch auth:', err));
    } else {
      setEffectiveAuthInfo(authInfo);
    }
  }, [authInfo]);

  const userRole = effectiveAuthInfo?.role || '';
  const canCreatePortal = ['SOC', 'INTERN'].includes(userRole);

  // Group portals by URL
  const groupedPortals = useMemo(() => {
    const groups = {};
    
    portals.forEach(portal => {
      if (!groups[portal.portal_url]) {
        groups[portal.portal_url] = {
          portal_url: portal.portal_url,
          portal_category: portal.portal_category,
          portals: []
        };
      }
      groups[portal.portal_url].portals.push(portal);
    });

    // Sort portals within each group by role
    Object.values(groups).forEach(group => {
      group.portals.sort((a, b) => a.role.localeCompare(b.role));
    });

    return Object.values(groups);
  }, [portals]);

  // Define fallbackCopyMethod outside of copyToClipboard
  const fallbackCopyMethod = useCallback((text, type) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        toast.success(`${type} copied to clipboard!`);
      } else {
        toast.error('Failed to copy to clipboard');
      }
    } catch (err) {
      console.error('Fallback copy method failed:', err);
      toast.error('Copy failed. Please copy manually.');
    }
  }, []);

  // Enhanced copyToClipboard function
  const copyToClipboard = useCallback((text, type) => {
    if (!text) {
      toast.error('No text to copy');
      return;
    }

    if (typeof window === 'undefined') {
      toast.error('Copy functionality not available');
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          toast.success(`${type} copied to clipboard!`);
        })
        .catch((err) => {
          console.error('Clipboard API failed:', err);
          fallbackCopyMethod(text, type);
        });
    } else {
      fallbackCopyMethod(text, type);
    }
  }, [fallbackCopyMethod]);

  // Toggle password visibility
  const togglePasswordVisibility = useCallback((portalId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [portalId]: !prev[portalId]
    }));
  }, []);

  // Toggle group expansion
  const toggleGroupExpansion = useCallback((portalUrl) => {
    setExpandedGroups(prev => ({
      ...prev,
      [portalUrl]: !prev[portalUrl]
    }));
  }, []);

  // Handle view details - shows ALL roles in modal
  const handleViewDetails = useCallback((portalGroup) => {
    setSelectedPortalGroup(portalGroup);
    setIsModalOpen(true);
  }, []);

  // Handle add role - navigate to portal tracker with pre-filled data
  const handleAddRole = useCallback((portal) => {
    // Store the portal data in sessionStorage to pre-fill the form
    const prefillData = {
      portal_url: portal.portal_url,
      portal_name: portal.portal_name,
      portal_category: portal.portal_category,
      isReadOnly: true // Flag to indicate these fields should be read-only
    };
    
    sessionStorage.setItem('portal_prefill_data', JSON.stringify(prefillData));
    router.push('/user_dashboard/document_hub/other_document_tracker/portal_tracker');
  }, [router]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedPortalGroup(null);
  }, []);

  const handleEdit = useCallback((portal) => {
    router.push(`/user_dashboard/document_hub/other_document_tracker/portal_tracker/edit/${portal.pt_id}`);
  }, [router]);

  const fetchPortals = useCallback(async (page = 1, search = '', limit = itemsPerPage) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort: sortField,
        order: sortDirection,
        ...(search && { search }),
        ...(categoryFilter !== 'all' && { category: categoryFilter })
      });

      const response = await fetch(`/api/user_dashboard/document_hub/other_document_log/portal_tracker_log?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch portals');
      }

      const result = await response.json();
      
      if (result.success) {
        setPortals(result.data);
        setTotalPages(result.pagination.pages);
        setTotalCount(result.pagination.total);
        setCurrentPage(page);
        // Reset visible passwords and expanded groups when data changes
        setVisiblePasswords({});
        setExpandedGroups({});
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error fetching portals:', error);
      toast.error('Failed to load portal tracker logs');
    } finally {
      setLoading(false);
    }
  }, [sortField, sortDirection, categoryFilter, itemsPerPage]);

  useEffect(() => {
    fetchPortals();
  }, [fetchPortals]);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    fetchPortals(1, searchTerm);
  }, [fetchPortals, searchTerm]);

  const handlePageChange = useCallback((page) => {
    fetchPortals(page, searchTerm);
  }, [fetchPortals, searchTerm]);

  const handleItemsPerPageChange = useCallback((value) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField, sortDirection]);

  const SortIcon = useCallback(({ field }) => {
    if (sortField !== field) return <FaCaretDown className="text-slate-400 ml-1" />;
    return sortDirection === 'asc' ? 
      <FaCaretUp className="text-blue-600 ml-1" /> : 
      <FaCaretDown className="text-blue-600 ml-1" />;
  }, [sortField, sortDirection]);

  // Get unique categories for filter
  const categories = useMemo(() => 
    [...new Set(portals.map(portal => portal.portal_category))].sort(),
    [portals]
  );

  // Calculate statistics
  const categoryCounts = useMemo(() => 
    portals.reduce((acc, portal) => {
      acc[portal.portal_category] = (acc[portal.portal_category] || 0) + 1;
      return acc;
    }, {}),
    [portals]
  );

  const uniqueUrlsCount = groupedPortals.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="bg-white rounded shadow-xl overflow-hidden border border-slate-200 mb-8">
          <div className="relative px-8 py-8 bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center mb-6 lg:mb-0">
                <button
                  onClick={() => router.push('/user_dashboard/document_hub/other_document_log')}
                  className="mr-6 p-3 bg-white/20 rounded hover:bg-white/30 transition-colors backdrop-blur-sm"
                >
                  <FaArrowLeft className="text-xl" />
                </button>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                    Portal Tracker Log
                  </h1>
                  <p className="text-purple-200 mt-2 text-lg">
                    Grouped view of all tracked portals and their roles
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {canCreatePortal && (
                  <button
                    onClick={() => {
                      // Clear any prefill data when creating a brand new portal
                      sessionStorage.removeItem('portal_prefill_data');
                      router.push('/user_dashboard/document_hub/other_document_tracker/portal_tracker');
                    }}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                  >
                    <FaPlus className="mr-2" />
                    Track New Portal
                  </button>
                )}
                <div className="p-4 bg-white/20 rounded backdrop-blur-sm">
                  <FaGlobe className="text-2xl" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Portals</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{totalCount}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded">
                <FaGlobe className="text-2xl text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Unique URLs</p>
                <p className="text-3xl font-bold text-indigo-600 mt-2">{uniqueUrlsCount}</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded">
                <FaLink className="text-2xl text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Live Web</p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">{categoryCounts['Live Web'] || 0}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded">
                <FaCheckCircle className="text-2xl text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Staging Web</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">{categoryCounts['Staging Web'] || 0}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded">
                <FaExclamationTriangle className="text-2xl text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="bg-white rounded shadow-lg p-6 border border-slate-200 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaSearch className="text-slate-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by portal name, URL, category, user ID, or role..."
                  className="block w-full pl-12 pr-4 py-3 border border-slate-300 rounded bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-700 placeholder-slate-500"
                />
              </div>
            </form>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-700"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              {/* Items Per Page */}
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-700"
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>

              <button
                onClick={() => fetchPortals(currentPage, searchTerm)}
                disabled={loading}
                className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl font-medium"
              >
                <FaSync className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Grouped Portals Table */}
        <div className="bg-white rounded shadow-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-center">
                <FaSpinner className="animate-spin text-4xl text-purple-600 mx-auto mb-4" />
                <p className="text-slate-600 text-lg">Loading portal information...</p>
                <p className="text-slate-500 text-sm mt-2">Please wait while we fetch the latest data</p>
              </div>
            </div>
          ) : groupedPortals.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center mx-auto mb-6">
                <FaGlobe className="text-3xl text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-3">No portals found</h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                {searchTerm || categoryFilter !== 'all' 
                  ? 'No portals match your current filters. Try adjusting your search criteria.' 
                  : 'Start tracking your first portal to manage your access credentials efficiently.'}
              </p>
              {canCreatePortal && (
                <button
                  onClick={() => {
                    sessionStorage.removeItem('portal_prefill_data');
                    router.push('/user_dashboard/document_hub/other_document_tracker/portal_tracker');
                  }}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  <FaPlus className="mr-2" />
                  Track New Portal
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th 
                        className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('portal_url')}
                      >
                        <div className="flex items-center">
                          Portal Information
                          <SortIcon field="portal_url" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('portal_category')}
                      >
                        <div className="flex items-center">
                          Category
                          <SortIcon field="portal_category" />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Roles
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {groupedPortals.map((group) => (
                      <GroupedPortalRow
                        key={group.portal_url}
                        portalUrl={group.portal_url}
                        portals={group.portals}
                        category={group.portal_category}
                        isExpanded={expandedGroups[group.portal_url]}
                        onToggle={() => toggleGroupExpansion(group.portal_url)}
                        onViewDetails={handleViewDetails}
                        onEdit={handleEdit}
                        copyToClipboard={copyToClipboard}
                        visiblePasswords={visiblePasswords}
                        togglePasswordVisibility={togglePasswordVisibility}
                        canCreatePortal={canCreatePortal}
                        onAddRole={handleAddRole}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="text-sm text-slate-700">
                      Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                      <span className="font-semibold">
                        {Math.min(currentPage * itemsPerPage, totalCount)}
                      </span> of{' '}
                      <span className="font-semibold">{totalCount}</span> portals
                      <span className="ml-2 text-slate-500">
                        ({uniqueUrlsCount} unique URLs)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-2 border text-sm font-medium rounded transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-lg'
                                  : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Enhanced Portal Details Modal - Shows ALL roles */}
        <PortalDetailsModal
          portalGroup={selectedPortalGroup}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onEdit={handleEdit}
          canCreatePortal={canCreatePortal}
          copyToClipboard={copyToClipboard}
          onAddRole={() => selectedPortalGroup && handleAddRole(selectedPortalGroup.portals[0])}
        />
      </div>

      {/* Add custom styles for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
        .bg-slate-25 {
          background-color: #fafbfc;
        }
        .bg-slate-75 {
          background-color: #f1f5f9;
        }
      `}</style>
    </div>
  );
}