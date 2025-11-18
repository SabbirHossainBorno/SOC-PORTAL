//app/api/user_dashboard/task_management/assign_task/route.js
import { NextResponse } from 'next/server';
import { query, getDbConnection } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';
import sendTelegramAlert from '../../../../../lib/telegramAlert';
import getClientIP from '../../../../../lib/utils/ipUtils';
import { DateTime } from 'luxon';

// Get current date in Asia/Dhaka timezone
const getCurrentDateInDhaka = () => {
  return DateTime.now().setZone('Asia/Dhaka').toISODate(); // Returns '2025-11-19'
};

// Get current time in Asia/Dhaka
const getCurrentDateTime = () => {
  const now = DateTime.now().setZone('Asia/Dhaka');
  return now.toFormat("yyyy-LL-dd hh:mm:ss a") + ' (' + now.offsetNameShort + ')';
};

// Format Telegram alert message for task assignment
const formatAssignmentAlert = (action, ipAddress, userAgent, userData, tasks, assignmentId) => {
  const time = getCurrentDateTime();
  const statusEmoji = action.includes('SUCCESS') ? '✅' : '❌';
  const statusText = action.includes('SUCCESS') ? 'Successful' : 'Failed';
  
  const tasksSummary = tasks.map((task, index) => 
    `${task.isImportant ? '🚨 ' : ''}${task.taskTitle} → ${task.assignedTo.join(', ')}`
  ).join('\n');
  
  const importantTasksCount = tasks.filter(task => task.isImportant).length;
  
  return `📋 *SOC Portal Task Assignment ${statusText}*

👤 *Assigned By:* ${userData.shortName}
📧 *Email:* ${userData.email}
🌐 *IP Address:* ${ipAddress}
🔖 *EID:* ${userData.eid}
🆔 *Assignment ID:* ${assignmentId}
📊 *Tasks Count:* ${tasks.length}
🚨 *Important Tasks:* ${importantTasksCount}
🕒 *Time:* ${time}
📱 *Device:* ${userAgent.split(' ')[0]}

📝 *Tasks Assignment:*
${tasksSummary}

${statusEmoji} *Status:* ${statusText}`;
};

// Generate sequential notification IDs for multiple notifications
const generateSequentialNotificationIds = async (prefix, table, count = 1, eid, sid) => {
  try {
    console.debug(`Generating ${count} sequential notification ID(s) for table: ${table}, prefix: ${prefix}`);
    
    const result = await query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    
    const notificationIds = [];
    for (let i = 1; i <= count; i++) {
      const nextId = (maxSerial + i).toString().padStart(4, '0');
      notificationIds.push(`${prefix}${nextId}SOCP`);
    }
    
    console.debug('Generated sequential notification IDs:', notificationIds);
    
    logger.debug('Sequential notification IDs generated successfully', {
      meta: {
        eid: eid,
        sid: sid,
        taskName: 'GenerateSequentialNotificationIds',
        details: `Generated ${count} notification IDs`,
        prefix: prefix,
        table: table,
        maxSerial: maxSerial,
        notificationIds: notificationIds,
        count: count,
        timestamp: new Date().toISOString()
      }
    });
    
    return count === 1 ? notificationIds[0] : notificationIds;
  } catch (error) {
    const errorMsg = `Error generating sequential notification ID: ${error.message}`;
    console.error(errorMsg, error);
    
    logger.error('Sequential notification ID generation failed', {
      meta: {
        eid: eid,
        sid: sid,
        taskName: 'GenerateSequentialNotificationIds',
        details: 'Failed to generate sequential notification IDs',
        error: error.message,
        errorStack: error.stack,
        prefix: prefix,
        table: table,
        count: count,
        timestamp: new Date().toISOString()
      }
    });
    
    throw new Error(errorMsg);
  }
};

// Generate assignment ID like AT01SOCP, AT02SOCP
const generateAssignmentId = async (eid, sid) => {
  try {
    console.log('Generating assignment ID...');
    const result = await query('SELECT MAX(serial) AS max_serial FROM assigned_tasks');
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(4, '0');
    const assignmentId = `AT${nextId}SOCP`;
    console.log('Generated assignment ID:', assignmentId);
    
    logger.info('Assignment ID generated successfully', {
      meta: {
        eid: eid,
        sid: sid,
        taskName: 'GenerateAssignmentId',
        details: `Generated assignment ID: ${assignmentId}`,
        assignmentId: assignmentId,
        previousMaxSerial: maxSerial,
        nextSerial: maxSerial + 1,
        timestamp: new Date().toISOString()
      }
    });
    
    return assignmentId;
  } catch (error) {
    console.error('Error generating assignment ID:', error);
    
    logger.error('Assignment ID generation failed', {
      meta: {
        eid: eid,
        sid: sid,
        taskName: 'GenerateAssignmentId',
        details: 'Failed to generate assignment ID',
        error: error.message,
        errorStack: error.stack,
        timestamp: new Date().toISOString()
      }
    });
    
    throw new Error(`Error generating assignment ID: ${error.message}`);
  }
};

// Get today's roster - FIXED: Use Asia/Dhaka timezone
const getTodaysRoster = async (date, eid, sid) => {
  try {
    // If no date provided, use today's date in Asia/Dhaka
    const queryDate = date || getCurrentDateInDhaka();
    
    console.log('Fetching roster for date:', queryDate);
    const rosterQuery = `
      SELECT * FROM roster_schedule 
      WHERE date = $1
    `;
    
    const result = await query(rosterQuery, [queryDate]);
    console.log('Roster query result row count:', result.rows.length);
    
    if (result.rows.length === 0) {
      console.log('No roster data found for date:', queryDate);
      return null;
    }

    const rosterRow = result.rows[0];
    const excludedFields = ['serial', 'roster_id', 'date', 'day', 'upload_by', 'created_at', 'updated_at'];
    
    const roster = {};
    Object.keys(rosterRow).forEach(key => {
      if (!excludedFields.includes(key) && rosterRow[key] !== null) {
        roster[key] = rosterRow[key];
      }
    });

    console.log('Processed roster data:', {
      totalFields: Object.keys(roster).length,
      sampleData: Object.entries(roster).slice(0, 5),
      date: queryDate
    });

    return {
      data: roster,
      date: queryDate,
      day: rosterRow.day // Include the day from database
    };
  } catch (error) {
    console.error('Error fetching roster data:', error);
    
    logger.error('Error fetching roster data', { 
      meta: {
        eid: eid,
        sid: sid,
        taskName: 'FetchRosterData',
        details: `Failed to fetch roster data for date: ${date}`,
        error: error.message,
        errorStack: error.stack,
        date: date,
        timestamp: new Date().toISOString()
      }
    });
    
    throw new Error(`Failed to fetch roster data: ${error.message}`);
  }
};

// Store assigned tasks in database (UPDATED - same assign_task_id for all tasks)
const storeAssignedTasks = async (assignmentId, tasks, assignedBy, eid, sid) => {
  let client;
  try {
    console.log('Starting to store assigned tasks...');
    client = await getDbConnection().connect();
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO assigned_tasks 
      (assign_task_id, task_title, task_type, assigned_by, assigned_to, remark, is_important, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING assign_task_id, created_at
    `;

    const currentTime = new Date().toISOString();
    console.log(`Preparing to insert ${tasks.length} tasks with same assignment ID: ${assignmentId}`);

    // Insert each task with the SAME assignment ID
    for (const task of tasks) {
      if (task.taskTitle.trim() && task.assignedTo.length > 0) {
        const assignedToStr = task.assignedTo.join(', ');
        
        console.log('Inserting task:', {
          assignmentId,
          taskTitle: task.taskTitle,
          taskType: task.taskType,
          remark: task.remark,
          isImportant: task.isImportant,
          assignedBy,
          assignedTo: assignedToStr
        });

        const result = await client.query(insertQuery, [
          assignmentId,
          task.taskTitle,
          task.taskType || null,
          assignedBy,
          assignedToStr,
          task.remark || null,
          task.isImportant || false,
          currentTime,
          currentTime
        ]);

        console.log('Task inserted successfully:', result.rows[0]);

        logger.info('Task stored in database successfully', {
          meta: {
            eid: eid,
            sid: sid,
            taskName: 'StoreAssignedTask',
            details: `Task stored with assignment ID: ${assignmentId}`,
            assignmentId: assignmentId,
            taskTitle: task.taskTitle,
            taskType: task.taskType,
            remark: task.remark,
            isImportant: task.isImportant,
            assignedBy: assignedBy,
            assignedTo: assignedToStr,
            assignedToCount: task.assignedTo.length,
            databaseTable: 'assigned_tasks',
            operation: 'INSERT',
            timestamp: currentTime
          }
        });
      } else {
        console.log('Skipping task - empty title or no assignees:', {
          taskTitle: task.taskTitle,
          assignedToCount: task.assignedTo.length
        });
      }
    }

    await client.query('COMMIT');
    console.log('All tasks stored successfully with same assignment ID');
    
    return { success: true };
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error storing assigned tasks:', error);
    
    logger.error('Error storing assigned tasks in database', {
      meta: {
        eid: eid,
        sid: sid,
        taskName: 'StoreAssignedTask',
        details: `Failed to store tasks with assignment ID: ${assignmentId}`,
        assignmentId: assignmentId,
        error: error.message,
        errorStack: error.stack,
        databaseTable: 'assigned_tasks',
        operation: 'INSERT',
        timestamp: new Date().toISOString()
      }
    });
    
    throw new Error(`Failed to store assigned tasks: ${error.message}`);
  } finally {
    if (client) {
      client.release();
      console.log('Database client released');
    }
  }
};

// Create notifications for assigned persons
const createNotifications = async (tasks, assignedBy, assignmentId, socPortalId, eid, sid) => {
  let client;
  try {
    console.log('Starting to create notifications...');
    client = await getDbConnection().connect();
    await client.query('BEGIN');

    // Get all unique assignees across all tasks
    const allAssignees = new Set();
    tasks.forEach(task => {
      task.assignedTo.forEach(assignee => allAssignees.add(assignee));
    });

    console.log(`Creating notifications for ${allAssignees.size} unique assignees:`, Array.from(allAssignees));
    
    // Calculate total notifications needed: 
    // 1 admin notification + 1 assigner notification + notifications for all assignees
    const totalNotifications = 2 + allAssignees.size;
    
    // Generate sequential notification IDs for all notifications at once
    const userNotificationIds = await generateSequentialNotificationIds('UN', 'user_notification_details', totalNotifications, eid, sid);
    const adminNotificationId = await generateSequentialNotificationIds('AN', 'admin_notification_details', 1, eid, sid);
    
    console.log('Generated notification IDs:', {
      adminNotificationId,
      userNotificationIds,
      totalNotifications
    });

    // 1. Create admin notification
    const adminNotificationQuery = `
      INSERT INTO admin_notification_details (notification_id, title, status)
      VALUES ($1, $2, $3)
    `;
    
    const importantTasksCount = tasks.filter(task => task.isImportant).length;
    const importantIndicator = importantTasksCount > 0 ? ` (including ${importantTasksCount} important tasks)` : '';
    
    console.log('Creating admin notification:', adminNotificationId);
    await client.query(adminNotificationQuery, [
      adminNotificationId,
      `${assignedBy} assigned ${tasks.length} task(s)${importantIndicator} - ${assignmentId}`,
      'Unread'
    ]);

    logger.info('Admin notification created successfully', {
      meta: {
        eid: eid,
        sid: sid,
        taskName: 'CreateAdminNotification',
        details: `Admin notification created for assignment ID: ${assignmentId}`,
        assignmentId: assignmentId,
        notificationId: adminNotificationId,
        assignedBy: assignedBy,
        tasksCount: tasks.length,
        importantTasksCount: importantTasksCount,
        databaseTable: 'admin_notification_details',
        operation: 'INSERT',
        timestamp: new Date().toISOString()
      }
    });

    // 2. Create user notification for assigner (first ID from user notifications)
    const userNotificationQuery = `
      INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id)
      VALUES ($1, $2, $3, $4)
    `;
    
    console.log('Creating user notification for assigner:', userNotificationIds[0]);
    await client.query(userNotificationQuery, [
      userNotificationIds[0],
      `You assigned ${tasks.length} task(s)${importantIndicator} - ${assignmentId}`,
      'Unread',
      socPortalId
    ]);

    logger.info('User notification for assigner created successfully', {
      meta: {
        eid: eid,
        sid: sid,
        taskName: 'CreateUserNotification',
        details: `User notification created for assigner for assignment ID: ${assignmentId}`,
        assignmentId: assignmentId,
        notificationId: userNotificationIds[0],
        socPortalId: socPortalId,
        assignedBy: assignedBy,
        tasksCount: tasks.length,
        importantTasksCount: importantTasksCount,
        databaseTable: 'user_notification_details',
        operation: 'INSERT',
        timestamp: new Date().toISOString()
      }
    });

    // 3. Create notifications for each assigned person
    let assigneeIndex = 1; // Start from index 1 (index 0 is for assigner)
    let assigneeNotificationsCount = 0;
    
    for (const assignee of allAssignees) {
      try {
        // Get assignee's soc_portal_id from user_info using case-insensitive search
        const userInfoQuery = `
          SELECT soc_portal_id, short_name, role_type 
          FROM user_info 
          WHERE LOWER(short_name) = LOWER($1)
        `;
        console.log('Fetching assignee info for:', assignee);
        const userInfoResult = await client.query(userInfoQuery, [assignee]);
        
        if (userInfoResult.rows.length > 0) {
          const assigneeSocPortalId = userInfoResult.rows[0].soc_portal_id;
          const assigneeShortName = userInfoResult.rows[0].short_name;
          const assigneeRole = userInfoResult.rows[0].role_type;
          
          // Get the next notification ID
          const assigneeNotificationId = userNotificationIds[assigneeIndex];
          assigneeIndex++;
          
          // Find tasks assigned to this person
          const assignedTasks = tasks.filter(task => task.assignedTo.includes(assignee));
          const taskTitles = assignedTasks.map(task => task.taskTitle).join(', ');
          const hasImportantTasks = assignedTasks.some(task => task.isImportant);
          const importantIndicator = hasImportantTasks ? '🚨 IMPORTANT: ' : '';
          
          console.log(`Creating notification for ${assigneeShortName}:`, {
            notificationId: assigneeNotificationId,
            assignedTasksCount: assignedTasks.length,
            hasImportantTasks: hasImportantTasks,
            taskTitles: taskTitles,
            socPortalId: assigneeSocPortalId
          });

          await client.query(userNotificationQuery, [
            assigneeNotificationId,
            `${importantIndicator}New ${assignedTasks.length} task(s) assigned by ${assignedBy}: ${taskTitles} - ${assignmentId}`,
            'Unread',
            assigneeSocPortalId
          ]);

          assigneeNotificationsCount++;
          
          logger.info('Notification created for assignee successfully', {
            meta: {
              eid: eid,
              sid: sid,
              taskName: 'CreateAssigneeNotification',
              details: `Notification created for assignee: ${assigneeShortName}`,
              assignmentId: assignmentId,
              notificationId: assigneeNotificationId,
              assignee: assigneeShortName,
              assigneeSocPortalId: assigneeSocPortalId,
              assigneeRole: assigneeRole,
              assignedTasksCount: assignedTasks.length,
              hasImportantTasks: hasImportantTasks,
              databaseTable: 'user_notification_details',
              operation: 'INSERT',
              timestamp: new Date().toISOString()
            }
          });
        } else {
          console.warn(`Assignee not found in user_info: ${assignee}`);
          logger.warn('Assignee not found in user_info', {
            meta: {
              eid: eid,
              sid: sid,
              taskName: 'CreateAssigneeNotification',
              details: `Assignee ${assignee} not found in user_info table`,
              assignmentId: assignmentId,
              assignee: assignee,
              timestamp: new Date().toISOString()
            }
          });
        }
      } catch (error) {
        console.error(`Failed to create notification for assignee ${assignee}:`, error);
        logger.warn('Failed to create notification for assignee', {
          meta: {
            eid: eid,
            sid: sid,
            taskName: 'CreateAssigneeNotification',
            details: `Failed to create notification for assignee: ${assignee}`,
            assignmentId: assignmentId,
            assignee: assignee,
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
        // Continue with other assignees even if one fails
      }
    }

    await client.query('COMMIT');
    console.log('All notifications created successfully');
    
    logger.info('All notifications created successfully', {
      meta: {
        eid: eid,
        sid: sid,
        taskName: 'CreateNotificationsComplete',
        details: `All notifications completed for assignment ID: ${assignmentId}`,
        assignmentId: assignmentId,
        tasksCount: tasks.length,
        uniqueAssignees: allAssignees.size,
        assigneeNotificationsCount: assigneeNotificationsCount,
        totalNotifications: totalNotifications,
        importantTasksCount: importantTasksCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error creating notifications:', error);
    
    logger.error('Error creating notifications', {
      meta: {
        eid: eid,
        sid: sid,
        taskName: 'CreateNotifications',
        details: `Failed to create notifications for assignment ID: ${assignmentId}`,
        assignmentId: assignmentId,
        error: error.message,
        errorStack: error.stack,
        timestamp: new Date().toISOString()
      }
    });
    
    throw new Error(`Failed to create notifications: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
  }
};

// GET endpoint - Fetch today's roster - FIXED: Use Asia/Dhaka timezone
export async function GET(request) {
  console.log('GET /api/user_dashboard/task_management/assign_task called');
  
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  
  // Use provided date or current date in Asia/Dhaka
  const date = dateParam || getCurrentDateInDhaka();
  
  console.log('Fetching roster for date:', date, 'Timezone: Asia/Dhaka');
  
  // Get cookies from request headers
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(cookie => {
      const [key, ...rest] = cookie.trim().split('=');
      return [key, rest.join('=')];
    })
  );
  
  const sessionId = cookies.sessionId || 'Unknown';
  const eid = cookies.eid || 'Unknown';
  const userId = cookies.socPortalId || 'Unknown';
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
  
  logger.info('Roster data fetch initiated', {
    meta: {
      eid: eid,
      sid: sessionId,
      taskName: 'FetchRosterData',
      details: `User ${userId} initiated roster data fetch for date: ${date}`,
      userId: userId,
      ipAddress: ipAddress,
      userAgent: userAgent,
      requestedDate: date,
      timezone: 'Asia/Dhaka',
      apiEndpoint: '/api/user_dashboard/task_management/assign_task',
      httpMethod: 'GET',
      timestamp: new Date().toISOString()
    }
  });

  try {
    const rosterResult = await getTodaysRoster(date, eid, sessionId);
    
    if (!rosterResult || !rosterResult.data) {
      console.log('No roster data found for date:', date);
      
      logger.warn('No roster data found for the specified date', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'FetchRosterData',
          details: `No roster data found for date: ${date}`,
          date: date,
          userId: userId,
          timestamp: new Date().toISOString()
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'No roster data found for the specified date' },
        { status: 404 }
      );
    }

    console.log('Roster data fetched successfully:', {
      totalMembers: Object.keys(rosterResult.data).length,
      date: rosterResult.date,
      day: rosterResult.day,
      sampleData: Object.entries(rosterResult.data).slice(0, 3)
    });

    logger.info('Roster data fetched successfully', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'FetchRosterData',
        details: `Roster data retrieved successfully for ${date}`,
        date: rosterResult.date,
        day: rosterResult.day,
        teamMembersCount: Object.keys(rosterResult.data).length,
        userId: userId,
        ipAddress: ipAddress,
        userAgent: userAgent,
        rosterData: rosterResult.data,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      data: rosterResult.data,
      date: rosterResult.date,
      day: rosterResult.day
    });
    
  } catch (error) {
    console.error('Failed to fetch roster data:', error);
    
    logger.error('Roster data fetch failed', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'FetchRosterData',
        details: `Failed to fetch roster data for date: ${date}`,
        error: error.message,
        errorStack: error.stack,
        date: date,
        userId: userId,
        ipAddress: ipAddress,
        userAgent: userAgent,
        timestamp: new Date().toISOString()
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch roster data: ' + error.message },
      { status: 500 }
    );
  }
}

// POST endpoint - Assign tasks (UPDATED - same assignment ID for all tasks)
export async function POST(request) {
  console.log('POST /api/user_dashboard/task_management/assign_task called');
  
  // Get cookies from request headers
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(cookie => {
      const [key, ...rest] = cookie.trim().split('=');
      return [key, rest.join('=')];
    })
  );
  
  const sessionId = cookies.sessionId || 'Unknown';
  const eid = cookies.eid || 'Unknown';
  const userId = cookies.socPortalId || 'Unknown';
  const userEmail = cookies.email || 'Unknown';
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
  
  console.log('Request details:', {
    userId,
    userEmail,
    eid,
    sessionId,
    ipAddress
  });
  
  logger.info('Task assignment process initiated', {
    meta: {
      eid: eid,
      sid: sessionId,
      taskName: 'TaskAssignmentInit',
      details: `User ${userId} initiated task assignment process`,
      userId: userId,
      ipAddress: ipAddress,
      userAgent: userAgent,
      apiEndpoint: '/api/user_dashboard/task_management/assign_task',
      httpMethod: 'POST',
      timestamp: new Date().toISOString()
    }
  });

  let client;
  
  try {
    const body = await request.json();
    console.log('Assignment request body received:', JSON.stringify(body, null, 2));
    
    const { tasks, assignedBy } = body;
    
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      console.warn('No tasks provided in assignment request');
      
      logger.warn('No tasks provided in assignment request', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'TaskAssignmentValidation',
          details: 'No tasks array provided in request body',
          userId: userId,
          assignedBy: assignedBy,
          timestamp: new Date().toISOString()
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'No tasks provided' },
        { status: 400 }
      );
    }

    if (!assignedBy) {
      console.warn('Assigned by information missing');
      
      logger.warn('Assigned by information missing', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'TaskAssignmentValidation',
          details: 'Assigned by information is required but missing',
          userId: userId,
          timestamp: new Date().toISOString()
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'Assigned by information is required' },
        { status: 400 }
      );
    }

    // Filter out empty tasks and tasks without assignees
    const validTasks = tasks.filter(task => 
      task.taskTitle && task.taskTitle.trim() !== '' && 
      task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length > 0
    );
    
    console.log('Task validation results:', {
      totalTasks: tasks.length,
      validTasks: validTasks.length,
      importantTasks: validTasks.filter(task => task.isImportant).length,
      validTasksDetails: validTasks.map(task => ({
        title: task.taskTitle,
        isImportant: task.isImportant,
        assignees: task.assignedTo,
        assigneesCount: task.assignedTo.length
      }))
    });
    
    if (validTasks.length === 0) {
      console.warn('No valid tasks with assignees provided');
      
      logger.warn('No valid tasks with assignees provided', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'TaskAssignmentValidation',
          details: 'All tasks either missing title or assignees',
          userId: userId,
          assignedBy: assignedBy,
          totalTasksReceived: tasks.length,
          validTasksCount: 0,
          timestamp: new Date().toISOString()
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'No valid tasks with assignees provided' },
        { status: 400 }
      );
    }

    logger.info('Task assignment validation passed', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'TaskAssignmentValidation',
        details: `Task assignment validation successful`,
        tasksCount: validTasks.length,
        importantTasksCount: validTasks.filter(task => task.isImportant).length,
        assignees: validTasks.flatMap(task => task.assignedTo),
        assignedBy: assignedBy,
        userId: userId,
        timestamp: new Date().toISOString()
      }
    });

    // Get user info for notification
    const userInfoQuery = 'SELECT short_name, email, role_type FROM user_info WHERE soc_portal_id = $1';
    console.log('Fetching user info for:', userId);
    const userInfoResult = await query(userInfoQuery, [userId]);
    
    if (userInfoResult.rows.length === 0) {
      console.error('User not found in database:', userId);
      
      logger.error('User not found in database', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'TaskAssignmentUserCheck',
          details: `User with soc_portal_id ${userId} not found in user_info table`,
          userId: userId,
          timestamp: new Date().toISOString()
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const userShortName = userInfoResult.rows[0].short_name;
    const userEmail = userInfoResult.rows[0].email;
    const userRole = userInfoResult.rows[0].role_type;

    console.log('User information retrieved:', {
      shortName: userShortName,
      email: userEmail,
      role: userRole
    });

    logger.info('User information retrieved successfully', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'TaskAssignmentUserInfo',
        details: `User information retrieved for assignment`,
        userId: userId,
        userShortName: userShortName,
        userEmail: userEmail,
        userRole: userRole,
        timestamp: new Date().toISOString()
      }
    });

    // Generate assignment ID (SAME for all tasks)
    console.log('Generating assignment ID...');
    const assignmentId = await generateAssignmentId(eid, sessionId);
    
    console.log('Generated assignment ID:', assignmentId);

    // Store assigned tasks in database with SAME assignment ID
    console.log('Storing assigned tasks in database with same assignment ID...');
    await storeAssignedTasks(assignmentId, validTasks, assignedBy, eid, sessionId);

    // Get database connection for transaction
    client = await getDbConnection().connect();
    await client.query('BEGIN');

    // Create notifications
    console.log('Creating notifications...');
    await createNotifications(validTasks, assignedBy, assignmentId, userId, eid, sessionId);

    // Log activity
    console.log('Logging user activity...');
    const activityLogQuery = `
      INSERT INTO user_activity_log 
      (soc_portal_id, action, description, ip_address, device_info, eid, sid)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    const importantTasksCount = validTasks.filter(task => task.isImportant).length;
    const importantIndicator = importantTasksCount > 0 ? ` (${importantTasksCount} important tasks)` : '';
    
    await client.query(activityLogQuery, [
      userId,
      'TASK_ASSIGNMENT',
      `Assigned ${validTasks.length} task(s)${importantIndicator} with individual assignees - ${assignmentId}`,
      ipAddress,
      userAgent,
      eid,
      sessionId
    ]);

    logger.info('User activity logged successfully', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'LogUserActivity',
        details: `User activity logged for task assignment`,
        userId: userId,
        assignmentId: assignmentId,
        tasksCount: validTasks.length,
        importantTasksCount: importantTasksCount,
        action: 'TASK_ASSIGNMENT',
        databaseTable: 'user_activity_log',
        operation: 'INSERT',
        timestamp: new Date().toISOString()
      }
    });

    await client.query('COMMIT');
    client.release();

    // Send Telegram alert
    console.log('Sending Telegram alert...');
    const alertMessage = formatAssignmentAlert(
      'SUCCESS', 
      ipAddress, 
      userAgent,
      { shortName: userShortName, email: userEmail, eid },
      validTasks,
      assignmentId
    );
    
    await sendTelegramAlert(alertMessage);

    logger.info('Task assignment completed successfully', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'TaskAssignmentComplete',
        details: `Task assignment process completed successfully`,
        assignmentId: assignmentId,
        tasksCount: validTasks.length,
        importantTasksCount: importantTasksCount,
        assignedBy: userShortName,
        userId: userId,
        totalAssignees: validTasks.flatMap(task => task.assignedTo).length,
        uniqueAssignees: [...new Set(validTasks.flatMap(task => task.assignedTo))].length,
        tasks: validTasks.map(task => ({
          title: task.taskTitle,
          isImportant: task.isImportant,
          assignees: task.assignedTo,
          type: task.taskType,
          remark: task.remark
        })),
        ipAddress: ipAddress,
        userAgent: userAgent,
        telegramAlert: 'SENT',
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('Task assignment completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Tasks assigned successfully',
      assignmentId: assignmentId,
      tasksCount: validTasks.length,
      importantTasksCount: validTasks.filter(task => task.isImportant).length,
      assignedBy: assignedBy
    });
    
  } catch (error) {
    console.error('Task assignment failed:', error);
    
    // Rollback transaction if client exists
    if (client) {
      try {
        await client.query('ROLLBACK');
        client.release();
        console.log('Database transaction rolled back');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
        
        logger.error('Database rollback failed', {
          meta: {
            eid: eid,
            sid: sessionId,
            taskName: 'DatabaseRollback',
            details: 'Failed to rollback database transaction',
            error: rollbackError.message,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
    
    logger.error('Task assignment process failed', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'TaskAssignmentFailed',
        details: `Task assignment process failed with error`,
        error: error.message,
        errorStack: error.stack,
        userId: userId,
        ipAddress: ipAddress,
        userAgent: userAgent,
        timestamp: new Date().toISOString()
      }
    });
    
    // Send failure alert
    try {
      console.log('Sending failure alert...');
      const alertMessage = formatAssignmentAlert(
        'FAILURE', 
        ipAddress, 
        userAgent,
        { shortName: 'Unknown', email: userEmail, eid },
        [],
        'N/A'
      );
      
      await sendTelegramAlert(alertMessage);
      
      logger.info('Failure alert sent successfully', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'SendFailureAlert',
          details: 'Telegram failure alert sent',
          timestamp: new Date().toISOString()
        }
      });
    } catch (alertError) {
      console.error('Failed to send alert:', alertError);
      
      logger.error('Failed to send failure alert', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'SendFailureAlert',
          details: 'Failed to send Telegram failure alert',
          error: alertError.message,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to assign tasks: ' + error.message },
      { status: 500 }
    );
  }
}