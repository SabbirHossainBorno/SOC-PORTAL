// app/api/user_dashboard/notification/route.js
import { query } from '../../../../lib/db';
import { NextResponse } from 'next/server';
import logger from '../../../../lib/logger';
import { cookies } from 'next/headers';

export async function GET(request) {
  let eid = 'N/A';
  let sid = 'N/A';
  let socPortalId = 'N/A';

  try {
    // Await cookies() to get cookie store
    const cookieStore = await cookies();
    eid = cookieStore.get('eid')?.value || 'N/A';
    sid = cookieStore.get('sessionId')?.value || 'N/A';
    socPortalId = cookieStore.get('socPortalId')?.value; // Get socPortalId from cookies

    // Validate socPortalId
    if (!socPortalId) {
      logger.warn('No socPortalId found in cookies', {
        meta: {
          eid,
          sid,
          taskName: 'NotificationFetch',
          details: 'Missing socPortalId cookie'
        }
      });
      return NextResponse.json([], { status: 200 });
    }

    // REMOVED LIMIT 20 - Now fetching all notifications
    const result = await query(`
      SELECT 
        notification_id AS id,
        title,
        status,
        created_at AS time
      FROM user_notification_details
      WHERE soc_portal_id = $1
      ORDER BY created_at DESC
    `, [socPortalId]);

    const notifications = result.rows || [];
    const formattedNotifications = notifications.map(notif => {
      const now = new Date();
      const created = new Date(notif.time);
      const diffMinutes = Math.floor((now - created) / (1000 * 60));

      let timeAgo = '';
      if (diffMinutes < 1) timeAgo = 'Just now';
      else if (diffMinutes < 60) timeAgo = `${diffMinutes} min ago`;
      else if (diffMinutes < 1440) timeAgo = `${Math.floor(diffMinutes / 60)} hours ago`;
      else timeAgo = `${Math.floor(diffMinutes / 1440)} days ago`;

      return {
        id: notif.id,
        title: notif.title,
        time: timeAgo,
        read: notif.status === 'Read',
        icon: getNotificationIcon(notif.title)
      };
    });

    logger.info('Notifications fetched successfully', {
      meta: {
        eid,
        sid,
        socPortalId,
        taskName: 'NotificationFetch',
        details: `Fetched ${formattedNotifications.length} notifications for socPortalId: ${socPortalId}`,
        count: formattedNotifications.length
      }
    });

    return NextResponse.json(formattedNotifications);
  } catch (error) {
    // Log error with cookie details
    const cookieStore = await cookies();
    eid = cookieStore.get('eid')?.value || 'N/A';
    sid = cookieStore.get('sessionId')?.value || 'N/A';
    socPortalId = cookieStore.get('socPortalId')?.value || 'N/A';

    logger.error('Failed to fetch notifications', {
      meta: {
        eid,
        sid,
        socPortalId,
        taskName: 'NotificationFetch',
        details: error.message,
        error: error.message,
        stack: error.stack
      }
    });
    return NextResponse.json([], { status: 200 });
  }
}

function getNotificationIcon(title) {
  if (!title) return 'user';
  
  const lowerTitle = title.toLowerCase();
  
  if (/update|patch|upgrade/.test(lowerTitle)) return 'update';
  if (/user|register|signup|profile|account/.test(lowerTitle)) return 'user';
  if (/alert|warning|security|breach|attack/.test(lowerTitle)) return 'alert';
  if (/maintenance|downtime|service|outage/.test(lowerTitle)) return 'maintenance';
  if (/backup|restore|save|recovery/.test(lowerTitle)) return 'backup';
  if (/login|logout|access|authentication/.test(lowerTitle)) return 'login';
  
  return 'user';
}