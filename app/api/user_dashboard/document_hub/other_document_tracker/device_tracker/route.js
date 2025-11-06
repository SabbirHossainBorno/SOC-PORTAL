// app/api/user_dashboard/document_hub/other_document_tracker/device_tracker/route.js
import { getDbConnection } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';
import sendTelegramAlert from '../../../../../../lib/telegramAlert';
import { getCurrentDateTime } from '../../../../../../lib/auditUtils';

// Generate Device Tracking ID
const generateDeviceTrackingId = async (client) => {
  try {
    logger.debug('Starting device tracking ID generation', {
      meta: {
        taskName: 'DeviceTracker',
        details: 'Querying MAX serial from device_info table'
      }
    });
    
    const result = await client.query('SELECT MAX(serial) AS max_serial FROM device_info');
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(2, '0');
    const deviceTrackingId = `DT${nextId}SOCP`;
    
    logger.debug('Device tracking ID generated successfully', {
      meta: {
        taskName: 'DeviceTracker',
        details: `Generated ID: ${deviceTrackingId}, Previous max serial: ${maxSerial}`
      }
    });
    
    return deviceTrackingId;
  } catch (error) {
    logger.error('Error generating device tracking ID', {
      error: error.message,
      stack: error.stack,
      meta: {
        taskName: 'DeviceTracker',
        details: 'Failed to generate device tracking ID'
      }
    });
    throw new Error(`Error generating device tracking ID: ${error.message}`);
  }
};

// Format Telegram alert for device tracker
const formatDeviceTrackerAlert = (deviceTrackingId, brandName, deviceModel, imei1, handoverTo, handoverDate, purpose, additionalInfo = {}) => {
  const time = getCurrentDateTime();
  const userId = additionalInfo.userId || 'N/A';
  const eid = additionalInfo.eid || 'N/A';
  const trackedBy = additionalInfo.trackedBy || 'N/A';
  const ipAddress = additionalInfo.ipAddress || 'N/A';
  const userAgent = additionalInfo.userAgent || 'N/A';
  const sim1 = additionalInfo.sim1 || 'N/A';
  const sim1Persona = additionalInfo.sim1Persona || 'N/A';
  const sim2 = additionalInfo.sim2 || 'N/A';
  const sim2Persona = additionalInfo.sim2Persona || 'N/A';
  const returnDate = additionalInfo.returnDate || 'N/A';
  const remark = additionalInfo.remark || 'N/A';
  const deviceStatus = additionalInfo.deviceStatus || 'N/A';
  const deviceStatusDetails = additionalInfo.deviceStatusDetails || 'N/A';
  
  const message = `📱 SOC PORTAL | DEVICE TRACKER 📱
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 Device Tracking ID : ${deviceTrackingId}
📱 Brand Name         : ${brandName}
📱 Device Model       : ${deviceModel}
🔢 IMEI 1             : ${imei1}
🔢 IMEI 2             : ${additionalInfo.imei2 || 'N/A'}
📞 SIM 1              : ${sim1} (${sim1Persona})
📞 SIM 2              : ${sim2} (${sim2Persona})
🎯 Purpose            : ${purpose}
🔧 Device Status      : ${deviceStatus}
📋 Status Details     : ${deviceStatusDetails}
👤 Handover To        : ${handoverTo || 'N/A'}
📅 Handover Date      : ${handoverDate || 'N/A'}
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
        taskName: 'DeviceTracker',
        details: `Generating ${prefix} ID for table: ${table}`
      }
    });
    
    const result = await client.query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(4, '0');
    const notificationId = `${prefix}${nextId}SOCP`;
    
    logger.debug('Notification ID generated successfully', {
      meta: {
        taskName: 'DeviceTracker',
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
        taskName: 'DeviceTracker',
        details: `Failed to generate ${prefix} notification ID`
      }
    });
    throw new Error(`Error generating notification ID: ${error.message}`);
  }
};

// Check and update SIM records with device tag
const updateSimRecordsWithDeviceTag = async (client, deviceTrackingId, sim1, sim2) => {
  try {
    logger.debug('Starting SIM records update with device tag', {
      meta: {
        taskName: 'DeviceTracker',
        details: `Updating SIM records for device: ${deviceTrackingId}, SIM1: ${sim1}, SIM2: ${sim2}`
      }
    });

    const updatedSims = [];

    // Update SIM 1 if provided
    if (sim1) {
      const sim1Check = await client.query(
        'SELECT st_id FROM sim_info WHERE msisdn = $1',
        [sim1]
      );

      if (sim1Check.rows.length > 0) {
        await client.query(
          'UPDATE sim_info SET device_tag = $1, updated_at = NOW() WHERE msisdn = $2',
          [deviceTrackingId, sim1]
        );
        updatedSims.push({ msisdn: sim1, st_id: sim1Check.rows[0].st_id });
        logger.debug('SIM 1 updated with device tag', {
          meta: {
            taskName: 'DeviceTracker',
            details: `SIM ${sim1} (${sim1Check.rows[0].st_id}) updated with device tag: ${deviceTrackingId}`
          }
        });
      } else {
        logger.debug('SIM 1 not found in SIM table', {
          meta: {
            taskName: 'DeviceTracker',
            details: `SIM ${sim1} not found in sim_info table, skipping device tag update`
          }
        });
      }
    }

    // Update SIM 2 if provided
    if (sim2) {
      const sim2Check = await client.query(
        'SELECT st_id FROM sim_info WHERE msisdn = $1',
        [sim2]
      );

      if (sim2Check.rows.length > 0) {
        await client.query(
          'UPDATE sim_info SET device_tag = $1, updated_at = NOW() WHERE msisdn = $2',
          [deviceTrackingId, sim2]
        );
        updatedSims.push({ msisdn: sim2, st_id: sim2Check.rows[0].st_id });
        logger.debug('SIM 2 updated with device tag', {
          meta: {
            taskName: 'DeviceTracker',
            details: `SIM ${sim2} (${sim2Check.rows[0].st_id}) updated with device tag: ${deviceTrackingId}`
          }
        });
      } else {
        logger.debug('SIM 2 not found in SIM table', {
          meta: {
            taskName: 'DeviceTracker',
            details: `SIM ${sim2} not found in sim_info table, skipping device tag update`
          }
        });
      }
    }

    logger.info('SIM records update completed', {
      meta: {
        taskName: 'DeviceTracker',
        details: `Updated ${updatedSims.length} SIM records with device tag: ${deviceTrackingId}`,
        updatedSims
      }
    });

    return updatedSims;
  } catch (error) {
    logger.error('Error updating SIM records with device tag', {
      error: error.message,
      stack: error.stack,
      meta: {
        taskName: 'DeviceTracker',
        details: 'Failed to update SIM records with device tag'
      }
    });
    throw new Error(`Error updating SIM records: ${error.message}`);
  }
};

export async function POST(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  const requestStartTime = Date.now();
  
  logger.info('Device tracker submission request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'DeviceTracker',
      details: `User ${socPortalId} submitting device information | IP: ${ipAddress} | User Agent: ${userAgent?.substring(0, 50)}...`
    }
  });

  let client;
  try {
    logger.debug('Parsing request JSON body', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: 'Starting JSON parsing'
      }
    });
    
    const formData = await request.json();
    
    logger.debug('Device tracker form data received and parsed', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: `Form fields - Brand: ${formData.brand_name}, Model: ${formData.device_model}, IMEI1: ${formData.imei_1?.substring(0, 8)}..., Purpose: ${formData.purpose?.substring(0, 30)}...`
      }
    });

    // Validate required fields
    logger.debug('Starting form validation', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: 'Validating required fields'
      }
    });
    
    if (!formData.brand_name || !formData.device_model || !formData.imei_1 || 
        !formData.purpose || !formData.device_status) {
      const missingFields = {
        brand_name: !formData.brand_name,
        device_model: !formData.device_model,
        imei_1: !formData.imei_1,
        purpose: !formData.purpose,
        device_status: !formData.device_status
      };
      
      logger.warn('Device tracker validation failed - missing required fields', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'DeviceTracker',
          details: `Missing required fields: ${JSON.stringify(missingFields)}`,
          userId: socPortalId,
          missingFields
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required fields: Brand Name, Device Model, IMEI 1, Purpose, and Device Status are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate device status details when status is "Not Working"
    if (formData.device_status === 'Not Working' && !formData.device_status_details?.trim()) {
      logger.warn('Device status details validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'DeviceTracker',
          details: 'Device status details required when status is "Not Working"'
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Device status details are required when device status is "Not Working"'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate IMEI format
    logger.debug('Validating IMEI formats', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: `IMEI1: ${formData.imei_1}, IMEI2: ${formData.imei_2 || 'Not provided'}`
      }
    });
    
    if (!/^\d{15}$/.test(formData.imei_1)) {
      logger.warn('IMEI 1 validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'DeviceTracker',
          details: `IMEI 1 must be exactly 15 digits, got: ${formData.imei_1?.length || 0} digits`
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'IMEI 1 must be exactly 15 digits'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (formData.imei_2 && !/^\d{15}$/.test(formData.imei_2)) {
      logger.warn('IMEI 2 validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'DeviceTracker',
          details: `IMEI 2 must be exactly 15 digits, got: ${formData.imei_2.length} digits`
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'IMEI 2 must be exactly 15 digits'
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
        taskName: 'DeviceTracker',
        details: `Handover date: ${handoverDate}, Return date: ${returnDate}`
      }
    });

    // Validate dates only if both are provided
    if (handoverDate && returnDate && new Date(returnDate) <= new Date(handoverDate)) {
      logger.warn('Date validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'DeviceTracker',
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
        taskName: 'DeviceTracker',
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
        taskName: 'DeviceTracker',
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
          taskName: 'DeviceTracker',
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
        taskName: 'DeviceTracker',
        details: `User short_name: ${userInfo.short_name}`
      }
    });

    // Generate device tracking ID
    const deviceTrackingId = await generateDeviceTrackingId(client);

    logger.debug('Inserting device information into database', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: `Inserting device with tracking ID: ${deviceTrackingId}`
      }
    });
    
    // Insert into device_info table
    const insertQuery = `
      INSERT INTO device_info (
        dt_id, brand_name, device_model, imei_1, imei_2, 
        sim_1, sim_1_persona, sim_2, sim_2_persona,
        purpose, handover_to, handover_date, return_date, remark, track_by,
        device_status, device_status_details
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `;
    
    const insertParams = [
      deviceTrackingId,
      formData.brand_name,
      formData.device_model,
      formData.imei_1,
      formData.imei_2 || null,
      formData.sim_1 || null,
      formData.sim_1_persona || null,
      formData.sim_2 || null,
      formData.sim_2_persona || null,
      formData.purpose,
      formData.handover_to || null,
      handoverDate,
      returnDate,
      formData.remark || null,
      userInfo.short_name,
      formData.device_status,
      formData.device_status_details || null
    ];
    
    logger.debug('Device insert parameters prepared', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: `Insert params - Brand: ${formData.brand_name}, Model: ${formData.device_model}, Status: ${formData.device_status}, Tracked by: ${userInfo.short_name}`
      }
    });
    
    await client.query(insertQuery, insertParams);

    logger.info('Device information inserted successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: `Device information saved with ID: ${deviceTrackingId} | Brand: ${formData.brand_name} | Model: ${formData.device_model} | Status: ${formData.device_status}`,
        userId: socPortalId,
        deviceTrackingId
      }
    });

    // NEW LOGIC: Update SIM records with device tag
    logger.debug('Starting SIM records update with device tag', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: `Checking and updating SIM records for device: ${deviceTrackingId}`
      }
    });

    const updatedSims = await updateSimRecordsWithDeviceTag(
      client, 
      deviceTrackingId, 
      formData.sim_1, 
      formData.sim_2
    );

    // Create notifications
    logger.debug('Generating notification IDs', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: 'Creating admin and user notifications'
      }
    });
    
    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details', client);
    const userNotificationId = await generateNotificationId('UN', 'user_notification_details', client);

    logger.debug('Inserting admin notification', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: `Admin notification ID: ${adminNotificationId}`
      }
    });
    
    await client.query(
      'INSERT INTO admin_notification_details (notification_id, title, status) VALUES ($1, $2, $3)',
      [
        adminNotificationId,
        `New Device Tracked: ${formData.brand_name} ${formData.device_model} (${deviceTrackingId}) By ${userInfo.short_name}`,
        'Unread'
      ]
    );

    logger.debug('Inserting user notification', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: `User notification ID: ${userNotificationId}`
      }
    });
    
    await client.query(
      'INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id) VALUES ($1, $2, $3, $4)',
      [
        userNotificationId,
        `Device Tracked: ${formData.brand_name} ${formData.device_model} (${deviceTrackingId})`,
        'Unread',
        socPortalId
      ]
    );

    // Log activity
    logger.debug('Logging user activity', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: `Activity: ADD_DEVICE_TRACKER for ${deviceTrackingId}`
      }
    });
    
    await client.query(
      'INSERT INTO user_activity_log (soc_portal_id, action, description, eid, sid, ip_address, device_info) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        socPortalId,
        'ADD_DEVICE_TRACKER',
        `Added device tracker for ${formData.brand_name} ${formData.device_model} (${deviceTrackingId})`,
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
        taskName: 'DeviceTracker',
        details: 'Formatting Telegram message'
      }
    });
    
    const telegramMessage = formatDeviceTrackerAlert(
      deviceTrackingId,
      formData.brand_name,
      formData.device_model,
      formData.imei_1,
      formData.handover_to,
      handoverDate,
      formData.purpose,
      {
        userId: socPortalId,
        eid,
        trackedBy: userInfo.short_name,
        ipAddress,
        userAgent,
        imei2: formData.imei_2,
        sim1: formData.sim_1,
        sim1Persona: formData.sim_1_persona,
        sim2: formData.sim_2,
        sim2Persona: formData.sim_2_persona,
        returnDate: returnDate,
        remark: formData.remark,
        deviceStatus: formData.device_status,
        deviceStatusDetails: formData.device_status_details
      }
    );

    logger.debug('Sending Telegram alert', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: `Telegram message length: ${telegramMessage.length} characters`
      }
    });
    
    await sendTelegramAlert(telegramMessage);

    logger.debug('Committing transaction', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: 'Finalizing database transaction'
      }
    });
    
    await client.query('COMMIT');

    const requestDuration = Date.now() - requestStartTime;
    
    logger.info('Device tracker submission completed successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: `Device tracker submission completed in ${requestDuration}ms | Device ID: ${deviceTrackingId} | User: ${socPortalId} | Updated SIMs: ${updatedSims.length}`,
        userId: socPortalId,
        deviceTrackingId,
        updatedSimsCount: updatedSims.length,
        duration: requestDuration
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Device information saved successfully',
      device_tracking_id: deviceTrackingId,
      updated_sims: updatedSims
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
          taskName: 'DeviceTracker',
          details: 'Database rollback initiated'
        }
      });
      
      await client.query('ROLLBACK');
    }
    
    logger.error('Error in device tracker submission', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        details: `Unexpected error after ${errorDuration}ms: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack,
        duration: errorDuration
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
      try {
        logger.debug('Releasing database connection', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'DeviceTracker',
            details: 'Closing database client'
          }
        });
        
        if (client.release) {
          await client.release();
        }
      } catch (error) {
        logger.error('Error releasing database client', {
          error: error.message,
          meta: {
            eid,
            sid: sessionId,
            taskName: 'DeviceTracker',
            details: 'Failed to release database connection'
          }
        });
      }
    }
  }
}