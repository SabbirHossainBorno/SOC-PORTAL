// app/api/admin_dashboard/role_permission/roster_upload/available_users/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';

export async function GET() {
  try {
    const queryText = `
      SELECT 
        soc_portal_id,
        short_name,
        email,
        role_type,
        profile_photo_url
      FROM user_info 
      WHERE role_type = 'SOC'
        AND status = 'Active'
        AND soc_portal_id NOT IN (
          SELECT soc_portal_id 
          FROM roster_schedule_permission 
          WHERE status = 'Active'
        )
      ORDER BY short_name
    `;

    const result = await query(queryText);

    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching available users:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch available users' },
      { status: 500 }
    );
  }
}