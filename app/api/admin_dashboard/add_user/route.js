// app/api/admin_dashboard/add_user/route.js
import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../../lib/db';
import logger from '../../../../lib/logger';
import sendTelegramAlert from '../../../../lib/telegramAlert';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs/promises';
import nodemailer from 'nodemailer';
import { getClientIP } from '../../../../lib/utils/ipUtils';

// Enhanced Telegram alert message formatting
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
  }) + ' (GMT+6)';

  const adminId = additionalInfo.adminId || 'N/A';
  const userId = additionalInfo.userId || 'N/A';
  const role = additionalInfo.role || 'N/A';
  const status = additionalInfo.status || 'Completed';
  const eid = additionalInfo.eid || 'N/A';
  const rosterUpdate = additionalInfo.rosterUpdate || 'N/A';

  // Define emojis based on status and actions
  const statusEmoji = status.includes('Failed') ? '🔴' : '🟢';
  const rosterEmoji = rosterUpdate === 'created' ? '📊' : 
                     rosterUpdate === 'exists' ? 'ℹ️' : 
                     rosterUpdate === 'skipped' ? '⏭️' : '❓';

  const rosterStatusText = rosterUpdate === 'created' ? 'Roster Column Created' :
                          rosterUpdate === 'exists' ? 'Roster Column Exists' :
                          rosterUpdate === 'skipped' ? 'Roster Update Skipped' : 'Unknown';

  // Professional formatted message with perfect alignment
  const message = `🎯 **SOC PORTAL | USER ${action.toUpperCase()} ALERT**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 **USER INFORMATION**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 **Email**                  : ${email}
🆔 **User ID**               : ${userId}
🎯 **Role**                     : ${role}
📋 **Roster Column**  : ${rosterEmoji} ${rosterStatusText}
🆔 **Admin ID**            : ${adminId}
🔐 **EID**                       : ${eid}
🌍 **IP Address**           : ${ipAddress}
💻 **User Agent**          : ${userAgent}
🕐 **Timestamp**         : ${time}
${statusEmoji} **Status**                  : **${status}**`;

  return message;
};

// Generate next SOC Portal ID
const generateSocPortalId = async (client) => {
  try {
    const result = await client.query(`
      SELECT MAX(CAST(SUBSTRING(soc_portal_id FROM 2 FOR 2) AS INTEGER)) AS max_id 
      FROM user_info
      WHERE soc_portal_id ~ '^U[0-9]{2}SOCP$'
    `);
    
    const maxId = result.rows[0]?.max_id || 0;
    const nextId = (maxId + 1).toString().padStart(2, '0');
    return `U${nextId}SOCP`;
  } catch (error) {
    throw new Error(`Error generating SOC Portal ID: ${error.message}`);
  }
};

// Generate next notification ID based on serial column
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

// UPDATED: Save profile photo with proper permissions
// Replace the saveProfilePhoto function in your route.js with this:

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
    
    console.log('=== FILE UPLOAD DEBUG ===');
    console.log('New storage location:', {
      uploadDir: uploadDir,
      filename: filename,
      filePath: filePath
    });

    logger.info('Initiating profile photo upload to new storage location', {
      meta: {
        taskName: 'FileUpload',
        details: `Uploading profile photo for user ${userId} to new storage path`,
        userId: userId,
        uploadDir: uploadDir,
        filename: filename,
        action: 'upload_initiated'
      }
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
    
    // CRITICAL FIX: Change ownership to nginx user
    try {
      const { execSync } = require('child_process');
      // Get nginx user's UID and GID
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
    
    // Return URL with cache-busting timestamp
    // Return NEW URL format
    const photoUrl = `/api/storage/user_dp/${filename}?t=${Date.now()}`; // CHANGED
    
    logger.info('Profile photo uploaded successfully to new location', {
      meta: {
        taskName: 'FileUpload',
        details: `Profile photo saved and accessible via: ${photoUrl}`,
        userId: userId,
        photoUrl: photoUrl,
        action: 'upload_completed'
      }
    });
    
    return photoUrl;
    
  } catch (error) {
    logger.error('Profile photo upload failed in new storage location', {
      meta: {
        taskName: 'FileUpload',
        details: `Upload failed: ${error.message}`,
        userId: userId,
        error: error.message,
        action: 'upload_failed'
      }
    });
    throw new Error(`Profile photo save failed: ${error.message}`);
  }
};

// Add new column to roster_schedule table ONLY for SOC role users
const addUserColumnToRosterSchedule = async (client, shortName, roleType, userId) => {
  try {
    // Only proceed if user role is SOC
    if (roleType !== 'SOC') {
      logger.info('Roster schedule table update bypassed - user role is not SOC', {
        meta: {
          taskName: 'RosterTableUpdate',
          details: `User ${userId} has ${roleType} role - roster column creation only required for SOC role users`,
          userId: userId,
          userRole: roleType,
          action: 'skipped',
          reason: 'non_soc_role'
        }
      });
      return { success: true, action: 'skipped', reason: 'Non-SOC role' };
    }

    const columnName = shortName.toLowerCase();
    
    logger.info('Initiating roster schedule column verification for SOC role user', {
      meta: {
        taskName: 'RosterTableUpdate',
        details: `Verifying column existence '${columnName}' in roster_schedule table for SOC user ${userId}`,
        userId: userId,
        columnName: columnName,
        userRole: roleType,
        action: 'verification_started'
      }
    });

    // Check if column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'roster_schedule' AND column_name = $1
    `;
    
    const columnCheck = await client.query(checkColumnQuery, [columnName]);
    
    if (columnCheck.rows.length > 0) {
      logger.info('Roster schedule column pre-exists - no modification required', {
        meta: {
          taskName: 'RosterTableUpdate',
          details: `Column '${columnName}' already present in roster_schedule table for SOC user ${userId}`,
          userId: userId,
          columnName: columnName,
          action: 'exists',
          reason: 'column_already_exists'
        }
      });
      return { success: true, action: 'exists', columnName };
    }

    // Column doesn't exist, proceed with creation for SOC user
    logger.info('Creating new roster schedule column for SOC role user', {
      meta: {
        taskName: 'RosterTableUpdate',
        details: `Executing DDL: ALTER TABLE roster_schedule ADD COLUMN ${columnName} VARCHAR(20)`,
        userId: userId,
        columnName: columnName,
        userRole: roleType,
        action: 'creation_initiated'
      }
    });

    const alterTableQuery = `
      ALTER TABLE roster_schedule 
      ADD COLUMN ${columnName} VARCHAR(20)
    `;
    
    await client.query(alterTableQuery);

    logger.info('Roster schedule table successfully updated with new SOC user column', {
      meta: {
        taskName: 'RosterTableUpdate',
        details: `Column '${columnName}' successfully created in roster_schedule table for SOC user ${userId}`,
        userId: userId,
        columnName: columnName,
        action: 'created',
        userRole: roleType,
        result: 'success'
      }
    });

    return { success: true, action: 'created', columnName };
    
  } catch (error) {
    logger.error('Roster schedule column creation failed for SOC user', {
      meta: {
        taskName: 'RosterTableUpdate',
        details: `DDL execution failed for column '${shortName.toLowerCase()}': ${error.message}`,
        userId: userId,
        columnName: shortName.toLowerCase(),
        userRole: roleType,
        action: 'creation_failed',
        error: error.message,
        stack: error.stack
      }
    });
    
    throw new Error(`Failed to add column to roster_schedule: ${error.message}`);
  }
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

export async function POST(request) {
  const ipAddress = getClientIP(request);
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const adminId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
  
  logger.info('User account creation workflow initiated', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'UserCreationWorkflow',
      details: `Admin ${adminId} initiating new user creation process`,
      adminId: adminId,
      ipAddress: ipAddress,
      userAgent: userAgent.substring(0, 100),
      action: 'workflow_started'
    }
  });

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
    const resignDate = formData.get('resignDate') ? new Date(formData.get('resignDate')) : null;
    const email = formData.get('email');
    const phone = formData.get('phone');
    const emergencyContact = formData.get('emergencyContact');
    const designation = formData.get('designation');
    const bloodGroup = formData.get('bloodGroup');
    const gender = formData.get('gender');
    const password = formData.get('password');
    const roleType = formData.get('roleType');
    const status = formData.get('status') || 'Active';
    const photoFile = formData.get('profilePhoto');
    
    // Validate required fields
    const requiredFields = {
      firstName, lastName, ngdId, dateOfBirth, 
      joiningDate, email, phone, designation,
      bloodGroup, gender, password, roleType
    };
    
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    if (missingFields.length > 0) {
      const message = `Required field validation failed: ${missingFields.join(', ')}`;
      logger.warn('User creation validation failed - missing required fields', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: message,
          missingFields: missingFields,
          adminId: adminId,
          ipAddress: ipAddress,
          action: 'validation_failed'
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
      const details = `Email domain validation failed: ${email} - Must be @nagad.com.bd domain`;
      logger.warn('Email domain validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: details,
          email: email,
          adminId: adminId,
          ipAddress: ipAddress,
          action: 'email_validation_failed'
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Email must be @nagad.com.bd domain' },
        { status: 400 }
      );
    }

    // Add NGD ID validation
    const ngdIdRegex = /^NGD\d{6}$/;
    if (!ngdIdRegex.test(ngdId)) {
      logger.warn('NGD ID format validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: `NGD ID format invalid: ${ngdId} - Required format: NGD followed by 6 digits`,
          ngdId: ngdId,
          adminId: adminId,
          ipAddress: ipAddress,
          action: 'ngdid_validation_failed'
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'NGD ID must be in format NGD followed by 6 digits (e.g. NGD241079)' },
        { status: 400 }
      );
    }

    // Add phone number validation
    const phoneRegex = /^(017|013|019|014|018|016|015)\d{8}$/;
    if (!phoneRegex.test(phone)) {
      logger.warn('Phone number format validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: `Phone number format invalid: ${phone} - Must be 11 digits with valid Bangladeshi prefix`,
          phone: phone,
          adminId: adminId,
          ipAddress: ipAddress,
          action: 'phone_validation_failed'
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

    if (emergencyContact && !phoneRegex.test(emergencyContact)) {
        logger.warn('Emergency contact format validation failed', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'Validation',
            details: `Emergency contact format invalid: ${emergencyContact} - Must be 11 digits with valid prefix`,
            emergencyContact: emergencyContact,
            adminId: adminId,
            ipAddress: ipAddress,
            action: 'emergency_contact_validation_failed'
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
    
    // Validate password strength (without special character requirement)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      logger.warn('Password complexity validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: 'Password does not meet complexity requirements: 8+ chars, uppercase, lowercase, number',
          adminId: adminId,
          ipAddress: ipAddress,
          action: 'password_validation_failed'
        }
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Password must be at least 8 characters and include uppercase, lowercase, and number' 
        },
        { status: 400 }
      );
    }

    // Validate role type
    const validRoles = ['SOC', 'OPS', 'INTERN', 'CTO'];
    if (!validRoles.includes(roleType)) {
      logger.warn('User role type validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: `Invalid role type specified: ${roleType}`,
          roleType: roleType,
          validRoles: validRoles,
          adminId: adminId,
          ipAddress: ipAddress,
          action: 'role_validation_failed'
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
      logger.warn('Date of birth validation failed - user under 18 years', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: `User age calculation: ${age} years - Minimum 18 years required`,
          dateOfBirth: dateOfBirth,
          calculatedAge: age,
          adminId: adminId,
          ipAddress: ipAddress,
          action: 'age_validation_failed'
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'User must be at least 18 years old' },
        { status: 400 }
      );
    }
    
    // Joining date can't be in future
    if (joiningDate > today) {
      logger.warn('Joining date validation failed - future date not allowed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: `Joining date ${joiningDate} is in the future`,
          joiningDate: joiningDate,
          currentDate: today,
          adminId: adminId,
          ipAddress: ipAddress,
          action: 'joining_date_validation_failed'
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Joining date cannot be in the future' },
        { status: 400 }
      );
    }
    
    // Resign date validation
    if (resignDate) {
      if (resignDate < joiningDate) {
        logger.warn('Resign date validation failed - before joining date', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'Validation',
            details: `Resign date ${resignDate} is before joining date ${joiningDate}`,
            resignDate: resignDate,
            joiningDate: joiningDate,
            adminId: adminId,
            ipAddress: ipAddress,
            action: 'resign_date_validation_failed'
          }
        });
        
        return NextResponse.json(
          { success: false, message: 'Resign date cannot be before joining date' },
          { status: 400 }
        );
      }
    }
    
    // Get database client for transaction
    client = await getDbConnection().connect();
    await client.query('BEGIN');

    logger.info('Database transaction initiated for user creation', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DatabaseTransaction',
        details: 'Beginning database transaction for user creation process',
        adminId: adminId,
        ipAddress: ipAddress,
        action: 'transaction_started'
      }
    });

    // Check for existing email using transaction client
    const emailCheck = await client.query(
      `SELECT * FROM user_info WHERE email = $1`,
      [email]
    );
    
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      logger.warn('Email uniqueness validation failed - email already registered', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: `Email ${email} already exists in system`,
          email: email,
          adminId: adminId,
          ipAddress: ipAddress,
          action: 'email_uniqueness_failed'
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 409 }
      );
    }
    
    // Check for existing NGD ID using transaction client
    const ngdCheck = await client.query(
      `SELECT * FROM user_info WHERE ngd_id = $1`,
      [ngdId]
    );
    
    if (ngdCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      logger.warn('NGD ID uniqueness validation failed - NGD ID already registered', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: `NGD ID ${ngdId} already exists in system`,
          ngdId: ngdId,
          adminId: adminId,
          ipAddress: ipAddress,
          action: 'ngdid_uniqueness_failed'
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'NGD ID already registered' },
        { status: 409 }
      );
    }
    
    // Generate IDs using transaction client
    const socPortalId = await generateSocPortalId(client);
    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details', client);
    const userNotificationId = await generateNotificationId('UN', 'user_notification_details', client);
    
    logger.info('System IDs generated successfully for new user', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'IDGeneration',
        details: `Generated: SOC Portal ID: ${socPortalId}, Admin Notification: ${adminNotificationId}, User Notification: ${userNotificationId}`,
        userId: socPortalId,
        adminNotificationId: adminNotificationId,
        userNotificationId: userNotificationId,
        adminId: adminId,
        ipAddress: ipAddress,
        action: 'id_generation_completed'
      }
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Handle profile photo
    let profilePhotoUrl = '/storage/user_dp/default_DP.png';
    if (photoFile && photoFile.size > 0) {
      try {
        profilePhotoUrl = await saveProfilePhoto(photoFile, socPortalId);
        logger.info('Profile photo uploaded successfully', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'FileUpload',
            details: `Profile photo saved for user ${socPortalId}`,
            userId: socPortalId,
            profilePhotoUrl: profilePhotoUrl,
            adminId: adminId,
            ipAddress: ipAddress,
            action: 'profile_photo_uploaded'
          }
        });
      } catch (error) {
        logger.warn('Profile photo upload failed, using default image', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'FileUpload',
            details: `Profile photo upload failed: ${error.message}`,
            userId: socPortalId,
            error: error.message,
            adminId: adminId,
            ipAddress: ipAddress,
            action: 'profile_upload_failed'
          }
        });
        // Continue without failing the whole process
      }
    }
    
    // Insert user into database using transaction client
    const insertQuery = `
      INSERT INTO user_info (
        soc_portal_id, ngd_id, first_name, last_name, short_name, date_of_birth,
        joining_date, resign_date, email, phone, emergency_contact, designation,
        bloodgroup, gender, password, status, role_type, profile_photo_url
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const userParams = [
      socPortalId, ngdId, firstName, lastName, shortName, dateOfBirth,
      joiningDate, resignDate, email, phone, emergencyContact, designation,
      bloodGroup, gender, hashedPassword, status, roleType, profilePhotoUrl
    ];
    
    const newUser = await client.query(insertQuery, userParams);
    
    if (newUser.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Database insertion failed - no rows returned');
    }

    logger.info('User record successfully inserted into database', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DatabaseInsert',
        details: `User ${socPortalId} successfully inserted into user_info table`,
        userId: socPortalId,
        table: 'user_info',
        adminId: adminId,
        ipAddress: ipAddress,
        action: 'user_record_created'
      }
    });

    // ✅ CONDITIONALLY ADD NEW COLUMN TO ROSTER_SCHEDULE TABLE ONLY FOR SOC ROLE USERS
    const rosterUpdateResult = await addUserColumnToRosterSchedule(client, shortName, roleType, socPortalId);

    // Enhanced logging for roster update result
    if (rosterUpdateResult.action === 'created') {
      logger.info('Roster schedule infrastructure successfully established for SOC user', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'RosterInfrastructure',
          details: `Column '${rosterUpdateResult.columnName}' created in roster_schedule table for SOC user ${socPortalId}`,
          userId: socPortalId,
          columnName: rosterUpdateResult.columnName,
          userRole: roleType,
          action: 'roster_column_created',
          ipAddress: ipAddress
        }
      });
    } else if (rosterUpdateResult.action === 'exists') {
      logger.info('Roster schedule column already available for SOC user', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'RosterInfrastructure',
          details: `Column '${rosterUpdateResult.columnName}' pre-existing in roster_schedule table for SOC user ${socPortalId}`,
          userId: socPortalId,
          columnName: rosterUpdateResult.columnName,
          userRole: roleType,
          action: 'roster_column_exists',
          ipAddress: ipAddress
        }
      });
    } else if (rosterUpdateResult.action === 'skipped') {
      logger.info('Roster schedule update bypassed for non-SOC role user', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'RosterInfrastructure',
          details: `User ${socPortalId} has ${roleType} role - roster column creation not required`,
          userId: socPortalId,
          userRole: roleType,
          action: 'roster_update_skipped',
          ipAddress: ipAddress
        }
      });
    }

    // Get admin email for notification
    const adminEmailResult = await client.query(
      'SELECT email FROM admin_info WHERE soc_portal_id = $1',
      [adminId]
    );
    const adminEmail = adminEmailResult.rows[0]?.email || 'Unknown';

    // Log admin activity
    const activityLogQuery = `
      INSERT INTO admin_activity_log (
        soc_portal_id, action, description, ip_address, device_info, eid, sid, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `;
    
    const activityParams = [
      adminId,
      'ADD_USER',
      `Created new user: ${firstName} ${lastName} (${socPortalId}) with ${roleType} role`,
      ipAddress,
      userAgent,
      eid,
      sessionId
    ];
    
    await client.query(activityLogQuery, activityParams);
    
    logger.info('Admin activity logged successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'ActivityLogging',
        details: `Admin activity recorded for user creation: ${socPortalId}`,
        userId: socPortalId,
        adminId: adminId,
        ipAddress: ipAddress,
        action: 'admin_activity_logged'
      }
    });

    // Create admin notification
    const adminNotificationQuery = `
      INSERT INTO admin_notification_details (
        notification_id, title, status, created_at
      )
      VALUES ($1, $2, $3, NOW())
    `;
    
    const adminNotifParams = [
      adminNotificationId,
      `New User Added: ${firstName} ${lastName} (${roleType})`,
      'Unread'
    ];
    
    await client.query(adminNotificationQuery, adminNotifParams);
    
    // Create user notification
    const userNotificationQuery = `
      INSERT INTO user_notification_details (
        notification_id, title, status, soc_portal_id, created_at
      )
      VALUES ($1, $2, $3, $4, NOW())
    `;
    
    const userNotifParams = [
      userNotificationId,
      'Welcome to SOC Portal! Your account has been created',
      'Unread',
      socPortalId
    ];
    
    await client.query(userNotificationQuery, userNotifParams);
    
    logger.info('System notifications created successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'NotificationSystem',
        details: `Notifications created: Admin - ${adminNotificationId}, User - ${userNotificationId}`,
        userId: socPortalId,
        adminNotificationId: adminNotificationId,
        userNotificationId: userNotificationId,
        adminId: adminId,
        ipAddress: ipAddress,
        action: 'notifications_created'
      }
    });
    
    // Commit transaction - ALL operations including roster table update
    await client.query('COMMIT');

    logger.info('Database transaction committed successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DatabaseTransaction',
        details: 'All database operations committed successfully',
        userId: socPortalId,
        adminId: adminId,
        ipAddress: ipAddress,
        action: 'transaction_committed'
      }
    });

    // Email notification to new user (this is outside transaction since it's not critical)
    try {
      console.log('[Email Notification] Preparing to send welcome email to new user');
      
      if (email) {
        // Generate HTML email content
        const userEmailHTML = `
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
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              td { padding: 8px; border: 1px solid #ddd; }
              td:first-child { font-weight: bold; width: 30%; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to SOC Portal</h1>
              </div>
              <div class="content">
                <div class="alert">
                  <strong>Your account has been successfully created!</strong>
                </div>
                
                <p>Dear ${firstName} ${lastName},</p>
                
                <p>Welcome to SOC Portal! Your account has been successfully created.</p>
                
                <p>Your account details:</p>
                <table>
                  <tr>
                    <td>User ID</td>
                    <td>${socPortalId}</td>
                  </tr>
                  <tr>
                    <td>Email</td>
                    <td>${email}</td>
                  </tr>
                  <tr>
                    <td>Password</td>
                    <td>${password} (temporary)</td>
                  </tr>
                  <tr>
                    <td>Role</td>
                    <td>${roleType}</td>
                  </tr>
                  <tr>
                    <td>Designation</td>
                    <td>${designation}</td>
                  </tr>
                </table>
                
                <p>Please log in to the <a href="http://167.88.38.114:5001/">SOC Portal</a> and change your password immediately.</p>
                
                <p>Best Regards,<br>
                <strong>SOC Portal Team</strong></p>
              </div>
              <div class="footer">
                <p><strong>Security Note:</strong> This email contains sensitive information. Do not share your credentials.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        // Send email to new user
        await sendEmail({
          to: email,
          subject: `Welcome to SOC Portal - ${socPortalId}`,
          html: userEmailHTML
        });
        
        console.log('[Email Notification] Welcome email sent successfully');
        
        // Log email success
        logger.info('Welcome email successfully delivered to new user', {
          meta: {
            socPortalId,
            email: email,
            taskName: 'EmailNotification',
            details: `Welcome email sent to ${email} for user ${socPortalId}`,
            userId: socPortalId,
            action: 'welcome_email_sent',
            ipAddress: ipAddress
          }
        });
      } else {
        console.log('[Email Notification] No user email provided');
        logger.warn('Email notification skipped - no email address provided', {
          meta: {
            socPortalId,
            taskName: 'EmailNotification',
            details: 'No email address available for new user',
            userId: socPortalId,
            action: 'email_skipped',
            ipAddress: ipAddress
          }
        });
      }
    } catch (emailError) {
      console.error('[Email Notification Failed]', emailError.message);
      logger.error('User welcome email delivery failed', {
        meta: {
          socPortalId,
          error: emailError.message,
          taskName: 'EmailNotification',
          details: `Failed to send welcome email to ${email}`,
          userId: socPortalId,
          action: 'email_delivery_failed',
          ipAddress: ipAddress
        }
      });
      // Don't fail the entire process if email fails
    }
    
    // Log comprehensive success
    logger.info('User account creation workflow completed successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UserCreationWorkflow',
        details: `User account ${socPortalId} creation process completed with ${roleType} role privileges`,
        userDetails: {
          userId: socPortalId,
          fullName: `${firstName} ${lastName}`,
          email: email,
          roleType: roleType,
          designation: designation,
          status: status,
          ngdId: ngdId,
          rosterUpdate: rosterUpdateResult.action
        },
        adminDetails: {
          adminId: adminId,
          adminEmail: adminEmail
        },
        systemActions: {
          databaseInsert: 'completed',
          rosterTableUpdate: rosterUpdateResult.action,
          notifications: 'created',
          emailNotification: email ? 'sent' : 'skipped'
        },
        ipAddress: ipAddress,
        timestamp: new Date().toISOString(),
        action: 'workflow_completed'
      }
    });
    
    // Send comprehensive success alert
    const successMessage = formatAlertMessage(
      'CREATION',
      email,
      ipAddress,
      userAgent,
      { 
        eid, 
        status: 'SUCCESSFUL',
        adminId,
        userId: socPortalId,
        role: roleType,
        rosterUpdate: rosterUpdateResult.action
      }
    );
    
    await sendTelegramAlert(successMessage);
    
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      userId: socPortalId,
      userDetails: {
        name: `${firstName} ${lastName}`,
        email: email,
        role: roleType
      }
    });
    
  } catch (error) {
    // Rollback on error - this will rollback ALL operations including user creation and roster table update
    if (client) {
      await client.query('ROLLBACK').catch(err => 
        logger.error('Database transaction rollback failed', {
          meta: {
            taskName: 'DatabaseTransaction',
            details: `Rollback error: ${err.message}`,
            originalError: error.message,
            adminId: adminId,
            ipAddress: ipAddress,
            action: 'rollback_failed'
          }
        })
      );
    }
    
    logger.error('User account creation workflow failed', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SystemError',
        details: `Workflow failure: ${error.message}`,
        stack: error.stack,
        adminId: adminId,
        ipAddress: ipAddress,
        action: 'workflow_failed'
      }
    });
    
    // Send comprehensive error alert
    const errorMessage = formatAlertMessage(
      'CREATION',
      'N/A',
      ipAddress,
      userAgent,
      { 
        eid, 
        status: `FAILED: ${error.message.substring(0, 100)}`,
        adminId,
        role: 'N/A',
        rosterUpdate: 'N/A'
      }
    );
    
    await sendTelegramAlert(errorMessage);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error during user creation',
        error: error.message
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        client.release();
        logger.info('Database connection released successfully', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'ResourceCleanup',
            details: 'Database client released back to pool',
            adminId: adminId,
            ipAddress: ipAddress,
            action: 'connection_released'
          }
        });
      } catch (releaseError) {
        logger.error('Database connection release failed', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'ResourceCleanup',
            details: `Failed to release database connection: ${releaseError.message}`,
            adminId: adminId,
            ipAddress: ipAddress,
            action: 'connection_release_failed'
          }
        });
      }
    }
  }
}