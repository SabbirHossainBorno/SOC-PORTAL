// app/api/user_dashboard/notice_board/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import logger from '../../../../lib/logger';
import { DateTime } from 'luxon';

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';

  try {
    logger.info('Fetching ALL notices', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'NoticeBoardFetch',
        details: `User ${userId} fetching ALL notices`,
        userId,
        ipAddress
      }
    });

    // REMOVE the time condition to get ALL notices
    const noticeQuery = `
      SELECT 
        serial,
        notice_id,
        from_datetime,
        to_datetime,
        title,
        description,
        image_url,
        pdf_url,
        created_by,
        created_at,
        updated_at
      FROM notice_board 
      WHERE is_active = true 
      ORDER BY created_at DESC
    `;

    console.debug('Fetching ALL notices');
    const result = await query(noticeQuery);

    const notices = result.rows.map(notice => ({
      ...notice,
      from_datetime: DateTime.fromJSDate(notice.from_datetime).setZone('Asia/Dhaka').toISO(),
      to_datetime: DateTime.fromJSDate(notice.to_datetime).setZone('Asia/Dhaka').toISO(),
      created_at: DateTime.fromJSDate(notice.created_at).setZone('Asia/Dhaka').toISO(),
    }));

    logger.info('ALL notices fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'NoticeBoardFetch',
        details: `Fetched ${notices.length} ALL notices for user ${userId}`,
        userId,
        noticeCount: notices.length
      }
    });

    return NextResponse.json({
      success: true,
      data: notices
    });

  } catch (error) {
    console.error('Error fetching notices:', error);
    logger.error('Failed to fetch notices', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'NoticeBoardFetchError',
        details: `Error: ${error.message}`,
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