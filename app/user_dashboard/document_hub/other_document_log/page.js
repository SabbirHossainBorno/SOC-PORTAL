// app/user_dashboard/document_hub/other_document_log/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaFileAlt, FaMobile, FaSimCard, FaKey, 
  FaUsers, FaComment, FaCog, FaArrowRight,
  FaSearch, FaEye, FaEdit, FaTrash,
  FaChartLine, FaDatabase, FaHistory,
  FaFilter, FaDownload, FaSync
} from 'react-icons/fa';
import LoadingSpinner from '../../../components/LoadingSpinner';

const documentTypes = [
  { 
    value: 'device_tracker_log', 
    label: 'Device Tracker Log', 
    icon: <FaMobile className="text-xl" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverColor: 'hover:bg-blue-50',
    gradient: 'from-blue-500 to-blue-600',
    description: 'View and manage all tracked devices',
    stats: { total: 127, active: 89, pending: 12 }
  },
  { 
    value: 'sim_tracker_log', 
    label: 'SIM Tracker Log', 
    icon: <FaSimCard className="text-xl" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    hoverColor: 'hover:bg-green-50',
    gradient: 'from-green-500 to-green-600',
    description: 'View and manage SIM card tracking',
    stats: { total: 89, active: 67, pending: 5 }
  },
  { 
    value: 'portal_tracker_log', 
    label: 'Portal Tracker Log', 
    icon: <FaCog className="text-xl" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    hoverColor: 'hover:bg-purple-50',
    gradient: 'from-purple-500 to-purple-600',
    description: 'View portal access logs',
    stats: { total: 342, active: 298, pending: 23 }
  },
  { 
    value: 'password_tracker_log', 
    label: 'Password Tracker Log', 
    icon: <FaKey className="text-xl" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    hoverColor: 'hover:bg-red-50',
    gradient: 'from-red-500 to-red-600',
    description: 'View password change history',
    stats: { total: 56, active: 12, pending: 3 }
  },
  { 
    value: 'escalation_matrix_log', 
    label: 'Escalation Matrix Log', 
    icon: <FaUsers className="text-xl" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    hoverColor: 'hover:bg-orange-50',
    gradient: 'from-orange-500 to-orange-600',
    description: 'View escalation history',
    stats: { total: 78, active: 45, pending: 8 }
  },
  { 
    value: 'cms_static_response_log', 
    label: 'CMS Static Response Log', 
    icon: <FaComment className="text-xl" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    hoverColor: 'hover:bg-indigo-50',
    gradient: 'from-indigo-500 to-indigo-600',
    description: 'View CMS response logs',
    stats: { total: 234, active: 201, pending: 15 }
  },
  { 
    value: 'stakeholder_communication_details', 
    label: 'Stakeholder Communication', 
    icon: <FaUsers className="text-xl" />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    hoverColor: 'hover:bg-cyan-50',
    gradient: 'from-cyan-500 to-cyan-600',
    description: 'View Stakeholder Communication details',
    stats: { total: 45, active: 32, pending: 6 }
  }
];

export default function OtherDocumentLog() {
  const [selectedType, setSelectedType] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalEntries: 0,
    activeDevices: 0,
    activeUsers: 0,
    pendingActions: 0
  });
  const router = useRouter();

  // Calculate total stats from document types
  useEffect(() => {
    const totalStats = documentTypes.reduce((acc, type) => ({
      totalEntries: acc.totalEntries + type.stats.total,
      activeDevices: acc.activeDevices + (type.value === 'device_tracker_log' ? type.stats.active : 0),
      activeUsers: acc.activeUsers + type.stats.active,
      pendingActions: acc.pendingActions + type.stats.pending
    }), { totalEntries: 0, activeDevices: 0, activeUsers: 0, pendingActions: 0 });

    setStats(totalStats);
  }, []);

  const handleTypeSelect = async (type) => {
    setIsNavigating(true);
    setSelectedType(type);
    
    // Simulate API call delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Navigate to the specific log page
    if (type === 'device_tracker_log') {
      router.push('/user_dashboard/document_hub/other_document_log/device_tracker_log');
    }
    // Add other log type navigations as needed
    
    setIsNavigating(false);
  };

  const filteredDocumentTypes = documentTypes.filter(doc =>
    doc.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedDocument = documentTypes.find(doc => doc.value === selectedType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      {isNavigating && <LoadingSpinner />}
      
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-green-500/10 to-cyan-600/10 rounded-full -translate-x-12 translate-y-12"></div>
            
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-lg mr-4">
                    <FaDatabase className="text-2xl text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                      Document Tracker Logs
                    </h1>
                    <p className="text-slate-600 mt-2 text-lg">
                      Comprehensive tracking and management system for all documents and assets
                    </p>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3 mt-6">
                  <button className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                    <FaFilter className="text-slate-500 mr-2" />
                    <span className="text-slate-700 font-medium">Filters</span>
                  </button>
                  <button className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                    <FaDownload className="text-slate-500 mr-2" />
                    <span className="text-slate-700 font-medium">Export</span>
                  </button>
                  <button className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                    <FaSync className="text-slate-500 mr-2" />
                    <span className="text-slate-700 font-medium">Refresh</span>
                  </button>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl text-white">
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-1">{stats.totalEntries}</div>
                    <div className="text-slate-300 text-sm">Total Records</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Entries</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{stats.totalEntries}</p>
                <div className="flex items-center mt-2">
                  <span className="text-green-500 text-sm font-medium">+12%</span>
                  <span className="text-slate-500 text-sm ml-2">from last week</span>
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl group-hover:scale-110 transition-transform">
                <FaDatabase className="text-2xl text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Active Devices</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{stats.activeDevices}</p>
                <div className="flex items-center mt-2">
                  <span className="text-green-500 text-sm font-medium">+8%</span>
                  <span className="text-slate-500 text-sm ml-2">from last week</span>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-xl group-hover:scale-110 transition-transform">
                <FaMobile className="text-2xl text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Active Users</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{stats.activeUsers}</p>
                <div className="flex items-center mt-2">
                  <span className="text-green-500 text-sm font-medium">+15%</span>
                  <span className="text-slate-500 text-sm ml-2">from last week</span>
                </div>
              </div>
              <div className="p-4 bg-orange-50 rounded-xl group-hover:scale-110 transition-transform">
                <FaUsers className="text-2xl text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Pending Actions</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{stats.pendingActions}</p>
                <div className="flex items-center mt-2">
                  <span className="text-red-500 text-sm font-medium">-5%</span>
                  <span className="text-slate-500 text-sm ml-2">from last week</span>
                </div>
              </div>
              <div className="p-4 bg-red-50 rounded-xl group-hover:scale-110 transition-transform">
                <FaHistory className="text-2xl text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Log Type Selection */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200 mb-8">
          {/* Header with Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-4 shadow-lg">
                  <FaEye className="text-white text-lg" />
                </div>
                Document Log Types
              </h2>
              <p className="text-slate-600 mt-2 ml-14">
                Select a log type to view detailed tracking information
              </p>
            </div>
            
            <div className="relative lg:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search log types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50"
              />
            </div>
          </div>

          {/* Log Type Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDocumentTypes.map((docType) => (
              <button
                key={docType.value}
                onClick={() => handleTypeSelect(docType.value)}
                disabled={isNavigating}
                className={`p-6 rounded-2xl border-2 transition-all duration-300 group relative overflow-hidden ${
                  selectedType === docType.value
                    ? `${docType.borderColor} ${docType.bgColor} ring-2 ring-opacity-50 ${docType.color.replace('text', 'ring')} shadow-lg scale-[1.02]`
                    : 'border-slate-200 bg-white hover:shadow-xl hover:scale-[1.02] hover:border-slate-300'
                } ${isNavigating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {/* Background Gradient Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${docType.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`p-4 rounded-xl ${docType.bgColor} ${docType.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {docType.icon}
                      </div>
                      <div className="ml-4 text-left">
                        <h3 className={`font-bold text-lg ${
                          selectedType === docType.value ? docType.color : 'text-slate-800'
                        }`}>
                          {docType.label}
                        </h3>
                        <p className="text-slate-600 text-sm mt-1">
                          {docType.description}
                        </p>
                      </div>
                    </div>
                    <FaArrowRight className={`text-slate-400 group-hover:translate-x-1 transition-transform ${
                      selectedType === docType.value ? docType.color : ''
                    }`} />
                  </div>

                  {/* Stats Bar */}
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                    <div className="text-left">
                      <div className="flex space-x-4 text-xs">
                        <span className="text-slate-600">
                          <span className="font-semibold text-slate-800">{docType.stats.total}</span> Total
                        </span>
                        <span className="text-green-600">
                          <span className="font-semibold">{docType.stats.active}</span> Active
                        </span>
                        <span className="text-orange-600">
                          <span className="font-semibold">{docType.stats.pending}</span> Pending
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* No Results Message */}
          {filteredDocumentTypes.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaSearch className="text-slate-400 text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No matching log types</h3>
              <p className="text-slate-500">Try adjusting your search terms</p>
            </div>
          )}

          {/* Enhanced Selected Type Info */}
          {selectedDocument && (
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-3 bg-white rounded-xl shadow-sm mr-4 border border-blue-100">
                    {selectedDocument.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-800 text-lg">
                      {selectedDocument.label} Selected
                    </h3>
                    <p className="text-blue-600">
                      Preparing to view {selectedDocument.description.toLowerCase()}.
                      {isNavigating && ' Loading...'}
                    </p>
                  </div>
                </div>
                {isNavigating && (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center mr-4 shadow-lg">
                <FaChartLine className="text-white text-lg" />
              </div>
              Recent Activity
            </h2>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              View All Activity →
            </button>
          </div>
          
          <div className="space-y-4">
            {[
              { action: 'New device registered', type: 'Device Tracker', time: '2 minutes ago', user: 'You' },
              { action: 'SIM card updated', type: 'SIM Tracker', time: '15 minutes ago', user: 'John Doe' },
              { action: 'Password changed', type: 'Password Tracker', time: '1 hour ago', user: 'Jane Smith' },
              { action: 'Escalation created', type: 'Escalation Matrix', time: '2 hours ago', user: 'Mike Johnson' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-4"></div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{activity.action}</div>
                  <div className="text-sm text-slate-500">{activity.type} • {activity.user}</div>
                </div>
                <div className="text-sm text-slate-400">{activity.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}