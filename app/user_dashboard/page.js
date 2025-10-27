// app/user_dashboard/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaChartPie, 
  FaSync, 
  FaExclamationTriangle,
  FaCalendarAlt
} from 'react-icons/fa';
import UnplannedPartialChart from '../components/downtime_chart/UnplannedPartial';
import UnplannedFullChart from '../components/downtime_chart/UnplannedFull';
import PlannedPartialChart from '../components/downtime_chart/PlannedPartial';
import PlannedFullChart from '../components/downtime_chart/PlannedFull';
import SummaryReport from '../components/downtime_chart/SummaryReport';
import ReliabilityBarChart from '../components/downtime_chart/ReliabilityBarChart';
import DowntimeTrendChart from '../components/downtime_chart/DowntimeTrendChart';
import UserDashboardCard from '../components/UserDashboardCard';
import LoadingSpinner from '../components/LoadingSpinner'
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

  useEffect(() => {
    // Get role type from cookies
    const userRoleType = getCookie('roleType');
    setRoleType(userRoleType || '');
    
    fetchCardsData();
    
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
      dataKey: 'myPerformance'
    },
    {
      type: 'todaysRoster',
      title: 'Today\'s Roster',
      dataKey: 'todaysRoster',
      hideForOps: true
    },
    {
      type: 'assignedTask',
      title: 'Assigned Tasks',
      dataKey: 'assignedTask',
      hideForOps: true
    },
    {
      type: 'deviceCount',
      title: 'Device Status',
      dataKey: 'deviceCount'
    },
    {
      type: 'simCount',
      title: 'SIM Cards',
      dataKey: 'simCount'
    },
    {
      type: 'mailQueue',
      title: 'Mail Queue',
      dataKey: 'mailQueue'
    },
    {
      type: 'document',
      title: 'Access Documents',
      dataKey: 'document'
    },
    {
      type: 'totalActivity',
      title: 'Total Activity',
      dataKey: 'totalActivity'
    }
  ];

  // Filter cards based on user role
  const filteredCards = cardConfigs.filter(card => 
    !(roleType === 'OPS' && card.hideForOps)
  );

  const handleRefresh = () => {
    fetchCardsData(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
        >
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl sm:text-3xl font-bold text-gray-800"
            >
              User Dashboard
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-gray-600 mt-2"
            >
              Welcome Back! Here&apos;s Your Real-Time Nagad System Overview
            </motion.p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4"
          >
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1 rounded border border-gray-200">
              <FaCalendarAlt className="text-gray-500" size={14} />
              <span className="text-sm text-gray-700 font-medium">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
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

        {/* Quick Stats Cards Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="p-2 bg-blue-100 rounded">
                <FaChartPie className="text-blue-600" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Quick Overview</h2>
                <p className="text-gray-600 text-sm">Real-time metrics and performance indicators</p>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-gray-500 bg-white/80 backdrop-blur-sm px-3 py-1 rounded border border-gray-200"
            >
              Updated: {lastUpdated}
            </motion.div>
          </div>
          
          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-red-50 border border-red-200 rounded p-6 text-center"
              >
                <FaExclamationTriangle className="text-red-500 text-2xl mx-auto mb-3" />
                <h3 className="text-red-800 font-semibold mb-2">Failed to load dashboard cards</h3>
                <p className="text-red-600 text-sm mb-4">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Try Again
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="cards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {filteredCards.map((card, index) => (
                  <UserDashboardCard
                    key={card.type}
                    title={card.title}
                    type={card.type}
                    data={cardsData?.[card.dataKey]}
                    lastUpdated={lastUpdated}
                    hideForOps={card.hideForOps}
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

        {/* Information Section */}
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