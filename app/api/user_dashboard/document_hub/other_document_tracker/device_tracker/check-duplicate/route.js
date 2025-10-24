// app/api/user_dashboard/document_hub/other_document_tracker/device_tracker/check-duplicate/route.js
import { query } from '../../../../../../../lib/db';
import logger from '../../../../../../../lib/logger';

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';

  try {
    const { searchParams } = new URL(request.url);
    const field = searchParams.get('field');
    const value = searchParams.get('value');
    const excludeDevice = searchParams.get('excludeDevice'); // New parameter

    if (!field || !value) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Field and value are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate field parameter
    const validFields = ['imei_1', 'imei_2', 'sim_1', 'sim_2'];
    if (!validFields.includes(field)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid field parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.debug('Checking for duplicate value', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTrackerDuplicateCheck',
        details: `Checking ${field} with value: ${value}, excluding device: ${excludeDevice}`,
        userId: socPortalId
      }
    });

    // Build the query to check for duplicates, excluding the specified device
    let checkQuery = `
  SELECT dt_id, brand_name, device_model, imei_1, imei_2, sim_1, sim_2
  FROM device_info 
  WHERE (sim_1 = $1 OR sim_2 = $1)
`;

let queryParams = [value];

// If excludeDevice is provided, add condition to exclude that device
if (excludeDevice && excludeDevice !== 'undefined') {
  checkQuery += ` AND dt_id != $2`;
  queryParams.push(excludeDevice);
}

checkQuery += ` LIMIT 1`;

    const result = await query(checkQuery, queryParams);

    if (result.rows.length > 0) {
  const existingDevice = result.rows[0];
  const isSim = field.startsWith('sim');
  
  // Determine which field contains the duplicate
  let duplicateField = null;
  if (existingDevice.sim_1 === value) duplicateField = 'sim_1';
  else if (existingDevice.sim_2 === value) duplicateField = 'sim_2';
  else if (existingDevice.imei_1 === value) duplicateField = 'imei_1';
  else if (existingDevice.imei_2 === value) duplicateField = 'imei_2';
  
  logger.info('Duplicate value found', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'DeviceTrackerDuplicateCheck',
      details: `Duplicate ${field} found in device: ${existingDevice.dt_id} in field ${duplicateField}`
    }
  });

  return new Response(JSON.stringify({
    exists: true,
    isSim: isSim,
    duplicateField: duplicateField, // Add this field
    existingDevice: {
      dt_id: existingDevice.dt_id,
      brand_name: existingDevice.brand_name,
      device_model: existingDevice.device_model,
      imei_1: existingDevice.imei_1,
      imei_2: existingDevice.imei_2
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

    logger.debug('No duplicate value found', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTrackerDuplicateCheck',
        details: `No duplicate found for ${field}: ${value}`,
        userId: socPortalId
      }
    });

    return new Response(JSON.stringify({
      exists: false,
      isSim: false
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Error checking duplicate value', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'DeviceTrackerDuplicateCheck',
        details: `Unexpected error: ${error.message}`,
        error: error.message,
        stack: error.stack
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to check duplicate',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}