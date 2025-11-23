// app/admin_dashboard/notice_board/edit/[notice_id]/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DateTime } from 'luxon';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaEdit, FaSave, FaArrowLeft, FaCalendarAlt, 
  FaImage, FaFilePdf, FaTrash, FaEye,
  FaClock, FaCheckCircle, FaTimesCircle,
  FaBullhorn, FaUserTie, FaIdCard, FaPencilAlt
} from 'react-icons/fa';

export default function EditNoticePage() {
  const router = useRouter();
  const params = useParams();
  const noticeId = params.notice_id;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    from_datetime: '',
    to_datetime: '',
    image: null,
    pdf: null,
    current_image_url: null,
    current_pdf_url: null
  });

  // Status functions
  const getNoticeStatus = (notice) => {
    if (!notice) return { status: 'unknown', color: 'gray', text: 'Unknown' };
    
    const now = DateTime.now().setZone('Asia/Dhaka');
    const from = DateTime.fromISO(notice.from_datetime).setZone('Asia/Dhaka');
    const to = DateTime.fromISO(notice.to_datetime).setZone('Asia/Dhaka');
    
    if (now < from) return { status: 'upcoming', color: 'blue', text: 'Upcoming' };
    if (now > to) return { status: 'expired', color: 'gray', text: 'Expired' };
    return { status: 'active', color: 'emerald', text: 'Active' };
  };

  const isNoticeActive = (notice) => getNoticeStatus(notice).status === 'active';
  const isNoticeUpcoming = (notice) => getNoticeStatus(notice).status === 'upcoming';

  // Fetch notice data
  useEffect(() => {
    const fetchNotice = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin_dashboard/notice_board/${noticeId}`);
        const result = await response.json();

        if (result.success) {
          const noticeData = result.data;
          setNotice(noticeData);
          
          setFormData({
            title: noticeData.title,
            description: noticeData.description,
            from_datetime: DateTime.fromISO(noticeData.from_datetime).toFormat("yyyy-MM-dd'T'HH:mm"),
            to_datetime: DateTime.fromISO(noticeData.to_datetime).toFormat("yyyy-MM-dd'T'HH:mm"),
            image: null,
            pdf: null,
            current_image_url: noticeData.image_url,
            current_pdf_url: noticeData.pdf_url
          });

          if (noticeData.image_url) setPreviewImage(noticeData.image_url);
          if (noticeData.pdf_url) setPdfPreview(noticeData.pdf_url);
        } else {
          toast.error('Failed to fetch notice data');
          router.push('/admin_dashboard/notice_board/log');
        }
      } catch (error) {
        console.error('Error fetching notice:', error);
        toast.error('Failed to fetch notice data');
        router.push('/admin_dashboard/notice_board/log');
      } finally {
        setLoading(false);
      }
    };

    if (noticeId) fetchNotice();
  }, [noticeId, router]);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'image') {
      const file = files[0];
      if (file) {
        setFormData(prev => ({ ...prev, image: file }));
        const reader = new FileReader();
        reader.onload = (e) => setPreviewImage(e.target.result);
        reader.readAsDataURL(file);
      }
    } else if (name === 'pdf') {
      const file = files[0];
      if (file) {
        setFormData(prev => ({ ...prev, pdf: file }));
        const url = URL.createObjectURL(file);
        setPdfPreview(url);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: null, current_image_url: null }));
    setPreviewImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePdf = () => {
    setFormData(prev => ({ ...prev, pdf: null, current_pdf_url: null }));
    setPdfPreview(null);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const handleSaveNotice = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.from_datetime || !formData.to_datetime) {
      toast.error('Please fill all required fields');
      return;
    }

    const fromDate = new Date(formData.from_datetime);
    const toDate = new Date(formData.to_datetime);
    if (fromDate >= toDate) {
      toast.error('End date must be after start date');
      return;
    }

    if (notice && isNoticeActive(notice)) {
      const originalFrom = new Date(notice.from_datetime);
      if (fromDate.getTime() !== originalFrom.getTime()) {
        toast.error('Cannot change start date for active notices');
        return;
      }
    }

    setSaving(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('from_datetime', formData.from_datetime);
      formDataToSend.append('to_datetime', formData.to_datetime);
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      } else if (formData.current_image_url === null) {
        formDataToSend.append('remove_image', 'true');
      }
      
      if (formData.pdf) {
        formDataToSend.append('pdf', formData.pdf);
      } else if (formData.current_pdf_url === null) {
        formDataToSend.append('remove_pdf', 'true');
      }

      const response = await fetch(`/api/admin_dashboard/notice_board/${noticeId}`, {
        method: 'PUT',
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Notice updated successfully!');
        router.push('/admin_dashboard/notice_board/log');
      } else {
        toast.error(result.message || 'Failed to update notice');
      }
    } catch (error) {
      console.error('Error updating notice:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-800 text-lg font-medium">Loading notice details...</p>
        </div>
      </div>
    );
  }

  if (!notice) {
    return null;
  }

  const status = getNoticeStatus(notice);
  const isActive = isNoticeActive(notice);
  const isUpcoming = isNoticeUpcoming(notice);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between p-8 bg-white rounded border border-gray-100 shadow-sm mb-8">
  {/* Left Section - Back Navigation */}
  <div className="flex items-center gap-4">
    <button
      onClick={() => router.push('/admin_dashboard/notice_board/log')}
      className="group flex items-center gap-3 px-5 py-3 text-gray-600 hover:text-gray-900 transition-all duration-300 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200"
    >
      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded group-hover:bg-gray-200 transition-colors">
        <FaArrowLeft className="text-gray-500 group-hover:text-gray-700 text-sm" />
      </div>
      <div className="text-left">
        <div className="text-sm font-medium text-gray-500 group-hover:text-gray-700">Back to</div>
        <div className="font-semibold text-gray-900">Notice Log</div>
      </div>
    </button>
    
    <div className="w-px h-12 bg-gradient-to-b from-transparent via-gray-200 to-transparent"></div>
  </div>

  {/* Center Section - Main Title */}
  <div className="flex items-center gap-6 px-8 py-5 bg-gradient-to-br from-slate-50 to-white rounded border border-gray-100 shadow-xs">
    <div className="relative">
      <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded flex items-center justify-center shadow-lg shadow-blue-500/25">
        <FaEdit className="text-white text-lg" />
      </div>
      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
        <FaPencilAlt className="text-white text-xs" />
      </div>
    </div>
    
    <div className="text-left">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-gray-900">Edit Notice</h1>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
      </div>
      <p className="text-gray-500 text-sm font-medium">Modify and update notice information</p>
    </div>
  </div>

  {/* Right Section - Status Badge */}
  <div className="flex flex-col items-end gap-2">
    <div className={`inline-flex items-center gap-3 px-5 py-3 rounded border transition-all duration-300 ${
      status.color === 'emerald' 
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs shadow-emerald-500/10' 
        : status.color === 'blue' 
        ? 'bg-blue-50 text-blue-800 border-blue-200 shadow-xs shadow-blue-500/10'
        : 'bg-gray-50 text-gray-600 border-gray-200'
    }`}>
      <div className={`w-3 h-3 rounded-full animate-pulse ${
        status.status === 'active' ? 'bg-emerald-500' :
        status.status === 'upcoming' ? 'bg-blue-500' :
        'bg-gray-500'
      }`}></div>
      
      {status.status === 'active' && <FaCheckCircle className="text-emerald-600 text-lg" />}
      {status.status === 'upcoming' && <FaClock className="text-blue-600 text-lg" />}
      {status.status === 'expired' && <FaTimesCircle className="text-gray-500 text-lg" />}
      
      <span className="font-semibold text-sm">{status.text}</span>
    </div>
    
    <div className="text-xs text-gray-400 font-medium">
      Last updated: {new Date().toLocaleDateString()}
    </div>
  </div>
</div>

          {/* Notice Info Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded border border-white/50 shadow-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded flex items-center justify-center">
                  <FaIdCard className="text-white text-lg" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Notice ID</p>
                  <p className="text-lg font-bold text-gray-900 font-mono">{notice.notice_id}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded flex items-center justify-center">
                  <FaUserTie className="text-white text-lg" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Created By</p>
                  <p className="text-lg font-bold text-gray-900">{notice.created_by_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded flex items-center justify-center">
                  <FaCalendarAlt className="text-white text-lg" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Created On</p>
                  <p className="text-lg font-bold text-gray-900">
                    {DateTime.fromISO(notice.created_at).toFormat('MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <motion.div 
              className="bg-white/80 backdrop-blur-sm rounded border border-white/50 shadow-xl overflow-hidden"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="p-8">
                {/* Basic Information */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded flex items-center justify-center">
                      <FaBullhorn className="text-white text-lg" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
                      <p className="text-gray-600">Update the notice title and description</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Notice Title *
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="w-full px-4 py-4 bg-white border-2 border-gray-200 rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 text-lg font-medium"
                        placeholder="Enter notice title..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Description *
                      </label>
                      <textarea
                        name="description"
                        rows={6}
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full px-4 py-4 bg-white border-2 border-gray-200 rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 resize-none text-lg font-medium"
                        placeholder="Provide detailed description..."
                      />
                    </div>
                  </div>
                </div>

                {/* Schedule Section */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded flex items-center justify-center">
                      <FaCalendarAlt className="text-white text-lg" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Schedule</h2>
                      <p className="text-gray-600">Set notice visibility period</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Start Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        name="from_datetime"
                        value={formData.from_datetime}
                        onChange={handleInputChange}
                        disabled={isActive}
                        className={`w-full px-4 py-4 border-2 rounded text-gray-900 focus:outline-none focus:ring-4 transition-all duration-300 text-lg font-medium ${
                          isActive 
                            ? 'border-gray-300 bg-gray-100 cursor-not-allowed text-gray-500' 
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100 bg-white'
                        }`}
                      />
                      {isActive && (
                        <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                          <FaClock className="text-gray-400" />
                          Start date cannot be changed for active notices
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        End Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        name="to_datetime"
                        value={formData.to_datetime}
                        onChange={handleInputChange}
                        className="w-full px-4 py-4 bg-white border-2 border-gray-200 rounded text-gray-900 focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-300 text-lg font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Media Section */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded flex items-center justify-center">
                      <FaImage className="text-white text-lg" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Media Attachments</h2>
                      <p className="text-gray-600">Update images and documents</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Image Upload */}
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Image (Optional)
                      </label>
                      <div className={`border-3 border-dashed rounded p-6 text-center transition-all duration-300 ${
                        previewImage 
                          ? 'border-green-400 bg-green-50/50' 
                          : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/30'
                      }`}>
                        <input
                          ref={fileInputRef}
                          type="file"
                          id="image"
                          name="image"
                          accept="image/*"
                          onChange={handleInputChange}
                          className="hidden"
                        />
                        <label htmlFor="image" className="cursor-pointer block">
                          {previewImage ? (
                            <div className="space-y-4">
                              <div className="relative">
                                <img 
                                  src={previewImage} 
                                  alt="Preview" 
                                  className="max-h-48 mx-auto rounded shadow-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() => window.open(previewImage, '_blank')}
                                  className="absolute top-2 right-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                >
                                  <FaEye className="text-sm" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={removeImage}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-medium mx-auto"
                              >
                                <FaTrash className="text-sm" />
                                Remove Image
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-100 to-pink-100 rounded flex items-center justify-center">
                                <FaImage className="w-8 h-8 text-purple-400" />
                              </div>
                              <div>
                                <p className="text-gray-700 font-medium">Click to upload image</p>
                                <p className="text-gray-500 text-sm mt-1">PNG, JPG, WEBP up to 10MB</p>
                              </div>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* PDF Upload */}
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        PDF Document (Optional)
                      </label>
                      <div className={`border-3 border-dashed rounded p-6 text-center transition-all duration-300 ${
                        formData.pdf || formData.current_pdf_url
                          ? 'border-green-400 bg-green-50/50' 
                          : 'border-gray-300 hover:border-red-400 hover:bg-red-50/30'
                      }`}>
                        <input
                          ref={pdfInputRef}
                          type="file"
                          id="pdf"
                          name="pdf"
                          accept=".pdf"
                          onChange={handleInputChange}
                          className="hidden"
                        />
                        <label htmlFor="pdf" className="cursor-pointer block">
                          {formData.pdf || formData.current_pdf_url ? (
                            <div className="space-y-4">
                              <div className="w-16 h-16 mx-auto bg-red-100 rounded flex items-center justify-center">
                                <FaFilePdf className="w-8 h-8 text-red-500" />
                              </div>
                              <p className="text-gray-700 font-medium truncate">
                                {formData.pdf ? formData.pdf.name : 'Current PDF Document'}
                              </p>
                              <div className="flex gap-2 justify-center">
                                {(formData.current_pdf_url && !formData.pdf) && (
                                  <button
                                    type="button"
                                    onClick={() => window.open(formData.current_pdf_url, '_blank')}
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                                  >
                                    <FaEye className="text-sm" />
                                    View
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={removePdf}
                                  className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                                >
                                  <FaTrash className="text-sm" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="w-16 h-16 mx-auto bg-red-100 rounded flex items-center justify-center">
                                <FaFilePdf className="w-8 h-8 text-red-400" />
                              </div>
                              <div>
                                <p className="text-gray-700 font-medium">Click to upload PDF</p>
                                <p className="text-gray-500 text-sm mt-1">PDF files up to 25MB</p>
                              </div>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Preview & Actions */}
          <div className="space-y-6">
            {/* Status Card */}
            <motion.div 
              className="bg-white/80 backdrop-blur-sm rounded border border-white/50 shadow-xl p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Editing Mode</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Current Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    status.color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                    status.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {status.text}
                  </span>
                </div>
                
                {isActive && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Start date cannot be changed for active notices.
                    </p>
                  </div>
                )}
                
                {isUpcoming && (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-sm text-green-800">
                      <strong>Note:</strong> All fields can be modified for upcoming notices.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Preview */}
            <motion.div 
              className="bg-white/80 backdrop-blur-sm rounded border border-white/50 shadow-xl p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Preview</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Title:</span>
                  <p className="font-semibold text-gray-900 truncate">{formData.title || 'Untitled'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Schedule:</span>
                  <p className="font-semibold text-gray-900">
                    {formData.from_datetime ? DateTime.fromISO(formData.from_datetime).toFormat('MMM dd, yyyy HH:mm') : 'Not set'}
                    {' → '}
                    {formData.to_datetime ? DateTime.fromISO(formData.to_datetime).toFormat('MMM dd, yyyy HH:mm') : 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Attachments:</span>
                  <p className="font-semibold text-gray-900">
                    {((previewImage || formData.current_image_url) && (formData.pdf || formData.current_pdf_url)) && 'Image + PDF'}
                    {(previewImage || formData.current_image_url) && !(formData.pdf || formData.current_pdf_url) && 'Image'}
                    {!(previewImage || formData.current_image_url) && (formData.pdf || formData.current_pdf_url) && 'PDF'}
                    {!(previewImage || formData.current_image_url) && !(formData.pdf || formData.current_pdf_url) && 'None'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div 
              className="bg-white/80 backdrop-blur-sm rounded border border-white/50 shadow-xl p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="space-y-3">
                <button
                  onClick={handleSaveNotice}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold text-lg"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <FaSave className="text-lg" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => router.push('/admin_dashboard/notice_board/log')}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-semibold"
                >
                  <FaArrowLeft className="text-lg" />
                  <span>Cancel</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}