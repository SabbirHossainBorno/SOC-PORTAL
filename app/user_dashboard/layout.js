// app/user_dashboard/layout.js
'use client';

import { useState, useEffect } from 'react';
import UserDashboardSidebar from '../components/UserDashboardSidebar';
import UserDashboardNavbar from '../components/UserDashboardNavbar';
import { motion, AnimatePresence } from 'framer-motion';
import withAuth from '../components/WithAuth';
import { Toaster } from 'react-hot-toast';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

function UserDashboardLayout({ children, authInfo }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sidebarOpen && isMobile && !e.target.closest('#mobile-sidebar') && !e.target.closest('#mobile-menu-button')) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [sidebarOpen, isMobile]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar - Always expanded and fixed */}
      <div className="hidden md:block fixed top-0 left-0 h-screen w-72 bg-white shadow-sm z-30">
        <UserDashboardSidebar />
      </div>
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>
      
      {/* Mobile Sidebar - Increased z-index to 60 */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            id="mobile-sidebar"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 h-screen z-60 bg-white shadow-xl w-72"
          >
            <UserDashboardSidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-72">
        {/* Navbar with z-50 */}
        <UserDashboardNavbar 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
          isMobile={isMobile}
        />
        
        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-white to-gray-50 min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>
      
      {/* Add Toaster component here */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#f0fdf4',
            color: '#15803d',
            padding: '16px',
            border: '1px solid #bbf7d0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            fontSize: '14px',
          },
          success: {
            duration: 5000,
            icon: <FaCheckCircle className="text-green-500" />,
          },
          error: {
            duration: 5000,
            icon: <FaTimesCircle className="text-red-500" />,
            style: {
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              padding: '16px',
              fontSize: '14px',
            },
          },
        }}
      />
    </div>
  );
}

// Wrap with Auth HOC and allow all user roles
export default withAuth(UserDashboardLayout, ['SOC', 'OPS', 'INTERN', 'CTO', 'User']);