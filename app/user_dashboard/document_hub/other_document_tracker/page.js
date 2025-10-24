// app/user_dashboard/document_hub/other_document_tracker/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaFileAlt, FaMobile, FaSimCard, FaKey, 
  FaUsers, FaComment, FaArrowRight, FaCog 
} from 'react-icons/fa';
import LoadingSpinner from '../../../components/LoadingSpinner';

const documentTypes = [
  { 
    value: 'DeviceTracker', 
    label: 'Device Tracker', 
    icon: <FaMobile className="text-xl" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    path: '/user_dashboard/document_hub/other_document_tracker/device_tracker'
  },
  { 
    value: 'SimTracker', 
    label: 'Sim Tracker', 
    icon: <FaSimCard className="text-xl" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    path: '/user_dashboard/document_hub/other_document_tracker/sim_tracker'
  },
  { 
    value: 'PortalTracker', 
    label: 'Portal Tracker', 
    icon: <FaCog className="text-xl" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    path: '/user_dashboard/document_hub/other_document_tracker/portal_tracker'
  },
  { 
    value: 'PasswordTracker', 
    label: 'Password Tracker', 
    icon: <FaKey className="text-xl" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    path: '/user_dashboard/document_hub/other_document_tracker/password_tracker'
  },
  { 
    value: 'EscalationMatrix', 
    label: 'Escalation Matrix', 
    icon: <FaUsers className="text-xl" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    path: '/user_dashboard/document_hub/other_document_tracker/escalation_matrix'
  },
  { 
    value: 'CMSStaticResponse', 
    label: 'CMS Static Response', 
    icon: <FaComment className="text-xl" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    path: '/user_dashboard/document_hub/other_document_tracker/cms_static_response'
  },
  { 
    value: 'StakeholderCommunication', 
    label: 'Stakeholder Communication', 
    icon: <FaUsers className="text-xl" />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    path: '/user_dashboard/document_hub/other_document_tracker/stakeholder_communication'
  }
];

export default function OtherDocumentTracker() {
  const [selectedType, setSelectedType] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState('');
  const router = useRouter();

  const handleTypeSelect = async (type) => {
    const documentType = documentTypes.find(doc => doc.value === type);
    if (!documentType) return;

    setSelectedType(type);
    setNavigatingTo(documentType.label);
    setIsNavigating(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      router.push(documentType.path);
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
      setNavigatingTo('');
    }
  };

  const selectedDocument = documentTypes.find(doc => doc.value === selectedType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Loading Overlay */}
      {isNavigating && (<LoadingSpinner/>)}

      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Other Document Tracker</h1>
                <p className="text-gray-600 mt-2">Track and manage various documents and assets in one place</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FaFileAlt className="text-2xl text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                <FaFileAlt className="text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-gray-800">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                <FaMobile className="text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Devices</p>
                <p className="text-2xl font-bold text-gray-800">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100 text-orange-600 mr-4">
                <FaSimCard className="text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">SIM Cards</p>
                <p className="text-2xl font-bold text-gray-800">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                <FaKey className="text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Passwords</p>
                <p className="text-2xl font-bold text-gray-800">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Document Type Selection */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <FaFileAlt className="text-blue-600" />
            </div>
            Select Document Type
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documentTypes.map((docType) => (
              <button
                key={docType.value}
                onClick={() => handleTypeSelect(docType.value)}
                disabled={isNavigating}
                className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                  selectedType === docType.value
                    ? `${docType.borderColor} ${docType.bgColor} ring-2 ring-opacity-50 ${docType.color.replace('text', 'ring')}`
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${isNavigating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${docType.bgColor} ${docType.color} mr-4`}>
                      {docType.icon}
                    </div>
                    <div className="text-left">
                      <h3 className={`font-semibold ${
                        selectedType === docType.value ? docType.color : 'text-gray-800'
                      }`}>
                        {docType.label}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Track {docType.label.toLowerCase()} information
                      </p>
                    </div>
                  </div>
                  <FaArrowRight className={`text-gray-400 ${
                    selectedType === docType.value ? docType.color : ''
                  }`} />
                </div>
              </button>
            ))}
          </div>

          {/* Selected Type Info */}
          {selectedDocument && !isNavigating && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  {selectedDocument.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-blue-800">
                    {selectedDocument.label} Selected
                  </h3>
                  <p className="text-blue-600 text-sm">
                    You are about to create a new {selectedDocument.label.toLowerCase()} entry.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity Placeholder */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
          <div className="text-center py-8">
            <FaFileAlt className="mx-auto text-4xl text-gray-400 mb-4" />
            <p className="text-gray-600">No recent activity found</p>
            <p className="text-sm text-gray-500 mt-1">
              Start tracking documents to see activity here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}