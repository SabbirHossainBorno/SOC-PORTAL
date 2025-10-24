// app/api/user_dashboard/document_hub/other_document_tracker/device_tracker/[dt_id]/route.js
import { query, getDbConnection } from '../../../../../../../lib/db';
import logger from '../../../../../../../lib/logger';

export async function GET(request, { params }) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';

  const { dt_id } = params;

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

    const result = await query(queryString, [dt_id]);

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
  }
}

export async function PUT(request, { params }) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  const { dt_id } = params;
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

    client = await getDbConnection();
    await client.query('BEGIN');

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
      formData.sim_1 || null,
      formData.sim_1_persona || null,
      formData.sim_2 || null,
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
        details: `Device ${dt_id} updated successfully by ${userInfo.short_name}`,
        userId: socPortalId,
        deviceTrackingId: dt_id
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Device information updated successfully',
      data: updateResult.rows[0]
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