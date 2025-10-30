// app/components/withAuth.js
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';
import { 
  initSessionActivityTracking, 
  handleSessionExpiration, 
  getCookie  // ✅ ADD THIS IMPORT
} from '../../lib/sessionUtils';

const withAuth = (WrappedComponent, requiredRoles = []) => {
  const Wrapper = (props) => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authInfo, setAuthInfo] = useState({
      isAuthenticated: false,
      role: null,
      userType: null,
      socPortalId: null
    });
    
    const hasShownToast = useRef(false);
    const sessionCleanupRef = useRef(null);

    const checkAuth = useCallback(async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/check_auth');
        
        if (!response.ok) throw new Error(`Auth check failed: ${response.status}`);
        
        const result = await response.json();
        
        if (result.authenticated) {
          setAuthInfo({
            isAuthenticated: true,
            role: result.role,
            userType: result.userType,
            socPortalId: result.socPortalId
          });
          hasShownToast.current = false;
        } else {
          throw new Error(result.message || 'Authentication failed');
        }
      } catch (error) {
        console.error('Authentication Check Failed:', error.message);
        
        if (!hasShownToast.current) {
          hasShownToast.current = true;
          
          toast.error(
            error.message.includes('expired') 
              ? 'Session expired! Please login again' 
              : 'Authentication required! Please login',
            {
              id: 'auth-error',
              duration: 4000,
              position: 'top-right'
            }
          );
          
          router.push('/?authRequired=true');
        }
      } finally {
        setLoading(false);
      }
    }, [router]);

    const handleUnauthorizedAccess = useCallback(() => {
      if (!hasShownToast.current) {
        hasShownToast.current = true;
        
        toast.error('Access denied! You do not have permission to view this page', {
          id: 'access-denied',
          duration: 5000,
          position: 'top-right'
        });
        
        // Redirect based on user type
        const redirectPath = authInfo.userType === 'admin' 
          ? '/admin_dashboard' 
          : '/user_dashboard';
          
        router.push(redirectPath);
      }
    }, [authInfo.userType, router]);

    useEffect(() => {
      // Initialize session tracking
      sessionCleanupRef.current = initSessionActivityTracking(router);
      checkAuth();
      
      return () => {
        if (sessionCleanupRef.current) sessionCleanupRef.current();
      };
    }, [checkAuth, router]);

    useEffect(() => {
      // Handle session expiration using window location
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('sessionExpired')) {
          toast.error('Session expired! Please login again', {
            id: 'session-expired-param',
            duration: 5000,
            position: 'top-right'
          });
        }
      }
    }, []);

    // Add this useEffect for debugging - ONLY IN DEVELOPMENT
    useEffect(() => {
      if (process.env.NODE_ENV === 'development') {
        // Session debug logging
        const debugInterval = setInterval(() => {
          const lastActivity = getCookie('lastActivity'); // ✅ NOW WORKING
          if (lastActivity) {
            const diff = Date.now() - new Date(lastActivity).getTime();
            console.log(`[Session Debug] Inactive: ${Math.round(diff/1000)}s | Warning: ${window.sessionWarningShown ? 'shown' : 'not shown'}`);
          }
        }, 30000);
        
        return () => clearInterval(debugInterval);
      }
    }, []);

    useEffect(() => {
      // Role-based access control
      if (authInfo.isAuthenticated && requiredRoles.length > 0) {
        // Normalize roles for users
        const effectiveRole = authInfo.userType === 'user' ? 'User' : authInfo.role;
        const hasRequiredRole = requiredRoles.includes(effectiveRole);
        
        if (!hasRequiredRole) {
          handleUnauthorizedAccess();
        }
      }
    }, [authInfo, requiredRoles, handleUnauthorizedAccess]);

    if (loading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    return authInfo.isAuthenticated ? (
      <WrappedComponent {...props} authInfo={authInfo} />
    ) : null;
  };

  // Set display name for debugging
  Wrapper.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return Wrapper;
};

export default withAuth;