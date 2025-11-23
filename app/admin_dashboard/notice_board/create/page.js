// app/admin_dashboard/notice_board/create/page.js
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DateTime } from 'luxon';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreateNoticePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
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
    pdf: null
  });

  const steps = [
    { number: 1, title: 'Basic Info', description: 'Notice title and description' },
    { number: 2, title: 'Schedule', description: 'Set visibility period' },
    { number: 3, title: 'Media', description: 'Add images or documents' },
    { number: 4, title: 'Review', description: 'Preview and publish' }
  ];

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'image') {
      const file = files[0];
      if (file) {
        setFormData(prev => ({ ...prev, image: file }));
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => setPreviewImage(e.target.result);
        reader.readAsDataURL(file);
      }
    } else if (name === 'pdf') {
      const file = files[0];
      if (file) {
        setFormData(prev => ({ ...prev, pdf: file }));
        // Create PDF preview URL
        const url = URL.createObjectURL(file);
        setPdfPreview(url);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const nextStep = () => {
    if (activeStep < 4) {
      setActiveStep(activeStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Remove the form wrapper and handle submission manually
  const handlePublishNotice = async () => {
    // Validate required fields
    if (!formData.title.trim() || !formData.description.trim() || !formData.from_datetime || !formData.to_datetime) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('from_datetime', formData.from_datetime);
      formDataToSend.append('to_datetime', formData.to_datetime);
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }
      if (formData.pdf) {
        formDataToSend.append('pdf', formData.pdf);
      }

      console.log('Submitting notice data...');
      const response = await fetch('/api/admin_dashboard/notice_board', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Notice published successfully!');
        router.push('/admin_dashboard/notice_board/log');
      } else {
        console.error('API Error:', result);
        
        // Handle specific error cases
        if (result.message.includes('Admin not found')) {
          toast.error('Admin session expired. Please log in again.');
          setTimeout(() => {
            router.push('/admin_login');
          }, 2000);
        } else if (result.message.includes('required fields')) {
          toast.error('Please fill all required fields');
        } else if (result.message.includes('date range')) {
          toast.error('End date must be after start date');
        } else {
          toast.error(result.message || 'Failed to publish notice');
        }
      }
    } catch (error) {
      console.error('Network Error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePdf = () => {
    setFormData(prev => ({ ...prev, pdf: null }));
    setPdfPreview(null);
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
  };

  // Set default datetime values
  const defaultFrom = DateTime.now().setZone('Asia/Dhaka').toFormat("yyyy-MM-dd'T'HH:mm");
  const defaultTo = DateTime.now().setZone('Asia/Dhaka').plus({ days: 7 }).toFormat("yyyy-MM-dd'T'HH:mm");

  // Initialize form data with defaults
  if (!formData.from_datetime) {
    setFormData(prev => ({ ...prev, from_datetime: defaultFrom }));
  }
  if (!formData.to_datetime) {
    setFormData(prev => ({ ...prev, to_datetime: defaultTo }));
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-orange-500 to-amber-500 rounded shadow-2xl shadow-orange-200 mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Create New Notice
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
            Broadcast important announcements to all users with rich media support and scheduled visibility.
          </p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex justify-center items-center space-x-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 font-semibold transition-all duration-300 ${
                    activeStep >= step.number
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 border-orange-500 text-white shadow-lg shadow-orange-200'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {activeStep > step.number ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <div className={`text-sm font-semibold transition-colors ${
                      activeStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 hidden sm:block">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 transition-colors ${
                    activeStep > step.number ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Form Container - REMOVED FORM WRAPPER */}
        <motion.div 
          className="bg-white/80 backdrop-blur-sm rounded shadow-2xl border border-white/50 overflow-hidden"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* REMOVED: <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-8"> */}
          <div className="p-8">
            {/* Step 1: Basic Information */}
            <AnimatePresence mode="wait">
              {activeStep === 1 && (
                <motion.div
                  key="step1"
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="space-y-8"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Notice Information</h2>
                    <p className="text-gray-700">Provide the essential details for your notice</p>
                  </div>

                  <div className="space-y-6 max-w-4xl mx-auto">
                    {/* Title Input */}
                    <div className="group">
                      <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Notice Title *
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="w-full px-6 py-4 bg-white/50 border-2 border-gray-200 rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-300 text-lg font-medium"
                        placeholder="Enter a clear and concise title..."
                      />
                    </div>

                    {/* Description Input */}
                    <div className="group">
                      <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Description *
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows={6}
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full px-6 py-4 bg-white/50 border-2 border-gray-200 rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-300 resize-none text-lg font-medium"
                        placeholder="Provide detailed information about this notice..."
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Be descriptive and clear</span>
                        <span>{formData.description.length}/2000 characters</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 2: Schedule */}
            <AnimatePresence mode="wait">
              {activeStep === 2 && (
                <motion.div
                  key="step2"
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="space-y-8"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule Visibility</h2>
                    <p className="text-gray-700">Set when this notice should be visible to users</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* From DateTime */}
                    <div className="group">
                      <label htmlFor="from_datetime" className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Start Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        id="from_datetime"
                        name="from_datetime"
                        value={formData.from_datetime}
                        onChange={handleInputChange}
                        className="w-full px-6 py-4 bg-white/50 border-2 border-gray-200 rounded text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 text-lg font-medium"
                      />
                    </div>

                    {/* To DateTime */}
                    <div className="group">
                      <label htmlFor="to_datetime" className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        End Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        id="to_datetime"
                        name="to_datetime"
                        value={formData.to_datetime}
                        onChange={handleInputChange}
                        className="w-full px-6 py-4 bg-white/50 border-2 border-gray-200 rounded text-gray-900 focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-300 text-lg font-medium"
                      />
                    </div>
                  </div>

                  {/* Schedule Preview */}
                  <div className="max-w-4xl mx-auto mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Visibility Period
                    </h3>
                    <div className="text-gray-700 space-y-1">
                      <p><strong>From:</strong> {formData.from_datetime ? DateTime.fromISO(formData.from_datetime).setZone('Asia/Dhaka').toFormat('MMM dd, yyyy HH:mm') : 'Not set'}</p>
                      <p><strong>To:</strong> {formData.to_datetime ? DateTime.fromISO(formData.to_datetime).setZone('Asia/Dhaka').toFormat('MMM dd, yyyy HH:mm') : 'Not set'}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 3: Media Upload */}
            <AnimatePresence mode="wait">
              {activeStep === 3 && (
                <motion.div
                  key="step3"
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="space-y-8"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Media</h2>
                    <p className="text-gray-700">Enhance your notice with images or documents</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Image Upload */}
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Image (Optional)
                      </label>
                      <div className={`border-3 border-dashed rounded p-6 text-center transition-all duration-300 ${
                        formData.image 
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
                              <img 
                                src={previewImage} 
                                alt="Preview" 
                                className="max-h-48 mx-auto rounded shadow-lg"
                              />
                              <button
                                type="button"
                                onClick={removeImage}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-medium"
                              >
                                Remove Image
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-100 to-pink-100 rounded flex items-center justify-center">
                                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
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
                      <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        PDF Document (Optional)
                      </label>
                      <div className={`border-3 border-dashed rounded p-6 text-center transition-all duration-300 ${
                        formData.pdf 
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
                          {formData.pdf ? (
                            <div className="space-y-4">
                              <div className="w-16 h-16 mx-auto bg-red-100 rounded flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <p className="text-gray-700 font-medium truncate">{formData.pdf.name}</p>
                              <div className="flex gap-2 justify-center">
                                <button
                                  type="button"
                                  onClick={() => window.open(pdfPreview, '_blank')}
                                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium"
                                >
                                  Preview PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={removePdf}
                                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-medium"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="w-16 h-16 mx-auto bg-red-100 rounded flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 4: Review */}
            <AnimatePresence mode="wait">
              {activeStep === 4 && (
                <motion.div
                  key="step4"
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="space-y-8"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Publish</h2>
                    <p className="text-gray-700">Preview your notice before broadcasting</p>
                  </div>

                  <div className="max-w-4xl mx-auto space-y-8">
                    {/* Notice Preview Card */}
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded border-2 border-gray-200 p-8 shadow-lg">
                      <div className="flex items-start justify-between mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">{formData.title || 'Untitled Notice'}</h3>
                        <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Ready to Publish
                        </span>
                      </div>

                      <div className="prose prose-lg max-w-none text-gray-700 mb-6">
                        <p className="whitespace-pre-wrap">{formData.description || 'No description provided'}</p>
                      </div>

                      {/* Media Preview */}
                      {(previewImage || formData.pdf) && (
                        <div className="border-t border-gray-200 pt-6 mt-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h4>
                          <div className="space-y-6">
                            {previewImage && (
                              <div>
                                <h5 className="font-medium text-gray-700 mb-3">Image Preview</h5>
                                <div className="bg-gray-50 rounded p-4 border border-gray-200">
                                  <img 
                                    src={previewImage} 
                                    alt="Notice visual preview" 
                                    className="max-w-md max-h-96 rounded shadow-md mx-auto"
                                  />
                                </div>
                              </div>
                            )}
                            {formData.pdf && (
                              <div>
                                <h5 className="font-medium text-gray-700 mb-3">PDF Document</h5>
                                <div className="bg-gray-50 rounded p-4 border border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-12 h-12 bg-red-100 rounded flex items-center justify-center">
                                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-700">{formData.pdf.name}</p>
                                        <p className="text-xs text-gray-500">{(formData.pdf.size / 1024 / 1024).toFixed(2)} MB</p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => window.open(pdfPreview, '_blank')}
                                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium"
                                    >
                                      Preview PDF
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Schedule Info */}
                      <div className="border-t border-gray-200 pt-6 mt-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Schedule</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                          <div className="bg-blue-50 rounded p-3">
                            <strong className="text-blue-700">Starts:</strong><br />
                            {formData.from_datetime ? DateTime.fromISO(formData.from_datetime).setZone('Asia/Dhaka').toFormat('MMM dd, yyyy HH:mm') : 'Not set'}
                          </div>
                          <div className="bg-green-50 rounded p-3">
                            <strong className="text-green-700">Ends:</strong><br />
                            {formData.to_datetime ? DateTime.fromISO(formData.to_datetime).setZone('Asia/Dhaka').toFormat('MMM dd, yyyy HH:mm') : 'Not set'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Confirmation */}
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded border border-orange-200 p-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-orange-100 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Ready to Broadcast</h4>
                          <p className="text-gray-700 text-sm mt-1">
                            Click the "Publish Notice" button below to broadcast this notice to all users.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <motion.div 
              className="flex justify-between items-center mt-12 pt-8 border-t border-gray-200"
              variants={itemVariants}
            >
              <button
                type="button"
                onClick={prevStep}
                disabled={activeStep === 1}
                className="flex items-center space-x-2 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous</span>
              </button>

              {activeStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                >
                  <span>Continue</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button" // CHANGED: Now type="button" instead of "submit"
                  onClick={handlePublishNotice} // CHANGED: Direct function call
                  disabled={loading}
                  className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded hover:from-orange-600 hover:to-amber-600 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Publish Notice</span>
                    </>
                  )}
                </button>
              )}
            </motion.div>
          </div>
          {/* REMOVED: </form> */}
        </motion.div>
      </div>
    </div>
  );
}