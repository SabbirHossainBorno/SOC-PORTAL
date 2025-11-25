'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  FaClock, 
  FaCalendarAlt, 
  FaTasks, 
  FaEnvelope, 
  FaFileAlt,
  FaMobile,
  FaSimCard,
  FaChartLine,
  FaUserClock,
  FaHistory,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowUp,
  FaArrowDown,
  FaSun,
  FaMoon,
  FaArrowRight,
  FaBan,
  FaTrophy,
  FaThumbsUp,
  FaMeh,
  FaTimesCircle,
  FaInfoCircle,
  FaTimes
} from 'react-icons/fa';

const UserDashboardCard = ({ 
  title, 
  type, 
  data, 
  hideForOps = false,
  hideForIntern = false,
  hideForCTO = false,
  isLoading = false,
  userRole = 'SOC'
}) => {
  const [showPerformanceCriteria, setShowPerformanceCriteria] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [actualUserRole, setActualUserRole] = useState(userRole);
  const modalRef = useRef(null);

  // Debug: Log the props when component mounts or updates
  useEffect(() => {
    console.log('🔍 UserDashboardCard props:', { 
      title, 
      type, 
      userRole, 
      actualUserRole,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : []
    });
  }, [title, type, userRole, actualUserRole, data]);

  useEffect(() => {
    setMounted(true);
    
    // Try to get role from cookies as fallback
    const getRoleFromCookies = () => {
      try {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {});
        return cookies.roleType || userRole;
      } catch (error) {
        console.warn('Could not read role from cookies:', error);
        return userRole;
      }
    };

    const cookieRole = getRoleFromCookies();
    if (cookieRole && cookieRole !== actualUserRole) {
      console.log('🔄 Updating role from cookies:', { from: actualUserRole, to: cookieRole });
      setActualUserRole(cookieRole);
    }
  }, [userRole, actualUserRole]);


  console.log('🔍 UserDashboardCard rendered:', { title, type, userRole, data });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fixed: Single useEffect for modal management
  useEffect(() => {
    if (!showPerformanceCriteria) return;

    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowPerformanceCriteria(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowPerformanceCriteria(false);
      }
    };

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    // Cleanup function
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showPerformanceCriteria]);

  // Performance Criteria Modal Component - Fixed to prevent re-renders
  const PerformanceCriteriaModal = useCallback(() => {
    if (!showPerformanceCriteria || !mounted) return null;

    console.log('📊 Rendering performance modal for role:', actualUserRole);

const getCriteriaContent = () => {
  switch (actualUserRole) {
    case 'INTERN':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Intern Performance Criteria</h3>
          <p className="text-slate-600 text-sm">
            Your performance is calculated based solely on assigned task completion efficiency.
          </p>
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-700">Scoring Factors (100% weight):</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li className="flex items-start">
                <FaCheckCircle className="text-emerald-500 mt-1 mr-2 flex-shrink-0" size={14} />
                <span><strong>Task Completion Volume:</strong> Points for each completed task</span>
              </li>
              <li className="flex items-start">
                <FaCheckCircle className="text-emerald-500 mt-1 mr-2 flex-shrink-0" size={14} />
                <span><strong>Completion Speed:</strong> Faster completions earn more points</span>
              </li>
              <li className="flex items-start">
                <FaCheckCircle className="text-emerald-500 mt-1 mr-2 flex-shrink-0" size={14} />
                <span><strong>Quick Tasks Bonus:</strong> Extra points for tasks completed within 1 day</span>
              </li>
              <li className="flex items-start">
                <FaExclamationTriangle className="text-amber-500 mt-1 mr-2 flex-shrink-0" size={14} />
                <span><strong>Slow Task Penalty:</strong> Points deducted for tasks taking more than 2 days</span>
              </li>
              <li className="flex items-start">
                <FaExclamationTriangle className="text-rose-500 mt-1 mr-2 flex-shrink-0" size={14} />
                <span><strong>Stale Task Penalty:</strong> Points deducted for in-progress tasks older than 2 days</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <h5 className="font-semibold text-blue-800 text-sm mb-1">Note for Interns:</h5>
            <p className="text-blue-700 text-xs">
              Your performance is based only on assigned tasks. Mail resolution and other activities are not included in your score.
            </p>
          </div>
        </div>
      );

    case 'OPS':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">OPS Performance Criteria</h3>
          <p className="text-slate-600 text-sm">
            Your performance is calculated based on mail resolution efficiency and speed.
          </p>
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-700">Scoring Factors (100% weight):</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li className="flex items-start">
                <FaCheckCircle className="text-emerald-500 mt-1 mr-2 flex-shrink-0" size={14} />
                <span><strong>Mail Resolution Volume:</strong> Points for each solved mail</span>
              </li>
              <li className="flex items-start">
                <FaCheckCircle className="text-emerald-500 mt-1 mr-2 flex-shrink-0" size={14} />
                <span><strong>Quick Resolution Bonus:</strong> Higher points for mails solved within 1 day</span>
              </li>
              <li className="flex items-start">
                <FaCheckCircle className="text-emerald-500 mt-1 mr-2 flex-shrink-0" size={14} />
                <span><strong>Efficiency Ratio:</strong> Based on percentage of quick resolutions</span>
              </li>
              <li className="flex items-start">
                <FaExclamationTriangle className="text-rose-500 mt-1 mr-2 flex-shrink-0" size={14} />
                <span><strong>Slow Resolution Penalty:</strong> Points deducted for mails taking more than 2 days</span>
              </li>
              <li className="flex items-start">
                <FaExclamationTriangle className="text-amber-500 mt-1 mr-2 flex-shrink-0" size={14} />
                <span><strong>Pending Mail Impact:</strong> Long-pending mails affect overall score</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 p-3 bg-purple-50 rounded border border-purple-200">
            <h5 className="font-semibold text-purple-800 text-sm mb-1">Note for OPS:</h5>
            <p className="text-purple-700 text-xs">
              Your performance is based only on mail resolution. Task completion and other activities are not included in your score.
            </p>
          </div>
        </div>
      );

    case 'SOC':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">SOC Performance Criteria</h3>
          <p className="text-slate-600 text-sm">
            Your performance is calculated based on task completion and mail resolution with weighted scoring.
          </p>
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-700">Scoring Factors:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li className="flex items-start">
                <FaCheckCircle className="text-blue-500 mt-1 mr-2 flex-shrink-0" size={14} />
                <span><strong>Task Efficiency (50% weight):</strong> Completion speed and volume</span>
              </li>
              <li className="flex items-start">
                <FaCheckCircle className="text-purple-500 mt-1 mr-2 flex-shrink-0" size={14} />
                <span><strong>Mail Resolution (50% weight):</strong> Mail solving speed and efficiency</span>
              </li>
            </ul>
            
            <h4 className="font-semibold text-slate-700 mt-3">Detailed Breakdown:</h4>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Tasks within 1 day:</span>
                <span className="text-emerald-600 font-semibold">Bonus points</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tasks over 2 days:</span>
                <span className="text-rose-600 font-semibold">Penalty points</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Mails within 1 day:</span>
                <span className="text-emerald-600 font-semibold">Bonus points</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Mails over 2 days:</span>
                <span className="text-rose-600 font-semibold">Penalty points</span>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-200">
            <h5 className="font-semibold text-slate-800 text-sm mb-1">Note for SOC:</h5>
            <p className="text-slate-700 text-xs">
              Your performance is based on both task completion and mail resolution. Activity tracking is not included in your score.
            </p>
          </div>
        </div>
      );

    default:
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Performance Criteria</h3>
          <p className="text-slate-600 text-sm">
            Performance calculation varies by role. Contact administrator for specific criteria.
          </p>
        </div>
      );
  }
};

    return createPortal(
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-white rounded shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto border border-white/20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Performance Calculation Criteria</h3>
              <button
                onClick={() => setShowPerformanceCriteria(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
              >
                <FaTimes size={20} />
              </button>
            </div>
            {getCriteriaContent()}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Scores are calculated in real-time based on your recent activities and performance metrics.
              </p>
            </div>
          </div>
        </motion.div>
      </div>,
      document.body
    );
  }, [showPerformanceCriteria, mounted, actualUserRole]);

  // Get icon based on card type
  const getIcon = () => {
    const iconProps = { className: "text-white", size: 20 };
    
    switch (type) {
      case 'downtimeCount':
        return <FaClock {...iconProps} />;
      case 'duration':
        return <FaCalendarAlt {...iconProps} />;
      case 'assignedTask':
        return <FaTasks {...iconProps} />;
      case 'mailQueue':
        return <FaEnvelope {...iconProps} />;
      case 'document':
        return <FaFileAlt {...iconProps} />;
      case 'deviceCount':
        return <FaMobile {...iconProps} />;
      case 'simCount':
        return <FaSimCard {...iconProps} />;
      case 'myPerformance':
        return <FaChartLine {...iconProps} />;
      case 'todaysRoster':
        return <FaUserClock {...iconProps} />;
      case 'totalActivity':
        return <FaHistory {...iconProps} />;
      default:
        return <FaChartLine {...iconProps} />;
    }
  };

  // Get gradient for icon background based on card type
  const getIconGradient = () => {
    switch (type) {
      case 'downtimeCount':
        return 'from-red-500 to-rose-600';
      case 'duration':
        return 'from-amber-500 to-orange-600';
      case 'assignedTask':
        return 'from-blue-500 to-indigo-600';
      case 'mailQueue':
        return 'from-purple-500 to-violet-600';
      case 'document':
        return 'from-emerald-500 to-green-600';
      case 'deviceCount':
        return 'from-cyan-500 to-teal-600';
      case 'simCount':
        return 'from-fuchsia-500 to-purple-600';
      case 'myPerformance':
        return 'from-amber-500 to-yellow-600';
      case 'todaysRoster':
        return 'from-sky-500 to-blue-600';
      case 'totalActivity':
        return 'from-slate-600 to-gray-700';
      default:
        return 'from-blue-500 to-indigo-600';
    }
  };

  // Format duration in minutes to readable format
  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Format hours to readable format for performance metrics
  const formatHours = (hours) => {
    if (!hours || hours === 0 || isNaN(hours)) return '0h';
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    } else {
      const days = (hours / 24).toFixed(1);
      return `${days}d`;
    }
  };

  // Render card content based on type
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      );
    }

    console.log('🎨 Rendering content for:', { type, userRole, data });

    switch (type) {
      case 'downtimeCount':
        return (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-1"
              >
                {data.total}
              </motion.div>
              <div className="text-slate-500 text-sm font-medium">Total Events</div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'This Week', value: data.thisWeek },
                { label: 'Last Week', value: data.lastWeek },
                { label: 'This Month', value: data.thisMonth },
                { label: 'Last Month', value: data.lastMonth }
              ].map((item, index) => (
                <motion.div 
                  key={item.label}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-slate-50 rounded p-3 border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="text-slate-500 text-xs font-medium mb-1">{item.label}</div>
                  <div className="text-slate-800 font-bold text-lg">{item.value}</div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'duration':
        return (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-1"
              >
                {formatDuration(data.total)}
              </motion.div>
              <div className="text-slate-500 text-sm font-medium">Total Duration</div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'This Week', value: data.thisWeek },
                { label: 'Last Week', value: data.lastWeek },
                { label: 'This Month', value: data.thisMonth },
                { label: 'Last Month', value: data.lastMonth }
              ].map((item, index) => (
                <motion.div 
                  key={item.label}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-slate-50 rounded p-3 border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="text-slate-500 text-xs font-medium mb-1">{item.label}</div>
                  <div className="text-slate-800 font-semibold text-sm">{formatDuration(item.value)}</div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'assignedTask':
        // Hide assigned tasks for OPS users
        if (userRole === 'OPS') {
          return (
            <div className="text-center space-y-3 py-8">
              <FaTasks className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <div className="text-slate-500 text-sm font-medium">Not available for OPS users</div>
              <div className="text-slate-400 text-xs">Task management is for SOC and INTERN users only</div>
            </div>
          );
        }
        
        return (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-1"
              >
                {data.total}
              </motion.div>
              <div className="text-slate-500 text-sm font-medium">Total Tasks</div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <motion.div 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-center flex-1 bg-emerald-50 rounded p-3 border border-emerald-200"
              >
                <FaCheckCircle className="text-emerald-600 mx-auto mb-2" size={18} />
                <div className="text-emerald-700 text-xs font-medium">Completed</div>
                <div className="text-emerald-900 font-bold text-lg">{data.completed}</div>
              </motion.div>
              
              <motion.div 
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-center flex-1 bg-amber-50 rounded p-3 border border-amber-200"
              >
                <FaExclamationTriangle className="text-amber-600 mx-auto mb-2" size={18} />
                <div className="text-amber-700 text-xs font-medium">In-Progress</div>
                <div className="text-amber-900 font-bold text-lg">{data.in_progress}</div>
              </motion.div>
            </div>
          </div>
        );

      case 'mailQueue':
        // Hide mail queue for INTERN users
        if (userRole === 'INTERN') {
          return (
            <div className="text-center space-y-3 py-8">
              <FaEnvelope className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <div className="text-slate-500 text-sm font-medium">Not available for INTERN users</div>
              <div className="text-slate-400 text-xs">Mail management is for SOC and OPS users only</div>
            </div>
          );
        }

        const formatDate = (dateString) => {
          const date = new Date(dateString);
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (date.toDateString() === today.toDateString()) {
            return 'Today';
          } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
          } else {
            return date.toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });
          }
        };

        return (
          <div className="space-y-4">
            {/* Total Count */}
            <div className="text-center">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-1"
              >
                {data.total}
              </motion.div>
              <div className="text-slate-500 text-sm font-medium">Pending Mails in Queue</div>
            </div>

            {/* Date-wise Breakdown */}
            {data.byDate && data.byDate.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <div className="bg-slate-50 rounded border border-slate-200 px-2 py-1 max-h-48 overflow-y-auto">
                  {data.byDate.map((item, index) => (
                    <motion.div 
                      key={item.date}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + (index * 0.1) }}
                      className="flex justify-between items-center py-1 px-1 border-b border-slate-100 last:border-b-0"
                    >
                      <div className="flex items-center space-x-2">
                        <FaCalendarAlt className="text-slate-400" size={12} />
                        <span className="text-slate-600 text-xs font-medium">
                          {formatDate(item.date)}
                        </span>
                      </div>
                      <span className="text-slate-800 font-bold text-sm bg-amber-100 text-amber-700 px-2 py-1 rounded">
                        {item.count}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Empty State */}
            {(!data.byDate || data.byDate.length === 0) && data.total === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-4"
              >
                <FaEnvelope className="text-slate-300 mx-auto mb-2" size={24} />
                <div className="text-slate-400 text-xs">No pending mails in queue</div>
              </motion.div>
            )}
          </div>
        );

      case 'document':
        return (
          <div className="text-center space-y-3">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
            >
              {data}
            </motion.div>
            <div className="text-slate-500 text-sm font-medium">Active Access Documents</div>
          </div>
        );

      case 'deviceCount':
        return (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-1"
              >
                {data.total}
              </motion.div>
              <div className="text-slate-500 text-sm font-medium">Total Devices</div>
            </div>
            
            <div className="flex justify-between space-x-3">
              <motion.div 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-center flex-1 bg-emerald-50 rounded p-3 border border-emerald-200"
              >
                <FaCheckCircle className="text-emerald-600 mx-auto mb-2" size={18} />
                <div className="text-emerald-700 text-xs font-medium">Working</div>
                <div className="text-emerald-900 font-bold text-lg">{data.working}</div>
              </motion.div>
              
              <motion.div 
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-center flex-1 bg-rose-50 rounded p-3 border border-rose-200"
              >
                <FaTimesCircle className="text-rose-600 mx-auto mb-2" size={18} />
                <div className="text-rose-700 text-xs font-medium">Not Working</div>
                <div className="text-rose-900 font-bold text-lg">{data.notWorking}</div>
              </motion.div>
            </div>
          </div>
        );

      case 'simCount':
        return (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-1"
              >
                {data.total}
              </motion.div>
              <div className="text-slate-500 text-sm font-medium">Total SIM</div>
            </div>
            
            <div className="flex justify-between space-x-3">
              <motion.div 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-center flex-1 bg-emerald-50 rounded p-3 border border-emerald-200"
              >
                <FaCheckCircle className="text-emerald-600 mx-auto mb-2" size={18} />
                <div className="text-emerald-700 text-xs font-medium">Active</div>
                <div className="text-emerald-900 font-bold text-lg">{data.active}</div>
              </motion.div>
              
              <motion.div 
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-center flex-1 bg-slate-100 rounded p-3 border border-slate-300"
              >
                <FaTimesCircle className="text-slate-600 mx-auto mb-2" size={18} />
                <div className="text-slate-700 text-xs font-medium">Inactive</div>
                <div className="text-slate-900 font-bold text-lg">{data.inactive}</div>
              </motion.div>
            </div>
          </div>
        );

      case 'myPerformance':
        console.log('📊 Rendering performance card for:', actualUserRole, 'with data:', data);
        
        const getPerformanceColor = () => {
          switch (data.level) {
            case 'excellent': return 'text-emerald-600';
            case 'good': return 'text-blue-600';
            case 'average': return 'text-amber-600';
            case 'bad': return 'text-rose-600';
            default: return 'text-slate-600';
          }
        };

        const getPerformanceBg = () => {
          switch (data.level) {
            case 'excellent': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'average': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'bad': return 'bg-rose-100 text-rose-800 border-rose-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
          }
        };

        const getPerformanceIcon = () => {
          switch (data.level) {
            case 'excellent': return <FaTrophy className="h-4 w-4 mr-1" />;
            case 'good': return <FaThumbsUp className="h-4 w-4 mr-1" />;
            case 'average': return <FaMeh className="h-4 w-4 mr-1" />;
            case 'bad': return <FaExclamationTriangle className="h-4 w-4 mr-1" />;
            default: return null;
          }
        };

        return (
          <div className="space-y-3">
            {/* Main Performance Score - Compact */}
            <div className="text-center relative">
              {/* Info Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPerformanceCriteria(true);
                }}
                className="absolute top-0 right-0 text-slate-400 hover:text-slate-600 transition-colors z-10"
                title="View performance criteria"
              >
                <FaInfoCircle size={14} />
              </button>
              
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-1"
              >
                {data.score}%
              </motion.div>
              
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={`inline-flex items-center px-3 py-1 rounded ${getPerformanceBg()} font-semibold text-xs border`}
              >
                {getPerformanceIcon()}
                {data.grade}
              </motion.div>
            </div>

            {/* Compact Performance Metrics */}
            {data.metrics && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                {/* INTERN: Only task metrics */}
                {actualUserRole === 'INTERN' && (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500 font-medium mb-1 text-center">
                      Based on Task Performance Only
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="flex justify-between items-center px-2 py-1 bg-blue-50 rounded">
                        <span className="text-slate-600">Tasks Done:</span>
                        <span className="text-blue-600 font-semibold">{data.metrics.totalCompletedTasks || 0}</span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1 bg-emerald-50 rounded">
                        <span className="text-slate-600">Quick Tasks:</span>
                        <span className="text-emerald-600 font-semibold">{data.metrics.tasksWithin1Day || 0}</span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1 bg-rose-50 rounded">
                        <span className="text-slate-600">Slow Tasks:</span>
                        <span className="text-rose-600 font-semibold">{data.metrics.tasksOver2Days || 0}</span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1 bg-slate-50 rounded">
                        <span className="text-slate-600">Avg Time:</span>
                        <span className="text-slate-800 font-semibold">{formatHours(data.metrics.avgCompletionHours || 48)}</span>
                      </div>
                    </div>
                    <div className="text-center text-xs text-slate-400 mt-2">
                      Mail and activity metrics are not tracked for Interns
                    </div>
                  </div>
                )}

                {/* OPS: Only mail metrics */}
                {actualUserRole === 'OPS' && (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500 font-medium mb-1 text-center">
                      Based on Mail Performance Only
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="flex justify-between items-center px-2 py-1 bg-purple-50 rounded">
                        <span className="text-slate-600">Solved Mails:</span>
                        <span className="text-purple-600 font-semibold">{data.metrics.solvedMails || 0}</span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1 bg-emerald-50 rounded">
                        <span className="text-slate-600">Quick Mails:</span>
                        <span className="text-emerald-600 font-semibold">{data.metrics.mailsWithin1Day || 0}</span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1 bg-rose-50 rounded">
                        <span className="text-slate-600">Slow Mails:</span>
                        <span className="text-rose-600 font-semibold">{data.metrics.mailsOver2Days || 0}</span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1 bg-slate-50 rounded">
                        <span className="text-slate-600">Avg Time:</span>
                        <span className="text-slate-800 font-semibold">{formatHours(data.metrics.avgResolutionHours || 36)}</span>
                      </div>
                    </div>
                    <div className="text-center text-xs text-slate-400 mt-2">
                      Task and activity metrics are not tracked for OPS
                    </div>
                  </div>
                )}

                {/* SOC: Both task and mail metrics */}
                {actualUserRole === 'SOC' && (
                  <div className="space-y-1">
                    {/* Task Efficiency - Compact */}
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="flex justify-between items-center px-2 py-1 bg-blue-50 rounded">
                        <span className="text-slate-600">Tasks Done:</span>
                        <span className="text-blue-600 font-semibold">{data.metrics.totalCompletedTasks || 0}</span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1 bg-emerald-50 rounded">
                        <span className="text-slate-600">Quick Tasks:</span>
                        <span className="text-emerald-600 font-semibold">{data.metrics.tasksWithin1Day || 0}</span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1 bg-rose-50 rounded">
                        <span className="text-slate-600">Slow Tasks:</span>
                        <span className="text-rose-600 font-semibold">{data.metrics.tasksOver2Days || 0}</span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1 bg-slate-50 rounded">
                        <span className="text-slate-600">Avg Task Time:</span>
                        <span className="text-slate-800 font-semibold">{formatHours(data.metrics.avgCompletionHours || 48)}</span>
                      </div>
                    </div>

                    {/* Mail Resolution - Compact */}
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="flex justify-between items-center px-2 py-1 bg-purple-50 rounded">
                        <span className="text-slate-600">Mails Solved:</span>
                        <span className="text-purple-600 font-semibold">{data.metrics.solvedMails || 0}</span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1 bg-emerald-50 rounded">
                        <span className="text-slate-600">Quick Mails:</span>
                        <span className="text-emerald-600 font-semibold">{data.metrics.mailsWithin1Day || 0}</span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1 bg-rose-50 rounded">
                        <span className="text-slate-600">Slow Mails:</span>
                        <span className="text-rose-600 font-semibold">{data.metrics.mailsOver2Days || 0}</span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1 bg-slate-50 rounded">
                        <span className="text-slate-600">Avg Mail Time:</span>
                        <span className="text-slate-800 font-semibold">{formatHours(data.metrics.avgMailHours || 36)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fallback for unknown roles */}
                {!['INTERN', 'OPS', 'SOC'].includes(actualUserRole) && (
                  <div className="text-center text-slate-500 text-xs py-4">
                    Performance metrics not available for your role ({actualUserRole})
                  </div>
                )}
              </motion.div>
            )}
          </div>
        );

      case 'todaysRoster':
        // Hide roster for non-SOC users
        if (userRole !== 'SOC') {
          return (
            <div className="text-center space-y-3 py-8">
              <FaUserClock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <div className="text-slate-500 text-sm font-medium">Roster not available</div>
              <div className="text-slate-400 text-xs">Only available for SOC users</div>
            </div>
          );
        }

        // If data is not available, show appropriate message
        if (!data || data.today === 'Not Available') {
          return (
            <div className="text-center space-y-3 py-8">
              <FaUserClock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <div className="text-slate-500 text-sm font-medium">Roster not available</div>
              <div className="text-slate-400 text-xs">Contact administrator for roster assignment</div>
            </div>
          );
        }

        const getRosterColor = (shift) => {
          const roster = shift.toLowerCase();
          if (roster.includes('morning')) return 'from-yellow-400 to-amber-500';
          if (roster.includes('evening')) return 'from-orange-500 to-red-500';
          if (roster.includes('noon')) return 'from-amber-500 to-orange-400';
          if (roster.includes('night')) return 'from-indigo-500 to-purple-600';
          if (roster.includes('leave')) return 'from-rose-500 to-pink-500';
          return 'from-blue-500 to-indigo-500';
        };

        const getRosterIcon = (shift) => {
          const roster = shift.toLowerCase();
          if (roster.includes('morning')) return <FaSun className="h-6 w-6 text-white" />;
          if (roster.includes('evening')) return <FaClock className="h-6 w-6 text-white" />;
          if (roster.includes('noon')) return <FaArrowRight className="h-6 w-6 text-white" />;
          if (roster.includes('night')) return <FaMoon className="h-6 w-6 text-white" />;
          if (roster.includes('leave')) return <FaBan className="h-6 w-6 text-white" />;
          return <FaClock className="h-6 w-6 text-white" />;
        };

        const getDayLabel = (isToday = true) => {
          const today = new Date();
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          if (isToday) {
            return `Today (${today.toLocaleDateString('en-US', { weekday: 'short' })})`;
          } else {
            return `Tomorrow (${tomorrow.toLocaleDateString('en-US', { weekday: 'short' })})`;
          }
        };

        return (
          <div className="space-y-4">
            {/* Today's Shift */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`bg-gradient-to-r ${getRosterColor(data.today)} rounded p-3 shadow-lg hover:scale-105 transition-transform duration-300`}
            >
              <div className="flex flex-col items-center space-y-2">
                {getRosterIcon(data.today)}
                <div className="text-base font-bold text-white text-center">{data.today}</div>
                <div className="text-white/90 text-sm font-medium text-center">{getDayLabel(true)}</div>
              </div>
            </motion.div>

            {/* Tomorrow's Shift */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`bg-gradient-to-r ${getRosterColor(data.tomorrow)} rounded p-3 shadow-lg hover:scale-105 transition-transform duration-300 opacity-90`}
            >
              <div className="flex flex-col items-center space-y-2">
                {getRosterIcon(data.tomorrow)}
                <div className="text-base font-bold text-white text-center">{data.tomorrow}</div>
                <div className="text-white/90 text-sm font-medium text-center">{getDayLabel(false)}</div>
              </div>
            </motion.div>
          </div>
        );

      case 'totalActivity':
        return (
          <div className="text-center space-y-3">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
            >
              {data}
            </motion.div>
            <div className="text-slate-500 text-sm font-medium">Total Activities</div>
          </div>
        );

      default:
        return (
          <div className="text-center text-slate-500 text-sm">
            No data available
          </div>
        );
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ 
          y: -2,
          transition: { duration: 0.2 }
        }}
        transition={{ 
          duration: 0.3,
          type: "spring",
          stiffness: 300
        }}
        className="relative bg-white rounded shadow-sm border border-slate-200 overflow-hidden group cursor-pointer transform transition-all duration-300 hover:shadow-lg hover:border-slate-300 h-full"
      >
        {/* Card content */}
        <div className="p-6 h-full flex flex-col">
          {/* Header - Professional design inspired by your reference */}
          <div className="flex items-center mb-6">
            <div className={`p-3 bg-gradient-to-r ${getIconGradient()} rounded shadow-lg mr-4 flex-shrink-0`}>
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent truncate">
                {title}
              </h3>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>

        {/* Subtle hover effect */}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-slate-100 rounded transition-colors duration-300 pointer-events-none" />
      </motion.div>

      {/* Render modal outside the card */}
      <PerformanceCriteriaModal />
    </>
  );
};

export default UserDashboardCard;