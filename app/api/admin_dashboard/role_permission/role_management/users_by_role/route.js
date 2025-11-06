//app/api/admin_dashboard/role_permission/role_management/users_by_role/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleType = searchParams.get('role_type');

    if (!roleType) {
      return NextResponse.json(
        { success: false, message: 'Role type is required' },
        { status: 400 }
      );
    }

    const users = await query(
      `SELECT soc_portal_id, first_name, last_name, email, role_type 
       FROM user_info 
       WHERE role_type = $1 AND status = 'Active' 
       ORDER BY first_name, last_name`,
      [roleType]
    );

    return NextResponse.json({ 
      success: true, 
      users: users.rows 
    });
  } catch (error) {
    logger.error('Failed to fetch users by role', {
      meta: {
        taskName: 'UsersByRole',
        details: `Error: ${error.message}`
      }
    });
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}