// app/api/user_dashboard/document_hub/access_form_edit/[af_tracking_id]/documents/route.js
import { readdir, stat } from 'fs/promises';
import path from 'path';

export async function GET(request, { params }) {
  // Await the params first
  const { af_tracking_id } = await params;
  
  try {
    const uploadDir = '/home/soc_portal/public/storage/access_form';
    
    try {
      const files = await readdir(uploadDir);
      const pattern = new RegExp(`^${af_tracking_id}_V(\\d+)\\.pdf$`);
      
      const documents = [];
      for (const file of files) {
        const match = file.match(pattern);
        if (match) {
          const version = parseInt(match[1], 10);
          const filePath = path.join(uploadDir, file);
          const fileStats = await stat(filePath);
          
          documents.push({
            version: `V${version}`,
            url: `/storage/access_form/${file}`,
            uploaded_at: fileStats.mtime.toISOString()
          });
        }
      }
      
      // Sort by version descending (newest first)
      documents.sort((a, b) => {
        const aVer = parseInt(a.version.substring(1));
        const bVer = parseInt(b.version.substring(1));
        return bVer - aVer;
      });
      
      return new Response(JSON.stringify({
        success: true,
        documents
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      // Directory doesn't exist or other error
      return new Response(JSON.stringify({
        success: true,
        documents: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch document history',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}