//app/api/user_dashboard/document_hub/access_form_edit/[af_tracking_id]/upload_document/route.js
import { query, getDbConnection } from '../../../../../../../lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import logger from '../../../../../../../lib/logger';
import { createNotifications } from '../../../../../../../lib/notificationUtils';

// Safe client release function
const releaseClient = async (client) => {
  try {
    if (client && typeof client.release === 'function') {
      await client.release();
      console.log('Database client released successfully');
    } else if (client && typeof client.end === 'function') {
      await client.end();
      console.log('Database client ended successfully');
    } else if (client) {
      console.warn('Client does not have release or end method', { client });
    }
  } catch (error) {
    console.error('Error releasing database client:', error.message);
    logger.error('Error releasing database client', { error: error.message, stack: error.stack });
  }
};

export async function POST(request, { params }) {
  const { af_tracking_id } = await params;
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

  let client;
  
  try {
    const formData = await request.formData();
    const version = formData.get('version');
    const document = formData.get('document');
    const audit_remark = formData.get('audit_remark') || '';

    console.log('Upload document request:', {
      af_tracking_id,
      version,
      hasDocument: !!document,
      audit_remark
    });
    
    if (!version) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Version is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    client = await getDbConnection();
    console.log('Database connection established');
    
    try {
      await client.query('BEGIN');
      console.log('Transaction started');
      
      // Get user info
      const userResponse = await client.query(
        'SELECT short_name FROM user_info WHERE soc_portal_id = $1',
        [socPortalId]
      );
      
      const userInfo = userResponse.rows[0];
      console.log('User info fetched:', userInfo);
      
      let documentLocation = null;
      
      // Only process document if provided
      if (document && document.size > 0) {
        console.log('Processing document upload');
        // Upload document
        const uploadDir = '/home/soc_portal/public/storage/access_form';
        const fileName = `${af_tracking_id}_V${version}.pdf`;
        const filePath = path.join(uploadDir, fileName);
        documentLocation = `/storage/access_form/${fileName}`;
        
        await mkdir(uploadDir, { recursive: true });
        const arrayBuffer = await document.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await writeFile(filePath, buffer);
        console.log('Document saved to:', documentLocation);
      }
      
      // Check if audit trail entry exists for this version
      const auditCheck = await client.query(
        'SELECT * FROM access_form_audit_trail WHERE af_tracking_id = $1 AND version = $2',
        [af_tracking_id, version]
      );
      
      if (auditCheck.rows.length > 0) {
        // Update existing audit trail record
        console.log('Updating existing audit trail record');
        await client.query(
          `UPDATE access_form_audit_trail 
           SET document_location = COALESCE($1, document_location), 
               updated_by = $2, 
               updated_at = CURRENT_TIMESTAMP,
               audit_remark = $3
           WHERE af_tracking_id = $4 AND version = $5`,
          [documentLocation, userInfo.short_name, audit_remark, af_tracking_id, version]
        );
        console.log('Document uploaded with remark:', audit_remark);
      } else {
        // Create new audit trail record (this shouldn't normally happen)
        console.log('Creating new audit trail record');
        await client.query(
          `INSERT INTO access_form_audit_trail 
           (af_tracking_id, version, action_type, document_location, updated_by, ip_address, user_agent, audit_remark)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [af_tracking_id, version, 'DOCUMENT_UPDATE', documentLocation, userInfo.short_name, ipAddress, userAgent, audit_remark]
        );
      }
      
      // If this is the latest version and we have a document, update the main table
      if (documentLocation) {
        console.log('Checking if this is the latest version');
        const maxVersionResult = await client.query(
          'SELECT MAX(version) as max_version FROM access_form_audit_trail WHERE af_tracking_id = $1',
          [af_tracking_id]
        );
        
        const maxVersion = maxVersionResult.rows[0].max_version;
        if (parseInt(version) === parseInt(maxVersion)) {
          console.log('Updating main table with new document location');
          await client.query(
            'UPDATE access_form_tracker SET document_location = $1 WHERE af_tracking_id = $2',
            [documentLocation, af_tracking_id]
          );
        }
      }

      // Create notifications for document upload
      try {
        console.log('Creating notifications');
        const documentNotificationTitle = `Document Uploaded for Access Form: ${af_tracking_id} (Version ${version}) By ${userInfo.short_name}`;
        await createNotifications(client, socPortalId, documentNotificationTitle, userInfo);
        console.log('Notifications created for document upload');
      } catch (error) {
        console.error('Failed to create notifications, but continuing with document upload:', error);
        // Don't throw error here to avoid breaking the main transaction
      }
      
      await client.query('COMMIT');
      console.log('Transaction committed');
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Document uploaded successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Error in transaction:', error);
      if (client) {
        await client.query('ROLLBACK');
        console.log('Transaction rolled back');
      }
      logger.error('Error in upload_document transaction', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UploadDocument',
          details: `Error: ${error.message}`,
          userId: socPortalId,
          error: error.message,
          stack: error.stack,
          af_tracking_id,
          version
        }
      });
      throw error;
    }
    
  } catch (error) {
    console.error('Error in upload_document:', error);
    logger.error('Error in upload_document', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UploadDocument',
        details: `Error: ${error.message}`,
        userId: socPortalId,
        error: error.message,
        stack: error.stack,
        af_tracking_id
      }
    });
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to upload document',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    if (client) {
      await releaseClient(client);
    }
  }
}