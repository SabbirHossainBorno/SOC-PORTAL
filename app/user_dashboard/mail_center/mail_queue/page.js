// app/user_dashboard/mail_center/mail_queue/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaEnvelope, FaArrowLeft, FaCheckCircle, FaSpinner,
  FaClock, FaUser, FaTag, FaCalendarAlt, FaInfoCircle,
  FaExclamationTriangle, FaTimes, FaPaperclip, FaUsers,
  FaChartLine, FaEye, FaFilter, FaSync, FaRocket
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import MediumSpinner from '../../../../app/components/MediumSpinner';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

// Function to format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Dhaka'
  });
};

// Modern Modal component for solving mail
const SolveMailModal = ({ mail, isOpen, onClose, onSolve }) => {
  const [taskSolveDate, setTaskSolveDate] = useState(new Date());
  const [feedback, setFeedback] = useState('');
  const [solving, setSolving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSolving(true);
    
    try {
      await onSolve(mail.serial, taskSolveDate.toISOString().split('T')[0], feedback);
      setFeedback('');
      onClose();
    } catch (error) {
      console.error('Error solving mail:', error);
      toast.error('Failed to solve mail');
    } finally {
      setSolving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/30"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded">
          <div>
            <h2 className="text-xl font-bold">Mark as Solved</h2>
            <p className="text-blue-100 text-sm mt-1">Complete this mail item with solution details</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/20"
            disabled={solving}
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Mail Summary Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 rounded p-4 mb-6">
            <div className="flex items-start">
              <div className="bg-white/80 p-2.5 rounded shadow-sm mr-3 border border-blue-200/30">
                <FaEnvelope className="text-blue-600 text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-1">Mail Summary</h3>
                <p className="font-medium text-gray-800 text-base">{mail.mail_subject || 'N/A'}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="flex items-center">
                    <FaUser className="text-blue-500 text-xs mr-2" />
                    <span className="text-xs text-gray-600 font-medium">Raised By: {mail.raised_by || 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <FaCalendarAlt className="text-blue-500 text-xs mr-2" />
                    <span className="text-xs text-gray-600 font-medium">{formatDate(mail.task_raised_date)}</span>
                  </div>
                  <div className="flex items-center">
                    <FaTag className="text-blue-500 text-xs mr-2" />
                    <span className="text-xs text-gray-600 font-medium">Team: {mail.assigned_team || 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <FaClock className="text-blue-500 text-xs mr-2" />
                    <span className="text-xs text-gray-600 font-medium">Tracked: {formatDate(mail.tracking_date)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Task Solve Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <FaCalendarAlt className="text-blue-500 mr-2" />
                Task Solve Date <span className="text-red-500 ml-1">*</span>
              </label>
              <DatePicker
                selected={taskSolveDate}
                onChange={(date) => setTaskSolveDate(date)}
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 text-gray-900 text-sm transition-all duration-200"
                required
                dateFormat="MMMM d, yyyy"
              />
            </div>
            
            {/* Feedback */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <FaPaperclip className="text-blue-500 mr-2" />
                Solution Feedback
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 text-gray-900 placeholder-gray-400 text-sm resize-none transition-all duration-200"
                rows={4}
                placeholder="Describe the solution, steps taken, and any relevant feedback..."
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-all duration-200 font-semibold text-sm shadow-sm"
                disabled={solving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl disabled:opacity-70"
                disabled={solving}
              >
                {solving ? (
                  <>
                    <FaSpinner className="animate-spin h-4 w-4" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="h-4 w-4" />
                    Mark as Solved
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default function MailQueue() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInProgress: 0,
    socCount: 0,
    opsCount: 0
  });
  const [mails, setMails] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [selectedMail, setSelectedMail] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch mail queue data
  const fetchMailQueueData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user_dashboard/mail_center/mail_queue');
      const result = await response.json();

      if (result.success) {
        setStats(result.data.stats);
        setMails(result.data.mails);
        setUserRole(result.data.userRole);
      } else {
        toast.error('Failed to fetch mail queue data');
      }
    } catch (error) {
      console.error('Error fetching mail queue data:', error);
      toast.error('Error fetching mail queue data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data with loading state
  const refreshData = async () => {
    setRefreshing(true);
    await fetchMailQueueData();
  };

  // Handle marking mail as solved
  const handleSolveMail = async (mailSerial, taskSolveDate, feedback) => {
    try {
      const response = await fetch('/api/user_dashboard/mail_center/mail_queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mailSerial,
          taskSolveDate,
          feedback
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('🎉 Mail marked as solved successfully!');
        fetchMailQueueData();
      } else {
        toast.error(result.message || 'Failed to mark mail as solved');
      }
    } catch (error) {
      console.error('Error solving mail:', error);
      toast.error('Error solving mail');
    }
  };

  // Open solve modal
  const openSolveModal = (mail) => {
    setSelectedMail(mail);
    setIsModalOpen(true);
  };

  // Filter mails by team
  const filteredMails = mails;

  // Initial data fetch
  useEffect(() => {
    fetchMailQueueData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 mb-4">
      {/* Enhanced Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-200/20 rounded-full blur-3xl animate-float delay-2000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto p-4">
        {/* Modern Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8"
        >
          <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded border border-white/30 shadow-2xl shadow-blue-500/10 overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 rounded-full translate-y-12 -translate-x-12"></div>
            </div>
            
            <div className="relative p-4 md:p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                {/* Left Section - Navigation and Title */}
                <div className="flex items-start gap-4">

                  {/* Title and Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded shadow-lg flex items-center justify-center">
                        <FaEnvelope className="text-white text-lg" />
                      </div>
                      <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Mail Queue
                      </h1>
                    </div>
                    <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-2xl">
                      Manage and resolve pending mail entries with real-time tracking and team collaboration
                    </p>
                  </div>
                </div>

                {/* Right Section - Stats and Actions */}
                <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
                  {/* Stats - Fixed width */}
                  <div className="w-full lg:w-64 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded p-2 shadow-lg border border-white/40">
                    <div className="flex items-center gap-3 w-full justify-between">
                      <div className="text-center flex-1">
                        <div className="text-2xl font-bold text-gray-900">{stats.totalInProgress}</div>
                        <div className="text-xs text-gray-500">Total</div>
                      </div>
                      <div className="w-px h-8 bg-gray-300"></div>
                      <div className="text-center flex-1">
                        <div className="text-2xl font-bold text-blue-600">{stats.socCount}</div>
                        <div className="text-xs text-gray-500">SOC</div>
                      </div>
                      <div className="w-px h-8 bg-gray-300"></div>
                      <div className="text-center flex-1">
                        <div className="text-2xl font-bold text-purple-600">{stats.opsCount}</div>
                        <div className="text-xs text-gray-500">OPS</div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Same width as stats */}
                  <div className="w-full lg:w-64 flex items-center gap-2 justify-end">
                    <button
                      onClick={refreshData}
                      className="flex items-center gap-2 px-1 py-2 bg-white/90 backdrop-blur-sm rounded shadow-lg border border-white/40 hover:shadow-xl hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 text-xs font-semibold text-gray-700 hover:text-blue-700 flex-1 justify-center"
                      title="Refresh data"
                    >
                      <FaSync className={`text-xs ${refreshing ? 'animate-spin' : ''}`} />
                      Refresh Data
                    </button>
                    <button
                      onClick={() => router.push('/user_dashboard/mail_center/mail_log')}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-xs font-semibold flex-1 justify-center"
                    >
                      <FaEye className="text-xs" />
                      View Mail Logs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded shadow-sm border border-white/40 p-6"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                In-Progress Mails
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                {filteredMails.length} mail{filteredMails.length !== 1 ? 's' : ''} requiring attention
              </p>
            </div>
            
            <div className="flex items-center gap-3 mt-3 sm:mt-0">
              <div className={`px-3 py-1.5 rounded text-xs font-semibold ${
                userRole === 'SOC' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {userRole} Team
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-center">
                <MediumSpinner />
                <p className="text-gray-600 text-sm mt-4">Loading mail queue...</p>
              </div>
            </div>
          ) : filteredMails.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full mb-4">
                <FaCheckCircle className="text-green-500 text-3xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No mails in queue</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                All mail entries have been resolved. Great work!
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
              <AnimatePresence>
                {filteredMails.map((mail, index) => (
                  <motion.div
                    key={mail.serial}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded border border-gray-200/60 hover:border-blue-300/60 transition-all duration-300 hover:shadow-lg p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">
                              {mail.mail_subject}
                            </h3>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                                mail.assigned_team === 'SOC' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {mail.assigned_team}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <FaUser className="text-gray-400" />
                                {mail.raised_by}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <FaCalendarAlt className="text-gray-400" />
                                {formatDate(mail.task_raised_date)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">Tracked by</div>
                            <div className="text-sm font-medium text-gray-900">{mail.tracked_by}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="text-xs text-gray-500">
                            Serial: <span className="font-mono font-semibold">#{mail.serial}</span>
                          </div>
                          
                          <button
                            onClick={() => openSolveModal(mail)}
                            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            <FaCheckCircle className="text-xs" />
                            Mark Solved
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      {/* Solve Mail Modal */}
      <SolveMailModal 
        mail={selectedMail} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSolve={handleSolveMail}
      />

      {/* Add CSS for floating animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}