// app/api/admin_dashboard/login_tracker/route.js
import { query } from '../../../../lib/db';
import logger from '../../../../lib/logger';
import { getClientIP } from '../../../../lib/utils/ipUtils';

export async function GET(request) {
  const startTime = Date.now();
  const taskName = 'AdminDashboard';
  const type = 'LOGIN_TRACKER_DATA';
  
  // Get client information
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const adminId = request.cookies.get('socPortalId')?.value || 'Unknown';

  try {
    logger.info('🔍 Fetching login tracker data for admin dashboard', {
      meta: {
        eid,
        sid: sessionId,
        taskName,
        type,
        adminId,
        ipAddress,
        userAgent: userAgent.substring(0, 100),
        timestamp: new Date().toISOString()
      }
    });

    // Fetch admin login tracker data with profile info
    const adminResult = await query(`
      SELECT 
        alt.serial,
        alt.soc_portal_id,
        alt.role_type,
        alt.last_login_time,
        alt.last_logout_time,
        alt.total_login_count,
        alt.current_login_status,
        alt.created_at,
        alt.updated_at,
        EXTRACT(EPOCH FROM (alt.last_login_time - alt.created_at)) / 3600 as account_age_hours,
        ai.email,
        '/image/admin_dp/admin_dp.jpg' as profile_photo_url,
        'Admin User' as short_name
      FROM admin_login_tracker alt
      LEFT JOIN admin_info ai ON alt.soc_portal_id = ai.soc_portal_id
      ORDER BY alt.last_login_time DESC
    `);

    logger.info('Admin login tracker data fetched successfully', {
      meta: {
        taskName,
        type: 'ADMIN_DATA',
        adminId,
        rowCount: adminResult.rows.length,
        timestamp: new Date().toISOString()
      }
    });

    // Fetch user login tracker data with profile info
    const userResult = await query(`
      SELECT 
        ult.serial,
        ult.soc_portal_id,
        ult.role_type,
        ult.last_login_time,
        ult.last_logout_time,
        ult.total_login_count,
        ult.current_login_status,
        ult.created_at,
        ult.updated_at,
        EXTRACT(EPOCH FROM (ult.last_login_time - ult.created_at)) / 3600 as account_age_hours,
        ui.short_name,
        ui.profile_photo_url,
        ui.email,
        ui.designation
      FROM user_login_tracker ult
      LEFT JOIN user_info ui ON ult.soc_portal_id = ui.soc_portal_id
      ORDER BY ult.last_login_time DESC
    `);

    logger.info('User login tracker data fetched successfully', {
      meta: {
        taskName,
        type: 'USER_DATA',
        adminId,
        rowCount: userResult.rows.length,
        timestamp: new Date().toISOString()
      }
    });

    // Calculate statistics
    const totalAdmins = adminResult.rows.length;
    const totalUsers = userResult.rows.length;
    const activeAdmins = adminResult.rows.filter(admin => admin.current_login_status === 'Active').length;
    const activeUsers = userResult.rows.filter(user => user.current_login_status === 'Active').length;
    
    const totalLogins = adminResult.rows.reduce((sum, admin) => sum + parseInt(admin.total_login_count || 0), 0) +
                      userResult.rows.reduce((sum, user) => sum + parseInt(user.total_login_count || 0), 0);

    const responseData = {
      statistics: {
        totalAdmins,
        totalUsers,
        activeAdmins,
        activeUsers,
        totalLogins,
        inactiveAdmins: totalAdmins - activeAdmins,
        inactiveUsers: totalUsers - activeUsers
      },
      admins: adminResult.rows.map(admin => ({
        ...admin,
        last_login_time: admin.last_login_time ? new Date(admin.last_login_time).toISOString() : null,
        last_logout_time: admin.last_logout_time ? new Date(admin.last_logout_time).toISOString() : null,
        created_at: admin.created_at ? new Date(admin.created_at).toISOString() : null,
        updated_at: admin.updated_at ? new Date(admin.updated_at).toISOString() : null,
        account_age_days: Math.round((admin.account_age_hours || 0) / 24),
        short_name: admin.short_name || 'Admin User'
      })),
      users: userResult.rows.map(user => ({
        ...user,
        last_login_time: user.last_login_time ? new Date(user.last_login_time).toISOString() : null,
        last_logout_time: user.last_logout_time ? new Date(user.last_logout_time).toISOString() : null,
        created_at: user.created_at ? new Date(user.created_at).toISOString() : null,
        updated_at: user.updated_at ? new Date(user.updated_at).toISOString() : null,
        account_age_days: Math.round((user.account_age_hours || 0) / 24),
        short_name: user.short_name || 'No Name'
      }))
    };

    const duration = Date.now() - startTime;
    
    logger.info('✅ Login tracker data prepared successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName,
        type,
        adminId,
        duration,
        statistics: responseData.statistics,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: responseData
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('❌ Failed to fetch login tracker data', {
      meta: {
        eid,
        sid: sessionId,
        taskName,
        type,
        adminId,
        ipAddress,
        error: error.message,
        stack: error.stack,
        duration,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch login tracker data',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}