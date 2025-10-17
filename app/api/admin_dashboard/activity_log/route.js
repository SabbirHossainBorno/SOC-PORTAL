
// app/api/admin_dashboard/activity_log/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import logger from '../../../../lib/logger';

export async function GET(request) {
  const startTime = Date.now();
  const taskName = 'ActivityLogFetch';
  
  // Extract cookies
  const eid = request.cookies.get('eid')?.value || 'N/A';
  const sid = request.cookies.get('sessionId')?.value || 'N/A';
  
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const actionType = searchParams.get('actionType') || '';
    const adminId = searchParams.get('adminId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const sortKey = searchParams.get('sortKey') || 'serial';
    const sortDirection = searchParams.get('sortDirection') || 'desc';

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

    // Build the base query
    let baseQuery = `
      SELECT 
        serial, 
        soc_portal_id AS "socPortalId",
        action,
        description,
        ip_address AS "ipAddress",
        device_info AS "deviceInfo",
        eid,
        sid,
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt"
      FROM admin_activity_log
      WHERE 1=1
    `;
    
    // Build the count query
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM admin_activity_log
      WHERE 1=1
    `;
    
    // Build stats queries
    const statsQueries = `
      SELECT 
        COUNT(*) FILTER (WHERE action = 'LOGIN_SUCCESS') AS "loginSuccess",
        COUNT(*) FILTER (WHERE action LIKE '%USER%') AS "userManagement",
        COUNT(*) FILTER (WHERE action = 'LOGOUT') AS "logout"
      FROM admin_activity_log
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Add filters
    const addFilter = (condition, value) => {
      if (value) {
        baseQuery += ` AND ${condition} $${paramIndex}`;
        countQuery += ` AND ${condition} $${paramIndex}`;
        statsQueries += ` AND ${condition} $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    };

    addFilter('action =', actionType);
    addFilter('soc_portal_id =', adminId);
    addFilter('created_at >=', startDate);
    addFilter('created_at <=', endDate);

    // Add sorting
    const columnMapping = {
      'serial': 'serial',
      'socPortalId': 'soc_portal_id',
      'action': 'action',
      'createdAt': 'created_at'
    };
    
    const orderBy = columnMapping[sortKey] || 'serial';
    const direction = sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    baseQuery += ` ORDER BY ${orderBy} ${direction}`;

    // Add pagination
    baseQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, offset);

    // Execute all queries
    const [logsResult, countResult, statsResult] = await Promise.all([
      query(baseQuery, params),
      query(countQuery, params.slice(0, -2)),
      query(statsQueries, params.slice(0, -2))
    ]);

    const logs = logsResult.rows;
    const totalCount = parseInt(countResult.rows[0].total);
    const stats = statsResult.rows[0];

    const duration = Date.now() - startTime;
    logger.info('Activity logs fetched successfully', {
      meta: {
        eid,
        sid,
        taskName,
        duration: `${duration}ms`,
        page,
        pageSize,
        totalCount,
        details: `Fetched ${logs.length} logs`
      }
    });

    return NextResponse.json({
      success: true,
      logs,
      totalCount,
      stats,
      page,
      pageSize
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Failed to fetch activity logs', {
      meta: {
        eid,
        sid,
        taskName,
        duration: `${duration}ms`,
        error: error.message,
        details: 'Database query failed'
      }
    });

    return NextResponse.json({
      success: false,
      message: 'Failed to fetch activity logs',
      error: error.message
    }, { status: 500 });
  }
}