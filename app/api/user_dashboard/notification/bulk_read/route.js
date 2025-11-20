// app/api/user_dashboard/notification/bulk_read/route.js
import { query } from '../../../../../lib/db';
import { NextResponse } from 'next/server';
import logger from '../../../../../lib/logger';
import { cookies } from 'next/headers';

export async function PUT(request) {
  try {
    const cookieStore = await cookies();
    const eid = cookieStore.get('eid')?.value || 'N/A';
    const sid = cookieStore.get('sessionId')?.value || 'N/A';
    const socPortalId = cookieStore.get('socPortalId')?.value || 'N/A';

    // Validate socPortalId
    if (!socPortalId) {
      logger.warn('No socPortalId found in cookies for bulk read', {
        meta: {
          eid,
          sid,
          taskName: 'NotificationBulkRead',
          details: 'Missing socPortalId cookie'
        }
      });
      return NextResponse.json(
        { error: 'Unauthorized: Missing user ID' },
        { status: 401 }
      );
    }

    // Update all unread notifications for this user to 'Read'
    const result = await query(`
      UPDATE user_notification_details
      SET status = 'Read', updated_at = NOW()
      WHERE soc_portal_id = $1 AND status = 'Unread'
      RETURNING notification_id
    `, [socPortalId]);

    const updatedCount = result.rows.length;

    logger.info('Bulk notification read update successful', {
      meta: {
        eid,
        sid,
        socPortalId,
        taskName: 'NotificationBulkRead',
        details: `Marked ${updatedCount} notifications as read for user: ${socPortalId}`,
        updatedCount
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Marked ${updatedCount} notifications as read`,
      updatedCount 
    });
  } catch (error) {
    const cookieStore = await cookies();
    const eid = cookieStore.get('eid')?.value || 'N/A';
    const sid = cookieStore.get('sessionId')?.value || 'N/A';
    const socPortalId = cookieStore.get('socPortalId')?.value || 'N/A';
    
    logger.error('Failed to bulk mark notifications as read', {
      meta: {
        eid,
        sid,
        socPortalId,
        taskName: 'NotificationBulkRead',
        details: `Error in bulk update: ${error.message}`,
        error: error.message,
        stack: error.stack
      }
    });
    return NextResponse.json(
      { error: 'Failed to bulk update notifications' },
      { status: 500 }
    );
  }
}