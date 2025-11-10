// app/api/admin_dashboard/view_user/[soc_portal_id]/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

export async function GET(request, { params }) {
  // Await the params object to fix the dynamic route parameter issue
  const { soc_portal_id } = await params;
  const startTime = Date.now();
  const taskName = 'ViewUserDetails';
  
  // Extract cookies and headers
  const eid = request.cookies.get('eid')?.value || 'N/A';
  const sid = request.cookies.get('sessionId')?.value || 'N/A';
  const adminId = request.cookies.get('socPortalId')?.value || 'N/A';
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  try {
    logger.info('Fetching user details started', {
      meta: {
        eid,
        sid,
        taskName,
        adminId,
        userId: soc_portal_id,
        ipAddress: ipAddress,
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
          ipAddress: ipAddress,
          details: `User ${soc_portal_id} not found in database`
        }
      });

      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Transform profile photo URL to use new API route
    const userData = result.rows[0];
    let profilePhotoUrl = userData.profile_photo_url;
    
    // Convert old public directory URLs to new API route
    if (profilePhotoUrl && profilePhotoUrl.startsWith('/storage/user_dp/')) {
      profilePhotoUrl = profilePhotoUrl.replace('/storage/user_dp/', '/api/storage/user_dp/');
    }
    
    // Ensure default image uses new API route
    if (!profilePhotoUrl || profilePhotoUrl === '/storage/user_dp/default_DP.png') {
      profilePhotoUrl = '/api/storage/user_dp/default_DP.png';
    }
    
    // Add cache busting parameter
    const separator = profilePhotoUrl.includes('?') ? '&' : '?';
    const updatedProfilePhotoUrl = `${profilePhotoUrl}${separator}t=${Date.now()}`;

    const userWithUpdatedUrl = {
      ...userData,
      profile_photo_url: updatedProfilePhotoUrl
    };

    const duration = Date.now() - startTime;
    
    logger.info('User details fetched and processed successfully', {
      meta: {
        eid,
        sid,
        taskName,
        adminId,
        userId: soc_portal_id,
        duration: `${duration}ms`,
        ipAddress: ipAddress,
        userAgent: userAgent.substring(0, 100),
        details: `Successfully retrieved and transformed details for user ${soc_portal_id}`,
        originalPhotoUrl: userData.profile_photo_url,
        transformedPhotoUrl: updatedProfilePhotoUrl
      }
    });

    return NextResponse.json({
      success: true,
      user: userWithUpdatedUrl
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
        ipAddress: ipAddress,
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

// Helper function to get client IP
function getClientIP(request) {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIP) {
      return realIP;
    }
    
    return '127.0.0.1';
  } catch (error) {
    return 'Unknown';
  }
}