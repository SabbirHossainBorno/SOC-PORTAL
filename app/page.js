// app/page.js
'use client';

import { useState, useEffect } from 'react';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaSignInAlt, FaShieldAlt, FaServer, FaChartLine } from 'react-icons/fa';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import ForgotPasswordModal from './components/ForgotPasswordModal';

export default function ServiceOperationsLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Authentication failed');
      }

      if (result.success) {
        toast.success('Login Successful!');
        setTimeout(() => router.push(result.redirect), 1000);
      } else {
        throw new Error(result.message || 'Login Failed');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full overflow-hidden relative"
      style={{
        backgroundImage: "url('/image/bg/login_bg_1.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 to-blue-900/90 z-0"></div>
      
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            fontSize: '0.875rem',
          },
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col md:flex-row items-center justify-center p-4 sm:p-6 pb-16 md:pb-0">
        {/* Brand Panel - Left Side */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full md:w-1/3 lg:w-2/5 max-w-md mb-8 md:mb-0 md:mr-8"
        >
          <div className="backdrop-blur-sm bg-black/30 rounded p-6 border border-white/10 shadow-xl h-full flex flex-col">
            <div className="flex justify-center mb-6">
              <Image
                src="/logo/Nagad_Vertical_Logo_Dark.png"
                alt="Service Operations Center Logo"
                width={200}
                height={100}
                className="w-auto h-24 object-contain"
                priority
              />
            </div>
            
            <div className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Service Operations <span className="text-blue-400">Portal</span>
              </h1>
              <p className="text-blue-200/80 text-sm">
                Centralized monitoring & incident management
              </p>
            </div>
            
            <div className="space-y-4 flex-grow">
              {[
                { 
                  icon: <FaServer className="text-lg text-blue-400" />, 
                  title: "Real-time Monitoring", 
                  desc: "Track service health metrics" 
                },
                { 
                  icon: <FaShieldAlt className="text-lg text-blue-400" />, 
                  title: "Enterprise Security", 
                  desc: "Military-grade encryption" 
                },
                { 
                  icon: <FaChartLine className="text-lg text-blue-400" />, 
                  title: "Performance Analytics", 
                  desc: "Actionable operational insights" 
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  className="flex items-start p-3 bg-white/5 rounded backdrop-blur border border-white/5 hover:border-blue-400/30 transition-all"
                  whileHover={{ y: -3 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="bg-blue-500/10 p-2 rounded mt-1">
                    {feature.icon}
                  </div>
                  <div className="ml-3">
                    <h3 className="text-md font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-blue-100/70 text-xs">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Login Form - Right Side - Increased height */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md backdrop-blur-xl bg-black/30 border border-white/10 rounded shadow-xl overflow-hidden flex items-center justify-center min-h-[460px] md:min-h-[500px]"
        >
          <div className="w-full p-6 sm:p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-white mb-1">Secure Login</h2>
              <p className="text-blue-200/70 text-sm">Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-blue-100 mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="h-4 w-4 text-blue-400/80" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full pl-9 pr-3 py-2.5 bg-black/30 border border-white/10 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-blue-400/50 text-sm"
                    placeholder="username@nagad.com.bd"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-blue-100 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="h-4 w-4 text-blue-400/80" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="block w-full pl-9 pr-9 py-2.5 bg-black/30 border border-white/10 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-blue-400/50 text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <FaEyeSlash className="h-4 w-4 text-blue-400/80 hover:text-blue-300" />
                    ) : (
                      <FaEye className="h-4 w-4 text-blue-400/80 hover:text-blue-300" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs">
                  <button
  type="button"
  onClick={() => setShowForgotPassword(true)}
  className="font-medium text-blue-400 hover:text-blue-300 transition-colors duration-300 bg-transparent border-none cursor-pointer p-0 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded"
>
  🔐 Forgot password?
</button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-blue-500/30 rounded text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow shadow-blue-500/20 disabled:opacity-50 mt-8"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <span className="flex items-center text-sm">
                    <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  <>
                    <FaSignInAlt className="mr-2 text-sm" />
                    <span className="text-sm">Access Portal</span>
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
      <ForgotPasswordModal 
  isOpen={showForgotPassword}
  onClose={() => setShowForgotPassword(false)}
/>
    </div>
  );
}