// app/components/downtime_chart/ReliabilityBarChart.js
'use client';

import { useState, useRef, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { FaDownload, FaCalendarAlt, FaSync, FaInfoCircle, FaSignal } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import SmallSpinner from '../../components/SmallSpinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ReliabilityBarChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('thisWeek');
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (timeRange === 'custom' && (!customStart || !customEnd)) {
        console.log('fetchData Skipped: Incomplete custom date range', {
          customStart: customStart?.toISOString(),
          customEnd: customEnd?.toISOString(),
        });
        return;
      }
      
      const params = new URLSearchParams({
        timeRange,
        ...(timeRange === 'custom' && customStart && { startDate: customStart.toISOString() }),
        ...(timeRange === 'custom' && customEnd && { endDate: customEnd.toISOString() })
      });
      
      console.log('fetchData Request for reliability impact:', {
        url: `/api/user_dashboard/downtime_chart/reliability_impact?${params.toString()}`,
        timeRange,
        customStart: customStart?.toISOString(),
        customEnd: customEnd?.toISOString(),
      });
      
      const response = await fetch(`/api/user_dashboard/downtime_chart/reliability_impact?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setChartData(data.data);
        console.log('fetchData Success for reliability impact:', { responseData: data.data });
      } else {
        throw new Error(data.message || 'Failed to fetch reliability impact data');
      }
    } catch (error) {
      console.error('fetchData Error for reliability impact:', {
        message: error.message,
        stack: error.stack,
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [timeRange, customStart, customEnd]);
  
  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    if (value !== 'custom') {
      setCustomStart(null);
      setCustomEnd(null);
    }
    console.log('handleTimeRangeChange:', { newTimeRange: value });
  };
  
  const downloadFullComponent = () => {
    if (containerRef.current) {
      toPng(containerRef.current, {
        backgroundColor: '#ffffff',
        style: {
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
        cacheBust: true,
      })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `Reliability_Impact_${new Date().toISOString()}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((error) => {
        console.error('Error generating image:', error);
      });
    }
  };

  const formatDateRange = () => {
    if (!chartData) {
      if (timeRange === 'custom' && customStart && customEnd) {
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        if (customStart.toDateString() === customEnd.toDateString()) {
          return customStart.toLocaleDateString('en-US', options);
        }
        return `${customStart.toLocaleDateString('en-US', options)} - ${customEnd.toLocaleDateString('en-US', options)}`;
      }
      return 'N/A';
    }
    
    const startDate = new Date(chartData.timeRange.start);
    const endDate = new Date(chartData.timeRange.end);
    
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return startDate.toLocaleDateString('en-US', options);
    }
    
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  // Prepare bar chart data
  const prepareBarChartData = () => {
    if (!chartData || !chartData.channels || chartData.channels.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: 'Reliability Percentage',
            data: [],
            backgroundColor: '#10B981',
            borderColor: '#047857',
            borderWidth: 1,
          }
        ]
      };
    }

    const labels = chartData.channels.map(channel => channel.channel);
    const reliabilityData = chartData.channels.map(channel => channel.reliabilityPercentage);

    return {
      labels,
      datasets: [
        {
          label: 'Reliability Percentage',
          data: reliabilityData,
          backgroundColor: reliabilityData.map(value => 
            value >= 99.9 ? '#10B981' : 
            value >= 99 ? '#F59E0B' : 
            value >= 95 ? '#F97316' : '#EF4444'
          ),
          borderColor: reliabilityData.map(value => 
            value >= 99.9 ? '#047857' : 
            value >= 99 ? '#D97706' : 
            value >= 95 ? '#EA580C' : '#DC2626'
          ),
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    };
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const channel = chartData?.channels[context.dataIndex];
            const lines = [
              `Reliability: ${context.parsed.y}%`,
              `Downtime: ${channel?.minutes || 0} min`,
              `Incidents: ${channel?.incidentCount || 0}`
            ];
            
            if (channel?.minutes === 0) {
              lines.push('✅ No reliability impact');
            } else {
              lines.push(`Impact: ${channel?.percentage || 0}%`);
            }
            
            return lines;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Reliability Percentage (%)'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      },
      x: {
        title: {
          display: true,
          text: 'Channels'
        },
        grid: {
          display: false,
        }
      }
    }
  };

  const timeRangeOptions = [
    { value: 'thisWeek', label: 'This Week' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'today', label: 'Today' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const barChartData = prepareBarChartData();

  return (
    <motion.div 
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded border border-gray-200 shadow-lg p-5 h-full flex flex-col"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FaSignal className="text-blue-600" />
            Channel Reliability Dashboard
            <button 
              onMouseEnter={() => setShowInfo(true)} 
              onMouseLeave={() => setShowInfo(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaInfoCircle size={14} />
            </button>
          </h3>
          {showInfo && (
            <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded max-w-xs">
              Shows reliability percentage for ALL channels. 100% = No reliability-impacting downtime.
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="text-xs border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-sm appearance-none pl-8 text-gray-700"
            >
              {timeRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={12} />
          </div>
          
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <FaSync className={loading ? 'animate-spin text-gray-700' : 'text-gray-700'} size={12} />
          </button>
          
          <button
            onClick={downloadFullComponent}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            title="Download full report"
          >
            <FaDownload className="text-gray-700" size={12} />
          </button>
        </div>
      </div>
      
      {timeRange === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          <div>
            <label className="text-xs text-gray-700 mb-1 block">Start Date</label>
            <DatePicker
              selected={customStart}
              onChange={(date) => {
                setCustomStart(date);
                console.log('Custom Start Date Selected:', {
                  rawDate: date?.toISOString(),
                });
              }}
              selectsStart
              startDate={customStart}
              endDate={customEnd}
              className="text-xs w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
              placeholderText="Select start"
              dateFormat="MMM d, yyyy"
            />
          </div>
          <div>
            <label className="text-xs text-gray-700 mb-1 block">End Date</label>
            <DatePicker
              selected={customEnd}
              onChange={(date) => {
                setCustomEnd(date);
                console.log('Custom End Date Selected:', {
                  rawDate: date?.toISOString(),
                });
              }}
              selectsEnd
              startDate={customStart}
              endDate={customEnd}
              minDate={customStart}
              className="text-xs w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
              placeholderText="Select end"
              dateFormat="MMM d, yyyy"
            />
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="py-12 text-center">
          <SmallSpinner />
          <p className="mt-2 text-gray-500">Loading reliability data...</p>
        </div>
      ) : chartData?.channels?.length > 0 ? (
        <div className="flex-1 flex flex-col">
          {/* Date Range Display - ADDED THIS SECTION */}
          <div className="mb-2 text-center">
            <p className="text-sm text-gray-600 font-medium">
              Date Range: <span className="text-gray-800">{formatDateRange()}</span>
            </p>
          </div>
          
          {/* Bar Chart */}
          <div className="h-[300px] w-full mb-2">
            <Bar 
              ref={chartRef}
              data={barChartData} 
              options={barChartOptions} 
            />
          </div>
          
          {/* Reliability Legend - Compact */}
<div className="mb-2 p-1.5 bg-gray-50 rounded border border-gray-200">
  <h4 className="text-xs font-semibold text-gray-900 mb-0.5">Reliability Scale</h4>
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-0.5 text-[10px] text-gray-900">
    <div className="flex items-center gap-0.5">
      <div className="w-1.5 h-1.5 bg-green-500 rounded"></div>
      <span>Excellent (99.9%+)</span>
    </div>
    <div className="flex items-center gap-0.5">
      <div className="w-1.5 h-1.5 bg-yellow-500 rounded"></div>
      <span>Good (99-99.8%)</span>
    </div>
    <div className="flex items-center gap-0.5">
      <div className="w-1.5 h-1.5 bg-orange-500 rounded"></div>
      <span>Fair (95-98.9%)</span>
    </div>
    <div className="flex items-center gap-0.5">
      <div className="w-1.5 h-1.5 bg-red-500 rounded"></div>
      <span>Poor (&lt;95%)</span>
    </div>
  </div>
</div>


          
          {/* Channel Details */}
<div className="mt-2 pt-3 pb-3 border-t border-gray-200">
  <h4 className="text-xs md:text-sm font-semibold text-gray-900 mb-2">
    All Channels Reliability ({chartData.summary.totalChannels} channels)
  </h4>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
    {chartData.channels.map((channel, index) => (
      <div
        key={index}
        className={`p-2.5 rounded border text-[11px] md:text-xs ${
          channel.reliabilityPercentage >= 99.9
            ? 'bg-green-50 border-green-200'
            : channel.reliabilityPercentage >= 99
            ? 'bg-yellow-50 border-yellow-200'
            : channel.reliabilityPercentage >= 95
            ? 'bg-orange-50 border-orange-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex justify-between items-start mb-1.5">
          <span className="font-semibold text-gray-900 truncate">
            {channel.channel}
          </span>
          <div
            className={`px-1.5 py-0.5 rounded-full font-medium text-[10px] ${
              channel.reliabilityPercentage >= 99.9
                ? 'bg-green-100 text-green-800'
                : channel.reliabilityPercentage >= 99
                ? 'bg-yellow-100 text-yellow-800'
                : channel.reliabilityPercentage >= 95
                ? 'bg-orange-100 text-orange-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {channel.reliabilityPercentage}%
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span
              className={`font-medium ${
                channel.minutes === 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {channel.minutes === 0 ? '✅ No Impact' : '⚠️ Impacted'}
            </span>
          </div>

          {channel.minutes > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Downtime:</span>
                <span className="font-medium text-gray-900">
                  {channel.minutes} min
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Incidents:</span>
                <span className="font-medium text-gray-900">
                  {channel.incidentCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Impact:</span>
                <span className="font-medium text-red-600">
                  {channel.percentage}%
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    ))}
  </div>
</div>

          
          {/* Summary Metrics */}
          <div className="mt-auto">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
    <div className="bg-green-50 py-1 px-1 rounded text-center">
      <p className="text-[10px] font-medium text-green-700">Overall Reliability</p>
      <p className="text-sm font-bold text-green-900 leading-tight mt-0.5">{chartData.reliabilityPercentage}%</p>
      <p className="text-[9px] text-green-700 mt-0.5">Score</p>
    </div>
    
    <div className="bg-red-50 py-1 px-1 rounded text-center">
      <p className="text-[10px] font-medium text-red-700">Total Impact</p>
      <p className="text-sm font-bold text-red-900 leading-tight mt-0.5">{chartData.reliabilityImpactPercentage}%</p>
      <p className="text-[9px] text-red-700 mt-0.5">{chartData.totalReliabilityImpactDuration}</p>
    </div>
    
    <div className="bg-blue-50 py-1 px-1 rounded text-center">
      <p className="text-[10px] font-medium text-blue-700">Impacted Channels</p>
      <p className="text-sm font-bold text-blue-900 leading-tight mt-0.5">
        {chartData.channels.filter(c => c.minutes > 0).length}
      </p>
      <p className="text-[9px] text-blue-700 mt-0.5">of {chartData.summary.totalChannels}</p>
    </div>
    
    <div className="bg-purple-50 py-1 px-1 rounded text-center">
      <p className="text-[10px] font-medium text-purple-700">Status</p>
      <p className="text-sm font-bold text-purple-900 leading-tight mt-0.5">{chartData.summary.reliabilityStatus}</p>
      <div className="flex items-center justify-center gap-0.5 mt-0.5">
        <p className="text-[9px] text-purple-700">SLA: {chartData.summary.sla}</p>
        {chartData.summary.meetsSla ? (
          <span className="text-green-600 text-[10px]">✓</span>
        ) : (
          <span className="text-red-600 text-[10px]">✗</span>
        )}
      </div>
    </div>
  </div>
</div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-10">
          <div className="bg-gray-200 border-2 border-dashed rounded w-16 h-16 mb-4 flex items-center justify-center">
            <FaSignal className="text-gray-500" size={24} />
          </div>
          <p className="text-gray-700 font-medium text-sm">No reliability data available</p>
          <p className="text-xs text-gray-600 mt-1">Try a different time range</p>
          
          {/* Date Range Display for empty state - ADDED THIS SECTION */}
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-600 font-medium">
              Date Range: <span className="text-gray-800">{formatDateRange()}</span>
            </p>
          </div>
          
          {/* Summary Cards Section - Perfect Centered Version */}
<div className="mt-2 pt-1.5 border-t border-gray-200 w-full">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
    
    {/* Overall Reliability */}
    <div className="bg-green-50 p-2 rounded flex items-center justify-center">
      <div className="text-center">
        <p className="text-[10px] font-medium text-green-700">Overall Reliability</p>
        <p className="text-sm font-bold text-green-900 leading-tight mt-0.5">100%</p>
        <p className="text-[9px] text-green-700 mt-0.5">Score</p>
      </div>
    </div>

    {/* Total Impact */}
    <div className="bg-red-50 p-2 rounded flex items-center justify-center">
      <div className="text-center">
        <p className="text-[10px] font-medium text-red-700">Total Impact</p>
        <p className="text-sm font-bold text-red-900 leading-tight mt-0.5">0%</p>
        <p className="text-[9px] text-red-700 mt-0.5">0m</p>
      </div>
    </div>

    {/* Impacted Channels */}
    <div className="bg-blue-50 p-2 rounded flex items-center justify-center">
      <div className="text-center">
        <p className="text-[10px] font-medium text-blue-700">Impacted Channels</p>
        <p className="text-sm font-bold text-blue-900 leading-tight mt-0.5">0</p>
        <p className="text-[9px] text-blue-700 mt-0.5">of 6</p>
      </div>
    </div>

    {/* Status */}
    <div className="bg-purple-50 p-2 rounded flex items-center justify-center">
      <div className="text-center">
        <p className="text-[10px] font-medium text-purple-700">Status</p>
        <p className="text-sm font-bold text-purple-900 leading-tight mt-0.5">Excellent</p>
        <p className="text-[9px] text-purple-700 mt-0.5">SLA: 99.9% ✓</p>
      </div>
    </div>
  </div>
</div>


        </div>
      )}
    </motion.div>
  );
};

export default ReliabilityBarChart;