// app/api/user_dashboard/roster/roster_columns/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  logger.info('Fetching roster columns with data', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'FetchRosterColumns',
      details: `User ${userId} requesting roster columns for ${month}/${year}`,
      userId,
      ipAddress,
      userAgent,
      month,
      year
    }
  });

  try {
    // First, get all column names from the roster_schedule table
    const columnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'roster_schedule' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await query(columnsQuery);
    console.log('All columns in roster_schedule:', columnsResult.rows);
    
    // Define non-team member columns to exclude
    const nonTeamColumns = [
      'serial', 'roster_id', 'date', 'day', 'upload_by', 
      'created_at', 'updated_at'
    ];
    
    // Filter to get only team member columns
    const teamMemberColumns = columnsResult.rows
      .filter(row => !nonTeamColumns.includes(row.column_name))
      .map(row => row.column_name);
    
    console.log('Team member columns found:', teamMemberColumns);
    
    const teamMembersWithData = [];

    // Check each team member column individually for data
    for (const column of teamMemberColumns) {
      const checkQuery = `
        SELECT 1 
        FROM roster_schedule 
        WHERE EXTRACT(MONTH FROM date) = $1 
          AND EXTRACT(YEAR FROM date) = $2 
          AND ${column} IS NOT NULL 
          AND ${column} != '' 
          AND ${column} != 'null'
          AND ${column} != 'NULL'
        LIMIT 1
      `;
      
      const checkResult = await query(checkQuery, [month, year]);
      
      if (checkResult.rows.length > 0) {
        // Convert column name to Title Case (e.g., 'tanvir' -> 'Tanvir')
        const displayName = column.charAt(0).toUpperCase() + column.slice(1);
        teamMembersWithData.push(displayName);
      }
    }
    
    console.log('Team members with data:', teamMembersWithData);
    
    logger.info('Roster columns fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FetchRosterColumns',
        details: `Fetched ${teamMembersWithData.length} team members with data`,
        teamMembers: teamMembersWithData,
        month,
        year
      }
    });

    return NextResponse.json({
      success: true,
      data: teamMembersWithData
    });

  } catch (error) {
    console.error('Error fetching roster columns:', error);
    logger.error('Error fetching roster columns', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FetchRosterColumnsError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId,
        month,
        year
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch roster columns: ' + error.message },
      { status: 500 }
    );
  }
}