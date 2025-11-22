// app/api/user_dashboard/mail_center/check_duplicate_mail/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

export async function POST(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';

  try {
    const { mailSubject, taskRaisedDate } = await request.json();

    logger.info('Duplicate mail check initiated', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DuplicateMailCheck',
        details: `User ${userId} checking duplicate mail`,
        userId,
        mailSubject,
        taskRaisedDate
      }
    });

    if (!mailSubject) {
      logger.warn('Duplicate check failed - missing mail subject', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'DuplicateMailCheck',
          details: 'Mail subject is required',
          userId
        }
      });

      return NextResponse.json(
        { success: false, message: 'Mail subject is required' },
        { status: 400 }
      );
    }

    if (!taskRaisedDate) {
      logger.warn('Duplicate check failed - missing task raised date', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'DuplicateMailCheck',
          details: 'Task raised date is required',
          userId,
          mailSubject
        }
      });

      return NextResponse.json(
        { success: false, message: 'Task raised date is required' },
        { status: 400 }
      );
    }

    // Check for existing mail with the same subject AND task raised date
    const checkQuery = `
      SELECT 
        status, 
        assigned_team, 
        tracking_date, 
        task_raised_date, 
        task_solve_date,
        created_at
      FROM mail_tracking 
      WHERE LOWER(mail_subject) = LOWER($1)
      AND task_raised_date = $2
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    logger.debug('Executing duplicate check query', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DuplicateMailCheck',
        details: 'Querying database for duplicate mail',
        userId,
        mailSubject,
        taskRaisedDate,
        query: checkQuery
      }
    });

    const result = await query(checkQuery, [mailSubject.trim(), taskRaisedDate]);

    if (result.rows.length > 0) {
      const existingMail = result.rows[0];
      
      logger.info('Duplicate mail found', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'DuplicateMailCheck',
          details: `Duplicate mail found with status: ${existingMail.status}`,
          userId,
          mailSubject,
          taskRaisedDate,
          existingStatus: existingMail.status,
          existingTeam: existingMail.assigned_team,
          existingSolveDate: existingMail.task_solve_date
        }
      });

      return NextResponse.json({
        success: true,
        exists: true,
        status: existingMail.status,
        assignedTeam: existingMail.assigned_team,
        trackingDate: existingMail.tracking_date,
        taskRaisedDate: existingMail.task_raised_date,
        taskSolveDate: existingMail.task_solve_date
      });
    }

    logger.info('No duplicate mail found', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DuplicateMailCheck',
        details: 'No duplicate mail found in database',
        userId,
        mailSubject,
        taskRaisedDate
      }
    });

    return NextResponse.json({
      success: true,
      exists: false
    });

  } catch (error) {
    console.error('Error checking duplicate mail:', error);
    
    logger.error('Error checking duplicate mail', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DuplicateMailCheckError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId,
        mailSubject,
        taskRaisedDate
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to check duplicate mail' },
      { status: 500 }
    );
  }
}