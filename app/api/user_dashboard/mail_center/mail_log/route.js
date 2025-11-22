//app/api/user_dashboard/mail_center/mail_log/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';

  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const statusFilter = searchParams.get('status');
    const dateFilter = searchParams.get('date');
    const raisedByFilter = searchParams.get('raisedBy');
    const assignedTeamFilter = searchParams.get('assignedTeam');
    const searchQuery = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'tracking_date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build WHERE clause for filters
    let whereClauses = [];
    let queryParams = [];
    let paramCount = 0;

    if (statusFilter && statusFilter !== 'all') {
      paramCount++;
      whereClauses.push(`status = $${paramCount}`);
      queryParams.push(statusFilter);
    }

    if (dateFilter) {
      paramCount++;
      whereClauses.push(`tracking_date = $${paramCount}`);
      queryParams.push(dateFilter);
    }

    if (raisedByFilter && raisedByFilter !== 'all') {
      paramCount++;
      whereClauses.push(`raised_by = $${paramCount}`);
      queryParams.push(raisedByFilter.toUpperCase());
    }

    if (assignedTeamFilter && assignedTeamFilter !== 'all') {
      paramCount++;
      whereClauses.push(`assigned_team = $${paramCount}`);
      queryParams.push(assignedTeamFilter);
    }

    if (searchQuery) {
      paramCount++;
      whereClauses.push(`(mail_subject ILIKE $${paramCount} OR raised_by ILIKE $${paramCount})`);
      queryParams.push(`%${searchQuery}%`);
    }

    const whereClause = whereClauses.length > 0 
      ? `WHERE ${whereClauses.join(' AND ')}` 
      : '';

    // Add pagination parameters
    queryParams.push(limit, offset);

    // Build the main query
    const dataQuery = `
      SELECT 
        serial, tracking_date, mail_subject, task_raised_date, 
        task_solve_date, raised_by, status, solved_within_day, 
        assigned_team, tracked_by, created_at, updated_at, solved_by, feedback
      FROM mail_tracking 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder === 'desc' ? 'DESC' : 'ASC'}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) FROM mail_tracking ${whereClause}
    `;

    // Execute queries
    const [dataResult, countResult] = await Promise.all([
      query(dataQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ]);

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    logger.info('Mail tracking data fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'MailTrackingView',
        details: `Fetched ${dataResult.rows.length} of ${totalCount} mail entries`,
        userId,
        filters: { statusFilter, dateFilter, raisedByFilter, assignedTeamFilter, searchQuery }
      }
    });

    return NextResponse.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Error fetching mail tracking data', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'MailTrackingViewError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch mail tracking data' },
      { status: 500 }
    );
  }
}