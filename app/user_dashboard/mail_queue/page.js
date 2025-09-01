// app/user_dashboard/mail_queue/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaEnvelope, FaArrowLeft, FaCheckCircle, FaSpinner,
  FaClock, FaUser, FaTag, FaCalendarAlt, FaInfoCircle,
  FaExclamationTriangle, FaTimes, FaPaperclip
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

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
    timeZone: 'Asia/Dhaka' // Ensure Asia/Dhaka timezone
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
    } finally {
      setSolving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-100 to-indigo-100 border-b border-gray-200 rounded">
            <div>
                <h2 className="text-xl font-bold text-gray-800">Mark as Solved</h2>
                <p className="text-sm text-gray-600 mt-1">Complete this mail item with solution details</p>
            </div>
            <button
                onClick={onClose}
                className="text-gray-500 hover:bg-gray-200 transition-colors p-1.5 rounded-full"
                disabled={solving}
            >
                <FaTimes className="h-5 w-5" />
            </button>
        </div>
        
        <div className="p-6">
          {/* Mail Summary Card */}
          <div className="bg-blue-50 border border-blue-100 rounded p-4 mb-6">
            <div className="flex items-start">
              <div className="bg-blue-100 p-2.5 rounded mr-3">
                <FaEnvelope className="text-blue-600 text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-1">Mail Summary</h3>
                <p className="font-medium text-gray-800">{mail.mail_subject || 'N/A'}</p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="flex items-center">
                    <FaUser className="text-blue-500 text-xs mr-2" />
                    <span className="text-xs text-gray-600">Raised By: {mail.raised_by || 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <FaCalendarAlt className="text-blue-500 text-xs mr-2" />
                    <span className="text-xs text-gray-600">{formatDate(mail.task_raised_date)}</span>
                  </div>
                  <div className="flex items-center">
                    <FaTag className="text-blue-500 text-xs mr-2" />
                    <span className="text-xs text-gray-600">Assigned Team: {mail.assigned_team || 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <FaClock className="text-blue-500 text-xs mr-2" />
                    <span className="text-xs text-gray-600">Tracked: {formatDate(mail.tracking_date)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Task Solve Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <FaCalendarAlt className="text-blue-500 mr-2" />
                Task Solve Date <span className="text-red-500 ml-1">*</span>
              </label>
              <DatePicker
                selected={taskSolveDate}
                onChange={(date) => setTaskSolveDate(date)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm transition-colors"
                required
                dateFormat="MMMM d, yyyy"
              />
            </div>
            
            {/* Feedback */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <FaPaperclip className="text-blue-500 mr-2" />
                Solution Feedback
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400 text-sm resize-none transition-colors"
                rows={3}
                placeholder="Describe the solution, steps taken, and any relevant feedback..."
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-medium text-sm"
                disabled={solving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded hover:from-green-700 hover:to-green-800 transition-all font-medium text-sm shadow-md disabled:opacity-70"
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
      </div>
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

  // Fetch mail queue data
  const fetchMailQueueData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user_dashboard/mail_queue');
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
    }
  };

  // Handle marking mail as solved
  const handleSolveMail = async (mailSerial, taskSolveDate, feedback) => {
    try {
      const response = await fetch('/api/user_dashboard/mail_queue', {
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
        toast.success('Mail marked as solved successfully');
        // Refresh the data
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

  // Initial data fetch
  useEffect(() => {
    fetchMailQueueData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-4 px-3 sm:px-4 lg:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-700 hover:text-gray-900 mb-4 transition-colors font-medium text-sm"
          >
            <FaArrowLeft className="mr-1.5" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center gap-3 p-3 bg-white/80 backdrop-blur-sm rounded shadow-sm border border-gray-200/50">
            <div className="p-2 bg-blue-100 rounded">
              <FaEnvelope className="text-blue-600 text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Mail Queue
              </h1>
              <p className="text-gray-600 text-xs">Manage in-progress mail entries</p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/90 backdrop-blur-sm rounded shadow p-4 border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total In Progress</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalInProgress}</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded">
                <FaClock className="text-yellow-600 text-lg" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-sm rounded shadow p-4 border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assigned to SOC</p>
                <p className="text-2xl font-bold text-blue-800">{stats.socCount}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded">
                <FaUser className="text-blue-600 text-lg" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-sm rounded shadow p-4 border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assigned to OPS</p>
                <p className="text-2xl font-bold text-purple-800">{stats.opsCount}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded">
                <FaTag className="text-purple-600 text-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Mail List */}
        <div className="bg-white/90 backdrop-blur-sm rounded shadow-lg p-4 border border-gray-200/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {userRole === 'SOC' ? 'SOC' : 'OPS'} In-Progress Mails
            </h2>
            <button
              onClick={fetchMailQueueData}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-sm"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : mails.length === 0 ? (
            <div className="text-center py-12">
              <FaCheckCircle className="mx-auto text-green-400 text-4xl mb-3" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">No in-progress mail entries</h3>
              <p className="text-gray-500 text-sm">All mail entries have been solved</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Raised By
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Raised Date
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tracked By
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned Team
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mails.map((mail) => (
                    <tr key={mail.serial} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">#{mail.serial}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm font-medium text-gray-900 max-w-md truncate" title={mail.mail_subject}>
                          {mail.mail_subject}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{mail.raised_by}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(mail.task_raised_date)}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{mail.tracked_by}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          mail.assigned_team === 'SOC' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {mail.assigned_team}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openSolveModal(mail)}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors shadow-sm"
                        >
                          <FaCheckCircle className="text-xs" />
                          Solve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Solve Mail Modal */}
      <SolveMailModal 
        mail={selectedMail} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSolve={handleSolveMail}
      />
    </div>
  );
}