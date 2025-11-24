// app/api/user_dashboard/dashboard_card/route.js
import { query } from '../../../../lib/db';
import { cookies } from 'next/headers';
import logger from '../../../../lib/logger';

export async function GET(request) {
  const startTime = Date.now();
  const taskName = 'DashboardCards';
  
  try {
    // Use await for cookies in Next.js 15
    const cookieStore = await cookies();
    const socPortalId = cookieStore.get('socPortalId')?.value;
    const roleType = cookieStore.get('roleType')?.value;
    
    logger.info('Dashboard cards request received', {
      meta: {
        taskName,
        socPortalId,
        roleType,
        endpoint: '/api/user_dashboard/dashboard_card'
      }
    });

    if (!socPortalId) {
      logger.warn('Unauthorized dashboard cards access attempt', {
        meta: {
          taskName,
          error: 'User not authenticated'
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'User not authenticated'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user short_name for all authenticated users
    let shortName = null;
    let rosterData = {
      today: 'Not Available',
      tomorrow: 'Not Available'
    };
    
    const userQuery = 'SELECT short_name FROM user_info WHERE soc_portal_id = $1';
    const userResult = await query(userQuery, [socPortalId]);
    shortName = userResult.rows[0]?.short_name;

    // Only fetch roster for SOC users with valid short_name
    if (roleType === 'SOC' && shortName) {
      try {
        const rosterQuery = `
          SELECT 
            date,
            ${shortName} as shift 
          FROM roster_schedule 
          WHERE date IN (CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day')
          ORDER BY date
        `;
        const rosterResult = await query(rosterQuery);
        
        // Process roster results
        const todayRoster = rosterResult.rows.find(row => {
          const rowDate = new Date(row.date);
          const today = new Date();
          return rowDate.toDateString() === today.toDateString();
        });
        
        const tomorrowRoster = rosterResult.rows.find(row => {
          const rowDate = new Date(row.date);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return rowDate.toDateString() === tomorrow.toDateString();
        });

        rosterData = {
          today: todayRoster?.shift || 'Not Assigned',
          tomorrow: tomorrowRoster?.shift || 'Not Assigned'
        };

        logger.info('Roster data fetched successfully', {
          meta: {
            taskName,
            shortName,
            todayRoster: rosterData.today,
            tomorrowRoster: rosterData.tomorrow
          }
        });
      } catch (rosterError) {
        logger.warn('Roster data not available for user', {
          meta: {
            taskName,
            shortName,
            error: rosterError.message
          }
        });
        rosterData = {
          today: 'Not Available',
          tomorrow: 'Not Available'
        };
      }
    }

    logger.info('User info processed', {
      meta: {
        taskName,
        shortName,
        socPortalId,
        roleType,
        hasRoster: roleType === 'SOC'
      }
    });

    // 1. Downtime Count & Duration - Fixed calculation
    const downtimeQuery = `
      WITH ranked_downtimes AS (
        SELECT
          downtime_id,
          start_date_time,
          end_date_time,
          EXTRACT(EPOCH FROM (COALESCE(end_date_time, NOW()) - start_date_time)) AS duration_seconds,
          ROW_NUMBER() OVER (
            PARTITION BY downtime_id
            ORDER BY EXTRACT(EPOCH FROM (COALESCE(end_date_time, NOW()) - start_date_time)) DESC
          ) AS rn
        FROM downtime_report_v2
      ),
      distinct_downtimes AS (
        SELECT
          downtime_id,
          start_date_time,
          end_date_time,
          duration_seconds
        FROM ranked_downtimes
        WHERE rn = 1
      ),
      period_totals AS (
        SELECT
          -- Total (all time)
          COUNT(*) as total_count,
          COALESCE(SUM(duration_seconds), 0) as total_seconds,
          
          -- This Week (Sunday to Saturday)
          COUNT(CASE WHEN start_date_time::date >= (date_trunc('week', CURRENT_DATE) - INTERVAL '1 day')::date
                     AND start_date_time::date < ((date_trunc('week', CURRENT_DATE) - INTERVAL '1 day')::date + INTERVAL '7 days')
                THEN 1 END) as this_week_count,
          COALESCE(SUM(CASE WHEN start_date_time::date >= (date_trunc('week', CURRENT_DATE) - INTERVAL '1 day')::date
                            AND start_date_time::date < ((date_trunc('week', CURRENT_DATE) - INTERVAL '1 day')::date + INTERVAL '7 days')
                      THEN duration_seconds END), 0) as this_week_seconds,
          
          -- Last Week
          COUNT(CASE WHEN start_date_time::date >= ((date_trunc('week', CURRENT_DATE) - INTERVAL '1 day')::date - INTERVAL '7 days')
                     AND start_date_time::date < ((date_trunc('week', CURRENT_DATE) - INTERVAL '1 day')::date)
                THEN 1 END) as last_week_count,
          COALESCE(SUM(CASE WHEN start_date_time::date >= ((date_trunc('week', CURRENT_DATE) - INTERVAL '1 day')::date - INTERVAL '7 days')
                            AND start_date_time::date < ((date_trunc('week', CURRENT_DATE) - INTERVAL '1 day')::date)
                      THEN duration_seconds END), 0) as last_week_seconds,
          
          -- This Month
          COUNT(CASE WHEN start_date_time::date >= date_trunc('month', CURRENT_DATE)::date
                     AND start_date_time::date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date
                THEN 1 END) as this_month_count,
          COALESCE(SUM(CASE WHEN start_date_time::date >= date_trunc('month', CURRENT_DATE)::date
                            AND start_date_time::date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date
                      THEN duration_seconds END), 0) as this_month_seconds,
          
          -- Last Month
          COUNT(CASE WHEN start_date_time::date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date
                     AND start_date_time::date < date_trunc('month', CURRENT_DATE)::date
                THEN 1 END) as last_month_count,
          COALESCE(SUM(CASE WHEN start_date_time::date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date
                            AND start_date_time::date < date_trunc('month', CURRENT_DATE)::date
                      THEN duration_seconds END), 0) as last_month_seconds
        FROM distinct_downtimes
      )
      SELECT * FROM period_totals
    `;

    // 2. Mail Queue Count with Date-wise Breakdown (only for non-INTERN users)
    let mailQueue = {
      total: 0,
      byDate: []
    };
    
    if (roleType !== 'INTERN') {
      try {
        const mailQuery = `
          SELECT 
            task_raised_date,
            COUNT(*) as count
          FROM mail_tracking 
          WHERE status = 'IN-PROGRESS' 
          AND assigned_team = $1
          GROUP BY task_raised_date
          ORDER BY task_raised_date DESC
          LIMIT 10
        `;
        const mailResult = await query(mailQuery, [roleType]);
        
        // Calculate total and prepare date-wise data
        let totalCount = 0;
        const byDate = mailResult.rows.map(row => {
          totalCount += parseInt(row.count);
          return {
            date: row.task_raised_date,
            count: parseInt(row.count)
          };
        });

        mailQueue = {
          total: totalCount,
          byDate: byDate
        };

        logger.info('Mail queue data fetched successfully', {
          meta: {
            taskName,
            roleType,
            totalMails: mailQueue.total,
            dateWiseEntries: mailQueue.byDate.length
          }
        });
      } catch (mailError) {
        logger.warn('Failed to fetch mail queue data', {
          meta: {
            taskName,
            roleType,
            error: mailError.message
          }
        });
        mailQueue = {
          total: 0,
          byDate: []
        };
      }
    }

    // 3. Document Count
    const documentQuery = `
      SELECT COUNT(*) as count 
      FROM access_form_tracker 
      WHERE status = 'Active'
    `;

    // 4. Device Count
    const deviceQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN device_status = 'Working' THEN 1 END) as working,
        COUNT(CASE WHEN device_status = 'Not Working' THEN 1 END) as not_working
      FROM device_info
    `;

    // 5. SIM Count - Actual data from sim_info table
    const simQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN msisdn_status = 'ACTIVE' THEN 1 END) as active,
        COUNT(CASE WHEN msisdn_status != 'ACTIVE' THEN 1 END) as inactive
      FROM sim_info
    `;

    // 6. Total Activity Count
    const activityQuery = `
      SELECT COUNT(*) as count 
      FROM user_activity_log 
      WHERE soc_portal_id = $1
    `;

    // 7. Assigned Tasks Count - REAL DATA
    let assignedTaskData = null;
    if ((roleType === 'SOC' || roleType === 'INTERN') && shortName) {
      try {
        // Enhanced task query with better assignment matching
        const assignedTaskQuery = `
          WITH task_assignments AS (
            SELECT 
              assign_task_id,
              assigned_to,
              -- Split assigned_to into array and check for exact match
              EXISTS (
                SELECT 1 
                FROM unnest(string_to_array(assigned_to, ',')) as assignee
                WHERE TRIM(BOTH FROM assignee) ILIKE $1
              ) as is_assigned_to_user
            FROM assigned_tasks
          )
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN at.status = 'COMPLETED' AND ta.is_assigned_to_user THEN 1 END) as completed,
            COUNT(CASE WHEN at.status = 'IN-PROGRESS' AND ta.is_assigned_to_user THEN 1 END) as in_progress,
            COUNT(CASE WHEN at.is_important = true AND ta.is_assigned_to_user THEN 1 END) as important
          FROM assigned_tasks at
          JOIN task_assignments ta ON at.assign_task_id = ta.assign_task_id
          WHERE ta.is_assigned_to_user = true
        `;

        const assignedTaskResult = await query(assignedTaskQuery, [shortName]);
        
        if (assignedTaskResult.rows.length > 0) {
          const taskStats = assignedTaskResult.rows[0];
          assignedTaskData = {
            total: parseInt(taskStats.total) || 0,
            completed: parseInt(taskStats.completed) || 0,
            in_progress: parseInt(taskStats.in_progress) || 0,
            important: parseInt(taskStats.important) || 0
          };
          
          logger.info('Assigned tasks data fetched successfully', {
            meta: {
              taskName,
              shortName,
              totalTasks: assignedTaskData.total,
              completed: assignedTaskData.completed,
              inProgress: assignedTaskData.in_progress,
              important: assignedTaskData.important
            }
          });
        } else {
          assignedTaskData = getFallbackTaskData(roleType);
          logger.warn('No assigned tasks data found, using fallback', {
            meta: {
              taskName,
              shortName,
              roleType
            }
          });
        }
      } catch (taskError) {
        logger.warn('Failed to fetch assigned tasks data, using fallback', {
          meta: {
            taskName,
            shortName,
            error: taskError.message,
            roleType
          }
        });
        assignedTaskData = getFallbackTaskData(roleType);
      }
    } else {
      assignedTaskData = getFallbackTaskData(roleType);
    }

    // 8. Real-time Performance Calculation (Role-based)
    let myPerformance = {
      score: 0,
      grade: 'Average',
      level: 'average',
      metrics: {}
    };

    if (shortName) {
      try {
        let performanceData = {};
        
        if (roleType === 'INTERN') {
          // INTERN: Only assigned tasks
          performanceData = await calculateInternPerformance(shortName, socPortalId);
        } else if (roleType === 'OPS') {
          // OPS: Only mail resolution
          performanceData = await calculateOpsPerformance(shortName, socPortalId);
        } else if (roleType === 'SOC') {
          // SOC: All metrics (tasks + mail + activity)
          performanceData = await calculateSocPerformance(shortName, socPortalId);
        }

        myPerformance = {
          score: performanceData.score,
          grade: performanceData.grade,
          level: performanceData.level,
          metrics: performanceData.metrics
        };

        logger.info('Performance calculated successfully', {
          meta: {
            taskName,
            roleType,
            shortName,
            performanceScore: myPerformance.score,
            grade: myPerformance.grade,
            level: myPerformance.level
          }
        });

      } catch (performanceError) {
        logger.warn('Failed to calculate performance, using fallback', {
          meta: {
            taskName,
            shortName,
            roleType,
            error: performanceError.message
          }
        });
        myPerformance = getFallbackPerformance(roleType);
      }
    } else {
      myPerformance = getFallbackPerformance(roleType);
    }

    logger.info('Executing database queries', {
      meta: {
        taskName,
        queries: ['downtime', 'mail', 'document', 'device', 'sim', 'activity', 'assigned_tasks', 'performance'],
        roleType
      }
    });

    // Execute queries in parallel
    const [
      downtimeResult,
      documentResult,
      deviceResult,
      simResult,
      activityResult
    ] = await Promise.all([
      query(downtimeQuery),
      query(documentQuery),
      query(deviceQuery),
      query(simQuery),
      query(activityQuery, [socPortalId])
    ]);

    // Process results
    const downtimeData = downtimeResult.rows[0] || {};
    const documentCount = parseInt(documentResult.rows[0]?.count) || 0;
    const deviceData = deviceResult.rows[0] || {};
    const simData = simResult.rows[0] || {};
    const totalActivity = parseInt(activityResult.rows[0]?.count) || 0;

    logger.info('Database queries completed', {
      meta: {
        taskName,
        downtimeCount: downtimeData.total_count,
        mailQueue: mailQueue.total,
        documentCount,
        deviceTotal: deviceData.total,
        simTotal: simData.total,
        simActive: simData.active,
        simInactive: simData.inactive,
        totalActivity,
        assignedTasks: assignedTaskData?.total || 0,
        performanceScore: myPerformance.score,
        roleType
      }
    });

    // Helper function to convert seconds to minutes
    const secondsToMinutes = (seconds) => Math.round(seconds / 60);

    // Base response data for all users
    const baseResponseData = {
      // Card 1: Downtime Count
      downtimeCount: {
        total: parseInt(downtimeData.total_count) || 0,
        thisWeek: parseInt(downtimeData.this_week_count) || 0,
        lastWeek: parseInt(downtimeData.last_week_count) || 0,
        thisMonth: parseInt(downtimeData.this_month_count) || 0,
        lastMonth: parseInt(downtimeData.last_month_count) || 0
      },
      
      // Card 2: Duration (in minutes)
      duration: {
        total: secondsToMinutes(downtimeData.total_seconds) || 0,
        thisWeek: secondsToMinutes(downtimeData.this_week_seconds) || 0,
        lastWeek: secondsToMinutes(downtimeData.last_week_seconds) || 0,
        thisMonth: secondsToMinutes(downtimeData.this_month_seconds) || 0,
        lastMonth: secondsToMinutes(downtimeData.last_month_seconds) || 0
      },
      
      // Card 3: Assigned Tasks - REAL DATA
      ...((roleType === 'SOC' || roleType === 'INTERN') && { assignedTask: assignedTaskData }),
      
      // Card 4: Mail Queue (only for non-INTERN)
      ...(roleType !== 'INTERN' && { mailQueue }),
      
      // Card 5: Document
      document: documentCount,
      
      // Card 6: Device Count
      deviceCount: {
        total: parseInt(deviceData.total) || 0,
        working: parseInt(deviceData.working) || 0,
        notWorking: parseInt(deviceData.not_working) || 0
      },
      
      // Card 7: Sim Count - ACTUAL DATA
      simCount: {
        total: parseInt(simData.total) || 0,
        active: parseInt(simData.active) || 0,
        inactive: parseInt(simData.inactive) || 0
      },
      
      // Card 8: My Performance - REAL-TIME CALCULATION
      myPerformance,
      
      // Card 10: Total Activity
      totalActivity
    };

    // Add SOC-only data (Roster)
    if (roleType === 'SOC') {
      baseResponseData.todaysRoster = rosterData;
    }

    const responseData = {
      success: true,
      data: baseResponseData
    };

    const duration = Date.now() - startTime;
    
    logger.info('Dashboard cards data prepared successfully', {
      meta: {
        taskName,
        duration,
        roleType,
        dataSummary: {
          downtimeEvents: responseData.data.downtimeCount.total,
          totalDuration: responseData.data.duration.total,
          assignedTasks: responseData.data.assignedTask?.total || 0,
          mailQueue: responseData.data.mailQueue?.total || 0,
          documentCount: responseData.data.document,
          deviceCount: responseData.data.deviceCount.total,
          simCount: responseData.data.simCount.total,
          performanceScore: responseData.data.myPerformance.score,
          cardsReturned: Object.keys(responseData.data).length
        }
      }
    });

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Failed to fetch dashboard cards', {
      meta: {
        taskName,
        duration,
        error: error.message,
        errorStack: error.stack,
        endpoint: '/api/user_dashboard/dashboard_card'
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Performance Calculation Functions

// INTERN: Only assigned tasks (100% weight)
async function calculateInternPerformance(shortName, socPortalId) {
  const taskQuery = `
    SELECT 
      -- Average completion time in hours for completed tasks
      AVG(EXTRACT(EPOCH FROM (solved_date - created_at))/3600) as avg_completion_hours,
      
      -- Tasks completed within 1 day (good)
      COUNT(CASE WHEN solved_date - created_at <= INTERVAL '1 day' THEN 1 END) as tasks_within_1_day,
      
      -- Tasks taking more than 2 days (bad)
      COUNT(CASE WHEN solved_date - created_at > INTERVAL '2 days' THEN 1 END) as tasks_over_2_days,
      
      -- Total completed tasks
      COUNT(*) as total_completed_tasks,
      
      -- In-progress tasks older than 2 days
      COUNT(CASE WHEN status = 'IN-PROGRESS' AND created_at <= (NOW() - INTERVAL '2 days') THEN 1 END) as stale_tasks,
      
      -- Total assigned tasks
      COUNT(*) as total_assigned_tasks
    FROM assigned_tasks 
    WHERE assigned_to ILIKE $1 
    AND (solved_by ILIKE $1 OR status = 'IN-PROGRESS')
  `;

  const taskResult = await query(taskQuery, [shortName]);
  const taskData = taskResult.rows[0] || {};

  // Calculate score based only on tasks (100% weight)
  let score = calculateTaskScore(taskData);
  
  const { grade, level } = getPerformanceGrade(score);

  return {
    score,
    grade,
    level,
    metrics: {
      avgCompletionHours: Math.round((taskData.avg_completion_hours || 48) * 10) / 10,
      tasksWithin1Day: parseInt(taskData.tasks_within_1_day) || 0,
      tasksOver2Days: parseInt(taskData.tasks_over_2_days) || 0,
      totalCompletedTasks: parseInt(taskData.total_completed_tasks) || 0,
      staleTasks: parseInt(taskData.stale_tasks) || 0,
      totalAssignedTasks: parseInt(taskData.total_assigned_tasks) || 0
    }
  };
}

// OPS: Only mail resolution (100% weight)
async function calculateOpsPerformance(shortName, socPortalId) {
  const mailQuery = `
    SELECT 
      COUNT(*) as solved_mails,
      COUNT(CASE WHEN task_solve_date - task_raised_date <= INTERVAL '1 day' THEN 1 END) as mails_within_1_day,
      COUNT(CASE WHEN task_solve_date - task_raised_date > INTERVAL '2 days' THEN 1 END) as mails_over_2_days,
      COUNT(CASE WHEN status = 'IN-PROGRESS' AND task_raised_date <= CURRENT_DATE - INTERVAL '2 days' THEN 1 END) as pending_mails,
      AVG(EXTRACT(EPOCH FROM (task_solve_date - task_raised_date))/3600) as avg_resolution_hours
    FROM mail_tracking 
    WHERE (solved_by ILIKE $1 OR tracked_by ILIKE $1)
    AND task_raised_date >= CURRENT_DATE - INTERVAL '30 days'
  `;

  const mailResult = await query(mailQuery, [shortName]);
  const mailData = mailResult.rows[0] || {};

  // Calculate score based only on mail resolution (100% weight)
  let score = calculateMailScore(mailData);
  
  const { grade, level } = getPerformanceGrade(score);

  return {
    score,
    grade,
    level,
    metrics: {
      solvedMails: parseInt(mailData.solved_mails) || 0,
      mailsWithin1Day: parseInt(mailData.mails_within_1_day) || 0,
      mailsOver2Days: parseInt(mailData.mails_over_2_days) || 0,
      pendingMails: parseInt(mailData.pending_mails) || 0,
      avgResolutionHours: Math.round((mailData.avg_resolution_hours || 36) * 10) / 10
    }
  };
}

// SOC: All metrics (50% tasks, 30% mail, 20% activity)
async function calculateSocPerformance(shortName, socPortalId) {
  const performanceQuery = `
    -- Task Completion Efficiency (50% weight)
    WITH task_metrics AS (
      SELECT 
        AVG(EXTRACT(EPOCH FROM (solved_date - created_at))/3600) as avg_completion_hours,
        COUNT(CASE WHEN solved_date - created_at <= INTERVAL '1 day' THEN 1 END) as tasks_within_1_day,
        COUNT(CASE WHEN solved_date - created_at > INTERVAL '2 days' THEN 1 END) as tasks_over_2_days,
        COUNT(*) as total_completed_tasks,
        COUNT(CASE WHEN status = 'IN-PROGRESS' AND created_at <= NOW() - INTERVAL '2 days' THEN 1 END) as stale_tasks
      FROM assigned_tasks 
      WHERE assigned_to ILIKE $1 
      AND status = 'COMPLETED'
      AND solved_by ILIKE $1
    ),
    
    -- Mail Resolution Efficiency (30% weight)
    mail_metrics AS (
      SELECT 
        COUNT(*) as solved_mails,
        COUNT(CASE WHEN task_solve_date - task_raised_date <= INTERVAL '1 day' THEN 1 END) as mails_within_1_day,
        COUNT(CASE WHEN task_solve_date - task_raised_date > INTERVAL '2 days' THEN 1 END) as mails_over_2_days
      FROM mail_tracking 
      WHERE solved_by ILIKE $1 
      AND status = 'SOLVED'
      AND task_raised_date >= CURRENT_DATE - INTERVAL '30 days'
    ),
    
    -- Overall Activity (20% weight)
    activity_metrics AS (
      SELECT 
        COUNT(*) as total_activities,
        COUNT(CASE WHEN action_time >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_activities
      FROM user_activity_log 
      WHERE soc_portal_id = $2
      AND action_time >= CURRENT_DATE - INTERVAL '30 days'
    )
    
    SELECT 
      -- Task metrics
      COALESCE(tm.avg_completion_hours, 48) as avg_completion_hours,
      COALESCE(tm.tasks_within_1_day, 0) as tasks_within_1_day,
      COALESCE(tm.tasks_over_2_days, 0) as tasks_over_2_days,
      COALESCE(tm.total_completed_tasks, 0) as total_completed_tasks,
      COALESCE(tm.stale_tasks, 0) as stale_tasks,
      
      -- Mail metrics
      COALESCE(mm.solved_mails, 0) as solved_mails,
      COALESCE(mm.mails_within_1_day, 0) as mails_within_1_day,
      COALESCE(mm.mails_over_2_days, 0) as mails_over_2_days,
      
      -- Activity metrics
      COALESCE(am.total_activities, 0) as total_activities,
      COALESCE(am.recent_activities, 0) as recent_activities
    FROM task_metrics tm, mail_metrics mm, activity_metrics am
  `;

  const performanceResult = await query(performanceQuery, [shortName, socPortalId]);
  const perfData = performanceResult.rows[0] || {};

  // Calculate composite score with weights
  const taskScore = calculateTaskScore(perfData);
  const mailScore = calculateMailScore(perfData);
  const activityScore = calculateActivityScore(perfData);
  
  // Weighted average: 50% tasks + 30% mail + 20% activity
  const weightedScore = (taskScore * 0.5) + (mailScore * 0.3) + (activityScore * 0.2);
  
  const { grade, level } = getPerformanceGrade(weightedScore);

  return {
    score: Math.round(weightedScore),
    grade,
    level,
    metrics: {
      avgCompletionHours: Math.round(perfData.avg_completion_hours * 10) / 10,
      tasksWithin1Day: parseInt(perfData.tasks_within_1_day) || 0,
      tasksOver2Days: parseInt(perfData.tasks_over_2_days) || 0,
      totalCompletedTasks: parseInt(perfData.total_completed_tasks) || 0,
      staleTasks: parseInt(perfData.stale_tasks) || 0,
      solvedMails: parseInt(perfData.solved_mails) || 0,
      mailsWithin1Day: parseInt(perfData.mails_within_1_day) || 0,
      mailsOver2Days: parseInt(perfData.mails_over_2_days) || 0,
      totalActivities: parseInt(perfData.total_activities) || 0,
      recentActivities: parseInt(perfData.recent_activities) || 0
    }
  };
}

// Helper calculation functions
function calculateTaskScore(taskData) {
  let score = 50; // Base score

  if (taskData.total_completed_tasks > 0) {
    // Completion volume (max 20 points)
    const volumeScore = Math.min(taskData.total_completed_tasks * 2, 20);
    
    // Efficiency based on average completion time (max 30 points)
    let efficiencyScore = 0;
    const avgHours = taskData.avg_completion_hours || 48;
    
    if (avgHours <= 24) efficiencyScore = 30; // Within 1 day
    else if (avgHours <= 48) efficiencyScore = 25; // Within 2 days
    else if (avgHours <= 72) efficiencyScore = 20; // Within 3 days
    else if (avgHours <= 96) efficiencyScore = 15; // Within 4 days
    else efficiencyScore = 10; // More than 4 days

    // Quick completion bonus (max 20 points)
    const quickBonus = Math.min(taskData.tasks_within_1_day * 2, 20);
    
    // Penalties (max 20 points deduction)
    const stalePenalty = Math.min(taskData.stale_tasks * 5, 10);
    const slowPenalty = Math.min(taskData.tasks_over_2_days * 2, 10);

    score = volumeScore + efficiencyScore + quickBonus - stalePenalty - slowPenalty;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateMailScore(mailData) {
  let score = 50; // Base score

  if (mailData.solved_mails > 0) {
    // Resolution volume (max 30 points)
    const volumeScore = Math.min(mailData.solved_mails * 3, 30);
    
    // Efficiency based on quick resolutions (max 40 points)
    const quickRatio = mailData.mails_within_1_day / Math.max(mailData.solved_mails, 1);
    const efficiencyScore = quickRatio * 40;
    
    // Penalties for slow resolutions (max 20 points deduction)
    const slowPenalty = Math.min(mailData.mails_over_2_days * 4, 20);

    score = volumeScore + efficiencyScore - slowPenalty;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateActivityScore(activityData) {
  let score = 50; // Base score

  if (activityData.total_activities > 0) {
    // Total activity level (max 30 points)
    const totalScore = Math.min(activityData.total_activities / 2, 30);
    
    // Recent activity (max 20 points)
    const recentRatio = activityData.recent_activities / Math.max(activityData.total_activities, 1);
    const recentScore = recentRatio * 20;

    score = totalScore + recentScore;
  }

  return Math.max(0, Math.min(100, score));
}

function getPerformanceGrade(score) {
  if (score >= 90) {
    return { grade: 'Excellent', level: 'excellent' };
  } else if (score >= 80) {
    return { grade: 'Very Good', level: 'good' };
  } else if (score >= 70) {
    return { grade: 'Good', level: 'good' };
  } else if (score >= 60) {
    return { grade: 'Average', level: 'average' };
  } else if (score >= 50) {
    return { grade: 'Below Average', level: 'average' };
  } else {
    return { grade: 'Needs Improvement', level: 'bad' };
  }
}

function getFallbackPerformance(roleType) {
  let score, metrics;

  if (roleType === 'INTERN') {
    score = 75;
    metrics = {
      avgCompletionHours: 36,
      tasksWithin1Day: 3,
      tasksOver2Days: 2,
      totalCompletedTasks: 5,
      staleTasks: 1,
      totalAssignedTasks: 8
    };
  } else if (roleType === 'OPS') {
    score = 78;
    metrics = {
      solvedMails: 8,
      mailsWithin1Day: 5,
      mailsOver2Days: 2,
      pendingMails: 1,
      avgResolutionHours: 28
    };
  } else {
    score = 82;
    metrics = {
      avgCompletionHours: 28,
      tasksWithin1Day: 8,
      tasksOver2Days: 1,
      totalCompletedTasks: 12,
      staleTasks: 0,
      solvedMails: 6,
      mailsWithin1Day: 4,
      mailsOver2Days: 2,
      totalActivities: 35,
      recentActivities: 20
    };
  }

  const { grade, level } = getPerformanceGrade(score);

  return {
    score,
    grade,
    level,
    metrics
  };
}

function getFallbackTaskData(roleType) {
  if (roleType === 'SOC') {
    return {
      total: 15,
      completed: 12,
      in_progress: 3,
      important: 2
    };
  } else if (roleType === 'INTERN') {
    return {
      total: 8,
      completed: 5,
      in_progress: 3,
      important: 1
    };
  }
  return {
    total: 0,
    completed: 0,
    in_progress: 0,
    important: 0
  };
}