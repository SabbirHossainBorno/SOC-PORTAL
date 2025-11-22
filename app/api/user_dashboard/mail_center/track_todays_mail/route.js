// app/api/user_dashboard/mail_center/track_todays_mail/route.js
import { NextResponse } from 'next/server';
import { query, getDbConnection } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';
import sendTelegramAlert from '../../../../../lib/telegramAlert';
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

// Generate sequential notification IDs following the same format as mail_queue
const generateSequentialNotificationId = async (prefix, table, client, count = 1) => {
  try {
    console.debug(`Generating ${count} sequential notification ID(s) for table: ${table}, prefix: ${prefix}`);
    
    // Get the maximum serial number from the specified table within the transaction
    const result = await client.query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    
    // Generate sequential IDs
    const notificationIds = [];
    for (let i = 1; i <= count; i++) {
      const nextId = (maxSerial + i).toString().padStart(4, '0');
      notificationIds.push(`${prefix}${nextId}SOCP`);
    }
    
    console.debug('Generated sequential notification IDs:', notificationIds);
    logger.debug('Generated sequential notification IDs', {
      meta: {
        notificationIds,
        prefix,
        table,
        maxSerial,
        count
      }
    });
    
    return count === 1 ? notificationIds[0] : notificationIds;
  } catch (error) {
    const errorMsg = `Error generating sequential notification ID: ${error.message}`;
    console.error(errorMsg, error);
    logger.error(errorMsg, {
      meta: {
        error: error.message,
        stack: error.stack,
        prefix,
        table,
        count
      }
    });
    throw new Error(errorMsg);
  }
};

// Send bulk notifications to team members for in-progress mails
const sendTeamNotifications = async (client, inProgressMails, trackedBy, userId) => {
  let totalNotifications = 0;
  
  // Group in-progress mails by team
  const teamMails = {};
  inProgressMails.forEach(mail => {
    if (!teamMails[mail.assignedTeam]) {
      teamMails[mail.assignedTeam] = [];
    }
    teamMails[mail.assignedTeam].push(mail);
  });

  console.debug('Sending team notifications for:', teamMails);

  // Process each team
  for (const [team, mails] of Object.entries(teamMails)) {
    // Get active team members for this team
    const teamMembersResult = await client.query(
      'SELECT soc_portal_id FROM user_info WHERE role_type = $1 AND status = $2',
      [team, 'Active']
    );

    const teamMembersCount = teamMembersResult.rows.length;
    console.debug(`Found ${teamMembersCount} active members for team ${team}`);

    if (teamMembersCount > 0) {
      // Calculate total notifications needed for this team (one per mail per member)
      const notificationCount = teamMembersCount * mails.length;
      
      // Generate sequential notification IDs for all team notifications
      const notificationIds = await generateSequentialNotificationId('UN', 'user_notification_details', client, notificationCount);
      
      let notificationIndex = 0;
      
      // Create notifications for each team member for each mail
      for (const member of teamMembersResult.rows) {
        for (const mail of mails) {
          await client.query(
            `INSERT INTO user_notification_details 
             (notification_id, title, status, soc_portal_id)
             VALUES ($1, $2, $3, $4)`,
            [
              notificationIds[notificationIndex],
              `📨 New mail requires attention: ${mail.mailSubject}`,
              'Unread',
              member.soc_portal_id
            ]
          );
          notificationIndex++;
          totalNotifications++;
        }
      }

      console.debug(`Sent ${notificationIndex} notifications to ${team} team for ${mails.length} mails`);

      // Create admin notification for team assignment
      const teamAdminNotificationId = await generateSequentialNotificationId('AN', 'admin_notification_details', client);
      await client.query(
        `INSERT INTO admin_notification_details 
         (notification_id, title, status)
         VALUES ($1, $2, $3)`,
        [
          teamAdminNotificationId,
          `${mails.length} mail(s) assigned to ${team} team - tracked by ${trackedBy}`,
          'Unread'
        ]
      );

      console.debug(`Created admin notification for ${team} team assignment`);
    }
  }
  
  console.debug(`Total notifications sent: ${totalNotifications}`);
  return totalNotifications;
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
    userId,
    teamNotifications
  } = details;

  const time = getCurrentDateTime();
  
  let alertMessage = `📨 SOC PORTAL | MAIL TRACKING 📨
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

  // Add team notification info if available
  if (teamNotifications && Object.keys(teamNotifications).length > 0) {
    alertMessage += '\n\n🔔 Team Notifications Sent:';
    for (const [team, count] of Object.entries(teamNotifications)) {
      alertMessage += `\n• ${team}: ${count} mail(s) assigned`;
    }
  }

  return alertMessage;
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

  // Start database connection early
  const client = await getDbConnection().connect();
  
  try {
    const { trackingDate, mailEntries } = await request.json();

    // Validate required fields
    if (!trackingDate || !mailEntries || mailEntries.length === 0) {
      client.release();
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user's short name
    const userQuery = 'SELECT short_name FROM user_info WHERE soc_portal_id = $1';
    const userResult = await client.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      client.release();
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const trackedBy = userResult.rows[0].short_name;

    // Start transaction
    await client.query('BEGIN');

    let solvedCount = 0;
    let inProgressCount = 0;
    const inProgressMails = [];

    console.debug(`Processing ${mailEntries.length} mail entries`);

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
      const assignedTeamValue = status === 'SOLVED' ? null : (assignedTeam || 'SOC');

      // Count solved vs in-progress and collect in-progress mails
      if (status === 'SOLVED') {
        solvedCount++;
      } else {
        inProgressCount++;
        inProgressMails.push({
          mailSubject,
          assignedTeam: assignedTeamValue
        });
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
        assignedTeamValue,
        trackedBy
      ]);
    }

    console.debug(`Processed entries - Solved: ${solvedCount}, In-Progress: ${inProgressCount}`);

    // Send notifications for in-progress mails to respective teams (BULK NOTIFICATION)
    let teamNotifications = {};
    let totalTeamNotifications = 0;
    
    if (inProgressMails.length > 0) {
      console.debug(`Sending notifications for ${inProgressMails.length} in-progress mails`);
      
      // Group by team for the success message
      inProgressMails.forEach(mail => {
        if (!teamNotifications[mail.assignedTeam]) {
          teamNotifications[mail.assignedTeam] = 0;
        }
        teamNotifications[mail.assignedTeam]++;
      });

      // Send bulk notifications using sequential IDs
      totalTeamNotifications = await sendTeamNotifications(client, inProgressMails, trackedBy, userId);
      console.debug(`Total team notifications sent: ${totalTeamNotifications}`);
    }

    // Generate sequential notification IDs for main tracking (following mail_queue pattern)
    const adminNotificationId = await generateSequentialNotificationId('AN', 'admin_notification_details', client);
    const userNotificationId = await generateSequentialNotificationId('UN', 'user_notification_details', client);

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

    // Create user notification for the tracker
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
      userId,
      teamNotifications
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
        inProgressCount,
        teamNotifications,
        totalTeamNotifications
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Mail tracking data saved successfully',
      data: {
        totalEntries: mailEntries.length,
        solvedCount,
        inProgressCount,
        teamNotifications,
        totalTeamNotifications
      }
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
        userId,
        errorCode: error.code,
        constraint: error.constraint
      }
    });
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to save mail tracking data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}