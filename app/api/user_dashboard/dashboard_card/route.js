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

    // Get user short_name for roster (ONLY for SOC users)
    let shortName = null;
    let todaysRoster = 'Not Available';
    
    if (roleType === 'SOC') {
      const userQuery = 'SELECT short_name FROM user_info WHERE soc_portal_id = $1';
      const userResult = await query(userQuery, [socPortalId]);
      shortName = userResult.rows[0]?.short_name;

      // Only fetch roster for SOC users with valid short_name
      if (shortName) {
        try {
          const rosterQuery = `
            SELECT ${shortName} as shift 
            FROM roster_schedule 
            WHERE date = CURRENT_DATE
          `;
          const rosterResult = await query(rosterQuery);
          todaysRoster = rosterResult.rows[0]?.shift || 'Not Assigned';
        } catch (rosterError) {
          logger.warn('Roster data not available for user', {
            meta: {
              taskName,
              shortName,
              error: rosterError.message
            }
          });
          todaysRoster = 'Not Available';
        }
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

    // 2. Mail Queue Count (only for non-INTERN users)
    let mailQueue = 0;
    if (roleType !== 'INTERN') {
      const mailQuery = `
        SELECT COUNT(*) as count 
        FROM mail_tracking 
        WHERE status = 'IN-PROGRESS' 
        AND assigned_team = $1
      `;
      const mailResult = await query(mailQuery, [roleType]);
      mailQueue = parseInt(mailResult.rows[0]?.count) || 0;
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

    // 5. Total Activity Count
    const activityQuery = `
      SELECT COUNT(*) as count 
      FROM user_activity_log 
      WHERE soc_portal_id = $1
    `;

    logger.info('Executing database queries', {
      meta: {
        taskName,
        queries: ['downtime', 'mail', 'document', 'device', 'activity'],
        roleType
      }
    });

    // Execute queries in parallel (except mail which is conditional)
    const [
      downtimeResult,
      documentResult,
      deviceResult,
      activityResult
    ] = await Promise.all([
      query(downtimeQuery),
      query(documentQuery),
      query(deviceQuery),
      query(activityQuery, [socPortalId])
    ]);

    // Process results
    const downtimeData = downtimeResult.rows[0] || {};
    const documentCount = parseInt(documentResult.rows[0]?.count) || 0;
    const deviceData = deviceResult.rows[0] || {};
    const totalActivity = parseInt(activityResult.rows[0]?.count) || 0;

    logger.info('Database queries completed', {
      meta: {
        taskName,
        downtimeCount: downtimeData.total_count,
        mailQueue,
        documentCount,
        deviceTotal: deviceData.total,
        totalActivity,
        roleType
      }
    });

    // Helper function to convert seconds to minutes
    const secondsToMinutes = (seconds) => Math.round(seconds / 60);

    // Demo data for other cards
    const assignedTask = {
      total: 15,
      solved: 12,
      pending: 3
    };

    const simCount = {
      active: 245,
      inactive: 12
    };

    const myPerformance = {
      score: roleType === 'INTERN' ? 85 : 92, // Slightly lower score for interns
      grade: roleType === 'INTERN' ? 'Good' : 'Excellent',
      level: roleType === 'INTERN' ? 'good' : 'excellent'
    };

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
      
      // Card 7: Sim Count (demo)
      simCount,
      
      // Card 8: My Performance (demo)
      myPerformance,
      
      // Card 10: Total Activity
      totalActivity
    };

    // Add SOC-only data
    if (roleType === 'SOC') {
      baseResponseData.assignedTask = assignedTask;
      baseResponseData.todaysRoster = todaysRoster;
    }

    // Add assigned tasks for INTERN users
    if (roleType === 'INTERN') {
      baseResponseData.assignedTask = {
        total: 8,
        solved: 5,
        pending: 3
      };
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
          mailQueue: responseData.data.mailQueue,
          documentCount: responseData.data.document,
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