// app/api/version/route.js
import fs from 'fs';
import path from 'path';

export async function GET() {
  let versionData = { number: 'N/A', date: 'N/A', time: 'N/A' };
  
  try {
    const versionFilePath = path.join(process.cwd(), 'version.txt');
    const content = fs.readFileSync(versionFilePath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/SOC_PORTAL_V_(\d+\.\d+\.\d+) - (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/);
      
      if (match) {
        versionData = {
          number: match[1],
          date: match[2],
          time: match[3]
        };
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      versionData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error reading version.txt:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to read version data'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}