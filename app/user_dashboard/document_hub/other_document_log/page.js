// app/user_dashboard/document_hub/other_document_log/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaFileAlt, FaMobile, FaSimCard, FaKey, 
  FaUsers, FaComment, FaCog, FaArrowRight,
  FaEye, FaEdit, FaTrash,
  FaChartLine, FaDatabase, FaHistory,
  FaFilter, FaDownload, FaSync,
  FaMoneyBillWave, FaClipboardCheck, FaBullhorn,
  FaCashRegister, FaProjectDiagram
} from 'react-icons/fa';
import LoadingSpinner from '../../../components/LoadingSpinner';

const documentTypes = [
  { 
    value: 'device_tracker', 
    label: 'Device Tracker', 
    icon: <FaMobile className="text-lg" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverColor: 'hover:bg-blue-50',
    gradient: 'from-blue-500 to-blue-600',
    description: 'View and manage all tracked devices',
    route: '/user_dashboard/document_hub/other_document_log/device_tracker_log'
  },
  { 
    value: 'sim_tracker', 
    label: 'SIM Tracker', 
    icon: <FaSimCard className="text-lg" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    hoverColor: 'hover:bg-green-50',
    gradient: 'from-green-500 to-green-600',
    description: 'View and manage SIM card tracking',
    route: '/user_dashboard/document_hub/other_document_log/sim_tracker_log'
  },
  { 
    value: 'portal_tracker', 
    label: 'Portal Tracker', 
    icon: <FaCog className="text-lg" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    hoverColor: 'hover:bg-purple-50',
    gradient: 'from-purple-500 to-purple-600',
    description: 'View portal access logs',
    route: '/user_dashboard/document_hub/other_document_log/portal_tracker_log'
  },
  { 
    value: 'password_tracker', 
    label: 'Password Tracker', 
    icon: <FaKey className="text-lg" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    hoverColor: 'hover:bg-red-50',
    gradient: 'from-red-500 to-red-600',
    description: 'View password change history',
    route: '/user_dashboard/document_hub/other_document_log/password_tracker_log'
  },
  { 
    value: 'escalation_matrix', 
    label: 'Escalation Matrix', 
    icon: <FaUsers className="text-lg" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    hoverColor: 'hover:bg-orange-50',
    gradient: 'from-orange-500 to-orange-600',
    description: 'View escalation history',
    route: '/user_dashboard/document_hub/other_document_log/escalation_matrix_log'
  },
  { 
    value: 'cms_static_response', 
    label: 'CMS Static Response', 
    icon: <FaComment className="text-lg" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    hoverColor: 'hover:bg-indigo-50',
    gradient: 'from-indigo-500 to-indigo-600',
    description: 'View CMS response logs',
    route: '/user_dashboard/document_hub/other_document_log/cms_static_response_log'
  },
  { 
    value: 'stakeholder_communication_details', 
    label: 'Stakeholder Info', 
    icon: <FaUsers className="text-lg" />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    hoverColor: 'hover:bg-cyan-50',
    gradient: 'from-cyan-500 to-cyan-600',
    description: 'View Stakeholder Communication details',
    route: '/user_dashboard/document_hub/other_document_log/stakeholder_communication_details'
  },
  { 
    value: 'biller_tracker', 
    label: 'Biller Tracker', 
    icon: <FaMoneyBillWave className="text-lg" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    hoverColor: 'hover:bg-emerald-50',
    gradient: 'from-emerald-500 to-emerald-600',
    description: 'View billing system and payment tracking logs',
    route: '/user_dashboard/document_hub/other_document_log/biller_tracker_log'
  },
  { 
    value: 'uat_tracker', 
    label: 'UAT Tracker', 
    icon: <FaClipboardCheck className="text-lg" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    hoverColor: 'hover:bg-teal-50',
    gradient: 'from-teal-500 to-teal-600',
    description: 'View User Acceptance Testing management logs',
    route: '/user_dashboard/document_hub/other_document_log/uat_tracker_log'
  },
  { 
    value: 'campaign_tracker', 
    label: 'Campaign Tracker', 
    icon: <FaBullhorn className="text-lg" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    hoverColor: 'hover:bg-pink-50',
    gradient: 'from-pink-500 to-pink-600',
    description: 'View marketing campaign monitoring logs',
    route: '/user_dashboard/document_hub/other_document_log/campaign_tracker_log'
  },
  { 
    value: 'disbursement_tracker', 
    label: 'Disbursement Tracker', 
    icon: <FaCashRegister className="text-lg" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    hoverColor: 'hover:bg-amber-50',
    gradient: 'from-amber-500 to-amber-600',
    description: 'View fund disbursement and payment tracking logs',
    route: '/user_dashboard/document_hub/other_document_log/disbursement_tracker_log'
  },
  { 
    value: '2_phase_gap_tracker', 
    label: '2-PHASE Gap Tracker', 
    icon: <FaProjectDiagram className="text-lg" />,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    hoverColor: 'hover:bg-violet-50',
    gradient: 'from-violet-500 to-violet-600',
    description: 'View project gap analysis and resolution tracking logs',
    route: '/user_dashboard/document_hub/other_document_log/2_phase_gap_tracker_log'
  }
];

export default function OtherDocumentLog() {
  const [selectedType, setSelectedType] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [stats, setStats] = useState({
    totalEntries: 0,
    activeDevices: 0,
    activeUsers: 0,
    pendingActions: 0
  });
  const router = useRouter();

  const handleTypeSelect = async (type) => {
    const documentType = documentTypes.find(doc => doc.value === type);
    if (!documentType) return;

    setSelectedType(type);
    setIsNavigating(true);

    try {
      // Short delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to the specific log page
      router.push(documentType.route);
      
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
    }
  };

  // Show only the loading spinner when navigating
  if (isNavigating) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <div className="bg-white rounded shadow-lg p-6 border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-full -translate-y-12 translate-x-12"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-green-500/10 to-cyan-600/10 rounded-full -translate-x-10 translate-y-10"></div>

            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-700 rounded shadow-md mr-3">
                    <FaDatabase className="text-xl text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                      Document Tracker Logs
                    </h1>
                    <p className="text-slate-600 mt-1 text-sm">
                      Comprehensive tracking and management system for all documents and assets
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center justify-end lg:justify-center">
                <button className="flex items-center px-3 py-1.5 bg-white border border-slate-300 rounded text-sm hover:bg-slate-50 transition-all shadow-sm">
                  <FaSync className="text-slate-500 mr-1.5 text-xs" />
                  <span className="text-slate-700 font-medium">Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded shadow-md p-4 border border-slate-200 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Entries</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{stats.totalEntries}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded group-hover:scale-110 transition-transform">
                <FaDatabase className="text-lg text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded shadow-md p-4 border border-slate-200 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Active Devices</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{stats.activeDevices}</p>
              </div>
              <div className="p-2 bg-green-50 rounded group-hover:scale-110 transition-transform">
                <FaMobile className="text-lg text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded shadow-md p-4 border border-slate-200 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Active Users</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{stats.activeUsers}</p>
              </div>
              <div className="p-2 bg-orange-50 rounded group-hover:scale-110 transition-transform">
                <FaUsers className="text-lg text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow-md p-4 border border-slate-200 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Pending Actions</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{stats.pendingActions}</p>
              </div>
              <div className="p-2 bg-red-50 rounded group-hover:scale-110 transition-transform">
                <FaHistory className="text-lg text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Type Selection Section */}
        <div className="bg-white rounded shadow-lg p-6 border border-slate-200 mb-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <div className="w-8 h-8 rounded bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-md">
                  <FaEye className="text-white text-sm" />
                </div>
                Document Types
              </h2>
              <p className="text-slate-600 mt-1 ml-11 text-sm">
                Select a log type to view detailed tracking information
              </p>
            </div>
          </div>

          {/* Compact Type Cards Grid - 4 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {documentTypes.map((docType) => (
              <button
                key={docType.value}
                onClick={() => handleTypeSelect(docType.value)}
                className={`p-4 rounded border transition-all duration-300 group relative overflow-hidden ${
                  selectedType === docType.value
                    ? `${docType.borderColor} ${docType.bgColor} ring-1 ring-opacity-50 ${docType.color.replace('text', 'ring')} shadow-md scale-[1.02]`
                    : 'border-slate-200 bg-white hover:shadow-lg hover:scale-[1.02] hover:border-slate-300'
                }`}
              >
                {/* Background Gradient Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${docType.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center w-full">
                      <div className={`p-2.5 rounded-md ${docType.bgColor} ${docType.color} shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                        {docType.icon}
                      </div>
                      <div className="ml-3 text-left flex-1 min-w-0">
                        <h3 className={`font-semibold text-base truncate ${
                          selectedType === docType.value ? docType.color : 'text-slate-800'
                        }`}>
                          {docType.label}
                        </h3>
                        <p className="text-slate-600 text-xs mt-0.5 line-clamp-2">
                          {docType.description}
                        </p>
                      </div>
                    </div>
                    <FaArrowRight className={`text-slate-400 text-xs mt-1 flex-shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform ${
                      selectedType === docType.value ? docType.color : ''
                    }`} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}