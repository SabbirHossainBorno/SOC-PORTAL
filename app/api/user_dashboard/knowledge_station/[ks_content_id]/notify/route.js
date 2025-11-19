// app/api/user_dashboard/knowledge_station/[ks_content_id]/notify/route.js
import { NextResponse } from 'next/server';
import { query, getDbConnection } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';
import sendTelegramAlert from '../../../../../../lib/telegramAlert';

// Generate unique notification ID
const generateNotificationId = async (client) => {
  try {
    const result = await client.query('SELECT MAX(serial) AS max_serial FROM user_notification_details');
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(6, '0');
    return `UN${nextId}SOCP`;
  } catch (error) {
    // Fallback to timestamp if there's an error
    return `UN${Date.now()}SOCP`;
  }
};

export async function POST(request, { params }) {
  // AWAIT PARAMS
  const { ks_content_id } = await params;
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown';

  let client;
  try {
    // Get content details
    const contentResult = await query(
      `SELECT ksc.*, ui.short_name, ui.email 
       FROM knowledge_station_content ksc
       LEFT JOIN user_info ui ON ksc.upload_by = ui.soc_portal_id
       WHERE ksc.ks_content_id = $1`,
      [ks_content_id]
    );

    if (contentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Content not found' },
        { status: 404 }
      );
    }

    const content = contentResult.rows[0];

    // Get all active users
    const usersResult = await query(
      'SELECT soc_portal_id FROM user_info WHERE status = $1',
      ['Active']
    );

    client = await getDbConnection();
    await client.query('BEGIN');

    // Create notifications for all users
    for (const user of usersResult.rows) {
      const notificationId = await generateNotificationId(client);
      
      await client.query(
        `INSERT INTO user_notification_details 
         (notification_id, title, status, soc_portal_id)
         VALUES ($1, $2, $3, $4)`,
        [
          notificationId,
          `📢 New Knowledge Shared: ${content.title} - Check it out!`,
          'Unread',
          user.soc_portal_id
        ]
      );
    }

    await client.query('COMMIT');

    // Send Telegram broadcast
    const telegramMessage = `📢 **KNOWLEDGE STATION BROADCAST**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 **Title:** ${content.title}
👤 **Shared By:** ${content.short_name}
📝 **Description:** ${content.description.substring(0, 200)}...
🔗 **Content URL:** http://167.88.38.114:5001/user_dashboard/knowledge_station
⭐ **Important:** ${content.is_important ? 'Yes' : 'No'}
🕒 **Time:** ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}`;

    await sendTelegramAlert(telegramMessage);

    logger.info('Notification broadcast sent successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'KnowledgeBroadcast',
        details: `User ${socPortalId} broadcasted ${ks_content_id} to all users`,
        userId: socPortalId,
        ks_content_id,
        userCount: usersResult.rows.length,
        ipAddress
      }
    });

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${usersResult.rows.length} users`
    });

  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
    
    logger.error('Failed to send notifications', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'KnowledgeBroadcast',
        details: `Error: ${error.message}`,
        userId: socPortalId,
        ks_content_id,
        error: error.message
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to send notifications' },
      { status: 500 }
    );
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    } else if (client && typeof client.end === 'function') {
      client.end();
    }
  }
}