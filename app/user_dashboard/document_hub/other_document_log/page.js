// app/user_dashboard/document_hub/other_document_log/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaFileAlt, FaMobile, FaSimCard, FaKey, 
  FaUsers, FaComment, FaCog, FaArrowRight,
  FaSearch, FaEye, FaEdit, FaTrash
} from 'react-icons/fa';

const documentTypes = [
  { 
    value: 'device_tracker_log', 
    label: 'Device Tracker Log', 
    icon: <FaMobile className="text-xl" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'View and manage all tracked devices'
  },
  { 
    value: 'sim_tracker_log', 
    label: 'Sim Tracker Log', 
    icon: <FaSimCard className="text-xl" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'View and manage SIM card tracking'
  },
  { 
    value: 'portal_tracker_log', 
    label: 'Portal Tracker Log', 
    icon: <FaCog className="text-xl" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'View portal access logs'
  },
  { 
    value: 'password_tracker_log', 
    label: 'Password Tracker Log', 
    icon: <FaKey className="text-xl" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'View password change history'
  },
  { 
    value: 'escalation_matrix_log', 
    label: 'Escalation Matrix Log', 
    icon: <FaUsers className="text-xl" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'View escalation history'
  },
  { 
    value: 'cms_static_response_log', 
    label: 'CMS Static Response Log', 
    icon: <FaComment className="text-xl" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    description: 'View CMS response logs'
  }
];

export default function OtherDocumentLog() {
  const [selectedType, setSelectedType] = useState('');
  const router = useRouter();

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    // Navigate to the specific log page
    if (type === 'device_tracker_log') {
      router.push('/user_dashboard/document_hub/other_document_log/device_tracker_log');
    }
    // Add other log type navigations as needed
  };

  const selectedDocument = documentTypes.find(doc => doc.value === selectedType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Document Tracker Logs</h1>
                <p className="text-gray-600 mt-2">View and manage tracking logs for various documents and assets</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FaFileAlt className="text-2xl text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Log Type Selection */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <FaEye className="text-blue-600" />
            </div>
            Select Log Type
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documentTypes.map((docType) => (
              <button
                key={docType.value}
                onClick={() => handleTypeSelect(docType.value)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                  selectedType === docType.value
                    ? `${docType.borderColor} ${docType.bgColor} ring-2 ring-opacity-50 ${docType.color.replace('text', 'ring')}`
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
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
                        {docType.description}
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
          {selectedDocument && (
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
                    You are about to view {selectedDocument.description.toLowerCase()}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                <FaFileAlt className="text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Log Entries</p>
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
                <FaUsers className="text-xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-800">0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}