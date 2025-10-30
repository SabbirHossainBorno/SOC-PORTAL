// app/api/user_dashboard/downtime_chart/reliability_impact/route.js
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
      const today = now.getDay();
      const sunday = new Date(now);
      sunday.setDate(now.getDate() - today);
      sunday.setHours(0, 0, 0, 0);
      
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      saturday.setHours(23, 59, 59, 999);
      
      start = sunday;
      end = saturday;
      break;
    case 'lastWeek':
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
  
  return { start, end };
};

const calculateTotalAvailableMinutes = (startDate, endDate, timeRange) => {
  if (timeRange !== 'custom') {
    return getExpectedMinutesForRange(timeRange);
  }
  
  const diffMs = endDate - startDate;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  return diffMinutes;
};

export async function GET(request) {
  const startTime = Date.now();
  const taskName = 'DowntimeChart';
  const type = 'RELIABILITY_IMPACT';
  
  try {
    const eid = request.cookies.get('eid')?.value || 'N/A';
    const sid = request.cookies.get('sessionId')?.value || 'N/A';

    logger.info(`Fetching ${type} reliability impact data`, {
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
    
    logger.debug(`Total available minutes calculation for reliability impact`, {
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
    
    // Define all possible channels in the correct order
    const allChannels = ['APP', 'USSD', 'WEB', 'SMS', 'MIDDLEWARE', 'INWARD SERVICE'];
    
    // Query for reliability impacted downtime by channel
    const queryStr = `
      WITH all_channels AS (
        SELECT unnest(ARRAY[$3, $4, $5, $6, $7, $8]) AS channel
      ),
      reliability_downtime_events AS (
        SELECT 
          downtime_id,
          affected_channel,
          EXTRACT(EPOCH FROM (
            LEAST(end_date_time, $2::timestamp) - 
            GREATEST(start_date_time, $1::timestamp)
          )) AS duration_seconds
        FROM downtime_report_v2
        WHERE 
          UPPER(reliability_impacted) = 'YES'
          AND start_date_time < $2
          AND end_date_time > $1
      ),
      channel_expansion AS (
        SELECT 
          downtime_id,
          UNNEST(
            CASE 
              WHEN UPPER(affected_channel) = 'ALL' 
              THEN ARRAY[$3, $4, $5, $6, $7, $8]
              WHEN affected_channel LIKE '%,%' 
              THEN string_to_array(UPPER(REPLACE(affected_channel, ' ', '')), ',')
              ELSE ARRAY[UPPER(affected_channel)]
            END
          ) AS channel,
          duration_seconds
        FROM reliability_downtime_events
      ),
      max_duration_per_downtime AS (
        SELECT 
          downtime_id,
          channel,
          MAX(duration_seconds) AS max_duration_seconds
        FROM channel_expansion
        GROUP BY downtime_id, channel
      ),
      channel_downtime AS (
        SELECT 
          channel,
          COALESCE(ROUND(SUM(max_duration_seconds) / 60)::integer, 0) AS total_minutes,
          COUNT(DISTINCT downtime_id) AS incident_count
        FROM max_duration_per_downtime
        GROUP BY channel
      )
      SELECT 
        ac.channel,
        COALESCE(cd.total_minutes, 0) AS total_minutes,
        COALESCE(cd.incident_count, 0) AS incident_count
      FROM all_channels ac
      LEFT JOIN channel_downtime cd ON ac.channel = cd.channel
      ORDER BY 
        CASE ac.channel
          WHEN 'APP' THEN 1
          WHEN 'USSD' THEN 2
          WHEN 'WEB' THEN 3
          WHEN 'SMS' THEN 4
          WHEN 'MIDDLEWARE' THEN 5
          WHEN 'INWARD SERVICE' THEN 6
          ELSE 7
        END
    `;
    
    logger.debug(`Executing ${type} reliability impact query`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        query: queryStr,
        params: [startDateISO, endDateISO, ...allChannels]
      }
    });
    
    const result = await query(queryStr, [startDateISO, endDateISO, ...allChannels]);
    
    logger.debug(`Reliability impact query result`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        rowCount: result.rows.length,
        rows: result.rows,
      }
    });
    
    // Calculate total reliability impact minutes across all channels
    const totalReliabilityImpactMinutes = result.rows.reduce(
      (sum, row) => sum + (parseInt(row.total_minutes) || 0),
      0
    );
    
    // Calculate total incidents
    const totalIncidents = result.rows.reduce(
      (sum, row) => sum + (parseInt(row.incident_count) || 0),
      0
    );
    
    // Calculate reliability percentage (100% - impact percentage)
    const reliabilityImpactPercentage = totalAvailableMinutes > 0 
      ? (totalReliabilityImpactMinutes / totalAvailableMinutes) * 100 
      : 0;
    
    const reliabilityPercentage = Math.max(0, 100 - reliabilityImpactPercentage);
    
    // Format durations
    const formatDuration = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };
    
    // Create channels array in the correct order with proper reliability calculation
    const channels = allChannels.map(channelName => {
      const row = result.rows.find(r => r.channel === channelName);
      const minutes = row ? parseInt(row.total_minutes) || 0 : 0;
      const incidentCount = row ? parseInt(row.incident_count) || 0 : 0;
      
      // Calculate reliability percentage for each channel
      const channelReliabilityPercentage = totalAvailableMinutes > 0 
        ? Math.max(0, 100 - (minutes / totalAvailableMinutes) * 100)
        : 100;
      
      return {
        channel: channelName,
        minutes: minutes,
        incidentCount: incidentCount,
        percentage: totalAvailableMinutes > 0 
          ? (minutes / totalAvailableMinutes) * 100 
          : 0,
        reliabilityPercentage: channelReliabilityPercentage
      };
    });
    
    const responseData = {
      channels,
      totalAvailableMinutes,
      totalAvailableDuration: formatDuration(totalAvailableMinutes),
      totalReliabilityImpactMinutes,
      totalReliabilityImpactDuration: formatDuration(totalReliabilityImpactMinutes),
      totalIncidents,
      reliabilityImpactPercentage: Math.round(reliabilityImpactPercentage * 100) / 100, // Round to 2 decimal places
      reliabilityPercentage: Math.round(reliabilityPercentage * 100) / 100, // Round to 2 decimal places
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
        reliabilityStatus: reliabilityPercentage >= 99.9 ? 'Excellent' : 
                          reliabilityPercentage >= 99 ? 'Good' : 
                          reliabilityPercentage >= 95 ? 'Fair' : 'Poor',
        sla: '99.9%',
        meetsSla: reliabilityPercentage >= 99.9,
        mostReliableChannel: channels.reduce((max, channel) => 
          channel.reliabilityPercentage > max.reliabilityPercentage ? channel : max
        ).channel,
        leastReliableChannel: channels.reduce((min, channel) => 
          channel.reliabilityPercentage < min.reliabilityPercentage ? channel : min
        ).channel,
        totalChannels: channels.length
      },
    };

    logger.debug(`Response data for ${type} reliability impact`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        timeRange,
        startDateISO,
        endDateISO,
        totalAvailableMinutes,
        totalReliabilityImpactMinutes,
        reliabilityPercentage,
        channelCount: channels.length,
        channelsWithData: channels.filter(c => c.minutes > 0).map(c => ({
          channel: c.channel,
          minutes: c.minutes,
          reliabilityPercentage: c.reliabilityPercentage
        }))
      },
    });
    
    const duration = Date.now() - startTime;
    logger.info(`Fetched ${type} reliability impact data`, {
      meta: {
        eid,
        sid,
        taskName,
        type,
        timeRange,
        startDate: startDateISO,
        endDate: endDateISO,
        totalAvailableMinutes,
        totalReliabilityImpactMinutes,
        reliabilityPercentage,
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
    
    logger.error(`Failed to fetch ${type} reliability impact data`, {
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
      message: 'Failed to fetch reliability impact data',
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}