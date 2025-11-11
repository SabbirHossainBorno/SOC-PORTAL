// app/api/user_dashboard/document_hub/other_document_log/portal_tracker_log/route.js
import { query, getDbConnection } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  const requestStartTime = Date.now();
  
  logger.info('Portal tracker log fetch request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'PortalTrackerLog',
      details: `User ${socPortalId} fetching portal tracker logs | IP: ${ipAddress}`
    }
  });

  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const offset = (page - 1) * limit;

    logger.debug('Fetching portal tracker logs from database', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTrackerLog',
        details: `Page: ${page}, Limit: ${limit}, Search: ${search}, Category: ${category}`
      }
    });

    let queryString = `
      SELECT 
        pt_id,
        portal_category,
        portal_name,
        portal_url,
        user_identifier,
        password,
        role,
        remark,
        track_by,
        created_at
      FROM portal_info 
      WHERE 1=1
    `;
    
    let countQuery = `SELECT COUNT(*) as total FROM portal_info WHERE 1=1`;
    
    let queryParams = [];
    let paramCount = 0;

    // Add search filter if provided
    if (search) {
      paramCount++;
      queryString += ` AND (
        portal_category ILIKE $${paramCount} OR 
        portal_name ILIKE $${paramCount} OR 
        pt_id::text ILIKE $${paramCount} OR
        portal_url ILIKE $${paramCount} OR
        user_identifier ILIKE $${paramCount} OR
        role ILIKE $${paramCount} OR
        track_by ILIKE $${paramCount} OR
        remark ILIKE $${paramCount}
      )`;
      countQuery += ` AND (
        portal_category ILIKE $${paramCount} OR 
        portal_name ILIKE $${paramCount} OR 
        pt_id::text ILIKE $${paramCount} OR
        portal_url ILIKE $${paramCount} OR
        user_identifier ILIKE $${paramCount} OR
        role ILIKE $${paramCount} OR
        track_by ILIKE $${paramCount} OR
        remark ILIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
    }

    // Add category filter if provided
    if (category && category !== 'all') {
      paramCount++;
      queryString += ` AND portal_category = $${paramCount}`;
      countQuery += ` AND portal_category = $${paramCount}`;
      queryParams.push(category);
    }

    // Add ordering and pagination
    queryString += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    // Execute count query
    const countResult = await query(countQuery, queryParams.slice(0, search ? (category ? 2 : 1) : (category ? 1 : 0)));
    const totalCount = parseInt(countResult.rows[0]?.total || 0);

    // Execute main query
    const result = await query(queryString, queryParams);
    const portals = result.rows;

    logger.info('Portal tracker logs fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTrackerLog',
        details: `Fetched ${portals.length} portals out of ${totalCount} total, Category filter: ${category}`
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: portals,
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
    logger.error('Error fetching portal tracker logs', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTrackerLog',
        details: `Unexpected error: ${error.message}`,
        error: error.message,
        stack: error.stack
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch portal tracker logs',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}