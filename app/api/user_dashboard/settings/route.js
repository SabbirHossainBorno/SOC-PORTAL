//app/api/user_dashboard/settings/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import logger from '../../../../lib/logger';
import sendTelegramAlert from '../../../../lib/telegramAlert';
import { DateTime } from 'luxon';
import path from 'path';
import fs from 'fs/promises';

// Get current time in Asia/Dhaka
const getCurrentDateTime = () => {
  const now = DateTime.now().setZone('Asia/Dhaka');
  return now.toFormat("yyyy-LL-dd hh:mm:ss a") + ' (' + now.offsetNameShort + ')';
};

// Format Telegram alert message for profile photo update
const formatAlertMessage = (action, ipAddress, userAgent, userData) => {
  const time = getCurrentDateTime();
  const statusEmoji = action.includes('SUCCESS') ? '✅' : '❌';
  const statusText = action.includes('SUCCESS') ? 'Successful' : 'Failed';
  
  return `🖼️ *SOC Portal Profile Photo ${statusText}*
  
👤 *User ID:* ${userData.id}
📧 *Email:* ${userData.email}
🌐 *IP Address:* ${ipAddress}
🔖 *EID:* ${userData.eid}
🕒 *Time:* ${time}
📱 *Device:* ${userAgent.split(' ')[0]}

${statusEmoji} *Status:* ${statusText}`;
};

// Save profile photo
const saveProfilePhoto = async (file, userId) => {
  try {
    // Validate file
    if (!file || typeof file !== 'object') {
      throw new Error('Invalid file object');
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only JPG, PNG, and WebP images are allowed');
    }
    
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit');
    }
    
    // Create filename and path
    const ext = path.extname(file.name);
    const filename = `${userId}_DP${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'storage', 'user_dp');
    const filePath = path.join(uploadDir, filename);
    
    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    
    // Convert to buffer and save
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    
    return `/storage/user_dp/${filename}`;
  } catch (error) {
    throw new Error(`Profile photo save failed: ${error.message}`);
  }
};

// Generate next notification ID based on serial column
const generateNotificationId = async (prefix, table) => {
  try {
    const result = await query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(4, '0');
    return `${prefix}${nextId}SOCP`;
  } catch (error) {
    throw new Error(`Error generating notification ID: ${error.message}`);
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
  // Get cookies from request headers
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(cookie => {
      const [key, ...rest] = cookie.trim().split('=');
      return [key, rest.join('=')];
    })
  );
  
  const sessionId = cookies.sessionId || 'Unknown';
  const eid = cookies.eid || 'Unknown';
  const userId = cookies.socPortalId || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
  
  logWithFallback('info', 'Profile photo update initiated', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'UpdateProfilePhoto',
      details: `User ${userId} updating profile photo`,
      userId
    }
  });

  try {
    const formData = await request.formData();
    const photoFile = formData.get('profilePhoto');
    
    // Validate file exists
    if (!photoFile || photoFile.size === 0) {
      logWithFallback('warn', 'No file provided', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: 'No profile photo file provided'
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Please select a profile photo' },
        { status: 400 }
      );
    }
    
    // Get current user data to check existing photo and get email
    const userResult = await query(
      'SELECT profile_photo_url, email, first_name, last_name FROM user_info WHERE soc_portal_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      logWithFallback('warn', 'User not found', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: `User ${userId} not found in database`
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    const currentPhotoUrl = userResult.rows[0].profile_photo_url;
    const userEmail = userResult.rows[0].email;
    const firstName = userResult.rows[0].first_name;
    const lastName = userResult.rows[0].last_name;
    
    // Start transaction
    await query('BEGIN');
    
    // Save new profile photo (overwrites existing file with same name)
    const newPhotoUrl = await saveProfilePhoto(photoFile, userId);
    
    // Update database with new photo URL
    const updateQuery = `
      UPDATE user_info 
      SET profile_photo_url = $1 
      WHERE soc_portal_id = $2
      RETURNING profile_photo_url
    `;
    
    const updateResult = await query(updateQuery, [newPhotoUrl, userId]);
    
    if (updateResult.rows.length === 0) {
      throw new Error('Failed to update profile photo in database');
    }
    
    // Log user activity
    const activityLogQuery = `
      INSERT INTO user_activity_log (
        soc_portal_id, action, description, ip_address, device_info, eid, sid
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await query(activityLogQuery, [
      userId,
      'PROFILE_UPDATE',
      'Updated profile photo',
      ipAddress,
      userAgent,
      eid,
      sessionId
    ]);
    
    // Generate notification ID and insert into user_notification_details
    const notificationId = await generateNotificationId('UN', 'user_notification_details');

    // Format the current time for the notification title in BDT (Asia/Dhaka)
    const createdAt = DateTime.now()
      .setZone('Asia/Dhaka')
      .toFormat('MMM dd, yyyy, hh:mm:ss a');

    const notificationQuery = `
      INSERT INTO user_notification_details (
        notification_id, title, status, created_at, soc_portal_id
      )
      VALUES ($1, $2, $3, NOW(), $4)
    `;

    await query(notificationQuery, [
      notificationId,
      `Profile Photo Changed Successfully At - ${createdAt}`,
      'Unread',
      userId // userId is confirmed to be socPortalId
    ]);
    
    // Commit transaction
    await query('COMMIT');
    
    // Send Telegram alert
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
    
    logWithFallback('info', 'Profile photo updated successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdateProfilePhoto',
        details: `User ${userId} profile photo updated`,
        newPhotoUrl,
        userId,
        telegramSent: true
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Profile photo updated successfully',
      photoUrl: newPhotoUrl
    });
    
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK').catch(err => 
      logWithFallback('error', 'Rollback failed', {
        meta: {
          taskName: 'Rollback',
          details: `Error: ${err.message}`
        }
      })
    );
    
    // Send failure alert
    try {
      logWithFallback('warn', 'Sending failure alert');
      const alertMessage = formatAlertMessage(
        'FAILURE', 
        ipAddress, 
        userAgent,
        { id: userId, email: 'N/A', eid }
      );
      await sendTelegramAlert(alertMessage);
    } catch (alertError) {
      logWithFallback('error', 'Failed to send alert', {
        error: alertError.message,
        stack: alertError.stack
      });
    }
    
    logWithFallback('error', 'Profile photo update failed', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SystemError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId
      }
    });
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update profile photo',
        error: error.message
      },
      { status: 500 }
    );
  }
}