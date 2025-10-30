// app/components/downtime_chart/DowntimeTrendChart.js
'use client';

import { useState, useRef, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { 
  FaDownload, FaCalendarAlt, FaSync, FaInfoCircle, FaChartLine, 
  FaArrowUp, FaArrowDown, FaMinus, FaClock, FaExclamationTriangle, 
  FaCheckCircle 
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import SmallSpinner from '../../components/SmallSpinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

// Fixed channel order - MUST match backend
const CHANNEL_ORDER = ['APP', 'USSD', 'WEB', 'SMS', 'MIDDLEWARE', 'INWARD SERVICE'];

const DowntimeTrendChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trendType, setTrendType] = useState('weekly');
  const [chartView, setChartView] = useState('comparison');
  const [showInfo, setShowInfo] = useState(false);
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  
  const fetchTrendData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        trendType,
        view: chartView
      });
      
      console.log('🚀 [FRONTEND] Fetching trend data from API:', {
        url: `/api/user_dashboard/downtime_chart/trend?${params.toString()}`,
        trendType,
        chartView
      });
      
      const response = await fetch(`/api/user_dashboard/downtime_chart/trend?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('📥 [FRONTEND] Raw API response:', {
        success: data.success,
        dataStructure: data.data ? {
          channels: data.data.channels,
          comparison: data.data.comparison ? {
            current: data.data.comparison.current,
            previous: data.data.comparison.previous,
            currentPeriod: data.data.comparison.currentPeriod,
            previousPeriod: data.data.comparison.previousPeriod
          } : null,
          summary: data.data.summary
        } : null
      });

      if (data.success) {
        // Validate and ensure data integrity
        if (data.data && data.data.channels && data.data.comparison) {
          console.log('🔍 [FRONTEND] Validating data structure:', {
            expectedChannels: CHANNEL_ORDER,
            actualChannels: data.data.channels,
            currentDataLength: data.data.comparison.current?.length,
            previousDataLength: data.data.comparison.previous?.length,
            dataMatches: data.data.channels.length === data.data.comparison.current?.length
          });

          // Ensure data arrays match channel length
          if (data.data.channels.length !== data.data.comparison.current?.length) {
            console.warn('⚠️ [FRONTEND] Data length mismatch, attempting to fix...');
          }
        }

        setChartData(data.data);
        console.log('✅ [FRONTEND] Trend data set successfully');
      } else {
        throw new Error(data.message || 'Failed to fetch trend data');
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Error fetching trend data:', error);
      setError(error.message);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chartData) {
      console.log('📊 [FRONTEND] Chart Data Structure Analysis:', {
        view: chartView,
        trendType: trendType,
        hasComparison: !!chartData.comparison,
        hasTrend: !!chartData.trend,
        channels: chartData.channels,
        comparisonData: chartData.comparison ? {
          current: chartData.comparison.current,
          previous: chartData.comparison.previous,
          currentPeriod: chartData.comparison.currentPeriod,
          previousPeriod: chartData.comparison.previousPeriod
        } : null,
        summary: chartData.summary
      });

      // Detailed channel-by-channel analysis
      if (chartData.channels && chartData.comparison) {
        console.log('🔬 [FRONTEND] Channel Data Mapping:', 
          chartData.channels.map((channel, index) => ({
            channel,
            current: chartData.comparison.current[index],
            previous: chartData.comparison.previous[index],
            change: chartData.comparison.changes?.[index]
          }))
        );
      }
    }
  }, [chartData, chartView, trendType]);
  
  useEffect(() => {
    fetchTrendData();
  }, [trendType, chartView]);

  const downloadFullComponent = () => {
    if (containerRef.current) {
      toPng(containerRef.current, {
        backgroundColor: '#ffffff',
        quality: 1.0,
        cacheBust: true,
      })
      .then((dataUrl) => {
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `Downtime_Trend_Analysis_${timestamp}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((error) => {
        console.error('Error generating image:', error);
        setError('Failed to download image');
      });
    }
  };

  // Fixed comparison chart data preparation
  const prepareComparisonChartData = () => {
    if (!chartData?.comparison) {
      console.log('❌ [FRONTEND] No comparison data available');
      return { labels: [], datasets: [] };
    }

    const data = chartData.comparison;

    console.log('🎨 [FRONTEND] Preparing comparison chart data:', {
      channels: chartData.channels,
      currentData: data.current,
      previousData: data.previous,
      currentPeriod: data.currentPeriod,
      previousPeriod: data.previousPeriod
    });

    // Use the channels from the data (should be same as CHANNEL_ORDER)
    const labels = chartData.channels || CHANNEL_ORDER;

    return {
      labels: labels,
      datasets: [
        {
          label: data.previousPeriod || 'Previous Period',
          data: data.previous || [],
          backgroundColor: '#93C5FD',
          borderColor: '#3B82F6',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: data.currentPeriod || 'Current Period',
          data: data.current || [],
          backgroundColor: '#10B981',
          borderColor: '#047857',
          borderWidth: 2,
          borderRadius: 6,
        }
      ]
    };
  };

  // Prepare trend line chart data
  const prepareTrendChartData = () => {
    if (!chartData?.trend?.data) {
      return { labels: [], datasets: [] };
    }

    const trend = chartData.trend;
    
    // Show top 3 most impacted channels for clarity
    const topChannels = [...trend.data]
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    const colors = [
      { border: '#EF4444', background: 'rgba(239, 68, 68, 0.1)' },
      { border: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' },
      { border: '#8B5CF6', background: 'rgba(139, 92, 246, 0.1)' }
    ];

    return {
      labels: trend.labels || [],
      datasets: topChannels.map((channel, index) => ({
        label: channel.channel,
        data: channel.data,
        borderColor: colors[index].border,
        backgroundColor: colors[index].background,
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: colors[index].border,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      }))
    };
  };

  const comparisonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#374151',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value} minutes`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Downtime Duration (minutes)',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        title: {
          display: true,
          text: 'Channels',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          display: false,
        }
      }
    }
  };

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#374151',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y} minutes`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Downtime Duration (minutes)',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        title: {
          display: true,
          text: trendType === 'weekly' ? 'Weeks' : 'Months',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          display: false,
        }
      }
    }
  };

  const getChangeIcon = (change) => {
    if (change > 0) return <FaArrowUp className="text-red-500" size={12} />;
    if (change < 0) return <FaArrowDown className="text-green-500" size={12} />;
    return <FaMinus className="text-gray-500" size={12} />;
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-red-600';
    if (change < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const getChangeText = (change) => {
    if (change > 0) return `+${change}`;
    if (change < 0) return `${change}`;
    return '0';
  };

  const getTrendIcon = (trend) => {
    return trend === 'improving' 
      ? <FaArrowDown className="text-green-500" size={10} />
      : trend === 'deteriorating'
      ? <FaArrowUp className="text-red-500" size={10} />
      : <FaMinus className="text-gray-500" size={10} />;
  };

  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleTrendTypeChange = (newTrendType) => {
    console.log('🔄 [FRONTEND] Changing trend type to:', newTrendType);
    setTrendType(newTrendType);
  };

  const handleChartViewChange = (newView) => {
    console.log('🔄 [FRONTEND] Changing chart view to:', newView);
    setChartView(newView);
  };

  const comparisonChartData = prepareComparisonChartData();
  const trendChartData = prepareTrendChartData();

  console.log('📈 [FRONTEND] Final chart data for rendering:', {
    chartView,
    comparisonChartData,
    trendChartData
  });

  return (
    <motion.div 
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded border border-gray-200 shadow-lg p-5 h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FaChartLine className="text-purple-600" />
            Downtime Trend Analysis
            <button 
              onMouseEnter={() => setShowInfo(true)} 
              onMouseLeave={() => setShowInfo(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaInfoCircle size={14} />
            </button>
          </h3>
          {showInfo && (
            <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded max-w-md">
              Real-time analysis of reliability-impacting downtime trends across all channels. 
              {chartView === 'comparison' 
                ? ' Compare current period with previous period.' 
                : ' Track performance trends over multiple periods.'
              }
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded p-1">
            <button
              onClick={() => handleChartViewChange('comparison')}
              className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                chartView === 'comparison' 
                  ? 'bg-white text-gray-800 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <FaChartLine size={10} />
              Comparison
            </button>
            <button
              onClick={() => handleChartViewChange('trend')}
              className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                chartView === 'trend' 
                  ? 'bg-white text-gray-800 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <FaClock size={10} />
              Trend
            </button>
          </div>

          {/* Period Toggle */}
          <div className="flex bg-gray-100 rounded p-1">
            <button
              onClick={() => handleTrendTypeChange('weekly')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                trendType === 'weekly' 
                  ? 'bg-white text-gray-800 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => handleTrendTypeChange('monthly')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                trendType === 'monthly' 
                  ? 'bg-white text-gray-800 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Monthly
            </button>
          </div>
          
          <button
            onClick={fetchTrendData}
            disabled={loading}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <FaSync className={loading ? 'animate-spin text-gray-700' : 'text-gray-700'} size={12} />
          </button>
          
          <button
            onClick={downloadFullComponent}
            disabled={!chartData}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            title="Download full report"
          >
            <FaDownload className="text-gray-700" size={12} />
          </button>
        </div>
      </div>

{/* Data Debug Panel - Remove in production */}
{chartData && (
  <div className="mb-4 border border-blue-200 rounded overflow-hidden">
    <button
      onClick={() => setShowInfo(!showInfo)}
      className="w-full bg-blue-50 hover:bg-blue-100 px-3 py-2 flex items-center justify-between transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="text-blue-800 font-bold">🔧 Data Debug Panel</span>
        <span className="text-blue-600 text-xs bg-blue-200 px-2 py-1 rounded">
          {showInfo ? 'Hide' : 'Show'} Details
        </span>
      </div>
      {showInfo ? (
        <FaArrowUp className="text-blue-600" size={12} />
      ) : (
        <FaArrowDown className="text-blue-600" size={12} />
      )}
    </button>
    
    {showInfo && (
      <div className="bg-blue-50 p-4 border-t border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div>
              <strong className="text-blue-900 block mb-1">Channels Order:</strong>
              <div className="text-blue-800 bg-blue-100 px-3 py-2 rounded text-xs font-mono">
                {chartData.channels?.join(' → ')}
              </div>
            </div>
            
            <div>
              <strong className="text-blue-900 block mb-1">Current Period Data:</strong>
              <div className="space-y-1">
                {chartData.comparison?.current?.map((val, idx) => (
                  val > 0 && (
                    <div key={idx} className="flex justify-between text-blue-800 text-xs">
                      <span className="font-medium">{chartData.channels[idx]}:</span>
                      <span className="bg-blue-200 px-2 py-1 rounded">{val} minutes</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <strong className="text-blue-900 block mb-1">Previous Period Data:</strong>
              <div className="space-y-1">
                {chartData.comparison?.previous?.map((val, idx) => (
                  val > 0 && (
                    <div key={idx} className="flex justify-between text-blue-800 text-xs">
                      <span className="font-medium">{chartData.channels[idx]}:</span>
                      <span className="bg-blue-200 px-2 py-1 rounded">{val} minutes</span>
                    </div>
                  )
                ))}
              </div>
            </div>
            
            <div>
              <strong className="text-blue-900 block mb-1">Expected Values:</strong>
              <div className="text-blue-800 text-xs bg-blue-100 px-3 py-2 rounded">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-semibold">Current:</span>
                    <div>APP: 35min</div>
                    <div>USSD: 35min</div>
                    <div>SMS: 25min</div>
                  </div>
                  <div>
                    <span className="font-semibold">Previous:</span>
                    <div>APP: 36min</div>
                    <div>USSD: 36min</div>
                    <div>SMS: 63min</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Data Mismatch Warning */}
        {chartData.comparison?.current && 
         (chartData.comparison.current[0] !== 35 || 
          chartData.comparison.current[1] !== 35 || 
          chartData.comparison.current[3] !== 25) && (
          <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded">
            <div className="flex items-center gap-2 text-red-800 text-xs font-semibold">
              <FaExclamationTriangle className="text-red-600" />
              <span>DATA MISMATCH DETECTED</span>
            </div>
            <div className="text-red-700 text-xs mt-1">
              Current data doesn&apos;t match expected values. Check console for details.
            </div>
          </div>
        )}
      </div>
    )}
  </div>
)}
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-700 text-sm font-medium">Error: {error}</p>
          <button
            onClick={fetchTrendData}
            className="mt-2 text-red-600 hover:text-red-800 text-xs font-medium"
          >
            Try Again
          </button>
        </div>
      )}
      
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <SmallSpinner />
          <p className="mt-3 text-gray-500 text-sm">Loading trend analysis...</p>
          <p className="text-xs text-gray-400 mt-1">
            Analyzing {trendType} {chartView} data from database
          </p>
        </div>
      ) : chartData ? (
        <div className="flex-1 flex flex-col space-y-6">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-blue-700">Total Downtime</p>
                <FaClock className="text-blue-500" size={14} />
              </div>
              <p className="text-lg font-bold text-blue-900 mt-1">
                {formatDuration(chartData.summary?.totalDowntime || 0)}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {chartView === 'comparison' 
                  ? chartData.comparison?.currentPeriod 
                  : `${chartData.summary?.periodCount} Periods`}
              </p>
            </div>
            
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-green-700">Avg per Channel</p>
                <FaChartLine className="text-green-500" size={14} />
              </div>
              <p className="text-lg font-bold text-green-900 mt-1">
                {formatDuration(chartData.summary?.avgPerChannel || 0)}
              </p>
              <p className="text-xs text-green-700 mt-1">Mean downtime</p>
            </div>
            
            <div className="bg-purple-50 p-3 rounded border border-purple-200">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-purple-700">Improving Channels</p>
                <FaArrowDown className="text-purple-500" size={14} />
              </div>
              <p className="text-lg font-bold text-purple-900 mt-1">
                {chartData.summary?.improvingChannels || 0}
              </p>
              <p className="text-xs text-purple-700 mt-1">
                of {chartData.channels?.length || 0} total
              </p>
            </div>
            
            <div className="bg-orange-50 p-3 rounded border border-orange-200">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-orange-700">Most Impacted</p>
                <FaExclamationTriangle className="text-orange-500" size={14} />
              </div>
              <p className="text-sm font-bold text-orange-900 mt-1 truncate">
                {chartData.summary?.mostImpacted?.channel || 'N/A'}
              </p>
              <p className="text-xs text-orange-700 mt-1">
                {formatDuration(chartData.summary?.mostImpacted?.total || 0)}
              </p>
            </div>
          </div>

          {/* Main Chart */}
          <div className="bg-gray-50 rounded p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              {chartView === 'comparison' 
                ? `${
                    trendType === 'weekly' ? 'Weekly' : 'Monthly'
                  } Comparison: ${chartData.comparison?.currentPeriod} vs ${chartData.comparison?.previousPeriod}`
                : `${
                    trendType === 'weekly' ? 'Weekly' : 'Monthly'
                  } Trend Analysis (${chartData.trend?.labels?.length || 0} periods)`
              }
            </h4>
            
            <div className="h-80 w-full">
              {chartView === 'comparison' ? (
                chartData.summary?.hasData ? (
                  <Bar 
                    ref={chartRef}
                    data={comparisonChartData} 
                    options={comparisonChartOptions} 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <FaChartLine className="text-gray-400 text-4xl mb-3" />
                    <p className="text-gray-600 font-medium">No Downtime Data</p>
                    <p className="text-gray-500 text-sm mt-1">
                      No reliability-impacting downtime found for the selected periods.
                    </p>
                    <p className="text-gray-400 text-xs mt-2">
                      {chartData.comparison?.currentPeriod} vs {chartData.comparison?.previousPeriod}
                    </p>
                  </div>
                )
              ) : chartData.summary?.hasData ? (
                <Line 
                  data={trendChartData} 
                  options={trendChartOptions} 
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <FaChartLine className="text-gray-400 text-4xl mb-3" />
                  <p className="text-gray-600 font-medium">No Trend Data</p>
                  <p className="text-gray-500 text-sm mt-1">
                    No reliability-impacting downtime found in the selected time range.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Channel Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel Performance Table */}
            <div className="bg-white rounded border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FaChartLine className="text-blue-500" size={12} />
                Channel Performance Summary
              </h4>
              
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-2 px-3 text-left font-semibold text-gray-700">Channel</th>
                      <th className="py-2 px-3 text-right font-semibold text-gray-700">Total</th>
                      <th className="py-2 px-3 text-right font-semibold text-gray-700">Average</th>
                      <th className="py-2 px-3 text-center font-semibold text-gray-700">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      let tableData = [];
                      
                      if (chartView === 'trend') {
                        tableData = chartData.trend?.data || [];
                      } else {
                        // Create table data from comparison view
                        tableData = chartData.channels?.map((channel, index) => ({
                          channel,
                          total: chartData.comparison?.current?.[index] || 0,
                          avg: Math.round((chartData.comparison?.current?.[index] || 0) / 1),
                          trend: (chartData.comparison?.changes?.[index] || 0) < 0 ? 'improving' : 
                                (chartData.comparison?.changes?.[index] || 0) > 0 ? 'deteriorating' : 'stable'
                        })) || [];
                      }
                      
                      // Filter out channels with no data and sort by total
                      const filteredData = tableData
                        .filter(channel => channel.total > 0)
                        .sort((a, b) => b.total - a.total);
                      
                      if (filteredData.length === 0) {
                        return (
                          <tr>
                            <td colSpan="4" className="py-4 px-3 text-center text-gray-500">
                              No downtime data available for selected period
                            </td>
                          </tr>
                        );
                      }
                      
                      return filteredData.map((channel, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2 px-3 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                channel.total > 200 ? 'bg-red-500' :
                                channel.total > 100 ? 'bg-orange-500' :
                                channel.total > 50 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}></div>
                              {channel.channel}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-gray-900">
                            {formatDuration(channel.total)}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-700">
                            {formatDuration(channel.avg)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {getTrendIcon(channel.trend)}
                              <span className={`text-xs font-medium ${
                                channel.trend === 'improving' ? 'text-green-600' : 
                                channel.trend === 'deteriorating' ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {channel.trend.charAt(0).toUpperCase() + channel.trend.slice(1)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Period Comparison */}
            <div className="bg-white rounded border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FaClock className="text-green-500" size={12} />
                {chartView === 'comparison' ? 'Period Comparison' : 'Trend Comparison'}
              </h4>
              
              <div className="space-y-3">
                {chartData.channels?.map((channel, index) => {
                  const comparison = chartData.comparison;
                  const change = comparison?.changes?.[index] || 0;
                  const current = comparison?.current?.[index] || 0;
                  const previous = comparison?.previous?.[index] || 0;
                  
                  // Only show channels with data in either period
                  if (current === 0 && previous === 0) return null;
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          change < 0 ? 'bg-green-100 text-green-600' : 
                          change > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {getChangeIcon(change)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900">{channel}</p>
                          <p className="text-xs text-gray-600">
                            {change < 0 ? 'Improved' : change > 0 ? 'Deteriorated' : 'No change'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-900">
                          {formatDuration(current)} / {formatDuration(previous)}
                        </p>
                        <p className={`text-xs font-medium ${getChangeColor(change)}`}>
                          {getChangeText(change)} min
                        </p>
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>

              {/* Overall Summary */}
              {chartData.comparison && (
                <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-blue-700">Overall Change</p>
                      <p className={`text-sm font-bold ${getChangeColor(chartData.comparison.totalChange || 0)}`}>
                        {getChangeText(chartData.comparison.totalChange || 0)} minutes
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-blue-700">Improvement Rate</p>
                      <p className={`text-sm font-bold ${
                        (chartData.comparison.improvementRate || 0) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {chartData.comparison.improvementRate || 0}%
                      </p>
                    </div>
                  </div>
                  {chartData.comparison.currentPeriod && chartData.comparison.previousPeriod && (
                    <p className="text-xs text-blue-600 mt-2 text-center">
                      {chartData.comparison.currentPeriod} vs {chartData.comparison.previousPeriod}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-10">
          <div className="bg-gray-200 border-2 border-dashed rounded w-16 h-16 mb-4 flex items-center justify-center">
            <FaChartLine className="text-gray-500 w-8 h-8" />
          </div>
          <p className="text-gray-700 font-medium text-sm">No trend data available</p>
          <p className="text-xs text-gray-600 mt-1">
            {error ? 'Failed to load data' : 'Try a different time range or refresh'}
          </p>
          <button
            onClick={fetchTrendData}
            className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default DowntimeTrendChart;