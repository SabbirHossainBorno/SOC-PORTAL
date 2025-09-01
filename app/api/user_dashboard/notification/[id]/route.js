// app/api/user_dashboard/notification/[id]/route.js
import { query } from '../../../../../lib/db';
import { NextResponse } from 'next/server';
import logger from '../../../../../lib/logger';
import { cookies } from 'next/headers';

export async function PUT(request, { params }) {
  try {
    const id = params.id;
    
    // Get cookies
    const cookieStore = cookies();
    const eid = cookieStore.get('eid')?.value || 'N/A';
    const sid = cookieStore.get('sessionId')?.value || 'N/A';
    const socPortalId = cookieStore.get('socPortalId')?.value || 'N/A';

    // Validate socPortalId
    if (!socPortalId) {
      logger.warn('No socPortalId found in cookies', {
        meta: {
          eid,
          sid,
          taskName: 'NotificationUpdate',
          details: 'Missing socPortalId cookie'
        }
      });
      return NextResponse.json(
        { error: 'Unauthorized: Missing user ID' },
        { status: 401 }
      );
    }

    // Verify the notification belongs to the user
    const result = await query(`
      SELECT soc_portal_id
      FROM user_notification_details
      WHERE notification_id = $1
    `, [id]);

    if (result.rows.length === 0) {
      logger.warn('Notification not found', {
        meta: {
          eid,
          sid,
          socPortalId,
          taskName: 'NotificationUpdate',
          details: `Notification ${id} not found`,
          notificationId: id
        }
      });
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (result.rows[0].soc_portal_id !== socPortalId) {
      logger.warn('Unauthorized notification access attempt', {
        meta: {
          eid,
          sid,
          socPortalId,
          taskName: 'NotificationUpdate',
          details: `User ${socPortalId} attempted to access notification ${id}`,
          notificationId: id
        }
      });
      return NextResponse.json(
        { error: 'Unauthorized: Notification does not belong to user' },
        { status: 403 }
      );
    }

    // Update notification status to 'Read'
    await query(`
      UPDATE user_notification_details
      SET status = 'Read', updated_at = NOW()
      WHERE notification_id = $1 AND soc_portal_id = $2
    `, [id, socPortalId]);

    logger.info('Notification marked as read', {
      meta: {
        eid,
        sid,
        socPortalId,
        taskName: 'NotificationUpdate',
        details: `Updated notification: ${id} for user: ${socPortalId}`,
        notificationId: id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Get cookies inside catch block
    const cookieStore = cookies();
    const eid = cookieStore.get('eid')?.value || 'N/A';
    const sid = cookieStore.get('sessionId')?.value || 'N/A';
    const socPortalId = cookieStore.get('socPortalId')?.value || 'N/A';
    
    logger.error('Failed to mark notification as read', {
      meta: {
        eid,
        sid,
        socPortalId,
        taskName: 'NotificationUpdate',
        details: `Error updating notification ${params.id}: ${error.message}`,
        notificationId: params.id,
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