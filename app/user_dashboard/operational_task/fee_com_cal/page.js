// app/user_dashboard/operational_task/fee_com_cal/page.js
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaCalculator, FaUpload, FaFileExcel, FaDownload, 
  FaArrowLeft, FaInfoCircle, FaUsers, FaChartBar,
  FaMoneyBillWave, FaExchangeAlt,
  FaEye, FaFileExport, FaCopy
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function FeeComCalculationPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [feeCommType, setFeeCommType] = useState('Regular');
  const [results, setResults] = useState(null);
  const [billerName, setBillerName] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const feeCommTypes = [
    { value: 'Regular', label: 'Regular', color: 'from-blue-500 to-cyan-500' },
    { value: 'Drop Point', label: 'Drop Point', color: 'from-orange-500 to-red-500' },
    { value: 'EMI Biller', label: 'EMI Biller', color: 'from-indigo-500 to-blue-500' }
  ];

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
    if (feeCommType !== 'Regular') {
      toast.error(`${feeCommType} type is coming soon! Currently only Regular type is supported.`);
      return;
    }

    if (!selectedFile) {
      toast.error('Please select an Excel file first');
      return;
    }

    if (!billerName) {
      toast.error('Could not extract biller name from file. Please check file name format.');
      return;
    }

    setLoading(true);
    setResults(null); // Clear previous results when starting new calculation
    const toastId = toast.loading('Analyzing fee structure and calculating commissions...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('feeCommType', feeCommType);
      formData.append('billerName', billerName);

      const response = await fetch('/api/user_dashboard/operational_task/fee_com_cal', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Commission analysis completed successfully!', { id: toastId });
        setResults(result.data);
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
    
    // Create CSV content
    let csvContent = 'Category,Channel,Fee Rate,Sender Agent,Parent Distributor,Master Distributor,TWTL/SP,BPO/PP,Advance Commission\n';
    
    if (results.uddokta) {
      csvContent += `UDDOKTA,APP,${formatNumber(results.uddokta.app.feeRate)},${formatNumber(results.uddokta.app.commissions.senderAgent)},${formatNumber(results.uddokta.app.commissions.parentDistributor)},${formatNumber(results.uddokta.app.commissions.masterDistributor)},${formatNumber(results.uddokta.app.commissions.twltSp, 'twltSp')},${formatNumber(results.uddokta.app.commissions.bpoPp, 'bpoPp')},${formatNumber(results.uddokta.app.commissions.adjustment)}\n`;
      csvContent += `UDDOKTA,USSD,${formatNumber(results.uddokta.ussd.feeRate)},${formatNumber(results.uddokta.ussd.commissions.senderAgent)},${formatNumber(results.uddokta.ussd.commissions.parentDistributor)},${formatNumber(results.uddokta.ussd.commissions.masterDistributor)},${formatNumber(results.uddokta.ussd.commissions.twltSp, 'twltSp')},${formatNumber(results.uddokta.ussd.commissions.bpoPp, 'bpoPp')},${formatNumber(results.uddokta.ussd.commissions.adjustment)}\n`;
    }

    if (results.customer) {
      csvContent += `CUSTOMER,APP,${formatNumber(results.customer.app.feeRate)},N/A,N/A,${formatNumber(results.customer.app.commissions.masterDistributor)},${formatNumber(results.customer.app.commissions.twltSp, 'twltSp')},${formatNumber(results.customer.app.commissions.bpoPp, 'bpoPp')},${formatNumber(results.customer.app.commissions.adjustment)}\n`;
      csvContent += `CUSTOMER,USSD,${formatNumber(results.customer.ussd.feeRate)},N/A,N/A,${formatNumber(results.customer.ussd.commissions.masterDistributor)},${formatNumber(results.customer.ussd.commissions.twltSp, 'twltSp')},${formatNumber(results.customer.ussd.commissions.bpoPp, 'bpoPp')},${formatNumber(results.customer.ussd.commissions.adjustment)}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Fee-Commission_Results_${billerName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getTime()}.csv`;
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
    
    if (key === 'twltSp' || key === 'bpoPp') {
      return number.toFixed(5);
    }
    
    if (key === 'adjustment') {
      return number.toFixed(9);
    }
    
    return number.toFixed(9);
  };

  const formatDisplayValue = (num, key = '') => {
    const formatted = formatNumber(num, key);
    return formatted === 'N/A' ? 'N/A' : formatted;
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

  const CommissionSection = ({ title, data, type }) => (
    <div className="mb-4">
      <div className={`rounded p-2 mb-2 bg-gradient-to-r ${
        type === 'uddokta' ? 'from-blue-600 to-indigo-600' : 'from-green-600 to-emerald-600'
      } text-white shadow-md`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center">
            <div className={`p-1 rounded mr-2 ${
              type === 'uddokta' ? 'bg-blue-500' : 'bg-green-500'
            }`}>
              <FaUsers className="text-white text-xs" />
            </div>
            {title}
          </h3>
          <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
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
              <FaMoneyBillWave className="text-white text-xs" />
            </div>
            <h4 className="font-semibold text-gray-800 text-sm">APP Commission</h4>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center p-1 bg-blue-50 rounded">
              <span className="text-gray-700 text-xs font-medium">Fee Rate</span>
              <div className="flex items-center">
                <span className="font-bold text-gray-900 text-xs">
                  {formatDisplayValue(data.app.feeRate, 'feeRate')}
                </span>
                <CopyButton value={formatDisplayValue(data.app.feeRate, 'feeRate')} />
              </div>
            </div>

            {Object.entries(data.app.commissions).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-1 hover:bg-gray-50 rounded text-xs">
                <span className="text-gray-600 capitalize">
                  {key === 'adjustment' ? 'Advance Commission' : 
                   key === 'senderAgent' ? 'Uddokta' :
                   key === 'parentDistributor' ? 'Distributor' :
                   key === 'masterDistributor' ? 'Master Distributor' :
                   key === 'twltSp' ? 'TWTL' :
                   key === 'bpoPp' ? 'BPO' : key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-800">
                    {formatDisplayValue(value, key)}
                  </span>
                  <CopyButton value={formatDisplayValue(value, key)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* USSD Commission */}
        <div className="bg-white rounded p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center mb-2">
            <div className="p-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded mr-2">
              <FaExchangeAlt className="text-white text-xs" />
            </div>
            <h4 className="font-semibold text-gray-800 text-sm">USSD Commission</h4>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center p-1 bg-green-50 rounded">
              <span className="text-gray-700 text-xs font-medium">Fee Rate</span>
              <div className="flex items-center">
                <span className="font-bold text-gray-900 text-xs">
                  {formatDisplayValue(data.ussd.feeRate, 'feeRate')}
                </span>
                <CopyButton value={formatDisplayValue(data.ussd.feeRate, 'feeRate')} />
              </div>
            </div>

            {Object.entries(data.ussd.commissions).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-1 hover:bg-gray-50 rounded text-xs">
                <span className="text-gray-600 capitalize">
                  {key === 'adjustment' ? 'Advance Commission' : 
                   key === 'senderAgent' ? 'Uddokta' :
                   key === 'parentDistributor' ? 'Distributor' :
                   key === 'masterDistributor' ? 'Master Distributor' :
                   key === 'twltSp' ? 'TWTL' :
                   key === 'bpoPp' ? 'BPO' : key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-800">
                    {formatDisplayValue(value, key)}
                  </span>
                  <CopyButton value={formatDisplayValue(value, key)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

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
          <div className="xl:col-span-1">
            <div className="bg-white rounded shadow-md p-4 border border-gray-200 h-fit">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded mr-2">
                  <FaCalculator className="text-white text-sm" />
                </div>
                <h2 className="text-base font-bold text-gray-800">Analysis Parameters</h2>
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
                      onClick={() => setFeeCommType(type.value)}
                      className={`w-full text-left p-2 rounded transition-all duration-200 text-xs ${
                        feeCommType === type.value 
                          ? `bg-gradient-to-r ${type.color} text-white shadow-md`
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      } ${type.value !== 'Regular' ? 'opacity-70' : ''}`}
                    >
                      <div className="font-medium flex items-center justify-between">
                        <span>{type.label}</span>
                        {type.value !== 'Regular' && (
                          <span className="text-xs bg-black/20 px-1 py-0.5 rounded">Soon</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coming Soon Notice for non-Regular types */}
              {!isRegularType && (
                <div className="mb-3 p-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded border border-orange-200">
                  <div className="flex items-center">
                    <div className="p-1 bg-orange-500 rounded mr-1">
                      <FaInfoCircle className="text-white text-xs" />
                    </div>
                    <div>
                      <p className="text-orange-800 font-semibold text-xs">{feeCommType} Type</p>
                      <p className="text-orange-600 text-xs">Coming soon! Currently only Regular type is supported.</p>
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
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 transition-colors flex items-center font-medium"
                    >
                      <FaUpload className="mr-1" />
                      Choose File
                    </button>
                  </div>
                </div>

                {selectedFile && (
                  <div className="mt-1 p-2 bg-green-50 rounded border border-green-200 flex items-center">
                    <FaFileExcel className="text-green-600 mr-2 text-xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-green-800 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-green-600">
                        Biller: {billerName}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleCalculate}
                  disabled={!selectedFile || loading || !isRegularType}
                  className={`w-full h-8 px-3 rounded text-xs font-semibold transition-all flex items-center justify-center ${
                    !selectedFile || loading || !isRegularType
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow hover:shadow-md'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="border-b-2 border-white mr-1"></div>
                      Calculating...
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
                  className="w-full h-8 px-3 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center justify-center text-xs font-medium"
                >
                  <FaDownload className="mr-1" />
                  Download Template
                </button>
              </div>
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
                      <h2 className="text-base font-bold text-gray-800">Commission Analysis</h2>
                      <p className="text-gray-600 text-xs">Detailed breakdown of fee distribution</p>
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
                      <h3 className="text-sm font-bold">{billerName}</h3>
                      <p className="text-blue-100 text-xs">{feeCommType} Commission Structure</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold">Analysis Complete</div>
                      <div className="text-blue-100 text-xs">{new Date().toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>

                {/* UDDOKTA Section */}
                {results.uddokta && (
                  <CommissionSection 
                    title="UDDOKTA COMMISSION" 
                    data={results.uddokta} 
                    type="uddokta" 
                  />
                )}

                {/* CUSTOMER Section */}
                {results.customer && (
                  <CommissionSection 
                    title="CUSTOMER COMMISSION" 
                    data={results.customer} 
                    type="customer" 
                  />
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
                        <div className="text-gray-800 font-bold">{billerName}</div>
                      </div>
                      <div className="text-center p-1 bg-white rounded">
                        <div className="text-purple-600 font-semibold">Type</div>
                        <div className="text-gray-800 font-bold">{feeCommType}</div>
                      </div>
                      <div className="text-center p-1 bg-white rounded">
                        <div className="text-purple-600 font-semibold">Status</div>
                        <div className="text-green-600 font-bold">Completed</div>
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