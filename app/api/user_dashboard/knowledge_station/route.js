// app/api/user_dashboard/knowledge_station/route.js
import { NextResponse } from 'next/server';
import { query, getDbConnection } from '../../../../lib/db';
import logger from '../../../../lib/logger';
import sendTelegramAlert from '../../../../lib/telegramAlert';
import path from 'path';
import fs from 'fs/promises';
import { getClientIP } from '../../../../lib/utils/ipUtils';

// Generate KS content ID
const generateKSContentId = async (client) => {
  try {
    const result = await client.query('SELECT MAX(serial) AS max_serial FROM knowledge_station_content');
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(2, '0');
    return `KS${nextId}SOCP`;
  } catch (error) {
    throw new Error(`Error generating KS content ID: ${error.message}`);
  }
};

// Generate unique notification ID
const generateNotificationId = async (client) => {
  try {
    const result = await client.query('SELECT MAX(serial) AS max_serial FROM user_notification_details');
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(6, '0');
    return `UN${nextId}SOCP`;
  } catch (error) {
    // Fallback to timestamp if there's an error
    return `UN${Date.now()}SOCP`;
  }
};

// Save file to knowledge_station storage
const saveKnowledgeFile = async (file, fileName, subfolder = '') => {
  try {
    // Use absolute path for storage
    const uploadDir = '/home/soc_portal/storage/knowledge_station';
    const fullUploadDir = path.join(uploadDir, subfolder);
    const filePath = path.join(fullUploadDir, fileName);

    // Ensure directory exists
    await fs.mkdir(fullUploadDir, { recursive: true, mode: 0o755 });

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    await fs.chmod(filePath, 0o644);

    // Change ownership to nginx user
    try {
      const { execSync } = require('child_process');
      execSync(`chown nginx:nginx "${filePath}"`);
    } catch (chownError) {
      console.warn('Could not change file ownership:', chownError.message);
    }

    // Force file system sync
    try {
      const { execSync } = require('child_process');
      execSync('sync', { stdio: 'inherit' });
    } catch (syncError) {
      console.warn('File system sync failed:', syncError.message);
    }

    return `/api/user_dashboard/knowledge_station/storage/${subfolder ? subfolder + '/' : ''}${fileName}`;
  } catch (error) {
    throw new Error(`File save failed: ${error.message}`);
  }
};

// Format notification message
const formatNotificationMessage = (action, content, userData, ipAddress) => {
  const time = new Date().toLocaleString('en-BD', { 
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }) + ' (GMT+6)';

  return `📚 **KNOWLEDGE STATION | ${action.toUpperCase()}**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 **Title:** ${content.title}
👤 **Shared By:** ${userData.short_name} (${userData.soc_portal_id})
📧 **Email:** ${userData.email}
🆔 **Content ID:** ${content.ks_content_id}
🔗 **Link:** ${content.external_link || 'N/A'}
⭐ **Important:** ${content.is_important ? 'Yes' : 'No'}
🌐 **IP Address:** ${ipAddress}
🕒 **Time:** ${time}`;
};

// GET - Fetch all knowledge content
export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  try {
    logger.info('Fetching knowledge station content', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'KnowledgeStationFetch',
        details: `User ${socPortalId} fetching knowledge content`,
        userId: socPortalId,
        ipAddress,
        userAgent
      }
    });

    // Get knowledge content with user info and feedback count
    const contentQuery = `
  SELECT 
    ksc.*,
    ui.short_name as upload_by_name,
    ui.email as upload_by_email,
    ui.profile_photo_url as upload_by_profile_photo, -- CORRECT COLUMN NAME
    ui.soc_portal_id as upload_by,
    COALESCE(fb.feedback_count, 0) as feedback_count,
    EXISTS(
      SELECT 1 FROM knowledge_station_saved ks 
      WHERE ks.ks_content_id = ksc.ks_content_id AND ks.soc_portal_id = $1
    ) as is_saved,
    COALESCE(react.user_reaction, 'none') as user_reaction
  FROM knowledge_station_content ksc
  LEFT JOIN user_info ui ON ksc.upload_by = ui.soc_portal_id
  LEFT JOIN (
    SELECT ks_content_id, COUNT(*) as feedback_count 
    FROM knowledge_station_feedback 
    GROUP BY ks_content_id
  ) fb ON ksc.ks_content_id = fb.ks_content_id
  LEFT JOIN (
    SELECT ks_content_id, reaction_type as user_reaction 
    FROM knowledge_station_reactions 
    WHERE soc_portal_id = $1
  ) react ON ksc.ks_content_id = react.ks_content_id
  ORDER BY ksc.created_at DESC
`;

    const contentResult = await query(contentQuery, [socPortalId]);

    // Get feedback for each content
    const contentWithFeedback = await Promise.all(
      contentResult.rows.map(async (content) => {
        const feedbackQuery = `
  SELECT ksf.*, 
    ui.short_name as feedback_by_name, 
    ui.profile_photo_url as feedback_by_profile_photo, -- CORRECT COLUMN NAME
    ui.soc_portal_id as feedback_by
  FROM knowledge_station_feedback ksf
  LEFT JOIN user_info ui ON ksf.feedback_by = ui.soc_portal_id
  WHERE ksf.ks_content_id = $1
  ORDER BY ksf.created_at DESC
`;
        
        const feedbackResult = await query(feedbackQuery, [content.ks_content_id]);
        
        return {
          ...content,
          feedbacks: feedbackResult.rows
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: contentWithFeedback
    });

  } catch (error) {
    logger.error('Failed to fetch knowledge content', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'KnowledgeStationFetch',
        details: `Error: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to fetch knowledge content' },
      { status: 500 }
    );
  }
}

// POST - Create new knowledge content
export async function POST(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  let client;
  try {
    const formData = await request.formData();
    
    const title = formData.get('title');
    const description = formData.get('description');
    const contentText = formData.get('contentText');
    const externalLink = formData.get('externalLink');
    const isImportant = formData.get('isImportant') === 'true';
    const notifyAll = formData.get('notifyAll') === 'true';
    const mediaFile = formData.get('mediaFile');
    const documentFiles = formData.getAll('documentFiles');

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { success: false, message: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Get user info - FIXED COLUMN NAME
    const userResult = await query(
      'SELECT short_name, email, soc_portal_id, profile_photo_url FROM user_info WHERE soc_portal_id = $1',
      [socPortalId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userResult.rows[0];
    client = await getDbConnection();
    await client.query('BEGIN');

    // Generate KS content ID
    const ksContentId = await generateKSContentId(client);

    // Handle media file upload
    let mediaUrl = null;
    if (mediaFile && mediaFile.size > 0) {
      const mediaExtension = path.extname(mediaFile.name);
      const mediaFileName = `${ksContentId}_media${mediaExtension}`;
      mediaUrl = await saveKnowledgeFile(mediaFile, mediaFileName, 'media');
    }

    // Handle document files upload
    const documentUrls = [];
    for (let i = 0; i < documentFiles.length; i++) {
      const docFile = documentFiles[i];
      if (docFile && docFile.size > 0) {
        const docExtension = path.extname(docFile.name);
        const docFileName = `${ksContentId}_doc${i + 1}${docExtension}`;
        const docUrl = await saveKnowledgeFile(docFile, docFileName, 'documents');
        documentUrls.push({
          name: docFile.name,
          url: docUrl,
          type: docExtension.substring(1).toLowerCase()
        });
      }
    }

    // Insert into database
    const insertQuery = `
      INSERT INTO knowledge_station_content (
        ks_content_id, title, description, content_text, media_url, 
        document_urls, external_link, is_important, upload_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const insertResult = await client.query(insertQuery, [
      ksContentId,
      title,
      description,
      contentText,
      mediaUrl,
      documentUrls.length > 0 ? JSON.stringify(documentUrls) : null,
      externalLink,
      isImportant,
      socPortalId
    ]);

    // Log activity
    await client.query(
      `INSERT INTO user_activity_log 
       (soc_portal_id, action, description, ip_address, device_info, eid, sid)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        socPortalId,
        'KNOWLEDGE_SHARE',
        `Shared knowledge: ${title} (${ksContentId})`,
        ipAddress,
        userAgent,
        eid,
        sessionId
      ]
    );

    // Generate unique notification ID for uploader
    const uploaderNotificationId = await generateNotificationId(client);
    
    // Create notification for the uploader
    await client.query(
      `INSERT INTO user_notification_details 
       (notification_id, title, status, soc_portal_id)
       VALUES ($1, $2, $3, $4)`,
      [
        uploaderNotificationId,
        `Knowledge Shared Successfully: ${title}`,
        'Unread',
        socPortalId
      ]
    );

    // NOTIFY ALL USERS if requested
    if (notifyAll) {
      // Get all active users
      const usersResult = await client.query(
        'SELECT soc_portal_id FROM user_info WHERE status = $1 AND soc_portal_id != $2',
        ['Active', socPortalId] // Exclude the uploader
      );

      // Create notifications for all other users
      for (const user of usersResult.rows) {
        const notificationId = await generateNotificationId(client);
        
        await client.query(
          `INSERT INTO user_notification_details 
           (notification_id, title, status, soc_portal_id)
           VALUES ($1, $2, $3, $4)`,
          [
            notificationId,
            `📢 New Knowledge Shared: ${title} - Check it out!`,
            'Unread',
            user.soc_portal_id
          ]
        );
      }

      // Send Telegram broadcast
      const telegramMessage = `📢 **KNOWLEDGE STATION BROADCAST**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 **Title:** ${title}
👤 **Shared By:** ${userData.short_name}
📝 **Description:** ${description.substring(0, 200)}...
🔗 **Content URL:** http://167.88.38.114:5001/user_dashboard/knowledge_station
⭐ **Important:** ${isImportant ? 'Yes' : 'No'}
🕒 **Time:** ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}`;

      await sendTelegramAlert(telegramMessage);
    }

    await client.query('COMMIT');

    // Send Telegram alert for the upload
    const telegramMessage = formatNotificationMessage(
      'NEW_KNOWLEDGE_SHARED',
      { title, ks_content_id: ksContentId, external_link: externalLink, is_important: isImportant },
      userData,
      ipAddress
    );

    await sendTelegramAlert(telegramMessage);

    logger.info('Knowledge content created successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'KnowledgeShare',
        details: `User ${socPortalId} shared knowledge: ${title}`,
        userId: socPortalId,
        ksContentId,
        title,
        hasMedia: !!mediaUrl,
        documentCount: documentUrls.length,
        notifyAll: notifyAll,
        notifiedUsers: notifyAll ? 'all' : 'none',
        ipAddress
      }
    });

    return NextResponse.json({
      success: true,
      message: `Knowledge shared successfully${notifyAll ? ' and notified all users' : ''}`,
      data: {
        ks_content_id: ksContentId,
        ...insertResult.rows[0]
      }
    });

  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
    
    logger.error('Failed to create knowledge content', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'KnowledgeShare',
        details: `Error: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to share knowledge: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    } else if (client && typeof client.end === 'function') {
      client.end();
    }
  }
}