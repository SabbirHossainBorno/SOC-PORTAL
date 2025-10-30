// app/api/user_dashboard/downtime_chart/summary/route.js
import { query } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

// Helper function to calculate expected minutes for each range
const getExpectedMinutesForRange = (range) => {
  const now = new Date();
  switch (range) {
    case 'today':
      return 24 * 60; // 1440 minutes
    case 'thisWeek':
    case 'lastWeek':
    case 'last7days':
      return 7 * 24 * 60; // 10080 minutes
    case 'last30days':
      return 30 * 24 * 60; // 43200 minutes
    case 'thisMonth':
      const daysInThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return daysInThisMonth * 24 * 60;
    case 'lastMonth':
      const daysInLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      return daysInLastMonth * 24 * 60;
    case 'thisYear':
      const isLeapYear = (now.getFullYear() % 4 === 0 && (now.getFullYear() % 100 !== 0 || now.getFullYear() % 400 === 0));
      return (isLeapYear ? 366 : 365) * 24 * 60;
    default:
      return 0;
  }
};

const getTimeRange = (range) => {
  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisWeek':
      // Calculate Sunday to Saturday week (7 full days)
      const today = now.getDay(); // 0 = Sunday, 6 = Saturday
      const sunday = new Date(now);
      sunday.setDate(now.getDate() - today); // Go back to Sunday
      sunday.setHours(0, 0, 0, 0);
      
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6); // Go forward to Saturday
      saturday.setHours(23, 59, 59, 999);
      
      start = sunday;
      end = saturday;
      break;
    case 'lastWeek':
      // Calculate previous Sunday to Saturday (7 full days)
      const currentDay = now.getDay();
      const lastSunday = new Date(now);
      lastSunday.setDate(now.getDate() - currentDay - 7);
      lastSunday.setHours(0, 0, 0, 0);
      
      const lastSaturday = new Date(lastSunday);
      lastSaturday.setDate(lastSunday.getDate() + 6);
      lastSaturday.setHours(23, 59, 59, 999);
      
      start = lastSunday;
      end = lastSaturday;
      break;
    case 'last7days':
      // Last 7 full days (including today)
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last30days':
      // Last 30 full days (including today)
      start.setDate(now.getDate() - 29);
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
  
  logger.debug(`Calculated time range for ${range}`, {
    meta: {
      range,
      start: start.toISOString(),
      end: end.toISOString(),
    },
  });
  
  return { start, end };
};

const calculateTotalAvailableMinutes = (startDate, endDate, timeRange) => {
  // For predefined ranges, use exact calculations to ensure accuracy
  if (timeRange !== 'custom') {
    return getExpectedMinutesForRange(timeRange);
  }
  
  // For custom ranges, calculate based on actual dates
  const diffMs = endDate - startDate;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  console.log('Custom range minutes calculation:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    diffMs,
    diffMinutes
  });
  
  return diffMinutes;
};

export async function GET(request) {
  const startTime = Date.now();
  const taskName = 'DowntimeChart';
  const type = 'SUMMARY';
  
  try {
    const eid = request.cookies.get('eid')?.value || 'N/A';
    const sid = request.cookies.get('sessionId')?.value || 'N/A';

    logger.info(`Fetching ${type} downtime summary data`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        action: 'START'
      }
    });

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'thisWeek';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');
    
    let startDate, endDate;
    
    if (timeRange === 'custom') {
      if (!customStart || !customEnd) {
        const errorMsg = 'Custom date range requires both startDate and endDate';
        logger.warning(errorMsg, {
          meta: { eid, sid, taskName, type, timeRange, customStart, customEnd }
        });
        return new Response(JSON.stringify({
          success: false,
          message: errorMsg,
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      try {
        startDate = new Date(customStart);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
      } catch (error) {
        const errorMsg = `Invalid date format: startDate=${customStart}, endDate=${customEnd}`;
        logger.warning(errorMsg, {
          meta: { eid, sid, taskName, type, timeRange, customStart, customEnd, error: error.message }
        });
        return new Response(JSON.stringify({
          success: false,
          message: errorMsg,
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (endDate < startDate) {
        const errorMsg = 'End date cannot be before start date';
        logger.warning(errorMsg, {
          meta: { eid, sid, taskName, type, timeRange, customStart, customEnd }
        });
        return new Response(JSON.stringify({
          success: false,
          message: errorMsg,
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      const range = getTimeRange(timeRange);
      startDate = range.start;
      endDate = range.end;
    }
    
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      const errorMsg = `Invalid date range: ${timeRange} - start: ${startDate}, end: ${endDate}`;
      logger.warning(errorMsg, {
        meta: {
          eid,
          sid,
          taskName,
          type,
          timeRange,
          customStart,
          customEnd
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid date range',
        details: errorMsg
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();
    
    // Calculate total available minutes for the period
    const totalAvailableMinutes = calculateTotalAvailableMinutes(startDate, endDate, timeRange);
    const expectedMinutes = getExpectedMinutesForRange(timeRange);
    
    logger.debug(`Total available minutes calculation`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        startDateISO,
        endDateISO,
        totalAvailableMinutes,
        expectedMinutes,
        timeRange
      }
    });
    
    // Query for individual downtime events with their durations
    const queryStr = `
      WITH downtime_events AS (
        SELECT 
          downtime_id,
          CASE
            WHEN UPPER(modality) = 'PLANNED' AND UPPER(impact_type) = 'FULL' THEN 'Planned Full'
            WHEN UPPER(modality) = 'PLANNED' AND UPPER(impact_type) = 'PARTIAL' THEN 'Planned Partial'
            WHEN UPPER(modality) = 'UNPLANNED' AND UPPER(impact_type) = 'FULL' THEN 'Unplanned Full'
            WHEN UPPER(modality) = 'UNPLANNED' AND UPPER(impact_type) = 'PARTIAL' THEN 'Unplanned Partial'
          END AS downtime_type,
          ROUND(EXTRACT(EPOCH FROM (
            LEAST(end_date_time, $2::timestamp) - 
            GREATEST(start_date_time, $1::timestamp)
          )) / 60)::integer AS duration_minutes
        FROM downtime_report_v2
        WHERE 
          start_date_time < $2
          AND end_date_time > $1
          AND (
            (UPPER(modality) = 'PLANNED' AND UPPER(impact_type) = 'FULL') OR
            (UPPER(modality) = 'PLANNED' AND UPPER(impact_type) = 'PARTIAL') OR
            (UPPER(modality) = 'UNPLANNED' AND UPPER(impact_type) = 'FULL') OR
            (UPPER(modality) = 'UNPLANNED' AND UPPER(impact_type) = 'PARTIAL')
          )
      )
      SELECT 
        downtime_type,
        downtime_id,
        duration_minutes AS total_minutes
      FROM downtime_events
      WHERE duration_minutes > 0
      ORDER BY downtime_type, duration_minutes DESC
    `;
    
    logger.debug(`Executing ${type} downtime summary query`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        query: queryStr,
        params: [startDateISO, endDateISO]
      }
    });
    
    const result = await query(queryStr, [startDateISO, endDateISO]);
    
    logger.debug(`Summary query result`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        rowCount: result.rows.length,
        rows: result.rows,
      }
    });
    
    // Group by downtime type and take the event with maximum duration for each type
    const downtimeByType = {};
    result.rows.forEach(row => {
      const type = row.downtime_type;
      const minutes = parseInt(row.total_minutes) || 0;
      
      // Only keep the maximum duration for each type
      if (!downtimeByType[type] || minutes > downtimeByType[type].minutes) {
        downtimeByType[type] = {
          type: type,
          minutes: minutes,
          downtime_id: row.downtime_id
        };
      }
    });

    // Convert to array and ensure all types are represented
    const downtimeTypes = [
      'Planned Full',
      'Planned Partial', 
      'Unplanned Full',
      'Unplanned Partial'
    ].map(type => ({
      type: type,
      minutes: downtimeByType[type]?.minutes || 0,
      downtime_id: downtimeByType[type]?.downtime_id || null,
      percentage: totalAvailableMinutes > 0 
        ? Math.round(((downtimeByType[type]?.minutes || 0) / totalAvailableMinutes) * 100) 
        : 0
    }));

    // Calculate total downtime (sum of maximum durations for each type)
    const totalDowntimeMinutes = downtimeTypes.reduce(
      (sum, item) => sum + item.minutes,
      0
    );
    
    // Calculate uptime
    const uptimeMinutes = Math.max(0, totalAvailableMinutes - totalDowntimeMinutes);
    const uptimePercentage = totalAvailableMinutes > 0 
      ? Math.round((uptimeMinutes / totalAvailableMinutes) * 100) 
      : 0;
    
    const downtimePercentage = totalAvailableMinutes > 0 
      ? Math.round((totalDowntimeMinutes / totalAvailableMinutes) * 100) 
      : 0;
    
    // Format durations
    const formatDuration = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };
    
    // Add uptime as a type for the chart
    const chartData = [
      {
        type: 'Service Up',
        minutes: uptimeMinutes,
        percentage: uptimePercentage
      },
      ...downtimeTypes
    ];

    const responseData = {
      chartData,
      totalAvailableMinutes,
      totalAvailableDuration: formatDuration(totalAvailableMinutes),
      totalDowntimeMinutes,
      totalDowntimeDuration: formatDuration(totalDowntimeMinutes),
      uptimeMinutes,
      uptimeDuration: formatDuration(uptimeMinutes),
      uptimePercentage,
      downtimePercentage,
      timeRange: {
        start: startDateISO,
        end: endDateISO,
      },
      calculation: {
        expectedMinutes,
        actualMinutes: totalAvailableMinutes,
        matchesExpected: totalAvailableMinutes === expectedMinutes
      },
      summary: {
        availabilityStatus: uptimePercentage >= 99 ? 'Excellent' : 
                          uptimePercentage >= 95 ? 'Good' : 
                          uptimePercentage >= 90 ? 'Fair' : 'Poor',
        sla: '99.9%',
        meetsSla: uptimePercentage >= 99.9
      },
    };

    logger.debug(`Response data for ${type} downtime summary`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        timeRange,
        startDateISO,
        endDateISO,
        totalAvailableMinutes,
        totalDowntimeMinutes,
        uptimeMinutes,
        uptimePercentage,
      },
    });
    
    const duration = Date.now() - startTime;
    logger.info(`Fetched ${type} downtime summary data`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        timeRange,
        startDate: startDateISO,
        endDate: endDateISO,
        totalAvailableMinutes,
        totalDowntimeMinutes,
        uptimePercentage,
        duration
      }
    });
    
    return new Response(JSON.stringify({
      success: true,
      data: responseData
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const eid = request.cookies.get('eid')?.value || 'N/A';
    const sid = request.cookies.get('sessionId')?.value || 'N/A';
    
    logger.error(`Failed to fetch ${type} downtime summary data`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        timeRange,
        customStart,
        customEnd,
        error: error.message,
        stack: error.stack,
        duration
      }
    });
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch downtime summary data',
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}