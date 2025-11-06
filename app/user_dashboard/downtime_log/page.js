// app/user_dashboard/downtime_log/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  FaSearch, FaFilter, FaSort, FaCalendarAlt, 
  FaClock, FaChartBar, FaExclamationTriangle, 
  FaSync, FaArrowUp, FaArrowDown, FaList,
  FaInfoCircle, FaTimes, FaTicketAlt, FaFileExcel,
  FaNetworkWired, FaDatabase, FaStickyNote, FaUser,
  FaServer, FaMobile, FaGlobe, FaEnvelope, FaCog,
  FaExternalLinkAlt, FaCalendar, FaUserCircle,
  FaChartPie, FaHistory, FaSignal, FaLayerGroup, FaChevronDown, FaChevronUp, FaCalendarCheck
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import SmallSpinner from '../../components/SmallSpinner';
import { exportDowntimeToExcel } from '../../../lib/exportToExcel';

// Force dynamic rendering to bypass prerendering
export const dynamic = 'force-dynamic';

// Helper to generate consistent color from ID
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 95%)`; // Light pastel colors
};

// Format duration
const formatDuration = (duration) => {
  if (!duration) return 'N/A';
  
  if (typeof duration === 'object') {
    const hours = duration.hours || 0;
    const minutes = duration.minutes || 0;
    const seconds = duration.seconds || 0;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return minutes > 0 ? `${minutes}m ${seconds}s` : '<1m';
  }
  
  if (typeof duration === 'string') {
    const parts = duration.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
      if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
      return minutes > 0 ? `${minutes}m ${seconds}s` : '<1m';
    }
    return duration;
  }
  
  return 'N/A';
};

// Map MNO to short names - handle comma-separated values
const getMNOShortName = (mno) => {
  if (!mno) return 'N/A';
  
  const mnoMap = {
    'ALL': 'ALL',
    'GRAMEENPHONE': 'GP',
    'ROBI/AIRTEL': 'RB/AT', 
    'BANGLALINK': 'BL',
    'TELETALK': 'TT'
  };
  
  if (mno.includes(',')) {
    return mno.split(',').map(item => 
      mnoMap[item.trim()] || item.trim()
    ).join(', ');
  }
  
  return mnoMap[mno] || mno;
};

// Map Channel to short names - handle comma-separated values
const getChannelShortName = (channel) => {
  if (!channel) return 'N/A';
  
  const channelMap = {
    'ALL': 'ALL',
    'APP': 'APP',
    'USSD': 'USSD', 
    'WEB': 'WEB',
    'SMS': 'SMS',
    'MIDDLEWARE': 'MW',
    'INWARD SERVICE': 'INWARD'
  };
  
  if (channel.includes(',')) {
    return channel.split(',').map(item => 
      channelMap[item.trim()] || item.trim()
    ).join(', ');
  }
  
  return channelMap[channel] || channel;
};

const DowntimeLog = () => {
  const [downtimes, setDowntimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    impactType: '',
    modality: '',
    reliability: '',
    channel: '',
    affectedMNO: '',
    startDate: null,
    endDate: null,
    timeRange: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'start_date_time',
    direction: 'DESC'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0
  });
  const [selectedDowntime, setSelectedDowntime] = useState(null);
  const [filterExpanded, setFilterExpanded] = useState(false);
  
  const colorMap = useRef(new Map());

  // Custom DatePicker Input Component - add this before the DowntimeLog component
const CustomDateInput = ({ value, onClick, placeholder }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full px-3 py-2.5 text-left bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-sm flex items-center justify-between hover:border-gray-400 transition-colors"
  >
    <span className={value ? "text-gray-800" : "text-gray-500"}>
      {value || placeholder}
    </span>
    <FaCalendarCheck className="text-gray-400 text-sm" />
  </button>
);

// Count active filters for the badge
const activeFilterCount = Object.values(filters).filter(value => 
  value !== '' && value !== null && value !== undefined
).length - (filters.timeRange === 'custom' ? 0 : 2); // Adjust for date fields when not in custom mode

  const categories = [
    'SEND MONEY', 'CASHOUT', 'BILL PAYMENT', 'EMI PAYMENT', 
    'MERCHANT PAYMENT', 'MOBILE RECHARGE', 'ADD MONEY', 
    'TRANSFER MONEY', 'B2B', 'B2M', 'CASHIN', 
    'TRANSACTION HISTORY', 'KYC', 'REGISTRATION', 'DEVICE CHANGE',
    'E-COM PAYMENT', 'PROFILE VISIBILITY', 'BLOCK OPERATION', 'LIFTING',
    'REFUND', 'DISBURSEMENT', 'REVERSAL', 'KYC OPERATIONS', 'PARTNER REGISTRATION', 'CLAWBACK',
    'REMITTANCE', 'BANK TO NAGAD'
  ];
  
  const impactTypes = ['FULL', 'PARTIAL'];
  const modalities = ['PLANNED', 'UNPLANNED'];
  const reliabilityOptions = ['YES', 'NO'];
  const channelOptions = [
    { value: 'APP', label: 'APP', icon: <FaMobile className="text-blue-500" /> },
    { value: 'USSD', label: 'USSD', icon: <FaMobile className="text-green-500" /> },
    { value: 'WEB', label: 'WEB', icon: <FaGlobe className="text-purple-500" /> },
    { value: 'SMS', label: 'SMS', icon: <FaEnvelope className="text-yellow-500" /> },
    { value: 'MIDDLEWARE', label: 'MIDDLEWARE', icon: <FaCog className="text-gray-500" /> },
    { value: 'INWARD SERVICE', label: 'INWARD SERVICE', icon: <FaServer className="text-red-500" /> }
  ];
  const mnoOptions = ['ALL', 'GRAMEENPHONE', 'ROBI/AIRTEL', 'BANGLALINK', 'TELETALK'];

  const timeRangeOptions = [
    { value: '', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...filters,
        startDate: filters.startDate ? filters.startDate.toISOString() : '',
        endDate: filters.endDate ? filters.endDate.toISOString() : '',
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
        page: pagination.page,
        limit: pagination.limit
      });
      
      const response = await fetch(`/api/user_dashboard/downtime_log?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        colorMap.current.clear();
        data.downtimes.forEach(d => {
          if (!colorMap.current.has(d.downtime_id)) {
            colorMap.current.set(d.downtime_id, stringToColor(d.downtime_id));
          }
        });
        
        setDowntimes(data.downtimes);
        setSummary(data.summary);
        setPagination(prev => ({
          ...prev,
          total: data.total
        }));
      } else {
        throw new Error(data.message || 'Failed to fetch data');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load downtime log');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDowntimesById = async (downtimeId) => {
    try {
      const response = await fetch(`/api/user_dashboard/downtime_log?downtimeId=${encodeURIComponent(downtimeId)}`);
      const data = await response.json();
      
      if (response.ok) {
        return data.downtimes;
      } else {
        throw new Error(data.message || 'Failed to fetch downtimes for ID');
      }
    } catch (error) {
      console.error('Fetch downtimes by ID error:', error);
      throw error;
    }
  };

  const fetchDowntimesByTimeRange = async (timeRange) => {
    try {
      const params = new URLSearchParams({
        timeRange: timeRange,
        page: 1,
        limit: 100000 // Large number to get all records
      });
      
      const response = await fetch(`/api/user_dashboard/downtime_log?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        return data.downtimes;
      } else {
        throw new Error(data.message || 'Failed to fetch downtimes');
      }
    } catch (error) {
      console.error('Fetch downtimes by time range error:', error);
      throw error;
    }
  };

  const fetchAllDowntimes = async () => {
    try {
      const params = new URLSearchParams({
        page: 1,
        limit: 100000 // Large number to get all records
      });
      
      const response = await fetch(`/api/user_dashboard/downtime_log?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        return data.downtimes;
      } else {
        throw new Error(data.message || 'Failed to fetch downtimes');
      }
    } catch (error) {
      console.error('Fetch all downtimes error:', error);
      throw error;
    }
  };

  const fetchFilteredDowntimes = async () => {
    try {
      const params = new URLSearchParams({
        ...filters,
        startDate: filters.startDate ? filters.startDate.toISOString() : '',
        endDate: filters.endDate ? filters.endDate.toISOString() : '',
        page: 1,
        limit: 100000 // Large number to get all records
      });
      
      const response = await fetch(`/api/user_dashboard/downtime_log?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        return data.downtimes;
      } else {
        throw new Error(data.message || 'Failed to fetch downtimes');
      }
    } catch (error) {
      console.error('Fetch filtered downtimes error:', error);
      throw error;
    }
  };

  const handleExportAll = async () => {
    try {
      toast.loading('Exporting all downtimes...');
      const allDowntimes = await fetchAllDowntimes();
      await exportDowntimeToExcel(allDowntimes);
      toast.dismiss();
      toast.success('All downtimes exported successfully!');
    } catch (error) {
      toast.dismiss();
      toast.error(error.message || 'Failed to export downtimes');
    }
  };

  const handleExportByTimeRange = async (timeRange, label) => {
    try {
      toast.loading(`Exporting ${label}...`);
      const downtimes = await fetchDowntimesByTimeRange(timeRange);
      await exportDowntimeToExcel(downtimes);
      toast.dismiss();
      toast.success(`${label} exported successfully!`);
    } catch (error) {
      toast.dismiss();
      toast.error(error.message || `Failed to export ${label}`);
    }
  };

  const handleExportFiltered = async () => {
    try {
      toast.loading('Exporting filtered downtimes...');
      const filteredDowntimes = await fetchFilteredDowntimes();
      await exportDowntimeToExcel(filteredDowntimes);
      toast.dismiss();
      toast.success('Filtered downtimes exported successfully!');
    } catch (error) {
      toast.dismiss();
      toast.error(error.message || 'Failed to export filtered downtimes');
    }
  };

  const isCustomDateRangeActive = filters.startDate && filters.endDate;

  useEffect(() => {
    fetchData();
  }, [filters, sortConfig, pagination.page, pagination.limit]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
    
    if (name === 'timeRange' && value !== 'custom') {
      setFilters(prev => ({
        ...prev,
        startDate: null,
        endDate: null
      }));
    }
  };

  const requestSort = (key) => {
    let direction = 'ASC';
    if (sortConfig.key === key && sortConfig.direction === 'ASC') {
      direction = 'DESC';
    }
    setSortConfig({ key, direction });
  };

  const changePage = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      impactType: '',
      modality: '',
      reliability: '',
      channel: '',
      affectedMNO: '',
      startDate: null,
      endDate: null,
      timeRange: ''
    });
    setSortConfig({ key: 'start_date_time', direction: 'DESC' });
    setPagination({ page: 1, limit: 12, total: 0 });
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const startItem = (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
                <FaList className="mr-3 text-blue-600" />
                Downtime Log
              </h1>
              <p className="text-gray-600 mt-1">
                View and manage all reported downtime incidents
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => fetchData()}
                className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                <FaSync className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Updated Summary Section */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {/* Total Downtimes Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded p-5 shadow-md border border-blue-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wide">Total Downtimes</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalDowntimes}</p>
                  <p className="text-xs text-blue-600 mt-2">Unique downtime incidents</p>
                </div>
                <div className="p-3 rounded bg-white shadow-sm">
                  <FaExclamationTriangle className="text-blue-600 text-xl" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-blue-200 border-dashed">
                <button
                  onClick={handleExportAll}
                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  <FaFileExcel /> Export All
                </button>
              </div>
            </div>
            
            {/* This Week Count Card - NEW */}
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded p-5 shadow-md border border-cyan-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-cyan-800 uppercase tracking-wide">This Week</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{summary.thisWeekCount || 0}</p>
                  <p className="text-xs text-cyan-600 mt-2">Downtimes this week</p>
                </div>
                <div className="p-3 rounded bg-white shadow-sm">
                  <FaCalendar className="text-cyan-600 text-xl" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-cyan-200 border-dashed">
                <button
                  onClick={() => handleExportByTimeRange('thisWeek', 'This Week Downtimes')}
                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-cyan-600 text-white rounded text-xs font-medium hover:bg-cyan-700 transition-colors"
                >
                  <FaFileExcel /> Export
                </button>
              </div>
            </div>
            
            {/* Last Week Count Card */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded p-5 shadow-md border border-purple-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-purple-800 uppercase tracking-wide">Last Week</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{summary.lastWeekCount}</p>
                  <p className="text-xs text-purple-600 mt-2">Downtimes last week</p>
                </div>
                <div className="p-3 rounded bg-white shadow-sm">
                  <FaCalendar className="text-purple-600 text-xl" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-purple-200 border-dashed">
                <button
                  onClick={() => handleExportByTimeRange('lastWeek', 'Last Week Downtimes')}
                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 transition-colors"
                >
                  <FaFileExcel /> Export
                </button>
              </div>
            </div>
            
            {/* This Month Count Card */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded p-5 shadow-md border border-green-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide">This Month</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{summary.thisMonthCount}</p>
                  <p className="text-xs text-green-600 mt-2">Downtimes this month</p>
                </div>
                <div className="p-3 rounded bg-white shadow-sm">
                  <FaCalendarAlt className="text-green-600 text-xl" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-green-200 border-dashed">
                <button
                  onClick={() => handleExportByTimeRange('thisMonth', 'This Month Downtimes')}
                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                >
                  <FaFileExcel /> Export
                </button>
              </div>
            </div>
            
            {/* Total Duration Card */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded p-5 shadow-md border border-amber-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">Total Duration</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalDuration}</p>
                  <p className="text-sm font-medium text-amber-700 mt-1">{summary.totalDurationMinutes} minutes</p>
                </div>
                <div className="p-3 rounded bg-white shadow-sm">
                  <FaClock className="text-amber-600 text-xl" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-200 border-dashed">
                <div className="flex items-center text-xs text-amber-700">
                  <FaSignal className="mr-1" />
                  <span>Cumulative downtime</span>
                </div>
              </div>
            </div>

            {/* Current Week Duration Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded p-5 shadow-md border border-indigo-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">This Week</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{summary.currentWeekDuration}</p>
                  <p className="text-sm font-medium text-indigo-700 mt-1">{summary.currentWeekMinutes} minutes</p>
                  <p className="text-xs text-indigo-600 mt-1">{summary.currentWeekRange}</p>
                </div>
                <div className="p-3 rounded bg-white shadow-sm">
                  <FaCalendar className="text-indigo-600 text-xl" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-200 border-dashed">
                <div className="flex items-center text-xs text-indigo-700">
                  <FaChartBar className="mr-1" />
                  <span>This week&apos;s downtime</span>
                </div>
              </div>
            </div>

            {/* Previous Week Duration Card */}
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded p-5 shadow-md border border-pink-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-pink-800 uppercase tracking-wide">Last Week</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{summary.previousWeekDuration}</p>
                  <p className="text-sm font-medium text-pink-700 mt-1">{summary.previousWeekMinutes} minutes</p>
                  <p className="text-xs text-pink-600 mt-1">{summary.previousWeekRange}</p>
                </div>
                <div className="p-3 rounded bg-white shadow-sm">
                  <FaHistory className="text-pink-600 text-xl" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-pink-200 border-dashed">
                <div className="flex items-center text-xs text-pink-700">
                  <FaChartBar className="mr-1" />
                  <span>Previous week downtime</span>
                </div>
              </div>
            </div>

            {/* This Month Duration Card */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded p-5 shadow-md border border-teal-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-teal-800 uppercase tracking-wide">This Month</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{summary.currentMonthDuration}</p>
                  <p className="text-sm font-medium text-teal-700 mt-1">{summary.currentMonthMinutes} minutes</p>
                  <p className="text-xs text-teal-600 mt-1">{summary.currentMonthRange}</p>
                </div>
                <div className="p-3 rounded bg-white shadow-sm">
                  <FaCalendarAlt className="text-teal-600 text-xl" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-teal-200 border-dashed">
                <div className="flex items-center text-xs text-teal-700">
                  <FaChartBar className="mr-1" />
                  <span>This month&apos;s downtime</span>
                </div>
              </div>
            </div>

            {/* Top Channels Card 
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded p-4 shadow-sm border border-orange-200">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-orange-800 uppercase tracking-wide">Top Channels</h3>
                <div className="p-3 rounded bg-white shadow-sm">
                  <FaChartPie className="text-orange-600 text-xl" />
                </div>
              </div>
              
              <div className="space-y-2">
                {summary.topChannels && summary.topChannels.length > 0 ? (
                  summary.topChannels.map((ch, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/80 py-1.5 px-2.5 rounded shadow-xs">
                      <div className="flex items-center">
                        <span className={`w-1.5 h-1.5 rounded mr-2 ${
                          index === 0 ? 'bg-orange-500' : 
                          index === 1 ? 'bg-orange-400' : 'bg-orange-300'
                        }`}></span>
                        <span className="text-xs font-medium text-gray-800 truncate">{ch.channel}</span>
                      </div>
                      <span className="bg-orange-500 text-white font-bold text-xs px-1.5 py-0.5 rounded min-w-[1.5rem] text-center">
                        {ch.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 text-center py-2">No data</div>
                )}
              </div>
              
              <div className="mt-3 pt-2 border-t border-orange-200 border-dashed">
                <div className="flex items-center text-xs text-orange-700">
                  <FaChartBar className="mr-1 text-xs" />
                  <span>Most affected channels</span>
                </div>
              </div>
            </div>
            */}
          </div>
        )}
        
        

        {/* Filter Section */}
<div className="bg-white rounded shadow-lg mb-6 overflow-hidden border border-gray-200">
  {/* Filter Header */}
  <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <FaFilter className="text-blue-600 text-lg" />
          <h2 className="text-xl font-bold text-gray-900">Filters</h2>
        </div>
        {activeFilterCount > 0 && (
          <span className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
            {activeFilterCount} active
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setFilterExpanded(!filterExpanded)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
        >
          {filterExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
          {filterExpanded ? 'Hide Filters' : 'Show Filters'}
        </button>
        
        <button 
          onClick={resetFilters}
          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          Reset All
        </button>
      </div>
    </div>
  </div>

  {/* Search and Quick Actions - Always Visible */}
  <div className="p-4 border-b border-gray-200">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by ID, title, category, or description..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-sm bg-white shadow-sm"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={handleExportFiltered}
          disabled={!isCustomDateRangeActive}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded transition-colors text-sm font-medium shadow-sm ${
            isCustomDateRangeActive 
              ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 cursor-pointer' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          title={!isCustomDateRangeActive ? 'Select custom date range to export' : 'Export filtered data'}
        >
          <FaFileExcel />
          Export Filtered
        </button>
      </div>
    </div>
  </div>

  {/* Expandable Filter Controls */}
  {filterExpanded && (
    <div className="p-6 bg-gray-50/50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Time Range Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            <FaClock className="inline mr-2 text-blue-500 text-sm" />
            Time Range
          </label>
          <select
            value={filters.timeRange}
            onChange={(e) => handleFilterChange('timeRange', e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-sm shadow-sm"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* Custom Date Range */}
        {filters.timeRange === 'custom' && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                <FaCalendar className="inline mr-2 text-green-500 text-sm" />
                Start Date
              </label>
              <DatePicker
                selected={filters.startDate}
                onChange={(date) => handleFilterChange('startDate', date)}
                selectsStart
                startDate={filters.startDate}
                endDate={filters.endDate}
                customInput={<CustomDateInput placeholder="Select start date" />}
                popperClassName="!z-[9999]"
                popperPlacement="bottom-start"
                showPopperArrow={false}
                calendarClassName="!border !border-gray-200 !shadow-xl !rounded !p-3"
                dayClassName={() => "!text-sm !py-2 hover:!bg-blue-50 rounded"}
                wrapperClassName="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                <FaCalendar className="inline mr-2 text-red-500 text-sm" />
                End Date
              </label>
              <DatePicker
                selected={filters.endDate}
                onChange={(date) => handleFilterChange('endDate', date)}
                selectsEnd
                startDate={filters.startDate}
                endDate={filters.endDate}
                minDate={filters.startDate}
                customInput={<CustomDateInput placeholder="Select end date" />}
                popperClassName="!z-[9999]"
                popperPlacement="bottom-start"
                showPopperArrow={false}
                calendarClassName="!border !border-gray-200 !shadow-xl !rounded !p-3"
                dayClassName={() => "!text-sm !py-2 hover:!bg-blue-50 rounded"}
                wrapperClassName="w-full"
              />
            </div>
          </>
        )}

        {/* Category Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            <FaList className="inline mr-2 text-purple-500 text-sm" />
            Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-sm shadow-sm"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Impact Type Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            <FaExclamationTriangle className="inline mr-2 text-orange-500 text-sm" />
            Impact Type
          </label>
          <select
            value={filters.impactType}
            onChange={(e) => handleFilterChange('impactType', e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-sm shadow-sm"
          >
            <option value="">All Types</option>
            {impactTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Modality Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            <FaCog className="inline mr-2 text-indigo-500 text-sm" />
            Modality
          </label>
          <select
            value={filters.modality}
            onChange={(e) => handleFilterChange('modality', e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-sm shadow-sm"
          >
            <option value="">All Modalities</option>
            {modalities.map(mod => (
              <option key={mod} value={mod}>{mod}</option>
            ))}
          </select>
        </div>

        {/* Reliability Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            <FaChartBar className="inline mr-2 text-teal-500 text-sm" />
            Reliability Impacted
          </label>
          <select
            value={filters.reliability}
            onChange={(e) => handleFilterChange('reliability', e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-sm shadow-sm"
          >
            <option value="">All</option>
            {reliabilityOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Channel Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            <FaNetworkWired className="inline mr-2 text-cyan-500 text-sm" />
            Affected Channel
          </label>
          <select
            value={filters.channel}
            onChange={(e) => handleFilterChange('channel', e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-sm shadow-sm"
          >
            <option value="">All Channels</option>
            {channelOptions.map(channel => (
              <option key={channel.value} value={channel.value}>{channel.label}</option>
            ))}
          </select>
        </div>

        {/* MNO Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            <FaMobile className="inline mr-2 text-pink-500 text-sm" />
            Affected MNO
          </label>
          <select
            value={filters.affectedMNO}
            onChange={(e) => handleFilterChange('affectedMNO', e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-sm shadow-sm"
          >
            <option value="">All MNOs</option>
            {mnoOptions.map(mno => (
              <option key={mno} value={mno}>
                {getMNOShortName(mno)} ({mno})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Filter Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Filters:</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleFilterChange('timeRange', 'today')}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200 transition-colors border border-blue-200"
          >
            Today
          </button>
          <button
            onClick={() => handleFilterChange('timeRange', 'thisWeek')}
            className="px-4 py-2 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200 transition-colors border border-green-200"
          >
            This Week
          </button>
          <button
            onClick={() => handleFilterChange('modality', 'UNPLANNED')}
            className="px-4 py-2 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 transition-colors border border-red-200"
          >
            Unplanned Only
          </button>
          <button
            onClick={() => handleFilterChange('impactType', 'FULL')}
            className="px-4 py-2 bg-orange-100 text-orange-700 rounded text-sm font-medium hover:bg-orange-200 transition-colors border border-orange-200"
          >
            Full Impact Only
          </button>
          <button
            onClick={() => handleFilterChange('reliability', 'YES')}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded text-sm font-medium hover:bg-purple-200 transition-colors border border-purple-200"
          >
            Reliability Impacted
          </button>
        </div>
      </div>
    </div>
  )}
</div>

        <div className="bg-white rounded shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs border border-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-[5]">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">S/N</th>
                  <th 
                    className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200 cursor-pointer"
                    onClick={() => requestSort('downtime_id')}
                  >
                    <div className="flex items-center">
                      ID
                      {sortConfig.key === 'downtime_id' && (
                        sortConfig.direction === 'ASC' ? 
                        <FaArrowUp className="ml-1" size={10} /> : 
                        <FaArrowDown className="ml-1" size={10} />
                      )}
                    </div>
                  </th>
                  <th className="px-1 py-1 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">Date</th>
                  <th className="px-1 py-1 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">Title</th>
                  <th className="px-1 py-1 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">Channel</th>
                  <th className="px-1 py-1 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">MNO</th>
                  <th className="px-1 py-1 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">Category</th>
                  <th 
                    className="px-1 py-1 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200 cursor-pointer"
                    onClick={() => requestSort('start_date_time')}
                  >
                    <div className="flex items-center">
                      Start Date/Time
                      {sortConfig.key === 'start_date_time' && (
                        sortConfig.direction === 'ASC' ? 
                        <FaArrowUp className="ml-1" size={10} /> : 
                        <FaArrowDown className="ml-1" size={10} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-1 py-1 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200 cursor-pointer"
                    onClick={() => requestSort('end_date_time')}
                  >
                    <div className="flex items-center">
                      End Date/Time
                      {sortConfig.key === 'end_date_time' && (
                        sortConfig.direction === 'ASC' ? 
                        <FaArrowUp className="ml-1" size={10} /> : 
                        <FaArrowDown className="ml-1" size={10} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-1 py-1 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200 cursor-pointer"
                    onClick={() => requestSort('duration')}
                  >
                    <div className="flex items-center">
                      Duration
                      {sortConfig.key === 'duration' && (
                        sortConfig.direction === 'ASC' ? 
                        <FaArrowUp className="ml-1" size={10} /> : 
                        <FaArrowDown className="ml-1" size={10} />
                      )}
                    </div>
                  </th>
                  <th className="px-1 py-1 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">Impact</th>
                  <th className="px-1 py-1 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">Modality</th>
                  <th className="px-1 py-1 text-left font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {downtimes.map((downtime) => {
                  const bgColor = colorMap.current.get(downtime.downtime_id) || '#ffffff';
                  
                  return (
                    <tr 
                      key={downtime.serial} 
                      className="hover:bg-opacity-80 transition-colors"
                      style={{ backgroundColor: bgColor }}
                    >
                      <td className="px-1 py-2 whitespace-nowrap font-medium text-gray-900 border-r border-gray-200">
                        {downtime.serial}
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap text-gray-900 font-medium border-r border-gray-200">
                        {downtime.downtime_id}
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap text-gray-900 border-r border-gray-200">
                        {downtime.issue_date}
                      </td>
                      <td className="px-1 py-2 text-gray-900 border-r border-gray-200 max-w-[150px] truncate" title={downtime.issue_title}>
                        {downtime.issue_title}
                      </td>
                      <td className="px-1 py-2 border-r border-gray-200">
                        <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800 text-xs break-words">
                          {getChannelShortName(downtime.affected_channel)}
                        </span>
                      </td>
                      <td className="px-1 py-2 border-r border-gray-200">
                        <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-xs break-words">
                          {getMNOShortName(downtime.affected_mno)}
                        </span>
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap border-r border-gray-200">
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-xs">
                          {downtime.category}
                        </span>
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap text-gray-900 border-r border-gray-200">
                        {downtime.formattedStart}
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap text-gray-900 border-r border-gray-200">
                        {downtime.formattedEnd}
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap font-medium text-gray-900 border-r border-gray-200">
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                          {downtime.formattedDuration}
                        </span>
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap border-r border-gray-200">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          downtime.impact_type === 'FULL' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {downtime.impact_type}
                        </span>
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap border-r border-gray-200">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          downtime.modality === 'UNPLANNED' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {downtime.modality}
                        </span>
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap text-center">
                        <button 
                          onClick={() => setSelectedDowntime(downtime)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View details"
                        >
                          <FaInfoCircle />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {downtimes.length === 0 && !loading && (
            <div className="py-12 text-center">
              <div className="text-gray-500 mb-2">No downtime records found</div>
              <button 
                onClick={resetFilters}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Clear filters
              </button>
            </div>
          )}
          
          {loading && (
            <div className="py-12 text-center">
              <SmallSpinner />
              <p className="mt-2 text-gray-500">Loading downtime records...</p>
            </div>
          )}
          
          {downtimes.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="text-xs text-gray-700">
                  Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of{' '}
                  <span className="font-medium">{pagination.total}</span> records
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={pagination.limit}
                    onChange={(e) => setPagination(prev => ({
                      ...prev,
                      limit: parseInt(e.target.value),
                      page: 1
                    }))}
                    className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-800"
                  >
                    <option value="12">12 per page</option>
                    <option value="20">20 per page</option>
                    <option value="50">50 per page</option>
                    <option value="100">100 per page</option>
                  </select>
                  
                  <nav className="flex items-center gap-1">
                    <button
                      onClick={() => changePage(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className={`px-2 py-1 rounded text-xs ${
                        pagination.page === 1 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Prev
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => changePage(pageNum)}
                          className={`px-2 py-1 rounded text-xs ${
                            pagination.page === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => changePage(pagination.page + 1)}
                      disabled={pagination.page === totalPages}
                      className={`px-2 py-1 rounded text-xs ${
                        pagination.page === totalPages 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {selectedDowntime && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-3 z-50">
            <div className="relative bg-white rounded shadow-lg w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col border border-gray-200">
              
              <div className="px-4 py-3 bg-white border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded ${selectedDowntime.modality === 'UNPLANNED' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <h2 className="text-lg font-semibold text-gray-800">Downtime Details</h2>
                </div>
                <button 
                  onClick={() => setSelectedDowntime(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <FaTimes className="text-lg" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-100">
                  <h3 className="text-base font-medium text-gray-800 mb-1">{selectedDowntime.issue_title}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-white rounded text-gray-700 border border-gray-200">
                      ID: {selectedDowntime.downtime_id}
                    </span>
                    <span className="text-gray-500">{selectedDowntime.issue_date}</span>
                    <span className={`px-2 py-1 rounded ${selectedDowntime.impact_type === 'FULL' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {selectedDowntime.impact_type}
                    </span>
                    <span className={`px-2 py-1 rounded ${selectedDowntime.modality === 'UNPLANNED' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {selectedDowntime.modality}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded p-3 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <FaClock className="text-blue-500 text-xs" />
                        Timeline
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600">Start</span>
                          <span className="font-medium text-gray-800">{selectedDowntime.formattedStart}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600">End</span>
                          <span className="font-medium text-gray-800">{selectedDowntime.formattedEnd}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-200">
                          <span className="text-gray-600">Duration</span>
                          <span className="font-medium text-red-600">{selectedDowntime.formattedDuration}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded p-3 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <FaNetworkWired className="text-purple-500 text-xs" />
                        Services
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Channel</span>
                          <div className="flex items-center gap-1">
                            {channelOptions.find(c => c.value === selectedDowntime.affected_channel)?.icon}
                            <span className="font-medium text-gray-800">{selectedDowntime.affected_channel}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Service</span>
                          <span className="font-medium text-gray-800">{selectedDowntime.affected_service || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Persona</span>
                          <span className="font-medium text-gray-800">{selectedDowntime.affected_persona || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded p-3 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <FaExclamationTriangle className="text-orange-500 text-xs" />
                        Impact
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Type</span>
                          <span className={`font-medium ${selectedDowntime.impact_type === 'FULL' ? 'text-red-600' : 'text-yellow-600'}`}>
                            {selectedDowntime.impact_type}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Reliability</span>
                          <span className="font-medium text-gray-800">{selectedDowntime.reliability_impacted || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">System</span>
                          <span className="font-medium text-gray-800">{selectedDowntime.system_unavailability || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded p-3 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <FaTicketAlt className="text-green-500 text-xs" />
                        Resolution
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Ticket ID</span>
                          <span className="font-medium text-gray-800">{selectedDowntime.service_desk_ticket_id || 'N/A'}</span>
                        </div>
                        {selectedDowntime.service_desk_ticket_link && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Link</span>
                            <a 
                              href={selectedDowntime.service_desk_ticket_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              Open <FaExternalLinkAlt className="text-xs" />
                            </a>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Tracked By</span>
                          <span className="font-medium text-gray-800 flex items-center gap-1">
                            <FaUserCircle className="text-gray-400 text-xs" />
                            {selectedDowntime.tracked_by || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded p-3 border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Root Cause</h4>
                    <p className="text-xs text-gray-800">{selectedDowntime.reason || 'N/A'}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded p-3 border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Resolution</h4>
                    <p className="text-xs text-gray-800">{selectedDowntime.resolution || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="mt-4 bg-gray-50 rounded p-3 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <FaStickyNote className="text-yellow-500 text-xs" />
                    Remarks
                  </h4>
                  <div className="bg-white p-2 rounded border border-gray-200">
                    <p className="text-xs text-gray-800">
                      {selectedDowntime.remark || (
                        <span className="text-gray-500 italic">No remarks provided</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="px-4 py-3 bg-white border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-2">
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Updated:</span>{' '}
                  {selectedDowntime.updated_at && selectedDowntime.updated_at !== 'N/A' 
                    ? selectedDowntime.updated_at 
                    : (selectedDowntime.created_at ? selectedDowntime.created_at : 'N/A')}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedDowntime(null)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const allDowntimes = await fetchDowntimesById(selectedDowntime.downtime_id);
                        await exportDowntimeToExcel(allDowntimes);
                        toast.success('Downtime report exported successfully!');
                      } catch (error) {
                        toast.error(error.message || 'Failed to export downtime report');
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <FaFileExcel className="text-xs" /> Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DowntimeLog;