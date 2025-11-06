// app/components/AdminDashboardCard.js
'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { FaArrowUp, FaArrowDown, FaEye } from 'react-icons/fa';

const AdminDashboardCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color = 'blue',
  children,
  onClick,
  className = '',
  loading = false,
  trend = null // { value: number, isPositive: boolean }
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const colorClasses = {
    blue: {
      bg: 'bg-white',
      border: 'border-blue-100',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      text: 'text-white',
      value: 'text-blue-700',
      accent: 'text-blue-500',
      gradient: 'from-blue-500 to-blue-600',
      light: 'bg-blue-50',
      trend: 'text-blue-600'
    },
    green: {
      bg: 'bg-white',
      border: 'border-green-100',
      iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
      text: 'text-white',
      value: 'text-green-700',
      accent: 'text-green-500',
      gradient: 'from-green-500 to-green-600',
      light: 'bg-green-50',
      trend: 'text-green-600'
    },
    purple: {
      bg: 'bg-white',
      border: 'border-purple-100',
      iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
      text: 'text-white',
      value: 'text-purple-700',
      accent: 'text-purple-500',
      gradient: 'from-purple-500 to-purple-600',
      light: 'bg-purple-50',
      trend: 'text-purple-600'
    },
    orange: {
      bg: 'bg-white',
      border: 'border-orange-100',
      iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
      text: 'text-white',
      value: 'text-orange-700',
      accent: 'text-orange-500',
      gradient: 'from-orange-500 to-orange-600',
      light: 'bg-orange-50',
      trend: 'text-orange-600'
    },
    indigo: {
      bg: 'bg-white',
      border: 'border-indigo-100',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      text: 'text-white',
      value: 'text-indigo-700',
      accent: 'text-indigo-500',
      gradient: 'from-indigo-500 to-indigo-600',
      light: 'bg-indigo-50',
      trend: 'text-indigo-600'
    },
    red: {
      bg: 'bg-white',
      border: 'border-red-100',
      iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
      text: 'text-white',
      value: 'text-red-700',
      accent: 'text-red-500',
      gradient: 'from-red-500 to-red-600',
      light: 'bg-red-50',
      trend: 'text-red-600'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        scale: 1.02,
        y: -4,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`
        relative overflow-hidden rounded border-2 ${colors.border} ${colors.bg} 
        shadow hover:shadow transition-all duration-300
        ${onClick ? 'cursor-pointer group' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className={`p-3 rounded shadow ${colors.iconBg}`}
            >
              <div className={colors.text}>
                {icon}
              </div>
            </motion.div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-800 truncate">{title}</h3>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          
          {/* Trend Indicator */}
          {trend && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${
                trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {trend.isPositive ? (
                <FaArrowUp className="text-xs" />
              ) : (
                <FaArrowDown className="text-xs" />
              )}
              <span>{trend.value}%</span>
            </motion.div>
          )}
        </div>

        {/* Main Value */}
        {value && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-4"
          >
            <div className={`text-3xl font-black ${colors.value} tracking-tight`}>
              {loading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span className="text-gray-400 text-xl">Loading...</span>
                </div>
              ) : (
                value
              )}
            </div>
          </motion.div>
        )}

        {/* Children Content */}
        {children && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4"
          >
            {children}
          </motion.div>
        )}

        {/* Action Indicator */}
        {onClick && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
            className="absolute bottom-4 right-4"
          >
            <div className={`p-2 rounded-full ${colors.light} shadow`}>
              <FaEye className={`text-sm ${colors.accent}`} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Animated Bottom Border */}
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient} origin-left`}
      ></motion.div>

      {/* Hover Effect */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 0.1 : 0 }}
        className={`absolute inset-0 bg-gradient-to-br ${colors.gradient}`}
      ></motion.div>
    </motion.div>
  );
};

export default AdminDashboardCard;