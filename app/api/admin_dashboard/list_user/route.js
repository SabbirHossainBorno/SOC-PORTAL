//app/api/admin_dashboard/list_user/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import logger from '../../../../lib/logger';

export async function GET(request) {
  const startTime = Date.now();
  const taskName = 'ListUsers';
  
  // Extract cookies
  const eid = request.cookies.get('eid')?.value || 'N/A';
  const sid = request.cookies.get('sessionId')?.value || 'N/A';
  
  try {
    logger.info('Fetching user list started', {
      meta: {
        eid,
        sid,
        taskName,
        details: 'Initiating user list retrieval'
      }
    });

    const result = await query(`
      SELECT 
        soc_portal_id, 
        first_name, 
        last_name,
        ngd_id, 
        email, 
        role_type, 
        status, 
        designation, 
        profile_photo_url,
        TO_CHAR(joining_date, 'YYYY-MM-DD') AS joining_date
      FROM user_info
      ORDER BY first_name ASC
    `);

    const duration = Date.now() - startTime;
    logger.info('User list fetched successfully', {
      meta: {
        eid,
        sid,
        taskName,
        duration: `${duration}ms`,
        userCount: result.rows.length,
        details: `Retrieved ${result.rows.length} users`
      }
    });

    return NextResponse.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Failed to fetch user list', {
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
      message: 'Failed to fetch users',
      error: error.message
    }, { status: 500 });
  }
}