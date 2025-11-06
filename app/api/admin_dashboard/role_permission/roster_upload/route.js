//app/api/admin_dashboard/role_permission/roster_upload/route.js
import { NextResponse } from 'next/server';
import { query, getDbConnection } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';
import sendTelegramAlert from '../../../../../lib/telegramAlert';

// Get current time in Asia/Dhaka
const getCurrentDateTime = () => {
  const now = new Date().toLocaleString('en-US', { 
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  });
  return now + ' (BST)';
};

// Format Telegram alert message
const formatAlertMessage = (action, userData, targetUsers, details) => {
  const time = getCurrentDateTime();
  const actionEmoji = {
    'ADD': '🆕',
    'UPDATE': '✏️',
    'DELETE': '🗑️'
  }[action] || '📝';

  return `${actionEmoji} *Roster Permission ${action}*
  
📧 *Email:* ${userData.email}
🆔 *Admin ID:* ${userData.id}
🔖 *EID:* ${userData.eid}
🕒 *Time:* ${time}

👥 *Target Users:* ${targetUsers}
📋 *Details:* ${details}`;
};

// Generate next notification ID based on serial column
const generateNotificationId = async (prefix, table, client = null) => {
  try {
    const queryText = `SELECT MAX(serial) AS max_serial FROM ${table}`;
    let result;
    
    if (client) {
      result = await client.query(queryText);
    } else {
      result = await query(queryText);
    }
    
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(4, '0');
    return `${prefix}${nextId}SOCP`;
  } catch (error) {
    throw new Error(`Error generating notification ID: ${error.message}`);
  }
};

// GET - Fetch all roster permissions
export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  logger.info('Fetching roster permissions', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'FetchRosterPermissions',
      details: `Admin ${userId} fetching roster upload permissions`,
      userId,
      ipAddress,
      userAgent
    }
  });

  try {
    const queryText = `
      SELECT 
        rsp.*,
        ui.email,
        ui.role_type as user_role,
        ui.profile_photo_url
      FROM roster_schedule_permission rsp
      LEFT JOIN user_info ui ON rsp.soc_portal_id = ui.soc_portal_id
      ORDER BY rsp.created_at DESC
    `;
    
    const result = await query(queryText);
    
    logger.info('Roster permissions fetched successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FetchRosterPermissions',
        details: `Fetched ${result.rows.length} permission records`,
        recordCount: result.rows.length
      }
    });

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching roster permissions:', error);
    logger.error('Error fetching roster permissions', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FetchRosterPermissionsError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId
      }
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch roster permissions' },
      { status: 500 }
    );
  }
}

// POST - Add new roster permissions
export async function POST(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const userEmail = request.cookies.get('email')?.value || 'Unknown';
  const userName = request.cookies.get('Name')?.value || 'Unknown';
  const userRole = request.cookies.get('roleType')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  let client;

  try {
    // For admin users, we get info from cookies and admin_info table
    let adminUser;
    
    if (userId.startsWith('A')) { // Admin user
      const adminQuery = 'SELECT soc_portal_id, email, role_type FROM admin_info WHERE soc_portal_id = $1';
      const adminResult = await query(adminQuery, [userId]);
      
      if (adminResult.rows.length === 0) {
        // If not found in admin_info, use cookie data
        adminUser = {
          soc_portal_id: userId,
          email: userEmail,
          role_type: userRole,
          short_name: userName || userId
        };
      } else {
        adminUser = {
          ...adminResult.rows[0],
          short_name: userName || adminResult.rows[0].soc_portal_id
        };
      }
    } else { // Regular user (shouldn't happen in admin dashboard, but as fallback)
      const userQuery = 'SELECT soc_portal_id, email, role_type, short_name FROM user_info WHERE soc_portal_id = $1';
      const userResult = await query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }
      adminUser = userResult.rows[0];
    }

    const { selectedUsers } = await request.json();
    
    if (!selectedUsers || !Array.isArray(selectedUsers) || selectedUsers.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No users selected' },
        { status: 400 }
      );
    }

    client = await getDbConnection().connect();
    await client.query('BEGIN');

    const insertedRecords = [];
    const skippedRecords = [];

    for (const user of selectedUsers) {
      // Check if permission already exists
      const existingQuery = `
        SELECT 1 FROM roster_schedule_permission 
        WHERE soc_portal_id = $1 AND status = 'Active'
      `;
      const existingResult = await client.query(existingQuery, [user.soc_portal_id]);

      if (existingResult.rows.length > 0) {
        skippedRecords.push(user.short_name);
        continue;
      }

      // Insert new permission
      const insertQuery = `
        INSERT INTO roster_schedule_permission 
        (soc_portal_id, short_name, status, role_type, permission)
        VALUES ($1, $2, 'Active', $3, 'ALLOW')
        RETURNING *
      `;
      
      const insertResult = await client.query(insertQuery, [
        user.soc_portal_id,
        user.short_name,
        user.role_type
      ]);

      insertedRecords.push(insertResult.rows[0]);
    }

    await client.query('COMMIT');

    // Log admin activity - USING ADMIN_ACTIVITY_LOG TABLE
    const activityLogQuery = `
      INSERT INTO admin_activity_log (
        soc_portal_id, action, description, ip_address, device_info, eid, sid, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `;
    
    const targetUsers = insertedRecords.map(r => r.short_name).join(', ');
    const activityDescription = `Added roster upload permissions for: ${targetUsers}`;
    
    await query(activityLogQuery, [
      userId,
      'ROSTER_PERMISSION_ADD',
      activityDescription,
      ipAddress,
      userAgent,
      eid,
      sessionId
    ]);

    // Create admin notification
    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details');
    const adminNotificationQuery = `
      INSERT INTO admin_notification_details (
        notification_id, title, status, created_at
      )
      VALUES ($1, $2, $3, NOW())
    `;

    const adminNotifParams = [
      adminNotificationId,
      `Roster Upload Permissions Added for ${insertedRecords.length} Users`,
      'Unread'
    ];

    await query(adminNotificationQuery, adminNotifParams);

    logger.info('Admin notification created for roster permissions addition', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AdminNotification',
        adminNotificationId,
        insertedCount: insertedRecords.length,
        ipAddress
      }
    });

    // Send Telegram alert
    const alertMessage = formatAlertMessage(
      'ADD',
      { 
        id: userId, 
        short_name: adminUser.short_name, 
        email: adminUser.email, 
        eid 
      },
      targetUsers,
      `Added ${insertedRecords.length} users with ALLOW permission`
    );
    
    await sendTelegramAlert(alertMessage);

    logger.info('Roster permissions added successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AddRosterPermissions',
        details: activityDescription,
        insertedCount: insertedRecords.length,
        skippedUsers: skippedRecords
      }
    });

    return NextResponse.json({
      success: true,
      message: `Added ${insertedRecords.length} users successfully`,
      data: insertedRecords,
      skipped: skippedRecords
    });

  } catch (error) {
    console.error('Error adding roster permissions:', error);
    
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }

    logger.error('Error adding roster permissions', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AddRosterPermissionsError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to add roster permissions' },
      { status: 500 }
    );
  }
}

// PUT - Update roster permission
export async function PUT(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const userEmail = request.cookies.get('email')?.value || 'Unknown';
  const userName = request.cookies.get('Name')?.value || 'Unknown';
  const userRole = request.cookies.get('roleType')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  try {
    // For admin users, we get info from cookies and admin_info table
    let adminUser;
    
    if (userId.startsWith('A')) { // Admin user
      const adminQuery = 'SELECT soc_portal_id, email, role_type FROM admin_info WHERE soc_portal_id = $1';
      const adminResult = await query(adminQuery, [userId]);
      
      if (adminResult.rows.length === 0) {
        // If not found in admin_info, use cookie data
        adminUser = {
          soc_portal_id: userId,
          email: userEmail,
          role_type: userRole,
          short_name: userName || userId
        };
      } else {
        adminUser = {
          ...adminResult.rows[0],
          short_name: userName || adminResult.rows[0].soc_portal_id
        };
      }
    } else { // Regular user (shouldn't happen in admin dashboard, but as fallback)
      const userQuery = 'SELECT soc_portal_id, email, role_type, short_name FROM user_info WHERE soc_portal_id = $1';
      const userResult = await query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }
      adminUser = userResult.rows[0];
    }

    const { soc_portal_id, permission } = await request.json();
    
    if (!soc_portal_id || !permission) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['ALLOW', 'DENY'].includes(permission)) {
      return NextResponse.json(
        { success: false, message: 'Invalid permission value' },
        { status: 400 }
      );
    }

    const updateQuery = `
      UPDATE roster_schedule_permission 
      SET permission = $1, updated_at = CURRENT_TIMESTAMP
      WHERE soc_portal_id = $2
      RETURNING *
    `;
    
    const result = await query(updateQuery, [permission, soc_portal_id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Permission record not found' },
        { status: 404 }
      );
    }

    const updatedRecord = result.rows[0];

    // Log admin activity - USING ADMIN_ACTIVITY_LOG TABLE
    const activityLogQuery = `
      INSERT INTO admin_activity_log (
        soc_portal_id, action, description, ip_address, device_info, eid, sid, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `;
    
    const activityDescription = `Updated roster upload permission for ${updatedRecord.short_name} to ${permission}`;
    
    await query(activityLogQuery, [
      userId,
      'ROSTER_PERMISSION_UPDATE',
      activityDescription,
      ipAddress,
      userAgent,
      eid,
      sessionId
    ]);

    // Create admin notification
    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details');
    const adminNotificationQuery = `
      INSERT INTO admin_notification_details (
        notification_id, title, status, created_at
      )
      VALUES ($1, $2, $3, NOW())
    `;

    const adminNotifParams = [
      adminNotificationId,
      `Roster Upload Permission Updated for ${updatedRecord.short_name} to ${permission}`,
      'Unread'
    ];

    await query(adminNotificationQuery, adminNotifParams);

    logger.info('Admin notification created for roster permission update', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AdminNotification',
        adminNotificationId,
        userId: updatedRecord.soc_portal_id,
        newPermission: permission,
        ipAddress
      }
    });

    // Send Telegram alert
    const alertMessage = formatAlertMessage(
      'UPDATE',
      { 
        id: userId, 
        short_name: adminUser.short_name, 
        email: adminUser.email, 
        eid 
      },
      updatedRecord.short_name,
      `Permission changed to ${permission}`
    );
    
    await sendTelegramAlert(alertMessage);

    logger.info('Roster permission updated successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdateRosterPermission',
        details: activityDescription,
        userId: updatedRecord.soc_portal_id,
        newPermission: permission
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Permission updated successfully',
      data: updatedRecord
    });

  } catch (error) {
    console.error('Error updating roster permission:', error);
    
    logger.error('Error updating roster permission', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UpdateRosterPermissionError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to update permission' },
      { status: 500 }
    );
  }
}

// DELETE - Remove roster permission
export async function DELETE(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const userEmail = request.cookies.get('email')?.value || 'Unknown';
  const userName = request.cookies.get('Name')?.value || 'Unknown';
  const userRole = request.cookies.get('roleType')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  try {
    // For admin users, we get info from cookies and admin_info table
    let adminUser;
    
    if (userId.startsWith('A')) { // Admin user
      const adminQuery = 'SELECT soc_portal_id, email, role_type FROM admin_info WHERE soc_portal_id = $1';
      const adminResult = await query(adminQuery, [userId]);
      
      if (adminResult.rows.length === 0) {
        // If not found in admin_info, use cookie data
        adminUser = {
          soc_portal_id: userId,
          email: userEmail,
          role_type: userRole,
          short_name: userName || userId
        };
      } else {
        adminUser = {
          ...adminResult.rows[0],
          short_name: userName || adminResult.rows[0].soc_portal_id
        };
      }
    } else { // Regular user (shouldn't happen in admin dashboard, but as fallback)
      const userQuery = 'SELECT soc_portal_id, email, role_type, short_name FROM user_info WHERE soc_portal_id = $1';
      const userResult = await query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }
      adminUser = userResult.rows[0];
    }

    const { searchParams } = new URL(request.url);
    const soc_portal_id = searchParams.get('soc_portal_id');
    
    if (!soc_portal_id) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // First get the record to log details
    const selectQuery = 'SELECT * FROM roster_schedule_permission WHERE soc_portal_id = $1';
    const selectResult = await query(selectQuery, [soc_portal_id]);

    if (selectResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Permission record not found' },
        { status: 404 }
      );
    }

    const targetRecord = selectResult.rows[0];

    // Delete the record
    const deleteQuery = 'DELETE FROM roster_schedule_permission WHERE soc_portal_id = $1';
    await query(deleteQuery, [soc_portal_id]);

    // Log admin activity - USING ADMIN_ACTIVITY_LOG TABLE
    const activityLogQuery = `
      INSERT INTO admin_activity_log (
        soc_portal_id, action, description, ip_address, device_info, eid, sid, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `;
    
    const activityDescription = `Removed roster upload permission for ${targetRecord.short_name}`;
    
    await query(activityLogQuery, [
      userId,
      'ROSTER_PERMISSION_DELETE',
      activityDescription,
      ipAddress,
      userAgent,
      eid,
      sessionId
    ]);

    // Create admin notification
    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details');
    const adminNotificationQuery = `
      INSERT INTO admin_notification_details (
        notification_id, title, status, created_at
      )
      VALUES ($1, $2, $3, NOW())
    `;

    const adminNotifParams = [
      adminNotificationId,
      `Roster Upload Permission Removed for ${targetRecord.short_name}`,
      'Unread'
    ];

    await query(adminNotificationQuery, adminNotifParams);

    logger.info('Admin notification created for roster permission deletion', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AdminNotification',
        adminNotificationId,
        deletedUserId: soc_portal_id,
        ipAddress
      }
    });

    // Send Telegram alert
    const alertMessage = formatAlertMessage(
      'DELETE',
      { 
        id: userId, 
        short_name: adminUser.short_name, 
        email: adminUser.email, 
        eid 
      },
      targetRecord.short_name,
      `Removed from roster upload permissions`
    );
    
    await sendTelegramAlert(alertMessage);

    logger.info('Roster permission deleted successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeleteRosterPermission',
        details: activityDescription,
        deletedUserId: soc_portal_id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Permission removed successfully'
    });

  } catch (error) {
    console.error('Error deleting roster permission:', error);
    
    logger.error('Error deleting roster permission', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeleteRosterPermissionError',
        details: `Error: ${error.message}`,
        stack: error.stack,
        userId
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to remove permission' },
      { status: 500 }
    );
  }
}