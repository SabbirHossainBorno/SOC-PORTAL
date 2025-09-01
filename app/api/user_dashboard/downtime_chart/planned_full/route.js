// app/api/user_dashboard/downtime_chart/planned_full/route.js
import { query } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

const getTimeRange = (range) => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last7days':
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last30days':
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
      now: now.toISOString(),
      nowLocale: now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
      start: start.toISOString(),
      end: end.toISOString(),
      startLocale: start.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
      endLocale: end.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
    },
  });
  
  return { start, end };
};

export async function GET(request) {
  const startTime = Date.now();
  const taskName = 'DowntimeChart';
  const type = 'PLANNED_FULL';
  
  try {
    const eid = request.cookies.get('eid')?.value || 'N/A';
    const sid = request.cookies.get('sessionId')?.value || 'N/A';

    logger.info(`Fetching ${type} downtime data`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        action: 'START'
      }
    });

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'last7days';
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
        startDate = new Date(new Date(customStart).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
        endDate = new Date(new Date(customEnd).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
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
      
      logger.debug(`Custom date range received`, {
        meta: {
          eid,
          sid,
          taskName,
          type,
          timeRange,
          rawCustomStart: customStart,
          rawCustomEnd: customEnd,
          processedStart: startDate.toISOString(),
          processedEnd: endDate.toISOString(),
          processedStartLocale: startDate.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
          processedEndLocale: endDate.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
        },
      });
      
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
    
    logger.debug(`Formatted dates for query`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        timeRange,
        startDateISO,
        endDateISO,
        startDateLocale: startDate.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
        endDateLocale: endDate.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })
      }
    });
    
    const queryStr = `
      SELECT 
        expanded_channel.channel,
        COALESCE(ROUND(SUM(max_duration) / 60)::integer, 0) AS total_minutes
      FROM (
        SELECT 
          downtime_id,
          UPPER(affected_channel) AS affected_channel,
          MAX(EXTRACT(EPOCH FROM (
            CASE 
              WHEN end_date_time > $2 THEN $2
              ELSE end_date_time
            END - 
            CASE 
              WHEN start_date_time < $1 THEN $1
              ELSE start_date_time
            END
          ))) AS max_duration
        FROM downtime_report_v2
        WHERE 
          UPPER(modality) = 'PLANNED'
          AND UPPER(impact_type) = 'FULL'
          AND start_date_time < $2 + interval '1 millisecond'
          AND end_date_time >= $1
        GROUP BY downtime_id, affected_channel
      ) sub
      CROSS JOIN LATERAL (
        SELECT unnest(
          CASE 
            WHEN sub.affected_channel = 'ALL' 
            THEN ARRAY['APP', 'USSD', 'WEB', 'SMS', 'MIDDLEWARE', 'INWARD SERVICE']
            ELSE ARRAY[sub.affected_channel]
          END
        ) AS channel
      ) expanded_channel
      GROUP BY expanded_channel.channel
      ORDER BY total_minutes DESC
    `;
    
    logger.debug(`Executing ${type} downtime query`, {
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
    
    logger.debug(`Query result`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        rowCount: result.rows.length,
        rows: result.rows,
      }
    });
    
    const totalMinutes = result.rows.reduce(
      (sum, row) => sum + (parseInt(row.total_minutes) || 0),
      0
    );
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    const formattedTotalDuration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    
    const channels = result.rows.map(row => ({
      channel: row.channel,
      minutes: parseInt(row.total_minutes) || 0,
      percentage: totalMinutes > 0 
        ? Math.round((parseInt(row.total_minutes) / totalMinutes) * 100) 
        : 0
    }));
    
    const responseData = {
      channels,
      totalMinutes,
      totalDuration: formattedTotalDuration,
      timeRange: {
        start: startDateISO,
        end: endDateISO,
      },
      summary: {
        eventCount: channels.length,
        minDowntime: channels.length > 0 ? Math.min(...channels.map(c => c.minutes)) : 0,
        maxDowntime: channels.length > 0 ? Math.max(...channels.map(c => c.minutes)) : 0,
        avgDowntime: Math.round(totalMinutes / (channels.length || 1)),
      },
    };

    logger.debug(`Response data for ${type} downtime`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        timeRange,
        startDateISO,
        endDateISO,
        startDateLocale: startDate.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
        endDateLocale: endDate.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
        responseTimeRange: {
          start: responseData.timeRange.start,
          end: responseData.timeRange.end,
        },
        totalMinutes,
        channelCount: channels.length,
      },
    });
    
    const duration = Date.now() - startTime;
    logger.info(`Fetched ${type} downtime data`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        timeRange,
        startDate: startDateISO,
        endDate: endDateISO,
        startDateLocale: startDate.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
        endDateLocale: endDate.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
        totalMinutes,
        channelCount: channels.length,
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
    
    logger.error(`Failed to fetch ${type} downtime data`, {
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
      message: 'Failed to fetch downtime data',
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}