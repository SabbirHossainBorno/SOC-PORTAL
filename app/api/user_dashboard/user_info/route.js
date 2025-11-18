// app/api/user_dashboard/user_info/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import logger from '../../../../lib/logger';
import { getClientIP } from '../../../../lib/utils/ipUtils';

export async function GET(request) {
  // Extract cookies
  const email = request.cookies.get('email')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value;
  const eid = request.cookies.get('eid')?.value || 'N/A';
  const sid = request.cookies.get('sessionId')?.value || 'N/A';
  
  const startTime = Date.now();
  
  try {
    // Get request details
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const roleType = searchParams.get('role_type');
    
    console.log('User Info API Called:', {
      socPortalId,
      roleType,
      email
    });

    // If role_type is provided, return users by role
    if (roleType) {
      const roleDetails = `Fetching users with role_type: ${roleType} | ` +
                         `Requested by: ${email} | ` +
                         `SOC ID: ${socPortalId || 'N/A'}`;
      
      logger.info('Fetching users by role type', {
        meta: {
          eid,
          sid,
          taskName: 'FetchUsersByRole',
          details: roleDetails
        }
      });

      // Query for users by role type
      const result = await query(
        `SELECT 
           soc_portal_id,
           short_name,
           email,
           role_type,
           status
         FROM user_info 
         WHERE role_type = $1 AND status = 'Active'
         ORDER BY short_name`,
        [roleType]
      );

      console.log('Users by role query result:', {
        roleType,
        count: result.rows.length,
        users: result.rows.map(row => ({
          short_name: row.short_name,
          email: row.email,
          role_type: row.role_type
        }))
      });

      const userListDetails = `Found ${result.rows.length} users with role: ${roleType}`;
      
      logger.info('Users by role retrieved successfully', {
        meta: {
          eid,
          sid,
          taskName: 'FetchUsersByRole',
          details: userListDetails,
          usersCount: result.rows.length
        }
      });

      return NextResponse.json({
        success: true,
        data: result.rows
      });
    }

    // Original logic for current user info
    // Validate input - use cookie instead of query param
    if (!socPortalId) {
      const validationDetails = `Missing SOC Portal ID in cookies`;
      
      logger.warn('Missing user identification', {
        meta: {
          eid,
          sid,
          taskName: 'Validation',
          details: validationDetails
        }
      });
      
      return NextResponse.json(
        { error: 'Missing authentication' },
        { status: 401 }
      );
    }

    // Execute database query for current user
    const queryDetails = `Query: SELECT * FROM user_info WHERE soc_portal_id = $1 | ` +
                         `Params: [${socPortalId}]`;
    
    logger.debug('Querying database for user', {
      meta: {
        eid,
        sid,
        taskName: 'DatabaseQuery',
        details: queryDetails
      }
    });

    // Execute database query
    const result = await query(
      `SELECT 
         soc_portal_id AS "id",
         ngd_id AS "ngdId",
         first_name AS "firstName",
         last_name AS "lastName",
         short_name AS "shortName",
         email,
         role_type AS "role",
         status,
         created_at AS "createdAt",
         updated_at AS "lastLogin",
         profile_photo_url AS "profilePhoto"
       FROM user_info 
       WHERE soc_portal_id = $1`,
      [socPortalId]
    );

    // Handle query results
    if (result.rows.length === 0) {
      const notFoundDetails = `No user found with ID: ${socPortalId}`;
      
      logger.warn('User not found in database', {
        meta: {
          eid,
          sid,
          taskName: 'DatabaseResult',
          details: notFoundDetails
        }
      });
      
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = result.rows[0];
    
    // TRANSFORM PROFILE PHOTO URL TO NEW FORMAT
    let profilePhotoUrl = user.profilePhoto;
    
    // Convert old public directory URLs to new API route
    if (profilePhotoUrl && profilePhotoUrl.startsWith('/storage/user_dp/')) {
      profilePhotoUrl = profilePhotoUrl.replace('/storage/user_dp/', '/api/storage/user_dp/');
    }
    
    // Ensure default image uses new API route
    if (!profilePhotoUrl || profilePhotoUrl === '/storage/user_dp/default_DP.png') {
      profilePhotoUrl = '/api/storage/user_dp/default_DP.png';
    }
    
    // Add SINGLE cache busting parameter to prevent caching issues
    if (!profilePhotoUrl.includes('?')) {
      profilePhotoUrl = `${profilePhotoUrl}?t=${Date.now()}`;
    }

    const userDetails = `User ID: ${user.id} | ` +
                         `Email: ${user.email} | ` +
                         `Status: ${user.status} | ` +
                         `Profile Photo: ${profilePhotoUrl}`;
    
    logger.info('User data retrieved and transformed successfully', {
      meta: {
        eid,
        sid,
        taskName: 'DatabaseResult',
        details: userDetails,
        originalPhotoUrl: user.profilePhoto,
        transformedPhotoUrl: profilePhotoUrl
      }
    });

    // Prepare response data with transformed URL
    const responseData = {
      id: user.id,
      ngdId: user.ngdId,
      firstName: user.firstName,
      lastName: user.lastName,
      shortName: user.shortName,
      email: user.email,
      role: user.role || 'User',
      status: user.status,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      profilePhoto: profilePhotoUrl  // Use transformed URL
    };

    const duration = Date.now() - startTime;
    const completionDetails = `Duration: ${duration}ms | Photo URL transformed: ${user.profilePhoto !== profilePhotoUrl}`;
    
    logger.info('Request completed successfully with URL transformation', {
      meta: {
        eid,
        sid,
        taskName: 'RequestComplete',
        details: completionDetails
      }
    });

    return NextResponse.json(responseData);

  } catch (error) {
    const errorTime = Date.now() - startTime;
    const errorDetails = `Duration: ${errorTime}ms | ` +
                         `Error: ${error.message}`;
    
    logger.error('API processing error', {
      meta: {
        eid,
        sid,
        taskName: 'SystemError',
        details: errorDetails,
        stack: error.stack?.substring(0, 200) || 'No stack'
      }
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error.message 
      },
      { status: 500 }
    );
  }
}