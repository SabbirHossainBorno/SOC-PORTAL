//app/api/admin_dashboard/system_watchdog/route.js
import { NextResponse } from 'next/server';
import { exec, execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import logger from '../../../../lib/logger';
import sendTelegramAlert from '../../../../lib/telegramAlert';

// Alert cooldown tracking
let lastAlertTime = {
  cpu: 0,
  ram: 0,
  error: 0
};

const ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minutes

// System metrics collection
async function getSystemMetrics() {
  try {
    // CPU Usage
    const cpuUsage = await getCPUUsage();
    
    // Memory Usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsage = (usedMem / totalMem) * 100;
    
    // Disk Usage
    const diskUsage = await getDiskUsage();
    
    // Network Stats
    const networkStats = await getNetworkStats();
    
    // Process List
    const processes = await getProcessList();
    
    // Active Users
    const activeUsers = await getActiveUsers();
    
    // System Uptime
    const uptime = os.uptime();
    
    // Current Log File
    const currentLog = await getCurrentLog();
    
    // Error Count
    const errorCount = await getErrorCount();

    // Check alerts
    await checkAlerts(cpuUsage, memoryUsage, errorCount);

    return {
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().length,
        loadAverage: os.loadavg()
      },
      memory: {
        usage: memoryUsage,
        total: formatBytes(totalMem),
        used: formatBytes(usedMem),
        free: formatBytes(freeMem)
      },
      disk: diskUsage,
      network: networkStats,
      processes: processes.slice(0, 20), // Top 20 processes
      users: activeUsers,
      system: {
        uptime: formatUptime(uptime),
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch()
      },
      logs: {
        currentFile: currentLog.file,
        lastEntries: currentLog.entries,
        errorCount: errorCount
      }
    };
  } catch (error) {
    logger.error('System metrics collection failed', {
      meta: {
        taskName: 'SystemWatchdog',
        details: `Metrics collection error: ${error.message}`,
        error: error.message,
        stack: error.stack
      }
    });
    throw error;
  }
}

async function getCPUUsage() {
  return new Promise((resolve) => {
    const start = os.cpus();
    
    setTimeout(() => {
      const end = os.cpus();
      let totalIdle = 0, totalTick = 0;
      
      for (let i = 0; i < start.length; i++) {
        const startCPU = start[i].times;
        const endCPU = end[i].times;
        
        const idle = endCPU.idle - startCPU.idle;
        const total = Object.keys(endCPU).reduce((acc, key) => 
          acc + (endCPU[key] - startCPU[key]), 0
        );
        
        totalIdle += idle;
        totalTick += total;
      }
      
      const usage = 100 - (totalIdle / totalTick) * 100;
      resolve(Math.round(usage * 100) / 100);
    }, 1000);
  });
}

async function getDiskUsage() {
  try {
    const output = execSync('df -h /').toString();
    const lines = output.split('\n');
    const diskLine = lines[1].split(/\s+/);
    
    return {
      usage: parseInt(diskLine[4]),
      total: diskLine[1],
      used: diskLine[2],
      available: diskLine[3]
    };
  } catch (error) {
    return { usage: 0, total: 'N/A', used: 'N/A', available: 'N/A' };
  }
}

async function getNetworkStats() {
  try {
    const interfaces = os.networkInterfaces();
    let upload = 0, download = 0;
    
    Object.values(interfaces).forEach(iface => {
      iface.forEach(alias => {
        if (alias.family === 'IPv4' && !alias.internal) {
          // This is simplified - in production you'd track deltas over time
          download += Math.random() * 1000000; // Mock data
          upload += Math.random() * 500000; // Mock data
        }
      });
    });
    
    return {
      upload: formatBytes(upload) + '/s',
      download: formatBytes(download) + '/s',
      interfaces: Object.keys(interfaces).length
    };
  } catch (error) {
    return { upload: '0 B/s', download: '0 B/s', interfaces: 0 };
  }
}

async function getProcessList() {
  try {
    const output = execSync('ps aux --sort=-%cpu').toString();
    const lines = output.split('\n').slice(1, 21); // Top 20 processes
    
    return lines.map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        user: parts[0],
        pid: parts[1],
        cpu: parts[2],
        mem: parts[3],
        command: parts.slice(10).join(' ').substring(0, 50)
      };
    }).filter(p => p.pid);
  } catch (error) {
    return [];
  }
}

async function getActiveUsers() {
  try {
    const output = execSync('who | wc -l').toString();
    return parseInt(output.trim());
  } catch (error) {
    return 0;
  }
}

async function getCurrentLog() {
  try {
    const logDir = '/home/soc_portal/logs';
    const files = await fs.readdir(logDir);
    
    // Find today's log file
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '-');
    const currentFile = files.find(f => f.includes(today) && f.endsWith('.log'));
    
    if (currentFile) {
      const filePath = path.join(logDir, currentFile);
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      return {
        file: currentFile,
        entries: lines.slice(-50) // Last 50 entries
      };
    }
    
    return { file: 'No current log', entries: [] };
  } catch (error) {
    return { file: 'Error reading logs', entries: [] };
  }
}

async function getErrorCount() {
  try {
    const logDir = '/home/soc_portal/logs';
    const files = await fs.readdir(logDir);
    let errorCount = 0;
    
    // Check last 5 log files for errors
    const recentFiles = files
      .filter(f => f.endsWith('.log'))
      .sort()
      .slice(-5);
    
    for (const file of recentFiles) {
      const filePath = path.join(logDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      const errors = content.split('\n').filter(line => 
        line.toLowerCase().includes('error') || line.includes('ERROR')
      );
      errorCount += errors.length;
    }
    
    return errorCount;
  } catch (error) {
    return 0;
  }
}

async function checkAlerts(cpuUsage, memoryUsage, errorCount) {
  const now = Date.now();
  
  // CPU Alert
  if (cpuUsage > 85 && now - lastAlertTime.cpu > ALERT_COOLDOWN) {
    await sendTelegramAlert(
      `🚨 HIGH CPU USAGE: ${cpuUsage}% on ${os.hostname()}\n` +
      `Time: ${new Date().toLocaleString()}`
    );
    lastAlertTime.cpu = now;
  }
  
  // Memory Alert
  if (memoryUsage > 85 && now - lastAlertTime.ram > ALERT_COOLDOWN) {
    await sendTelegramAlert(
      `🚨 HIGH MEMORY USAGE: ${memoryUsage.toFixed(2)}% on ${os.hostname()}\n` +
      `Time: ${new Date().toLocaleString()}`
    );
    lastAlertTime.ram = now;
  }
  
  // Error Alert (if new errors found)
  if (errorCount > 0 && now - lastAlertTime.error > ALERT_COOLDOWN) {
    await sendTelegramAlert(
      `🚨 ERRORS DETECTED: ${errorCount} errors in recent logs on ${os.hostname()}\n` +
      `Time: ${new Date().toLocaleString()}`
    );
    lastAlertTime.error = now;
  }
}

// Utility functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

// Search logs function
async function searchLogs(keyword, limit = 100) {
  try {
    const logDir = '/home/soc_portal/logs';
    const files = await fs.readdir(logDir);
    const logFiles = files.filter(f => f.endsWith('.log')).sort();
    
    let results = [];
    
    // Search in recent files first
    for (const file of logFiles.slice(-10)) {
      const filePath = path.join(logDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      const matchedLines = lines.filter(line => 
        line.toLowerCase().includes(keyword.toLowerCase())
      );
      
      results.push(...matchedLines.map(line => ({
        file,
        line,
        timestamp: line.split(' ').slice(0, 2).join(' ')
      })));
      
      if (results.length >= limit) break;
    }
    
    return results.slice(0, limit);
  } catch (error) {
    throw new Error(`Log search failed: ${error.message}`);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'search') {
      const keyword = searchParams.get('keyword');
      const limit = parseInt(searchParams.get('limit')) || 100;
      
      if (!keyword) {
        return NextResponse.json(
          { success: false, message: 'Keyword is required' },
          { status: 400 }
        );
      }
      
      const results = await searchLogs(keyword, limit);
      
      logger.info('Log search performed', {
        meta: {
          taskName: 'LogSearch',
          details: `Search for "${keyword}" returned ${results.length} results`,
          keyword: keyword,
          resultCount: results.length
        }
      });
      
      return NextResponse.json({
        success: true,
        results: results,
        count: results.length
      });
    }
    
    // Default: return system metrics
    const metrics = await getSystemMetrics();
    
    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('System watchdog API error', {
      meta: {
        taskName: 'SystemWatchdogAPI',
        details: `API Error: ${error.message}`,
        error: error.message,
        stack: error.stack
      }
    });
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch system data',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { action, keyword, limit = 100 } = await request.json();
    
    if (action === 'search') {
      if (!keyword) {
        return NextResponse.json(
          { success: false, message: 'Keyword is required' },
          { status: 400 }
        );
      }
      
      const results = await searchLogs(keyword, limit);
      
      // Create downloadable content
      const downloadContent = results.map(r => 
        `[${r.file}] ${r.line}`
      ).join('\n');
      
      return NextResponse.json({
        success: true,
        results: results,
        downloadContent: downloadContent,
        count: results.length
      });
    }
    
    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Search failed',
        error: error.message 
      },
      { status: 500 }
    );
  }
}