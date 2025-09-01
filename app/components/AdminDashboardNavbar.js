// components/AdminDashboardNavbar.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaBell, FaCog, FaSignOutAlt, FaUser, FaBars, FaRegCommentDots, FaUserCircle, FaLock, FaCheck, FaTimes } from 'react-icons/fa';
import { DateTime } from 'luxon';
import toast from 'react-hot-toast';

export default function AdminDashboardNavbar({ onMenuToggle, isMobile }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationExpanded, setNotificationExpanded] = useState(false);

  // Get cookies with proper decoding
  const getCookie = (name) => {
    try {
      if (typeof document === 'undefined') return null;
      
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      
      if (parts.length === 2) {
        return decodeURIComponent(parts.pop().split(';').shift());
      }
      return null;
    } catch (error) {
      console.error('Error reading cookie:', error);
      return null;
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
  try {
    console.log('Fetching notifications from API...');
    const response = await fetch('/api/admin_dashboard/notification');
    
    console.log('Response status:', response.status);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API response data:', data);
    
    // Transform data to match expected format
    const transformedData = Array.isArray(data) ? data.map(item => ({
      ...item,
      read: item.read === true || item.status === 'Read'
    })) : [];

    console.log('Transformed notifications:', transformedData);
    
    setNotifications(transformedData);
    setUnreadCount(transformedData.filter(n => !n.read).length);
  } catch (error) {
    console.error('Notification fetch error:', error);
    setNotifications([]);
    setUnreadCount(0);
  }
};

  // Mark notification as read
  const markAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch(`/api/admin_dashboard/notification/${id}`, {
        method: 'PUT'
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => prev - 1);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  // Mark all as read
  const markAllAsRead = async (e) => {
    e.stopPropagation();
    try {
      // Find all unread notifications
      const unreadIds = notifications
        .filter(n => !n.read)
        .map(n => n.id);
      
      // Update all unread notifications
      await Promise.all(
        unreadIds.map(id => 
          fetch(`/api/admin_dashboard/notification/${id}`, { method: 'PUT' })
        )
      );
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        
        // Get admin ID from cookies
        const adminId = getCookie('socPortalId');
        
        if (!adminId) {
          console.warn('[NAVBAR] No admin ID found in cookies');
          setLoading(false);
          return;
        }

        // Fetch admin data from API
        const response = await fetch(`/api/admin_dashboard/admin_info?id=${adminId}`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Get login time from cookies
        const loginTime = getCookie('loginTime');
        
        setUserData({
          ...data,
          loginTime: loginTime 
            ? DateTime.fromISO(loginTime).toFormat('MMM dd, yyyy hh:mm a')
            : 'Unknown',
          profilePhoto: '/image/admin_dp/admin_dp.jpg'
        });

      } catch (error) {
        console.error('[NAVBAR] Failed to fetch admin data:', error);
        
        // Fallback to cookies
        const email = getCookie('email');
        const id = getCookie('socPortalId');
        const role = getCookie('roleType');
        const loginTime = getCookie('loginTime');
        
        if (id) {
          setUserData({
            email: email || 'Unknown',
            id: id,
            role: role || 'Admin',
            firstName: 'Admin',
            lastName: 'User',
            loginTime: loginTime 
              ? DateTime.fromISO(loginTime).toFormat('MMM dd, yyyy hh:mm a')
              : 'Unknown',
            profilePhoto: '/image/admin_dp/admin_dp.jpg'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
        setNotificationExpanded(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

const handleLogout = async () => {
  const toastId = toast.loading('Logging Out...', {
    position: 'top-right',
    style: {
      background: '#f0fdf4',
      color: '#15803d',
      padding: '16px',
      border: '1px solid #bbf7d0',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      fontSize: '14px',
    }
  });
  
  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    });

    const result = await response.json();

    if (response.ok) {
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userId');
      localStorage.removeItem('userRole');
      localStorage.removeItem('loginTime');
      
      toast.success('Logout Successful!', {
        id: toastId,
        duration: 2000,
        style: {
          background: '#f0fdf4',
          color: '#15803d',
          padding: '16px',
          border: '1px solid #bbf7d0',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          fontSize: '14px',
        }
      });
      
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);
    } else {
      toast.error(`Logout Failed: ${result.message || 'Unknown Error'}`, {
        id: toastId,
        duration: 4000,
        style: {
          background: '#fef2f2',
          color: '#b91c1c',
          border: '1px solid #fecaca',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          padding: '16px',
          fontSize: '14px',
        }
      });
    }
  } catch (error) {
    toast.error(`Network Error: ${error.message}`, {
      id: toastId,
      duration: 4000,
      style: {
        background: '#fef2f2',
        color: '#b91c1c',
        border: '1px solid #fecaca',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        padding: '16px',
        fontSize: '14px',
      }
    });
  }
};

  // Display loading state
  if (loading) {
    return (
      <header className="sticky top-0 z-50 bg-white shadow-sm h-16 flex items-center px-4 sm:px-6 border-b border-gray-200">
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">
            SOC Admin Dashboard
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-gray-200 border-2 border-dashed rounded w-10 h-10 animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm h-16 flex items-center px-4 sm:px-6 border-b border-gray-200">
      {/* Mobile menu button */}
      <button 
        onClick={onMenuToggle}
        className="mr-3 p-2 rounded text-gray-700 hover:bg-gray-100 focus:outline-none md:hidden transition-all duration-200"
        aria-label="Toggle sidebar"
      >
        <FaBars className="h-5 w-5" />
      </button>

      {/* Title */}
      <div className="flex-1">
        <h1 className="text-lg sm:text-xl font-bold text-gray-800">
          SOC PORTAL
        </h1>
      </div>

      {/* Right side controls */}
      <div className="flex items-center space-x-4 sm:space-x-5">
        {/* Notification Icon - Enhanced */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-0 relative transition-all duration-200 group"
            aria-label="Notifications"
          >
            <div className="relative">
              <FaBell className="h-6 w-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-xs text-white font-bold border-2 border-white shadow-sm">
                  {unreadCount}
                </span>
              )}
            </div>
          </button>

          {/* Notification Tray - Responsive Design */}
          {notificationsOpen && (
  <div 
    className={`absolute ${
      isMobile ? 'left-1/2 transform -translate-x-1/2' : 'right-0'
    } mt-2 w-[90vw] max-w-md sm:w-96 bg-white border border-gray-200 rounded shadow-xl z-40 overflow-hidden`}
  >
    <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
      <h3 className="font-bold text-gray-800 text-base">Notifications</h3>
      <div className="flex items-center space-x-2">
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          {unreadCount} unread
        </span>
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full hover:bg-green-200 transition-colors"
          >
            Mark All Read
          </button>
        )}
      </div>
    </div>
    
    <div className={`max-h-[60vh] overflow-y-auto ${notificationExpanded ? 'h-[50vh]' : ''}`}>
      {notifications.length > 0 ? (
        notifications.map(notification => {
          // Debugging: Log each notification
          console.log('Rendering notification:', notification);
          
          return (
            <div 
              key={notification.id} 
              className={`px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150 ${
                !notification.read ? 'bg-blue-50 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
              }`}
              onClick={(e) => !notification.read && markAsRead(notification.id, e)}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center">
                    {notification.icon === 'update' && (
                      <div className="bg-blue-500 w-5 h-5 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                      </div>
                    )}
                    {notification.icon === 'user' && (
                      <div className="bg-green-500 w-5 h-5 rounded-full flex items-center justify-center">
                        <FaUser className="text-white text-xs" />
                      </div>
                    )}
                    {notification.icon === 'alert' && (
                      <div className="bg-yellow-500 w-5 h-5 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                      </div>
                    )}
                    {notification.icon === 'maintenance' && (
                      <div className="bg-indigo-500 w-5 h-5 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                      </div>
                    )}
                    {notification.icon === 'backup' && (
                      <div className="bg-teal-500 w-5 h-5 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    )}
                    {notification.icon === 'login' && (
                      <div className="bg-purple-500 w-5 h-5 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                        </svg>
                      </div>
                    )}
                    {/* Fallback icon */}
                    {!['update', 'user', 'alert', 'maintenance', 'backup', 'login'].includes(notification.icon) && (
                      <div className="bg-gray-500 w-5 h-5 rounded-full flex items-center justify-center">
                        <FaBell className="text-white text-xs" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-gray-800 text-sm">
                      {notification.title || 'Untitled Notification'}
                    </h4>
                    <span className="text-[0.65rem] text-gray-500 whitespace-nowrap ml-2">
                      {notification.time || 'Unknown time'}
                    </span>
                  </div>
                  {!notification.read ? (
                    <div className="mt-2 flex items-center">
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                      <span className="text-[0.6rem] text-blue-600 ml-1.5 font-medium uppercase tracking-wider">Unread</span>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center">
                      <FaCheck className="text-xs text-green-500 mr-1" />
                      <span className="text-[0.6rem] text-green-600 font-medium uppercase tracking-wider">Read</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="px-4 py-6 text-center">
          <FaRegCommentDots className="mx-auto text-gray-400 text-2xl mb-2" />
          <p className="text-gray-500 text-sm">No notifications available</p>
        </div>
      )}
    </div>
    
    <div className="px-4 py-2.5 border-t bg-gray-50 flex justify-center">
      <button 
        onClick={() => setNotificationExpanded(!notificationExpanded)}
        className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center"
      >
        <FaRegCommentDots className="mr-1.5 text-xs" />
        {notificationExpanded ? 'Show Less' : 'View all notifications'}
      </button>
    </div>
  </div>
)}
        </div>

        {/* Profile Section - Premium Design */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 focus:outline-none focus:ring-0 rounded-full group transition-all duration-200"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            aria-label="User menu"
          >
            {/* Profile Photo with elegant frame */}
            <div className="relative rounded-full w-10 h-10 group-hover:shadow-md transition-all">
              <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-blue-300 transition-colors"></div>
              <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                {userData?.profilePhoto ? (
                  <img 
                    src={userData.profilePhoto} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : userData ? (
                  <span className="text-xl font-bold text-gray-700">
                    {userData.id.charAt(0)}
                  </span>
                ) : (
                  <FaUser className="text-gray-600 text-xl" />
                )}
              </div>
            </div>
            
            {/* Admin ID (hidden on mobile) */}
            {!isMobile && (
              <div className="text-left hidden sm:block">
                <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors">
                  {userData ? userData.id : 'Guest'}
                </span>
              </div>
            )}
          </button>

          {/* Profile Dropdown - Premium Design */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-200 rounded shadow-xl z-40 overflow-hidden transform transition-all duration-300 origin-top-right">
              {/* Profile header */}
              <div className="px-6 py-5 bg-gray-50 border-b">
                <div className="flex items-center">
                  <div className="relative rounded-full w-14 h-14">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
                      {userData?.profilePhoto ? (
                        <img 
                          src={userData.profilePhoto} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : userData ? (
                        <span className="text-2xl font-bold text-gray-700">
                          {userData.id.charAt(0)}
                        </span>
                      ) : (
                        <FaUser className="text-gray-600 text-2xl" />
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-bold text-gray-800">
                      {userData ? userData.id : 'Guest User'}
                    </h3>
                    <p className="text-gray-600 text-sm truncate max-w-[180px]">
                      {userData ? userData.email : 'No email available'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* User info cards */}
              <div className="px-5 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded p-3 shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Role</p>
                    <p className="font-bold text-gray-800 mt-1">
                      {userData ? userData.role : 'Unknown'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded p-3 shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Login Time</p>
                    <p className="font-bold text-gray-800 mt-1">
                      {userData ? userData.loginTime : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Navigation */}
              <div className="px-3 py-2">
                <button
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded flex items-center group transition-all"
                  onClick={() => router.push(`/admin_dashboard/profile_photo_change/${userData.id}`)}
                >
                  <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <FaUserCircle className="text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <span className="font-medium text-gray-800">Profile Photo</span>
                    <p className="text-xs text-gray-500 mt-1">Change your profile photo</p>
                  </div>
                </button>    

                <button
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded flex items-center group transition-all mt-2"
                  onClick={() => router.push(`/admin_dashboard/password_change/${userData.id}`)}
                >
                  <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <FaLock className="text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <span className="font-medium text-gray-800">Security</span>
                    <p className="text-xs text-gray-500 mt-1">Change password and security</p>
                  </div>
                </button>
              </div>
              
              {/* Logout button */}
              <div className="px-5 py-4 border-t bg-gray-50">
                <button
                  className="w-full flex items-center justify-center py-3 bg-gray-800 text-white font-medium rounded hover:bg-red-900 transition-all"
                  onClick={handleLogout}
                >
                  <FaSignOutAlt className="mr-2" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}