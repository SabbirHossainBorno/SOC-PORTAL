// app/admin_dashboard/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UnplannedPartialChart from '../components/downtime_chart/UnplannedPartial';
import UnplannedFullChart from '../components/downtime_chart/UnplannedFull';
import PlannedPartialChart from '../components/downtime_chart/PlannedPartial';
import PlannedFullChart from '../components/downtime_chart/PlannedFull';
import SummaryReport from '../components/downtime_chart/SummaryReport';
import ReliabilityBarChart from '../components/downtime_chart/ReliabilityBarChart';
import DowntimeTrendChart from '../components/downtime_chart/DowntimeTrendChart';
import AdminDashboardCard from '../components/AdminDashboardCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaUsers, FaChartLine, FaDatabase, FaShieldAlt, FaCog, FaPlus, 
  FaSignInAlt, FaChartPie, FaSync, FaExclamationTriangle, FaCalendarAlt,
  FaUserFriends, FaClock, FaServer, FaMobile, FaWifi, FaCalendarDay,
  FaCalendarCheck, FaIdCard, FaChartBar, FaNetworkWired, FaBell,
  FaChevronRight, FaChevronLeft, FaEye, FaArrowUp, FaArrowDown
} from 'react-icons/fa';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('overview');

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin_dashboard/dashboard_card');
      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format time for downtime duration
  const formatDuration = (hours, minutes) => {
    if (hours === 0 && minutes === 0) return '0m';
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  // Process roster data for horizontal display
  const processRosterData = (roster) => {
    if (!roster) return {
      MORNING: [],
      REGULAR: [],
      NOON: [],
      EVENING: [],
      NIGHT: [],
      OFFDAY: [],
      LEAVE: []
    };
    
    const shifts = {
      MORNING: [],
      REGULAR: [],
      NOON: [],
      EVENING: [],
      NIGHT: [],
      OFFDAY: [],
      LEAVE: []
    };

    // List of fields to exclude (metadata fields)
    const metadataFields = ['serial', 'roster_id', 'date', 'day', 'upload_by', 'created_at', 'updated_at'];
    
    // Process each field in the roster
    Object.entries(roster).forEach(([key, value]) => {
      // Skip metadata fields and empty values
      if (!metadataFields.includes(key) && value && typeof value === 'string') {
        const shiftType = value.toUpperCase().trim();
        // Only process if it's a valid shift type
        if (shifts[shiftType]) {
          // Format member name: capitalize first letter, lowercase the rest
          const memberName = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
          shifts[shiftType].push(memberName);
        }
      }
    });

    return shifts;
  };

  // Format date for display - SIMPLE VERSION
  const formatRosterDate = (roster, isToday = false) => {
    if (!roster) {
      return isToday ? 'Today (No Data)' : 'Tomorrow (No Data)';
    }
    
    // Use the date directly from the roster
    const dateStr = roster.date;
    
    // Extract date parts directly
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year} ${isToday ? '(Today)' : ''}`;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
            <h3 className="text-lg font-bold mb-2">Error Loading Dashboard</h3>
            <p>{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { userSummary, downtimeCounts, downtimeDuration, assetCounts, rosters } = dashboardData;
  
  // Process roster data
  const todayRoster = processRosterData(rosters?.today);
  const tomorrowRoster = processRosterData(rosters?.tomorrow);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded">
                <FaChartLine className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600 text-sm">SOC Portal Operations Overview</p>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats Grid - Enhanced Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* User Summary Card */}
          <AdminDashboardCard
            title="Team Members"
            value={userSummary?.total || 0}
            subtitle="Active Users"
            icon={<FaUserFriends className="text-xl" />}
            color="blue"
          >
            <div className="space-y-2 mt-4">
              {Object.entries(userSummary?.roles || {}).map(([role, count]) => (
                <div key={role} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 capitalize">{role.toLowerCase()}</span>
                  <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded text-xs">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </AdminDashboardCard>

          {/* Downtime Count Card */}
          <AdminDashboardCard
            title="Downtime Incidents"
            value={downtimeCounts?.unique_downtime_count || 0}
            subtitle="This Month"
            icon={<FaExclamationTriangle className="text-xl" />}
            color="red"
          >
            <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
              <div className="flex justify-between items-center bg-red-50 border border-red-100 rounded p-2">
                <span className="text-red-600 font-medium">Partial Unplanned</span>
                <span className="text-red-700 font-bold">{downtimeCounts?.partial_unplanned_count || 0}</span>
              </div>
              <div className="flex justify-between items-center bg-red-50 border border-red-100 rounded p-2">
                <span className="text-red-600 font-medium">Full Unplanned</span>
                <span className="text-red-700 font-bold">{downtimeCounts?.full_unplanned_count || 0}</span>
              </div>
              <div className="flex justify-between items-center bg-green-50 border border-green-100 rounded p-2">
                <span className="text-green-600 font-medium">Partial Planned</span>
                <span className="text-green-700 font-bold">{downtimeCounts?.partial_planned_count || 0}</span>
              </div>
              <div className="flex justify-between items-center bg-green-50 border border-green-100 rounded p-2">
                <span className="text-green-600 font-medium">Full Planned</span>
                <span className="text-green-700 font-bold">{downtimeCounts?.full_planned_count || 0}</span>
              </div>
            </div>
          </AdminDashboardCard>


          {/* Downtime Duration Card */}
          <AdminDashboardCard
            title="Total Downtime"
            value={formatDuration(downtimeDuration?.hours || 0, downtimeDuration?.minutes || 0)}
            subtitle="Cumulative Duration"
            icon={<FaClock className="text-xl" />}
            color="orange"
          >
            <div className="mt-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Incidents</span>
                <span className="font-semibold text-gray-900">{downtimeCounts?.unique_downtime_count || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((downtimeCounts?.unique_downtime_count || 0) * 10, 100)}%` }}
                ></div>
              </div>
            </div>
          </AdminDashboardCard>

          {/* Asset Count Card */}
          <AdminDashboardCard
            title="Asset Inventory"
            value={(assetCounts?.devices || 0) + (assetCounts?.sims || 0)}
            subtitle="Total Assets"
            icon={<FaServer className="text-xl" />}
            color="purple"
          >
            <div className="space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Devices</span>
                </div>
                <span className="font-semibold text-gray-900 bg-purple-100 px-2 py-1 rounded text-sm">
                  {assetCounts?.devices || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">SIM Cards</span>
                </div>
                <span className="font-semibold text-gray-900 bg-indigo-100 px-2 py-1 rounded text-sm">
                  {assetCounts?.sims || 0}
                </span>
              </div>
            </div>
          </AdminDashboardCard>
        </div>

        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminDashboardCard
            title="System Health"
            value="98.5%"
            subtitle="Uptime This Month"
            icon={<FaWifi className="text-xl" />}
            color="green"
          >
            <div className="mt-4">
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <FaArrowUp className="text-xs" />
                <span>+0.2% from last month</span>
              </div>
            </div>
          </AdminDashboardCard>

          <AdminDashboardCard
            title="Active Sessions"
            value="24"
            subtitle="Current Users"
            icon={<FaSignInAlt className="text-xl" />}
            color="indigo"
          >
            <div className="flex space-x-4 mt-4 text-xs">
              <div className="text-center">
                <div className="font-bold text-indigo-700">18</div>
                <div className="text-indigo-600">SOC</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-indigo-700">6</div>
                <div className="text-indigo-600">OPS</div>
              </div>
            </div>
          </AdminDashboardCard>

          <AdminDashboardCard
            title="Pending Alerts"
            value="3"
            subtitle="Require Attention"
            icon={<FaBell className="text-xl" />}
            color="red"
          >
            <div className="flex space-x-3 mt-4 text-xs">
              <div className="text-center">
                <div className="font-bold text-red-700">2</div>
                <div className="text-red-600">High</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-amber-700">1</div>
                <div className="text-amber-600">Medium</div>
              </div>
            </div>
          </AdminDashboardCard>

          <AdminDashboardCard
            title="Performance"
            value="Excellent"
            subtitle="System Metrics"
            icon={<FaChartBar className="text-xl" />}
            color="blue"
          >
            <div className="mt-4">
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <span>All systems normal</span>
              </div>
            </div>
          </AdminDashboardCard>
        </div>

        {/* Roster Schedule Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded shadow">
                <FaCalendarDay className="text-white text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Team Roster Schedule</h2>
                <p className="text-gray-600">Current and upcoming shift assignments</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin_dashboard/role_permission/roster_upload')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded hover:from-blue-700 hover:to-indigo-700 transition-all shadow hover:shadow flex items-center space-x-2 group"
            >
              <FaCalendarCheck className="text-sm transition-transform group-hover:scale-110" />
              <span>Roster Permissions</span>
            </button>
          </div>

          {/* Horizontal Roster Table */}
          <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
              <div className="col-span-3 px-6 py-4">
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">DATE</span>
              </div>
              <div className="col-span-9 grid grid-cols-6">
                {[
                  { name: 'MORNING', color: 'blue' },
                  { name: 'REGULAR', color: 'green' },
                  { name: 'NOON', color: 'amber' },
                  { name: 'EVENING', color: 'purple' },
                  { name: 'NIGHT', color: 'indigo' },
                  { name: 'OFFDAY', color: 'gray' }
                ].map(({ name, color }) => (
                  <div key={name} className="px-4 py-4 text-center">
                    <span className={`text-sm font-semibold text-${color}-700 uppercase tracking-wide`}>
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Roster Row */}
            <div className="grid grid-cols-12 border-b border-gray-100 hover:bg-blue-50 transition-colors duration-200">
              <div className="col-span-3 px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full shadow"></div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {formatRosterDate(rosters?.today, true)}
                    </div>
                    <div className="text-sm text-gray-500 capitalize">
                      {rosters?.today?.day || 'Today'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-9 grid grid-cols-6">
                {['MORNING', 'REGULAR', 'NOON', 'EVENING', 'NIGHT', 'OFFDAY'].map((shiftType) => (
                  <div key={shiftType} className="px-4 py-4 text-center border-l border-gray-100">
                    <div className="space-y-2">
                      {todayRoster[shiftType] && todayRoster[shiftType].length > 0 ? (
                        todayRoster[shiftType].map((member, index) => (
                          <div 
                            key={index} 
                            className={`text-xs font-medium px-3 py-2 rounded transition-all duration-200 hover:scale-105 ${
                              shiftType === 'MORNING' ? 'text-blue-800 bg-blue-100 hover:bg-blue-200' :
                              shiftType === 'REGULAR' ? 'text-green-800 bg-green-100 hover:bg-green-200' :
                              shiftType === 'NOON' ? 'text-amber-800 bg-amber-100 hover:bg-amber-200' :
                              shiftType === 'EVENING' ? 'text-purple-800 bg-purple-100 hover:bg-purple-200' :
                              shiftType === 'NIGHT' ? 'text-indigo-800 bg-indigo-100 hover:bg-indigo-200' :
                              'text-gray-800 bg-gray-200 hover:bg-gray-300 font-bold'
                            }`}
                          >
                            {member}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-400 italic">No assignments</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tomorrow's Roster Row */}
            <div className="grid grid-cols-12 hover:bg-blue-50 transition-colors duration-200">
              <div className="col-span-3 px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-400 rounded-full shadow"></div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {formatRosterDate(rosters?.tomorrow, false)}
                    </div>
                    <div className="text-sm text-gray-500 capitalize">
                      {rosters?.tomorrow?.day || 'Tomorrow'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-9 grid grid-cols-6">
                {['MORNING', 'REGULAR', 'NOON', 'EVENING', 'NIGHT', 'OFFDAY'].map((shiftType) => (
                  <div key={shiftType} className="px-4 py-4 text-center border-l border-gray-100">
                    <div className="space-y-2">
                      {tomorrowRoster[shiftType] && tomorrowRoster[shiftType].length > 0 ? (
                        tomorrowRoster[shiftType].map((member, index) => (
                          <div 
                            key={index} 
                            className={`text-xs font-medium px-3 py-2 rounded transition-all duration-200 hover:scale-105 ${
                              shiftType === 'MORNING' ? 'text-blue-800 bg-blue-100 hover:bg-blue-200' :
                              shiftType === 'REGULAR' ? 'text-green-800 bg-green-100 hover:bg-green-200' :
                              shiftType === 'NOON' ? 'text-amber-800 bg-amber-100 hover:bg-amber-200' :
                              shiftType === 'EVENING' ? 'text-purple-800 bg-purple-100 hover:bg-purple-200' :
                              shiftType === 'NIGHT' ? 'text-indigo-800 bg-indigo-100 hover:bg-indigo-200' :
                              'text-gray-800 bg-gray-200 hover:bg-gray-300 font-bold'
                            }`}
                          >
                            {member}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-400 italic">No assignments</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Downtime Analytics Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded shadow">
                <FaChartPie className="text-white text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Downtime Analytics</h2>
                <p className="text-gray-600">Performance metrics and trend analysis</p>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded border border-gray-200 shadow"
            >
              <FaCalendarAlt className="text-gray-500 text-sm" />
              <span className="text-sm text-gray-700 font-medium">Last 7 days</span>
            </motion.div>
          </div>

          {/* Charts Grid */}
          <div className="space-y-8">
            {/* Top Row - Summary and Reliability */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <SummaryReport />
              <ReliabilityBarChart />
            </motion.div>

            {/* Middle Row - Unplanned and Planned */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
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
              transition={{ delay: 0.7 }}
            >
              <DowntimeTrendChart />
            </motion.div>
          </div>
        </motion.section>
      </div>

    </div>
  );
}