// app/components/downtime_chart/BaseChart.js
'use client';

import { useState, useRef, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { FaDownload, FaCalendarAlt, FaSync, FaInfoCircle } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import SmallSpinner from '../../components/SmallSpinner';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, ChartDataLabels);

const BaseChart = ({ title, apiEndpoint, colors }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('last7days');
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  
  const defaultColors = [
    '#4C78A8', '#F58518', '#54A24B', '#E45756', 
    '#76B7B2', '#72B7CC', '#B279A2', '#FF9DA7',
    '#9D7660', '#BAB0AC', '#D67195', '#B6992D'
  ];
  
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
      
      console.log('fetchData Request:', {
        url: `${apiEndpoint}?${params.toString()}`,
        timeRange,
        customStart: customStart?.toISOString(),
        customEnd: customEnd?.toISOString(),
      });
      
      const response = await fetch(`${apiEndpoint}?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setChartData(data.data);
        console.log('fetchData Success:', { responseData: data.data });
      } else {
        throw new Error(data.message || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('fetchData Error:', {
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
        link.download = `${title.replace(/\s+/g, '_')}_dashboard_${new Date().toISOString()}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((error) => {
        console.error('Error generating image:', error);
      });
    }
  };

  const data = {
    labels: chartData?.channels.map(c => c.channel) || [],
    datasets: [
      {
        data: chartData?.channels.map(c => c.minutes) || [],
        backgroundColor: colors || defaultColors,
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 20
      }
    ]
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: 0
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const percentage = context.raw && chartData?.totalMinutes
              ? Math.round((value / chartData.totalMinutes) * 100)
              : 0;
            return `${label}: ${value} min (${percentage}%)`;
          }
        },
        displayColors: true,
        backgroundColor: 'rgba(30, 30, 30, 0.95)',
        titleFont: {
          size: 13,
          weight: 'bold'
        },
        bodyFont: {
          size: 12
        },
        padding: 12,
        cornerRadius: 4,
        titleColor: '#ffffff',
        bodyColor: '#f0f0f0',
        boxPadding: 6,
        usePointStyle: true,
        pointStyle: 'circle',
        borderColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1
      },
      datalabels: {
        formatter: (value, ctx) => {
          const total = ctx.chart.getDatasetMeta(0).total;
          const percentage = Math.round((value / total) * 100);
          return percentage >= 5 ? `${percentage}%` : null;
        },
        color: '#ffffff',
        font: {
          weight: 'bold',
          size: 12
        },
        textAlign: 'center',
        textStrokeColor: '#000',
        textStrokeWidth: 2,
        textShadowBlur: 4,
        textShadowColor: 'rgba(0,0,0,0.5)'
      }
    }
  };

  const timeRangeOptions = [
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'today', label: 'Today' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];
  
  const formatDateRange = () => {
    if (!chartData) {
      console.log('formatDateRange: No chartData, using custom dates if available', {
        customStart: customStart?.toISOString(),
        customEnd: customEnd?.toISOString(),
      });
      if (timeRange === 'custom' && customStart && customEnd) {
        const start = new Date(customStart);
        const end = new Date(customEnd);
        end.setHours(0, 0, 0, 0); // Normalize to start of day
        const options = { timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric', year: 'numeric' };
        if (start.toDateString() === end.toDateString()) {
          const formatted = start.toLocaleDateString('en-US', options);
          console.log('formatDateRange Custom Single Day:', formatted);
          return formatted;
        }
        const formattedRange = `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
        console.log('formatDateRange Custom Range:', formattedRange);
        return formattedRange;
      }
      return 'N/A';
    }
    
    const startDate = new Date(chartData.timeRange.start);
    const endDate = new Date(chartData.timeRange.end);
    
    console.log('formatDateRange Debug:', {
      rawStart: chartData.timeRange.start,
      rawEnd: chartData.timeRange.end,
      startDateISO: startDate.toISOString(),
      endDateISO: endDate.toISOString(),
      startDateLocale: startDate.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
      endDateLocale: endDate.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
      clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    
    const normalizedEndDate = new Date(endDate);
    normalizedEndDate.setHours(0, 0, 0, 0);
    
    const options = { timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric', year: 'numeric' };
    
    if (startDate.toDateString() === normalizedEndDate.toDateString()) {
      const formattedDate = startDate.toLocaleDateString('en-US', options);
      console.log('formatDateRange Single Day Output:', formattedDate);
      return formattedDate;
    }
    
    const formattedRange = `${startDate.toLocaleDateString('en-US', options)} - ${normalizedEndDate.toLocaleDateString('en-US', options)}`;
    console.log('formatDateRange Range Output:', formattedRange);
    return formattedRange;
  };

  return (
    <motion.div 
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-lg p-5 h-full flex flex-col"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {title}
            <button 
              onMouseEnter={() => setShowInfo(true)} 
              onMouseLeave={() => setShowInfo(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaInfoCircle size={14} />
            </button>
          </h3>
          {showInfo && (
            <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg max-w-xs">
              Shows distribution of downtime by channel
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-sm appearance-none pl-8 text-gray-700"
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
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <FaSync className={loading ? 'animate-spin text-gray-700' : 'text-gray-700'} size={12} />
          </button>
          
          <button
            onClick={downloadFullComponent}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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
                const normalizedDate = date ? new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })) : null;
                setCustomStart(normalizedDate);
                console.log('Custom Start Date Selected:', {
                  rawDate: date?.toISOString(),
                  normalizedDate: normalizedDate?.toISOString(),
                  normalizedLocale: normalizedDate?.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
                  clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
                const normalizedDate = date ? new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })) : null;
                if (normalizedDate) {
                  normalizedDate.setHours(23, 59, 59, 999);
                }
                setCustomEnd(normalizedDate);
                console.log('Custom End Date Selected:', {
                  rawDate: date?.toISOString(),
                  normalizedDate: normalizedDate?.toISOString(),
                  normalizedLocale: normalizedDate?.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
                  clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
          <p className="mt-2 text-gray-500">Loading downtime data...</p>
        </div>
      ) : chartData?.channels?.length > 0 ? (
        <div className="flex-1 flex flex-col">
          <div className="h-[350px] w-full flex items-center justify-center">
            <div className="w-[350px] h-[350px]">
              <Pie 
                ref={chartRef}
                data={data} 
                options={options} 
                plugins={[ChartDataLabels]}
              />
            </div>
          </div>
          
          <div className="mt-4 pt-3 pb-3 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {chartData.channels.map((channel, index) => (
                <div key={index} className="flex items-center group">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0 mr-2 shadow-sm" 
                    style={{ backgroundColor: colors?.[index] || defaultColors[index] }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-medium text-gray-800 truncate group-hover:text-gray-900 transition-colors">
                        {channel.channel}
                      </span>
                      <span className="text-xs font-semibold text-gray-800 ml-2">
                        {channel.minutes} min
                      </span>
                    </div>
                    <div className="flex items-center mt-1">
                      <div className="h-1.5 bg-gray-200 rounded-full flex-1 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{ 
                            width: `${channel.percentage}%`,
                            backgroundColor: colors?.[index] || defaultColors[index]
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-700 ml-2 w-8 font-medium">
                        {channel.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg flex flex-col items-center">
                <p className="text-xs font-semibold text-blue-700">Total Downtime</p>
                <p className="text-lg font-bold text-blue-900 mt-1">{chartData.totalMinutes} min</p>
              </div>
              
              <div className="bg-gray-100 p-3 rounded-lg flex flex-col items-center">
                <p className="text-xs font-semibold text-gray-700">Channels</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{chartData.channels.length}</p>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg flex flex-col items-center">
                <p className="text-xs font-semibold text-green-700">Date Range</p>
                <p className="text-xs font-medium text-green-900 mt-1 text-center">
                  {formatDateRange()}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-10">
          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mb-4"></div>
          <p className="text-gray-700 font-medium text-sm">No downtime data</p>
          <p className="text-xs text-gray-600 mt-1">Try a different time range</p>
          
          <div className="mt-4 pt-3 border-t border-gray-200 w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg flex flex-col items-center">
                <p className="text-xs font-semibold text-blue-700">Total Downtime</p>
                <p className="text-lg font-bold text-blue-900 mt-1">0 min</p>
              </div>
              
              <div className="bg-gray-100 p-3 rounded-lg flex flex-col items-center">
                <p className="text-xs font-semibold text-gray-700">Channels</p>
                <p className="text-lg font-bold text-gray-900 mt-1">0</p>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg flex flex-col items-center">
                <p className="text-xs font-semibold text-green-700">Date Range</p>
                <p className="text-xs font-medium text-green-900 mt-1 text-center">
                  {formatDateRange()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default BaseChart;