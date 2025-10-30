// app/api/user_dashboard/downtime_chart/trend/route.js
import { query } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

// Helper function to get time ranges for trend analysis
const getTrendTimeRanges = (trendType, view) => {
  const now = new Date();
  const ranges = {};

  if (trendType === 'weekly') {
    if (view === 'comparison') {
      // Current week (Sunday to Saturday)
      const currentSunday = new Date(now);
      currentSunday.setDate(now.getDate() - now.getDay());
      currentSunday.setHours(0, 0, 0, 0);
      
      const currentSaturday = new Date(currentSunday);
      currentSaturday.setDate(currentSunday.getDate() + 6);
      currentSaturday.setHours(23, 59, 59, 999);

      // Previous week (Sunday to Saturday)
      const previousSunday = new Date(currentSunday);
      previousSunday.setDate(currentSunday.getDate() - 7);
      
      const previousSaturday = new Date(previousSunday);
      previousSaturday.setDate(previousSunday.getDate() + 6);
      previousSaturday.setHours(23, 59, 59, 999);

      // Format labels with dates for clarity
      const formatDateRange = (start, end) => {
        const format = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${format(start)} - ${format(end)}`;
      };

      ranges.current = { 
        start: currentSunday, 
        end: currentSaturday,
        label: `Current (${formatDateRange(currentSunday, currentSaturday)})`
      };
      ranges.previous = { 
        start: previousSunday, 
        end: previousSaturday,
        label: `Previous (${formatDateRange(previousSunday, previousSaturday)})`
      };

    } else {
      // Last 4 weeks for trend view (Sunday to Saturday)
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (now.getDay() + 7 * i));
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        const weekNumber = 4 - i;
        const format = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        ranges[`week_${i}`] = {
          start: weekStart,
          end: weekEnd,
          label: `Week ${weekNumber} (${format(weekStart)}-${format(weekEnd)})`
        };
      }
    }
  } else {
    // Monthly logic
    if (view === 'comparison') {
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      currentMonthEnd.setHours(23, 59, 59, 999);

      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      previousMonthEnd.setHours(23, 59, 59, 999);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      ranges.current = { 
        start: currentMonthStart, 
        end: currentMonthEnd,
        label: `${months[now.getMonth()]} (Full Month)`
      };
      ranges.previous = { 
        start: previousMonthStart, 
        end: previousMonthEnd,
        label: `${months[((now.getMonth() - 1) + 12) % 12]} (Full Month)`
      };
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 5; i >= 0; i--) {
        const month = now.getMonth() - i;
        const year = now.getFullYear() + Math.floor(month / 12);
        const adjustedMonth = ((month % 12) + 12) % 12;
        
        const monthStart = new Date(year, adjustedMonth, 1);
        const monthEnd = new Date(year, adjustedMonth + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        
        ranges[`month_${i}`] = {
          start: monthStart,
          end: monthEnd,
          label: months[adjustedMonth]
        };
      }
    }
  }

  return ranges;
};

// Fixed downtime calculation with proper channel mapping
const calculateDowntimeForRange = async (startDate, endDate, rangeLabel = '') => {
  const allChannels = ['APP', 'USSD', 'WEB', 'SMS', 'MIDDLEWARE', 'INWARD SERVICE'];
  
  const startDateStr = startDate.toISOString();
  const endDateStr = endDate.toISOString();
  
  logger.info('Querying downtime for range', {
    meta: {
      task: 'DOWNTIME_CALCULATION',
      rangeLabel,
      startDate: startDateStr,
      endDate: endDateStr,
      channels: allChannels,
      timestamp: new Date().toISOString()
    }
  });

  const queryStr = `
    WITH downtime_events AS (
      SELECT 
        downtime_id,
        affected_channel,
        EXTRACT(EPOCH FROM (
          LEAST(end_date_time, $1::timestamp) - 
          GREATEST(start_date_time, $2::timestamp)
        )) AS duration_seconds
      FROM downtime_report_v2
      WHERE 
        start_date_time < $1
        AND end_date_time > $2
        AND EXTRACT(EPOCH FROM (
          LEAST(end_date_time, $1::timestamp) - 
          GREATEST(start_date_time, $2::timestamp)
        )) > 0
    ),
    expanded_channels AS (
      SELECT 
        downtime_id,
        duration_seconds,
        TRIM(UPPER(UNNEST(
          CASE 
            WHEN UPPER(affected_channel) = 'ALL' THEN $3::text[]
            WHEN affected_channel LIKE '%,%' THEN string_to_array(REPLACE(affected_channel, ' ', ''), ',')
            ELSE ARRAY[UPPER(affected_channel)]
          END
        ))) AS channel
      FROM downtime_events
    ),
    max_duration_per_downtime_channel AS (
      SELECT 
        channel,
        downtime_id,
        MAX(duration_seconds) as max_duration_seconds
      FROM expanded_channels
      GROUP BY channel, downtime_id
    ),
    channel_totals AS (
      SELECT 
        channel,
        ROUND(SUM(max_duration_seconds) / 60) AS total_minutes,
        COUNT(DISTINCT downtime_id) AS incident_count
      FROM max_duration_per_downtime_channel
      GROUP BY channel
    ),
    all_channels AS (
      SELECT UNNEST($3::text[]) AS channel
    )
    SELECT 
      ac.channel,
      COALESCE(ct.total_minutes, 0) AS total_minutes,
      COALESCE(ct.incident_count, 0) AS incident_count
    FROM all_channels ac
    LEFT JOIN channel_totals ct ON ac.channel = ct.channel
    ORDER BY ac.channel;
  `;

  try {
    logger.debug('Executing SQL query for downtime calculation', {
      meta: {
        task: 'DOWNTIME_QUERY_EXECUTION',
        rangeLabel,
        endDate: endDateStr,
        startDate: startDateStr,
        channels: allChannels,
        query: 'downtime_trend_calculation',
        timestamp: new Date().toISOString()
      }
    });

    const result = await query(queryStr, [endDateStr, startDateStr, allChannels]);

    const rowsWithData = result.rows.filter(row => row.total_minutes > 0);
    const totalMinutes = result.rows.reduce((sum, row) => sum + parseInt(row.total_minutes), 0);
    const hasData = totalMinutes > 0;

    logger.info('Successfully calculated downtime for range', {
      meta: {
        task: 'DOWNTIME_CALCULATION_RESULT',
        rangeLabel,
        rowCount: result.rows.length,
        rowsWithDataCount: rowsWithData.length,
        totalMinutes,
        hasData,
        channelsWithData: rowsWithData.map(row => ({
          channel: row.channel,
          minutes: row.total_minutes,
          incidents: row.incident_count
        })),
        timestamp: new Date().toISOString()
      }
    });

    return {
      label: rangeLabel,
      data: result.rows,
      totalMinutes: totalMinutes,
      hasData: hasData,
      startDate: startDate,
      endDate: endDate
    };
  } catch (error) {
    logger.error('Database query error for downtime calculation', {
      meta: {
        task: 'DOWNTIME_CALCULATION_ERROR',
        rangeLabel,
        startDate: startDateStr,
        endDate: endDateStr,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    });
    
    const zeroData = allChannels.map(channel => ({
      channel,
      total_minutes: 0,
      incident_count: 0
    }));
    
    return {
      label: rangeLabel,
      data: zeroData,
      totalMinutes: 0,
      hasData: false,
      startDate: startDate,
      endDate: endDate
    };
  }
};

const findWeeksWithData = async (trendType) => {
  const now = new Date();
  
  // Get today's date
  const today = new Date();
  
  // Calculate the end of current week (next Saturday from today)
  const daysUntilSaturday = (6 - today.getDay() + 7) % 7;
  const currentSaturday = new Date(today);
  currentSaturday.setDate(today.getDate() + daysUntilSaturday);
  currentSaturday.setHours(23, 59, 59, 999);
  
  // Calculate the start of current week (Sunday before currentSaturday)
  const currentSunday = new Date(currentSaturday);
  currentSunday.setDate(currentSaturday.getDate() - 6);
  currentSunday.setHours(0, 0, 0, 0);

  // Calculate previous week (the week before current week)
  const previousSaturday = new Date(currentSunday);
  previousSaturday.setDate(currentSunday.getDate() - 1);
  previousSaturday.setHours(23, 59, 59, 999);
  
  const previousSunday = new Date(previousSaturday);
  previousSunday.setDate(previousSaturday.getDate() - 6);
  previousSunday.setHours(0, 0, 0, 0);

  logger.debug('Calculated week date ranges for analysis', {
    meta: {
      task: 'WEEK_RANGE_CALCULATION',
      today: today.toDateString(),
      currentWeek: `${currentSunday.toDateString()} to ${currentSaturday.toDateString()}`,
      previousWeek: `${previousSunday.toDateString()} to ${previousSaturday.toDateString()}`,
      daysUntilSaturday,
      timestamp: new Date().toISOString()
    }
  });

  const formatDateRange = (start, end) => {
    const format = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${format(start)} - ${format(end)}`;
  };

  const [currentData, previousData] = await Promise.all([
    calculateDowntimeForRange(currentSunday, currentSaturday, `Current (${formatDateRange(currentSunday, currentSaturday)})`),
    calculateDowntimeForRange(previousSunday, previousSaturday, `Previous (${formatDateRange(previousSunday, previousSaturday)})`)
  ]);

  logger.info('Weekly comparison data retrieved', {
    meta: {
      task: 'WEEKLY_COMPARISON_DATA',
      currentWeek: {
        label: currentData.label,
        totalMinutes: currentData.totalMinutes,
        channelsWithData: currentData.data.filter(d => d.total_minutes > 0).map(d => ({
          channel: d.channel,
          minutes: d.total_minutes
        }))
      },
      previousWeek: {
        label: previousData.label,
        totalMinutes: previousData.totalMinutes,
        channelsWithData: previousData.data.filter(d => d.total_minutes > 0).map(d => ({
          channel: d.channel,
          minutes: d.total_minutes
        }))
      },
      foundData: currentData.hasData || previousData.hasData,
      timestamp: new Date().toISOString()
    }
  });

  return {
    current: currentData,
    previous: previousData,
    foundData: currentData.hasData || previousData.hasData
  };
};

export async function GET(request) {
  const startTime = Date.now();
  const taskName = 'DowntimeTrend';
  const type = 'TREND_ANALYSIS';
  
  try {
    const { searchParams } = new URL(request.url);
    const trendType = searchParams.get('trendType') || 'weekly';
    const view = searchParams.get('view') || 'comparison';

    logger.info('API Request received for downtime trend analysis', {
      meta: {
        task: taskName,
        type,
        trendType,
        view,
        url: request.url,
        timestamp: new Date().toISOString()
      }
    });

    // Validate parameters
    if (!['weekly', 'monthly'].includes(trendType)) {
      logger.warn('Invalid trendType parameter received', {
        meta: {
          task: taskName,
          trendType,
          allowedValues: ['weekly', 'monthly'],
          timestamp: new Date().toISOString()
        }
      });

      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid trendType. Must be "weekly" or "monthly"'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!['comparison', 'trend'].includes(view)) {
      logger.warn('Invalid view parameter received', {
        meta: {
          task: taskName,
          view,
          allowedValues: ['comparison', 'trend'],
          timestamp: new Date().toISOString()
        }
      });

      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid view. Must be "comparison" or "trend"'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const allChannels = ['APP', 'USSD', 'WEB', 'SMS', 'MIDDLEWARE', 'INWARD SERVICE'];
    let responseData;

    logger.debug('Starting trend data processing', {
      meta: {
        task: taskName,
        trendType,
        view,
        allChannels,
        timestamp: new Date().toISOString()
      }
    });

    if (view === 'comparison' && trendType === 'weekly') {
      // Use flexible week detection for weekly comparison
      const weekComparison = await findWeeksWithData(trendType);
      
      // Extract data in the correct order
      const currentMinutes = allChannels.map(channel => {
        const channelData = weekComparison.current.data.find(d => d.channel === channel);
        return channelData ? parseInt(channelData.total_minutes) : 0;
      });
      
      const previousMinutes = allChannels.map(channel => {
        const channelData = weekComparison.previous.data.find(d => d.channel === channel);
        return channelData ? parseInt(channelData.total_minutes) : 0;
      });
      
      const changes = currentMinutes.map((current, index) => current - previousMinutes[index]);
      const totalCurrent = currentMinutes.reduce((sum, minutes) => sum + minutes, 0);
      const totalPrevious = previousMinutes.reduce((sum, minutes) => sum + minutes, 0);
      const totalChange = totalCurrent - totalPrevious;

      const improvementRate = totalPrevious > 0 
        ? Math.round(((totalPrevious - totalCurrent) / totalPrevious) * 100)
        : 0;

      const mostImpactedIndex = currentMinutes.reduce((maxIndex, minutes, index, array) => 
        minutes > array[maxIndex] ? index : maxIndex, 0
      );

      const summary = {
        totalDowntime: totalCurrent,
        avgPerChannel: Math.round(totalCurrent / allChannels.length),
        improvingChannels: changes.filter(change => change < 0).length,
        mostImpacted: {
          channel: allChannels[mostImpactedIndex],
          total: currentMinutes[mostImpactedIndex]
        },
        currentPeriod: weekComparison.current.label,
        previousPeriod: weekComparison.previous.label,
        hasData: weekComparison.foundData
      };

      responseData = {
        channels: allChannels,
        summary,
        comparison: {
          current: currentMinutes,
          previous: previousMinutes,
          changes,
          totalCurrent,
          totalPrevious,
          totalChange,
          improvementRate,
          currentPeriod: weekComparison.current.label,
          previousPeriod: weekComparison.previous.label,
          hasData: weekComparison.foundData
        }
      };

      logger.info('Weekly comparison data processed successfully', {
        meta: {
          task: taskName,
          trendType: 'weekly',
          view: 'comparison',
          channels: responseData.channels,
          currentData: responseData.comparison.current,
          previousData: responseData.comparison.previous,
          totalCurrent,
          totalPrevious,
          improvementRate,
          summary: responseData.summary,
          timestamp: new Date().toISOString()
        }
      });

    } else if (view === 'comparison' && trendType === 'monthly') {
      // Monthly comparison logic
      const timeRanges = getTrendTimeRanges(trendType, view);
      const [currentPeriod, previousPeriod] = await Promise.all([
        calculateDowntimeForRange(timeRanges.current.start, timeRanges.current.end, timeRanges.current.label),
        calculateDowntimeForRange(timeRanges.previous.start, timeRanges.previous.end, timeRanges.previous.label)
      ]);

      const currentMinutes = allChannels.map(channel => {
        const channelData = currentPeriod.data.find(d => d.channel === channel);
        return channelData ? parseInt(channelData.total_minutes) : 0;
      });
      
      const previousMinutes = allChannels.map(channel => {
        const channelData = previousPeriod.data.find(d => d.channel === channel);
        return channelData ? parseInt(channelData.total_minutes) : 0;
      });
      
      const changes = currentMinutes.map((current, index) => current - previousMinutes[index]);
      const totalCurrent = currentMinutes.reduce((sum, minutes) => sum + minutes, 0);
      const totalPrevious = previousMinutes.reduce((sum, minutes) => sum + minutes, 0);
      const totalChange = totalCurrent - totalPrevious;

      const improvementRate = totalPrevious > 0 
        ? Math.round(((totalPrevious - totalCurrent) / totalPrevious) * 100)
        : 0;

      const mostImpactedIndex = currentMinutes.reduce((maxIndex, minutes, index, array) => 
        minutes > array[maxIndex] ? index : maxIndex, 0
      );

      const summary = {
        totalDowntime: totalCurrent,
        avgPerChannel: Math.round(totalCurrent / allChannels.length),
        improvingChannels: changes.filter(change => change < 0).length,
        mostImpacted: {
          channel: allChannels[mostImpactedIndex],
          total: currentMinutes[mostImpactedIndex]
        },
        currentPeriod: timeRanges.current.label,
        previousPeriod: timeRanges.previous.label,
        hasData: currentPeriod.hasData || previousPeriod.hasData
      };

      responseData = {
        channels: allChannels,
        summary,
        comparison: {
          current: currentMinutes,
          previous: previousMinutes,
          changes,
          totalCurrent,
          totalPrevious,
          totalChange,
          improvementRate,
          currentPeriod: timeRanges.current.label,
          previousPeriod: timeRanges.previous.label,
          hasData: currentPeriod.hasData || previousPeriod.hasData
        }
      };

      logger.info('Monthly comparison data processed successfully', {
        meta: {
          task: taskName,
          trendType: 'monthly',
          view: 'comparison',
          totalCurrent,
          totalPrevious,
          improvementRate,
          summary: responseData.summary,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      // Trend view logic
      const timeRanges = getTrendTimeRanges(trendType, view);
      const periodPromises = Object.entries(timeRanges).map(([key, range]) =>
        calculateDowntimeForRange(range.start, range.end, range.label)
      );
      
      const periodResults = await Promise.all(periodPromises);

      const trendData = allChannels.map((channel, channelIndex) => {
        const channelData = periodResults.map(period => {
          const channelRow = period.data.find(d => d.channel === channel);
          return channelRow ? parseInt(channelRow.total_minutes) : 0;
        });
        
        const total = channelData.reduce((sum, minutes) => sum + minutes, 0);
        
        return {
          channel,
          data: channelData,
          total,
          avg: Math.round(total / channelData.length),
          trend: channelData[0] > channelData[channelData.length - 1] ? 'improving' : 
                 channelData[0] < channelData[channelData.length - 1] ? 'deteriorating' : 'stable'
        };
      });

      const totalDowntime = trendData.reduce((sum, channel) => sum + channel.total, 0);
      const mostImpacted = trendData.reduce((max, channel) => 
        channel.total > max.total ? channel : max
      );

      const summary = {
        totalDowntime,
        avgPerChannel: Math.round(totalDowntime / allChannels.length),
        improvingChannels: trendData.filter(channel => channel.trend === 'improving').length,
        mostImpacted: {
          channel: mostImpacted.channel,
          total: mostImpacted.total
        },
        periodCount: periodResults.length,
        hasData: periodResults.some(period => period.hasData)
      };

      const firstPeriod = periodResults[0];
      const lastPeriod = periodResults[periodResults.length - 1];
      
      const comparisonData = {
        current: trendData.map(channel => channel.data[channel.data.length - 1]),
        previous: trendData.map(channel => channel.data[0]),
        changes: trendData.map(channel => 
          channel.data[channel.data.length - 1] - channel.data[0]
        ),
        totalCurrent: lastPeriod.totalMinutes,
        totalPrevious: firstPeriod.totalMinutes,
        totalChange: lastPeriod.totalMinutes - firstPeriod.totalMinutes,
        improvementRate: firstPeriod.totalMinutes > 0 
          ? Math.round(((firstPeriod.totalMinutes - lastPeriod.totalMinutes) / firstPeriod.totalMinutes) * 100)
          : 0,
        currentPeriod: lastPeriod.label,
        previousPeriod: firstPeriod.label,
        hasData: periodResults.some(period => period.hasData)
      };

      responseData = {
        channels: allChannels,
        summary,
        trend: {
          labels: periodResults.map(period => period.label),
          data: trendData
        },
        comparison: comparisonData
      };

      logger.info('Trend view data processed successfully', {
        meta: {
          task: taskName,
          trendType,
          view: 'trend',
          periodCount: periodResults.length,
          totalDowntime,
          summary: responseData.summary,
          timestamp: new Date().toISOString()
        }
      });
    }

    const duration = Date.now() - startTime;
    
    logger.info('Successfully processed trend data', {
      meta: {
        task: taskName,
        type,
        trendType,
        view,
        duration,
        hasData: responseData.summary.hasData,
        channelsWithData: responseData.comparison?.current?.filter((val, idx) => val > 0).map((val, idx) => ({
          channel: responseData.channels[idx],
          minutes: val
        })),
        totalDowntime: responseData.summary.totalDowntime,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: responseData
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Failed to fetch trend data', {
      meta: {
        task: taskName,
        type,
        duration,
        error: error.message,
        stack: error.stack,
        url: request.url,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch trend data',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}