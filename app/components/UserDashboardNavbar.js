// components/UserDashboardNavbar.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaBell, FaSignOutAlt, FaUser, FaBars, FaRegCommentDots, FaUserCircle, FaLock, FaIdCard, FaClock, FaCheck, FaCheckCircle } from 'react-icons/fa';
import { DateTime } from 'luxon';
import toast from 'react-hot-toast';

export default function UserDashboardNavbar({ onMenuToggle, isMobile }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  
  // New notification states
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [displayedNotifications, setDisplayedNotifications] = useState([]);

  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);
  const router = useRouter();

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
      const socPortalId = getCookie('socPortalId');
      if (!socPortalId) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const response = await fetch('/api/user_dashboard/notification');
      
      if (!response.ok) return;
      
      const data = await response.json();
      
      const transformedData = Array.isArray(data) ? data.map(item => ({
        ...item,
        read: item.read === true || item.status === 'Read'
      })) : [];

      setNotifications(transformedData);
      
      // Calculate actual unread count from ALL notifications
      const actualUnreadCount = transformedData.filter(n => !n.read).length;
      setUnreadCount(actualUnreadCount);

    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    fetchNotifications(); // Initial fetch
    
    const backgroundRefresh = setInterval(fetchNotifications, 30000);
    return () => clearInterval(backgroundRefresh);
  }, []);

  // Filter and limit notifications based on current settings
  useEffect(() => {
    let filtered = notifications;
    
    // Apply filter
    if (notificationFilter === 'unread') {
      filtered = notifications.filter(n => !n.read);
    } else if (notificationFilter === 'read') {
      filtered = notifications.filter(n => n.read);
    }
    // 'all' shows all notifications
    
    // Apply display limit
    if (!showAllNotifications) {
      filtered = filtered.slice(0, 20);
    }
    
    setDisplayedNotifications(filtered);
  }, [notifications, notificationFilter, showAllNotifications]);

  // Calculate counts
  const totalCount = notifications.length;
  const readCount = totalCount - unreadCount;
  const displayedCount = displayedNotifications.length;
  const hasMoreNotifications = notifications.length > 20;

  // Mark notification as read
  // Mark notification as read
const markAsRead = async (id, e) => {
  e.stopPropagation();
  try {
    const response = await fetch(`/api/user_dashboard/notification/${id}`, {
      method: 'PUT'
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark as read');
    }
    
    // Update local state
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    toast.error('Failed to mark notification as read');
  }
};

  // Mark all notifications as read
  // In your UserDashboardNavbar component, update the markAllAsRead function:

// Mark all notifications as read
const markAllAsRead = async (e) => {
  e.stopPropagation();
  try {
    const response = await fetch('/api/user_dashboard/notification/bulk_read', {
      method: 'PUT'
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark all as read');
    }
    
    const result = await response.json();
    
    // Update local state
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    toast.success(result.message || 'All notifications marked as read');
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    toast.error('Failed to mark all as read');
  }
};

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userId = getCookie('socPortalId');
        
        if (!userId) {
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/user_dashboard/user_info?id=${userId}`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const loginTime = getCookie('loginTime');
        
        setUserData({
          ...data,
          ngdId: data.ngdId || 'N/A',
          loginTime: loginTime 
            ? DateTime.fromISO(loginTime).toFormat('MMM dd, yyyy hh:mm a')
            : 'Unknown'
        });

      } catch (error) {
        console.error('[NAVBAR] Failed to fetch user data:', error);
        
        const email = getCookie('email');
        const id = getCookie('socPortalId');
        const role = getCookie('roleType');
        const loginTime = getCookie('loginTime');
        
        if (id) {
          setUserData({
            email: email || 'Unknown',
            id: id,
            role: role || 'User',
            firstName: 'User',
            lastName: 'User',
            ngdId: 'N/A',
            shortName: 'User',
            loginTime: loginTime 
              ? DateTime.fromISO(loginTime).toFormat('MMM dd, yyyy hh:mm a')
              : 'Unknown',
            profilePhoto: null
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
        // Reset notification states when closing
        setNotificationFilter('unread');
        setShowAllNotifications(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const toastId = toast.loading('Logging Out...');
    
    try {
      // Clear user data immediately
      setUserData(null);
      
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
        
        toast.success('Logout Successful!', { id: toastId });
        
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1500);
      } else {
        toast.error(`Logout Failed: ${result.message || 'Unknown Error'}`, { id: toastId });
      }
    } catch (error) {
      toast.error(`Network Error: ${error.message}`, { id: toastId });
    }
  };

  // Get user initials
  const userInitials = userData ? 
    `${userData.firstName?.charAt(0) || ''}${userData.lastName?.charAt(0) || ''}` || 'UU' 
    : 'UU';

  // Handle profile photo error
  const handleProfilePhotoError = () => {
    setProfilePhotoError(true);
  };

  // Check if any tray is open on mobile
  const isTrayOpen = isMobile && (dropdownOpen || notificationsOpen);

  // Display loading state
  if (loading) {
    return (
      <header className="sticky top-0 z-50 bg-white shadow-md h-16 flex items-center px-4 sm:px-6 border-b border-blue-700/40">
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-[#000B58]">
            SOC PORTAL
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-blue-700/20 border-2 border-dashed border-blue-500/30 rounded w-10 h-10 animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <>
      {/* Backdrop Blur for Mobile */}
      {isTrayOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => {
            setDropdownOpen(false);
            setNotificationsOpen(false);
            setNotificationFilter('unread');
            setShowAllNotifications(false);
          }}
        />
      )}

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
          <h1 className="text-lg sm:text-xl font-bold text-[#000B58]">
            SOC PORTAL
          </h1>
          <p className="text-xs text-blue-600/80 hidden sm:block">
            Service Operations Center • Real-time Threat Management
          </p>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-4 sm:space-x-5">
          {/* Notification Icon */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-0 relative transition-all duration-200 group"
              aria-label="Notifications"
            >
              <div className="relative">
                <FaBell className="h-6 w-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 transform -translate-y-1/2 translate-x-1/2 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-xs text-white font-bold border-2 border-white shadow-sm">
                    {unreadCount > 20 ? '20+' : unreadCount}
                  </span>
                )}
              </div>
            </button>

            {/* Notification Tray */}
            {notificationsOpen && (
            <div 
              className={`
                fixed md:absolute 
                ${isMobile 
                  ? 'left-4 right-4 top-[72px] max-h-[80vh]' 
                  : 'right-0 mt-2 w-96 max-h-[70vh]'
                } 
                bg-white border border-gray-200 rounded shadow-2xl z-[60] overflow-hidden flex flex-col
              `}
            >
              {/* Header with Stats */}
              <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-gray-800 text-base">Notifications</h3>
                  <div className="flex items-center space-x-2">
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="flex items-center text-xs bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 transition-colors font-medium gap-1"
                      >
                        <FaCheckCircle className="text-white" />
                        Mark All Read
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Stats Bar */}
                <div className="flex gap-2 justify-center text-center">
                  <div className="bg-white/80 rounded p-2 border border-blue-100 flex-1 flex items-center justify-center gap-2">
                    <span className="text-xs text-gray-600">Total</span>
                    <span className="text-sm font-bold text-blue-700">{totalCount}</span>
                  </div>
                  <div className="bg-white/80 rounded p-2 border border-red-100 flex-1 flex items-center justify-center gap-2">
                    <span className="text-xs text-gray-600">Unread</span>
                    <span className="text-sm font-bold text-red-700">{unreadCount}</span>
                  </div>
                  <div className="bg-white/80 rounded p-2 border border-green-100 flex-1 flex items-center justify-center gap-2">
                    <span className="text-xs text-gray-600">Read</span>
                    <span className="text-sm font-bold text-green-700">{readCount}</span>
                  </div>
                </div>

              </div>
              
              {/* Filter Buttons */}
              <div className="px-4 py-2 border-b bg-gray-50 flex gap-1">
                <button
                  onClick={() => setNotificationFilter('all')}
                  className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-all ${
                    notificationFilter === 'all' 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setNotificationFilter('unread')}
                  className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-all ${
                    notificationFilter === 'unread' 
                      ? 'bg-red-500 text-white shadow-sm' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Unread
                </button>
                <button
                  onClick={() => setNotificationFilter('read')}
                  className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-all ${
                    notificationFilter === 'read' 
                      ? 'bg-green-500 text-white shadow-sm' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Read
                </button>
              </div>
              
              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto">
                {displayedNotifications.length > 0 ? (
                  displayedNotifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0 ${
                        !notification.read ? 'bg-blue-50 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
                      }`}
                      onClick={(e) => !notification.read && markAsRead(notification.id, e)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
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
                            {!['update', 'user', 'alert', 'maintenance', 'backup', 'login'].includes(notification.icon) && (
                              <div className="bg-gray-500 w-5 h-5 rounded-full flex items-center justify-center">
                                <FaBell className="text-white text-xs" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col gap-1">
                            <h4 className="font-semibold text-gray-800 text-sm break-words leading-relaxed">
                              {notification.title || 'Untitled Notification'}
                            </h4>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                {!notification.read ? (
                                  <>
                                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                                    <span className="text-[0.6rem] text-blue-600 ml-1.5 font-medium uppercase tracking-wider">Unread</span>
                                  </>
                                ) : (
                                  <>
                                    <FaCheck className="text-xs text-green-500 mr-1" />
                                    <span className="text-[0.6rem] text-green-600 font-medium uppercase tracking-wider">Read</span>
                                  </>
                                )}
                              </div>
                              <span className="text-[0.65rem] text-gray-500 whitespace-nowrap flex-shrink-0 ml-2">
                                {notification.time || 'Unknown time'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center">
                    <FaRegCommentDots className="mx-auto text-gray-400 text-2xl mb-2" />
                    <p className="text-gray-500 text-sm">
                      {notificationFilter === 'all' 
                        ? 'No notifications available' 
                        : `No ${notificationFilter} notifications`}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Footer with View All / Show Less */}
              {hasMoreNotifications && (
                <div className="px-4 py-2.5 border-t bg-gray-50 flex justify-between items-center flex-shrink-0">
                  <span className="text-xs text-gray-600">
                    Showing {displayedCount} of {notificationFilter === 'all' ? totalCount : 
                      notificationFilter === 'unread' ? unreadCount : readCount} notifications
                  </span>
                  <button 
                    onClick={() => setShowAllNotifications(!showAllNotifications)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-3 py-1.5 rounded border border-blue-200"
                  >
                    <FaRegCommentDots className="mr-1.5 text-xs" />
                    {showAllNotifications ? 'Show Less' : 'View All'}
                  </button>
                </div>
              )}
              
              {/* Show when all notifications are displayed but there's no "more" */}
              {!hasMoreNotifications && displayedCount > 0 && (
                <div className="px-4 py-2.5 border-t bg-gray-50 flex justify-center items-center flex-shrink-0">
                  <span className="text-xs text-gray-600">
                    Showing all {displayedCount} notifications
                  </span>
                </div>
              )}
            </div>
          )}
          </div>

          {/* Profile Section */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 focus:outline-none focus:ring-0 rounded-full group transition-all duration-200"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
              aria-label="User menu"
            >
              <div className="relative rounded-full w-10 h-10 group-hover:shadow-md transition-all">
                <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-blue-300 transition-colors"></div>
                <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                  {/* Show profile photo if available and no error, otherwise show initials */}
                  {userData?.profilePhoto && !profilePhotoError ? (
                    <img 
                      src={userData.profilePhoto} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      onError={handleProfilePhotoError}
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xl font-bold text-gray-700">
                      {userInitials}
                    </span>
                  )}
                </div>
              </div>
              
              {!isMobile && (
                <div className="text-left hidden sm:block">
                  <span
                    className="
                      text-sm font-semibold
                      text-gray-800
                      tracking-wide
                      transition-colors duration-200
                      group-hover:text-blue-600
                    "
                  >
                    {userData ? (userData.shortName || userData.id) : 'Guest'}
                  </span>
                </div>
              )}
            </button>

            {/* Profile Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-[320px] bg-white/90 backdrop-blur-lg border border-gray-200/80 rounded shadow-2xl z-40 overflow-hidden transform transition-all duration-300 origin-top-right">
                <div className="relative pt-2 px-6 pb-6 bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
                  <div className="mt-3 flex items-center space-x-2">
                    <h3 className="font-bold text-xl tracking-tight flex items-center">
                      {userData ? `${userData.firstName} ${userData.lastName}` : 'Guest User'}
                      <span className="relative flex h-3 w-3 ml-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                    </h3>
                  </div>
                  <p className="text-indigo-200 text-sm truncate max-w-[220px]">
                    {userData ? userData.email : 'No email available'}
                  </p>
                </div>

                <div className="relative -mt-4 mx-4 bg-white rounded shadow-lg p-0 overflow-hidden z-10">
                  <div className="p-4">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-gradient-to-br from-gray-50 to-white rounded p-4 border border-gray-100 hover:border-indigo-100 transition-colors duration-300">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                            <FaIdCard className="text-indigo-600 mr-2" />
                            Identity
                          </h4>
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Verified</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500 font-medium">SOC ID</span>
                            <span className="font-mono text-sm font-medium text-gray-800">
                              {userData ? userData.id : 'Unknown'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500 font-medium">NGD ID</span>
                            <span className="font-mono text-sm font-medium text-gray-800">
                              {userData ? userData.ngdId : 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="bg-gradient-to-br from-blue-50/80 to-white rounded p-3 border border-blue-100 hover:border-blue-200 transition-colors">
                          <div className="flex items-center">
                            <div className="flex items-center space-x-2">
                              <div className="bg-blue-500/10 p-1.5 rounded">
                                <FaUser className="text-blue-600 text-sm" />
                              </div>
                              <span className="text-xs text-blue-700 font-medium">Role</span>
                            </div>
                            <span className="ml-auto font-bold text-blue-900 truncate">
                              {userData ? userData.role : 'Unknown'}
                            </span>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50/80 to-white rounded p-3 border border-purple-100 hover:border-purple-200 transition-colors flex flex-col items-center text-center">
                          <div className="flex items-center justify-center">
                            <div className="bg-purple-500/10 p-1.5 rounded mr-2">
                              <FaClock className="text-purple-600 text-sm" />
                            </div>
                            <span className="text-xs text-purple-700 font-medium">Active Since</span>
                          </div>
                          <div className="mt-1">
                            <p className="font-bold text-purple-900">
                              {userData ? userData.loginTime : 'Unknown'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100">
                    <button
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50/50 group transition-all duration-200 flex items-center"
                      onClick={() => router.push('/user_dashboard/settings')}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                          <FaUserCircle className="text-indigo-600 text-xl" />
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <span className="font-medium text-gray-800">Profile Settings</span>
                        <p className="text-xs text-gray-500 mt-0.5">Customize your account</p>
                      </div>
                      <div className="text-gray-300 group-hover:text-indigo-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </button>
                    <button
                      className="w-full text-left px-4 py-3 hover:bg-emerald-50/50 group transition-all duration-200 flex items-center border-t border-gray-100"
                      onClick={() => router.push(`/user_dashboard/password_change/${userData?.id}`)}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                          <FaLock className="text-emerald-600 text-xl" />
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <span className="font-medium text-gray-800">Security Center</span>
                        <p className="text-xs text-gray-500 mt-0.5">Password & authentication</p>
                      </div>
                      <div className="text-gray-300 group-hover:text-emerald-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </button>
                  </div>
                </div>
                <div className="px-5 py-4 from-slate-50 to-gray-50">
                  <button
                    className="w-full flex items-center justify-center px-4 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded hover:bg-red-50 hover:border-red-100 hover:text-red-700 transition-all duration-200 shadow-sm group"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt className="mr-2 text-red-500 group-hover:text-red-700 transition-colors" />
                    <span className="font-medium">Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}