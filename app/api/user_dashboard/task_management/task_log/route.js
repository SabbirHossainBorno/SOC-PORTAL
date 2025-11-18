// app/api/user_dashboard/task_management/task_log/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';
import getClientIP from '../../../../../lib/utils/ipUtils';

// GET endpoint - Fetch task log with role-based access
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

  logger.info('Task log fetch initiated', {
    meta: {
      eid: eid,
      sid: sessionId,
      taskName: 'TaskLogFetch',
      details: `User ${userId} fetching task log`,
      userId: userId,
      ipAddress: ipAddress,
      userAgent: userAgent,
      apiEndpoint: '/api/user_dashboard/task_management/task_log',
      httpMethod: 'GET',
      timestamp: new Date().toISOString()
    }
  });

  try {
    // Get current user's info including role
    const userQuery = 'SELECT short_name, role_type FROM user_info WHERE soc_portal_id = $1';
    const userResult = await query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const userShortName = userResult.rows[0].short_name;
    const userRole = userResult.rows[0].role_type;
    const isSOC = userRole === 'SOC';

    console.log('User role check:', {
      userShortName,
      userRole,
      isSOC
    });

    let tasksQuery;
    let queryParams = [];

    if (isSOC) {
      // SOC members can see all tasks
      tasksQuery = `
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
        ORDER BY assign_task_id DESC, created_at DESC
      `;
    } else {
      // INTERN members can only see tasks assigned to them
      tasksQuery = `
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
        ORDER BY assign_task_id DESC, created_at DESC
      `;
      queryParams = [`%${userShortName}%`];
    }

    const tasksResult = await query(tasksQuery, queryParams);
    
    // For INTERN users, filter to ensure they only see tasks where they are explicitly assigned
    let tasks = tasksResult.rows;
    
    if (!isSOC) {
      tasks = tasks.filter(task => {
        try {
          const assignees = task.assigned_to.split(',').map(name => name.trim());
          const isAssigned = assignees.some(assignee => {
            const cleanAssignee = assignee.replace(/\s+/g, ' ').trim();
            const cleanUserName = userShortName.replace(/\s+/g, ' ').trim();
            return cleanAssignee.toLowerCase() === cleanUserName.toLowerCase();
          });
          return isAssigned;
        } catch (error) {
          console.error('Error checking assignment for task:', task.assign_task_id, error);
          return false;
        }
      });
    }

    // Calculate statistics
    const totalTasks = tasks.length;
    const inProgressTasks = tasks.filter(task => task.status === 'IN-PROGRESS').length;
    const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
    const importantTasks = tasks.filter(task => task.is_important).length;
    const solvedTasks = tasks.filter(task => task.solved_by).length;

    logger.info('Task log fetched successfully', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'TaskLogFetch',
        details: `Fetched ${tasks.length} tasks for ${isSOC ? 'SOC' : 'INTERN'} user ${userShortName}`,
        userId: userId,
        userShortName: userShortName,
        userRole: userRole,
        totalTasks: totalTasks,
        inProgressTasks: inProgressTasks,
        completedTasks: completedTasks,
        importantTasks: importantTasks,
        solvedTasks: solvedTasks,
        accessLevel: isSOC ? 'Full' : 'Limited',
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      data: tasks,
      userShortName: userShortName,
      userRole: userRole,
      statistics: {
        total: totalTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        important: importantTasks,
        solved: solvedTasks
      },
      accessInfo: {
        level: isSOC ? 'full' : 'limited',
        description: isSOC ? 'Can view all tasks' : 'Can only view assigned tasks'
      }
    });

  } catch (error) {
    console.error('Error fetching task log:', error);
    
    logger.error('Task log fetch failed', {
      meta: {
        eid: eid,
        sid: sessionId,
        taskName: 'TaskLogFetch',
        details: `Failed to fetch task log for user ${userId}`,
        error: error.message,
        errorStack: error.stack,
        userId: userId,
        timestamp: new Date().toISOString()
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch task log: ' + error.message },
      { status: 500 }
    );
  }
}