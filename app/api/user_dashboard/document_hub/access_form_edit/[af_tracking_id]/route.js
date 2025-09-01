// app/api/user_dashboard/document_hub/access_form_edit/[af_tracking_id]/route.js
import { query } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';

export async function GET(request, { params }) {
  // Await the params first
  const { af_tracking_id } = await params;
  
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  logger.info('Fetch access form data request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'FetchAccessForm',
      details: `User ${socPortalId} fetching access form ${af_tracking_id}`,
      userId: socPortalId,
      ipAddress,
      userAgent
    }
  });

  try {
    const result = await query(
      'SELECT * FROM access_form_tracker WHERE af_tracking_id = $1',
      [af_tracking_id]
    );
    
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Access form not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: result.rows[0]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    logger.error('Error fetching access form data', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FetchAccessForm',
        details: `Error: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack
      }
    });
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch access form data',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}