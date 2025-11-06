// app/api/admin_dashboard/role_permission/role_management/user_permissions/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';

export async function GET(request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const socPortalId = searchParams.get('soc_portal_id');
  const roleType = searchParams.get('role_type');
  const requestId = `PERM_REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info('USER_PERMISSIONS_REQUEST_INITIATED', {
      requestId,
      socPortalId,
      roleType,
      taskName: 'UserPermissions',
      severity: 'LOW',
      details: 'User permissions API request received'
    });

    if (!socPortalId || !roleType) {
      logger.warn('USER_PERMISSIONS_MISSING_PARAMETERS', {
        requestId,
        socPortalId,
        roleType,
        taskName: 'UserPermissions',
        severity: 'MEDIUM',
        details: 'Required parameters missing from request'
      });

      return NextResponse.json(
        { success: false, message: 'User ID and role type are required' },
        { status: 400 }
      );
    }

    // Get ALL permissions (both allowed and denied) to check for explicit denials
    const permissions = await query(
      `SELECT DISTINCT ON (menu_path) menu_path, menu_label, parent_menu, is_allowed
       FROM role_permissions 
       WHERE (soc_portal_id = $1 AND role_type = $2) 
          OR (soc_portal_id IS NULL AND role_type = $2)
       ORDER BY menu_path, 
                CASE WHEN soc_portal_id IS NOT NULL THEN 1 ELSE 2 END`,
      [socPortalId, roleType]
    );

    // Convert to a simple array of allowed paths
    const allowedPaths = permissions.rows
      .filter(p => p.is_allowed)
      .map(p => p.menu_path);

    // Also get denied paths for debugging
    const deniedPaths = permissions.rows
      .filter(p => !p.is_allowed)
      .map(p => p.menu_path);

    const processingTime = Date.now() - startTime;

    logger.info('USER_PERMISSIONS_REQUEST_COMPLETED', {
      requestId,
      socPortalId,
      roleType,
      taskName: 'UserPermissions',
      severity: 'LOW',
      processingTimeMs: processingTime,
      totalPermissions: permissions.rows.length,
      allowedPermissions: allowedPaths.length,
      deniedPermissions: deniedPaths.length,
      details: `Retrieved ${allowedPaths.length} allowed and ${deniedPaths.length} denied paths`
    });

    // Debug: Log specific permissions for the problematic route
    const documentTrackerPerm = permissions.rows.find(p => 
      p.menu_path === '/user_dashboard/document_hub/other_document_tracker'
    );
    
    if (documentTrackerPerm) {
      console.log('🔍 Document Tracker Permission:', {
        path: documentTrackerPerm.menu_path,
        allowed: documentTrackerPerm.is_allowed,
        role: roleType
      });
    }

    return NextResponse.json({ 
      success: true, 
      permissions: allowedPaths,
      deniedPaths: deniedPaths // For debugging
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('USER_PERMISSIONS_REQUEST_FAILED', {
      requestId,
      socPortalId,
      roleType,
      taskName: 'UserPermissions',
      severity: 'HIGH',
      processingTimeMs: processingTime,
      error: error.message,
      stack: error.stack,
      details: 'Database query failed while fetching user permissions'
    });

    return NextResponse.json(
      { success: false, message: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}