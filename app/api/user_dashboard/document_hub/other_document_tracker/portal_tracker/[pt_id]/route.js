// app/api/user_dashboard/document_hub/other_document_tracker/portal_tracker/[pt_id]/route.js
import { query, getDbConnection } from '../../../../../../../lib/db';
import logger from '../../../../../../../lib/logger';
import sendTelegramAlert from '../../../../../../../lib/telegramAlert';

// Generate notification IDs
const generateNotificationId = async (prefix, table, client) => {
  try {
    logger.debug('Generating notification ID', {
      meta: {
        taskName: 'PortalTracker',
        details: `Generating ${prefix} ID for table: ${table}`
      }
    });
    
    const result = await client.query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(4, '0');
    const notificationId = `${prefix}${nextId}SOCP`;
    
    logger.debug('Notification ID generated successfully', {
      meta: {
        taskName: 'PortalTracker',
        details: `Generated ${prefix} ID: ${notificationId}, Previous max serial: ${maxSerial}`
      }
    });
    
    return notificationId;
  } catch (error) {
    logger.error('Error generating notification ID', {
      error: error.message,
      stack: error.stack,
      prefix,
      table,
      meta: {
        taskName: 'PortalTracker',
        details: `Failed to generate ${prefix} notification ID`
      }
    });
    throw new Error(`Error generating notification ID: ${error.message}`);
  }
};

// Format Telegram alert for Portal tracker update
const formatPortalUpdateAlert = (portalTrackingId, portalName, portalUrl, role, updatedFields, additionalInfo = {}) => {
  const time = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const userId = additionalInfo.userId || 'N/A';
  const eid = additionalInfo.eid || 'N/A';
  const updatedBy = additionalInfo.updatedBy || 'N/A';
  const ipAddress = additionalInfo.ipAddress || 'N/A';
  const userAgent = additionalInfo.userAgent || 'N/A';
  
  const message = `🔄 SOC PORTAL | PORTAL TRACKER UPDATE 🔄
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 Portal ID          : ${portalTrackingId}
🏷️ Portal Name        : ${portalName}
🔗 Portal URL         : ${portalUrl}
🎯 Role               : ${role}
📝 Updated Fields     : ${updatedFields}
👤 Updated By         : ${updatedBy}
👤 Reported By        : ${userId}
🌐 IP Address         : ${ipAddress}
🖥️ Device Info        : ${userAgent}
🔖 EID                : ${eid}
🕒 Update Time        : ${time}`;
  
  return message;
};

export async function GET(request, { params }) {
  // Await the params first
  const { pt_id } = await params;
  
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';

  try {
    logger.info('Fetching single portal information', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GetPortalDetails',
        details: `Fetching portal: ${pt_id}`,
        userId: socPortalId
      }
    });

    const queryString = `
      SELECT 
        pt_id,
        portal_category,
        portal_name,
        portal_url,
        user_identifier,
        password,
        role,
        remark,
        track_by,
        created_at,
        updated_by,
        updated_at
      FROM portal_info 
      WHERE pt_id = $1
    `;

    const result = await query(queryString, [pt_id]);

    if (result.rows.length === 0) {
      logger.warn('Portal not found', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'GetPortalDetails',
          details: `Portal ${pt_id} not found`,
          userId: socPortalId
        }
      });

      return new Response(JSON.stringify({
        success: false,
        message: 'Portal not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const portal = result.rows[0];

    logger.info('Portal details fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GetPortalDetails',
        details: `Successfully fetched portal: ${pt_id}`,
        userId: socPortalId
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: portal
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Error fetching portal details', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GetPortalDetails',
        details: `Unexpected error: ${error.message}`,
        error: error.message,
        stack: error.stack
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch portal details',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(request, { params }) {
  // Await the params first
  const { pt_id } = await params;
  
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  const requestStartTime = Date.now();
  
  logger.info('Portal update request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'UpdatePortal',
      details: `User ${socPortalId} updating portal: ${pt_id}`,
      userId: socPortalId
    }
  });

  let client;
  try {
    const formData = await request.json();

    logger.debug('Portal update form data received', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdatePortal',
        details: `Update fields: ${Object.keys(formData).join(', ')}`
      }
    });

    // No required field validation - allow empty fields (will become "Individual")

    client = await getDbConnection();
    await client.query('BEGIN');

    // Get user info for updated_by field
    const userResponse = await client.query(
      'SELECT short_name FROM user_info WHERE soc_portal_id = $1',
      [socPortalId]
    );
    
    const userInfo = userResponse.rows[0];
    if (!userInfo) {
      await client.query('ROLLBACK');
      
      logger.warn('User not found during portal update', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UpdatePortal',
          details: `No user found with SOC Portal ID: ${socPortalId}`
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get current portal data for comparison and Telegram alert
    const currentPortalResponse = await client.query(
      'SELECT portal_name, portal_url, role, user_identifier, password, remark FROM portal_info WHERE pt_id = $1',
      [pt_id]
    );

    if (currentPortalResponse.rows.length === 0) {
      await client.query('ROLLBACK');
      
      logger.warn('Portal not found during update', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UpdatePortal',
          details: `Portal ${pt_id} not found for update`
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Portal not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const currentPortal = currentPortalResponse.rows[0];

    // Process data - convert empty fields to "Individual"
    const processedData = {
      user_identifier: formData.user_identifier?.trim() || 'Individual',
      password: formData.password?.trim() || 'Individual',
      remark: formData.remark || null
    };

    // Update portal information - only allowed fields
    const updateQuery = `
      UPDATE portal_info 
      SET 
        user_identifier = $1,
        password = $2,
        remark = $3,
        updated_by = $4,
        updated_at = NOW()
      WHERE pt_id = $5
      RETURNING *
    `;
    
    const updateParams = [
      processedData.user_identifier,
      processedData.password,
      processedData.remark,
      userInfo.short_name,
      pt_id
    ];

    const updateResult = await client.query(updateQuery, updateParams);

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      
      logger.warn('Portal not found during update', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UpdatePortal',
          details: `Portal ${pt_id} not found for update`
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Portal not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // === ADD USER NOTIFICATION SECTION ===
    logger.debug('Generating user notification for portal update', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdatePortal',
        details: `Creating user notification for portal ${pt_id}`
      }
    });
    
    const userNotificationId = await generateNotificationId('UN', 'user_notification_details', client);

    logger.debug('Inserting user notification', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdatePortal',
        details: `User notification ID: ${userNotificationId}`
      }
    });
    
    await client.query(
      'INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id) VALUES ($1, $2, $3, $4)',
      [
        userNotificationId,
        `Portal Updated: ${currentPortal.portal_name} (${pt_id})`,
        'Unread',
        socPortalId
      ]
    );

    logger.info('User notification created successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdatePortal',
        details: `User notification ${userNotificationId} created for portal update`,
        userId: socPortalId,
        portalTrackingId: pt_id
      }
    });
    // === END USER NOTIFICATION SECTION ===

    // Log activity
    await client.query(
      'INSERT INTO user_activity_log (soc_portal_id, action, description, eid, sid, ip_address, device_info) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        socPortalId,
        'UPDATE_PORTAL_TRACKER',
        `Updated portal tracker for ${pt_id}`,
        eid,
        sessionId,
        ipAddress,
        userAgent
      ]
    );

    // Send Telegram alert for update
    const updatedFields = [];
    if (currentPortal.user_identifier !== processedData.user_identifier) {
      updatedFields.push('User Identifier');
    }
    if (currentPortal.password !== processedData.password) {
      updatedFields.push('Password');
    }
    if (formData.remark !== undefined && formData.remark !== currentPortal.remark) {
      updatedFields.push('Remark');
    }

    const fieldsChanged = updatedFields.length > 0 ? updatedFields.join(', ') : 'No changes';
    
    const telegramMessage = formatPortalUpdateAlert(
      pt_id,
      currentPortal.portal_name,
      currentPortal.portal_url,
      currentPortal.role,
      fieldsChanged,
      {
        userId: socPortalId,
        eid,
        updatedBy: userInfo.short_name,
        ipAddress,
        userAgent
      }
    );

    await sendTelegramAlert(telegramMessage);

    await client.query('COMMIT');

    const requestDuration = Date.now() - requestStartTime;
    
    logger.info('Portal updated successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdatePortal',
        details: `Portal ${pt_id} updated successfully by ${userInfo.short_name} in ${requestDuration}ms`,
        userId: socPortalId,
        portalTrackingId: pt_id,
        duration: requestDuration
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Portal information updated successfully',
      data: updateResult.rows[0]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    
    const errorDuration = Date.now() - requestStartTime;
    
    logger.error('Error updating portal', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdatePortal',
        details: `Unexpected error after ${errorDuration}ms: ${error.message}`,
        error: error.message,
        stack: error.stack,
        duration: errorDuration
      }
    });

    let errorMessage = 'Failed to update portal information';
    if (error.message.includes('connection') || error.message.includes('timeout')) {
      errorMessage = 'Database connection error. Please try again.';
    }

    return new Response(JSON.stringify({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    if (client) {
      try {
        if (client.release) {
          await client.release();
        }
      } catch (error) {
        logger.error('Error releasing database client', {
          error: error.message,
          meta: {
            eid,
            sid: sessionId,
            taskName: 'UpdatePortal',
            details: 'Failed to release database connection'
          }
        });
      }
    }
  }
}