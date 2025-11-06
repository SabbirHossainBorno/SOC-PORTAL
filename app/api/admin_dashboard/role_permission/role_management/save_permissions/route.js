//app/api/admin_dashboard/role_permission/role_management/save_permissions/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';
import { getClientIP } from '../../../../../../lib/utils/ipUtils';
import sendTelegramAlert from '../../../../../../lib/telegramAlert';

export async function POST(request) {
  try {
    const { roleType, socPortalId, permissions, createdBy } = await request.json();
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    if (!roleType || !permissions || !createdBy) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Start transaction
    await query('BEGIN');

    // Delete existing permissions for this role/user combination
    if (socPortalId && socPortalId !== 'all') {
      await query(
        `DELETE FROM role_permissions 
         WHERE role_type = $1 AND soc_portal_id = $2`,
        [roleType, socPortalId]
      );
    } else {
      await query(
        `DELETE FROM role_permissions 
         WHERE role_type = $1 AND soc_portal_id IS NULL`,
        [roleType]
      );
    }

    // Insert new permissions
    for (const permission of permissions) {
      await query(
        `INSERT INTO role_permissions 
         (role_type, soc_portal_id, menu_path, menu_label, parent_menu, is_allowed, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          roleType,
          socPortalId && socPortalId !== 'all' ? socPortalId : null,
          permission.menu_path,
          permission.menu_label,
          permission.parent_menu || null,
          permission.is_allowed,
          createdBy
        ]
      );
    }

    await query('COMMIT');

    // Log activity
    const target = socPortalId && socPortalId !== 'all' 
      ? `user ${socPortalId}` 
      : `role ${roleType}`;
    
    await logActivity(
      'admin',
      createdBy,
      'ROLE_PERMISSION_UPDATE',
      `Updated permissions for ${target}`,
      ipAddress,
      userAgent,
      `PERM-${Date.now()}`,
      request.headers.get('sessionId') || 'N/A'
    );

    // Send Telegram alert
    const alertMessage = `🔐 [ SOC PORTAL | ROLE PERMISSION UPDATE ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Admin          : ${createdBy}
🎯 Target         : ${target}
📊 Permissions    : ${permissions.length} menu items updated
🌐 IP Address     : ${ipAddress}
🕒 Time           : ${new Date().toLocaleString()}`;

    await sendTelegramAlert(`\`\`\`\n${alertMessage}\n\`\`\``);

    logger.info('Role permissions updated successfully', {
      meta: {
        taskName: 'SavePermissions',
        details: `Permissions updated for ${target} by ${createdBy}`,
        permissionsCount: permissions.length
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Permissions saved successfully' 
    });

  } catch (error) {
    await query('ROLLBACK');
    
    logger.error('Failed to save role permissions', {
      meta: {
        taskName: 'SavePermissions',
        details: `Error: ${error.message}`,
        stack: error.stack
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to save permissions' },
      { status: 500 }
    );
  }
}

async function logActivity(userType, socPortalId, action, description, ipAddress, userAgent, eid, sid) {
  try {
    const table = userType === 'admin' ? 'admin_activity_log' : 'user_activity_log';
    
    await query(
      `INSERT INTO ${table} 
       (soc_portal_id, action, description, ip_address, device_info, eid, sid, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [socPortalId, action, description, ipAddress, userAgent, eid, sid]
    );
  } catch (error) {
    logger.error('Failed to log activity', {
      meta: {
        taskName: 'ActivityLog',
        details: `Error: ${error.message}`
      }
    });
  }
}