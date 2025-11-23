// app/api/admin_dashboard/notification/bulk_read/route.js
import { query } from '../../../../../lib/db';
import { NextResponse } from 'next/server';
import logger from '../../../../../lib/logger';
import { cookies } from 'next/headers';

export async function PUT(request) {
  try {
    const cookieStore = await cookies();
    const eid = cookieStore.get('eid')?.value || 'N/A';
    const sid = cookieStore.get('sessionId')?.value || 'N/A';

    // Update all unread notifications to 'Read'
    const result = await query(`
      UPDATE admin_notification_details
      SET status = 'Read', updated_at = NOW()
      WHERE status = 'Unread'
      RETURNING notification_id
    `);

    const updatedCount = result.rows.length;

    logger.info('Bulk admin notification read update successful', {
      meta: {
        eid,
        sid,
        taskName: 'AdminNotificationBulkRead',
        details: `Marked ${updatedCount} notifications as read`,
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
    
    logger.error('Failed to bulk mark admin notifications as read', {
      meta: {
        eid,
        sid,
        taskName: 'AdminNotificationBulkRead',
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