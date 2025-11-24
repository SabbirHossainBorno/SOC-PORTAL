// app/user_dashboard/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaChartPie, 
  FaSync, 
  FaExclamationTriangle,
  FaCalendarAlt,
  FaUserGraduate
} from 'react-icons/fa';
import UnplannedPartialChart from '../components/downtime_chart/UnplannedPartial';
import UnplannedFullChart from '../components/downtime_chart/UnplannedFull';
import PlannedPartialChart from '../components/downtime_chart/PlannedPartial';
import PlannedFullChart from '../components/downtime_chart/PlannedFull';
import SummaryReport from '../components/downtime_chart/SummaryReport';
import ReliabilityBarChart from '../components/downtime_chart/ReliabilityBarChart';
import DowntimeTrendChart from '../components/downtime_chart/DowntimeTrendChart';
import UserDashboardCard from '../components/UserDashboardCard';
import LoadingSpinner from '../components/LoadingSpinner';
import WelcomeModal from '../components/WelcomeModal';
import { motion, AnimatePresence } from 'framer-motion';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

// Helper to get cookies
const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
};

export default function UserDashboard() {
  const router = useRouter();
  const [cardsData, setCardsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [roleType, setRoleType] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Live Clock State
  const [currentDateTime, setCurrentDateTime] = useState('');
  
  // Welcome Modal States
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeData, setWelcomeData] = useState(null);
  const [checkingWelcome, setCheckingWelcome] = useState(true);

  // Live Clock Effect
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const formattedTime = now.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }) + ' ' + now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).toUpperCase();
      
      setCurrentDateTime(formattedTime);
    };

    // Update immediately
    updateClock();
    
    // Update every second
    const interval = setInterval(updateClock, 1000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const fetchCardsData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setCardsLoading(true);
      }
      setError(null);
      
      const response = await fetch('/api/user_dashboard/dashboard_card');
      const result = await response.json();
      
      if (result.success) {
        setCardsData(result.data);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        throw new Error(result.message || 'Failed to fetch cards data');
      }
    } catch (error) {
      console.error('Error fetching cards data:', error);
      setError(error.message);
    } finally {
      setCardsLoading(false);
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Check if welcome modal should be shown
  const checkWelcomeStatus = async () => {
    try {
      setCheckingWelcome(true);
      const response = await fetch('/api/welcome-check');
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.showWelcome && result.userInfo) {
          setWelcomeData(result.userInfo);
          setShowWelcomeModal(true);
          
          // Log the welcome modal display
          console.log('Welcome modal shown for first-time user:', result.userInfo.socPortalId);
        }
      } else {
        console.warn('Failed to check welcome status');
      }
    } catch (error) {
      console.error('Error checking welcome status:', error);
    } finally {
      setCheckingWelcome(false);
    }
  };

  useEffect(() => {
    // Get role type from cookies
    const userRoleType = getCookie('roleType');
    setRoleType(userRoleType || '');
    
    // Fetch dashboard data
    fetchCardsData();
    
    // Check welcome status after a short delay
    setTimeout(() => {
      checkWelcomeStatus();
    }, 1000);
    
    // Refresh data every 5 minutes
    const interval = setInterval(() => fetchCardsData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const cardConfigs = [
    {
      type: 'downtimeCount',
      title: 'Downtime Count',
      dataKey: 'downtimeCount'
    },
    {
      type: 'duration',
      title: 'Downtime Duration',
      dataKey: 'duration'
    },
    {
      type: 'myPerformance',
      title: 'My Performance',
      dataKey: 'myPerformance',
      hideForCTO: true
    },
    {
      type: 'todaysRoster',
      title: 'My Roster',
      dataKey: 'todaysRoster',
      hideForOps: true,
      hideForIntern: true,
      hideForCTO: true
    },
    {
      type: 'assignedTask',
      title: 'Assigned Tasks',
      dataKey: 'assignedTask',
      hideForOps: true,
      hideForCTO: true
    },
    {
      type: 'deviceCount',
      title: 'Device Status',
      dataKey: 'deviceCount',
      hideForCTO: true
    },
    {
      type: 'simCount',
      title: 'SIM Cards',
      dataKey: 'simCount',
      hideForCTO: true
    },
    {
      type: 'mailQueue',
      title: 'Mail Queue',
      dataKey: 'mailQueue',
      hideForIntern: true,
      hideForCTO: true
    },
    {
      type: 'document',
      title: 'Access Documents',
      dataKey: 'document',
      hideForCTO: true
    },
    {
      type: 'totalActivity',
      title: 'Total Activity',
      dataKey: 'totalActivity'
    }
  ];

  // Filter cards based on user role
  const filteredCards = cardConfigs.filter(card => {
    if (roleType === 'OPS' && card.hideForOps) return false;
    if (roleType === 'INTERN' && card.hideForIntern) return false;
    if (roleType === 'CTO' && card.hideForCTO) return false;
    return true;
  });

  const handleRefresh = () => {
    fetchCardsData(true);
  };

  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false);
  };

  // Show loading spinner only when both loading and checking welcome
  if (loading && checkingWelcome) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Welcome Modal */}
      <WelcomeModal 
        isOpen={showWelcomeModal}
        onClose={handleCloseWelcomeModal}
        userInfo={welcomeData}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard Header - Professional with Live Clock */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3"
        >
          {/* Left Side - Title with Refresh Icon */}
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div className="flex-1">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-3"
              >
                User Dashboard
                {/* Refresh Button - Icon Only for Mobile */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="lg:hidden flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 disabled:opacity-50"
                  title="Refresh Data"
                >
                  <motion.div
                    animate={{ rotate: refreshing ? 360 : 0 }}
                    transition={{ duration: refreshing ? 1 : 0, repeat: refreshing ? Infinity : 0 }}
                  >
                    <FaSync size={12} />
                  </motion.div>
                </motion.button>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-gray-600 mt-1 text-sm lg:text-base"
              >
                Welcome Back! Here&apos;s Your Real-Time Nagad System Overview
              </motion.p>
            </div>
          </div>
          
          {/* Right Side - Live Clock, Updated, and Desktop Refresh */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-row items-center gap-2 w-full lg:w-auto"
          >
            {/* Live Clock and Updated in Single Row for Mobile */}
            <div className="flex flex-row items-center gap-2 flex-1 lg:flex-none">
              {/* Live Clock - Professional Blue */}
              <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-2 lg:py-2 rounded border border-blue-200 flex-1 lg:flex-none justify-center lg:justify-start min-h-[36px]">
                <FaCalendarAlt className="text-blue-600 flex-shrink-0" size={12} />
                <span className="text-xs lg:text-sm font-medium truncate">
                  {currentDateTime}
                </span>
              </div>
              
              {/* Updated Time - Professional Green */}
              <div className="flex items-center text-xs lg:text-sm text-green-800 bg-green-50 px-3 py-2 lg:py-2 rounded border border-green-200 flex-1 lg:flex-none justify-center lg:justify-start min-h-[36px] font-medium">
                Updated: {lastUpdated}
              </div>
            </div>
            
            {/* Refresh Button - Professional for Desktop */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRefresh}
              disabled={refreshing}
              className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded border border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 min-h-[36px] font-medium"
            >
              <motion.div
                animate={{ rotate: refreshing ? 360 : 0 }}
                transition={{ duration: refreshing ? 1 : 0, repeat: refreshing ? Infinity : 0 }}
              >
                <FaSync size={14} />
              </motion.div>
              <span className="text-sm font-medium">
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </span>
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Role-based Information Banner - Professional */}
        <AnimatePresence>
          {roleType === 'INTERN' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-blue-50 border border-blue-200 rounded p-3 mb-4"
            >
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-blue-100 rounded flex-shrink-0">
                  <FaUserGraduate className="text-blue-600" size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-blue-900 mb-1 text-sm">Intern Access</h3>
                  <p className="text-blue-700 text-xs leading-relaxed">
                    You are viewing the intern dashboard with essential metrics for learning and development. 
                    Some advanced features are limited as per company policy.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Stats Cards Section - Professional Header */}
        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="p-1.5 bg-blue-100 rounded">
                <FaChartPie className="text-blue-600" size={16} />
              </div>
              <div>
                <h2 className="text-lg lg:text-xl font-bold text-gray-800">Quick Overview</h2>
                <p className="text-gray-600 text-xs lg:text-sm">Real-time metrics and performance indicators</p>
              </div>
            </motion.div>
          </div>
          
          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-red-50 border border-red-200 rounded p-4 text-center"
              >
                <FaExclamationTriangle className="text-red-500 text-xl mx-auto mb-2" />
                <h3 className="text-red-800 font-semibold mb-1 text-sm">Failed to load dashboard cards</h3>
                <p className="text-red-600 text-xs mb-3">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-medium"
                >
                  Try Again
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="cards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {filteredCards.map((card, index) => (
                  <UserDashboardCard
                    key={card.type}
                    title={card.title}
                    type={card.type}
                    data={cardsData?.[card.dataKey]}
                    lastUpdated={lastUpdated}
                    hideForOps={card.hideForOps}
                    hideForIntern={card.hideForIntern}
                    hideForCTO={card.hideForCTO}
                    isLoading={!cardsData}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Downtime Charts Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="p-2 bg-purple-100 rounded">
                <FaChartPie className="text-purple-600" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Downtime Analysis</h2>
                <p className="text-gray-600 text-sm">Performance metrics across different downtime types</p>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1 rounded border border-gray-200"
            >
              <FaCalendarAlt className="text-gray-500" size={14} />
              <span className="text-sm text-gray-700 font-medium">Last 7 days</span>
            </motion.div>
          </div>

          {/* Charts Grid */}
          <div className="space-y-8">
            {/* Top Row - Summary and Reliability */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <SummaryReport />
              <ReliabilityBarChart />
            </motion.div>

            {/* Middle Row - Unplanned and Planned */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <UnplannedPartialChart />
              <UnplannedFullChart />
              <PlannedPartialChart />
              <PlannedFullChart />
            </motion.div>

            {/* Bottom Row - Trend Analysis */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <DowntimeTrendChart />
            </motion.div>
          </div>
        </motion.section>

        {/* Information Section for OPS Users */}
        {roleType === 'OPS' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="bg-blue-50 border border-blue-200 rounded p-6 mb-8"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded">
                <FaExclamationTriangle className="text-blue-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">OPS User Access</h3>
                <p className="text-blue-700 text-sm">
                  Some dashboard features are limited for OPS users as per security policy. 
                  Contact SOC team for additional access requirements.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}