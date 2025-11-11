// app/api/user_dashboard/document_hub/other_document_tracker/device_tracker/[dt_id]/route.js
import { getDbConnection } from '../../../../../../../lib/db';
import logger from '../../../../../../../lib/logger';
import sendTelegramAlert from '../../../../../../../lib/telegramAlert';
import { getCurrentDateTime } from '../../../../../../../lib/auditUtils';

// Generate SIM Tracking ID for auto-creation
const generateSimTrackingId = async (client) => {
  try {
    logger.debug('SIM_TRACKER_ID_GENERATION_STARTED', {
      meta: {
        taskName: 'UpdateDevice',
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
        taskName: 'UpdateDevice',
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
        taskName: 'UpdateDevice',
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
  const { eid, sessionId, socPortalId, ipAddress, userAgent } = additionalData;
  
  try {
    if (!msisdn || msisdn.length !== 11) {
      logger.debug('SIM_AUTO_CREATION_SKIPPED_INVALID_MSISDN', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
          action: 'auto_create_sim',
          step: 'validation_failed',
          details: `Skipping SIM auto-creation - invalid MSISDN format or length`,
          msisdn: msisdn,
          msisdnLength: msisdn?.length || 0,
          deviceTrackingId: deviceTrackingId,
          userId: socPortalId
        }
      });
      return null;
    }

    logger.debug('SIM_AUTO_CREATION_CHECK_STARTED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'auto_create_sim',
        step: 'check_existing_sim',
        details: `Checking if SIM already exists in database before auto-creation`,
        msisdn: msisdn,
        deviceTrackingId: deviceTrackingId,
        persona: persona,
        userId: socPortalId
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
          eid: eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
          action: 'auto_create_sim',
          step: 'sim_already_exists',
          details: `SIM already exists in database, skipping auto-creation`,
          msisdn: msisdn,
          existingSimId: existingSim.rows[0].st_id,
          deviceTrackingId: deviceTrackingId,
          userId: socPortalId
        }
      });
      return { exists: true, st_id: existingSim.rows[0].st_id };
    }

    logger.debug('SIM_AUTO_CREATION_PROCEEDING', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'auto_create_sim',
        step: 'creating_new_sim',
        details: `SIM not found in database, proceeding with auto-creation`,
        msisdn: msisdn,
        deviceTrackingId: deviceTrackingId,
        persona: persona,
        userId: socPortalId
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
          eid: eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
          action: 'auto_create_sim',
          step: 'mno_detection_failed',
          details: `Could not detect MNO from MSISDN prefix`,
          msisdn: msisdn,
          simTrackingId: simTrackingId,
          userId: socPortalId
        }
      });
    }

    logger.debug('SIM_AUTO_CREATION_PARAMS_PREPARED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'auto_create_sim',
        step: 'preparing_insert_params',
        details: `Preparing SIM insertion parameters`,
        simTrackingId: simTrackingId,
        msisdn: msisdn,
        mno: mno,
        persona: persona || 'N/A',
        profileType: profileType,
        deviceTrackingId: deviceTrackingId,
        userId: socPortalId
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
      additionalData.remark || `Auto-created from device update: ${deviceTrackingId}`,
      userInfo.short_name
    ];

    await client.query(insertQuery, insertParams);

    logger.info('SIM_AUTO_CREATION_SUCCESS', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'auto_create_sim',
        step: 'sim_created_success',
        details: `SIM auto-created successfully from device update`,
        simTrackingId: simTrackingId,
        msisdn: msisdn,
        deviceTrackingId: deviceTrackingId,
        persona: persona || 'N/A',
        profileType: profileType,
        msisdnStatus: 'ACTIVE',
        trackedBy: userInfo.short_name,
        userId: socPortalId
      }
    });

    // Create notifications for auto-created SIM
    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details', client);
    const userNotificationId = await generateNotificationId('UN', 'user_notification_details', client);

    logger.debug('SIM_AUTO_CREATION_NOTIFICATIONS_CREATING', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'auto_create_sim',
        step: 'creating_notifications',
        details: `Creating admin and user notifications for auto-created SIM`,
        simTrackingId: simTrackingId,
        adminNotificationId: adminNotificationId,
        userNotificationId: userNotificationId,
        userId: socPortalId
      }
    });

    await client.query(
      'INSERT INTO admin_notification_details (notification_id, title, status) VALUES ($1, $2, $3)',
      [
        adminNotificationId,
        `SIM Auto-Created from Device Update: ${msisdn} (${simTrackingId}) for Device ${deviceTrackingId} By ${userInfo.short_name}`,
        'Unread'
      ]
    );

    await client.query(
      'INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id) VALUES ($1, $2, $3, $4)',
      [
        userNotificationId,
        `SIM Auto-Created: ${msisdn} (${simTrackingId}) for Device ${deviceTrackingId}`,
        'Unread',
        socPortalId
      ]
    );

    // Log activity for auto-created SIM
    await client.query(
      'INSERT INTO user_activity_log (soc_portal_id, action, description, eid, sid, ip_address, device_info) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        socPortalId,
        'AUTO_CREATE_SIM_TRACKER_UPDATE',
        `Auto-created SIM tracker for ${msisdn} (${simTrackingId}) from device update ${deviceTrackingId}`,
        eid,
        sessionId,
        ipAddress,
        userAgent
      ]
    );

    logger.debug('SIM_AUTO_CREATION_COMPLETED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'auto_create_sim',
        step: 'sim_creation_complete',
        details: `SIM auto-creation process completed successfully`,
        simTrackingId: simTrackingId,
        msisdn: msisdn,
        deviceTrackingId: deviceTrackingId,
        userId: socPortalId
      }
    });

    return { exists: false, st_id: simTrackingId, auto_created: true };

  } catch (error) {
    logger.error('SIM_AUTO_CREATION_FAILED', {
      error: error.message,
      stack: error.stack,
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'auto_create_sim',
        step: 'creation_failed',
        details: `Failed to auto-create SIM entry in database`,
        msisdn: msisdn,
        deviceTrackingId: deviceTrackingId,
        persona: persona,
        userId: socPortalId
      }
    });
    throw new Error(`Error auto-creating SIM entry: ${error.message}`);
  }
};

// Generate notification IDs
const generateNotificationId = async (prefix, table, client) => {
  try {
    logger.debug('NOTIFICATION_ID_GENERATION_STARTED', {
      meta: {
        taskName: 'UpdateDevice',
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
        taskName: 'UpdateDevice',
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
        taskName: 'UpdateDevice',
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

// Format Telegram alert for device update
const formatDeviceUpdateAlert = (deviceTrackingId, brandName, deviceModel, imei1, handoverTo, handoverDate, purpose, additionalInfo = {}) => {
  const time = getCurrentDateTime();
  const userId = additionalInfo.userId || 'N/A';
  const eid = additionalInfo.eid || 'N/A';
  const updatedBy = additionalInfo.updatedBy || 'N/A';
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
  
  const message = `📱 SOC PORTAL | DEVICE UPDATE 📱
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
👤 Updated By         : ${updatedBy}
👤 Reported By        : ${userId}
🌐 IP Address         : ${ipAddress}
🖥️ Device Info        : ${userAgent}
🔖 EID                : ${eid}
🕒 Update Time        : ${time}`;
  
  return message;
};

// Helper function to update SIM records with device tag
const updateSimRecordsWithDeviceTag = async (client, deviceTrackingId, sim1, sim2, additionalData = {}) => {
  const { eid, sessionId, socPortalId } = additionalData;
  
  try {
    logger.debug('SIM_RECORDS_UPDATE_WITH_DEVICE_TAG_STARTED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'update_sim_records',
        step: 'starting_sim_update',
        details: `Updating SIM records with device tag`,
        deviceTrackingId: deviceTrackingId,
        sim1: sim1,
        sim2: sim2,
        userId: socPortalId
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
            eid: eid,
            sid: sessionId,
            taskName: 'UpdateDevice',
            action: 'update_sim_records',
            step: 'sim1_updated',
            details: `SIM 1 updated with device tag successfully`,
            msisdn: sim1,
            simId: sim1Check.rows[0].st_id,
            deviceTrackingId: deviceTrackingId,
            userId: socPortalId
          }
        });
      } else {
        logger.debug('SIM_1_NOT_FOUND_FOR_UPDATE', {
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'UpdateDevice',
            action: 'update_sim_records',
            step: 'sim1_not_found',
            details: `SIM 1 not found in sim_info table, skipping device tag update`,
            msisdn: sim1,
            userId: socPortalId
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
            eid: eid,
            sid: sessionId,
            taskName: 'UpdateDevice',
            action: 'update_sim_records',
            step: 'sim2_updated',
            details: `SIM 2 updated with device tag successfully`,
            msisdn: sim2,
            simId: sim2Check.rows[0].st_id,
            deviceTrackingId: deviceTrackingId,
            userId: socPortalId
          }
        });
      } else {
        logger.debug('SIM_2_NOT_FOUND_FOR_UPDATE', {
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'UpdateDevice',
            action: 'update_sim_records',
            step: 'sim2_not_found',
            details: `SIM 2 not found in sim_info table, skipping device tag update`,
            msisdn: sim2,
            userId: socPortalId
          }
        });
      }
    }

    logger.info('SIM_RECORDS_UPDATE_COMPLETED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'update_sim_records',
        step: 'sim_update_completed',
        details: `SIM records update process completed`,
        deviceTrackingId: deviceTrackingId,
        updatedSimsCount: updatedSims.length,
        updatedSims: updatedSims,
        userId: socPortalId
      }
    });

    return updatedSims;
  } catch (error) {
    logger.error('SIM_RECORDS_UPDATE_FAILED', {
      error: error.message,
      stack: error.stack,
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'update_sim_records',
        step: 'sim_update_failed',
        details: 'Failed to update SIM records with device tag',
        deviceTrackingId: deviceTrackingId,
        userId: socPortalId
      }
    });
    throw new Error(`Error updating SIM records: ${error.message}`);
  }
};

// Helper function to unbind SIMs that are no longer associated
const unbindRemovedSims = async (client, deviceTrackingId, oldSim1, oldSim2, newSim1, newSim2, additionalData = {}) => {
  const { eid, sessionId, socPortalId } = additionalData;
  
  try {
    logger.debug('UNBIND_REMOVED_SIMS_STARTED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'unbind_sims',
        step: 'starting_unbind',
        details: `Unbinding SIMs for device: ${deviceTrackingId}, Old SIMs: ${oldSim1}, ${oldSim2}, New SIMs: ${newSim1}, ${newSim2}`,
        userId: socPortalId
      }
    });

    const unboundSims = [];

    // Check if old SIM 1 is being removed or changed
    if (oldSim1 && oldSim1 !== newSim1) {
      const simCheck = await client.query(
        'SELECT st_id FROM sim_info WHERE msisdn = $1 AND device_tag = $2',
        [oldSim1, deviceTrackingId]
      );

      if (simCheck.rows.length > 0) {
        await client.query(
          'UPDATE sim_info SET device_tag = NULL, updated_at = NOW() WHERE msisdn = $1 AND device_tag = $2',
          [oldSim1, deviceTrackingId]
        );
        unboundSims.push({ msisdn: oldSim1, st_id: simCheck.rows[0].st_id });
        logger.debug('OLD_SIM_1_UNBOUND_FROM_DEVICE', {
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'UpdateDevice',
            action: 'unbind_sims',
            step: 'sim1_unbound',
            details: `SIM ${oldSim1} (${simCheck.rows[0].st_id}) unbound from device: ${deviceTrackingId}`,
            userId: socPortalId
          }
        });
      }
    }

    // Check if old SIM 2 is being removed or changed
    if (oldSim2 && oldSim2 !== newSim2) {
      const simCheck = await client.query(
        'SELECT st_id FROM sim_info WHERE msisdn = $1 AND device_tag = $2',
        [oldSim2, deviceTrackingId]
      );

      if (simCheck.rows.length > 0) {
        await client.query(
          'UPDATE sim_info SET device_tag = NULL, updated_at = NOW() WHERE msisdn = $1 AND device_tag = $2',
          [oldSim2, deviceTrackingId]
        );
        unboundSims.push({ msisdn: oldSim2, st_id: simCheck.rows[0].st_id });
        logger.debug('OLD_SIM_2_UNBOUND_FROM_DEVICE', {
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'UpdateDevice',
            action: 'unbind_sims',
            step: 'sim2_unbound',
            details: `SIM ${oldSim2} (${simCheck.rows[0].st_id}) unbound from device: ${deviceTrackingId}`,
            userId: socPortalId
          }
        });
      }
    }

    logger.info('SIM_UNBINDING_COMPLETED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'unbind_sims',
        step: 'unbind_completed',
        details: `SIM unbinding process completed`,
        deviceTrackingId: deviceTrackingId,
        unboundSimsCount: unboundSims.length,
        unboundSims: unboundSims,
        userId: socPortalId
      }
    });

    return unboundSims;
  } catch (error) {
    logger.error('SIM_UNBINDING_FAILED', {
      error: error.message,
      stack: error.stack,
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'unbind_sims',
        step: 'unbind_failed',
        details: 'Failed to unbind SIM records',
        deviceTrackingId: deviceTrackingId,
        userId: socPortalId
      }
    });
    throw new Error(`Error unbinding SIM records: ${error.message}`);
  }
};

export async function GET(request, { params }) {
  // Await the params first
  const { dt_id } = await params;
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';

  let client;
  try {
    logger.info('FETCHING_SINGLE_DEVICE_INFORMATION', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'GetDeviceDetails',
        action: 'fetch_device',
        step: 'request_received',
        details: `Fetching device: ${dt_id}`,
        userId: socPortalId
      }
    });

    // Get database connection
    client = await getDbConnection().connect();
    await client.query(`SET TIME ZONE 'Asia/Dhaka';`);

    const queryString = `
      SELECT 
        dt_id,
        brand_name,
        device_model,
        imei_1,
        imei_2,
        sim_1,
        sim_1_persona,
        sim_2,
        sim_2_persona,
        purpose,
        handover_to,
        handover_date,
        return_date,
        remark,
        track_by,
        device_status,
        device_status_details,
        created_at,
        update_by,
        updated_at
      FROM device_info 
      WHERE dt_id = $1
    `;

    const result = await client.query(queryString, [dt_id]);

    if (result.rows.length === 0) {
      logger.warn('DEVICE_NOT_FOUND', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'GetDeviceDetails',
          action: 'fetch_device',
          step: 'device_not_found',
          details: `Device ${dt_id} not found`,
          userId: socPortalId
        }
      });

      return new Response(JSON.stringify({
        success: false,
        message: 'Device not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const device = result.rows[0];

    logger.info('DEVICE_DETAILS_FETCHED_SUCCESS', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'GetDeviceDetails',
        action: 'fetch_device',
        step: 'success',
        details: `Successfully fetched device: ${dt_id}`,
        userId: socPortalId
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: device
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('ERROR_FETCHING_DEVICE_DETAILS', {
      error: error.message,
      stack: error.stack,
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'GetDeviceDetails',
        action: 'fetch_device',
        step: 'error',
        details: `Unexpected error: ${error.message}`,
        userId: socPortalId
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch device details',
      error: error.message
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
        logger.error('DATABASE_CONNECTION_RELEASE_FAILED', {
          error: error.message,
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'GetDeviceDetails',
            action: 'cleanup',
            step: 'release_failed',
            details: 'Failed to release database connection',
            userId: socPortalId
          }
        });
      }
    }
  }
}

export async function PUT(request, { params }) {
  // Await the params first
  const { dt_id } = await params;
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  const requestStartTime = Date.now();
  
  logger.info('DEVICE_UPDATE_REQUEST_RECEIVED', {
    meta: {
      eid: eid,
      sid: sessionId,
      taskName: 'UpdateDevice',
      action: 'request_received',
      step: 'request_start',
      details: `User ${socPortalId} updating device: ${dt_id}`,
      userId: socPortalId
    }
  });

  let client;
  try {
    const formData = await request.json();

    logger.debug('DEVICE_UPDATE_FORM_DATA_RECEIVED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'parse_request',
        step: 'json_parsed',
        details: `Update fields: ${Object.keys(formData).join(', ')}`,
        userId: socPortalId
      }
    });

    // Validate required fields
    if (!formData.purpose || !formData.device_status) {
      logger.warn('DEVICE_UPDATE_VALIDATION_FAILED', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
          action: 'validate_form',
          step: 'validation_failed',
          details: 'Missing required fields: purpose and device_status',
          userId: socPortalId
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Purpose and Device Status are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate device status details when status is "Not Working"
    if (formData.device_status === 'Not Working' && !formData.device_status_details?.trim()) {
      logger.warn('DEVICE_STATUS_DETAILS_VALIDATION_FAILED', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
          action: 'validate_form',
          step: 'status_details_validation',
          details: 'Device status details required when status is "Not Working"',
          userId: socPortalId
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

    client = await getDbConnection().connect();
    await client.query(`SET TIME ZONE 'Asia/Dhaka';`);
    await client.query('BEGIN');

    // Get current device information to compare SIM changes
    const currentDeviceResult = await client.query(
      'SELECT brand_name, device_model, imei_1, imei_2, sim_1, sim_2 FROM device_info WHERE dt_id = $1',
      [dt_id]
    );

    if (currentDeviceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      
      logger.warn('DEVICE_NOT_FOUND_DURING_UPDATE', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
          action: 'database_operation',
          step: 'device_not_found',
          details: `Device ${dt_id} not found for update`,
          userId: socPortalId
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Device not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const currentDevice = currentDeviceResult.rows[0];
    const oldSim1 = currentDevice.sim_1;
    const oldSim2 = currentDevice.sim_2;
    const newSim1 = formData.sim_1 || null;
    const newSim2 = formData.sim_2 || null;

    logger.debug('SIM_CHANGE_DETECTION', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'sim_management',
        step: 'change_detected',
        details: `Old SIMs: ${oldSim1}, ${oldSim2} | New SIMs: ${newSim1}, ${newSim2}`,
        userId: socPortalId
      }
    });

    // Get user info for update_by field
    const userResponse = await client.query(
      'SELECT short_name FROM user_info WHERE soc_portal_id = $1',
      [socPortalId]
    );
    
    const userInfo = userResponse.rows[0];
    if (!userInfo) {
      await client.query('ROLLBACK');
      
      logger.warn('USER_NOT_FOUND_DURING_DEVICE_UPDATE', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
          action: 'database_operation',
          step: 'user_not_found',
          details: `No user found with SOC Portal ID: ${socPortalId}`,
          userId: socPortalId
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

    // Create common additional data object for all functions
    const commonAdditionalData = {
      eid: eid,
      sessionId: sessionId,
      socPortalId: socPortalId,
      ipAddress: ipAddress,
      userAgent: userAgent,
      handed_over: formData.handover_to,
      handover_date: formData.handover_date,
      return_date: formData.return_date,
      remark: formData.remark
    };

    // Process date fields - convert empty strings to null
    const handoverDate = formData.handover_date && formData.handover_date.trim() !== '' 
      ? formData.handover_date 
      : null;
      
    const returnDate = formData.return_date && formData.return_date.trim() !== '' 
      ? formData.return_date 
      : null;

    // Validate dates only if both are provided
    if (handoverDate && returnDate && new Date(returnDate) <= new Date(handoverDate)) {
      await client.query('ROLLBACK');
      
      logger.warn('DATE_VALIDATION_FAILED_DURING_UPDATE', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
          action: 'validate_form',
          step: 'date_validation_failed',
          details: `Return date (${returnDate}) must be after handover date (${handoverDate})`,
          userId: socPortalId
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

    // NEW LOGIC: Auto-create SIM entries if they don't exist
    const autoCreatedSims = [];

    logger.debug('DEVICE_UPDATE_SIM_AUTO_CREATION_STARTED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'sim_auto_creation',
        step: 'starting_auto_creation',
        details: 'Starting SIM auto-creation process for provided SIM numbers',
        deviceTrackingId: dt_id,
        sim1Provided: !!newSim1,
        sim2Provided: !!newSim2,
        userId: socPortalId
      }
    });

    // Auto-create SIM 1 if provided and doesn't exist
    if (newSim1) {
      try {
        logger.debug('DEVICE_UPDATE_SIM1_AUTO_CREATION_ATTEMPT', {
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'UpdateDevice',
            action: 'sim_auto_creation',
            step: 'sim1_creation_attempt',
            details: `Attempting to auto-create SIM 1 if not exists`,
            msisdn: newSim1,
            persona: formData.sim_1_persona,
            deviceTrackingId: dt_id,
            userId: socPortalId
          }
        });

        const sim1Result = await autoCreateSimEntry(
          client,
          newSim1,
          formData.sim_1_persona,
          dt_id,
          userInfo,
          commonAdditionalData
        );
        
        if (sim1Result && sim1Result.auto_created) {
          autoCreatedSims.push(newSim1);
          logger.debug('DEVICE_UPDATE_SIM1_AUTO_CREATION_SUCCESS', {
            meta: {
              eid: eid,
              sid: sessionId,
              taskName: 'UpdateDevice',
              action: 'sim_auto_creation',
              step: 'sim1_created',
              details: `SIM 1 auto-created successfully`,
              msisdn: newSim1,
              simTrackingId: sim1Result.st_id,
              deviceTrackingId: dt_id,
              userId: socPortalId
            }
          });
        } else if (sim1Result && sim1Result.exists) {
          logger.debug('DEVICE_UPDATE_SIM1_ALREADY_EXISTS', {
            meta: {
              eid: eid,
              sid: sessionId,
              taskName: 'UpdateDevice',
              action: 'sim_auto_creation',
              step: 'sim1_exists',
              details: `SIM 1 already exists in database, skipping auto-creation`,
              msisdn: newSim1,
              existingSimId: sim1Result.st_id,
              userId: socPortalId
            }
          });
        }
      } catch (error) {
        logger.error('DEVICE_UPDATE_SIM1_AUTO_CREATION_FAILED', {
          error: error.message,
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'UpdateDevice',
            action: 'sim_auto_creation',
            step: 'sim1_creation_failed',
            details: `SIM 1 auto-creation failed, but continuing with device update`,
            msisdn: newSim1,
            deviceTrackingId: dt_id,
            userId: socPortalId
          }
        });
        // Continue with device update even if SIM auto-creation fails
      }
    }

    // Auto-create SIM 2 if provided and doesn't exist
    if (newSim2) {
      try {
        logger.debug('DEVICE_UPDATE_SIM2_AUTO_CREATION_ATTEMPT', {
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'UpdateDevice',
            action: 'sim_auto_creation',
            step: 'sim2_creation_attempt',
            details: `Attempting to auto-create SIM 2 if not exists`,
            msisdn: newSim2,
            persona: formData.sim_2_persona,
            deviceTrackingId: dt_id,
            userId: socPortalId
          }
        });

        const sim2Result = await autoCreateSimEntry(
          client,
          newSim2,
          formData.sim_2_persona,
          dt_id,
          userInfo,
          commonAdditionalData
        );
        
        if (sim2Result && sim2Result.auto_created) {
          autoCreatedSims.push(newSim2);
          logger.debug('DEVICE_UPDATE_SIM2_AUTO_CREATION_SUCCESS', {
            meta: {
              eid: eid,
              sid: sessionId,
              taskName: 'UpdateDevice',
              action: 'sim_auto_creation',
              step: 'sim2_created',
              details: `SIM 2 auto-created successfully`,
              msisdn: newSim2,
              simTrackingId: sim2Result.st_id,
              deviceTrackingId: dt_id,
              userId: socPortalId
            }
          });
        } else if (sim2Result && sim2Result.exists) {
          logger.debug('DEVICE_UPDATE_SIM2_ALREADY_EXISTS', {
            meta: {
              eid: eid,
              sid: sessionId,
              taskName: 'UpdateDevice',
              action: 'sim_auto_creation',
              step: 'sim2_exists',
              details: `SIM 2 already exists in database, skipping auto-creation`,
              msisdn: newSim2,
              existingSimId: sim2Result.st_id,
              userId: socPortalId
            }
          });
        }
      } catch (error) {
        logger.error('DEVICE_UPDATE_SIM2_AUTO_CREATION_FAILED', {
          error: error.message,
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'UpdateDevice',
            action: 'sim_auto_creation',
            step: 'sim2_creation_failed',
            details: `SIM 2 auto-creation failed, but continuing with device update`,
            msisdn: newSim2,
            deviceTrackingId: dt_id,
            userId: socPortalId
          }
        });
        // Continue with device update even if SIM auto-creation fails
      }
    }

    logger.debug('DEVICE_UPDATE_SIM_AUTO_CREATION_COMPLETED', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'sim_auto_creation',
        step: 'auto_creation_completed',
        details: `SIM auto-creation process completed`,
        deviceTrackingId: dt_id,
        autoCreatedSimsCount: autoCreatedSims.length,
        autoCreatedSims: autoCreatedSims,
        userId: socPortalId
      }
    });

    // Unbind SIMs that are being removed or changed
    const unboundSims = await unbindRemovedSims(
      client, 
      dt_id, 
      oldSim1, 
      oldSim2, 
      newSim1, 
      newSim2,
      commonAdditionalData
    );

    // Update device information
    const updateQuery = `
      UPDATE device_info 
      SET 
        sim_1 = $1,
        sim_1_persona = $2,
        sim_2 = $3,
        sim_2_persona = $4,
        purpose = $5,
        handover_to = $6,
        handover_date = $7,
        return_date = $8,
        remark = $9,
        device_status = $10,
        device_status_details = $11,
        update_by = $12,
        updated_at = NOW()
      WHERE dt_id = $13
      RETURNING *
    `;
    
    const updateParams = [
      newSim1,
      formData.sim_1_persona || null,
      newSim2,
      formData.sim_2_persona || null,
      formData.purpose,
      formData.handover_to || null,
      handoverDate,
      returnDate,
      formData.remark || null,
      formData.device_status,
      formData.device_status_details || null,
      userInfo.short_name,
      dt_id
    ];

    const updateResult = await client.query(updateQuery, updateParams);

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      
      logger.warn('DEVICE_NOT_FOUND_DURING_UPDATE_AFTER_CHECK', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
          action: 'database_operation',
          step: 'device_not_found',
          details: `Device ${dt_id} not found for update after initial check`,
          userId: socPortalId
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Device not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update existing SIM records with device tag for new/changed SIMs
    const updatedSims = await updateSimRecordsWithDeviceTag(
      client, 
      dt_id, 
      newSim1, 
      newSim2,
      commonAdditionalData
    );

    // Create notifications for device update
    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details', client);
    const userNotificationId = await generateNotificationId('UN', 'user_notification_details', client);

    logger.debug('DEVICE_UPDATE_NOTIFICATIONS_CREATING', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'create_notifications',
        step: 'generating_notification_ids',
        details: 'Creating admin and user notifications for device update',
        userId: socPortalId
      }
    });

    await client.query(
      'INSERT INTO admin_notification_details (notification_id, title, status) VALUES ($1, $2, $3)',
      [
        adminNotificationId,
        `Device Updated: ${currentDevice.brand_name} ${currentDevice.device_model} (${dt_id}) By ${userInfo.short_name}`,
        'Unread'
      ]
    );

    await client.query(
      'INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id) VALUES ($1, $2, $3, $4)',
      [
        userNotificationId,
        `Device Updated: ${currentDevice.brand_name} ${currentDevice.device_model} (${dt_id})`,
        'Unread',
        socPortalId
      ]
    );

    // Log activity
    await client.query(
      'INSERT INTO user_activity_log (soc_portal_id, action, description, eid, sid, ip_address, device_info) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        socPortalId,
        'UPDATE_DEVICE_TRACKER',
        `Updated device tracker for ${currentDevice.brand_name} ${currentDevice.device_model} (${dt_id})`,
        eid,
        sessionId,
        ipAddress,
        userAgent
      ]
    );

    // Send Telegram alert for device update
    logger.debug('DEVICE_UPDATE_TELEGRAM_ALERT_PREPARING', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'send_telegram_alert',
        step: 'formatting_message',
        details: 'Preparing Telegram alert message for device update',
        deviceTrackingId: dt_id,
        userId: socPortalId
      }
    });

    const telegramMessage = formatDeviceUpdateAlert(
      dt_id,
      currentDevice.brand_name,
      currentDevice.device_model,
      currentDevice.imei_1,
      formData.handover_to,
      handoverDate,
      formData.purpose,
      {
        userId: socPortalId,
        eid: eid,
        updatedBy: userInfo.short_name,
        ipAddress: ipAddress,
        userAgent: userAgent,
        imei2: currentDevice.imei_2,
        sim1: newSim1,
        sim1Persona: formData.sim_1_persona,
        sim2: newSim2,
        sim2Persona: formData.sim_2_persona,
        returnDate: returnDate,
        remark: formData.remark,
        deviceStatus: formData.device_status,
        deviceStatusDetails: formData.device_status_details,
        autoCreatedSims: autoCreatedSims // Pass auto-created SIMs for alert
      }
    );

    logger.debug('DEVICE_UPDATE_TELEGRAM_ALERT_SENDING', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'send_telegram_alert',
        step: 'sending_message',
        details: `Sending Telegram alert for device update`,
        deviceTrackingId: dt_id,
        messageLength: telegramMessage.length,
        userId: socPortalId
      }
    });

    await sendTelegramAlert(telegramMessage);

    await client.query('COMMIT');

    const requestDuration = Date.now() - requestStartTime;
    
    logger.info('DEVICE_UPDATE_COMPLETED_SUCCESS', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'update_completed',
        step: 'success',
        details: `Device update completed successfully`,
        deviceTrackingId: dt_id,
        userId: socPortalId,
        brandName: currentDevice.brand_name,
        deviceModel: currentDevice.device_model,
        autoCreatedSimsCount: autoCreatedSims.length,
        unboundSimsCount: unboundSims.length,
        updatedSimsCount: updatedSims.length,
        processingTimeMs: requestDuration
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Device information updated successfully',
      data: updateResult.rows[0],
      unbound_sims: unboundSims,
      updated_sims: updatedSims,
      auto_created_sims_count: autoCreatedSims.length,
      auto_created_sims_details: autoCreatedSims
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorDuration = Date.now() - requestStartTime;
    
    if (client) {
      logger.debug('DEVICE_UPDATE_TRANSACTION_ROLLBACK', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
          action: 'error_handling',
          step: 'rollback_transaction',
          details: 'Rolling back database transaction due to error',
          userId: socPortalId
        }
      });
      
      await client.query('ROLLBACK');
    }
    
    logger.error('DEVICE_UPDATE_FAILED', {
      error: error.message,
      stack: error.stack,
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        action: 'error_handling',
        step: 'update_failed',
        details: `Device update failed after ${errorDuration}ms`,
        deviceTrackingId: dt_id,
        userId: socPortalId,
        processingTimeMs: errorDuration
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to update device information',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    if (client) {
      try {
        logger.debug('DEVICE_UPDATE_DATABASE_CONNECTION_RELEASING', {
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'UpdateDevice',
            action: 'cleanup',
            step: 'release_connection',
            details: 'Releasing database connection back to pool',
            userId: socPortalId
          }
        });
        
        if (client.release) {
          await client.release();
        }
      } catch (error) {
        logger.error('DEVICE_UPDATE_CONNECTION_RELEASE_FAILED', {
          error: error.message,
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'UpdateDevice',
            action: 'cleanup',
            step: 'release_failed',
            details: 'Failed to release database connection',
            userId: socPortalId
          }
        });
      }
    }
  }
}