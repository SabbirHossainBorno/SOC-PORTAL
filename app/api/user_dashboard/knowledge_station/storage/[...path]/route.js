// app/api/user_dashboard/knowledge_station/storage/[...path]/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  try {
    // Use absolute path for storage
    const baseStoragePath = '/home/soc_portal/storage/knowledge_station';
    const filePath = path.join(baseStoragePath, ...params.path);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();

    // Determine content type
    let contentType = 'application/octet-stream';
    if (['.jpg', '.jpeg'].includes(fileExtension)) {
      contentType = 'image/jpeg';
    } else if (fileExtension === '.png') {
      contentType = 'image/png';
    } else if (fileExtension === '.gif') {
      contentType = 'image/gif';
    } else if (fileExtension === '.webp') {
      contentType = 'image/webp';
    } else if (['.mp4', '.mov', '.avi'].includes(fileExtension)) {
      contentType = 'video/mp4';
    } else if (fileExtension === '.pdf') {
      contentType = 'application/pdf';
    } else if (['.doc', '.docx'].includes(fileExtension)) {
      contentType = 'application/msword';
    } else if (['.xls', '.xlsx'].includes(fileExtension)) {
      contentType = 'application/vnd.ms-excel';
    } else if (fileExtension === '.zip') {
      contentType = 'application/zip';
    } else if (fileExtension === '.txt') {
      contentType = 'text/plain';
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
    console.error('Error serving knowledge station file:', error);
    return new NextResponse('Error serving file', { status: 500 });
  }
}