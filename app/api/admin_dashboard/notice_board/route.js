// app/api/admin_dashboard/notice_board/route.js
import { NextResponse } from 'next/server';
import { query, getDbConnection } from '../../../../lib/db';
import logger from '../../../../lib/logger';
import sendTelegramAlert from '../../../../lib/telegramAlert';
import path from 'path';
import fs from 'fs/promises';
import { getClientIP } from '../../../../lib/utils/ipUtils';
import { DateTime } from 'luxon';

// Generate sequential notice ID
const generateSequentialNoticeId = async (client) => {
  try {
    logger.debug('Starting notice ID generation', {
      meta: {
        task: 'GenerateNoticeID',
        details: 'Querying maximum serial from notice_board'
      }
    });

    const result = await client.query('SELECT MAX(serial) AS max_serial FROM notice_board');
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(2, '0');
    const noticeId = `NB${nextId}SOCP`;

    logger.debug('Notice ID generated successfully', {
      meta: {
        task: 'GenerateNoticeID',
        details: `Generated notice ID: ${noticeId}`,
        maxSerial,
        nextId
      }
    });

    return noticeId;
  } catch (error) {
    const errorMsg = `Error generating notice ID: ${error.message}`;
    logger.error(errorMsg, {
      meta: {
        task: 'GenerateNoticeID',
        details: 'Failed to generate sequential notice ID',
        error: error.message,
        stack: error.stack
      }
    });
    throw new Error(errorMsg);
  }
};

// Generate sequential notification IDs
const generateSequentialNotificationId = async (prefix, table, count = 1) => {
  try {
    logger.debug('Starting notification ID generation', {
      meta: {
        task: 'GenerateNotificationID',
        details: `Generating ${count} IDs for table: ${table}, prefix: ${prefix}`
      }
    });

    const result = await query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    
    const notificationIds = [];
    for (let i = 1; i <= count; i++) {
      const nextId = (maxSerial + i).toString().padStart(4, '0');
      notificationIds.push(`${prefix}${nextId}SOCP`);
    }

    const resultIds = count === 1 ? notificationIds[0] : notificationIds;

    logger.debug('Notification IDs generated successfully', {
      meta: {
        task: 'GenerateNotificationID',
        details: `Generated ${count} notification IDs`,
        prefix,
        table,
        maxSerial,
        count,
        notificationIds: resultIds
      }
    });
    
    return resultIds;
  } catch (error) {
    const errorMsg = `Error generating sequential notification ID: ${error.message}`;
    logger.error(errorMsg, {
      meta: {
        task: 'GenerateNotificationID',
        details: 'Failed to generate sequential notification IDs',
        error: error.message,
        prefix,
        table,
        count,
        stack: error.stack
      }
    });
    throw new Error(errorMsg);
  }
};

// Save notice file
const saveNoticeFile = async (file, fileName, subfolder = '') => {
  try {
    logger.debug('Starting file save process', {
      meta: {
        task: 'SaveNoticeFile',
        details: `Saving file: ${fileName} to folder: ${subfolder}`,
        fileName,
        subfolder,
        fileSize: file.size,
        fileType: file.type
      }
    });

    const uploadDir = '/home/soc_portal/storage/notice_board';
    const fullUploadDir = path.join(uploadDir, subfolder);
    const filePath = path.join(fullUploadDir, fileName);

    logger.debug('Creating directory if not exists', {
      meta: {
        task: 'SaveNoticeFile',
        details: `Ensuring directory exists: ${fullUploadDir}`
      }
    });

    await fs.mkdir(fullUploadDir, { recursive: true, mode: 0o755 });

    logger.debug('Writing file to disk', {
      meta: {
        task: 'SaveNoticeFile',
        details: `Writing buffer to: ${filePath}`,
        bufferSize: file.size
      }
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    await fs.chmod(filePath, 0o644);

    // Change ownership to nginx user
    try {
      logger.debug('Changing file ownership', {
        meta: {
          task: 'SaveNoticeFile',
          details: `Changing ownership to nginx:nginx for ${filePath}`
        }
      });

      const { execSync } = require('child_process');
      execSync(`chown nginx:nginx "${filePath}"`);

      logger.debug('File ownership changed successfully', {
        meta: {
          task: 'SaveNoticeFile',
          details: 'Ownership changed to nginx:nginx'
        }
      });
    } catch (chownError) {
      logger.warn('Could not change file ownership', {
        meta: {
          task: 'SaveNoticeFile',
          details: `Ownership change failed: ${chownError.message}`,
          error: chownError.message
        }
      });
    }

    // Force file system sync
    try {
      logger.debug('Syncing file system', {
        meta: {
          task: 'SaveNoticeFile',
          details: 'Forcing file system sync'
        }
      });

      const { execSync } = require('child_process');
      execSync('sync', { stdio: 'inherit' });

      logger.debug('File system sync completed', {
        meta: {
          task: 'SaveNoticeFile',
          details: 'File system synced successfully'
        }
      });
    } catch (syncError) {
      logger.warn('File system sync failed', {
        meta: {
          task: 'SaveNoticeFile',
          details: `File sync failed: ${syncError.message}`,
          error: syncError.message
        }
      });
    }

    const fileUrl = `/api/admin_dashboard/notice_board/storage/${subfolder ? subfolder + '/' : ''}${fileName}`;

    logger.info('File saved successfully', {
      meta: {
        task: 'SaveNoticeFile',
        details: `File saved to: ${fileUrl}`,
        fileName,
        subfolder,
        fileSize: file.size,
        fileUrl
      }
    });

    return fileUrl;
  } catch (error) {
    const errorMsg = `File save failed: ${error.message}`;
    logger.error(errorMsg, {
      meta: {
        task: 'SaveNoticeFile',
        details: 'Failed to save notice file',
        fileName,
        subfolder,
        fileSize: file?.size,
        fileType: file?.type,
        error: error.message,
        stack: error.stack
      }
    });
    throw new Error(errorMsg);
  }
};

export async function POST(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  logger.info('Notice creation request initiated', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'NoticeCreationStart',
      details: `Admin ${userId} starting notice creation process`,
      userId,
      ipAddress,
      userAgent
    }
  });

  let client;
  const startTime = Date.now();
  
  try {
    logger.debug('Parsing form data', {
      meta: {
        task: 'ParseFormData',
        details: 'Starting form data parsing'
      }
    });

    const formData = await request.formData();
    
    const title = formData.get('title');
    const description = formData.get('description');
    const from_datetime = formData.get('from_datetime');
    const to_datetime = formData.get('to_datetime');
    const imageFile = formData.get('image');
    const pdfFile = formData.get('pdf');

    logger.debug('Form data parsed successfully', {
      meta: {
        task: 'ParseFormData',
        details: 'Form data extracted',
        titleLength: title?.length,
        descriptionLength: description?.length,
        from_datetime,
        to_datetime,
        hasImage: !!imageFile,
        hasPDF: !!pdfFile,
        imageSize: imageFile?.size,
        pdfSize: pdfFile?.size
      }
    });

    // Validate required fields
    logger.debug('Validating required fields', {
      meta: {
        task: 'ValidateFields',
        details: 'Checking required fields'
      }
    });

    if (!title || !description || !from_datetime || !to_datetime) {
      const errorMsg = 'Missing required fields in notice creation';
      logger.error(errorMsg, {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'NoticeCreationValidation',
          details: 'Required fields validation failed',
          userId,
          title: !!title,
          description: !!description,
          from_datetime: !!from_datetime,
          to_datetime: !!to_datetime
        }
      });

      return NextResponse.json(
        { success: false, message: 'All required fields must be filled' },
        { status: 400 }
      );
    }

    // Validate date range
    logger.debug('Validating date range', {
      meta: {
        task: 'ValidateDateRange',
        details: 'Checking from_datetime and to_datetime'
      }
    });

    const fromDate = new Date(from_datetime);
    const toDate = new Date(to_datetime);
    if (fromDate >= toDate) {
      const errorMsg = 'Invalid date range: End date must be after start date';
      logger.error(errorMsg, {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'NoticeCreationValidation',
          details: 'Date range validation failed',
          userId,
          from_datetime,
          to_datetime,
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString()
        }
      });

      return NextResponse.json(
        { success: false, message: 'End date must be after start date' },
        { status: 400 }
      );
    }

    logger.debug('Date range validation passed', {
      meta: {
        task: 'ValidateDateRange',
        details: 'Date range is valid',
        from_datetime,
        to_datetime
      }
    });

    // Get admin info from admin_info table - FIXED: Use soc_portal_id instead of short_name
    logger.debug('Fetching admin information', {
      meta: {
        task: 'GetAdminInfo',
        details: `Querying admin info for: ${userId}`
      }
    });

    const adminResult = await query(
      'SELECT soc_portal_id, email FROM admin_info WHERE soc_portal_id = $1',
      [userId]
    );

    if (adminResult.rows.length === 0) {
      const errorMsg = `Admin not found: ${userId}`;
      logger.error(errorMsg, {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'NoticeCreationAdminError',
          details: 'Admin not found in admin_info table',
          userId
        }
      });

      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404 }
      );
    }

    const adminData = adminResult.rows[0];
    logger.debug('Admin information retrieved', {
      meta: {
        task: 'GetAdminInfo',
        details: 'Admin data fetched successfully',
        socPortalId: adminData.soc_portal_id,
        email: adminData.email
      }
    });

    // Start database transaction
    logger.debug('Starting database transaction', {
      meta: {
        task: 'StartTransaction',
        details: 'Connecting to database and starting transaction'
      }
    });

    client = await getDbConnection();
    await client.query('BEGIN');

    logger.info('Database transaction started', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'NoticeTransactionStart',
        details: 'Database transaction initiated for notice creation',
        userId
      }
    });

    // Generate notice ID
    logger.debug('Generating notice ID', {
      meta: {
        task: 'GenerateNoticeID',
        details: 'Creating sequential notice ID'
      }
    });

    const noticeId = await generateSequentialNoticeId(client);

    logger.info('Notice ID generated', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'NoticeIDGenerated',
        details: `Notice ID generated: ${noticeId}`,
        userId,
        noticeId
      }
    });

    // Handle file uploads
    let imageUrl = null;
    let pdfUrl = null;

    // Process image file
    if (imageFile && imageFile.size > 0) {
      logger.debug('Processing image file', {
        meta: {
          task: 'ProcessImageFile',
          details: 'Starting image file upload',
          fileName: imageFile.name,
          fileSize: imageFile.size,
          fileType: imageFile.type
        }
      });

      const imageExtension = path.extname(imageFile.name);
      const imageFileName = `${noticeId}_image${imageExtension}`;
      imageUrl = await saveNoticeFile(imageFile, imageFileName, 'images');

      logger.info('Image file processed successfully', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'ImageFileSaved',
          details: `Image saved with URL: ${imageUrl}`,
          userId,
          noticeId,
          imageUrl
        }
      });
    } else {
      logger.debug('No image file provided', {
        meta: {
          task: 'ProcessImageFile',
          details: 'Image file is empty or not provided'
        }
      });
    }

    // Process PDF file
    if (pdfFile && pdfFile.size > 0) {
      logger.debug('Processing PDF file', {
        meta: {
          task: 'ProcessPDFFile',
          details: 'Starting PDF file upload',
          fileName: pdfFile.name,
          fileSize: pdfFile.size,
          fileType: pdfFile.type
        }
      });

      const pdfExtension = path.extname(pdfFile.name);
      const pdfFileName = `${noticeId}_document${pdfExtension}`;
      pdfUrl = await saveNoticeFile(pdfFile, pdfFileName, 'documents');

      logger.info('PDF file processed successfully', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'PDFFileSaved',
          details: `PDF saved with URL: ${pdfUrl}`,
          userId,
          noticeId,
          pdfUrl
        }
      });
    } else {
      logger.debug('No PDF file provided', {
        meta: {
          task: 'ProcessPDFFile',
          details: 'PDF file is empty or not provided'
        }
      });
    }

    // Insert notice into database
    logger.debug('Inserting notice into database', {
      meta: {
        task: 'InsertNotice',
        details: 'Executing INSERT query for notice_board',
        noticeId,
        title,
        descriptionLength: description.length,
        from_datetime,
        to_datetime,
        imageUrl: !!imageUrl,
        pdfUrl: !!pdfUrl
      }
    });

    const insertQuery = `
      INSERT INTO notice_board (
        notice_id, from_datetime, to_datetime, title, description, 
        image_url, pdf_url, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const insertResult = await client.query(insertQuery, [
      noticeId,
      from_datetime,
      to_datetime,
      title,
      description,
      imageUrl,
      pdfUrl,
      userId
    ]);

    logger.info('Notice inserted into database', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'NoticeInserted',
        details: `Notice record created with ID: ${noticeId}`,
        userId,
        noticeId,
        title,
        hasImage: !!imageUrl,
        hasPDF: !!pdfUrl
      }
    });

    // Generate admin notification ID
    logger.debug('Generating admin notification ID', {
      meta: {
        task: 'GenerateAdminNotification',
        details: 'Creating admin notification for the notice'
      }
    });

    const adminNotificationId = await generateSequentialNotificationId('AN', 'admin_notification_details');
    
    // Create admin notification
    await client.query(
      `INSERT INTO admin_notification_details (notification_id, title, status)
       VALUES ($1, $2, $3)`,
      [
        adminNotificationId,
        `New Notice Published: ${title}`,
        'Unread'
      ]
    );

    logger.info('Admin notification created', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AdminNotificationCreated',
        details: `Admin notification created: ${adminNotificationId}`,
        userId,
        noticeId,
        adminNotificationId
      }
    });

    // Get all active users to notify
    logger.debug('Fetching active users for notifications', {
      meta: {
        task: 'GetActiveUsers',
        details: 'Querying all active users to send notifications'
      }
    });

    const usersResult = await client.query(
      'SELECT soc_portal_id FROM user_info WHERE status = $1',
      ['Active']
    );

    const usersToNotify = usersResult.rows;
    
    logger.debug('Active users retrieved', {
      meta: {
        task: 'GetActiveUsers',
        details: `Found ${usersToNotify.length} active users to notify`,
        userCount: usersToNotify.length
      }
    });

    // Generate user notification IDs
    logger.debug('Generating user notification IDs', {
      meta: {
        task: 'GenerateUserNotifications',
        details: `Creating ${usersToNotify.length} user notification IDs`
      }
    });

    const userNotificationIds = await generateSequentialNotificationId(
      'UN', 
      'user_notification_details', 
      usersToNotify.length
    );

    // Create notifications for all users
    logger.debug('Creating user notifications', {
      meta: {
        task: 'CreateUserNotifications',
        details: 'Inserting notification records for all active users'
      }
    });

    let notificationCount = 0;
    for (let i = 0; i < usersToNotify.length; i++) {
      const user = usersToNotify[i];
      const notificationId = userNotificationIds[i];
      
      await client.query(
        `INSERT INTO user_notification_details 
         (notification_id, title, status, soc_portal_id)
         VALUES ($1, $2, $3, $4)`,
        [
          notificationId,
          `📢 New Notice: ${title}`,
          'Unread',
          user.soc_portal_id
        ]
      );
      
      notificationCount++;
      
      // Log every 10th notification for progress tracking
      if (notificationCount % 10 === 0) {
        logger.debug('Notification creation progress', {
          meta: {
            task: 'CreateUserNotifications',
            details: `Created ${notificationCount}/${usersToNotify.length} notifications`
          }
        });
      }
    }

    logger.info('User notifications created', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UserNotificationsCreated',
        details: `Created ${notificationCount} user notifications`,
        userId,
        noticeId,
        notificationCount
      }
    });

    // Log admin activity
    logger.debug('Creating activity log entry', {
      meta: {
        task: 'CreateActivityLog',
        details: 'Inserting activity log record'
      }
    });

    await client.query(
      `INSERT INTO user_activity_log 
       (soc_portal_id, action, description, ip_address, device_info, eid, sid)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        'NOTICE_PUBLISHED',
        `Published notice: ${title} (${noticeId})`,
        ipAddress,
        userAgent,
        eid,
        sessionId
      ]
    );

    logger.info('Activity log created', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'ActivityLogged',
        details: 'Admin activity logged for notice publication',
        userId,
        noticeId
      }
    });

    // Commit transaction
    logger.debug('Committing database transaction', {
      meta: {
        task: 'CommitTransaction',
        details: 'Finalizing all database changes'
      }
    });

    await client.query('COMMIT');

    logger.info('Database transaction committed', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'TransactionCommitted',
        details: 'All database changes committed successfully',
        userId,
        noticeId
      }
    });

    // Send Telegram alert - FIXED: Use soc_portal_id instead of short_name
    logger.debug('Sending Telegram alert', {
      meta: {
        task: 'SendTelegramAlert',
        details: 'Preparing and sending Telegram notification'
      }
    });

    const telegramMessage = `📢 **SOC PORTAL | NOTICE PUBLISHED** 📢
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 **Title:** ${title}
👤 **Published By:** ${adminData.soc_portal_id}
🆔 **Notice ID:** ${noticeId}
📅 **From:** ${new Date(from_datetime).toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}
📅 **To:** ${new Date(to_datetime).toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}
🔔 **Users Notified:** ${usersToNotify.length}
🌐 **IP Address:** ${ipAddress}
🕒 **Time:** ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}`;

    await sendTelegramAlert(telegramMessage);

    logger.info('Telegram alert sent', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'TelegramAlertSent',
        details: 'Telegram notification delivered successfully',
        userId,
        noticeId,
        usersNotified: usersToNotify.length
      }
    });

    // Final success log
    logger.info('Notice published successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'NoticePublished',
        details: `Notice ${noticeId} published successfully by admin ${userId}`,
        userId,
        noticeId,
        title,
        usersNotified: usersToNotify.length,
        hasImage: !!imageUrl,
        hasPDF: !!pdfUrl,
        ipAddress,
        processingTime: `${Date.now() - startTime}ms`
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Notice published successfully and users notified',
      data: {
        notice_id: noticeId,
        ...insertResult.rows[0]
      }
    });

  } catch (error) {
    if (client) {
      try {
        logger.debug('Rolling back database transaction', {
          meta: {
            task: 'RollbackTransaction',
            details: 'Starting transaction rollback due to error'
          }
        });

        await client.query('ROLLBACK');

        logger.warn('Database transaction rolled back', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'TransactionRolledBack',
            details: 'Transaction rolled back due to error',
            userId,
            error: error.message
          }
        });
      } catch (rollbackError) {
        logger.error('Rollback failed', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'RollbackFailed',
            details: 'Database rollback operation failed',
            userId,
            rollbackError: rollbackError.message,
            originalError: error.message
          }
        });
      }
    }
    
    logger.error('Failed to publish notice', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'NoticePublishError',
        details: `Error during notice publication: ${error.message}`,
        userId,
        error: error.message,
        stack: error.stack,
        processingTime: `${Date.now() - startTime}ms`
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to publish notice: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (client && typeof client.release === 'function') {
      logger.debug('Releasing database connection', {
        meta: {
          task: 'ReleaseConnection',
          details: 'Releasing database client connection'
        }
      });

      client.release();

      logger.debug('Database connection released', {
        meta: {
          task: 'ReleaseConnection',
          details: 'Database client connection released successfully'
        }
      });
    }
  }
}

// GET - Fetch all notices for admin log
export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';

  logger.info('Notice fetch request initiated', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'NoticeFetchStart',
      details: `Admin ${userId} fetching notices list`,
      userId
    }
  });

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    logger.debug('Processing pagination parameters', {
      meta: {
        task: 'ProcessPagination',
        details: 'Calculating pagination values',
        page,
        limit,
        offset
      }
    });

    const noticeQuery = `
      SELECT 
        nb.*,
        ai.soc_portal_id as created_by_name,
        ai.email as created_by_email
      FROM notice_board nb
      LEFT JOIN admin_info ai ON nb.created_by = ai.soc_portal_id
      ORDER BY nb.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `SELECT COUNT(*) as total FROM notice_board`;

    logger.debug('Executing database queries', {
      meta: {
        task: 'ExecuteQueries',
        details: 'Running notice list and count queries',
        query: noticeQuery,
        countQuery,
        parameters: [limit, offset]
      }
    });

    const [noticeResult, countResult] = await Promise.all([
      query(noticeQuery, [limit, offset]),
      query(countQuery)
    ]);

    logger.debug('Database queries completed', {
      meta: {
        task: 'ExecuteQueries',
        details: 'Queries executed successfully',
        noticeCount: noticeResult.rows.length,
        totalCount: countResult.rows[0]?.total
      }
    });

    const notices = noticeResult.rows.map(notice => ({
      ...notice,
      from_datetime: DateTime.fromJSDate(notice.from_datetime).setZone('Asia/Dhaka').toISO(),
      to_datetime: DateTime.fromJSDate(notice.to_datetime).setZone('Asia/Dhaka').toISO(),
      created_at: DateTime.fromJSDate(notice.created_at).setZone('Asia/Dhaka').toISO(),
    }));

    const responseData = {
      notices,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    };

    logger.info('Notices fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'NoticeFetchSuccess',
        details: `Fetched ${notices.length} notices for admin ${userId}`,
        userId,
        noticeCount: notices.length,
        totalNotices: countResult.rows[0].total,
        page,
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('Failed to fetch notices', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'NoticeFetchError',
        details: `Error fetching notices: ${error.message}`,
        userId,
        error: error.message,
        stack: error.stack
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to fetch notices' },
      { status: 500 }
    );
  }
}