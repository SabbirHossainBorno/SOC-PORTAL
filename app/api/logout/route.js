// app/api/logout/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import logger from '../../../lib/logger';
import sendTelegramAlert from '../../../lib/telegramAlert';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { getClientIP } from '../../../lib/utils/ipUtils';

// Enhanced logger with fallback to console
const enhancedLogger = {
  info: (message, meta = {}) => {
    try {
      logger.info(message, { meta });
    } catch (error) {
      console.log(`[INFO] ${message}`, meta);
    }
  },
  error: (message, meta = {}) => {
    try {
      logger.error(message, { meta });
    } catch (error) {
      console.error(`[ERROR] ${message}`, meta);
    }
  },
  warn: (message, meta = {}) => {
    try {
      logger.warn(message, { meta });
    } catch (error) {
      console.warn(`[WARN] ${message}`, meta);
    }
  },
  debug: (message, meta = {}) => {
    try {
      logger.debug(message, { meta });
    } catch (error) {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  }
};

// Get current time in Asia/Dhaka
const getCurrentDateTime = () => {
  const now = DateTime.now().setZone('Asia/Dhaka');
  return now.toFormat("yyyy-LL-dd hh:mm:ss a") + ' (' + now.offsetNameShort + ')';
};

// Enhanced Telegram alert message for logout
const formatLogoutMessage = (userType, email, ipAddress, userAgent, socPortalId, eid, status = 'Successful', reason = '') => {
  const title = userType === 'admin' 
    ? '🔒 [ SOC PORTAL | ADMIN LOGOUT ]' 
    : '🔒 [ SOC PORTAL | USER LOGOUT ]';

  const time = getCurrentDateTime();
  const statusEmoji = status.includes('Error') ? '❌' : '✅';

  // Add session timeout note if applicable
  const sessionNote = reason === 'session_timeout' 
    ? "\n\nN:B: Session Time Out due to inactivity" 
    : '';

  const message = `${title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email          : ${email}
👤 SOC Portal ID  : ${socPortalId}
👥 Role Type      : ${userType}
🌐 IP Address     : ${ipAddress}
🖥️ Device Info    : ${userAgent}
🔖 EID            : ${eid}
🕒 Time           : ${time}
${statusEmoji} Status         : ${status}${sessionNote}`;

  return `\`\`\`\n${message}\n\`\`\``;
};

// Update logout tracker in DB
const updateLogoutTracker = async (userType, socPortalId, email, eid, sid) => {
  try {
    enhancedLogger.debug('Starting logout tracker update', {
      taskName: 'LogoutTracking',
      userType,
      socPortalId,
      email,
      eid,
      sid,
      timestamp: new Date().toISOString()
    });

    const table = userType === 'admin' ? 'admin_login_tracker' : 'user_login_tracker';
    
    const updateQuery = `
      UPDATE ${table}
      SET 
        last_logout_time = NOW(),
        current_login_status = 'Idle',
        updated_at = NOW()
      WHERE soc_portal_id = $1
    `;
    
    enhancedLogger.debug('Executing logout tracker SQL query', {
      taskName: 'LogoutTracking',
      query: updateQuery,
      socPortalId
    });
    
    const result = await query(updateQuery, [socPortalId]);
    
    enhancedLogger.info('LOGOUT_TRACKER_UPDATED_SUCCESSFULLY', {
      taskName: 'LogoutTracking',
      userType,
      socPortalId,
      email,
      eid,
      sid,
      details: `Successfully updated logout tracker for ${userType} ${email}`,
      affectedRows: result?.rowCount || 0,
      timestamp: new Date().toISOString()
    });
    
    return result;
  } 
  catch (error) {
    enhancedLogger.error('LOGOUT_TRACKER_UPDATE_FAILED', {
      taskName: 'LogoutTracking',
      userType,
      socPortalId,
      email,
      eid,
      sid,
      error: error.message,
      stack: error.stack,
      sqlState: error.code,
      details: `Failed to update logout tracker for ${email}`,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Log activity to appropriate table
const logActivity = async (userType, socPortalId, action, description, ipAddress, userAgent, eid, sid) => {
  try {
    enhancedLogger.debug('Starting activity logging', {
      taskName: 'ActivityLog',
      userType,
      socPortalId,
      action,
      description,
      ipAddress,
      eid,
      sid
    });

    let table;
    let idValue;
    
    if (userType === 'admin' || userType === 'user') {
      table = userType === 'admin' ? 'admin_activity_log' : 'user_activity_log';
      idValue = socPortalId;
    } else {
      table = 'user_activity_log'; // Fallback to user table for system events
      idValue = 'N/A';
    }
    
    const queryText = `
      INSERT INTO ${table} 
        (soc_portal_id, action, description, ip_address, device_info, eid, sid, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `;
    
    enhancedLogger.debug('Executing activity log SQL query', {
      taskName: 'ActivityLog',
      query: queryText,
      table,
      socPortalId,
      action
    });
    
    const result = await query(queryText, [
      idValue,
      action,
      description,
      ipAddress,
      userAgent,
      eid,
      sid
    ]);
    
    enhancedLogger.info('ACTIVITY_LOGGED_SUCCESSFULLY', {
      taskName: 'ActivityLog',
      userType,
      socPortalId,
      action,
      description,
      eid,
      sid,
      details: `Successfully logged ${action} for ${socPortalId}`,
      affectedRows: result?.rowCount || 0,
      timestamp: new Date().toISOString()
    });
    
    return result;
  } catch (error) {
    enhancedLogger.error('ACTIVITY_LOG_FAILED', {
      taskName: 'ActivityLog',
      userType,
      socPortalId,
      action,
      description,
      eid,
      sid,
      error: error.message,
      stack: error.stack,
      sqlState: error.code,
      details: `Failed to log activity ${action} for ${socPortalId}`,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export async function POST(request) {
  const startTime = Date.now();
  const requestId = uuidv4();
  
  try {
    enhancedLogger.info('🚀 LOGOUT_API_REQUEST_STARTED', {
      taskName: 'LogoutAPI',
      requestId,
      method: 'POST',
      url: request.url,
      timestamp: new Date().toISOString()
    });

    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
    
    // Extract cookies
    const cookies = request.cookies;
    const email = cookies.get('email')?.value || 'Unknown';
    const socPortalId = cookies.get('socPortalId')?.value || 'Unknown';
    const userType = cookies.get('userType')?.value || 'user';
    const eid = cookies.get('eid')?.value || 'N/A';
    const sid = cookies.get('sessionId')?.value || uuidv4();

    // Get reason from request body
    let actionReason = 'user_initiated';
    try {
      const body = await request.json();
      actionReason = body.reason || 'user_initiated';
      enhancedLogger.debug('Request body parsed successfully', {
        taskName: 'LogoutAPI',
        requestId,
        body,
        actionReason
      });
    } catch (error) {
      enhancedLogger.warn('Failed to parse request body, using default reason', {
        taskName: 'LogoutAPI',
        requestId,
        error: error.message
      });
    }

    // Log all extracted data
    enhancedLogger.info('📋 LOGOUT_REQUEST_DETAILS_EXTRACTED', {
      taskName: 'LogoutAPI',
      requestId,
      email,
      socPortalId,
      userType,
      eid,
      sid,
      ipAddress,
      userAgent: userAgent.substring(0, 100) + '...', // Truncate long user agent
      actionReason,
      cookies: {
        hasEmail: !!cookies.get('email'),
        hasSocPortalId: !!cookies.get('socPortalId'),
        hasUserType: !!cookies.get('userType'),
        hasEid: !!cookies.get('eid'),
        hasSessionId: !!cookies.get('sessionId')
      },
      timestamp: new Date().toISOString()
    });

    // Cookie configuration (MUST MATCH LOGIN CONFIG)
    const clearCookieConfig = {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    };

    const clearSessionCookieConfig = {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    };

    const cookieNames = [
      'email', 
      'eid', 
      'socPortalId', 
      'userType', 
      'roleType',
      'loginTime',
      'lastActivity'
    ];

    enhancedLogger.info('🔄 PROCESSING_LOGOUT_REQUEST', {
      taskName: 'LogoutProcessing',
      requestId,
      userType,
      socPortalId,
      email,
      ipAddress,
      reason: actionReason,
      timestamp: new Date().toISOString()
    });

    // Step 1: Update logout tracker
    enhancedLogger.debug('Step 1: Updating logout tracker', {
      taskName: 'LogoutProcessing',
      requestId,
      step: 'logout_tracker'
    });
    
    await updateLogoutTracker(userType, socPortalId, email, eid, sid);

    // Step 2: Log activity
    enhancedLogger.debug('Step 2: Logging activity', {
      taskName: 'LogoutProcessing',
      requestId,
      step: 'activity_log'
    });
    
    // Determine user type for description
    const userTypeDisplay = userType === 'admin' ? 'Admin' : 'User';
    await logActivity(
      userType,
      socPortalId,
      'LOGOUT',
      `${userTypeDisplay} logged out successfully (Reason: ${actionReason})`,
      ipAddress,
      userAgent,
      eid,
      sid
    );

    // Step 3: Send Telegram alert
    enhancedLogger.debug('Step 3: Sending Telegram alert', {
      taskName: 'LogoutProcessing',
      requestId,
      step: 'telegram_alert'
    });
    
    const logoutMessage = formatLogoutMessage(
      userType,
      email,
      ipAddress,
      userAgent,
      socPortalId,
      eid,
      'Successful',
      actionReason
    );

    try {
      await sendTelegramAlert(logoutMessage);
      enhancedLogger.info('📤 TELEGRAM_ALERT_SENT_SUCCESSFULLY', {
        taskName: 'TelegramAlert',
        requestId,
        userType,
        email,
        messageLength: logoutMessage.length
      });
    } catch (telegramError) {
      enhancedLogger.error('TELEGRAM_ALERT_FAILED', {
        taskName: 'TelegramAlert',
        requestId,
        userType,
        email,
        error: telegramError.message,
        details: 'Telegram alert failed but logout process continues'
      });
      // Don't throw error, continue with logout process
    }

    const duration = Date.now() - startTime;
    enhancedLogger.info('✅ LOGOUT_PROCESS_COMPLETED_SUCCESSFULLY', {
      taskName: 'LogoutCompletion',
      requestId,
      userType,
      socPortalId,
      email,
      reason: actionReason,
      duration,
      stepsCompleted: ['logout_tracker', 'activity_log', 'telegram_alert'],
      timestamp: new Date().toISOString()
    });

    // Prepare response with cleared cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logout Successful!',
      requestId,
      duration
    });

    // Step 4: Clear all authentication cookies
    enhancedLogger.debug('Step 4: Clearing authentication cookies', {
      taskName: 'CookieCleanup',
      requestId,
      step: 'clear_cookies',
      cookieNames: [...cookieNames, 'sessionId']
    });

    // Clear all authentication cookies with PROPER CONFIG
    cookieNames.forEach(name => {
      response.cookies.set(name, '', clearCookieConfig);
      enhancedLogger.debug(`Cleared cookie: ${name}`, {
        taskName: 'CookieCleanup',
        requestId,
        cookieName: name
      });
    });
    response.cookies.set('sessionId', '', clearSessionCookieConfig);
    enhancedLogger.debug('Cleared session cookie', {
      taskName: 'CookieCleanup',
      requestId,
      cookieName: 'sessionId'
    });

    enhancedLogger.info('🍪 ALL_COOKIES_CLEARED_SUCCESSFULLY', {
      taskName: 'CookieCleanup',
      requestId,
      email,
      clearedCookies: [...cookieNames, 'sessionId'],
      totalCookiesCleared: cookieNames.length + 1,
      timestamp: new Date().toISOString()
    });

    enhancedLogger.info('🎯 LOGOUT_API_RESPONSE_SENT', {
      taskName: 'LogoutAPI',
      requestId,
      status: 200,
      totalDuration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });

    return response;

  } catch (error) {
    const duration = Date.now() - startTime;
    
    enhancedLogger.error('❌ LOGOUT_PROCESS_FAILED', {
      taskName: 'LogoutError',
      requestId,
      error: error.message,
      stack: error.stack,
      errorCode: error.code,
      errorName: error.name,
      duration,
      timestamp: new Date().toISOString()
    });

    // Extract data for error handling (might not be available due to earlier errors)
    let email = 'Unknown';
    let socPortalId = 'Unknown';
    let userType = 'user';
    let eid = 'N/A';
    
    try {
      const cookies = request.cookies;
      email = cookies.get('email')?.value || 'Unknown';
      socPortalId = cookies.get('socPortalId')?.value || 'Unknown';
      userType = cookies.get('userType')?.value || 'user';
      eid = cookies.get('eid')?.value || 'N/A';
    } catch (cookieError) {
      enhancedLogger.warn('Failed to extract cookies for error handling', {
        taskName: 'LogoutError',
        requestId,
        cookieError: cookieError.message
      });
    }

    // Enhanced error handling with Telegram alert
    const errorMessage = formatLogoutMessage(
      userType,
      email,
      getClientIP(request),
      request.headers.get('user-agent') || 'Unknown',
      socPortalId,
      eid,
      `Error: ${error.message}`
    );

    try {
      await sendTelegramAlert(errorMessage);
      enhancedLogger.info('📤 ERROR_TELEGRAM_ALERT_SENT', {
        taskName: 'TelegramAlert',
        requestId,
        message: 'Error alert sent to Telegram'
      });
    } catch (telegramError) {
      enhancedLogger.error('ERROR_TELEGRAM_ALERT_FAILED', {
        taskName: 'TelegramAlert',
        requestId,
        error: telegramError.message
      });
    }

    // Even if logout tracking fails, still clear cookies
    const response = NextResponse.json(
      {
        success: false,
        message: 'Logout completed with some errors',
        error: error.message,
        requestId,
        duration
      },
      { status: 500 }
    );

    // Clear cookies regardless of errors with PROPER CONFIG
    const cookieNames = ['email', 'eid', 'socPortalId', 'userType', 'roleType', 'loginTime', 'lastActivity'];
    
    try {
      cookieNames.forEach(name => {
        response.cookies.set(name, '', {
          httpOnly: false,
          secure: false,
          sameSite: 'lax',
          maxAge: 0,
          path: '/'
        });
      });
      response.cookies.set('sessionId', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });
      
      enhancedLogger.warn('🍪 COOKIES_CLEARED_DESPITE_ERRORS', {
        taskName: 'CookieCleanup',
        requestId,
        email,
        clearedCookies: [...cookieNames, 'sessionId'],
        details: 'Cookies cleared despite logout errors'
      });
    } catch (cookieError) {
      enhancedLogger.error('COOKIE_CLEANUP_FAILED', {
        taskName: 'CookieCleanup',
        requestId,
        error: cookieError.message,
        details: 'Failed to clear cookies during error handling'
      });
    }

    enhancedLogger.info('🎯 ERROR_RESPONSE_SENT', {
      taskName: 'LogoutAPI',
      requestId,
      status: 500,
      totalDuration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });

    return response;
  }
}