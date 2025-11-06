//app/api/user_dashboard/document_hub/other_document_tracker/sim_tracker/route.js
import { getDbConnection } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';
import sendTelegramAlert from '../../../../../../lib/telegramAlert';
import { getCurrentDateTime } from '../../../../../../lib/auditUtils';

// Generate SIM Tracking ID
const generateSimTrackingId = async (client) => {
  try {
    logger.debug('Starting SIM tracking ID generation', {
      meta: {
        taskName: 'SimTracker',
        details: 'Querying MAX serial from sim_info table'
      }
    });
    
    const result = await client.query('SELECT MAX(serial) AS max_serial FROM sim_info');
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(2, '0');
    const simTrackingId = `ST${nextId}SOCP`;
    
    logger.debug('SIM tracking ID generated successfully', {
      meta: {
        taskName: 'SimTracker',
        details: `Generated ID: ${simTrackingId}, Previous max serial: ${maxSerial}`
      }
    });
    
    return simTrackingId;
  } catch (error) {
    logger.error('Error generating SIM tracking ID', {
      error: error.message,
      stack: error.stack,
      meta: {
        taskName: 'SimTracker',
        details: 'Failed to generate SIM tracking ID'
      }
    });
    throw new Error(`Error generating SIM tracking ID: ${error.message}`);
  }
};

// Format Telegram alert for SIM tracker
const formatSimTrackerAlert = (simTrackingId, msisdn, mno, assignedPersona, profileType, msisdnStatus, deviceTag, additionalInfo = {}) => {
  const time = getCurrentDateTime();
  const userId = additionalInfo.userId || 'N/A';
  const eid = additionalInfo.eid || 'N/A';
  const trackedBy = additionalInfo.trackedBy || 'N/A';
  const ipAddress = additionalInfo.ipAddress || 'N/A';
  const userAgent = additionalInfo.userAgent || 'N/A';
  const handedOver = additionalInfo.handedOver || 'N/A';
  const handoverDate = additionalInfo.handoverDate || 'N/A';
  const returnDate = additionalInfo.returnDate || 'N/A';
  const remark = additionalInfo.remark || 'N/A';
  
  const message = `📱 SOC PORTAL | SIM TRACKER 📱
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 SIM Tracking ID    : ${simTrackingId}
📞 MSISDN             : ${msisdn}
🏢 MNO                : ${mno}
👤 Assigned Persona   : ${assignedPersona}
📊 Profile Type       : ${profileType}
🔧 MSISDN Status      : ${msisdnStatus}
📱 Device Tag         : ${deviceTag || 'N/A'}
👤 Handed Over To     : ${handedOver}
📅 Handover Date      : ${handoverDate}
📅 Return Date        : ${returnDate}
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
        taskName: 'SimTracker',
        details: `Generating ${prefix} ID for table: ${table}`
      }
    });
    
    const result = await client.query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(4, '0');
    const notificationId = `${prefix}${nextId}SOCP`;
    
    logger.debug('Notification ID generated successfully', {
      meta: {
        taskName: 'SimTracker',
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
        taskName: 'SimTracker',
        details: `Failed to generate ${prefix} notification ID`
      }
    });
    throw new Error(`Error generating notification ID: ${error.message}`);
  }
};

// Get MNO from MSISDN prefix
const getMNOFromMSISDN = (msisdn) => {
  if (!msisdn || msisdn.length < 3) return '';
  
  const prefix = msisdn.substring(0, 3);
  switch (prefix) {
    case '017':
    case '013':
      return 'Grameenphone';
    case '019':
    case '014':
      return 'Banglalink';
    case '018':
      return 'Robi';
    case '016':
      return 'Airtel';
    case '015':
      return 'Teletalk';
    default:
      return '';
  }
};

export async function POST(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  const requestStartTime = Date.now();
  
  logger.info('SIM tracker submission request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'SimTracker',
      details: `User ${socPortalId} submitting SIM information | IP: ${ipAddress} | User Agent: ${userAgent?.substring(0, 50)}...`
    }
  });

  let client;
  try {
    logger.debug('Parsing request JSON body', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: 'Starting JSON parsing'
      }
    });
    
    const formData = await request.json();
    
    logger.debug('SIM tracker form data received and parsed', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: `Form fields - MSISDN: ${formData.msisdn?.substring(0, 8)}..., Persona: ${formData.assigned_persona}, Status: ${formData.msisdn_status}`
      }
    });

    // Validate required fields
    logger.debug('Starting form validation', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: 'Validating required fields'
      }
    });
    
    const missingFields = [];
    if (!formData.msisdn) missingFields.push('MSISDN');
    if (!formData.assigned_persona) missingFields.push('Assigned Persona');
    if (!formData.profile_type) missingFields.push('Profile Type');
    if (!formData.msisdn_status) missingFields.push('MSISDN Status');

    if (missingFields.length > 0) {
      logger.warn('SIM tracker validation failed - missing required fields', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'SimTracker',
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

    // Validate MSISDN format
    logger.debug('Validating MSISDN format', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: `MSISDN: ${formData.msisdn}`
      }
    });
    
    const validPrefixes = ['017', '013', '019', '014', '016', '018', '015'];
    if (!/^\d{11}$/.test(formData.msisdn) || !validPrefixes.includes(formData.msisdn.substring(0, 3))) {
      logger.warn('MSISDN validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'SimTracker',
          details: `MSISDN must be 11 digits starting with valid prefix, got: ${formData.msisdn}`
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'MSISDN must be 11 digits starting with 017, 013, 019, 014, 016, 018, or 015'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Auto-detect MNO
    const mno = getMNOFromMSISDN(formData.msisdn);
    if (!mno) {
      logger.warn('MNO detection failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'SimTracker',
          details: `Could not detect MNO for MSISDN: ${formData.msisdn}`
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Could not detect Mobile Network Operator from MSISDN'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process date fields - convert empty strings to null
    const handoverDate = formData.handover_date && formData.handover_date.trim() !== '' 
      ? formData.handover_date 
      : null;
      
    const returnDate = formData.return_date && formData.return_date.trim() !== '' 
      ? formData.return_date 
      : null;

    logger.debug('Validating date fields', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: `Handover date: ${handoverDate}, Return date: ${returnDate}`
      }
    });

    // Validate dates only if both are provided
    if (handoverDate && returnDate && new Date(returnDate) <= new Date(handoverDate)) {
      logger.warn('Date validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'SimTracker',
          details: `Return date (${returnDate}) must be after handover date (${handoverDate})`
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Return date must be after handover date'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.debug('Connecting to database and starting transaction', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: 'Acquiring database connection'
      }
    });
    
    // Get client from pool using your existing pattern
    client = await getDbConnection().connect();
    
    // Set timezone for this client session
    await client.query(`SET TIME ZONE 'Asia/Dhaka';`);
    
    await client.query('BEGIN');

    logger.debug('Querying user information', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
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
          taskName: 'SimTracker',
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
        taskName: 'SimTracker',
        details: `User short_name: ${userInfo.short_name}`
      }
    });

    // Check for duplicate MSISDN
    logger.debug('Checking for duplicate MSISDN', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: `Checking MSISDN: ${formData.msisdn}`
      }
    });
    
    const duplicateCheck = await client.query(
      'SELECT st_id, assigned_persona FROM sim_info WHERE msisdn = $1',
      [formData.msisdn]
    );
    
    if (duplicateCheck.rows.length > 0) {
      logger.warn('Duplicate MSISDN found', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'SimTracker',
          details: `MSISDN ${formData.msisdn} already exists in SIM ${duplicateCheck.rows[0].st_id}`
        }
      });
      
      await client.query('ROLLBACK');
      return new Response(JSON.stringify({
        success: false,
        message: `MSISDN already exists in SIM ${duplicateCheck.rows[0].st_id}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate SIM tracking ID
    const simTrackingId = await generateSimTrackingId(client);

    logger.debug('Inserting SIM information into database', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: `Inserting SIM with tracking ID: ${simTrackingId}`
      }
    });
    
    // Insert into sim_info table
    const insertQuery = `
      INSERT INTO sim_info (
        st_id, msisdn, mno, assigned_persona, profile_type, msisdn_status,
        device_tag, handed_over, handover_date, return_date, remark, track_by
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;
    
    const insertParams = [
      simTrackingId,
      formData.msisdn,
      mno,
      formData.assigned_persona,
      formData.profile_type,
      formData.msisdn_status,
      formData.device_tag || null,
      formData.handed_over || null,
      handoverDate,
      returnDate,
      formData.remark || null,
      userInfo.short_name
    ];
    
    logger.debug('SIM insert parameters prepared', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: `Insert params - MSISDN: ${formData.msisdn}, MNO: ${mno}, Persona: ${formData.assigned_persona}, Status: ${formData.msisdn_status}`
      }
    });
    
    await client.query(insertQuery, insertParams);

    logger.info('SIM information inserted successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: `SIM information saved with ID: ${simTrackingId} | MSISDN: ${formData.msisdn} | MNO: ${mno} | Persona: ${formData.assigned_persona}`,
        userId: socPortalId,
        simTrackingId
      }
    });

    // Create notifications
    logger.debug('Generating notification IDs', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: 'Creating admin and user notifications'
      }
    });
    
    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details', client);
    const userNotificationId = await generateNotificationId('UN', 'user_notification_details', client);

    logger.debug('Inserting admin notification', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: `Admin notification ID: ${adminNotificationId}`
      }
    });
    
    await client.query(
      'INSERT INTO admin_notification_details (notification_id, title, status) VALUES ($1, $2, $3)',
      [
        adminNotificationId,
        `New SIM Tracked: ${formData.msisdn} (${simTrackingId}) By ${userInfo.short_name}`,
        'Unread'
      ]
    );

    logger.debug('Inserting user notification', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: `User notification ID: ${userNotificationId}`
      }
    });
    
    await client.query(
      'INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id) VALUES ($1, $2, $3, $4)',
      [
        userNotificationId,
        `SIM Tracked: ${formData.msisdn} (${simTrackingId})`,
        'Unread',
        socPortalId
      ]
    );

    // Log activity
    logger.debug('Logging user activity', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: `Activity: ADD_SIM_TRACKER for ${simTrackingId}`
      }
    });
    
    await client.query(
      'INSERT INTO user_activity_log (soc_portal_id, action, description, eid, sid, ip_address, device_info) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        socPortalId,
        'ADD_SIM_TRACKER',
        `Added SIM tracker for ${formData.msisdn} (${simTrackingId})`,
        eid,
        sessionId,
        ipAddress,
        userAgent
      ]
    );

    // Send Telegram alert
    logger.debug('Preparing Telegram alert', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: 'Formatting Telegram message'
      }
    });
    
    const telegramMessage = formatSimTrackerAlert(
      simTrackingId,
      formData.msisdn,
      mno,
      formData.assigned_persona,
      formData.profile_type,
      formData.msisdn_status,
      formData.device_tag,
      {
        userId: socPortalId,
        eid,
        trackedBy: userInfo.short_name,
        ipAddress,
        userAgent,
        handedOver: formData.handed_over,
        handoverDate: handoverDate,
        returnDate: returnDate,
        remark: formData.remark
      }
    );

    logger.debug('Sending Telegram alert', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: `Telegram message length: ${telegramMessage.length} characters`
      }
    });
    
    await sendTelegramAlert(telegramMessage);

    logger.debug('Committing transaction', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: 'Finalizing database transaction'
      }
    });
    
    await client.query('COMMIT');

    const requestDuration = Date.now() - requestStartTime;
    
    logger.info('SIM tracker submission completed successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: `SIM tracker submission completed in ${requestDuration}ms | SIM ID: ${simTrackingId} | User: ${socPortalId}`,
        userId: socPortalId,
        simTrackingId,
        duration: requestDuration
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'SIM information saved successfully',
      sim_tracking_id: simTrackingId
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
          taskName: 'SimTracker',
          details: 'Database rollback initiated'
        }
      });
      
      await client.query('ROLLBACK');
    }
    
    logger.error('Error in SIM tracker submission', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTracker',
        details: `Unexpected error after ${errorDuration}ms: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack,
        duration: errorDuration
      }
    });

    // Provide specific error messages for common issues
    let errorMessage = 'Internal server error';
    if (error.message.includes('duplicate key')) {
      errorMessage = 'SIM with this MSISDN already exists';
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
        // Release client back to pool using your existing pattern
        client.release();
        logger.debug('Database connection released', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'SimTracker',
            details: 'Database client released successfully'
          }
        });
      } catch (releaseError) {
        logger.error('Error releasing database client', {
          error: releaseError.message,
          meta: {
            eid,
            sid: sessionId,
            taskName: 'SimTracker',
            details: 'Failed to release database connection'
          }
        });
      }
    }
  }
}