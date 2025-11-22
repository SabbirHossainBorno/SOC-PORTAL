// app/api/user_dashboard/mail_center/resend_notification/route.js
import { NextResponse } from 'next/server';
import { query, getDbConnection } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';
import sendTelegramAlert from '../../../../../lib/telegramAlert';

// Generate sequential notification ID
const generateSequentialNotificationId = async (prefix, table, count = 1) => {
  try {
    const result = await query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    
    if (count === 1) {
      const nextId = (maxSerial + 1).toString().padStart(6, '0');
      return `${prefix}${nextId}SOCP`;
    } else {
      const notificationIds = [];
      for (let i = 1; i <= count; i++) {
        const nextId = (maxSerial + i).toString().padStart(6, '0');
        notificationIds.push(`${prefix}${nextId}SOCP`);
      }
      return notificationIds;
    }
  } catch (error) {
    // Fallback to timestamp-based IDs
    if (count === 1) {
      return `${prefix}${Date.now()}SOCP`;
    } else {
      const notificationIds = [];
      for (let i = 0; i < count; i++) {
        notificationIds.push(`${prefix}${Date.now() + i}SOCP`);
      }
      return notificationIds;
    }
  }
};

export async function POST(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';

  try {
    const { mailSubject, assignedTeam } = await request.json();

    if (!mailSubject || !assignedTeam) {
      return NextResponse.json(
        { success: false, message: 'Mail subject and assigned team are required' },
        { status: 400 }
      );
    }

    // Get user info
    const userResult = await query(
      'SELECT short_name FROM user_info WHERE soc_portal_id = $1',
      [socPortalId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const userName = userResult.rows[0].short_name;

    // Get team members to notify
    const teamMembersResult = await query(
      'SELECT soc_portal_id FROM user_info WHERE role_type = $1 AND status = $2',
      [assignedTeam, 'Active']
    );

    const client = await getDbConnection();
    await client.query('BEGIN');

    const teamMembersCount = teamMembersResult.rows.length;
    
    // Generate notification IDs for all team members
    const notificationIds = await generateSequentialNotificationId('UN', 'user_notification_details', teamMembersCount);

    // Create notifications for team members
    for (let i = 0; i < teamMembersCount; i++) {
      const member = teamMembersResult.rows[i];
      const notificationId = Array.isArray(notificationIds) ? notificationIds[i] : notificationIds;
      
      await client.query(
        `INSERT INTO user_notification_details 
         (notification_id, title, status, soc_portal_id)
         VALUES ($1, $2, $3, $4)`,
        [
          notificationId,
          `🔔 Reminder: Mail requires attention - ${mailSubject}`,
          'Unread',
          member.soc_portal_id
        ]
      );
    }

    // Create admin notification
    const adminNotificationId = await generateSequentialNotificationId('AN', 'admin_notification_details');
    await client.query(
      `INSERT INTO admin_notification_details 
       (notification_id, title, status)
       VALUES ($1, $2, $3)`,
      [
        adminNotificationId,
        `Reminder sent for mail: ${mailSubject} by ${userName} to ${teamMembersCount} ${assignedTeam} members`,
        'Unread'
      ]
    );

    await client.query('COMMIT');

    // Send Telegram alert
    const telegramMessage = `🔔 SOC PORTAL | MAIL REMINDER 🔔
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Mail Subject: ${mailSubject}
👤 Reminder By: ${userName}
👥 Assigned Team: ${assignedTeam}
👥 Notified Members: ${teamMembersCount}
🕒 Reminder Time: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}
🔖 EID: ${eid}`;

    await sendTelegramAlert(telegramMessage);

    logger.info('Mail reminder notification sent', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'MailReminder',
        details: `Reminder sent for mail: ${mailSubject}`,
        userId: socPortalId,
        mailSubject,
        assignedTeam,
        notifiedUsers: teamMembersCount
      }
    });

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${teamMembersCount} ${assignedTeam} team members`
    });

  } catch (error) {
    console.error('Error resending notification:', error);
    logger.error('Error resending notification', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'MailReminderError',
        details: `Error: ${error.message}`,
        userId: socPortalId
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to send notification' },
      { status: 500 }
    );
  }
}