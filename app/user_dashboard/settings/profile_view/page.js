// /app/user_dashboard/settings/profile_view/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  FaUser, FaPhone, FaEnvelope, FaIdCard, FaVenusMars, 
  FaTint, FaBriefcase, FaCalendarAlt, FaArrowLeft,
  FaShieldAlt, FaClock, FaEdit,
  FaMobileAlt, FaExclamationTriangle, FaTimes,
  FaStar, FaAward, FaCertificate, FaMapMarkerAlt
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../../../components/LoadingSpinner';

export default function ProfileViewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user_dashboard/settings/profile_view', {
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          setUserData(data.user);
        } else {
          throw new Error(data.message || 'Failed to load profile data');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile information');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateAge = (dateString) => {
    if (!dateString) return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const calculateExperience = (joinDate) => {
    if (!joinDate) return null;
    const today = new Date();
    const join = new Date(joinDate);
    const months = (today.getFullYear() - join.getFullYear()) * 12 + (today.getMonth() - join.getMonth());
    
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

  // Profile Picture Modal
  const ProfileModal = () => (
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Backdrop with blur */}
          <motion.div
            initial={{ backdropFilter: 'blur(0px)' }}
            animate={{ backdropFilter: 'blur(20px)' }}
            exit={{ backdropFilter: 'blur(0px)' }}
            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative z-10 max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-4 -right-4 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-full p-3 transition-all duration-300 hover:scale-110 border border-white/30"
            >
              <FaTimes className="text-xl" />
            </button>
            
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded border border-white/20 shadow-2xl overflow-hidden">
              {userData?.profile_photo_url ? (
                <div className="relative w-full h-[80vh]">
                  <Image
                    src={userData.profile_photo_url}
                    alt={`${userData.first_name} ${userData.last_name}`}
                    fill
                    style={{ objectFit: 'contain' }}
                    className="hover:scale-105 transition-transform duration-500"
                    unoptimized
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/api/storage/user_dp/default_DP.png';
                    }}
                  />
                </div>
              ) : (
                <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <FaUser className="text-gray-400 text-8xl" />
                </div>
              )}
              
              {/* Profile Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  {userData?.first_name} {userData?.last_name}
                </h2>
                <p className="text-white/80 text-lg">{userData?.designation}</p>
                {userData?.short_name && (
                  <p className="text-cyan-300 font-medium mt-1">({userData.short_name})</p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded p-8 border border-gray-200 shadow-2xl max-w-md w-full">
            <FaExclamationTriangle className="text-red-500 text-6xl mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Error Loading Profile</h2>
            <p className="text-gray-600 mb-6 text-lg">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/user_dashboard/settings')}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-3 rounded font-semibold shadow-lg shadow-blue-500/25 transition-all duration-300 w-full"
            >
              Back to Settings
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded p-8 border border-gray-200 shadow-2xl max-w-md w-full">
            <FaUser className="text-gray-400 text-6xl mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Profile Not Found</h2>
            <p className="text-gray-600 mb-6 text-lg">Unable to load user profile information</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/user_dashboard/settings')}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-3 rounded font-semibold shadow-lg shadow-blue-500/25 transition-all duration-300 w-full"
            >
              Back to Settings
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  const age = calculateAge(userData.date_of_birth);
  const experience = calculateExperience(userData.joining_date);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50">
      {/* Profile Modal */}
      <ProfileModal />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 via-white to-cyan-50 border-b border-blue-100 sticky top-0 z-40">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between py-5">
      
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Back Button with Modern Design */}
        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: "#f8fafc" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/user_dashboard/settings')}
          className="group relative flex items-center space-x-2 p-2 rounded transition-all duration-200"
        >
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300">
              <FaArrowLeft className="text-white text-sm" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-600 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
          </div>
        </motion.button>

        {/* Title Section */}
        <div className="flex flex-col pl-2">
          <div className="flex items-center space-x-3">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Profile Overview
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex items-center space-x-1 text-gray-500 text-sm">
                  <span>Complete professional profile details</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <motion.button
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.push('/user_dashboard/settings')}
        className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
      >
        <FaEdit className="text-sm" />
        <span>Edit Profile</span>
      </motion.button>
    </div>
  </div>

  {/* Accent Line */}
  <div className="w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-400"></div>
</div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Employment & System Info */}
          <div className="space-y-6">
            {/* Employment Information */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <FaBriefcase className="mr-3 text-purple-500" />
                  Employment Details
                </h3>
                
                <div className="space-y-4">
                  <InfoField 
                    icon={FaBriefcase}
                    label="Designation"
                    value={userData.designation}
                  />
                  <InfoField 
                    icon={FaShieldAlt}
                    label="Role Type"
                    value={userData.role_type}
                  />
                  <InfoField 
                    icon={FaCalendarAlt}
                    label="Date of Birth"
                    value={formatDate(userData.date_of_birth)}
                    subValue={age ? `${age} years old` : null}
                  />
                  <InfoField 
                    icon={FaClock}
                    label="Joining Date"
                    value={formatDate(userData.joining_date)}
                    subValue={experience ? `${experience} with company` : null}
                  />
                  {userData.resign_date && (
                    <InfoField 
                      icon={FaCalendarAlt}
                      label="Resignation Date"
                      value={formatDate(userData.resign_date)}
                      className="text-red-600"
                    />
                  )}
                </div>
              </div>
            </motion.div>

            {/* System Information */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <FaShieldAlt className="mr-3 text-gray-500" />
                  System Information
                </h3>
                
                <div className="space-y-4">
                  <InfoField 
                    icon={FaClock}
                    label="Profile Created"
                    value={new Date(userData.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  />
                  
                  <InfoField 
                    icon={FaClock}
                    label="Last Updated"
                    value={new Date(userData.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Middle Column - Profile Card & Emergency Contact */}
          <div className="space-y-6">
            {/* Main Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded border border-gray-200 shadow-2xl hover:shadow-3xl transition-all duration-500 overflow-hidden"
            >
              {/* Profile Header with Gradient */}
              <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 p-8 text-center relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12"></div>
                </div>
                
                {/* Centered Profile Photo */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative mb-6 cursor-pointer group mx-auto"
                  onClick={() => setIsModalOpen(true)}
                >
                  <div className="relative w-48 h-48 mx-auto rounded overflow-hidden border-4 border-white/30 shadow-2xl group-hover:shadow-3xl transition-all duration-500">
                    {userData.profile_photo_url ? (
                      <Image
                        src={userData.profile_photo_url}
                        alt={`${userData.first_name} ${userData.last_name}`}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="group-hover:scale-110 transition-transform duration-500"
                        unoptimized
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/api/storage/user_dp/default_DP.png';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/20">
                        <FaUser className="text-white/80 text-6xl" />
                      </div>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-500 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 text-white text-center">
                        <div className="bg-black/50 rounded-full p-3 inline-block">
                          <FaUser className="text-xl" />
                        </div>
                        <p className="mt-2 font-semibold text-sm">View Full Size</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Online Status Indicator */}
                  <div className="absolute bottom-2 right-4 w-5 h-5 bg-green-400 border-3 border-white rounded-full shadow-lg"></div>
                </motion.div>

                {/* Name and Title */}
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {userData.first_name} {userData.last_name}
                  </h2>
                  <p className="text-white/90 text-base leading-relaxed mb-3">
                    {userData.designation}
                  </p>

                  {/* Status Badge */}
                  <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-white font-semibold text-xs">{userData.status}</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="p-6 border-b border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <StatBox 
                    icon={FaShieldAlt}
                    label="Role"
                    value={userData.role_type}
                    color="text-blue-600"
                  />
                  {age && (
                    <StatBox 
                      icon={FaCalendarAlt}
                      label="Age"
                      value={`${age} years`}
                      color="text-purple-600"
                    />
                  )}
                  {experience && (
                    <StatBox 
                      icon={FaAward}
                      label="Experience"
                      value={experience}
                      color="text-cyan-600"
                    />
                  )}
                  <StatBox 
                    icon={FaStar}
                    label="Status"
                    value={userData.status}
                    color="text-green-600"
                  />
                </div>
              </div>
            {/* Emergency Contact Card */}
            {userData.emergency_contact && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-red-50 to-orange-50 rounded border border-red-200 p-6 shadow-lg"
            >
                <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                    <FaMobileAlt className="text-red-600 text-xl" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-800 mb-1">Emergency Contact</h3>
                    <p className="text-red-900 font-bold text-lg">{userData.emergency_contact}</p>
                    <p className="text-red-700 text-xs mt-1">Available for urgent situations</p>
                </div>
                </div>
            </motion.div>
            )}
            </motion.div>
          </div>

          {/* Right Column - Personal & Contact Info */}
          <div className="space-y-6">
            {/* Personal Information */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <FaUser className="mr-3 text-blue-500" />
                  Personal Information
                </h3>
                
                <div className="space-y-4">
                  <InfoField 
                    icon={FaIdCard}
                    label="SOC Portal ID"
                    value={userData.soc_portal_id}
                    className="font-mono text-sm"
                  />
                  <InfoField 
                    icon={FaIdCard}
                    label="NGD ID"
                    value={userData.ngd_id}
                    className="font-mono text-sm"
                  />
                  <InfoField 
                    icon={FaVenusMars}
                    label="Gender"
                    value={userData.gender}
                  />
                  <InfoField 
                    icon={FaTint}
                    label="Blood Group"
                    value={userData.bloodgroup}
                    className={userData.bloodgroup ? 'text-red-600 font-semibold' : ''}
                  />
                </div>
              </div>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white rounded border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <FaPhone className="mr-3 text-green-500" />
                  Contact Information
                </h3>
                
                <div className="space-y-4">
                  <InfoField 
                    icon={FaEnvelope}
                    label="Email"
                    value={userData.email}
                    type="email"
                  />
                  <InfoField 
                    icon={FaMobileAlt}
                    label="Primary Phone"
                    value={userData.phone}
                    type="phone"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Box Component
function StatBox({ icon: Icon, label, value, color }) {
  return (
    <div className="text-center p-3 rounded bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
      <Icon className={`${color} text-lg mx-auto mb-2`} />
      <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
      <div className="text-sm font-semibold text-gray-800 truncate">{value}</div>
    </div>
  );
}

// Info Field Component
function InfoField({ icon: Icon, label, value, subValue, type, className = '' }) {
  if (!value) return null;

  const formatValue = (val, valueType) => {
    if (!val) return 'Not specified';
    
    switch (valueType) {
      case 'email':
        return (
          <a 
            href={`mailto:${val}`} 
            className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            {val}
          </a>
        );
      case 'phone':
        return (
          <a 
            href={`tel:${val}`} 
            className="text-gray-700 hover:text-blue-600 hover:underline transition-colors"
          >
            {val}
          </a>
        );
      default:
        return val;
    }
  };

  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
        <Icon className="text-gray-600 text-sm" />
      </div>
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
          {label}
        </label>
        <div className={`text-gray-800 text-sm ${className}`}>
          {formatValue(value, type)}
        </div>
        {subValue && (
          <p className="text-xs text-gray-500 mt-1">{subValue}</p>
        )}
      </div>
    </div>
  );
}