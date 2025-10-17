//app/api/admin_dashboard/admin_ino/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import logger from '../../../../lib/logger';

export async function GET(request) {
  // Extract cookies
  const email = request.cookies.get('email')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'N/A';
  const sid = request.cookies.get('sessionId')?.value || 'N/A';
  
  const startTime = Date.now();
  
  try {
    // Get request details
    const { searchParams } = new URL(request.url);
    const requestSocPortalId = searchParams.get('id');
    const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
    const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
    
    // FIX: Format details as string instead of object
    const requestDetails = `GET /admin_info?${request.url.split('?')[1] || ''} | ` +
                           `Requested ID: ${requestSocPortalId} | ` +
                           `Email: ${email} | ` +
                           `SOC ID: ${socPortalId} | ` +
                           `IP: ${ipAddress} | ` +
                           `UA: ${userAgent.substring(0, 30)}...`;
    
    logger.info('Admin info request started', {
      meta: {
        eid,
        sid,
        taskName: 'AdminInfoRequest',
        details: requestDetails  // Now a string
      }
    });

    // Validate input
    if (!requestSocPortalId) {
      const validationDetails = `Missing admin ID | Query params: ${JSON.stringify(Object.fromEntries(searchParams.entries()))}`;
      
      logger.warn('Missing admin ID parameter', {
        meta: {
          eid,
          sid,
          taskName: 'Validation',
          details: validationDetails  // Now a string
        }
      });
      
      return NextResponse.json(
        { error: 'Missing admin ID' },
        { status: 400 }
      );
    }

    // Execute database query
    const queryDetails = `Query: SELECT * FROM admin_info WHERE soc_portal_id = $1 | ` +
                         `Params: [${requestSocPortalId}]`;
    
    logger.debug('Querying database for admin ID', {
      meta: {
        eid,
        sid,
        taskName: 'DatabaseQuery',
        details: queryDetails  // Now a string
      }
    });

    const result = await query(
      `SELECT * FROM admin_info WHERE soc_portal_id = $1`,
      [requestSocPortalId]
    );

    // Handle query results
    if (result.rows.length === 0) {
      const notFoundDetails = `No admin found with ID: ${requestSocPortalId}`;
      
      logger.warn('Admin not found in database', {
        meta: {
          eid,
          sid,
          taskName: 'DatabaseResult',
          details: notFoundDetails  // Now a string
        }
      });
      
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    const admin = result.rows[0];
    const adminDetails = `Admin ID: ${admin.soc_portal_id} | ` +
                         `Email: ${admin.email} | ` +
                         `Status: ${admin.status}`;
    
    logger.info('Admin data retrieved successfully', {
      meta: {
        eid,
        sid,
        taskName: 'DatabaseResult',
        details: adminDetails  // Now a string
      }
    });

    // Prepare response data
    const responseData = {
      id: admin.soc_portal_id,
      email: admin.email,
      role: admin.role_type || 'Admin',
      firstName: 'Admin',
      lastName: 'User',
      status: admin.status,
      createdAt: admin.created_at,
      lastLogin: admin.updated_at,
      profilePhoto: '/image/admin_dp/admin_dp.jpg'
    };

    const duration = Date.now() - startTime;
    const completionDetails = `Duration: ${duration}ms | ` +
                              `Response: ${JSON.stringify({...responseData, password: 'REDACTED'})}`;
    
    logger.info('Request completed successfully', {
      meta: {
        eid,
        sid,
        taskName: 'RequestComplete',
        details: completionDetails  // Now a string
      }
    });

    return NextResponse.json(responseData);

  } catch (error) {
    const errorTime = Date.now() - startTime;
    const errorDetails = `Duration: ${errorTime}ms | ` +
                         `Error: ${error.message} | ` +
                         `URL: ${request.url} | ` +
                         `Method: ${request.method} | ` +
                         `Stack: ${error.stack.substring(0, 100)}...`;
    
    logger.error('API processing error', {
      meta: {
        eid,
        sid,
        taskName: 'SystemError',
        details: errorDetails  // Now a string
      }
    });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        eid,
        message: error.message 
      },
      { status: 500 }
    );
  }
}