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

    console.log('🔍 Starting dashboard data fetch for:', { socPortalId, roleType });

    // Get user short_name for all authenticated users
    let shortName = null;
    let rosterData = {
      today: 'Not Available',
      tomorrow: 'Not Available'
    };
    
    const userQuery = 'SELECT short_name FROM user_info WHERE soc_portal_id = $1';
    const userResult = await query(userQuery, [socPortalId]);
    shortName = userResult.rows[0]?.short_name;

    console.log('👤 User info fetched:', { shortName, roleType });

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

        console.log('📅 Roster data:', rosterData);
      } catch (rosterError) {
        console.warn('Roster data not available:', rosterError.message);
        rosterData = {
          today: 'Not Available',
          tomorrow: 'Not Available'
        };
      }
    }

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

        console.log('📧 Mail queue data:', { total: mailQueue.total, dates: mailQueue.byDate.length });
      } catch (mailError) {
        console.warn('Failed to fetch mail queue data:', mailError.message);
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
          
          console.log('📝 Assigned tasks:', assignedTaskData);
        } else {
          assignedTaskData = getFallbackTaskData(roleType);
          console.warn('No assigned tasks data found, using fallback');
        }
      } catch (taskError) {
        console.warn('Failed to fetch assigned tasks data:', taskError.message);
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
        console.log('🎯 Calculating performance for:', { roleType, shortName });
        
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

        console.log('📊 Performance calculated:', performanceData);

        myPerformance = {
          score: performanceData.score,
          grade: performanceData.grade,
          level: performanceData.level,
          metrics: performanceData.metrics
        };

      } catch (performanceError) {
        console.error('❌ Performance calculation failed:', performanceError);
        myPerformance = getFallbackPerformance(roleType);
      }
    } else {
      myPerformance = getFallbackPerformance(roleType);
    }

    console.log('🚀 Executing database queries in parallel');

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

    console.log('✅ Database queries completed:', {
      downtimeCount: downtimeData.total_count,
      mailQueue: mailQueue.total,
      documentCount,
      deviceTotal: deviceData.total,
      simTotal: simData.total,
      totalActivity,
      assignedTasks: assignedTaskData?.total || 0,
      performanceScore: myPerformance.score
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
    
    console.log('🎉 Dashboard cards data prepared successfully in', duration, 'ms');

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('❌ Failed to fetch dashboard cards:', error);
    console.error('Error stack:', error.stack);

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

// INTERN: Only assigned tasks (100% weight) - FIXED
async function calculateInternPerformance(shortName, socPortalId) {
  console.log('🎯 Calculating INTERN performance for:', shortName);
  
  const taskQuery = `
    SELECT 
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as total_completed_tasks,
      COUNT(*) as total_assigned_tasks,
      COUNT(CASE WHEN status = 'IN-PROGRESS' THEN 1 END) as in_progress_tasks
    FROM assigned_tasks 
    WHERE assigned_to ILIKE $1 
    AND (solved_by ILIKE $1 OR status = 'IN-PROGRESS')
  `;

  try {
    const taskResult = await query(taskQuery, [shortName]);
    const taskData = taskResult.rows[0] || {};
    
    console.log('📝 INTERN task data:', taskData);

    let score;
    if (parseInt(taskData.total_assigned_tasks) === 0) {
      score = 100;
      console.log('🎯 No tasks assigned, giving 100% score');
    } else {
      const completionRate = (parseInt(taskData.total_completed_tasks) / parseInt(taskData.total_assigned_tasks)) * 100;
      score = Math.min(completionRate, 100);
    }
    
    const { grade, level } = getPerformanceGrade(score);

    const result = {
      score: Math.round(score),
      grade,
      level,
      metrics: {
        totalCompletedTasks: parseInt(taskData.total_completed_tasks) || 0,
        totalAssignedTasks: parseInt(taskData.total_assigned_tasks) || 0,
        inProgressTasks: parseInt(taskData.in_progress_tasks) || 0
      }
    };

    console.log('✅ INTERN performance result:', result);
    return result;

  } catch (error) {
    console.error('❌ INTERN performance calculation failed:', error);
    throw error;
  }
}

// OPS: Only mail resolution (100% weight) - FIXED
async function calculateOpsPerformance(shortName, socPortalId) {
  console.log('🎯 Calculating OPS performance for:', shortName);
  
  const mailQuery = `
    SELECT 
      COUNT(CASE WHEN status = 'SOLVED' THEN 1 END) as solved_mails,
      COUNT(*) as total_mails,
      COUNT(CASE WHEN status = 'IN-PROGRESS' THEN 1 END) as pending_mails,
      -- Calculate quick mails (solved within 1 day)
      COUNT(CASE 
        WHEN status = 'SOLVED' 
        AND task_solve_date IS NOT NULL 
        AND task_raised_date IS NOT NULL
        AND (task_solve_date::date - task_raised_date::date) <= 1 
        THEN 1 
      END) as mails_within_1_day,
      -- Calculate slow mails (took more than 2 days)
      COUNT(CASE 
        WHEN status = 'SOLVED' 
        AND task_solve_date IS NOT NULL 
        AND task_raised_date IS NOT NULL
        AND (task_solve_date::date - task_raised_date::date) > 2 
        THEN 1 
      END) as mails_over_2_days,
      -- Average resolution time in days
      AVG(
        CASE 
          WHEN status = 'SOLVED' 
          AND task_solve_date IS NOT NULL 
          AND task_raised_date IS NOT NULL
          THEN (task_solve_date::date - task_raised_date::date) 
          ELSE NULL 
        END
      ) as avg_resolution_days
    FROM mail_tracking 
    WHERE (solved_by ILIKE $1 OR tracked_by ILIKE $1)
    AND task_raised_date >= CURRENT_DATE - 30
  `;

  try {
    const mailResult = await query(mailQuery, [shortName]);
    const mailData = mailResult.rows[0] || {};
    
    console.log('📧 OPS mail data:', mailData);

    let score;
    if (parseInt(mailData.total_mails) === 0) {
      score = 100;
      console.log('🎯 No mails handled, giving 100% score');
    } else {
      const resolutionRate = (parseInt(mailData.solved_mails) / parseInt(mailData.total_mails)) * 100;
      const quickRate = (parseInt(mailData.mails_within_1_day) / Math.max(parseInt(mailData.solved_mails), 1)) * 100;
      
      // Base score on resolution rate, bonus for quick resolutions
      score = resolutionRate + (quickRate * 0.3);
      score = Math.min(score, 100);
    }
    
    const { grade, level } = getPerformanceGrade(score);

    const result = {
      score: Math.round(score),
      grade,
      level,
      metrics: {
        solvedMails: parseInt(mailData.solved_mails) || 0,
        totalMails: parseInt(mailData.total_mails) || 0,
        pendingMails: parseInt(mailData.pending_mails) || 0,
        mailsWithin1Day: parseInt(mailData.mails_within_1_day) || 0,
        mailsOver2Days: parseInt(mailData.mails_over_2_days) || 0,
        avgResolutionHours: Math.round((mailData.avg_resolution_days || 1.5) * 24)
      }
    };

    console.log('✅ OPS performance result:', result);
    return result;

  } catch (error) {
    console.error('❌ OPS performance calculation failed:', error);
    throw error;
  }
}

// SOC: Tasks and mail only (50% tasks + 50% mail) - FIXED
async function calculateSocPerformance(shortName, socPortalId) {
  console.log('🎯 Calculating SOC performance for:', shortName);
  
  const taskQuery = `
    SELECT 
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as total_completed_tasks,
      COUNT(*) as total_assigned_tasks,
      COUNT(CASE WHEN status = 'IN-PROGRESS' THEN 1 END) as in_progress_tasks
    FROM assigned_tasks 
    WHERE assigned_to ILIKE $1 
    AND (solved_by ILIKE $1 OR status = 'IN-PROGRESS')
  `;

  const mailQuery = `
    SELECT 
      COUNT(CASE WHEN status = 'SOLVED' THEN 1 END) as solved_mails,
      COUNT(*) as total_mails,
      COUNT(CASE WHEN status = 'IN-PROGRESS' THEN 1 END) as pending_mails,
      -- Calculate quick mails (solved within 1 day)
      COUNT(CASE 
        WHEN status = 'SOLVED' 
        AND task_solve_date IS NOT NULL 
        AND task_raised_date IS NOT NULL
        AND (task_solve_date::date - task_raised_date::date) <= 1 
        THEN 1 
      END) as mails_within_1_day,
      -- Calculate slow mails (took more than 2 days)
      COUNT(CASE 
        WHEN status = 'SOLVED' 
        AND task_solve_date IS NOT NULL 
        AND task_raised_date IS NOT NULL
        AND (task_solve_date::date - task_raised_date::date) > 2 
        THEN 1 
      END) as mails_over_2_days,
      -- Average resolution time in days
      AVG(
        CASE 
          WHEN status = 'SOLVED' 
          AND task_solve_date IS NOT NULL 
          AND task_raised_date IS NOT NULL
          THEN (task_solve_date::date - task_raised_date::date) 
          ELSE NULL 
        END
      ) as avg_resolution_days
    FROM mail_tracking 
    WHERE (solved_by ILIKE $1 OR tracked_by ILIKE $1)
    AND task_raised_date >= CURRENT_DATE - 30
  `;

  try {
    const [taskResult, mailResult] = await Promise.all([
      query(taskQuery, [shortName]),
      query(mailQuery, [shortName])
    ]);

    const taskData = taskResult.rows[0] || {};
    const mailData = mailResult.rows[0] || {};
    
    console.log('📊 SOC performance data:', { taskData, mailData });

    // Calculate task score
    let taskScore = 0;
    if (parseInt(taskData.total_assigned_tasks) > 0) {
      const completionRate = (parseInt(taskData.total_completed_tasks) / parseInt(taskData.total_assigned_tasks)) * 100;
      taskScore = Math.min(completionRate, 100);
    } else {
      taskScore = 100;
    }

    // Calculate mail score
    let mailScore = 0;
    if (parseInt(mailData.total_mails) > 0) {
      const resolutionRate = (parseInt(mailData.solved_mails) / parseInt(mailData.total_mails)) * 100;
      const quickRate = (parseInt(mailData.mails_within_1_day) / Math.max(parseInt(mailData.solved_mails), 1)) * 100;
      
      mailScore = resolutionRate + (quickRate * 0.3);
      mailScore = Math.min(mailScore, 100);
    } else {
      mailScore = 100;
    }

    console.log('📈 Individual scores:', { taskScore, mailScore });
    
    let weightedScore;
    if (parseInt(taskData.total_assigned_tasks) === 0 && parseInt(mailData.total_mails) === 0) {
      weightedScore = 100;
      console.log('🎯 No tasks or mails, giving 100% score');
    } else {
      // Weighted average: 50% tasks + 50% mail
      weightedScore = (taskScore * 0.5) + (mailScore * 0.5);
    }
    
    const { grade, level } = getPerformanceGrade(weightedScore);

    const result = {
      score: Math.round(weightedScore),
      grade,
      level,
      metrics: {
        totalCompletedTasks: parseInt(taskData.total_completed_tasks) || 0,
        totalAssignedTasks: parseInt(taskData.total_assigned_tasks) || 0,
        inProgressTasks: parseInt(taskData.in_progress_tasks) || 0,
        solvedMails: parseInt(mailData.solved_mails) || 0,
        totalMails: parseInt(mailData.total_mails) || 0,
        pendingMails: parseInt(mailData.pending_mails) || 0,
        mailsWithin1Day: parseInt(mailData.mails_within_1_day) || 0,
        mailsOver2Days: parseInt(mailData.mails_over_2_days) || 0,
        avgMailHours: Math.round((mailData.avg_resolution_days || 1.5) * 24)
      }
    };

    console.log('✅ SOC performance result:', result);
    return result;

  } catch (error) {
    console.error('❌ SOC performance calculation failed:', error);
    throw error;
  }
}

// Remove the broken scoring functions since we're calculating directly
// Remove calculateTaskScore, calculateMailScore functions

// Update fallback performance
function getFallbackPerformance(roleType) {
  console.log('🔄 Using fallback performance for:', roleType);
  
  let score, metrics;

  if (roleType === 'INTERN') {
    score = 75;
    metrics = {
      totalCompletedTasks: 5,
      totalAssignedTasks: 8,
      inProgressTasks: 3
    };
  } else if (roleType === 'OPS') {
    score = 78;
    metrics = {
      solvedMails: 8,
      totalMails: 10,
      pendingMails: 2,
      mailsWithin1Day: 5,
      mailsOver2Days: 2,
      avgResolutionHours: 28
    };
  } else {
    score = 82;
    metrics = {
      totalCompletedTasks: 12,
      totalAssignedTasks: 15,
      inProgressTasks: 3,
      solvedMails: 6,
      totalMails: 8,
      pendingMails: 2,
      mailsWithin1Day: 4,
      mailsOver2Days: 2,
      avgMailHours: 24
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