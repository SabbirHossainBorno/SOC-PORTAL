//app/user_dashboard/task_management/my_task/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaTasks, FaCheckCircle, FaClock, FaUser, FaCalendarAlt,
  FaExclamationTriangle, FaSpinner, FaSearch, FaFilter,
  FaArrowLeft, FaComment, FaPaperPlane, FaCheckDouble,
  FaLayerGroup, FaUserCheck, FaIdCard, FaListAlt, FaChartBar,
  FaStar, FaRegStar, FaSort, FaSortUp, FaSortDown
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function MyTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionRemark, setCompletionRemark] = useState('');
  const [currentTask, setCurrentTask] = useState(null); // NEW: Track which task is in modal
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('IN-PROGRESS');
  const [filterImportant, setFilterImportant] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Enhanced spinner component
  const ModernSpinner = ({ size = 'medium', className = '' }) => {
    const sizeClasses = {
      small: 'w-4 h-4',
      medium: 'w-6 h-6',
      large: 'w-8 h-8',
      xl: 'w-12 h-12'
    };

    return (
      <div className={`inline-flex items-center justify-center ${sizeClasses[size]} ${className}`}>
        <div className={`${sizeClasses[size]} border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin`}></div>
      </div>
    );
  };

  // Fetch user's tasks
  const fetchMyTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user_dashboard/task_management/my_task');
      const result = await response.json();

      if (response.ok && result.success) {
        setTasks(result.data);
        setCurrentUser({ shortName: result.userShortName });
      } else {
        throw new Error(result.message || 'Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, []);

  // Handle task completion
  const handleCompleteTask = async (taskId, remark = '') => {
    setCompletingTask(taskId);
    try {
      const response = await fetch('/api/user_dashboard/task_management/my_task', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          completionRemark: remark
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Task completed successfully!');
        setShowCompletionModal(false);
        setCompletionRemark('');
        setCurrentTask(null); // Reset current task
        // Refresh tasks to get updated list
        fetchMyTasks();
      } else {
        throw new Error(result.message || 'Failed to complete task');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error(error.message || 'Failed to complete task');
    } finally {
      setCompletingTask(null);
    }
  };

  // Quick complete without remark
  const handleQuickComplete = (taskId) => {
    handleCompleteTask(taskId, 'Task completed without additional remarks.');
  };

  // Open completion modal with remark - FIXED: Don't set completingTask here
  const openCompletionModal = (taskId) => {
    setCurrentTask(taskId); // Only set which task we're working with
    setShowCompletionModal(true);
  };

  // Close modal properly
  const closeModal = () => {
    setShowCompletionModal(false);
    setCompletionRemark('');
    setCurrentTask(null);
  };

  // Format date
  const formatDate = (dateString) => {
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

  // Sort tasks
  const sortedTasks = [...tasks].sort((a, b) => {
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

    return 0;
  });

  // Filter tasks based on search, status, and importance
  const filteredTasks = sortedTasks.filter(task => {
    const matchesSearch = task.task_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.task_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.assigned_by.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    
    const matchesImportant = filterImportant === 'all' || 
                            (filterImportant === 'important' && task.is_important) ||
                            (filterImportant === 'normal' && !task.is_important);
    
    return matchesSearch && matchesStatus && matchesImportant;
  });

  // Calculate stats properly
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter(task => task.status === 'IN-PROGRESS').length;
  const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
  const importantTasks = tasks.filter(task => task.is_important).length;
  
  // Perfect completion rate calculation
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <ModernSpinner size="xl" className="mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Your Tasks</h3>
          <p className="text-gray-600">Preparing your task management interface</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Enhanced Compact Header */}
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
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded mr-4 shadow-lg">
                    <FaListAlt className="text-white text-lg" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
                    <p className="text-gray-600 text-sm">Manage and complete your assigned tasks</p>
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
                        Task Assignee
                      </div>
                      <div className="font-semibold text-gray-900">{currentUser.shortName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-gray-700">Active Tasks</div>
                      <div className="text-lg font-bold text-indigo-600">{inProgressTasks}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Compact Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                    <FaCheckDouble className="text-green-200 text-sm" />
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
            </div>

            {/* Completion Rate Progress Bar */}
            <div className="mt-4 bg-white rounded p-3 border border-gray-200 shadow-sm">
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

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* Main Content */}
          <div className="xl:col-span-3">
            
            {/* Enhanced Tasks Section */}
            <div className="bg-white rounded shadow-md p-6 border border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                <div className="flex items-center mb-4 lg:mb-0">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded mr-3 shadow-md">
                    <FaTasks className="text-white text-sm" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Assigned Tasks</h2>
                    <p className="text-gray-600 text-sm">
                      {filteredTasks.length} task(s) found
                      {filterStatus !== 'all' && ` • ${filterStatus.replace('-', ' ')}`}
                      {filterImportant !== 'all' && ` • ${filterImportant}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Search */}
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm w-full sm:w-48"
                    />
                  </div>
                  
                  {/* Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="IN-PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>

                  {/* Importance Filter */}
                  <select
                    value={filterImportant}
                    onChange={(e) => setFilterImportant(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                  >
                    <option value="all">All Priority</option>
                    <option value="important">Important</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>
              </div>

              {/* Tasks List Header with Sort */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 rounded border border-gray-200 mb-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                <div className="col-span-5 flex items-center space-x-2">
                  <span>Task Details</span>
                  <button onClick={() => handleSort('task_title')} className="text-gray-400 hover:text-gray-600">
                    {sortConfig.key === 'task_title' ? (
                      sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
                    ) : (
                      <FaSort />
                    )}
                  </button>
                </div>
                <div className="col-span-2 text-center">Assigned By</div>
                <div className="col-span-2 text-center">Date</div>
                <div className="col-span-1 text-center">Priority</div>
                <div className="col-span-2 text-center">Actions</div>
              </div>

              {/* Compact Tasks List */}
              <div className="space-y-2">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task, index) => (
                    <motion.div
                      key={task.assign_task_id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`grid grid-cols-12 gap-4 items-center p-4 rounded border transition-all duration-200 hover:shadow-md ${
                        task.is_important 
                          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {/* Task Details */}
                      <div className="col-span-5">
                        <div className="flex items-start space-x-3">
                          {task.is_important && (
                            <FaStar className="text-yellow-500 mt-1 flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                              {task.task_title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                              {task.task_type && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium border border-blue-200">
                                  {task.task_type}
                                </span>
                              )}
                              {getStatusBadge(task.status)}
                            </div>
                            {task.remark && (
                              <p className="text-xs text-gray-600 mt-1 truncate" title={task.remark}>
                                {task.remark}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Assigned By */}
                      <div className="col-span-2 text-center">
                        <div className="flex flex-col items-center">
                          <FaUser className="text-gray-400 text-xs mb-1" />
                          <span className="text-xs font-medium text-gray-700">{task.assigned_by}</span>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="col-span-2 text-center">
                        <div className="flex flex-col items-center">
                          <FaCalendarAlt className="text-gray-400 text-xs mb-1" />
                          <span className="text-xs text-gray-600">{formatDate(task.created_at)}</span>
                        </div>
                      </div>

                      {/* Priority */}
                      <div className="col-span-1 text-center">
                        {task.is_important ? (
                          <FaStar className="text-yellow-500 mx-auto text-sm" />
                        ) : (
                          <FaRegStar className="text-gray-400 mx-auto text-sm" />
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-2">
                        <div className="flex flex-col space-y-2">
                          {task.status === 'IN-PROGRESS' && (
                            <>
                              <button
                                onClick={() => handleQuickComplete(task.assign_task_id)}
                                disabled={completingTask === task.assign_task_id}
                                className="flex items-center justify-center px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded text-xs font-semibold hover:shadow-md transition-all duration-200 disabled:opacity-50"
                              >
                                {completingTask === task.assign_task_id ? (
                                  <ModernSpinner size="small" className="mr-1" />
                                ) : (
                                  <FaCheckCircle className="mr-1 text-xs" />
                                )}
                                Complete
                              </button>

                              <button
                                onClick={() => openCompletionModal(task.assign_task_id)}
                                disabled={completingTask}
                                className="flex items-center justify-center px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded text-xs font-semibold hover:shadow-md transition-all duration-200 disabled:opacity-50"
                              >
                                <FaComment className="mr-1 text-xs" />
                                With Remark
                              </button>
                            </>
                          )}
                          {task.status === 'COMPLETED' && (
                            <span className="px-3 py-2 bg-green-100 text-green-800 rounded text-xs font-semibold text-center border border-green-200">
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="p-3 bg-gradient-to-br from-gray-50 to-blue-50 rounded border border-gray-200 inline-block mb-3">
                      <FaTasks className="text-2xl text-gray-400" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-700 mb-1">No tasks found</h3>
                    <p className="text-gray-500 text-sm">
                      {searchTerm || filterStatus !== 'all' || filterImportant !== 'all'
                        ? 'Try adjusting your search or filter criteria'
                        : 'You have no assigned tasks at the moment'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Compact Sidebar */}
          <div className="space-y-4">
            
            {/* Quick Actions */}
            <div className="bg-white rounded shadow-md p-4 border border-gray-200">
              <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center">
                <FaCheckCircle className="mr-2 text-green-500 text-sm" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={fetchMyTasks}
                  className="w-full text-left p-2 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-all duration-200 hover:shadow-sm text-xs"
                >
                  <div className="font-semibold text-blue-800">Refresh Tasks</div>
                  <div className="text-blue-600">Update task list</div>
                </button>
                
                <button
                  onClick={() => router.push('/user_dashboard/task_management/assign_task')}
                  className="w-full text-left p-2 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-all duration-200 hover:shadow-sm text-xs"
                >
                  <div className="font-semibold text-purple-800">Assign New Tasks</div>
                  <div className="text-purple-600">Go to assignment panel</div>
                </button>

                <button
                  onClick={() => router.push('/user_dashboard')}
                  className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-all duration-200 hover:shadow-sm text-xs"
                >
                  <div className="font-semibold text-gray-800">Back to Dashboard</div>
                  <div className="text-gray-600">Return to main dashboard</div>
                </button>
              </div>
            </div>

            {/* Task Completion Guide */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded shadow-md p-4 border border-green-200">
              <h3 className="font-bold text-green-900 text-sm mb-2 flex items-center">
                <FaCheckDouble className="mr-2 text-green-600 text-sm" />
                Completion Guide
              </h3>
              <div className="space-y-1 text-xs text-green-800">
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">1</div>
                  <p><strong>Quick Complete:</strong> No additional remarks</p>
                </div>
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">2</div>
                  <p><strong>With Remark:</strong> Add completion notes</p>
                </div>
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">3</div>
                  <p><strong>Notifications:</strong> Assigner gets notified</p>
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="bg-white rounded shadow-md p-4 border border-gray-200">
              <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center">
                <FaChartBar className="mr-2 text-indigo-500 text-sm" />
                Performance
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="font-bold text-indigo-600">{completionRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active Tasks</span>
                  <span className="font-bold text-yellow-600">{inProgressTasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Completed</span>
                  <span className="font-bold text-green-600">{completedTasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Important Tasks</span>
                  <span className="font-bold text-orange-600">{importantTasks}</span>
                </div>
              </div>
            </div>

            {/* Filter Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded shadow-md p-4 border border-blue-200">
              <h3 className="font-bold text-blue-900 text-sm mb-2 flex items-center">
                <FaFilter className="mr-2 text-blue-600 text-sm" />
                Current Filters
              </h3>
              <div className="space-y-1 text-xs text-blue-800">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-semibold">{filterStatus === 'all' ? 'All' : filterStatus.replace('-', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Priority:</span>
                  <span className="font-semibold capitalize">{filterImportant}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sort By:</span>
                  <span className="font-semibold">
                    {sortConfig.key === 'created_at' ? 'Date' : 
                     sortConfig.key === 'task_title' ? 'Title' : 
                     'Priority'} ({sortConfig.direction})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Completion with Remark Modal - FIXED loading issue */}
      <AnimatePresence>
        {showCompletionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded shadow-lg max-w-md w-full border border-gray-300"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white p-4 rounded">
                <div className="flex items-center">
                  <div className="p-2 bg-white/20 rounded mr-3">
                    <FaComment className="text-white text-sm" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Complete Task with Remark</h3>
                    <p className="text-blue-100 text-sm">Add completion notes (optional)</p>
                  </div>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="p-4">
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Completion Remark
                  </label>
                  <textarea
                    value={completionRemark}
                    onChange={(e) => setCompletionRemark(e.target.value)}
                    placeholder="Describe any additional information about task completion..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white resize-none text-sm"
                  />
                </div>

                <div className="bg-blue-50 rounded p-3 border border-blue-200">
                  <div className="flex items-center text-sm text-blue-800">
                    <FaExclamationTriangle className="mr-2 text-blue-600 text-sm" />
                    This remark will be sent to the task assigner
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="border-t border-gray-200 bg-gray-50 p-4 rounded">
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors font-semibold w-full sm:w-auto text-sm"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={() => handleCompleteTask(currentTask, completionRemark)}
                    disabled={completingTask} // Only disabled when actually completing
                    className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded hover:shadow-md transition-all duration-200 disabled:opacity-50 font-semibold w-full sm:w-auto text-sm"
                  >
                    {completingTask ? (
                      <>
                        <ModernSpinner size="small" className="mr-1" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane className="mr-1 text-sm" />
                        Complete Task
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}