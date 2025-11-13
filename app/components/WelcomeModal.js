// app/components/WelcomeModal.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaTimes, 
  FaUserShield, 
  FaHistory, 
  FaKey, 
  FaRocket,
  FaShieldAlt,
  FaGraduationCap,
  FaCrown,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaServer,
  FaNetworkWired,
  FaHeadset,
  FaCog,
  FaEnvelope, FaPhone, FaBriefcase, FaCalendarAlt
} from 'react-icons/fa';

const WelcomeModal = ({ isOpen, onClose, userInfo }) => {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  // ADD THIS FUNCTION: Check if welcome modal was already closed for this user
  const getWelcomeKey = () => `welcome_closed_${userInfo?.socPortalId}`;

  useEffect(() => {
    if (isOpen) {
      // Check if modal was already closed for this user
      const welcomeClosed = localStorage.getItem(getWelcomeKey());
      if (welcomeClosed === 'true') {
        // If already closed, don't show and call onClose
        onClose();
        return;
      }
      
      // Small delay for animation
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, userInfo?.socPortalId]);

  const markWelcomeAsShown = async () => {
    try {
      await fetch('/api/welcome-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Failed to mark welcome as shown:', error);
      // Fallback to localStorage
      if (userInfo?.socPortalId) {
        localStorage.setItem(getWelcomeKey(), 'true');
      }
    }
  };

  const handleClose = () => {
    // Mark as shown in database
    markWelcomeAsShown();
    
    // Also use localStorage as backup
    if (userInfo?.socPortalId) {
      localStorage.setItem(getWelcomeKey(), 'true');
    }
    
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleChangePassword = () => {
    // Mark as shown in database
    markWelcomeAsShown();
    
    // Also use localStorage as backup
    if (userInfo?.socPortalId) {
      localStorage.setItem(getWelcomeKey(), 'true');
    }
    
    setIsVisible(false);
    setTimeout(() => {
      router.push('/user_dashboard/settings');
    }, 400);
  };

  // Role-based configurations for Service Operation Center
  const getRoleConfig = (roleType) => {
    const configs = {
      SOC: {
        icon: <FaServer className="text-4xl text-blue-600" />,
        gradient: 'from-blue-500 to-cyan-500',
        bgGradient: 'from-blue-50 to-cyan-50',
        borderColor: 'border-blue-200',
        title: 'SOC Team',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        iconColor: 'text-blue-600', // FIX: Added specific icon color
        roleDescription: 'Service Operation Center Core Member',
        instructions: [
          'Monitor and maintain Nagad digital financial services 24/7',
          'Handle incident management and service requests',
          'Ensure system reliability and performance monitoring',
          'Coordinate with technical teams for issue resolution',
          'Follow ITIL processes for service operation'
        ],
        responsibilities: [
          'Real-time system monitoring and alert management',
          'Incident logging, categorization, and prioritization',
          'First-level technical support and troubleshooting',
          'Service request fulfillment and user support',
          'Communication with stakeholders during incidents'
        ]
      },
      INTERN: {
        icon: <FaGraduationCap className="text-4xl text-green-600" />,
        gradient: 'from-green-500 to-emerald-500',
        bgGradient: 'from-green-50 to-emerald-50',
        borderColor: 'border-green-200',
        title: 'Intern Team',
        badgeColor: 'bg-green-100 text-green-800 border-green-200',
        iconColor: 'text-green-600', // FIX: Added specific icon color
        roleDescription: 'Service Operation Center Intern Member',
        instructions: [
          'Learn Service Operation Center processes and procedures',
          'Assist in monitoring system alerts and performance',
          'Shadow SOC team members for hands-on experience',
          'Participate in training sessions and knowledge sharing',
          'Follow all SOC protocols and security guidelines'
        ],
        responsibilities: [
          'Observe and learn incident management processes',
          'Assist in documentation and knowledge base updates',
          'Participate in team meetings and daily briefings',
          'Learn to use monitoring tools and ticketing systems',
          'Support team members in non-critical tasks'
        ]
      },
      CTO: {
        icon: <FaCrown className="text-4xl text-purple-600" />,
        gradient: 'from-purple-500 to-indigo-500',
        bgGradient: 'from-purple-50 to-indigo-50',
        borderColor: 'border-purple-200',
        title: 'Chief Technology Officer',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        iconColor: 'text-purple-600', // FIX: Added specific icon color
        roleDescription: 'Technology Leadership',
        instructions: [
          'Oversee Service Operation Center performance and strategy',
          'Review system reliability and service level agreements',
          'Guide technology roadmap and infrastructure planning',
          'Make strategic decisions for service improvement',
          'Monitor team performance and operational metrics'
        ],
        responsibilities: [
          'Strategic oversight of SOC operations',
          'Technology budget and resource planning',
          'Vendor management and technology partnerships',
          'Team leadership and performance management',
          'Executive reporting and stakeholder communication'
        ]
      },
      OPS: {
        icon: <FaCog className="text-4xl text-orange-600" />,
        gradient: 'from-orange-500 to-red-500',
        bgGradient: 'from-orange-50 to-red-50',
        borderColor: 'border-orange-200',
        title: 'Operations Team',
        badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
        iconColor: 'text-orange-600', // FIX: Added specific icon color
        roleDescription: 'Operations Core Member',
        instructions: [
          'Support Service Operation Center with operational tasks',
          'Handle routine operations and maintenance activities',
          'Follow established operational procedures',
          'Coordinate with SOC team for operational requirements',
          'Ensure smooth day-to-day operations'
        ],
        responsibilities: [
          'Routine system checks and maintenance',
          'Operational documentation and reporting',
          'Support in change management processes',
          'Basic troubleshooting and user support',
          'Coordination with different departments'
        ]
      }
    };

    return configs[roleType] || configs.SOC;
  };

  const roleConfig = getRoleConfig(userInfo?.roleType);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ 
            type: "spring",
            damping: 25,
            stiffness: 300
          }}
          className="relative bg-white rounded shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden"
        >
          {/* Header with Gradient */}
          <div className={`bg-gradient-to-r ${roleConfig.gradient} p-6 text-white relative overflow-hidden`}>
            {/* Animated background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {roleConfig.icon}
                  <div>
                    <motion.h2 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-2xl font-bold"
                    >
                      Welcome to Nagad SOC Portal!
                    </motion.h2>
                    <motion.p 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-white/90"
                    >
                      Service Operation Center Management System
                    </motion.p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <FaTimes className="text-xl" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
            {/* User Profile Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded"
            >
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                  {userInfo?.profilePhoto ? (
                    <img 
                      src={userInfo.profilePhoto} 
                      alt={`${userInfo.firstName} ${userInfo.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaUserShield className="text-2xl text-gray-600" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <FaCheckCircle className="text-white text-xs" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-800">
                  {userInfo?.firstName} {userInfo?.lastName}
                </h3>
                <p className="text-gray-600 text-sm mb-2">{roleConfig.roleDescription}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 border">
                    SOC PORTAL ID: {userInfo?.socPortalId}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 border">
                    NAGAD ID: {userInfo?.ngdId}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${roleConfig.badgeColor}`}>
                    {userInfo?.roleType} - {userInfo?.designation}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Important Security Instructions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <FaExclamationTriangle className="text-orange-500 text-xl" />
                <h3 className="text-lg font-semibold text-gray-800">Security & Compliance</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-orange-50 border border-orange-200 rounded">
                  <FaUserShield className="text-orange-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-orange-800 text-sm">Activity Monitoring & Audit</h4>
                    <p className="text-orange-700 text-sm mt-1">
                      Your activities are monitored for security compliance. All actions are logged in the activity log for audit purposes as per Nagad security policy.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <FaHistory className="text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-800 text-sm">Comprehensive Activity Logging</h4>
                    <p className="text-blue-700 text-sm mt-1">
                      All system interactions, including login attempts, data access, and configuration changes, are recorded for security and compliance monitoring.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded">
                  <FaKey className="text-red-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-800 text-sm">Password Security Policy</h4>
                    <p className="text-red-700 text-sm mt-1">
                      For security compliance, please change your default password immediately. Use strong passwords with minimum 8 characters including uppercase, lowercase, numbers, and special characters.
                    </p>
                    <button
                      onClick={handleChangePassword}
                      className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Change Password Now
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Role-specific Instructions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className={`p-4 rounded border ${roleConfig.borderColor} bg-gradient-to-br ${roleConfig.bgGradient}`}
              >
                <div className="flex items-center space-x-2 mb-3">
                  {/* FIX: Use the specific iconColor instead of complex string manipulation */}
                  <FaInfoCircle className={`${roleConfig.iconColor} text-xl`} />
                  <h3 className="font-semibold text-gray-800">Your Role Overview</h3>
                </div>
                <ul className="space-y-2">
                  {roleConfig.instructions.map((instruction, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      className="flex items-start space-x-2 text-sm text-gray-700"
                    >
                      <FaCheckCircle className={`${roleConfig.iconColor} mt-0.5 flex-shrink-0`} />
                      <span>{instruction}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              {/* Key Responsibilities */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="p-4 rounded border border-gray-200 bg-gray-50"
              >
                <div className="flex items-center space-x-2 mb-3">
                  <FaNetworkWired className="text-gray-600 text-xl" />
                  <h3 className="font-semibold text-gray-800">Key Responsibilities</h3>
                </div>
                <ul className="space-y-2">
                  {roleConfig.responsibilities.map((responsibility, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      className="flex items-start space-x-2 text-sm text-gray-700"
                    >
                      <FaHeadset className="text-gray-500 mt-0.5 flex-shrink-0" />
                      <span>{responsibility}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>

           {/* Additional User Info */}
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-4 grid grid-cols-5 gap-2"
            >
            {/* Email - Wider */}
            <div className="col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                <FaEnvelope className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="text-blue-700 font-semibold text-xs uppercase tracking-wide">Email</div>
                </div>
                <div className="text-blue-900 font-medium text-sm break-words mt-1">
                {userInfo?.email}
                </div>
            </div>

            {/* Contact - Narrower */}
            <div className="col-span-1 bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                <FaPhone className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="text-green-700 font-semibold text-xs uppercase tracking-wide">Contact</div>
                </div>
                <div className="text-green-900 font-medium text-sm mt-1">
                {userInfo?.phone}
                </div>
            </div>

            {/* Designation - Narrower */}
            <div className="col-span-1 bg-gradient-to-br from-purple-50 to-violet-50 p-3 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2">
                <FaBriefcase className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <div className="text-purple-700 font-semibold text-xs uppercase tracking-wide">Designation</div>
                </div>
                <div className="text-purple-900 font-medium text-sm mt-1">
                {userInfo?.designation}
                </div>
            </div>

            {/* Joining Date - Narrower */}
            <div className="col-span-1 bg-gradient-to-br from-amber-50 to-orange-50 p-3 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2">
                <FaCalendarAlt className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div className="text-amber-700 font-semibold text-xs uppercase tracking-wide">Joining Date</div>
                </div>
                <div className="text-amber-900 font-medium text-sm mt-1">
                {userInfo?.joiningDate ? new Date(userInfo.joiningDate).toLocaleDateString() : 'N/A'}
                </div>
            </div>
            </motion.div>

            {/* Quick Start Tips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="mt-6 bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded border border-gray-200"
            >
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <FaRocket className="text-blue-600" />
                Quick Start Tips
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {/* FIX: Changed text color from default (white) to gray-700 for better visibility */}
                <div className="flex items-start gap-2 text-gray-700">
                  <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Explore the dashboard for real-time system monitoring</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700">
                  <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Check your roster for scheduled shifts and responsibilities</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700">
                  <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Review downtime reports and system performance metrics</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700">
                  <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Access document hub for procedures and guidelines</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="border-t border-gray-200 p-4 bg-gray-50"
          >
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-600 text-center sm:text-left">
                This welcome message appears only on your first login to Nagad SOC Portal
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleChangePassword}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-all font-medium text-sm"
                >
                  Change Password
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded hover:from-gray-700 hover:to-gray-800 transition-all font-medium"
                >
                  Start Exploring
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WelcomeModal;