// app/api/login/route.js
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../../lib/db';
import logger from '../../../lib/logger';
import sendTelegramAlert from '../../../lib/telegramAlert';
import { DateTime } from 'luxon';
import bcrypt from 'bcryptjs';
import { getClientIP } from '../../../lib/utils/ipUtils';

// Get current time in Asia/Dhaka
const getCurrentDateTime = () => {
  const now = DateTime.now().setZone('Asia/Dhaka');
  return now.toFormat("yyyy-LL-dd hh:mm:ss a") + ' (' + now.offsetNameShort + ')';
};

// Format Telegram alert message
const formatAlertMessage = (alertType, email, ipAddress, userAgent, additionalInfo = {}) => {
  let title = '';
  const eid = additionalInfo.eid || 'N/A';
  const status = additionalInfo.status || 'Successful';
  const time = getCurrentDateTime();
  const socPortalId = additionalInfo.socPortalId || 'N/A';
  const roleType = additionalInfo.roleType || 'N/A';

  // Status emoji
  const statusEmoji = status.includes('Failed') ? '❌' : '✅';

  switch (alertType.toLowerCase()) {
    case 'attempt':
      title = '🔐 [ SOC PORTAL | LOGIN ATTEMPT ]';
      break;
    case 'admin':
      title = '🔐 [ SOC PORTAL | ADMIN LOGIN ]';
      break;
    case 'user':
      title = '🔐 [ SOC PORTAL | USER LOGIN ]';
      break;
    case 'system':
      title = '⚠️ [ SOC PORTAL | SYSTEM EVENT ]';
      break;
    default:
      title = '🔐 [ SOC PORTAL | LOGIN EVENT ]';
  }

    const message = `${title}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📧 Email          : ${email}
  👤 SOC Portal ID  : ${socPortalId}
  👥 Role Type      : ${roleType}
  🌐 IP Address     : ${ipAddress}
  🖥️ Device Info    : ${userAgent}
  🔖 EID            : ${eid}
  🕒 Time           : ${time}
  ${statusEmoji} Status         : ${status}`;

  return `\`\`\`\n${message}\n\`\`\``;
};

// Update login tracker
const updateLoginTracker = async (userType, socPortalId, email, roleType) => {
  try {
    const table = userType === 'admin' ? 'admin_login_tracker' : 'user_login_tracker';
    
    const updateQuery = `
      UPDATE ${table}
      SET 
        last_login_time = NOW(),
        total_login_count = total_login_count + 1,
        current_login_status = 'Active',
        updated_at = NOW()
      WHERE soc_portal_id = $1
    `;
    
    const updateRes = await query(updateQuery, [socPortalId]);
    
    if (updateRes.rowCount === 0) {
      const insertQuery = `
        INSERT INTO ${table} 
          (soc_portal_id, role_type, last_login_time, total_login_count, current_login_status)
        VALUES ($1, $2, NOW(), 1, 'Active')
      `;
      await query(insertQuery, [socPortalId, roleType]);
    }
  } catch (error) {
    logger.error(`${userType} login tracker update failed`, {
      meta: {
        taskName: 'LoginTracking',
        details: `Error updating tracker for ${email}: ${error.message}`
      }
    });
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

// Create login success response
const createLoginResponse = async (user, userType, sessionId, email, ipAddress, userAgent) => {
  const eid = `SOC-${Math.floor(100000 + Math.random() * 900000)}`;
  const socPortalId = user.soc_portal_id;
  const roleType = user.role_type;
  const isProduction = process.env.NODE_ENV === 'production';
const baseDomain = '167.88.38.114';

  logger.info('Generated execution ID', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'Generate EID',
      details: `Generated EID ${eid} for ${userType} ${email}`
    }
  });

  await updateLoginTracker(userType, socPortalId, email, roleType);

  // Log successful login activity
  await logActivity(
    userType,
    socPortalId,
    'LOGIN_SUCCESS',
    `Successful ${userType} login for ${email}`,
    ipAddress,
    userAgent,
    eid,
    sessionId
  );

  const successMessage = formatAlertMessage(
    userType,
    email,
    ipAddress,
    userAgent,
    { 
      eid, 
      status: 'Successful',
      socPortalId: socPortalId,
      roleType: roleType
    }
  );

  await sendTelegramAlert(successMessage);

  logger.info('Login success', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'AuthSuccess',
      details: `Successful ${userType} login for ${email}`,
      userType,
      socPortalId
    }
  });

  const response = NextResponse.json({
    success: true,
    redirect: userType === 'admin' ? '/admin_dashboard' : '/user_dashboard',
    user: {
      id: socPortalId,
      email: email,
      role: roleType,
      name: userType === 'admin' ? 'Admin User' : `${user.first_name} ${user.last_name}`
    }
  });

  const sessionCookieConfig = {
  httpOnly: true,
  secure: false, // Keep false for both dev and production
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
};

const clientCookieConfig = {
  httpOnly: false,
  secure: false, // Keep false for both dev and production  
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
};

  // Set cookies with the same config
  response.cookies.set('sessionId', sessionId, sessionCookieConfig);
  response.cookies.set('email', email, clientCookieConfig);
  response.cookies.set('eid', eid, clientCookieConfig);
  response.cookies.set('socPortalId', socPortalId, clientCookieConfig);
  response.cookies.set('userType', userType, clientCookieConfig);
  response.cookies.set('roleType', roleType, clientCookieConfig);
  response.cookies.set('loginTime', new Date().toISOString(), clientCookieConfig);
  response.cookies.set('lastActivity', new Date().toISOString(), clientCookieConfig);

  return response;
};

export async function POST(request) {
  const { email, password } = await request.json();
  const sessionId = uuidv4();
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  console.log('Login API called - Debug Info:', {
        ipAddress,
        headers: Object.fromEntries(request.headers)
    });

  // Send Telegram alert for all login attempts
  const attemptMessage = formatAlertMessage(
    'attempt',
    email,
    ipAddress,
    userAgent,
    { 
      eid: 'Login Attempt', 
      status: 'Attempt',
      socPortalId: 'N/A',
      roleType: 'N/A'
    }
  );
  await sendTelegramAlert(attemptMessage);

  logger.info('Received login request', {
    meta: {
      sid: sessionId,
      taskName: 'Login',
      details: `Login attempt for ${email} from IP ${ipAddress}`
    }
  });

  try {
    // Check admin table
    const adminRes = await query(
      `SELECT * FROM admin_info WHERE email = $1`,
      [email]
    );

    if (adminRes.rows.length > 0) {
      const admin = adminRes.rows[0];

      let passwordValid = false;

      // Check if stored password is bcrypt hash
      if (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$')) {
        passwordValid = await bcrypt.compare(password, admin.password);
      } else {
        // Legacy plain text password check
        passwordValid = password === admin.password;

        // If valid, migrate to bcrypt hash
        if (passwordValid) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          await query(
            `UPDATE admin_info SET password = $1 WHERE soc_portal_id = $2`,
            [hashedPassword, admin.soc_portal_id]
          );
        }
      }

      if (passwordValid) {
        if (admin.status !== 'Active') {
          logger.warn('Inactive admin account attempt', {
            meta: {
              taskName: 'AuthFailure',
              sid: sessionId,
              socPortalId: admin.soc_portal_id,
              status: admin.status,
              details: 'Admin account is inactive'
            }
          });

          const inactiveMessage = formatAlertMessage(
            'admin',
            email,
            ipAddress,
            userAgent,
            { 
              eid: 'Inactive Attempt', 
              status: 'Failed (Inactive)',
              socPortalId: admin.soc_portal_id,
              roleType: admin.role_type
            }
          );
          await sendTelegramAlert(inactiveMessage);

          return NextResponse.json(
            { success: false, message: 'Admin account is inactive' },
            { status: 403 }
          );
        }
        return createLoginResponse(admin, 'admin', sessionId, email, ipAddress, userAgent);
      } else {
        logger.warn('Admin password mismatch', {
          meta: {
            taskName: 'PasswordCheck',
            sid: sessionId,
            socPortalId: admin.soc_portal_id,
            details: `Password mismatch for admin account: ${email}`
          }
        });

        const failedMessage = formatAlertMessage(
          'admin',
          email,
          ipAddress,
          userAgent,
          { 
            eid: 'Password Mismatch', 
            status: 'Failed (Invalid Password)',
            socPortalId: admin.soc_portal_id,
            roleType: admin.role_type
          }
        );
        await sendTelegramAlert(failedMessage);

        return NextResponse.json(
          { success: false, message: 'Invalid email or password' },
          { status: 401 }
        );
      }
    }

    // Check user table
    const userRes = await query(
      `SELECT * FROM user_info WHERE email = $1`,
      [email]
    );

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      
      // BCrypt password verification
      let passwordValid = false;
      
      // Check for bcrypt hashes
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        passwordValid = await bcrypt.compare(password, user.password);
      } else {
        // Legacy plain text password support
        passwordValid = password === user.password;
        
        // Migrate to hashed password if valid
        if (passwordValid) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          await query(
            `UPDATE user_info SET password = $1 WHERE soc_portal_id = $2`,
            [hashedPassword, user.soc_portal_id]
          );
        }
      }

      if (passwordValid) {
        // Check for Resigned status first
        if (user.status === 'Resigned') {
          logger.warn('Resigned user account attempt', {
            meta: {
              taskName: 'AuthFailure',
              sid: sessionId,
              socPortalId: user.soc_portal_id,
              status: user.status,
              details: 'User Account Is Resigned'
            }
          });

          // Send Telegram alert
          const resignedMessage = formatAlertMessage(
            'user',
            email,
            ipAddress,
            userAgent,
            { 
              eid: 'Resigned Attempt', 
              status: 'Failed (Resigned)',
              socPortalId: user.soc_portal_id,
              roleType: user.role_type
            }
          );
          await sendTelegramAlert(resignedMessage);
          
          return NextResponse.json(
            { success: false, message: 'You Already Gave Your Resignation' },
            { status: 403 }
          );
        }

        if (user.status !== 'Active') {
          // Log to application logger (not activity log)
          logger.warn('Inactive user account attempt', {
            meta: {
              taskName: 'AuthFailure',
              sid: sessionId,
              socPortalId: user.soc_portal_id,
              status: user.status,
              details: 'User Account Is Inactive'
            }
          });

          // Send Telegram alert
          const inactiveMessage = formatAlertMessage(
            'user',
            email,
            ipAddress,
            userAgent,
            { 
              eid: 'Inactive Attempt', 
              status: 'Failed (Inactive)',
              socPortalId: user.soc_portal_id,
              roleType: user.role_type
            }
          );
          await sendTelegramAlert(inactiveMessage);
          
          return NextResponse.json(
            { success: false, message: 'Your Account Is Inactive' },
            { status: 403 }
          );
        }
        return createLoginResponse(user, 'user', sessionId, email, ipAddress, userAgent);
      } else {
        // Log to application logger (not activity log)
        logger.warn('User password mismatch', {
          meta: {
            taskName: 'PasswordCheck',
            sid: sessionId,
            socPortalId: user.soc_portal_id,
            details: `Password mismatch for user account: ${email}`
          }
        });

        // Send Telegram alert
        const failedMessage = formatAlertMessage(
          'user',
          email,
          ipAddress,
          userAgent,
          { 
            eid: 'Password Mismatch', 
            status: 'Failed (Invalid Password)',
            socPortalId: user.soc_portal_id,
            roleType: user.role_type
          }
        );
        await sendTelegramAlert(failedMessage);
        
        return NextResponse.json(
          { success: false, message: 'Invalid email or password' },
          { status: 401 }
        );
      }
    }

    // Account not found
    logger.warn('Account not found', {
      meta: {
        sid: sessionId,
        taskName: 'AuthFailure',
        details: `No account found for email: ${email}`
      }
    });

    // Send Telegram alert
    const failedMessage = formatAlertMessage(
      'attempt',
      email,
      ipAddress,
      userAgent,
      { 
        eid: 'Failed Attempt', 
        status: 'Failed (Account Not Found)',
        socPortalId: 'N/A',
        roleType: 'N/A'
      }
    );
    await sendTelegramAlert(failedMessage);
    
    return NextResponse.json(
      { success: false, message: 'Invalid email or password' },
      { status: 401 }
    );

  } catch (error) {
    // Log system error to application logger (not activity log)
    logger.error('Login process error', {
      meta: {
        sid: sessionId,
        taskName: 'SystemError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        requestDetails: {
          email: email.substring(0, 3) + '...',
          passwordLength: password ? password.length : 0
        }
      }
    });

    // Send Telegram alert
    const errorMessage = formatAlertMessage(
      'system',
      email,
      ipAddress,
      userAgent,
      { 
        eid: 'System Error', 
        status: 'Error: ' + error.message,
        socPortalId: 'N/A',
        roleType: 'N/A'
      }
    );
    await sendTelegramAlert(errorMessage);
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}