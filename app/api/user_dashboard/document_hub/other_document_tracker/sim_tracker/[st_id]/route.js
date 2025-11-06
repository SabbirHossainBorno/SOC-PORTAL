//app/api/user_dashboard/document_hub/other_document_tracker/sim_tracker/[st_id]/route.js
import { query, getDbConnection } from '../../../../../../../lib/db';
import logger from '../../../../../../../lib/logger';

export async function GET(request, { params }) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';

  const { st_id } = params;

  try {
    logger.info('Fetching single SIM information', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GetSimDetails',
        details: `Fetching SIM: ${st_id}`,
        userId: socPortalId
      }
    });

    const queryString = `
      SELECT 
        st_id,
        msisdn,
        mno,
        assigned_persona,
        profile_type,
        msisdn_status,
        device_tag,
        handed_over,
        handover_date,
        return_date,
        remark,
        track_by,
        created_at,
        update_by,
        updated_at
      FROM sim_info 
      WHERE st_id = $1
    `;

    const result = await query(queryString, [st_id]);

    if (result.rows.length === 0) {
      logger.warn('SIM not found', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'GetSimDetails',
          details: `SIM ${st_id} not found`,
          userId: socPortalId
        }
      });

      return new Response(JSON.stringify({
        success: false,
        message: 'SIM not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sim = result.rows[0];

    logger.info('SIM details fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GetSimDetails',
        details: `Successfully fetched SIM: ${st_id}`,
        userId: socPortalId
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: sim
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Error fetching SIM details', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GetSimDetails',
        details: `Unexpected error: ${error.message}`,
        error: error.message,
        stack: error.stack
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch SIM details',
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

  const { st_id } = params;
  const requestStartTime = Date.now();
  
  logger.info('SIM update request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'UpdateSim',
      details: `User ${socPortalId} updating SIM: ${st_id}`,
      userId: socPortalId
    }
  });

  let client;
  try {
    const formData = await request.json();

    logger.debug('SIM update form data received', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdateSim',
        details: `Update fields: ${Object.keys(formData).join(', ')}`
      }
    });

    // Validate required fields
    if (!formData.assigned_persona || !formData.profile_type || !formData.msisdn_status) {
      logger.warn('SIM update validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UpdateSim',
          details: 'Missing required fields: assigned_persona, profile_type, and msisdn_status'
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Assigned Persona, Profile Type, and MSISDN Status are required'
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
      
      logger.warn('User not found during SIM update', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UpdateSim',
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
      
      logger.warn('Date validation failed during SIM update', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UpdateSim',
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

    // Update SIM information
    const updateQuery = `
      UPDATE sim_info 
      SET 
        assigned_persona = $1,
        profile_type = $2,
        msisdn_status = $3,
        handed_over = $4,
        handover_date = $5,
        return_date = $6,
        remark = $7,
        update_by = $8,
        updated_at = NOW()
      WHERE st_id = $9
      RETURNING *
    `;
    
    const updateParams = [
      formData.assigned_persona,
      formData.profile_type,
      formData.msisdn_status,
      formData.handed_over || null,
      handoverDate,
      returnDate,
      formData.remark || null,
      userInfo.short_name,
      st_id
    ];

    const updateResult = await client.query(updateQuery, updateParams);

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      
      logger.warn('SIM not found during update', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UpdateSim',
          details: `SIM ${st_id} not found for update`
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'SIM not found'
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
        'UPDATE_SIM_TRACKER',
        `Updated SIM tracker for ${st_id}`,
        eid,
        sessionId,
        ipAddress,
        userAgent
      ]
    );

    await client.query('COMMIT');

    logger.info('SIM updated successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdateSim',
        details: `SIM ${st_id} updated successfully by ${userInfo.short_name}`,
        userId: socPortalId,
        simTrackingId: st_id
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'SIM information updated successfully',
      data: updateResult.rows[0]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    
    logger.error('Error updating SIM', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdateSim',
        details: `Unexpected error: ${error.message}`,
        error: error.message,
        stack: error.stack
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to update SIM information',
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
            taskName: 'UpdateSim',
            details: 'Failed to release database connection'
          }
        });
      }
    }
  }
}