//app/api/user_dashboard/document_hub/other_document_tracker/sim_tracker/check-devices/route.js
import { query, getDbConnection } from '../../../../../../../lib/db';
import logger from '../../../../../../../lib/logger';

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  const requestStartTime = Date.now();
  const { searchParams } = new URL(request.url);
  const msisdn = searchParams.get('msisdn');

  logger.info('Device check for SIM request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'CheckSimDevices',
      details: `User ${socPortalId} checking devices for SIM: ${msisdn} | IP: ${ipAddress}`
    }
  });

  // Validate MSISDN parameter
  if (!msisdn) {
    logger.warn('Device check failed - missing MSISDN parameter', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'CheckSimDevices',
        details: 'MSISDN parameter is required',
        userId: socPortalId
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'MSISDN parameter is required',
      devices: []
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validate MSISDN format
  const validPrefixes = ['017', '013', '019', '014', '016', '018', '015'];
  if (!/^\d{11}$/.test(msisdn) || !validPrefixes.includes(msisdn.substring(0, 3))) {
    logger.warn('Device check failed - invalid MSISDN format', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'CheckSimDevices',
        details: `Invalid MSISDN format: ${msisdn}`,
        userId: socPortalId
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Invalid MSISDN format',
      devices: []
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let client;
  try {
    logger.debug('Starting device check database query', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'CheckSimDevices',
        details: `Checking devices for SIM: ${msisdn}`
      }
    });

    client = await getDbConnection();

    // Search for devices that have this MSISDN in either sim_1 or sim_2
    const result = await client.query(
      `SELECT dt_id, brand_name, device_model, imei_1, imei_2, 
              sim_1, sim_1_persona, sim_2, sim_2_persona,
              purpose, device_status, track_by, created_at
       FROM device_info 
       WHERE sim_1 = $1 OR sim_2 = $1
       ORDER BY created_at DESC`,
      [msisdn]
    );

    const devices = result.rows;

    logger.debug('Device check completed', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'CheckSimDevices',
        details: `Found ${devices.length} devices for SIM: ${msisdn}`,
        deviceCount: devices.length,
        deviceIds: devices.map(d => d.dt_id)
      }
    });

    const requestDuration = Date.now() - requestStartTime;

    logger.info('Device check finished successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'CheckSimDevices',
        details: `Found ${devices.length} devices for SIM: ${msisdn} | Duration: ${requestDuration}ms`,
        userId: socPortalId,
        deviceCount: devices.length,
        duration: requestDuration
      }
    });

    return new Response(JSON.stringify({
      success: true,
      devices,
      message: `Found ${devices.length} devices`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorDuration = Date.now() - requestStartTime;
    
    logger.error('Error in device check', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'CheckSimDevices',
        details: `Database error after ${errorDuration}ms: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack,
        duration: errorDuration
      }
    });

    return new Response(JSON.stringify({
      success: false,
      devices: [],
      message: 'Error checking devices'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    if (client) {
      try {
        if (client.release) {
          await client.release();
        }
      } catch (error) {
        logger.error('Error releasing database client', {
          error: error.message,
          meta: {
            eid,
            sid: sessionId,
            taskName: 'CheckSimDevices',
            details: 'Failed to release database connection'
          }
        });
      }
    }
  }
}