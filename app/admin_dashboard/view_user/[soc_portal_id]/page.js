'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { 
  FaUser, FaEnvelope, FaPhone, FaIdCard, FaBriefcase, 
  FaTint, FaVenusMars, FaCalendarAlt, FaArrowLeft,
  FaEdit, FaHistory, FaShieldAlt, FaClock, FaMapMarker,
  FaMobile, FaUserCheck, FaUserTimes, FaStar
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function ViewUserPage() {
  const router = useRouter();
  const params = useParams();
  const soc_portal_id = params.soc_portal_id;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const hasFetched = useRef(false);

  useEffect(() => {
    // Prevent duplicate requests in development mode
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin_dashboard/view_user/${soc_portal_id}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setUser(data.user);
        } else {
          setError(data.message || 'Failed to fetch user details');
        }
      } catch (err) {
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (soc_portal_id) {
      fetchUserDetails();
    }
  }, [soc_portal_id]);

  const getStatusColor = (status) => {
    return status === 'Active' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const getRoleColor = (role) => {
    const colors = {
      'SOC': 'bg-blue-100 text-blue-800 border-blue-200',
      'OPS': 'bg-purple-100 text-purple-800 border-purple-200',
      'CTO': 'bg-amber-100 text-amber-800 border-amber-200',
      'BI': 'bg-teal-100 text-teal-800 border-teal-200'
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const calculateTenure = (joiningDate) => {
    const today = new Date();
    const joinDate = new Date(joiningDate);
    const months = (today.getFullYear() - joinDate.getFullYear()) * 12 + (today.getMonth() - joinDate.getMonth());
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) {
      return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
    } else if (remainingMonths === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaUser className="text-4xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">User Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested user does not exist.'}</p>
          <button
            onClick={() => router.push('/admin_dashboard/list_user')}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Back to User List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center mb-4 sm:mb-0">
              <button
                onClick={() => router.push('/admin_dashboard/list_user')}
                className="mr-4 p-2 bg-white rounded shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <FaArrowLeft className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                  User Details
                </h1>
              </div>
            </div>
            <div className="flex space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(`/admin_dashboard/edit_user/${user.soc_portal_id}`)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <FaEdit className="mr-2" />
                Edit User
              </motion.button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Profile Card */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
              {/* Profile Photo */}
              <div className="text-center mb-6">
                <div className="relative mx-auto w-32 h-32 mb-4">
                  <Image
                    src={user.profile_photo_url || '/storage/user_dp/default_DP.png'}
                    alt={`${user.first_name} ${user.last_name}`}
                    fill
                    className="rounded-full object-cover border-4 border-white shadow-lg"
                    onError={(e) => {
                      e.target.src = '/storage/user_dp/default_DP.png';
                    }}
                  />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  {user.first_name} {user.last_name}
                </h2>
                <p className="text-gray-600">{user.designation}</p>
                
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                    <div className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${getStatusColor(user.status)} border`}>
                        {user.status === 'Active' ? <FaUserCheck className="mr-1" /> : <FaUserTimes className="mr-1" />}
                        {user.status}
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${getRoleColor(user.role_type)} border`}>
                        <FaShieldAlt className="mr-1" />
                        {user.role_type}
                    </div>
                    </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Age</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {calculateAge(user.date_of_birth)}
                    </p>
                  </div>
                  <FaCalendarAlt className="text-3xl text-blue-500" />
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-green-700">Tenure</p>
                    <p className="text-lg font-bold text-green-900">
                      {calculateTenure(user.joining_date)}
                    </p>
                  </div>
                  <FaHistory className="text-3xl text-green-500" />
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Member Since</p>
                    <p className="text-lg font-bold text-purple-900">
                      {format(new Date(user.joining_date), 'MMM yyyy')}
                    </p>
                  </div>
                  <FaStar className="text-3xl text-purple-500" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {['personal', 'professional', 'contact'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-4 px-6 text-center font-medium text-sm border-b-2 transition-colors ${
                        activeTab === tab
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab === 'personal' && 'Personal Info'}
                      {tab === 'professional' && 'Professional Info'}
                      {tab === 'contact' && 'Contact Details'}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'personal' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    <InfoCard
                      icon={<FaUser className="text-blue-500" />}
                      title="Basic Information"
                      items={[
                        { label: 'First Name', value: user.first_name },
                        { label: 'Last Name', value: user.last_name },
                        { label: 'Short Name', value: user.short_name || 'Not set' },
                      ]}
                    />

                    <InfoCard
                      icon={<FaIdCard className="text-green-500" />}
                      title="Identification"
                      items={[
                        { label: 'SOC Portal ID', value: user.soc_portal_id },
                        { label: 'NGD ID', value: user.ngd_id },
                      ]}
                    />

                    <InfoCard
                      icon={<FaVenusMars className="text-pink-500" />}
                      title="Personal Details"
                      items={[
                        { label: 'Gender', value: user.gender },
                        { label: 'Blood Group', value: user.bloodgroup },
                        { label: 'Date of Birth', value: format(new Date(user.date_of_birth), 'MMMM dd, yyyy') },
                        { label: 'Age', value: `${calculateAge(user.date_of_birth)} years` },
                      ]}
                    />

                    <InfoCard
                      icon={<FaCalendarAlt className="text-purple-500" />}
                      title="Employment Dates"
                      items={[
                        { label: 'Joining Date', value: format(new Date(user.joining_date), 'MMMM dd, yyyy') },
                        { label: 'Resign Date', value: user.resign_date ? format(new Date(user.resign_date), 'MMMM dd, yyyy') : 'Not set' },
                        { label: 'Tenure', value: calculateTenure(user.joining_date) },
                      ]}
                    />
                  </motion.div>
                )}

                {activeTab === 'professional' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    <InfoCard
                      icon={<FaBriefcase className="text-amber-500" />}
                      title="Professional Details"
                      items={[
                        { label: 'Designation', value: user.designation },
                        { label: 'Role Type', value: user.role_type },
                        { label: 'Status', value: user.status },
                      ]}
                    />

                    <InfoCard
                      icon={<FaShieldAlt className="text-teal-500" />}
                      title="System Access"
                      items={[
                        { label: 'Account Status', value: user.status },
                        { label: 'Role Level', value: user.role_type },
                        { label: 'Last Updated', value: user.updated_at ? format(new Date(user.updated_at), 'PPpp') : 'Unknown' },
                      ]}
                    />

                    <div className="md:col-span-2">
                      <InfoCard
                        icon={<FaHistory className="text-indigo-500" />}
                        title="Employment History"
                        items={[
                          { label: 'Total Tenure', value: calculateTenure(user.joining_date) },
                          { label: 'Joining Date', value: format(new Date(user.joining_date), 'PPPP') },
                          { label: 'Resign Date', value: user.resign_date ? format(new Date(user.resign_date), 'PPPP') : 'Currently employed' },
                          { label: 'Account Created', value: user.created_at ? format(new Date(user.created_at), 'PPPP') : 'Unknown' },
                        ]}
                      />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'contact' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    <InfoCard
                      icon={<FaEnvelope className="text-red-500" />}
                      title="Email & Communication"
                      items={[
                        { label: 'Email Address', value: user.email, type: 'email' },
                        { label: 'Email Domain', value: user.email.split('@')[1] },
                      ]}
                    />

                    <InfoCard
                      icon={<FaPhone className="text-green-500" />}
                      title="Phone Numbers"
                      items={[
                        { label: 'Primary Phone', value: user.phone, type: 'phone' },
                        { label: 'Emergency Contact', value: user.emergency_contact || 'Not set', type: 'phone' },
                      ]}
                    />

                    <div className="md:col-span-2 bg-blue-50 rounded p-4 border border-blue-200">
                      <div className="flex items-center mb-3">
                        <FaMobile className="text-blue-500 mr-2" />
                        <h3 className="text-lg font-semibold text-blue-800">Quick Actions</h3>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => window.open(`mailto:${user.email}`, '_blank')}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          <FaEnvelope className="mr-2" />
                          Send Email
                        </button>
                        <button
                          onClick={() => window.open(`tel:${user.phone}`, '_blank')}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          <FaPhone className="mr-2" />
                          Call User
                        </button>
                        {user.emergency_contact && (
                          <button
                            onClick={() => window.open(`tel:${user.emergency_contact}`, '_blank')}
                            className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                          >
                            <FaPhone className="mr-2" />
                            Emergency Contact
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Reusable Info Card Component
const InfoCard = ({ icon, title, items }) => (
  <div className="bg-gray-50 rounded p-4 border border-gray-200">
    <div className="flex items-center mb-4">
      {icon}
      <h3 className="text-lg font-semibold text-gray-800 ml-2">{title}</h3>
    </div>
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex justify-between items-start">
          <span className="text-sm font-medium text-gray-600">{item.label}:</span>
          <span className={`text-sm text-gray-800 text-right ${item.type === 'email' ? 'break-all' : ''}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  </div>
);