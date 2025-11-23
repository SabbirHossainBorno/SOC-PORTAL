// app/api/admin_dashboard/notification/route.js
import { query } from '../../../../lib/db';
import { NextResponse } from 'next/server';
import logger from '../../../../lib/logger';
import { cookies } from 'next/headers';

export async function GET(request) {
  let eid = 'N/A';
  let sid = 'N/A';

  try {
    const cookieStore = await cookies();
    eid = cookieStore.get('eid')?.value || 'N/A';
    sid = cookieStore.get('sessionId')?.value || 'N/A';

    // REMOVED LIMIT 20 - Now fetching all notifications
    const result = await query(`
      SELECT 
        notification_id AS id,
        title,
        status,
        created_at AS time
      FROM admin_notification_details
      ORDER BY created_at DESC
    `);

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

    logger.info('Admin notifications fetched successfully', {
      meta: {
        eid,
        sid,
        taskName: 'AdminNotificationFetch',
        details: `Fetched ${formattedNotifications.length} notifications`,
        count: formattedNotifications.length
      }
    });

    return NextResponse.json(formattedNotifications);
  } catch (error) {
    const cookieStore = await cookies();
    const eid = cookieStore.get('eid')?.value || 'N/A';
    const sid = cookieStore.get('sessionId')?.value || 'N/A';

    logger.error('Failed to fetch admin notifications', {
      meta: {
        eid,
        sid,
        taskName: 'AdminNotificationFetch',
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