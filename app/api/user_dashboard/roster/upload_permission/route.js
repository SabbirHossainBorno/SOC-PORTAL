// app/api/user_dashboard/roster/upload_permission/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

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
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  logger.info('Checking upload permission', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'CheckUploadPermission',
      details: `User ${userId} checking upload permission`,
      userId,
      ipAddress,
      userAgent
    }
  });

  try {
    // Check permission from roster_schedule_permission table
    const permissionQuery = `
      SELECT rsp.permission 
      FROM roster_schedule_permission rsp
      WHERE rsp.soc_portal_id = $1 AND rsp.status = 'Active'
    `;
    
    const permissionResult = await query(permissionQuery, [userId]);
    
    let canUpload = false;
    
    if (permissionResult.rows.length > 0) {
      const permission = permissionResult.rows[0].permission;
      canUpload = (permission === 'ALLOW');
    }
    
    console.log('Upload permission check result:', { userId, canUpload });
    
    logger.info('Upload permission checked successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'CheckUploadPermission',
        details: `User ${userId} upload permission: ${canUpload}`,
        userId,
        canUpload
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        canUpload: canUpload
      }
    });

  } catch (error) {
    console.error('Error checking upload permission:', error);
    logger.error('Error checking upload permission', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'CheckUploadPermissionError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to check upload permission' },
      { status: 500 }
    );
  }
}