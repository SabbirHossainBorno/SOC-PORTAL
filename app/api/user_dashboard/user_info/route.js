//app/api/user_dashboard/user_info/route.js
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
    
    // Format details as string
    const requestDetails = `GET /user_info | ` +
                           `Email: ${email} | ` +
                           `SOC ID: ${socPortalId || 'N/A'} | ` +
                           `IP: ${ipAddress} | ` +
                           `UA: ${userAgent.substring(0, 30)}...`;
    
    logger.info('User info request started', {
      meta: {
        eid,
        sid,
        taskName: 'UserInfoRequest',
        details: requestDetails
      }
    });

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

    // Execute database query
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

    // Execute database query - FIXED: Removed JavaScript-style comments
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
    const userDetails = `User ID: ${user.id} | ` +
                         `Email: ${user.email} | ` +
                         `Status: ${user.status}`;
    
    logger.info('User data retrieved successfully', {
      meta: {
        eid,
        sid,
        taskName: 'DatabaseResult',
        details: userDetails
      }
    });

    // Prepare response data
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
      profilePhoto: user.profilePhoto?.replace(/^\/public/, '') || ''
    };

    const duration = Date.now() - startTime;
    const completionDetails = `Duration: ${duration}ms`;
    
    logger.info('Request completed successfully', {
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