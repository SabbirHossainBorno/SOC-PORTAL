// app/api/admin_dashboard/list_user/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import logger from '../../../../lib/logger';

// Force dynamic rendering - CRITICAL
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const startTime = Date.now();
  const taskName = 'ListUsers';
  
  // Extract cookies
  const eid = request.cookies.get('eid')?.value || 'N/A';
  const sid = request.cookies.get('sessionId')?.value || 'N/A';
  const adminId = request.cookies.get('socPortalId')?.value || 'N/A';
  const ipAddress = getClientIP(request);
  
  try {
    logger.info('Fetching user list started', {
      meta: {
        eid,
        sid,
        adminId,
        taskName,
        ipAddress: ipAddress,
        details: 'Initiating user list retrieval from database'
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
        TO_CHAR(joining_date, 'YYYY-MM-DD') AS joining_date,
        TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') AS cache_bust
      FROM user_info
      ORDER BY first_name ASC
    `);
    
    const duration = Date.now() - startTime;
    
    // Transform profile photo URLs to use new API route
    const usersWithUpdatedUrls = result.rows.map(user => {
      let profilePhotoUrl = user.profile_photo_url;
      
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
      profilePhotoUrl = `${profilePhotoUrl}${separator}t=${Date.now()}`;
      
      return {
        ...user,
        profile_photo_url: profilePhotoUrl
      };
    });
    
    logger.info('User list fetched and processed successfully', {
      meta: {
        eid,
        sid,
        adminId,
        taskName,
        duration: `${duration}ms`,
        userCount: usersWithUpdatedUrls.length,
        ipAddress: ipAddress,
        details: `Retrieved ${usersWithUpdatedUrls.length} users with updated photo URLs`
      }
    });
    
    return NextResponse.json({
      success: true,
      users: usersWithUpdatedUrls,
      timestamp: Date.now()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Failed to fetch user list', {
      meta: {
        eid,
        sid,
        adminId,
        taskName,
        duration: `${duration}ms`,
        error: error.message,
        ipAddress: ipAddress,
        details: 'Database query failed',
        stack: error.stack
      }
    });
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch users',
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