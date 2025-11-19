//app/api/user_dashboard/knowledge_station/[ks_content_id]/save/route.js
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
    // Check if already saved
    const existingSave = await query(
      'SELECT * FROM knowledge_station_saved WHERE ks_content_id = $1 AND soc_portal_id = $2',
      [ks_content_id, socPortalId]
    );

    if (existingSave.rows.length > 0) {
      // Remove save
      await query(
        'DELETE FROM knowledge_station_saved WHERE ks_content_id = $1 AND soc_portal_id = $2',
        [ks_content_id, socPortalId]
      );

      return NextResponse.json({
        success: true,
        saved: false,
        message: 'Content removed from saved items'
      });
    } else {
      // Add save
      await query(
        'INSERT INTO knowledge_station_saved (ks_content_id, soc_portal_id) VALUES ($1, $2)',
        [ks_content_id, socPortalId]
      );

      return NextResponse.json({
        success: true,
        saved: true,
        message: 'Content saved successfully'
      });
    }

  } catch (error) {
    logger.error('Failed to toggle save', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'KnowledgeSave',
        details: `Error: ${error.message}`,
        userId: socPortalId,
        ks_content_id,
        error: error.message
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to toggle save' },
      { status: 500 }
    );
  }
}