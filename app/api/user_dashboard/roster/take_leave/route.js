// app/api/user_dashboard/roster/take_leave/route.js
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

const formatDateTime = (date) => {
  if (!date) return 'N/A';
  try {
    return DateTime.fromJSDate(new Date(date), { zone: 'utc' }).setZone('Asia/Dhaka').toFormat('dd/MM/yyyy, HH:mm');
  } catch (error) {
    return 'N/A';
  }
};

const generateNotificationId = async (prefix, table, client) => {
  try {
    // Query the latest notification_id from the specified table
    const result = await client.query(`SELECT notification_id FROM ${table} ORDER BY serial DESC LIMIT 1`);
    let nextSerial = 1;

    if (result.rows.length > 0) {
      const lastNotificationId = result.rows[0].notification_id;
      // Extract the numeric part (e.g., '0001' from 'UN0001SOCP')
      const serialMatch = lastNotificationId.match(/(\d{4})/);
      if (serialMatch) {
        nextSerial = parseInt(serialMatch[1], 10) + 1;
      }
    }

    // Generate the next notification_id
    const nextId = `${prefix}${nextSerial.toString().padStart(4, '0')}SOCP`;
    return nextId;
  } catch (error) {
    throw new Error(`Error generating notification ID for ${table}: ${error.message}`);
  }
};

const formatTakeLeaveAlert = (details) => {
  const {
    type,
    userName,
    date,
    yourShift,
    assignedTo,
    reason,
    handoverTask,
    communicatedPerson,
    ipAddress,
    userAgent,
    eid,
    userId
  } = details;

  const time = getCurrentDateTime();
  let shiftInfo = '';
  if (assignedTo && assignedTo !== 'None') {
    shiftInfo = `👥 Assigned To: ${assignedTo}`;
  } else {
    shiftInfo = '👥 Assigned To: None (No shift coverage)';
  }
  
  return `🏖️ SOC PORTAL | LEAVE REQUEST 🏖️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Type: ${type}
👤 User: ${userName}
📅 Date: ${formatDate(date)}
⏰ Your Shift: ${yourShift} → LEAVE
${shiftInfo}
📝 Reason: ${reason}
📦 Task Handover: ${handoverTask}
📞 Communicated To: ${communicatedPerson}
👤 Requested By: ${userId}
🌐 IP Address: ${ipAddress}
🖥️ Device Info: ${userAgent}
🔖 EID: ${eid}
🕒 Request Time: ${time}`;
};

export async function POST(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  logger.info('Leave request initiated', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'TakeLeave',
      details: `User ${userId} requesting leave`,
      userId,
      ipAddress,
      userAgent
    }
  });

  try {
    const { date, assignedTo, reason, handoverTask, communicatedPerson } = await request.json();

    // Validate required fields
    if (!date || !reason || !communicatedPerson) {
      logger.warn('Leave request validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: 'Missing required fields',
          userId,
          date,
          assignedTo,
          reason: !!reason,
          communicatedPerson: !!communicatedPerson
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user info
    const userQuery = 'SELECT short_name FROM user_info WHERE soc_portal_id = $1';
    const userResult = await query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      logger.warn('User not found for leave request', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UserNotFound',
          details: `User ID ${userId} not found in database`,
          userId
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const userShortName = userResult.rows[0].short_name.toLowerCase();
    const userName = userResult.rows[0].short_name;

    // Get roster for the selected date
    const rosterQuery = 'SELECT * FROM roster_schedule WHERE date = $1';
    const rosterResult = await query(rosterQuery, [date]);
    
    if (rosterResult.rows.length === 0) {
      logger.warn('Roster not found for date', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'RosterNotFound',
          details: `No roster found for date: ${date}`,
          userId,
          date
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'No roster found for selected date' },
        { status: 404 }
      );
    }

    const roster = rosterResult.rows[0];
    const userShift = roster[userShortName];

    if (!userShift) {
      logger.warn('No shift assigned to user', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'NoUserShift',
          details: `User ${userName} has no shift on ${date}`,
          userId,
          date
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'No shift assigned to you on the selected date' },
        { status: 400 }
      );
    }

    // Start transaction
    const client = await getDbConnection().connect();
    try {
      await client.query('BEGIN');

      let updateQuery;
      let queryParams;
      
      if (assignedTo && assignedTo !== 'None') {
        // Check if assignedTo has a shift
        const assignedToShift = roster[assignedTo.toLowerCase()];
        if (!assignedToShift) {
          await client.query('ROLLBACK');
          client.release();
          logger.warn('No shift assigned to team member', {
            meta: {
              eid,
              sid: sessionId,
              taskName: 'NoTeamMemberShift',
              details: `Team member ${assignedTo} has no shift on ${date}`,
              userId,
              assignedTo,
              date
            }
          });
          
          return NextResponse.json(
            { success: false, message: 'No shift assigned to the selected team member on the selected date' },
            { status: 400 }
          );
        }

        // Update both user and assigned person
        updateQuery = `
          UPDATE roster_schedule 
          SET ${userShortName} = 'LEAVE', ${assignedTo.toLowerCase()} = $1, updated_at = CURRENT_TIMESTAMP
          WHERE date = $2
        `;
        queryParams = [userShift, date];
      } else {
        // Only update user to LEAVE
        updateQuery = `
          UPDATE roster_schedule 
          SET ${userShortName} = 'LEAVE', updated_at = CURRENT_TIMESTAMP
          WHERE date = $1
        `;
        queryParams = [date];
      }

      await client.query(updateQuery, queryParams);

      // Insert into roster_schedule_note table
      const insertNoteQuery = `
        INSERT INTO roster_schedule_note 
        (type, your_shift, assigned_to, updated_shift, reason, handover_task, communicated_person, requested_by, request_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      await client.query(insertNoteQuery, [
        'Take Leave',
        userShift,
        assignedTo === 'None' ? null : assignedTo,
        'LEAVE',
        reason,
        handoverTask || 'No Dependency',
        communicatedPerson,
        userId,
        date
      ]);

      // Generate admin notification ID
      const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details', client);

      // Create admin notification
      const adminNotificationQuery = `
        INSERT INTO admin_notification_details (notification_id, title, status)
        VALUES ($1, $2, $3)
      `;
      
      let adminNotificationTitle;
      if (assignedTo && assignedTo !== 'None') {
        adminNotificationTitle = `Leave Request: ${userName} took leave and assigned shift to ${assignedTo} on ${formatDate(date)}`;
      } else {
        adminNotificationTitle = `Leave Request: ${userName} took leave on ${formatDate(date)}`;
      }
      
      await client.query(adminNotificationQuery, [
        adminNotificationId,
        adminNotificationTitle,
        'Unread'
      ]);

      // Generate user notification ID
      const userNotificationId = await generateNotificationId('UN', 'user_notification_details', client);

      // Create user notification
      const userNotificationQuery = `
        INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id)
        VALUES ($1, $2, $3, $4)
      `;
      
      let userNotificationTitle;
      if (assignedTo && assignedTo !== 'None') {
        userNotificationTitle = `Leave Request: You took leave and assigned shift to ${assignedTo} on ${formatDate(date)}`;
      } else {
        userNotificationTitle = `Leave Request: You took leave on ${formatDate(date)}`;
      }
      
      await client.query(userNotificationQuery, [
        userNotificationId,
        userNotificationTitle,
        'Unread',
        userId
      ]);

      // Create notification for assigned user if applicable
      if (assignedTo && assignedTo !== 'None') {
        const assignedUserQuery = 'SELECT soc_portal_id FROM user_info WHERE short_name = $1';
        const assignedUserResult = await client.query(assignedUserQuery, [assignedTo]);
        if (assignedUserResult.rows.length > 0) {
          const assignedUserId = assignedUserResult.rows[0].soc_portal_id;
          // Fetch the latest notification_id again for assigned user
          const assignedUserNotificationId = await generateNotificationId('UN', 'user_notification_details', client);
          
          await client.query(
            `INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id)
            VALUES ($1, $2, $3, $4)`,
            [
              assignedUserNotificationId,
              `Leave Assignment: You have been assigned ${userName}'s shift on ${formatDate(date)}`,
              'Unread',
              assignedUserId
            ]
          );
        }
      }

      // Log activity
      const activityLogQuery = `
        INSERT INTO user_activity_log (soc_portal_id, action, description, eid, sid, ip_address, device_info)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      let activityDescription;
      if (assignedTo && assignedTo !== 'None') {
        activityDescription = `Took leave and assigned shift to ${assignedTo} on ${date} (${userShift} → LEAVE)`;
      } else {
        activityDescription = `Took leave on ${date} (${userShift} → LEAVE)`;
      }
      
      await client.query(activityLogQuery, [
        userId,
        'TAKE_LEAVE',
        activityDescription,
        eid,
        sessionId,
        ipAddress,
        userAgent
      ]);

      await client.query('COMMIT');
      client.release();

      // Send Telegram alert
      const alertMessage = formatTakeLeaveAlert({
        type: 'Take Leave',
        userName,
        date,
        yourShift: userShift,
        assignedTo: assignedTo === 'None' ? null : assignedTo,
        reason,
        handoverTask: handoverTask || 'No Dependency',
        communicatedPerson,
        ipAddress,
        userAgent,
        eid,
        userId
      });

      await sendTelegramAlert(alertMessage);

      logger.info('Leave request completed successfully', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'TakeLeaveSuccess',
          details: `User ${userId} took leave on ${date}`,
          userId,
          assignedTo,
          date,
          userShift
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Leave request successful'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      
      logger.error('Error processing leave request', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'TakeLeaveError',
          details: `Error: ${error.message}`,
          stack: error.stack,
          userId
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Failed to process leave request' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Error in leave request', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'TakeLeaveError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to process leave request' },
      { status: 500 }
    );
  }
}