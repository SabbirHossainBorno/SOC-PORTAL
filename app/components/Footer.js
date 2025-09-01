// app/components/Footer.js
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [randomSystemId, setRandomSystemId] = useState(null);
  const [versionData, setVersionData] = useState({
    number: 'N/A',
    date: 'N/A',
    time: 'N/A'
  });
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    // Set random ID only on client
    setRandomSystemId(Math.floor(Math.random() * 9000 + 1000));
    
    // Fetch version data from API
    const fetchVersionData = async () => {
      try {
        const response = await fetch('/api/version');
        const data = await response.json();
        if (data.success) {
          setVersionData(data.versionData);
        }
      } catch (error) {
        console.error('Error fetching version data:', error);
      }
    };
    
    fetchVersionData();
  }, []);

  const openModal = (modalType) => setActiveModal(modalType);
  const closeModal = () => setActiveModal(null);


// Modal content
  const modalContent = {
    privacy: {
      title: "Privacy Policy",
      color: "from-blue-500 to-blue-600",
      content: (
        <div className="space-y-5">
          <div className="border-b border-gray-200 pb-3">
            <p className="text-gray-600"><strong>Effective Date:</strong> 01 August 2025</p>
          </div>
          
          <p className="text-gray-700">At Service Operations Center (SOC), we are committed to protecting your privacy and maintaining the confidentiality of your data. This Privacy Policy outlines how we collect, use, store, and protect your personal information while using the SOC Portal.</p>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded border border-blue-100">
              <h3 className="font-semibold text-blue-700 mb-2">Information Collection:</h3>
              <p className="text-gray-700">We collect necessary data such as login credentials, IP addresses, device information, and activity logs for operational monitoring and security purposes.</p>
              <p className="text-gray-700 mt-2">No personally identifiable financial data is stored within the system.</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded border border-blue-100">
              <h3 className="font-semibold text-blue-700 mb-2">Use of Information:</h3>
              <p className="text-gray-700">Data is used strictly for performance monitoring, troubleshooting, system enhancement, and compliance auditing.</p>
              <p className="text-gray-700 mt-2">Access to sensitive data is restricted to authorized personnel only.</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded border border-blue-100">
              <h3 className="font-semibold text-blue-700 mb-2">Data Security:</h3>
              <p className="text-gray-700">SOC enforces enterprise-grade encryption, secure data transmission, and access control policies.</p>
              <p className="text-gray-700 mt-2">Regular audits are conducted to ensure compliance with internal and regulatory standards.</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded border border-blue-100">
              <h3 className="font-semibold text-blue-700 mb-2">Retention:</h3>
              <p className="text-gray-700">Login logs and related metadata are retained for audit and compliance tracking purposes, following internal policy retention cycles.</p>
            </div>
          </div>
          
          <div className="pt-3 border-t border-gray-200">
            <p className="text-gray-700"><strong>Your Consent:</strong> By using the SOC Portal, you agree to the collection and use of information in accordance with this policy.</p>
            <p className="text-gray-700 mt-2">For questions related to this policy, please contact our support.</p>
          </div>
        </div>
      )
    },
    terms: {
      title: "Terms & Conditions",
      color: "from-purple-500 to-purple-600",
      content: (
        <div className="space-y-5">
          <div className="border-b border-gray-200 pb-3">
            <p className="text-gray-600"><strong>Last Updated:</strong> 01 August 2025</p>
          </div>
          
          <p className="text-gray-700">These Terms govern your access to and use of the Service Operations Center (SOC) Portal. By accessing the portal, you agree to be bound by these Terms.</p>
          
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded border border-purple-100">
              <h3 className="font-semibold text-purple-700 mb-2">Use of Services:</h3>
              <p className="text-gray-700">The SOC Portal is designated for operational and monitoring use by authorized personnel only.</p>
              <p className="text-gray-700 mt-2">Misuse of credentials or unauthorized access attempts are strictly prohibited and will be reported.</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded border border-purple-100">
              <h3 className="font-semibold text-purple-700 mb-2">System Availability:</h3>
              <p className="text-gray-700">While we strive for 24/7 availability, scheduled maintenance or unforeseen outages may impact access. Notifications will be provided in advance where possible.</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded border border-purple-100">
              <h3 className="font-semibold text-purple-700 mb-2">User Responsibilities:</h3>
              <p className="text-gray-700">Users are expected to maintain the confidentiality of their login information.</p>
              <p className="text-gray-700 mt-2">Any suspicious or anomalous activity must be reported to the System Operations team immediately.</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded border border-purple-100">
              <h3 className="font-semibold text-purple-700 mb-2">Changes to Terms:</h3>
              <p className="text-gray-700">SOC reserves the right to update these Terms periodically. Continued use of the portal implies acceptance of any changes.</p>
            </div>
            
            {/* Added monitoring notice */}
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="font-semibold text-yellow-800">Activity Monitoring Notice</h3>
                  <div className="mt-1 text-yellow-700">
                    <p>Remember that your each and every click is under monitoring by log.</p>
                    <p className="mt-1">All user activities are recorded for security and compliance purposes.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-3 border-t border-gray-200">
            <p className="text-gray-700">If you do not agree with any part of these Terms, please refrain from using the portal and contact the system administrator.</p>
          </div>
        </div>
      )
    },
    support: {
      title: "Support & Contact Information",
      color: "from-teal-500 to-teal-600",
      content: (
        <div className="space-y-6">
          <p className="text-gray-700">For any queries, technical support, or system-related concerns regarding the SOC Portal, please contact:</p>
          
          <div className="bg-teal-50 p-5 rounded border border-teal-100">
            <div className="flex items-center mb-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md mr-4">
                <Image 
                  src="/image/other_img/profile-pic.png" 
                  alt="Md Sabbir Hossain Borno"
                  width={64}
                  height={64}
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">Md Sabbir Hossain Borno</h3>
                <p className="text-gray-600">System Engineer – Remittance Operation</p>
                <p className="text-gray-600">System Operations</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="bg-white p-2 rounded mr-3 border border-gray-200">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <a href="mailto:sabbir.borno@nagad.com.bd" className="text-gray-800 hover:text-blue-600 hover:underline">sabbir.borno@nagad.com.bd</a>
              </div>
              
              <div className="flex items-center">
                <div className="bg-white p-2 rounded mr-3 border border-gray-200">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                  </svg>
                </div>
                <a href="tel:+8801704161380" className="text-gray-800 hover:text-blue-600 hover:underline">+8801704161380</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center">
              <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
              </svg>
              Development Credits
            </h3>
            <p className="mb-4 text-gray-700"><strong>System Design & Development by</strong><br/>
            Md Sabbir Hossain Borno<br/>
            System Engineer – Remittance Operation<br/>
            System Operations | Nagad Limited</p>
            
            <p className="text-gray-700">All modules, monitoring logic, and portal UI/UX have been custom-engineered to meet the operational excellence and control standards of Nagad&apos;s remittance ecosystem.</p>
            
            <p className="mt-4 text-gray-700">Special thanks to all internal teams contributing toward testing, validation, and operational deployment of the SOC Portal.</p>
          </div>
        </div>
      )
    }
  };

  return (
    <>
      <style jsx>{`
        .glass-panel {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        .glass-icon {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(5px);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
      `}</style>
      
      <footer className="fixed bottom-0 left-0 w-full border-t border-gray-200 bg-white text-gray-600 text-xs py-2 px-3 shadow-sm z-40">
        <div className="max-w-7xl mx-auto">
          {/* Desktop Layout */}
          <div className="hidden md:flex flex-row justify-between items-center gap-2">
            {/* Left Section - Status */}
            <div className="flex items-center">
              <div className="flex items-center mr-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                <span className="font-medium">Development</span>
              </div>
              
              <div className="flex items-center text-gray-400">
                <span>
                  Build: {versionData.date} {versionData.time} (BDT)
                </span>
              </div>
            </div>

            {/* Center Section - Copyright */}
            <div className="text-center text-gray-500 font-medium flex-1">
              © {currentYear} Service Operations Center. All rights reserved.
            </div>

            {/* Right Section - Version and Links */}
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-3">
                <span className="bg-gray-100 px-2 py-1 rounded font-mono">
                  v{versionData.number}
                </span>
                
                {/* Only render when randomSystemId exists */}
                {randomSystemId && (
                  <span className="font-medium">
                    EID: <span className="font-mono">#SOC-{randomSystemId}</span>
                  </span>
                )}
              </div>
              
              <div className="flex items-center text-gray-400">
                <span className="mx-2">|</span>
                <div className="flex space-x-3">
                  <button onClick={() => openModal('privacy')} className="hover:text-blue-600 transition-colors">Privacy</button>
                  <button onClick={() => openModal('terms')} className="hover:text-blue-600 transition-colors">Terms</button>
                  <button onClick={() => openModal('support')} className="hover:text-blue-600 transition-colors">Support</button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile Layout - Two Rows */}
          <div className="md:hidden">
            {/* First Row */}
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                <span className="font-medium truncate">Development</span>
              </div>
              
              <div className="text-center text-gray-500 font-medium truncate">
                © {currentYear} SOC
              </div>
              
              <div className="flex items-center space-x-1">
                <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                  v{versionData.number}
                </span>
                {/* Only render when randomSystemId exists */}
                {randomSystemId && (
                  <span className="font-mono">#{randomSystemId}</span>
                )}
              </div>
            </div>
            
            {/* Second Row */}
            <div className="flex justify-between items-center">
              <div className="text-gray-500 text-xs truncate mr-2">
                Build: {versionData.date} {versionData.time}
              </div>
              
              <div className="flex space-x-3">
                <button 
                  onClick={() => openModal('privacy')} 
                  className="text-blue-600 hover:text-blue-800 transition-colors text-xs"
                >
                  Privacy
                </button>
                <button 
                  onClick={() => openModal('terms')} 
                  className="text-blue-600 hover:text-blue-800 transition-colors text-xs"
                >
                  Terms
                </button>
                <button 
                  onClick={() => openModal('support')} 
                  className="text-blue-600 hover:text-blue-800 transition-colors text-xs"
                >
                  Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {activeModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div 
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header with Gradient */}
            <div className={`sticky top-0 bg-gradient-to-r ${modalContent[activeModal].color} text-white z-10 rounded`}>
              <div className="px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">{modalContent[activeModal].title}</h2>
                <button 
                  onClick={closeModal}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 text-gray-700">
              {modalContent[activeModal].content}
            </div>
            
            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded">
              <div className="flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;