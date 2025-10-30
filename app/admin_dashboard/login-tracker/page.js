// app/admin_dashboard/login-tracker/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaUsers, 
  FaUserShield, 
  FaSignInAlt, 
  FaSignOutAlt, 
  FaChartLine,
  FaSync,
  FaFilter,
  FaSearch,
  FaCircle,
  FaArrowUp,
  FaArrowDown,
  FaUser,
  FaClock,
  FaExclamationTriangle
} from 'react-icons/fa';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function LoginTracker() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('last_login');
  const [sortOrder, setSortOrder] = useState('desc');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin_dashboard/login_tracker');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching login tracker data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (!loading) {
        fetchData();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [autoRefresh, loading]);

  // Filter and sort data
  const getFilteredData = () => {
    if (!data) return { admins: [], users: [] };

    const filterItems = (items) => {
      return items.filter(item => {
        const matchesSearch = item.soc_portal_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.role_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (item.short_name && item.short_name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesRole = filterRole === 'all' || item.role_type === filterRole;
        const matchesStatus = filterStatus === 'all' || 
                            (filterStatus === 'active' && item.current_login_status === 'Active') ||
                            (filterStatus === 'inactive' && item.current_login_status !== 'Active');
        
        return matchesSearch && matchesRole && matchesStatus;
      });
    };

    const sortItems = (items) => {
      return items.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'last_login':
            aValue = new Date(a.last_login_time || 0);
            bValue = new Date(b.last_login_time || 0);
            break;
          case 'login_count':
            aValue = a.total_login_count;
            bValue = b.total_login_count;
            break;
          case 'account_age':
            aValue = a.account_age_days;
            bValue = b.account_age_days;
            break;
          case 'user_id':
            aValue = a.soc_portal_id;
            bValue = b.soc_portal_id;
            break;
          default:
            aValue = a.last_login_time;
            bValue = b.last_login_time;
        }

        if (sortOrder === 'desc') {
          return aValue < bValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    };

    return {
      admins: sortItems(filterItems(data.admins || [])),
      users: sortItems(filterItems(data.users || []))
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    
    return formatDate(dateString);
  };

  const getStatusColor = (status) => {
    return status === 'Active' ? 'text-green-500' : 'text-gray-400';
  };

  const getRoleColor = (role) => {
    const colors = {
      'Admin': 'bg-gradient-to-r from-purple-500 to-purple-600 text-white',
      'SOC': 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
      'OPS': 'bg-gradient-to-r from-green-500 to-green-600 text-white',
      'CTO': 'bg-gradient-to-r from-orange-500 to-orange-600 text-white',
      'BI': 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white'
    };
    return colors[role] || 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
  };

  // Get profile picture URL
  const getProfilePicture = (user) => {
    if (user.role_type === 'Admin') {
      // Admin profile picture - using the single admin_dp.jpg for all admins
      // In future, you can implement individual admin profile pictures
      return '/image/admin_dp/admin_dp.jpg';
    } else {
      // User profile picture from user_dp folder
      if (user.profile_photo_url) {
        return user.profile_photo_url;
      }
      // Fallback to constructed path based on soc_portal_id
      return `/storage/user_dp/${user.soc_portal_id}_DP.jpg`;
    }
  };

  // Calculate login counts for the card
  const getLoginCounts = () => {
    if (!data) return { adminLogins: 0, userLogins: 0, totalLogins: 0 };
    
    const adminLogins = data.admins?.reduce((sum, admin) => sum + (parseInt(admin.total_login_count) || 0), 0) || 0;
    const userLogins = data.users?.reduce((sum, user) => sum + (parseInt(user.total_login_count) || 0), 0) || 0;
    
    return {
      adminLogins,
      userLogins,
      totalLogins: adminLogins + userLogins
    };
  };

  const getLastUpdatedText = () => {
    if (!lastUpdated) return 'Never';
    return lastUpdated.toLocaleTimeString('en-BD', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading login tracker data...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the latest information</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="bg-white rounded shadow-lg border border-red-200 p-6 transform hover:scale-105 transition-transform">
            <FaExclamationTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded font-medium transition-all transform hover:scale-105"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredData = getFilteredData();
  const { statistics } = data || { statistics: {} };
  const loginCounts = getLoginCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Login Tracker
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Monitor user and admin login activities in real-time</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0">
              <div className="flex items-center space-x-4 bg-white rounded px-4 py-2 shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoRefresh"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoRefresh" className="ml-2 text-sm text-gray-700">
                    Auto-refresh
                  </label>
                </div>
                <div className="text-sm text-gray-500 flex items-center">
                  <FaClock className="mr-1" />
                  Last: {getLastUpdatedText()}
                </div>
              </div>
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
              >
                <FaSync className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* PERFECT STATISTICS CARDS - NEW DESIGN */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Total Admins Card */}
        <div className="group relative bg-gradient-to-br from-white to-blue-50 rounded border border-blue-100 p-6 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 overflow-hidden">
            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Admins</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{statistics.totalAdmins || 0}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded shadow-lg">
                <FaUserShield className="text-white text-lg" />
                </div>
            </div>

            {/* Status Breakdown */}
            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm font-semibold text-green-800">Active</span>
                </div>
                <span className="text-lg font-bold text-green-900">{statistics.activeAdmins || 0}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                    <span className="text-sm font-semibold text-gray-700">Inactive</span>
                </div>
                <span className="text-lg font-bold text-gray-800">{statistics.inactiveAdmins || 0}</span>
                </div>
            </div>
            </div>
        </div>

        {/* Total Users Card */}
        <div className="group relative bg-gradient-to-br from-white to-green-50 rounded border border-green-100 p-6 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 overflow-hidden">
            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{statistics.totalUsers || 0}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded shadow-lg">
                <FaUsers className="text-white text-lg" />
                </div>
            </div>

            {/* Status Breakdown */}
            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm font-semibold text-green-800">Active</span>
                </div>
                <span className="text-lg font-bold text-green-900">{statistics.activeUsers || 0}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                    <span className="text-sm font-semibold text-gray-700">Inactive</span>
                </div>
                <span className="text-lg font-bold text-gray-800">{statistics.inactiveUsers || 0}</span>
                </div>
            </div>
            </div>
        </div>

        {/* Total Logins Card - Span 2 columns */}
        <div className="group relative bg-gradient-to-br from-white to-purple-50 rounded border border-purple-100 p-6 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 overflow-hidden lg:col-span-2">
            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Total Logins</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{loginCounts.totalLogins.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded shadow-lg">
                <FaSignInAlt className="text-white text-lg" />
                </div>
            </div>

            {/* Login Breakdown */}
            <div className="grid grid-cols-2 gap-4">
                {/* Admin Logins */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-blue-700 uppercase tracking-wide">Admin Logins</p>
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                </div>
                <p className="text-2xl font-bold text-blue-900 mb-2">{loginCounts.adminLogins.toLocaleString()}</p>
                <div className="w-full bg-blue-200 rounded-full h-3">
                    <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                        width: `${loginCounts.totalLogins > 0 ? (loginCounts.adminLogins / loginCounts.totalLogins) * 100 : 0}%` 
                    }}
                    ></div>
                </div>
                <p className="text-xs text-blue-600 mt-2 font-medium">
                    {loginCounts.totalLogins > 0 ? Math.round((loginCounts.adminLogins / loginCounts.totalLogins) * 100) : 0}% of total
                </p>
                </div>
                
                {/* User Logins */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded p-4 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-green-700 uppercase tracking-wide">User Logins</p>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <p className="text-2xl font-bold text-green-900 mb-2">{loginCounts.userLogins.toLocaleString()}</p>
                <div className="w-full bg-green-200 rounded-full h-3">
                    <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                        width: `${loginCounts.totalLogins > 0 ? (loginCounts.userLogins / loginCounts.totalLogins) * 100 : 0}%` 
                    }}
                    ></div>
                </div>
                <p className="text-xs text-green-600 mt-2 font-medium">
                    {loginCounts.totalLogins > 0 ? Math.round((loginCounts.userLogins / loginCounts.totalLogins) * 100) : 0}% of total
                </p>
                </div>
            </div>
            </div>
        </div>

        {/* Active Sessions Card */}
        <div className="group relative bg-gradient-to-br from-white to-orange-50 rounded border border-orange-100 p-6 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 overflow-hidden">
            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                    {(statistics.activeAdmins || 0) + (statistics.activeUsers || 0)}
                </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded shadow-lg">
                <FaChartLine className="text-white text-lg" />
                </div>
            </div>

            {/* Session Breakdown */}
            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                    <span className="text-sm font-semibold text-green-800">Admins Online</span>
                </div>
                <span className="text-lg font-bold text-green-900">{statistics.activeAdmins || 0}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200">
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                    <span className="text-sm font-semibold text-blue-800">Users Online</span>
                </div>
                <span className="text-lg font-bold text-blue-900">{statistics.activeUsers || 0}</span>
                </div>
            </div>
            </div>
        </div>
        </div>

        {/* Rest of the component remains the same... */}
        {/* Filters and Search */}
        <div className="bg-white rounded border border-gray-200 p-6 shadow-lg mb-6 backdrop-blur-sm bg-white/95">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ID, name, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-900 placeholder-gray-500 transition-all duration-200"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-900 appearance-none transition-all duration-200"
              >
                <option value="all" className="text-gray-900">All Roles</option>
                <option value="Admin" className="text-gray-900">Admin</option>
                <option value="SOC" className="text-gray-900">SOC</option>
                <option value="OPS" className="text-gray-900">OPS</option>
                <option value="CTO" className="text-gray-900">CTO</option>
                <option value="BI" className="text-gray-900">BI</option>
              </select>
              <FaFilter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-900 appearance-none transition-all duration-200"
              >
                <option value="all" className="text-gray-900">All Status</option>
                <option value="active" className="text-gray-900">Active</option>
                <option value="inactive" className="text-gray-900">Inactive</option>
              </select>
              <FaCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={8} />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-900 appearance-none transition-all duration-200"
              >
                <option value="last_login" className="text-gray-900">Last Login</option>
                <option value="login_count" className="text-gray-900">Login Count</option>
                <option value="account_age" className="text-gray-900">Account Age</option>
                <option value="user_id" className="text-gray-900">User ID</option>
              </select>
              {sortOrder === 'asc' ? 
                <FaArrowUp className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" /> :
                <FaArrowDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              }
            </div>
          </div>

          {/* Sort Order Toggle and Results Count */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded"
            >
              {sortOrder === 'asc' ? <FaArrowUp className="mr-2" /> : <FaArrowDown className="mr-2" />}
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </button>
            <div className="text-sm font-medium text-gray-700 bg-blue-50 px-3 py-2 rounded">
              Showing <span className="font-bold text-blue-600">{filteredData.admins.length + filteredData.users.length}</span> users
              (<span className="text-purple-600">{filteredData.admins.length} admins</span>, 
              <span className="text-green-600"> {filteredData.users.length} users</span>)
            </div>
          </div>
        </div>

        {/* Admin Users Table */}
        <div className="bg-white rounded border border-gray-200 shadow-lg mb-8 overflow-hidden transition-all duration-300 hover:shadow-xl">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded shadow-lg mr-3">
                  <FaUserShield className="text-white text-lg" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Admin Users</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {filteredData.admins.length} administrative accounts with system access
                  </p>
                </div>
              </div>
              <span className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded text-sm font-bold shadow-lg">
                {filteredData.admins.length} accounts
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">User Info</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Last Login</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Last Logout</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Login Count</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Account Age</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.admins.map((admin) => (
                  <tr 
                    key={admin.serial} 
                    className={`transition-all duration-200 hover:bg-gray-50 ${
                      admin.current_login_status === 'Active' 
                        ? 'bg-gradient-to-r from-green-50 to-green-25 border-l-4 border-l-green-500' 
                        : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden border-2 border-purple-200 shadow-lg">
                          <img
                            src={getProfilePicture(admin)}
                            alt={admin.short_name || admin.soc_portal_id}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="h-full w-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm hidden">
                            {(admin.short_name || admin.soc_portal_id).charAt(0)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{admin.soc_portal_id}</div>
                          <div className="text-sm text-gray-500">{admin.short_name || 'No Name'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded text-xs font-bold ${getRoleColor(admin.role_type)} shadow-md`}>
                        {admin.role_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          admin.current_login_status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                        }`}></div>
                        <span className={`text-sm font-medium ${
                          admin.current_login_status === 'Active' ? 'text-green-700' : 'text-gray-700'
                        }`}>
                          {admin.current_login_status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{formatDate(admin.last_login_time)}</div>
                      <div className="text-xs text-gray-500 font-medium">{getTimeAgo(admin.last_login_time)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{formatDate(admin.last_logout_time)}</div>
                      <div className="text-xs text-gray-500 font-medium">{getTimeAgo(admin.last_logout_time)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
                        {admin.total_login_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{admin.account_age_days} days</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Regular Users Table */}
        <div className="bg-white rounded border border-gray-200 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded shadow-lg mr-3">
                  <FaUsers className="text-white text-lg" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Regular Users</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {filteredData.users.length} regular user accounts with role-based access
                  </p>
                </div>
              </div>
              <span className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded text-sm font-bold shadow-lg">
                {filteredData.users.length} accounts
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">User Info</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Last Login</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Last Logout</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Login Count</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Account Age</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.users.map((user) => (
                  <tr 
                    key={user.serial} 
                    className={`transition-all duration-200 hover:bg-gray-50 ${
                      user.current_login_status === 'Active' 
                        ? 'bg-gradient-to-r from-green-50 to-green-25 border-l-4 border-l-green-500' 
                        : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden border-2 border-green-200 shadow-lg">
                          <img
                            src={getProfilePicture(user)}
                            alt={user.short_name || user.soc_portal_id}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="h-full w-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-sm hidden">
                            {(user.short_name || user.soc_portal_id).charAt(0)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{user.soc_portal_id}</div>
                          <div className="text-sm text-gray-500">{user.short_name || 'No Name'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded text-xs font-bold ${getRoleColor(user.role_type)} shadow-md`}>
                        {user.role_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          user.current_login_status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                        }`}></div>
                        <span className={`text-sm font-medium ${
                          user.current_login_status === 'Active' ? 'text-green-700' : 'text-gray-700'
                        }`}>
                          {user.current_login_status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{formatDate(user.last_login_time)}</div>
                      <div className="text-xs text-gray-500 font-medium">{getTimeAgo(user.last_login_time)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{formatDate(user.last_logout_time)}</div>
                      <div className="text-xs text-gray-500 font-medium">{getTimeAgo(user.last_logout_time)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
                        {user.total_login_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{user.account_age_days} days</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {(filteredData.admins.length === 0 && filteredData.users.length === 0) && (
          <div className="text-center py-16 bg-white rounded border border-gray-200 shadow-lg">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaUsers className="text-gray-400 text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search or filter criteria to find what you&apos;re looking for.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterRole('all');
                  setFilterStatus('all');
                }}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded font-medium transition-all transform hover:scale-105"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}