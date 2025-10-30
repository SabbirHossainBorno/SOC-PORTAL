// lib/sessionUtils.js
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';

// Constants
const LAST_ACTIVITY_COOKIE = 'lastActivity';
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes (updated from 10)
const WARNING_THRESHOLD = 12 * 60 * 1000; // 12 minutes (80% of session)
let sessionLock = false;

// Cookie utilities using js-cookie - EXPORT THESE FUNCTIONS
export const getCookie = (name) => Cookies.get(name);
export const setCookie = (name, value, days = 1) => {
  const secure = process.env.NODE_ENV === 'production';
  Cookies.set(name, value, { expires: days, path: '/', secure, sameSite: 'Lax' });
};
export const removeCookie = (name) => Cookies.remove(name, { path: '/' });

/**
 * Remove all session-related cookies
 */
export const removeCookies = () => {
  console.log('[SessionUtils] Removing session cookies...');
  
  const cookies = [
    'email',
    'sessionId',
    LAST_ACTIVITY_COOKIE,
    'eid',
    'socPortalId',
    'userType',
    'roleType',
    'loginTime'
  ];

  cookies.forEach(cookie => {
    if (getCookie(cookie)) {
      removeCookie(cookie);
      console.log(`[SessionUtils] Removed cookie: ${cookie}`);
    }
  });
};

/**
 * Show session expired notification
 */
export const showToastNotification = () => {
  if (typeof window !== 'undefined') {
    console.log('[SessionUtils] Showing session expired toast');
    toast.error('Session Expired! Please Login Again.', {
      id: 'session-expired',
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#1e293b',
        color: '#f8fafc',
        border: '1px solid #334155',
      }
    });
  }
};

/**
 * Redirect to login page
 */
export const redirectToLogin = async (router) => {
  if (typeof window !== 'undefined') {
    console.log('[SessionUtils] Redirecting to login page');
    if (router) {
      router.push('/?sessionExpired=true');
    } else {
      window.location.href = '/?sessionExpired=true';
    }
  }
};

/**
 * Handle session expiration
 */
export const handleSessionExpiration = async (router = null) => {
  if (sessionLock) return;
  sessionLock = true;
  
  try {
    console.log('[SessionUtils] Handling session expiration');
    
    // Call logout API
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'session_timeout' }),
      });
    } catch (error) {
      console.error('[SessionUtils] Logout API error:', error);
    }

    // Client-side cleanup
    removeCookies();
    showToastNotification();
    
    // Redirect
    await redirectToLogin(router);
  } finally {
    setTimeout(() => {
      sessionLock = false;
      console.log('[SessionUtils] Session lock released');
    }, 3000);
  }
};

/**
 * Reset activity timer
 */
export const resetActivityTimer = () => {
  if (typeof window !== 'undefined') {
    setCookie(LAST_ACTIVITY_COOKIE, new Date().toISOString());
    
    // Reset warning flag when user is active
    if (typeof window !== 'undefined') {
      window.sessionWarningShown = false;
    }
  }
};

/**
 * Check if session is about to expire
 */
export const isSessionAboutToExpire = () => {
  if (typeof window === 'undefined') return false;
  
  const lastActivity = getCookie(LAST_ACTIVITY_COOKIE);
  if (!lastActivity) return false;
  
  const now = Date.now();
  const lastActivityTime = new Date(lastActivity).getTime();
  const diff = now - lastActivityTime;
  
  // Warn when 80% of session time has passed
  return diff > (SESSION_TIMEOUT * 0.8);
};

/**
 * Initialize session activity tracking
 */
export const initSessionActivityTracking = (router) => {
  if (typeof window === 'undefined') return;
  
  console.log('[SessionUtils] Initializing session activity tracking');
  
  // Reset any existing warning flags
  window.sessionWarningShown = false;
  
  const handleActivity = () => {
    resetActivityTimer();
  };
  
  // Use faster debouncing (300ms)
  const debouncedActivity = debounce(handleActivity, 300);
  
  // More comprehensive activity events
  const events = [
    'mousemove', 'mousedown', 'click', 'scroll',
    'keydown', 'keypress', 'touchstart', 'touchmove',
    'input', 'change', 'focus', 'blur'
  ];
  
  events.forEach(event => {
    window.addEventListener(event, debouncedActivity);
  });
  
  // Check session every 10 seconds
  const checkInterval = setInterval(() => {
    const lastActivity = getCookie(LAST_ACTIVITY_COOKIE);
    if (!lastActivity) {
      console.warn('[SessionUtils] No lastActivity cookie found');
      return;
    }
    
    const now = Date.now();
    const lastActivityTime = new Date(lastActivity).getTime();
    const diff = now - lastActivityTime;
    
    console.log(`[SessionUtils] Inactive for: ${Math.round(diff/1000)}s`);
    
    // Show warning at 12 minutes (80% of 15 minutes)
    if (diff > WARNING_THRESHOLD && diff < SESSION_TIMEOUT) {
      if (!window.sessionWarningShown) {
        console.log('[SessionUtils] Showing session warning');
        window.sessionWarningShown = true;
        
        toast.error('Your session will expire in 3 minutes. Please save your work.', {
          id: 'session-warning',
          duration: 10000,
          position: 'top-right'
        });
      }
    }
    
    // Handle session expiration at 15 minutes
    if (diff > SESSION_TIMEOUT) {
      console.warn(`[SessionUtils] Session timeout after ${Math.round(diff/1000)}s`);
      handleSessionExpiration(router);
    }
  }, 10000); // Check every 10 seconds
  
  return () => {
    clearInterval(checkInterval);
    events.forEach(event => {
      window.removeEventListener(event, debouncedActivity);
    });
  };
};

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}