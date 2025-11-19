//app/api/user_dashboard/knowledge_station/[ks_content_id]/feedback/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';

export async function POST(request, { params }) {
  // AWAIT PARAMS
  const { ks_content_id } = await params;
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';

  try {
    const { feedback_description } = await request.json();

    if (!feedback_description?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Feedback description is required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO knowledge_station_feedback 
       (ks_content_id, feedback_description, feedback_by) 
       VALUES ($1, $2, $3) 
       RETURNING *, 
       (SELECT short_name FROM user_info WHERE soc_portal_id = $3) as feedback_by_name`,
      [ks_content_id, feedback_description.trim(), socPortalId]
    );

    logger.info('Feedback added successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'KnowledgeFeedback',
        details: `User ${socPortalId} added feedback to ${ks_content_id}`,
        userId: socPortalId,
        ks_content_id
      }
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Failed to add feedback', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'KnowledgeFeedback',
        details: `Error: ${error.message}`,
        userId: socPortalId,
        ks_content_id,
        error: error.message
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to add feedback' },
      { status: 500 }
    );
  }
}