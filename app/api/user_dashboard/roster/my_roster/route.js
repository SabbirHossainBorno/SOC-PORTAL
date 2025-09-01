//app/api/user_dashboard/roster/my_roster/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

export async function GET(request) {
  // Get request details for logging
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
  
  try {
    // Get cookies from request headers
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(cookie => {
        const [key, ...rest] = cookie.trim().split('=');
        return [key, rest.join('=')];
      })
    );
    
    const userId = cookies.socPortalId;
    const eid = cookies.eid || 'Unknown';
    const sessionId = cookies.sessionId || 'Unknown';
    
    logger.info('My Roster API called', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'MyRosterFetch',
        details: `Fetching roster for user ${userId}`,
        userId,
        ipAddress,
        userAgent
      }
    });
    
    if (!userId) {
      logger.warn('User not authenticated for My Roster', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Authentication',
          details: 'No user ID found in cookies',
          ipAddress,
          userAgent
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get user's short name from user_info table
    const userQuery = 'SELECT short_name FROM user_info WHERE soc_portal_id = $1';
    logger.info('Fetching user info from database', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DatabaseQuery',
        details: `Querying user_info for ID: ${userId}`,
        userId
      }
    });
    
    const userResult = await query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      logger.warn('User not found in database', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UserNotFound',
          details: `User ID ${userId} not found in user_info table`,
          userId
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const shortName = userResult.rows[0].short_name.toLowerCase();
    logger.info('User info retrieved successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UserInfoRetrieved',
        details: `User short name: ${shortName}`,
        userId,
        shortName
      }
    });
    
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    
    logger.info('Processing roster request with filters', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'RequestProcessing',
        details: `Month: ${month}, Year: ${year}`,
        userId,
        shortName,
        month,
        year
      }
    });

    // Build query to get user's roster
    let rosterQuery = `
      SELECT date, day, ${shortName} as shift 
      FROM roster_schedule 
      WHERE 1=1
    `;
    let queryParams = [];

    if (month && year) {
      rosterQuery += ' AND EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2';
      queryParams = [month, year];
    } else {
      // Default to current month if no filter provided
      const currentDate = new Date();
      rosterQuery += ' AND EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2';
      queryParams = [currentDate.getMonth() + 1, currentDate.getFullYear()];
    }

    rosterQuery += ' ORDER BY date';

    logger.info('Executing roster query', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DatabaseQuery',
        details: `Query: ${rosterQuery}`,
        params: queryParams,
        userId,
        shortName
      }
    });

    const rosterResult = await query(rosterQuery, queryParams);
    
    logger.info('Roster data retrieved successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'RosterDataRetrieved',
        details: `Found ${rosterResult.rows.length} records`,
        userId,
        shortName,
        recordCount: rosterResult.rows.length
      }
    });

    return NextResponse.json({
      success: true,
      data: rosterResult.rows,
      user: userResult.rows[0].short_name
    });

  } catch (error) {
    logger.error('Error fetching user roster', {
      meta: {
        taskName: 'SystemError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        ipAddress,
        userAgent
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch roster data' },
      { status: 500 }
    );
  }
}