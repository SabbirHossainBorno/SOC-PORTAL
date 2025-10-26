// app/api/admin_dashboard/view_user/[soc_portal_id]/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

export async function GET(request, { params }) {
  // Await the params object to fix the dynamic route parameter issue
  const { soc_portal_id } = await params;
  const startTime = Date.now();
  const taskName = 'ViewUserDetails';
  
  // Extract cookies
  const eid = request.cookies.get('eid')?.value || 'N/A';
  const sid = request.cookies.get('sessionId')?.value || 'N/A';
  const adminId = request.cookies.get('socPortalId')?.value || 'N/A';

  try {
    logger.info('Fetching user details started', {
      meta: {
        eid,
        sid,
        taskName,
        adminId,
        userId: soc_portal_id,
        details: `Admin ${adminId} viewing details of user ${soc_portal_id}`
      }
    });

    const result = await query(`
      SELECT 
        soc_portal_id,
        ngd_id,
        first_name,
        last_name,
        short_name,
        TO_CHAR(date_of_birth, 'YYYY-MM-DD') as date_of_birth,
        TO_CHAR(joining_date, 'YYYY-MM-DD') as joining_date,
        TO_CHAR(resign_date, 'YYYY-MM-DD') as resign_date,
        email,
        phone,
        emergency_contact,
        designation,
        bloodgroup,
        gender,
        status,
        role_type,
        profile_photo_url,
        created_at,
        updated_at
      FROM user_info 
      WHERE soc_portal_id = $1
    `, [soc_portal_id]);

    if (result.rows.length === 0) {
      logger.warn('User not found', {
        meta: {
          eid,
          sid,
          taskName,
          adminId,
          userId: soc_portal_id,
          details: `User ${soc_portal_id} not found in database`
        }
      });

      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    const duration = Date.now() - startTime;
    logger.info('User details fetched successfully', {
      meta: {
        eid,
        sid,
        taskName,
        adminId,
        userId: soc_portal_id,
        duration: `${duration}ms`,
        details: `Successfully retrieved details for user ${soc_portal_id}`
      }
    });

    return NextResponse.json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Failed to fetch user details', {
      meta: {
        eid,
        sid,
        taskName,
        adminId,
        userId: soc_portal_id,
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack,
        details: 'Database query failed'
      }
    });

    return NextResponse.json({
      success: false,
      message: 'Failed to fetch user details',
      error: error.message
    }, { status: 500 });
  }
}