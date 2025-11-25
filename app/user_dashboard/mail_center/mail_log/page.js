// app/user_dashboard/mail_center/mail_log/page.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaEnvelope, FaSearch, FaFilter, FaArrowLeft, 
  FaEye, FaSort, FaSortUp, FaSortDown,
  FaCalendarAlt, FaSync, FaChevronLeft, FaChevronRight,
  FaTimes, FaClock, FaUser, FaTag,
  FaCheckCircle, FaSpinner, FaHistory,
  FaChartLine, FaList, FaDatabase, FaRocket
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import MediumSpinner from '../../../../app/components/MediumSpinner';

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
    timeZone: 'Asia/Dhaka'
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
    timeZone: 'Asia/Dhaka'
  });
};

// Modern Modal component for showing mail details
const MailDetailsModal = ({ mail, isOpen, onClose }) => {
  if (!isOpen || !mail) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/30"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded">
          <div>
            <h2 className="text-xl font-bold">Mail Details</h2>
            <p className="text-blue-100 text-sm mt-1">Complete information for mail entry</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/20"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          {/* Mail Subject */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 rounded p-4 mb-6">
            <div className="flex items-start">
              <div className="bg-white/80 p-2.5 rounded shadow-sm mr-3 border border-blue-200/30">
                <FaEnvelope className="text-blue-600 text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-1">Mail Subject</h3>
                <p className="font-medium text-gray-800 text-base leading-relaxed">{mail.mail_subject || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="bg-white/80 backdrop-blur-sm rounded p-4 border border-gray-200/50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <FaCalendarAlt className="text-blue-500 mr-2" />
                  Timeline
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tracking Date</p>
                    <p className="text-sm font-medium text-gray-800">{formatDate(mail.tracking_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Task Raised Date</p>
                    <p className="text-sm font-medium text-gray-800">{formatDate(mail.task_raised_date)}</p>
                  </div>
                  {mail.task_solve_date && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Task Solve Date</p>
                      <p className="text-sm font-medium text-gray-800">{formatDate(mail.task_solve_date)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded p-4 border border-gray-200/50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <FaHistory className="text-purple-500 mr-2" />
                  Activity
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Created At</p>
                    <p className="text-sm font-medium text-gray-800">{formatDateTime(mail.created_at)}</p>
                  </div>
                  {mail.updated_at && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                      <p className="text-sm font-medium text-gray-800">{formatDateTime(mail.updated_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status Information */}
            <div className="space-y-4">
              <div className="bg-white/80 backdrop-blur-sm rounded p-4 border border-gray-200/50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  Status & Team
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span className={`inline-flex px-3 py-1 rounded text-xs font-semibold ${
                      mail.status === 'SOLVED' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {mail.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Solved Within Day</p>
                    <p className="text-sm font-medium text-gray-800">{mail.solved_within_day || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Assigned Team</p>
                    <span className={`inline-flex px-3 py-1 rounded text-xs font-semibold ${
                      mail.assigned_team === 'SOC' 
                        ? 'bg-blue-100 text-blue-800' 
                        : mail.assigned_team === 'OPS'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {mail.assigned_team || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded p-4 border border-gray-200/50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <FaUser className="text-blue-500 mr-2" />
                  People
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Raised By</p>
                    <p className="text-sm font-medium text-gray-800">{mail.raised_by || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tracked By</p>
                    <p className="text-sm font-medium text-gray-800">{mail.tracked_by || 'N/A'}</p>
                  </div>
                  {mail.solved_by && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Solved By</p>
                      <p className="text-sm font-medium text-gray-800">{mail.solved_by}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Feedback */}
          {mail.feedback && (
            <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 rounded p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <FaCheckCircle className="text-amber-500 mr-2" />
                Solution Feedback
              </h3>
              <p className="text-sm text-gray-800 leading-relaxed bg-white/50 p-3 rounded border border-amber-200/30">
                {mail.feedback}
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200/50 bg-gray-50/50 rounded">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-all duration-200 font-semibold text-sm"
          >
            Close
          </button>
        </div>
      </motion.div>
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
    limit: 20
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    solved: 0,
    inProgress: 0
  });

  const statusOptions = ['all', 'SOLVED', 'IN-PROGRESS'];
  const raisedByOptions = [
    'all', 'SALES', 'CS/CDIM', 'COMPLIANCE', 'LEA', 'SERVICE DELIVERY', 
    'FININCE', 'HRM', 'RECONCILIATION', 'SCM', 'REVENUE ASSURANCE',
    'MARKETING', 'TECHNOLOGY', 'COMMERCIAL', 'EXTERNAL', 'GOVT', 'OTHER'
  ];
  const assignedTeamOptions = ['all', 'SOC', 'OPS'];
  const limitOptions = [20, 50, 100];

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

      const response = await fetch(`/api/user_dashboard/mail_center/mail_log?${params}`);
      const result = await response.json();

      if (result.success) {
        setMailData(result.data);
        setPagination(result.pagination);
        setCurrentPage(page);
        
        // Calculate stats
        const solved = result.data.filter(mail => mail.status === 'SOLVED').length;
        const inProgress = result.data.filter(mail => mail.status === 'IN-PROGRESS').length;
        setStats({
          total: result.data.length,
          solved,
          inProgress
        });
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

  // Handle filter changes
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
    if (filters.sortBy !== column) return <FaSort className="text-gray-400 text-xs" />;
    return filters.sortOrder === 'asc' 
      ? <FaSortUp className="text-blue-500 text-xs" /> 
      : <FaSortDown className="text-blue-500 text-xs" />;
  };

  // Open modal with mail details
  const openMailDetails = (mail) => {
    setSelectedMail(mail);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 mb-4">
      {/* Enhanced Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-200/20 rounded-full blur-3xl animate-float delay-2000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto p-4">
        {/* Modern Header */}
        <motion.div 
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  className="relative mb-8"
>
  <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded border border-white/30 shadow-2xl shadow-blue-500/10 overflow-hidden">
    {/* Background Pattern */}
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 rounded-full translate-y-12 -translate-x-12"></div>
    </div>
    
    <div className="relative p-4 md:p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left Section - Navigation and Title */}
        <div className="flex items-start gap-4 flex-1 min-w-0">

          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded shadow-lg flex items-center justify-center">
                <FaDatabase className="text-white text-lg" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Mail Log
              </h1>
            </div>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-2xl">
              Complete history of all mail entries with advanced filtering and search
            </p>
          </div>
        </div>

        {/* Right Section - Stats and Actions */}
        <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
          {/* Stats - Fixed width */}
          <div className="w-full lg:w-64 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded p-2 shadow-lg border border-white/40">
            <div className="flex items-center gap-3 w-full justify-between">
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-green-600">{stats.solved}</div>
                <div className="text-xs text-gray-500">Solved</div>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
                <div className="text-xs text-gray-500">Progress</div>
              </div>
            </div>
          </div>

          {/* Action Buttons - Same width as stats */}
          <div className="w-full lg:w-64 flex items-center gap-2 justify-end">
            <button
              onClick={refreshData}
              className="flex items-center gap-2 px-1 py-2 bg-white/90 backdrop-blur-sm rounded shadow-lg border border-white/40 hover:shadow-xl hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 text-xs font-semibold text-gray-700 hover:text-blue-700 flex-1 justify-center"
              title="Refresh data"
            >
              <FaSync className={`text-xs ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => router.push('/user_dashboard/mail_center/track_todays_mail')}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 text-xs font-semibold flex-1 justify-center"
            >
              <FaEnvelope className="text-xs" />
              Track New Mail
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</motion.div>

        {/* Filters Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm rounded shadow-sm border border-white/40 p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FaFilter className="text-blue-500 text-sm" />
              Filters & Search
            </h2>
            
            <div className="flex items-center gap-2">
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-all duration-200"
              >
                <FaTimes className="text-xs" />
                Reset Filters
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 transition-all duration-200"
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
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 transition-all duration-200"
                />
                <FaCalendarAlt className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              </div>
            </div>
            
            {/* Raised By Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Raised By
              </label>
              <select
                value={filters.raisedBy}
                onChange={(e) => handleFilterChange('raisedBy', e.target.value)}
                className="w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 transition-all duration-200"
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
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Team
              </label>
              <select
                value={filters.assignedTeam}
                onChange={(e) => handleFilterChange('assignedTeam', e.target.value)}
                className="w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 transition-all duration-200"
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
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Items Per Page
              </label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                className="w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 transition-all duration-200"
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
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by subject, raised by, or tracked by..."
                className="w-full pl-10 pr-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 transition-all duration-200"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            </div>
          </div>
        </motion.div>

        {/* Data Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded shadow-sm border border-white/40 p-6"
        >
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-center">
                <MediumSpinner />
                <p className="text-gray-600 text-sm mt-4">Loading Mail Log...</p>
              </div>
            </div>
          ) : mailData.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-4">
                <FaEnvelope className="text-gray-400 text-3xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No mail entries found</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                {Object.values(filters).some(f => f !== 'all' && f !== '') 
                  ? 'Try adjusting your filters to see more results.' 
                  : 'Get started by tracking your first mail entry.'}
              </p>
              <button
                onClick={() => router.push('/user_dashboard/mail_center/track_todays_mail')}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2.5 rounded font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <FaEnvelope className="text-xs" />
                Track New Mail
              </button>
            </motion.div>
          ) : (
            <>
              <div className="overflow-x-auto rounded border border-gray-200/50">
                <table className="min-w-full divide-y divide-gray-200/50">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('serial')}
                      >
                        <div className="flex items-center gap-1">
                          #
                          {renderSortIcon('serial')}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('tracking_date')}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          {renderSortIcon('tracking_date')}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer min-w-[300px]"
                        onClick={() => handleSort('mail_subject')}
                      >
                        <div className="flex items-center gap-1">
                          Subject
                          {renderSortIcon('mail_subject')}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('raised_by')}
                      >
                        <div className="flex items-center gap-1">
                          Raised By
                          {renderSortIcon('raised_by')}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center gap-1">
                          Status
                          {renderSortIcon('status')}
                        </div>
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Team
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200/30">
                    <AnimatePresence>
                      {mailData.map((mail, index) => (
                        <motion.tr
                          key={mail.serial}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">#{mail.serial}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(mail.tracking_date)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900 line-clamp-2 max-w-md" title={mail.mail_subject}>
                              {mail.mail_subject}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{mail.raised_by}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 rounded text-xs font-semibold ${
                              mail.status === 'SOLVED' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {mail.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 rounded text-xs font-semibold ${
                              mail.assigned_team === 'SOC' 
                                ? 'bg-blue-100 text-blue-800' 
                                : mail.assigned_team === 'OPS'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {mail.assigned_team || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => openMailDetails(mail)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-all duration-200 text-xs font-semibold"
                            >
                              <FaEye className="text-xs" />
                              View
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 px-4 py-4 border-t border-gray-200/50 gap-4">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-semibold">{(currentPage - 1) * filters.limit + 1}</span> to{' '}
                    <span className="font-semibold">
                      {Math.min(currentPage * filters.limit, pagination.totalCount)}
                    </span>{' '}
                    of <span className="font-semibold">{pagination.totalCount}</span> results
                  </div>
                  
                  <nav className="flex items-center gap-2">
                    <button
                      onClick={() => fetchMailData(currentPage - 1, filters)}
                      disabled={currentPage === 1}
                      className="inline-flex items-center px-3 py-2 rounded border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
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
                            className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded transition-all duration-200 ${
                              currentPage === pageNum
                                ? 'bg-blue-500 text-white shadow-sm'
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
                          className="inline-flex items-center px-3 py-2 text-sm font-medium rounded bg-white border border-gray-300 text-gray-500 hover:bg-gray-50 transition-all duration-200"
                        >
                          {pagination.totalPages}
                        </button>
                      )}
                    </div>
                    
                    <button
                      onClick={() => fetchMailData(currentPage + 1, filters)}
                      disabled={currentPage === pagination.totalPages}
                      className="inline-flex items-center px-3 py-2 rounded border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
                    >
                      <FaChevronRight className="h-4 w-4" />
                    </button>
                  </nav>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Mail Details Modal */}
      <MailDetailsModal 
        mail={selectedMail} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      {/* Add CSS for floating animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}