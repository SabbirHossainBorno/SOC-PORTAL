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
      
      console.log('Fetching trend data from API:', {
        url: `/api/user_dashboard/downtime_chart/trend?${params.toString()}`,
        trendType,
        chartView
      });
      
      const response = await fetch(`/api/user_dashboard/downtime_chart/trend?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setChartData(data.data);
        console.log('Trend data fetched successfully:', data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch trend data');
      }
    } catch (error) {
      console.error('Error fetching trend data:', error);
      setError(error.message);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (chartData) {
    console.log('📊 Chart Data Structure:', {
      view: chartView,
      trendType: trendType,
      hasComparison: !!chartData.comparison,
      hasTrend: !!chartData.trend,
      comparisonData: chartData.comparison,
      trendData: chartData.trend,
      summary: chartData.summary
    });
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

  // Prepare comparison chart data
  const prepareComparisonChartData = () => {
    if (!chartData?.comparison) {
      return { labels: [], datasets: [] };
    }

    const data = chartData.comparison;

    return {
      labels: chartData.channels || [],
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
    setTrendType(newTrendType);
  };

  const handleChartViewChange = (newView) => {
    setChartView(newView);
  };

  const comparisonChartData = prepareComparisonChartData();
  const trendChartData = prepareTrendChartData();

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
                        tableData = chartData.channels?.map((channel, index) => ({
                          channel,
                          total: chartData.comparison?.current?.[index] || 0,
                          avg: Math.round((chartData.comparison?.current?.[index] || 0) / 1),
                          trend: (chartData.comparison?.changes?.[index] || 0) < 0 ? 'improving' : 
                                (chartData.comparison?.changes?.[index] || 0) > 0 ? 'deteriorating' : 'stable'
                        })) || [];
                      }
                      
                      return tableData
                        .sort((a, b) => b.total - a.total)
                        .map((channel, index) => (
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
                })}
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