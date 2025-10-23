// app/api/user_dashboard/document_hub/other_document_log/device_tracker_log/route.js
import { query, getDbConnection } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  const requestStartTime = Date.now();
  
  logger.info('Device tracker log fetch request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'DeviceTrackerLog',
      details: `User ${socPortalId} fetching device tracker logs | IP: ${ipAddress}`
    }
  });

  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    logger.debug('Fetching device tracker logs from database', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTrackerLog',
        details: `Page: ${page}, Limit: ${limit}, Search: ${search}`
      }
    });

    let queryString = `
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
        created_at
      FROM device_info 
      WHERE 1=1
    `;
    
    let countQuery = `SELECT COUNT(*) as total FROM device_info WHERE 1=1`;
    let queryParams = [];
    let paramCount = 0;

    // Add search filter if provided
    if (search) {
      paramCount++;
      queryString += ` AND (
        brand_name ILIKE $${paramCount} OR 
        device_model ILIKE $${paramCount} OR 
        dt_id ILIKE $${paramCount} OR
        imei_1 ILIKE $${paramCount} OR
        track_by ILIKE $${paramCount}
      )`;
      countQuery += ` AND (
        brand_name ILIKE $${paramCount} OR 
        device_model ILIKE $${paramCount} OR 
        dt_id ILIKE $${paramCount} OR
        imei_1 ILIKE $${paramCount} OR
        track_by ILIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
    }

    // Add ordering and pagination
    queryString += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    // Execute count query
    const countResult = await query(countQuery, search ? [`%${search}%`] : []);
    const totalCount = parseInt(countResult.rows[0]?.total || 0);

    // Execute main query
    const result = await query(queryString, queryParams);
    const devices = result.rows;

    logger.info('Device tracker logs fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTrackerLog',
        details: `Fetched ${devices.length} devices out of ${totalCount} total`
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: devices,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Error fetching device tracker logs', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTrackerLog',
        details: `Unexpected error: ${error.message}`,
        error: error.message,
        stack: error.stack
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch device tracker logs',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}