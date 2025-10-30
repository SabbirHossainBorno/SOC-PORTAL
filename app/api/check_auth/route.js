// app/api/check_auth/route.js
import { NextResponse } from 'next/server';
import logger from '../../../lib/logger';
import sendTelegramAlert from '../../../lib/telegramAlert';
import { query } from '../../../lib/db';
import { getClientIP } from '../../../lib/utils/ipUtils';

// Security headers
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// Format alert message
const formatAlertMessage = (title, email, ipAddress, additionalInfo = '') => {
  return `SOC PORTAL AUTH-CHECKER\n----------------------------------------\n${title}\nEmail: ${email}\nIP: ${ipAddress}${additionalInfo}`;
};

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value;
  const eid = request.cookies.get('eid')?.value || '';
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown UA';
  const email = request.cookies.get('email')?.value;
  const socPortalId = request.cookies.get('socPortalId')?.value;
  const userType = request.cookies.get('userType')?.value;

  // Cookie configuration for clearing (must match login/logout)
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

  logger.info('AUTH_CHECK_REQUESTED', {
    eid,
    sid: sessionId,
    taskName: 'AuthCheck',
    email,
    socPortalId,
    userType,
    ipAddress: ip,
    userAgent: userAgent.substring(0, 100), // Limit length
    details: 'Authentication check initiated'
  });

  console.log('Check Auth API - Debug Info:', {
    ip,
    cookies: {
      sessionId: sessionId ? 'present' : 'missing',
      email: email ? 'present' : 'missing',
      eid: eid ? 'present' : 'missing',
      socPortalId: socPortalId ? 'present' : 'missing',
      userType: userType ? 'present' : 'missing'
    }
  });

  // Handle missing credentials
  if (!email || !sessionId) {
    const alertMessage = `SOC PORTAL AUTH-CHECKER\n----------------------------------------\n🚨 Unauthorized Access Attempt!\nIP: ${ip}\nUA: ${userAgent}`;
    await sendTelegramAlert(alertMessage);

    logger.warn('UNAUTHORIZED_ACCESS_ATTEMPT', {
      eid,
      sid: sessionId,
      taskName: 'AuthCheck',
      ipAddress: ip,
      userAgent,
      missingCredentials: {
        email: !email,
        sessionId: !sessionId
      },
      severity: 'HIGH',
      details: 'Missing authentication credentials'
    });

    return NextResponse.json(
      { authenticated: false, message: 'Missing credentials' },
      { status: 401, headers: securityHeaders }
    );
  }

  try {
    // Session expiration check - CHANGED TO 15 MINUTES
    const lastActivity = request.cookies.get('lastActivity')?.value;
    const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes (CHANGED FROM 10)
    
    if (lastActivity) {
      const now = Date.now();
      const lastActivityTime = new Date(lastActivity).getTime();
      const diff = now - lastActivityTime;

      logger.debug('SESSION_ACTIVITY_CHECK', {
        eid,
        sid: sessionId,
        taskName: 'SessionCheck',
        email,
        lastActivity,
        inactiveSeconds: Math.round(diff/1000),
        timeoutSeconds: SESSION_TIMEOUT/1000,
        details: `Session activity check - ${Math.round(diff/1000)}s inactive`
      });

      if (diff > SESSION_TIMEOUT) {
        const alertMessage = formatAlertMessage('🔐 Session Expired', email, ip);
        await sendTelegramAlert(alertMessage);

        logger.warn('SESSION_EXPIRED', {
          email,
          eid,
          sid: sessionId,
          taskName: 'AuthCheck',
          lastActivity,
          inactiveSeconds: Math.round(diff/1000),
          severity: 'MEDIUM',
          details: `Session expired due to inactivity (${Math.round(diff/1000)}s)`
        });

        const response = NextResponse.json(
          { authenticated: false, message: 'Session expired' },
          { status: 401, headers: securityHeaders }
        );
        
        // Clear authentication cookies with PROPER CONFIG
        response.cookies.set('sessionId', '', clearSessionCookieConfig);
        response.cookies.set('email', '', clearCookieConfig);
        response.cookies.set('socPortalId', '', clearCookieConfig);
        response.cookies.set('lastActivity', '', clearCookieConfig);

        logger.info('EXPIRED_SESSION_CLEANED', {
          eid,
          sid: sessionId,
          taskName: 'SessionCleanup',
          email,
          details: 'Cleared cookies for expired session'
        });
        
        return response;
      }
    } else {
      logger.warn('MISSING_LAST_ACTIVITY_COOKIE', {
        eid,
        sid: sessionId,
        taskName: 'SessionCheck',
        email,
        details: 'lastActivity cookie not found'
      });
    }

    // Check user in admin_info or user_info
    let userType = null;
    let role = null;
    let userStatus = null;
    let dbSocPortalId = null;

    // Check admin_info table first
    const adminRes = await query(
      `SELECT status, role_type, soc_portal_id 
       FROM admin_info 
       WHERE email = $1`,
      [email]
    );
    
    if (adminRes.rows.length > 0) {
      const admin = adminRes.rows[0];
      userType = 'admin';
      role = admin.role_type;
      userStatus = admin.status;
      dbSocPortalId = admin.soc_portal_id;
    } 
    // Check user_info table if not found in admin
    else {
      const userRes = await query(
        `SELECT status, role_type, soc_portal_id 
         FROM user_info 
         WHERE email = $1`,
        [email]
      );
      
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        userType = 'user';
        role = 'User'; // Normalize to 'User'
        userStatus = user.status;
        dbSocPortalId = user.soc_portal_id;
      }
    }

    // Handle no user found
    if (!userType) {
      logger.warn('USER_NOT_FOUND', {
        email,
        eid,
        sid: sessionId,
        taskName: 'AuthCheck',
        severity: 'MEDIUM',
        details: 'No matching account found in database'
      });
      
      return NextResponse.json(
        { authenticated: false, message: 'Account not found' },
        { status: 404, headers: securityHeaders }
      );
    }

    // Check account status - Handle Resigned status specifically
    if (userStatus === 'Resigned') {
      logger.warn('RESIGNED_ACCOUNT_ATTEMPT', {
        email,
        eid,
        sid: sessionId,
        taskName: 'AuthCheck',
        userType,
        socPortalId: dbSocPortalId,
        severity: 'HIGH',
        details: `${userType} account is resigned`
      });
      
      return NextResponse.json(
        { authenticated: false, message: 'You Already Gave Your Resignation' },
        { status: 403, headers: securityHeaders }
      );
    }

    // Check account status
    if (userStatus !== 'Active') {
      logger.warn('INACTIVE_ACCOUNT_ATTEMPT', {
        email,
        eid,
        sid: sessionId,
        taskName: 'AuthCheck',
        userType,
        socPortalId: dbSocPortalId,
        status: userStatus,
        severity: 'HIGH',
        details: `${userType} account is not active (status: ${userStatus})`
      });
      
      return NextResponse.json(
        { authenticated: false, message: 'Account inactive' },
        { status: 403, headers: securityHeaders }
      );
    }

    // Verify socPortalId if present
    if (socPortalId && dbSocPortalId !== socPortalId) {
      logger.warn('INVALID_SOC_PORTAL_ID', {
        email,
        socPortalId,
        dbSocPortalId,
        eid,
        sid: sessionId,
        taskName: 'AuthCheck',
        userType,
        severity: 'HIGH',
        details: `Provided SOC Portal ID (${socPortalId}) does not match database (${dbSocPortalId})`
      });
      
      return NextResponse.json(
        { authenticated: false, message: 'Invalid credentials' },
        { status: 403, headers: securityHeaders }
      );
    }

    logger.info('AUTHENTICATION_SUCCESSFUL', {
      email,
      socPortalId: dbSocPortalId,
      eid,
      sid: sessionId,
      taskName: 'AuthCheck',
      userType,
      role,
      status: userStatus,
      severity: 'LOW',
      details: `Authentication successful for ${userType} with role ${role}`
    });

    // ✅ CRITICAL FIX: Create response and reset activity timer
    const response = NextResponse.json(
      { 
        authenticated: true, 
        role: role,
        userType: userType,
        socPortalId: dbSocPortalId || 'Unknown'
      },
      { headers: securityHeaders }
    );

    // ✅ RESET ACTIVITY TIMER to extend session
    response.cookies.set('lastActivity', new Date().toISOString(), {
      httpOnly: false,
      secure: false, // Match login config
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    logger.debug('ACTIVITY_TIMER_RESET', {
      eid,
      sid: sessionId,
      taskName: 'SessionMaintenance',
      email,
      details: 'Last activity timer reset due to successful auth check'
    });

    return response;

  } catch (error) {
    console.error('Authentication check error:', error);

    const alertMessage = formatAlertMessage(
      '❌ Auth Check Error',
      email,
      ip,
      `\nError: ${error.message}`
    );
    await sendTelegramAlert(alertMessage);

    logger.error('AUTHENTICATION_CHECK_FAILED', {
      email,
      eid,
      sid: sessionId,
      taskName: 'AuthCheck',
      error: error.message,
      stack: error.stack,
      severity: 'CRITICAL',
      details: 'Internal server error during authentication check'
    });

    return NextResponse.json(
      { authenticated: false, message: 'Internal server error' },
      { status: 500, headers: securityHeaders }
    );
  }
}