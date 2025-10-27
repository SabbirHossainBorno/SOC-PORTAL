// app/components/UserDashboardCard.js
'use client';

import { motion } from 'framer-motion';
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
  FaMeh
} from 'react-icons/fa';

const UserDashboardCard = ({ 
  title, 
  type, 
  data, 
  hideForOps = false,
  isLoading = false
}) => {
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

    switch (type) {
      case 'downtimeCount':
        return (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-1"
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
        return (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-1"
              >
                {data.total}
              </motion.div>
              <div className="text-slate-500 text-sm font-medium">Total Tasks</div>
            </div>
            
            <div className="flex justify-between space-x-3">
              <motion.div 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-center flex-1 bg-emerald-50 rounded p-3 border border-emerald-200"
              >
                <FaCheckCircle className="text-emerald-600 mx-auto mb-2" size={18} />
                <div className="text-emerald-700 text-xs font-medium">Solved</div>
                <div className="text-emerald-900 font-bold text-lg">{data.solved}</div>
              </motion.div>
              
              <motion.div 
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-center flex-1 bg-amber-50 rounded p-3 border border-amber-200"
              >
                <FaExclamationTriangle className="text-amber-600 mx-auto mb-2" size={18} />
                <div className="text-amber-700 text-xs font-medium">Pending</div>
                <div className="text-amber-900 font-bold text-lg">{data.pending}</div>
              </motion.div>
            </div>
          </div>
        );

      case 'mailQueue':
        return (
          <div className="text-center space-y-3">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
            >
              {data}
            </motion.div>
            <div className="text-slate-500 text-sm font-medium">Pending Mails in Queue</div>
          </div>
        );

      case 'document':
        return (
          <div className="text-center space-y-3">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
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
                <div className="text-emerald-600 text-xl font-bold mb-1">{data.working}</div>
                <div className="text-emerald-700 text-xs font-medium">Working</div>
              </motion.div>
              
              <motion.div 
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-center flex-1 bg-rose-50 rounded p-3 border border-rose-200"
              >
                <div className="text-rose-600 text-xl font-bold mb-1">{data.notWorking}</div>
                <div className="text-rose-700 text-xs font-medium">Not Working</div>
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
                className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-1"
              >
                14
              </motion.div>
              <div className="text-slate-500 text-sm font-medium">Total SIM</div>
            </div>
            
            <div className="flex justify-between space-x-3">
              <motion.div 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-center flex-1 bg-emerald-50 rounded p-3 border border-emerald-200"
              >
                <div className="text-emerald-600 text-2xl font-bold mb-1">{data.active}</div>
                <div className="text-emerald-700 text-xs font-medium">Active</div>
              </motion.div>
              
              <motion.div 
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-center flex-1 bg-slate-100 rounded p-3 border border-slate-300"
              >
                <div className="text-slate-600 text-2xl font-bold mb-1">{data.inactive}</div>
                <div className="text-slate-700 text-xs font-medium">Inactive</div>
              </motion.div>
            </div>
          </div>
        );

      case 'myPerformance':
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
            case 'excellent': return <FaTrophy className="h-5 w-5 mr-2" />;
            case 'good': return <FaThumbsUp className="h-5 w-5 mr-2" />;
            case 'average': return <FaMeh className="h-5 w-5 mr-2" />;
            case 'bad': return <FaExclamationTriangle className="h-5 w-5 mr-2" />;
            default: return null;
            }
        };

        return (
            <div className="text-center space-y-3">
            <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-1"
            >
                {data.score}%
            </motion.div>
            
            <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={`inline-flex items-center px-4 py-2 rounded ${getPerformanceBg()} font-semibold text-sm border`}
            >
                {getPerformanceIcon()}
                {data.grade}
            </motion.div>
            
            <div className="text-slate-500 text-sm font-medium">Performance Score</div>
            </div>
        );

      case 'todaysRoster':
        const getRosterColor = () => {
            const roster = data.toLowerCase();
            if (roster.includes('morning')) return 'bg-gradient-to-r from-yellow-400 to-amber-500';
            if (roster.includes('evening')) return 'bg-gradient-to-r from-orange-500 to-red-500';
            if (roster.includes('noon')) return 'bg-gradient-to-r from-amber-500 to-orange-400';
            if (roster.includes('night')) return 'bg-gradient-to-r from-indigo-500 to-purple-600';
            if (roster.includes('leave')) return 'bg-gradient-to-r from-rose-500 to-pink-500';
            return 'bg-gradient-to-r from-blue-500 to-indigo-500';
        };

        const getRosterIcon = () => {
            const roster = data.toLowerCase();
            if (roster.includes('morning')) return <FaSun className="h-8 w-8 text-white" />;
            if (roster.includes('evening')) return <FaClock className="h-8 w-8 text-white" />;
            if (roster.includes('noon')) return <FaArrowRight className="h-8 w-8 text-white" />;
            if (roster.includes('night')) return <FaMoon className="h-8 w-8 text-white" />;
            if (roster.includes('leave')) return <FaBan className="h-8 w-8 text-white" />;
            return <FaClock className="h-8 w-8 text-white" />;
            };


        return (
            <div className="text-center">
            <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`${getRosterColor()} rounded py-6 px-8 shadow-xl hover:scale-105 transition-transform duration-300`}
            >
                <div className="flex flex-col items-center space-y-2">
                {getRosterIcon()}
                <div className="text-2xl font-extrabold text-white">{data}</div>
                <div className="text-white/90 text-sm font-medium">Today&apos;s Shift</div>
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
              className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
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
  );
};

export default UserDashboardCard;