// app/api/auth/forgot-password/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import logger from '../../../lib/logger';
import sendTelegramAlert from '../../../lib/telegramAlert';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { getClientIP } from '../../../lib/utils/ipUtils';

// In-memory store for reset codes (in production, use Redis)
const resetCodes = new Map();

// Generate random 6-digit code
const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Update your sendEmail function for better compatibility
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
    
    await transporter.verify();
    
    const info = await transporter.sendMail({
      from: `"SOC Portal Security" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      // Add text version for email clients that prefer plain text
      text: subject.replace(/[🔐✅🎉📧🌐💻🕐👤]/g, ''), // Remove emojis for text version
    });
    
    console.log('📧 Email sent successfully to:', to);
    console.log('📧 Message ID:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', {
      to: to,
      error: error.message,
      code: error.code,
      command: error.command
    });
    
    return { 
      success: false, 
      error: error.message,
      code: error.code
    };
  }
};

// Modern Telegram alert format with HTML
const formatAlertMessage = (action, email, ipAddress, userAgent, additionalInfo = {}) => {
  const time = new Date().toLocaleString('en-BD', { 
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  }) + ' (BST)';

  const status = additionalInfo.status || 'Completed';
  const userId = additionalInfo.userId || 'N/A';
  const userType = additionalInfo.userType || 'N/A';

  let title = '';
  
  // Only keep the completed case
  if (action.toLowerCase() === 'completed') {
    title = '🔐 [ SOC PORTAL | PASSWORD RESET COMPLETED ]';
  } else {
    // Fallback for other actions
    title = `🔐 [ SOC PORTAL | PASSWORD RESET ${action.toUpperCase()} ]`;
  }

  // Status emoji
  const statusEmoji = status.includes('Failed') || status.includes('Error') ? '❌' : '✅';

  const message = `${title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email          : ${email}
👤 SOC Portal ID  : ${userId}
👥 Role Type      : ${userType}
🌐 IP Address     : ${ipAddress}
🖥️ Device Info    : ${userAgent}
🕒 Time           : ${time}
${statusEmoji} Status         : ${status}
🔧 Action         : ${action.replace(/_/g, ' ').toUpperCase()}`;

  return `\`\`\`\n${message}\n\`\`\``;
};

// Check if email exists in database
const checkEmailExists = async (email) => {
  try {
    // Check admin table
    const adminResult = await query(
      `SELECT soc_portal_id, role_type, status FROM admin_info WHERE email = $1`,
      [email]
    );

    if (adminResult.rows.length > 0) {
      return {
        exists: true,
        userType: 'admin',
        userId: adminResult.rows[0].soc_portal_id,
        roleType: adminResult.rows[0].role_type,
        status: adminResult.rows[0].status
      };
    }

    // Check user table
    const userResult = await query(
      `SELECT soc_portal_id, role_type, status FROM user_info WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length > 0) {
      return {
        exists: true,
        userType: 'user',
        userId: userResult.rows[0].soc_portal_id,
        roleType: userResult.rows[0].role_type,
        status: userResult.rows[0].status
      };
    }

    return { exists: false };
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
};

export async function POST(request) {
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
  
  try {
    const { action, email, code, newPassword } = await request.json();

    // Detailed logging for every request
    logger.info(`Password reset ${action} initiated`, {
      meta: {
        taskName: 'PasswordReset',
        details: `Action: ${action}, Email: ${email}, IP: ${ipAddress}, UserAgent: ${userAgent}`,
        ipAddress: ipAddress,
        userAgent: userAgent,
        action: `${action}_initiated`
      }
    });

    // Step 1: Send reset code
    if (action === 'sendCode') {
      // Check if email exists
      const emailCheck = await checkEmailExists(email);
      
      if (!emailCheck.exists) {
        logger.warn('Password reset attempt for non-existent email', {
          meta: {
            taskName: 'PasswordReset',
            details: `Email not found in database: ${email}, IP: ${ipAddress}, UserAgent: ${userAgent}`,
            ipAddress: ipAddress,
            userAgent: userAgent,
            action: 'email_not_found'
          }
        });

        // Send Telegram alert
        const telegramMessage = formatAlertMessage(
          'attempt',
          email,
          ipAddress,
          userAgent,
          { status: 'FAILED - Email Not Found' }
        );
        await sendTelegramAlert(telegramMessage);

        return NextResponse.json(
          { success: false, message: '❌ No account found with this email address' },
          { status: 404 }
        );
      }

      // Check if account is active
      if (emailCheck.status !== 'Active') {
        const statusMessage = emailCheck.status === 'Resigned' ? 
          'Account is resigned' : 'Account is inactive';

        logger.warn(`Password reset attempt for ${emailCheck.status.toLowerCase()} account`, {
          meta: {
            taskName: 'PasswordReset',
            details: `${statusMessage} for email: ${email}, UserID: ${emailCheck.userId}, UserType: ${emailCheck.userType}, IP: ${ipAddress}`,
            userId: emailCheck.userId,
            userType: emailCheck.userType,
            status: emailCheck.status,
            ipAddress: ipAddress,
            action: 'account_inactive'
          }
        });

        // Send Telegram alert
        const telegramMessage = formatAlertMessage(
          'attempt',
          email,
          ipAddress,
          userAgent,
          { 
            status: `FAILED - ${statusMessage}`,
            userId: emailCheck.userId,
            userType: emailCheck.userType,
            deviceInfo: userAgent
          }
        );
        await sendTelegramAlert(telegramMessage);

        const userMessage = emailCheck.status === 'Resigned' ? 
          '🚫 You have resigned from Nagad. Account access revoked.' :
          '🚫 Your account is inactive. Please contact administrator.';

        return NextResponse.json(
          { success: false, message: userMessage },
          { status: 403 }
        );
      }

      // Generate and store reset code
      const resetCode = generateResetCode();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      resetCodes.set(email, {
        code: resetCode,
        expiresAt: expiresAt,
        userId: emailCheck.userId,
        userType: emailCheck.userType
      });

      // Send email with reset code
const verificationCodeEmailHTML = (email, ipAddress, userAgent, resetCode) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>🔐 SOC Portal - Password Reset Verification</title>
  <style>
    /* Reset styles for email compatibility */
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
      background-color: #f6f6f6;
    }
    
    .container {
      max-width: 500px; /* Reduced from 600px to 500px */
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e9e9e9;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px 15px; /* Reduced padding */
      text-align: center;
    }
    
    .content {
      padding: 25px 15px; /* Reduced padding */
      background: #fafafa;
    }
    
    .code {
      font-size: 28px; /* Slightly smaller font */
      font-weight: bold;
      text-align: center;
      color: #2c5aa0;
      background: #f0f4ff;
      padding: 18px; /* Reduced padding */
      border-radius: 8px;
      margin: 18px 0; /* Reduced margin */
      letter-spacing: 4px; /* Reduced letter spacing */
      font-family: 'Courier New', Courier, monospace;
      border: 2px dashed #c5d5ff;
    }
    
    .info-box {
      background: #e8f4fd;
      border-left: 4px solid #2196f3;
      padding: 12px; /* Reduced padding */
      margin: 12px 0; /* Reduced margin */
      border-radius: 4px;
      font-size: 14px; /* Slightly smaller font */
    }
    
    .warning-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 12px; /* Reduced padding */
      margin: 12px 0; /* Reduced margin */
      border-radius: 4px;
      font-size: 14px; /* Slightly smaller font */
    }
    
    .footer {
      text-align: center;
      padding: 15px; /* Reduced padding */
      background: #f1f5f9;
      color: #666666;
      font-size: 11px; /* Slightly smaller font */
    }
    
    /* Mobile responsiveness */
    @media only screen and (max-width: 520px) {
      .container {
        width: 100% !important;
        border-radius: 0;
      }
      .header {
        padding: 20px 12px;
      }
      .content {
        padding: 20px 12px;
      }
      .code {
        font-size: 24px;
        padding: 15px;
        letter-spacing: 3px;
      }
    }
    
    /* Outlook specific fixes */
    .outlook-fix {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
  </style>
</head>
<body style="margin: 0; padding: 15px; background-color: #f6f6f6; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f6f6f6;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="500" class="container outlook-fix">
          <!-- Header -->
          <tr>
            <td class="header">
              <h1 style="margin: 0; font-size: 22px; font-weight: bold;">🔐 Password Reset Request</h1>
              <p style="margin: 8px 0 0; opacity: 0.9; font-size: 13px;">SOC Portal Security System</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="content">
              <p style="margin: 0 0 14px; color: #333333; font-size: 15px;">Dear User,</p>
              
              <p style="margin: 0 0 14px; color: #555555; font-size: 14px;">We received a password reset request for your SOC Portal account.</p>
              
              <div class="info-box">
                <strong style="color: #1565c0;">Request Details:</strong><br>
                📧 <strong>Email:</strong> ${email}<br>
                🌐 <strong>IP Address:</strong> ${ipAddress}<br>
                💻 <strong>Device:</strong> ${userAgent}<br>
                🕐 <strong>Time:</strong> ${new Date().toLocaleString()}
              </div>
              
              <p style="margin: 18px 0 14px; color: #555555; font-size: 14px;">Please use the following verification code to reset your password:</p>
              
              <div class="code">
                ${resetCode}
              </div>
              
              <div class="warning-box">
                <strong style="color: #856404;">🔒 Security Notice:</strong><br><br>
                • This code will expire in <strong>10 minutes</strong><br>
                • Do not share this code with anyone<br>
                • If you didn't request this reset, please ignore this email and contact administrator immediately
              </div>
              
              <p style="margin: 18px 0 0; color: #555555; font-size: 14px;">
                Best Regards,<br>
                <strong>SOC Portal Security Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="footer">
              <p style="margin: 0 0 6px;">This is an automated security message. Please do not reply to this email.</p>
              <p style="margin: 0;">📍 Nagad Digital Financial Service | Service Operations Center</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const emailHTML = verificationCodeEmailHTML(email, ipAddress, userAgent, resetCode);

const emailResult = await sendEmail({
  to: email,
  subject: '🔐 SOC Portal - Password Reset Verification Code',
  html: emailHTML
});

      if (!emailResult.success) {
        throw new Error(`Failed to send email: ${emailResult.error}`);
      }

      logger.info('Password reset code sent successfully', {
        meta: {
          taskName: 'PasswordReset',
          details: `Reset code generated and sent to: ${email}, UserID: ${emailCheck.userId}, UserType: ${emailCheck.userType}, IP: ${ipAddress}, Code: ${resetCode}`,
          userId: emailCheck.userId,
          userType: emailCheck.userType,
          ipAddress: ipAddress,
          action: 'code_sent'
        }
      });

      // Send Telegram alert for code sent
      const telegramMessage = formatAlertMessage(
        'code_sent',
        email,
        ipAddress,
        userAgent,
        { 
          status: 'VERIFICATION CODE SENT',
          userId: emailCheck.userId,
          userType: emailCheck.userType,
          deviceInfo: userAgent
        }
      );
      await sendTelegramAlert(telegramMessage);

      return NextResponse.json({
        success: true,
        message: '📧 Verification code sent to your email address'
      });
    }

    // Step 2: Verify reset code
    if (action === 'verifyCode') {
      const storedData = resetCodes.get(email);
      
      if (!storedData) {
        logger.warn('Invalid or expired verification code attempt', {
          meta: {
            taskName: 'PasswordReset',
            details: `No reset session found for email: ${email}, IP: ${ipAddress}`,
            ipAddress: ipAddress,
            action: 'invalid_session'
          }
        });

        return NextResponse.json(
          { success: false, message: '❌ Invalid or expired verification code' },
          { status: 400 }
        );
      }

      if (Date.now() > storedData.expiresAt) {
        resetCodes.delete(email);
        logger.warn('Expired verification code attempt', {
          meta: {
            taskName: 'PasswordReset',
            details: `Expired code for email: ${email}, IP: ${ipAddress}`,
            userId: storedData.userId,
            ipAddress: ipAddress,
            action: 'expired_code'
          }
        });

        return NextResponse.json(
          { success: false, message: '⏰ Verification code has expired' },
          { status: 400 }
        );
      }

      if (storedData.code !== code) {
        logger.warn('Invalid verification code entered', {
          meta: {
            taskName: 'PasswordReset',
            details: `Invalid code entered for email: ${email}, Expected: ${storedData.code}, Got: ${code}, IP: ${ipAddress}`,
            userId: storedData.userId,
            userType: storedData.userType,
            ipAddress: ipAddress,
            action: 'invalid_code'
          }
        });

        return NextResponse.json(
          { success: false, message: '❌ Invalid verification code' },
          { status: 400 }
        );
      }

      // Code is valid
      logger.info('Password reset code verified successfully', {
        meta: {
          taskName: 'PasswordReset',
          details: `Code verified for email: ${email}, UserID: ${storedData.userId}, IP: ${ipAddress}`,
          userId: storedData.userId,
          userType: storedData.userType,
          ipAddress: ipAddress,
          action: 'code_verified'
        }
      });

      return NextResponse.json({
        success: true,
        message: '✅ Code verified successfully'
      });
    }

    // Step 3: Reset password
    if (action === 'resetPassword') {
      const storedData = resetCodes.get(email);
      
      if (!storedData) {
        logger.warn('Password reset attempt with expired session', {
          meta: {
            taskName: 'PasswordReset',
            details: `No active session for email: ${email}, IP: ${ipAddress}`,
            ipAddress: ipAddress,
            action: 'session_expired'
          }
        });

        return NextResponse.json(
          { success: false, message: '⏰ Session expired. Please start over.' },
          { status: 400 }
        );
      }

      if (Date.now() > storedData.expiresAt) {
        resetCodes.delete(email);
        logger.warn('Password reset attempt with expired session', {
          meta: {
            taskName: 'PasswordReset',
            details: `Expired session for email: ${email}, IP: ${ipAddress}`,
            userId: storedData.userId,
            ipAddress: ipAddress,
            action: 'session_expired'
          }
        });

        return NextResponse.json(
          { success: false, message: '⏰ Session expired. Please start over.' },
          { status: 400 }
        );
      }

      if (storedData.code !== code) {
        logger.warn('Password reset with invalid code', {
          meta: {
            taskName: 'PasswordReset',
            details: `Invalid code during password reset for email: ${email}, IP: ${ipAddress}`,
            userId: storedData.userId,
            ipAddress: ipAddress,
            action: 'invalid_code_reset'
          }
        });

        return NextResponse.json(
          { success: false, message: '❌ Invalid verification code' },
          { status: 400 }
        );
      }

      // Validate new password
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        logger.warn('Password strength validation failed during reset', {
          meta: {
            taskName: 'PasswordReset',
            details: `Weak password attempt for email: ${email}, IP: ${ipAddress}`,
            userId: storedData.userId,
            ipAddress: ipAddress,
            action: 'weak_password'
          }
        });

        return NextResponse.json(
          { 
            success: false, 
            message: '🔐 Password must be at least 8 characters with uppercase, lowercase, and number' 
          },
          { status: 400 }
        );
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password in database
      const table = storedData.userType === 'admin' ? 'admin_info' : 'user_info';
      const updateQuery = `
        UPDATE ${table} 
        SET password = $1, updated_at = NOW()
        WHERE soc_portal_id = $2
      `;

      const updateResult = await query(updateQuery, [hashedPassword, storedData.userId]);

      if (updateResult.rowCount === 0) {
        throw new Error('Failed to update password in database');
      }

      // Log activity
      const activityTable = storedData.userType === 'admin' ? 'admin_activity_log' : 'user_activity_log';
      const activityQuery = `
        INSERT INTO ${activityTable} 
          (soc_portal_id, action, description, ip_address, device_info, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      
      await query(activityQuery, [
        storedData.userId,
        'PASSWORD_RESET',
        `Password reset successfully via forgot password from IP: ${ipAddress}`,
        ipAddress,
        userAgent
      ]);

      // Create notification
      const notificationTable = storedData.userType === 'admin' ? 'admin_notification_details' : 'user_notification_details';
      const notificationId = storedData.userType === 'admin' ? 
        `AN${Date.now()}` : `UN${Date.now()}`;
      
      const notificationQuery = `
        INSERT INTO ${notificationTable} 
          (notification_id, title, status, ${storedData.userType === 'user' ? 'soc_portal_id,' : ''} created_at)
        VALUES ($1, $2, $3, ${storedData.userType === 'user' ? '$4,' : ''} NOW())
      `;

      const notificationParams = storedData.userType === 'user' ? 
        [notificationId, 'Password Reset Successful', 'Unread', storedData.userId] :
        [notificationId, 'Password Reset Successful', 'Unread'];

      await query(notificationQuery, notificationParams);

      // Send confirmation email
const passwordResetConfirmationEmailHTML = (email, ipAddress, userAgent, storedData) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>✅ SOC Portal - Password Reset Successful</title>
  <style>
    /* Reset styles for email compatibility */
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
      background-color: #f6f6f6;
    }
    
    .container {
      max-width: 500px; /* Reduced from 600px to 500px */
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e9e9e9;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      padding: 25px 15px; /* Reduced padding */
      text-align: center;
    }
    
    .content {
      padding: 25px 15px; /* Reduced padding */
      background: #fafafa;
    }
    
    .success-box {
      background: #d4edda;
      border-left: 4px solid #28a745;
      padding: 18px; /* Reduced padding */
      margin: 18px 0; /* Reduced margin */
      border-radius: 4px;
    }
    
    .info-box {
      background: #e8f4fd;
      border-left: 4px solid #2196f3;
      padding: 12px; /* Reduced padding */
      margin: 12px 0; /* Reduced margin */
      border-radius: 4px;
      font-size: 14px; /* Slightly smaller font */
    }
    
    .footer {
      text-align: center;
      padding: 15px; /* Reduced padding */
      background: #f1f5f9;
      color: #666666;
      font-size: 11px; /* Slightly smaller font */
    }
    
    /* Mobile responsiveness */
    @media only screen and (max-width: 520px) {
      .container {
        width: 100% !important;
        border-radius: 0;
      }
      .header {
        padding: 20px 12px;
      }
      .content {
        padding: 20px 12px;
      }
      .success-box {
        padding: 15px;
      }
    }
    
    /* Outlook specific fixes */
    .outlook-fix {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
  </style>
</head>
<body style="margin: 0; padding: 15px; background-color: #f6f6f6; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f6f6f6;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="500" class="container outlook-fix">
          <!-- Header -->
          <tr>
            <td class="header">
              <h1 style="margin: 0; font-size: 22px; font-weight: bold;">✅ Password Reset Successful</h1>
              <p style="margin: 8px 0 0; opacity: 0.9; font-size: 13px;">SOC Portal Security System</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="content">
              <div class="success-box">
                <strong style="font-size: 16px; color: #155724;">🎉 Your password has been reset successfully!</strong>
              </div>
              
              <p style="margin: 0 0 14px; color: #333333; font-size: 15px;">Dear User,</p>
              
              <p style="margin: 0 0 14px; color: #555555; font-size: 14px;">Your SOC Portal password was successfully reset on <strong>${new Date().toLocaleString()}</strong>.</p>
              
              <div class="info-box">
                <strong style="color: #1565c0;">Security Details:</strong><br><br>
                👤 <strong>User ID:</strong> ${storedData.userId}<br>
                📧 <strong>Email:</strong> ${email}<br>
                🌐 <strong>IP Address:</strong> ${ipAddress}<br>
                💻 <strong>Device:</strong> ${userAgent}<br>
                🕐 <strong>Reset Time:</strong> ${new Date().toLocaleString()}
              </div>
              
              <p style="margin: 18px 0 14px; color: #555555; font-size: 14px;">
                <strong>Important:</strong> If you did not perform this action, please contact the SOC Portal administrator immediately.
              </p>
              
              <p style="margin: 18px 0 0; color: #555555; font-size: 14px;">
                Best Regards,<br>
                <strong>SOC Portal Security Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="footer">
              <p style="margin: 0 0 6px;">This is an automated security notification. Please do not reply to this email.</p>
              <p style="margin: 0;">📍 Nagad Digital Financial Service | Service Operations Center</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

      const emailHTML = passwordResetConfirmationEmailHTML(email, ipAddress, userAgent, storedData);

await sendEmail({
  to: email,
  subject: '✅ SOC Portal - Password Reset Confirmation',
  html: emailHTML
});

      // Clean up reset code
      resetCodes.delete(email);

      logger.info('Password reset completed successfully', {
        meta: {
          taskName: 'PasswordReset',
          details: `Password reset completed for email: ${email}, UserID: ${storedData.userId}, UserType: ${storedData.userType}, IP: ${ipAddress}, Device: ${userAgent}`,
          userId: storedData.userId,
          userType: storedData.userType,
          ipAddress: ipAddress,
          userAgent: userAgent,
          action: 'password_reset_completed'
        }
      });

      // Send Telegram alert for successful reset
      const telegramMessage = formatAlertMessage(
        'completed', // Changed from 'completed' to match the case
        email,
        ipAddress,
        userAgent,
        { 
            status: 'SUCCESSFUL',
            userId: storedData.userId,
            userType: storedData.userType,
            deviceInfo: userAgent
        }
    );
        await sendTelegramAlert(telegramMessage);

      return NextResponse.json({
        success: true,
        message: '🎉 Password reset successfully! You can now login with your new password.'
      });
    }

    return NextResponse.json(
      { success: false, message: '❌ Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    logger.error('Password reset process failed', {
      meta: {
        taskName: 'PasswordReset',
        details: `Error: ${error.message}, Stack: ${error.stack}, IP: ${ipAddress}, UserAgent: ${userAgent}`,
        ipAddress: ipAddress,
        userAgent: userAgent,
        action: 'process_failed'
      }
    });

    // Send Telegram alert for error
    const telegramMessage = formatAlertMessage(
      'error',
      'N/A',
      ipAddress,
      userAgent,
      { status: `FAILED: ${error.message.substring(0, 100)}` }
    );
    await sendTelegramAlert(telegramMessage);

    return NextResponse.json(
      { 
        success: false, 
        message: '🚨 Internal server error during password reset process' 
      },
      { status: 500 }
    );
  }
}