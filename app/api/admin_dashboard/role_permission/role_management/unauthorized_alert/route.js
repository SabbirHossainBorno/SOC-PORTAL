// app/api/admin_dashboard/role_permission/role_management/unauthorized_alert/route.js
import { NextResponse } from 'next/server';
import { getClientIP } from '../../../../../../lib/utils/ipUtils';
import sendTelegramAlert from '../../../../../../lib/telegramAlert';
import logger from '../../../../../../lib/logger';

export async function POST(request) {
  try {
    const requestBody = await request.json();
    
    const { 
      attemptedUrl, 
      userEmail, 
      socPortalId, 
      roleType, 
      alertType = 'UNAUTHORIZED_ROUTE_ACCESS',
      eid = 'N/A',
      sid = 'N/A'
    } = requestBody;
    
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    console.log('🔍 VERIFIED - Extracted values:', { eid, sid });

    let alertTitle = '🚨 UNAUTHORIZED ACCESS ATTEMPT';
    let alertStatus = 'BLOCKED - Unauthorized Access';
    
    if (alertType === 'ADMIN_ACCESS_ATTEMPT') {
      alertTitle = '🔐 ADMIN DASHBOARD ACCESS ATTEMPT';
      alertStatus = 'BLOCKED - User attempted admin access';
    }

    const alertMessage = `${alertTitle}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 User           : ${userEmail}
🆔 SOC Portal ID  : ${socPortalId}
🎯 Role Type      : ${roleType}
🔗 Attempted URL  : ${attemptedUrl}
🌐 IP Address     : ${ipAddress}
🖥️ Device Info    : ${userAgent.substring(0, 100)}...
🕒 Time           : ${new Date().toLocaleString()}
⚠️ Status         : ${alertStatus}`;
    
    // Send Telegram alert
    await sendTelegramAlert(`\`\`\`\n${alertMessage}\n\`\`\``);

    // ✅ FIX: Use the same logging format as your user_info API
    // The logger expects eid and sid to be in the meta object, not as separate parameters
    logger.warn('UnauthorizedAccessAlert', {
      meta: {
        eid: eid,  // Put EID inside meta object
        sid: sid,  // Put SID inside meta object
        taskName: 'UnauthorizedAccess',
        details: `User ${socPortalId} (${userEmail}) attempted to access ${attemptedUrl} | Role: ${roleType} | Alert Type: ${alertType} | IP: ${ipAddress}`,
        userEmail,
        socPortalId,
        roleType,
        attemptedUrl,
        alertType,
        ipAddress,
        userAgent: userAgent.substring(0, 100)
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Alert sent successfully',
      alertType
    });

  } catch (error) {
    console.error('❌ Unauthorized alert error:', error);
    // ✅ FIX: Also put EID and SID in meta for error logs
    logger.error('UnauthorizedAlertFailed', {
      meta: {
        eid: 'N/A',
        sid: 'N/A',
        taskName: 'UnauthorizedAlert',
        details: `Error: ${error.message}`
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to send alert' },
      { status: 500 }
    );
  }
}