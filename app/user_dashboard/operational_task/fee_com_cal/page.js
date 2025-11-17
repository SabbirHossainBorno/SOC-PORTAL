// app/user_dashboard/operational_task/fee_com_cal/page.js
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaCalculator, FaUpload, FaFileExcel, FaDownload, 
  FaArrowLeft, FaInfoCircle, FaUsers, FaChartBar,
  FaMoneyBillWave, FaExchangeAlt,
  FaEye, FaFileExport, FaCopy, FaHistory, FaSearch, FaSync,
  FaBan, FaCheckCircle, FaFileInvoiceDollar, FaMobileAlt
} from 'react-icons/fa';

import { FaMobileRetro } from "react-icons/fa6";

import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function FeeComCalculationPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [feeCommType, setFeeCommType] = useState('Regular');
  const [dropPointType, setDropPointType] = useState('Mixed'); // 'Mixed' or 'Fixed'
  const [results, setResults] = useState(null);
  const [billerName, setBillerName] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [existingFile, setExistingFile] = useState(null);
  const [fileExists, setFileExists] = useState(false);
  const [viewMode, setViewMode] = useState('new'); // 'new' or 'history'

  const feeCommTypes = [
    { value: 'Regular', label: 'Regular', color: 'from-blue-500 to-cyan-500' },
    { value: 'Drop Point', label: 'Drop Point', color: 'from-orange-500 to-red-500' }
  ];

  const dropPointTypes = [
    { value: 'Mixed', label: 'Mixed', color: 'from-purple-500 to-pink-500' },
    { value: 'Fixed', label: 'Fixed', color: 'from-green-500 to-emerald-500' }
  ];

  // Add function to fetch history
  const fetchHistory = async (search = '') => {
    setHistoryLoading(true);
    try {
      const response = await fetch(
        `/api/user_dashboard/operational_task/fee_com_cal?search=${encodeURIComponent(search)}&limit=10`
      );
      const result = await response.json();
      if (result.success) {
        setHistory(result.data);
        
        // Check if current file exists in history
        if (selectedFile) {
          const fileExistsInHistory = result.data.some(item => 
            item.file_name === selectedFile.name
          );
          setFileExists(fileExistsInHistory);
        }
      } else {
        toast.error('Failed to load history');
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load history on component mount
  useEffect(() => {
    fetchHistory();
  }, []);

  // Add useEffect for search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Check if file exists in history when file is selected
  useEffect(() => {
    if (selectedFile && history.length > 0) {
      const fileExistsInHistory = history.some(item => 
        item.file_name === selectedFile.name
      );
      setFileExists(fileExistsInHistory);
      
      if (fileExistsInHistory) {
        const existing = history.find(item => item.file_name === selectedFile.name);
        setExistingFile(existing);
        toast.error(`This file was already processed on ${new Date(existing.created_at).toLocaleString()}`, {
          duration: 6000,
        });
      } else {
        setExistingFile(null);
      }
    }
  }, [selectedFile, history]);
  
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      toast.error('Only Excel (.xlsx) files are allowed');
      return;
    }

    // Extract biller name from filename
    let extractedBillerName = '';
    const fileName = file.name.replace('.xlsx', '');
    
    if (fileName.includes('Fee-Commission Scheme for ')) {
      extractedBillerName = fileName.replace('Fee-Commission Scheme for ', '').split('_')[0];
    } else if (fileName.includes('Fee-Commission Scheme - ')) {
      extractedBillerName = fileName.replace('Fee-Commission Scheme - ', '').split(' - ')[0];
    } else {
      extractedBillerName = fileName;
    }
    
    setSelectedFile(file);
    setBillerName(extractedBillerName);
    setResults(null);
    setExistingFile(null);
    setFileExists(false);
    setViewMode('new');
    
    toast.success(`File selected: ${file.name}`);
  };

  // Safe clipboard function with fallback
  const copyToClipboard = async (value) => {
    const text = value?.toString() || '';
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or insecure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      
      toast.success('Value copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleCalculate = async () => {
    // Check if type is supported
    if (feeCommType !== 'Regular' && feeCommType !== 'Drop Point') {
      toast.error(`${feeCommType} type is coming soon! Currently only Regular and Drop Point types are supported.`);
      return;
    }

    if (feeCommType === 'Drop Point' && dropPointType !== 'Mixed') {
      toast.error(`Drop Point ${dropPointType} type is coming soon! Currently only Mixed type is supported.`);
      return;
    }

    if (!selectedFile) {
      toast.error('Please select an Excel file first');
      return;
    }

    if (fileExists) {
      return;
    }

    setLoading(true);
    setResults(null);
    const toastId = toast.loading('Analyzing fee structure and calculating commissions...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('feeCommType', feeCommType);
      if (feeCommType === 'Drop Point') {
        formData.append('dropPointType', dropPointType);
      }

      const response = await fetch('/api/user_dashboard/operational_task/fee_com_cal', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Commission analysis completed successfully!', { id: toastId });
        setResults(result.data);
        setViewMode('new');
        
        // Clear the file input and reset file states AFTER successful calculation
        setSelectedFile(null);
        setBillerName('');
        setFileExists(false);
        setExistingFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Refresh history after new calculation
        fetchHistory(searchTerm);
      } else if (response.status === 400 && result.existingFile) {
        // File already exists
        setExistingFile(result.existingFile);
        setFileExists(true);
        toast.error(`This file was already processed on ${new Date(result.existingFile.created_at).toLocaleString()}`, {
          id: toastId,
          duration: 6000,
        });
        
        // Auto-filter history to show this file
        setSearchTerm(selectedFile.name);
      } else {
        throw new Error(result.message || 'Calculation failed');
      }
    } catch (error) {
      console.error('Calculation failed:', error);
      toast.error(error.message || 'Analysis failed. Please try again.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Function to load calculation details from history
  const loadCalculationDetails = async (feeComCalId, fileName, billerNameFromHistory, feeCommTypeFromHistory) => {
  setHistoryLoading(true);
  try {
    const response = await fetch('/api/user_dashboard/operational_task/fee_com_cal', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feeComCalId }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      setResults(result.data);
      setBillerName(billerNameFromHistory);
      
      // Extract feeCommType and dropPointType from the history data
      const feeCommType = result.data.summary?.feeCommType || feeCommTypeFromHistory;
      setFeeCommType(feeCommType);
      
      // If it's Drop Point, extract the dropPointType
      if (feeCommType === 'Drop Point') {
        const dropPointType = result.data.summary?.dropPointType || 'Mixed';
        setDropPointType(dropPointType);
      }
      
      setViewMode('history');
      toast.success('Calculation details loaded from history');
    } else {
      throw new Error(result.message || 'Failed to load calculation details');
    }
  } catch (error) {
    console.error('Error loading calculation details:', error);
    toast.error('Failed to load calculation details');
  } finally {
    setHistoryLoading(false);
  }
};

  const downloadTemplate = () => {
    const templateContent = `Biller Name,Transaction Type,Channel,Fee Rate
Example Biller,Uddokta Initiated,APP,1.50
Example Biller,Uddokta Initiated,USSD,1.50
Example Biller,Customer Initiated,APP,1.50
Example Biller,Customer Initiated,USSD,1.50`;
    
    const blob = new Blob([templateContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Fee-Commission_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('Template downloaded successfully!');
  };

  const downloadResults = () => {
    if (!results) return;
    
    const currentBillerName = results.summary?.billerName || billerName;
    const currentFileName = results.summary?.fileName || selectedFile?.name || 'results';
    
    // Create CSV content based on calculation type
    let csvContent = '';
    
    if (feeCommType === 'Regular') {
      csvContent = 'Category,Channel,Fee Rate,Sender Agent,Parent Distributor,Master Distributor,TWTL/SP,BPO/PP,Advance Commission\n';
      
      if (results.uddokta) {
        csvContent += `UDDOKTA,APP,${formatNumber(results.uddokta.app.feeRate)},${formatNumber(results.uddokta.app.commissions.senderAgent)},${formatNumber(results.uddokta.app.commissions.parentDistributor)},${formatNumber(results.uddokta.app.commissions.masterDistributor)},${formatNumber(results.uddokta.app.commissions.twltSp, 'twltSp')},${formatNumber(results.uddokta.app.commissions.bpoPp, 'bpoPp')},${formatNumber(results.uddokta.app.commissions.adjustment)}\n`;
        csvContent += `UDDOKTA,USSD,${formatNumber(results.uddokta.ussd.feeRate)},${formatNumber(results.uddokta.ussd.commissions.senderAgent)},${formatNumber(results.uddokta.ussd.commissions.parentDistributor)},${formatNumber(results.uddokta.ussd.commissions.masterDistributor)},${formatNumber(results.uddokta.ussd.commissions.twltSp, 'twltSp')},${formatNumber(results.uddokta.ussd.commissions.bpoPp, 'bpoPp')},${formatNumber(results.uddokta.ussd.commissions.adjustment)}\n`;
      }

      if (results.customer) {
        csvContent += `CUSTOMER,APP,${formatNumber(results.customer.app.feeRate)},N/A,N/A,${formatNumber(results.customer.app.commissions.masterDistributor)},${formatNumber(results.customer.app.commissions.twltSp, 'twltSp')},${formatNumber(results.customer.app.commissions.bpoPp, 'bpoPp')},${formatNumber(results.customer.app.commissions.adjustment)}\n`;
        csvContent += `CUSTOMER,USSD,${formatNumber(results.customer.ussd.feeRate)},N/A,N/A,${formatNumber(results.customer.ussd.commissions.masterDistributor)},${formatNumber(results.customer.ussd.commissions.twltSp, 'twltSp')},${formatNumber(results.customer.ussd.commissions.bpoPp, 'bpoPp')},${formatNumber(results.customer.ussd.commissions.adjustment)}\n`;
      }
    } else if (feeCommType === 'Drop Point' && results.slabs) {
      // Drop Point CSV format
      csvContent = 'Range,Channel,Fee Rate,Uddokta,Distributor,Master Distributor,TWTL,BPO,Advance Commission\n';
      
      results.slabs.forEach(slab => {
        csvContent += `${slab.range},APP,${formatNumber(slab.app.feeRate)},${formatNumber(slab.app.commissions.uddokta)},${formatNumber(slab.app.commissions.distributor)},${formatNumber(slab.app.commissions.masterDistributor)},${formatNumber(slab.app.commissions.twlt)},${formatNumber(slab.app.commissions.bpo)},${formatNumber(slab.app.commissions.advanceCommission)}\n`;
        csvContent += `${slab.range},USSD,${formatNumber(slab.ussd.feeRate)},${formatNumber(slab.ussd.commissions.uddokta)},${formatNumber(slab.ussd.commissions.distributor)},${formatNumber(slab.ussd.commissions.masterDistributor)},${formatNumber(slab.ussd.commissions.twlt)},${formatNumber(slab.ussd.commissions.bpo)},${formatNumber(slab.ussd.commissions.advanceCommission)}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Fee-Commission_Results_${currentBillerName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success('Results downloaded as CSV!');
  };

  const formatNumber = (num, key = '') => {
    if (num === null || num === undefined) return 'N/A';
    const number = parseFloat(num);
    
    if (key === 'feeRate') {
      return number.toFixed(2);
    }
    
    if (key === 'twltSp' || key === 'bpoPp' || key === 'twlt' || key === 'bpo') {
      return number.toFixed(5);
    }
    
    if (key === 'adjustment' || key === 'advanceCommission') {
      return number.toFixed(9);
    }
    
    return number.toFixed(9);
  };


// Update the formatDropPointValue function with better rounding logic
const formatDropPointValue = (value, key = '', range = '') => {
  if (value === null || value === undefined) return 'N/A';
  const num = parseFloat(value);
  
  // Handle zero values
  if (num === 0 || Math.abs(num) < 0.000000001) {
    return '0';
  }
  
  // Format based on value type and magnitude
  switch (key) {
    case 'feeRate':
      return num.toFixed(2);
    
    case 'uddokta':
      // Special rounding logic for Uddokta in specific ranges
      const rangesToRoundUp = [
        "0 - 10,000",
        "10,000 - 20,000", 
        "20,000 - 50,000",
        "50,000 - 100,001",
        "100,001 - 200,001",
        "200,001 - 300,001"
      ];
      
      if (rangesToRoundUp.includes(range)) {
        // Round UP by adding 0.00005 before rounding to 4 decimals
        // This ensures values like 10.2222 become 10.2223
        return (Math.round((num + 0.00005) * 10000) / 10000).toFixed(4);
      } else {
        // Regular rounding for other ranges
        return (Math.round(num * 10000) / 10000).toFixed(4);
      }
    
    case 'distributor':
      return (Math.round(num * 10000) / 10000).toFixed(4);
    
    case 'twlt':
    case 'bpo':
      return num.toFixed(5);
    
    case 'masterDistributor':
    case 'advanceCommission':
      return num.toFixed(6);
    
    default:
      return num.toFixed(6);
  }
};

// Update the formatDisplay function in the frontend
const formatDisplayValue = (num, key = '') => {
  if (num === null || num === undefined) return 'N/A';
  const number = parseFloat(num);
  
  // Handle zero values - show just "0"
  if (number === 0) {
    return '0';
  }
  
  // Handle very small numbers that are effectively zero
  if (Math.abs(number) < 0.000000001) {
    return '0';
  }
  
  // Format based on the key and value magnitude
  if (key === 'feeRate') {
    return number.toFixed(2);
  }
  
  // For large values like Uddokta (10.222222222) and Distributor (3.920454545)
  // Show 4 decimal places for better readability
  if (number >= 1) {
    return number.toFixed(4);
  }
  
  // For smaller commission values, use appropriate decimal places
  if (key === 'twlt' || key === 'bpo') {
    return number.toFixed(5);
  }
  
  if (key === 'advanceCommission' || key === 'masterDistributor') {
    return number.toFixed(6);
  }
  
  // Default for other values
  return number.toFixed(6);
};

  const CopyButton = ({ value }) => (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevent event bubbling
        copyToClipboard(value);
      }}
      className="ml-2 p-1 text-gray-400 hover:text-indigo-600 transition-colors duration-200"
      title="Copy value"
    >
      <FaCopy className="w-3 h-3" />
    </button>
  );

  // Regular Commission Section (existing code)
  const CommissionSection = ({ title, data, type, index }) => (
    <div className="mb-4">
      <div className={`rounded p-2 mb-2 bg-gradient-to-r ${
        type === 'uddokta' ? 'from-blue-600 to-indigo-600' : 'from-green-600 to-emerald-600'
      } text-white shadow-md`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-5 h-5 rounded flex items-center justify-center text-white font-bold text-xs mr-2 ${
              type === 'uddokta' ? 'bg-blue-500' : 'bg-green-500'
            }`}>
              {index}
            </div>
            <h3 className="text-sm font-bold flex items-center">
              <div className={`p-1 rounded mr-2 ${
                type === 'uddokta' ? 'bg-blue-500' : 'bg-green-500'
              }`}>
                <FaUsers className="text-white text-xs" />
              </div>
              {title}
            </h3>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-semibold ${
            type === 'uddokta' ? 'bg-blue-500' : 'bg-green-500'
          }`}>
            {type.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* APP Commission */}
        <div className="bg-white rounded p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center mb-2">
            <div className="p-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded mr-2">
              <FaMobileAlt className="text-white text-xs" />
            </div>
            <h4 className="font-semibold text-gray-800 text-sm">APP Commission</h4>
          </div>
          
          <div className="space-y-1">
            {/* Fee Rate - Always First */}
            <div className="flex justify-between items-center p-1 bg-blue-50 rounded">
              <span className="text-gray-700 text-xs font-medium">Fee Rate</span>
              <div className="flex items-center">
                <span className="font-bold text-gray-900 text-xs">
                  {formatDisplayValue(data.app.feeRate, 'feeRate')}
                </span>
                <CopyButton value={formatDisplayValue(data.app.feeRate, 'feeRate')} />
              </div>
            </div>

            {/* Uddokta (senderAgent) - Second */}
            {data.app.commissions.senderAgent !== undefined && (
              <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded text-xs">
                <span className="text-gray-600">Uddokta</span>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-800">
                    {formatDisplayValue(data.app.commissions.senderAgent, 'senderAgent')}
                  </span>
                  <CopyButton value={formatDisplayValue(data.app.commissions.senderAgent, 'senderAgent')} />
                </div>
              </div>
            )}

            {/* Distributor (parentDistributor) - Third */}
            {data.app.commissions.parentDistributor !== undefined && (
              <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded text-xs">
                <span className="text-gray-600">Distributor</span>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-800">
                    {formatDisplayValue(data.app.commissions.parentDistributor, 'parentDistributor')}
                  </span>
                  <CopyButton value={formatDisplayValue(data.app.commissions.parentDistributor, 'parentDistributor')} />
                </div>
              </div>
            )}

            {/* Master Distributor - Fourth */}
            {data.app.commissions.masterDistributor !== undefined && (
              <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded text-xs">
                <span className="text-gray-600">Master Distributor</span>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-800">
                    {formatDisplayValue(data.app.commissions.masterDistributor, 'masterDistributor')}
                  </span>
                  <CopyButton value={formatDisplayValue(data.app.commissions.masterDistributor, 'masterDistributor')} />
                </div>
              </div>
            )}

            {/* TWTL (twltSp) - Fifth */}
            {data.app.commissions.twltSp !== undefined && (
              <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded text-xs">
                <span className="text-gray-600">TWTL</span>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-800">
                    {formatDisplayValue(data.app.commissions.twltSp, 'twltSp')}
                  </span>
                  <CopyButton value={formatDisplayValue(data.app.commissions.twltSp, 'twltSp')} />
                </div>
              </div>
            )}

            {/* BPO (bpoPp) - Sixth */}
            {data.app.commissions.bpoPp !== undefined && (
              <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded text-xs">
                <span className="text-gray-600">BPO</span>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-800">
                    {formatDisplayValue(data.app.commissions.bpoPp, 'bpoPp')}
                  </span>
                  <CopyButton value={formatDisplayValue(data.app.commissions.bpoPp, 'bpoPp')} />
                </div>
              </div>
            )}

            {/* Advance Commission (adjustment) - Seventh */}
            {data.app.commissions.adjustment !== undefined && (
              <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded text-xs">
                <span className="text-gray-600">Advance Commission</span>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-800">
                    {formatDisplayValue(data.app.commissions.adjustment, 'adjustment')}
                  </span>
                  <CopyButton value={formatDisplayValue(data.app.commissions.adjustment, 'adjustment')} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* USSD Commission */}
        <div className="bg-white rounded p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center mb-2">
            <div className="p-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded mr-2">
              <FaMobileRetro className="text-white text-xs" />
            </div>
            <h4 className="font-semibold text-gray-800 text-sm">USSD Commission</h4>
          </div>
          
          <div className="space-y-1">
            {/* Fee Rate - Always First */}
            <div className="flex justify-between items-center p-1 bg-green-50 rounded">
              <span className="text-gray-700 text-xs font-medium">Fee Rate</span>
              <div className="flex items-center">
                <span className="font-bold text-gray-900 text-xs">
                  {formatDisplayValue(data.ussd.feeRate, 'feeRate')}
                </span>
                <CopyButton value={formatDisplayValue(data.ussd.feeRate, 'feeRate')} />
              </div>
            </div>

            {/* Uddokta (senderAgent) - Second */}
            {data.ussd.commissions.senderAgent !== undefined && (
              <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded text-xs">
                <span className="text-gray-600">Uddokta</span>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-800">
                    {formatDisplayValue(data.ussd.commissions.senderAgent, 'senderAgent')}
                  </span>
                  <CopyButton value={formatDisplayValue(data.ussd.commissions.senderAgent, 'senderAgent')} />
                </div>
              </div>
            )}

            {/* Distributor (parentDistributor) - Third */}
            {data.ussd.commissions.parentDistributor !== undefined && (
              <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded text-xs">
                <span className="text-gray-600">Distributor</span>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-800">
                    {formatDisplayValue(data.ussd.commissions.parentDistributor, 'parentDistributor')}
                  </span>
                  <CopyButton value={formatDisplayValue(data.ussd.commissions.parentDistributor, 'parentDistributor')} />
                </div>
              </div>
            )}

            {/* Master Distributor - Fourth */}
            {data.ussd.commissions.masterDistributor !== undefined && (
              <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded text-xs">
                <span className="text-gray-600">Master Distributor</span>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-800">
                    {formatDisplayValue(data.ussd.commissions.masterDistributor, 'masterDistributor')}
                  </span>
                  <CopyButton value={formatDisplayValue(data.ussd.commissions.masterDistributor, 'masterDistributor')} />
                </div>
              </div>
            )}

            {/* TWTL (twltSp) - Fifth */}
            {data.ussd.commissions.twltSp !== undefined && (
              <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded text-xs">
                <span className="text-gray-600">TWTL</span>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-800">
                    {formatDisplayValue(data.ussd.commissions.twltSp, 'twltSp')}
                  </span>
                  <CopyButton value={formatDisplayValue(data.ussd.commissions.twltSp, 'twltSp')} />
                </div>
              </div>
            )}

            {/* BPO (bpoPp) - Sixth */}
            {data.ussd.commissions.bpoPp !== undefined && (
              <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded text-xs">
                <span className="text-gray-600">BPO</span>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-800">
                    {formatDisplayValue(data.ussd.commissions.bpoPp, 'bpoPp')}
                  </span>
                  <CopyButton value={formatDisplayValue(data.ussd.commissions.bpoPp, 'bpoPp')} />
                </div>
              </div>
            )}

            {/* Advance Commission (adjustment) - Seventh */}
            {data.ussd.commissions.adjustment !== undefined && (
              <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded text-xs">
                <span className="text-gray-600">Advance Commission</span>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-800">
                    {formatDisplayValue(data.ussd.commissions.adjustment, 'adjustment')}
                  </span>
                  <CopyButton value={formatDisplayValue(data.ussd.commissions.adjustment, 'adjustment')} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

// Update the DropPointMixedSection component with cleaner number formatting
const DropPointMixedSection = ({ slabs, rawData }) => {
  if (!slabs || !Array.isArray(slabs)) return null;


  return (
    <div className="space-y-4">
      <div className="rounded p-3 mb-4 bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-sm mr-2 bg-orange-500">
              DP
            </div>
            <h3 className="text-lg font-bold flex items-center">
              <div className="p-1 rounded mr-2 bg-orange-500">
                <FaMoneyBillWave className="text-white text-sm" />
              </div>
              DROP POINT COMMISSION STRUCTURE
            </h3>
          </div>
          <div className="px-3 py-1 rounded text-sm font-semibold bg-orange-500">
            MIXED TYPE
          </div>
        </div>
      </div>

      {slabs.map((slab, index) => {
        const rawSlab = rawData?.slabs?.[index];
        return (
          <div key={index} className="bg-white rounded shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3">
              <h4 className="font-bold text-sm">{slab.range}</h4>
            </div>
            
            <div className="p-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* APP Commission */}
                <div className="bg-gray-50 rounded p-3 border border-gray-200">
                  <div className="flex items-center mb-3">
                    <div className="p-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded mr-2">
                      <FaMobileAlt className="text-white text-xs" />
                    </div>
                    <h5 className="font-semibold text-gray-800 text-sm">APP Commission</h5>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Fee Rate */}
                    <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                      <span className="text-gray-700 text-xs font-medium">Fee Rate</span>
                      <div className="flex items-center">
                        <span className="font-bold text-gray-900 text-xs">
                          {formatDropPointValue(slab.app.feeRate, 'feeRate')}
                        </span>
                        <CopyButton value={formatDropPointValue(slab.app.feeRate, 'feeRate')} />
                      </div>
                    </div>

                    {/* Uddokta - Show 4 decimal places */}
                    <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded text-xs">
  <div>
    <span className="text-gray-600">Uddokta</span>
    {rawSlab && rawSlab.app.senderAgentFixed !== null && rawSlab.app.senderAgentFixed !== undefined && rawSlab.app.senderAgentFixed !== 0 && (
      <div className="text-gray-400 text-xs">
        Base: {formatDropPointValue(rawSlab.app.senderAgentFixed)} +15%
      </div>
    )}
  </div>
  <div className="flex items-center">
    <span className="font-semibold text-gray-800">
      {formatDropPointValue(slab.app.commissions.uddokta, 'uddokta', slab.range)}
    </span>
    <CopyButton value={formatDropPointValue(slab.app.commissions.uddokta, 'uddokta', slab.range)} />
  </div>
</div>

                    {/* Distributor - Show 4 decimal places */}
                    <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded text-xs">
                      <div>
                        <span className="text-gray-600">Distributor</span>
                        {rawSlab && rawSlab.app.parentDistributorFixed !== null && rawSlab.app.parentDistributorFixed !== undefined && rawSlab.app.parentDistributorFixed !== 0 && (
                          <div className="text-gray-400 text-xs">
                            Base: {formatDropPointValue(rawSlab.app.parentDistributorFixed)} +15%
                          </div>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-800">
                          {formatDropPointValue(slab.app.commissions.distributor, 'distributor')}
                        </span>
                        <CopyButton value={formatDropPointValue(slab.app.commissions.distributor, 'distributor')} />
                      </div>
                    </div>

                    {/* Master Distributor - Show 6 decimal places */}
                    <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded text-xs">
                      <span className="text-gray-600">Master Distributor</span>
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-800">
                          {formatDropPointValue(slab.app.commissions.masterDistributor, 'masterDistributor')}
                        </span>
                        <CopyButton value={formatDropPointValue(slab.app.commissions.masterDistributor, 'masterDistributor')} />
                      </div>
                    </div>

                    {/* TWTL - Show 5 decimal places */}
                    <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded text-xs">
                      <span className="text-gray-600">TWTL</span>
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-800">
                          {formatDropPointValue(slab.app.commissions.twlt, 'twlt')}
                        </span>
                        <CopyButton value={formatDropPointValue(slab.app.commissions.twlt, 'twlt')} />
                      </div>
                    </div>

                    {/* BPO - Show 5 decimal places */}
                    <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded text-xs">
                      <span className="text-gray-600">BPO</span>
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-800">
                          {formatDropPointValue(slab.app.commissions.bpo, 'bpo')}
                        </span>
                        <CopyButton value={formatDropPointValue(slab.app.commissions.bpo, 'bpo')} />
                      </div>
                    </div>

                    {/* Advance Commission - Show 6 decimal places */}
                    <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded text-xs">
                      <span className="text-gray-600">Advance Commission</span>
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-800">
                          {formatDropPointValue(slab.app.commissions.advanceCommission, 'advanceCommission')}
                        </span>
                        <CopyButton value={formatDropPointValue(slab.app.commissions.advanceCommission, 'advanceCommission')} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* USSD Commission */}
                <div className="bg-gray-50 rounded p-3 border border-gray-200">
                  <div className="flex items-center mb-3">
                    <div className="p-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded mr-2">
                      <FaMobileRetro className="text-white text-xs" />
                    </div>
                    <h5 className="font-semibold text-gray-800 text-sm">USSD Commission</h5>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Fee Rate */}
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span className="text-gray-700 text-xs font-medium">Fee Rate</span>
                      <div className="flex items-center">
                        <span className="font-bold text-gray-900 text-xs">
                          {formatDropPointValue(slab.ussd.feeRate, 'feeRate')}
                        </span>
                        <CopyButton value={formatDropPointValue(slab.ussd.feeRate, 'feeRate')} />
                      </div>
                    </div>

                    {/* Uddokta - Show 4 decimal places */}
                    <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded text-xs">
  <div>
    <span className="text-gray-600">Uddokta</span>
    {rawSlab && rawSlab.ussd.senderAgentFixed !== null && rawSlab.ussd.senderAgentFixed !== undefined && rawSlab.ussd.senderAgentFixed !== 0 && (
      <div className="text-gray-400 text-xs">
        Base: {formatDropPointValue(rawSlab.ussd.senderAgentFixed)} +15%
      </div>
    )}
  </div>
  <div className="flex items-center">
    <span className="font-semibold text-gray-800">
      {formatDropPointValue(slab.ussd.commissions.uddokta, 'uddokta', slab.range)}
    </span>
    <CopyButton value={formatDropPointValue(slab.ussd.commissions.uddokta, 'uddokta', slab.range)} />
  </div>
</div>

                    {/* Distributor - Show 4 decimal places */}
                    <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded text-xs">
                      <div>
                        <span className="text-gray-600">Distributor</span>
                        {rawSlab && rawSlab.ussd.parentDistributorFixed !== null && rawSlab.ussd.parentDistributorFixed !== undefined && rawSlab.ussd.parentDistributorFixed !== 0 && (
                          <div className="text-gray-400 text-xs">
                            Base: {formatDropPointValue(rawSlab.ussd.parentDistributorFixed)} +15%
                          </div>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-800">
                          {formatDropPointValue(slab.ussd.commissions.distributor, 'distributor')}
                        </span>
                        <CopyButton value={formatDropPointValue(slab.ussd.commissions.distributor, 'distributor')} />
                      </div>
                    </div>

                    {/* Rest of USSD commission fields */}
                    <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded text-xs">
                      <span className="text-gray-600">Master Distributor</span>
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-800">
                          {formatDropPointValue(slab.ussd.commissions.masterDistributor, 'masterDistributor')}
                        </span>
                        <CopyButton value={formatDropPointValue(slab.ussd.commissions.masterDistributor, 'masterDistributor')} />
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded text-xs">
                      <span className="text-gray-600">TWTL</span>
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-800">
                          {formatDropPointValue(slab.ussd.commissions.twlt, 'twlt')}
                        </span>
                        <CopyButton value={formatDropPointValue(slab.ussd.commissions.twlt, 'twlt')} />
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded text-xs">
                      <span className="text-gray-600">BPO</span>
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-800">
                          {formatDropPointValue(slab.ussd.commissions.bpo, 'bpo')}
                        </span>
                        <CopyButton value={formatDropPointValue(slab.ussd.commissions.bpo, 'bpo')} />
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded text-xs">
                      <span className="text-gray-600">Advance Commission</span>
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-800">
                          {formatDropPointValue(slab.ussd.commissions.advanceCommission, 'advanceCommission')}
                        </span>
                        <CopyButton value={formatDropPointValue(slab.ussd.commissions.advanceCommission, 'advanceCommission')} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

  const CalculationSteps = () => {
    if (!results?.rawData) return null;

    const steps = [
      {
        title: "Fee Rate Extraction",
        description: "Base fee rates extracted from Excel cells",
        data: {
          "Uddokta APP (E4)": results.rawData.feeRateAppUddokta,
          "Uddokta USSD (E6)": results.rawData.feeRateUssdUddokta,
          "Customer APP (E8)": results.rawData.feeRateAppCustomer,
          "Customer USSD (E10)": results.rawData.feeRateUssdCustomer
        }
      },
      {
        title: "Commission Rate Extraction",
        description: "Individual commission rates from respective cells",
        data: {
          "Sender Agent APP (W4)": results.rawData.senderAgentApp,
          "Sender Agent USSD (W6)": results.rawData.senderAgentUssd,
          "Parent Distributor APP (AE4)": results.rawData.parentDistributorApp,
          "Parent Distributor USSD (AE6)": results.rawData.parentDistributorUssd,
          "Master Distributor APP (AU4)": results.rawData.masterDistributorApp,
          "Master Distributor USSD (AU6)": results.rawData.masterDistributorUssd,
          "TWTL/SP APP (BA4)": results.rawData.twltSpApp,
          "TWTL/SP USSD (BA6)": results.rawData.twltSpUssd,
          "BPO/PP APP (BC4)": results.rawData.bpoPpApp,
          "BPO/PP USSD (BC6)": results.rawData.bpoPpUssd
        }
      },
      {
        title: "Adjustment Calculations",
        description: "Advance commission calculated using formulas",
        data: {
          "Uddokta APP Adjustment": "100% - BC4 - BA4 - AU4 - AE4 - W4",
          "Uddokta USSD Adjustment": "100% - BC6 - BA6 - AU6 - AE6 - W6",
          "Customer APP Adjustment": "100% - BC8 - BA8 - AU8 - AE8 - W8",
          "Customer USSD Adjustment": "100% - BC10 - BA10 - AU10 - AE10 - W10"
        }
      },
      {
        title: "Final Commission Values",
        description: "Commission = Rate × Fee Rate (after percentage conversion)",
        data: {
          "Percentage Conversion": "All fee rates multiplied by 100",
          "Commission Calculation": "Commission Rate × (Fee Rate × 100)",
          "Total Validation": "Sum of all commissions = Fee Rate × 100"
        }
      }
    ];

    return (
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={index}
            className="bg-white rounded p-3 border border-gray-200 shadow-sm"
          >
            <div className="flex items-center mb-2">
              <div className="w-5 h-5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs mr-2">
                {index + 1}
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 text-sm">{step.title}</h4>
                <p className="text-gray-600 text-xs">{step.description}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {Object.entries(step.data).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center p-1 bg-gray-50 rounded text-xs">
                  <span className="text-gray-700 font-medium">{key}:</span>
                  <span className="text-gray-900 font-semibold">
                    {typeof value === 'number' ? value.toFixed(6) : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const selectedType = feeCommTypes.find(type => type.value === feeCommType);
  const isRegularType = feeCommType === 'Regular';
  const isDropPointType = feeCommType === 'Drop Point';
  const isSupportedType = isRegularType || (isDropPointType && dropPointType === 'Mixed');
  const canCalculate = selectedFile && !fileExists && isSupportedType && !loading;

  // Reset to new calculation mode when new file is selected
  const handleNewCalculation = () => {
    setResults(null);
    setViewMode('new');
    setSelectedFile(null);
    setBillerName('');
    setFileExists(false);
    setExistingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded shadow-2xl p-6 mb-6 text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-white/90 hover:text-white transition-colors text-sm font-medium"
              >
                <FaArrowLeft className="mr-2" />
                Back to Dashboard
              </button>
              
              <div className="flex items-center bg-white/20 px-3 py-1 rounded">
                <FaCalculator className="mr-2" />
                <span className="text-sm font-medium">Fee-Commission Calculator</span>
              </div>
            </div>
            
            <h1 className="text-2xl font-bold mb-2">Biller Fee-Commission Calculation</h1>
            <p className="text-indigo-100 text-lg">
              Calculate and analyze commission distributions for biller transactions
            </p>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          
          {/* Control Panel - Fixed Height */}
          <div className="xl:col-span-1 space-y-4">
            <div className="bg-white rounded shadow-md p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded mr-2">
                    <FaCalculator className="text-white text-sm" />
                  </div>
                  <h2 className="text-base font-bold text-gray-800">Analysis Parameters</h2>
                </div>
                {viewMode === 'history' && (
                  <button
                    onClick={handleNewCalculation}
                    className="px-2 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded text-xs hover:shadow transition-all duration-200 flex items-center font-medium"
                  >
                    <FaCalculator className="mr-1" />
                    New Calculation
                  </button>
                )}
              </div>

              {/* Fee-Comm Type Selection */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Fee-Comm Type
                </label>
                <div className="space-y-1">
                  {feeCommTypes.map(type => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setFeeCommType(type.value);
                        if (type.value !== 'Drop Point') {
                          setDropPointType('Mixed');
                        }
                      }}
                      className={`w-full h-10 text-left p-2 rounded transition-all duration-200 text-xs ${
                        feeCommType === type.value 
                          ? `bg-gradient-to-r ${type.color} text-white shadow-md`
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      } ${type.value !== 'Regular' && type.value !== 'Drop Point' ? 'opacity-70' : ''}`}
                    >
                      <div className="font-medium flex items-center justify-between">
                        <span>{type.label}</span>
                        {type.value !== 'Regular' && type.value !== 'Drop Point' && (
                          <span className="text-xs bg-black/20 px-1 py-0.5 rounded">Soon</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drop Point Type Selection */}
              {isDropPointType && (
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Drop Point Fee-Comm Type
                  </label>
                  <div className="space-y-1">
                    {dropPointTypes.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setDropPointType(type.value)}
                        className={`w-full h-10 text-left p-2 rounded transition-all duration-200 text-xs ${
                          dropPointType === type.value 
                            ? `bg-gradient-to-r ${type.color} text-white shadow-md`
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        } ${type.value !== 'Mixed' ? 'opacity-70' : ''}`}
                      >
                        <div className="font-medium flex items-center justify-between">
                          <span>{type.label}</span>
                          {type.value !== 'Mixed' && (
                            <span className="text-xs bg-black/20 px-1 py-0.5 rounded">Soon</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Coming Soon Notice for non-supported types */}
              {!isSupportedType && (
                <div className="mb-3 p-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded border border-orange-200">
                  <div className="flex items-center">
                    <div className="p-1 bg-orange-500 rounded mr-1">
                      <FaInfoCircle className="text-white text-xs" />
                    </div>
                    <div>
                      <p className="text-orange-800 font-semibold text-xs">
                        {feeCommType} {isDropPointType ? `- ${dropPointType}` : ''} Type
                      </p>
                      <p className="text-orange-600 text-xs">
                        Coming soon! Currently only Regular and Drop Point Mixed types are supported.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* File Upload Section */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Upload Fee-Comm File
                </label>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-gray-300 rounded p-3 text-center hover:border-indigo-400 transition-all duration-200 bg-gray-50 cursor-pointer"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".xlsx"
                    className="hidden"
                  />
                  
                  <div className="flex flex-col items-center">
                    <FaFileExcel className="text-2xl text-green-600 mb-1" />
                    <p className="text-gray-600 text-xs mb-1">Upload Excel File</p>
                    <p className="text-xs text-gray-500 mb-2">
                      .xlsx format only
                    </p>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 transition-colors flex items-center font-medium"
                    >
                      <FaUpload className="mr-1" />
                      Choose File
                    </button>
                  </div>
                </div>

                {selectedFile && (
                  <div className={`mt-1 p-2 rounded border ${
                    fileExists 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
                      {/* File Icon */}
                      <div className={`${
                        fileExists ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {fileExists ? <FaFileExport className="w-4 h-4" /> : <FaFileExcel className="w-4 h-4" />}
                      </div>
                      
                      {/* File Name */}
                      <p className="text-xs font-semibold text-gray-800 break-words whitespace-normal leading-5">
                        {selectedFile.name}
                      </p>
                      
                      {/* Status Icon */}
                      <div className={`${
                        fileExists ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {fileExists ? <FaBan className="w-4 h-4" /> : <FaCheckCircle className="w-4 h-4" />}
                      </div>
                      
                      {/* Status Text */}
                      <p className="text-xs">
                        {fileExists ? (
                          <span className="text-red-600 font-medium">Commission already calculated</span>
                        ) : (
                          <span className="text-green-600 font-medium">Ready for commission calculation</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleCalculate}
                  disabled={!canCalculate}
                  className={`w-full h-10 px-3 rounded text-xs font-semibold transition-all flex items-center justify-center ${
                    !canCalculate
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow hover:shadow-md'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="border-b-2 border-white mr-1"></div>
                      Calculating...
                    </>
                  ) : fileExists ? (
                    <>
                      <FaBan className="mr-1" />
                      File Already Processed
                    </>
                  ) : (
                    <>
                      <FaCalculator className="mr-1" />
                      Calculate Commission
                    </>
                  )}
                </button>

                <button
                  onClick={downloadTemplate}
                  className="w-full h-10 px-3 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center justify-center text-xs font-medium"
                >
                  <FaDownload className="mr-1" />
                  Download Template
                </button>
              </div>
            </div>

            {/* History Section */}
            <div className="bg-white rounded shadow-md p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded mr-2">
                    <FaHistory className="text-white text-sm" />
                  </div>
                  <h2 className="text-base font-bold text-gray-800">Calculation History</h2>
                </div>
                <button
                  onClick={() => fetchHistory(searchTerm)}
                  disabled={historyLoading}
                  className="p-1 text-gray-500 hover:text-indigo-600 transition-colors duration-200 disabled:opacity-50"
                  title="Refresh history"
                >
                  <FaSync className={`text-sm ${historyLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Search Input */}
              <div className="mb-3 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400 text-xs" />
                </div>
                <input
                  type="text"
                  placeholder="Search biller name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm 
                  text-gray-800 placeholder-gray-400 
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* History List */}
              <div className="max-h-64 overflow-y-auto">
                {historyLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                  </div>
                ) : history.length > 0 ? (
                  <div className="space-y-2">
                    {history.map((item, index) => (
                      <div
                        key={item.fee_com_cal_id}
                        onClick={() => loadCalculationDetails(item.fee_com_cal_id, item.file_name, item.biller_name, item.fee_comm_type)}
                        className="p-2 bg-gray-50 rounded border border-gray-200 hover:border-indigo-300 transition-colors duration-200 cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex-1 min-w-0 mr-2">
                            <h3 className="font-semibold text-gray-800 text-xs break-words whitespace-normal leading-5">
                              {item.biller_name}
                            </h3>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {item.file_name}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs px-1 py-0.5 rounded ${
  item.fee_comm_type.includes('Drop Point') 
    ? 'bg-orange-100 text-orange-800' 
    : 'bg-blue-100 text-gray-600'
}`}>
  {item.fee_comm_type}
</span>
                          <span className="text-xs text-gray-500 font-mono">
                            {item.fee_com_cal_id}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">By: {item.track_by}</span>
                          <span className="text-gray-400">
                            {new Date(item.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-xs">
                      {searchTerm ? 'No matching records found' : 'No calculation history yet'}
                    </p>
                  </div>
                )}
              </div>

              {/* History Summary */}
              {history.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center text-xs text-gray-600">
                    <span>Showing {history.length} records</span>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Panel */}
          <div className="xl:col-span-2">
            {loading ? (
              // Loading State with Spinner
              <div className="bg-white rounded shadow-md p-6 border border-gray-200 flex items-center justify-center h-48">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                  <h3 className="text-base font-semibold text-gray-700 mb-1">Calculation Processing</h3>
                  <p className="text-gray-500 text-xs">
                    Analyzing commission structure and calculating distributions...
                  </p>
                </div>
              </div>
            ) : results ? (
              <div className="bg-white rounded shadow-md p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded mr-2">
                      <FaChartBar className="text-white text-sm" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-800">
                        {viewMode === 'history' ? 'Historical Commission Analysis' : 'Commission Analysis'}
                      </h2>
                      <p className="text-gray-600 text-xs">
                        {viewMode === 'history' ? 'Loaded from calculation history' : 'Detailed breakdown of fee distribution'}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setShowDetails(true)}
                      className="px-2 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded text-xs hover:shadow transition-all duration-200 flex items-center font-medium"
                    >
                      <FaEye className="mr-1" />
                      Details
                    </button>
                    <button
                      onClick={downloadResults}
                      className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded text-xs hover:shadow transition-all duration-200 flex items-center font-medium"
                    >
                      <FaFileExport className="mr-1" />
                      Export
                    </button>
                  </div>
                </div>

                {/* Biller Info Card */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded p-3 mb-3 text-white shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold">{results.summary?.billerName || billerName}</h3>
                      <p className="text-blue-100 text-xs">
                        {results.summary?.fileName || selectedFile?.name} • {feeCommType} {isDropPointType ? `- ${dropPointType}` : ''} Commission Structure
                        {viewMode === 'history' && ` • ${results.summary?.trackBy || 'Historical'}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold">
                        {viewMode === 'history' ? 'Historical Analysis' : 'Analysis Complete'}
                      </div>
                      <div className="text-blue-100 text-xs">
                        {results.summary?.created_at 
                          ? new Date(results.summary.created_at).toLocaleDateString()
                          : new Date().toLocaleDateString()
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Results based on calculation type */}
                {isRegularType && results.uddokta && (
                  <CommissionSection 
                    title="UDDOKTA COMMISSION" 
                    data={results.uddokta} 
                    type="uddokta"
                    index={1}
                  />
                )}

                {isRegularType && results.customer && (
                  <CommissionSection 
                    title="CUSTOMER COMMISSION" 
                    data={results.customer} 
                    type="customer"
                    index={2}
                  />
                )}

                {isDropPointType && results.slabs && (
                  <DropPointMixedSection slabs={results.slabs} />
                )}

                {/* Summary */}
                {results.summary && (
                  <div className="mt-3 p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded border border-purple-200">
                    <h4 className="font-semibold text-purple-800 mb-1 flex items-center text-xs">
                      <FaInfoCircle className="mr-1" />
                      ANALYSIS SUMMARY
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs">
                      <div className="text-center p-1 bg-white rounded">
                        <div className="text-purple-600 font-semibold">Biller</div>
                        <div className="text-gray-800 font-bold">{results.summary.billerName}</div>
                      </div>
                      <div className="text-center p-1 bg-white rounded">
                        <div className="text-purple-600 font-semibold">Type</div>
                        <div className="text-gray-800 font-bold">{results.summary.feeCommType}</div>
                      </div>
                      <div className="text-center p-1 bg-white rounded">
                        <div className="text-purple-600 font-semibold">Status</div>
                        <div className="text-green-600 font-bold">
                          {viewMode === 'history' ? 'Historical' : 'Completed'}
                        </div>
                      </div>
                      <div className="text-center p-1 bg-white rounded">
                        <div className="text-purple-600 font-semibold">Records</div>
                        <div className="text-gray-800 font-bold">{results.summary.totalRecords}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded shadow-md p-6 border border-gray-200 text-center">
                <div className="p-3 bg-gradient-to-r from-gray-400 to-gray-500 rounded inline-flex mb-3">
                  <FaCalculator className="text-2xl text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-700 mb-1">
                  Ready for Analysis
                </h3>
                <p className="text-gray-500 text-xs mb-3">
                  Upload your fee-commission Excel file to begin the commission structure analysis
                </p>
                <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded">
                  <p className="text-xs text-gray-600">
                    💡 <strong>Pro Tip:</strong> Ensure your Excel file follows the standard commission scheme format for accurate analysis
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Details Modal */}
      <AnimatePresence>
        {showDetails && results && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200 flex flex-col">
              {/* Modal Header */}
              <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-1 bg-white/20 rounded mr-2">
                      <FaInfoCircle className="text-white text-base" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold">Calculation Analysis</h3>
                      <p className="text-indigo-100 text-xs">Step-by-step breakdown</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowDetails(false)}
                    className="bg-white/20 hover:bg-white/30 p-1 rounded transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
                <CalculationSteps />
                
                {/* Raw Data Section */}
                {results.rawData && (
                  <div className="mt-4 bg-white rounded p-3 border border-gray-200 shadow-sm">
                    <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center">
                      <div className="p-1 bg-gradient-to-r from-gray-500 to-gray-600 rounded mr-1">
                        <FaFileExcel className="text-white text-xs" />
                      </div>
                      Raw Extracted Values
                    </h4>
                    <div className="bg-gray-900 rounded p-2 overflow-x-auto">
                      <pre className="text-xs text-green-400">
                        {JSON.stringify(results.rawData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 rounded p-3">
                <div className="flex justify-between items-center">
                  <div className="text-gray-600 text-xs">
                    Analysis completed on {new Date().toLocaleString()}
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={downloadResults}
                      className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded text-xs hover:shadow transition-all duration-200 font-medium"
                    >
                      Export Report
                    </button>
                    <button
                      onClick={() => setShowDetails(false)}
                      className="px-3 py-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded text-xs hover:shadow transition-all duration-200 font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}