// app/api/user_dashboard/document_hub/other_document_log/portal_tracker_log/route.js
import { query, getDbConnection } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  const requestStartTime = Date.now();
  
  logger.info('Portal tracker log fetch request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'PortalTrackerLog',
      details: `User ${socPortalId} fetching portal tracker logs | IP: ${ipAddress}`
    }
  });

  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const portalName = searchParams.get('portalName') || '';
    const offset = (page - 1) * limit;

    logger.debug('Fetching portal tracker logs from database', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTrackerLog',
        details: `Page: ${page}, Limit: ${limit}, Search: ${search}, Category: ${category}, PortalName: ${portalName}`
      }
    });

    // Build base condition for both count and data queries
    let baseCondition = 'FROM portal_info WHERE 1=1';
    let queryParams = [];
    let paramCount = 0;

    // Add search filter if provided
    if (search) {
      paramCount++;
      baseCondition += ` AND (
        portal_category ILIKE $${paramCount} OR 
        portal_name ILIKE $${paramCount} OR 
        pt_id::text ILIKE $${paramCount} OR
        portal_url ILIKE $${paramCount} OR
        user_identifier ILIKE $${paramCount} OR
        role ILIKE $${paramCount} OR
        track_by ILIKE $${paramCount} OR
        remark ILIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
    }

    // Add category filter if provided
    if (category && category !== 'all') {
      paramCount++;
      baseCondition += ` AND portal_category = $${paramCount}`;
      queryParams.push(category);
    }

    // Add portal name filter if provided
    if (portalName && portalName !== 'all') {
      paramCount++;
      baseCondition += ` AND portal_name = $${paramCount}`;
      queryParams.push(portalName);
    }

    // COUNT QUERY: Count unique portal URLs (not individual records)
    const countQuery = `
      SELECT COUNT(DISTINCT portal_url) as total 
      ${baseCondition}
    `;

    // DATA QUERY: Get paginated unique portal URLs with all their roles
    const dataQuery = `
      WITH UniquePortals AS (
        SELECT DISTINCT portal_url, portal_category, portal_name
        ${baseCondition}
        ORDER BY portal_url
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      ),
      PortalDetails AS (
        SELECT 
          p.pt_id,
          p.portal_category,
          p.portal_name,
          p.portal_url,
          p.user_identifier,
          p.password,
          p.role,
          p.remark,
          p.track_by,
          p.created_at,
          p.updated_at
        FROM portal_info p
        INNER JOIN UniquePortals up ON p.portal_url = up.portal_url
        ORDER BY p.portal_url, p.role
      )
      SELECT * FROM PortalDetails
    `;

    // Execute count query for unique URLs
    const countResult = await query(countQuery, queryParams);
    const totalUniqueUrls = parseInt(countResult.rows[0]?.total || 0);

    // Execute main data query
    const dataParams = [...queryParams, limit, offset];
    const result = await query(dataQuery, dataParams);
    const portals = result.rows;

    // Get overall counts for cards (without filters)
    const overallCountsQuery = `
      SELECT 
        COUNT(*) as total_portals,
        COUNT(DISTINCT portal_url) as unique_urls,
        COUNT(*) FILTER (WHERE portal_category = 'Live Web') as live_web,
        COUNT(*) FILTER (WHERE portal_category = 'Staging Web') as staging_web
      FROM portal_info
    `;
    
    const overallCountsResult = await query(overallCountsQuery);
    const overallCounts = overallCountsResult.rows[0];

    // Get unique portal names for filter
    const portalNamesQuery = `SELECT DISTINCT portal_name FROM portal_info ORDER BY portal_name`;
    const portalNamesResult = await query(portalNamesQuery);
    const portalNames = portalNamesResult.rows.map(row => row.portal_name);

    // Get unique categories for filter
    const categoriesQuery = `SELECT DISTINCT portal_category FROM portal_info ORDER BY portal_category`;
    const categoriesResult = await query(categoriesQuery);
    const categories = categoriesResult.rows.map(row => row.portal_category);

    logger.info('Portal tracker logs fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTrackerLog',
        details: `Fetched ${portals.length} portal records for ${totalUniqueUrls} unique URLs, Page: ${page}, Limit: ${limit}`
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: portals,
      overallCounts: {
        totalPortals: parseInt(overallCounts.total_portals),
        uniqueUrls: parseInt(overallCounts.unique_urls),
        liveWeb: parseInt(overallCounts.live_web),
        stagingWeb: parseInt(overallCounts.staging_web)
      },
      filterOptions: {
        portalNames,
        categories
      },
      pagination: {
        page,
        limit,
        total: totalUniqueUrls,
        pages: Math.ceil(totalUniqueUrls / limit)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Error fetching portal tracker logs', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'PortalTrackerLog',
        details: `Unexpected error: ${error.message}`,
        error: error.message,
        stack: error.stack
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch portal tracker logs',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}