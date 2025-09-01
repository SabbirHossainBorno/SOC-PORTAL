// app/api/user_dashboard/document_hub/access_form_log/route.js
import { query } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  logger.info('Access form log fetch initiated', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'AccessFormLog',
      details: `User ${socPortalId} requesting access form log`,
      userId: socPortalId,
      ipAddress,
      userAgent
    }
  });

  try {
    const { searchParams } = new URL(request.url);
    const filters = {};
    
    // Extract filter parameters
    [
      'af_tracking_id', 'ngd_id', 'user_name', 'email', 'division', 
      'department', 'portal_name', 'role', 'status', 'track_by', 'search'
    ].forEach(param => {
      const value = searchParams.get(param);
      if (value) filters[param] = value;
    });

    // Build WHERE clause using parameterized queries
    let conditions = [];
    let params = [];
    let paramCount = 1;

    // Handle search parameter
    if (filters.search) {
      const searchFields = [
        'af_tracking_id', 'ngd_id', 'user_name', 'email', 'division',
        'department', 'portal_name', 'role', 'track_by', 'remark',
        'additional_info', 'access_form_type'
      ];
      const searchConditions = searchFields.map(field => 
        `${field} ILIKE $${paramCount}`
      );
      conditions.push(`(${searchConditions.join(' OR ')})`);
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    // Handle other filters
    Object.keys(filters).forEach((key) => {
      if (key !== 'search' && filters[key]) {
        if (key === 'portal_name' || key === 'role') {
          const values = filters[key].split(',').map(v => v.trim());
          const fieldConditions = values.map(value => {
            params.push(`%${value}%`);
            return `${key} ILIKE $${paramCount++}`;
          });
          conditions.push(`(${fieldConditions.join(' OR ')})`);
        } else {
          conditions.push(`${key} ILIKE $${paramCount}`);
          params.push(`%${filters[key]}%`);
          paramCount++;
        }
      }
    });

    // Date range filters
    const effectiveDateFrom = searchParams.get('effective_date_from');
    const effectiveDateTo = searchParams.get('effective_date_to');
    const revokeDateFrom = searchParams.get('revoke_date_from');
    const revokeDateTo = searchParams.get('revoke_date_to');

    if (effectiveDateFrom) {
      conditions.push(`effective_date >= $${paramCount}`);
      params.push(effectiveDateFrom);
      paramCount++;
    }

    if (effectiveDateTo) {
      conditions.push(`effective_date <= $${paramCount}`);
      params.push(effectiveDateTo);
      paramCount++;
    }

    if (revokeDateFrom) {
      conditions.push(`(revoke_date >= $${paramCount} OR revoke_date IS NULL)`);
      params.push(revokeDateFrom);
      paramCount++;
    }

    if (revokeDateTo) {
      conditions.push(`(revoke_date <= $${paramCount} OR revoke_date IS NULL)`);
      params.push(revokeDateTo);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count for stats
    const countQuery = `SELECT COUNT(*) as total_count FROM access_form_tracker ${whereClause}`;
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total_count, 10);

    // Get active count
    const activeCountQuery = `SELECT COUNT(*) as active_count FROM access_form_tracker ${whereClause ? whereClause + ' AND ' : 'WHERE '} status = 'Active'`;
    const activeResult = await query(activeCountQuery, params);
    const activeCount = parseInt(activeResult.rows[0].active_count, 10);

    // Get inactive count
    const inactiveCountQuery = `SELECT COUNT(*) as inactive_count FROM access_form_tracker ${whereClause ? whereClause + ' AND ' : 'WHERE '} status = 'Inactive'`;
    const inactiveResult = await query(inactiveCountQuery, params);
    const inactiveCount = parseInt(inactiveResult.rows[0].inactive_count, 10);

    // Get the actual data with pagination
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    const dataQuery = `
      SELECT 
        serial, af_tracking_id, ngd_id, user_name, email, mobile_number,
        division, department, portal_name, role, effective_date, revoke_date,
        status, remark, document_location, track_by, created_at, updated_at,
        access_form_type, additional_info
      FROM access_form_tracker 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const dataParams = [...params, limit, offset];
    const dataResult = await query(dataQuery, dataParams);

    logger.info('Access form log fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AccessFormLog',
        details: `Fetched ${dataResult.rows.length} records`,
        userId: socPortalId,
        totalCount,
        activeCount,
        inactiveCount,
        page,
        limit
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats: {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Error fetching access form log', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AccessFormLog',
        details: `Error: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch access form log',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}