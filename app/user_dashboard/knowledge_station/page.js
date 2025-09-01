// app/user_dashboard/knowledge_station/page.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { 
  FaPlus, FaThumbsUp, FaThumbsDown, FaRegThumbsUp, FaRegThumbsDown, 
  FaComments, FaFileAlt, FaFilePdf, FaFileExcel, FaFileWord, 
  FaFileImage, FaFileVideo, FaTimes, FaSearch, FaFilter, FaSort,
  FaLink, FaExternalLinkAlt, FaRegBookmark, FaBookmark, FaShare, FaPaperclip
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import LoadingSpinner from "../../components/LoadingSpinner";

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

// Dummy data for demonstration
const dummyContents = [
  {
    ks_content_id: "KSC01SOCP",
    title: "Network Security Best Practices",
    description: "Essential guidelines for maintaining network security in a SOC environment. Includes firewall configurations, intrusion detection, and threat analysis techniques.",
    content_path: [
      { type: "pdf", url: "/dummy/network_security.pdf", name: "Security Guide.pdf" },
      { type: "excel", url: "/dummy/security_checklist.xlsx", name: "Checklist.xlsx" }
    ],
    media: {
      type: "video",
      url: "https://www.youtube.com/embed/3QnD2c4Xovk",
      thumbnail: "https://img.youtube.com/vi/3QnD2c4Xovk/maxresdefault.jpg"
    },
    like_count: 12,
    dislike_count: 1,
    upload_by: "SOC-Admin",
    created_at: "2025-08-10T14:30:00Z",
    feedbacks: [
      {
        feedback_description: "Very comprehensive guide, helped our team improve our security posture!",
        feedback_by: "SecAnalyst-01",
        created_at: "2025-08-11T09:15:00Z"
      },
      {
        feedback_description: "The firewall section needs more examples of real-world scenarios.",
        feedback_by: "NetAdmin-05",
        created_at: "2025-08-11T14:22:00Z"
      }
    ],
    link: "https://security-best-practices.com",
    saved: false
  },
  {
    ks_content_id: "KSC02SOCP",
    title: "Incident Response Workflow",
    description: "Step-by-step guide for handling security incidents. Includes playbooks for different types of cyber attacks and communication protocols.",
    content_path: [
      { type: "video", url: "/dummy/incident_response.mp4", name: "Response Video.mp4" },
      { type: "word", url: "/dummy/response_playbook.docx", name: "Playbook.docx" }
    ],
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
      name: "Workflow Diagram"
    },
    like_count: 24,
    dislike_count: 3,
    upload_by: "CISO-01",
    created_at: "2025-08-05T10:15:00Z",
    feedbacks: [
      {
        feedback_description: "The video walkthrough saved us hours of training time!",
        feedback_by: "TeamLead-03",
        created_at: "2025-08-07T11:30:00Z"
      }
    ],
    saved: true
  },
  {
    ks_content_id: "KSC03SOCP",
    title: "Phishing Detection Techniques",
    description: "Advanced methods for identifying and mitigating phishing attacks. Includes email header analysis and user awareness training materials.",
    content_path: [
      { type: "pdf", url: "/dummy/phishing_analysis.pdf", name: "Analysis.pdf" },
      { type: "zip", url: "/dummy/phishing_examples.zip", name: "Examples.zip" }
    ],
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1465&q=80",
      name: "Phishing Examples"
    },
    like_count: 18,
    dislike_count: 0,
    upload_by: "SecAnalyst-03",
    created_at: "2025-08-08T16:45:00Z",
    feedbacks: [],
    link: "https://phishing-detection.org"
  }
];

// Current user info
const currentUser = {
  socPortalId: "SOC-Operator-42",
  name: "Alex Johnson",
  avatar: "AJ"
};

export default function KnowledgeStationPage() {
  const [contents, setContents] = useState([]);
  const [filteredContents, setFilteredContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mediaFile: null,
    docFiles: [],
    link: ''
  });
  const [activeContent, setActiveContent] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);

  // Simulate loading data
  useEffect(() => {
    const fetchContents = async () => {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Use dummy data directly
        setContents(dummyContents);
        setFilteredContents(dummyContents);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch knowledge contents:', error);
        setLoading(false);
      }
    };

    fetchContents();
  }, []);

  // Apply search and sort filters
  useEffect(() => {
    let result = [...contents];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(content => 
        content.title.toLowerCase().includes(term) || 
        content.description.toLowerCase().includes(term) ||
        (content.link && content.link.toLowerCase().includes(term))
      );
    }
    
    // Apply sort order
    result.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      
      return sortOrder === 'newest' ? 
        dateB - dateA : 
        dateA - dateB;
    });
    
    setFilteredContents(result);
  }, [contents, searchTerm, sortOrder]);

  // Handle file selection for media
  const handleMediaChange = (e) => {
    if (e.target.files.length > 0) {
      setFormData({ ...formData, mediaFile: e.target.files[0] });
    }
  };

  // Handle file selection for documents
  const handleDocChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFormData({ 
      ...formData, 
      docFiles: [...formData.docFiles, ...selectedFiles] 
    });
  };

  // Remove selected media file
  const removeMediaFile = () => {
    setFormData({ ...formData, mediaFile: null });
  };

  // Remove selected doc file
  const removeDocFile = (index) => {
    const newFiles = [...formData.docFiles];
    newFiles.splice(index, 1);
    setFormData({ ...formData, docFiles: newFiles });
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Submit new knowledge content
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Create new content object
    const newContent = {
      ks_content_id: `KSC${String(contents.length + 1).padStart(2, '0')}SOCP`,
      title: formData.title,
      description: formData.description,
      content_path: formData.docFiles.map(file => ({ 
        type: getFileType(file.name),
        url: `/dummy/${file.name}`,
        name: file.name 
      })),
      media: formData.mediaFile ? {
        type: getFileType(formData.mediaFile.name),
        url: `/dummy/${formData.mediaFile.name}`,
        name: formData.mediaFile.name
      } : null,
      like_count: 0,
      dislike_count: 0,
      upload_by: currentUser.socPortalId,
      created_at: new Date().toISOString(),
      feedbacks: [],
      link: formData.link || null,
      saved: false
    };

    // Add to contents
    const updatedContents = [newContent, ...contents];
    setContents(updatedContents);
    
    // Reset form and close modal
    setShowModal(false);
    setFormData({ 
      title: '', 
      description: '', 
      mediaFile: null,
      docFiles: [],
      link: ''
    });
    setUploading(false);
  };

  // Get file type from extension
  const getFileType = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(extension)) return 'video';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['xls', 'xlsx'].includes(extension)) return 'excel';
    if (['doc', 'docx'].includes(extension)) return 'word';
    if (['zip'].includes(extension)) return 'zip';
    return 'other';
  };

  // Handle reaction (like/dislike)
  const handleReaction = (contentId, reactionType) => {
    setContents(contents.map(content => 
      content.ks_content_id === contentId 
        ? { 
            ...content, 
            like_count: reactionType === 'like' ? content.like_count + 1 : content.like_count,
            dislike_count: reactionType === 'dislike' ? content.dislike_count + 1 : content.dislike_count
          } 
        : content
    ));
  };

  // Submit feedback
  const submitFeedback = (contentId) => {
    if (!feedbackText.trim()) return;
    
    const newFeedback = {
      feedback_description: feedbackText,
      feedback_by: currentUser.socPortalId,
      created_at: new Date().toISOString()
    };

    setContents(contents.map(content => 
      content.ks_content_id === contentId 
        ? { 
            ...content, 
            feedbacks: [...content.feedbacks, newFeedback] 
          } 
        : content
    ));
    
    setFeedbackText('');
  };

  // Toggle save content
  const toggleSave = (contentId) => {
    setContents(contents.map(content => 
      content.ks_content_id === contentId 
        ? { ...content, saved: !content.saved } 
        : content
    ));
  };

  // Render file icon based on type
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
      minute: '2-digit',
      timeZone: 'Asia/Dhaka' // Ensure Asia/Dhaka timezone for consistency
    });
  };

  // Format domain from URL
  const formatDomain = (url) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Full-width container */}
      <div className="max-w-full mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Knowledge Station
          </h1>
          <p className="text-gray-600 mt-2">
            Share, discover, and collaborate on security knowledge with your team
          </p>
        </motion.div>
        
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowModal(true)}
          className="flex items-center px-5 py-3 bg-blue-600 text-white rounded shadow-md hover:bg-blue-700 transition-all mt-6"
        >
          <FaPlus className="mr-2" />
          <span>Add Knowledge</span>
        </motion.button>
        
        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded shadow-sm p-4 mb-8 border border-gray-200 mx-4 mt-8"
        >
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
              <FaSearch />
            </div>
            <input
              type="text"
              placeholder="Search knowledge content..."
              className="w-full pl-12 pr-4 py-3 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Stats Section - Mobile Top */}
        <div className="lg:hidden mb-6 px-4">
          <div className="bg-white rounded shadow-sm p-5 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4 text-center">Knowledge Station Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center p-3 bg-blue-50 rounded">
                <FaFileAlt className="text-blue-600 text-xl mb-2" />
                <p className="text-sm text-gray-600">Total Knowledge</p>
                <p className="font-bold text-gray-900">{contents.length} items</p>
              </div>
              
              <div className="flex flex-col items-center justify-center p-3 bg-green-50 rounded">
                <FaComments className="text-green-600 text-xl mb-2" />
                <p className="text-sm text-gray-600">Total Feedback</p>
                <p className="font-bold text-gray-900">
                  {contents.reduce((acc, content) => acc + content.feedbacks.length, 0)} comments
                </p>
              </div>
              
              <div className="flex flex-col items-center justify-center p-3 bg-purple-50 rounded">
                <FaThumbsUp className="text-purple-600 text-xl mb-2" />
                <p className="text-sm text-gray-600">Total Likes</p>
                <p className="font-bold text-gray-900">
                  {contents.reduce((acc, content) => acc + content.like_count, 0)}
                </p>
              </div>
              
              <div className="flex flex-col items-center justify-center p-3 bg-amber-50 rounded">
                <FaShare className="text-amber-600 text-xl mb-2" />
                <p className="text-sm text-gray-600">Total Shares</p>
                <p className="font-bold text-gray-900">
                  {contents.reduce((acc, content) => acc + content.like_count, 0) * 2}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feed Container */}
        <div className="flex flex-col lg:flex-row gap-6 px-4">
          {/* Main Feed */}
          <div className="lg:w-8/12">
            <div className="space-y-6">
              {filteredContents.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 bg-white rounded shadow-sm border border-gray-200"
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 mb-5">
                    <FaFileAlt className="text-blue-500 text-3xl" />
                  </div>
                  <h3 className="text-2xl font-medium text-gray-900">No knowledge found</h3>
                  <p className="mt-2 text-gray-600 max-w-md mx-auto">
                    Try adjusting your search or be the first to share knowledge!
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowModal(true)}
                    className="mt-6 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all"
                  >
                    Share Knowledge
                  </motion.button>
                </motion.div>
              ) : (
                filteredContents.map((content, index) => (
                  <motion.div
                    key={content.ks_content_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="p-5 md:p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center text-blue-800 font-bold">
                            {content.upload_by.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">@{content.upload_by}</h3>
                            <p className="text-xs text-gray-500">{formatDate(content.created_at)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleSave(content.ks_content_id)}
                          className="text-gray-400 hover:text-yellow-500"
                        >
                          {content.saved ? (
                            <FaBookmark className="text-yellow-500 text-xl" />
                          ) : (
                            <FaRegBookmark className="text-xl" />
                          )}
                        </button>
                      </div>
                      
                      {/* Title & Description */}
                      <h2 className="text-xl font-bold text-gray-900 mb-3">{content.title}</h2>
                      <p className="text-gray-700 mb-4">{content.description}</p>
                      
                      {/* Link Preview */}
                      {content.link && (
                        <a 
                          href={content.link} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block border border-gray-200 rounded overflow-hidden mb-4 hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center p-3 bg-gray-50">
                            <div className="bg-blue-100 p-2 rounded mr-3">
                              <FaLink className="text-blue-600" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-medium text-gray-900 truncate">{formatDomain(content.link)}</p>
                              <p className="text-sm text-gray-600 truncate">{content.link}</p>
                            </div>
                            <FaExternalLinkAlt className="ml-2 text-gray-400" />
                          </div>
                        </a>
                      )}
                      
                      {/* Media Preview */}
                      {content.media && (
                        <div className="mb-4 rounded overflow-hidden">
                          {content.media.type === 'video' ? (
                            <div className="relative pt-[56.25%] bg-gray-100">
                              <iframe 
                                src={content.media.url}
                                className="absolute inset-0 w-full h-full"
                                title={content.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                          ) : (
                            <div className="relative w-full h-64">
                              <Image 
                                src={content.media.url} 
                                alt={content.media.name || content.title}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover"
                                quality={80}
                                priority={index < 2} // Prioritize first two images for LCP
                              />
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Documents */}
                      {content.content_path.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {content.content_path.map((file, index) => (
                            <a 
                              key={index}
                              href="#"
                              onClick={(e) => e.preventDefault()}
                              className="flex items-center px-3 py-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                            >
                              <div className="mr-2">
                                {renderFileIcon(file.type)}
                              </div>
                              <div className="truncate text-sm font-medium text-gray-700 max-w-[160px]">
                                {file.name}
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                      
                      {/* Engagement Bar */}
                      <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
                        <div className="flex gap-4">
                          <button 
                            onClick={() => handleReaction(content.ks_content_id, 'like')}
                            className="flex items-center gap-2 text-gray-500 hover:text-blue-600"
                          >
                            {content.like_count > 0 ? (
                              <FaThumbsUp className="text-blue-600" />
                            ) : (
                              <FaRegThumbsUp />
                            )}
                            <span>{content.like_count}</span>
                          </button>
                          
                          <button 
                            onClick={() => handleReaction(content.ks_content_id, 'dislike')}
                            className="flex items-center gap-2 text-gray-500 hover:text-red-600"
                          >
                            {content.dislike_count > 0 ? (
                              <FaThumbsDown className="text-red-600" />
                            ) : (
                              <FaRegThumbsDown />
                            )}
                            <span>{content.dislike_count}</span>
                          </button>
                          
                          <button 
                            onClick={() => setActiveContent(activeContent === content.ks_content_id ? null : content.ks_content_id)}
                            className="flex items-center gap-2 text-gray-500 hover:text-purple-600"
                          >
                            <FaComments />
                            <span>{content.feedbacks?.length || 0}</span>
                          </button>
                        </div>
                        
                        <button className="flex items-center gap-2 text-gray-500 hover:text-green-600">
                          <FaShare />
                          <span>Share</span>
                        </button>
                      </div>
                      
                      {/* Feedback Section */}
                      {activeContent === content.ks_content_id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="mt-4 pt-4 border-t border-gray-200"
                        >
                          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <FaComments className="mr-2 text-blue-600" />
                            Feedback
                          </h3>
                          
                          {/* Feedback input - Single line */}
                          <div className="flex items-center mb-4 gap-2">
                            <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center text-blue-800 font-bold text-sm flex-shrink-0">
                              {currentUser.avatar}
                            </div>
                            <div className="flex-1 flex">
                              <input
                                type="text"
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="Share your thoughts..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-l focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                              />
                              <button
                                onClick={() => submitFeedback(content.ks_content_id)}
                                className="px-4 py-3 bg-blue-600 text-white rounded-r hover:bg-blue-700 transition-colors whitespace-nowrap"
                              >
                                Post
                              </button>
                            </div>
                          </div>
                          
                          {/* Feedback list */}
                          <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                            {content.feedbacks?.map((feedback, index) => (
                              <div key={index} className="flex gap-3">
                                <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center text-blue-800 font-bold text-sm flex-shrink-0">
                                  {feedback.feedback_by.charAt(0)}
                                </div>
                                <div className="flex-1 bg-gray-50 p-4 rounded">
                                  <div className="flex justify-between items-center mb-1">
                                    <p className="font-semibold text-gray-900">{feedback.feedback_by}</p>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(feedback.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-gray-800">{feedback.feedback_description}</p>
                                </div>
                              </div>
                            ))}
                            
                            {(!content.feedbacks || content.feedbacks.length === 0) && (
                              <div className="text-center py-5 bg-gray-50 rounded border border-gray-200">
                                <FaComments className="mx-auto text-gray-400 text-2xl mb-2" />
                                <p className="text-gray-600">No feedback yet</p>
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
          
          {/* Sidebar - Fixed on desktop */}
          <div className="lg:w-4/12 lg:sticky lg:top-6 lg:self-start">
            <div className="hidden lg:block bg-white rounded shadow-sm p-5 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">Knowledge Station Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-2 rounded mr-3">
                      <FaFileAlt className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Knowledge</p>
                      <p className="font-bold text-gray-900">{contents.length} items</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-2 rounded mr-3">
                      <FaComments className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Feedback</p>
                      <p className="font-bold text-gray-900">
                        {contents.reduce((acc, content) => acc + content.feedbacks.length, 0)} comments
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                  <div className="flex items-center">
                    <div className="bg-purple-100 p-2 rounded mr-3">
                      <FaThumbsUp className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Engagement</p>
                      <p className="font-bold text-gray-900">
                        {contents.reduce((acc, content) => acc + content.like_count, 0)} likes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3">Top Contributors</h3>
                <div className="space-y-3">
                  <div className="flex items-center p-2 hover:bg-gray-50 rounded">
                    <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-blue-800 font-bold text-sm mr-3">
                      S
                    </div>
                    <p className="font-medium text-gray-900">SOC-Admin</p>
                    <span className="ml-auto text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      12 posts
                    </span>
                  </div>
                  
                  <div className="flex items-center p-2 hover:bg-gray-50 rounded">
                    <div className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center text-green-800 font-bold text-sm mr-3">
                      C
                    </div>
                    <p className="font-medium text-gray-900">CISO-01</p>
                    <span className="ml-auto text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                      8 posts
                    </span>
                  </div>
                  
                  <div className="flex items-center p-2 hover:bg-gray-50 rounded">
                    <div className="bg-purple-100 w-8 h-8 rounded flex items-center justify-center text-purple-800 font-bold text-sm mr-3">
                      S
                    </div>
                    <p className="font-medium text-gray-900">SecAnalyst-03</p>
                    <span className="ml-auto text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      6 posts
                    </span>
                  </div>
                </div>
              </div>
            </div>
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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded shadow-lg w-full max-w-3xl overflow-hidden border border-gray-200"
            >
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Share Your Knowledge</h2>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    <FaTimes />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      placeholder="What knowledge are you sharing?"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      placeholder="Describe your knowledge content in detail..."
                      required
                    ></textarea>
                  </div>
                  
                  <div>
                    <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-2">
                      External Link (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                        <FaLink />
                      </div>
                      <input
                        type="url"
                        id="link"
                        name="link"
                        value={formData.link}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Media Upload */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Main Media (Image/Video)
                        </label>
                        <span className="text-xs text-gray-500">Max 1 file</span>
                      </div>
                      
                      <div 
                        className={`border-2 border-dashed rounded p-5 text-center cursor-pointer transition-colors ${
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
                            <div className="text-green-500 mb-2">
                              <FaFileImage className="text-2xl" />
                            </div>
                            <p className="font-medium text-gray-700 truncate max-w-full">
                              {formData.mediaFile.name}
                            </p>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMediaFile();
                              }}
                              className="mt-2 text-red-500 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="text-blue-500 mb-3">
                              <FaFileVideo className="text-3xl mx-auto" />
                            </div>
                            <p className="font-medium text-gray-700">Upload Media</p>
                            <p className="text-sm text-gray-500 mt-1">
                              Click to upload an image or video
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              Supports JPG, PNG, MP4, MOV
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Documents Upload */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Supporting Documents
                        </label>
                        <span className="text-xs text-gray-500">Multiple files</span>
                      </div>
                      
                      <div 
                        className={`border-2 border-dashed rounded p-5 text-center cursor-pointer transition-colors ${
                          formData.docFiles.length > 0
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
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
                        />
                        
                        {formData.docFiles.length > 0 ? (
                          <div className="space-y-3">
                            {formData.docFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                                <div className="flex items-center">
                                  <div className="text-purple-500 mr-2">
                                    {renderFileIcon(getFileType(file.name))}
                                  </div>
                                  <span className="text-sm font-medium truncate max-w-xs">
                                    {file.name}
                                  </span>
                                </div>
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeDocFile(index);
                                  }}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <FaTimes size={12} />
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button"
                              className="text-purple-600 hover:text-purple-800 text-sm mt-2"
                            >
                              Add more files
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="text-purple-500 mb-3">
                              <FaFileAlt className="text-3xl mx-auto" />
                            </div>
                            <p className="font-medium text-gray-700">Upload Documents</p>
                            <p className="text-sm text-gray-500 mt-1">
                              Click to upload supporting files
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              Supports PDF, DOCX, XLSX, ZIP
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-5 py-3 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="px-5 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-70 transition-all"
                    >
                      {uploading ? (
                        <span className="flex items-center">
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                          Uploading...
                        </span>
                      ) : 'Share Knowledge'}
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