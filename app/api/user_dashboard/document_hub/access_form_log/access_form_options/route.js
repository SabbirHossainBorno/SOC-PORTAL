//app/api/user_dashboard/document_hub/access_form_log/access_form_options/route.js
import { query } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  logger.info('Fetching access form options', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'AccessFormOptions',
      details: `User ${socPortalId} requesting access form options`,
      userId: socPortalId,
      ipAddress,
      userAgent
    }
  });

  try {
    // Fetch distinct portal names from the database
    const portalQuery = `
      SELECT DISTINCT TRIM(UNNEST(STRING_TO_ARRAY(portal_name, ','))) as value 
      FROM access_form_tracker 
      WHERE portal_name IS NOT NULL AND portal_name != ''
      ORDER BY value
    `;
    
    const portalResult = await query(portalQuery);
    const portalOptions = portalResult.rows.map(row => ({
      value: row.value,
      label: row.value
    }));

    // Fetch distinct roles from the database
    const roleQuery = `
      SELECT DISTINCT TRIM(UNNEST(STRING_TO_ARRAY(role, ','))) as value 
      FROM access_form_tracker 
      WHERE role IS NOT NULL AND role != ''
      ORDER BY value
    `;
    
    const roleResult = await query(roleQuery);
    const roleOptions = roleResult.rows.map(row => ({
      value: row.value,
      label: row.value
    }));

    logger.info('Access form options fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AccessFormOptions',
        details: `Fetched ${portalOptions.length} portal options and ${roleOptions.length} role options`,
        userId: socPortalId
      }
    });

    return new Response(JSON.stringify({
      success: true,
      portalOptions,
      roleOptions
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Error fetching access form options', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AccessFormOptions',
        details: `Error: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch access form options',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}