// components/AdminDashboardSidebar.js
'use client';

import { FaHome, FaUsers, FaCog, FaChartBar, FaDatabase, FaShieldAlt, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { RxActivityLog } from "react-icons/rx";
import { MdOutlineAssignmentLate } from "react-icons/md";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { 
    label: 'Dashboard', 
    icon: <FaHome className="text-xl" />, 
    path: '/admin_dashboard',
    color: 'text-blue-500'
  },
  { 
    label: 'User Management', 
    icon: <FaUsers className="text-xl" />, 
    path: '/admin_dashboard/user',
    color: 'text-purple-500',
    children: [
      { label: 'User List', path: '/admin_dashboard/list_user' },
      { label: 'Add User', path: '/admin_dashboard/add_user' },
    ]
  },
  { 
    label: 'Activity Logs', 
    icon: <RxActivityLog className="text-xl" />, 
    path: '/admin_dashboard/activity_log',
    color: 'text-purple-500'
  },
  { 
    label: 'Roles & Permissions', 
    icon: <MdOutlineAssignmentLate className="text-xl" />, 
    path: '/admin_dashboard/role_permission',
    color: 'text-blue-500'
  },
  { 
    label: 'Analytics', 
    icon: <FaChartBar className="text-xl" />, 
    path: '/admin_dashboard/analytics',
    color: 'text-green-500',
    children: [
      { label: 'Usage Metrics', path: '/admin_dashboard/analytics/usage' },
      { label: 'Performance', path: '/admin_dashboard/analytics/performance' }
    ]
  },
  { 
    label: 'Database', 
    icon: <FaDatabase className="text-xl" />, 
    path: '/admin_dashboard/database',
    color: 'text-yellow-500'
  },
  { 
    label: 'Security', 
    icon: <FaShieldAlt className="text-xl" />, 
    path: '/admin_dashboard/security',
    color: 'text-red-500',
    children: [
      { label: 'Firewall', path: '/admin_dashboard/security/firewall' },
      { label: 'Audit Logs', path: '/admin_dashboard/security/audit' },
      { label: 'Access Control', path: '/admin_dashboard/security/access' }
    ]
  },
  { 
    label: 'System Settings', 
    icon: <FaCog className="text-xl" />, 
    path: '/admin_dashboard/settings',
    color: 'text-cyan-500'
  },
];

export default function AdminDashboardSidebar() {
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