// app/admin_dashboard/role_permission/role_management/page.js
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  FaUsers, 
  FaShieldAlt, 
  FaCheck, 
  FaTimes, 
  FaSave,
  FaSearch,
  FaEye,
  FaEyeSlash,
  FaCog,
  FaUserShield,
  FaLayerGroup,
  FaUserTag,
  FaUserCheck,
  FaUserTimes,
  FaChevronRight,
  FaChevronDown,
  FaSpinner,
  FaFilter,
  FaSync,
  FaArrowRight,
  FaCaretRight,
  FaFolder,
  FaFolderOpen
} from 'react-icons/fa';

export default function RoleManagement() {
  const [roleType, setRoleType] = useState('');
  const [socPortalId, setSocPortalId] = useState('all');
  const [users, setUsers] = useState([]);
  const [menuStructure, setMenuStructure] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMenus, setExpandedMenus] = useState({});

  const roles = ['SOC', 'OPS', 'INTERN', 'CTO'];

  useEffect(() => {
    const getAdminFromCookies = () => {
      const cookies = document.cookie.split(';');
      const adminCookie = cookies.find(c => c.trim().startsWith('socPortalId='));
      if (adminCookie) {
        setCurrentAdmin(adminCookie.split('=')[1]);
      }
    };
    getAdminFromCookies();
  }, []);

  useEffect(() => {
    if (roleType) {
      fetchUsersByRole(roleType);
      fetchMenuStructure();
    }
  }, [roleType]);

  useEffect(() => {
    if (roleType && (socPortalId || socPortalId === 'all') && menuStructure.length > 0) {
      fetchCurrentPermissions();
    }
  }, [roleType, socPortalId, menuStructure]);

  const fetchUsersByRole = async (role) => {
    setUsersLoading(true);
    try {
      const response = await fetch(`/api/admin_dashboard/role_permission/role_management/users_by_role?role_type=${role}`);
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      toast.error('Error fetching users');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchMenuStructure = async () => {
    try {
      const response = await fetch('/api/admin_dashboard/role_permission/role_management/menu_structure');
      const data = await response.json();
      
      if (data.success) {
        setMenuStructure(data.menuStructure);
        const initialPermissions = {};
        flattenMenu(data.menuStructure, initialPermissions, true);
        setPermissions(initialPermissions);
        
        const expanded = {};
        data.menuStructure.forEach(item => {
          if (item.children && item.children.length > 0) {
            expanded[item.path] = true;
          }
        });
        setExpandedMenus(expanded);
      }
    } catch (error) {
      toast.error('Error fetching menu structure');
    }
  };

  const fetchCurrentPermissions = async () => {
    try {
      const params = new URLSearchParams({
        role_type: roleType,
        soc_portal_id: socPortalId
      });
      
      const response = await fetch(`/api/admin_dashboard/role_permission/role_management/current_permissions?${params}`);
      const data = await response.json();
      
      if (data.success) {
        const currentPerms = {};
        flattenMenu(menuStructure, currentPerms, false);
        
        data.permissions.forEach(perm => {
          if (perm.is_allowed) {
            currentPerms[perm.menu_path] = true;
          }
        });
        
        setPermissions(currentPerms);
      }
    } catch (error) {
      toast.error('Error fetching current permissions');
    }
  };

  const flattenMenu = (menu, permissionsObj, defaultValue) => {
    menu.forEach(item => {
      permissionsObj[item.path] = !!defaultValue;
      if (item.children && item.children.length > 0) {
        flattenMenu(item.children, permissionsObj, defaultValue);
      }
    });
  };

  const handlePermissionChange = (menuPath, isAllowed) => {
    setPermissions(prev => ({
      ...prev,
      [menuPath]: !!isAllowed
    }));
  };

  const handleSelectAll = (isAllowed) => {
    const newPermissions = { ...permissions };
    Object.keys(newPermissions).forEach(key => {
      newPermissions[key] = !!isAllowed;
    });
    setPermissions(newPermissions);
    toast.success(`${isAllowed ? 'Allowed' : 'Denied'} all permissions`);
  };

  const toggleMenu = (menuPath) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuPath]: !prev[menuPath]
    }));
  };

  const handleSubmit = async () => {
    if (!roleType || !currentAdmin) {
      toast.error('Please select role type and ensure you are logged in');
      return;
    }

    setLoading(true);
    try {
      const permissionsArray = Object.entries(permissions).map(([menu_path, is_allowed]) => {
        const menuItem = findMenuItem(menu_path, menuStructure);
        return {
          menu_path,
          menu_label: menuItem?.label || menu_path,
          parent_menu: menuItem?.parent_menu || null,
          is_allowed: !!is_allowed
        };
      });

      const response = await fetch('/api/admin_dashboard/role_permission/role_management/save_permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleType,
          socPortalId: socPortalId === 'all' ? null : socPortalId,
          permissions: permissionsArray,
          createdBy: currentAdmin
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Permissions saved successfully!');
      } else {
        toast.error(data.message || 'Failed to save permissions');
      }
    } catch (error) {
      toast.error('Error saving permissions');
    } finally {
      setLoading(false);
    }
  };

  const findMenuItem = (path, menu) => {
    for (const item of menu) {
      if (item.path === path) return item;
      if (item.children) {
        const found = findMenuItem(path, item.children);
        if (found) return found;
      }
    }
    return null;
  };

  const filteredMenuStructure = menuStructure.filter(item => 
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.children && item.children.some(child => 
      child.label.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  );

  const getPermissionStats = () => {
    const total = Object.keys(permissions).length;
    const allowed = Object.values(permissions).filter(val => val === true).length;
    const denied = total - allowed;
    return { total, allowed, denied };
  };

  const stats = getPermissionStats();

  const renderMenuTree = (menu, level = 0) => {
  return menu.map(item => {
    const hasChildren = item.children && item.children.length > 0;
    const isAllowed = permissions[item.path] === true;
    const isExpanded = expandedMenus[item.path];
    const isHidden = item.isHidden; // Check if route is hidden
    
    return (
      <div key={item.path} className="mb-1">
        {/* Parent Menu Item */}
        <div 
          className={`
            flex items-center justify-between p-4 transition-all duration-200 border-l-4
            ${isAllowed 
              ? 'border-green-500 bg-green-50 hover:bg-green-100' 
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            }
            ${isHidden ? 'opacity-70 bg-blue-50 border-blue-300' : ''}
            ${level === 0 ? 'ml-0' : level === 1 ? 'ml-6' : level === 2 ? 'ml-12' : 'ml-16'}
          `}
          style={{ 
            borderLeftWidth: '4px',
            marginLeft: `${level * 24}px`
          }}
        >
          <div className="flex items-center space-x-3 flex-1">
            {hasChildren && (
              <button
                onClick={() => toggleMenu(item.path)}
                className={`p-1 rounded transition-colors ${
                  isAllowed ? 'text-green-600 hover:bg-green-200' : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                {isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
              </button>
            )}
            {!hasChildren && (
              <div className="w-5 flex justify-center">
                <FaCaretRight size={12} className="text-gray-400" />
              </div>
            )}
            
            <div className={`p-2 rounded ${
              isAllowed 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-400'
            } ${isHidden ? 'bg-blue-100 text-blue-600' : ''}`}>
              {hasChildren ? (
                isExpanded ? <FaFolderOpen size={14} /> : <FaFolder size={14} />
              ) : (
                isHidden ? <FaEyeSlash size={14} /> : <FaCaretRight size={14} />
              )}
            </div>
            
            <div className="flex-1">
              <h3 className={`font-medium ${
                isAllowed ? 'text-gray-900' : 'text-gray-700'
              } ${isHidden ? 'text-blue-800' : ''}`}>
                {item.label}
                {isHidden && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    <FaEyeSlash className="mr-1" size={8} />
                    Hidden
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">
                {item.path}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              isAllowed 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            } ${isHidden ? 'bg-blue-100 text-blue-800' : ''}`}>
              {isAllowed ? 'Allowed' : 'Denied'}
            </span>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAllowed}
                onChange={(e) => handlePermissionChange(item.path, e.target.checked)}
                className="sr-only peer"
              />
              <div className={`w-12 h-6 rounded-full peer ${
                isAllowed ? 'bg-green-500' : 'bg-gray-300'
              } peer-focus:ring-2 peer-focus:ring-green-300 transition-colors duration-200`}>
                <div className={`absolute top-1 left-1 bg-white rounded-full h-4 w-4 transition-transform duration-200 ${
                  isAllowed ? 'transform translate-x-6' : ''
                }`}></div>
              </div>
            </label>
          </div>
        </div>

        {/* Children Menus */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {renderMenuTree(item.children, level + 1)}
          </div>
        )}
      </div>
    );
  });
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50/30 pb-8">
      {/* Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-700 rounded shadow-lg">
                <FaUserShield className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
                <p className="text-gray-600 text-sm">Hierarchical permission management system</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-all duration-200 text-sm">
                <FaSync className="text-gray-500 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Sidebar - Configuration */}
          <div className="xl:col-span-1 space-y-6">
            {/* Configuration Card */}
            <div className="bg-white rounded shadow-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FaCog className="mr-2 text-blue-600" />
                  Configuration
                </h2>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Role Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={roleType}
                    onChange={(e) => setRoleType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  >
                    <option value="">Select Role Type</option>
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                {/* User Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Specific User
                  </label>
                  <div className="relative">
                    <select
                      value={socPortalId}
                      onChange={(e) => setSocPortalId(e.target.value)}
                      disabled={!roleType || usersLoading}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="all">All {roleType} Users</option>
                      {users.map(user => (
                        <option key={user.soc_portal_id} value={user.soc_portal_id}>
                          {user.first_name} {user.last_name}
                        </option>
                      ))}
                    </select>
                    {usersLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <FaSpinner className="animate-spin text-blue-500" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                {roleType && (
                  <div className="bg-gray-50 rounded p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm">Overview</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">{users.length}</div>
                        <div className="text-xs text-gray-600">Users</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">{stats.allowed}</div>
                        <div className="text-xs text-gray-600">Allowed</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <button
                  onClick={handleSubmit}
                  disabled={loading || !roleType}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-semibold"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FaSave />
                      <span>Save Permissions</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded shadow-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 text-sm">Quick Actions</h3>
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() => handleSelectAll(true)}
                  className="w-full flex items-center justify-between p-3 text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors text-sm font-medium"
                >
                  <span>Allow All</span>
                  <FaEye />
                </button>
                <button
                  onClick={() => handleSelectAll(false)}
                  className="w-full flex items-center justify-between p-3 text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors text-sm font-medium"
                >
                  <span>Deny All</span>
                  <FaEyeSlash />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content - Permissions Tree */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded shadow-lg border border-gray-200">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <FaShieldAlt className="mr-2 text-green-600" />
                      Permission Hierarchy
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                      Managing permissions for <span className="font-semibold text-gray-800">
                        {socPortalId === 'all' ? `All ${roleType} Users` : `Selected User`}
                      </span>
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search menus..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 w-64 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">
                        Allowed: <span className="font-semibold text-green-600">{stats.allowed}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-gray-700">
                        Denied: <span className="font-semibold text-red-600">{stats.denied}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-gray-700">
                        Total: <span className="font-semibold text-gray-600">{stats.total}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 flex items-center">
                    <FaFilter className="mr-1" />
                    {filteredMenuStructure.length} of {menuStructure.length} menus
                  </div>
                </div>
              </div>

              {/* Permissions Tree */}
              <div className="p-6">
                {roleType ? (
                  filteredMenuStructure.length > 0 ? (
                    <div className="space-y-1">
                      {renderMenuTree(filteredMenuStructure)}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-300 text-4xl mb-3">🔍</div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No menus found</h3>
                      <p className="text-gray-500 text-sm">
                        Try adjusting your search terms
                      </p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-300 text-4xl mb-3">🛡️</div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a Role Type</h3>
                    <p className="text-gray-500 text-sm">
                      Choose a role type from the sidebar to start managing permissions
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}