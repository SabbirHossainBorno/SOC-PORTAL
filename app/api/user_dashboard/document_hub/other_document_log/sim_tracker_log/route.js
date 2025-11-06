//app/api/user_dashboard/document_hub/other_document_log/sim_tracker_log/route.js
import { query, getDbConnection } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  const requestStartTime = Date.now();
  
  logger.info('SIM tracker log fetch request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'SimTrackerLog',
      details: `User ${socPortalId} fetching SIM tracker logs | IP: ${ipAddress}`
    }
  });

  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    const offset = (page - 1) * limit;

    logger.debug('Fetching SIM tracker logs from database', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTrackerLog',
        details: `Page: ${page}, Limit: ${limit}, Search: ${search}, Status: ${status}, Sort: ${sort}, Order: ${order}`
      }
    });

    // Validate sort field to prevent SQL injection
    const validSortFields = ['st_id', 'msisdn', 'mno', 'assigned_persona', 'profile_type', 'msisdn_status', 'device_tag', 'track_by', 'created_at'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let queryString = `
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
        created_at
      FROM sim_info 
      WHERE 1=1
    `;
    
    let countQuery = `SELECT COUNT(*) as total FROM sim_info WHERE 1=1`;
    let queryParams = [];
    let paramCount = 0;

    // Add search filter if provided
    if (search) {
      paramCount++;
      queryString += ` AND (
        msisdn ILIKE $${paramCount} OR 
        mno ILIKE $${paramCount} OR 
        st_id ILIKE $${paramCount} OR
        assigned_persona ILIKE $${paramCount} OR
        profile_type ILIKE $${paramCount} OR
        device_tag ILIKE $${paramCount} OR
        track_by ILIKE $${paramCount} OR
        remark ILIKE $${paramCount}
      )`;
      countQuery += ` AND (
        msisdn ILIKE $${paramCount} OR 
        mno ILIKE $${paramCount} OR 
        st_id ILIKE $${paramCount} OR
        assigned_persona ILIKE $${paramCount} OR
        profile_type ILIKE $${paramCount} OR
        device_tag ILIKE $${paramCount} OR
        track_by ILIKE $${paramCount} OR
        remark ILIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
    }

    // Add status filter if provided
    if (status && status !== 'all') {
      paramCount++;
      queryString += ` AND msisdn_status = $${paramCount}`;
      countQuery += ` AND msisdn_status = $${paramCount}`;
      queryParams.push(status);
    }

    // Add ordering and pagination
    queryString += ` ORDER BY ${sortField} ${sortOrder} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    // Execute count query
    const countResult = await query(countQuery, queryParams.slice(0, search ? (status ? 2 : 1) : (status ? 1 : 0)));
    const totalCount = parseInt(countResult.rows[0]?.total || 0);

    // Execute main query
    const result = await query(queryString, queryParams);
    const sims = result.rows;

    const requestDuration = Date.now() - requestStartTime;

    logger.info('SIM tracker logs fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTrackerLog',
        details: `Fetched ${sims.length} SIMs out of ${totalCount} total in ${requestDuration}ms`,
        userId: socPortalId,
        simCount: sims.length,
        totalCount,
        duration: requestDuration
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: sims,
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
    const errorDuration = Date.now() - requestStartTime;
    
    logger.error('Error fetching SIM tracker logs', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTrackerLog',
        details: `Unexpected error after ${errorDuration}ms: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack,
        duration: errorDuration
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch SIM tracker logs',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}