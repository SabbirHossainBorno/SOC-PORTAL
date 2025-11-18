//app/api/user_dashboard/task_management/my_task/route.js
import { NextResponse } from 'next/server';
import { query, getDbConnection } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';
import sendTelegramAlert from '../../../../../lib/telegramAlert';
import getClientIP from '../../../../../lib/utils/ipUtils';
import { DateTime } from 'luxon';

// Get current time in Asia/Dhaka
const getCurrentDateTime = () => {
  const now = DateTime.now().setZone('Asia/Dhaka');
  return now.toFormat("yyyy-LL-dd hh:mm:ss a") + ' (' + now.offsetNameShort + ')';
};

// Format Telegram alert for task completion
const formatCompletionAlert = (action, ipAddress, userAgent, userData, task, completionRemark) => {
  const time = getCurrentDateTime();
  const statusEmoji = action.includes('SUCCESS') ? '✅' : '❌';
  const statusText = action.includes('SUCCESS') ? 'Completed' : 'Failed';
  
  const importantIndicator = task.is_important ? '🚨 IMPORTANT TASK\n' : '';
  
  return `📋 *SOC Portal Task ${statusText}*

${importantIndicator}👤 *Completed By:* ${userData.shortName}
📧 *Email:* ${userData.email}
🌐 *IP Address:* ${ipAddress}
🔖 *EID:* ${userData.eid}
🆔 *Task ID:* ${task.assign_task_id}
📝 *Task Title:* ${task.task_title}
👥 *Assigned By:* ${task.assigned_by}
🕒 *Completion Time:* ${time}
📱 *Device:* ${userAgent.split(' ')[0]}
💬 *Completion Remark:* ${completionRemark || 'No remark provided'}

${statusEmoji} *Status:* ${statusText}`;
};

// Generate sequential notification IDs
const generateSequentialNotificationIds = async (prefix, table, count = 1, eid, sid) => {
  try {
    const result = await query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    
    const notificationIds = [];
    for (let i = 1; i <= count; i++) {
      const nextId = (maxSerial + i).toString().padStart(4, '0');
      notificationIds.push(`${prefix}${nextId}SOCP`);
    }
    
    return count === 1 ? notificationIds[0] : notificationIds;
  } catch (error) {
    throw new Error(`Error generating notification ID: ${error.message}`);
  }
};

// GET endpoint - Fetch current user's tasks
export async function GET(request) {
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

  logger.info('My Tasks fetch initiated', {
    meta: {
      eid: eid,
      sid: sessionId,
      taskName: 'MyTasksFetch',
      details: `User ${userId} fetching their assigned tasks`,
      userId: userId,
      ipAddress: ipAddress,
      userAgent: userAgent,
      apiEndpoint: '/api/user_dashboard/task_management/my_task',
      httpMethod: 'GET',
      timestamp: new Date().toISOString()
    }
  });

  try {
    // Get current user's short name
    const userQuery = 'SELECT short_name FROM user_info WHERE soc_portal_id = $1';
    const userResult = await query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const userShortName = userResult.rows[0].short_name;

    // Fetch ALL tasks assigned to current user (both IN-PROGRESS and COMPLETED)
    const tasksQuery = `
      SELECT 
        serial,
        assign_task_id,
        task_title,
        task_type,
        assigned_by,
        assigned_to,
        remark,
        status,
        is_important,
        created_at,
        solved_by,
        solved_date
      FROM assigned_tasks 
      WHERE assigned_to ILIKE $1 
      ORDER BY 
        CASE WHEN status = 'IN-PROGRESS' THEN 1 ELSE 2 END,
        created_at DESC
    `;

    const tasksResult = await query(tasksQuery, [`%${userShortName}%`]);
    
    // FIXED: Better assignment verification with case-insensitive matching and exact word matching
    const tasks = tasksResult.rows.filter(task => {
      try {
        const assignees = task.assigned_to.split(',').map(name => name.trim());
        
        // Case-insensitive check for user in assignees - EXACT MATCH
        const isAssigned = assignees.some(assignee => {
          // Remove any extra spaces and compare case-insensitively
          const cleanAssignee = assignee.replace(/\s+/g, ' ').trim();
          const cleanUserName = userShortName.replace(/\s+/g, ' ').trim();
          return cleanAssignee.toLowerCase() === cleanUserName.toLowerCase();
        });
        
        if (!isAssigned) {
          console.log(`User ${userShortName} not found in assignees:`, assignees);
        }
        
        return isAssigned;
      } catch (error) {
        console.error('Error checking assignment for task:', task.assign_task_id, error);
        return false;
      }
    });

    // Calculate statistics
    const totalTasks = tasks.length;
    const inProgressTasks = tasks.filter(task => task.status === 'IN-PROGRESS').length;
    const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
    const importantTasks = tasks.filter(task => task.is_important).length;

    logger.info('My Tasks fetched successfully', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'MyTasksFetch',
        details: `Fetched ${tasks.length} tasks for user ${userShortName}`,
        userId: userId,
        userShortName: userShortName,
        totalTasks: totalTasks,
        inProgressTasks: inProgressTasks,
        completedTasks: completedTasks,
        importantTasks: importantTasks,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      data: tasks,
      userShortName: userShortName,
      statistics: {
        total: totalTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        important: importantTasks
      }
    });

  } catch (error) {
    console.error('Error fetching my tasks:', error);
    
    logger.error('My Tasks fetch failed', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'MyTasksFetch',
        details: `Failed to fetch tasks for user ${userId}`,
        error: error.message,
        errorStack: error.stack,
        userId: userId,
        timestamp: new Date().toISOString()
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch tasks: ' + error.message },
      { status: 500 }
    );
  }
}

// PATCH endpoint - Mark task as complete (COMPLETELY FIXED parameter data type issue)
export async function PATCH(request) {
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

  logger.info('Task completion initiated', {
    meta: {
      eid: eid,
      sid: sessionId,
      taskName: 'TaskCompletion',
      details: `User ${userId} initiating task completion`,
      userId: userId,
      ipAddress: ipAddress,
      userAgent: userAgent,
      apiEndpoint: '/api/user_dashboard/task_management/my_task',
      httpMethod: 'PATCH',
      timestamp: new Date().toISOString()
    }
  });

  let client;

  try {
    const body = await request.json();
    const { taskId, completionRemark } = body;

    if (!taskId) {
      return NextResponse.json(
        { success: false, message: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Get current user's info
    const userQuery = 'SELECT short_name, email FROM user_info WHERE soc_portal_id = $1';
    const userResult = await query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const userShortName = userResult.rows[0].short_name;
    const userEmail = userResult.rows[0].email;

    // Get task details
    const taskQuery = 'SELECT * FROM assigned_tasks WHERE assign_task_id = $1';
    const taskResult = await query(taskQuery, [taskId]);
    
    if (taskResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }

    const task = taskResult.rows[0];

    // FIXED: Better assignment verification with case-insensitive matching and exact word matching
    let isAssigned = false;
    try {
      const assignees = task.assigned_to.split(',').map(name => name.trim());
      isAssigned = assignees.some(assignee => {
        // Remove any extra spaces and compare case-insensitively
        const cleanAssignee = assignee.replace(/\s+/g, ' ').trim();
        const cleanUserName = userShortName.replace(/\s+/g, ' ').trim();
        return cleanAssignee.toLowerCase() === cleanUserName.toLowerCase();
      });
      
      console.log('Assignment check:', {
        userShortName,
        assignees,
        isAssigned,
        taskId: task.assign_task_id
      });
      
    } catch (error) {
      console.error('Error during assignment verification:', error);
      return NextResponse.json(
        { success: false, message: 'Error verifying task assignment' },
        { status: 500 }
      );
    }

    if (!isAssigned) {
      logger.warn('User not assigned to task', {
        meta: {
          eid: eid,
          sid: sessionId,
          taskName: 'TaskCompletion',
          details: `User ${userShortName} attempted to complete task they are not assigned to`,
          userId: userId,
          userShortName: userShortName,
          taskId: taskId,
          assignedTo: task.assigned_to,
          timestamp: new Date().toISOString()
        }
      });
      
      return NextResponse.json(
        { success: false, message: 'You are not assigned to this task' },
        { status: 403 }
      );
    }

    // Check if task is already completed
    if (task.status === 'COMPLETED') {
      return NextResponse.json(
        { success: false, message: 'Task is already completed' },
        { status: 400 }
      );
    }

    // Start transaction
    client = await getDbConnection().connect();
    await client.query('BEGIN');

    // FIXED: Use a simple approach without complex SQL logic
    // Build the final remark in JavaScript to avoid SQL parameter type issues
    let finalRemark = task.remark;
    
    if (completionRemark && completionRemark.trim() !== '') {
      if (finalRemark && finalRemark.trim() !== '') {
        finalRemark = `${finalRemark} | Completion: ${completionRemark}`;
      } else {
        finalRemark = `Completion: ${completionRemark}`;
      }
    }
    
    // Always use the same parameter structure to avoid type inference issues
    const updateQuery = `
      UPDATE assigned_tasks 
      SET 
        status = $1,
        solved_by = $2,
        solved_date = CURRENT_TIMESTAMP,
        remark = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE assign_task_id = $4
      RETURNING *
    `;

    const updateParams = [
      'COMPLETED',           // $1 - status
      userShortName,         // $2 - solved_by
      finalRemark,           // $3 - remark (can be the original or updated)
      taskId                 // $4 - task_id
    ];

    console.log('Executing update query:', {
      query: updateQuery,
      params: updateParams,
      finalRemark: finalRemark
    });

    const updateResult = await client.query(updateQuery, updateParams);

    // Create notifications
    const totalNotifications = 2; // Admin + Assigner
    const userNotificationIds = await generateSequentialNotificationIds('UN', 'user_notification_details', totalNotifications, eid, sessionId);
    const adminNotificationId = await generateSequentialNotificationIds('AN', 'admin_notification_details', 1, eid, sessionId);

    // Admin notification
    const importantIndicator = task.is_important ? '🚨 IMPORTANT TASK COMPLETED: ' : '';
    await client.query(
      'INSERT INTO admin_notification_details (notification_id, title, status) VALUES ($1, $2, $3)',
      [
        adminNotificationId,
        `${importantIndicator}${userShortName} completed task: ${task.task_title} - ${taskId}`,
        'Unread'
      ]
    );

    // Notification for task assigner
    const assignerQuery = 'SELECT soc_portal_id FROM user_info WHERE short_name = $1';
    const assignerResult = await client.query(assignerQuery, [task.assigned_by]);
    
    if (assignerResult.rows.length > 0) {
      const assignerSocPortalId = assignerResult.rows[0].soc_portal_id;
      
      await client.query(
        'INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id) VALUES ($1, $2, $3, $4)',
        [
          userNotificationIds[0],
          `${importantIndicator}${userShortName} completed your task: ${task.task_title} - ${taskId}`,
          'Unread',
          assignerSocPortalId
        ]
      );
    }

    // Notification for current user
    await client.query(
      'INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id) VALUES ($1, $2, $3, $4)',
      [
        userNotificationIds[1],
        `You completed task: ${task.task_title} - ${taskId}`,
        'Unread',
        userId
      ]
    );

    // Log activity
    await client.query(
      `INSERT INTO user_activity_log 
       (soc_portal_id, action, description, ip_address, device_info, eid, sid)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        'TASK_COMPLETED',
        `Completed ${task.is_important ? 'important ' : ''}task: ${task.task_title} - ${taskId}`,
        ipAddress,
        userAgent,
        eid,
        sessionId
      ]
    );

    await client.query('COMMIT');
    client.release();

    // Send Telegram alert
    const alertMessage = formatCompletionAlert(
      'SUCCESS', 
      ipAddress, 
      userAgent,
      { shortName: userShortName, email: userEmail, eid },
      task,
      completionRemark
    );
    
    await sendTelegramAlert(alertMessage);

    logger.info('Task completed successfully', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'TaskCompletion',
        details: `Task ${taskId} completed by ${userShortName}`,
        userId: userId,
        userShortName: userShortName,
        taskId: taskId,
        taskTitle: task.task_title,
        isImportant: task.is_important,
        completionRemark: completionRemark,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Task marked as completed successfully',
      task: updateResult.rows[0]
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }

    console.error('Error completing task:', error);
    
    logger.error('Task completion failed', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'TaskCompletion',
        details: `Failed to complete task`,
        error: error.message,
        errorStack: error.stack,
        userId: userId,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to complete task: ' + error.message },
      { status: 500 }
    );
  }
}