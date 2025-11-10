//app/admin_dashboard/list_user/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  FaUser, 
  FaEnvelope, 
  FaIdCard, 
  FaBriefcase, 
  FaSearch, 
  FaFilter, 
  FaSync, 
  FaChevronDown,
  FaShieldAlt, // For SOC
  FaCog,       // For OPS
  FaGraduationCap, // For INTERN
  FaCrown      // For CTO
} from 'react-icons/fa';
import { motion } from 'framer-motion';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

export default function ListUserPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all'
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'first_name',
    direction: 'ascending'
  });
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Check mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin_dashboard/list_user');
        const data = await response.json();
        
        if (response.ok && data.success) {
          setUsers(data.users);
          setFilteredUsers(data.users);
        } else {
          console.error('Failed to fetch users:', data.message);
        }
      } catch (error) {
        console.error('Network error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let result = users;
    
    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(user => 
        user.first_name.toLowerCase().includes(term) ||
        user.last_name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.soc_portal_id.toLowerCase().includes(term) ||
        user.ngd_id.toLowerCase().includes(term)
      );
    }
    
    // Apply role filter
    if (filters.role !== 'all') {
      result = result.filter(user => user.role_type === filters.role);
    }
    
    // Apply status filter
    if (filters.status !== 'all') {
      result = result.filter(user => user.status === filters.status);
    }
    
    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const valueA = a[sortConfig.key] || '';
        const valueB = b[sortConfig.key] || '';
        
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return sortConfig.direction === 'ascending' 
            ? valueA.localeCompare(valueB) 
            : valueB.localeCompare(valueA);
        }
        
        if (valueA < valueB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredUsers([...result]);
  }, [users, searchTerm, filters, sortConfig]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const refreshUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin_dashboard/list_user');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setUsers(data.users);
        setFilteredUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to refresh users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    return status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getRoleColor = (role) => {
    const colors = {
      'SOC': 'bg-blue-100 text-blue-800',
      'OPS': 'bg-purple-100 text-purple-800',
      'CTO': 'bg-amber-100 text-amber-800',
      'INTERN': 'bg-teal-100 text-teal-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  // Mobile user card component
  const UserCard = ({ user }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded shadow-sm p-4 mb-4 border border-gray-200"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-4">
          <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-white shadow relative">
  <Image 
    src={user.profile_photo_url}
    alt={`${user.first_name} ${user.last_name}`}
    fill
    style={{objectFit: 'cover'}}
    unoptimized
    priority={false}
    onError={(e) => {
      e.target.onerror = null;
      e.target.src = '/api/storage/user_dp/default_DP.png';
    }}
  />
</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {user.first_name} {user.last_name}
            </h3>
            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(user.status)}`}>
              {user.status}
            </span>
          </div>
          
          <div className="mt-1 flex items-center text-sm text-gray-500">
            <FaIdCard className="mr-1.5 flex-shrink-0" />
            <span className="truncate">{user.soc_portal_id}</span>
          </div>
          
          <div className="mt-1 flex items-center text-sm text-gray-500">
            <FaEnvelope className="mr-1.5 flex-shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          
          <div className="mt-1 flex items-center">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(user.role_type)}`}>
              {user.role_type}
            </span>
            <span className="ml-2 text-sm text-gray-500 truncate">
              {user.designation}
            </span>
          </div>
          
          <div className="mt-3 flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1 px-3 py-1.5 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 text-sm"
              onClick={() => router.push(`/admin_dashboard/view_user/${user.soc_portal_id}`)}
            >
              View
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1 px-3 py-1.5 border border-transparent text-white bg-blue-600 rounded hover:bg-blue-700 text-sm"
              onClick={() => router.push(`/admin_dashboard/edit_user/${user.soc_portal_id}`)}
            >
              Edit
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2"
          >
            User Management
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 text-sm sm:text-base"
          >
            View and manage all registered users in SOC Portal
          </motion.p>
        </div>

        {/* Enhanced Stats Section */}
<motion.div 
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.3 }}
  className="space-y-6 mb-8"
>
  {/* First Row - Overall Stats */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {/* Total Users */}
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded p-6 shadow-xl overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/10 rounded">
            <FaUser className="text-2xl text-white/80" />
          </div>
          <div className="text-white/60 text-sm font-medium">Total</div>
        </div>
        <div className="text-3xl font-bold text-white mb-1">{users.length}</div>
        <div className="text-white/70 text-sm">All Users</div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-purple-400"></div>
    </motion.div>

    {/* Active Users */}
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative bg-gradient-to-br from-emerald-500 to-green-600 rounded p-6 shadow-xl overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded">
            <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
          </div>
          <div className="text-white/80 text-sm font-medium">Active</div>
        </div>
        <div className="text-3xl font-bold text-white mb-1">
          {users.filter(u => u.status === 'Active').length}
        </div>
        <div className="text-white/90 text-sm">Currently Working</div>
      </div>
    </motion.div>

    {/* Inactive Users */}
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative bg-gradient-to-br from-amber-500 to-orange-500 rounded p-6 shadow-xl overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded">
            <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            </div>
          </div>
          <div className="text-white/80 text-sm font-medium">Inactive</div>
        </div>
        <div className="text-3xl font-bold text-white mb-1">
          {users.filter(u => u.status === 'Inactive').length}
        </div>
        <div className="text-white/90 text-sm">On Leave / Break</div>
      </div>
    </motion.div>

    {/* Resigned Users */}
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative bg-gradient-to-br from-rose-500 to-pink-600 rounded p-6 shadow-xl overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded">
            <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            </div>
          </div>
          <div className="text-white/80 text-sm font-medium">Resigned</div>
        </div>
        <div className="text-3xl font-bold text-white mb-1">
          {users.filter(u => u.status === 'Resigned').length}
        </div>
        <div className="text-white/90 text-sm">Left Organization</div>
      </div>
    </motion.div>
  </div>

  {/* Second Row - Team Breakdown */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* SOC Team */}
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-white rounded p-6 shadow-lg border border-gray-100"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-blue-600">SOC Team</h3>
        <div className="w-10 h-10 bg-blue-50 rounded flex items-center justify-center">
          <FaShieldAlt className="text-blue-500 text-lg" />
        </div>
      </div>
      
      <div className="text-2xl font-bold text-gray-800 mb-4">
        {users.filter(u => u.role_type === 'SOC').length}
        <span className="text-sm font-normal text-gray-500 ml-2">members</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Active</span>
          <span className="text-sm font-semibold text-green-600">
            {users.filter(u => u.role_type === 'SOC' && u.status === 'Active').length}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Inactive</span>
          <span className="text-sm font-semibold text-amber-600">
            {users.filter(u => u.role_type === 'SOC' && u.status === 'Inactive').length}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Resigned</span>
          <span className="text-sm font-semibold text-rose-600">
            {users.filter(u => u.role_type === 'SOC' && u.status === 'Resigned').length}
          </span>
        </div>
      </div>
    </motion.div>

    {/* OPS Team */}
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-white rounded p-6 shadow-lg border border-gray-100"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-purple-600">OPS Team</h3>
        <div className="w-10 h-10 bg-purple-50 rounded flex items-center justify-center">
          <FaCog className="text-purple-500 text-lg" />
        </div>
      </div>
      
      <div className="text-2xl font-bold text-gray-800 mb-4">
        {users.filter(u => u.role_type === 'OPS').length}
        <span className="text-sm font-normal text-gray-500 ml-2">members</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Active</span>
          <span className="text-sm font-semibold text-green-600">
            {users.filter(u => u.role_type === 'OPS' && u.status === 'Active').length}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Inactive</span>
          <span className="text-sm font-semibold text-amber-600">
            {users.filter(u => u.role_type === 'OPS' && u.status === 'Inactive').length}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Resigned</span>
          <span className="text-sm font-semibold text-rose-600">
            {users.filter(u => u.role_type === 'OPS' && u.status === 'Resigned').length}
          </span>
        </div>
      </div>
    </motion.div>

    {/* INTERN Team */}
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-white rounded p-6 shadow-lg border border-gray-100"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-teal-600">INTERN Team</h3>
        <div className="w-10 h-10 bg-teal-50 rounded flex items-center justify-center">
          <FaGraduationCap className="text-teal-500 text-lg" />
        </div>
      </div>
      
      <div className="text-2xl font-bold text-gray-800 mb-4">
        {users.filter(u => u.role_type === 'INTERN').length}
        <span className="text-sm font-normal text-gray-500 ml-2">members</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Active</span>
          <span className="text-sm font-semibold text-green-600">
            {users.filter(u => u.role_type === 'INTERN' && u.status === 'Active').length}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Inactive</span>
          <span className="text-sm font-semibold text-amber-600">
            {users.filter(u => u.role_type === 'INTERN' && u.status === 'Inactive').length}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Resigned</span>
          <span className="text-sm font-semibold text-rose-600">
            {users.filter(u => u.role_type === 'INTERN' && u.status === 'Resigned').length}
          </span>
        </div>
      </div>
    </motion.div>

    {/* CTO */}
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-gradient-to-br from-amber-500 to-orange-500 rounded p-6 shadow-xl text-white relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">CTO</h3>
          <div className="w-10 h-10 bg-white/20 rounded flex items-center justify-center">
            <FaCrown className="text-white text-lg" />
          </div>
        </div>
        
        <div className="text-3xl font-bold mb-2">
          {users.filter(u => u.role_type === 'CTO').length}
        </div>
        <div className="text-white/80 text-sm">Technology Leaders</div>
        
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="text-sm text-white/60">
            Executive Management
          </div>
        </div>
      </div>
    </motion.div>
  </div>
</motion.div>

        {/* Compact Filter Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded shadow-sm p-4 sm:p-5 mb-6 border border-gray-200"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative w-full md:flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search users by name, email, or ID..."
                className="w-full pl-10 pr-4 py-2.5 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            
            <div className="hidden md:flex items-center gap-3">
              <div className="w-40">
                <select 
                  className="w-full rounded border border-gray-300 bg-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="SOC">SOC</option>
                  <option value="OPS">OPS</option>
                  <option value="INTERN">INTERN</option>
                  <option value="CTO">CTO</option>
                </select>
              </div>
              
              <div className="w-40">
                <select 
                  className="w-full rounded border border-gray-300 bg-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={refreshUsers}
                className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded p-2.5 transition-colors text-blue-700"
                disabled={loading}
              >
                <FaSync className={`${loading ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
            
            <div className="flex md:hidden items-center gap-3">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center py-2.5 px-3 bg-gray-100 rounded text-gray-800 font-medium flex-1"
              >
                <div className="flex items-center justify-center w-full">
                  <FaFilter className="text-gray-600 mr-2" />
                  Filters
                  <FaChevronDown className={`ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </div>
              </button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={refreshUsers}
                className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded p-3 transition-colors text-blue-700 flex-shrink-0"
                disabled={loading}
              >
                <FaSync className={`${loading ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
          </div>
          
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 grid grid-cols-2 gap-3 w-full md:hidden"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  className="w-full rounded border border-gray-300 bg-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="SOC">SOC</option>
                  <option value="OPS">OPS</option>
                  <option value="INTERN">INTER</option>
                  <option value="CTO">CTO</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  className="w-full rounded border border-gray-300 bg-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* User List */}
        {isMobile ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {loading ? (
              [...Array(5)].map((_, index) => (
                <div key={index} className="bg-white rounded shadow-sm p-4 mb-4 border border-gray-200 animate-pulse">
                  <div className="flex items-start">
                    <div className="bg-gray-200 rounded-full w-14 h-14 mr-4"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="flex space-x-2 mt-3">
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <UserCard key={user.soc_portal_id} user={user} />
              ))
            ) : (
              <div className="bg-white rounded p-6 text-center">
                <FaUser className="mx-auto text-gray-400 text-4xl mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No users found</h3>
                <p className="mt-1 text-gray-500">
                  {searchTerm || filters.role !== 'all' || filters.status !== 'all'
                    ? "No users match your search criteria. Try adjusting your filters."
                    : "No users found in the system."}
                </p>
                <button
                  onClick={() => router.push('/admin_dashboard/add_user')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  Create New User
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded shadow-sm overflow-hidden border border-gray-200"
          >
            {loading ? (
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {[...Array(5)].map((_, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="bg-gray-200 rounded-full w-10 h-10 animate-pulse"></div>
                              <div className="ml-4 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('first_name')}
                        >
                          <div className="flex items-center">
                            User
                            {sortConfig.key === 'first_name' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <motion.tr 
                            key={user.soc_portal_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ backgroundColor: '#f9fafb' }}
                            className="transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 relative">
  <Image 
    className="rounded-full object-cover" 
    src={user.profile_photo_url}
    alt={`${user.first_name} ${user.last_name}`}
    fill
    unoptimized
    priority={false}
    onError={(e) => {
      e.target.onerror = null;
      e.target.src = '/api/storage/user_dp/default_DP.png';
    }}
  />
</div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.first_name} {user.last_name}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <FaIdCard className="mr-1.5 text-gray-400" />
                                    {user.soc_portal_id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 flex items-center">
                                <FaEnvelope className="mr-2 text-blue-500" />
                                {user.email}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <FaBriefcase className="mr-1.5 text-gray-400" />
                                {user.designation}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${getRoleColor(user.role_type)}`}>
                                {user.role_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${getStatusColor(user.status)}`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 focus:outline-none"
                                  onClick={() => router.push(`/admin_dashboard/view_user/${user.soc_portal_id}`)}
                                >
                                  View
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none"
                                  onClick={() => router.push(`/admin_dashboard/edit_user/${user.soc_portal_id}`)}
                                >
                                  Edit
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <FaUser className="text-gray-400 text-4xl mb-3" />
                              <h3 className="text-lg font-medium text-gray-900">No users found</h3>
                              <p className="mt-1 text-gray-500 max-w-md">
                                {searchTerm || filters.role !== 'all' || filters.status !== 'all'
                                  ? "No users match your search criteria. Try adjusting your filters."
                                  : "No users found in the system. Add new users using the 'Create User' option."}
                              </p>
                              <button
                                onClick={() => router.push('/admin_dashboard/add_user')}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                Create New User
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {filteredUsers.length > 0 && (
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">1</span> to{' '}
                          <span className="font-medium">{filteredUsers.length}</span> of{' '}
                          <span className="font-medium">{filteredUsers.length}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded shadow-sm -space-x-px" aria-label="Pagination">
                          <button className="relative inline-flex items-center px-2 py-2 rounded border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                            Previous
                          </button>
                          <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                            1
                          </button>
                          <button className="relative inline-flex items-center px-2 py-2 rounded border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                            Next
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}