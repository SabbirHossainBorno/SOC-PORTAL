// app/api/user_dashboard/document_hub/access_form_tracker/validate/route.js
import { query } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  const { searchParams } = new URL(request.url);
  const field = searchParams.get('field');
  const value = searchParams.get('value');
  const formType = searchParams.get('formType');

  logger.info('Validation request received', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'AccessFormValidation',
      details: `User ${socPortalId} validating ${field} with value ${value} for form type ${formType}`,
      userId: socPortalId,
      ipAddress,
      userAgent,
      field,
      value,
      formType
    }
  });

  if (!field || !value) {
    logger.warn('Validation request missing parameters', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AccessFormValidation',
        details: 'Field or value parameter missing',
        userId: socPortalId,
        field,
        value
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

  // Validate allowed fields
  const allowedFields = ['ngd_id', 'email'];
  if (!allowedFields.includes(field)) {
    logger.warn('Invalid field requested for validation', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AccessFormValidation',
        details: `Invalid field requested: ${field}`,
        userId: socPortalId,
        field,
        value
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

  try {
    // Build the query based on form type
    let queryText = `SELECT user_name, portal_name, status, effective_date FROM access_form_tracker WHERE ${field} = $1`;
    let queryParams = [value];
    
    // Add form type filter if provided
    if (formType && formType !== 'CustomerService') {
      queryText += ` AND access_form_type = $2`;
      queryParams.push(formType);
    }
    
    logger.debug('Executing validation query', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AccessFormValidation',
        details: `Querying database: ${queryText} with params: ${queryParams}`,
        userId: socPortalId
      }
    });
    
    const result = await query(queryText, queryParams);

    logger.info('Validation query completed', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AccessFormValidation',
        details: `Found ${result.rows.length} records for ${field} = ${value} and form type ${formType}`,
        userId: socPortalId,
        recordCount: result.rows.length
      }
    });

    return new Response(JSON.stringify({
      success: true,
      exists: result.rows.length > 0,
      records: result.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Validation error', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'AccessFormValidation',
        details: `Error validating ${field}: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack
      }
    });
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Error validating field'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}