// app/admin_dashboard/notice_board/log/page.js
'use client';

import { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaBullhorn, FaCalendarAlt, FaUserTie, FaImage, 
  FaFilePdf, FaEye, FaExternalLinkAlt, FaSearch,
  FaFilter, FaSort, FaClock, FaCheckCircle,
  FaTimesCircle, FaCalendarPlus, FaIdCard,
  FaTimes, FaDownload, FaExpand
} from 'react-icons/fa';

export default function NoticeBoardLogPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchNotices = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin_dashboard/notice_board?page=${page}&limit=${pagination.limit}`);
      const result = await response.json();

      if (result.success) {
        setNotices(result.data.notices);
        setPagination(result.data.pagination);
      } else {
        toast.error('Failed to fetch notices');
      }
    } catch (error) {
      console.error('Error fetching notices:', error);
      toast.error('Failed to fetch notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  // Filter and sort notices
  const filteredNotices = notices
    .filter(notice => {
      const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          notice.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (statusFilter === 'all') return matchesSearch;
      if (statusFilter === 'active') return matchesSearch && isNoticeActive(notice);
      if (statusFilter === 'upcoming') return matchesSearch && isNoticeUpcoming(notice);
      if (statusFilter === 'expired') return matchesSearch && isNoticeExpired(notice);
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at) - new Date(b.created_at);
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

  const formatDate = (dateString) => {
    return DateTime.fromISO(dateString).setZone('Asia/Dhaka').toFormat('MMM dd, yyyy • HH:mm');
  };

  const formatDateRange = (fromDate, toDate) => {
    const from = DateTime.fromISO(fromDate).setZone('Asia/Dhaka');
    const to = DateTime.fromISO(toDate).setZone('Asia/Dhaka');
    
    if (from.hasSame(to, 'day')) {
      return `${from.toFormat('MMM dd, yyyy')} • ${from.toFormat('HH:mm')} - ${to.toFormat('HH:mm')}`;
    } else {
      return `${from.toFormat('MMM dd, HH:mm')} - ${to.toFormat('MMM dd, HH:mm')}`;
    }
  };

  const isNoticeActive = (notice) => {
    const now = DateTime.now().setZone('Asia/Dhaka');
    const from = DateTime.fromISO(notice.from_datetime).setZone('Asia/Dhaka');
    const to = DateTime.fromISO(notice.to_datetime).setZone('Asia/Dhaka');
    return now >= from && now <= to;
  };

  const isNoticeUpcoming = (notice) => {
    const now = DateTime.now().setZone('Asia/Dhaka');
    const from = DateTime.fromISO(notice.from_datetime).setZone('Asia/Dhaka');
    return now < from;
  };

  const isNoticeExpired = (notice) => {
    const now = DateTime.now().setZone('Asia/Dhaka');
    const to = DateTime.fromISO(notice.to_datetime).setZone('Asia/Dhaka');
    return now > to;
  };

  const getNoticeStatus = (notice) => {
    if (isNoticeActive(notice)) return { status: 'active', color: 'emerald', text: 'Active', icon: FaCheckCircle };
    if (isNoticeUpcoming(notice)) return { status: 'upcoming', color: 'blue', text: 'Upcoming', icon: FaClock };
    return { status: 'expired', color: 'gray', text: 'Expired', icon: FaTimesCircle };
  };

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

  const StatusBadge = ({ notice }) => {
    const status = getNoticeStatus(notice);
    const IconComponent = status.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
        status.color === 'emerald' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
        status.color === 'blue' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
        'bg-gray-100 text-gray-800 border border-gray-200'
      }`}>
        <IconComponent className={`text-xs ${
          status.color === 'emerald' ? 'text-emerald-600' :
          status.color === 'blue' ? 'text-blue-600' :
          'text-gray-600'
        }`} />
        {status.text}
        {status.status === 'active' && (
          <span className="ml-1 text-xs font-normal">({getTimeRemaining(notice)})</span>
        )}
      </span>
    );
  };

  // Image Modal Component
  const ImageModal = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-4xl max-h-[90vh] mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Image Preview</h3>
              <div className="flex items-center gap-2">
                <a
                  href={imageUrl}
                  download
                  className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                  title="Download Image"
                >
                  <FaDownload size={16} />
                </a>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              <img
                src={imageUrl}
                alt="Notice preview"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-800 text-lg font-medium">Loading notices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header - No Animation */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded shadow-2xl shadow-purple-200 mb-6">
            <FaBullhorn className="text-white text-2xl" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Notice Board Log
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
            Monitor and manage all published announcements with detailed insights and analytics
          </p>
        </div>

        {/* Colorful Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-100">Total Notices</p>
                <p className="text-3xl font-bold text-white mt-1">{pagination.total}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded flex items-center justify-center backdrop-blur-sm">
                <FaBullhorn className="text-white text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-100">Active</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {notices.filter(isNoticeActive).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded flex items-center justify-center backdrop-blur-sm">
                <FaCheckCircle className="text-white text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-100">Upcoming</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {notices.filter(isNoticeUpcoming).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded flex items-center justify-center backdrop-blur-sm">
                <FaClock className="text-white text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-100">Expired</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {notices.filter(isNoticeExpired).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded flex items-center justify-center backdrop-blur-sm">
                <FaTimesCircle className="text-white text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded p-6 border border-white/50 shadow-lg mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 w-full lg:max-w-md">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500" />
                <input
                  type="text"
                  placeholder="Search notices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-purple-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900"
                />
              </div>
            </div>

            {/* Filters and Sort */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-white border border-purple-200 rounded pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 w-full sm:w-40 text-gray-900"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="expired">Expired</option>
                </select>
                <FaFilter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-500 pointer-events-none" />
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white border border-purple-200 rounded pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 w-full sm:w-40 text-gray-900"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title A-Z</option>
                </select>
                <FaSort className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-500 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Notices Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <AnimatePresence>
            {filteredNotices.map((notice, index) => (
              <motion.div
                key={notice.notice_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/90 backdrop-blur-sm rounded shadow-lg border border-white/80 hover:shadow-xl transition-all duration-300 overflow-hidden group hover:scale-[1.02]"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <StatusBadge notice={notice} />
                        <span className="text-xs text-gray-700 bg-purple-100 px-2 py-1 rounded-full font-medium">
                          <FaIdCard className="inline mr-1 text-purple-600" />
                          {notice.notice_id}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 leading-tight mb-2 group-hover:text-purple-600 transition-colors">
                        {notice.title}
                      </h3>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-700 leading-relaxed mb-4 line-clamp-3">
                    {notice.description}
                  </p>

                  {/* Media Attachments */}
                  {(notice.image_url || notice.pdf_url) && (
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-sm font-medium text-gray-900">Attachments:</span>
                      <div className="flex gap-2">
                        {notice.image_url && (
                          <button
                            onClick={() => setSelectedImage(notice.image_url)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded border border-blue-200 hover:bg-blue-200 transition-colors text-sm font-medium hover:shadow-sm"
                          >
                            <FaImage className="text-blue-600" />
                            Image
                            <FaExpand className="text-xs text-blue-600" />
                          </button>
                        )}
                        {notice.pdf_url && (
                          <a
                            href={notice.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 rounded border border-red-200 hover:bg-red-200 transition-colors text-sm font-medium hover:shadow-sm"
                          >
                            <FaFilePdf className="text-red-600" />
                            PDF
                            <FaExternalLinkAlt className="text-xs text-red-600" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-3 text-sm text-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 rounded p-3 border border-purple-100">
                      <FaCalendarPlus className="text-purple-600 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">Published</div>
                        <div>{formatDate(notice.created_at)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 rounded p-3 border border-green-100">
                      <FaCalendarAlt className="text-green-600 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">Schedule</div>
                        <div>{formatDateRange(notice.from_datetime, notice.to_datetime)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="flex items-center gap-1.5">
                        <FaUserTie className="text-purple-500" />
                        <span className="font-medium text-gray-900">
                          {notice.created_by_name || notice.created_by}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FaEye className="text-xs" />
                      <span>Click attachments to view</span>
                      <FaExternalLinkAlt className="text-xs" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Image Modal */}
        <AnimatePresence>
          {selectedImage && (
            <ImageModal 
              imageUrl={selectedImage} 
              onClose={() => setSelectedImage(null)} 
            />
          )}
        </AnimatePresence>

        {/* Empty State */}
        {filteredNotices.length === 0 && (
          <div className="text-center py-16 bg-gradient-to-br from-white to-purple-50 rounded border border-purple-100 shadow-lg">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded flex items-center justify-center shadow-inner">
              <FaBullhorn className="text-purple-500 text-3xl" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Notices Found</h3>
            <p className="text-gray-700 max-w-md mx-auto leading-relaxed mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters to find what you\'re looking for.'
                : 'No notices have been published yet. Create your first notice to get started.'
              }
            </p>
            {searchTerm || statusFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                Clear Filters
              </button>
            ) : null}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center space-x-3 mt-12">
            <button
              onClick={() => fetchNotices(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-purple-200 text-gray-700 rounded hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(page => 
                  page === 1 || 
                  page === pagination.totalPages || 
                  Math.abs(page - pagination.page) <= 1
                )
                .map((page, index, array) => (
                  <div key={page} className="flex items-center">
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => fetchNotices(page)}
                      className={`w-10 h-10 rounded font-medium transition-all duration-200 ${
                        pagination.page === page
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-purple-50 border border-purple-200'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                ))
              }
            </div>

            <span className="text-sm text-gray-700 bg-white px-4 py-2 rounded border border-purple-200">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              onClick={() => fetchNotices(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-purple-200 text-gray-700 rounded hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}