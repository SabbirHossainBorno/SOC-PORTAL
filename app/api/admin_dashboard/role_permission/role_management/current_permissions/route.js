//app/api/admin_dashboard/role_permission/role_management/current_permissions/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleType = searchParams.get('role_type');
    const socPortalId = searchParams.get('soc_portal_id');

    if (!roleType) {
      return NextResponse.json(
        { success: false, message: 'Role type is required' },
        { status: 400 }
      );
    }

    let permissions;
    if (socPortalId && socPortalId !== 'all') {
      // Get specific user permissions
      permissions = await query(
        `SELECT menu_path, menu_label, parent_menu, is_allowed 
         FROM role_permissions 
         WHERE (role_type = $1 AND soc_portal_id = $2) 
            OR (role_type = $1 AND soc_portal_id IS NULL)
         ORDER BY parent_menu, menu_label`,
        [roleType, socPortalId]
      );
    } else {
      // Get role-wide permissions
      permissions = await query(
        `SELECT menu_path, menu_label, parent_menu, is_allowed 
         FROM role_permissions 
         WHERE role_type = $1 AND soc_portal_id IS NULL
         ORDER BY parent_menu, menu_label`,
        [roleType]
      );
    }

    return NextResponse.json({ 
      success: true, 
      permissions: permissions.rows 
    });
  } catch (error) {
    logger.error('Failed to fetch current permissions', {
      meta: {
        taskName: 'CurrentPermissions',
        details: `Error: ${error.message}`
      }
    });
    return NextResponse.json(
      { success: false, message: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}