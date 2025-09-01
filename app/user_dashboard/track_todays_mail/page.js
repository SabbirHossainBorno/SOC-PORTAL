//app/user_dashboard/track_todays_mail/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaEnvelope, FaPlus, FaTrash, FaArrowLeft, FaPaperPlane } from 'react-icons/fa';
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
    const formattedDate = `${year}-${month}-${day}`;
    console.debug('Generated Dhaka date:', formattedDate);
    return formattedDate;
  } catch (error) {
    console.error('Error generating Dhaka date:', error);
    return new Date().toISOString().split('T')[0]; // Fallback to UTC date
  }
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

  const raisedByOptions = [
    'SALES', 'CS/CDIM', 'COMPLIANCE', 'LEA', 'SERVICE DELIVERY', 
    'FININCE', 'HRM', 'RECONCILIATION', 'SCM', 'REVENUE ASSURANCE',
    'MARKETING', 'TECHNOLOGY', 'COMMERCIAL', 'EXTERNAL', 'GOVT', 'OTHER'
  ];

  const assignedTeamOptions = ['SOC', 'OPS'];

  useEffect(() => {
    // Set default date to today in Dhaka timezone
    const today = getDhakaDate();
    setTrackingDate(today);
    
    // Set default task raised date only (not task solve date)
    setMailEntries(prev => prev.map(entry => ({
      ...entry,
      taskRaisedDate: today,
      // taskSolveDate is left empty by default
    })));
    console.debug('Initialized tracking date and mail entries:', { trackingDate: today });
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
    console.debug('Added new mail entry');
  };

  const removeMailEntry = (index) => {
    if (mailEntries.length <= 1) {
      toast.error('You need at least one mail entry', {
        duration: 4000,
        position: 'top-right'
      });
      console.debug('Prevented removal: At least one mail entry required');
      return;
    }
    
    setMailEntries(prev => prev.filter((_, i) => i !== index));
    console.debug('Removed mail entry at index:', index);
  };

  const updateMailEntry = (index, field, value) => {
    setMailEntries(prev => prev.map((entry, i) => {
      if (i === index) {
        const updatedEntry = { ...entry, [field]: value };
        
        // If raisedBy is not OTHER, clear raisedByOther
        if (field === 'raisedBy' && value !== 'OTHER') {
          updatedEntry.raisedByOther = '';
        }
        
        console.debug('Updated mail entry:', { index, field, value });
        return updatedEntry;
      }
      return entry;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Submitting mail tracking data...', {
      position: 'top-right'
    });
    console.debug('Submitting mail tracking data:', { trackingDate, mailEntries });

    // Validate that all required fields are filled
    const hasEmptyFields = mailEntries.some(entry => {
      const basicValidation = !entry.mailSubject || 
        !entry.taskRaisedDate || 
        !entry.raisedBy || 
        (entry.raisedBy === 'OTHER' && !entry.raisedByOther);
      
      // For in-progress entries, assigned team is required
      const inProgressValidation = !entry.taskSolveDate && !entry.assignedTeam;
      
      return basicValidation || inProgressValidation;
    });

    if (hasEmptyFields) {
      toast.error('Please fill all required fields', {
        id: toastId,
        duration: 4000,
        position: 'top-right'
      });
      console.debug('Submission failed: Empty required fields');
      setLoading(false);
      return;
    }

    try {
      // Prepare data for submission
      const submissionData = mailEntries.map(entry => {
        // If raisedBy is OTHER, use raisedByOther value
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

      const response = await fetch('/api/user_dashboard/track_todays_mail', {
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
        toast.success('Mail tracking data saved successfully!', {
          id: toastId,
          duration: 4000,
          position: 'top-right',
          icon: '✅'
        });
        // Reset form
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
        console.debug('Form reset after successful submission:', { trackingDate: today });
      } else {
        toast.error(result.message || 'Failed to save mail tracking data', {
          id: toastId,
          duration: 5000,
          position: 'top-right'
        });
        console.debug('Submission failed:', result.message);
      }
    } catch (error) {
      console.error('Error submitting mail tracking data:', error);
      toast.error('Network error: Could not submit mail tracking data', {
        id: toastId,
        duration: 5000,
        position: 'top-right'
      });
    } finally {
      setLoading(false);
      console.debug('Submission completed, loading set to false');
    }
  };

  // Get today's date in Dhaka timezone for the max attribute
  const todayDhaka = getDhakaDate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-4 px-3 sm:px-4 lg:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => {
              console.debug('Navigating back to mail center');
              router.back();
            }}
            className="flex items-center text-gray-700 hover:text-gray-900 mb-4 transition-colors font-medium text-sm"
          >
            <FaArrowLeft className="mr-1.5" />
            Back to Mail Center
          </button>
          
          <div className="flex items-center gap-3 p-3 bg-white/80 backdrop-blur-sm rounded shadow-sm border border-gray-200/50">
            <div className="p-2 bg-yellow-100 rounded">
              <FaEnvelope className="text-yellow-600 text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Track Today&apos;s Mail
              </h1>
              <p className="text-gray-600 text-xs">Track and manage incoming mail</p>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white/90 backdrop-blur-sm rounded shadow-lg p-4 border border-gray-200/50">
          <form onSubmit={handleSubmit}>
            {/* Tracking Date */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                Tracking Date
              </label>
              <input
                type="date"
                value={trackingDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setTrackingDate(newDate);
                  
                  // Update all entries with the new date
                  setMailEntries(prev => prev.map(entry => ({
                    ...entry,
                    taskRaisedDate: newDate,
                    // Don't update taskSolveDate as it's manually set
                  })));
                  console.debug('Updated tracking date:', newDate);
                }}
                max={todayDhaka}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70"
                required
              />
            </div>

            {/* Mail Entries */}
            <div className="space-y-4">
              {mailEntries.map((entry, index) => {
                const isSolved = !!entry.taskSolveDate;
                
                return (
                  <div key={index} className="p-4 border border-gray-200 rounded bg-white/60 relative">
                    {mailEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMailEntry(index)}
                        className="absolute top-3 right-3 text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    )}
                    
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200 flex items-center">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2">
                        #{index + 1}
                      </span>
                      Mail Entry
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Mail Subject */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Mail Subject *
                        </label>
                        <input
                          type="text"
                          value={entry.mailSubject}
                          onChange={(e) => updateMailEntry(index, 'mailSubject', e.target.value)}
                          className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70"
                          required
                          placeholder="Enter mail subject"
                        />
                      </div>

                      {/* Task Raised Date */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Task Raised Date *
                        </label>
                        <input
                          type="date"
                          value={entry.taskRaisedDate}
                          onChange={(e) => updateMailEntry(index, 'taskRaisedDate', e.target.value)}
                          max={todayDhaka}
                          className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70"
                          required
                        />
                      </div>

                      {/* Task Solve Date */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Task Solve Date
                        </label>
                        <input
                          type="date"
                          value={entry.taskSolveDate}
                          onChange={(e) => updateMailEntry(index, 'taskSolveDate', e.target.value)}
                          max={todayDhaka}
                          className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70"
                        />
                      </div>

                      {/* Raised By */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Raised By *
                        </label>
                        <select
                          value={entry.raisedBy}
                          onChange={(e) => updateMailEntry(index, 'raisedBy', e.target.value)}
                          className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70"
                          required
                        >
                          <option value="" className="text-gray-500">Select an option</option>
                          {raisedByOptions.map(option => (
                            <option key={option} value={option} className="text-gray-900">
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Raised By Other (only show if OTHER is selected) */}
                      {entry.raisedBy === 'OTHER' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Specify Other *
                          </label>
                          <input
                            type="text"
                            value={entry.raisedByOther}
                            onChange={(e) => updateMailEntry(index, 'raisedByOther', e.target.value)}
                            className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70"
                            required={entry.raisedBy === 'OTHER'}
                            placeholder="Enter other value"
                          />
                        </div>
                      )}

                      {/* Assigned Team (only show if not solved) */}
                      {!isSolved && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Assigned Team *
                          </label>
                          <select
                            value={entry.assignedTeam}
                            onChange={(e) => updateMailEntry(index, 'assignedTeam', e.target.value)}
                            className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70"
                            required={!isSolved}
                          >
                            <option value="" className="text-gray-500">Select a team</option>
                            {assignedTeamOptions.map(option => (
                              <option key={option} value={option} className="text-gray-900">
                                {option}
                            </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Status (read-only) */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <div className={`w-full px-3 py-2 text-xs font-medium border border-gray-300 rounded ${isSolved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {isSolved ? 'SOLVED' : 'IN-PROGRESS'}
                        </div>
                      </div>

                      {/* Solved Within a Day (read-only) */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Solved Within a Day
                        </label>
                        <div className={`w-full px-3 py-2 text-xs font-medium border border-gray-300 rounded ${isSolved && entry.taskRaisedDate === entry.taskSolveDate ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {isSolved && entry.taskRaisedDate === entry.taskSolveDate ? 'YES' : 'NO'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Entry Button */}
            <div className="mt-5">
              <button
                type="button"
                onClick={addMailEntry}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs font-medium transition-colors shadow-sm"
              >
                <FaPlus className="text-xs" />
                Add Another Mail Entry
              </button>
            </div>

            {/* Submit Button */}
            <div className="mt-6 pt-5 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded font-medium text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="text-xs" />
                    Submit Mail Tracking Data
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}