//app/api/user_dashboard/roster/roster_by_date/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  logger.info('Fetching roster by date', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'FetchRosterByDate',
      details: `User ${userId} requesting roster by date`,
      userId,
      ipAddress,
      userAgent
    }
  });

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { success: false, message: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const result = await query('SELECT * FROM roster_schedule WHERE date = $1', [date]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No roster found for the selected date' },
        { status: 404 }
      );
    }

    logger.info('Roster by date fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FetchRosterByDate',
        details: `Fetched roster for date: ${date}`,
        date
      }
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error fetching roster by date', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FetchRosterByDateError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch roster data' },
      { status: 500 }
    );
  }
}