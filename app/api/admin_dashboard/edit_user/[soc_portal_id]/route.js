//app/api/admin_dashboard/edit_user/[soc_portal_id]/route.js
import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';
import sendTelegramAlert from '../../../../../lib/telegramAlert';
import { DateTime } from 'luxon';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs/promises';

// Get current time in Asia/Dhaka
const getCurrentDateTime = () => {
  const now = DateTime.now().setZone('Asia/Dhaka');
  return now.toFormat("yyyy-LL-dd hh:mm:ss a") + ' (' + now.offsetNameShort + ')';
};

// Format Telegram alert message for user update
const formatUpdateAlert = (action, email, ipAddress, userAgent, additionalInfo = {}) => {
  const time = getCurrentDateTime();
  const adminId = additionalInfo.adminId || 'N/A';
  const userId = additionalInfo.userId || 'N/A';
  const role = additionalInfo.role || 'N/A';
  const status = additionalInfo.status || 'Completed';
  const eid = additionalInfo.eid || 'N/A';
  const changedFields = additionalInfo.changedFields || [];

  const title = `👤 [ SOC PORTAL | USER ${action.toUpperCase()} ]`;
  const statusEmoji = status.includes('Failed') ? '❌' : '✅';

  const changedFieldsText = changedFields.length > 0 
    ? `🔄 Changed Fields: ${changedFields.join(', ')}`
    : '';

  const message = `${title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 User Email     : ${email}
👤 User ID        : ${userId}
👥 Role           : ${role}
👑 Admin ID       : ${adminId}
${changedFieldsText}
🌐 IP Address     : ${ipAddress}
🖥️ Device Info    : ${userAgent}
🔖 EID            : ${eid}
🕒 Time           : ${time}
${statusEmoji} Status         : ${status}`;

  return message; // Removed code formatting backticks
};

// Generate notification IDs
const generateNotificationId = async (prefix, table, client) => {
  try {
    const result = await client.query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(4, '0');
    return `${prefix}${nextId}SOCP`;
  } catch (error) {
    throw new Error(`Error generating notification ID: ${error.message}`);
  }
};

// Save profile photo - UPDATED FOR NEW STORAGE LOCATION
const saveProfilePhoto = async (file, userId) => {
  try {
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
    
    console.log('=== EDIT USER FILE UPLOAD DEBUG ===');
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

const getChangedFields = (oldData, newData) => {
  const changedFields = [];
  
  const fieldMappings = {
    'first_name': 'First Name',
    'last_name': 'Last Name',
    'short_name': 'Short Name',
    'ngd_id': 'NGD ID',
    'date_of_birth': 'Date of Birth',
    'joining_date': 'Joining Date',
    'resign_date': 'Resign Date',
    'email': 'Email',
    'phone': 'Phone',
    'emergency_contact': 'Emergency Contact',
    'designation': 'Designation',
    'bloodgroup': 'Blood Group',
    'gender': 'Gender',
    'role_type': 'Role Type',
    'status': 'Status',
    'profile_photo_url': 'Profile Photo'
  };
  
  // SIMPLIFIED: Compare dates as simple YYYY-MM-DD strings
  const toSimpleDateString = (value) => {
    if (!value) return '';
    
    if (typeof value === 'string') {
      // If it's already a YYYY-MM-DD string from database
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      // If it's a date string with time, extract date part
      if (value.includes('T')) {
        return value.split('T')[0];
      }
    }
    
    if (value instanceof Date) {
      // Convert Date to YYYY-MM-DD in local timezone
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return String(value || '');
  };

  Object.keys(fieldMappings).forEach(field => {
    let oldValue = oldData[field];
    let newValue = newData[field];
    
    // Handle date comparisons
    if (field.includes('_date')) {
      oldValue = toSimpleDateString(oldValue);
      newValue = toSimpleDateString(newValue);
    }
    
    // Normalize other values
    const normalizeValue = (value) => {
      if (value === null || value === undefined) return '';
      return String(value).trim();
    };
    
    oldValue = normalizeValue(oldValue);
    newValue = normalizeValue(newValue);
    
    if (oldValue !== newValue) {
      changedFields.push(fieldMappings[field]);
    }
  });
  
  return changedFields;
};

// Helper function to get client IP
function getClientIP(request) {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIP) {
      return realIP;
    }
    
    return '127.0.0.1';
  } catch (error) {
    return 'Unknown';
  }
}

export async function PUT(request, { params }) {
  // Fix: Await params to resolve dynamic route parameter
  const { soc_portal_id } = await params;
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const adminId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  const requestStartTime = Date.now();
  
  // Prevent duplicate logging by checking if this is the first log for this request
  let hasLoggedStart = false;
  if (!hasLoggedStart) {
    hasLoggedStart = true;
    logger.info('User update request received', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdateUser',
        adminId,
        userId: soc_portal_id,
        details: `Admin ${adminId} updating user ${soc_portal_id}`
      }
    });
  }

  let client;
  try {
    const formData = await request.formData();
    
    // Extract form data
    const firstName = formData.get('firstName');
    const lastName = formData.get('lastName');
    const shortName = formData.get('shortName');
    const ngdId = formData.get('ngdId');
    const dateOfBirth = formData.get('dateOfBirth') ? new Date(formData.get('dateOfBirth')) : null;
    const joiningDate = formData.get('joiningDate') ? new Date(formData.get('joiningDate')) : null;
    let resignDate = formData.get('resignDate') ? new Date(formData.get('resignDate')) : null;
    const email = formData.get('email');
    const phone = formData.get('phone');
    const emergencyContact = formData.get('emergencyContact');
    const designation = formData.get('designation');
    const bloodGroup = formData.get('bloodGroup');
    const gender = formData.get('gender');
    const roleType = formData.get('roleType');
    let status = formData.get('status') || 'Active';
    const photoFile = formData.get('profilePhoto');
    
    // Fix: Auto-status logic based on resign date
    if (resignDate) {
      status = 'Resigned';
    } else if (status === 'Resigned') {
      // If status was Resigned but no resign date, revert to Active
      status = 'Active';
    }
    
    // Validate required fields
    const requiredFields = {
      firstName, lastName, ngdId, dateOfBirth, 
      joiningDate, email, phone, designation,
      bloodGroup, gender, roleType
    };
    
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    if (missingFields.length > 0) {
      const message = `Missing required fields: ${missingFields.join(', ')}`;
      logger.warn('Validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          adminId,
          userId: soc_portal_id,
          details: message,
          missingFields
        }
      });
      
      return NextResponse.json(
        { success: false, message },
        { status: 400 }
      );
    }
    
    // Validate email format and domain
    const emailRegex = /^[^\s@]+@nagad\.com\.bd$/;
    if (!emailRegex.test(email)) {
      const details = `Invalid email: ${email} - Must be @nagad.com.bd domain`;
      logger.warn('Invalid email format', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          adminId,
          userId: soc_portal_id,
          details
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Email must be @nagad.com.bd domain' },
        { status: 400 }
      );
    }

    // Validate NGD ID format
    const ngdIdRegex = /^NGD\d{6}$/;
    if (!ngdIdRegex.test(ngdId)) {
      logger.warn('Invalid NGD ID format', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          adminId,
          userId: soc_portal_id,
          details: `Invalid NGD ID: ${ngdId} - Must be NGD followed by 6 digits`
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'NGD ID must be in format NGD followed by 6 digits (e.g. NGD241079)' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^(017|013|019|014|018|016|015)\d{8}$/;
    if (!phoneRegex.test(phone)) {
      logger.warn('Invalid phone number', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          adminId,
          userId: soc_portal_id,
          details: `Invalid phone: ${phone} - Must be 11 digits starting with valid prefix`
        }
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Phone must be 11 digits starting with 017,013,019,014,018,016 or 015' 
        },
        { status: 400 }
      );
    }

    // Validate emergency contact format (optional)
    if (emergencyContact && !phoneRegex.test(emergencyContact)) {
      logger.warn('Invalid emergency contact', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          adminId,
          userId: soc_portal_id,
          details: `Invalid emergency contact: ${emergencyContact}`
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

    // Validate role type
    const validRoles = ['SOC', 'OPS', 'CTO', 'INTERN'];
    if (!validRoles.includes(roleType)) {
      logger.warn('Invalid role type', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          adminId,
          userId: soc_portal_id,
          details: `Invalid role: ${roleType}`
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Invalid role type' },
        { status: 400 }
      );
    }
    
    // Validate dates
    const today = new Date();
    
    // Age must be at least 18
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    if (age < 18) {
      return NextResponse.json(
        { success: false, message: 'User must be at least 18 years old' },
        { status: 400 }
      );
    }
    
    // Joining date can't be in future
    if (joiningDate > today) {
      return NextResponse.json(
        { success: false, message: 'Joining date cannot be in the future' },
        { status: 400 }
      );
    }
    
    // Resign date validation
    if (resignDate) {
      if (resignDate < joiningDate) {
        return NextResponse.json(
          { success: false, message: 'Resign date cannot be before joining date' },
          { status: 400 }
        );
      }
      if (resignDate > today) {
        return NextResponse.json(
          { success: false, message: 'Resign date cannot be in the future' },
          { status: 400 }
        );
      }
    }
    
    client = await getDbConnection().connect(); // FIX: Get client from pool
    await client.query('BEGIN');

    // Get current user data for comparison - use TO_CHAR to get dates as strings
    const currentUserResult = await client.query(`
      SELECT 
        soc_portal_id,
        ngd_id,
        first_name,
        last_name,
        short_name,
        TO_CHAR(date_of_birth, 'YYYY-MM-DD') as date_of_birth,
        TO_CHAR(joining_date, 'YYYY-MM-DD') as joining_date,
        TO_CHAR(resign_date, 'YYYY-MM-DD') as resign_date,
        email,
        phone,
        emergency_contact,
        designation,
        bloodgroup,
        gender,
        status,
        role_type,
        profile_photo_url
      FROM user_info 
      WHERE soc_portal_id = $1
    `, [soc_portal_id]);
    
    if (currentUserResult.rows.length === 0) {
      await client.query('ROLLBACK');
      
      logger.warn('User not found during update', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UpdateUser',
          adminId,
          userId: soc_portal_id,
          details: `User ${soc_portal_id} not found for update`
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const currentUser = currentUserResult.rows[0];

    // Check for email conflict with other users
    const emailCheck = await client.query(
      `SELECT * FROM user_info WHERE email = $1 AND soc_portal_id != $2`,
      [email, soc_portal_id]
    );
    
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      
      logger.warn('Email conflict', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          adminId,
          userId: soc_portal_id,
          details: `Email already exists: ${email}`
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Email already registered by another user' },
        { status: 409 }
      );
    }
    
    // Check for NGD ID conflict with other users
    const ngdCheck = await client.query(
      `SELECT * FROM user_info WHERE ngd_id = $1 AND soc_portal_id != $2`,
      [ngdId, soc_portal_id]
    );
    
    if (ngdCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      
      logger.warn('NGD ID conflict', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          adminId,
          userId: soc_portal_id,
          details: `NGD ID already exists: ${ngdId}`
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'NGD ID already registered by another user' },
        { status: 409 }
      );
    }

    // Handle profile photo update
    let profilePhotoUrl = currentUser.profile_photo_url;
    if (photoFile && photoFile.size > 0) {
      try {
        profilePhotoUrl = await saveProfilePhoto(photoFile, soc_portal_id);
      } catch (error) {
        logger.warn('Profile photo upload failed', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'FileUpload',
            adminId,
            userId: soc_portal_id,
            details: error.message
          }
        });
        // Continue without failing the whole process
      }
    }

    // Update user in database
    const updateQuery = `
      UPDATE user_info 
      SET 
        first_name = $1,
        last_name = $2,
        short_name = $3,
        ngd_id = $4,
        date_of_birth = $5,
        joining_date = $6,
        resign_date = $7,
        email = $8,
        phone = $9,
        emergency_contact = $10,
        designation = $11,
        bloodgroup = $12,
        gender = $13,
        role_type = $14,
        status = $15,
        profile_photo_url = $16,
        updated_at = NOW()
      WHERE soc_portal_id = $17
      RETURNING *
    `;
    
    const updateParams = [
      firstName,
      lastName,
      shortName,
      ngdId,
      dateOfBirth,
      joiningDate,
      resignDate || null,
      email,
      phone,
      emergencyContact || null,
      designation,
      bloodGroup,
      gender,
      roleType,
      status, // This now includes auto-calculated status
      profilePhotoUrl,
      soc_portal_id
    ];
    
    const updateResult = await client.query(updateQuery, updateParams);
    
    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Failed to update user in database');
    }

    const updatedUser = updateResult.rows[0];

    // Get changed fields for logging
    const changedFields = getChangedFields(currentUser, {
      first_name: firstName,
      last_name: lastName,
      short_name: shortName,
      ngd_id: ngdId,
      date_of_birth: dateOfBirth,
      joining_date: joiningDate,
      resign_date: resignDate,
      email: email,
      phone: phone,
      emergency_contact: emergencyContact,
      designation: designation,
      bloodgroup: bloodGroup,
      gender: gender,
      role_type: roleType,
      status: status,
      profile_photo_url: profilePhotoUrl
    });

    // Log admin activity
    const activityDescription = changedFields.length > 0 
      ? `Updated user ${soc_portal_id}: ${changedFields.join(', ')}`
      : `Viewed user ${soc_portal_id} (no changes made)`;

    await client.query(
      'INSERT INTO admin_activity_log (soc_portal_id, action, description, ip_address, device_info, eid, sid) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        adminId,
        'UPDATE_USER',
        activityDescription,
        ipAddress,
        userAgent,
        eid,
        sessionId
      ]
    );

    // Create notifications only if there are changes
    if (changedFields.length > 0) {
      // Generate notification IDs
      const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details', client);
      const userNotificationId = await generateNotificationId('UN', 'user_notification_details', client);

      // Create admin notification
      await client.query(
        'INSERT INTO admin_notification_details (notification_id, title, status) VALUES ($1, $2, $3)',
        [
          adminNotificationId,
          `User Updated: ${firstName} ${lastName} (${soc_portal_id}) By ${adminId}`,
          'Unread'
        ]
      );

      // Create user notification
      await client.query(
        'INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id) VALUES ($1, $2, $3, $4)',
        [
          userNotificationId,
          'Your profile has been updated by administrator',
          'Unread',
          soc_portal_id
        ]
      );
    }

    await client.query('COMMIT');

    const requestDuration = Date.now() - requestStartTime;
    
    // Prevent duplicate success logging
    if (!hasLoggedStart) {
      logger.info('User updated successfully', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UpdateUser',
          adminId,
          userId: soc_portal_id,
          duration: `${requestDuration}ms`,
          changedFields: changedFields,
          details: `User ${soc_portal_id} updated successfully by admin ${adminId}. Changed fields: ${changedFields.join(', ')}`
        }
      });
    }

    // Send Telegram alert for significant updates
    if (changedFields.length > 0) {
      const telegramMessage = formatUpdateAlert(
        'update',
        email,
        ipAddress,
        userAgent,
        { 
          eid, 
          status: 'Successful',
          adminId,
          userId: soc_portal_id,
          role: roleType,
          changedFields: changedFields
        }
      );
      
      await sendTelegramAlert(telegramMessage);
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser,
      changedFields: changedFields
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    
    const errorDuration = Date.now() - requestStartTime;
    
    logger.error('User update failed', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SystemError',
        adminId,
        userId: soc_portal_id,
        duration: `${errorDuration}ms`,
        error: error.message,
        stack: error.stack,
        details: `User update failed for ${soc_portal_id}`
      }
    });

    // Send error alert
    const errorMessage = formatUpdateAlert(
      'update',
      'N/A',
      ipAddress,
      userAgent,
      { 
        eid, 
        status: `Failed: ${error.message}`,
        adminId,
        role: 'N/A'
      }
    );
    
    await sendTelegramAlert(errorMessage);

    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error.message
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        client.release(); // Release the client back to the pool
      } catch (error) {
        logger.error('Error releasing database client', {
          error: error.message,
          meta: {
            eid,
            sid: sessionId,
            taskName: 'UpdateUser',
            details: 'Failed to release database connection'
          }
        });
      }
    }
  }
}