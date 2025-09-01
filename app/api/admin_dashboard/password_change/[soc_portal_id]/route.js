//app/api/admin_dashboard/password_change/[soc_portal_id]/route.js
import { query } from '../../../../../lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import logger from '../../../../../lib/logger';
import sendTelegramAlert from '../../../../../lib/telegramAlert';
import { DateTime } from 'luxon';

// Get current time in Asia/Dhaka
const getCurrentDateTime = () => {
  const now = DateTime.now().setZone('Asia/Dhaka');
  return now.toFormat("yyyy-LL-dd hh:mm:ss a") + ' (' + now.offsetNameShort + ')';
};

// Format Telegram alert message
const formatAlertMessage = (action, ipAddress, userAgent, adminData) => {
  const time = getCurrentDateTime();
  const title = `🔑 [ SOC PORTAL | PASSWORD ${action.toUpperCase()} ]`;
  const statusEmoji = action.includes('SUCCESS') ? '✅' : '❌';

  return `\`\`\`\n${title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Admin ID      : ${adminData.id}
📧 Email         : ${adminData.email}
🌐 IP Address    : ${ipAddress}
🖥️ Device Info   : ${userAgent}
🔖 EID           : ${adminData.eid}
🕒 Time          : ${time}
${statusEmoji} Status        : ${action.includes('SUCCESS') ? 'Successful' : 'Failed'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`\`\``;
};

// Fallback logging function
const logWithFallback = (level, message, meta = {}) => {
  try {
    logger.log(level, message, { meta });
  } catch (loggerError) {
    console.error(`Logger failed (${level}):`, loggerError);
    console.log(`[FALLBACK ${level.toUpperCase()}] ${message}`, meta);
  }
};

export async function PUT(request) {
  // Initialize variables
  let eid = 'N/A';
  let sid = 'N/A';
  let adminEmail = 'N/A';
  let adminId = 'N/A';
  
  // Extract IP and User Agent
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
  
  try {
    // Log request start with fallback
    logWithFallback('info', 'Password change request started', { ipAddress, userAgent });
    
    // Extract soc_portal_id from URL path
    const pathSegments = request.nextUrl.pathname.split('/');
    const soc_portal_id = pathSegments[pathSegments.length - 1];
    
    // Validate soc_portal_id
    if (!soc_portal_id || soc_portal_id === '[soc_portal_id]') {
      const errorMsg = 'Invalid admin ID: ' + soc_portal_id;
      logWithFallback('error', errorMsg, { soc_portal_id, pathSegments });
      throw new Error(errorMsg);
    }
    
    // Get request data
    const requestBody = await request.json();
    const { currentPassword, newPassword } = requestBody;
    
    // Get cookies safely
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(cookie => {
        const [key, ...rest] = cookie.trim().split('=');
        return [key, rest.join('=')];
      })
    );
    
    eid = cookies.eid || 'N/A';
    sid = cookies.sessionId || 'N/A';
    adminId = cookies.socPortalId || 'N/A';
    
    logWithFallback('info', 'Processing password change', { soc_portal_id, eid, sid, adminId });

    // 1. Get admin info with password
    let admin;
    try {
      logWithFallback('debug', 'Querying admin info', { soc_portal_id });
      const result = await query(
        'SELECT password, email FROM admin_info WHERE soc_portal_id = $1',
        [soc_portal_id]
      );
      
      // Handle different result formats
      if (Array.isArray(result)) {
        admin = result[0];
      } else if (result && result.rows) {
        admin = result.rows[0];
      } else {
        admin = result;
      }
    } catch (queryError) {
      logWithFallback('error', 'Database query failed', {
        error: queryError.message,
        stack: queryError.stack,
        soc_portal_id,
        eid,
        sid
      });
      throw new Error('Database query failed');
    }
    
    if (!admin) {
      const errorMsg = `Admin not found: ${soc_portal_id}`;
      logWithFallback('warn', errorMsg, { soc_portal_id, eid, sid });
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }
    
    adminEmail = admin.email;
    logWithFallback('debug', 'Admin found', { email: adminEmail });

    // 2. Verify current password
    logWithFallback('debug', 'Verifying current password');
    let passwordValid = false;
    
    if (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$')) {
      logWithFallback('debug', 'Password is hashed - using bcrypt compare');
      passwordValid = await bcrypt.compare(currentPassword, admin.password);
    } else if (currentPassword === admin.password) {
      logWithFallback('debug', 'Plain text password matches');
      passwordValid = true;
    } else if (!admin.password && !currentPassword) {
      logWithFallback('debug', 'Both stored and current passwords are empty');
      passwordValid = true;
    }
    
    if (!passwordValid) {
      logWithFallback('warn', 'Current password mismatch', { soc_portal_id, eid, sid });
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // 3. Hash new password
    logWithFallback('debug', 'Hashing new password');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Start transaction for atomic operations
    logWithFallback('debug', 'Starting database transaction');
    await query('BEGIN');
    
    // 4. Update password
    logWithFallback('debug', 'Updating password in database');
    await query(
      'UPDATE admin_info SET password = $1 WHERE soc_portal_id = $2',
      [hashedPassword, soc_portal_id]
    );
    
    // 5. Insert into admin_activity_log
    logWithFallback('debug', 'Logging activity');
    const activityLogQuery = `
      INSERT INTO admin_activity_log (
        soc_portal_id, action, description, ip_address, device_info, eid, sid
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    await query(activityLogQuery, [
      adminId,
      'PASSWORD_CHANGE',
      'Updated account password',
      ipAddress,
      userAgent,
      eid,
      sid
    ]);
    
    // 6. Insert into admin_notification_details
    logWithFallback('debug', 'Creating notification');
    const notificationQuery = `
      INSERT INTO admin_notification_details (
        notification_id, title, status, created_at
      )
      VALUES (
        'AN' || (SELECT LPAD((COALESCE(MAX(serial),0)+1)::text, 4, '0') FROM admin_notification_details),
        $1, 'Unread', NOW()
      )
    `;
    await query(notificationQuery, [
      `Password updated for admin: ${adminId}`
    ]);
    
    // Commit transaction
    logWithFallback('debug', 'Committing transaction');
    await query('COMMIT');

    // 7. Send Telegram alert
    logWithFallback('debug', 'Sending Telegram alert');
    const alertMessage = formatAlertMessage(
      'SUCCESS', 
      ipAddress, 
      userAgent,
      { id: adminId, email: adminEmail, eid }
    );
    await sendTelegramAlert(alertMessage);

    logWithFallback('info', 'Password updated successfully', { soc_portal_id, eid, sid, adminId });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Rollback on error
    try {
      logWithFallback('warn', 'Attempting transaction rollback');
      await query('ROLLBACK');
    } catch (rollbackError) {
      logWithFallback('error', 'Transaction rollback failed', {
        error: rollbackError.message,
        stack: rollbackError.stack,
        eid,
        sid
      });
    }
    
    // Send failure alert
    try {
      logWithFallback('warn', 'Sending failure alert');
      const alertMessage = formatAlertMessage(
        'FAILURE', 
        ipAddress, 
        userAgent,
        { id: adminId, email: adminEmail, eid }
      );
      await sendTelegramAlert(alertMessage);
    } catch (alertError) {
      logWithFallback('error', 'Failed to send alert', {
        error: alertError.message,
        stack: alertError.stack
      });
    }

    logWithFallback('error', 'Password update failed', {
      error: error.message,
      stack: error.stack,
      eid,
      sid,
      adminId
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}