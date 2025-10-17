//app/api/admin_dashboard/notification/[id]route.js
import { query } from '../../../../../lib/db';
import { NextResponse } from 'next/server';
import logger from '../../../../../lib/logger';
import { cookies } from 'next/headers';

export async function PUT(request, { params }) {
  try {
    // Access params directly
    const id = params.id;
    
    // Get cookies for logging - must be inside try block
    const cookieStore = cookies();
    const eid = cookieStore.get('eid')?.value || 'N/A';
    const sid = cookieStore.get('sessionId')?.value || 'N/A';

    // Update notification status to 'Read'
    await query(`
      UPDATE admin_notification_details
      SET status = 'Read', updated_at = NOW()
      WHERE notification_id = $1
    `, [id]);

    logger.info('Notification marked as read', {
      meta: {
        eid,
        sid,
        taskName: 'NotificationUpdate',
        details: `Updated notification: ${id}`,
        notificationId: id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Get cookies inside catch block too
    const cookieStore = cookies();
    const eid = cookieStore.get('eid')?.value || 'N/A';
    const sid = cookieStore.get('sessionId')?.value || 'N/A';
    
    logger.error('Failed to mark notification as read', {
      meta: {
        eid,
        sid,
        taskName: 'NotificationUpdate',
        details: `Error updating notification ${id}: ${error.message}`,
        notificationId: params.id, // Use params.id directly
        error: error.message,
        stack: error.stack
      }
    });
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}