// app/api/user_dashboard/report_downtime/route.js
import { query, getDbConnection } from '../../../../lib/db';
import logger from '../../../../lib/logger';
import sendTelegramAlert from '../../../../lib/telegramAlert';
import { DateTime } from 'luxon';
import { getClientIP } from '../../../../lib/utils/ipUtils';

// Helper function to get current time in Dhaka timezone
const getCurrentDateTime = () => {
  const now = DateTime.now().setZone('Asia/Dhaka');
  const formattedTime = now.toFormat('yyyy-MM-dd HH:mm:ss');
  console.debug('Generated Dhaka timezone datetime:', { formattedTime });
  return formattedTime;
};

// Format date as DD/MM/YYYY
const formatDate = (date) => {
  if (!date) {
    console.debug('No date provided for formatting');
    return 'N/A';
  }
  try {
    const dhakaDate = DateTime.fromJSDate(new Date(date), { zone: 'utc' }).setZone('Asia/Dhaka');
    const formatted = dhakaDate.toFormat('dd/MM/yyyy');
    console.debug('Formatted date:', { input: date, output: formatted });
    return formatted;
  } catch (error) {
    console.error('Error formatting date:', { input: date, error: error.message });
    return 'N/A';
  }
};

// Format date/time as DD/MM/YYYY HH:mm (24-hour format)
const formatDateTime = (date) => {
  if (!date) {
    console.debug('No date provided for formatting');
    return 'N/A';
  }
  try {
    const dhakaTime = DateTime.fromJSDate(new Date(date), { zone: 'utc' }).setZone('Asia/Dhaka');
    const formatted = dhakaTime.toFormat('dd/MM/yyyy, HH:mm');
    console.debug('Formatted datetime:', { input: date, output: formatted, iso: dhakaTime.toISO() });
    return formatted;
  } catch (error) {
    console.error('Error formatting datetime:', { input: date, error: error.message });
    return 'N/A';
  }
};

// Process multiple selection fields - convert arrays to comma-separated strings
const processMultiSelectField = (fieldValue) => {
  if (!fieldValue) return 'ALL';
  if (Array.isArray(fieldValue)) {
    // If array is empty, return 'ALL'
    if (fieldValue.length === 0) return 'ALL';
    // If array contains 'ALL', return 'ALL'
    if (fieldValue.includes('ALL')) return 'ALL';
    // Otherwise return comma-separated values
    return fieldValue.join(',');
  }
  return fieldValue;
};

// Format Telegram alert message for downtime
const formatDowntimeAlert = (downtimeId, issueTitle, issueDate, startTime, endTime, duration, categories, ipAddress, userAgent, additionalInfo = {}) => {
  const time = getCurrentDateTime();
  const userId = additionalInfo.userId || 'N/A';
  const status = additionalInfo.status || 'Reported';
  const eid = additionalInfo.eid || 'N/A';
  const affectedChannel = additionalInfo.affectedChannel || 'N/A';
  const affectedService = additionalInfo.affectedService || 'N/A';
  const affectedPersona = additionalInfo.affectedPersona || 'N/A';
  const affectedMno = additionalInfo.affectedMno || 'N/A';
  const affectedPortal = additionalInfo.affectedPortal || 'N/A';
  const affectedType = additionalInfo.affectedType || 'N/A';
  const impactType = additionalInfo.impactType || 'N/A';
  const modality = additionalInfo.modality || 'N/A';
  const reliabilityImpacted = additionalInfo.reliabilityImpacted || 'N/A';
  const concern = additionalInfo.concern || 'N/A';
  const reason = additionalInfo.reason || 'N/A';
  const resolution = additionalInfo.resolution || 'N/A';
  const systemUnavailability = additionalInfo.systemUnavailability || 'N/A';
  const trackedBy = additionalInfo.trackedBy || 'N/A';
  const serviceDeskTicketId = additionalInfo.serviceDeskTicketId || 'N/A';
  const serviceDeskTicketLink = additionalInfo.serviceDeskTicketLink || 'N/A';
  const remark = additionalInfo.remark || 'N/A';
  
  const message = `⚠️ SOC PORTAL | DOWNTIME REPORTED ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 Downtime ID          : ${downtimeId}
📛 Issue Title         : ${issueTitle}
🌐 Affected Channel    : ${affectedChannel}
📡 Affected Service    : ${affectedService}
👥 Affected Persona    : ${affectedPersona}
📱 Affected MNO        : ${affectedMno}
🌍 Affected Portal     : ${affectedPortal}
📌 Affected Type       : ${affectedType}
📅 Issue Date          : ${issueDate}
⏰ Start Time          : ${startTime}
⏱️ End Time            : ${endTime}
⏳ Duration            : ${duration}
📦 Categories          : ${categories.length > 0 ? categories.join(', ') : 'N/A'}
🔍 Impact Type         : ${impactType}
📱 Modality            : ${modality}
⚙️ Reliability Impacted: ${reliabilityImpacted}
⚠️ Concern             : ${concern}
📋 Reason              : ${reason}
✅ Resolution          : ${resolution}
🔌 System Unavailability: ${systemUnavailability}
👤 Tracked By          : ${trackedBy}
🎫 Ticket ID           : ${serviceDeskTicketId}
🔗 Ticket Link         : ${serviceDeskTicketLink}
📝 Remark              : ${remark}
👤 Reported By         : ${userId}
🌐 IP Address          : ${ipAddress}
🖥️ Device Info         : ${userAgent}
🔖 EID                 : ${eid}
🕒 Report Time         : ${time}
✅ Status              : ${status}`;
  
  console.debug('Formatted Telegram alert:', { 
    message, 
    params: { 
      downtimeId, 
      issueTitle, 
      issueDate, 
      startTime, 
      endTime, 
      duration, 
      categories, 
      ipAddress, 
      userAgent, 
      additionalInfo 
    } 
  });
  return message;
};

// Generate next notification ID based on serial column
const generateNotificationId = async (prefix, table) => {
  try {
    console.debug('Generating notification ID:', { prefix, table });
    const result = await query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    console.debug('Retrieved max serial:', { result: result.rows[0] });
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(4, '0');
    const notificationId = `${prefix}${nextId}SOCP`;
    console.debug('Generated notification ID:', { notificationId, maxSerial });
    return notificationId;
  } catch (error) {
    console.error('Error generating notification ID:', { error: error.message, stack: error.stack });
    throw new Error(`Error generating notification ID: ${error.message}`);
  }
};

// Convert UTC to Dhaka time for database storage
const convertToDhakaTime = (utcDateTime) => {
  if (!utcDateTime) {
    console.debug('No UTC datetime provided for conversion');
    return null;
  }
  try {
    const dhakaTime = DateTime.fromJSDate(new Date(utcDateTime), { zone: 'utc' }).setZone('Asia/Dhaka');
    const formattedTime = dhakaTime.toFormat('yyyy-MM-dd HH:mm:ss');
    console.debug('Converted UTC to Dhaka time:', { utcDateTime, formattedTime, iso: dhakaTime.toISO() });
    return formattedTime;
  } catch (error) {
    console.error('Error converting to Dhaka time:', { utcDateTime, error: error.message, stack: error.stack });
    return null;
  }
};

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  console.debug('Fetching top issues:', { sessionId, eid, socPortalId, ipAddress, userAgent });
  logger.info('Fetching top issues initiated', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'FetchTopIssues',
      details: `User ${socPortalId} requesting top issues`,
      userId: socPortalId,
      ipAddress,
      userAgent
    }
  });

  try {
    // Query to fetch top issues
    const topIssuesQuery = `
      SELECT issue_title, COUNT(DISTINCT downtime_id) as incident_count
      FROM downtime_report_v2
      GROUP BY issue_title
      ORDER BY incident_count DESC
      LIMIT 5
    `;
    const topIssuesResult = await query(topIssuesQuery);
    const topIssues = topIssuesResult.rows.map(row => ({
      issue_title: row.issue_title,
      incident_count: parseInt(row.incident_count, 10)
    }));

    console.debug('Top issues fetched:', { topIssues });
    logger.info('Top issues fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FetchTopIssues',
        details: `Fetched ${topIssues.length} top issues`,
        topIssues
      }
    });

    return new Response(JSON.stringify({
      success: true,
      topIssues
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching top issues:', { error: error.message, stack: error.stack });
    logger.error('Failed to fetch top issues', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FetchTopIssues',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId: socPortalId
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch top issues',
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function POST(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
  
  console.debug('Initiating downtime report submission:', { sessionId, eid, socPortalId, ipAddress, userAgent });
  logger.info('Downtime report submission initiated', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'ReportDowntime',
      details: `User ${socPortalId} starting downtime report`,
      userId: socPortalId,
      ipAddress,
      userAgent
    }
  });

  let connection;
  try {
    const formData = await request.json();
    console.debug('Received form data:', { formData });
    
    logger.debug('Received downtime report data', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DataReceipt',
        details: 'Form data received from client',
        data: {
          ...formData,
          categories: formData.categories?.length || 0,
          categoryTimes: Object.keys(formData.categoryTimes || {}).length,
          startTime: formData.startTime ? new Date(formData.startTime).toISOString() : null,
          endTime: formData.endTime ? new Date(formData.endTime).toISOString() : null
        }
      }
    });

    // Process multiple selection fields
    const processedData = {
      ...formData,
      affectedChannel: processMultiSelectField(formData.affectedChannel),
      affectedPersona: processMultiSelectField(formData.affectedPersona),
      affectedMNO: processMultiSelectField(formData.affectedMNO),
      affectedPortal: processMultiSelectField(formData.affectedPortal),
      affectedType: processMultiSelectField(formData.affectedType),
      affectedService: processMultiSelectField(formData.affectedService)
    };

    console.debug('Processed form data:', { processedData });

    // Validate required fields
    const requiredFields = [
      'issueTitle', 'impactType', 'modality', 'startTime', 
      'endTime', 'concern', 'reason', 'resolution',
      'systemUnavailability', 'trackedBy'
    ];
    
    const missingFields = requiredFields.filter(field => !processedData[field]);
    
    if (!processedData.categories || processedData.categories.length === 0) {
      missingFields.push('categories');
    }
    
    console.debug('Validation check:', { requiredFields, missingFields });
    
    if (missingFields.length > 0) {
      const message = `Missing required fields: ${missingFields.join(', ')}`;
      console.debug('Validation failed:', { message });
      
      logger.warn('Validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: message,
          missingFields
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Set affected_mno based on channels
const affectedChannels = processedData.affectedChannel.split(',');
let affectedMno = 'N/A'; // Default to N/A

if (affectedChannels.includes('ALL')) {
  // If channel is ALL, set MNO to ALL
  affectedMno = 'ALL';
  console.debug('Channel is ALL, setting affectedMno to ALL');
} else {
  // Check if selected channels require MNO (USSD or SMS)
  const isUSSDOrSMS = affectedChannels.some(ch => ['USSD', 'SMS'].includes(ch));
  affectedMno = isUSSDOrSMS ? processedData.affectedMNO : 'N/A';
  console.debug('Channel is not ALL, processing MNO:', { isUSSDOrSMS, affectedMno });
}

console.debug('Processed affected_mno:', { affectedChannels, affectedMno });

    // Validate main time range
    const start = DateTime.fromJSDate(new Date(processedData.startTime), { zone: 'utc' });
    const end = DateTime.fromJSDate(new Date(processedData.endTime), { zone: 'utc' });
    console.debug('Validating time range:', { start: start.toISO(), end: end.toISO() });
    
    if (start >= end) {
      const message = 'End time must be after start time';
      console.debug('Time validation failed:', { message });
      
      logger.warn('Time validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: message,
          startTime: processedData.startTime,
          endTime: processedData.endTime
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate category times before starting transaction
    const categoryTimeErrors = [];
    Object.entries(processedData.categoryTimes || {}).forEach(([category, times]) => {
      if (times.startTime && times.endTime) {
        const catStart = new Date(times.startTime);
        const catEnd = new Date(times.endTime);
        
        if (catStart > catEnd) {
          categoryTimeErrors.push(`Category ${category} has end time before start time`);
        }
        
        // Validate against main downtime period
        const mainStart = new Date(processedData.startTime);
        const mainEnd = new Date(processedData.endTime);
        
        if (catStart < mainStart) {
          categoryTimeErrors.push(`Category ${category} start time is before main start time`);
        }
        
        if (catEnd > mainEnd) {
          categoryTimeErrors.push(`Category ${category} end time is after main end time`);
        }
      } else if (!times.startTime || !times.endTime) {
        categoryTimeErrors.push(`Both start and end times are required for ${category}`);
      }
    });

    if (categoryTimeErrors.length > 0) {
      const message = categoryTimeErrors.join('; ');
      console.debug('Category time validation failed:', { message });
      
      logger.warn('Category time validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: message,
          categoryTimeErrors
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        message
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Generate downtime ID
    console.debug('Generating downtime ID');
    const downtimeIdResult = await query("SELECT nextval('downtime_id_seq')");
    const nextVal = downtimeIdResult.rows[0].nextval;
    const downtimeId = `DT${nextVal.toString().padStart(6, '0')}SOCP`;
    
    console.debug('Generated downtime ID:', { downtimeId, nextVal });

    // Generate notification IDs
    console.debug('Generating notification IDs');
    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details');
    const userNotificationId = await generateNotificationId('UN', 'user_notification_details');
    console.debug('Generated notification IDs:', { adminNotificationId, userNotificationId });

    // Get current Dhaka time for created_at and updated_at
    const currentDhakaTime = getCurrentDateTime();
    const currentDhakaTimeTz = `${currentDhakaTime}+06:00`;

    // Start transaction - FIX: Use a single connection variable
    console.debug('Starting database transaction');
    connection = await getDbConnection().connect();
    
    try {
      await connection.query('BEGIN');
      console.debug('Transaction begun');

      // Calculate duration for the main time range
      const diffMs = end.toJSDate() - start.toJSDate();
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);
      const duration = `${diffHrs.toString().padStart(2, '0')}:${diffMins.toString().padStart(2, '0')}:00`;
      console.debug('Calculated main duration:', { duration, diffMs, diffHrs, diffMins });

      // Process each category
      for (const category of processedData.categories) {
        console.debug('Processing category:', { category });
        const categoryTime = processedData.categoryTimes[category] || {};
        
        // Convert UTC times to Dhaka time
        const catStartDateTime = convertToDhakaTime(categoryTime.startTime || processedData.startTime);
        const catEndDateTime = convertToDhakaTime(categoryTime.endTime || processedData.endTime);
        console.debug('Category times converted:', { category, catStartDateTime, catEndDateTime });

        // Extract date from Dhaka time string
        const issueDate = catStartDateTime ? catStartDateTime.substring(0, 10) : formatDate(processedData.startTime);
        console.debug('Extracted issue date:', { issueDate });
        
        // Validate category times (again for safety)
        const catStart = catStartDateTime ? DateTime.fromFormat(catStartDateTime, 'yyyy-MM-dd HH:mm:ss').toJSDate() : start.toJSDate();
        const catEnd = catEndDateTime ? DateTime.fromFormat(catEndDateTime, 'yyyy-MM-dd HH:mm:ss').toJSDate() : end.toJSDate();
        console.debug('Validating category times:', { category, catStart: catStart.toISOString(), catEnd: catEnd.toISOString() });
        
        if (catStart >= catEnd) {
          const message = `Category ${category} has end time before start time`;
          console.debug('Category time validation failed:', { message });
          
          logger.warn('Category time validation failed', {
            meta: {
              eid,
              sid: sessionId,
              taskName: 'Validation',
              details: message,
              category,
              catStartDateTime,
              catEndDateTime
            }
          });
          
          throw new Error(message);
        }
        
        // Calculate duration for this category
        const catDiffMs = catEnd - catStart;
        const catDiffHrs = Math.floor(catDiffMs / 3600000);
        const catDiffMins = Math.floor((catDiffMs % 3600000) / 60000);
        const catDuration = `${catDiffHrs.toString().padStart(2, '0')}:${catDiffMins.toString().padStart(2, '0')}:00`;
        console.debug('Calculated category duration:', { category, duration: catDuration, catDiffMs, catDiffHrs, catDiffMins });

        // Insert into downtime_report_v2 table
        const insertQuery = `
          INSERT INTO downtime_report_v2 (
            downtime_id, issue_date, issue_title, category, 
            affected_channel, affected_persona, affected_mno, 
            affected_portal, affected_type, affected_service, 
            impact_type, modality, reliability_impacted, 
            start_date_time, end_date_time, duration, concern, 
            reason, resolution, service_desk_ticket_id, system_unavailability, tracked_by,
            service_desk_ticket_link, remark, created_at, updated_at
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        `;
        
        const params = [
          downtimeId,
          issueDate,
          processedData.issueTitle,
          category,
          processedData.affectedChannel, // Now contains comma-separated values
          processedData.affectedPersona, // Now contains comma-separated values
          affectedMno || 'N/A', // Processed MNO
          processedData.affectedPortal, // Now contains comma-separated values
          processedData.affectedType, // Now contains comma-separated values
          processedData.affectedService, // Now contains comma-separated values
          processedData.impactType,
          processedData.modality,
          processedData.reliabilityImpacted,
          catStartDateTime,
          catEndDateTime,
          catDuration,
          processedData.concern,
          processedData.reason,
          processedData.resolution,
          processedData.ticketId || null,
          processedData.systemUnavailability,
          processedData.trackedBy,
          processedData.ticketLink || null,
          processedData.remark || null,
          currentDhakaTimeTz,
          currentDhakaTimeTz
        ];
        
        console.debug('Preparing to insert category record:', { category, params, paramCount: params.length });
        await connection.query(insertQuery, params);
        
        console.debug('Inserted category record:', { category, downtimeId });
        logger.debug('Category record inserted', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'Database',
            details: `Inserted record for category: ${category}`,
            downtimeId,
            category,
            startDateTime: catStartDateTime,
            endDateTime: catEndDateTime,
            ticketId: processedData.ticketId || null,
            ticketLink: processedData.ticketLink || null,
            affectedChannel: processedData.affectedChannel,
            affectedService: processedData.affectedService
          }
        });
      }
      
      console.debug('Completed processing all categories:', { categories: processedData.categories });
      logger.info('All records inserted', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Database',
          details: `Inserted ${processedData.categories.length} records`,
          downtimeId,
          categories: processedData.categories,
          affectedChannel: processedData.affectedChannel,
          affectedService: processedData.affectedService
        }
      });

      // Create admin notification
      const adminNotificationQuery = `
        INSERT INTO admin_notification_details (
          notification_id, title, status
        )
        VALUES ($1, $2, $3)
      `;

      const adminNotifParams = [
        adminNotificationId,
        `New Downtime Reported: ${processedData.issueTitle} By ${processedData.trackedBy}`,
        'Unread'
      ];

      console.debug('Creating admin notification:', { adminNotificationId, title: adminNotifParams[1] });
      await connection.query(adminNotificationQuery, adminNotifParams);

      // Create user notification
      const userNotificationQuery = `
        INSERT INTO user_notification_details (
          notification_id, title, status, soc_portal_id
        )
        VALUES ($1, $2, $3, $4)
      `;

      const userNotifParams = [
        userNotificationId,
        `Added New Downtime Report: ${processedData.issueTitle}`,
        'Unread',
        socPortalId
      ];

      console.debug('Creating user notification:', { userNotificationId, title: userNotifParams[1], socPortalId });
      await connection.query(userNotificationQuery, userNotifParams);

      console.debug('Notifications created:', { adminNotificationId, userNotificationId });
      logger.info('Notifications created', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Notification',
          details: `Created notifications for downtime ${downtimeId}`,
          adminNotificationId,
          userNotificationId,
          socPortalId
        }
      });

      // Log activity
      const activityLogQuery = `
        INSERT INTO user_activity_log (
          soc_portal_id, action, description, eid, sid, ip_address, device_info
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      const activityParams = [
        socPortalId,
        'REPORT_DOWNTIME',
        `Reported downtime for ${processedData.issueTitle} (${processedData.categories.length} categories) - Channels: ${processedData.affectedChannel}, Services: ${processedData.affectedService}`,
        eid,
        sessionId,
        ipAddress,
        userAgent
      ];
      
      console.debug('Logging user activity:', { activityParams });
      await connection.query(activityLogQuery, activityParams);
      
      console.debug('Activity logged successfully');
      logger.info('Activity logged', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'ActivityLog',
          details: `User activity recorded for downtime ${downtimeId}`,
          ipAddress,
          userAgent
        }
      });
      
      // Commit transaction
      console.debug('Committing transaction');
      await connection.query('COMMIT');
      
      console.debug('Transaction committed successfully');
      logger.info('Transaction committed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Database',
          details: 'Transaction successfully committed'
        }
      });
      
      // Only send Telegram alert after successful database insertion
      try {
        const successMessage = formatDowntimeAlert(
          downtimeId,
          processedData.issueTitle,
          formatDate(processedData.startTime),
          formatDateTime(processedData.startTime),
          formatDateTime(processedData.endTime),
          duration,
          processedData.categories,
          ipAddress,
          userAgent,
          { 
            eid,
            status: 'Successful',
            userId: socPortalId,
            affectedChannel: processedData.affectedChannel,
            affectedService: processedData.affectedService,
            affectedPersona: processedData.affectedPersona || 'N/A',
            affectedMno: affectedMno || 'N/A',
            affectedPortal: processedData.affectedPortal || 'N/A',
            affectedType: processedData.affectedType || 'N/A',
            impactType: processedData.impactType,
            modality: processedData.modality,
            reliabilityImpacted: processedData.reliabilityImpacted || 'N/A',
            concern: processedData.concern,
            reason: processedData.reason,
            resolution: processedData.resolution,
            systemUnavailability: processedData.systemUnavailability,
            trackedBy: processedData.trackedBy,
            serviceDeskTicketId: processedData.ticketId || 'N/A',
            serviceDeskTicketLink: processedData.ticketLink || 'N/A',
            remark: processedData.remark || 'N/A'
          }
        );
        
        console.debug('Sending Telegram alert:', { successMessage });
        await sendTelegramAlert(successMessage);
        console.debug('Telegram alert sent successfully');
      } catch (telegramError) {
        console.error('Failed to send Telegram alert:', telegramError);
        // Don't fail the request if Telegram fails, just log it
        logger.error('Telegram alert failed', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'TelegramAlert',
            details: `Telegram alert failed: ${telegramError.message}`,
            downtimeId
          }
        });
      }
      
      console.debug('Downtime report processed successfully:', { 
        downtimeId, 
        categoriesCount: processedData.categories.length,
        affectedChannel: processedData.affectedChannel,
        affectedService: processedData.affectedService
      });

      // ✅ SUCCESS RESPONSE - Return proper JSON
      return new Response(JSON.stringify({
        success: true,
        message: 'Downtime reported successfully',
        downtimeId,
        categoriesCount: processedData.categories.length
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
    } catch (error) {
      console.error('Error in downtime report processing:', { error: error.message, stack: error.stack });
      
      // Rollback transaction if connection exists
      if (connection) {
        try {
          console.debug('Attempting to rollback transaction');
          await connection.query('ROLLBACK');
          console.debug('Transaction rolled back successfully');
        } catch (rollbackError) {
          console.error('Rollback failed:', { error: rollbackError.message });
        }
      }
      
      console.error('Downtime report failed:', { error: error.message });
      
      // ✅ ERROR RESPONSE - Return proper JSON
      return new Response(JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Error parsing form data:', { error: error.message, stack: error.stack });
    
    // ✅ ERROR RESPONSE - Return proper JSON
    return new Response(JSON.stringify({
      success: false,
      message: 'Invalid form data',
      error: error.message
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } finally {
    // ✅ FIX: Release connection only once, and only if it exists
    if (connection) {
      try {
        connection.release();
        console.debug('Database client released successfully');
      } catch (releaseError) {
        console.error('Error releasing database connection:', releaseError.message);
        // Don't throw error in finally block
      }
    }
  }
}