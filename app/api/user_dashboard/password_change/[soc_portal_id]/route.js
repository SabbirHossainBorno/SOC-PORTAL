import { query } from '../../../../../lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import logger from '../../../../../lib/logger';
import sendTelegramAlert from '../../../../../lib/telegramAlert';
import { DateTime } from 'luxon';
import nodemailer from 'nodemailer';

// Get current time in Asia/Dhaka
const getCurrentDateTime = () => {
  const now = DateTime.now().setZone('Asia/Dhaka');
  return now.toFormat("yyyy-LL-dd hh:mm:ss a") + ' (' + now.offsetNameShort + ')';
};

// Format Telegram alert message - improved version
const formatAlertMessage = (action, ipAddress, userAgent, userData) => {
  const time = getCurrentDateTime();
  const statusEmoji = action.includes('SUCCESS') ? '✅' : '❌';
  const statusText = action.includes('SUCCESS') ? 'Successful' : 'Failed';
  
  return `🔐 *SOC Portal Password Changed ${statusText}*
  
👤 *User ID:* ${userData.id}
📧 *Email:* ${userData.email}
🌐 *IP Address:* ${ipAddress}
🔖 *EID:* ${userData.eid}
🕒 *Time:* ${time}
📱 *Device:* ${userAgent.split(' ')[0]}

${statusEmoji} *Status:* ${statusText}`;
};

// Format email message
const formatEmailMessage = (userData) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                 color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
        .alert { background-color: #d4edda; color: #155724; padding: 10px; border-radius: 4px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 SOC Portal Password Updated</h1>
        </div>
        <div class="content">
          <div class="alert">
            <strong>Success!</strong> Your SOC Portal password has been updated successfully.
          </div>
          <p>Hello,</p>
          <p>This is to confirm that your SOC Portal account password was successfully changed.</p>
          
          <p><strong>Account Details:</strong></p>
          <ul>
            <li><strong>User ID:</strong> ${userData.id}</li>
            <li><strong>Email:</strong> ${userData.email}</li>
            <li><strong>Time:</strong> ${getCurrentDateTime()}</li>
          </ul>
          
          <p>If you did not initiate this change, please contact the SOC team immediately.</p>
          
          <p>Best regards,<br>SOC Portal Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send email function
const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    // Verify connection configuration
    await transporter.verify();
    console.log('SMTP connection verified');
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', {
      message: error.message,
      stack: error.stack,
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER
    });
    throw error;
  }
};

// Fallback logging function
const logWithFallback = (level, message, meta = {}) => {
  try {
    logger.log(level, message, { meta });
    console.log(`[${level.toUpperCase()}] ${message}`, meta);
  } catch (loggerError) {
    console.error(`Logger failed (${level}):`, loggerError);
    console.log(`[FALLBACK ${level.toUpperCase()}] ${message}`, meta);
  }
};

export async function PUT(request) {
  // Initialize variables
  let eid = 'N/A';
  let sid = 'N/A';
  let userEmail = 'N/A';
  let userId = 'N/A';
  
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
      const errorMsg = 'Invalid user ID: ' + soc_portal_id;
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
    userId = cookies.socPortalId || 'N/A';
    
    logWithFallback('info', 'Processing password change', { soc_portal_id, eid, sid, userId });

    // 1. Get user info with password
    let user;
    try {
      logWithFallback('debug', 'Querying user info', { soc_portal_id });
      const result = await query(
        'SELECT password, email FROM user_info WHERE soc_portal_id = $1',
        [soc_portal_id]
      );
      
      // Handle different result formats
      if (Array.isArray(result)) {
        user = result[0];
      } else if (result && result.rows) {
        user = result.rows[0];
      } else {
        user = result;
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
    
    if (!user) {
      const errorMsg = `User not found: ${soc_portal_id}`;
      logWithFallback('warn', errorMsg, { soc_portal_id, eid, sid });
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    userEmail = user.email;
    logWithFallback('debug', 'User found', { email: userEmail });

    // 2. Verify current password
    logWithFallback('debug', 'Verifying current password');
    let passwordValid = false;
    
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      logWithFallback('debug', 'Password is hashed - using bcrypt compare');
      passwordValid = await bcrypt.compare(currentPassword, user.password);
    } else if (currentPassword === user.password) {
      logWithFallback('debug', 'Plain text password matches');
      passwordValid = true;
    } else if (!user.password && !currentPassword) {
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
      'UPDATE user_info SET password = $1 WHERE soc_portal_id = $2',
      [hashedPassword, soc_portal_id]
    );
    
    // 5. Insert into user_activity_log
    logWithFallback('debug', 'Logging activity');
    const activityLogQuery = `
      INSERT INTO user_activity_log (
        soc_portal_id, action, description, ip_address, device_info, eid, sid
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    await query(activityLogQuery, [
      userId,
      'PASSWORD_CHANGE',
      'Updated account password',
      ipAddress,
      userAgent,
      eid,
      sid
    ]);
    
    // 6. Insert into user_notification_details
    logWithFallback('debug', 'Creating notification');

    // Format the current time for the notification title in BDT (Asia/Dhaka)
    const createdAt = DateTime.now()
      .setZone('Asia/Dhaka')
      .toFormat('MMM dd, yyyy, hh:mm:ss a');

    const notificationQuery = `
      INSERT INTO user_notification_details (
        notification_id, title, status, created_at, soc_portal_id
      )
      VALUES (
        'AN' || (SELECT LPAD((COALESCE(MAX(serial), 0) + 1)::text, 4, '0') FROM user_notification_details),
        $1, 'Unread', NOW(), $2
      )
    `;
    await query(notificationQuery, [
      `Password Changed Successfully At - ${createdAt}`,
      userId // userId is confirmed to be socPortalId
    ]);
    
    // Commit transaction
    logWithFallback('debug', 'Committing transaction');
    await query('COMMIT');

    // 7. Send email notification
    logWithFallback('info', 'Sending email notification');
    try {
      await sendEmail({
        to: userEmail,
        subject: 'SOC Portal Password Updated Successfully',
        html: formatEmailMessage({ id: userId, email: userEmail })
      });
      logWithFallback('info', 'Email sent successfully', { to: userEmail });
    } catch (emailError) {
      logWithFallback('error', 'Failed to send email', {
        error: emailError.message,
        to: userEmail
      });
      // Don't throw error as email is secondary to password change
    }

    // 8. Send Telegram alert
    logWithFallback('info', 'Sending Telegram alert');
    try {
      const alertMessage = formatAlertMessage(
        'SUCCESS', 
        ipAddress, 
        userAgent,
        { id: userId, email: userEmail, eid }
      );
      await sendTelegramAlert(alertMessage);
      logWithFallback('info', 'Telegram alert sent successfully');
    } catch (telegramError) {
      logWithFallback('error', 'Failed to send Telegram alert', {
        error: telegramError.message
      });
    }

    logWithFallback('info', 'Password updated successfully', { 
      soc_portal_id, 
      eid, 
      sid, 
      userId,
      emailSent: true,
      telegramSent: true
    });

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
        { id: userId, email: userEmail, eid }
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
      userId
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}