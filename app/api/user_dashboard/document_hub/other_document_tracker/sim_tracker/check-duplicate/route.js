//app/api/user_dashboard/document_hub/other_document_tracker/sim_tracker/check-duplicate/route.js
import { getDbConnection } from '../../../../../../../lib/db';
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

  logger.info('SIM duplicate check request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'SimTrackerDuplicateCheck',
      details: `User ${socPortalId} checking duplicate for MSISDN: ${msisdn} | IP: ${ipAddress}`
    }
  });

  // Validate MSISDN parameter
  if (!msisdn) {
    logger.warn('SIM duplicate check failed - missing MSISDN parameter', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTrackerDuplicateCheck',
        details: 'MSISDN parameter is required',
        userId: socPortalId
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'MSISDN parameter is required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validate MSISDN format
  const validPrefixes = ['017', '013', '019', '014', '016', '018', '015'];
  if (!/^\d{11}$/.test(msisdn) || !validPrefixes.includes(msisdn.substring(0, 3))) {
    logger.warn('SIM duplicate check failed - invalid MSISDN format', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTrackerDuplicateCheck',
        details: `Invalid MSISDN format: ${msisdn}`,
        userId: socPortalId
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Invalid MSISDN format'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let client;
  try {
    logger.debug('Starting duplicate check database query', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTrackerDuplicateCheck',
        details: `Querying database for MSISDN: ${msisdn}`
      }
    });

    // Get client from pool using your existing pattern
    client = await getDbConnection().connect();
    
    // Set timezone for this client session
    await client.query(`SET TIME ZONE 'Asia/Dhaka';`);

    const result = await client.query(
      `SELECT st_id, msisdn, mno, assigned_persona, profile_type, msisdn_status, 
              device_tag, track_by, created_at 
       FROM sim_info 
       WHERE msisdn = $1`,
      [msisdn]
    );

    const exists = result.rows.length > 0;
    const existingSim = exists ? result.rows[0] : null;

    logger.debug('Duplicate check completed', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTrackerDuplicateCheck',
        details: `MSISDN ${msisdn} exists: ${exists}, SIM ID: ${existingSim?.st_id || 'N/A'}`,
        exists,
        simId: existingSim?.st_id
      }
    });

    const requestDuration = Date.now() - requestStartTime;

    if (exists) {
      logger.info('Duplicate MSISDN found', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'SimTrackerDuplicateCheck',
          details: `Duplicate found for MSISDN: ${msisdn} in SIM ${existingSim.st_id} | Duration: ${requestDuration}ms`,
          userId: socPortalId,
          duplicateSimId: existingSim.st_id,
          duration: requestDuration
        }
      });
    } else {
      logger.info('No duplicate MSISDN found', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'SimTrackerDuplicateCheck',
          details: `No duplicate found for MSISDN: ${msisdn} | Duration: ${requestDuration}ms`,
          userId: socPortalId,
          duration: requestDuration
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      exists,
      existingSim,
      message: exists ? `MSISDN already exists in SIM ${existingSim.st_id}` : 'No duplicate found'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorDuration = Date.now() - requestStartTime;
    
    logger.error('Error in SIM duplicate check', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SimTrackerDuplicateCheck',
        details: `Database error after ${errorDuration}ms: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack,
        duration: errorDuration
      }
    });

    return new Response(JSON.stringify({
      success: false,
      exists: false,
      existingSim: null,
      message: 'Error checking duplicate MSISDN'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    if (client) {
      try {
        // Release client back to pool using your existing pattern
        client.release();
        logger.debug('Database connection released successfully', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'SimTrackerDuplicateCheck',
            details: 'Database client released successfully'
          }
        });
      } catch (releaseError) {
        logger.error('Error releasing database client', {
          error: releaseError.message,
          stack: releaseError.stack,
          meta: {
            eid,
            sid: sessionId,
            taskName: 'SimTrackerDuplicateCheck',
            details: 'Failed to release database connection'
          }
        });
      }
    } else {
      logger.warn('No database client to release', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'SimTrackerDuplicateCheck',
          details: 'Client was not initialized or already released'
        }
      });
    }
  }
}