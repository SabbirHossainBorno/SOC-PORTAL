// app/api/user_dashboard/document_hub/access_form_tracker/route.js
import { query, getDbConnection } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';
import sendTelegramAlert from '../../../../../lib/telegramAlert';
import { getCurrentDateTime, validateDates, determineStatus } from '../../../../../lib/auditUtils';
import { writeFile, mkdir, access, chmod, chown } from 'fs/promises'; // FIXED: Added missing imports
import path from 'path';
import fs from 'fs'; // ADD THIS LINE for sync operations

// Helper function to escape special characters for RegExp
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Generate AF tracking ID
const generateAFTrackingId = async (client) => {
  try {
    logger.debug('Generating AF tracking ID');
    const result = await client.query('SELECT MAX(serial) AS max_serial FROM access_form_tracker');
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(2, '0');
    const afTrackingId = `AF${nextId}SOCP`;
    logger.debug('AF tracking ID generated successfully', { maxSerial, nextId, afTrackingId });
    return afTrackingId;
  } catch (error) {
    logger.error('Error generating AF tracking ID', {
      error: error.message,
      stack: error.stack
    });
    throw new Error(`Error generating AF tracking ID: ${error.message}`);
  }
};

// Format Telegram alert for new access form
const formatAccessFormAlert = (afTrackingId, ngdId, userName, portalNames, roles, effectiveDate, status, ipAddress, userAgent, additionalInfo = {}) => {
  const time = getCurrentDateTime();
  const userId = additionalInfo.userId || 'N/A';
  const eid = additionalInfo.eid || 'N/A';
  const email = additionalInfo.email || 'N/A';
  const mobileNumber = additionalInfo.mobileNumber || 'N/A';
  const division = additionalInfo.division || 'N/A';
  const department = additionalInfo.department || 'N/A';
  const revokeDate = additionalInfo.revokeDate || 'N/A';
  const remark = additionalInfo.remark || 'N/A';
  const trackedBy = additionalInfo.trackedBy || 'N/A';
  const accessFormType = additionalInfo.accessFormType || 'Not specified';
  const additionalInfoText = additionalInfo.additionalInfo || 'N/A';
  
  const message = `📋 SOC PORTAL | ACCESS FORM TRACKER 📋
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 AF Tracking ID    : ${afTrackingId}
🆔 NGD ID            : ${ngdId}
👤 User Name         : ${userName}
📧 Email             : ${email}
📞 Mobile Number     : ${mobileNumber}
🏢 Division          : ${division}
📋 Department        : ${department}
🌐 Portal Names      : ${portalNames}
👥 Roles             : ${roles}
📅 Effective Date    : ${effectiveDate}
📅 Revoke Date       : ${revokeDate}
✅ Status            : ${status}
📝 Remark            : ${remark}
📋 Form Type         : ${accessFormType}
📄 Additional Info   : ${additionalInfoText}
👤 Tracked By        : ${trackedBy}
👤 Reported By       : ${userId}
🌐 IP Address        : ${ipAddress}
🖥️ Device Info       : ${userAgent}
🔖 EID               : ${eid}
🕒 Report Time       : ${time}`;
  
  logger.debug('Telegram alert formatted successfully', { afTrackingId, ngdId, accessFormType });
  return message;
};

// Generate notification IDs
const generateNotificationId = async (prefix, table, client) => {
  try {
    logger.debug('Generating notification ID', { prefix, table });
    const result = await client.query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(4, '0');
    const notificationId = `${prefix}${nextId}SOCP`;
    logger.debug('Notification ID generated successfully', { maxSerial, nextId, notificationId });
    return notificationId;
  } catch (error) {
    logger.error('Error generating notification ID', {
      error: error.message,
      stack: error.stack,
      prefix,
      table
    });
    throw new Error(`Error generating notification ID: ${error.message}`);
  }
};

// Validate NGD ID format
const isValidNGDId = (ngdId) => {
  const isValid = /^NGD\d{4,}$/.test(ngdId);
  logger.debug('NGD ID validation completed', { ngdId, isValid });
  return isValid;
};

// Validate email format
const isValidEmail = (email) => {
  const isValid = /^[^\s@]+@nagad\.com\.bd$/.test(email);
  logger.debug('Email validation completed', { email, isValid });
  return isValid;
};

// Validate mobile number format
const isValidMobileNumber = (mobile) => {
  const isValid = /^01[3-9]\d{8}$/.test(mobile);
  logger.debug('Mobile number validation completed', { mobile, isValid });
  return isValid;
};

// Validate access form type
const isValidAccessFormType = (accessFormType) => {
  const validTypes = ['Single', 'Multiple', 'CustomerService'];
  const isValid = accessFormType ? validTypes.includes(accessFormType) : true;
  logger.debug('Access form type validation completed', { accessFormType, isValid });
  return isValid;
};

// Process comma-separated values from Excel
const processCommaSeparatedValues = (value) => {
  logger.debug('Processing comma-separated values', { input: value });
  if (!value) {
    return [];
  }
  const processed = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  logger.debug('Comma-separated values processed', { input: value, output: processed });
  return processed;
};

// Safely release database client
const releaseClient = async (client) => {
  try {
    if (client.release && typeof client.release === 'function') {
      await client.release();
      logger.debug('Database client released successfully');
    } else if (client.end && typeof client.end === 'function') {
      await client.end();
      logger.debug('Database client ended successfully');
    } else {
      logger.warn('No release or end method available on client', { clientMethods: Object.keys(client) });
    }
  } catch (error) {
    logger.error('Error releasing database client', { error: error.message, stack: error.stack });
  }
};

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  logger.info('GET request received for access form tracker', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'AccessFormTracker',
      details: `User ${socPortalId} requesting access form tracker data`,
      userId: socPortalId,
      ipAddress,
      userAgent
    }
  });

  try {
    logger.debug('Fetching user info for access form tracker', { socPortalId });
    const userResponse = await query(
      'SELECT short_name FROM user_info WHERE soc_portal_id = $1',
      [socPortalId]
    );
    
    const userInfo = userResponse.rows[0];
    logger.info('User info fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AccessFormTracker',
        details: `User info retrieved for ${socPortalId}`,
        userId: socPortalId,
        userInfo
      }
    });
    
    return new Response(JSON.stringify({
      success: true,
      userInfo
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Error fetching user info for access form tracker', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AccessFormTracker',
        details: `Error fetching user info: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack
      }
    });
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch user info'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  logger.info('POST request received for access form tracker', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'AccessFormTracker',
      details: `User ${socPortalId} submitting access form data`,
      userId: socPortalId,
      ipAddress,
      userAgent
    }
  });

  try {
    const formData = await request.formData();
    const action = formData.get('action');
    
    logger.debug('Form data parsed', { action, hasFile: formData.has('file') });

    if (action === 'bulk-upload') {
      // Bulk upload logic remains the same as before
      // ... (keep the existing bulk upload code)
      
    } else {
      // Single form submission
      logger.info('Processing single access form submission', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'SingleAccessForm',
          details: `User ${socPortalId} submitting single access form`,
          userId: socPortalId
        }
      });
      
      const ngd_id = formData.get('ngd_id');
      const user_name = formData.get('user_name');
      const email = formData.get('email');
      const mobile_number = formData.get('mobile_number');
      const division = formData.get('division');
      const department = formData.get('department');
      const portal_name = formData.get('portal_name');
      const role = formData.get('role');
      const effective_date = formData.get('effective_date');
      const revoke_date = formData.get('revoke_date');
      const status = formData.get('status');
      const remark = formData.get('remark');
      const document = formData.get('document');
      const access_form_type = formData.get('access_form_type') || 'Single';
      const additional_info = formData.get('additional_info');
      
      logger.debug('Form data extracted for single submission', {
        ngd_id, user_name, email, mobile_number, division, department,
        portal_name, role, effective_date,
        revoke_date, status, remark, hasDocument: !!document, access_form_type, additional_info
      });

      // Validate required fields
      if (!ngd_id || !user_name || !email || !portal_name || !role || !effective_date || !status) {
        logger.warn('Single form validation failed - missing required fields', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'SingleAccessForm',
            details: 'Missing required fields in single form submission',
            userId: socPortalId,
            missingFields: {
              ngd_id: !ngd_id,
              user_name: !user_name,
              email: !email,
              portal_name: !portal_name,
              role: !role,
              effective_date: !effective_date,
              status: !status
            }
          }
        });
        
        return new Response(JSON.stringify({
          success: false,
          message: 'Missing required fields'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Validate NGD ID format
      if (!isValidNGDId(ngd_id)) {
        logger.warn('Single form validation failed - invalid NGD ID', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'SingleAccessForm',
            details: 'Invalid NGD ID format in single form submission',
            userId: socPortalId,
            ngd_id
          }
        });
        
        return new Response(JSON.stringify({
          success: false,
          message: 'Invalid NGD ID format. Must be like NGDXXXX'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Validate email format
      if (!isValidEmail(email)) {
        logger.warn('Single form validation failed - invalid email', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'SingleAccessForm',
            details: 'Invalid email format in single form submission',
            userId: socPortalId,
            email
          }
        });
        
        return new Response(JSON.stringify({
          success: false,
          message: 'Invalid email format. Must be @nagad.com.bd'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Validate mobile number format
      if (mobile_number && !isValidMobileNumber(mobile_number)) {
        logger.warn('Single form validation failed - invalid mobile number', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'SingleAccessForm',
            details: 'Invalid mobile number format in single form submission',
            userId: socPortalId,
            mobile_number
          }
        });
        
        return new Response(JSON.stringify({
          success: false,
          message: 'Invalid mobile number format'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Validate access form type
      if (!isValidAccessFormType(access_form_type)) {
        logger.warn('Single form validation failed - invalid access form type', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'SingleAccessForm',
            details: 'Invalid access form type in single form submission',
            userId: socPortalId,
            access_form_type
          }
        });
        
        return new Response(JSON.stringify({
          success: false,
          message: 'Invalid access form type. Must be one of: Single, Multiple, CustomerService'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Validate dates
      const dateErrors = validateDates(effective_date, revoke_date);
      if (Object.keys(dateErrors).length > 0) {
        logger.warn('Single form validation failed - invalid dates', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'SingleAccessForm',
            details: 'Invalid dates in single form submission',
            userId: socPortalId,
            dateErrors
          }
        });
        
        return new Response(JSON.stringify({
          success: false,
          message: 'Date validation failed',
          errors: dateErrors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const client = await getDbConnection();

      try {
        await client.query('BEGIN');
        logger.debug('Transaction started for single submission');

        // Get user info
        const userResponse = await client.query(
          'SELECT short_name FROM user_info WHERE soc_portal_id = $1',
          [socPortalId]
        );
        
        const userInfo = userResponse.rows[0];
        logger.debug('User info fetched in transaction', { userInfo });
        
        // Generate AF tracking ID
        const afTrackingId = await generateAFTrackingId(client);
        logger.debug('AF tracking ID generated in transaction', { afTrackingId });
        
        // Handle document upload
let documentLocation = null;
if (document && document.size > 0) {
  logger.debug('Processing document upload', {
    fileName: document.name,
    fileSize: document.size,
    fileType: document.type
  });
  
  if (document.type !== 'application/pdf') {
    logger.warn('Document upload failed - invalid file type', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SingleAccessForm',
        details: 'Invalid document type in single form submission',
        userId: socPortalId,
        fileType: document.type
      }
    });
    
    throw new Error('Only PDF files are allowed');
  }
  
  // UPDATED: Change to new storage location
  const uploadDir = path.join(process.cwd(), 'storage', 'access_form');
  const fileName = `${afTrackingId}_V1.pdf`;
  const filePath = path.join(uploadDir, fileName);
  
  logger.info('Document upload initiated with new storage location', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'DocumentUpload',
      details: `Uploading document to new storage location: ${uploadDir}`,
      userId: socPortalId,
      fileName: fileName,
      filePath: filePath
    }
  });
  
  try {
    // Ensure directory exists with proper permissions
    try {
      await access(uploadDir);
      logger.debug('Directory already exists');
    } catch (error) {
      logger.debug('Creating directory:', uploadDir);
      await mkdir(uploadDir, { recursive: true, mode: 0o755 });
    }
    
    const arrayBuffer = await document.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);
    
    // Set proper permissions
    await chmod(filePath, 0o644);
    
    // Change ownership to nginx user
    try {
      const { execSync } = require('child_process');
      const nginxUid = execSync('id -u nginx').toString().trim();
      const nginxGid = execSync('id -g nginx').toString().trim();
      
      await chown(filePath, parseInt(nginxUid), parseInt(nginxGid));
      logger.debug('Document ownership changed to nginx', {
        nginxUid,
        nginxGid
      });
    } catch (chownError) {
      logger.warn('Could not change document ownership', {
        error: chownError.message
      });
    }
    
    // Force file system sync
    try {
      const { execSync } = require('child_process');
      execSync('sync', { stdio: 'inherit' });
      logger.debug('File system synced');
    } catch (syncError) {
      logger.warn('File system sync failed:', syncError.message);
    }
    
    // UPDATED: Return API route URL instead of direct storage URL
    documentLocation = `/api/storage/access_form/${fileName}`;
    
    logger.info('Document uploaded successfully to new location', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DocumentUpload',
        details: 'Document uploaded successfully to new storage location',
        userId: socPortalId,
        documentLocation: documentLocation,
        afTrackingId: afTrackingId
      }
    });
  } catch (error) {
    logger.error('Document upload failed', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DocumentUpload',
        details: `Document upload failed: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack
      }
    });
    
    throw new Error('Failed to save document');
  }
}
        
        // Determine status based on revoke date
        const finalStatus = determineStatus(status, revoke_date);
        
        // Insert into access_form_tracker
        const insertQuery = `
          INSERT INTO access_form_tracker (
            af_tracking_id, ngd_id, user_name, email, mobile_number, division, 
            department, portal_name, role, effective_date, revoke_date, 
            status, remark, document_location, track_by, access_form_type, additional_info
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `;
        
        await client.query(insertQuery, [
          afTrackingId,
          ngd_id,
          user_name,
          email,
          mobile_number,
          division,
          department,
          portal_name,
          role,
          effective_date,
          revoke_date || null,
          finalStatus,
          remark,
          documentLocation,
          userInfo.short_name,
          access_form_type,
          additional_info || null
        ]);
        
        logger.info('Access form record inserted in transaction', {
          afTrackingId,
          access_form_type
        });
        
        // Create audit trail entry
        const auditInfo = `Access Form Added With Portal: ${portal_name} Role: ${role}`;
        
        await client.query(
          `INSERT INTO access_form_audit_trail 
           (af_tracking_id, version, action_type, audit_info, document_location, updated_by, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            afTrackingId,
            1,
            'CREATE',
            auditInfo,
            documentLocation,
            userInfo.short_name,
            ipAddress,
            userAgent
          ]
        );
        
        logger.debug('Audit trail added for single submission', { afTrackingId, auditInfo });
        
        // Create notifications
        const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details', client);
        const userNotificationId = await generateNotificationId('UN', 'user_notification_details', client);
        
        await client.query(
          'INSERT INTO admin_notification_details (notification_id, title, status) VALUES ($1, $2, $3)',
          [
            adminNotificationId,
            `New Access Form Added: ${user_name} (${afTrackingId}) By ${userInfo.short_name}`,
            'Unread'
          ]
        );
        
        await client.query(
          'INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id) VALUES ($1, $2, $3, $4)',
          [
            userNotificationId,
            `Added New Access Form: ${user_name} (${afTrackingId})`,
            'Unread',
            socPortalId
          ]
        );
        
        // Log activity
        await client.query(
          'INSERT INTO user_activity_log (soc_portal_id, action, description, eid, sid, ip_address, device_info) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [
            socPortalId,
            'ADD_ACCESS_FORM',
            `Added access form for ${user_name} (${afTrackingId})`,
            eid,
            sessionId,
            ipAddress,
            userAgent
          ]
        );
        
        // Send Telegram alert
        const telegramMessage = formatAccessFormAlert(
          afTrackingId,
          ngd_id,
          user_name,
          portal_name,
          role,
          effective_date,
          finalStatus,
          ipAddress,
          userAgent,
          {
            eid,
            userId: socPortalId,
            email,
            mobileNumber: mobile_number,
            division,
            department,
            revokeDate: revoke_date || 'N/A',
            remark,
            trackedBy: userInfo.short_name,
            accessFormType: access_form_type,
            additionalInfo: additional_info || 'N/A'
          }
        );
        
        await sendTelegramAlert(telegramMessage);
        
        logger.info('Single access form submission completed successfully', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'SingleAccessForm',
            details: 'Single access form submission completed',
            userId: socPortalId,
            afTrackingId,
            accessFormType: access_form_type
          }
        });
        
        await client.query('COMMIT');
        logger.debug('Transaction committed for single submission');
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Access form added successfully',
          af_tracking_id: afTrackingId
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Transaction rolled back for single submission', {
          error: error.message,
          stack: error.stack
        });
        throw error;
      } finally {
        await releaseClient(client);
      }
    }
  } catch (error) {
    logger.error('Error in access form tracker', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AccessFormTracker',
        details: `Unexpected error: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack
      }
    });
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}