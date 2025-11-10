//lib/notificationUtils.js
import logger from './logger';
import { query } from './db';

// Generate a unique notification ID with the specified prefix and table
export const generateNotificationId = async (prefix, table, client, sessionId = 'Unknown', eid = 'Unknown', userId = 'Unknown', ipAddress = 'Unknown IP', userAgent = 'Unknown User-Agent') => {
  try {
    // Validate inputs
    if (!prefix || typeof prefix !== 'string' || !['AN', 'UN'].includes(prefix)) {
      throw new Error(`Invalid or missing prefix: ${prefix}`);
    }
    if (!table || typeof table !== 'string' || !['admin_notification_details', 'user_notification_details'].includes(table)) {
      throw new Error(`Invalid or missing table name: ${table}`);
    }
    if (!client || typeof client.query !== 'function') {
      throw new Error('Invalid database client');
    }

    logger.info('Generating notification ID', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GenerateNotificationId',
        details: `Generating notification ID for prefix ${prefix} and table ${table}`,
        userId,
        ipAddress,
        userAgent,
        prefix,
        table
      }
    });

    const result = await client.query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(4, '0');
    const notificationId = `${prefix}${nextId}SOCP`;

    logger.debug('Notification ID generated successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GenerateNotificationId',
        details: `Generated ID: ${notificationId}`,
        userId,
        ipAddress,
        userAgent,
        prefix,
        table,
        maxSerial,
        notificationId
      }
    });

    return notificationId;
  } catch (error) {
    logger.error('Error generating notification ID', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GenerateNotificationId',
        details: `Failed to generate notification ID for prefix ${prefix} and table ${table}`,
        userId,
        ipAddress,
        userAgent,
        prefix,
        table,
        error: error.message,
        stack: error.stack
      }
    });
    throw error;
  }
};

// Helper function to get current timestamp in BDT (UTC+06:00)
const getBDTTime = () => {
  const now = new Date();
  // Convert to BDT by adding 6 hours (6 * 60 * 60 * 1000 milliseconds)
  const bdtTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  // Format to PostgreSQL-compatible timestamp: 'YYYY-MM-DD HH:mm:ss.SSS'
  const year = bdtTime.getUTCFullYear();
  const month = String(bdtTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(bdtTime.getUTCDate()).padStart(2, '0');
  const hours = String(bdtTime.getUTCHours()).padStart(2, '0');
  const minutes = String(bdtTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(bdtTime.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(bdtTime.getUTCMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
};

/**
 * Creates admin and user notifications in the database with BDT timestamps.
 * @param {Object} client - Database client
 * @param {string} socPortalId - User's SOC portal ID
 * @param {string} title - Notification title
 * @param {string} [sessionId='Unknown'] - Session ID
 * @param {string} [eid='Unknown'] - Execution ID
 * @param {string} [ipAddress='Unknown IP'] - IP address
 * @param {string} [userAgent='Unknown User-Agent'] - User agent
 * @returns {Promise<{ adminNotificationId: string, userNotificationId: string }>} Generated notification IDs
 */
export const createNotifications = async (client, socPortalId, title, sessionId = 'Unknown', eid = 'Unknown', ipAddress = 'Unknown IP', userAgent = 'Unknown User-Agent') => {
  try {
    // Validate inputs
    if (!socPortalId || typeof socPortalId !== 'string') {
      throw new Error('Invalid or missing socPortalId');
    }
    if (!title || typeof title !== 'string') {
      throw new Error('Invalid or missing title');
    }
    if (!client || typeof client.query !== 'function') {
      throw new Error('Invalid database client');
    }

    logger.info('Creating notifications', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'CreateNotifications',
        details: `Creating admin and user notifications for socPortalId ${socPortalId}`,
        userId: socPortalId,
        ipAddress,
        userAgent,
        title
      }
    });

    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details', client, sessionId, eid, socPortalId, ipAddress, userAgent);
    const userNotificationId = await generateNotificationId('UN', 'user_notification_details', client, sessionId, eid, socPortalId, ipAddress, userAgent);

    // Get current BDT timestamp
    const bdtTimestamp = getBDTTime();

    // Insert admin notification with explicit BDT timestamps
    await client.query(
      'INSERT INTO admin_notification_details (notification_id, title, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
      [adminNotificationId, title, 'Unread', bdtTimestamp, bdtTimestamp]
    );

    // Insert user notification with explicit BDT timestamps
    await client.query(
      'INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [userNotificationId, title, 'Unread', socPortalId, bdtTimestamp, bdtTimestamp]
    );

    logger.debug('Notifications created successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'CreateNotifications',
        details: `Created admin notification ${adminNotificationId} and user notification ${userNotificationId} with BDT timestamp ${bdtTimestamp}`,
        userId: socPortalId,
        ipAddress,
        userAgent,
        adminNotificationId,
        userNotificationId,
        title,
        bdtTimestamp
      }
    });

    return { adminNotificationId, userNotificationId };
  } catch (error) {
    logger.error('Error creating notifications', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'CreateNotifications',
        details: `Failed to create notifications for socPortalId ${socPortalId}`,
        userId: socPortalId,
        ipAddress,
        userAgent,
        title,
        error: error.message,
        stack: error.stack
      }
    });
    throw error;
  }
};