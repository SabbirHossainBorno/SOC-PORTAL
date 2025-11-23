// app/api/admin_dashboard/notice_board/[notice_id]/route.js
import { NextResponse } from 'next/server';
import { query, getDbConnection } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';
import sendTelegramAlert from '../../../../../lib/telegramAlert';
import path from 'path';
import fs from 'fs/promises';
import { getClientIP } from '../../../../../lib/utils/ipUtils';
import { DateTime } from 'luxon';

// Reuse your existing saveNoticeFile function
const saveNoticeFile = async (file, fileName, subfolder = '') => {
  try {
    const uploadDir = '/home/soc_portal/storage/notice_board';
    const fullUploadDir = path.join(uploadDir, subfolder);
    const filePath = path.join(fullUploadDir, fileName);

    await fs.mkdir(fullUploadDir, { recursive: true, mode: 0o755 });

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    await fs.chmod(filePath, 0o644);

    // Change ownership to nginx user
    try {
      const { execSync } = require('child_process');
      execSync(`chown nginx:nginx "${filePath}"`);
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
      const { execSync } = require('child_process');
      execSync('sync', { stdio: 'inherit' });
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

// GET - Fetch single notice - FIXED: Await params
export async function GET(request, { params }) {
  try {
    const { notice_id } = await params; // FIX: Await the params
    const noticeId = notice_id;
    
    const noticeQuery = `
      SELECT 
        nb.*,
        ai.soc_portal_id as created_by_name,
        ai.email as created_by_email
      FROM notice_board nb
      LEFT JOIN admin_info ai ON nb.created_by = ai.soc_portal_id
      WHERE nb.notice_id = $1
    `;

    const noticeResult = await query(noticeQuery, [noticeId]);

    if (noticeResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Notice not found' },
        { status: 404 }
      );
    }

    const notice = noticeResult.rows[0];
    
    const formattedNotice = {
      ...notice,
      from_datetime: DateTime.fromJSDate(notice.from_datetime).setZone('Asia/Dhaka').toISO(),
      to_datetime: DateTime.fromJSDate(notice.to_datetime).setZone('Asia/Dhaka').toISO(),
      created_at: DateTime.fromJSDate(notice.created_at).setZone('Asia/Dhaka').toISO(),
    };

    return NextResponse.json({
      success: true,
      data: formattedNotice
    });

  } catch (error) {
    logger.error('Failed to fetch notice', {
      meta: {
        taskName: 'NoticeFetchError',
        details: `Error fetching notice: ${error.message}`,
        error: error.message,
        stack: error.stack
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to fetch notice' },
      { status: 500 }
    );
  }
}

// PUT - Update notice - FIXED: Await params
export async function PUT(request, { params }) {
  try {
    const { notice_id } = await params; // FIX: Await the params
    const noticeId = notice_id;
    
    const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
    const eid = request.cookies.get('eid')?.value || 'Unknown';
    const userId = request.cookies.get('socPortalId')?.value || 'Unknown';
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const formData = await request.formData();
    
    const title = formData.get('title');
    const description = formData.get('description');
    const from_datetime = formData.get('from_datetime');
    const to_datetime = formData.get('to_datetime');
    const imageFile = formData.get('image');
    const pdfFile = formData.get('pdf');
    const removeImage = formData.get('remove_image');
    const removePdf = formData.get('remove_pdf');

    // Validate required fields
    if (!title || !description || !from_datetime || !to_datetime) {
      return NextResponse.json(
        { success: false, message: 'All required fields must be filled' },
        { status: 400 }
      );
    }

    // Validate date range
    const fromDate = new Date(from_datetime);
    const toDate = new Date(to_datetime);
    if (fromDate >= toDate) {
      return NextResponse.json(
        { success: false, message: 'End date must be after start date' },
        { status: 400 }
      );
    }

    let client = await getDbConnection();
    await client.query('BEGIN');

    // Handle file uploads
    let imageUrl = undefined;
    let pdfUrl = undefined;

    // Process image file
    if (imageFile && imageFile.size > 0) {
      const imageExtension = path.extname(imageFile.name);
      const imageFileName = `${noticeId}_image${imageExtension}`;
      imageUrl = await saveNoticeFile(imageFile, imageFileName, 'images');
    } else if (removeImage) {
      imageUrl = null;
    }

    // Process PDF file
    if (pdfFile && pdfFile.size > 0) {
      const pdfExtension = path.extname(pdfFile.name);
      const pdfFileName = `${noticeId}_document${pdfExtension}`;
      pdfUrl = await saveNoticeFile(pdfFile, pdfFileName, 'documents');
    } else if (removePdf) {
      pdfUrl = null;
    }

    // Build dynamic update query
    let updateFields = ['title = $1', 'description = $2', 'from_datetime = $3', 'to_datetime = $4'];
    let queryParams = [title, description, from_datetime, to_datetime];
    let paramIndex = 5;

    if (imageUrl !== undefined) {
      updateFields.push(`image_url = $${paramIndex}`);
      queryParams.push(imageUrl);
      paramIndex++;
    }

    if (pdfUrl !== undefined) {
      updateFields.push(`pdf_url = $${paramIndex}`);
      queryParams.push(pdfUrl);
      paramIndex++;
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    const updateQuery = `
      UPDATE notice_board 
      SET ${updateFields.join(', ')}
      WHERE notice_id = $${paramIndex}
      RETURNING *
    `;
    
    queryParams.push(noticeId);

    const updateResult = await client.query(updateQuery, queryParams);

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, message: 'Notice not found' },
        { status: 404 }
      );
    }

    // Log activity
    await client.query(
      `INSERT INTO user_activity_log 
       (soc_portal_id, action, description, ip_address, device_info, eid, sid)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        'NOTICE_UPDATED',
        `Updated notice: ${title} (${noticeId})`,
        ipAddress,
        userAgent,
        eid,
        sessionId
      ]
    );

    await client.query('COMMIT');

    // Send Telegram alert
    const telegramMessage = `📢 **SOC PORTAL | NOTICE UPDATED** 📢
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 **Title:** ${title}
👤 **Updated By:** ${userId}
🆔 **Notice ID:** ${noticeId}
📅 **From:** ${new Date(from_datetime).toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}
📅 **To:** ${new Date(to_datetime).toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}
🌐 **IP Address:** ${ipAddress}
🕒 **Time:** ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}`;

    await sendTelegramAlert(telegramMessage);

    return NextResponse.json({
      success: true,
      message: 'Notice updated successfully',
      data: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update notice: ' + error.message },
      { status: 500 }
    );
  }
}