// app/api/storage/[...path]/route.js
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import logger from '../../../../lib/logger';

// In-memory request cache to prevent duplicate requests
const requestCache = new Map();
const CACHE_DURATION = 10000; // 10 seconds cache

// Helper function to get client IP
function getClientIP(request) {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIP) {
      return realIP;
    }
    
    // Fallback for development
    return '127.0.0.1';
  } catch (error) {
    return 'Unknown';
  }
}

// Clean up old cache entries
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      requestCache.delete(key);
    }
  }
}

export async function GET(request, { params }) {
  // AWAIT the params object first
  const { path: pathSegments } = await params;
  const filename = pathSegments[pathSegments.length - 1];
  const ipAddress = getClientIP(request);
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const userId = request.cookies.get('socPortalId')?.value || 'Unknown';

  // Create cache key
  const cacheKey = pathSegments.join('/');
  const now = Date.now();
  
  // Clean cache periodically
  if (Math.random() < 0.1) { // 10% chance to clean cache
    cleanCache();
  }

  try {
    logger.debug('Storage file access request initiated', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FileStorageAccess',
        details: `File access attempt: ${pathSegments.join('/')}`,
        filename: filename,
        userId: userId,
        ipAddress: ipAddress,
        action: 'file_access_started'
      }
    });

    // Security check - prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      logger.warn('Security violation: Directory traversal attempt detected', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'SecurityCheck',
          details: `Directory traversal attempt: ${filename}`,
          filename: filename,
          userId: userId,
          ipAddress: ipAddress,
          action: 'security_violation'
        }
      });
      
      return new NextResponse('Invalid file path', { status: 400 });
    }
    
    // Check if this request was recently processed
    const cached = requestCache.get(cacheKey);
    if (cached && (now - cached.timestamp < CACHE_DURATION)) {
      logger.debug('Serving from request cache', {
        meta: {
          filename,
          cacheKey,
          action: 'request_cached'
        }
      });
      
      // Return cached response
      return new NextResponse(cached.buffer, {
        status: 200,
        headers: cached.headers
      });
    }
    
    // Construct the file path - points to your new storage location
    const filePath = path.join(process.cwd(), 'storage', ...pathSegments);
    
    logger.debug('Resolving storage file path', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FileResolution',
        details: `Resolved file path: ${filePath}`,
        filename: filename,
        requestedPath: pathSegments.join('/'),
        userId: userId,
        ipAddress: ipAddress,
        action: 'path_resolved'
      }
    });

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.warn('Requested file not found in storage', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'FileNotFound',
          details: `File not found at path: ${filePath}`,
          filename: filename,
          userId: userId,
          ipAddress: ipAddress,
          action: 'file_not_found'
        }
      });
      
      // Return default image if profile photo doesn't exist
      if (pathSegments.includes('user_dp')) {
        const defaultImagePath = path.join(process.cwd(), 'storage', 'user_dp', 'default_DP.png');
        if (fs.existsSync(defaultImagePath)) {
          logger.info('Serving default profile photo as fallback', {
            meta: {
              eid,
              sid: sessionId,
              taskName: 'DefaultFallback',
              details: 'Original file not found, serving default image',
              filename: filename,
              userId: userId,
              ipAddress: ipAddress,
              action: 'default_image_served'
            }
          });
          
          const defaultFileBuffer = fs.readFileSync(defaultImagePath);
          return new NextResponse(defaultFileBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=3600', // Cache default images longer
            },
          });
        }
      }
      
      return new NextResponse('File not found', { status: 404 });
    }
    
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const fileStats = fs.statSync(filePath);
    
    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    
    // Prepare response headers
    const responseHeaders = {
      'Content-Type': contentType,
      'Cache-Control': isImage ? 'public, max-age=86400' : 'no-cache, no-store, must-revalidate, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Last-Modified': fileStats.mtime.toUTCString(),
      'ETag': `"${fileStats.size}-${fileStats.mtime.getTime()}"`,
    };
    
    // For non-images, add no-cache headers
    if (!isImage) {
      responseHeaders['Pragma'] = 'no-cache';
      responseHeaders['Expires'] = '0';
    }
    
    logger.debug('Successfully serving storage file', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FileDelivery',
        details: `Serving file: ${filename} (${fileStats.size} bytes) as ${contentType}`,
        filename: filename,
        fileSize: fileStats.size,
        contentType: contentType,
        userId: userId,
        ipAddress: ipAddress,
        action: 'file_served_success'
      }
    });

    // Cache the successful response
    requestCache.set(cacheKey, {
      buffer: fileBuffer,
      headers: responseHeaders,
      timestamp: now
    });

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: responseHeaders
    });
    
  } catch (error) {
    logger.error('Error serving storage file', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FileServerError',
        details: `Failed to serve file: ${error.message}`,
        filename: filename,
        error: error.message,
        stack: error.stack,
        userId: userId,
        ipAddress: ipAddress,
        action: 'file_serve_failed'
      }
    });
    
    return new NextResponse('Internal server error', { status: 500 });
  }
}

// Optional: Add security - only allow GET requests
export async function POST() {
  return new NextResponse('Method not allowed', { status: 405 });
}

export async function PUT() {
  return new NextResponse('Method not allowed', { status: 405 });
}

export async function DELETE() {
  return new NextResponse('Method not allowed', { status: 405 });
}