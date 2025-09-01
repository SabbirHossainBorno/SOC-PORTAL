// app/api/user_dashboard/document_hub/access_form_edit/[af_tracking_id]/audit/route.js
import { query } from '../../../../../../../lib/db';

export async function GET(request, { params }) {
  const { af_tracking_id } = await params;
  
  try {
    const result = await query(
      `SELECT serial, version, action_type, audit_info, document_location, 
              updated_by, ip_address, user_agent, audit_remark, created_at, updated_at
       FROM access_form_audit_trail 
       WHERE af_tracking_id = $1 
       ORDER BY version ASC`,
      [af_tracking_id]
    );

    return new Response(JSON.stringify({
      success: true,
      audit_trail: result.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch audit trail',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}