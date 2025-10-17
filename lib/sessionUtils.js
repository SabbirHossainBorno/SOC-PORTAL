// lib/sessionUtils.js
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';

// Constants
const LAST_ACTIVITY_COOKIE = 'lastActivity';
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
let sessionLock = false;

// Cookie utilities using js-cookie
const getCookie = (name) => Cookies.get(name);
const setCookie = (name, value, days = 1) => {
  const secure = process.env.NODE_ENV === 'production';
  Cookies.set(name, value, { expires: days, path: '/', secure, sameSite: 'Lax' });
};
const removeCookie = (name) => Cookies.remove(name, { path: '/' });

/**
 * Remove all session-related cookies
 */
const removeCookies = () => {
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
const showToastNotification = () => {
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
const redirectToLogin = async (router) => {
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
  
  // Activity detection with debouncing
  const handleActivity = () => resetActivityTimer();
  
  // Debounced activity handler
  const debouncedActivity = debounce(handleActivity, 1000);
  
  // Event listeners
  const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
  events.forEach(event => window.addEventListener(event, debouncedActivity));
  
  // Session check interval
  const checkInterval = setInterval(() => {
    const lastActivity = getCookie(LAST_ACTIVITY_COOKIE);
    if (!lastActivity) return;
    
    const now = Date.now();
    const lastActivityTime = new Date(lastActivity).getTime();
    const diff = now - lastActivityTime;
    
    // Warn user when session is about to expire
    if (diff > (SESSION_TIMEOUT * 0.8) && diff < SESSION_TIMEOUT) {
      if (!getCookie('sessionWarningShown')) {
        toast.error('Your session will expire soon. Please save your work.', {
          id: 'session-warning',
          duration: 5000,
          position: 'top-right'
        });
        setCookie('sessionWarningShown', 'true', 0.1); // Expires in 2.4 hours
      }
    }
    
    if (diff > SESSION_TIMEOUT) {
      console.warn(`[SessionUtils] Session timeout detected (${Math.round(diff/1000)}s inactivity)`);
      handleSessionExpiration(router);
    }
  }, 30000);
  
  // Cleanup function
  return () => {
    clearInterval(checkInterval);
    events.forEach(event => window.removeEventListener(event, debouncedActivity));
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