// app/api/user_dashboard/document_hub/other_document_tracker/device_tracker/check-duplicate/route.js
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
  const field = searchParams.get('field');
  const value = searchParams.get('value');
  const excludeDevice = searchParams.get('excludeDevice'); // For edit operations

  logger.info('Device duplicate check request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'DeviceDuplicateCheck',
      details: `User ${socPortalId} checking duplicate for ${field}: ${value} | Exclude device: ${excludeDevice || 'None'} | IP: ${ipAddress}`
    }
  });

  // Validate parameters
  if (!field || !value) {
    logger.warn('Duplicate check failed - missing parameters', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceDuplicateCheck',
        details: 'Field and value parameters are required',
        userId: socPortalId
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Field and value parameters are required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validate field type
  const validFields = ['imei_1', 'imei_2', 'sim_1', 'sim_2'];
  if (!validFields.includes(field)) {
    logger.warn('Duplicate check failed - invalid field', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceDuplicateCheck',
        details: `Invalid field: ${field}`,
        userId: socPortalId
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Invalid field parameter'
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
        taskName: 'DeviceDuplicateCheck',
        details: `Querying database for ${field}: ${value}, excluding device: ${excludeDevice || 'None'}`
      }
    });

    client = await getDbConnection().connect();
    await client.query(`SET TIME ZONE 'Asia/Dhaka';`);

    let queryString = '';
    let queryParams = [];
    let isSim = field.startsWith('sim');

    if (isSim) {
      // For SIM fields, check both device_info and sim_info tables
      
      // Check device_info table for duplicate SIM
      let deviceQuery = `
        SELECT dt_id, brand_name, device_model, imei_1, imei_2, 
               sim_1, sim_2, track_by, created_at
        FROM device_info 
        WHERE (sim_1 = $1 OR sim_2 = $1)
      `;
      
      let deviceParams = [value];
      
      // Exclude current device if provided (for edit operations)
      if (excludeDevice) {
        deviceQuery += ' AND dt_id != $2';
        deviceParams.push(excludeDevice);
      }
      
      deviceQuery += ' LIMIT 1';
      
      const deviceResult = await client.query(deviceQuery, deviceParams);
      
      if (deviceResult.rows.length > 0) {
        const existingDevice = deviceResult.rows[0];
        const duplicateField = existingDevice.sim_1 === value ? 'sim_1' : 'sim_2';
        
        logger.debug('SIM duplicate found in device_info table', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'DeviceDuplicateCheck',
            details: `SIM ${value} found in device ${existingDevice.dt_id}, field: ${duplicateField}`,
            exists: true,
            deviceId: existingDevice.dt_id,
            duplicateField
          }
        });

        const requestDuration = Date.now() - requestStartTime;
        
        logger.info('SIM duplicate check completed - duplicate found', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'DeviceDuplicateCheck',
            details: `SIM duplicate found in ${requestDuration}ms | SIM: ${value} | Device: ${existingDevice.dt_id}`,
            userId: socPortalId,
            duration: requestDuration,
            duplicateDeviceId: existingDevice.dt_id
          }
        });

        return new Response(JSON.stringify({
          success: true,
          exists: true,
          existingDevice: existingDevice,
          isSim: true,
          duplicateField: duplicateField,
          message: `SIM already exists in device ${existingDevice.dt_id}`
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check sim_info table for the SIM
      const simQuery = `
        SELECT st_id, msisdn, mno, assigned_persona, profile_type, 
               msisdn_status, device_tag, track_by, created_at
        FROM sim_info 
        WHERE msisdn = $1
        LIMIT 1
      `;
      
      const simResult = await client.query(simQuery, [value]);
      
      if (simResult.rows.length > 0) {
        const existingSim = simResult.rows[0];
        
        logger.debug('SIM found in sim_info table', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'DeviceDuplicateCheck',
            details: `SIM ${value} found in SIM table with ID: ${existingSim.st_id}, Device tag: ${existingSim.device_tag || 'None'}`,
            simExists: true,
            simId: existingSim.st_id,
            deviceTag: existingSim.device_tag
          }
        });

        const requestDuration = Date.now() - requestStartTime;
        
        logger.info('SIM check completed - SIM exists in database', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'DeviceDuplicateCheck',
            details: `SIM exists in database in ${requestDuration}ms | SIM: ${value} | SIM ID: ${existingSim.st_id} | Device tag: ${existingSim.device_tag || 'None'}`,
            userId: socPortalId,
            duration: requestDuration,
            simId: existingSim.st_id
          }
        });

        return new Response(JSON.stringify({
          success: true,
          exists: false, // Not a duplicate in device_info, but exists in sim_info
          existingDevice: null,
          existingSim: existingSim,
          isSim: true,
          message: existingSim.device_tag 
            ? `SIM exists in database but is bound to device ${existingSim.device_tag}` 
            : 'SIM exists in database and is available for binding'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // SIM not found in either table
      logger.debug('SIM not found in any table', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'DeviceDuplicateCheck',
          details: `SIM ${value} not found in device_info or sim_info tables`,
          exists: false
        }
      });

    } else {
      // For IMEI fields, only check device_info table
      queryString = `
        SELECT dt_id, brand_name, device_model, imei_1, imei_2, 
               sim_1, sim_2, track_by, created_at
        FROM device_info 
        WHERE ${field} = $1
      `;
      
      queryParams = [value];
      
      // Exclude current device if provided (for edit operations)
      if (excludeDevice) {
        queryString += ' AND dt_id != $2';
        queryParams.push(excludeDevice);
      }
      
      queryString += ' LIMIT 1';

      const result = await client.query(queryString, queryParams);
      const exists = result.rows.length > 0;
      const existingDevice = exists ? result.rows[0] : null;

      logger.debug('IMEI duplicate check completed', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'DeviceDuplicateCheck',
          details: `IMEI ${value} exists: ${exists}, Device ID: ${existingDevice?.dt_id || 'N/A'}`,
          exists,
          deviceId: existingDevice?.dt_id
        }
      });
    }

    const requestDuration = Date.now() - requestStartTime;

    if (isSim) {
      logger.info('SIM check completed - no duplicates found', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'DeviceDuplicateCheck',
          details: `No duplicates found for SIM: ${value} in ${requestDuration}ms`,
          userId: socPortalId,
          duration: requestDuration
        }
      });
    } else {
      if (queryString) {
        const result = await client.query(queryString, queryParams);
        const exists = result.rows.length > 0;
        const existingDevice = exists ? result.rows[0] : null;

        if (exists) {
          logger.info('IMEI duplicate found', {
            meta: {
              eid,
              sid: sessionId,
              taskName: 'DeviceDuplicateCheck',
              details: `Duplicate found for ${field}: ${value} in device ${existingDevice.dt_id} | Duration: ${requestDuration}ms`,
              userId: socPortalId,
              duplicateDeviceId: existingDevice.dt_id,
              duration: requestDuration
            }
          });
        } else {
          logger.info('No IMEI duplicate found', {
            meta: {
              eid,
              sid: sessionId,
              taskName: 'DeviceDuplicateCheck',
              details: `No duplicate found for ${field}: ${value} | Duration: ${requestDuration}ms`,
              userId: socPortalId,
              duration: requestDuration
            }
          });
        }

        return new Response(JSON.stringify({
          success: true,
          exists,
          existingDevice,
          isSim: false,
          message: exists ? `${field.toUpperCase()} already exists in device ${existingDevice.dt_id}` : 'No duplicate found'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // For SIM checks that didn't find anything
    return new Response(JSON.stringify({
      success: true,
      exists: false,
      existingDevice: null,
      existingSim: null,
      isSim: true,
      message: 'No duplicate found'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorDuration = Date.now() - requestStartTime;
    
    logger.error('Error in duplicate check', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceDuplicateCheck',
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
      existingDevice: null,
      existingSim: null,
      message: 'Error checking duplicate'
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
      } catch (releaseError) {
        logger.error('Error releasing database client', {
          error: releaseError.message,
          meta: {
            eid,
            sid: sessionId,
            taskName: 'DeviceDuplicateCheck',
            details: 'Failed to release database connection'
          }
        });
      }
    }
  }
}