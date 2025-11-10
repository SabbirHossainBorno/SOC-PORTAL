// app/user_dashboard/roster/my_roster/page.js
// app/user_dashboard/roster/my_roster/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FaCalendarAlt, FaArrowLeft, FaUser, FaFilter, FaSyncAlt, FaChevronDown, FaChevronUp, FaTimes, FaCheckCircle } from 'react-icons/fa';
import { GiCardExchange } from "react-icons/gi";
import { FcLeave } from "react-icons/fc";
import toast from 'react-hot-toast';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

export default function MyRosterPage() {
  const router = useRouter();
  const [rosterData, setRosterData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState({});

  const [showShiftExchangeModal, setShowShiftExchangeModal] = useState(false);
  const [showTakeLeaveModal, setShowTakeLeaveModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [exchangeReason, setExchangeReason] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [handoverTask, setHandoverTask] = useState('');
  const [communicatedPerson, setCommunicatedPerson] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [dateRoster, setDateRoster] = useState(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  
  // Add loading states for form submissions
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);

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

  const shiftColors = {
    'REGULAR': 'from-green-500 to-green-600',
    'MORNING': 'from-blue-500 to-blue-600',
    'NOON': 'from-amber-500 to-amber-600',
    'EVENING': 'from-purple-500 to-purple-600',
    'NIGHT': 'from-indigo-500 to-indigo-600',
    'OFFDAY': 'from-gray-500 to-gray-600',
    'LEAVE': 'from-red-500 to-red-600'
  };

  const shiftIcons = {
    'REGULAR': '🔄',
    'MORNING': '🌅',
    'NOON': '☀️',
    'EVENING': '🌇',
    'NIGHT': '🌙',
    'OFFDAY': '🏖️',
    'LEAVE': '📝'
  };

  // Define fetchMyRoster with useCallback before useEffect
  const fetchMyRoster = useCallback(async () => {
    try {
      setLoading(true);
      console.debug('Fetching roster data for:', { month: filters.month, year: filters.year });
      const response = await fetch(
        `/api/user_dashboard/roster/my_roster?month=${filters.month}&year=${filters.year}`,
        { credentials: 'include' } // Add credentials
      );

      const result = await response.json();

      if (result.success) {
        setRosterData(result.data);
        setUserName(result.user);
        // Expand current week by default
        const currentWeekIndex = getCurrentWeekIndex(result.data);
        setExpandedWeeks({ [currentWeekIndex]: true });
        console.debug('Roster data fetched successfully:', { data: result.data, user: result.user });
      } else {
        toast.error(result.message || 'Failed to fetch your roster');
        console.error('Failed to fetch roster:', result.message);
      }
    } catch (error) {
      console.error('Error fetching roster:', error);
      toast.error('Error fetching your roster data');
    } finally {
      setLoading(false);
      console.debug('Roster fetch completed, loading set to false');
    }
  }, [filters.month, filters.year]); // Add dependencies

  // Define fetchTeamMembers with useCallback
  const fetchTeamMembers = useCallback(async () => {
    try {
      console.debug('Fetching team members');
      const response = await fetch('/api/user_dashboard/roster/team_members', {
        credentials: 'include' // Add credentials
      });
      const result = await response.json();

      if (result.success) {
        setTeamMembers(result.data);
        console.debug('Team members fetched successfully:', result.data);
      } else {
        toast.error(result.message || 'Failed to fetch team members');
        console.error('Failed to fetch team members:', result.message);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Error fetching team members');
    }
  }, []); // Empty dependency array

  // Now useEffect can use these functions
  useEffect(() => {
    fetchMyRoster();
    fetchTeamMembers();
  }, [fetchMyRoster, fetchTeamMembers]); // Use the memoized functions

  // Rest of your code remains the same...
  const fetchRosterByDate = async (date) => {
    try {
      setLoadingRoster(true);
      console.debug('Fetching roster for date:', date);
      const response = await fetch(`/api/user_dashboard/roster/roster_by_date?date=${date}`, {
        credentials: 'include' // Add credentials
      });
      const result = await response.json();

      if (result.success) {
        setDateRoster(result.data);
        console.debug('Roster for date fetched successfully:', result.data);
      } else {
        toast.error(result.message || 'Failed to fetch roster for selected date');
        console.error('Failed to fetch roster for date:', result.message);
      }
    } catch (error) {
      console.error('Error fetching roster by date:', error);
      toast.error('Error fetching roster data for selected date');
    } finally {
      setLoadingRoster(false);
      console.debug('Roster by date fetch completed, loadingRoster set to false');
    }
  };


  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const formatter = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Dhaka'
    });
    const formatted = formatter.format(new Date(dateString));
    console.debug('Formatted date:', { input: dateString, output: formatted });
    return formatted;
  };

  const isToday = (dateString) => {
    const today = new Date();
    const date = new Date(dateString);
    return date.toDateString() === today.toDateString();
  };

  const isYesterday = (dateString) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = new Date(dateString);
    return date.toDateString() === yesterday.toDateString();
  };

  const isTomorrow = (dateString) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = new Date(dateString);
    return date.toDateString() === tomorrow.toDateString();
  };

  const isWeekend = (day) => {
    return day === 'Friday' || day === 'Saturday';
  };

  // Get today's duty
  const getTodaysDuty = () => {
    return rosterData.find(item => isToday(item.date));
  };

  // Get yesterday's duty
  const getYesterdaysDuty = () => {
    return rosterData.find(item => isYesterday(item.date));
  };

  // Get tomorrow's duty
  const getTomorrowsDuty = () => {
    return rosterData.find(item => isTomorrow(item.date));
  };

  // Group roster data by week starting on Sunday
  const groupByWeekStartingSunday = (data) => {
    if (!data || data.length === 0) return [];

    const weeks = [];
    let currentWeek = [];

    data.forEach((item, index) => {
      const date = new Date(item.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      // If it's Sunday and we have a current week, push it and start a new week
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [item];
      } else {
        currentWeek.push(item);
      }

      // If it's the last item, push the current week
      if (index === data.length - 1) {
        weeks.push(currentWeek);
      }
    });

    console.debug('Grouped weeks:', weeks);
    return weeks;
  };

  const handleShiftExchange = async () => {
    try {
      setExchangeLoading(true); // Start loading
      console.debug('Submitting shift exchange:', { date: selectedDate, assignedTo: selectedUser, reason: exchangeReason });
      
      const response = await fetch('/api/user_dashboard/roster/shift_exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          date: selectedDate,
          assignedTo: selectedUser,
          reason: exchangeReason,
          handoverTask: handoverTask,
          communicatedPerson: communicatedPerson
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Shift exchange successful', {
          duration: 4000,
          position: 'top-right',
          icon: <FaCheckCircle className="text-green-500" />
        });
        setShowShiftExchangeModal(false);
        resetForm();
        fetchMyRoster(); // Refresh the roster
        console.debug('Shift exchange successful');
      } else {
        toast.error(result.message || 'Failed to process shift exchange');
        console.error('Failed to process shift exchange:', result.message);
      }
    } catch (error) {
      console.error('Error processing shift exchange:', error);
      toast.error('Error processing shift exchange');
    } finally {
      setExchangeLoading(false); // End loading
    }
  };

  const handleTakeLeave = async () => {
    try {
      setLeaveLoading(true); // Start loading
      console.debug('Submitting leave request:', { date: selectedDate, assignedTo: selectedUser, reason: leaveReason });
      
      const response = await fetch('/api/user_dashboard/roster/take_leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          date: selectedDate,
          assignedTo: selectedUser,
          reason: leaveReason,
          handoverTask: handoverTask,
          communicatedPerson: communicatedPerson
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Leave request successful', {
          duration: 4000,
          position: 'top-right',
          icon: <FaCheckCircle className="text-green-500" />
        });
        setShowTakeLeaveModal(false);
        resetForm();
        fetchMyRoster(); // Refresh the roster
        console.debug('Leave request successful');
      } else {
        toast.error(result.message || 'Failed to process leave request');
        console.error('Failed to process leave request:', result.message);
      }
    } catch (error) {
      console.error('Error processing leave request:', error);
      toast.error('Error processing leave request');
    } finally {
      setLeaveLoading(false); // End loading
    }
  };

  const resetForm = () => {
    setSelectedDate('');
    setSelectedUser('');
    setExchangeReason('');
    setLeaveReason('');
    setHandoverTask('');
    setCommunicatedPerson('');
    setDateRoster(null);
    console.debug('Form reset');
  };

  // Get current week index for auto-expanding
  const getCurrentWeekIndex = (data) => {
    const weeks = groupByWeekStartingSunday(data);
    const today = new Date();

    for (let i = 0; i < weeks.length; i++) {
      const week = weeks[i];
      const hasToday = week.some(day => {
        const date = new Date(day.date);
        return date.toDateString() === today.toDateString();
      });

      if (hasToday) return i;
    }

    return 0;
  };

  const toggleWeekExpansion = (weekIndex) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [weekIndex]: !prev[weekIndex]
    }));
    console.debug('Toggled week expansion:', { weekIndex, expanded: !expandedWeeks[weekIndex] });
  };

  const weeks = groupByWeekStartingSunday(rosterData);
  const todaysDuty = getTodaysDuty();
  const yesterdaysDuty = getYesterdaysDuty();
  const tomorrowsDuty = getTomorrowsDuty();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">
            Loading your roster...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => {
              console.debug('Navigating back');
              router.back();
            }}
            className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6 transition-colors font-medium"
          >
            <FaArrowLeft className="mr-2" />
            Back to Roster
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded shadow-sm border border-gray-100">
                <FaUser className="text-indigo-600 text-xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  My Roster
                </h1>
                <p className="text-gray-600 mt-1">Schedule for {userName}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center bg-white px-4 py-2 rounded shadow-sm border border-gray-100">
                <FaCalendarAlt className="text-indigo-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">
                  {months.find(m => m.value === filters.month)?.label} {filters.year}
                </span>
              </div>

              <button
                onClick={() => {
                  setShowFilters(!showFilters);
                  console.debug('Toggled filters visibility:', !showFilters);
                }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded font-medium"
              >
                <FaFilter className="text-sm" />
                Filters
              </button>

              <button
                onClick={() => {
                  setShowShiftExchangeModal(true);
                  console.debug('Opened shift exchange modal');
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-medium shadow-md hover:bg-blue-700 transition-colors"
              >
                <GiCardExchange className="text-lg" />
                Shift Exchange
              </button>
              <button
                onClick={() => {
                  setShowTakeLeaveModal(true);
                  console.debug('Opened take leave modal');
                }}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded font-medium shadow-md hover:bg-red-700 transition-colors"
              >
                <FcLeave className="text-lg" />
                Take Leave
              </button>

              <button
                onClick={() => {
                  console.debug('Refreshing roster');
                  fetchMyRoster();
                }}
                className="p-3 bg-white rounded shadow-sm border border-gray-100 text-indigo-600"
              >
                <FaSyncAlt />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded shadow-lg p-6 mb-8 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  value={filters.month}
                  onChange={(e) => {
                    setFilters({ ...filters, month: parseInt(e.target.value) });
                    console.debug('Updated filter month:', e.target.value);
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                >
                  {months.map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select
                  value={filters.year}
                  onChange={(e) => {
                    setFilters({ ...filters, year: parseInt(e.target.value) });
                    console.debug('Updated filter year:', e.target.value);
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                >
                  {years.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    console.debug('Applying filters:', filters);
                    fetchMyRoster();
                    setShowFilters(false);
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded font-medium shadow-md"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Today, Yesterday & Tomorrow Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Yesterday's Duty */}
          <div className="bg-white rounded shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
              Yesterday&apos;s Duty
            </h2>
            {yesterdaysDuty ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-800">{yesterdaysDuty.shift}</p>
                  <p className="text-gray-600 mt-1">{new Intl.DateTimeFormat('en-GB', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric',
                    timeZone: 'Asia/Dhaka'
                  }).format(new Date(yesterdaysDuty.date))}</p>
                </div>
                <div className="text-4xl">
                  {shiftIcons[yesterdaysDuty.shift] || '📅'}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No duty scheduled for yesterday</p>
            )}
          </div>

          {/* Today's Duty */}
          <div className="bg-white rounded shadow-lg p-6 border border-gray-100 relative">
            {todaysDuty && isToday(todaysDuty.date) && (
              <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded">
                TODAY
              </span>
            )}
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              Today&apos;s Duty
            </h2>
            {todaysDuty ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-800">{todaysDuty.shift}</p>
                  <p className="text-gray-600 mt-1">{new Intl.DateTimeFormat('en-GB', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric',
                    timeZone: 'Asia/Dhaka'
                  }).format(new Date(todaysDuty.date))}</p>
                </div>
                <div className="text-4xl">
                  {shiftIcons[todaysDuty.shift] || '📅'}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No duty scheduled for today</p>
            )}
          </div>

          {/* Tomorrow's Duty */}
          <div className="bg-white rounded shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
              Tomorrow&apos;s Duty
            </h2>
            {tomorrowsDuty ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-800">{tomorrowsDuty.shift}</p>
                  <p className="text-gray-600 mt-1">{new Intl.DateTimeFormat('en-GB', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric',
                    timeZone: 'Asia/Dhaka'
                  }).format(new Date(tomorrowsDuty.date))}</p>
                </div>
                <div className="text-4xl">
                  {shiftIcons[tomorrowsDuty.shift] || '📅'}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No duty scheduled for tomorrow</p>
            )}
          </div>
        </div>

        {/* Roster Cards */}
        {rosterData.length > 0 ? (
          <div className="space-y-6">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="bg-white rounded shadow-lg overflow-hidden border border-gray-100">
                <button
                  onClick={() => toggleWeekExpansion(weekIndex)}
                  className="w-full p-6 border-b border-gray-100 flex justify-between items-center text-left hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Week {weekIndex + 1}</h3>
                    <p className="text-sm text-gray-600">
                      {formatDate(week[0].date)} - {formatDate(week[week.length - 1].date)}
                      <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                        {week.length} days
                      </span>
                    </p>
                  </div>
                  {expandedWeeks[weekIndex] ? (
                    <FaChevronUp className="text-gray-500" />
                  ) : (
                    <FaChevronDown className="text-gray-500" />
                  )}
                </button>

                {expandedWeeks[weekIndex] && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                    {week.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className={`rounded overflow-hidden border border-gray-200 transition-all ${isToday(day.date) ? 'ring-2 ring-yellow-600 ring-opacity-50 transform hover:scale-105' : 'hover:shadow-md'}`}
                      >
                        <div className={`p-4 bg-gradient-to-r ${shiftColors[day.shift] || 'from-gray-500 to-gray-600'} text-white`}>
                          <div className="flex justify-between items-center">
                            <div className="text-2xl">{shiftIcons[day.shift] || '📅'}</div>
                            {isToday(day.date) && (
                              <span className="text-xs text-yellow-600 font-bold bg-white bg-opacity-20 px-2 py-1 rounded">
                                TODAY
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold mt-2">{day.shift || 'Not assigned'}</h3>
                        </div>

                        <div className="p-4 bg-white">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-2xl font-bold text-gray-800">{formatDate(day.date)}</span>
                            <span className={`text-sm font-medium px-2 py-1 rounded ${isWeekend(day.day) ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                              {day.day}
                            </span>
                          </div>

                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                              </svg>
                              {new Intl.DateTimeFormat('en-GB', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                timeZone: 'Asia/Dhaka'
                              }).format(new Date(day.date))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded shadow-lg p-8 text-center border border-gray-100">
            <div className="mx-auto w-20 h-20 bg-gray-100 rounded flex items-center justify-center mb-6">
              <FaCalendarAlt className="text-gray-400 text-3xl" />
            </div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">No Roster Found</h3>
            <p className="text-gray-500 mb-6">
              No roster schedule found for {userName} in {months.find(m => m.value === filters.month)?.label} {filters.year}.
            </p>
            <button
              onClick={() => {
                setFilters({
                  year: new Date().getFullYear(),
                  month: new Date().getMonth() + 1
                });
                setShowFilters(true);
                console.debug('Reset filters to current month and opened filters');
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded font-medium shadow-md hover:bg-indigo-700 transition-colors"
            >
              Check Current Month
            </button>
          </div>
        )}

        {/* Shift Exchange Modal */}
        {showShiftExchangeModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white/95 backdrop-blur-lg rounded shadow-2xl w-full max-w-md mx-auto my-8 border border-blue-200/50">
              <div className="bg-gradient-to-r from-blue-600 rounded via-blue-500 to-blue-600 p-4 md:p-5 text-white">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl md:text-2xl font-bold flex items-center">
                    <GiCardExchange className="mr-2 md:mr-3 text-xl md:text-2xl" />
                    Shift Exchange
                  </h2>
                  <button
                    onClick={() => {
                      setShowShiftExchangeModal(false);
                      resetForm();
                      console.debug('Closed shift exchange modal');
                    }}
                    className="text-white/90 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                  >
                    <FaTimes className="text-lg md:text-xl" />
                  </button>
                </div>
                <p className="text-blue-100 mt-1 text-xs md:text-sm">Exchange your shift with a team member</p>
              </div>

              <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto">
                <div className="mb-4 md:mb-5">
                  <label className="block text-sm font-semibold text-gray-800 mb-1 md:mb-2">Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      if (e.target.value) fetchRosterByDate(e.target.value);
                      console.debug('Selected date:', e.target.value);
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white/80 text-sm md:text-base"
                  />
                </div>

                {loadingRoster && (
                  <div className="flex justify-center my-4 md:my-5">
                    <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                )}

                {dateRoster && !loadingRoster && (
                  <>
                    {/* Check if user's shift is OFFDAY */}
                    {dateRoster[userName.toLowerCase()] === 'OFFDAY' ? (
                      <div className="mb-4 md:mb-5 p-3 bg-red-100 border border-red-200 rounded">
                        <div className="flex items-center text-red-700">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                          </svg>
                          <span className="font-medium">Cannot Request Shift Exchange</span>
                        </div>
                        <p className="text-red-600 text-sm mt-1">Nice try! But you can’t trade a shift on your OFFDAY — that’s called a holiday. Please pick a day when you’re actually scheduled to work.</p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-4 md:mb-5">
                          <label className="block text-sm font-semibold text-gray-800 mb-1 md:mb-2">Your Shift</label>
                          <div className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded bg-gray-100/80 text-gray-800 font-medium text-sm md:text-base">
                            {dateRoster[userName.toLowerCase()] || 'Not assigned'}
                          </div>
                        </div>

                        <div className="mb-4 md:mb-5">
                          <label className="block text-sm font-semibold text-gray-800 mb-1 md:mb-2">Assign To</label>
                          <select
                            value={selectedUser}
                            onChange={(e) => {
                              setSelectedUser(e.target.value);
                              console.debug('Selected user for shift exchange:', e.target.value);
                            }}
                            className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm md:text-base"
                          >
                            <option value="" className="text-gray-500">Select a team member</option>
                            {teamMembers
                              .filter(member => member.toLowerCase() !== userName.toLowerCase())
                              .map(member => (
                                <option
                                  key={member}
                                  value={member}
                                  className="text-gray-900"
                                  disabled={dateRoster[member.toLowerCase()] === 'OFFDAY'}
                                >
                                  {member} {dateRoster[member.toLowerCase()] === 'OFFDAY' ? '(OFFDAY)' : ''}
                                </option>
                              ))}
                          </select>
                        </div>

                        {selectedUser && (
                          <>
                            {/* Check if selected user's shift is OFFDAY */}
                            {selectedUser && dateRoster && dateRoster[selectedUser.toLowerCase()] !== 'OFFDAY' && (
                              <div className="mb-4 md:mb-5 p-3 md:p-4 bg-blue-50 rounded border border-blue-100">
                                <label className="block text-sm font-semibold text-gray-800 mb-1 md:mb-2">Shift Exchange Details</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-sm font-medium text-gray-700">Your Shift</div>
                                    <div className="text-base font-semibold text-blue-800">
                                      {dateRoster[userName.toLowerCase()]} → {dateRoster[selectedUser.toLowerCase()]}
                                    </div>
                                    <div className="text-xs text-blue-600 mt-1">{userName}</div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-700">{selectedUser}&apos;s Shift</div>
                                    <div className="text-base font-semibold text-blue-800">
                                      {dateRoster[selectedUser.toLowerCase()]} → {dateRoster[userName.toLowerCase()]}
                                    </div>
                                    <div className="text-xs text-blue-600 mt-1">{selectedUser}</div>
                                  </div>
                                </div>
                                <p className="text-xs md:text-sm text-blue-600 mt-2">Shifts will be exchanged between you and {selectedUser}</p>
                              </div>
                            )}
                          </>
                        )}

                        <div className="mb-4 md:mb-5">
                          <label className="block text-sm font-semibold text-gray-800 mb-1 md:mb-2">Exchange Reason</label>
                          <textarea
                            value={exchangeReason}
                            onChange={(e) => {
                              setExchangeReason(e.target.value);
                              console.debug('Updated exchange reason:', e.target.value);
                            }}
                            className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm md:text-base"
                            rows={2}
                            placeholder="Please provide a reason for the shift exchange"
                          />
                        </div>

                        <div className="mb-4 md:mb-5">
                          <label className="block text-sm font-semibold text-gray-800 mb-1 md:mb-2">Task Handover</label>
                          <textarea
                            value={handoverTask}
                            onChange={(e) => {
                              setHandoverTask(e.target.value);
                              console.debug('Updated handover task:', e.target.value);
                            }}
                            placeholder="No Dependency"
                            className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm md:text-base"
                            rows={2}
                          />
                        </div>

                        <div className="mb-4 md:mb-5">
                          <label className="block text-sm font-semibold text-gray-800 mb-1 md:mb-2">Communicated Person</label>
                          <select
                            value={communicatedPerson}
                            onChange={(e) => {
                              setCommunicatedPerson(e.target.value);
                              console.debug('Updated communicated person:', e.target.value);
                            }}
                            className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm md:text-base"
                          >
                            <option value="" className="text-gray-500">Select a person</option>
                            <option value="Sizan" className="text-gray-900">Sizan</option>
                            <option value="Tanvir" className="text-gray-900">Tanvir</option>
                            <option value="Nazmul" className="text-gray-900">Nazmul</option>
                          </select>
                        </div>
                      </>
                    )}
                  </>
                )}

                <div className="flex justify-end gap-3 md:gap-4 mt-6 md:mt-8 pt-4 md:pt-5 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowShiftExchangeModal(false);
                    resetForm();
                    console.debug('Closed shift exchange modal');
                  }}
                  className="px-4 py-2 md:px-5 md:py-2.5 text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm md:text-base"
                  disabled={exchangeLoading} // Disable during loading
                >
                  Cancel
                </button>
                <button
                  onClick={handleShiftExchange}
                  disabled={
                    !selectedDate ||
                    !selectedUser ||
                    !exchangeReason ||
                    !communicatedPerson ||
                    loadingRoster ||
                    (dateRoster && dateRoster[userName.toLowerCase()] === 'OFFDAY') ||
                    (dateRoster && selectedUser && dateRoster[selectedUser.toLowerCase()] === 'OFFDAY') ||
                    exchangeLoading // Disable during loading
                  }
                  className="px-4 py-2 md:px-5 md:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg text-sm md:text-base flex items-center justify-center min-w-[120px]"
                >
                  {exchangeLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* Take Leave Modal */}
        {showTakeLeaveModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white/95 backdrop-blur-lg rounded shadow-2xl w-full max-w-md mx-auto my-8 border border-red-200/50">
              <div className="bg-gradient-to-r from-red-600 rounded via-red-500 to-red-600 p-4 md:p-5 text-white">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl md:text-2xl font-bold flex items-center">
                    <FcLeave className="mr-2 md:mr-3 text-xl md:text-2xl" />
                    Take Leave
                  </h2>
                  <button
                    onClick={() => {
                      setShowTakeLeaveModal(false);
                      resetForm();
                      console.debug('Closed take leave modal');
                    }}
                    className="text-white/90 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                  >
                    <FaTimes className="text-lg md:text-xl" />
                  </button>
                </div>
                <p className="text-red-100 mt-1 text-xs md:text-sm">Request leave and assign your shift if needed</p>
              </div>

              <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto">
                <div className="mb-4 md:mb-5">
                  <label className="block text-sm font-semibold text-gray-800 mb-1 md:mb-2">Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      if (e.target.value) fetchRosterByDate(e.target.value);
                      console.debug('Selected date for leave:', e.target.value);
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 bg-white/80 text-sm md:text-base"
                  />
                </div>

                {loadingRoster && (
                  <div className="flex justify-center my-4 md:my-5">
                    <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-t-2 border-b-2 border-red-500"></div>
                  </div>
                )}

                {dateRoster && !loadingRoster && (
                  <>
                    {/* Check if user's shift is OFFDAY */}
                    {dateRoster[userName.toLowerCase()] === 'OFFDAY' ? (
                      <div className="mb-4 md:mb-5 p-3 bg-red-100 border border-red-200 rounded">
                        <div className="flex items-center text-red-700">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                          </svg>
                          <span className="font-medium">Cannot Request Leave</span>
                        </div>
                        <p className="text-red-600 text-sm mt-1">Requesting leave on your OFFDAY? That’s like asking for a vacation during a vacation. Please select a working day instead.</p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-4 md:mb-5">
                          <label className="block text-sm font-semibold text-gray-800 mb-1 md:mb-2">Your Shift</label>
                          <div className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded bg-gray-100/80 text-gray-800 font-medium text-sm md:text-base">
                            {dateRoster[userName.toLowerCase()] || 'Not assigned'}
                          </div>
                        </div>

                        <div className="mb-4 md:mb-5">
                          <label className="block text-sm font-semibold text-gray-800 mb-1 md:mb-2">Assign To</label>
                          <select
                            value={selectedUser}
                            onChange={(e) => {
                              setSelectedUser(e.target.value);
                              console.debug('Selected user for leave:', e.target.value);
                            }}
                            className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 bg-white text-sm md:text-base"
                          >
                            <option value="" className="text-gray-500">Select a team member</option>
                            <option value="None" className="text-gray-900">None</option>
                            {teamMembers
                              .filter(member => member.toLowerCase() !== userName.toLowerCase())
                              .map(member => (
                                <option
                                  key={member}
                                  value={member}
                                  className="text-gray-900"
                                  disabled={dateRoster[member.toLowerCase()] === 'OFFDAY'}
                                >
                                  {member} {dateRoster[member.toLowerCase()] === 'OFFDAY' ? '(OFFDAY)' : ''}
                                </option>
                              ))}
                          </select>
                        </div>

                        {selectedUser && selectedUser !== 'None' && dateRoster && dateRoster[selectedUser.toLowerCase()] !== 'OFFDAY' && (
                            <div className="mb-4 md:mb-5 p-3 md:p-4 bg-red-50 rounded border border-red-100">
                              <label className="block text-sm font-semibold text-gray-800 mb-1 md:mb-2">Shift Assignment Details</label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="text-sm font-medium text-gray-700">Your Shift</div>
                                  <div className="text-base font-semibold text-red-800">
                                    {dateRoster[userName.toLowerCase()]} → LEAVE
                                  </div>
                                  <div className="text-xs text-red-600 mt-1">{userName}</div>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-700">{selectedUser}&apos;s Shift</div>
                                  <div className="text-base font-semibold text-red-800">
                                    {dateRoster[selectedUser.toLowerCase()]} → {dateRoster[userName.toLowerCase()]}
                                  </div>
                                  <div className="text-xs text-red-600 mt-1">{selectedUser}</div>
                                </div>
                              </div>
                              <p className="text-xs md:text-sm text-red-600 mt-2">{selectedUser} will take your shift</p>
                            </div>
                          )}

                        <div className="mb-4 md:mb-5">
                          <label className="block text-sm font-semibold text-gray-800 mb-1 md:mb-2">Leave Reason</label>
                          <textarea
                            value={leaveReason}
                            onChange={(e) => {
                              setLeaveReason(e.target.value);
                              console.debug('Updated leave reason:', e.target.value);
                            }}
                            className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 text-sm md:text-base"
                            rows={2}
                            placeholder="Please provide a reason for your leave"
                          />
                        </div>

                        <div className="mb-4 md:mb-5">
                          <label className="block text-sm font-semibold text-gray-800 mb-1 md:mb-2">Task Handover</label>
                          <textarea
                            value={handoverTask}
                            onChange={(e) => {
                              setHandoverTask(e.target.value);
                              console.debug('Updated handover task for leave:', e.target.value);
                            }}
                            placeholder="No Dependency"
                            className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 text-sm md:text-base"
                            rows={2}
                          />
                        </div>

                        <div className="mb-4 md:mb-5">
                          <label className="block text-sm font-semibold text-gray-800 mb-1 md:mb-2">Communicated Person</label>
                          <select
                            value={communicatedPerson}
                            onChange={(e) => {
                              setCommunicatedPerson(e.target.value);
                              console.debug('Updated communicated person for leave:', e.target.value);
                            }}
                            className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 text-sm md:text-base"
                          >
                            <option value="" className="text-gray-500">Select a person</option>
                            <option value="Sizan" className="text-gray-900">Sizan</option>
                            <option value="Tanvir" className="text-gray-900">Tanvir</option>
                            <option value="Nazmul" className="text-gray-900">Nazmul</option>
                          </select>
                        </div>
                      </>
                    )}
                  </>
                )}

                <div className="flex justify-end gap-3 md:gap-4 mt-6 md:mt-8 pt-4 md:pt-5 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowTakeLeaveModal(false);
                    resetForm();
                    console.debug('Closed take leave modal');
                  }}
                  className="px-4 py-2 md:px-5 md:py-2.5 text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm md:text-base"
                  disabled={leaveLoading} // Disable during loading
                >
                  Cancel
                </button>
                <button
                  onClick={handleTakeLeave}
                  disabled={
                    !selectedDate ||
                    !leaveReason ||
                    !communicatedPerson ||
                    loadingRoster ||
                    (dateRoster && dateRoster[userName.toLowerCase()] === 'OFFDAY') ||
                    (dateRoster && selectedUser && selectedUser !== 'None' && dateRoster[selectedUser.toLowerCase()] === 'OFFDAY') ||
                    leaveLoading // Disable during loading
                  }
                  className="px-4 py-2 md:px-5 md:py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg text-sm md:text-base flex items-center justify-center min-w-[120px]"
                >
                  {leaveLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}