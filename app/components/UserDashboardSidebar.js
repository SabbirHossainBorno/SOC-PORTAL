// components/UserDashboardSidebar.js
'use client';

import { 
  FaHome, FaExclamationTriangle, FaTasks, FaEnvelope, 
  FaFileAlt, FaChartLine, FaCalendarAlt, FaChevronDown,
  FaBook, FaHistory
} from 'react-icons/fa';
import { BsMotherboardFill } from "react-icons/bs";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const UserDashboardSidebar = () => {
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [allowedMenus, setAllowedMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  const allNavItems = [
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
        { label: 'Assign Task', path: '/user_dashboard/task_management/assign_task' },
        { label: 'My Tasks', path: '/user_dashboard/task_management/my_task' },
        { label: 'Task Archive', path: '/user_dashboard/task_management/task_history' }
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
        { label: 'Document Tracker', path: '/user_dashboard/document_hub/other_document_tracker' },
        { label: 'Document Log', path: '/user_dashboard/document_hub/other_document_log' }
      ]
    },
    { 
      label: 'Operational Task', 
      icon: <BsMotherboardFill className="text-xl" />, 
      path: '/user_dashboard/operational_task',
      color: 'text-slate-500',
      children: [
        { label: 'Fee-Com Calculation', path: '/user_dashboard/operational_task/fee_com_cal' },
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
    { 
      label: 'Knowledge Station', 
      icon: <FaBook className="text-xl" />, 
      path: '/user_dashboard/knowledge_station',
      color: 'text-indigo-500'
    },
    { 
      label: 'Activity Log', 
      icon: <FaHistory className="text-xl" />, 
      path: '/user_dashboard/activity_log',
      color: 'text-amber-500'
    },
  ];

  useEffect(() => {
    fetchUserPermissions();
  }, []);

  useEffect(() => {
    const initialStates = {};
    allNavItems.forEach(item => {
      const isActive = pathname.startsWith(item.path) || 
        (item.children && item.children.some(child => pathname.startsWith(child.path)));

      if (item.children) {
        initialStates[item.label] = isActive;
      }
    });
    setOpenDropdowns(initialStates);
  }, [pathname]);

  const fetchUserPermissions = async () => {
    try {
      // Get user info from cookies
      const cookies = document.cookie.split(';');
      const socPortalIdCookie = cookies.find(c => c.trim().startsWith('socPortalId='));
      const roleTypeCookie = cookies.find(c => c.trim().startsWith('roleType='));
      
      if (socPortalIdCookie && roleTypeCookie) {
        const socPortalId = socPortalIdCookie.split('=')[1];
        const roleType = roleTypeCookie.split('=')[1];

        const response = await fetch(
          `/api/admin_dashboard/role_permission/role_management/user_permissions?soc_portal_id=${socPortalId}&role_type=${roleType}`
        );
        const data = await response.json();
        
        if (data.success) {
          setAllowedMenus(data.permissions);
        }
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = (label) => {
    setOpenDropdowns(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isItemAllowed = (item) => {
  if (loading) return false;
  
  // Skip hidden items entirely
  if (item.isHidden) return false;
  
  // Check if the item itself is allowed
  const itemAllowed = allowedMenus.includes(item.path);
  
  // If item has children, check if any child is allowed (and not hidden)
  if (item.children && item.children.length > 0) {
    const hasAllowedChild = item.children.some(child => 
      !child.isHidden && allowedMenus.includes(child.path)
    );
    return itemAllowed || hasAllowedChild;
  }
  
  return itemAllowed;
};

  const isItemActive = (item) => {
    if (item.children) {
      return item.children.some(child => pathname.startsWith(child.path));
    } else {
      return pathname === item.path;
    }
  };

  const isChildActive = (childPath) => {
    return pathname.startsWith(childPath);
  };

  // Filter nav items based on permissions
  const navItems = allNavItems.filter(isItemAllowed);

  if (loading) {
    return (
      <aside className="h-full flex flex-col bg-white border-r border-gray-100 shadow-sm">
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
        <div className="flex-1 flex items-center justify-center space-x-2">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="w-3 h-3 bg-gradient-to-br from-red-600 to-orange-600 rounded-full animate-bounce"
              style={{
                animationDelay: `${index * 0.1}s`,
                animationDuration: '0.6s'
              }}
            ></div>
          ))}
        </div>
      </aside>
    );
  }

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
                        {item.children
                          .filter(child => allowedMenus.includes(child.path)) // Filter children based on permissions
                          .map((child) => (
                          <Link key={child.label} href={child.path}>
                            <motion.div
                              className={`flex items-center pl-5 pr-3 py-2.5 rounded text-sm font-medium cursor-pointer transition-all relative ${
                                isChildActive(child.path)
                                  ? 'text-blue-600 bg-blue-50'
                                  : 'text-gray-500 hover:bg-gray-100'
                              }`}
                              whileHover={{ x: 5 }}
                            >
                              <div className="absolute left-0 top-1/2 w-4 h-[1px] bg-gray-300"></div>
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
};

export default UserDashboardSidebar;