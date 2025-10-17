// app/user_dashboard/roster/roster_schedule/page.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaUpload, FaCalendarAlt, FaArrowLeft, FaEye, FaDownload, FaInfoCircle, 
  FaUsers, FaChartBar, FaBusinessTime, FaFileExcel, FaTimes,
  FaExchangeAlt, FaSignOutAlt, FaStickyNote
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

export default function RosterSchedulePage() {
  const router = useRouter();
  const [rosterData, setRosterData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [rosterExists, setRosterExists] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userShortName, setUserShortName] = useState('');
  
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];
  
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const teamMembers = ['Tanvir', 'Sizan', 'Nazmul', 'Maruf', 'Bishwajit', 'Borno', 'Anupom', 'Nafiz', 'Prattay', 'Siam', 'Minhadul'];
  const shiftTypes = ['REGULAR', 'MORNING', 'NOON', 'EVENING', 'NIGHT', 'OFFDAY', 'LEAVE'];
  const shiftColors = {
    'REGULAR': 'bg-green-100 text-green-800 border border-green-200',
    'MORNING': 'bg-blue-100 text-blue-800 border border-blue-200',
    'NOON': 'bg-amber-100 text-amber-800 border border-amber-200',
    'EVENING': 'bg-purple-100 text-purple-800 border border-purple-200',
    'NIGHT': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    'OFFDAY': 'bg-gray-200 text-gray-800 border border-gray-300 font-bold',
    'LEAVE': 'bg-red-100 text-red-800 border border-red-200 font-bold'
  };

  // Use useMemo for derived data to prevent infinite loops
  const summaryData = useMemo(() => {
    if (rosterData.length === 0) return {};
    
    const summary = {};
    
    teamMembers.forEach(member => {
      summary[member] = {
        REGULAR: 0,
        MORNING: 0,
        NOON: 0,
        EVENING: 0,
        NIGHT: 0,
        OFFDAY: 0,
        LEAVE: 0,
        WORKDAYS: 0
      };
    });
    
    rosterData.forEach(day => {
      const isWeekend = day.day === 'Friday' || day.day === 'Saturday';
      
      teamMembers.forEach(member => {
        const shift = day[member.toLowerCase()];
        if (shift && summary[member][shift] !== undefined) {
          summary[member][shift]++;
        }
        
        if (!isWeekend && shift && shift !== 'OFFDAY' && shift !== 'LEAVE') {
          summary[member].WORKDAYS++;
        }
      });
    });
    
    console.debug('Calculated summary:', summary);
    return summary;
  }, [rosterData, teamMembers]);

  const totalWorkdays = useMemo(() => {
    const year = parseInt(filters.year);
    const month = parseInt(filters.month) - 1;
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let workdayCount = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        workdayCount++;
      }
    }
    
    console.debug('Calculated total workdays:', workdayCount);
    return workdayCount;
  }, [filters.month, filters.year]);

  const fetchRosterData = async () => {
    try {
      setLoading(true);
      console.debug('Fetching roster data for:', { month: filters.month, year: filters.year });
      const response = await fetch(
        `/api/user_dashboard/roster/roster_schedule?month=${filters.month}&year=${filters.year}`
      );
      
      const result = await response.json();
      
      if (result.success) {
        setRosterData(result.data);
        setRosterExists(result.data.length > 0);
        console.debug('Roster data fetched successfully:', { data: result.data });
      } else {
        toast.error('Failed to fetch roster data');
        console.error('Failed to fetch roster:', result.message);
      }
    } catch (error) {
      console.error('Error fetching roster:', error);
      toast.error('Error fetching roster data');
    } finally {
      setLoading(false);
      console.debug('Roster fetch completed, loading set to false');
    }
  };

  const fetchUserInfo = async () => {
    try {
      console.debug('Fetching user info');
      const response = await fetch('/api/user_dashboard/user_info');
      const result = await response.json();
      
      if (result.success) {
        setUserRole(result.data.role_type);
        setUserShortName(result.data.short_name);
        console.debug('User info fetched successfully:', { role: result.data.role_type, shortName: result.data.short_name });
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      toast.error('Error fetching user info');
    }
  };

  useEffect(() => {
    fetchRosterData();
    fetchUserInfo();
  }, [filters.month, filters.year]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Only Excel files are allowed');
      console.debug('Invalid file type selected:', file.name);
      return;
    }

    setSelectedFile(file);
    console.debug('Selected file:', file.name);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      console.debug('Upload attempted without a selected file');
      return;
    }

    // Check if user is allowed to upload
    const allowedSocUsers = ['Borno', 'Sizan', 'Tanvir', 'Nazmul'];
    if (userRole === 'SOC' && !allowedSocUsers.includes(userShortName)) {
      toast.error('You are not eligible to upload roster schedule');
      console.debug('Upload denied: User not eligible', { userRole, userShortName });
      return;
    }

    if (userRole === 'OPS') {
      toast.error('OPS team members are not eligible to upload roster schedule');
      console.debug('Upload denied: OPS team member', { userRole });
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Uploading roster...');
    console.debug('Initiating roster upload:', { file: selectedFile.name, month: filters.month, year: filters.year });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('month', filters.month);
      formData.append('year', filters.year);

      const response = await fetch('/api/user_dashboard/roster/roster_schedule', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Roster uploaded successfully!', { 
          id: toastId,
          duration: 4000,
          position: 'top-right'
        });
        setSelectedFile(null);
        fetchRosterData();
        console.debug('Roster uploaded successfully');
      } else {
        throw new Error(result.message || 'Failed to upload roster');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Upload failed. Please try again.', { id: toastId });
    } finally {
      setUploading(false);
      console.debug('Upload completed, uploading set to false');
    }
  };

  const downloadBaseFormat = () => {
    console.debug('Downloading base format');
    const link = document.createElement('a');
    link.href = '/storage/roster_base_formate_excel/Roster.xlsx';
    link.download = 'Roster_Base_Format.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Dhaka'
      });
      const formatted = formatter.format(new Date(dateString));
      console.debug('Formatted date:', { input: dateString, output: formatted });
      return formatted;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Dhaka'
      });
      const formatted = formatter.format(new Date(dateString));
      console.debug('Formatted date-time:', { input: dateString, output: formatted });
      return formatted;
    } catch (error) {
      console.error('Error formatting date-time:', error);
      return 'N/A';
    }
  };

  const isToday = (dateString) => {
    const today = new Date();
    const date = new Date(dateString);
    const isSame = date.toDateString() === today.toDateString();
    console.debug('Checked if date is today:', { dateString, isToday: isSame });
    return isSame;
  };

  const getDayClass = (day, date) => {
    if (isToday(date)) return 'bg-yellow-100 font-bold';
    if (day === 'Friday' || day === 'Saturday') return 'bg-blue-100';
    return 'bg-white';
  };

  const showDayDetails = async (dayData) => {
    setSelectedDay(dayData);
    setShowModal(true);
    console.debug('Showing day details:', { date: dayData.date, day: dayData.day });
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDay(null);
    console.debug('Closed day details modal');
  };

  const getShiftCounts = (dayData) => {
    const counts = {};
    shiftTypes.forEach(shift => {
      counts[shift] = 0;
    });
    
    teamMembers.forEach(member => {
      const shift = dayData[member.toLowerCase()];
      if (shift && counts[shift] !== undefined) {
        counts[shift]++;
      }
    });
    
    console.debug('Calculated shift counts for day:', { date: dayData.date, counts });
    return counts;
  };

  const getShiftTextColor = (shift) => {
    const textColors = {
      'REGULAR': 'text-green-800',
      'MORNING': 'text-blue-800',
      'NOON': 'text-amber-800',
      'EVENING': 'text-purple-800',
      'NIGHT': 'text-indigo-800',
      'OFFDAY': 'text-gray-800',
      'LEAVE': 'text-red-800'
    };
    return textColors[shift] || 'text-gray-800';
  };
  
  const CountBadge = ({ count, color }) => {
  if (count === undefined || count === null || count === 0) {
    return <span className="text-gray-300">-</span>;
  }

  const colorClasses = {
    green: 'bg-green-100 text-green-800 border border-green-200',
    blue: 'bg-blue-100 text-blue-800 border border-blue-200',
    amber: 'bg-amber-100 text-amber-800 border border-amber-200',
    purple: 'bg-purple-100 text-purple-800 border border-purple-200',
    indigo: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    gray: 'bg-gray-100 text-gray-800 border border-gray-200',
    red: 'bg-red-100 text-red-800 border border-red-200'
  };

  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-sm ${colorClasses[color]}`}>
      {count}
    </span>
  );
};

const GapBadge = ({ gap }) => {
  if (gap === 0) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-800 rounded-full text-xs font-sm">
        0
      </span>
    );
  }
  
  const isPositive = gap > 0;
  const bgColor = isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  const symbol = isPositive ? '+' : '';
  
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-sm ${bgColor}`}>
      {symbol}{gap}
    </span>
  );
};

  // Function to format note type with icon
  const renderNoteType = (type) => {
    if (type === 'Shift Exchange') {
      return (
        <div className="flex items-center text-blue-600">
          <FaExchangeAlt className="mr-1 text-xs" />
          <span className="text-xs font-sm">Shift Exchange</span>
        </div>
      );
    } else if (type === 'Take Leave') {
      return (
        <div className="flex items-center text-red-600">
          <FaSignOutAlt className="mr-1 text-xs" />
          <span className="text-xs font-sm">Leave</span>
        </div>
      );
    }
    return type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading roster data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Title */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                console.debug('Navigating back');
                router.back();
              }}
              className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors font-sm text-sm"
            >
              <FaArrowLeft className="mr-1" />
              Back to Roster
            </button>
            
            <div className="flex items-center">
              <FaCalendarAlt className="text-indigo-500 mr-2" />
              <span className="text-sm font-sm text-gray-700">
                {months.find(m => m.value === filters.month)?.label} {filters.year}
              </span>
            </div>
          </div>
          
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-gray-800">
              {months.find(m => m.value === filters.month)?.label} {filters.year} Roster
            </h1>
            <p className="text-gray-600 text-sm">Team schedule and shift management</p>
          </div>
        </div>

        {/* Filters and Upload Section */}
        <div className="bg-white rounded shadow-md p-6 mb-8 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Month Selector */}
              <div>
                <label className="block text-sm font-sm text-gray-700 mb-2">Month</label>
                <select
                  value={filters.month}
                  onChange={(e) => {
                    setFilters({...filters, month: parseInt(e.target.value)});
                    console.debug('Updated filter month:', e.target.value);
                  }}
                  className="w-full h-12 px-4 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                >
                  {months.map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Year Selector */}
              <div>
                <label className="block text-sm font-sm text-gray-700 mb-2">Year</label>
                <select
                  value={filters.year}
                  onChange={(e) => {
                    setFilters({...filters, year: parseInt(e.target.value)});
                    console.debug('Updated filter year:', e.target.value);
                  }}
                  className="w-full h-12 px-4 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                >
                  {years.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* File Upload */}
              <div className="relative">
                <label className="block text-sm font-sm text-gray-700 mb-2">Upload Excel</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    disabled={rosterExists}
                    className={`w-full h-12 px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white opacity-0 absolute z-10 ${rosterExists ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    id="file-upload"
                  />
                  <label 
                    htmlFor="file-upload" 
                    className={`w-full h-12 px-4 flex items-center justify-between border border-gray-300 rounded ${rosterExists ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer'}`}
                  >
                    <span className={`truncate ${rosterExists ? 'text-gray-400' : 'text-gray-500'}`}>
                      {selectedFile ? selectedFile.name : 'Choose file...'}
                    </span>
                    <FaUpload className={rosterExists ? 'text-gray-400' : 'text-indigo-600'} />
                  </label>
                </div>
                {rosterExists && (
                  <p className="absolute -bottom-5 text-xs text-gray-500 mt-1">
                    Roster already exists for this month
                  </p>
                )}
              </div>

              {/* Download Base Format */}
              <div>
                <label className="block text-sm font-sm text-gray-700 mb-2">Base Format</label>
                <button
                  onClick={downloadBaseFormat}
                  className="w-full h-12 px-4 flex items-center justify-center gap-2 bg-green-600 text-white rounded font-sm hover:bg-green-700 transition-colors"
                >
                  <FaDownload className="text-sm" />
                  Download Format
                </button>
              </div>

              {/* Upload Button */}
              <div className="flex items-end">
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading || rosterExists}
                  className={`w-full h-12 px-6 rounded font-sm transition-all flex items-center justify-center ${
                    !selectedFile || uploading || rosterExists
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaUpload className="mr-2" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {selectedFile && (
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200 flex items-center">
              <FaFileExcel className="text-blue-600 mr-2" />
              <p className="text-sm text-blue-800 truncate flex-1">
                Selected: <span className="font-sm">{selectedFile.name}</span>
              </p>
              <button 
                onClick={() => {
                  setSelectedFile(null);
                  console.debug('Cleared selected file');
                }}
                className="ml-2 text-blue-800 hover:text-blue-900"
              >
                <FaTimes />
              </button>
            </div>
          )}
        </div>

        {/* Roster Table */}
        {rosterData.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded shadow-md overflow-hidden border border-gray-200"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    <th className="p-1 text-left font-sm border-r border-indigo-500">Date</th>
                    <th className="p-1 text-left font-sm border-r border-indigo-500">Day</th>
                    {teamMembers.map(member => (
                      <th key={member} className="p-1 text-center font-sm border-r border-indigo-500 last:border-r-0">
                        {member}
                      </th>
                    ))}
                    <th className="p-1 text-center font-sm border-r border-indigo-500">Info</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterData.map((row, index) => (
                    <tr 
                      key={index} 
                      className={`border-b border-gray-200 ${getDayClass(row.day, row.date)}`}
                    >
                      <td className="p-1 whitespace-nowrap font-sm text-gray-900 border-r border-gray-200">
                        {formatDate(row.date)}
                        {isToday(row.date) && (
                          <span className="ml-1 text-xs text-yellow-700">(Today)</span>
                        )}
                      </td>
                      <td className={`p-1 whitespace-nowrap border-r border-gray-200 text-center ${
                        row.day === 'Friday' || row.day === 'Saturday' 
                          ? 'bg-blue-200 text-blue-800 border border-blue-300' 
                          : 'bg-gray-200 text-gray-800 border border-gray-300'
                      }`}>
                        {row.day}
                      </td>
                      {teamMembers.map(member => (
                        <td key={member} className="p-1 text-center border-r border-gray-200 last:border-r-0">
                          <span className={`inline-flex items-center justify-center w-full px-2 py-1 rounded text-xs font-sm ${
                            shiftColors[row[member.toLowerCase()]] || 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}>
                            {row[member.toLowerCase()] || '-'}
                          </span>
                        </td>
                      ))}
                      <td className="p-1 text-center border-r border-gray-200">
                        <button
                          onClick={() => showDayDetails(row)}
                          className="text-indigo-600 hover:text-indigo-800 transition-colors"
                          title="View day details"
                        >
                          <FaInfoCircle />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded shadow-md p-8 text-center border border-gray-200"
          >
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FaCalendarAlt className="text-gray-400 text-xl" />
            </div>
            <h3 className="text-lg font-sm text-gray-700 mb-2">No Roster Found</h3>
            <p className="text-gray-500 text-sm mb-4">
              No roster schedule found for {months.find(m => m.value === filters.month)?.label} {filters.year}.
            </p>
            <button
              onClick={() => {
                console.debug('Opening file upload dialog');
                document.querySelector('input[type="file"]').click();
              }}
              className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors inline-flex items-center text-sm"
            >
              <FaUpload className="mr-1 text-xs" />
              Upload Roster
            </button>
          </motion.div>
        )}

        {/* Summary Table */}
        {rosterData.length > 0 && (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    className="bg-white rounded shadow-sm border border-gray-200 mt-6 mb-6 overflow-hidden"
  >
    {/* Header */}
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div className="flex items-center mb-2 sm:mb-0">
          <div className="bg-white/20 p-1.5 rounded mr-2">
            <FaChartBar className="text-white text-sm" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">MONTHLY SUMMARY</h2>
            <p className="text-indigo-100 text-xs">{months.find(m => m.value === filters.month)?.label} {filters.year}</p>
          </div>
        </div>
        <div className="flex items-center bg-indigo-700 px-2 py-1 rounded text-xs">
          <FaBusinessTime className="mr-1" />
          <span>{totalWorkdays} Workdays</span>
        </div>
      </div>
    </div>

    {/* Table */}
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="p-2 text-left font-sm text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[80px]">
              Member
            </th>
            <th className="text-center font-sm text-gray-700 min-w-[40px]" title="Regular">REGULAR</th>
            <th className="text-center font-sm text-gray-700 min-w-[40px]" title="Morning">MORNING</th>
            <th className="text-center font-sm text-gray-700 min-w-[40px]" title="Noon">NOON</th>
            <th className="text-center font-sm text-gray-700 min-w-[40px]" title="Evening">EVENING</th>
            <th className="text-center font-sm text-gray-700 min-w-[40px]" title="Night">NIGHT</th>
            <th className="text-center font-sm text-gray-700 min-w-[40px]" title="Off Day">OFF-DAY</th>
            <th className="text-center font-sm text-gray-700 min-w-[40px]" title="Leave">LEAVE</th>
            <th className="text-center font-sm text-gray-700 min-w-[50px]" title="Total Work Days (REGULAR+MORNING+NOON+EVENING+NIGHT)">
              <div className="flex items-center justify-center">
                <FaBusinessTime className="mr-0.5 text-gray-500" />
                <span>Work Day</span>
              </div>
            </th>
            <th className="text-center font-sm text-gray-700 min-w-[40px]" title="Gap (Work Days vs Month Work Days)">
              Gap
            </th>
          </tr>
        </thead>
        <tbody>
          {teamMembers.map((member, index) => {
            const memberData = summaryData[member] || {};
            // Calculate total work days: REG + MOR + NOO + EVE + NIG + LEA
            const workdays = (memberData.REGULAR || 0) + 
                            (memberData.MORNING || 0) + 
                            (memberData.NOON || 0) + 
                            (memberData.EVENING || 0) + 
                            (memberData.NIGHT || 0);
            const gap = (workdays + (memberData.LEAVE || 0)) - totalWorkdays;
            
            return (
              <tr 
                key={member} 
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                <td className="p-1 text-sm font-sm text-gray-800 sticky left-0 bg-inherit z-10 min-w-[80px]">

                  {member}
                </td>
                <td className="text-center">
                  <CountBadge count={memberData.REGULAR} color="green" />
                </td>
                <td className="text-center">
                  <CountBadge count={memberData.MORNING} color="blue" />
                </td>
                <td className="text-center">
                  <CountBadge count={memberData.NOON} color="amber" />
                </td>
                <td className="text-center">
                  <CountBadge count={memberData.EVENING} color="purple" />
                </td>
                <td className="text-center">
                  <CountBadge count={memberData.NIGHT} color="indigo" />
                </td>
                <td className="text-center">
                  <CountBadge count={memberData.OFFDAY} color="gray" />
                </td>
                <td className="text-center">
                  <CountBadge count={memberData.LEAVE} color="red" />
                </td>
                <td className="text-center">
                  <div className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded font-sm">
                    {workdays}
                  </div>
                </td>
                <td className="text-center">
                  <GapBadge gap={gap} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </motion.div>
)}

        {/* Day Details Modal */}
        <AnimatePresence>
          {showModal && selectedDay && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200"
              >
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-white/20 p-2 rounded mr-3">
                        <FaUsers className="text-white text-lg" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {formatDate(selectedDay.date)} - {selectedDay.day}
                        </h3>
                        <p className="text-indigo-100 text-sm">Daily Schedule Overview</p>
                      </div>
                    </div>
                    <button 
                      onClick={closeModal}
                      className="bg-white/20 hover:bg-white/30 p-1 rounded-full transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-5">
                  <div className="mb-6">
                    <div className="flex items-center mb-3">
                      <div className="bg-indigo-100 p-2 rounded mr-2">
                        <FaChartBar className="text-indigo-600" />
                      </div>
                      <h4 className="font-semibold text-gray-800">Shift Distribution</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {shiftTypes.map(shift => {
                        const membersWithShift = teamMembers.filter(member => 
                          selectedDay[member.toLowerCase()] === shift
                        );
                        
                        if (membersWithShift.length === 0) return null;
                        
                        return (
                          <div key={shift} className="bg-gradient-to-br from-gray-50 to-white rounded p-4 border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-3 w-full bg-gray-50 px-3 py-2 rounded border-b border-gray-200">
                              <span className={`text-sm font-semibold ${getShiftTextColor(shift)}`}>
                                {shift}
                              </span>
                              <span className="text-sm font-sm text-gray-600">
                                {membersWithShift.length} {membersWithShift.length === 1 ? 'MEMBER' : 'MEMBERS'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {membersWithShift.map(member => (
                                <span 
                                  key={member} 
                                  className="inline-flex items-center px-3 py-1 rounded bg-indigo-100 text-indigo-800 text-sm font-sm"
                                >
                                  {member}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="mb-6">
                    <div className="flex items-center mb-3">
                      <div className="bg-amber-100 p-2 rounded mr-2">
                        <FaStickyNote className="text-amber-600" />
                      </div>
                      <h4 className="font-semibold text-gray-800">Shift Notes</h4>
                    </div>

                    {selectedDay.notes && selectedDay.notes.length > 0 ? (
                      <div className="space-y-3">
                        {selectedDay.notes.map((note, index) => (
                          <div key={index} className="bg-amber-50 rounded p-4 border border-amber-200">
                            <div className="flex items-center justify-between mb-2">
                              {renderNoteType(note.type)}
                              <div className="text-xs text-gray-500">
                                <div>Requested For Date: {formatDate(note.request_date)}</div>
                                <div>Request Created: {formatDateTime(note.created_at)}</div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-gray-600 mb-1">
                                  <span className="font-sm">Shift:</span> {note.your_shift}
                                </p>
                                {note.assigned_to && (
                                  <p className="text-gray-600 mb-1">
                                    <span className="font-sm">Assigned To:</span> {note.assigned_to}
                                  </p>
                                )}
                                <p className="text-gray-600 mb-1">
                                  <span className="font-sm">Updated Shift:</span> {note.updated_shift}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-gray-600 mb-1">
                                  <span className="font-sm">Reason:</span> {note.reason}
                                </p>
                                <p className="text-gray-600 mb-1">
                                  <span className="font-sm">Handover Task:</span> {note.handover_task}
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-sm">Communicated With:</span> {note.communicated_person}
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-3 pt-2 border-t border-amber-200">
                              <p className="text-xs text-gray-500">
                                Requested by: {note.requested_by_name || note.requested_by}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded p-4 text-center border border-gray-200">
                        <p className="text-gray-500 text-sm">No shift notes for this day</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 rounded flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors font-sm text-sm"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}