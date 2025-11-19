// app/user_dashboard/knowledge_station/page.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { 
  FaPlus, FaThumbsUp, FaThumbsDown, FaRegThumbsUp, FaRegThumbsDown, 
  FaComments, FaFileAlt, FaFilePdf, FaFileExcel, FaFileWord, 
  FaFileImage, FaFileVideo, FaTimes, FaSearch, FaFilter, FaSort,
  FaLink, FaExternalLinkAlt, FaRegBookmark, FaBookmark, FaShare, 
  FaPaperclip, FaBell, FaStar, FaRegStar, FaSpinner, FaRocket,
  FaUsers, FaChartLine, FaBook, FaLightbulb, FaGlobe, FaShieldAlt,
  FaUpload, FaEye, FaDownload, FaClock, FaUserCircle
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import toast from 'react-hot-toast';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function KnowledgeStationPage() {
  const [contents, setContents] = useState([]);
  const [filteredContents, setFilteredContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeContent, setActiveContent] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [activeFilter, setActiveFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contentText: '',
    externalLink: '',
    isImportant: false,
    notifyAll: false,
    mediaFile: null,
    documentFiles: []
  });

  // User profile states
  const [userProfilePhoto, setUserProfilePhoto] = useState(null);
  const [userName, setUserName] = useState('');
  const [userSocPortalId, setUserSocPortalId] = useState('');
  const [profilePhotoErrors, setProfilePhotoErrors] = useState({});

  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);

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

  // Fetch user profile data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const socPortalId = getCookie('socPortalId');
        
        if (!socPortalId) {
          return;
        }

        setUserSocPortalId(socPortalId);

        const response = await fetch(`/api/user_dashboard/user_info?id=${socPortalId}`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        setUserName(data.shortName || 'User');
        setUserProfilePhoto(data.profilePhoto);

      } catch (error) {
        console.error('Failed to fetch user data:', error);
        
        // Fallback to cookie data
        const email = getCookie('email');
        const id = getCookie('socPortalId');
        
        if (id) {
          setUserName('User');
          setUserSocPortalId(id);
        }
      }
    };

    fetchUserData();
  }, []);

  // Handle profile photo error
  const handleProfilePhotoError = (userId) => {
    setProfilePhotoErrors(prev => ({
      ...prev,
      [userId]: true
    }));
  };

  // Get user initials
  const getUserInitials = (name) => {
    if (!name) return 'UU';
    const nameParts = name.split(' ');
    return `${nameParts[0]?.charAt(0) || ''}${nameParts[1]?.charAt(0) || ''}` || 'UU';
  };

  // Profile Photo Component
  const ProfilePhoto = ({ userId, photoUrl, userName, size = 10, className = "" }) => {
    const hasError = profilePhotoErrors[userId];
    
    return (
      <div className={`relative w-${size} h-${size} rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 ${className}`}>
        {photoUrl && !hasError ? (
          <Image 
            src={photoUrl}
            alt={userName}
            fill
            sizes={`${size * 4}px`}
            className="object-cover"
            onError={() => handleProfilePhotoError(userId)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white font-bold">
            {getUserInitials(userName)}
          </div>
        )}
      </div>
    );
  };

  // Fetch knowledge content
  const fetchContents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user_dashboard/knowledge_station');
      const result = await response.json();

      if (result.success) {
        setContents(result.data);
        setFilteredContents(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to fetch knowledge contents:', error);
      toast.error('Failed to load knowledge content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, []);

  // Apply search, sort, and filter
  useEffect(() => {
    let result = [...contents];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(content => 
        content.title.toLowerCase().includes(term) || 
        content.description.toLowerCase().includes(term) ||
        content.content_text?.toLowerCase().includes(term) ||
        (content.external_link && content.external_link.toLowerCase().includes(term))
      );
    }

    // Apply content type filter
    if (activeFilter !== 'all') {
      result = result.filter(content => {
        if (activeFilter === 'media' && content.media_url) return true;
        if (activeFilter === 'documents' && content.document_urls?.length > 0) return true;
        if (activeFilter === 'links' && content.external_link) return true;
        if (activeFilter === 'text' && content.content_text) return true;
        if (activeFilter === 'important' && content.is_important) return true;
        if (activeFilter === 'saved' && content.is_saved) return true;
        return false;
      });
    }
    
    // Apply sort order
    result.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      
      if (sortOrder === 'newest') {
        return dateB - dateA;
      } else if (sortOrder === 'oldest') {
        return dateA - dateB;
      } else if (sortOrder === 'likes') {
        return b.like_count - a.like_count;
      } else if (sortOrder === 'important') {
        return (b.is_important === a.is_important) ? 0 : b.is_important ? -1 : 1;
      }
      
      return 0;
    });
    
    setFilteredContents(result);
  }, [contents, searchTerm, sortOrder, activeFilter]);

  // Handle file selections
  const handleMediaChange = (e) => {
    if (e.target.files.length > 0) {
      setFormData(prev => ({ ...prev, mediaFile: e.target.files[0] }));
    }
  };

  const handleDocChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFormData(prev => ({ 
      ...prev, 
      documentFiles: [...prev.documentFiles, ...selectedFiles] 
    }));
  };

  const removeMediaFile = () => {
    setFormData(prev => ({ ...prev, mediaFile: null }));
  };

  const removeDocFile = (index) => {
    const newFiles = [...formData.documentFiles];
    newFiles.splice(index, 1);
    setFormData(prev => ({ ...prev, documentFiles: newFiles }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('contentText', formData.contentText);
      submitData.append('externalLink', formData.externalLink);
      submitData.append('isImportant', formData.isImportant.toString());
      submitData.append('notifyAll', formData.notifyAll.toString());

      if (formData.mediaFile) {
        submitData.append('mediaFile', formData.mediaFile);
      }

      formData.documentFiles.forEach(file => {
        submitData.append('documentFiles', file);
      });

      const response = await fetch('/api/user_dashboard/knowledge_station', {
        method: 'POST',
        body: submitData
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Knowledge shared successfully! 🚀');
        setShowModal(false);
        setFormData({
          title: '',
          description: '',
          contentText: '',
          externalLink: '',
          isImportant: false,
          notifyAll: false,
          mediaFile: null,
          documentFiles: []
        });
        fetchContents(); // Refresh the list
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to share knowledge:', error);
      toast.error('Failed to share knowledge');
    } finally {
      setUploading(false);
    }
  };

  // Handle reactions
  const handleReaction = async (contentId, reactionType) => {
    try {
      const response = await fetch(`/api/user_dashboard/knowledge_station/${contentId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reactionType })
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setContents(prev => prev.map(content => 
          content.ks_content_id === contentId 
            ? { 
                ...content, 
                like_count: result.data.like_count,
                dislike_count: result.data.dislike_count,
                user_reaction: reactionType 
              } 
            : content
        ));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to process reaction:', error);
      toast.error('Failed to process reaction');
    }
  };

  // Submit feedback
  const submitFeedback = async (contentId) => {
    if (!feedbackText.trim()) return;

    try {
      const response = await fetch(`/api/user_dashboard/knowledge_station/${contentId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feedback_description: feedbackText })
      });

      const result = await response.json();

      if (result.success) {
        // Add feedback to local state
        setContents(prev => prev.map(content => 
          content.ks_content_id === contentId 
            ? { 
                ...content, 
                feedbacks: [result.data, ...content.feedbacks],
                feedback_count: content.feedback_count + 1
              } 
            : content
        ));
        
        setFeedbackText('');
        toast.success('Feedback added successfully 💫');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to add feedback:', error);
      toast.error('Failed to add feedback');
    }
  };

  // Toggle save content
  const toggleSave = async (contentId) => {
    try {
      const response = await fetch(`/api/user_dashboard/knowledge_station/${contentId}/save`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        setContents(prev => prev.map(content => 
          content.ks_content_id === contentId 
            ? { ...content, is_saved: result.saved } 
            : content
        ));
        
        toast.success(result.saved ? 'Content saved! 📌' : 'Content removed from saved');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to toggle save:', error);
      toast.error('Failed to toggle save');
    }
  };

  // Notify all users
  const notifyAllUsers = async (contentId, contentTitle) => {
    try {
      const response = await fetch(`/api/user_dashboard/knowledge_station/${contentId}/notify`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`📢 Notification sent to ${result.message} users`);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to send notifications:', error);
      toast.error('Failed to send notifications');
    }
  };

  // Copy content URL
  const copyContentUrl = (contentId) => {
    const url = `${window.location.origin}/user_dashboard/knowledge_station#${contentId}`;
    navigator.clipboard.writeText(url);
    toast.success('Content URL copied to clipboard! 📋');
  };

  // Render file icon
  const renderFileIcon = (type) => {
    switch(type) {
      case 'image': return <FaFileImage className="text-blue-400 text-xl" />;
      case 'video': return <FaFileVideo className="text-blue-500 text-xl" />;
      case 'pdf': return <FaFilePdf className="text-red-500 text-xl" />;
      case 'excel': return <FaFileExcel className="text-green-600 text-xl" />;
      case 'word': return <FaFileWord className="text-blue-600 text-xl" />;
      case 'zip': return <FaFileAlt className="text-amber-500 text-xl" />;
      default: return <FaFileAlt className="text-gray-500 text-xl" />;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get file type from URL
  const getFileTypeFromUrl = (url) => {
    if (!url) return 'other';
    const extension = url.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(extension)) return 'video';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['xls', 'xlsx'].includes(extension)) return 'excel';
    if (['doc', 'docx'].includes(extension)) return 'word';
    return 'other';
  };

  // Content type filters
  const filters = [
    { key: 'all', label: 'All Content', icon: FaFileAlt, color: 'gray' },
    { key: 'media', label: 'Media', icon: FaFileImage, color: 'blue' },
    { key: 'documents', label: 'Documents', icon: FaFilePdf, color: 'red' },
    { key: 'links', label: 'Links', icon: FaLink, color: 'green' },
    { key: 'text', label: 'Articles', icon: FaBook, color: 'purple' },
    { key: 'important', label: 'Important', icon: FaStar, color: 'yellow' },
    { key: 'saved', label: 'Saved', icon: FaBookmark, color: 'orange' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <h3 className="text-xl font-bold text-gray-800 mb-2">Loading Knowledge Station</h3>
          <p className="text-gray-600">Preparing your collaborative workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded shadow-lg mb-6">
            <FaLightbulb className="text-white text-3xl" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-800 to-blue-600 bg-clip-text text-transparent mb-4">
            Knowledge Station
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Share, discover, and collaborate on any knowledge with your team in real-time
          </p>
        </motion.div>

        {/* Stats Cards - Top Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded p-6 shadow-lg border border-white/20">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded mr-4">
                <FaFileAlt className="text-blue-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Content</p>
                <p className="text-2xl font-bold text-gray-900">{contents.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded p-6 shadow-lg border border-white/20">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded mr-4">
                <FaComments className="text-green-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Feedback</p>
                <p className="text-2xl font-bold text-gray-900">
                  {contents.reduce((acc, content) => acc + (parseInt(content.feedback_count) || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded p-6 shadow-lg border border-white/20">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded mr-4">
                <FaThumbsUp className="text-purple-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Likes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {contents.reduce((acc, content) => acc + content.like_count, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded p-6 shadow-lg border border-white/20">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded mr-4">
                <FaUsers className="text-orange-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Contributors</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(contents.map(c => c.upload_by)).size}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 backdrop-blur-sm rounded shadow-lg border border-white/20 p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-4 text-gray-500 flex items-center pointer-events-none text-gray-500">
                  <FaSearch />
                </div>
                <input
                  type="text"
                  placeholder="Search knowledge, articles, procedures..."
                  className="w-full pl-12 pr-4 py-3 rounded border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm text-gray-800 placeholder-gray-500 transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-4 py-3 rounded border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm text-gray-800 transition-all duration-200"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="likes">Most Liked</option>
                <option value="important">Important First</option>
              </select>
            </div>

            {/* Share Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowModal(true)}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded shadow-lg hover:shadow-xl transition-all duration-200 font-semibold whitespace-nowrap"
            >
              <FaPlus className="mr-2" />
              <span>Share Knowledge</span>
            </motion.button>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            {filters.map((filter) => {
              const Icon = filter.icon;
              return (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`flex items-center px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
                    activeFilter === filter.key
                      ? `bg-${filter.color}-500 text-white shadow-lg`
                      : 'bg-white/50 text-gray-700 hover:bg-white/80 backdrop-blur-sm border border-gray-200'
                  }`}
                >
                  <Icon className={`mr-2 ${activeFilter === filter.key ? 'text-white' : `text-${filter.color}-500`}`} />
                  {filter.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Feed Section */}
          <div className="xl:w-8/12">
            <div className="space-y-6">
              {filteredContents.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 bg-white/80 backdrop-blur-sm rounded shadow-lg border border-white/20"
                >
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded mb-6">
                    <FaFileAlt className="text-blue-500 text-4xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">No knowledge found</h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-6">
                    {searchTerm || activeFilter !== 'all' 
                      ? 'Try adjusting your search terms or filters' 
                      : 'Be the first to share valuable knowledge with your team!'}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowModal(true)}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                  >
                    Share First Knowledge
                  </motion.button>
                </motion.div>
              ) : (
                filteredContents.map((content, index) => (
                  <motion.div
                    key={content.ks_content_id}
                    id={`content-${content.ks_content_id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/80 backdrop-blur-sm rounded shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 overflow-hidden group"
                  >
                    <div className="p-6 md:p-8">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <ProfilePhoto 
                            userId={content.upload_by}
                            photoUrl={content.upload_by_profile_photo}
                            userName={content.upload_by_name}
                            size={12}
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">@{content.upload_by_name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <FaClock className="text-gray-400" />
                              <span>{formatDate(content.created_at)}</span>
                              {content.is_important && (
                                <>
                                  <span>•</span>
                                  <FaStar className="text-yellow-500" />
                                  <span className="text-yellow-600 font-medium">Important</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleSave(content.ks_content_id)}
                            className={`p-2 rounded transition-all duration-200 ${
                              content.is_saved 
                                ? 'text-yellow-500 bg-yellow-50' 
                                : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                            }`}
                          >
                            {content.is_saved ? (
                              <FaBookmark className="text-xl" />
                            ) : (
                              <FaRegBookmark className="text-xl" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Title & Description */}
                      <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                        {content.title}
                      </h2>
                      <p className="text-gray-700 text-lg leading-relaxed mb-6">
                        {content.description}
                      </p>
                      
                      {/* Content Text */}
                      {content.content_text && (
                        <div className="bg-gradient-to-br from-gray-50 to-blue-50/50 p-6 rounded border border-gray-200/50 mb-6">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-lg">
                            <FaBook className="text-blue-500 mr-2" />
                            Detailed Content
                          </h4>
                          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {content.content_text}
                          </p>
                        </div>
                      )}
                      
                      {/* Link Preview */}
                      {content.external_link && (
                        <a 
                          href={content.external_link} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-gradient-to-br from-blue-50 to-green-50 rounded overflow-hidden mb-6 hover:shadow-md transition-all duration-200 border border-blue-200/50"
                        >
                          <div className="flex items-center p-4">
                            <div className="bg-blue-100 p-3 rounded mr-4">
                              <FaLink className="text-blue-600 text-xl" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="font-semibold text-gray-900 truncate">{content.external_link}</p>
                              <p className="text-sm text-gray-600 mt-1">External Resource</p>
                            </div>
                            <FaExternalLinkAlt className="ml-4 text-gray-400 text-lg" />
                          </div>
                        </a>
                      )}
                      
                      {/* Media Preview */}
                      {content.media_url && (
                        <div className="mb-6 rounded overflow-hidden shadow-lg">
                          {getFileTypeFromUrl(content.media_url) === 'video' ? (
                            <div className="relative pt-[56.25%] bg-gray-900">
                              <video 
                                src={content.media_url}
                                className="absolute inset-0 w-full h-full"
                                controls
                                title={content.title}
                              />
                            </div>
                          ) : (
                            <div className="relative w-full h-80">
                              <Image 
                                src={content.media_url} 
                                alt={content.title}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover"
                              />
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Documents */}
                      {content.document_urls && content.document_urls.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-lg">
                            <FaPaperclip className="text-gray-500 mr-2" />
                            Attached Documents ({content.document_urls.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {content.document_urls.map((file, index) => (
                              <a 
                                key={index}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center p-4 bg-white rounded border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200 group"
                              >
                                <div className="mr-4">
                                  {renderFileIcon(file.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate text-sm">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-gray-500 capitalize">{file.type} file</p>
                                </div>
                                <FaDownload className="text-gray-400 group-hover:text-blue-500 transition-colors ml-2" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Engagement Bar */}
                      <div className="flex items-center justify-between border-t border-gray-200/50 pt-6 mt-6">
                        <div className="flex gap-6">
                          <button 
                            onClick={() => handleReaction(content.ks_content_id, 'like')}
                            disabled={content.upload_by === userSocPortalId}
                            className={`flex items-center gap-3 px-4 py-2 rounded transition-all duration-200 ${
                              content.user_reaction === 'like' 
                                ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                            } ${content.upload_by === userSocPortalId ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={content.upload_by === userSocPortalId ? "You can't react to your own content" : "Like"}
                          >
                            {content.user_reaction === 'like' ? (
                              <FaThumbsUp className="text-blue-600" />
                            ) : (
                              <FaRegThumbsUp />
                            )}
                            <span className="font-semibold">{content.like_count}</span>
                          </button>
                          
                          <button 
                            onClick={() => handleReaction(content.ks_content_id, 'dislike')}
                            disabled={content.upload_by === userSocPortalId}
                            className={`flex items-center gap-3 px-4 py-2 rounded transition-all duration-200 ${
                              content.user_reaction === 'dislike' 
                                ? 'bg-red-50 text-red-600 border border-red-200' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-red-600'
                            } ${content.upload_by === userSocPortalId ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={content.upload_by === userSocPortalId ? "You can't react to your own content" : "Dislike"}
                          >
                            {content.user_reaction === 'dislike' ? (
                              <FaThumbsDown className="text-red-600" />
                            ) : (
                              <FaRegThumbsDown />
                            )}
                            <span className="font-semibold">{content.dislike_count}</span>
                          </button>
                          
                          <button 
                            onClick={() => setActiveContent(activeContent === content.ks_content_id ? null : content.ks_content_id)}
                            className="flex items-center gap-3 px-4 py-2 rounded text-gray-600 hover:bg-gray-50 hover:text-purple-600 transition-all duration-200"
                          >
                            <FaComments />
                            <span className="font-semibold">{content.feedback_count}</span>
                          </button>
                        </div>
                        
                        <div className="flex gap-3">
                          <button 
                            onClick={() => copyContentUrl(content.ks_content_id)}
                            className="flex items-center gap-2 px-4 py-2 rounded text-gray-600 hover:bg-gray-50 hover:text-green-600 transition-all duration-200"
                          >
                            <FaShare />
                            <span className="font-medium">Share</span>
                          </button>
                          
                          {content.upload_by === userSocPortalId && (
                            <button 
                              onClick={() => notifyAllUsers(content.ks_content_id, content.title)}
                              className="flex items-center gap-2 px-4 py-2 rounded text-gray-600 hover:bg-gray-50 hover:text-orange-600 transition-all duration-200"
                            >
                              <FaBell />
                              <span className="font-medium">Notify All</span>
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Feedback Section */}
                      {activeContent === content.ks_content_id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="mt-6 pt-6 border-t border-gray-200/50"
                        >
                          <h3 className="font-semibold text-gray-900 mb-4 flex items-center text-lg">
                            <FaComments className="text-blue-500 mr-2" />
                            Community Feedback ({content.feedback_count})
                          </h3>
                          
                          {/* Feedback input */}
                          <div className="flex items-start gap-4 mb-6">
                            <ProfilePhoto 
                              userId={userSocPortalId}
                              photoUrl={userProfilePhoto}
                              userName={userName}
                              size={12}
                            />
                            <div className="flex-1 bg-gradient-to-br from-gray-50 to-blue-50/50 rounded p-1">
                              <div className="flex">
                                <input
                                  type="text"
                                  value={feedbackText}
                                  onChange={(e) => setFeedbackText(e.target.value)}
                                  placeholder="Share your thoughts, ask questions, or provide feedback..."
                                  className="flex-1 px-4 py-3 bg-transparent border-0 focus:ring-0 text-gray-800 placeholder-gray-500 rounded"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      submitFeedback(content.ks_content_id);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => submitFeedback(content.ks_content_id)}
                                  disabled={!feedbackText.trim()}
                                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium ml-2"
                                >
                                  Post
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Feedback list */}
                          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {content.feedbacks?.map((feedback, index) => (
                              <div key={index} className="flex gap-4">
                                <ProfilePhoto 
                                  userId={feedback.feedback_by}
                                  photoUrl={feedback.feedback_by_profile_photo}
                                  userName={feedback.feedback_by_name}
                                  size={10}
                                />
                                <div className="flex-1 bg-white rounded p-4 shadow-sm border border-gray-200/50">
                                  <div className="flex justify-between items-center mb-2">
                                    <p className="font-semibold text-gray-900">{feedback.feedback_by_name}</p>
                                    <span className="text-xs text-gray-500 flex items-center">
                                      <FaClock className="mr-1" />
                                      {formatDate(feedback.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-gray-800 leading-relaxed">{feedback.feedback_description}</p>
                                </div>
                              </div>
                            ))}
                            
                            {(!content.feedbacks || content.feedbacks.length === 0) && (
                              <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-blue-50/50 rounded border border-gray-200/50">
                                <FaComments className="mx-auto text-gray-400 text-3xl mb-3" />
                                <p className="text-gray-600 font-medium">No feedback yet</p>
                                <p className="text-sm text-gray-500 mt-1">Be the first to share your thoughts!</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="xl:w-4/12 xl:sticky xl:top-8 xl:self-start space-y-8">
            {/* Saved Content Section */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/80 backdrop-blur-sm rounded shadow-lg border border-white/20 p-6"
            >
              <h3 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
                <FaBookmark className="text-yellow-500 mr-2" />
                Your Saved Content
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {contents
                  .filter(content => content.is_saved)
                  .slice(0, 6)
                  .map((savedContent) => (
                    <div 
                      key={savedContent.ks_content_id}
                      className="flex items-center p-3 hover:bg-white rounded cursor-pointer border border-gray-200/50 hover:border-blue-300 transition-all duration-200 group"
                      onClick={() => {
                        const element = document.getElementById(`content-${savedContent.ks_content_id}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          element.classList.add('ring-4', 'ring-yellow-400', 'ring-opacity-50');
                          setTimeout(() => {
                            element.classList.remove('ring-4', 'ring-yellow-400', 'ring-opacity-50');
                          }, 3000);
                        }
                      }}
                    >
                      <div className="flex-shrink-0 mr-3">
                        {savedContent.media_url ? (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded flex items-center justify-center">
                            {getFileTypeFromUrl(savedContent.media_url) === 'video' ? (
                              <FaFileVideo className="text-blue-600 text-lg" />
                            ) : (
                              <FaFileImage className="text-green-600 text-lg" />
                            )}
                          </div>
                        ) : savedContent.document_urls && savedContent.document_urls.length > 0 ? (
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded flex items-center justify-center">
                            <FaFileAlt className="text-purple-600 text-lg" />
                          </div>
                        ) : savedContent.external_link ? (
                          <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded flex items-center justify-center">
                            <FaLink className="text-green-600 text-lg" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center">
                            <FaFileAlt className="text-gray-600 text-lg" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {savedContent.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          By {savedContent.upload_by_name}
                        </p>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <FaThumbsUp className="mr-1 text-blue-500" />
                          <span className="mr-3">{savedContent.like_count}</span>
                          <FaComments className="mr-1 text-purple-500" />
                          <span>{savedContent.feedback_count}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSave(savedContent.ks_content_id);
                        }}
                        className="flex-shrink-0 text-yellow-500 hover:text-yellow-600 ml-2 transition-colors"
                        title="Remove from saved"
                      >
                        <FaBookmark />
                      </button>
                    </div>
                  ))}
                
                {contents.filter(content => content.is_saved).length === 0 && (
                  <div className="text-center py-6 bg-gradient-to-br from-gray-50 to-blue-50/50 rounded border border-gray-200/50">
                    <FaRegBookmark className="mx-auto text-gray-400 text-2xl mb-2" />
                    <p className="text-gray-600 text-sm font-medium">No saved content yet</p>
                    <p className="text-xs text-gray-500 mt-1">Save content to access it quickly</p>
                  </div>
                )}

                {contents.filter(content => content.is_saved).length > 6 && (
                  <div className="text-center pt-2">
                    <button 
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                      onClick={() => {
                        const savedContents = contents.filter(content => content.is_saved);
                        toast.success(`You have ${savedContents.length} saved items. Use search to find them.`);
                      }}
                    >
                      View all saved ({contents.filter(content => content.is_saved).length})
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Top Contributors */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white/80 backdrop-blur-sm rounded shadow-lg border border-white/20 p-6"
            >
              <h3 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
                <FaUsers className="text-purple-500 mr-2" />
                Top Contributors
              </h3>
              <div className="space-y-4">
                {Object.values(
                  contents.reduce((acc, content) => {
                    if (!acc[content.upload_by]) {
                      acc[content.upload_by] = {
                        soc_portal_id: content.upload_by,
                        name: content.upload_by_name,
                        profile_photo: content.upload_by_profile_photo,
                        count: 0,
                        likes: 0
                      };
                    }
                    acc[content.upload_by].count++;
                    acc[content.upload_by].likes += content.like_count;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5)
                  .map((contributor, index) => (
                    <div key={index} className="flex items-center p-3 hover:bg-white rounded transition-all duration-200 group">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="relative">
                          <ProfilePhoto
                            userId={contributor.soc_portal_id}
                            photoUrl={contributor.profile_photo}
                            userName={contributor.name}
                            size={12}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{contributor.name}</p>
                          <div className="flex items-center text-xs text-gray-500">
                            <span>{contributor.count} posts</span>
                            <span className="mx-2">•</span>
                            <FaThumbsUp className="text-blue-500 mr-1" />
                            <span>{contributor.likes} likes</span>
                          </div>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        #{index + 1}
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-blue-500 to-purple-600 rounded shadow-lg p-6 text-white"
            >
              <h3 className="font-bold mb-4 flex items-center text-lg">
                <FaChartLine className="mr-2" />
                Community Impact
              </h3>
              <div className="space-y-3">
    <div className="flex justify-between items-center">
      <span className="text-blue-100">Knowledge Shared</span>
      <span className="font-bold">{contents.length}</span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-blue-100">Total Engagement</span>
      <span className="font-bold">
        {contents.reduce((acc, content) => 
          acc + (parseInt(content.like_count) || 0) + (parseInt(content.dislike_count) || 0) + (parseInt(content.feedback_count) || 0), 0
        )}
      </span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-blue-100">Total Contributors</span>
      <span className="font-bold">
        {new Set(contents.map(c => c.upload_by)).size}
      </span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-blue-100">Avg. Feedback</span>
      <span className="font-bold">
        {contents.length > 0 
          ? (contents.reduce((acc, content) => acc + (parseInt(content.feedback_count) || 0), 0) / contents.length).toFixed(1)
          : '0.0'
        }
      </span>
    </div>
  </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="bg-white rounded shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border-0"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded">
                      <FaUpload className="text-xl" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Share Your Knowledge</h2>
                      <p className="text-blue-100">Contribute to the team&apos;s collective intelligence</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-white/20 rounded transition-colors"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 md:p-8 overflow-y-auto max-h-[80vh]">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                      Knowledge Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white/50 backdrop-blur-sm"
                      placeholder="What valuable knowledge are you sharing?"
                      required
                    />
                  </div>
                  
                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                      Brief Description *
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white/50 backdrop-blur-sm"
                      placeholder="Provide a clear and concise description of your knowledge..."
                      required
                    ></textarea>
                  </div>

                  {/* Detailed Content */}
                  <div>
                    <label htmlFor="contentText" className="block text-sm font-semibold text-gray-700 mb-2">
                      Detailed Content (Procedures, Articles, etc.)
                    </label>
                    <textarea
                      id="contentText"
                      value={formData.contentText}
                      onChange={(e) => setFormData(prev => ({ ...prev, contentText: e.target.value }))}
                      rows="6"
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white/50 backdrop-blur-sm"
                      placeholder="Share detailed procedures, articles, step-by-step guides, or any important technical information..."
                    ></textarea>
                  </div>
                  
                  {/* External Link */}
                  <div>
                    <label htmlFor="externalLink" className="block text-sm font-semibold text-gray-700 mb-2">
                      External Link (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                        <FaLink />
                      </div>
                      <input
                        type="url"
                        id="externalLink"
                        value={formData.externalLink}
                        onChange={(e) => setFormData(prev => ({ ...prev, externalLink: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white/50 backdrop-blur-sm"
                        placeholder="https://example.com/resource"
                      />
                    </div>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center p-4 bg-blue-50 rounded border border-blue-200">
                      <input
                        type="checkbox"
                        id="isImportant"
                        checked={formData.isImportant}
                        onChange={(e) => setFormData(prev => ({ ...prev, isImportant: e.target.checked }))}
                        className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="isImportant" className="ml-3 text-sm font-semibold text-gray-700">
                        Mark as Important
                      </label>
                    </div>

                    <div className="flex items-center p-4 bg-green-50 rounded border border-green-200">
                      <input
                        type="checkbox"
                        id="notifyAll"
                        checked={formData.notifyAll}
                        onChange={(e) => setFormData(prev => ({ ...prev, notifyAll: e.target.checked }))}
                        className="w-5 h-5 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500"
                      />
                      <label htmlFor="notifyAll" className="ml-3 text-sm font-semibold text-gray-700">
                        Notify All Users
                      </label>
                    </div>
                  </div>
                  
                  {/* File Uploads */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Media Upload */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-semibold text-gray-700">
                          Main Media (Image/Video)
                        </label>
                        <span className="text-xs text-gray-500">Max 1 file</span>
                      </div>
                      
                      <div 
                        className={`border-2 border-dashed rounded p-6 text-center cursor-pointer transition-all duration-200 ${
                          formData.mediaFile 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          className="hidden" 
                          onChange={handleMediaChange}
                          accept="image/*,video/*"
                        />
                        
                        {formData.mediaFile ? (
                          <div className="flex flex-col items-center">
                            <div className="text-green-500 mb-3">
                              <FaFileImage className="text-3xl" />
                            </div>
                            <p className="font-semibold text-gray-700 truncate max-w-full">
                              {formData.mediaFile.name}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {(formData.mediaFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMediaFile();
                              }}
                              className="mt-3 text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Remove File
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="text-blue-500 mb-4">
                              <FaFileVideo className="text-4xl mx-auto" />
                            </div>
                            <p className="font-semibold text-gray-700">Upload Media</p>
                            <p className="text-sm text-gray-500 mt-2">
                              Click to upload an image or video
                            </p>
                            <p className="text-xs text-gray-400 mt-3">
                              Supports JPG, PNG, GIF, MP4, MOV • Max 50MB
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Documents Upload */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-semibold text-gray-700">
                          Supporting Documents
                        </label>
                        <span className="text-xs text-gray-500">Multiple files</span>
                      </div>
                      
                      <div 
                        className={`border-2 border-dashed rounded p-6 text-center cursor-pointer transition-all duration-200 ${
                          formData.documentFiles.length > 0
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-300 hover:border-purple-500 hover:bg-purple-50'
                        }`}
                        onClick={() => docInputRef.current?.click()}
                      >
                        <input 
                          type="file" 
                          ref={docInputRef}
                          className="hidden" 
                          onChange={handleDocChange}
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                        />
                        
                        {formData.documentFiles.length > 0 ? (
                          <div className="space-y-3">
                            {formData.documentFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                                <div className="flex items-center">
                                  <div className="text-purple-500 mr-3">
                                    {renderFileIcon(file.type.split('/')[1])}
                                  </div>
                                  <div>
                                    <span className="text-sm font-medium truncate max-w-xs block">
                                      {file.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                                    </span>
                                  </div>
                                </div>
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeDocFile(index);
                                  }}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <FaTimes size={14} />
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button"
                              onClick={() => docInputRef.current?.click()}
                              className="text-purple-600 hover:text-purple-800 text-sm font-medium mt-2"
                            >
                              + Add more files
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="text-purple-500 mb-4">
                              <FaFileAlt className="text-4xl mx-auto" />
                            </div>
                            <p className="font-semibold text-gray-700">Upload Documents</p>
                            <p className="text-sm text-gray-500 mt-2">
                              Click to upload supporting files
                            </p>
                            <p className="text-xs text-gray-400 mt-3">
                              Supports PDF, DOCX, XLSX, ZIP, TXT • Max 20MB each
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-all duration-200 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded hover:shadow-xl disabled:opacity-70 transition-all duration-200 flex items-center font-semibold"
                    >
                      {uploading ? (
                        <>
                          <FaSpinner className="animate-spin mr-2" />
                          Sharing Knowledge...
                        </>
                      ) : (
                        <>
                          <FaRocket className="mr-2" />
                          Share Knowledge
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}