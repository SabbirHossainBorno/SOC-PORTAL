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
        label: `This Week (${formatDateRange(currentSunday, currentSaturday)})`
      };
      ranges.previous = { 
        start: previousSunday, 
        end: previousSaturday,
        label: `Last Week (${formatDateRange(previousSunday, previousSaturday)})`
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
    // Monthly logic (unchanged)
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

// Enhanced downtime calculation that checks for data existence
const calculateDowntimeForRange = async (startDate, endDate, rangeLabel = '') => {
  const allChannels = ['APP', 'USSD', 'WEB', 'SMS', 'MIDDLEWARE', 'INWARD SERVICE'];
  
  const queryStr = `
    WITH all_channels AS (
      SELECT unnest(ARRAY[$3, $4, $5, $6, $7, $8]) AS channel
    ),
    downtime_events AS (
      SELECT 
        downtime_id,
        affected_channel,
        EXTRACT(EPOCH FROM (
          LEAST(end_date_time, $2::timestamp) - 
          GREATEST(start_date_time, $1::timestamp)
        )) AS duration_seconds
      FROM downtime_report_v2
      WHERE 
        start_date_time < $2
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
      FROM downtime_events
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
    ORDER BY ac.channel
  `;

  try {
    const result = await query(queryStr, [
      startDate.toISOString(),
      endDate.toISOString(),
      ...allChannels
    ]);

    const totalMinutes = result.rows.reduce((sum, row) => sum + parseInt(row.total_minutes), 0);
    const hasData = totalMinutes > 0;

    return {
      label: rangeLabel,
      data: result.rows,
      totalMinutes: totalMinutes,
      hasData: hasData,
      startDate: startDate,
      endDate: endDate
    };
  } catch (error) {
    logger.error(`Error calculating downtime for range ${rangeLabel}`, {
      meta: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        rangeLabel,
        error: error.message
      }
    });
    
    return {
      label: rangeLabel,
      data: allChannels.map(channel => ({
        channel,
        total_minutes: 0,
        incident_count: 0
      })),
      totalMinutes: 0,
      hasData: false,
      startDate: startDate,
      endDate: endDate
    };
  }
};

const findWeeksWithData = async (trendType) => {
  const now = new Date();
  const allChannels = ['APP', 'USSD', 'WEB', 'SMS', 'MIDDLEWARE', 'INWARD SERVICE'];
  
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

  console.log('CORRECTED Date calculations:', {
    today: today.toDateString(),
    daysUntilSaturday,
    currentSunday: currentSunday.toDateString(),
    currentSaturday: currentSaturday.toDateString(),
    previousSunday: previousSunday.toDateString(),
    previousSaturday: previousSaturday.toDateString()
  });

  const formatDateRange = (start, end) => {
    const format = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${format(start)} - ${format(end)}`;
  };

  const [currentData, previousData] = await Promise.all([
    calculateDowntimeForRange(currentSunday, currentSaturday, `Current (${formatDateRange(currentSunday, currentSaturday)})`),
    calculateDowntimeForRange(previousSunday, previousSaturday, `Previous (${formatDateRange(previousSunday, previousSaturday)})`)
  ]);

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

    // Validate parameters
    if (!['weekly', 'monthly'].includes(trendType)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid trendType. Must be "weekly" or "monthly"'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!['comparison', 'trend'].includes(view)) {
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

    if (view === 'comparison' && trendType === 'weekly') {
      // Use flexible week detection for weekly comparison
      const weekComparison = await findWeeksWithData(trendType);
      
      const currentMinutes = weekComparison.current.data.map(row => parseInt(row.total_minutes));
      const previousMinutes = weekComparison.previous.data.map(row => parseInt(row.total_minutes));
      
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

    } else if (view === 'comparison' && trendType === 'monthly') {
      // Monthly comparison logic (existing)
      const timeRanges = getTrendTimeRanges(trendType, view);
      const [currentPeriod, previousPeriod] = await Promise.all([
        calculateDowntimeForRange(timeRanges.current.start, timeRanges.current.end, timeRanges.current.label),
        calculateDowntimeForRange(timeRanges.previous.start, timeRanges.previous.end, timeRanges.previous.label)
      ]);

      const currentMinutes = currentPeriod.data.map(row => parseInt(row.total_minutes));
      const previousMinutes = previousPeriod.data.map(row => parseInt(row.total_minutes));
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

    } else {
      // Trend view logic (existing)
      const timeRanges = getTrendTimeRanges(trendType, view);
      const periodPromises = Object.entries(timeRanges).map(([key, range]) =>
        calculateDowntimeForRange(range.start, range.end, range.label)
      );
      
      const periodResults = await Promise.all(periodPromises);

      const trendData = allChannels.map((channel, channelIndex) => {
        const channelData = periodResults.map(period => 
          parseInt(period.data[channelIndex]?.total_minutes || 0)
        );
        
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
    }

    const duration = Date.now() - startTime;
    logger.info(`Fetched ${type} trend data`, {
      meta: {
        trendType,
        view,
        duration,
        hasData: responseData.summary.hasData
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
    
    logger.error(`Failed to fetch ${type} trend data`, {
      meta: {
        error: error.message,
        duration
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