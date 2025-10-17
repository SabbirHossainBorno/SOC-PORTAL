// app/api/user_dashboard/downtime_log/route.js
import { query } from '../../../../lib/db';
import logger from '../../../../lib/logger';

// Helper to calculate time ranges
const getTimeRange = (range) => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  let start = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  let end = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  
  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
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
  } catch {
    return duration || 'N/A';
  }
};

// Helper to format date to Dhaka time
const formatDhakaTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    // Assume dateString is already in 'YYYY-MM-DD HH:MM:SS' format in Asia/Dhaka timezone
    const isoWithTZ = dateString.replace(' ', 'T') + '+06:00';
    const date = new Date(isoWithTZ);
    
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    return date.toLocaleString('en-GB', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  } catch {
    return dateString;
  }
};

export async function GET(request) {
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

    // If downtimeId is provided, fetch all rows for that ID
    if (downtimeId) {
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
      
      const downtimes = dataResult.rows.map(record => ({
        ...record,
        formattedStart: formatDhakaTime(record.start_date_time),
        formattedEnd: formatDhakaTime(record.end_date_time),
        rawStart: record.start_date_time,
        rawEnd: record.end_date_time,
        formattedDuration: formatDuration(record.duration),
        created_at: formatDhakaTime(record.created_at),
        updated_at: formatDhakaTime(record.updated_at)
      }));

      return new Response(JSON.stringify({
        success: true,
        downtimes,
        total: downtimes.length,
        summary: null // No summary needed for specific downtime_id fetch
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
    
    // Channel filter
    if (channel) {
      whereConditions.push(`affected_channel = $${queryParams.length + 1}`);
      queryParams.push(channel);
    }
    
    // MNO filter
    if (affectedMNO) {
      whereConditions.push(`affected_mno = $${queryParams.length + 1}`);
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
      }
    }
    
    // Custom date range
    if (startDate && endDate) {
      const startDateDhaka = new Date(new Date(startDate).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
      const endDateDhaka = new Date(new Date(endDate).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
      
      // Set endDateDhaka to end of the day (23:59:59.999) to include all events on that day
      endDateDhaka.setHours(23, 59, 59, 999);
      
      whereConditions.push(
        `start_date_time >= $${queryParams.length + 1} 
        AND start_date_time <= $${queryParams.length + 2}`
      );
      queryParams.push(startDateDhaka.toISOString());
      queryParams.push(endDateDhaka.toISOString());
    }
    
    const whereClause = whereConditions.length 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Main data query - fetch all required fields
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
    
    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM downtime_report_v2
      ${whereClause}
    `;

    // Summary query with max duration per downtime_id and top channels
    const summaryQuery = `
      SELECT
        COUNT(DISTINCT downtime_id) as total_events,
        COUNT(*) as total_records,
        SUM(max_duration) as total_seconds,
        (
          SELECT json_agg(row_to_json(t)) 
          FROM (
            SELECT affected_channel as channel, COUNT(DISTINCT downtime_id) as count
            FROM downtime_report_v2
            ${whereClause}
            GROUP BY affected_channel
            ORDER BY count DESC
            LIMIT 3
          ) t
        ) as top_channels
      FROM (
        SELECT downtime_id, MAX(EXTRACT(EPOCH FROM duration)) as max_duration
        FROM downtime_report_v2
        ${whereClause}
        GROUP BY downtime_id
      ) sub
    `;
    
    // Execute queries
    const dataResult = await query(dataQuery, [...queryParams, limit, offset]);
    const countResult = await query(countQuery, queryParams);
    const summaryResult = await query(summaryQuery, queryParams);
    const summaryData = summaryResult.rows[0];
    
    // Format total duration
    let totalDuration = {
      formatted: 'N/A',
      minutes: 0
    };
    if (summaryData.total_seconds) {
      const hours = Math.floor(summaryData.total_seconds / 3600);
      const minutes = Math.floor((summaryData.total_seconds % 3600) / 60);
      totalDuration = {
        formatted: `${hours}h ${minutes}m`,
        minutes: Math.floor(summaryData.total_seconds / 60)
      };
    }
    
    // Format data for frontend
    const downtimes = dataResult.rows.map(record => ({
      ...record,
      formattedStart: formatDhakaTime(record.start_date_time),
      formattedEnd: formatDhakaTime(record.end_date_time),
      rawStart: record.start_date_time,
      rawEnd: record.end_date_time,
      formattedDuration: formatDuration(record.duration),
      created_at: formatDhakaTime(record.created_at),
      updated_at: formatDhakaTime(record.updated_at)
    }));

    return new Response(JSON.stringify({
      success: true,
      downtimes,
      total: countResult.rows[0].total,
      summary: {
        totalEvents: summaryData.total_events,
        totalRecords: summaryData.total_records,
        totalDuration: totalDuration.formatted,
        totalDurationMinutes: totalDuration.minutes,
        topChannels: summaryData.top_channels || []
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    logger.error('Failed to fetch downtime log', {
      meta: {
        taskName: 'DatabaseError',
        details: error.message,
        stack: error.stack
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