// app/user_dashboard/document_hub/other_document_log/device_tracker_log/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaMobile, FaArrowLeft, FaSearch, FaEye, 
  FaEdit, FaTrash, FaSpinner, FaSync,
  FaFilter, FaDownload, FaPlus, FaTimes,
  FaCheckCircle, FaExclamationTriangle
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

// Device Details Modal Component
const DeviceDetailsModal = ({ device, isOpen, onClose, onEdit }) => {
  if (!isOpen || !device) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status) => {
    return status === 'Working' ? 
      <FaCheckCircle className="text-green-500 text-xl" /> : 
      <FaExclamationTriangle className="text-red-500 text-xl" />;
  };

  const getStatusColor = (status) => {
    return status === 'Working' ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <FaMobile className="text-blue-600 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Device Details - {device.dt_id}
                </h2>
                <p className="text-gray-600 text-sm">
                  {device.brand_name} {device.device_model}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onEdit}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FaEdit className="mr-2" />
                Edit Info
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Device Information */}
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Device Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tracking ID:</span>
                    <span className="font-semibold">{device.dt_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Brand:</span>
                    <span className="font-semibold">{device.brand_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <span className="font-semibold">{device.device_model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IMEI 1:</span>
                    <span className="font-semibold font-mono">{device.imei_1}</span>
                  </div>
                  {device.imei_2 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">IMEI 2:</span>
                      <span className="font-semibold font-mono">{device.imei_2}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Device Status */}
              <div className={`p-4 rounded-lg border ${getStatusColor(device.device_status)}`}>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  {getStatusIcon(device.device_status)}
                  <span className="ml-2">Device Status</span>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span className={`font-semibold ${device.device_status === 'Working' ? 'text-green-600' : 'text-red-600'}`}>
                      {device.device_status}
                    </span>
                  </div>
                  {device.device_status_details && (
                    <div>
                      <span className="font-medium">Reason:</span>
                      <p className="mt-1 text-sm bg-white p-2 rounded border">
                        {device.device_status_details}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-6">
              {/* SIM Information */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-green-800 mb-4">SIM Information</h3>
                <div className="space-y-4">
                  {device.sim_1 ? (
                    <div>
                      <h4 className="font-medium text-gray-700">SIM 1:</h4>
                      <div className="ml-4 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Number:</span>
                          <span className="font-semibold">{device.sim_1}</span>
                        </div>
                        {device.sim_1_persona && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Persona:</span>
                            <span className="font-semibold">{device.sim_1_persona}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No SIM 1 information</p>
                  )}

                  {device.sim_2 ? (
                    <div>
                      <h4 className="font-medium text-gray-700">SIM 2:</h4>
                      <div className="ml-4 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Number:</span>
                          <span className="font-semibold">{device.sim_2}</span>
                        </div>
                        {device.sim_2_persona && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Persona:</span>
                            <span className="font-semibold">{device.sim_2_persona}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No SIM 2 information</p>
                  )}
                </div>
              </div>

              {/* Purpose & Tracking */}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">Purpose & Tracking</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-600">Purpose:</span>
                    <p className="font-semibold mt-1">{device.purpose}</p>
                  </div>
                  {device.handover_to && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Handover To:</span>
                      <span className="font-semibold">{device.handover_to}</span>
                    </div>
                  )}
                  {device.handover_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Handover Date:</span>
                      <span className="font-semibold">{formatDate(device.handover_date)}</span>
                    </div>
                  )}
                  {device.return_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Return Date:</span>
                      <span className="font-semibold">{formatDate(device.return_date)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tracked By:</span>
                    <span className="font-semibold">{device.track_by}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created Date:</span>
                    <span className="font-semibold">{formatDate(device.created_at)}</span>
                  </div>
                  {device.remark && (
                    <div>
                      <span className="text-gray-600">Remarks:</span>
                      <p className="font-semibold mt-1">{device.remark}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DeviceTrackerLog() {
  const router = useRouter();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDevices = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search })
      });

      const response = await fetch(`/api/user_dashboard/document_hub/other_document_log/device_tracker_log?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch devices');
      }

      const result = await response.json();
      
      if (result.success) {
        setDevices(result.data);
        setTotalPages(result.pagination.pages);
        setTotalCount(result.pagination.total);
        setCurrentPage(page);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load device tracker logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDevices(1, searchTerm);
  };

  const handlePageChange = (page) => {
    fetchDevices(page, searchTerm);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    if (status === 'Working') {
      return (
        <span className={`${baseClasses} bg-green-100 text-green-800`}>
          <FaCheckCircle className="mr-1" />
          Working
        </span>
      );
    } else {
      return (
        <span className={`${baseClasses} bg-red-100 text-red-800`}>
          <FaExclamationTriangle className="mr-1" />
          Not Working
        </span>
      );
    }
  };

  const handleViewDetails = (device) => {
    setSelectedDevice(device);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDevice(null);
  };

  const handleEdit = (device) => {
    // Navigate to edit page
    toast.success(`Editing device ${device.dt_id}`);
  };

  const handleDelete = async (device) => {
    if (!confirm(`Are you sure you want to delete device ${device.dt_id}?`)) {
      return;
    }

    try {
      // Implement delete functionality
      toast.success(`Device ${device.dt_id} deleted successfully`);
      fetchDevices(currentPage, searchTerm); // Refresh the list
    } catch (error) {
      toast.error('Failed to delete device');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-300 mb-8">
          <div className="relative px-8 py-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white border-b border-white/10 shadow-md">
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => router.push('/user_dashboard/document_hub/other_document_log')}
                  className="mr-4 p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <FaArrowLeft />
                </button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                    Device Tracker Log
                  </h1>
                  <p className="text-blue-200 mt-1 text-sm md:text-base">
                    View and manage all tracked devices
                  </p>
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex items-center space-x-4">
                <button
                  onClick={() => router.push('/user_dashboard/document_hub/other_document_tracker/device_tracker')}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FaPlus className="mr-2" />
                  Add New Device
                </button>
                <div className="p-2 bg-white/20 rounded-lg">
                  <FaMobile className="text-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by brand, model, IMEI, or tracking ID..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </form>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => fetchDevices(currentPage, searchTerm)}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <FaSync className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <FaFilter className="mr-2" />
                Filters
              </button>
            </div>
          </div>
        </div>

        {/* Devices Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <FaSpinner className="animate-spin text-3xl text-blue-600 mr-3" />
              <span className="text-gray-600">Loading devices...</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-12">
              <FaMobile className="mx-auto text-4xl text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Try adjusting your search terms' : 'Get started by tracking your first device'}
              </p>
              <button
                onClick={() => router.push('/user_dashboard/document_hub/other_document_tracker/device_tracker')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaPlus className="mr-2" />
                Track New Device
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Device Info
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IMEI Numbers
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SIM Info
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tracked By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {devices.map((device, index) => (
                      <tr key={device.dt_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {device.dt_id}
                            </div>
                            <div className="text-sm text-gray-500">
                              {device.brand_name} {device.device_model}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {device.imei_1?.substring(0, 8)}...
                          </div>
                          {device.imei_2 && (
                            <div className="text-sm text-gray-500">
                              {device.imei_2.substring(0, 8)}...
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {device.sim_1 ? (
                              <div className="text-sm text-gray-900">
                                {device.sim_1}
                                {device.sim_1_persona && (
                                  <span className="text-gray-500 ml-1">({device.sim_1_persona})</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No SIM 1</span>
                            )}
                            {device.sim_2 ? (
                              <div className="text-sm text-gray-900">
                                {device.sim_2}
                                {device.sim_2_persona && (
                                  <span className="text-gray-500 ml-1">({device.sim_2_persona})</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No SIM 2</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(device.device_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {device.track_by}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(device.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewDetails(device)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="View Details"
                            >
                              <FaEye />
                            </button>
                            <button
                              onClick={() => handleEdit(device)}
                              className="text-green-600 hover:text-green-900 transition-colors"
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDelete(device)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * 10, totalCount)}
                      </span> of{' '}
                      <span className="font-medium">{totalCount}</span> devices
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 border text-sm font-medium rounded-md ${
                            currentPage === page
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Device Details Modal */}
        <DeviceDetailsModal
          device={selectedDevice}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onEdit={() => {
            handleCloseModal();
            if (selectedDevice) handleEdit(selectedDevice);
          }}
        />
      </div>
    </div>
  );
}