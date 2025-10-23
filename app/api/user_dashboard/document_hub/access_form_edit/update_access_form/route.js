// app/api/user_dashboard/document_hub/access_form_edit/update_access_form/route.js
import { query, getDbConnection } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';
import sendTelegramAlert from '../../../../../../lib/telegramAlert';
import { generateAuditMessage, validateDates, determineStatus } from '../../../../../../lib/auditUtils';
import { writeFile, mkdir, readdir } from 'fs/promises';
import path from 'path';
import { createNotifications } from '../../../../../../lib/notificationUtils';

// Helper function to escape special characters for RegExp
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Format Telegram alert for access form update
const formatAccessFormUpdateAlert = (afTrackingId, ngdId, userName, portalNames, roles, effectiveDate, status, ipAddress, userAgent, additionalInfo = {}) => {
  const time = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
  const userId = additionalInfo.userId || 'N/A';
  const eid = additionalInfo.eid || 'N/A';
  const email = additionalInfo.email || 'N/A';
  const mobileNumber = additionalInfo.mobileNumber || 'N/A';
  const division = additionalInfo.division || 'N/A';
  const department = additionalInfo.department || 'N/A';
  const revokeDate = additionalInfo.revokeDate || 'N/A';
  const remark = additionalInfo.remark || 'N/A';
  const trackedBy = additionalInfo.trackedBy || 'N/A';
  const updatedBy = additionalInfo.updatedBy || 'N/A';
  const accessFormType = additionalInfo.accessFormType || 'Not specified';
  const additionalInfoText = additionalInfo.additionalInfo || 'N/A';
  
  const message = `📋 SOC PORTAL | ACCESS FORM UPDATED 📋
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
👤 Originally Tracked By: ${trackedBy}
👤 Updated By        : ${updatedBy}
🌐 IP Address        : ${ipAddress}
🖥️ Device Info       : ${userAgent}
🔖 EID               : ${eid}
🕒 Update Time       : ${time}`;
  
  return message;
};

// Get next version number for document
const getNextDocumentVersion = async (afTrackingId) => {
  const uploadDir = '/home/soc_portal/public/storage/access_form';
  
  try {
    const escapedAfTrackingId = escapeRegExp(afTrackingId);
    const files = await readdir(uploadDir).catch((err) => {
      console.warn('Failed to read directory:', err.message);
      return [];
    });
    
    const pattern = new RegExp(`^${escapedAfTrackingId}_V(\\d+)\\.pdf$`);
    
    let maxVersion = 0;
    for (const file of files) {
      const match = file.match(pattern);
      if (match) {
        const version = parseInt(match[1], 10);
        if (version > maxVersion) {
          maxVersion = version;
        }
      }
    }
    
    console.debug(`Next version for ${afTrackingId}: ${maxVersion + 1}`);
    return maxVersion + 1;
  } catch (error) {
    console.warn('Error in getNextDocumentVersion:', error.message);
    return 1;
  }
};

// Validate access form type
const isValidAccessFormType = (accessFormType) => {
  const validTypes = ['Single', 'Multiple', 'CustomerService'];
  const isValid = accessFormType ? validTypes.includes(accessFormType) : true;
  console.debug('Access form type validation completed', { accessFormType, isValid });
  return isValid;
};

// Validate NGD ID format
const isValidNGDId = (ngdId) => {
  const isValid = /^NGD\d{4,}$/.test(ngdId);
  console.debug('NGD ID validation completed', { ngdId, isValid });
  return isValid;
};

// Validate email format
const isValidEmail = (email) => {
  const isValid = /^[^\s@]+@nagad\.com\.bd$/.test(email);
  console.debug('Email validation completed', { email, isValid });
  return isValid;
};

// Validate mobile number format
const isValidMobileNumber = (mobile) => {
  const isValid = /^01[3-9]\d{8}$/.test(mobile);
  console.debug('Mobile number validation completed', { mobile, isValid });
  return isValid;
};

// Safely release database client
const releaseClient = async (client) => {
  try {
    if (client.release && typeof client.release === 'function') {
      await client.release();
      console.debug('Database client released successfully');
    } else if (client.end && typeof client.end === 'function') {
      await client.end();
      console.debug('Database client ended successfully');
    } else {
      console.warn('No release or end method available on client', { clientMethods: Object.keys(client) });
    }
  } catch (error) {
    console.error('Error releasing database client:', error.message);
    logger.error('Error releasing database client', { error: error.message, stack: error.stack });
  }
};

export async function POST(request) {
  console.log('Received POST request for access form update at', new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  logger.info('Access form update request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'AccessFormUpdate',
      details: `User ${socPortalId} updating access form`,
      userId: socPortalId,
      ipAddress,
      userAgent
    }
  });

  let client;
  try {
    // Acquire database client
    client = await getDbConnection();
    await client.query('BEGIN'); // Start transaction

    const formData = await request.formData();
    console.debug('Parsed form data:', Object.fromEntries(formData));
    
    const action = formData.get('action');
    const af_tracking_id = formData.get('af_tracking_id');
    const ngd_id = formData.get('ngd_id');
    const user_name = formData.get('user_name');
    const email = formData.get('email');
    const mobile_number = formData.get('mobile_number');
    const division = formData.get('division');
    const department = formData.get('department');
    const portal_name = formData.get('portal_name');
    const custom_portal_name = formData.get('custom_portal_name');
    const role = formData.get('role');
    const custom_role = formData.get('custom_role');
    const effective_date = formData.get('effective_date');
    const revoke_date = formData.get('revoke_date');
    const status = formData.get('status');
    const remark = formData.get('remark');
    const document = formData.get('document');
    const access_form_type = formData.get('access_form_type');
    const additional_info = formData.get('additional_info');
    const audit_remark = formData.get('audit_remark') || '';
    const finalEffectiveDate = effective_date || currentForm.effective_date;

    console.log('Form data received:', {
      af_tracking_id,
      ngd_id,
      user_name,
      email,
      audit_remark, // Log the audit remark
      // ... other fields
    });
    
    // Validate required fields
    if (!af_tracking_id || !ngd_id || !user_name || !email || !portal_name || !role || !effective_date || !status) {
      console.warn('Missing required fields in form data');
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Additional validations
    if (!isValidNGDId(ngd_id)) {
      console.warn('Invalid NGD ID format:', ngd_id);
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid NGD ID format. Must be like NGDXXXX'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!isValidEmail(email)) {
      console.warn('Invalid email format:', email);
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid email format. Must be @nagad.com.bd'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (mobile_number && !isValidMobileNumber(mobile_number)) {
      console.warn('Invalid mobile number format:', mobile_number);
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid mobile number format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!isValidAccessFormType(access_form_type)) {
      console.warn('Invalid access form type:', access_form_type);
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid access form type. Must be one of: Single, Multiple, CustomerService'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate dates
    const dateErrors = validateDates(finalEffectiveDate, revoke_date);
if (Object.keys(dateErrors).length > 0) {
  console.warn('Date validation failed:', dateErrors);
  await client.query('ROLLBACK');
  return new Response(JSON.stringify({
    success: false,
    message: 'Date validation failed',
    errors: dateErrors
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

    if (action !== 'update') {
      console.warn('Invalid action:', action);
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid action'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get user info
    console.log('Fetching user info for socPortalId:', socPortalId);
    const userResponse = await client.query(
      'SELECT short_name FROM user_info WHERE soc_portal_id = $1',
      [socPortalId]
    );
    
    const userInfo = userResponse.rows[0];
    if (!userInfo) {
      console.warn('User not found for socPortalId:', socPortalId);
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({
        success: false,
        message: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.debug('Fetched user info:', userInfo);
    
    // Get current form data
    console.log('Fetching current form data for af_tracking_id:', af_tracking_id);
    const currentFormResponse = await client.query(
      'SELECT * FROM access_form_tracker WHERE af_tracking_id = $1',
      [af_tracking_id]
    );
    
    if (currentFormResponse.rows.length === 0) {
      console.warn('Access form not found for af_tracking_id:', af_tracking_id);
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({
        success: false,
        message: 'Access form not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const currentForm = currentFormResponse.rows[0];
    console.debug('Fetched current form data:', currentForm);
    
    // Determine final status based on revoke date
    const finalStatus = determineStatus(status, revoke_date);
    
    // Handle document upload
    let documentLocation = currentForm.document_location;
    let nextVersion = 1;
    
    if (document && document.size > 0) {
      console.log('Processing new document upload');
      if (document.type !== 'application/pdf') {
        console.warn('Invalid document type:', document.type);
        await client.query('ROLLBACK');
        return new Response(JSON.stringify({
          success: false,
          message: 'Only PDF files are allowed'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Get next version number
      const versionResult = await client.query(
        'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM access_form_audit_trail WHERE af_tracking_id = $1',
        [af_tracking_id]
      );
      nextVersion = versionResult.rows[0].next_version;
      
      const uploadDir = '/home/soc_portal/public/storage/access_form';
      const fileName = `${af_tracking_id}_V${nextVersion}.pdf`;
      const filePath = path.join(uploadDir, fileName);
      
      try {
        await mkdir(uploadDir, { recursive: true });
        const arrayBuffer = await document.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await writeFile(filePath, buffer);
        documentLocation = `/storage/access_form/${fileName}`;
        console.log('Document uploaded successfully to:', documentLocation);
      } catch (error) {
        console.error('Document upload failed:', error);
        logger.error('Document upload failed during update', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'AccessFormUpdate',
            details: `Document upload failed: ${error.message}`,
            userId: socPortalId,
            error: error.message,
            stack: error.stack
          }
        });
        await client.query('ROLLBACK');
        return new Response(JSON.stringify({
          success: false,
          message: 'Failed to save document'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      // If no new document, get the next version for audit trail
      const versionResult = await client.query(
          'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM access_form_audit_trail WHERE af_tracking_id = $1',
          [af_tracking_id]
        );
        nextVersion = versionResult.rows[0].next_version;
        
        // For audit trail, set document_location to null when no document is uploaded
        documentLocation = null;
      }
    
    // Determine final portal names and roles
    let finalPortalNames = portal_name;
    if (custom_portal_name) {
      finalPortalNames = custom_portal_name;
    }
    
    let finalRoles = role;
    if (custom_role) {
      finalRoles = custom_role;
    }
    
    // Prepare new data for comparison
    const newData = {
      ngd_id,
      user_name,
      email,
      mobile_number,
      division,
      department,
      portal_name: finalPortalNames,
      role: finalRoles,
      effective_date,
      revoke_date: revoke_date || null,
      status: finalStatus,
      remark,
      access_form_type,
      additional_info
    };
    
    // Generate audit message
    const auditMessage = generateAuditMessage(currentForm, newData);
    
    // Update the record
    console.log('Updating access form tracker in DB');
    const updateQuery = `
  UPDATE access_form_tracker 
  SET 
    ngd_id = $1,
    user_name = $2,
    email = $3,
    mobile_number = $4,
    division = $5,
    department = $6,
    portal_name = $7,
    role = $8,
    revoke_date = $9,
    status = $10,
    remark = $11,
    document_location = $12,
    access_form_type = $13,
    additional_info = $14,
    updated_at = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::timestamp
  WHERE af_tracking_id = $15
`;

await client.query(updateQuery, [
  ngd_id,
  user_name,
  email,
  mobile_number,
  division,
  department,
  finalPortalNames,
  finalRoles,
  revoke_date || null,
  finalStatus,
  remark,
  documentLocation,
  access_form_type,
  additional_info,
  af_tracking_id
]);
    console.log('DB update successful for af_tracking_id:', af_tracking_id);
    
    // Insert into audit trail
    await client.query(
  `INSERT INTO access_form_audit_trail 
   (af_tracking_id, version, action_type, audit_info, document_location, updated_by, ip_address, user_agent, audit_remark, effective_date, created_at, updated_at)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::timestamp, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::timestamp)`,
  [
    af_tracking_id,
    nextVersion,
    'UPDATE',
    auditMessage,
    documentLocation,
    userInfo.short_name,
    ipAddress,
    userAgent,
    audit_remark,
    effective_date // This is the version-specific effective date
  ]
);

try {
  const updateNotificationTitle = `Access Form Updated: ${user_name} (${af_tracking_id}) By ${userInfo.short_name}`;
  await createNotifications(client, socPortalId, updateNotificationTitle, userInfo);
  console.log('Notifications created for access form update');
} catch (error) {
  console.error('Failed to create notifications, but continuing with update:', error);
  // Don't throw error here to avoid breaking the main transaction
}

console.log('Notifications created for access form update');


console.log('Audit trail inserted with remark:', audit_remark);
    console.log('Audit trail inserted for version:', nextVersion);
    
    // Log activity
    console.log('Logging activity to user_activity_log');
    await client.query(
      'INSERT INTO user_activity_log (soc_portal_id, action, description, eid, sid, ip_address, device_info) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        socPortalId,
        'UPDATE_ACCESS_FORM',
        `Updated access form for ${user_name} (${af_tracking_id})`,
        eid,
        sessionId,
        ipAddress,
        userAgent
      ]
    );
    console.log('Activity logged successfully');
    
    // Send Telegram alert
    const telegramMessage = formatAccessFormUpdateAlert(
      af_tracking_id,
      ngd_id,
      user_name,
      finalPortalNames,
      finalRoles,
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
        trackedBy: currentForm.track_by,
        updatedBy: userInfo.short_name,
        accessFormType: access_form_type,
        additionalInfo: additional_info || 'N/A'
      }
    );
    
    await sendTelegramAlert(telegramMessage);
    console.log('Telegram alert sent successfully');
    
    await client.query('COMMIT');
    console.log('Transaction committed successfully');
    
    logger.info('Access form updated successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AccessFormUpdate',
        details: `Access form ${af_tracking_id} updated successfully`,
        userId: socPortalId,
        af_tracking_id
      }
    });
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Access form updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error updating access form:', error);
    logger.error('Error updating access form', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AccessFormUpdate',
        details: `Error: ${error.message}. Full form data: ${JSON.stringify(Object.fromEntries(formData || new Map()))}`,
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
  } finally {
    if (client) {
      await releaseClient(client);
    }
  }
}