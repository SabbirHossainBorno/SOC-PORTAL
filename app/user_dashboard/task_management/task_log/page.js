// app/user_dashboard/task_management/task_log/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaTasks, FaSearch, FaFilter, FaCalendarAlt, FaUser,
  FaCheckCircle, FaClock, FaExclamationTriangle, FaSpinner,
  FaLayerGroup, FaUserCheck, FaIdCard, FaChartBar, FaSort,
  FaSortUp, FaSortDown, FaStar, FaRegStar, FaUsers,
  FaEye, FaEyeSlash, FaDownload, FaSync, FaHistory, FaUserTag
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import MediumSpinner from '../../../components/MediumSpinner';

export default function TaskLogPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterImportant, setFilterImportant] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterSolvedBy, setFilterSolvedBy] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'assign_task_id', direction: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Helper function to capitalize names
  const capitalizeName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Fetch task log
  const fetchTaskLog = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user_dashboard/task_management/task_log');
      const result = await response.json();

      if (response.ok && result.success) {
        setTasks(result.data);
        setCurrentUser({
          shortName: result.userShortName,
          roleType: result.userRole,
          isSOC: result.userRole === 'SOC'
        });
      } else {
        throw new Error(result.message || 'Failed to fetch task log');
      }
    } catch (error) {
      console.error('Error fetching task log:', error);
      toast.error('Failed to load task log: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskLog();
  }, []);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format short date for table
  const formatShortDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      'IN-PROGRESS': {
        color: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
        icon: FaClock,
        text: 'In Progress'
      },
      'COMPLETED': {
        color: 'bg-green-100 text-green-800 border border-green-300',
        icon: FaCheckCircle,
        text: 'Completed'
      }
    };

    const config = statusConfig[status] || statusConfig['IN-PROGRESS'];
    const IconComponent = config.icon;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${config.color}`}>
        <IconComponent className="text-xs" />
        <span>{config.text}</span>
      </span>
    );
  };

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Get unique assignees for filter with proper capitalization
  const uniqueAssignees = [...new Set(tasks.flatMap(task => 
    task.assigned_to.split(',').map(name => capitalizeName(name.trim()))
  ))].sort();

  // Get unique solved by names based on user role
  const getUniqueSolvedBy = () => {
    const allSolvedBy = tasks
      .map(task => task.solved_by)
      .filter(Boolean) // Remove null/empty values
      .map(name => capitalizeName(name.trim()));

    const uniqueNames = [...new Set(allSolvedBy)].sort();

    if (currentUser?.isSOC) {
      // SOC members see all names
      return uniqueNames;
    } else {
      // INTERN members only see intern names (filter logic can be adjusted based on your naming convention)
      // For now, we'll return all names that are not empty, but you can add specific logic here
      return uniqueNames;
    }
  };

  const uniqueSolvedBy = getUniqueSolvedBy();

  // Sort tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortConfig.key === 'assign_task_id') {
      return sortConfig.direction === 'asc' 
        ? a.assign_task_id.localeCompare(b.assign_task_id)
        : b.assign_task_id.localeCompare(a.assign_task_id);
    }
    
    if (sortConfig.key === 'created_at') {
      return sortConfig.direction === 'asc' 
        ? new Date(a.created_at) - new Date(b.created_at)
        : new Date(b.created_at) - new Date(a.created_at);
    }
    
    if (sortConfig.key === 'task_title') {
      return sortConfig.direction === 'asc'
        ? a.task_title.localeCompare(b.task_title)
        : b.task_title.localeCompare(a.task_title);
    }

    if (sortConfig.key === 'is_important') {
      return sortConfig.direction === 'asc'
        ? (a.is_important === b.is_important ? 0 : a.is_important ? -1 : 1)
        : (a.is_important === b.is_important ? 0 : a.is_important ? 1 : -1);
    }

    if (sortConfig.key === 'status') {
      return sortConfig.direction === 'asc'
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    }

    if (sortConfig.key === 'solved_by') {
      const aSolvedBy = a.solved_by || '';
      const bSolvedBy = b.solved_by || '';
      return sortConfig.direction === 'asc'
        ? aSolvedBy.localeCompare(bSolvedBy)
        : bSolvedBy.localeCompare(aSolvedBy);
    }

    return 0;
  });

  // Filter tasks
  const filteredTasks = sortedTasks.filter(task => {
    // Search filter
    const matchesSearch = task.task_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.task_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.assigned_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.assigned_to.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.solved_by?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    
    // Importance filter
    const matchesImportant = filterImportant === 'all' || 
                            (filterImportant === 'important' && task.is_important) ||
                            (filterImportant === 'normal' && !task.is_important);
    
    // Assignee filter
    const matchesAssignee = filterAssignee === 'all' || 
                           task.assigned_to.toLowerCase().includes(filterAssignee.toLowerCase());
    
    // Solved By filter
    const matchesSolvedBy = filterSolvedBy === 'all' || 
                           (filterSolvedBy === 'unsolved' && !task.solved_by) ||
                           (task.solved_by && task.solved_by.toLowerCase().includes(filterSolvedBy.toLowerCase()));
    
    // Date range filter
    const taskDate = new Date(task.created_at);
    const matchesDateRange = (!dateRange.start || taskDate >= new Date(dateRange.start)) &&
                            (!dateRange.end || taskDate <= new Date(dateRange.end + 'T23:59:59'));
    
    return matchesSearch && matchesStatus && matchesImportant && matchesAssignee && matchesSolvedBy && matchesDateRange;
  });

  // Calculate stats
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter(task => task.status === 'IN-PROGRESS').length;
  const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
  const importantTasks = tasks.filter(task => task.is_important).length;
  const solvedTasks = tasks.filter(task => task.solved_by).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Task ID', 'Title', 'Type', 'Assigned By', 'Assigned To', 'Status', 'Important', 'Created At', 'Solved By', 'Solved Date', 'Remark'];
    const csvData = filteredTasks.map(task => [
      task.assign_task_id,
      task.task_title,
      task.task_type || '',
      task.assigned_by,
      task.assigned_to,
      task.status,
      task.is_important ? 'Yes' : 'No',
      task.created_at,
      task.solved_by || '',
      task.solved_date || '',
      task.remark || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Task log exported successfully');
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterImportant('all');
    setFilterAssignee('all');
    setFilterSolvedBy('all');
    setDateRange({ start: '', end: '' });
    toast.success('Filters reset');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <MediumSpinner />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Task Log</h3>
          <p className="text-gray-600">Preparing comprehensive task history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Enhanced Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded shadow-lg p-6 mb-6 border border-gray-200 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/10 to-cyan-500/10 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
              <div className="flex items-center mb-4 lg:mb-0">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded mr-4 shadow-lg">
                    <FaHistory className="text-white text-lg" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Task Log</h1>
                    <p className="text-gray-600 text-sm">
                      {currentUser?.isSOC ? 'Complete task history' : 'Your assigned task history'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Current User Info */}
              {currentUser && (
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded p-3 border border-gray-200 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 flex items-center">
                        <FaIdCard className="mr-1" />
                        {currentUser.isSOC ? 'SOC Member' : 'Intern Member'}
                      </div>
                      <div className="font-semibold text-gray-900">{currentUser.shortName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-gray-700">Access Level</div>
                      <div className={`text-sm font-bold ${currentUser.isSOC ? 'text-purple-600' : 'text-green-600'}`}>
                        {currentUser.isSOC ? 'Full Access' : 'Limited Access'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded p-3 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaLayerGroup className="text-blue-200 text-sm" />
                    <div className="text-xs font-medium text-blue-100">Total Tasks</div>
                  </div>
                  <div className="text-lg font-bold">{totalTasks}</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-500 to-amber-500 rounded p-3 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaClock className="text-yellow-200 text-sm" />
                    <div className="text-xs font-medium text-yellow-100">In Progress</div>
                  </div>
                  <div className="text-lg font-bold">{inProgressTasks}</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded p-3 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaCheckCircle className="text-green-200 text-sm" />
                    <div className="text-xs font-medium text-green-100">Completed</div>
                  </div>
                  <div className="text-lg font-bold">{completedTasks}</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded p-3 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaStar className="text-purple-200 text-sm" />
                    <div className="text-xs font-medium text-purple-100">Important</div>
                  </div>
                  <div className="text-lg font-bold">{importantTasks}</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded p-3 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaUserTag className="text-indigo-200 text-sm" />
                    <div className="text-xs font-medium text-indigo-100">Solved</div>
                  </div>
                  <div className="text-lg font-bold">{solvedTasks}</div>
                </div>
              </div>
            </div>

            {/* Completion Rate */}
            <div className="bg-white rounded p-3 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Overall Completion Rate</span>
                <span className="text-sm font-bold text-indigo-600">{completionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{completedTasks} completed</span>
                <span>{totalTasks} total</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="bg-white rounded shadow-md p-4 border border-gray-200">
  {/* Header with Controls */}
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
    <div className="flex items-center mb-3 lg:mb-0">
      <div className="p-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded mr-2 shadow-md">
        <FaTasks className="text-white text-xs" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">Task History</h2>
        <p className="text-gray-600 text-xs">
          {filteredTasks.length} task(s) found
          {filterStatus !== 'all' && ` • ${filterStatus.replace('-', ' ')}`}
          {filterImportant !== 'all' && ` • ${filterImportant}`}
          {filterAssignee !== 'all' && ` • ${filterAssignee}`}
          {filterSolvedBy !== 'all' && ` • Solved by: ${filterSolvedBy}`}
        </p>
      </div>
    </div>
    
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Search */}
      <div className="relative">
        <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-7 pr-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-gray-900 text-xs w-full sm:w-40"
        />
      </div>

      {/* Filter Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center px-2 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-xs text-gray-700"
      >
        <FaFilter className="mr-1 text-gray-600" />
        Filters
        {showFilters ? <FaEyeSlash className="ml-1" /> : <FaEye className="ml-1" />}
      </button>

      {/* Export Button */}
      <button
        onClick={exportToCSV}
        className="flex items-center px-2 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded hover:shadow-md transition-all duration-200 text-xs font-semibold"
      >
        <FaDownload className="mr-1" />
        Export
      </button>

      {/* Refresh Button */}
      <button
        onClick={fetchTaskLog}
        className="flex items-center px-2 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded hover:shadow-md transition-all duration-200 text-xs font-semibold"
      >
        <FaSync className="mr-1" />
        Refresh
      </button>
    </div>
  </div>

  {/* Advanced Filters */}
  <AnimatePresence>
    {showFilters && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mb-4 overflow-hidden"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-3 bg-gray-50 rounded border border-gray-200">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 text-xs"
            >
              <option value="all">All Status</option>
              <option value="IN-PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Importance Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">Priority</label>
            <select
              value={filterImportant}
              onChange={(e) => setFilterImportant(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 text-xs"
            >
              <option value="all">All Priority</option>
              <option value="important">Important</option>
              <option value="normal">Normal</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">Assignee</label>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 text-xs"
            >
              <option value="all">All Assignees</option>
              {uniqueAssignees.map(assignee => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>
          </div>

          {/* Solved By Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">Solved By</label>
            <select
              value={filterSolvedBy}
              onChange={(e) => setFilterSolvedBy(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 text-xs"
            >
              <option value="all">All Solvers</option>
              <option value="unsolved">Unsolved</option>
              {uniqueSolvedBy.map(solver => (
                <option key={solver} value={solver}>{solver}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">Date Range</label>
            <div className="space-y-1">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 text-xs"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 text-xs"
                placeholder="End Date"
              />
            </div>
          </div>

          {/* Reset Filters */}
          <div className="md:col-span-2 lg:col-span-5 flex justify-end">
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors text-xs font-semibold"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>

  {/* Tasks Table */}
  <div className="overflow-x-auto">
    <table className="w-full min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th 
            scope="col" 
            className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
            onClick={() => handleSort('assign_task_id')}
          >
            <div className="flex items-center space-x-1">
              <span>Task ID</span>
              {sortConfig.key === 'assign_task_id' ? (
                sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
              ) : (
                <FaSort className="text-gray-400" />
              )}
            </div>
          </th>
          <th 
            scope="col" 
            className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
            onClick={() => handleSort('task_title')}
          >
            <div className="flex items-center space-x-1">
              <span>Task Details</span>
              {sortConfig.key === 'task_title' ? (
                sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
              ) : (
                <FaSort className="text-gray-400" />
              )}
            </div>
          </th>
          <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Assigned By
          </th>
          <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Assigned To
          </th>
          <th 
            scope="col" 
            className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
            onClick={() => handleSort('status')}
          >
            <div className="flex items-center space-x-1">
              <span>Status</span>
              {sortConfig.key === 'status' ? (
                sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
              ) : (
                <FaSort className="text-gray-400" />
              )}
            </div>
          </th>
          <th 
            scope="col" 
            className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
            onClick={() => handleSort('is_important')}
          >
            <div className="flex items-center space-x-1">
              <span>Priority</span>
              {sortConfig.key === 'is_important' ? (
                sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
              ) : (
                <FaSort className="text-gray-400" />
              )}
            </div>
          </th>
          <th 
            scope="col" 
            className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
            onClick={() => handleSort('solved_by')}
          >
            <div className="flex items-center space-x-1">
              <span>Solved By</span>
              {sortConfig.key === 'solved_by' ? (
                sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
              ) : (
                <FaSort className="text-gray-400" />
              )}
            </div>
          </th>
          <th 
            scope="col" 
            className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
            onClick={() => handleSort('created_at')}
          >
            <div className="flex items-center space-x-1">
              <span>Date</span>
              {sortConfig.key === 'created_at' ? (
                sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
              ) : (
                <FaSort className="text-gray-400" />
              )}
            </div>
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task, index) => (
            <motion.tr
              key={`${task.assign_task_id}-${task.serial}-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`hover:bg-gray-50 transition-colors ${
                task.is_important ? 'bg-yellow-50' : ''
              }`}
            >
              <td className="px-3 py-2 whitespace-nowrap text-xs font-mono text-gray-900 font-semibold">
                {task.assign_task_id}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-start space-x-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1 mb-0.5">
                      <h3 
                        className="text-xs font-semibold text-gray-900 break-words max-w-md"
                        title={task.task_title}
                      >
                        {task.task_title}
                      </h3>
                      {task.task_type && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium border border-blue-200 flex-shrink-0">
                          {task.task_type}
                        </span>
                      )}
                    </div>
                    {task.remark && (
                      <p 
                        className="text-xs text-gray-600 break-words max-w-md" 
                        title={task.remark}
                      >
                        {task.remark}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <div className="flex items-center space-x-1">
                  <FaUser className="text-gray-400 text-xs" />
                  <span className="text-xs text-gray-900">{capitalizeName(task.assigned_by)}</span>
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-0.5 max-w-xs">
                  {task.assigned_to.split(',').map((assignee, idx) => {
                    const formattedAssignee = capitalizeName(assignee.trim());
                    return (
                      <span 
                        key={`${task.assign_task_id}-assignee-${idx}`}
                        className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs border border-gray-200 break-words max-w-full"
                      >
                        <FaUsers className="mr-0.5 text-xs flex-shrink-0" />
                        <span className="truncate">{formattedAssignee}</span>
                      </span>
                    );
                  })}
                </div>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {getStatusBadge(task.status)}
                {task.solved_date && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatShortDate(task.solved_date)}
                  </div>
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {task.is_important ? (
                  <div className="flex items-center space-x-1">
                    <FaStar className="text-yellow-500 text-sm" />
                    <span className="text-xs text-gray-600 font-medium">Important</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <FaRegStar className="text-gray-400 text-sm" />
                    <span className="text-xs text-gray-500">Normal</span>
                  </div>
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {task.solved_by ? (
                  <div className="flex items-center space-x-1">
                    <FaUserCheck className="text-green-500 text-xs" />
                    <span className="text-xs text-gray-900">{capitalizeName(task.solved_by)}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 italic">Not solved yet</span>
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                {formatShortDate(task.created_at)}
              </td>
            </motion.tr>
          ))
        ) : (
          <tr>
            <td colSpan="8" className="px-3 py-6 text-center">
              <div className="p-2 bg-gradient-to-br from-gray-50 to-blue-50 rounded border border-gray-200 inline-block mb-2">
                <FaTasks className="text-xl text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700 mb-0.5">No tasks found</h3>
              <p className="text-gray-500 text-xs">
                {searchTerm || filterStatus !== 'all' || filterImportant !== 'all' || filterAssignee !== 'all' || filterSolvedBy !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No task history available'
                }
              </p>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>

  {/* Pagination Info */}
  <div className="mt-3 flex items-center justify-between text-xs text-gray-700">
    <div>
      Showing <span className="font-semibold">{filteredTasks.length}</span> of{' '}
      <span className="font-semibold">{tasks.length}</span> tasks
    </div>
    <div className="text-xs text-gray-500">
      Last updated: {new Date().toLocaleTimeString()}
    </div>
  </div>
</div>
      </div>
    </div>
  );
}