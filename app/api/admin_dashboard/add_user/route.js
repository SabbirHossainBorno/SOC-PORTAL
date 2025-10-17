//app/api/admin_dashboard/add_user/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import logger from '../../../../lib/logger';
import sendTelegramAlert from '../../../../lib/telegramAlert';
import { DateTime } from 'luxon';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs/promises';
import nodemailer from 'nodemailer';

// Get current time in Asia/Dhaka
const getCurrentDateTime = () => {
  const now = DateTime.now().setZone('Asia/Dhaka');
  return now.toFormat("yyyy-LL-dd hh:mm:ss a") + ' (' + now.offsetNameShort + ')';
};

// Format Telegram alert message
const formatAlertMessage = (action, email, ipAddress, userAgent, additionalInfo = {}) => {
  const time = getCurrentDateTime();
  const adminId = additionalInfo.adminId || 'N/A';
  const userId = additionalInfo.userId || 'N/A';
  const role = additionalInfo.role || 'N/A';
  const status = additionalInfo.status || 'Completed';
  const eid = additionalInfo.eid || 'N/A';

  const title = `👤 [ SOC PORTAL | USER ${action.toUpperCase()} ]`;
  const statusEmoji = status.includes('Failed') ? '❌' : '✅';

  const message = `${title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 User Email     : ${email}
👤 User ID        : ${userId}
👥 Role           : ${role}
👑 Admin ID       : ${adminId}
🌐 IP Address     : ${ipAddress}
🖥️ Device Info    : ${userAgent}
🔖 EID            : ${eid}
🕒 Time           : ${time}
${statusEmoji} Status         : ${status}`;

  return `\`\`\`\n${message}\n\`\`\``;
};

// Generate next SOC Portal ID
const generateSocPortalId = async () => {
  try {
    // Fixed query to properly extract the numeric part
    const result = await query(`
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
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const adminId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
  
  logger.info('User creation initiated', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'CreateUser',
      details: `Admin ${adminId} creating new user`,
      adminId
    }
  });

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
      const message = `Missing required fields: ${missingFields.join(', ')}`;
      logger.warn('Validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
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
          details
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Email must be @nagad.com.bd domain' },
        { status: 400 }
      );
    }

    // Add NGD ID validation after email validation
    const ngdIdRegex = /^NGD\d{6}$/;
    if (!ngdIdRegex.test(ngdId)) {
      logger.warn('Invalid NGD ID format', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: `Invalid NGD ID: ${ngdId} - Must be NGD followed by 6 digits`
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'NGD ID must be in format NGD followed by 6 digits (e.g. NGD241079)' },
        { status: 400 }
      );
    }

    // Add phone number validation after NGD ID validation
    const phoneRegex = /^(017|013|019|014|018|016|015)\d{8}$/;
    if (!phoneRegex.test(phone)) {
      logger.warn('Invalid phone number', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
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
    
    // Validate password strength (without special character requirement)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      logger.warn('Weak password', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: 'Password does not meet complexity requirements'
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
    const validRoles = ['SOC', 'OPS', 'CTO', 'BI'];
    if (!validRoles.includes(roleType)) {
      logger.warn('Invalid role type', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
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
    }
    
    // Check for existing email
    const emailCheck = await query(
      `SELECT * FROM user_info WHERE email = $1`,
      [email]
    );
    
    if (emailCheck.rows.length > 0) {
      logger.warn('Email conflict', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: `Email already exists: ${email}`
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 409 }
      );
    }
    
    // Check for existing NGD ID
    const ngdCheck = await query(
      `SELECT * FROM user_info WHERE ngd_id = $1`,
      [ngdId]
    );
    
    if (ngdCheck.rows.length > 0) {
      logger.warn('NGD ID conflict', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: `NGD ID already exists: ${ngdId}`
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'NGD ID already registered' },
        { status: 409 }
      );
    }
    
    // Generate IDs
    const socPortalId = await generateSocPortalId();
    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details');
    const userNotificationId = await generateNotificationId('UN', 'user_notification_details');
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Handle profile photo
    let profilePhotoUrl = '/storage/user_dp/default_DP.png';
    if (photoFile && photoFile.size > 0) {
      try {
        profilePhotoUrl = await saveProfilePhoto(photoFile, socPortalId);
      } catch (error) {
        logger.warn('Profile photo upload failed', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'FileUpload',
            details: error.message
          }
        });
        // Continue without failing the whole process
      }
    }
    
    // Start transaction
    await query('BEGIN');
    
    // Insert user into database
    const insertQuery = `
      INSERT INTO user_info (
        soc_portal_id, ngd_id, first_name, last_name, short_name, date_of_birth,
        joining_date, resign_date, email, phone, designation,
        bloodgroup, gender, password, status, role_type, profile_photo_url
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;
    
    const userParams = [
      socPortalId, ngdId, firstName, lastName, shortName, dateOfBirth,
      joiningDate, resignDate, email, phone, designation,
      bloodGroup, gender, hashedPassword, status, roleType, profilePhotoUrl
    ];
    
    const newUser = await query(insertQuery, userParams);
    
    if (newUser.rows.length === 0) {
      throw new Error('Failed to create user in database');
    }

    // Get admin email for notification
    const adminEmailResult = await query(
      'SELECT email FROM admin_info WHERE soc_portal_id = $1',
      [adminId]
    );
    const adminEmail = adminEmailResult.rows[0]?.email || 'Unknown';

    // Format time for Dhaka - FIXED TIME FORMAT
    const createdTime = DateTime.now().setZone('Asia/Dhaka').toFormat('dd/MM/yyyy, hh:mm:ss a');
    
    // Log admin activity
    const activityLogQuery = `
      INSERT INTO admin_activity_log (
        soc_portal_id, action, description, ip_address, device_info, eid, sid
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    const activityParams = [
      adminId,
      'ADD_USER',
      `Created new user: ${firstName} ${lastName} (${socPortalId})`,
      ipAddress,
      userAgent,
      eid,
      sessionId
    ];
    
    await query(activityLogQuery, activityParams);
    
    // Create admin notification
    const adminNotificationQuery = `
      INSERT INTO admin_notification_details (
        notification_id, title, status
      )
      VALUES ($1, $2, $3)
    `;
    
    const adminNotifParams = [
      adminNotificationId,
      `New User Added: ${firstName} ${lastName}`,
      'Unread'
    ];
    
    await query(adminNotificationQuery, adminNotifParams);
    
    // Create user notification
    const userNotificationQuery = `
      INSERT INTO user_notification_details (
        notification_id, title, status, soc_portal_id
      )
      VALUES ($1, $2, $3, $4)
    `;
    
    const userNotifParams = [
      userNotificationId,
      'Welcome to SOC Portal! Your account has been created',
      'Unread',
      socPortalId
    ];
    
    await query(userNotificationQuery, userNotifParams);
    
    logger.info('User notification created', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UserNotification',
        userId: socPortalId,
        userNotificationId
      }
    });
    
    // Commit transaction
    await query('COMMIT');

    // Email notification to new user
    try {
      console.log('[User Email Notification] Preparing to send welcome email');
      
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
        
        console.log('[User Email Notification] Welcome email sent successfully');
        
        // Log email success
        logger.info('Welcome email sent to new user', {
          meta: {
            socPortalId,
            email,
            taskName: 'User Welcome Email'
          }
        });
      } else {
        console.log('[User Email Notification] No user email provided');
        logger.warn('No email provided for new user', {
          meta: {
            socPortalId,
            taskName: 'User Welcome Email'
          }
        });
      }
    } catch (emailError) {
      console.error('[User Email Notification Failed]', emailError.message);
      logger.error('User welcome email sending failed', {
        meta: {
          socPortalId,
          error: emailError.message,
          taskName: 'User Welcome Email'
        }
      });
      // Don't fail the entire process if email fails
    }
    
    // Log success
    logger.info('User created successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'CreateUser',
        details: `User ${socPortalId} created by admin ${adminId}`,
        userDetails: {
          firstName,
          lastName,
          email,
          roleType,
          designation,
          status
        },
        adminId
      }
    });
    
    // Send success alert
    const successMessage = formatAlertMessage(
      'creation',
      email,
      ipAddress,
      userAgent,
      { 
        eid, 
        status: 'Successful',
        adminId,
        userId: socPortalId,
        role: roleType
      }
    );
    
    await sendTelegramAlert(successMessage);
    
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      userId: socPortalId
    });
    
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK').catch(err => 
      logger.error('Rollback failed', {
        meta: {
          taskName: 'Rollback',
          details: `Error: ${err.message}`
        }
      })
    );
    
    logger.error('User creation failed', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SystemError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        adminId
      }
    });
    
    // Send error alert
    const errorMessage = formatAlertMessage(
      'creation',
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
  }
}