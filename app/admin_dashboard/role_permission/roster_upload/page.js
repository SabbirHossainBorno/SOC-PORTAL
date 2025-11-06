//app/admin_dashboard/role_permission/roster_upload/page.js
'use client';

import { useState, useEffect } from 'react';
import { 
  FaUsers, FaEdit, FaTrash, FaPlus, FaSearch, 
  FaCheck, FaTimes, FaUserCheck, FaShieldAlt,
  FaSort, FaSortUp, FaSortDown, FaFilter,
  FaEye, FaEyeSlash, FaKey, FaUserCog, FaUser
} from 'react-icons/fa';
import { MdOutlineAssignmentLate } from "react-icons/md";
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Image from 'next/image';
import LoadingSpinner from '../../../components/LoadingSpinner';

export default function RosterUploadPermissions() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [actionLoading, setActionLoading] = useState(false);
  const [filterPermission, setFilterPermission] = useState('ALL');

  // Fetch permissions data
  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin_dashboard/role_permission/roster_upload');
      const result = await response.json();

      if (result.success) {
        setPermissions(result.data);
      } else {
        toast.error('Failed to fetch permissions');
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Error fetching permissions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available SOC users for adding
  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/admin_dashboard/role_permission/roster_upload/available_users');
      const result = await response.json();

      if (result.success) {
        setAvailableUsers(result.data);
      } else {
        toast.error('Failed to fetch available users');
      }
    } catch (error) {
      console.error('Error fetching available users:', error);
      toast.error('Error fetching available users');
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sort permissions
  const sortedPermissions = [...permissions].sort((a, b) => {
    if (sortConfig.direction === 'asc') {
      return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
    }
    return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
  });

  // Filter permissions based on search and permission filter
  const filteredPermissions = sortedPermissions.filter(permission => {
    const matchesSearch = 
      permission.short_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.soc_portal_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterPermission === 'ALL' || 
      permission.permission === filterPermission;
    
    return matchesSearch && matchesFilter;
  });

  // Stats calculations
  const stats = {
    total: permissions.length,
    allowed: permissions.filter(p => p.permission === 'ALLOW').length,
    denied: permissions.filter(p => p.permission === 'DENY').length,
    active: permissions.filter(p => p.status === 'Active').length
  };

  // Open add modal
  const openAddModal = async () => {
    await fetchAvailableUsers();
    setShowAddModal(true);
  };

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Handle user selection for adding
  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.soc_portal_id === user.soc_portal_id);
      if (isSelected) {
        return prev.filter(u => u.soc_portal_id !== user.soc_portal_id);
      } else {
        return [...prev, user];
      }
    });
  };

  // Select all users
  const selectAllUsers = () => {
    if (selectedUsers.length === availableUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers([...availableUsers]);
    }
  };

  // Add new permissions
  const handleAddPermissions = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch('/api/admin_dashboard/role_permission/roster_upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selectedUsers }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        if (result.skipped && result.skipped.length > 0) {
          toast.success(`Skipped (already exists): ${result.skipped.join(', ')}`);
        }
        setShowAddModal(false);
        setSelectedUsers([]);
        fetchPermissions();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error adding permissions:', error);
      toast.error('Error adding permissions');
    } finally {
      setActionLoading(false);
    }
  };

  // Update permission
  const handleUpdatePermission = async (newPermission) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin_dashboard/role_permission/roster_upload', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          soc_portal_id: selectedUser.soc_portal_id,
          permission: newPermission
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Permission updated successfully');
        setShowEditModal(false);
        setSelectedUser(null);
        fetchPermissions();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Error updating permission');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete permission
  const handleDeletePermission = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin_dashboard/role_permission/roster_upload?soc_portal_id=${selectedUser.soc_portal_id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Permission removed successfully');
        setShowDeleteModal(false);
        setSelectedUser(null);
        fetchPermissions();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error deleting permission:', error);
      toast.error('Error deleting permission');
    } finally {
      setActionLoading(false);
    }
  };

  // Get sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="text-gray-500" />;
    return sortConfig.direction === 'asc' ? 
      <FaSortUp className="text-blue-600" /> : 
      <FaSortDown className="text-blue-600" />;
  };

  // Profile Photo Component
  const ProfilePhoto = ({ user, size = 'md' }) => {
    const sizeClasses = {
      sm: 'w-10 h-10 text-sm',
      md: 'w-12 h-12 text-lg',
      lg: 'w-16 h-16 text-xl',
      xl: 'w-20 h-20 text-2xl'
    };

    if (user.profile_photo_url) {
      return (
        <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden border-2 border-white shadow-lg`}>
          <Image
            src={user.profile_photo_url}
            alt={user.short_name}
            fill
            className="object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold rounded hidden`}>
            {user.short_name.charAt(0)}
          </div>
        </div>
      );
    }

    return (
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold rounded shadow-lg`}>
        {user.short_name.charAt(0)}
      </div>
    );
  };

  // Permission badge component
  const PermissionBadge = ({ permission }) => (
    <span className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-semibold ${
      permission === 'ALLOW' 
        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm' 
        : 'bg-rose-100 text-rose-800 border border-rose-200 shadow-sm'
    }`}>
      {permission === 'ALLOW' ? (
        <FaCheck className="w-4 h-4 mr-1.5" />
      ) : (
        <FaTimes className="w-4 h-4 mr-1.5" />
      )}
      {permission}
    </span>
  );

  // Status badge component
  const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
      status === 'Active' 
        ? 'bg-green-100 text-green-800' 
        : 'bg-gray-100 text-gray-800'
    }`}>
      {status}
    </span>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center mb-6 lg:mb-0">
            <div className="mb-6 lg:mb-0">
  <div className="flex items-center">
    <div className="bg-white p-3 rounded-2xl shadow-lg border border-blue-100 mr-4">
      <MdOutlineAssignmentLate className="text-2xl text-blue-600" />
    </div>
    <h1 className="text-4xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
      Roster Upload Permissions
    </h1>
  </div>
  <p className="mt-3 text-md text-gray-700 max-w-2xl ml-16">
    Manage SOC team members who can upload roster schedules with granular access control
  </p>
</div>
            </div>
            <button
              onClick={openAddModal}
              className="group relative inline-flex items-center px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 hover:from-blue-700 hover:to-indigo-700"
            >
              <div className="absolute inset-0 bg-white/20 rounded blur-sm group-hover:blur-md transition-all"></div>
              <FaPlus className="mr-3 text-lg relative z-10" />
              <span className="relative z-10">Add Users</span>
            </button>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white/80 backdrop-blur-sm rounded shadow-lg border border-blue-100/50 p-6 transform hover:-translate-y-1 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded">
                <FaUsers className="text-2xl text-blue-600" />
              </div>
            </div>
            <div className="mt-4 h-2 bg-blue-100 rounded overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded"
                style={{ width: '100%' }}
              ></div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded shadow-lg border border-emerald-100/50 p-6 transform hover:-translate-y-1 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Allowed</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.allowed}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded">
                <FaCheck className="text-2xl text-emerald-600" />
              </div>
            </div>
            <div className="mt-4 h-2 bg-emerald-100 rounded overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded"
                style={{ width: `${stats.total ? (stats.allowed / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded shadow-lg border border-rose-100/50 p-6 transform hover:-translate-y-1 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Denied</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.denied}</p>
              </div>
              <div className="p-3 bg-rose-100 rounded">
                <FaTimes className="text-2xl text-rose-600" />
              </div>
            </div>
            <div className="mt-4 h-2 bg-rose-100 rounded overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded"
                style={{ width: `${stats.total ? (stats.denied / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded shadow-lg border border-purple-100/50 p-6 transform hover:-translate-y-1 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Active</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.active}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded">
                <FaShieldAlt className="text-2xl text-purple-600" />
              </div>
            </div>
            <div className="mt-4 h-2 bg-purple-100 rounded overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded"
                style={{ width: '100%' }}
              ></div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg" />
                <input
                  type="text"
                  placeholder="Search users by name, ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 font-medium shadow-sm transition-all"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-3">
                <FaFilter className="text-gray-500 text-lg" />
                <select
                  value={filterPermission}
                  onChange={(e) => setFilterPermission(e.target.value)}
                  className="px-4 py-3 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium shadow-sm"
                >
                  <option value="ALL">All Permissions</option>
                  <option value="ALLOW">Allowed Only</option>
                  <option value="DENY">Denied Only</option>
                </select>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded px-4 py-3">
                <p className="text-sm font-semibold text-blue-800">
                  Showing <span className="text-blue-600">{filteredPermissions.length}</span> of{' '}
                  <span className="text-blue-600">{permissions.length}</span> users
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Permissions Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-300">
                  <th 
                    className="px-8 py-5 text-left text-sm font-bold text-gray-800 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('short_name')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>User</span>
                      {getSortIcon('short_name')}
                    </div>
                  </th>
                  <th className="px-6 py-5 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-5 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-5 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
                    Status
                  </th>
                  <th 
                    className="px-6 py-5 text-left text-sm font-bold text-gray-800 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('permission')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Permission</span>
                      {getSortIcon('permission')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-5 text-left text-sm font-bold text-gray-800 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Created</span>
                      {getSortIcon('created_at')}
                    </div>
                  </th>
                  <th className="px-6 py-5 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPermissions.map((permission, index) => (
                  <motion.tr
                    key={permission.soc_portal_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50/80 transition-all duration-200 group"
                  >
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <ProfilePhoto user={permission} size="md" />
                        <div className="ml-4">
                          <div className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {permission.short_name}
                          </div>
                          <div className="text-sm text-gray-700 mt-1">
                            {permission.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-base font-medium text-gray-900 bg-gray-100 px-3 py-1.5 rounded inline-block">
                        {permission.soc_portal_id}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-base font-semibold text-gray-800">
                        {permission.role_type}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <StatusBadge status={permission.status} />
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <PermissionBadge permission={permission.permission} />
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(permission.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {new Date(permission.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => openEditModal(permission)}
                          className="p-2.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                          title="Edit Permission"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(permission)}
                          className="p-2.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 hover:text-rose-700 transition-all duration-200 shadow-sm hover:shadow-md"
                          title="Remove Permission"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPermissions.length === 0 && (
            <div className="text-center py-16">
              <div className="bg-white/50 rounded p-8 max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded flex items-center justify-center mx-auto mb-6">
                  <FaUsers className="text-3xl text-gray-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {searchTerm || filterPermission !== 'ALL' ? 'No users found' : 'No permissions yet'}
                </h3>
                <p className="text-gray-700 mb-6 text-lg">
                  {searchTerm || filterPermission !== 'ALL' 
                    ? 'Try adjusting your search or filter terms' 
                    : 'Get started by adding users to manage roster upload permissions'
                  }
                </p>
                {!searchTerm && filterPermission === 'ALL' && (
                  <button
                    onClick={openAddModal}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                  >
                    <FaPlus className="mr-3" />
                    Add Users
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Add Users Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-300"
              >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-white/20 p-3 rounded mr-4">
                        <FaUserCheck className="text-2xl text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Add Roster Upload Permissions</h2>
                        <p className="text-blue-100 text-lg mt-1">
                          Select SOC team members to grant roster upload permissions
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded"
                    >
                      <FaTimes className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="p-6 max-h-96 overflow-y-auto">
                  {availableUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-700 text-lg font-medium">Loading available users...</p>
                      <p className="text-gray-500 mt-2">Please wait while we fetch the user list</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded border border-blue-200">
                        <div>
                          <p className="font-semibold text-blue-900">Select Users</p>
                          <p className="text-blue-700 text-sm mt-1">
                            Choose SOC team members to grant roster upload access
                          </p>
                        </div>
                        <button
                          onClick={selectAllUsers}
                          className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded hover:bg-blue-50 font-medium transition-colors"
                        >
                          {selectedUsers.length === availableUsers.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>

                      {availableUsers.map(user => (
                        <div
                          key={user.soc_portal_id}
                          className={`flex items-center justify-between p-5 rounded border-2 cursor-pointer transition-all ${
                            selectedUsers.some(u => u.soc_portal_id === user.soc_portal_id)
                              ? 'bg-blue-50 border-blue-300 shadow-md'
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                          }`}
                          onClick={() => toggleUserSelection(user)}
                        >
                          <div className="flex items-center">
                            <ProfilePhoto user={user} size="lg" />
                            <div className="ml-4">
                              <div className="text-lg font-semibold text-gray-900">
                                {user.short_name}
                              </div>
                              <div className="text-gray-700">
                                {user.soc_portal_id}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {user.email}
                              </div>
                            </div>
                          </div>
                          <div className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-all ${
                            selectedUsers.some(u => u.soc_portal_id === user.soc_portal_id)
                              ? 'bg-blue-600 border-blue-600 shadow-inner'
                              : 'bg-white border-gray-400'
                          }`}>
                            {selectedUsers.some(u => u.soc_portal_id === user.soc_portal_id) && (
                              <FaCheck className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold text-gray-900">
                      {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setShowAddModal(false)}
                        className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 font-semibold transition-all shadow-sm hover:shadow-md"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddPermissions}
                        disabled={selectedUsers.length === 0 || actionLoading}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-lg hover:shadow-xl flex items-center"
                      >
                        {actionLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                            Adding Permissions...
                          </>
                        ) : (
                          <>
                            <FaUserCheck className="mr-3 text-lg" />
                            Add Permissions
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Enhanced Edit Permission Modal */}
        <AnimatePresence>
          {showEditModal && selectedUser && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded shadow-2xl max-w-md w-full border border-gray-300"
              >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded">
                  <h2 className="text-2xl font-bold text-white">Update Permission</h2>
                  <p className="text-blue-100 text-lg mt-1">
                    Change roster upload access for {selectedUser.short_name}
                  </p>
                </div>

                <div className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-center p-5 bg-gray-50 rounded border border-gray-200">
                      <ProfilePhoto user={selectedUser} size="xl" />
                      <div className="ml-4">
                        <div className="text-xl font-bold text-gray-900">
                          {selectedUser.short_name}
                        </div>
                        <div className="text-gray-700 font-medium">
                          {selectedUser.soc_portal_id}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {selectedUser.email}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-lg font-semibold text-gray-900 mb-4">
                        Select Permission Level
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => handleUpdatePermission('ALLOW')}
                          disabled={actionLoading}
                          className={`p-5 border-3 rounded text-center transition-all ${
                            selectedUser.permission === 'ALLOW'
                              ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                              : 'border-gray-300 bg-white hover:border-emerald-400 hover:shadow-md'
                          } disabled:opacity-50`}
                        >
                          <div className="w-12 h-12 bg-emerald-100 rounded flex items-center justify-center mx-auto mb-3">
                            <FaCheck className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div className="font-bold text-emerald-700 text-lg">ALLOW</div>
                          <div className="text-sm text-emerald-600 mt-2">Can upload rosters</div>
                        </button>
                        <button
                          onClick={() => handleUpdatePermission('DENY')}
                          disabled={actionLoading}
                          className={`p-5 border-3 rounded text-center transition-all ${
                            selectedUser.permission === 'DENY'
                              ? 'border-rose-500 bg-rose-50 shadow-lg'
                              : 'border-gray-300 bg-white hover:border-rose-400 hover:shadow-md'
                          } disabled:opacity-50`}
                        >
                          <div className="w-12 h-12 bg-rose-100 rounded flex items-center justify-center mx-auto mb-3">
                            <FaTimes className="w-6 h-6 text-rose-600" />
                          </div>
                          <div className="font-bold text-rose-700 text-lg">DENY</div>
                          <div className="text-sm text-rose-600 mt-2">Cannot upload</div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50 rounded flex justify-end">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 font-semibold transition-all shadow-sm hover:shadow-md"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Enhanced Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && selectedUser && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded shadow-2xl max-w-md w-full border border-gray-300"
              >
                <div className="bg-gradient-to-r from-rose-600 to-pink-600 p-6 rounded">
                  <h2 className="text-2xl font-bold text-white">Remove Permission</h2>
                  <p className="text-rose-100 text-lg mt-1">
                    Confirm removal of roster upload access
                  </p>
                </div>

                <div className="p-6">
                  <div className="flex items-center p-5 bg-rose-50 border border-rose-200 rounded">
                    <ProfilePhoto user={selectedUser} size="lg" />
                    <div className="ml-4">
                      <div className="text-xl font-bold text-rose-800">
                        {selectedUser.short_name}
                      </div>
                      <div className="text-rose-700 font-medium">
                        {selectedUser.soc_portal_id}
                      </div>
                      <div className="text-sm text-rose-600 mt-2">
                        This user will lose roster upload capabilities
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded">
                    <div className="flex items-center">
                      <FaEyeSlash className="text-amber-600 mr-3 text-lg" />
                      <p className="text-amber-800 font-medium">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50 rounded flex justify-end space-x-4">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 font-semibold transition-all shadow-sm hover:shadow-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeletePermission}
                    disabled={actionLoading}
                    className="px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded hover:from-rose-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-lg hover:shadow-xl flex items-center"
                  >
                    {actionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Removing...
                      </>
                    ) : (
                      <>
                        <FaTrash className="mr-3" />
                        Remove Permission
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}