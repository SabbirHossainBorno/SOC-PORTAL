// app/admin_dashboard/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaUsers, FaChartLine, FaDatabase, FaShieldAlt, FaCog, FaPlus } from 'react-icons/fa';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    users: 0,
    active: 0,
    storage: 0,
    incidents: 0
  });

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
      link: '/admin_dashboard/users'
    },
    { 
      title: 'System Analytics', 
      icon: <FaChartLine className="text-green-500 text-xl" />,
      value: stats.active,
      label: 'Active Users',
      link: '/admin_dashboard/analytics'
    },
    { 
      title: 'Database', 
      icon: <FaDatabase className="text-purple-500 text-xl" />,
      value: `${stats.storage} GB`,
      label: 'Storage Used',
      link: '/admin_dashboard/database'
    },
    { 
      title: 'Security', 
      icon: <FaShieldAlt className="text-red-500 text-xl" />,
      value: stats.incidents,
      label: 'Security Incidents',
      link: '/admin_dashboard/security'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, index) => (
          <div 
            key={index}
            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm">{card.title}</p>
                  <h3 className="text-2xl font-bold text-gray-800 mt-1">
                    {card.value}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">{card.label}</p>
                </div>
                <div className="p-2 bg-gray-100 rounded-lg">
                  {card.icon}
                </div>
              </div>
              <button 
                onClick={() => router.push(card.link)}
                className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
              >
                View details
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all
          </button>
        </div>
        
        <div className="divide-y">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="p-5 flex items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <FaCog className="text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-800">System configuration updated</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Security settings were modified by Admin
                </p>
                <p className="text-gray-500 text-xs mt-2">2 hours ago</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <FaPlus className="text-blue-600 text-xl" />
            </div>
            <span className="font-medium text-gray-800">Add User</span>
          </button>
          
          <button className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <FaChartLine className="text-green-600 text-xl" />
            </div>
            <span className="font-medium text-gray-800">Generate Report</span>
          </button>
          
          <button className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
              <FaDatabase className="text-purple-600 text-xl" />
            </div>
            <span className="font-medium text-gray-800">Backup Data</span>
          </button>
          
          <button className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <FaShieldAlt className="text-red-600 text-xl" />
            </div>
            <span className="font-medium text-gray-800">Security Scan</span>
          </button>
        </div>
      </div>
    </div>
  );
}