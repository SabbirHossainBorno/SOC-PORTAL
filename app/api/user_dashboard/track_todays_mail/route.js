//app/api/user_dashboard/track_todays_mail/route.js
import { NextResponse } from 'next/server';
import { query, getDbConnection } from '../../../../lib/db';
import logger from '../../../../lib/logger';
import sendTelegramAlert from '../../../../lib/telegramAlert';
import { DateTime } from 'luxon';

// Helper functions
const getCurrentDateTime = () => {
  return DateTime.now().setZone('Asia/Dhaka').toFormat('yyyy-MM-dd HH:mm:ss');
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    return DateTime.fromJSDate(new Date(date), { zone: 'utc' }).setZone('Asia/Dhaka').toFormat('dd/MM/yyyy');
  } catch (error) {
    return 'N/A';
  }
};

const generateNotificationId = async (prefix, table) => {
  try {
    const result = await query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(4, '0');
    return `${prefix}${nextId}SOCP`;
  } catch (error) {
    throw new Error(`Error generating notification ID: ${error.message}`);
  }
};

const formatMailTrackingAlert = (details) => {
  const {
    trackingDate,
    totalEntries,
    solvedCount,
    inProgressCount,
    trackedBy,
    ipAddress,
    userAgent,
    eid,
    userId
  } = details;

  const time = getCurrentDateTime();
  
  return `📨 SOC PORTAL | MAIL TRACKING 📨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Tracking Date: ${formatDate(trackingDate)}
📊 Total Entries: ${totalEntries}
✅ Solved: ${solvedCount}
🔄 In Progress: ${inProgressCount}
👤 Tracked By: ${trackedBy}
🌐 IP Address: ${ipAddress}
🖥️ Device Info: ${userAgent}
🔖 EID: ${eid}
🕒 Tracking Time: ${time}`;
};

export async function POST(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  logger.info('Mail tracking submission initiated', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'MailTracking',
      details: `User ${userId} submitting mail tracking data`,
      userId,
      ipAddress,
      userAgent
    }
  });

  try {
    const { trackingDate, mailEntries } = await request.json();

    // Validate required fields
    if (!trackingDate || !mailEntries || mailEntries.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user's short name
    const userQuery = 'SELECT short_name FROM user_info WHERE soc_portal_id = $1';
    const userResult = await query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const trackedBy = userResult.rows[0].short_name;

    // Start transaction
    const client = await getDbConnection().connect();
    try {
      await client.query('BEGIN');

      let solvedCount = 0;
      let inProgressCount = 0;

      // Process each mail entry
      for (const entry of mailEntries) {
  const {
    mailSubject,
    taskRaisedDate,
    taskSolveDate,
    raisedBy,
    assignedTeam
  } = entry;

  // Calculate status and solved within day
  const status = taskSolveDate ? 'SOLVED' : 'IN-PROGRESS';
  const solvedWithinDay = taskSolveDate && taskRaisedDate === taskSolveDate ? 'YES' : 'NO';

  // Handle assigned_team for solved entries
  // For solved entries, we don't need an assigned team, so we'll use a placeholder
 const assignedTeamValue = status === 'SOLVED' ? null : (assignedTeam || 'SOC');

  // Count solved vs in-progress
  if (status === 'SOLVED') {
    solvedCount++;
  } else {
    inProgressCount++;
  }

  const insertQuery = `
    INSERT INTO mail_tracking 
    (tracking_date, mail_subject, task_raised_date, task_solve_date, raised_by, status, solved_within_day, assigned_team, tracked_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `;

  await client.query(insertQuery, [
    trackingDate,
    mailSubject,
    taskRaisedDate,
    taskSolveDate,
    raisedBy.toUpperCase(),
    status,
    solvedWithinDay,
    assignedTeamValue, // Use the processed value
    trackedBy
  ]);
}

      // Generate notification IDs
      const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details');
      const userNotificationId = await generateNotificationId('UN', 'user_notification_details');

      // Create admin notification
      const adminNotificationQuery = `
        INSERT INTO admin_notification_details (notification_id, title, status)
        VALUES ($1, $2, $3)
      `;
      await client.query(adminNotificationQuery, [
        adminNotificationId,
        `${trackedBy} tracked ${mailEntries.length} mail for ${formatDate(trackingDate)}. Solved ${solvedCount}, Inprogress ${inProgressCount}`,
        'Unread'
      ]);

      // Create user notification
      const userNotificationQuery = `
        INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id)
        VALUES ($1, $2, $3, $4)
      `;
      await client.query(userNotificationQuery, [
        userNotificationId,
        `Added ${mailEntries.length} mail on mail tracker`,
        'Unread',
        userId
      ]);

      // Log activity
      const activityLogQuery = `
        INSERT INTO user_activity_log (soc_portal_id, action, description, eid, sid, ip_address, device_info)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      await client.query(activityLogQuery, [
        userId,
        'MAIL_TRACKING',
        `Tracked ${mailEntries.length} mail entries for ${trackingDate}`,
        eid,
        sessionId,
        ipAddress,
        userAgent
      ]);

      await client.query('COMMIT');
      client.release();

      // Send Telegram alert
      const alertMessage = formatMailTrackingAlert({
        trackingDate,
        totalEntries: mailEntries.length,
        solvedCount,
        inProgressCount,
        trackedBy,
        ipAddress,
        userAgent,
        eid,
        userId
      });

      await sendTelegramAlert(alertMessage);

      logger.info('Mail tracking data saved successfully', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'MailTracking',
          details: `Saved ${mailEntries.length} mail entries`,
          userId,
          trackingDate,
          trackedBy,
          solvedCount,
          inProgressCount
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Mail tracking data saved successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      
      logger.error('Error saving mail tracking data', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'MailTrackingError',
          details: `Error: ${error.message}`,
          stack: error.stack,
          userId
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Failed to save mail tracking data' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Error in mail tracking request', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'MailTrackingError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to process mail tracking request' },
      { status: 500 }
    );
  }
}