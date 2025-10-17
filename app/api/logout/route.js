// app/api/logout/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import logger from '../../../lib/logger';
import sendTelegramAlert from '../../../lib/telegramAlert';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { getClientIP } from '../../../lib/utils/ipUtils';

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
    const table = userType === 'admin' ? 'admin_login_tracker' : 'user_login_tracker';
    
    const updateQuery = `
      UPDATE ${table}
      SET 
        last_logout_time = NOW(),
        current_login_status = 'Idle',
        updated_at = NOW()
      WHERE soc_portal_id = $1
    `;
    
    await query(updateQuery, [socPortalId]);
    
    logger.info('Logout tracker updated', {
      meta: {
        eid,
        sid,
        taskName: 'LogoutTracking',
        details: `Updated tracker for ${email} (${socPortalId})`,
        userType,
        socPortalId
      }
    });
  } 
  catch (error) {
    logger.error('Logout tracker update failed', {
      meta: {
        eid,
        sid,
        taskName: 'LogoutTracking',
        details: `Error updating tracker for ${email}: ${error.message}`,
        stack: error.stack
      }
    });
    throw error;
  }
};

// Log activity to appropriate table
const logActivity = async (userType, socPortalId, action, description, ipAddress, userAgent, eid, sid) => {
  try {
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
    
    await query(queryText, [
      idValue,
      action,
      description,
      ipAddress,
      userAgent,
      eid,
      sid
    ]);
    
    logger.info('Activity logged', {
      meta: {
        eid,
        sid,
        taskName: 'ActivityLog',
        details: `Logged ${action} for ${socPortalId || 'system'}`,
        userType
      }
    });
    
  } catch (error) {
    logger.error('Activity log failed', {
      meta: {
        eid,
        sid,
        taskName: 'ActivityLog',
        details: `Error logging ${action} for ${socPortalId || 'system'}: ${error.message}`
      }
    });
  }
};

export async function POST(request) {
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
  const { reason } = await request.json().catch(() => ({}));
  const actionReason = reason || 'user_initiated';

  try {
    logger.info('Logout request received', {
      meta: {
        eid,
        sid,
        taskName: 'LogoutRequest',
        details: `Logout initiated for ${email} (${socPortalId})`,
        reason: actionReason
      }
    });

    // Update logout tracker
    await updateLogoutTracker(userType, socPortalId, email, eid, sid);

    // Determine user type for description
    const userTypeDisplay = userType === 'admin' ? 'Admin' : 'User';

    // Log successful logout activity
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

    // Send logout alert with reason
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

    await sendTelegramAlert(logoutMessage);

    logger.info('Logout successful', {
      meta: {
        eid,
        sid,
        taskName: 'AuthLogout',
        details: `${userTypeDisplay} ${email} logged out successfully`,
        userType,
        socPortalId
      }
    });

    // Prepare response with cleared cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logout Successful!'
    });

    // Clear all authentication cookies
    const cookieNames = [
      'email', 
      'sessionId', 
      'eid', 
      'socPortalId', 
      'userType', 
      'roleType',
      'loginTime',
      'lastActivity'
    ];

    cookieNames.forEach(name => {
      response.cookies.set(name, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 0,
        path: '/'
      });
    });

    return response;

  } catch (error) {
    // Enhanced error handling
    const errorMessage = formatLogoutMessage(
      userType,
      email,
      ipAddress,
      userAgent,
      socPortalId,
      eid,
      `Error: ${error.message}`
    );

    await sendTelegramAlert(errorMessage);

    logger.error('Logout process error', {
      meta: {
        eid,
        sid,
        taskName: 'LogoutError',
        details: `Error during logout for ${email}: ${error.message}`,
        stack: error.stack
      }
    });

    // Even if logout tracking fails, still clear cookies
    const response = NextResponse.json(
      {
        success: false,
        message: 'Logout completed with some errors',
        error: error.message
      },
      { status: 500 }
    );

    // Clear cookies regardless of errors
    const cookieNames = [
      'email', 
      'sessionId', 
      'eid', 
      'socPortalId', 
      'userType', 
      'roleType',
      'loginTime',
      'lastActivity'
    ];

    cookieNames.forEach(name => {
      response.cookies.set(name, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 0,
        path: '/'
      });
    });

    return response;
  }
}