// app/api/user_dashboard/downtime_log/route.js
import { query } from '../../../../lib/db';
import logger from '../../../../lib/logger';

// Helper to calculate time ranges
const getTimeRange = (range) => {
  const now = new Date();
  let start = new Date();
  let end = new Date();
  
  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisWeek':
      // Start of week (Sunday)
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      // End of week (Saturday)
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'lastWeek':
      // Start of last week (Sunday)
      start.setDate(now.getDate() - now.getDay() - 7);
      start.setHours(0, 0, 0, 0);
      // End of last week (Saturday)
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last7days':
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last30days':
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisYear':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      return { start: null, end: null };
  }
  
  return { start, end };
};

// Helper to format duration
const formatDuration = (duration) => {
  if (!duration) return 'N/A';
  
  try {
    // Handle PostgreSQL interval format
    if (typeof duration === 'object') {
      const hours = duration.hours || 0;
      const minutes = duration.minutes || 0;
      const seconds = duration.seconds || 0;
      if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
      return minutes > 0 ? `${minutes}m ${seconds}s` : '<1m';
    }
    
    // Handle string format (e.g., "01:30:00")
    if (typeof duration === 'string') {
      const parts = duration.split(':');
      if (parts.length === 3) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseInt(parts[2], 10);
        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
        return minutes > 0 ? `${minutes}m ${seconds}s` : '<1m';
      }
    }
    
    return duration;
  } catch (error) {
    logger.warn('Duration formatting failed', {
      meta: {
        taskName: 'FormatDuration',
        duration,
        error: error.message
      }
    });
    return duration || 'N/A';
  }
};

// Helper to format date (no timezone conversion)
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      logger.warn('Invalid date format', {
        meta: {
          taskName: 'FormatDateTime',
          dateString
        }
      });
      return dateString;
    }
    
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  } catch (error) {
    logger.warn('Date formatting failed', {
      meta: {
        taskName: 'FormatDateTime',
        dateString,
        error: error.message
      }
    });
    return dateString;
  }
};

export async function GET(request) {
  const startTime = Date.now();
  
  try {
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const impactType = searchParams.get('impactType') || '';
    const modality = searchParams.get('modality') || '';
    const reliability = searchParams.get('reliability') || '';
    const channel = searchParams.get('channel') || '';
    const affectedMNO = searchParams.get('affectedMNO') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const timeRange = searchParams.get('timeRange') || '';
    const sortBy = searchParams.get('sortBy') || 'start_date_time';
    const sortOrder = searchParams.get('sortOrder') || 'DESC';
    const page = parseInt(searchParams.get('page') || 1);
    const limit = parseInt(searchParams.get('limit') || 12);
    const offset = (page - 1) * limit;
    const downtimeId = searchParams.get('downtimeId') || '';

    logger.info('Downtime log request received', {
      meta: {
        taskName: 'DowntimeLogRequest',
        filters: { search, category, impactType, modality, reliability, channel, affectedMNO, timeRange },
        pagination: { page, limit, offset },
        sort: { sortBy, sortOrder },
        downtimeId
      }
    });

    // If downtimeId is provided, fetch all rows for that ID
    if (downtimeId) {
      logger.info('Fetching downtime by specific ID', {
        meta: {
          taskName: 'FetchDowntimeById',
          downtimeId
        }
      });

      const queryText = `
        SELECT 
          serial, 
          downtime_id, 
          TO_CHAR(issue_date, 'YYYY-MM-DD') as issue_date,
          issue_title, 
          category,
          affected_channel, 
          affected_persona, 
          affected_mno, 
          affected_portal, 
          affected_type, 
          affected_service,
          impact_type, 
          modality, 
          reliability_impacted,
          TO_CHAR(start_date_time, 'YYYY-MM-DD HH24:MI:SS') as start_date_time,
          TO_CHAR(end_date_time, 'YYYY-MM-DD HH24:MI:SS') as end_date_time,
          duration,
          concern, 
          reason, 
          resolution, 
          service_desk_ticket_id,
          system_unavailability, 
          tracked_by, 
          service_desk_ticket_link,
          remark, 
          TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
          TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
        FROM downtime_report_v2
        WHERE downtime_id = $1
        ORDER BY start_date_time DESC
      `;
      
      const dataResult = await query(queryText, [downtimeId]);
      
      logger.info('Downtime by ID fetched successfully', {
        meta: {
          taskName: 'FetchDowntimeById',
          downtimeId,
          recordCount: dataResult.rows.length
        }
      });
      
      const downtimes = dataResult.rows.map(record => ({
        ...record,
        formattedStart: formatDateTime(record.start_date_time),
        formattedEnd: formatDateTime(record.end_date_time),
        rawStart: record.start_date_time,
        rawEnd: record.end_date_time,
        formattedDuration: formatDuration(record.duration),
        created_at: formatDateTime(record.created_at),
        updated_at: formatDateTime(record.updated_at)
      }));

      return new Response(JSON.stringify({
        success: true,
        downtimes,
        total: downtimes.length,
        summary: null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate sort columns
    const validSortColumns = [
      'downtime_id', 'issue_title', 'category', 'start_date_time', 
      'end_date_time', 'duration', 'impact_type', 'modality', 
      'reliability_impacted', 'issue_date', 'created_at'
    ];
    
    const safeSortBy = validSortColumns.includes(sortBy) 
      ? sortBy : 'start_date_time';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Build query
    let whereConditions = [];
    let queryParams = [];
    
    // Search filter
    if (search) {
      whereConditions.push(
        `(issue_title ILIKE $${queryParams.length + 1} 
        OR category ILIKE $${queryParams.length + 1} 
        OR downtime_id ILIKE $${queryParams.length + 1})`
      );
      queryParams.push(`%${search}%`);
    }
    
    // Category filter
    if (category) {
      whereConditions.push(`category = $${queryParams.length + 1}`);
      queryParams.push(category);
    }
    
    // Impact Type filter
    if (impactType) {
      whereConditions.push(`impact_type = $${queryParams.length + 1}`);
      queryParams.push(impactType);
    }
    
    // Modality filter
    if (modality) {
      whereConditions.push(`modality = $${queryParams.length + 1}`);
      queryParams.push(modality);
    }
    
    // Reliability filter
    if (reliability) {
      whereConditions.push(`reliability_impacted = $${queryParams.length + 1}`);
      queryParams.push(reliability);
    }
    
    // Channel filter - handle comma-separated values
    if (channel) {
      whereConditions.push(`(
        affected_channel = $${queryParams.length + 1} 
        OR affected_channel ILIKE $${queryParams.length + 1} || ',%'
        OR affected_channel ILIKE '%,' || $${queryParams.length + 1} || ',%'
        OR affected_channel ILIKE '%,' || $${queryParams.length + 1}
        OR affected_channel ILIKE '%' || $${queryParams.length + 1} || '%'
      )`);
      queryParams.push(channel);
    }
    
    // MNO filter - handle comma-separated values
    if (affectedMNO) {
      whereConditions.push(`(
        affected_mno = $${queryParams.length + 1} 
        OR affected_mno ILIKE $${queryParams.length + 1} || ',%'
        OR affected_mno ILIKE '%,' || $${queryParams.length + 1} || ',%'
        OR affected_mno ILIKE '%,' || $${queryParams.length + 1}
        OR affected_mno ILIKE '%' || $${queryParams.length + 1} || '%'
      )`);
      queryParams.push(affectedMNO);
    }
    
    // Time range handling
    if (timeRange && timeRange !== '') {
      const { start, end } = getTimeRange(timeRange);
      
      if (start && end) {
        whereConditions.push(
          `start_date_time >= $${queryParams.length + 1} 
          AND start_date_time <= $${queryParams.length + 2}`
        );
        queryParams.push(start.toISOString());
        queryParams.push(end.toISOString());
        
        logger.info('Time range filter applied', {
          meta: {
            taskName: 'TimeRangeFilter',
            timeRange,
            startDate: start.toISOString(),
            endDate: end.toISOString()
          }
        });
      }
    }
    
    // Custom date range
    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      // Set end date to end of the day
      endDateObj.setHours(23, 59, 59, 999);
      
      whereConditions.push(
        `start_date_time >= $${queryParams.length + 1} 
        AND start_date_time <= $${queryParams.length + 2}`
      );
      queryParams.push(startDateObj.toISOString());
      queryParams.push(endDateObj.toISOString());
      
      logger.info('Custom date range filter applied', {
        meta: {
          taskName: 'CustomDateRangeFilter',
          startDate: startDateObj.toISOString(),
          endDate: endDateObj.toISOString()
        }
      });
    }
    
    const whereClause = whereConditions.length 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    logger.info('Query conditions built', {
      meta: {
        taskName: 'BuildQuery',
        whereClause,
        paramCount: queryParams.length
      }
    });

    // Main data query
    const dataQuery = `
      SELECT 
        serial, 
        downtime_id, 
        TO_CHAR(issue_date, 'YYYY-MM-DD') as issue_date,
        issue_title, 
        category,
        affected_channel, 
        affected_persona, 
        affected_mno, 
        affected_portal, 
        affected_type, 
        affected_service,
        impact_type, 
        modality, 
        reliability_impacted,
        TO_CHAR(start_date_time, 'YYYY-MM-DD HH24:MI:SS') as start_date_time,
        TO_CHAR(end_date_time, 'YYYY-MM-DD HH24:MI:SS') as end_date_time,
        duration,
        concern, 
        reason, 
        resolution, 
        service_desk_ticket_id,
        system_unavailability, 
        tracked_by, 
        service_desk_ticket_link,
        remark, 
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
      FROM downtime_report_v2
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT $${queryParams.length + 1}
      OFFSET $${queryParams.length + 2}
    `;
    
    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM downtime_report_v2
      ${whereClause}
    `;

    // Enhanced summary query with proper channel counting
    const summaryQuery = `
      WITH date_ranges AS (
        SELECT 
          -- Current week (Sunday to Saturday)
          (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::integer) as current_week_start,
          (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::integer + 6) + INTERVAL '23 hours 59 minutes 59 seconds' as current_week_end,
          
          -- Previous week (Sunday to Saturday)
          (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::integer - 7) as previous_week_start,
          (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::integer - 1) + INTERVAL '23 hours 59 minutes 59 seconds' as previous_week_end,
          
          -- Current month
          date_trunc('month', CURRENT_DATE) as current_month_start,
          date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 second' as current_month_end
      ),
      downtime_max_duration AS (
        SELECT 
          downtime_id, 
          MAX(EXTRACT(EPOCH FROM duration)) as max_duration_seconds,
          MIN(start_date_time) as first_start_time
        FROM downtime_report_v2
        ${whereClause}
        GROUP BY downtime_id
      ),
      channel_breakdown AS (
        SELECT 
          TRIM(UNNEST(string_to_array(affected_channel, ','))) as channel,
          downtime_id
        FROM downtime_report_v2
        ${whereClause}
      )
      SELECT 
        -- Total unique downtimes
        (SELECT COUNT(DISTINCT downtime_id) FROM downtime_report_v2 ${whereClause}) as total_downtimes,
        
        -- This week downtime count
        (SELECT COUNT(DISTINCT d.downtime_id) 
         FROM downtime_report_v2 d, date_ranges dr
         WHERE d.start_date_time >= dr.current_week_start 
         AND d.start_date_time <= dr.current_week_end
         ${whereClause.replace('WHERE', 'AND')}) as this_week_count,
        
        -- Last week downtime count
        (SELECT COUNT(DISTINCT d.downtime_id) 
         FROM downtime_report_v2 d, date_ranges dr
         WHERE d.start_date_time >= dr.previous_week_start 
         AND d.start_date_time <= dr.previous_week_end
         ${whereClause.replace('WHERE', 'AND')}) as last_week_count,
        
        -- This month downtime count
        (SELECT COUNT(DISTINCT d.downtime_id) 
         FROM downtime_report_v2 d, date_ranges dr
         WHERE d.start_date_time >= dr.current_month_start 
         AND d.start_date_time <= dr.current_month_end
         ${whereClause.replace('WHERE', 'AND')}) as this_month_count,
        
        -- Total records
        (SELECT COUNT(*) FROM downtime_report_v2 ${whereClause}) as total_records,
        
        -- Current week duration
        (SELECT COALESCE(SUM(dmd.max_duration_seconds), 0)
         FROM downtime_max_duration dmd, date_ranges dr
         WHERE dmd.first_start_time >= dr.current_week_start 
         AND dmd.first_start_time <= dr.current_week_end) as current_week_seconds,
        
        -- Previous week duration
        (SELECT COALESCE(SUM(dmd.max_duration_seconds), 0)
         FROM downtime_max_duration dmd, date_ranges dr
         WHERE dmd.first_start_time >= dr.previous_week_start 
         AND dmd.first_start_time <= dr.previous_week_end) as previous_week_seconds,
        
        -- Current month duration
        (SELECT COALESCE(SUM(dmd.max_duration_seconds), 0)
         FROM downtime_max_duration dmd, date_ranges dr
         WHERE dmd.first_start_time >= dr.current_month_start 
         AND dmd.first_start_time <= dr.current_month_end) as current_month_seconds,
        
        -- Total duration (max per downtime_id)
        (SELECT COALESCE(SUM(max_duration_seconds), 0) 
         FROM downtime_max_duration) as total_seconds,
        
        -- Top channels with proper comma-separated handling
        (SELECT json_agg(row_to_json(t)) 
         FROM (
           SELECT channel, COUNT(DISTINCT downtime_id) as count
           FROM channel_breakdown
           WHERE channel IS NOT NULL AND channel != ''
           GROUP BY channel
           ORDER BY count DESC
           LIMIT 3
         ) t) as top_channels,
         
        -- Date ranges for display
        (SELECT current_week_start FROM date_ranges) as current_week_start,
        (SELECT current_week_end FROM date_ranges) as current_week_end,
        (SELECT previous_week_start FROM date_ranges) as previous_week_start,
        (SELECT previous_week_end FROM date_ranges) as previous_week_end,
        (SELECT current_month_start FROM date_ranges) as current_month_start,
        (SELECT current_month_end FROM date_ranges) as current_month_end
    `;
    
    // Execute queries
    logger.info('Executing database queries', {
      meta: {
        taskName: 'ExecuteQueries',
        queryTypes: ['data', 'count', 'summary']
      }
    });

    const [dataResult, countResult, summaryResult] = await Promise.all([
      query(dataQuery, [...queryParams, limit, offset]),
      query(countQuery, queryParams),
      query(summaryQuery, queryParams)
    ]);

    const summaryData = summaryResult.rows[0];
    
    logger.info('Database queries executed successfully', {
      meta: {
        taskName: 'QueriesCompleted',
        dataRows: dataResult.rows.length,
        totalCount: countResult.rows[0].total,
        summary: {
          totalDowntimes: summaryData.total_downtimes,
          thisWeekCount: summaryData.this_week_count,
          lastWeekCount: summaryData.last_week_count,
          thisMonthCount: summaryData.this_month_count,
          totalRecords: summaryData.total_records
        }
      }
    });
    
    // Helper to format seconds to duration
    const formatSecondsToDuration = (seconds) => {
      if (!seconds || seconds === 0) {
        return { formatted: '0h 0m', minutes: 0 };
      }
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return {
        formatted: `${hours}h ${minutes}m`,
        minutes: Math.floor(seconds / 60)
      };
    };

    // Format durations
    const totalDuration = formatSecondsToDuration(summaryData.total_seconds);
    const currentWeekDuration = formatSecondsToDuration(summaryData.current_week_seconds);
    const previousWeekDuration = formatSecondsToDuration(summaryData.previous_week_seconds);
    const currentMonthDuration = formatSecondsToDuration(summaryData.current_month_seconds);

    // Format date ranges
    const formatDateRange = (start, end) => {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const format = (date) => date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short'
      });
      return `${format(startDate)} - ${format(endDate)}`;
    };

    const currentWeekRange = formatDateRange(
      summaryData.current_week_start, 
      summaryData.current_week_end
    );
    const previousWeekRange = formatDateRange(
      summaryData.previous_week_start, 
      summaryData.previous_week_end
    );
    const currentMonthRange = formatDateRange(
      summaryData.current_month_start, 
      summaryData.current_month_end
    );
    
    // Format data for frontend
    const downtimes = dataResult.rows.map(record => ({
      ...record,
      formattedStart: formatDateTime(record.start_date_time),
      formattedEnd: formatDateTime(record.end_date_time),
      rawStart: record.start_date_time,
      rawEnd: record.end_date_time,
      formattedDuration: formatDuration(record.duration),
      created_at: formatDateTime(record.created_at),
      updated_at: formatDateTime(record.updated_at)
    }));

    const responseTime = Date.now() - startTime;

    logger.info('Downtime log request completed successfully', {
      meta: {
        taskName: 'RequestCompleted',
        responseTime: `${responseTime}ms`,
        recordsReturned: downtimes.length,
        totalRecords: countResult.rows[0].total,
        summary: {
          totalDowntimes: summaryData.total_downtimes,
          thisWeekCount: summaryData.this_week_count,
          lastWeekCount: summaryData.last_week_count,
          thisMonthCount: summaryData.this_month_count,
          totalDuration: totalDuration.formatted,
          currentWeekDuration: currentWeekDuration.formatted,
          previousWeekDuration: previousWeekDuration.formatted,
          currentMonthDuration: currentMonthDuration.formatted,
          topChannels: summaryData.top_channels || []
        }
      }
    });

    return new Response(JSON.stringify({
      success: true,
      downtimes,
      total: parseInt(countResult.rows[0].total),
      summary: {
        totalDowntimes: parseInt(summaryData.total_downtimes) || 0,
        thisWeekCount: parseInt(summaryData.this_week_count) || 0,
        lastWeekCount: parseInt(summaryData.last_week_count) || 0,
        thisMonthCount: parseInt(summaryData.this_month_count) || 0,
        totalRecords: parseInt(summaryData.total_records) || 0,
        totalDuration: totalDuration.formatted,
        totalDurationMinutes: totalDuration.minutes,
        currentWeekDuration: currentWeekDuration.formatted,
        currentWeekMinutes: currentWeekDuration.minutes,
        currentWeekRange: currentWeekRange,
        previousWeekDuration: previousWeekDuration.formatted,
        previousWeekMinutes: previousWeekDuration.minutes,
        previousWeekRange: previousWeekRange,
        currentMonthDuration: currentMonthDuration.formatted,
        currentMonthMinutes: currentMonthDuration.minutes,
        currentMonthRange: currentMonthRange,
        topChannels: summaryData.top_channels || []
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    const errorTime = Date.now() - startTime;
    
    logger.error('Failed to fetch downtime log', {
      meta: {
        taskName: 'DatabaseError',
        responseTime: `${errorTime}ms`,
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name
      }
    });
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch downtime log',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}