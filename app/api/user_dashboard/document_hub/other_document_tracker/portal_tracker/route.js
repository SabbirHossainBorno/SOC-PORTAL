// app/api/user_dashboard/document_hub/other_document_tracker/portal_tracker/route.js
import { getDbConnection } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';
import sendTelegramAlert from '../../../../../../lib/telegramAlert';
import { getCurrentDateTime } from '../../../../../../lib/auditUtils';

// Generate Portal Tracking ID in correct format: PT1SOCP, PT2SOCP, PT10SOCP, PT100SOCP, etc.
const generatePortalTrackingId = async (client) => {
  try {
    logger.debug('Starting portal tracking ID generation', {
      meta: {
        taskName: 'PortalTracker',
        details: 'Querying MAX serial from portal_info table'
      }
    });
    
    const result = await client.query('SELECT MAX(serial) AS max_serial FROM portal_info');
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = maxSerial + 1;
    const portalTrackingId = `PT${nextId}SOCP`;
    
    logger.debug('Portal tracking ID generated successfully', {
      meta: {
        taskName: 'PortalTracker',
        details: `Generated ID: ${portalTrackingId}, Previous max serial: ${maxSerial}`
      }
    });
    
    return portalTrackingId;
  } catch (error) {
    logger.error('Error generating portal tracking ID', {
      error: error.message,
      stack: error.stack,
      meta: {
        taskName: 'PortalTracker',
        details: 'Failed to generate portal tracking ID'
      }
    });
    throw new Error(`Error generating portal tracking ID: ${error.message}`);
  }
};

// Format Telegram alert for Portal tracker
const formatPortalTrackerAlert = (portalTrackingId, portalCategory, portalName, portalUrl, userIdentifier, role, additionalInfo = {}) => {
  const time = getCurrentDateTime();
  const userId = additionalInfo.userId || 'N/A';
  const eid = additionalInfo.eid || 'N/A';
  const trackedBy = additionalInfo.trackedBy || 'N/A';
  const ipAddress = additionalInfo.ipAddress || 'N/A';
  const userAgent = additionalInfo.userAgent || 'N/A';
  const remark = additionalInfo.remark || 'N/A';
  
  const message = `🌐 SOC PORTAL | PORTAL TRACKER 🌐
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 Portal ID          : ${portalTrackingId}
📁 Category           : ${portalCategory}
🏷️ Portal Name        : ${portalName}
🔗 Portal URL         : ${portalUrl}
👤 User ID            : ${userIdentifier}
🎯 Role               : ${role}
📝 Remark             : ${remark}
👤 Tracked By         : ${trackedBy}
👤 Reported By        : ${userId}
🌐 IP Address         : ${ipAddress}
🖥️ Device Info        : ${userAgent}
🔖 EID                : ${eid}
🕒 Report Time        : ${time}`;
  
  return message;
};

// Generate notification IDs
const generateNotificationId = async (prefix, table, client) => {
  try {
    logger.debug('Starting notification ID generation', {
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

export async function POST(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  const requestStartTime = Date.now();
  
  logger.info('Portal tracker submission request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'PortalTracker',
      details: `User ${socPortalId} submitting portal information | IP: ${ipAddress} | User Agent: ${userAgent?.substring(0, 50)}...`
    }
  });

  let client;
  try {
    logger.debug('Parsing request JSON body', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: 'Starting JSON parsing'
      }
    });
    
    const formData = await request.json();
    
    logger.debug('Portal tracker form data received and parsed', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: `Form fields - Portal: ${formData.portal_name}, URL: ${formData.portal_url?.substring(0, 30)}..., Category: ${formData.portal_category}`
      }
    });

    // Validate required fields
    logger.debug('Starting form validation', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: 'Validating required fields'
      }
    });
    
    const missingFields = [];
    if (!formData.portal_category) missingFields.push('Portal Category');
    if (!formData.portal_name) missingFields.push('Portal Name');
    if (!formData.portal_url) missingFields.push('Portal URL');
    if (!formData.role) missingFields.push('Role');

    if (missingFields.length > 0) {
      logger.warn('Portal tracker validation failed - missing required fields', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'PortalTracker',
          details: `Missing required fields: ${missingFields.join(', ')}`,
          userId: socPortalId,
          missingFields
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const processedData = {
      ...formData,
      user_identifier: formData.user_identifier?.trim() || 'Individual',
      password: formData.password?.trim() || 'Individual'
    };

    // Validate URL format
    logger.debug('Validating URL format', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: `URL: ${formData.portal_url}`
      }
    });
    
    try {
      new URL(formData.portal_url);
    } catch {
      logger.warn('URL validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'PortalTracker',
          details: `Invalid URL format: ${formData.portal_url}`
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Please enter a valid URL including protocol (http:// or https://)'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.debug('Connecting to database and starting transaction', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: 'Acquiring database connection'
      }
    });
    
    client = await getDbConnection().connect();
    await client.query(`SET TIME ZONE 'Asia/Dhaka';`);
    await client.query('BEGIN');

    logger.debug('Querying user information', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: `Looking up user with SOC Portal ID: ${socPortalId}`
      }
    });
    
    // Get user info
    const userResponse = await client.query(
      'SELECT short_name FROM user_info WHERE soc_portal_id = $1',
      [socPortalId]
    );
    
    const userInfo = userResponse.rows[0];
    if (!userInfo) {
      logger.warn('User not found in database', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'PortalTracker',
          details: `No user found with SOC Portal ID: ${socPortalId}`
        }
      });
      
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({
        success: false,
        message: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.debug('User found successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: `User short_name: ${userInfo.short_name}`
      }
    });

    // Check for duplicate Portal URL + Role + User combination
logger.debug('Checking for duplicate Portal URL, Role and User combination', {
  meta: {
    eid,
    sid: sessionId,
    taskName: 'PortalTracker',
    details: `Checking URL: ${formData.portal_url}, Role: ${formData.role}, User: ${formData.user_identifier}`
  }
});

  // Update the duplicate check to handle "Individual" values
  const userIdentifierForDuplicateCheck = processedData.user_identifier;
  const duplicateCheck = await client.query(
    'SELECT pt_id, portal_name FROM portal_info WHERE portal_url = $1 AND role = $2 AND user_identifier = $3',
    [processedData.portal_url, processedData.role, userIdentifierForDuplicateCheck]
  );

if (duplicateCheck.rows.length > 0) {
  logger.warn('Duplicate Portal URL, Role and User combination found', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'PortalTracker',
      details: `Portal URL ${formData.portal_url} with role ${formData.role} and user ${formData.user_identifier} already exists in Portal ${duplicateCheck.rows[0].pt_id}`
    }
  });
  
  await client.query('ROLLBACK');
  return new Response(JSON.stringify({
    success: false,
    message: `Portal URL with the same role and user identifier already exists in Portal ${duplicateCheck.rows[0].pt_id}`
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

    // Generate Portal tracking ID in correct format: PT01SOCP, PT02SOCP, etc.
    const portalTrackingId = await generatePortalTrackingId(client);

    logger.debug('Inserting portal information into database', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: `Inserting portal with tracking ID: ${portalTrackingId}`
      }
    });
    
    // Insert into portal_info table
    const insertQuery = `
      INSERT INTO portal_info (
        pt_id, portal_category, portal_name, portal_url, 
        user_identifier, password, role, remark, track_by
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    // Use processedData instead of formData for the insert
const insertParams = [
  portalTrackingId,
  processedData.portal_category,
  processedData.portal_name,
  processedData.portal_url,
  processedData.user_identifier, // This will be "Individual" if empty
  processedData.password, // This will be "Individual" if empty
  processedData.role,
  processedData.remark || null,
  userInfo.short_name
];
    
    logger.debug('Portal insert parameters prepared', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: `Insert params - Name: ${formData.portal_name}, URL: ${formData.portal_url}, Category: ${formData.portal_category}`
      }
    });
    
    await client.query(insertQuery, insertParams);

    logger.info('Portal information inserted successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: `Portal information saved with ID: ${portalTrackingId} | Name: ${formData.portal_name} | URL: ${formData.portal_url} | Category: ${formData.portal_category}`,
        userId: socPortalId,
        portalTrackingId
      }
    });

    // Create notifications
    logger.debug('Generating notification IDs', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: 'Creating admin and user notifications'
      }
    });
    
    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details', client);
    const userNotificationId = await generateNotificationId('UN', 'user_notification_details', client);

    logger.debug('Inserting admin notification', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: `Admin notification ID: ${adminNotificationId}`
      }
    });
    
    await client.query(
      'INSERT INTO admin_notification_details (notification_id, title, status) VALUES ($1, $2, $3)',
      [
        adminNotificationId,
        `New Portal Tracked: ${formData.portal_name} (${portalTrackingId}) By ${userInfo.short_name}`,
        'Unread'
      ]
    );

    logger.debug('Inserting user notification', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: `User notification ID: ${userNotificationId}`
      }
    });
    
    await client.query(
      'INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id) VALUES ($1, $2, $3, $4)',
      [
        userNotificationId,
        `Portal Tracked: ${formData.portal_name} (${portalTrackingId})`,
        'Unread',
        socPortalId
      ]
    );

    // Log activity
    logger.debug('Logging user activity', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: `Activity: ADD_PORTAL_TRACKER for ${portalTrackingId}`
      }
    });
    
    await client.query(
      'INSERT INTO user_activity_log (soc_portal_id, action, description, eid, sid, ip_address, device_info) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        socPortalId,
        'ADD_PORTAL_TRACKER',
        `Added portal tracker for ${formData.portal_name} (${portalTrackingId})`,
        eid,
        sessionId,
        ipAddress,
        userAgent
      ]
    );

    // Send Telegram alert (without password for security)
    logger.debug('Preparing Telegram alert', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: 'Formatting Telegram message'
      }
    });
    
    const telegramMessage = formatPortalTrackerAlert(
      portalTrackingId,
      formData.portal_category,
      formData.portal_name,
      formData.portal_url,
      formData.user_identifier,
      formData.role,
      {
        userId: socPortalId,
        eid,
        trackedBy: userInfo.short_name,
        ipAddress,
        userAgent,
        remark: formData.remark
      }
    );

    logger.debug('Sending Telegram alert', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: `Telegram message length: ${telegramMessage.length} characters`
      }
    });
    
    await sendTelegramAlert(telegramMessage);

    logger.debug('Committing transaction', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: 'Finalizing database transaction'
      }
    });
    
    await client.query('COMMIT');

    const requestDuration = Date.now() - requestStartTime;
    
    logger.info('Portal tracker submission completed successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: `Portal tracker submission completed in ${requestDuration}ms | Portal ID: ${portalTrackingId} | User: ${socPortalId}`,
        userId: socPortalId,
        portalTrackingId,
        duration: requestDuration
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Portal information saved successfully',
      portal_tracking_id: portalTrackingId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorDuration = Date.now() - requestStartTime;
    
    if (client) {
      logger.debug('Rolling back transaction due to error', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'PortalTracker',
          details: 'Database rollback initiated'
        }
      });
      
      await client.query('ROLLBACK');
    }
    
    logger.error('Error in portal tracker submission', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTracker',
        details: `Unexpected error after ${errorDuration}ms: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack,
        duration: errorDuration
      }
    });

    let errorMessage = 'Internal server error';
    if (error.message.includes('duplicate key')) {
      errorMessage = 'Portal with this URL already exists';
    } else if (error.message.includes('connection') || error.message.includes('timeout')) {
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
        client.release();
        logger.debug('Database connection released', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'PortalTracker',
            details: 'Database client released successfully'
          }
        });
      } catch (releaseError) {
        logger.error('Error releasing database client', {
          error: releaseError.message,
          meta: {
            eid,
            sid: sessionId,
            taskName: 'PortalTracker',
            details: 'Failed to release database connection'
          }
        });
      }
    }
  }
}

// Duplicate check endpoint
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const role = searchParams.get('role');
  const user = searchParams.get('user');

  // If we have all three parameters, it's a duplicate check
  if (url && role && user) {
    let client;
    try {
      client = await getDbConnection().connect();
      
      const result = await client.query(
        'SELECT pt_id, portal_name, portal_url, role, user_identifier FROM portal_info WHERE portal_url = $1 AND role = $2 AND user_identifier = $3',
        [url, role, user]
      );
      
      return new Response(JSON.stringify({
        exists: result.rows.length > 0,
        existingPortal: result.rows[0] || null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      logger.error('Error checking duplicate portal combination', {
        error: error.message,
        meta: {
          taskName: 'PortalTracker',
          details: `Failed to check duplicate for URL: ${url}, Role: ${role}, User: ${user}`
        }
      });
      
      return new Response(JSON.stringify({
        exists: false,
        existingPortal: null
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // If not a duplicate check, return method not allowed or empty response
  return new Response(JSON.stringify({
    success: false,
    message: 'Method not allowed'
  }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}