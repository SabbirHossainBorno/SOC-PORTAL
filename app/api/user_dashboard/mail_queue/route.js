//app/api/user_dashboard/mail_queue/route.js
import { NextResponse } from 'next/server';
import { query, getDbConnection } from '../../../../lib/db';
import logger from '../../../../lib/logger';
import sendTelegramAlert from '../../../../lib/telegramAlert';
import { DateTime } from 'luxon';

// Helper function to format date
const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    return DateTime.fromJSDate(new Date(date), { zone: 'utc' }).setZone('Asia/Dhaka').toFormat('dd/MM/yyyy');
  } catch (error) {
    return 'N/A';
  }
};

// Generate sequential notification IDs
const generateSequentialNotificationId = async (prefix, table, count = 1) => {
  try {
    console.debug(`Generating ${count} sequential notification ID(s) for table: ${table}, prefix: ${prefix}`);
    
    // Get the maximum serial number from the specified table
    const result = await query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
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

// Get mail queue data
export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';

  console.debug('Mail queue GET request received', {
    sessionId,
    eid,
    userId,
    url: request.url
  });

  logger.info('Mail queue GET request initiated', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'MailQueueView',
      details: `User ${userId} requesting mail queue data`,
      userId,
      url: request.url
    }
  });

  try {
    // Get user role
    console.debug('Fetching user role for:', userId);
    const userQuery = 'SELECT role_type FROM user_info WHERE soc_portal_id = $1';
    const userResult = await query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      const errorMsg = 'User not found in database';
      console.error(errorMsg, { userId });
      logger.error(errorMsg, {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'MailQueueViewError',
          details: `User ${userId} not found in database`,
          userId
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const userRole = userResult.rows[0].role_type;
    console.debug('User role determined:', userRole);

    // Get mail queue statistics
    console.debug('Fetching mail queue statistics');
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'IN-PROGRESS') as total_in_progress,
        COUNT(*) FILTER (WHERE status = 'IN-PROGRESS' AND assigned_team = 'SOC') as soc_count,
        COUNT(*) FILTER (WHERE status = 'IN-PROGRESS' AND assigned_team = 'OPS') as ops_count
      FROM mail_tracking
      WHERE status = 'IN-PROGRESS'
    `;

    const statsResult = await query(statsQuery);
    const stats = statsResult.rows[0];
    console.debug('Mail queue statistics:', stats);

    // Get mail data based on user role
    let mailQuery = `
      SELECT 
        serial, tracking_date, mail_subject, task_raised_date, 
        task_solve_date, raised_by, status, solved_within_day, 
        assigned_team, tracked_by, created_at, updated_at
      FROM mail_tracking 
      WHERE status = 'IN-PROGRESS'
    `;

    let queryParams = [];
    let queryDescription = 'All in-progress mails';

    if (userRole === 'SOC') {
      mailQuery += ' AND assigned_team = $1';
      queryParams.push('SOC');
      queryDescription = 'SOC in-progress mails';
    } else if (userRole === 'OPS') {
      mailQuery += ' AND assigned_team = $1';
      queryParams.push('OPS');
      queryDescription = 'OPS in-progress mails';
    }

    mailQuery += ' ORDER BY created_at DESC';
    console.debug('Executing mail query:', { mailQuery, queryParams, queryDescription });

    const mailResult = await query(mailQuery, queryParams);
    console.debug('Mail query results:', { count: mailResult.rows.length });

    logger.info('Mail queue data fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'MailQueueView',
        details: `Fetched ${mailResult.rows.length} ${queryDescription}`,
        userId,
        userRole,
        stats: {
          totalInProgress: parseInt(stats.total_in_progress),
          socCount: parseInt(stats.soc_count),
          opsCount: parseInt(stats.ops_count)
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalInProgress: parseInt(stats.total_in_progress),
          socCount: parseInt(stats.soc_count),
          opsCount: parseInt(stats.ops_count)
        },
        mails: mailResult.rows,
        userRole
      }
    });

  } catch (error) {
    console.error('Error fetching mail queue data:', error);
    logger.error('Error fetching mail queue data', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'MailQueueViewError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch mail queue data' },
      { status: 500 }
    );
  }
}

// Mark mail as solved
export async function POST(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  console.debug('Mail solve POST request received', {
    sessionId,
    eid,
    userId,
    ipAddress,
    userAgent
  });

  logger.info('Mail solve submission initiated', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'MailSolve',
      details: `User ${userId} marking mail as solved`,
      userId,
      ipAddress,
      userAgent
    }
  });

  try {
    const requestBody = await request.json();
    const { mailSerial, taskSolveDate, feedback } = requestBody;
    
    console.debug('Request body received:', requestBody);

    // Validate required fields
    if (!mailSerial || !taskSolveDate) {
      const errorMsg = 'Missing required fields in request';
      console.error(errorMsg, { mailSerial, taskSolveDate });
      logger.error(errorMsg, {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'MailSolveError',
          details: `Missing required fields: mailSerial=${mailSerial}, taskSolveDate=${taskSolveDate}`,
          userId,
          requestBody
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user info
    console.debug('Fetching user info for:', userId);
    const userQuery = 'SELECT short_name, role_type FROM user_info WHERE soc_portal_id = $1';
    const userResult = await query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      const errorMsg = 'User not found in database';
      console.error(errorMsg, { userId });
      logger.error(errorMsg, {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'MailSolveError',
          details: `User ${userId} not found in database`,
          userId
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const userShortName = userResult.rows[0].short_name;
    const userRole = userResult.rows[0].role_type;
    console.debug('User info retrieved:', { userShortName, userRole });

    // Get mail details
    console.debug('Fetching mail details for serial:', mailSerial);
    const mailQuery = 'SELECT * FROM mail_tracking WHERE serial = $1';
    const mailResult = await query(mailQuery, [mailSerial]);
    
    if (mailResult.rows.length === 0) {
      const errorMsg = 'Mail entry not found';
      console.error(errorMsg, { mailSerial });
      logger.error(errorMsg, {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'MailSolveError',
          details: `Mail with serial ${mailSerial} not found`,
          userId,
          mailSerial
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Mail entry not found' },
        { status: 404 }
      );
    }

    const mail = mailResult.rows[0];
    console.debug('Mail details retrieved:', mail);

    // Check if user has permission to solve this mail
    if (mail.assigned_team !== userRole) {
      const errorMsg = 'User does not have permission to solve this mail';
      console.error(errorMsg, { 
        userRole, 
        mailAssignedTeam: mail.assigned_team,
        mailSerial 
      });
      logger.error(errorMsg, {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'MailSolveError',
          details: `User ${userId} (${userRole}) cannot solve mail assigned to ${mail.assigned_team}`,
          userId,
          userRole,
          mailAssignedTeam: mail.assigned_team,
          mailSerial
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'You do not have permission to solve this mail' },
        { status: 403 }
      );
    }

    // Calculate solved within day
    const solvedWithinDay = mail.task_raised_date === taskSolveDate ? 'YES' : 'NO';
    console.debug('Solved within day calculation:', {
      taskRaisedDate: mail.task_raised_date,
      taskSolveDate,
      solvedWithinDay
    });

    // Start transaction
    console.debug('Starting database transaction');
    const client = await getDbConnection().connect();
    try {
      await client.query('BEGIN');
      console.debug('Transaction begun');

      // Update mail tracking record
      const updateQuery = `
        UPDATE mail_tracking 
        SET 
          status = 'SOLVED',
          task_solve_date = $1,
          solved_within_day = $2,
          solved_by = $3,
          feedback = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE serial = $5
      `;

      console.debug('Executing mail update query:', {
        query: updateQuery,
        params: [taskSolveDate, solvedWithinDay, userShortName, feedback, mailSerial]
      });

      const updateResult = await client.query(updateQuery, [
        taskSolveDate,
        solvedWithinDay,
        userShortName,
        feedback,
        mailSerial
      ]);

      console.debug('Mail update result:', {
        rowCount: updateResult.rowCount,
        command: updateResult.command
      });

      // Determine which users to notify based on solver's role
      let usersToNotifyQuery = '';
      let queryParams = [userId]; // Exclude current user
      let notificationGroup = '';

      if (userRole === 'OPS') {
        // If solver is OPS, notify all OPS and SOC users except current user
        usersToNotifyQuery = `
          SELECT soc_portal_id FROM user_info 
          WHERE (role_type = 'OPS' OR role_type = 'SOC') 
          AND soc_portal_id != $1 
          AND status = 'Active'
        `;
        notificationGroup = 'OPS and SOC users';
      } else if (userRole === 'SOC') {
        // If solver is SOC, notify all SOC users except current user
        usersToNotifyQuery = `
          SELECT soc_portal_id FROM user_info 
          WHERE role_type = 'SOC' 
          AND soc_portal_id != $1 
          AND status = 'Active'
        `;
        notificationGroup = 'SOC users';
      }

      console.debug('Fetching users to notify:', {
        query: usersToNotifyQuery,
        params: queryParams,
        notificationGroup
      });

      // Get users to notify
      const usersToNotifyResult = await client.query(usersToNotifyQuery, queryParams);
      const usersToNotifyCount = usersToNotifyResult.rows.length;
      console.debug('Users to notify count:', usersToNotifyCount);

      // Generate admin notification ID
      const adminNotificationId = await generateSequentialNotificationId('AN', 'admin_notification_details');
      
      // Generate user notification IDs (1 for solver + count for team members)
      const userNotificationIds = await generateSequentialNotificationId(
        'UN', 
        'user_notification_details', 
        1 + usersToNotifyCount
      );

      // Create admin notification
      console.debug('Creating admin notification');
      const adminNotificationQuery = `
        INSERT INTO admin_notification_details (notification_id, title, status)
        VALUES ($1, $2, $3)
      `;
      
      await client.query(adminNotificationQuery, [
        adminNotificationId,
        `${mail.mail_subject} solved by ${userShortName}`,
        'Unread'
      ]);
      
      console.debug('Admin notification created:', { notificationId: adminNotificationId });

      // Create notification for the current user (solver)
      console.debug('Creating user notification for solver');
      await client.query(`
        INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id)
        VALUES ($1, $2, $3, $4)
      `, [
        userNotificationIds[0],
        `${mail.mail_subject} solved`,
        'Unread',
        userId
      ]);
      
      console.debug('User notification created for solver:', { notificationId: userNotificationIds[0] });

      // Create notifications for team members
      let notificationCount = 0;
      for (let i = 0; i < usersToNotifyCount; i++) {
        const user = usersToNotifyResult.rows[i];
        const notificationId = userNotificationIds[i + 1]; // +1 because index 0 is for the solver
        
        await client.query(`
          INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id)
          VALUES ($1, $2, $3, $4)
        `, [
          notificationId,
          `${mail.mail_subject} solved by ${userShortName}`,
          'Unread',
          user.soc_portal_id
        ]);
        
        notificationCount++;
        console.debug(`Notification ${notificationCount} created for user ${user.soc_portal_id}:`, {
          notificationId
        });
      }

      console.debug(`Total notifications created: ${notificationCount + 2}`); // +2 for admin and solver notifications

      // Log activity
      console.debug('Creating activity log entry');
      const activityLogQuery = `
        INSERT INTO user_activity_log (soc_portal_id, action, description, eid, sid, ip_address, device_info)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      const activityLogResult = await client.query(activityLogQuery, [
        userId,
        'MAIL_SOLVED',
        `Solved mail: ${mail.mail_subject}`,
        eid,
        sessionId,
        ipAddress,
        userAgent
      ]);
      
      console.debug('Activity log created:', {
        rowCount: activityLogResult.rowCount
      });

      await client.query('COMMIT');
      client.release();
      console.debug('Transaction committed successfully');

      // Send Telegram alert
      const alertMessage = `📨 SOC PORTAL | MAIL SOLVED 📨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Mail Subject: ${mail.mail_subject}
✅ Solved By: ${userShortName}
📅 Solved Date: ${formatDate(taskSolveDate)}
👤 Raised By: ${mail.raised_by}
🔖 EID: ${eid}
🕒 Solved Time: ${DateTime.now().setZone('Asia/Dhaka').toFormat('yyyy-MM-dd HH:mm:ss')}`;

      console.debug('Sending Telegram alert');
      await sendTelegramAlert(alertMessage);

      const successMsg = 'Mail marked as solved successfully';
      console.debug(successMsg, {
        mailSerial,
        solvedBy: userShortName,
        notificationsSent: notificationCount + 2
      });

      logger.info('Mail marked as solved successfully', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'MailSolved',
          details: `Solved mail: ${mail.mail_subject}`,
          userId,
          mailSerial,
          solvedBy: userShortName,
          taskSolveDate,
          solvedWithinDay,
          notifications: {
            admin: 1,
            solver: 1,
            teamMembers: notificationCount,
            total: notificationCount + 2
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Mail marked as solved successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      
      console.error('Error solving mail - transaction rolled back:', error);
      logger.error('Error solving mail', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'MailSolveError',
          details: `Error: ${error.message}`,
          stack: error.stack,
          userId,
          mailSerial,
          transactionRolledBack: true
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Failed to mark mail as solved' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in mail solve request:', error);
    logger.error('Error in mail solve request', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'MailSolveError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to process mail solve request' },
      { status: 500 }
    );
  }
}