// app/user_dashboard/activity_log/page.js
'use client';

import { useState, useEffect, Fragment } from 'react';
import { 
  FaHistory, FaSearch, FaFilter, FaSync, FaChevronDown, 
  FaCalendarAlt, FaUser, FaInfoCircle, FaSort, FaSortUp, FaSortDown,
  FaChevronRight, FaChevronLeft
} from 'react-icons/fa';
import { motion } from 'framer-motion';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    actionType: '',
    searchTerm: '',
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

  // Check mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch logs when filters, page, or pageSize change
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          ...filters,
          sortKey: sortConfig.key,
          sortDirection: sortConfig.direction
        }).toString();

        const response = await fetch(`/api/user_dashboard/activity_log?${params}`);
        const data = await response.json();

        if (data.success) {
          setLogs(data.logs);
          setTotalCount(data.totalCount);
          setStats(data.stats);
        } else {
          console.error('Failed to fetch activity logs:', data.message);
        }
      } catch (error) {
        console.error('Network error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [page, pageSize, filters, sortConfig]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      actionType: '',
      searchTerm: '',
      startDate: '',
      endDate: ''
    });
    setPage(1);
    setExpandedRows(new Set());
  };

  const refreshLogs = () => {
    setPage(1);
    setExpandedRows(new Set());
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="text-gray-400 ml-1 text-xs" />;
    return sortConfig.direction === 'asc' 
      ? <FaSortUp className="text-blue-600 ml-1" /> 
      : <FaSortDown className="text-blue-600 ml-1" />;
  };

  const sortedLogs = [...logs].sort((a, b) => {
    if (sortConfig.direction === 'asc') {
      return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
    } else {
      return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
    }
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  // Toggle row expansion
  const toggleRow = (serial) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serial)) {
        newSet.delete(serial);
      } else {
        newSet.add(serial);
      }
      return newSet;
    });
  };

  // Get action badge color
  const getActionColor = (action) => {
    const colors = {
      'LOGIN_SUCCESS': 'bg-green-100 text-green-800',
      'LOGIN_FAILED': 'bg-red-100 text-red-800',
      'LOGOUT': 'bg-blue-100 text-blue-800',
      'ADD_USER': 'bg-purple-100 text-purple-800',
      'EDIT_USER': 'bg-amber-100 text-amber-800',
      'DELETE_USER': 'bg-rose-100 text-rose-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  // Mobile log card component
  const LogCard = ({ log }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded shadow-sm p-4 mb-4 border border-gray-200"
    >
      <div className="flex flex-col space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
              {log.action}
            </span>
            <span className="mt-1 text-xs text-gray-500">
              {log.createdAt}
            </span>
          </div>
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
            Monitor and track all user activities
          </motion.p>
        </div>

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
            <div className="text-xl font-bold text-green-600">
              {stats.loginSuccess}
            </div>
            <div className="text-sm text-gray-600">Successful Logins</div>
          </div>
          
          <div className="bg-white rounded shadow-md p-4 border border-purple-100">
            <div className="text-xl font-bold text-purple-600">
              {stats.userManagement}
            </div>
            <div className="text-sm text-gray-600">User Management</div>
          </div>
          
          <div className="bg-white rounded shadow-md p-4 border border-amber-100">
            <div className="text-xl font-bold text-amber-600">
              {stats.logout}
            </div>
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
            {/* Search by Keyword */}
            <div className="relative w-full md:flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by keyword"
                className="w-full pl-10 pr-4 py-2.5 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              />
            </div>
            
            {/* Mobile Filter Toggle */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center justify-between py-2.5 px-3 bg-gray-100 rounded text-gray-800 font-medium"
            >
              <div className="flex items-center">
                <FaFilter className="text-gray-600 mr-2" />
                <span>More Filters</span>
              </div>
              <FaChevronDown className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Desktop Filters - Always visible */}
            <div className="hidden md:flex items-center gap-3 flex-wrap">
              <div className="w-48">
                <select 
                  className="w-full rounded border border-gray-300 bg-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  value={filters.actionType}
                  onChange={(e) => handleFilterChange('actionType', e.target.value)}
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
                  />
                  <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetFilters}
                className="px-4 py-2.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Reset
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={refreshLogs}
                className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded p-2.5 transition-colors text-blue-700"
                disabled={loading}
              >
                <FaSync className={`${loading ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
          </div>
          
          {/* Mobile Filter Dropdown */}
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 space-y-3 w-full md:hidden"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                <select 
                  className="w-full rounded border border-gray-300 bg-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  value={filters.actionType}
                  onChange={(e) => handleFilterChange('actionType', e.target.value)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full rounded border border-gray-300 bg-white py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                    <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full rounded border border-gray-300 bg-white py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
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
                >
                  Reset
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={refreshLogs}
                  className="flex-1 px-4 py-2 flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded text-blue-700 transition-colors"
                  disabled={loading}
                >
                  <FaSync className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Log List */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {loading ? (
            [...Array(3)].map((_, index) => (
              <div key={index} className="bg-white rounded shadow-md p-4 mb-4 border border-gray-200 animate-pulse">
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
              // Mobile view - Cards
              sortedLogs.map((log) => (
                <LogCard key={log.serial} log={log} />
              ))
            ) : (
              // Desktop view - Table with expandable rows
              <div className="bg-white rounded shadow-lg overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                          onClick={() => handleSort('serial')}
                        >
                          <div className="flex items-center">
                            Serial
                            {getSortIcon('serial')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                          onClick={() => handleSort('action')}
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
    <Fragment key={log.serial}>
      <motion.tr 
        key={log.serial}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileHover={{ backgroundColor: '#f9fafb' }}
        className="transition-colors cursor-pointer"
        onClick={() => toggleRow(log.serial)}
      >
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{log.serial}</td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
            {log.action}
          </span>
        </td>
        <td className="px-6 py-4 text-sm text-gray-900 max-w-md">{log.description}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.createdAt}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{log.ipAddress}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <FaChevronDown
            className={`transition-transform ${
              expandedRows.has(log.serial) ? 'rotate-180 text-blue-500' : 'text-gray-400'
            }`}
          />
        </td>
      </motion.tr>
      
      {expandedRows.has(log.serial) && (
        <tr key={`${log.serial}-expanded`}>
          <td colSpan="6" className="p-0">
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
    </Fragment>
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
              <p className="mt-1 text-gray-500 text-sm">
                Try adjusting your filters or check back later
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={resetFilters}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
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
                  onChange={(e) => setPageSize(Number(e.target.value))}
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
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className={`px-3 py-1.5 rounded ${
                      page === 1 
                        ? 'bg-gray-100 text-gray-400' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
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
                    onClick={() => setPage(prev => prev + 1)}
                    disabled={page >= totalPages}
                    className={`px-3 py-1.5 rounded ${
                      page >= totalPages
                        ? 'bg-gray-100 text-gray-400' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
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