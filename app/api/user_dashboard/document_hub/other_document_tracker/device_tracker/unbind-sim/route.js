// app/api/user_dashboard/document_hub/other_document_tracker/device_tracker/unbind-sim/route.js
import { query, getDbConnection } from '../../../../../../../lib/db';
import logger from '../../../../../../../lib/logger';

export async function POST(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';

  try {
    const { deviceId, simNumber } = await request.json();

    if (!deviceId || !simNumber) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Device ID and SIM number are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.info('Starting SIM unbind process', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UnbindSIM',
        details: `Unbinding SIM ${simNumber} from device ${deviceId}`,
        userId: socPortalId
      }
    });

    const client = await getDbConnection();
    
    try {
      await client.query('BEGIN');

      // First, verify the device exists and find which field has the SIM
      const verifyQuery = `
        SELECT dt_id, brand_name, device_model, sim_1, sim_2
        FROM device_info 
        WHERE dt_id = $1 AND (sim_1 = $2 OR sim_2 = $2)
      `;
      
      const verifyResult = await client.query(verifyQuery, [deviceId, simNumber]);
      
      if (verifyResult.rows.length === 0) {
        await client.query('ROLLBACK');
        
        logger.warn('SIM unbind verification failed', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'UnbindSIM',
            details: `Device ${deviceId} does not have SIM ${simNumber} in any field`,
            userId: socPortalId
          }
        });

        return new Response(JSON.stringify({
          success: false,
          message: `Device ${deviceId} does not have the specified SIM number`
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const device = verifyResult.rows[0];
      let updateQuery = '';
      let updateParams = [];
      
      // Determine which field contains the SIM and update accordingly
      if (device.sim_1 === simNumber) {
        updateQuery = 'UPDATE device_info SET sim_1 = NULL, sim_1_persona = NULL WHERE dt_id = $1';
        updateParams = [deviceId];
        logger.debug('Unbinding from sim_1 field', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'UnbindSIM',
            details: `SIM found in sim_1 field for device ${deviceId}`
          }
        });
      } else if (device.sim_2 === simNumber) {
        updateQuery = 'UPDATE device_info SET sim_2 = NULL, sim_2_persona = NULL WHERE dt_id = $1';
        updateParams = [deviceId];
        logger.debug('Unbinding from sim_2 field', {
          meta: {
            eid,
            sid: sessionId,
            taskName: 'UnbindSIM',
            details: `SIM found in sim_2 field for device ${deviceId}`
          }
        });
      } else {
        await client.query('ROLLBACK');
        return new Response(JSON.stringify({
          success: false,
          message: 'SIM not found in device'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Update the device to remove the SIM
      await client.query(updateQuery, updateParams);

      // Log the activity
      await client.query(
        'INSERT INTO user_activity_log (soc_portal_id, action, description, eid, sid) VALUES ($1, $2, $3, $4, $5)',
        [
          socPortalId,
          'UNBIND_SIM',
          `Unbound SIM ${simNumber} from device ${deviceId}`,
          eid,
          sessionId
        ]
      );

      await client.query('COMMIT');

      logger.info('SIM unbound successfully', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UnbindSIM',
          details: `Successfully unbound SIM ${simNumber} from device ${deviceId}`,
          userId: socPortalId
        }
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'SIM unbound successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      if (client.release) {
        await client.release();
      }
    }

  } catch (error) {
    logger.error('Error unbinding SIM', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UnbindSIM',
        details: `Unexpected error: ${error.message}`,
        error: error.message,
        stack: error.stack
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to unbind SIM',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}