// app/user_dashboard/document_hub/other_document_log/device_tracker_log/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaMobile, FaArrowLeft, FaSearch, FaEye, 
  FaEdit, FaSpinner, FaSync,
  FaFilter, FaDownload, FaPlus, FaTimes,
  FaCheckCircle, FaExclamationTriangle,
  FaCaretDown, FaCaretUp
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

// Enhanced Device Details Modal Component
const DeviceDetailsModal = ({ device, isOpen, onClose, onEdit }) => {
  if (!isOpen || !device) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusConfig = (status) => {
    return status === 'Working' ? 
      { 
        icon: <FaCheckCircle className="text-xl" />,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        label: 'Working'
      } : 
      { 
        icon: <FaExclamationTriangle className="text-xl" />,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200',
        label: 'Not Working'
      };
  };

  const statusConfig = getStatusConfig(device.device_status);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-4">
                <FaMobile className="text-white text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Device Details
                </h2>
                <p className="text-slate-600 mt-1">
                  Tracking ID: <span className="font-mono font-semibold text-blue-600">{device.dt_id}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onEdit}
                className="flex items-center px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
              >
                <FaEdit className="mr-2" />
                Edit Device
              </button>
              <button
                onClick={onClose}
                className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-8">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Device Basic Information */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <FaMobile className="text-blue-600" />
                  </div>
                  Device Information
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-500">Brand</label>
                      <p className="text-slate-800 font-semibold mt-1">{device.brand_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-500">Model</label>
                      <p className="text-slate-800 font-semibold mt-1">{device.device_model}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">IMEI 1</label>
                    <p className="text-slate-800 font-mono font-semibold mt-1 bg-white p-2 rounded-lg border border-slate-200">
                      {device.imei_1}
                    </p>
                  </div>
                  {device.imei_2 && (
                    <div>
                      <label className="text-sm font-medium text-slate-500">IMEI 2</label>
                      <p className="text-slate-800 font-mono font-semibold mt-1 bg-white p-2 rounded-lg border border-slate-200">
                        {device.imei_2}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Device Status */}
              <div className={`p-6 rounded-2xl border ${statusConfig.borderColor} ${statusConfig.bgColor}`}>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className={`p-2 rounded-lg ${statusConfig.bgColor} ${statusConfig.color} mr-3`}>
                    {statusConfig.icon}
                  </span>
                  <span className="text-slate-900 tracking-wide">Device Status</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Current Status:</span>
                    <span className={`font-semibold ${statusConfig.color} px-3 py-1 rounded-full ${statusConfig.bgColor} border ${statusConfig.borderColor}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  {device.device_status_details && (
                    <div>
                      <label className="font-medium text-slate-700">Status Details:</label>
                      <p className="mt-2 text-sm bg-white p-3 rounded-xl border border-slate-200 text-slate-700">
                        {device.device_status_details}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* SIM Information */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-2xl border border-emerald-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                    <FaMobile className="text-emerald-600" />
                  </div>
                  SIM Information
                </h3>
                <div className="space-y-4">
                  {device.sim_1 ? (
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <h4 className="font-semibold text-slate-700 mb-2">SIM 1</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Number:</span>
                          <span className="font-semibold text-slate-800">{device.sim_1}</span>
                        </div>
                        {device.sim_1_persona && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Persona:</span>
                            <span className="font-semibold text-emerald-600">{device.sim_1_persona}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                      <p className="text-slate-500">No SIM 1 information available</p>
                    </div>
                  )}

                  {device.sim_2 ? (
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <h4 className="font-semibold text-slate-700 mb-2">SIM 2</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Number:</span>
                          <span className="font-semibold text-slate-800">{device.sim_2}</span>
                        </div>
                        {device.sim_2_persona && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Persona:</span>
                            <span className="font-semibold text-emerald-600">{device.sim_2_persona}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                      <p className="text-slate-500">No SIM 2 information available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Purpose & Tracking Information */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <FaEye className="text-purple-600" />
                  </div>
                  Purpose & Tracking
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Purpose</label>
                    <p className="text-slate-800 font-semibold mt-1 bg-white p-3 rounded-xl border border-slate-200">
                      {device.purpose}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {device.handover_to && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">Handover To</label>
                        <p className="text-slate-800 font-semibold mt-1">{device.handover_to}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-slate-600">Tracked By</label>
                      <p className="text-slate-800 font-semibold mt-1">{device.track_by}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {device.handover_date && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">Handover Date</label>
                        <p className="text-slate-800 font-semibold mt-1">{formatDate(device.handover_date)}</p>
                      </div>
                    )}
                    {device.return_date && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">Return Date</label>
                        <p className="text-slate-800 font-semibold mt-1">{formatDate(device.return_date)}</p>
                      </div>
                    )}
                  </div>

                  {device.remark && (
                    <div>
                      <label className="text-sm font-medium text-slate-600">Remarks</label>
                      <p className="text-slate-700 mt-1 bg-white p-3 rounded-xl border border-slate-200">
                        {device.remark}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200">
                    <label className="text-sm font-medium text-slate-600">Created Date</label>
                    <p className="text-slate-800 font-semibold mt-1">{formatDate(device.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-8 py-6 rounded-b-2xl">
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors font-medium"
            >
              Close Details
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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchDevices = async (page = 1, search = '', limit = itemsPerPage) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort: sortField,
        order: sortDirection,
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter })
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
  }, [sortField, sortDirection, statusFilter, itemsPerPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDevices(1, searchTerm);
  };

  const handlePageChange = (page) => {
    fetchDevices(page, searchTerm);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Working') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
          <FaCheckCircle className="mr-1.5 text-xs" />
          Working
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-rose-100 text-rose-800 border border-rose-200">
          <FaExclamationTriangle className="mr-1.5 text-xs" />
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
    router.push(`/user_dashboard/document_hub/other_document_tracker/device_tracker/edit/${device.dt_id}`);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <FaCaretDown className="text-slate-400 ml-1" />;
    return sortDirection === 'asc' ? 
      <FaCaretUp className="text-blue-600 ml-1" /> : 
      <FaCaretDown className="text-blue-600 ml-1" />;
  };

  // Calculate statistics
  const workingDevices = devices.filter(device => device.device_status === 'Working').length;
  const notWorkingDevices = devices.filter(device => device.device_status === 'Not Working').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 mb-8">
          <div className="relative px-8 py-8 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center mb-6 lg:mb-0">
                <button
                  onClick={() => router.push('/user_dashboard/document_hub/other_document_log')}
                  className="mr-6 p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-colors backdrop-blur-sm"
                >
                  <FaArrowLeft className="text-xl" />
                </button>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                    Device Tracker Log
                  </h1>
                  <p className="text-blue-200 mt-2 text-lg">
                    Comprehensive overview of all tracked devices
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/user_dashboard/document_hub/other_document_tracker/device_tracker')}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  <FaPlus className="mr-2" />
                  Track New Device
                </button>
                <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                  <FaMobile className="text-2xl" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Devices</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{totalCount}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl">
                <FaMobile className="text-2xl text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Working Devices</p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">{workingDevices}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl">
                <FaCheckCircle className="text-2xl text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Not Working</p>
                <p className="text-3xl font-bold text-rose-600 mt-2">{notWorkingDevices}</p>
              </div>
              <div className="p-4 bg-rose-50 rounded-xl">
                <FaExclamationTriangle className="text-2xl text-rose-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaSearch className="text-slate-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by brand, model, IMEI, SIM, tracking ID, or purpose..."
                  className="block w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 placeholder-slate-500"
                />
              </div>
            </form>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
              >
                <option value="all">All Status</option>
                <option value="Working">Working Only</option>
                <option value="Not Working">Not Working Only</option>
              </select>

              {/* Items Per Page */}
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>

              <button
                onClick={() => fetchDevices(currentPage, searchTerm)}
                disabled={loading}
                className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl font-medium"
              >
                <FaSync className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Devices Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-center">
                <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
                <p className="text-slate-600 text-lg">Loading device information...</p>
                <p className="text-slate-500 text-sm mt-2">Please wait while we fetch the latest data</p>
              </div>
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FaMobile className="text-3xl text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-3">No devices found</h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No devices match your current filters. Try adjusting your search criteria.' 
                  : 'Start tracking your first device to manage your inventory efficiently.'}
              </p>
              <button
                onClick={() => router.push('/user_dashboard/document_hub/other_document_tracker/device_tracker')}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                <FaPlus className="mr-2" />
                Track New Device
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th 
                        className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('dt_id')}
                      >
                        <div className="flex items-center">
                          Device Info
                          <SortIcon field="dt_id" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('imei_1')}
                      >
                        <div className="flex items-center">
                          IMEI Numbers
                          <SortIcon field="imei_1" />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        SIM Information
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('device_status')}
                      >
                        <div className="flex items-center">
                          Status
                          <SortIcon field="device_status" />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {devices.map((device) => (
                      <tr key={device.dt_id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Device Info */}
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {device.dt_id}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">
                              {device.brand_name} {device.device_model}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Tracked by: {device.track_by}
                            </div>
                          </div>
                        </td>
                        
                        {/* IMEI Numbers */}
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div>
                              <div className="text-xs font-medium text-slate-500">IMEI 1</div>
                              <div className="text-sm font-mono font-semibold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                {device.imei_1}
                              </div>
                            </div>
                            {device.imei_2 && (
                              <div>
                                <div className="text-xs font-medium text-slate-500">IMEI 2</div>
                                <div className="text-sm font-mono font-semibold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                  {device.imei_2}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* SIM Information */}
                        <td className="px-6 py-4">
                          <div className="space-y-3">
                            {device.sim_1 ? (
                              <div>
                                <div className="text-xs font-medium text-slate-500">SIM 1</div>
                                <div className="text-sm font-semibold text-slate-800">
                                  {device.sim_1}
                                  {device.sim_1_persona && (
                                    <span className="text-emerald-600 ml-2 text-xs font-normal bg-emerald-50 px-2 py-0.5 rounded-full">
                                      {device.sim_1_persona}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-slate-400">No SIM 1</div>
                            )}
                            
                            {device.sim_2 ? (
                              <div>
                                <div className="text-xs font-medium text-slate-500">SIM 2</div>
                                <div className="text-sm font-semibold text-slate-800">
                                  {device.sim_2}
                                  {device.sim_2_persona && (
                                    <span className="text-emerald-600 ml-2 text-xs font-normal bg-emerald-50 px-2 py-0.5 rounded-full">
                                      {device.sim_2_persona}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-slate-400">No SIM 2</div>
                            )}
                          </div>
                        </td>
                        
                        {/* Status */}
                        <td className="px-6 py-4">
                          {getStatusBadge(device.device_status)}
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleViewDetails(device)}
                              className="flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors group/btn"
                              title="View Full Details"
                            >
                              <FaEye className="mr-2 group-hover/btn:scale-110 transition-transform" />
                              View
                            </button>
                            <button
                              onClick={() => handleEdit(device)}
                              className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors group/btn"
                              title="Edit Device"
                            >
                              <FaEdit className="mr-2 group-hover/btn:scale-110 transition-transform" />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="text-sm text-slate-700">
                      Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                      <span className="font-semibold">
                        {Math.min(currentPage * itemsPerPage, totalCount)}
                      </span> of{' '}
                      <span className="font-semibold">{totalCount}</span> devices
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-2 border text-sm font-medium rounded-lg transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                                  : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        {/* Enhanced Device Details Modal */}
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

      {/* Add custom styles for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}