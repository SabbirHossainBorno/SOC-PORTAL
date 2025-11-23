//app/user_dashboard/mail_center/track_todays_mail/page.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaEnvelope, FaPlus, FaTrash, FaArrowLeft, FaPaperPlane, 
  FaCheckCircle, FaExclamationTriangle, FaClock, FaUsers,
  FaBell, FaSearch, FaFilter, FaSync, FaEye, FaChartLine,
  FaCalendarAlt, FaTag, FaUserFriends, FaRocket
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

// Function to get current date in Asia/Dhaka timezone
const getDhakaDate = () => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Dhaka'
    });
    const [{ value: year }, , { value: month }, , { value: day }] = formatter.formatToParts(new Date());
    return `${year}-${month}-${day}`;
  } catch (error) {
    return new Date().toISOString().split('T')[0];
  }
};

// Debounce function for duplicate checking
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default function TrackTodaysMail() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [trackingDate, setTrackingDate] = useState('');
  const [mailEntries, setMailEntries] = useState([
    {
      mailSubject: '',
      taskRaisedDate: '',
      taskSolveDate: '',
      raisedBy: '',
      raisedByOther: '',
      assignedTeam: ''
    }
  ]);
  const [duplicateChecks, setDuplicateChecks] = useState({});
  const [checkingDuplicates, setCheckingDuplicates] = useState({});
  const [activeEntry, setActiveEntry] = useState(0);

  

  const raisedByOptions = [
    'SALES', 'CS/CDIM', 'COMPLIANCE', 'LEA', 'SERVICE DELIVERY', 
    'FININCE', 'HRM', 'RECONCILIATION', 'SCM', 'REVENUE ASSURANCE',
    'MARKETING', 'TECHNOLOGY', 'COMMERCIAL', 'EXTERNAL', 'GOVT', 'OTHER'
  ];

  const assignedTeamOptions = ['SOC', 'OPS'];


  // In the TrackTodaysMail component, update the duplicate check function
const checkDuplicateMail = useCallback(
  debounce(async (mailSubject, taskRaisedDate, index) => {
    if (!mailSubject || mailSubject.length < 3 || !taskRaisedDate) {
      setDuplicateChecks(prev => ({ ...prev, [index]: null }));
      return;
    }

    setCheckingDuplicates(prev => ({ ...prev, [index]: true }));

    try {
      const response = await fetch('/api/user_dashboard/mail_center/check_duplicate_mail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          mailSubject, 
          taskRaisedDate 
        }),
      });

      const result = await response.json();
      
      if (result.success && result.exists) {
        setDuplicateChecks(prev => ({ 
          ...prev, 
          [index]: {
            exists: true,
            status: result.status,
            assignedTeam: result.assignedTeam,
            trackingDate: result.trackingDate,
            taskRaisedDate: result.taskRaisedDate,
            taskSolveDate: result.taskSolveDate
          }
        }));
      } else {
        setDuplicateChecks(prev => ({ ...prev, [index]: null }));
      }
    } catch (error) {
      setDuplicateChecks(prev => ({ ...prev, [index]: null }));
    } finally {
      setCheckingDuplicates(prev => ({ ...prev, [index]: false }));
    }
  }, 500),
  []
);

// Add this useEffect here - it should be placed after all state declarations
  useEffect(() => {
    // Trigger duplicate check when active entry changes and has both required fields
    const currentEntry = mailEntries[activeEntry];
    if (currentEntry && currentEntry.mailSubject && currentEntry.mailSubject.length >= 3 && currentEntry.taskRaisedDate) {
      checkDuplicateMail(currentEntry.mailSubject, currentEntry.taskRaisedDate, activeEntry);
    }
  }, [activeEntry, mailEntries, checkDuplicateMail]); // Add dependencies

  useEffect(() => {
    const today = getDhakaDate();
    setTrackingDate(today);
    setMailEntries(prev => prev.map(entry => ({
      ...entry,
      taskRaisedDate: today,
    })));
  }, []);

  const addMailEntry = () => {
    setMailEntries(prev => [
      ...prev,
      {
        mailSubject: '',
        taskRaisedDate: trackingDate,
        taskSolveDate: '',
        raisedBy: '',
        raisedByOther: '',
        assignedTeam: ''
      }
    ]);
    setActiveEntry(mailEntries.length);
  };

  const removeMailEntry = (index) => {
    if (mailEntries.length <= 1) {
      toast.error('You need at least one mail entry');
      return;
    }
    
    setMailEntries(prev => prev.filter((_, i) => i !== index));
    setDuplicateChecks(prev => {
      const newChecks = { ...prev };
      delete newChecks[index];
      return newChecks;
    });
    
    if (activeEntry >= index) {
      setActiveEntry(Math.max(0, activeEntry - 1));
    }
  };

  const updateMailEntry = (index, field, value) => {
  setMailEntries(prev => prev.map((entry, i) => {
    if (i === index) {
      const updatedEntry = { ...entry, [field]: value };
      
      if (field === 'raisedBy' && value !== 'OTHER') {
        updatedEntry.raisedByOther = '';
      }

      // Trigger duplicate check when mail subject or task raised date changes
      if (field === 'mailSubject' || field === 'taskRaisedDate') {
        checkDuplicateMail(
          field === 'mailSubject' ? value : updatedEntry.mailSubject,
          field === 'taskRaisedDate' ? value : updatedEntry.taskRaisedDate,
          index
        );
      }
      
      return updatedEntry;
    }
    return entry;
  }));
};

  const handleResendNotification = async (mailSubject, assignedTeam) => {
    try {
      const response = await fetch('/api/user_dashboard/mail_center/resend_notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mailSubject, assignedTeam }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Notification sent successfully to the team!');
      } else {
        toast.error(result.message || 'Failed to send notification');
      }
    } catch (error) {
      toast.error('Failed to send notification');
    }
  };

// In the handleSubmit function, update the success handling
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  const toastId = toast.loading('Submitting mail tracking data...');

  const hasEmptyFields = mailEntries.some(entry => {
    const basicValidation = !entry.mailSubject || 
      !entry.taskRaisedDate || 
      !entry.raisedBy || 
      (entry.raisedBy === 'OTHER' && !entry.raisedByOther);
    
    const inProgressValidation = !entry.taskSolveDate && !entry.assignedTeam;
    
    return basicValidation || inProgressValidation;
  });

  if (hasEmptyFields) {
    toast.error('Please fill all required fields', { id: toastId });
    setLoading(false);
    return;
  }

  try {
    const submissionData = mailEntries.map(entry => {
      const raisedByValue = entry.raisedBy === 'OTHER' 
        ? entry.raisedByOther.toUpperCase() 
        : entry.raisedBy.toUpperCase();
        
      return {
        ...entry,
        taskRaisedDate: entry.taskRaisedDate || trackingDate,
        taskSolveDate: entry.taskSolveDate || null,
        raisedBy: raisedByValue
      };
    });

    const response = await fetch('/api/user_dashboard/mail_center/track_todays_mail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trackingDate,
        mailEntries: submissionData
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      let successMessage = 'Mail tracking data saved successfully!';
      
      // Add notification info to success message
      if (result.data && result.data.inProgressCount > 0) {
        successMessage += ` Notifications sent for ${result.data.inProgressCount} in-progress mail(s).`;
        
        if (result.data.teamNotifications) {
          Object.entries(result.data.teamNotifications).forEach(([team, count]) => {
            successMessage += ` ${count} to ${team} team.`;
          });
        }
      }
      
      toast.success(successMessage, { id: toastId, duration: 6000 });
      
      const today = getDhakaDate();
      setTrackingDate(today);
      setMailEntries([{
        mailSubject: '',
        taskRaisedDate: today,
        taskSolveDate: '',
        raisedBy: '',
        raisedByOther: '',
        assignedTeam: ''
      }]);
      setDuplicateChecks({});
      setActiveEntry(0);
    } else {
      toast.error(result.message || 'Failed to save mail tracking data', { id: toastId });
    }
  } catch (error) {
    toast.error('Network error: Could not submit mail tracking data', { id: toastId });
  } finally {
    setLoading(false);
  }
};

  const todayDhaka = getDhakaDate();
  const solvedCount = mailEntries.filter(entry => entry.taskSolveDate).length;
  const inProgressCount = mailEntries.length - solvedCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 mb-4">
      {/* Enhanced Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-200/20 rounded-full blur-3xl animate-float delay-2000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto p-4">
        {/* Compact Modern Header */}
<motion.div 
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  className="relative mb-8"
>
  {/* Main Header Container */}
  <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded border border-white/30 shadow-2xl shadow-blue-500/10 overflow-hidden">
    {/* Background Pattern */}
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 rounded-full translate-y-12 -translate-x-12"></div>
    </div>
    
    <div className="relative p-4 md:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left Section - Navigation and Title */}
        <div className="flex items-start gap-4">
          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded shadow-lg flex items-center justify-center">
                <FaEnvelope className="text-white text-lg" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Track Today&apos;s Mail
              </h1>
            </div>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-2xl">
              Monitor incoming mail with real-time tracking, duplicate detection, and team collaboration
            </p>
          </div>
        </div>

        {/* Right Section - Date and Stats */}
        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start lg:items-end gap-4">
          {/* Today's Date Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded p-4 shadow-lg border border-white/40 min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded flex items-center justify-center shadow-md">
                <FaCalendarAlt className="text-white text-sm" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Today&apos;s Date</p>
                <p className="text-lg font-bold text-gray-900">
                  {new Date().toLocaleDateString('en-BD', {
                    timeZone: 'Asia/Dhaka',
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded p-4 shadow-lg border border-white/40">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{mailEntries.length}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="w-px h-8 bg-gray-300"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {mailEntries.filter(entry => entry.taskSolveDate).length}
              </div>
              <div className="text-xs text-gray-500">Solved</div>
            </div>
            <div className="w-px h-8 bg-gray-300"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {mailEntries.filter(entry => !entry.taskSolveDate).length}
              </div>
              <div className="text-xs text-gray-500">Progress</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
          <span>Progress Overview</span>
          <span>
            {mailEntries.length > 0 
              ? Math.round((mailEntries.filter(entry => entry.taskSolveDate).length / mailEntries.length) * 100)
              : 0
            }% Solved
          </span>
        </div>
        <div className="w-full bg-white/50 backdrop-blur-sm rounded-full h-2 shadow-inner border border-white/30">
          <div 
            className="bg-gradient-to-r from-green-500 to-emerald-600 h-full rounded-full transition-all duration-1000 ease-out shadow-md"
            style={{
              width: `${mailEntries.length > 0 
                ? (mailEntries.filter(entry => entry.taskSolveDate).length / mailEntries.length) * 100 
                : 0
              }%`
            }}
          ></div>
        </div>
      </div>
    </div>
  </div>
</motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Sidebar - Entry Navigation */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="xl:col-span-1"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded shadow-sm border border-white/40 p-6 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900">Mail Entries</h3>
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full font-medium">
                  {mailEntries.length}
                </span>
              </div>

              {/* Entry List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {mailEntries.map((entry, index) => {
                  const isSolved = !!entry.taskSolveDate;
                  const duplicateInfo = duplicateChecks[index];
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setActiveEntry(index)}
                      className={`w-full text-left p-3 rounded transition-all duration-200 border ${
                        activeEntry === index
                          ? 'bg-blue-50 border-blue-200 shadow-sm'
                          : 'bg-gray-50/50 border-gray-200/50 hover:bg-gray-100/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-900">
                          Entry #{index + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          {duplicateInfo?.exists && (
  <FaExclamationTriangle className={`text-xs ${
    duplicateInfo.status === 'SOLVED' ? 'text-blue-500' : 'text-yellow-500'
  }`} />
)}
                          {isSolved ? (
                            <FaCheckCircle className="text-green-500 text-xs" />
                          ) : (
                            <FaClock className="text-yellow-500 text-xs" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {entry.mailSubject || 'No subject'}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Add Entry Button */}
              <button
                onClick={addMailEntry}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-2.5 rounded font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <FaPlus className="text-xs" />
                Add New Entry
              </button>
            </div>
          </motion.div>

          {/* Main Form Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="xl:col-span-3"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded shadow-sm border border-white/40 p-6">
              <form onSubmit={handleSubmit}>
                {/* Tracking Date */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    📅 Tracking Date
                  </label>
                  <div className="max-w-xs">
<input
  type="date"
  value={trackingDate}
  onChange={(e) => {
    const newDate = e.target.value;
    setTrackingDate(newDate);
    setMailEntries(prev => prev.map((entry, index) => {
      const updatedEntry = {
        ...entry,
        taskRaisedDate: newDate,
      };
      
      // Trigger duplicate check for each entry when tracking date changes
      if (entry.mailSubject && entry.mailSubject.length >= 3) {
        checkDuplicateMail(entry.mailSubject, newDate, index);
      }
      
      return updatedEntry;
    }));
  }}
  max={todayDhaka}
  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 transition-all duration-200"
  required
/>
                  </div>
                </div>

                {/* Current Entry Form */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeEntry}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {mailEntries.map((entry, index) => {
                      if (index !== activeEntry) return null;
                      
                      const isSolved = !!entry.taskSolveDate;
                      const duplicateInfo = duplicateChecks[index];
                      const isCheckingDuplicate = checkingDuplicates[index];
                      
                      return (
                        <div key={index}>
                          {/* Entry Header */}
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                Mail Entry #{index + 1}
                              </h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium ${
                                  isSolved 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {isSolved ? (
                                    <>
                                      <FaCheckCircle className="text-xs" />
                                      Solved
                                    </>
                                  ) : (
                                    <>
                                      <FaClock className="text-xs" />
                                      In Progress
                                    </>
                                  )}
                                </span>
                                
                                {duplicateInfo?.exists && (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium ${
                                    duplicateInfo.status === 'SOLVED'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    <FaExclamationTriangle className="text-xs" />
                                    {duplicateInfo.status === 'SOLVED' ? 'Previously Solved' : 'Duplicate Found'}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {mailEntries.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeMailEntry(index)}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200"
                              >
                                <FaTrash className="text-sm" />
                              </button>
                            )}
                          </div>

                          {/* Duplicate Alert */}

<AnimatePresence>
  {duplicateInfo?.exists && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`mb-6 p-4 rounded border ${
        duplicateInfo.status === 'SOLVED'
          ? 'bg-blue-50 border-blue-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded ${
          duplicateInfo.status === 'SOLVED'
            ? 'bg-blue-100 text-blue-600'
            : 'bg-yellow-100 text-yellow-600'
        }`}>
          {duplicateInfo.status === 'SOLVED' ? (
            <FaCheckCircle className="text-lg" />
          ) : (
            <FaExclamationTriangle className="text-lg" />
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-2">
            {duplicateInfo.status === 'SOLVED' 
              ? '✅ This mail with same subject and date was already solved' 
              : '⚠️ This mail with same subject and date is still in progress'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
            <div><span className="font-medium">Status:</span> {duplicateInfo.status}</div>
            {duplicateInfo.assignedTeam && (
              <div><span className="font-medium">Team:</span> {duplicateInfo.assignedTeam}</div>
            )}
            <div><span className="font-medium">Raised Date:</span> {duplicateInfo.taskRaisedDate}</div>
            {duplicateInfo.taskSolveDate && (
              <div><span className="font-medium">Solved Date:</span> {duplicateInfo.taskSolveDate}</div>
            )}
          </div>
          
          {duplicateInfo.status === 'IN-PROGRESS' && (
            <button
              type="button"
              onClick={() => handleResendNotification(entry.mailSubject, duplicateInfo.assignedTeam)}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <FaBell className="text-xs" />
              Notify Team Again
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>

                          {/* Form Grid */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Mail Subject */}
                            <div className="lg:col-span-2">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Mail Subject *
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={entry.mailSubject}
                                  onChange={(e) => updateMailEntry(index, 'mailSubject', e.target.value)}
                                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 transition-all duration-200 pr-20"
                                  required
                                  placeholder="Enter mail subject..."
                                />
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  {isCheckingDuplicate ? (
                                    <div className="flex items-center gap-2 text-blue-500">
                                      <FaSync className="animate-spin text-xs" />
                                      <span className="text-xs">Checking...</span>
                                    </div>
                                  ) : duplicateInfo?.exists ? (
                                    <div className={`flex items-center gap-2 text-xs ${
                                      duplicateInfo.status === 'SOLVED' ? 'text-blue-500' : 'text-yellow-500'
                                    }`}>
                                      {duplicateInfo.status === 'SOLVED' ? (
                                        <FaCheckCircle />
                                      ) : (
                                        <FaExclamationTriangle />
                                      )}
                                      <span>Duplicate</span>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {/* Task Dates */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Task Raised Date *
                              </label>
                              <input
                                type="date"
                                value={entry.taskRaisedDate}
                                onChange={(e) => updateMailEntry(index, 'taskRaisedDate', e.target.value)}
                                max={todayDhaka}
                                className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 transition-all duration-200"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Task Solve Date
                              </label>
                              <input
                                type="date"
                                value={entry.taskSolveDate}
                                onChange={(e) => updateMailEntry(index, 'taskSolveDate', e.target.value)}
                                max={todayDhaka}
                                className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 transition-all duration-200"
                              />
                            </div>

                            {/* Raised By */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Raised By *
                              </label>
                              <select
                                value={entry.raisedBy}
                                onChange={(e) => updateMailEntry(index, 'raisedBy', e.target.value)}
                                className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 transition-all duration-200"
                                required
                              >
                                <option value="">Select department...</option>
                                {raisedByOptions.map(option => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </div>

                            {/* Raised By Other */}
                            {entry.raisedBy === 'OTHER' && (
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Specify Other *
                                </label>
                                <input
                                  type="text"
                                  value={entry.raisedByOther}
                                  onChange={(e) => updateMailEntry(index, 'raisedByOther', e.target.value)}
                                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 transition-all duration-200"
                                  required
                                  placeholder="Enter other value..."
                                />
                              </div>
                            )}

                            {/* Assigned Team */}
                            {!isSolved && (
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Assigned Team *
                                </label>
                                <select
                                  value={entry.assignedTeam}
                                  onChange={(e) => updateMailEntry(index, 'assignedTeam', e.target.value)}
                                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 transition-all duration-200"
                                  required
                                >
                                  <option value="">Select team...</option>
                                  {assignedTeamOptions.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Status Indicators */}
                            <div className="grid grid-cols-2 gap-4 lg:col-span-2">
                              <div className="text-center p-3 rounded border border-gray-200 bg-white/50">
                                <div className="text-sm font-medium text-gray-700 mb-1">Status</div>
                                <div className={`text-sm font-semibold ${
                                  isSolved ? 'text-green-600' : 'text-yellow-600'
                                }`}>
                                  {isSolved ? '✅ SOLVED' : '⏳ IN-PROGRESS'}
                                </div>
                              </div>
                              <div className="text-center p-3 rounded border border-gray-200 bg-white/50">
                                <div className="text-sm font-medium text-gray-700 mb-1">Solved in Day</div>
                                <div className={`text-sm font-semibold ${
                                  isSolved && entry.taskRaisedDate === entry.taskSolveDate 
                                    ? 'text-green-600' 
                                    : 'text-gray-600'
                                }`}>
                                  {isSolved && entry.taskRaisedDate === entry.taskSolveDate ? '✅ YES' : '❌ NO'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>

                {/* Submit Button */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3.5 rounded font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane className="text-xs" />
                        Submit All Mail Entries
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Add CSS for floating animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}