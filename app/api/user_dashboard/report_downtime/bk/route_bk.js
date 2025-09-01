// app/api/user_dashboard/report_downtime/route.js
import { query } from '../../../../lib/db';
import logger from '../../../../lib/logger';
import sendTelegramAlert from '../../../../lib/telegramAlert';
import { DateTime } from 'luxon';

// Helper function to get current time in Dhaka timezone
const getCurrentDateTime = () => {
  const now = DateTime.now().setZone('Asia/Dhaka');
  return now.toFormat("yyyy-LL-dd hh:mm:ss a") + ' (' + now.offsetNameShort + ')';
};

// Format date as DD/MM/YYYY
const formatDate = (date) => {
  return date ? new Date(date).toLocaleDateString('en-GB') : 'N/A';
};

// Format date/time as DD/MM/YYYY HH:MM
const formatDateTime = (date) => {
  return date ? new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) : 'N/A';
};

// Format Telegram alert message for downtime
const formatDowntimeAlert = (downtimeId, issueTitle, issueDate, startTime, endTime, duration, categories, ipAddress, userAgent, additionalInfo = {}) => {
  const time = getCurrentDateTime();
  const userId = additionalInfo.userId || 'N/A';
  const status = additionalInfo.status || 'Reported';
  const eid = additionalInfo.eid || 'N/A';

  return `⚠️ SOC PORTAL | DOWNTIME REPORTED ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 Downtime ID    : ${downtimeId}
📛 Issue Title         : ${issueTitle}
📅 Issue Date         : ${issueDate}
⏰ Start Time         : ${startTime}
⏱️ End Time           : ${endTime}
⏳ Duration           : ${duration}
📦 Categories        : ${categories.join(', ')}
👤 Reported By     : ${userId}
🌐 IP Address        : ${ipAddress}
🖥️ Device Info       : ${userAgent}
🔖 EID                    : ${eid}
🕒 Report Time     : ${time}
✅ Status               : ${status}`;
};

// Generate next notification ID based on serial column
const generateNotificationId = async (prefix, table) => {
  try {
    const result = await query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(4, '0');
    return `${prefix}${nextId}SOCP`;
  } catch (error) {
    throw new Error(`Error generating notification ID: ${error.message}`);
  }
};

// Add this helper function to convert UTC to Dhaka time
const convertToDhakaTime = (utcDateTime) => {
  if (!utcDateTime) return null;
  
  try {
    const date = new Date(utcDateTime);
    // Dhaka is UTC+6
    const dhakaTime = new Date(date.getTime() + 6 * 60 * 60 * 1000);
    return dhakaTime.toISOString().replace('T', ' ').substring(0, 19);
  } catch (error) {
    console.error('Error converting to Dhaka time:', utcDateTime, error);
    return utcDateTime;
  }
};

export async function POST(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
  
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

  try {
    const formData = await request.json();
    
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

    // Validate required fields
    const requiredFields = [
      'issueTitle', 'impactedService', 
      'impactType', 'modality', 'startTime', 
      'endTime', 'concern', 'reason', 
      'resolution', 'systemUnavailability', 'trackedBy'
    ];
    
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    // Validate categories
    if (!formData.categories || formData.categories.length === 0) {
      missingFields.push('categories');
    }
    
    if (missingFields.length > 0) {
      const message = `Missing required fields: ${missingFields.join(', ')}`;
      
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

    // Validate main time range
    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    
    if (start >= end) {
      const message = 'End time must be after start time';
      
      logger.warn('Time validation failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Validation',
          details: message,
          startTime: formData.startTime,
          endTime: formData.endTime
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
    const downtimeIdResult = await query("SELECT nextval('downtime_id_seq')");
    const nextVal = downtimeIdResult.rows[0].nextval;
    const downtimeId = `DT${nextVal.toString().padStart(6, '0')}SOCP`;
    
    logger.debug('Downtime ID generated', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'IDGeneration',
        downtimeId
      }
    });

    // Generate notification IDs
    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details');
    const userNotificationId = await generateNotificationId('UN', 'user_notification_details');

    // Start Downtime Track
    await query('BEGIN');
    
    logger.info('Downtime track tarted', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'Database',
        details: 'Beginning database Downtime track'
      }
    });

    // Process each category
    for (const category of formData.categories) {
      const categoryTime = formData.categoryTimes[category] || {};
      
      // Convert UTC times to Dhaka time (UTC+6)
      const catStartDateTime = convertToDhakaTime(categoryTime.startTime || formData.startTime);
      const catEndDateTime = convertToDhakaTime(categoryTime.endTime || formData.endTime);

      // Extract date from Dhaka time string (YYYY-MM-DD format)
      const issueDate = catStartDateTime.substring(0, 10);
      
      // Validate category times
      const catStart = new Date(catStartDateTime);
      const catEnd = new Date(catEndDateTime);
      
      if (catStart >= catEnd) {
        const message = `Category ${category} has end time before start time`;
        
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
        
        // Rollback Downtime track
        await query('ROLLBACK');
        
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
      
      // Calculate duration for this category
      const diffMs = catEnd - catStart;
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);
      const duration = `${diffHrs.toString().padStart(2, '0')}:${diffMins.toString().padStart(2, '0')}:00`;
      
      logger.debug('Duration calculated for category', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'DurationCalculation',
          category,
          duration,
          catStartDateTime: new Date(catStartDateTime).toISOString(),
          catEndDateTime: new Date(catEndDateTime).toISOString()
        }
      });

      
      const insertQuery = `
        INSERT INTO downtime_report (
          downtime_id, issue_date, issue_title, category, impacted_service, 
          impact_type, modality, reliability_impacted, 
          start_date_time, end_date_time, duration, concern, 
          reason, resolution, service_desk_ticket_id, system_unavailability, tracked_by,
          service_desk_ticket_link
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `;
      
      const params = [
        downtimeId,
        issueDate,  // Dhaka time date part
        formData.issueTitle,
        category,
        formData.impactedService,
        formData.impactType,
        formData.modality,
        formData.reliabilityImpacted,
        catStartDateTime,  // Full Dhaka datetime
        catEndDateTime,    // Full Dhaka datetime
        duration,
        formData.concern,
        formData.reason,
        formData.resolution,
        formData.ticketId || 'N/A',
        formData.systemUnavailability,
        formData.trackedBy,
        formData.ticketLink || null
      ];
      
      await query(insertQuery, params);
      
      logger.debug('Category record inserted', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Database',
          details: `Inserted record for category: ${category}`,
          downtimeId,
          category,
          startDateTime: new Date(catStartDateTime).toISOString(),
          endDateTime: new Date(catEndDateTime).toISOString(),
          ticketId: formData.ticketId || 'N/A',
          ticketLink: formData.ticketLink || null
        }
      });
    }
    
    logger.info('All records inserted', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'Database',
        details: `Inserted ${formData.categories.length} records`,
        downtimeId,
        categories: formData.categories
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
      `New Downtime Reported: ${formData.issueTitle}`,
      'Unread'
    ];
    
    await query(adminNotificationQuery, adminNotifParams);
    
    // Create user notification
    const userNotificationQuery = `
      INSERT INTO user_notification_details (
        notification_id, title, status
      )
      VALUES ($1, $2, $3)
    `;
    
    const userNotifParams = [
      userNotificationId,
      `Your downtime report submitted: ${formData.issueTitle}`,
      'Unread'
    ];
    
    await query(userNotificationQuery, userNotifParams);
    
    logger.info('Notifications created', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'Notification',
        details: `Created notifications for downtime ${downtimeId}`,
        adminNotificationId,
        userNotificationId
      }
    });

    // Log activity with IP and device info
    const activityLogQuery = `
      INSERT INTO user_activity_log (
        soc_portal_id, action, description, eid, sid, ip_address, device_info
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    const activityParams = [
      socPortalId,
      'REPORT_DOWNTIME',
      `Reported downtime for ${formData.issueTitle} (${formData.categories.length} categories)`,
      eid,
      sessionId,
      ipAddress,
      userAgent
    ];
    
    await query(activityLogQuery, activityParams);
    
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
    
    // Commit Downtime track
    await query('COMMIT');
    
    logger.info('Downtime track committed', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'Database',
        details: 'Downtime track successfully committed'
      }
    });
    
    // Send Telegram alert
    const successMessage = formatDowntimeAlert(
      downtimeId,
      formData.issueTitle,
      formatDate(formData.startTime),
      formatDateTime(formData.startTime),
      formatDateTime(formData.endTime),
      formData.duration,
      formData.categories,
      ipAddress,
      userAgent,
      { 
        eid, 
        status: 'Successful',
        userId: socPortalId
      }
    );
    
    await sendTelegramAlert(successMessage);
    
    // Success log
    logger.info('Downtime reported successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'ReportSuccess',
        details: `Report ID: ${downtimeId} | Categories: ${formData.categories.length}`,
        userId: socPortalId,
        downtimeId,
        telegramMessage: successMessage
      }
    });
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Downtime reported successfully',
      downtimeId,
      categoriesCount: formData.categories.length
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    // Rollback Downtime track on error
    try {
      await query('ROLLBACK');
      logger.warn('Downtime track rolled back', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'Database',
          details: 'Downtime track rolled back due to error'
        }
      });
    } catch (rollbackError) {
      logger.error('Rollback failed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'DatabaseError',
          details: `Rollback error: ${rollbackError.message}`,
          stack: rollbackError.stack
        }
      });
    }
    
    // Format error message for Telegram
    const errorMessage = formatDowntimeAlert(
      'N/A',
      formData?.issueTitle || 'No title',
      formData?.startTime ? formatDate(formData.startTime) : 'N/A',
      formData?.startTime ? formatDateTime(formData.startTime) : 'N/A',
      formData?.endTime ? formatDateTime(formData.endTime) : 'N/A',
      formData?.duration || 'N/A',
      formData?.categories || [],
      ipAddress,
      userAgent,
      { 
        eid, 
        status: `Failed: ${error.message}`,
        userId: socPortalId
      }
    );
    
    await sendTelegramAlert(errorMessage);
    
    logger.error('Downtime report failed', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SystemError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId: socPortalId,
        telegramMessage: errorMessage
      }
    });
    
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
}

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  logger.info('Fetching top issues', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'GetTopIssues',
      userId: socPortalId,
      ipAddress,
      userAgent
    }
  });

  try {
    // Get top issues only
    const topIssuesResult = await query(`
      SELECT 
        issue_title, 
        COUNT(DISTINCT downtime_id) as incident_count
      FROM downtime_report 
      GROUP BY issue_title 
      ORDER BY incident_count DESC 
      LIMIT 5
    `);
    
    logger.info('Top issues retrieved', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GetTopIssues',
        count: topIssuesResult.rows.length
      }
    });
    
    return new Response(JSON.stringify({
      success: true,
      topIssues: topIssuesResult.rows
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    logger.error('Failed to fetch top issues', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DatabaseError',
        details: error.message,
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