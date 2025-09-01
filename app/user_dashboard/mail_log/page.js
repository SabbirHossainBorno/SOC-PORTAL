// app/user_dashboard/mail_log/page.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaEnvelope, FaSearch, FaFilter, FaArrowLeft, 
  FaEye, FaEdit, FaSort, FaSortUp, FaSortDown,
  FaCalendarAlt, FaSync, FaChevronLeft, FaChevronRight,
  FaTimes, FaInfoCircle, FaClock, FaUser, FaTag,
  FaCheckCircle, FaSpinner, FaExclamationTriangle,
  FaUserCheck, FaComment, FaHistory
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import Link from 'next/link';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

// Function to format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Dhaka' // Ensure Asia/Dhaka timezone
  });
};

// Function to format datetime for display
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Dhaka' // Ensure Asia/Dhaka timezone
  });
};

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    'SOLVED': { color: 'bg-green-100 text-green-800 border-green-200' },
    'IN-PROGRESS': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
  };
  
  const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800 border-gray-200' };
  
  return (
    <span className={`px-2.5 py-1 rounded text-xs font-medium border ${config.color}`}>
      {status}
    </span>
  );
};

// Team badge component
const TeamBadge = ({ team }) => {
  const teamConfig = {
    'SOC': { color: 'bg-blue-100 text-blue-800 border-blue-200' },
    'OPS': { color: 'bg-purple-100 text-purple-800 border-purple-200' }
  };
  
  const config = teamConfig[team] || { color: 'bg-gray-100 text-gray-800 border-gray-200' };
  
  return (
    <span className={`px-2.5 py-1 rounded text-xs font-medium border ${config.color}`}>
      {team || 'N/A'}
    </span>
  );
};

// Modal component for showing mail details
const MailDetailsModal = ({ mail, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded shadow-lg max-w-3xl w-full max-h-[95vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded">
              <FaEnvelope className="text-blue-600 text-sm" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Mail Details</h2>
              <p className="text-gray-600 text-xs">Serial: #{mail.serial}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <FaTimes size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-4">
          {/* Mail Subject - Full Width */}
          <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="flex items-start gap-2">
              <div className="mt-0.5">
                <FaTag className="text-blue-500 text-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1 font-medium">Subject</p>
                <p className="text-sm font-medium text-gray-800 break-words">{mail.mail_subject || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Basic Information */}
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <div className="w-1.5 h-4 bg-blue-400 rounded"></div>
                Basic Info
              </h3>
              
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <FaCalendarAlt className="text-blue-500 text-xs" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Tracking Date</p>
                    <p className="text-xs font-medium text-gray-800">{formatDate(mail.tracking_date)}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <FaClock className="text-blue-500 text-xs" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Raised Date</p>
                    <p className="text-xs font-medium text-gray-800">{formatDate(mail.task_raised_date)}</p>
                  </div>
                </div>
                
                {mail.task_solve_date && (
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <FaCheckCircle className="text-green-500 text-xs" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Solve Date</p>
                      <p className="text-xs font-medium text-gray-800">{formatDate(mail.task_solve_date)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Status Information */}
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <div className="w-1.5 h-4 bg-green-400 rounded"></div>
                Status
              </h3>
              
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <span className={`${
                      mail.status === 'SOLVED' ? 'bg-green-400' : 'bg-yellow-400'
                    }`}></span>
                  </div>
                  <div>
                    <StatusBadge status={mail.status} />
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <FaInfoCircle className="text-blue-500 text-xs" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Solved Within Day</p>
                    <p className="text-xs font-medium text-gray-800">{mail.solved_within_day || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <FaUser className="text-blue-500 text-xs" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Raised By</p>
                    <p className="text-xs font-medium text-gray-800">{mail.raised_by || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Team Information */}
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <div className="w-1.5 h-4 bg-purple-400 rounded"></div>
                Team
              </h3>
              
              <div className="space-y-2.5">
                {mail.assigned_team && (
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <FaTag className="text-purple-500 text-xs" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Assigned Team</p>
                      <TeamBadge team={mail.assigned_team} />
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <FaUser className="text-blue-500 text-xs" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Tracked By</p>
                    <p className="text-xs font-medium text-gray-800">{mail.tracked_by || 'N/A'}</p>
                  </div>
                </div>
                
                {mail.solved_by && (
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <FaUserCheck className="text-green-500 text-xs" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Solved By</p>
                      <p className="text-xs font-medium text-gray-800">{mail.solved_by}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Timeline Information */}
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <div className="w-1.5 h-4 bg-amber-400 rounded"></div>
                Timeline
              </h3>
              
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <FaClock className="text-blue-500 text-xs" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Created At</p>
                    <p className="text-xs font-medium text-gray-800">{formatDateTime(mail.created_at)}</p>
                  </div>
                </div>
                
                {mail.updated_at && (
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <FaHistory className="text-blue-500 text-xs" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Last Updated</p>
                      <p className="text-xs font-medium text-gray-800">{formatDateTime(mail.updated_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Information - Full Width */}
          {(mail.feedback) && (
            <div className="mt-3 bg-gray-50 p-3 rounded border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <div className="w-1.5 h-4 bg-gray-400 rounded"></div>
                Additional Info
              </h3>
              
              <div className="space-y-2.5">
                {mail.feedback && (
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <FaComment className="text-amber-500 text-xs" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5">Feedback</p>
                      <p className="text-xs font-medium text-gray-800 break-words">{mail.feedback}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end p-3 border-t border-gray-200 bg-gray-50 rounded">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded text-xs font-medium hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function MailTrackingView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mailData, setMailData] = useState([]);
  const [pagination, setPagination] = useState({});
  const [selectedMail, setSelectedMail] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    date: '',
    raisedBy: 'all',
    assignedTeam: 'all',
    search: '',
    sortBy: 'tracking_date',
    sortOrder: 'desc',
    limit: 20 // Default limit
  });
  const [currentPage, setCurrentPage] = useState(1);

  const statusOptions = ['all', 'SOLVED', 'IN-PROGRESS'];
  const raisedByOptions = [
    'all', 'SALES', 'CS/CDIM', 'COMPLIANCE', 'LEA', 'SERVICE DELIVERY', 
    'FININCE', 'HRM', 'RECONCILIATION', 'SCM', 'REVENUE ASSURANCE',
    'MARKETING', 'TECHNOLOGY', 'COMMERCIAL', 'EXTERNAL', 'GOVT', 'OTHER'
  ];
  const assignedTeamOptions = ['all', 'SOC', 'OPS'];
  const limitOptions = [20, 50, 100]; // Available page size options

  // Debounce function to limit API calls
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  };

  // Fetch mail data with debouncing
  const fetchMailData = useCallback(debounce(async (page = 1, filters) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page,
        limit: filters.limit,
        ...filters
      });

      const response = await fetch(`/api/user_dashboard/mail_log?${params}`);
      const result = await response.json();

      if (result.success) {
        setMailData(result.data);
        setPagination(result.pagination);
        setCurrentPage(page);
      } else {
        toast.error('Failed to fetch mail data');
      }
    } catch (error) {
      console.error('Error fetching mail data:', error);
      toast.error('Error fetching mail data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, 300), []);

  // Initial data fetch and when filters change
  useEffect(() => {
    fetchMailData(1, filters);
  }, [filters, fetchMailData]);

  // Handle filter changes - automatic filtering
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      status: 'all',
      date: '',
      raisedBy: 'all',
      assignedTeam: 'all',
      search: '',
      sortBy: 'tracking_date',
      sortOrder: 'desc',
      limit: 20
    });
  };

  // Handle sort
  const handleSort = (column) => {
    if (filters.sortBy === column) {
      setFilters(prev => ({
        ...prev,
        sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        sortBy: column,
        sortOrder: 'desc'
      }));
    }
  };

  // Refresh data
  const refreshData = () => {
    setRefreshing(true);
    fetchMailData(currentPage, filters);
  };

  // Render sort icon
  const renderSortIcon = (column) => {
    if (filters.sortBy !== column) return <FaSort className="text-gray-400" />;
    return filters.sortOrder === 'asc' 
      ? <FaSortUp className="text-blue-500" /> 
      : <FaSortDown className="text-blue-500" />;
  };

  // Open modal with mail details
  const openMailDetails = (mail) => {
    setSelectedMail(mail);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-4 px-3 sm:px-4 lg:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-700 hover:text-gray-900 mb-4 transition-colors font-medium text-sm"
          >
            <FaArrowLeft className="mr-1.5" />
            Back to Dashboard
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-white/80 backdrop-blur-sm rounded shadow-sm border border-gray-200/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded">
                <FaEnvelope className="text-blue-600 text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  Mail Tracking Log
                </h1>
                <p className="text-gray-600 text-xs">View and manage all mail entries</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                <FaSync className={`text-xs ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <Link
                href="/user_dashboard/track_todays_mail"
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-sm"
              >
                <FaEnvelope className="text-xs" />
                Add New
              </Link>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/90 backdrop-blur-sm rounded shadow-lg p-4 border border-gray-200/50 mb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FaFilter className="text-blue-500" />
              Filters
            </h2>
            
            <div className="flex items-center gap-2">
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 px-2 py-1 border border-gray-300 rounded transition-colors"
              >
                <FaTimes className="text-xs" />
                Reset
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70"
              >
                {statusOptions.map(option => (
                  <option key={option} value={option} className="capitalize">
                    {option === 'all' ? 'All Status' : option}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Date Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                  className="w-full pl-3 pr-10 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70"
                />
                <FaCalendarAlt className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              </div>
            </div>
            
            {/* Raised By Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Raised By
              </label>
              <select
                value={filters.raisedBy}
                onChange={(e) => handleFilterChange('raisedBy', e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70"
              >
                {raisedByOptions.map(option => (
                  <option key={option} value={option} className="capitalize">
                    {option === 'all' ? 'All Sources' : option}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Assigned Team Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Assigned Team
              </label>
              <select
                value={filters.assignedTeam}
                onChange={(e) => handleFilterChange('assignedTeam', e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70"
              >
                {assignedTeamOptions.map(option => (
                  <option key={option} value={option} className="capitalize">
                    {option === 'all' ? 'All Teams' : option}
                  </option>
                ))}
              </select>
            </div>

            {/* Items Per Page Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Items Per Page
              </label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70"
              >
                {limitOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Search */}
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by subject or raised by..."
                className="w-full pl-10 pr-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white/90 backdrop-blur-sm rounded shadow-lg p-4 border border-gray-200/50 mb-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : mailData.length === 0 ? (
            <div className="text-center py-12">
              <FaEnvelope className="mx-auto text-gray-400 text-4xl mb-3" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">No mail entries found</h3>
              <p className="text-gray-500 text-sm">
                {Object.values(filters).some(f => f !== 'all' && f !== '') 
                  ? 'Try adjusting your filters to see more results.' 
                  : 'Get started by adding your first mail entry.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-16"
                        onClick={() => handleSort('serial')}
                      >
                        <div className="flex items-center gap-1">
                          #
                          {renderSortIcon('serial')}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-24"
                        onClick={() => handleSort('tracking_date')}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          {renderSortIcon('tracking_date')}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer min-w-[300px]"
                        onClick={() => handleSort('mail_subject')}
                      >
                        <div className="flex items-center gap-1">
                          Subject
                          {renderSortIcon('mail_subject')}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-32"
                        onClick={() => handleSort('raised_by')}
                      >
                        <div className="flex items-center gap-1">
                          Raised By
                          {renderSortIcon('raised_by')}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-28"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center gap-1">
                          Status
                          {renderSortIcon('status')}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                      >
                        Assigned Team
                      </th>
                      <th 
                        scope="col" 
                        className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-32"
                        onClick={() => handleSort('tracked_by')}
                      >
                        <div className="flex items-center gap-1">
                          Tracked By
                          {renderSortIcon('tracked_by')}
                        </div>
                      </th>
                      <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mailData.map((mail) => (
                      <tr key={mail.serial} className="hover:bg-gray-50 transition-colors">
                        <td className="px-2 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">#{mail.serial}</div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(mail.tracking_date)}</div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-md" title={mail.mail_subject}>
                            {mail.mail_subject}
                          </div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900 truncate max-w-xs">{mail.raised_by}</div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            mail.status === 'SOLVED' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {mail.status}
                          </span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            mail.assigned_team === 'SOC' 
                              ? 'bg-blue-100 text-blue-800' 
                              : mail.assigned_team === 'OPS'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {mail.assigned_team || 'N/A'}
                          </span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900 truncate max-w-xs">{mail.tracked_by}</div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-center">
                          <button
                            onClick={() => openMailDetails(mail)}
                            className="mx-auto flex items-center justify-center text-blue-600 hover:text-blue-900 p-1.5 rounded hover:bg-blue-50 transition-colors"
                            title="View Details"
                          >
                            <FaEye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 px-4 py-3 border-t border-gray-200 gap-4">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(currentPage - 1) * filters.limit + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * filters.limit, pagination.totalCount)}
                    </span>{' '}
                    of <span className="font-medium">{pagination.totalCount}</span> results
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Rows per page:</span>
                    <select
                      value={filters.limit}
                      onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                      className="px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      {limitOptions.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <nav className="flex items-center gap-2">
                    <button
                      onClick={() => fetchMailData(currentPage - 1, filters)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-3 py-2 rounded border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <FaChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => fetchMailData(pageNum, filters)}
                            className={`relative inline-flex items-center px-3 py-2 text-sm font-medium rounded ${
                              currentPage === pageNum
                                ? 'z-10 bg-blue-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      {pagination.totalPages > 5 && currentPage < pagination.totalPages - 2 && (
                        <span className="px-2 py-2 text-sm text-gray-500">...</span>
                      )}
                      
                      {pagination.totalPages > 5 && currentPage < pagination.totalPages - 2 && (
                        <button
                          onClick={() => fetchMailData(pagination.totalPages, filters)}
                          className="relative inline-flex items-center px-3 py-2 text-sm font-medium rounded bg-white border border-gray-300 text-gray-500 hover:bg-gray-50"
                        >
                          {pagination.totalPages}
                        </button>
                      )}
                    </div>
                    
                    <button
                      onClick={() => fetchMailData(currentPage + 1, filters)}
                      disabled={currentPage === pagination.totalPages}
                      className="relative inline-flex items-center px-3 py-2 rounded border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <FaChevronRight className="h-4 w-4" />
                    </button>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mail Details Modal */}
      <MailDetailsModal 
        mail={selectedMail} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}