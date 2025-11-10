// app/components/WithAuth.js
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';
import { 
  initSessionActivityTracking, 
  getCookie
} from '../../lib/sessionUtils';

const withAuth = (WrappedComponent, requiredRoles = []) => {
  const Wrapper = (props) => {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    const [authInfo, setAuthInfo] = useState({
      isAuthenticated: false,
      role: null,
      userType: null,
      socPortalId: null,
      email: null
    });
    const [routeAllowed, setRouteAllowed] = useState(true);
    
    const hasShownToast = useRef(false);
    const sessionCleanupRef = useRef(null);
    const permissionCheckInProgress = useRef(false);

    const sendUnauthorizedAlert = useCallback(async (userEmail, socPortalId, roleType, eid = 'N/A', sid = 'N/A') => {
  try {
    console.log('🚨 Sending unauthorized alert with:', { eid, sid });

    const requestBody = {
      attemptedUrl: pathname,
      userEmail,
      socPortalId,
      roleType,
      alertType: pathname.startsWith('/admin_dashboard') ? 'ADMIN_ACCESS_ATTEMPT' : 'UNAUTHORIZED_ROUTE_ACCESS',
      eid,
      sid
    };

    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

    const alertResponse = await fetch('/api/admin_dashboard/role_permission/role_management/unauthorized_alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!alertResponse.ok) {
      console.error('❌ Failed to send unauthorized alert:', alertResponse.status);
      return;
    }

    const alertResult = await alertResponse.json();
    console.log('✅ Unauthorized alert sent successfully:', alertResult);

  } catch (error) {
    console.error('❌ Error sending unauthorized alert:', error);
  }
}, [pathname]);

    const checkRoutePermission = useCallback(async (socPortalId, roleType) => {
  if (permissionCheckInProgress.current) {
    return true;
  }

  permissionCheckInProgress.current = true;

  try {
    // Skip permission check for admin routes (handled above)
    if (pathname.startsWith('/admin_dashboard')) {
      return true;
    }

    // Always allow the main dashboard
    if (pathname === '/user_dashboard') {
      return true;
    }

    const response = await fetch(
      `/api/admin_dashboard/role_permission/role_management/user_permissions?soc_portal_id=${socPortalId}&role_type=${roleType}`
    );
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    
    if (data.success && data.permissions && Array.isArray(data.permissions)) {
      const allowedPaths = data.permissions;
      
      // ✅ FIX: More specific path matching
      const isAllowed = allowedPaths.some(allowedPath => {
        // Exact match
        if (pathname === allowedPath) {
          console.log(`✅ Exact match: ${pathname} === ${allowedPath}`);
          return true;
        }
        
        // Nested route match: only allow if the immediate parent is allowed
        // Example: /user_dashboard/document_hub/other_document_log should allow /user_dashboard/document_hub/other_document_log/device_tracker_log
        // But /user_dashboard/document_hub/other_document_tracker should NOT allow /user_dashboard/document_hub/other_document_tracker/device_tracker
        if (pathname.startsWith(allowedPath + '/')) {
          // Additional check: make sure the parent path is explicitly allowed, not just any parent
          const parentPath = pathname.substring(0, pathname.lastIndexOf('/'));
          if (parentPath === allowedPath) {
            console.log(`✅ Valid nested route match: ${pathname} is direct child of ${allowedPath}`);
            return true;
          } else {
            console.log(`❌ Invalid nested route: ${pathname} is not direct child of ${allowedPath}, parent is ${parentPath}`);
            return false;
          }
        }

        return false;
      });

      console.log(`🎯 Final permission result for ${pathname}: ${isAllowed}`);
      console.log(`📊 Allowed paths:`, allowedPaths);
      return isAllowed;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error checking permissions:', error);
    return false;
  } finally {
    permissionCheckInProgress.current = false;
  }
}, [pathname]);

    const checkAuth = useCallback(async () => {
  try {
    setLoading(true);
    
    const response = await fetch('/api/check_auth');
    
    if (!response.ok) throw new Error(`Auth check failed: ${response.status}`);
    
    const result = await response.json();
    
    if (result.authenticated) {

      // 🔍 ADD THIS DEBUG BLOCK
      console.log('🔐 WithAuth - Full API Response:', result);
      console.log('🔐 WithAuth - Role from API:', result.role);
      console.log('🔐 WithAuth - UserType from API:', result.userType);
      
      // Use EID and SID from the server response
      setAuthInfo({
        isAuthenticated: true,
        role: result.role,
        userType: result.userType,
        socPortalId: result.socPortalId,
        email: getCookie('email'),
        eid: result.eid || 'N/A',  // From server response
        sid: result.sid || 'N/A'   // From server response
      });

      // 🔍 ADD DEBUG LOG HERE
      console.log('🔐 Auth successful - Full result:', result);
      console.log('🎯 Role from API:', result.role);
      console.log('🎯 UserType from API:', result.userType);
      console.log('✅ Can Create Access Form:', ['SOC', 'INTERN'].includes(result.role));
      console.log('✅ Can Edit Access Form:', ['SOC', 'INTERN'].includes(result.role));

      console.log('🔐 Auth successful with:', { 
        eid: result.eid, 
        sid: result.sid,
        userType: result.userType 
      });

      // 🔒 CRITICAL: IMMEDIATELY prevent users from accessing admin routes
      if (pathname.startsWith('/admin_dashboard') && result.userType !== 'admin') {
        console.log('🚫 User attempting to access admin dashboard, IMMEDIATE redirect...');
        
        // Send Telegram alert FIRST
        await sendUnauthorizedAlert(
          getCookie('email'),
          result.socPortalId,
          result.role,
          result.eid,  // Pass EID from server response
          result.sid   // Pass SID from server response
        );
        
        // Show toast and redirect IMMEDIATELY
        if (!hasShownToast.current) {
          hasShownToast.current = true;
          toast.error('You do not have permission to access the admin dashboard!', {
            id: 'admin-access-denied',
            duration: 3000,
            position: 'top-right'
          });
        }
        
        // IMMEDIATE redirect - don't wait for anything
        router.replace('/user_dashboard');
        return; // Stop ALL further execution
      }

      // Check route permissions for user dashboard
      if (result.userType === 'user') {
        const isRouteAllowed = await checkRoutePermission(result.socPortalId, result.role);
        
        if (!isRouteAllowed) {
          setRouteAllowed(false);
          
          console.log('🚫 Access denied, sending alert...');
          await sendUnauthorizedAlert(
            getCookie('email'),
            result.socPortalId,
            result.role,
            result.eid,  // Pass EID from server response
            result.sid   // Pass SID from server response
          );
          
          if (!hasShownToast.current) {
            hasShownToast.current = true;
            toast.error('Access denied! You do not have permission to view this page', {
              id: 'access-denied',
              duration: 5000,
              position: 'top-right'
            });
            
            router.replace('/user_dashboard');
            return;
          }
        } else {
          setRouteAllowed(true);
          hasShownToast.current = false;
        }
      } else {
        setRouteAllowed(true);
        hasShownToast.current = false;
      }
    } else {
      throw new Error(result.message || 'Authentication failed');
    }
  } catch (error) {
    console.error('❌ Auth check failed:', error.message);
    
    if (!hasShownToast.current) {
      hasShownToast.current = true;
      toast.error(
        error.message.includes('expired') 
          ? 'Session expired! Please login again' 
          : 'Authentication required! Please login',
        { id: 'auth-error', duration: 4000, position: 'top-right' }
      );
      router.replace('/?authRequired=true');
    }
  } finally {
    setLoading(false);
  }
}, [router, checkRoutePermission, sendUnauthorizedAlert, pathname]);

    useEffect(() => {
      sessionCleanupRef.current = initSessionActivityTracking(router);
      checkAuth();
      
      return () => {
        if (sessionCleanupRef.current) sessionCleanupRef.current();
      };
    }, [checkAuth, router]);

    useEffect(() => {
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

    // Add this useEffect to debug all cookies when component mounts
// Add this useEffect for comprehensive cookie debugging
useEffect(() => {
  if (typeof window !== 'undefined') {
    console.log('🍪=== COOKIE DEBUG START ===');
    console.log('Full document.cookie:', document.cookie);
    
    // Parse all cookies
    const cookies = document.cookie.split(';');
    console.log('All parsed cookies:');
    cookies.forEach(cookie => {
      const trimmed = cookie.trim();
      const [key, value] = trimmed.split('=');
      console.log(`  "${key}": "${value}"`);
    });
    
    // Check specific cookies we need
    const requiredCookies = ['eid', 'sessionId'];
    requiredCookies.forEach(cookieName => {
      const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${cookieName}=`));
      
      if (cookie) {
        const value = cookie.split('=')[1];
        console.log(`✅ FOUND: ${cookieName} = ${value}`);
      } else {
        console.log(`❌ MISSING: ${cookieName}`);
      }
    });
    
    console.log('🍪=== COOKIE DEBUG END ===');
  }
}, []);

    // Debug state changes
    useEffect(() => {
      //console.log('🔄 Auth state:', { loading, routeAllowed, pathname });
    }, [loading, routeAllowed, pathname]);

    if (loading) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600">Checking permissions...</p>
    </div>
  );
}

    if (!routeAllowed) {
  //console.log('🚫 Rendering access denied state - redirecting...');
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
    </div>
  );
}

if (authInfo.isAuthenticated && routeAllowed) {
  //console.log('✅ Rendering wrapped component');
  return <WrappedComponent {...props} authInfo={authInfo} />;
}

return (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <LoadingSpinner size="lg" />
  </div>
);

  };

  Wrapper.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return Wrapper;
};

export default withAuth;