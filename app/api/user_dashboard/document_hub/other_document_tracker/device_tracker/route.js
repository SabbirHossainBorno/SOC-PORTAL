// app/api/user_dashboard/document_hub/other_document_tracker/device_tracker/route.js
import { getDbConnection } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';
import sendTelegramAlert from '../../../../../../lib/telegramAlert';
import { getCurrentDateTime } from '../../../../../../lib/auditUtils';

// Generate Device Tracking ID
const generateDeviceTrackingId = async (client) => {
  try {
    logger.debug('DEVICE_TRACKER_ID_GENERATION_STARTED', {
      meta: {
        taskName: 'DeviceTracker',
        action: 'generate_device_id',
        step: 'query_max_serial',
        details: 'Querying MAX serial from device_info table for device tracking ID generation'
      }
    });
    
    const result = await client.query('SELECT MAX(serial) AS max_serial FROM device_info');
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = maxSerial + 1;
    const deviceTrackingId = `DVT${nextId}SOCP`;
    
    logger.debug('DEVICE_TRACKER_ID_GENERATED_SUCCESS', {
      meta: {
        taskName: 'DeviceTracker',
        action: 'generate_device_id',
        step: 'id_generated',
        details: `Device tracking ID generated successfully`,
        generatedId: deviceTrackingId,
        previousMaxSerial: maxSerial,
        nextSerial: nextId
      }
    });
    
    return deviceTrackingId;
  } catch (error) {
    logger.error('DEVICE_TRACKER_ID_GENERATION_FAILED', {
      error: error.message,
      stack: error.stack,
      meta: {
        taskName: 'DeviceTracker',
        action: 'generate_device_id',
        step: 'id_generation_failed',
        details: 'Failed to generate device tracking ID due to database error'
      }
    });
    throw new Error(`Error generating device tracking ID: ${error.message}`);
  }
};

// Generate SIM Tracking ID for auto-creation
const generateSimTrackingId = async (client) => {
  try {
    logger.debug('SIM_TRACKER_ID_GENERATION_STARTED', {
      meta: {
        taskName: 'DeviceTracker',
        action: 'generate_sim_id_for_auto_create',
        step: 'query_max_sim_serial',
        details: 'Querying MAX serial from sim_info table for auto-created SIM'
      }
    });
    
    const result = await client.query('SELECT MAX(serial) AS max_serial FROM sim_info');
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(2, '0');
    const simTrackingId = `ST${nextId}SOCP`;
    
    logger.debug('SIM_TRACKER_ID_GENERATED_SUCCESS', {
      meta: {
        taskName: 'DeviceTracker',
        action: 'generate_sim_id_for_auto_create',
        step: 'sim_id_generated',
        details: `SIM tracking ID generated successfully for auto-creation`,
        generatedSimId: simTrackingId,
        previousMaxSerial: maxSerial,
        nextSerial: nextId
      }
    });
    
    return simTrackingId;
  } catch (error) {
    logger.error('SIM_TRACKER_ID_GENERATION_FAILED', {
      error: error.message,
      stack: error.stack,
      meta: {
        taskName: 'DeviceTracker',
        action: 'generate_sim_id_for_auto_create',
        step: 'sim_id_generation_failed',
        details: 'Failed to generate SIM tracking ID for auto-creation'
      }
    });
    throw new Error(`Error generating SIM tracking ID: ${error.message}`);
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

// Auto-create SIM entry if not exists
const autoCreateSimEntry = async (client, msisdn, persona, deviceTrackingId, userInfo, additionalData = {}) => {
  try {
    if (!msisdn || msisdn.length !== 11) {
      logger.debug('SIM_AUTO_CREATION_SKIPPED_INVALID_MSISDN', {
        meta: {
          taskName: 'DeviceTracker',
          action: 'auto_create_sim',
          step: 'validation_failed',
          details: `Skipping SIM auto-creation - invalid MSISDN format or length`,
          msisdn: msisdn,
          msisdnLength: msisdn?.length || 0,
          deviceTrackingId: deviceTrackingId
        }
      });
      return null;
    }

    logger.debug('SIM_AUTO_CREATION_CHECK_STARTED', {
      meta: {
        taskName: 'DeviceTracker',
        action: 'auto_create_sim',
        step: 'check_existing_sim',
        details: `Checking if SIM already exists in database before auto-creation`,
        msisdn: msisdn,
        deviceTrackingId: deviceTrackingId,
        persona: persona
      }
    });

    // Check if SIM already exists
    const existingSim = await client.query(
      'SELECT st_id FROM sim_info WHERE msisdn = $1',
      [msisdn]
    );

    if (existingSim.rows.length > 0) {
      logger.debug('SIM_AUTO_CREATION_SKIPPED_ALREADY_EXISTS', {
        meta: {
          taskName: 'DeviceTracker',
          action: 'auto_create_sim',
          step: 'sim_already_exists',
          details: `SIM already exists in database, skipping auto-creation`,
          msisdn: msisdn,
          existingSimId: existingSim.rows[0].st_id,
          deviceTrackingId: deviceTrackingId
        }
      });
      return { exists: true, st_id: existingSim.rows[0].st_id };
    }

    logger.debug('SIM_AUTO_CREATION_PROCEEDING', {
      meta: {
        taskName: 'DeviceTracker',
        action: 'auto_create_sim',
        step: 'creating_new_sim',
        details: `SIM not found in database, proceeding with auto-creation`,
        msisdn: msisdn,
        deviceTrackingId: deviceTrackingId,
        persona: persona
      }
    });

    // Generate SIM tracking ID
    const simTrackingId = await generateSimTrackingId(client);

    // Determine profile type based on persona
    let profileType = 'FULL'; // Default as per requirement
    if (!persona || persona === 'N/A') {
      profileType = 'NOT_APPLICABLE';
    }

    // Get MNO from MSISDN
    const mno = getMNOFromMSISDN(msisdn);
    
    if (!mno) {
      logger.warn('SIM_AUTO_CREATION_MNO_DETECTION_FAILED', {
        meta: {
          taskName: 'DeviceTracker',
          action: 'auto_create_sim',
          step: 'mno_detection_failed',
          details: `Could not detect MNO from MSISDN prefix`,
          msisdn: msisdn,
          simTrackingId: simTrackingId
        }
      });
    }

    logger.debug('SIM_AUTO_CREATION_PARAMS_PREPARED', {
      meta: {
        taskName: 'DeviceTracker',
        action: 'auto_create_sim',
        step: 'preparing_insert_params',
        details: `Preparing SIM insertion parameters`,
        simTrackingId: simTrackingId,
        msisdn: msisdn,
        mno: mno,
        persona: persona || 'N/A',
        profileType: profileType,
        deviceTrackingId: deviceTrackingId
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
      msisdn,
      mno,
      persona || 'N/A',
      profileType,
      'ACTIVE', // Default status as per requirement
      deviceTrackingId, // Link to the device
      additionalData.handed_over || null,
      additionalData.handover_date || null,
      additionalData.return_date || null,
      additionalData.remark || `Auto-created from device tracker: ${deviceTrackingId}`,
      userInfo.short_name
    ];

    await client.query(insertQuery, insertParams);

    logger.info('SIM_AUTO_CREATION_SUCCESS', {
      meta: {
        taskName: 'DeviceTracker',
        action: 'auto_create_sim',
        step: 'sim_created_success',
        details: `SIM auto-created successfully from device tracker`,
        simTrackingId: simTrackingId,
        msisdn: msisdn,
        deviceTrackingId: deviceTrackingId,
        persona: persona || 'N/A',
        profileType: profileType,
        msisdnStatus: 'ACTIVE',
        trackedBy: userInfo.short_name
      }
    });

    // Create notifications for auto-created SIM
    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details', client);
    const userNotificationId = await generateNotificationId('UN', 'user_notification_details', client);

    logger.debug('SIM_AUTO_CREATION_NOTIFICATIONS_CREATING', {
      meta: {
        taskName: 'DeviceTracker',
        action: 'auto_create_sim',
        step: 'creating_notifications',
        details: `Creating admin and user notifications for auto-created SIM`,
        simTrackingId: simTrackingId,
        adminNotificationId: adminNotificationId,
        userNotificationId: userNotificationId
      }
    });

    await client.query(
      'INSERT INTO admin_notification_details (notification_id, title, status) VALUES ($1, $2, $3)',
      [
        adminNotificationId,
        `SIM Auto-Created from Device: ${msisdn} (${simTrackingId}) for Device ${deviceTrackingId} By ${userInfo.short_name}`,
        'Unread'
      ]
    );

    await client.query(
      'INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id) VALUES ($1, $2, $3, $4)',
      [
        userNotificationId,
        `SIM Auto-Created: ${msisdn} (${simTrackingId}) for Device ${deviceTrackingId}`,
        'Unread',
        additionalData.socPortalId
      ]
    );

    // Log activity for auto-created SIM
    await client.query(
      'INSERT INTO user_activity_log (soc_portal_id, action, description, eid, sid, ip_address, device_info) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        additionalData.socPortalId,
        'AUTO_CREATE_SIM_TRACKER',
        `Auto-created SIM tracker for ${msisdn} (${simTrackingId}) from device ${deviceTrackingId}`,
        additionalData.eid,
        additionalData.sessionId,
        additionalData.ipAddress,
        additionalData.userAgent
      ]
    );

    logger.debug('SIM_AUTO_CREATION_COMPLETED', {
      meta: {
        taskName: 'DeviceTracker',
        action: 'auto_create_sim',
        step: 'sim_creation_complete',
        details: `SIM auto-creation process completed successfully`,
        simTrackingId: simTrackingId,
        msisdn: msisdn,
        deviceTrackingId: deviceTrackingId
      }
    });

    return { exists: false, st_id: simTrackingId, auto_created: true };

  } catch (error) {
    logger.error('SIM_AUTO_CREATION_FAILED', {
      error: error.message,
      stack: error.stack,
      meta: {
        taskName: 'DeviceTracker',
        action: 'auto_create_sim',
        step: 'creation_failed',
        details: `Failed to auto-create SIM entry in database`,
        msisdn: msisdn,
        deviceTrackingId: deviceTrackingId,
        persona: persona
      }
    });
    throw new Error(`Error auto-creating SIM entry: ${error.message}`);
  }
};

// Format Telegram alert for device tracker (enhanced with SIM auto-creation info)
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
  
  // Add SIM auto-creation notes
  const sim1Note = additionalInfo.autoCreatedSims?.includes(sim1) ? ' [Auto-Created in SIM Tracker]' : '';
  const sim2Note = additionalInfo.autoCreatedSims?.includes(sim2) ? ' [Auto-Created in SIM Tracker]' : '';
  
  const message = `📱 SOC PORTAL | DEVICE TRACKER 📱
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 Device Tracking ID : ${deviceTrackingId}
📱 Brand Name         : ${brandName}
📱 Device Model       : ${deviceModel}
🔢 IMEI 1             : ${imei1}
🔢 IMEI 2             : ${additionalInfo.imei2 || 'N/A'}
📞 SIM 1              : ${sim1} (${sim1Persona})${sim1Note}
📞 SIM 2              : ${sim2} (${sim2Persona})${sim2Note}
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
    logger.debug('NOTIFICATION_ID_GENERATION_STARTED', {
      meta: {
        taskName: 'DeviceTracker',
        action: 'generate_notification_id',
        step: 'query_max_notification_serial',
        details: `Generating ${prefix} ID for table: ${table}`,
        prefix: prefix,
        table: table
      }
    });
    
    const result = await client.query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(4, '0');
    const notificationId = `${prefix}${nextId}SOCP`;
    
    logger.debug('NOTIFICATION_ID_GENERATED_SUCCESS', {
      meta: {
        taskName: 'DeviceTracker',
        action: 'generate_notification_id',
        step: 'notification_id_generated',
        details: `Notification ID generated successfully`,
        notificationId: notificationId,
        prefix: prefix,
        previousMaxSerial: maxSerial,
        nextSerial: nextId
      }
    });
    
    return notificationId;
  } catch (error) {
    logger.error('NOTIFICATION_ID_GENERATION_FAILED', {
      error: error.message,
      stack: error.stack,
      meta: {
        taskName: 'DeviceTracker',
        action: 'generate_notification_id',
        step: 'notification_id_generation_failed',
        details: `Failed to generate notification ID`,
        prefix: prefix,
        table: table
      }
    });
    throw new Error(`Error generating notification ID: ${error.message}`);
  }
};

// Check and update SIM records with device tag
const updateSimRecordsWithDeviceTag = async (client, deviceTrackingId, sim1, sim2) => {
  try {
    logger.debug('SIM_RECORDS_UPDATE_WITH_DEVICE_TAG_STARTED', {
      meta: {
        taskName: 'DeviceTracker',
        action: 'update_sim_records',
        step: 'starting_sim_update',
        details: `Updating SIM records with device tag`,
        deviceTrackingId: deviceTrackingId,
        sim1: sim1,
        sim2: sim2
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
        logger.debug('SIM_1_UPDATED_WITH_DEVICE_TAG', {
          meta: {
            taskName: 'DeviceTracker',
            action: 'update_sim_records',
            step: 'sim1_updated',
            details: `SIM 1 updated with device tag successfully`,
            msisdn: sim1,
            simId: sim1Check.rows[0].st_id,
            deviceTrackingId: deviceTrackingId
          }
        });
      } else {
        logger.debug('SIM_1_NOT_FOUND_FOR_UPDATE', {
          meta: {
            taskName: 'DeviceTracker',
            action: 'update_sim_records',
            step: 'sim1_not_found',
            details: `SIM 1 not found in sim_info table, skipping device tag update`,
            msisdn: sim1
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
        logger.debug('SIM_2_UPDATED_WITH_DEVICE_TAG', {
          meta: {
            taskName: 'DeviceTracker',
            action: 'update_sim_records',
            step: 'sim2_updated',
            details: `SIM 2 updated with device tag successfully`,
            msisdn: sim2,
            simId: sim2Check.rows[0].st_id,
            deviceTrackingId: deviceTrackingId
          }
        });
      } else {
        logger.debug('SIM_2_NOT_FOUND_FOR_UPDATE', {
          meta: {
            taskName: 'DeviceTracker',
            action: 'update_sim_records',
            step: 'sim2_not_found',
            details: `SIM 2 not found in sim_info table, skipping device tag update`,
            msisdn: sim2
          }
        });
      }
    }

    logger.info('SIM_RECORDS_UPDATE_COMPLETED', {
      meta: {
        taskName: 'DeviceTracker',
        action: 'update_sim_records',
        step: 'sim_update_completed',
        details: `SIM records update process completed`,
        deviceTrackingId: deviceTrackingId,
        updatedSimsCount: updatedSims.length,
        updatedSims: updatedSims
      }
    });

    return updatedSims;
  } catch (error) {
    logger.error('SIM_RECORDS_UPDATE_FAILED', {
      error: error.message,
      stack: error.stack,
      meta: {
        taskName: 'DeviceTracker',
        action: 'update_sim_records',
        step: 'sim_update_failed',
        details: 'Failed to update SIM records with device tag',
        deviceTrackingId: deviceTrackingId
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
  
  logger.info('DEVICE_TRACKER_SUBMISSION_REQUEST_RECEIVED', {
    meta: {
      eid: eid,
      sid: sessionId,
      taskName: 'DeviceTracker',
      action: 'request_received',
      step: 'request_start',
      details: `User ${socPortalId} submitting device information`,
      ipAddress: ipAddress,
      userAgent: userAgent?.substring(0, 50)
    }
  });

  let client;
  try {
    logger.debug('DEVICE_TRACKER_REQUEST_PARSING_STARTED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'parse_request',
        step: 'json_parsing',
        details: 'Starting JSON parsing of request body'
      }
    });
    
    const formData = await request.json();
    
    logger.debug('DEVICE_TRACKER_FORM_DATA_PARSED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'parse_request',
        step: 'json_parsed',
        details: 'Device tracker form data received and parsed successfully',
        brandName: formData.brand_name,
        deviceModel: formData.device_model,
        imei1: formData.imei_1?.substring(0, 8) + '...',
        sim1: formData.sim_1 || 'Not provided',
        sim2: formData.sim_2 || 'Not provided',
        purpose: formData.purpose?.substring(0, 30) + '...'
      }
    });

    // Validate required fields
    logger.debug('DEVICE_TRACKER_VALIDATION_STARTED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'validate_form',
        step: 'required_fields_check',
        details: 'Starting validation of required fields'
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
      
      logger.warn('DEVICE_TRACKER_VALIDATION_FAILED_MISSING_FIELDS', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'DeviceTracker',
          action: 'validate_form',
          step: 'validation_failed',
          details: 'Missing required fields in device tracker form',
          userId: socPortalId,
          missingFields: missingFields
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
      logger.warn('DEVICE_TRACKER_VALIDATION_FAILED_STATUS_DETAILS', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'DeviceTracker',
          action: 'validate_form',
          step: 'status_details_validation',
          details: 'Device status details required when status is "Not Working"',
          deviceStatus: formData.device_status
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
    logger.debug('DEVICE_TRACKER_IMEI_VALIDATION_STARTED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'validate_form',
        step: 'imei_validation',
        details: 'Validating IMEI formats',
        imei1: formData.imei_1,
        imei2: formData.imei_2 || 'Not provided'
      }
    });
    
    if (!/^\d{15}$/.test(formData.imei_1)) {
      logger.warn('DEVICE_TRACKER_IMEI1_VALIDATION_FAILED', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'DeviceTracker',
          action: 'validate_form',
          step: 'imei1_invalid',
          details: 'IMEI 1 validation failed - must be exactly 15 digits',
          imei1: formData.imei_1,
          imei1Length: formData.imei_1?.length || 0
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
      logger.warn('DEVICE_TRACKER_IMEI2_VALIDATION_FAILED', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'DeviceTracker',
          action: 'validate_form',
          step: 'imei2_invalid',
          details: 'IMEI 2 validation failed - must be exactly 15 digits',
          imei2: formData.imei_2,
          imei2Length: formData.imei_2.length
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

    logger.debug('DEVICE_TRACKER_DATE_VALIDATION_STARTED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'validate_form',
        step: 'date_validation',
        details: 'Validating date fields',
        handoverDate: handoverDate,
        returnDate: returnDate
      }
    });

    // Validate dates only if both are provided
    if (handoverDate && returnDate && new Date(returnDate) <= new Date(handoverDate)) {
      logger.warn('DEVICE_TRACKER_DATE_VALIDATION_FAILED', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'DeviceTracker',
          action: 'validate_form',
          step: 'date_validation_failed',
          details: 'Return date must be after handover date',
          handoverDate: handoverDate,
          returnDate: returnDate
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

    logger.debug('DEVICE_TRACKER_DATABASE_CONNECTION_STARTED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'database_operation',
        step: 'acquire_connection',
        details: 'Connecting to database and starting transaction'
      }
    });
    
    client = await getDbConnection().connect();
    await client.query(`SET TIME ZONE 'Asia/Dhaka';`);
    await client.query('BEGIN');

    logger.debug('DEVICE_TRACKER_USER_INFO_QUERY_STARTED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'database_operation',
        step: 'query_user_info',
        details: `Querying user information for SOC Portal ID: ${socPortalId}`
      }
    });
    
    // Get user info
    const userResponse = await client.query(
      'SELECT short_name FROM user_info WHERE soc_portal_id = $1',
      [socPortalId]
    );
    
    const userInfo = userResponse.rows[0];
    if (!userInfo) {
      logger.warn('DEVICE_TRACKER_USER_NOT_FOUND', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'DeviceTracker',
          action: 'database_operation',
          step: 'user_not_found',
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

    logger.debug('DEVICE_TRACKER_USER_INFO_RETRIEVED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'database_operation',
        step: 'user_info_retrieved',
        details: 'User information retrieved successfully',
        userShortName: userInfo.short_name,
        socPortalId: socPortalId
      }
    });

    // Generate device tracking ID
    const deviceTrackingId = await generateDeviceTrackingId(client);

    logger.debug('DEVICE_TRACKER_INSERTION_STARTED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'database_operation',
        step: 'insert_device_info',
        details: `Inserting device information into database with tracking ID: ${deviceTrackingId}`,
        deviceTrackingId: deviceTrackingId,
        brandName: formData.brand_name,
        deviceModel: formData.device_model
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
    
    logger.debug('DEVICE_TRACKER_INSERT_PARAMS_PREPARED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'database_operation',
        step: 'insert_params_ready',
        details: 'Device insertion parameters prepared',
        deviceTrackingId: deviceTrackingId,
        brandName: formData.brand_name,
        deviceModel: formData.device_model,
        deviceStatus: formData.device_status,
        trackedBy: userInfo.short_name
      }
    });
    
    await client.query(insertQuery, insertParams);

    logger.info('DEVICE_TRACKER_INSERTION_SUCCESS', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'database_operation',
        step: 'device_inserted',
        details: `Device information inserted successfully into database`,
        deviceTrackingId: deviceTrackingId,
        brandName: formData.brand_name,
        deviceModel: formData.device_model,
        deviceStatus: formData.device_status,
        userId: socPortalId
      }
    });

    // NEW LOGIC: Auto-create SIM entries if they don't exist
    const autoCreatedSims = [];
    const simCreationData = {
      handed_over: formData.handover_to,
      handover_date: handoverDate,
      return_date: returnDate,
      remark: formData.remark,
      socPortalId: socPortalId,
      eid: eid,
      sessionId: sessionId,
      ipAddress: ipAddress,
      userAgent: userAgent
    };

    logger.debug('DEVICE_TRACKER_SIM_AUTO_CREATION_STARTED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'sim_auto_creation',
        step: 'starting_auto_creation',
        details: 'Starting SIM auto-creation process for provided SIM numbers',
        deviceTrackingId: deviceTrackingId,
        sim1Provided: !!formData.sim_1,
        sim2Provided: !!formData.sim_2
      }
    });

    // Auto-create SIM 1 if provided and doesn't exist
    if (formData.sim_1) {
      try {
        logger.debug('DEVICE_TRACKER_SIM1_AUTO_CREATION_ATTEMPT', {
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'DeviceTracker',
            action: 'sim_auto_creation',
            step: 'sim1_creation_attempt',
            details: `Attempting to auto-create SIM 1 if not exists`,
            msisdn: formData.sim_1,
            persona: formData.sim_1_persona,
            deviceTrackingId: deviceTrackingId
          }
        });

        const sim1Result = await autoCreateSimEntry(
          client,
          formData.sim_1,
          formData.sim_1_persona,
          deviceTrackingId,
          userInfo,
          simCreationData
        );
        
        if (sim1Result && sim1Result.auto_created) {
          autoCreatedSims.push(formData.sim_1);
          logger.debug('DEVICE_TRACKER_SIM1_AUTO_CREATION_SUCCESS', {
            meta: {
              eid: eid,
              sid: sessionId,
              taskName: 'DeviceTracker',
              action: 'sim_auto_creation',
              step: 'sim1_created',
              details: `SIM 1 auto-created successfully`,
              msisdn: formData.sim_1,
              simTrackingId: sim1Result.st_id,
              deviceTrackingId: deviceTrackingId
            }
          });
        } else if (sim1Result && sim1Result.exists) {
          logger.debug('DEVICE_TRACKER_SIM1_ALREADY_EXISTS', {
            meta: {
              eid: eid,
              sid: sessionId,
              taskName: 'DeviceTracker',
              action: 'sim_auto_creation',
              step: 'sim1_exists',
              details: `SIM 1 already exists in database, skipping auto-creation`,
              msisdn: formData.sim_1,
              existingSimId: sim1Result.st_id
            }
          });
        }
      } catch (error) {
        logger.error('DEVICE_TRACKER_SIM1_AUTO_CREATION_FAILED', {
          error: error.message,
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'DeviceTracker',
            action: 'sim_auto_creation',
            step: 'sim1_creation_failed',
            details: `SIM 1 auto-creation failed, but continuing with device creation`,
            msisdn: formData.sim_1,
            deviceTrackingId: deviceTrackingId
          }
        });
        // Continue with device creation even if SIM auto-creation fails
      }
    }

    // Auto-create SIM 2 if provided and doesn't exist
    if (formData.sim_2) {
      try {
        logger.debug('DEVICE_TRACKER_SIM2_AUTO_CREATION_ATTEMPT', {
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'DeviceTracker',
            action: 'sim_auto_creation',
            step: 'sim2_creation_attempt',
            details: `Attempting to auto-create SIM 2 if not exists`,
            msisdn: formData.sim_2,
            persona: formData.sim_2_persona,
            deviceTrackingId: deviceTrackingId
          }
        });

        const sim2Result = await autoCreateSimEntry(
          client,
          formData.sim_2,
          formData.sim_2_persona,
          deviceTrackingId,
          userInfo,
          simCreationData
        );
        
        if (sim2Result && sim2Result.auto_created) {
          autoCreatedSims.push(formData.sim_2);
          logger.debug('DEVICE_TRACKER_SIM2_AUTO_CREATION_SUCCESS', {
            meta: {
              eid: eid,
              sid: sessionId,
              taskName: 'DeviceTracker',
              action: 'sim_auto_creation',
              step: 'sim2_created',
              details: `SIM 2 auto-created successfully`,
              msisdn: formData.sim_2,
              simTrackingId: sim2Result.st_id,
              deviceTrackingId: deviceTrackingId
            }
          });
        } else if (sim2Result && sim2Result.exists) {
          logger.debug('DEVICE_TRACKER_SIM2_ALREADY_EXISTS', {
            meta: {
              eid: eid,
              sid: sessionId,
              taskName: 'DeviceTracker',
              action: 'sim_auto_creation',
              step: 'sim2_exists',
              details: `SIM 2 already exists in database, skipping auto-creation`,
              msisdn: formData.sim_2,
              existingSimId: sim2Result.st_id
            }
          });
        }
      } catch (error) {
        logger.error('DEVICE_TRACKER_SIM2_AUTO_CREATION_FAILED', {
          error: error.message,
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'DeviceTracker',
            action: 'sim_auto_creation',
            step: 'sim2_creation_failed',
            details: `SIM 2 auto-creation failed, but continuing with device creation`,
            msisdn: formData.sim_2,
            deviceTrackingId: deviceTrackingId
          }
        });
        // Continue with device creation even if SIM auto-creation fails
      }
    }

    logger.debug('DEVICE_TRACKER_SIM_AUTO_CREATION_COMPLETED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'sim_auto_creation',
        step: 'auto_creation_completed',
        details: `SIM auto-creation process completed`,
        deviceTrackingId: deviceTrackingId,
        autoCreatedSimsCount: autoCreatedSims.length,
        autoCreatedSims: autoCreatedSims
      }
    });

    // Update existing SIM records with device tag (existing functionality)
    const updatedSims = await updateSimRecordsWithDeviceTag(
      client, 
      deviceTrackingId, 
      formData.sim_1, 
      formData.sim_2
    );

    // Create notifications
    logger.debug('DEVICE_TRACKER_NOTIFICATION_CREATION_STARTED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'create_notifications',
        step: 'generating_notification_ids',
        details: 'Creating admin and user notifications for device tracking'
      }
    });

    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details', client);
    const userNotificationId = await generateNotificationId('UN', 'user_notification_details', client);

    logger.debug('DEVICE_TRACKER_ADMIN_NOTIFICATION_INSERTING', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'create_notifications',
        step: 'insert_admin_notification',
        details: `Inserting admin notification`,
        adminNotificationId: adminNotificationId,
        deviceTrackingId: deviceTrackingId
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

    logger.debug('DEVICE_TRACKER_USER_NOTIFICATION_INSERTING', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'create_notifications',
        step: 'insert_user_notification',
        details: `Inserting user notification`,
        userNotificationId: userNotificationId,
        deviceTrackingId: deviceTrackingId
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
    logger.debug('DEVICE_TRACKER_ACTIVITY_LOG_INSERTING', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'log_activity',
        step: 'insert_activity_log',
        details: `Logging user activity for device tracking`,
        deviceTrackingId: deviceTrackingId,
        userId: socPortalId
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
    logger.debug('DEVICE_TRACKER_TELEGRAM_ALERT_PREPARING', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'send_telegram_alert',
        step: 'formatting_message',
        details: 'Preparing Telegram alert message',
        deviceTrackingId: deviceTrackingId
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
        eid: eid,
        trackedBy: userInfo.short_name,
        ipAddress: ipAddress,
        userAgent: userAgent,
        imei2: formData.imei_2,
        sim1: formData.sim_1,
        sim1Persona: formData.sim_1_persona,
        sim2: formData.sim_2,
        sim2Persona: formData.sim_2_persona,
        returnDate: returnDate,
        remark: formData.remark,
        deviceStatus: formData.device_status,
        deviceStatusDetails: formData.device_status_details,
        autoCreatedSims: autoCreatedSims // Pass auto-created SIMs for alert
      }
    );

    logger.debug('DEVICE_TRACKER_TELEGRAM_ALERT_SENDING', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'send_telegram_alert',
        step: 'sending_message',
        details: `Sending Telegram alert`,
        deviceTrackingId: deviceTrackingId,
        messageLength: telegramMessage.length
      }
    });

    await sendTelegramAlert(telegramMessage);

    logger.debug('DEVICE_TRACKER_TRANSACTION_COMMITTING', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'database_operation',
        step: 'commit_transaction',
        details: 'Finalizing database transaction - committing changes'
      }
    });

    await client.query('COMMIT');

    const requestDuration = Date.now() - requestStartTime;
    
    logger.info('DEVICE_TRACKER_SUBMISSION_COMPLETED_SUCCESS', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'submission_completed',
        step: 'success',
        details: `Device tracker submission completed successfully`,
        deviceTrackingId: deviceTrackingId,
        userId: socPortalId,
        brandName: formData.brand_name,
        deviceModel: formData.device_model,
        autoCreatedSimsCount: autoCreatedSims.length,
        updatedSimsCount: updatedSims.length,
        processingTimeMs: requestDuration
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Device information saved successfully',
      device_tracking_id: deviceTrackingId,
      updated_sims: updatedSims,
      auto_created_sims: autoCreatedSims.length,
      auto_created_sims_details: autoCreatedSims
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorDuration = Date.now() - requestStartTime;
    
    if (client) {
      logger.debug('DEVICE_TRACKER_TRANSACTION_ROLLBACK', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'DeviceTracker',
          action: 'error_handling',
          step: 'rollback_transaction',
          details: 'Rolling back database transaction due to error'
        }
      });
      
      await client.query('ROLLBACK');
    }
    
    logger.error('DEVICE_TRACKER_SUBMISSION_FAILED', {
      error: error.message,
      stack: error.stack,
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'DeviceTracker',
        action: 'error_handling',
        step: 'submission_failed',
        details: `Device tracker submission failed after ${errorDuration}ms`,
        userId: socPortalId,
        processingTimeMs: errorDuration
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
        logger.debug('DEVICE_TRACKER_DATABASE_CONNECTION_RELEASING', {
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'DeviceTracker',
            action: 'cleanup',
            step: 'release_connection',
            details: 'Releasing database connection back to pool'
          }
        });
        
        if (client.release) {
          await client.release();
        }
      } catch (error) {
        logger.error('DEVICE_TRACKER_CONNECTION_RELEASE_FAILED', {
          error: error.message,
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'DeviceTracker',
            action: 'cleanup',
            step: 'release_failed',
            details: 'Failed to release database connection'
          }
        });
      }
    }
  }
}