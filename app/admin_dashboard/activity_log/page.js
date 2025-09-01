// app/admin_dashboard/activity_log/page.js
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  FaHistory, FaSearch, FaFilter, FaSync, FaChevronDown, 
  FaCalendarAlt, FaUser, FaInfoCircle, FaSort, FaSortUp, FaSortDown,
  FaChevronRight, FaChevronLeft
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';

// Utility to format timestamps in Asia/Dhaka timezone
const formatDateTime = (dateString) => {
  try {
    const date = new Date(dateString);
    const formatted = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Dhaka'
    }).format(date);
    console.debug('Formatted date:', { dateString, formatted });
    return formatted;
  } catch (error) {
    console.error('Error formatting date:', { dateString, error });
    return new Date(dateString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }); // Fallback to browser timezone
  }
};

// Component to handle log content
function ActivityLogContent() {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    actionType: '',
    adminId: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: 'serial',
    direction: 'desc'
  });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [stats, setStats] = useState({
    loginSuccess: 0,
    userManagement: 0,
    logout: 0
  });

  // Check for session expiration on mount
  useEffect(() => {
    const sessionExpired = searchParams.get('sessionExpired');
    if (sessionExpired) {
      toast.error('Session expired! Please login again', {
        duration: 5000,
        position: 'top-right'
      });
    }
  }, [searchParams]);

  // Check mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      console.debug('Checked mobile status:', window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Debounced fetchLogs to prevent excessive API calls
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.debug('Fetching logs:', { page, pageSize, filters, sortConfig });

      // Construct query string manually to avoid useSearchParams
      const queryParams = [
        `page=${encodeURIComponent(page)}`,
        `pageSize=${encodeURIComponent(pageSize)}`,
        filters.actionType ? `actionType=${encodeURIComponent(filters.actionType)}` : '',
        filters.adminId ? `adminId=${encodeURIComponent(filters.adminId)}` : '',
        filters.startDate ? `startDate=${encodeURIComponent(filters.startDate)}` : '',
        filters.endDate ? `endDate=${encodeURIComponent(filters.endDate)}` : '',
        `sortKey=${encodeURIComponent(sortConfig.key)}`,
        `sortDirection=${encodeURIComponent(sortConfig.direction)}`
      ].filter(Boolean).join('&');

      const response = await fetch(`/api/admin_dashboard/activity_log?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs);
        setTotalCount(data.totalCount);
        setStats(data.stats);
        console.debug('Logs fetched successfully:', { logs: data.logs, totalCount: data.totalCount, stats: data.stats });
      } else {
        setError(data.message || 'Failed to fetch activity logs');
        toast.error(data.message || 'Failed to fetch activity logs', {
          duration: 4000,
          position: 'top-right'
        });
        console.debug('Fetch logs failed:', data.message);
      }
    } catch (error) {
      setError('Network error occurred. Please try again.');
      toast.error('Network error occurred. Please try again.', {
        duration: 4000,
        position: 'top-right'
      });
      console.error('Network error in fetchLogs:', error);
      setLoading(false);
    } finally {
      setLoading(false);
      console.debug('Fetch logs completed, loading set to false');
    }
  }, [page, pageSize, filters, sortConfig]);

  // Fetch logs with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    console.debug('Scheduled fetchLogs with debounce');
    return () => {
      clearTimeout(timer);
      console.debug('Cleared fetchLogs debounce timer');
    };
  }, [fetchLogs]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setPage(1);
    console.debug('Filter changed:', { filterType, value });
  };

  const resetFilters = () => {
    setFilters({
      actionType: '',
      adminId: '',
      startDate: '',
      endDate: ''
    });
    setPage(1);
    setExpandedRows(new Set());
    toast.success('Filters reset successfully', {
      duration: 4000,
      position: 'top-right'
    });
    console.debug('Filters reset');
  };

  const refreshLogs = () => {
    setPage(1);
    setExpandedRows(new Set());
    fetchLogs();
    toast.success('Logs refreshed', {
      duration: 4000,
      position: 'top-right'
    });
    console.debug('Refreshed logs');
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
    console.debug('Sort changed:', { key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="text-gray-400 ml-1 text-xs" />;
    return sortConfig.direction === 'asc' 
      ? <FaSortUp className="text-blue-600 ml-1" /> 
      : <FaSortDown className="text-blue-600 ml-1" />;
  };

  // Non-mutating sort
  const sortedLogs = [...logs].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (sortConfig.direction === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    }
    return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const toggleRow = (serial) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serial)) {
        newSet.delete(serial);
      } else {
        newSet.add(serial);
      }
      console.debug('Toggled row:', { serial, expanded: newSet.has(serial) });
      return newSet;
    });
  };

  const getActionColor = (action) => {
    const colors = {
      'LOGIN_SUCCESS': 'bg-green-100 text-green-800 border border-green-300',
      'LOGIN_FAILED': 'bg-red-100 text-red-800 border border-red-300',
      'LOGOUT': 'bg-blue-100 text-blue-800 border border-blue-300',
      'ADD_USER': 'bg-purple-100 text-purple-800 border border-purple-300',
      'EDIT_USER': 'bg-amber-100 text-amber-800 border border-amber-300',
      'DELETE_USER': 'bg-rose-100 text-rose-800 border border-rose-300'
    };
    return colors[action] || 'bg-gray-100 text-gray-800 border border-gray-400';
  };

  const LogCard = ({ log }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded shadow-sm p-4 mb-4 border border-gray-200"
    >
      <div className="flex flex-col space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <div className={`px-2 py-1 text-xs font-medium text-center ${getActionColor(log.action)}`}>
              {log.action}
            </div>
            <span className="mt-1 text-xs text-gray-500">
              {formatDateTime(log.createdAt)}
            </span>
          </div>
          <span className="text-xs font-medium text-gray-700">
            {log.socPortalId}
          </span>
        </div>
        <div className="text-sm text-gray-700">
          {log.description}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <div className="flex items-center bg-gray-50 px-2 py-1 rounded">
            <FaInfoCircle className="mr-1" />
            <span>Serial: {log.serial}</span>
          </div>
          <div className="flex items-center bg-gray-50 px-2 py-1 rounded">
            <FaUser className="mr-1" />
            <span>EID: {log.eid}</span>
          </div>
        </div>
        <div className="text-xs bg-blue-50 p-2 rounded break-words">
          <div className="font-medium text-gray-700">IP: {log.ipAddress}</div>
          <div className="text-gray-600 mt-1">
            {log.deviceInfo}
          </div>
        </div>
        <div className="text-xs text-gray-500 flex">
          <FaInfoCircle className="mr-1 mt-0.5 flex-shrink-0" />
          <span className="break-all">SID: {log.sid}</span>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-6 px-3 sm:px-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-2"
          >
            Activity Log
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 text-sm sm:text-base"
          >
            Monitor and track all administrative activities
          </motion.p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-red-100 text-red-800 rounded border border-red-300"
          >
            {error}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchLogs}
              className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </motion.button>
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          <div className="bg-white rounded shadow-md p-4 border border-blue-100">
            <div className="text-xl font-bold text-blue-600">{totalCount}</div>
            <div className="text-sm text-gray-600">Total Activities</div>
          </div>
          <div className="bg-white rounded shadow-md p-4 border border-green-100">
            <div className="text-xl font-bold text-green-600">{stats.loginSuccess}</div>
            <div className="text-sm text-gray-600">Successful Logins</div>
          </div>
          <div className="bg-white rounded shadow-md p-4 border border-purple-100">
            <div className="text-xl font-bold text-purple-600">{stats.userManagement}</div>
            <div className="text-sm text-gray-600">User Management</div>
          </div>
          <div className="bg-white rounded shadow-md p-4 border border-amber-100">
            <div className="text-xl font-bold text-amber-600">{stats.logout}</div>
            <div className="text-sm text-gray-600">Logout Activities</div>
          </div>
        </motion.div>

        {/* Filter Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded shadow-lg p-4 sm:p-5 mb-6 border border-gray-200"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative w-full md:flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUser className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by Admin ID"
                className="w-full pl-10 pr-4 py-2.5 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                value={filters.adminId}
                onChange={(e) => handleFilterChange('adminId', e.target.value)}
                aria-label="Search by Admin ID"
              />
            </div>
            <button 
              onClick={() => {
                setShowFilters(!showFilters);
                console.debug('Toggled filters visibility:', !showFilters);
              }}
              className="md:hidden flex items-center justify-between py-2.5 px-3 bg-gray-100 rounded text-gray-800 font-medium"
              aria-expanded={showFilters}
              aria-label="Toggle filters"
            >
              <div className="flex items-center">
                <FaFilter className="text-gray-600 mr-2" />
                <span>More Filters</span>
              </div>
              <FaChevronDown className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <div className="hidden md:flex items-center gap-3 flex-wrap">
              <div className="w-48">
                <select 
                  className="w-full rounded border border-gray-300 bg-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  value={filters.actionType}
                  onChange={(e) => handleFilterChange('actionType', e.target.value)}
                  aria-label="Filter by action type"
                >
                  <option value="">All Actions</option>
                  <option value="LOGIN_SUCCESS">Login Success</option>
                  <option value="LOGIN_FAILED">Login Failed</option>
                  <option value="LOGOUT">Logout</option>
                  <option value="ADD_USER">Add User</option>
                  <option value="EDIT_USER">Edit User</option>
                  <option value="DELETE_USER">Delete User</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="date"
                    className="w-full rounded border border-gray-300 bg-white py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    aria-label="Filter by start date"
                  />
                  <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
                </div>
                <span className="text-gray-500">to</span>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full rounded border border-gray-300 bg-white py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    aria-label="Filter by end date"
                  />
                  <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetFilters}
                  className="px-4 py-2.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                  aria-label="Reset filters"
                >
                  Reset
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={refreshLogs}
                  className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded p-2.5 transition-colors text-blue-700"
                  disabled={loading}
                  aria-label="Refresh logs"
                >
                  <FaSync className={`${loading ? 'animate-spin' : ''}`} />
                </motion.button>
              </div>
            </div>
          </div>
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-3 space-y-3 w-full md:hidden"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="actionType">Action Type</label>
                  <select 
                    id="actionType"
                    className="w-full rounded border border-gray-300 bg-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                    value={filters.actionType}
                    onChange={(e) => handleFilterChange('actionType', e.target.value)}
                    aria-label="Filter by action type"
                  >
                    <option value="">All Actions</option>
                    <option value="LOGIN_SUCCESS">Login Success</option>
                    <option value="LOGIN_FAILED">Login Failed</option>
                    <option value="LOGOUT">Logout</option>
                    <option value="ADD_USER">Add User</option>
                    <option value="EDIT_USER">Edit User</option>
                    <option value="DELETE_USER">Delete User</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="startDate">Start Date</label>
                    <div className="relative">
                      <input
                        id="startDate"
                        type="date"
                        className="w-full rounded border border-gray-300 bg-white py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        aria-label="Filter by start date"
                      />
                      <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="endDate">End Date</label>
                    <div className="relative">
                      <input
                        id="endDate"
                        type="date"
                        className="w-full rounded border border-gray-300 bg-white py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        aria-label="Filter by end date"
                      />
                      <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={resetFilters}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                    aria-label="Reset filters"
                  >
                    Reset
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={refreshLogs}
                    className="flex-1 px-4 py-2 flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded text-blue-700 transition-colors"
                    disabled={loading}
                    aria-label="Refresh logs"
                  >
                    <FaSync className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Log List */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {loading ? (
            [...Array(3)].map((_, index) => (
              <div key={`skeleton-${index}`} className="bg-white rounded shadow-md p-4 mb-4 border border-gray-200 animate-pulse">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="flex space-x-2">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : sortedLogs.length > 0 ? (
            isMobile ? (
              sortedLogs.map((log) => (
                <LogCard key={log.serial} log={log} />
              ))
            ) : (
              <div className="bg-white rounded shadow-lg overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                          onClick={() => handleSort('serial')}
                          aria-sort={sortConfig.key === 'serial' ? sortConfig.direction : 'none'}
                        >
                          <div className="flex items-center">
                            Serial
                            {getSortIcon('serial')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                          onClick={() => handleSort('socPortalId')}
                          aria-sort={sortConfig.key === 'socPortalId' ? sortConfig.direction : 'none'}
                        >
                          <div className="flex items-center">
                            <span className="whitespace-nowrap">Admin ID</span>
                            {getSortIcon('socPortalId')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                          onClick={() => handleSort('action')}
                          aria-sort={sortConfig.key === 'action' ? sortConfig.direction : 'none'}
                        >
                          <div className="flex items-center">
                            Action
                            {getSortIcon('action')}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Description
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                          onClick={() => handleSort('createdAt')}
                          aria-sort={sortConfig.key === 'createdAt' ? sortConfig.direction : 'none'}
                        >
                          <div className="flex items-center">
                            Timestamp
                            {getSortIcon('createdAt')}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          IP Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedLogs.map((log) => (
                        <>
                          <motion.tr 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            whileHover={{ backgroundColor: '#f9fafb' }}
                            className="transition-colors cursor-pointer"
                            onClick={() => toggleRow(log.serial)}
                            key={log.serial}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{log.serial}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{log.socPortalId}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-center font-medium ${getActionColor(log.action)}`}>
                              {log.action}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-md">{log.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(log.createdAt)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{log.ipAddress}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <FaChevronDown
                                className={`transition-transform ${
                                  expandedRows.has(log.serial) ? 'rotate-180 text-blue-500' : 'text-gray-400'
                                }`}
                                aria-label={expandedRows.has(log.serial) ? 'Collapse details' : 'Expand details'}
                              />
                            </td>
                          </motion.tr>
                          {expandedRows.has(log.serial) && (
                            <tr>
                              <td colSpan="7" className="p-0">
                                <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
                                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-700">
                                    <div className="flex items-center gap-1">
                                      <span className="font-medium text-gray-500">EID:</span>
                                      <span>{log.eid}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="font-medium text-gray-500">SID:</span>
                                      <span>{log.sid}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="font-medium text-gray-500">Device:</span>
                                      <span>{log.deviceInfo}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            <div className="bg-white rounded p-5 text-center shadow-sm border border-gray-200">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded bg-blue-50 mb-3">
                <FaHistory className="text-blue-500 text-2xl" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No activity logs found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your filters or check back later
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={resetFilters}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                aria-label="Reset all filters"
              >
                Reset All Filters
              </motion.button>
            </div>
          )}

          {/* Pagination */}
          {!loading && sortedLogs.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between bg-white rounded shadow-md p-4 border border-gray-200">
              <div className="text-sm text-gray-700 mb-3 sm:mb-0">
                Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{' '}
                <span className="font-medium">{(page - 1) * pageSize + sortedLogs.length}</span> of{' '}
                <span className="font-medium">{totalCount}</span> activities
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-700 mr-2 hidden sm:block">Show:</div>
                <select 
                  className="rounded border border-gray-300 bg-white py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    console.debug('Changed page size:', Number(e.target.value));
                  }}
                  aria-label="Select page size"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
                <div className="flex space-x-1">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setPage(prev => Math.max(prev - 1, 1));
                      console.debug('Navigated to previous page');
                    }}
                    disabled={page === 1}
                    className={`px-3 py-1.5 rounded ${
                      page === 1 
                        ? 'bg-gray-100 text-gray-400' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-label="Previous page"
                  >
                    <FaChevronLeft className="sm:hidden" />
                    <span className="hidden sm:inline">Previous</span>
                  </motion.button>
                  <div className="flex items-center bg-blue-50 px-3 py-1.5 rounded text-blue-700 text-sm">
                    {page} of {totalPages}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setPage(prev => prev + 1);
                      console.debug('Navigated to next page');
                    }}
                    disabled={page >= totalPages}
                    className={`px-3 py-1.5 rounded ${
                      page >= totalPages
                        ? 'bg-gray-100 text-gray-400' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-label="Next page"
                  >
                    <FaChevronRight className="sm:hidden" />
                    <span className="hidden sm:inline">Next</span>
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function ActivityLogPage() {
  return (
    <Suspense fallback={
      <div className="text-center">
        <div className="animate-pulse bg-gray-200 h-8 w-48 mx-auto mb-4"></div>
        <div className="animate-pulse bg-gray-200 h-4 w-64 mx-auto"></div>
      </div>
    }>
      <ActivityLogContent />
    </Suspense>
  );
}