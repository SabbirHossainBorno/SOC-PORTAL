// components/UserDashboardNavbar.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaBell, FaSignOutAlt, FaUser, FaBars, FaRegCommentDots, 
  FaUserCircle, FaLock, FaIdCard, FaClock, FaCheck, 
  FaCheckCircle, FaBullhorn, FaFilePdf, FaImage, 
  FaCalendarAlt, FaUserTie, FaEye, FaExternalLinkAlt,
  FaTimes, FaThumbtack, FaPaperclip
} from 'react-icons/fa';
import { MdOutlineAnnouncement } from "react-icons/md";
import { DateTime } from 'luxon';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserDashboardNavbar({ onMenuToggle, isMobile }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const [notices, setNotices] = useState([]);
  const [unreadNoticesCount, setUnreadNoticesCount] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [expandedNotice, setExpandedNotice] = useState(null);
  
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [displayedNotifications, setDisplayedNotifications] = useState([]);

  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);
  const noticesRef = useRef(null);
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

  // Fetch notices function
  const fetchNotices = async () => {
    try {
      const socPortalId = getCookie('socPortalId');
      if (!socPortalId) {
        setNotices([]);
        setUnreadNoticesCount(0);
        return;
      }

      const response = await fetch('/api/user_dashboard/notice_board');
      
      if (!response.ok) {
        throw new Error('Failed to fetch notices');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setNotices(data.data || []);
        
        // Check for new notices - simple logic: if any notice created today
        const today = DateTime.now().setZone('Asia/Dhaka').toISODate();
        const newNoticesCount = data.data.filter(notice => 
          DateTime.fromISO(notice.created_at).setZone('Asia/Dhaka').toISODate() === today
        ).length;
        
        setUnreadNoticesCount(newNoticesCount);
      }
    } catch (error) {
      console.error('Error fetching notices:', error);
      setNotices([]);
      setUnreadNoticesCount(0);
    }
  };

  // Handle notice click
  const handleNoticeClick = (notice) => {
    if (notice.image_url) {
      setSelectedNotice(notice);
      setShowImageModal(true);
    } else if (notice.pdf_url) {
      window.open(notice.pdf_url, '_blank');
    }
  };

  // Toggle notice expansion
  const toggleNoticeExpansion = (noticeId, e) => {
    e.stopPropagation();
    setExpandedNotice(expandedNotice === noticeId ? null : noticeId);
  };

  // Format notice date
  const formatNoticeDate = (dateString) => {
    return DateTime.fromISO(dateString).setZone('Asia/Dhaka').toFormat('MMM dd, yyyy • HH:mm');
  };

  // Format date range
  const formatDateRange = (fromDate, toDate) => {
    const from = DateTime.fromISO(fromDate).setZone('Asia/Dhaka');
    const to = DateTime.fromISO(toDate).setZone('Asia/Dhaka');
    
    if (from.hasSame(to, 'day')) {
      return `${from.toFormat('MMM dd, yyyy')} • ${from.toFormat('HH:mm')} - ${to.toFormat('HH:mm')}`;
    } else {
      return `${from.toFormat('MMM dd, HH:mm')} - ${to.toFormat('MMM dd, HH:mm')}`;
    }
  };

  // Check if notice is active
  const isNoticeActive = (notice) => {
    const now = DateTime.now().setZone('Asia/Dhaka');
    const from = DateTime.fromISO(notice.from_datetime).setZone('Asia/Dhaka');
    const to = DateTime.fromISO(notice.to_datetime).setZone('Asia/Dhaka');
    return now >= from && now <= to;
  };

  // Get notice status
  const getNoticeStatus = (notice) => {
    const now = DateTime.now().setZone('Asia/Dhaka');
    const from = DateTime.fromISO(notice.from_datetime).setZone('Asia/Dhaka');
    const to = DateTime.fromISO(notice.to_datetime).setZone('Asia/Dhaka');
    
    if (now < from) return { status: 'upcoming', color: 'blue', text: 'Upcoming' };
    if (now > to) return { status: 'expired', color: 'gray', text: 'Expired' };
    return { status: 'active', color: 'green', text: 'Active' };
  };

  // Get time remaining
  const getTimeRemaining = (notice) => {
    const now = DateTime.now().setZone('Asia/Dhaka');
    const to = DateTime.fromISO(notice.to_datetime).setZone('Asia/Dhaka');
    const diff = to.diff(now, ['days', 'hours', 'minutes']);
    
    if (diff.days > 0) {
      return `${diff.days}d ${diff.hours}h remaining`;
    } else if (diff.hours > 0) {
      return `${diff.hours}h ${Math.round(diff.minutes)}m remaining`;
    } else {
      return `${Math.round(diff.minutes)}m remaining`;
    }
  };

  // Auto-refresh notices every 5 minutes
  useEffect(() => {
    fetchNotices(); // Initial fetch
    
    const backgroundRefresh = setInterval(fetchNotices, 300000); // 5 minutes
    return () => clearInterval(backgroundRefresh);
  }, []);


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
      if (noticesRef.current && !noticesRef.current.contains(event.target)) {
        setNoticesOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    // Show toast immediately
    const toastId = toast.loading('Logging out...', {
      position: 'top-right',
      duration: 4000
    });

    // Close profile tray immediately
    setDropdownOpen(false);

    // Show loading state
    setIsLoggingOut(true);
    
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
  const isTrayOpen = isMobile && (dropdownOpen || notificationsOpen || noticesOpen);

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
      {/* Full Screen Loading Spinner with White BG */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner />
            <p className="text-gray-800 text-xl font-semibold mt-4 animate-pulse">
              Securing your logout...
            </p>
          </div>
        </div>
      )}

      {/* Enhanced Image Modal */}
      <AnimatePresence>
        {showImageModal && selectedNotice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-gray-50 to-white">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedNotice.title}</h3>
                  <p className="text-gray-600 mt-1 flex items-center gap-2">
                    <FaCalendarAlt className="text-blue-500" />
                    {formatDateRange(selectedNotice.from_datetime, selectedNotice.to_datetime)}
                  </p>
                </div>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="p-3 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FaTimes className="text-2xl text-gray-500 hover:text-gray-700" />
                </button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-auto">
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="lg:flex-1">
                    <img 
                      src={selectedNotice.image_url} 
                      alt={selectedNotice.title}
                      className="w-full h-auto rounded shadow-lg"
                      onError={(e) => {
                        e.target.src = '/api/placeholder/800/600';
                        toast.error('Failed to load image');
                      }}
                    />
                  </div>
                  {selectedNotice.description && (
                    <div className="lg:w-96 bg-gray-50 rounded p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FaBullhorn className="text-orange-500" />
                        Notice Details
                      </h4>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedNotice.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop Blur for Mobile */}
      {(isMobile && (dropdownOpen || notificationsOpen || noticesOpen)) && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => {
            setDropdownOpen(false);
            setNotificationsOpen(false);
            setNoticesOpen(false);
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
          {/* Enhanced Notice Board Icon */}
          <div className="relative" ref={noticesRef}>
            <button
              onClick={() => setNoticesOpen(!noticesOpen)}
              className="p-2 rounded-full hover:bg-orange-50 focus:outline-none focus:ring-0 relative transition-all duration-200 group"
              aria-label="Notices"
            >
              <div className="relative">
                <MdOutlineAnnouncement className="h-7 w-7 text-gray-600 group-hover:text-orange-600 transition-colors" />

                {unreadNoticesCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0 right-0 transform -translate-y-1/2 translate-x-1/2 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-xs text-white font-bold border-2 border-white shadow-sm">
                    {unreadNoticesCount > 9 ? '9+' : unreadNoticesCount}
                  </motion.span>
                )}
              </div>
            </button>


            {/* Modern Notice Board Tray with Realistic Design */}
<AnimatePresence>
  {noticesOpen && (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`
        fixed md:absolute 
        ${isMobile 
          ? 'inset-4 top-20' 
          : 'right-0 mt-2.5 w-[48rem] max-h-[85vh]'
        } 
        bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/80 rounded shadow-2xl z-[60] overflow-hidden flex flex-col
        backdrop-blur-xl
      `}
    >
      {/* Professional Header */}
      <div className="relative px-6 py-4 bg-gradient-to-r from-slate-800 to-blue-900 border-b border-slate-300/30">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10"></div>
        
        <div className="relative flex justify-between items-center mb-3 pt-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded shadow-lg">
              <FaBullhorn className="text-white text-lg" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xl">Notice Board</h3>
              <p className="text-blue-200 text-sm">Important announcements and updates</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right bg-white/10 backdrop-blur-sm rounded px-3 py-2 border border-white/20">
              <div className="text-xl font-bold text-white">{notices.length}</div>
              <div className="text-xs text-blue-200">Total Notices</div>
            </div>
            {unreadNoticesCount > 0 && (
              <div className="text-right bg-red-500/20 backdrop-blur-sm rounded px-3 py-2 border border-red-400/30">
                <div className="text-xl font-bold text-white">{unreadNoticesCount}</div>
                <div className="text-xs text-red-200">New Today</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Professional Status Indicators */}
        <div className="relative flex gap-2">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <span className="text-sm font-medium text-white">
              {notices.filter(n => getNoticeStatus(n).status === 'active').length} Active
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-sm font-medium text-white">
              {notices.filter(n => getNoticeStatus(n).status === 'upcoming').length} Upcoming
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
            <span className="text-sm font-medium text-white">
              {notices.filter(n => getNoticeStatus(n).status === 'expired').length} Archived
            </span>
          </div>
        </div>
      </div>
      
      {/* Professional Notices List */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-50/80 to-blue-50/20">
        {notices.length > 0 ? (
          <div className="space-y-4">
            {notices.map((notice) => {
              const status = getNoticeStatus(notice);
              const isExpanded = expandedNotice === notice.notice_id;
              
              return (
                <motion.div
                  key={notice.notice_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white/90 backdrop-blur-sm rounded border border-slate-200/60 hover:border-slate-300/80 hover:shadow-lg transition-all duration-300 cursor-pointer ${
                    status.status === 'active' 
                      ? 'hover:shadow-emerald-100' 
                      : status.status === 'upcoming'
                      ? 'hover:shadow-blue-100'
                      : 'hover:shadow-slate-100'
                  }`}
                  onClick={() => handleNoticeClick(notice)}
                >
                  <div className="p-4">
                    <div className="flex gap-4">
                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                                status.status === 'active' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : status.status === 'upcoming'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-300'
                              }`}>
                                {status.text}
                              </span>
                              {status.status === 'active' && (
                                <span className="text-xs text-slate-600 bg-slate-100/80 px-2 py-1 rounded-full border border-slate-200">
                                  {getTimeRemaining(notice)}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg leading-tight mb-2">
                              {notice.title}
                            </h4>
                          </div>
                          <button
                            onClick={(e) => toggleNoticeExpansion(notice.notice_id, e)}
                            className="ml-4 p-2 hover:bg-slate-100/50 rounded transition-colors"
                          >
                            <FaEye className={`text-slate-400 transition-transform ${
                              isExpanded ? 'rotate-180 text-slate-600' : ''
                            }`} />
                          </button>
                        </div>

                        {/* Description Preview */}
                        <p className="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-2">
                          {notice.description}
                        </p>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                          <div className="flex items-center gap-1">
                            <FaCalendarAlt className="text-slate-400" />
                            <span>{formatDateRange(notice.from_datetime, notice.to_datetime)}</span>
                          </div>
                          {notice.created_by && (
                            <div className="flex items-center gap-1">
                              <FaUserTie className="text-slate-400" />
                              <span>By {notice.created_by}</span>
                            </div>
                          )}
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-slate-200/50 pt-4 space-y-4">
                                {/* Full Description */}
                                <div>
                                  <h5 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                    <FaBullhorn className="text-blue-600" />
                                    Full Description
                                  </h5>
                                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-3 rounded border border-slate-200/50">
                                    {notice.description}
                                  </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                  {notice.image_url && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedNotice(notice);
                                        setShowImageModal(true);
                                      }}
                                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded transition-all shadow-sm hover:shadow-md font-medium"
                                    >
                                      <FaImage className="text-white" />
                                      <span className="text-sm">View Image</span>
                                    </button>
                                  )}
                                  {notice.pdf_url && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(notice.pdf_url, '_blank');
                                      }}
                                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded transition-all shadow-sm hover:shadow-md font-medium"
                                    >
                                      <FaFilePdf className="text-white" />
                                      <span className="text-sm">Open PDF</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Media Preview */}
                      {(notice.image_url || notice.pdf_url) && (
                        <div className="w-32 flex-shrink-0">
                          {notice.image_url ? (
                            <div className="relative group">
                              <img 
                                src={notice.image_url} 
                                alt="Notice preview"
                                className="w-32 h-24 object-cover rounded shadow-md border border-slate-200 hover:shadow-lg transition-shadow"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedNotice(notice);
                                  setShowImageModal(true);
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded flex items-center justify-center">
                                <FaImage className="text-white/0 group-hover:text-white/80 text-xl transition-all" />
                              </div>
                              <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                <FaImage className="inline mr-1" />
                                Image
                              </div>
                            </div>
                          ) : notice.pdf_url ? (
                            <div 
                              className="w-32 h-24 bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 rounded shadow-md flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all group"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(notice.pdf_url, '_blank');
                              }}
                            >
                              <div className="text-slate-600 group-hover:text-slate-700 transition-colors">
                                <FaFilePdf className="text-3xl mb-2" />
                              </div>
                              <div className="text-center">
                                <div className="text-xs font-semibold text-slate-700">PDF Document</div>
                                <div className="text-[10px] text-slate-600 mt-1">Click to open</div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center pt-3 border-t border-slate-200/50">
                      <div className="flex items-center gap-2">
                        {(notice.image_url || notice.pdf_url) && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <FaPaperclip className="text-slate-400" />
                            <span>Attachments:</span>
                            {notice.image_url && (
                              <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                                <FaImage className="text-xs" />
                                Image
                              </span>
                            )}
                            {notice.pdf_url && (
                              <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-300">
                                <FaFilePdf className="text-xs" />
                                PDF
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>Click to view details</span>
                        <FaExternalLinkAlt className="text-xs" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-slate-200 to-blue-200 rounded-full flex items-center justify-center shadow-inner">
              <FaBullhorn className="text-slate-500 text-3xl" />
            </div>
            <h4 className="text-lg font-semibold text-slate-700 mb-2">No Notices Available</h4>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              The notice board is currently empty. Check back later for important announcements and updates.
            </p>
          </div>
        )}
      </div>
      
      {/* Professional Footer */}
      {notices.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-300/30 bg-gradient-to-r from-slate-100 to-blue-100/50 flex justify-between items-center">
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-300/50">
              <span className="font-semibold text-slate-700">{notices.length}</span>
              <span>notices</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <span>{notices.filter(n => getNoticeStatus(n).status === 'active').length} active</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>{notices.filter(n => getNoticeStatus(n).status === 'upcoming').length} upcoming</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
              <span>{notices.filter(n => getNoticeStatus(n).status === 'expired').length} archived</span>
            </div>
          </div>
          <button
            onClick={() => setNoticesOpen(false)}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white/80 hover:bg-white border border-slate-300/50 rounded transition-all hover:shadow-md"
          >
            Close Board
          </button>
        </div>
      )}
    </motion.div>
  )}
</AnimatePresence>
          </div>
          
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
                    : 'right-0 mt-3 w-96 max-h-[70vh]'
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
                        className={`px-4 py-3 hover:bg-blue-50 cursor-pointer transition-all duration-200 border-b border-blue-300 last:border-b-0 ${
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