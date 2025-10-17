// app/user_dashboard/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaUsers, FaChartLine, FaDatabase, FaShieldAlt, 
  FaCog, FaPlus, FaChartPie, FaCalendarAlt, FaSearch
} from 'react-icons/fa';
import UnplannedPartialChart from '../components/downtime_chart/UnplannedPartial';
import UnplannedFullChart from '../components/downtime_chart/UnplannedFull';
import PlannedPartialChart from '../components/downtime_chart/PlannedPartial';
import PlannedFullChart from '../components/downtime_chart/PlannedFull';
import { motion } from 'framer-motion';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

export default function UserDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    users: 0,
    active: 0,
    storage: 0,
    incidents: 0
  });
  
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Simulate loading stats
    setTimeout(() => {
      setStats({
        users: 142,
        active: 128,
        storage: 2.4,
        incidents: 7
      });
    }, 800);
  }, []);

  // Dashboard cards
  const cards = [
    { 
      title: 'User Management', 
      icon: <FaUsers className="text-blue-500 text-xl" />,
      value: stats.users,
      label: 'Total Users',
      link: '/user_dashboard/users',
      color: 'blue'
    },
    { 
      title: 'System Analytics', 
      icon: <FaChartLine className="text-green-500 text-xl" />,
      value: stats.active,
      label: 'Active Users',
      link: '/user_dashboard/analytics',
      color: 'green'
    },
    { 
      title: 'Database', 
      icon: <FaDatabase className="text-purple-500 text-xl" />,
      value: `${stats.storage} GB`,
      label: 'Storage Used',
      link: '/user_dashboard/database',
      color: 'purple'
    },
    { 
      title: 'Security', 
      icon: <FaShieldAlt className="text-red-500 text-xl" />,
      value: stats.incidents,
      label: 'Security Incidents',
      link: '/user_dashboard/security',
      color: 'red'
    }
  ];

  // Recent activity data
  const recentActivities = [
    { id: 1, title: 'System configuration updated', description: 'Security settings were modified by Admin', time: '2 hours ago', icon: <FaCog className="text-blue-600" /> },
    { id: 2, title: 'New user registered', description: 'John Doe joined the platform', time: '5 hours ago', icon: <FaUsers className="text-green-600" /> },
    { id: 3, title: 'Database backup completed', description: 'Nightly backup successful', time: 'Yesterday', icon: <FaDatabase className="text-purple-600" /> },
    { id: 4, title: 'Security alert resolved', description: 'False positive alert closed', time: '2 days ago', icon: <FaShieldAlt className="text-red-600" /> }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Dashboard Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">System Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here&apos;s your system overview</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search dashboard..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
          />
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden`}
          >
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600 text-sm">{card.title}</p>
                  <h3 className="text-2xl font-bold text-gray-800 mt-1">
                    {card.value}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">{card.label}</p>
                </div>
                <div className={`p-3 rounded-lg bg-${card.color}-50`}>
                  {card.icon}
                </div>
              </div>
              <button 
                onClick={() => router.push(card.link)}
                className={`mt-4 text-${card.color}-600 hover:text-${card.color}-800 text-sm font-medium flex items-center`}
              >
                View details
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
            <div className={`h-1 bg-${card.color}-500`}></div>
          </motion.div>
        ))}
      </div>

      {/* Downtime Charts Section - 2x2 grid */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <FaChartPie className="mr-2 text-blue-500" />
              Downtime Analysis
            </h2>
            <p className="text-sm text-gray-600 mt-1">Performance metrics across different downtime types</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
            <FaCalendarAlt className="text-gray-500" />
            <span className="text-sm text-gray-700">Last 7 days</span>
          </div>
        </div>
        
        {/* 2x2 grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UnplannedPartialChart />
          <UnplannedFullChart />
          <PlannedPartialChart />
          <PlannedFullChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
              View all
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
          
          <div className="divide-y">
            {recentActivities.map((activity) => (
              <motion.div 
                key={activity.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-5 flex items-start hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100">
                  {activity.icon}
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <h3 className="font-medium text-gray-800">{activity.title}</h3>
                  <p className="text-gray-600 text-sm mt-1 truncate">
                    {activity.description}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">{activity.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4">
            <motion.button 
              whileHover={{ y: -3 }}
              className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FaPlus className="text-blue-600 text-xl" />
              </div>
              <div>
                <span className="font-medium text-gray-800 block">Add User</span>
                <span className="text-sm text-gray-600 mt-1">Create new user account</span>
              </div>
            </motion.button>
            
            <motion.button 
              whileHover={{ y: -3 }}
              className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <FaChartLine className="text-green-600 text-xl" />
              </div>
              <div>
                <span className="font-medium text-gray-800 block">Generate Report</span>
                <span className="text-sm text-gray-600 mt-1">Create performance report</span>
              </div>
            </motion.button>
            
            <motion.button 
              whileHover={{ y: -3 }}
              className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <FaDatabase className="text-purple-600 text-xl" />
              </div>
              <div>
                <span className="font-medium text-gray-800 block">Backup Data</span>
                <span className="text-sm text-gray-600 mt-1">Initiate system backup</span>
              </div>
            </motion.button>
            
            <motion.button 
              whileHover={{ y: -3 }}
              className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <FaShieldAlt className="text-red-600 text-xl" />
              </div>
              <div>
                <span className="font-medium text-gray-800 block">Security Scan</span>
                <span className="text-sm text-gray-600 mt-1">Run security audit</span>
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}