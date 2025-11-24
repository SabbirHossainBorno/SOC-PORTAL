'use client';

import { useState, useEffect } from 'react';
import { 
  CpuChipIcon, 
  ServerStackIcon, 
  ChartBarSquareIcon,
  CommandLineIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  WifiIcon,
  DocumentTextIcon,
  CubeIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function SystemWatchdog() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdate, setLastUpdate] = useState(null);

  // API Metrics State
  const [apiMetrics, setApiMetrics] = useState({
    totalRequests: 1247,
    successRate: 98.2,
    averageResponseTime: '142ms',
    errorCount: 23,
    activeConnections: 45,
    endpoints: [
      { method: 'GET', endpoint: '/api/users', status: 200, count: 245, avgTime: '89ms', lastError: null },
      { method: 'POST', endpoint: '/api/auth/login', status: 200, count: 187, avgTime: '156ms', lastError: null },
      { method: 'GET', endpoint: '/api/notifications', status: 200, count: 423, avgTime: '67ms', lastError: null },
      { method: 'POST', endpoint: '/api/admin/add_user', status: 500, count: 5, avgTime: '234ms', lastError: 'Database timeout' },
      { method: 'GET', endpoint: '/api/reports', status: 200, count: 89, avgTime: '178ms', lastError: null },
    ],
    recentErrors: [
      { timestamp: '12:05:32', endpoint: '/api/admin/add_user', error: 'Database connection timeout', status: 500, severity: 'high' },
      { timestamp: '12:04:15', endpoint: '/api/upload', error: 'File size exceeds limit', status: 413, severity: 'medium' },
      { timestamp: '12:03:47', endpoint: '/api/auth/login', error: 'Invalid credentials', status: 401, severity: 'low' },
    ]
  });

  // Clear search results when input is cleared
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSearchResults(null);
    }
  }, [searchKeyword]);

  useEffect(() => {
    if (autoRefresh) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin_dashboard/system_watchdog');
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.data);
        setError(null);
        setLastUpdate(new Date());
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch system metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      setSearchResults(null);
      return;
    }
    
    setSearching(true);
    try {
      const response = await fetch('/api/admin_dashboard/system_watchdog?action=search&keyword=' + encodeURIComponent(searchKeyword));
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.results);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const downloadSearchResults = () => {
    if (!searchResults) return;
    
    const content = searchResults.map(r => `[${r.file}] ${r.line}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soc-portal-search-${new Date().toISOString().split('T')[0]}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearSearch = () => {
    setSearchKeyword('');
    setSearchResults(null);
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="space-y-2">
            <p className="text-gray-800 text-lg font-semibold">Initializing System Monitor</p>
            <p className="text-gray-600 text-sm">Loading real-time metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-gray-800">
      {/* Header */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded shadow-lg">
                <ChartBarSquareIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  System Watchdog
                </h1>
                <p className="text-gray-600 text-sm">Real-time monitoring & analytics dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-white border border-gray-300 rounded px-4 py-2 shadow-sm">
                <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                {lastUpdate && (
                    <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded border border-gray-200">
                    Updated: {lastUpdate.toLocaleTimeString()}
                    </div>
                )}

                <span className="text-sm font-medium text-gray-700">Auto-refresh</span>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  {autoRefresh ? <PauseIcon className="h-4 w-4 text-gray-600" /> : <PlayIcon className="h-4 w-4 text-gray-600" />}
                </button>
              </div>
              
              <button
                onClick={fetchMetrics}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 hover:border-blue-500 text-gray-700 rounded transition-all duration-200 group shadow-sm hover:shadow-md"
              >
                <ArrowPathIcon className={`h-4 w-4 group-hover:rotate-180 transition-transform ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">Refresh</span>
              </button>
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded flex items-center gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-white rounded p-1 border border-gray-200 shadow-sm">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarSquareIcon },
              { id: 'processes', name: 'Processes', icon: CommandLineIcon },
              { id: 'logs', name: 'Log Explorer', icon: DocumentTextIcon },
              { id: 'api', name: 'API Analytics', icon: CubeIcon },
              { id: 'network', name: 'Network', icon: GlobeAltIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-3 rounded font-medium transition-all duration-200 flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* System Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <MetricCard
                title="CPU Usage"
                value={metrics?.cpu.usage}
                unit="%"
                icon={CpuChipIcon}
                color="blue"
                trend="up"
                subtitle={`${metrics?.cpu.cores} cores`}
                warning={metrics?.cpu.usage > 85}
              />
              
              <MetricCard
                title="Memory Usage"
                value={metrics?.memory.usage ? Math.round(metrics.memory.usage) : null}
                unit="%"
                icon={ServerStackIcon}
                color="indigo"
                trend="stable"
                subtitle={`${metrics?.memory.used} used`}
                warning={metrics?.memory.usage > 85}
              />
              
              <MetricCard
                title="Disk Usage"
                value={metrics?.disk.usage}
                unit="%"
                icon={ChartBarSquareIcon}
                color="purple"
                trend="down"
                subtitle={`${metrics?.disk.used} used`}
                warning={metrics?.disk.usage > 90}
              />
              
              <MetricCard
                title="Active Users"
                value={metrics?.users}
                unit="users"
                icon={UserGroupIcon}
                color="green"
                trend="up"
                subtitle="Connected sessions"
              />
            </div>

            {/* Detailed Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* System Status */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <ServerStackIcon className="h-5 w-5 text-blue-600" />
                    System Information
                  </h3>
                  <div className="space-y-3">
                    <InfoRow label="Hostname" value={metrics?.system.hostname} />
                    <InfoRow label="Platform" value={metrics?.system.platform} />
                    <InfoRow label="Uptime" value={metrics?.system.uptime} />
                    <InfoRow label="Architecture" value={metrics?.system.arch} />
                  </div>
                </div>

                <div className="bg-white rounded border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <WifiIcon className="h-5 w-5 text-indigo-600" />
                    Network Status
                  </h3>
                  <div className="space-y-4">
                    <TrafficItem label="Upload" value={metrics?.network.upload} color="blue" />
                    <TrafficItem label="Download" value={metrics?.network.download} color="green" />
                    <TrafficItem label="Interfaces" value={metrics?.network.interfaces} color="purple" />
                  </div>
                </div>

                {/* Memory Visualization */}
                <div className="md:col-span-2 bg-white rounded border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Memory Utilization</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <MemoryGauge 
                      label="Used Memory"
                      value={metrics?.memory.used}
                      percentage={metrics?.memory.usage}
                      color="blue"
                    />
                    <MemoryGauge 
                      label="Free Memory"
                      value={metrics?.memory.free}
                      percentage={100 - (metrics?.memory.usage || 0)}
                      color="green"
                    />
                  </div>
                </div>
              </div>

              {/* Health Status */}
              <div className="space-y-6">
                <div className="bg-white rounded border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6">System Health</h3>
                  <div className="space-y-6">
                    <HealthIndicator 
                      label="CPU Health" 
                      value={metrics?.cpu.usage} 
                      threshold={85}
                    />
                    <HealthIndicator 
                      label="Memory Health" 
                      value={metrics?.memory.usage} 
                      threshold={85}
                    />
                    <HealthIndicator 
                      label="Disk Health" 
                      value={metrics?.disk.usage} 
                      threshold={90}
                    />
                    <HealthIndicator 
                      label="Error Status" 
                      value={metrics?.logs.errorCount > 0 ? 100 : 0} 
                      threshold={50}
                      invert
                    />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded border border-blue-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{metrics?.cpu.cores}</div>
                      <div className="text-sm text-gray-600">CPU Cores</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-indigo-600">{metrics?.cpu.loadAverage?.[0]?.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Load Avg</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{metrics?.logs.errorCount}</div>
                      <div className="text-sm text-gray-600">Errors</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{metrics?.users}</div>
                      <div className="text-sm text-gray-600">Users</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Process Monitor */}
        {activeTab === 'processes' && metrics?.processes && (
          <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Process Monitor</h3>
                  <p className="text-gray-600 text-sm">Real-time process tracking and resource utilization</p>
                </div>
                <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded border border-gray-300">
                  {metrics.processes.length} processes
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Process</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">PID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">CPU</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Memory</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Command</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {metrics.processes.map((process, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-800">{process.user}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{process.pid}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                parseFloat(process.cpu) > 50 ? 'bg-red-500' : 
                                parseFloat(process.cpu) > 20 ? 'bg-yellow-500' : 
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, parseFloat(process.cpu))}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-800 w-8">{process.cpu}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{process.mem}%</td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono max-w-xs truncate group-hover:text-gray-800 transition-colors">
                        {process.command}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Log Explorer */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            {/* Search Controls */}
            <div className="bg-white rounded border border-gray-200 p-6 shadow-sm">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Search Log Files
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="Enter keyword, error code, user ID, or EID..."
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 placeholder-gray-400 font-medium pr-12"
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    {searchKeyword && (
                      <button
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchKeyword.trim()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded flex items-center gap-2 font-semibold transition-all duration-200 disabled:hover:bg-blue-600"
                  >
                    <MagnifyingGlassIcon className="h-5 w-5" />
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                  {searchResults && (
                    <button
                      onClick={downloadSearchResults}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-2 font-semibold transition-all duration-200"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5" />
                      Export
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Search Results */}
            {searchResults && (
              <div className="bg-gray-900 rounded border border-gray-700 overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <h3 className="text-lg font-semibold text-green-400">
                      Search Results ({searchResults.length})
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-green-300 font-mono bg-gray-900 px-3 py-1 rounded">
                      grep "{searchKeyword}" *.log
                    </span>
                    <button
                      onClick={clearSearch}
                      className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto font-mono text-sm bg-black">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="px-6 py-3 border-b border-gray-800 hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-yellow-400 text-xs bg-gray-800 px-2 py-1 rounded whitespace-nowrap mt-1 flex-shrink-0">
                          {result.file}
                        </span>
                        <span className="text-blue-400 text-xs whitespace-nowrap mt-1 flex-shrink-0">
                          {result.timestamp}
                        </span>
                        <span className="flex-1 text-green-400 break-all">{result.line}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Log Tail */}
            <div className="bg-gray-900 rounded border border-gray-700 overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-gray-700 bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                    <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                      <DocumentTextIcon className="h-5 w-5" />
                      Live Log Stream - {metrics?.logs.currentFile}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-900 px-3 py-1 rounded">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-300 text-sm font-mono">LIVE</span>
                  </div>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto font-mono text-sm bg-black">
                {metrics?.logs.lastEntries.map((entry, index) => (
                  <div
                    key={index}
                    className={`px-6 py-2 border-b border-gray-800 hover:bg-gray-800 transition-colors ${
                      entry.toLowerCase().includes('error') ? 'text-red-400' : 
                      entry.toLowerCase().includes('warning') ? 'text-yellow-400' : 
                      entry.includes('INFO') ? 'text-blue-400' :
                      'text-green-400'
                    }`}
                  >
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* API Analytics */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            {/* API Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard
                title="Total Requests"
                value={apiMetrics.totalRequests}
                icon={CubeIcon}
                color="blue"
                trend="up"
              />
              <MetricCard
                title="Success Rate"
                value={apiMetrics.successRate}
                unit="%"
                icon={ChartBarSquareIcon}
                color="green"
                trend="stable"
              />
              <MetricCard
                title="Avg Response"
                value={apiMetrics.averageResponseTime}
                icon={ClockIcon}
                color="indigo"
                trend="down"
              />
              <MetricCard
                title="Active Connections"
                value={apiMetrics.activeConnections}
                icon={UserGroupIcon}
                color="purple"
                trend="up"
              />
            </div>

            {/* API Endpoints Table */}
            <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-xl font-semibold text-gray-800">API Endpoint Performance</h3>
                <p className="text-gray-600 text-sm">Real-time API monitoring and response analytics</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Endpoint</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Requests</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Response Time</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Last Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {apiMetrics.endpoints.map((endpoint, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            endpoint.method === 'POST' ? 'bg-green-100 text-green-800 border border-green-200' :
                            endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                            'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {endpoint.method}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 font-mono">
                          {endpoint.endpoint}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            endpoint.status === 200 ? 'bg-green-100 text-green-800 border border-green-200' :
                            endpoint.status >= 400 ? 'bg-red-100 text-red-800 border border-red-200' :
                            'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          }`}>
                            {endpoint.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
                          {endpoint.count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
                          {endpoint.avgTime}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {endpoint.lastError || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* API Health & Errors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Errors */}
              <div className="bg-white rounded border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                  Recent API Errors
                </h3>
                <div className="space-y-3">
                  {apiMetrics.recentErrors.map((error, index) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-red-800">{error.endpoint}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          error.severity === 'high' ? 'bg-red-200 text-red-800' :
                          error.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-blue-200 text-blue-800'
                        }`}>
                          {error.severity}
                        </span>
                      </div>
                      <p className="text-sm text-red-700 mb-2">{error.error}</p>
                      <div className="flex justify-between items-center text-xs text-red-600">
                        <span>{error.timestamp}</span>
                        <span>Status: {error.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* API Health Monitor */}
              <div className="bg-white rounded border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">API Health Status</h3>
                <div className="space-y-4">
                  <HealthIndicator 
                    label="Authentication API" 
                    value={95} 
                    threshold={80}
                  />
                  <HealthIndicator 
                    label="Database API" 
                    value={88} 
                    threshold={85}
                  />
                  <HealthIndicator 
                    label="File Upload API" 
                    value={92} 
                    threshold={75}
                  />
                  <HealthIndicator 
                    label="Notification API" 
                    value={98} 
                    threshold={90}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Network Information */}
        {activeTab === 'network' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <GlobeAltIcon className="h-5 w-5 text-blue-600" />
                Network Statistics
              </h3>
              <div className="space-y-4">
                <TrafficItem 
                  label="Upload Speed" 
                  value={metrics?.network.upload} 
                  color="blue"
                  icon="⬆️"
                />
                <TrafficItem 
                  label="Download Speed" 
                  value={metrics?.network.download} 
                  color="green"
                  icon="⬇️"
                />
                <TrafficItem 
                  label="Active Connections" 
                  value={metrics?.users} 
                  color="purple"
                  icon="🔗"
                />
                <TrafficItem 
                  label="Network Interfaces" 
                  value={metrics?.network.interfaces} 
                  color="blue"
                  icon="🌐"
                />
              </div>
            </div>

            <div className="bg-white rounded border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">System Overview</h3>
              <div className="space-y-4">
                <InfoRow label="Hostname" value={metrics?.system.hostname} />
                <InfoRow label="Platform" value={metrics?.system.platform} />
                <InfoRow label="Architecture" value={metrics?.system.arch} />
                <InfoRow label="Uptime" value={metrics?.system.uptime} />
                <InfoRow label="CPU Cores" value={metrics?.cpu.cores} />
                <InfoRow label="Load Average" value={metrics?.cpu.loadAverage?.map(l => l.toFixed(2)).join(', ')} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Enhanced Metric Card Component
function MetricCard({ title, value, unit, icon: Icon, color, warning, subtitle, trend }) {
  const colorClasses = {
    blue: { text: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
    indigo: { text: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-200' },
    green: { text: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' },
    purple: { text: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' },
  };

  const trendIcons = {
    up: '↗',
    down: '↘',
    stable: '→'
  };

  return (
    <div className={`bg-white rounded border ${colorClasses[color]?.border} p-6 shadow-sm hover:shadow-md transition-all duration-200`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</p>
        <div className={`p-3 rounded ${colorClasses[color]?.bg}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <p className={`text-3xl font-bold ${warning ? 'text-red-600' : colorClasses[color]?.text}`}>
          {value ?? '--'}
        </p>
        {unit && <span className="text-sm font-medium text-gray-500">{unit}</span>}
        {trend && (
          <span className="text-sm font-medium text-gray-500 ml-2">
            {trendIcons[trend]}
          </span>
        )}
      </div>
      {subtitle && <p className="text-sm font-medium text-gray-600">{subtitle}</p>}
    </div>
  );
}

// Status Item Component
function StatusItem({ label, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    indigo: 'text-indigo-600 bg-indigo-100',
    green: 'text-green-600 bg-green-100',
    red: 'text-red-600 bg-red-100',
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span className="text-sm font-bold text-gray-800">{value}</span>
    </div>
  );
}

// Traffic Item Component
function TrafficItem({ label, value, color, icon }) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span className={`text-sm font-bold ${colorClasses[color]}`}>{value}</span>
    </div>
  );
}

// Memory Gauge Component
function MemoryGauge({ label, value, percentage, color }) {
  const colorClasses = {
    blue: '#3b82f6',
    green: '#10b981',
  };

  return (
    <div className="text-center">
      <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>
      <div className="relative w-24 h-24 mx-auto mb-2">
        <svg className="w-full h-full" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={colorClasses[color]}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 3.39} 340`}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-800">{percentage?.toFixed(0)}%</span>
        </div>
      </div>
      <div className="text-sm text-gray-600 font-mono">{value}</div>
    </div>
  );
}

// Health Indicator Component
function HealthIndicator({ label, value, threshold, invert = false }) {
  // Format the value to show only integer percentage
  const displayValue = value ? Math.round(value) : 0;
  
  // Determine status based on threshold and invert logic
  let status;
  if (invert) {
    // For Error Status: Higher is worse
    status = displayValue > threshold ? 'critical' : 
             displayValue > threshold * 0.7 ? 'warning' : 'healthy';
  } else {
    // For CPU/Memory/Disk: Higher is worse
    status = displayValue <= threshold ? 'healthy' : 
             displayValue <= threshold + 10 ? 'warning' : 'critical';
  }
  
  const statusConfig = {
    healthy: { color: 'text-green-600', bg: 'bg-green-100', text: 'Healthy', icon: '✅' },
    warning: { color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Warning', icon: '⚠️' },
    critical: { color: 'text-red-600', bg: 'bg-red-100', text: 'Critical', icon: '🚨' },
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-gray-800">{displayValue}%</span>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig[status].bg} ${statusConfig[status].color} flex items-center gap-1`}>
          {statusConfig[status].icon}
          {statusConfig[status].text}
        </span>
      </div>
    </div>
  );
}

// Info Row Component
function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <span className="text-sm font-bold text-gray-800">{value ?? '--'}</span>
    </div>
  );
}