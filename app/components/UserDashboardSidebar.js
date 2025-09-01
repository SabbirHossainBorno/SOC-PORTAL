// components/UserDashboardSidebar.js
'use client';

import { 
  FaHome, FaExclamationTriangle, FaTasks, FaEnvelope, 
  FaFileAlt, FaChartLine, FaCalendarAlt, FaChevronDown,
  FaBook, FaHistory  // Added new icons
} from 'react-icons/fa';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { 
    label: 'Dashboard', 
    icon: <FaHome className="text-xl" />, 
    path: '/user_dashboard',
    color: 'text-blue-500'
  },
  { 
    label: 'Service Downtime', 
    icon: <FaExclamationTriangle className="text-xl" />, 
    path: '/user_dashboard/downtime',
    color: 'text-red-500',
    children: [
      { label: 'Report Downtime', path: '/user_dashboard/report_downtime' },
      { label: 'Downtime Logs', path: '/user_dashboard/downtime_log' }
    ]
  },
  { 
    label: 'Task Management', 
    icon: <FaTasks className="text-xl" />, 
    path: '/user_dashboard/tasks',
    color: 'text-purple-500',
    children: [
      { label: 'Assign Task', path: '/user_dashboard/assign_task' },
      { label: 'My Tasks', path: '/user_dashboard/my_task' },
      { label: 'Task Archive', path: '/user_dashboard/task_history' }
    ]
  },
  { 
    label: 'Mail Center', 
    icon: <FaEnvelope className="text-xl" />, 
    path: '/user_dashboard/mail',
    color: 'text-yellow-500',
    children: [
      { label: "Track Today's Mail", path: '/user_dashboard/track_todays_mail' },
      { label: 'Mail Log', path: '/user_dashboard/mail_log' },
      { label: 'Mail Queue', path: '/user_dashboard/mail_queue' }
    ]
  },
  { 
    label: 'Document Hub', 
    icon: <FaFileAlt className="text-xl" />, 
    path: '/user_dashboard/documents',
    color: 'text-green-500',
    children: [
      { label: 'Access Form Tracker', path: '/user_dashboard/document_hub/access_form_tracker' },
      { label: 'Access Form Log', path: '/user_dashboard/document_hub/access_form_log' },
      { label: 'Other Document Tracker', path: '/user_dashboard/document_hub/other_document_tracker' },
      { label: 'Other Document Log', path: '/user_dashboard/document_hub/other_document_log' }
    ]
  },
  { 
    label: 'Performance Reports', 
    icon: <FaChartLine className="text-xl" />, 
    path: '/user_dashboard/reports',
    color: 'text-cyan-500',
    children: [
      { label: 'Weekly Analysis', path: '/user_dashboard/weekly_report' },
      { label: 'Monthly Summary', path: '/user_dashboard/monthly_report' },
      { label: 'Annual Review', path: '/user_dashboard/annual_report' }
    ]
  },
  { 
    label: 'Roster Management', 
    icon: <FaCalendarAlt className="text-xl" />, 
    path: '/user_dashboard/roster',
    color: 'text-orange-500',
    children: [
      { label: 'Roster Schedule', path: '/user_dashboard/roster/roster_schedule' },
      { label: 'My Roster', path: '/user_dashboard/roster/my_roster' },
      { label: 'Create Roster', path: '/user_dashboard/roster/create_roster' }
    ]
  },
  // NEW: Knowledge Station
  { 
    label: 'Knowledge Station', 
    icon: <FaBook className="text-xl" />, 
    path: '/user_dashboard/knowledge_station',
    color: 'text-indigo-500'
  },
  // NEW: Activity Log
  { 
    label: 'Activity Log', 
    icon: <FaHistory className="text-xl" />, 
    path: '/user_dashboard/activity_log',
    color: 'text-amber-500'
  },
];

export default function UserDashboardSidebar() {
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState({});

  useEffect(() => {
    const initialStates = {};
    navItems.forEach(item => {
      const isActive = pathname === item.path || 
        (item.children && item.children.some(child => pathname === child.path));
      
      if (item.children) {
        initialStates[item.label] = isActive || item.children.some(child => pathname === child.path);
      }
    });
    setOpenDropdowns(initialStates);
  }, [pathname]);

  const toggleDropdown = (label) => {
    setOpenDropdowns(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isItemActive = (item) => {
    return pathname === item.path || 
      (item.children && item.children.some(child => pathname === child.path));
  };

  const isChildActive = (childPath) => {
    return pathname === childPath;
  };

  return (
    <aside className="h-full flex flex-col bg-white border-r border-gray-100 shadow-sm">
      {/* Brand Header */}
      <div className="p-4 border-b border-gray-100 flex flex-col items-center">
        <div className="flex items-center justify-center">
          <Image
            src="/logo/Nagad_Horizontal_Logo.svg"
            alt="Nagad Logo"
            width={150}
            height={40}
            priority
          />
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-5 px-3">
        {navItems.map((item) => (
          <div key={item.label} className="mb-1">
            {item.children ? (
              <>
                <button
                  onClick={() => toggleDropdown(item.label)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded text-sm font-medium cursor-pointer transition-all ${
                    isItemActive(item)
                      ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <span className={`mr-3 ${item.color}`}>{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <motion.span 
                    animate={{ rotate: openDropdowns[item.label] ? 0 : -90 }}
                    className="text-gray-400 text-xs"
                  >
                    <FaChevronDown />
                  </motion.span>
                </button>
                
                <AnimatePresence>
                  {openDropdowns[item.label] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-8 py-2 space-y-1">
                        {item.children.map((child) => (
                          <Link key={child.label} href={child.path}>
                            <motion.div
                              className={`flex items-center pl-5 pr-3 py-2.5 rounded text-sm font-medium cursor-pointer transition-all relative ${
                                isChildActive(child.path)
                                  ? 'text-blue-600 bg-blue-50'
                                  : 'text-gray-500 hover:bg-gray-100'
                              }`}
                              whileHover={{ x: 5 }}
                            >
                              {/* Connection line */}
                              <div className="absolute left-0 top-1/2 w-4 h-[1px] bg-gray-300"></div>
                              
                              {/* Indicator */}
                              <div className={`absolute left-0 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full ${
                                isChildActive(child.path) 
                                  ? 'bg-blue-500 border-2 border-white shadow' 
                                  : 'bg-gray-300'
                              }`}></div>
                              
                              <span className="ml-4">{child.label}</span>
                            </motion.div>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <Link href={item.path}>
                <div
                  className={`flex items-center px-4 py-3 rounded text-sm font-medium cursor-pointer transition-all ${
                    isItemActive(item)
                      ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className={`mr-3 ${item.color}`}>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}