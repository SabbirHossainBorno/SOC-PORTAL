// app/api/user_dashboard/document_hub/other_document_tracker/device_tracker/[dt_id]/route.js
import { getDbConnection } from '../../../../../../../lib/db';
import logger from '../../../../../../../lib/logger';

// Helper function to update SIM records with device tag
const updateSimRecordsWithDeviceTag = async (client, deviceTrackingId, sim1, sim2) => {
  try {
    logger.debug('Starting SIM records update with device tag', {
      meta: {
        taskName: 'UpdateDevice',
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
            taskName: 'UpdateDevice',
            details: `SIM ${sim1} (${sim1Check.rows[0].st_id}) updated with device tag: ${deviceTrackingId}`
          }
        });
      } else {
        logger.debug('SIM 1 not found in SIM table', {
          meta: {
            taskName: 'UpdateDevice',
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
            taskName: 'UpdateDevice',
            details: `SIM ${sim2} (${sim2Check.rows[0].st_id}) updated with device tag: ${deviceTrackingId}`
          }
        });
      } else {
        logger.debug('SIM 2 not found in SIM table', {
          meta: {
            taskName: 'UpdateDevice',
            details: `SIM ${sim2} not found in sim_info table, skipping device tag update`
          }
        });
      }
    }

    logger.info('SIM records update completed', {
      meta: {
        taskName: 'UpdateDevice',
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
        taskName: 'UpdateDevice',
        details: 'Failed to update SIM records with device tag'
      }
    });
    throw new Error(`Error updating SIM records: ${error.message}`);
  }
};

// Helper function to unbind SIMs that are no longer associated
const unbindRemovedSims = async (client, deviceTrackingId, oldSim1, oldSim2, newSim1, newSim2) => {
  try {
    logger.debug('Starting unbind of removed SIMs', {
      meta: {
        taskName: 'UpdateDevice',
        details: `Unbinding SIMs for device: ${deviceTrackingId}, Old SIMs: ${oldSim1}, ${oldSim2}, New SIMs: ${newSim1}, ${newSim2}`
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
        logger.debug('Old SIM 1 unbound from device', {
          meta: {
            taskName: 'UpdateDevice',
            details: `SIM ${oldSim1} (${simCheck.rows[0].st_id}) unbound from device: ${deviceTrackingId}`
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
        logger.debug('Old SIM 2 unbound from device', {
          meta: {
            taskName: 'UpdateDevice',
            details: `SIM ${oldSim2} (${simCheck.rows[0].st_id}) unbound from device: ${deviceTrackingId}`
          }
        });
      }
    }

    logger.info('SIM unbinding completed', {
      meta: {
        taskName: 'UpdateDevice',
        details: `Unbound ${unboundSims.length} SIM records from device: ${deviceTrackingId}`,
        unboundSims
      }
    });

    return unboundSims;
  } catch (error) {
    logger.error('Error unbinding SIM records', {
      error: error.message,
      stack: error.stack,
      meta: {
        taskName: 'UpdateDevice',
        details: 'Failed to unbind SIM records'
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
    logger.info('Fetching single device information', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GetDeviceDetails',
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

    // Use client.query instead of undefined 'query' function
    const result = await client.query(queryString, [dt_id]);

    if (result.rows.length === 0) {
      logger.warn('Device not found', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'GetDeviceDetails',
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

    logger.info('Device details fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GetDeviceDetails',
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
    logger.error('Error fetching device details', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GetDeviceDetails',
        details: `Unexpected error: ${error.message}`,
        error: error.message,
        stack: error.stack
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
        logger.error('Error releasing database client', {
          error: error.message,
          meta: {
            eid,
            sid: sessionId,
            taskName: 'GetDeviceDetails',
            details: 'Failed to release database connection'
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
  
  logger.info('Device update request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'UpdateDevice',
      details: `User ${socPortalId} updating device: ${dt_id}`,
      userId: socPortalId
    }
  });

  let client;
  try {
    const formData = await request.json();

    logger.debug('Device update form data received', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        details: `Update fields: ${Object.keys(formData).join(', ')}`
      }
    });

    // Validate required fields
    if (!formData.purpose || !formData.device_status) {
      logger.warn('Device update validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
          details: 'Missing required fields: purpose and device_status'
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
      logger.warn('Device status details validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
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

    client = await getDbConnection().connect();
    await client.query(`SET TIME ZONE 'Asia/Dhaka';`);
    await client.query('BEGIN');

    // Get current device information to compare SIM changes
    const currentDeviceResult = await client.query(
      'SELECT sim_1, sim_2 FROM device_info WHERE dt_id = $1',
      [dt_id]
    );

    if (currentDeviceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      
      logger.warn('Device not found during update', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
          details: `Device ${dt_id} not found for update`
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

    logger.debug('SIM change detection', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        details: `Old SIMs: ${oldSim1}, ${oldSim2} | New SIMs: ${newSim1}, ${newSim2}`
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
      
      logger.warn('User not found during device update', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
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
      
      logger.warn('Date validation failed during update', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
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

    // Unbind SIMs that are being removed or changed
    const unboundSims = await unbindRemovedSims(
      client, 
      dt_id, 
      oldSim1, 
      oldSim2, 
      newSim1, 
      newSim2
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
      
      logger.warn('Device not found during update', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UpdateDevice',
          details: `Device ${dt_id} not found for update`
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

    // Update SIM records with new device tag for new/changed SIMs
    const updatedSims = await updateSimRecordsWithDeviceTag(
      client, 
      dt_id, 
      newSim1, 
      newSim2
    );

    // Log activity
    await client.query(
      'INSERT INTO user_activity_log (soc_portal_id, action, description, eid, sid, ip_address, device_info) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        socPortalId,
        'UPDATE_DEVICE_TRACKER',
        `Updated device tracker for ${dt_id}`,
        eid,
        sessionId,
        ipAddress,
        userAgent
      ]
    );

    await client.query('COMMIT');

    logger.info('Device updated successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        details: `Device ${dt_id} updated successfully by ${userInfo.short_name} | Unbound SIMs: ${unboundSims.length} | Updated SIMs: ${updatedSims.length}`,
        userId: socPortalId,
        deviceTrackingId: dt_id,
        unboundSimsCount: unboundSims.length,
        updatedSimsCount: updatedSims.length
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Device information updated successfully',
      data: updateResult.rows[0],
      unbound_sims: unboundSims,
      updated_sims: updatedSims
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    
    logger.error('Error updating device', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdateDevice',
        details: `Unexpected error: ${error.message}`,
        error: error.message,
        stack: error.stack
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
        if (client.release) {
          await client.release();
        }
      } catch (error) {
        logger.error('Error releasing database client', {
          error: error.message,
          meta: {
            eid,
            sid: sessionId,
            taskName: 'UpdateDevice',
            details: 'Failed to release database connection'
          }
        });
      }
    }
  }
}