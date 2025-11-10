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
const formatAlertMessage = (action, ipAddress, userAgent, userData, updateType = 'Profile Photo') => {
  const time = getCurrentDateTime();
  const statusEmoji = action.includes('SUCCESS') ? '✅' : '❌';
  const statusText = action.includes('SUCCESS') ? 'Successful' : 'Failed';
  
  return `🖼️ *SOC Portal ${updateType} Update ${statusText}*
  
👤 *User ID:* ${userData.id}
📧 *Email:* ${userData.email}
🌐 *IP Address:* ${ipAddress}
🔖 *EID:* ${userData.eid}
🕒 *Time:* ${time}
📱 *Device:* ${userAgent.split(' ')[0]}

${statusEmoji} *Status:* ${statusText}`;
};

// Save profile photo - UPDATED FOR NEW STORAGE LOCATION
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
    
    // Create filename and path - UPDATED PATH
    const ext = path.extname(file.name);
    const filename = `${userId}_DP${ext}`;
    const uploadDir = path.join(process.cwd(), 'storage', 'user_dp'); // CHANGED
    const filePath = path.join(uploadDir, filename);
    
    console.log('=== USER DASHBOARD FILE UPLOAD DEBUG ===');
    console.log('Upload paths:', {
      uploadDir: uploadDir,
      filename: filename,
      filePath: filePath
    });

    // Ensure directory exists with proper permissions
    try {
      await fs.access(uploadDir);
      console.log('Directory already exists');
    } catch (error) {
      console.log('Creating directory:', uploadDir);
      await fs.mkdir(uploadDir, { recursive: true, mode: 0o755 });
    }
    
    // Convert to buffer and save
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    await fs.chmod(filePath, 0o644);

    // Force sync
    const fd = await fs.open(filePath, 'r+');
    await new Promise((resolve, reject) => {
      require('fs').fsync(fd.fd, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    await fd.close();
    
    // Change ownership to nginx user
    try {
      const { execSync } = require('child_process');
      const nginxUid = execSync('id -u nginx').toString().trim();
      const nginxGid = execSync('id -g nginx').toString().trim();
      
      await fs.chown(filePath, parseInt(nginxUid), parseInt(nginxGid));
      console.log(`File ownership changed to nginx (${nginxUid}:${nginxGid})`);
    } catch (chownError) {
      console.warn('Could not change file ownership:', chownError.message);
    }
    
    // Force file system sync
    try {
      const { execSync } = require('child_process');
      execSync('sync', { stdio: 'inherit' });
      console.log('File system synced');
    } catch (syncError) {
      console.warn('File system sync failed:', syncError.message);
    }
    
    console.log('File saved successfully:', filePath);
    
    // Return NEW URL format
    const photoUrl = `/api/storage/user_dp/${filename}?t=${Date.now()}`; // CHANGED
    console.log('Returning photo URL:', photoUrl);
    
    return photoUrl;
    
  } catch (error) {
    console.error('File upload error:', error);
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

// Validate phone number format
const validatePhoneNumber = (phone) => {
  const phoneRegex = /^(017|013|019|014|018|016|015)\d{8}$/;
  return phoneRegex.test(phone);
};

// Check if emergency contact number already exists in the system
const checkEmergencyContactExists = async (emergencyContact, currentUserId) => {
  try {
    // Check if the number exists as primary phone for any user
    const phoneCheck = await query(
      'SELECT soc_portal_id, first_name, last_name FROM user_info WHERE phone = $1 AND soc_portal_id != $2',
      [emergencyContact, currentUserId]
    );
    
    // Check if the number exists as emergency contact for any user
    const emergencyCheck = await query(
      'SELECT soc_portal_id, first_name, last_name FROM user_info WHERE emergency_contact = $1 AND soc_portal_id != $2',
      [emergencyContact, currentUserId]
    );
    
    const conflicts = [];
    
    if (phoneCheck.rows.length > 0) {
      phoneCheck.rows.forEach(user => {
        conflicts.push(`Primary phone of ${user.first_name} ${user.last_name} (${user.soc_portal_id})`);
      });
    }
    
    if (emergencyCheck.rows.length > 0) {
      emergencyCheck.rows.forEach(user => {
        conflicts.push(`Emergency contact of ${user.first_name} ${user.last_name} (${user.soc_portal_id})`);
      });
    }
    
    return {
      exists: conflicts.length > 0,
      conflicts: conflicts
    };
  } catch (error) {
    throw new Error(`Error checking emergency contact: ${error.message}`);
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
  
  logWithFallback('info', 'User settings update initiated', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'UpdateUserSettings',
      details: `User ${userId} updating settings`,
      userId
    }
  });

  let client;
  try {
    const formData = await request.formData();
    const photoFile = formData.get('profilePhoto');
    const emergencyContact = formData.get('emergencyContact');
    
    // Validate that at least one field is being updated
    if ((!photoFile || photoFile.size === 0) && !emergencyContact) {
      logWithFallback('warn', 'No update data provided', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: 'No profile photo or emergency contact provided'
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Please provide data to update' },
        { status: 400 }
      );
    }
    
    // Get current user data
    const userResult = await query(
      'SELECT profile_photo_url, email, first_name, last_name, phone, emergency_contact FROM user_info WHERE soc_portal_id = $1',
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
    
    const currentUser = userResult.rows[0];
    const userEmail = currentUser.email;
    const firstName = currentUser.first_name;
    const lastName = currentUser.last_name;
    
    let updateType = '';
    let updateDescription = '';
    let newPhotoUrl = currentUser.profile_photo_url;
    let updatedEmergencyContact = emergencyContact || currentUser.emergency_contact;
    
    // Start transaction
    await query('BEGIN');
    
    // Handle profile photo update
    if (photoFile && photoFile.size > 0) {
      updateType = 'Profile Photo';
      updateDescription = 'Updated profile photo';
      
      // Save new profile photo (overwrites existing file with same name)
      newPhotoUrl = await saveProfilePhoto(photoFile, userId);
      
      logWithFallback('info', 'Profile photo processed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'FileUpload',
          details: `New photo URL: ${newPhotoUrl}`,
          userId
        }
      });
    }
    
    // Handle emergency contact update
    if (emergencyContact !== null) {
      if (emergencyContact === '') {
        // Allow clearing emergency contact
        updatedEmergencyContact = null;
        updateType = updateType ? `${updateType} and Emergency Contact` : 'Emergency Contact';
        updateDescription = updateDescription ? `${updateDescription} and cleared emergency contact` : 'Cleared emergency contact';
      } else {
        // Validate emergency contact format
        if (!validatePhoneNumber(emergencyContact)) {
          await query('ROLLBACK');
          
          logWithFallback('warn', 'Invalid emergency contact format', {
            meta: {
              eid,
              sid: sessionId,
              taskName: 'Validation',
              details: `Invalid emergency contact: ${emergencyContact}`,
              userId
            }
          });
          
          return NextResponse.json(
            { 
              success: false, 
              message: 'Emergency contact must be 11 digits starting with 017,013,019,014,018,016 or 015' 
            },
            { status: 400 }
          );
        }
        
        // Check if emergency contact is same as user's own phone
        if (emergencyContact === currentUser.phone) {
          await query('ROLLBACK');
          
          logWithFallback('warn', 'Emergency contact same as primary phone', {
            meta: {
              eid,
              sid: sessionId,
              taskName: 'Validation',
              details: 'Emergency contact cannot be same as primary phone',
              userId
            }
          });
          
          return NextResponse.json(
            { 
              success: false, 
              message: 'Emergency contact cannot be the same as your primary phone number' 
            },
            { status: 400 }
          );
        }
        
        // Check if emergency contact already exists in system
        const contactCheck = await checkEmergencyContactExists(emergencyContact, userId);
        if (contactCheck.exists) {
          await query('ROLLBACK');
          
          logWithFallback('warn', 'Emergency contact already exists', {
            meta: {
              eid,
              sid: sessionId,
              taskName: 'Validation',
              details: `Emergency contact conflict: ${contactCheck.conflicts.join(', ')}`,
              userId
            }
          });
          
          return NextResponse.json(
            { 
              success: false, 
              message: `This number is already registered as: ${contactCheck.conflicts.join(', ')}. Please use a different number.` 
            },
            { status: 409 }
          );
        }
        
        updatedEmergencyContact = emergencyContact;
        updateType = updateType ? `${updateType} and Emergency Contact` : 'Emergency Contact';
        updateDescription = updateDescription ? `${updateDescription} and updated emergency contact to ${emergencyContact}` : `Updated emergency contact to ${emergencyContact}`;
      }
    }
    
    // Update database with new data
    const updateQuery = `
      UPDATE user_info 
      SET profile_photo_url = $1, emergency_contact = $2, updated_at = NOW()
      WHERE soc_portal_id = $3
      RETURNING profile_photo_url, emergency_contact
    `;
    
    const updateResult = await query(updateQuery, [newPhotoUrl, updatedEmergencyContact, userId]);
    
    if (updateResult.rows.length === 0) {
      throw new Error('Failed to update user settings in database');
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
      'SETTINGS_UPDATE',
      updateDescription,
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

    const notificationTitle = updateType === 'Profile Photo' 
      ? `Profile Photo Changed Successfully At - ${createdAt}`
      : `Settings Updated Successfully At - ${createdAt}`;

    const notificationQuery = `
      INSERT INTO user_notification_details (
        notification_id, title, status, created_at, soc_portal_id
      )
      VALUES ($1, $2, $3, NOW(), $4)
    `;

    await query(notificationQuery, [
      notificationId,
      notificationTitle,
      'Unread',
      userId
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
        { id: userId, email: userEmail, eid },
        updateType
      );
      await sendTelegramAlert(alertMessage);
      logWithFallback('info', 'Telegram alert sent successfully');
    } catch (telegramError) {
      logWithFallback('error', 'Failed to send Telegram alert', {
        error: telegramError.message
      });
    }
    
    logWithFallback('info', 'User settings updated successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdateUserSettings',
        details: `User ${userId} updated: ${updateDescription}`,
        newPhotoUrl: photoFile ? newPhotoUrl : 'unchanged',
        emergencyContact: emergencyContact !== null ? updatedEmergencyContact : 'unchanged',
        userId,
        telegramSent: true
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      updatedFields: {
        profilePhoto: photoFile ? newPhotoUrl : undefined,
        emergencyContact: emergencyContact !== null ? updatedEmergencyContact : undefined
      }
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
        { id: userId, email: 'N/A', eid },
        'Settings'
      );
      await sendTelegramAlert(alertMessage);
    } catch (alertError) {
      logWithFallback('error', 'Failed to send alert', {
        error: alertError.message,
        stack: alertError.stack
      });
    }
    
    logWithFallback('error', 'User settings update failed', {
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
        message: 'Failed to update settings',
        error: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve current user settings
export async function GET(request) {
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

  try {
    const userResult = await query(
      'SELECT profile_photo_url, emergency_contact, phone FROM user_info WHERE soc_portal_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    const userData = userResult.rows[0];
    
    // Transform profile photo URL to use new API route if needed
    let profilePhotoUrl = userData.profile_photo_url;
    if (profilePhotoUrl && profilePhotoUrl.startsWith('/storage/user_dp/')) {
      profilePhotoUrl = profilePhotoUrl.replace('/storage/user_dp/', '/api/storage/user_dp/');
    }
    
    return NextResponse.json({
      success: true,
      settings: {
        profilePhotoUrl: profilePhotoUrl,
        emergencyContact: userData.emergency_contact,
        phone: userData.phone
      }
    });
    
  } catch (error) {
    logWithFallback('error', 'Failed to fetch user settings', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GetUserSettings',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId
      }
    });
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch settings',
        error: error.message
      },
      { status: 500 }
    );
  }
}