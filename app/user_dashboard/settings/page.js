//app/user_dashboard/settings/page.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaUser, FaCamera, FaCheck, FaArrowLeft, FaExclamationTriangle } from 'react-icons/fa';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Get cookies with proper decoding
  const getCookie = (name) => {
    try {
      if (typeof document === 'undefined') return null;
      
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      
      if (parts.length === 2) {
        const cookieValue = decodeURIComponent(parts.pop().split(';').shift());
        console.debug('Retrieved cookie:', { name, value: cookieValue });
        return cookieValue;
      }
      console.debug('Cookie not found:', name);
      return null;
    } catch (error) {
      console.error('Error reading cookie:', { name, error });
      return null;
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        console.debug('Fetching user data');
        const userId = getCookie('socPortalId');
        
        if (!userId) {
          console.warn('[SETTINGS] No user ID found in cookies');
          toast.error('Please log in to access settings', {
            duration: 4000,
            position: 'top-right'
          });
          router.push('/');
          return;
        }

        const response = await fetch(`/api/user_dashboard/user_info?id=${userId}`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        setUserData(data);
        console.debug('User data fetched successfully:', data);

      } catch (error) {
        console.error('[SETTINGS] Failed to fetch user data:', error);
        toast.error('Failed to load user information', {
          duration: 4000,
          position: 'top-right'
        });
        
        // Fallback to cookies
        const email = getCookie('email');
        const id = getCookie('socPortalId');
        const role = getCookie('roleType');
        
        if (id) {
          const fallbackData = {
            email: email || 'Unknown',
            id: id,
            role: role || 'User',
            firstName: 'User',
            lastName: 'User',
            profilePhoto: null,
            ngdId: 'N/A'
          };
          setUserData(fallbackData);
          console.debug('Set fallback user data:', fallbackData);
        }
      } finally {
        setLoading(false);
        console.debug('User data fetch completed, loading set to false');
      }
    };

    fetchUserData();
  }, [router]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.debug('No file selected');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are allowed', {
        duration: 4000,
        position: 'top-right'
      });
      console.debug('Invalid file type:', file.type);
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB', {
        duration: 4000,
        position: 'top-right'
      });
      console.debug('File size too large:', file.size);
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
      console.debug('Generated preview URL for file:', file.name);
    };
    reader.readAsDataURL(file);
    console.debug('Selected file:', { name: file.name, size: file.size });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first', {
        duration: 4000,
        position: 'top-right'
      });
      console.debug('Upload attempted without a selected file');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Uploading profile photo...', {
      position: 'top-right'
    });
    console.debug('Initiating profile photo upload:', { file: selectedFile.name });

    try {
      const formData = new FormData();
      formData.append('profilePhoto', selectedFile);

      const response = await fetch('/api/user_dashboard/settings', {
        method: 'PUT',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update user data with new photo URL
        setUserData(prev => ({
          ...prev,
          profilePhoto: result.photoUrl
        }));
        
        // Clear selection
        setSelectedFile(null);
        setPreviewUrl(null);
        
        toast.success('Profile photo updated successfully!', {
          id: toastId,
          duration: 4000,
          position: 'top-right',
          icon: '✅'
        });
        console.debug('Profile photo uploaded successfully:', { photoUrl: result.photoUrl });
      } else {
        throw new Error(result.message || 'Failed to update profile photo');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Upload failed. Please try again.', {
        id: toastId,
        duration: 4000,
        position: 'top-right',
        icon: '❌'
      });
    } finally {
      setUploading(false);
      console.debug('Upload completed, uploading set to false');
    }
  };

  const getInitials = (firstName, lastName) => {
    const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
    console.debug('Generated initials:', { firstName, lastName, initials });
    return initials;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => {
              console.debug('Navigating back to dashboard');
              router.back();
            }}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            Back to Dashboard
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account profile and preferences</p>
        </div>

        <div className="bg-white rounded shadow-lg overflow-hidden border border-gray-200">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Profile Photo Section */}
              <div className="md:w-1/3">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <FaUser className="mr-2 text-blue-600" />
                  Profile Photo
                </h2>
                
                <div className="flex flex-col items-center">
                  {/* Current Profile Photo */}
                  <div className="relative mb-6">
                    <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                      {userData?.profilePhoto ? (
                        <Image 
                          src={userData.profilePhoto} 
                          alt="Profile" 
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.parentElement.innerHTML = `
                              <span class="text-2xl font-bold text-gray-700">
                                ${getInitials(userData.firstName, userData.lastName)}
                              </span>
                            `;
                            console.debug('Profile photo failed to load, showing initials');
                          }}
                        />
                      ) : (
                        <span className="text-2xl font-bold text-gray-700">
                          {getInitials(userData.firstName, userData.lastName)}
                        </span>
                      )}
                    </div>
                    
                    {/* Camera icon overlay */}
                    <label 
                      htmlFor="profilePhoto"
                      className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-md"
                    >
                      <FaCamera className="text-sm" />
                      <input
                        id="profilePhoto"
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* File selection info */}
                  {selectedFile && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full mb-4"
                    >
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-800 truncate">
                            {selectedFile.name}
                          </span>
                          <span className="text-xs text-blue-600">
                            {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Upload button */}
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className={`w-full px-4 py-2 rounded font-medium transition-all ${
                      !selectedFile || uploading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                    }`}
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <FaCheck className="mr-2" />
                        Update Photo
                      </span>
                    )}
                  </button>

                  {/* Help text */}
                  <p className="text-xs text-gray-500 mt-4 text-center">
                    Supported formats: JPG, PNG, WebP
                    <br />
                    Max file size: 5MB
                  </p>
                </div>
              </div>

              {/* Preview Section */}
              <div className="md:w-2/3 border-l border-gray-200 md:pl-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview</h3>
                
                {previewUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="w-48 h-48 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg mb-4">
                      <Image 
                        src={previewUrl} 
                        alt="Preview" 
                        width={192}
                        height={192}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      This is how your new profile photo will appear
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded border-2 border-dashed border-gray-300">
                    <FaCamera className="text-gray-400 text-3xl mb-2" />
                    <p className="text-gray-500 text-center">
                      Select a new photo to see preview
                    </p>
                  </div>
                )}

                {/* User Info */}
                <div className="mt-8 p-6 bg-gray-50 rounded border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4 text-lg">Account Information</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Name:</span>
                      <span className="font-bold text-gray-900">
                        {userData?.firstName} {userData?.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Email:</span>
                      <span className="font-bold text-gray-900">{userData?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">NGD ID:</span>
                      <span className="font-bold text-gray-900">{userData?.ngdId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">User ID:</span>
                      <span className="font-bold text-gray-900">{userData?.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Role:</span>
                      <span className="font-bold text-gray-900 capitalize">{userData?.role?.toLowerCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Security Notice */}
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex items-start">
                    <FaExclamationTriangle className="text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Profile Visibility</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Your profile photo may be visible to other team members in the organization.
                        Please ensure your photo is professional and appropriate for workplace use.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}