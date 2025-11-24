// /app/api/user_dashboard/settings/profile_view/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

// Fallback logging function
const logWithFallback = (level, message, meta = {}) => {
  try {
    logger.log(level, message, { meta });
    console.log(`[${level.toUpperCase()}] ${message}`, meta);
  } catch (loggerError) {
    console.error(`Logger failed (${level}):`, loggerError);
    console.log(`[FALLBACK ${level.toUpperCase()}] ${message}`, meta);
  }
};

export async function GET(request) {
  // Get cookies from request headers
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(cookie => {
      const [key, ...rest] = cookie.trim().split('=');
      return [key, rest.join('=')];
    })
  );
  
  const sessionId = cookies.sessionId || 'Unknown';
  const eid = cookies.eid || 'Unknown';
  const userId = cookies.socPortalId || 'Unknown';

  try {
    logWithFallback('info', 'Fetching user profile data', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GetUserProfile',
        userId
      }
    });

    // Query to get complete user profile information
    const userQuery = `
      SELECT 
        soc_portal_id,
        ngd_id,
        first_name,
        last_name,
        short_name,
        date_of_birth,
        joining_date,
        resign_date,
        email,
        phone,
        designation,
        bloodgroup,
        gender,
        status,
        role_type,
        profile_photo_url,
        emergency_contact,
        created_at,
        updated_at
      FROM user_info 
      WHERE soc_portal_id = $1
    `;
    
    const userResult = await query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      logWithFallback('warn', 'User profile not found', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'GetUserProfile',
          details: `User ${userId} not found in database`
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'User profile not found' },
        { status: 404 }
      );
    }
    
    const userData = userResult.rows[0];
    
    // Transform profile photo URL to use new API route if needed
    let profilePhotoUrl = userData.profile_photo_url;
    if (profilePhotoUrl && profilePhotoUrl.startsWith('/storage/user_dp/')) {
      profilePhotoUrl = profilePhotoUrl.replace('/storage/user_dp/', '/api/storage/user_dp/');
    }
    
    // Add timestamp to profile photo URL to prevent caching issues
    if (profilePhotoUrl && !profilePhotoUrl.includes('?')) {
      profilePhotoUrl += `?t=${Date.now()}`;
    }
    
    const responseData = {
      success: true,
      user: {
        ...userData,
        profile_photo_url: profilePhotoUrl
      }
    };

    logWithFallback('info', 'User profile data fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GetUserProfile',
        userId,
        hasPhoto: !!profilePhotoUrl
      }
    });
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    logWithFallback('error', 'Failed to fetch user profile', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GetUserProfile',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId
      }
    });
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch profile data',
        error: error.message
      },
      { status: 500 }
    );
  }
}