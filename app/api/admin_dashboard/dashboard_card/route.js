// app/api/admin_dashboard/dashboard_card/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import logger from '../../../../lib/logger';

export async function GET() {
  const taskName = 'FetchDashboardData';
  const startTime = Date.now();
  
  try {
    logger.info('Starting dashboard data fetch', {
      taskName,
      details: 'Fetching user summary, downtime counts, asset counts, and roster data'
    });

    // Fetch user summary
    const userSummaryQuery = `
      SELECT 
        role_type,
        COUNT(*) as count
      FROM user_info 
      WHERE status = 'Active'
      GROUP BY role_type
    `;
    const userSummaryResult = await query(userSummaryQuery);
    
    const userSummary = {
      total: userSummaryResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
      roles: userSummaryResult.rows.reduce((acc, row) => {
        acc[row.role_type] = parseInt(row.count);
        return acc;
      }, {})
    };

    logger.info('User summary fetched successfully', {
      taskName,
      details: `Found ${userSummary.total} active users across ${Object.keys(userSummary.roles).length} roles`
    });

    // Fetch downtime counts
    const downtimeCountQuery = `
      SELECT
        COUNT(DISTINCT downtime_id) AS unique_downtime_count,
        SUM(CASE WHEN impact_type = 'PARTIAL' AND modality = 'UNPLANNED' THEN 1 ELSE 0 END) AS partial_unplanned_count,
        SUM(CASE WHEN impact_type = 'FULL' AND modality = 'UNPLANNED' THEN 1 ELSE 0 END) AS full_unplanned_count,
        SUM(CASE WHEN impact_type = 'PARTIAL' AND modality = 'PLANNED' THEN 1 ELSE 0 END) AS partial_planned_count,
        SUM(CASE WHEN impact_type = 'FULL' AND modality = 'PLANNED' THEN 1 ELSE 0 END) AS full_planned_count
      FROM (
        SELECT DISTINCT downtime_id, impact_type, modality
        FROM downtime_report_v2
      ) AS distinct_downtimes
    `;
    const downtimeCountResult = await query(downtimeCountQuery);
    const downtimeCounts = downtimeCountResult.rows[0];

    logger.info('Downtime counts fetched successfully', {
      taskName,
      details: `Found ${downtimeCounts.unique_downtime_count} unique downtime incidents`
    });

    // Fetch total downtime duration
    const downtimeDurationQuery = `
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
          duration_seconds
        FROM ranked_downtimes
        WHERE rn = 1
      ),
      total AS (
        SELECT COALESCE(SUM(duration_seconds), 0) AS total_seconds
        FROM distinct_downtimes
      )
      SELECT
        total_seconds,
        FLOOR(total_seconds / 3600) AS hours,
        FLOOR((total_seconds::BIGINT % 3600) / 60) AS minutes
      FROM total
    `;
    const downtimeDurationResult = await query(downtimeDurationQuery);
    const downtimeDuration = downtimeDurationResult.rows[0];

    // Fetch asset counts
    const deviceCountQuery = 'SELECT COUNT(*) as count FROM device_info';
    const simCountQuery = 'SELECT COUNT(*) as count FROM sim_info';
    
    const [deviceResult, simResult] = await Promise.all([
      query(deviceCountQuery),
      query(simCountQuery)
    ]);
    
    const assetCounts = {
      devices: parseInt(deviceResult.rows[0].count),
      sims: parseInt(simResult.rows[0].count)
    };

    logger.info('Asset counts fetched successfully', {
      taskName,
      details: `Found ${assetCounts.devices} devices and ${assetCounts.sims} SIM cards`
    });

    // FIXED: Roster data fetch with proper date handling
    // Get current date in Asia/Dhaka timezone
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Format dates as YYYY-MM-DD for PostgreSQL
    const formatDateForPostgres = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayFormatted = formatDateForPostgres(today);
    const tomorrowFormatted = formatDateForPostgres(tomorrow);

    logger.info('Fetching roster data', {
      taskName,
      details: `Looking for dates: Today=${todayFormatted}, Tomorrow=${tomorrowFormatted}`
    });

    // Query roster data - using date type comparison
    const rosterQuery = `
      SELECT * FROM roster_schedule 
      WHERE date = $1::date OR date = $2::date
      ORDER BY date
    `;
    
    const rosterResult = await query(rosterQuery, [todayFormatted, tomorrowFormatted]);
    
    logger.info('Roster query completed', {
      taskName,
      details: `Found ${rosterResult.rows.length} roster entries`
    });

    // Process roster results
    const rosters = {
      today: null,
      tomorrow: null
    };

    rosterResult.rows.forEach(row => {
      const rowDate = new Date(row.date);
      const rowDateFormatted = formatDateForPostgres(rowDate);
      
      if (rowDateFormatted === todayFormatted) {
        rosters.today = row;
      } else if (rowDateFormatted === tomorrowFormatted) {
        rosters.tomorrow = row;
      }
    });

    logger.info('Roster data processed', {
      taskName,
      details: `Today: ${rosters.today ? 'Found' : 'Not found'}, Tomorrow: ${rosters.tomorrow ? 'Found' : 'Not found'}`
    });

    // Log final results
    const duration = Date.now() - startTime;
    logger.info('Dashboard data fetch completed successfully', {
      taskName,
      details: `Completed in ${duration}ms. Users: ${userSummary.total}, Downtimes: ${downtimeCounts.unique_downtime_count}, Assets: ${assetCounts.devices + assetCounts.sims}`
    });

    return NextResponse.json({
      success: true,
      data: {
        userSummary,
        downtimeCounts,
        downtimeDuration,
        assetCounts,
        rosters
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error fetching dashboard data', {
      taskName,
      details: `Failed after ${duration}ms: ${error.message}`
    });

    console.error('Error fetching dashboard overview:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch dashboard data',
        error: error.message 
      },
      { status: 500 }
    );
  }
}