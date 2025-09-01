//app/api/user_dashboard/roster/team_members/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  logger.info('Fetching team members', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'FetchTeamMembers',
      details: `User ${userId} requesting team members`,
      userId,
      ipAddress,
      userAgent
    }
  });

  try {
    // Get the column names from roster_schedule table that represent team members
    const result = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'roster_schedule' 
      AND column_name NOT IN (
        'serial', 'roster_id', 'date', 'day', 'upload_by', 
        'created_at', 'updated_at'
      )
      ORDER BY column_name
    `);
    
    const teamMembers = result.rows.map(row => {
      // Convert snake_case to Title Case
      return row.column_name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    });
    
    logger.info('Team members fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FetchTeamMembers',
        details: `Fetched ${teamMembers.length} team members`,
        teamMembers
      }
    });

    return NextResponse.json({
      success: true,
      data: teamMembers
    });

  } catch (error) {
    logger.error('Error fetching team members', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FetchTeamMembersError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}