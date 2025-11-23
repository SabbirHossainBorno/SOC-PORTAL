// app/api/admin_dashboard/notice_board/storage/[...path]/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  try {
    // Await the params promise first
    const resolvedParams = await params;
    const baseStoragePath = '/home/soc_portal/storage/notice_board';
    
    // Use the resolved params
    const filePath = path.join(baseStoragePath, ...resolvedParams.path);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();

    let contentType = 'application/octet-stream';
    if (['.jpg', '.jpeg'].includes(fileExtension)) {
      contentType = 'image/jpeg';
    } else if (fileExtension === '.png') {
      contentType = 'image/png';
    } else if (fileExtension === '.gif') {
      contentType = 'image/gif';
    } else if (fileExtension === '.webp') {
      contentType = 'image/webp';
    } else if (fileExtension === '.pdf') {
      contentType = 'application/pdf';
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error serving notice board file:', error);
    return new NextResponse('Error serving file', { status: 500 });
  }
}