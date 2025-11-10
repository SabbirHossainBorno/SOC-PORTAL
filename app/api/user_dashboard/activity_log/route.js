// app/api/user_dashboard/activity_log/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import logger from '../../../../lib/logger';

export async function GET(request) {
  const startTime = Date.now();
  const taskName = 'ActivityLogFetch';
  
  try {
    // Extract cookies for logging
    const eid = request.cookies.get('eid')?.value || 'N/A';
    const sid = request.cookies.get('sessionId')?.value || 'N/A';
    
    // Get current user ID from cookies
    const currentUserId = request.cookies.get('socPortalId')?.value;
    if (!currentUserId) {
      logger.warning('User not authenticated for activity log', {
        meta: { eid, sid, taskName, duration: `${Date.now() - startTime}ms` }
      });
      return NextResponse.json({
        success: false,
        message: 'User not authenticated'
      }, { status: 401 });
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const actionType = searchParams.get('actionType') || '';
    const searchTerm = searchParams.get('searchTerm') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const sortKey = searchParams.get('sortKey') || 'serial';
    const sortDirection = searchParams.get('sortDirection') || 'desc';

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

    // Start building queries
    let baseQuery = `
      SELECT 
        serial, 
        action,
        description,
        ip_address AS "ipAddress",
        device_info AS "deviceInfo",
        eid,
        sid,
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt"
      FROM user_activity_log
      WHERE soc_portal_id = $1
    `;
    
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM user_activity_log
      WHERE soc_portal_id = $1
    `;
    
    let statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE action = 'LOGIN_SUCCESS') AS "loginSuccess",
        COUNT(*) FILTER (WHERE action IN ('ADD_USER', 'EDIT_USER', 'DELETE_USER')) AS "userManagement",
        COUNT(*) FILTER (WHERE action = 'LOGOUT') AS "logout"
      FROM user_activity_log
      WHERE soc_portal_id = $1
    `;

    const params = [currentUserId];
    let paramIndex = 2; // Start from 2 since $1 is already used

    // Add filters to all queries
    const addFilter = (condition, value, column) => {
      if (value) {
        const filter = `${column} ${condition} $${paramIndex}`;
        baseQuery += ` AND ${filter}`;
        countQuery += ` AND ${filter}`;
        statsQuery += ` AND ${filter}`;
        params.push(value);
        paramIndex++;
      }
    };

    // Add keyword search
    if (searchTerm) {
      const searchFilter = `(action ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      baseQuery += ` AND ${searchFilter}`;
      countQuery += ` AND ${searchFilter}`;
      statsQuery += ` AND ${searchFilter}`;
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    // Add other filters
    addFilter('=', actionType, 'action');
    addFilter('>=', startDate, 'created_at');
    addFilter('<=', endDate, 'created_at');

    // Add sorting
    const columnMapping = {
      'serial': 'serial',
      'action': 'action',
      'createdAt': 'created_at'
    };
    
    const orderBy = columnMapping[sortKey] || 'serial';
    const direction = sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    baseQuery += ` ORDER BY ${orderBy} ${direction}`;

    // Add pagination
    baseQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, offset);

    // Debug: Log the queries and parameters
    logger.debug('Activity log queries', {
      meta: {
        baseQuery,
        countQuery,
        statsQuery,
        params,
        paramCount: params.length
      }
    });

    // Execute all queries
    const [logsResult, countResult, statsResult] = await Promise.all([
      query(baseQuery, params),
      query(countQuery, params.slice(0, -2)), // Exclude pagination params
      query(statsQuery, params.slice(0, -2))  // Exclude pagination params
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
        user: currentUserId,
        logCount: logs.length
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
        taskName,
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack,
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