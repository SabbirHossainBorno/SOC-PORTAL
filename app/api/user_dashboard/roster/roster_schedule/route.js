// app/api/user_dashboard/roster/roster_schedule/route.js
import { NextResponse } from 'next/server';
import { query, getDbConnection } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';
import sendTelegramAlert from '../../../../../lib/telegramAlert';
import { DateTime } from 'luxon';
import ExcelJS from 'exceljs';

// Get current time in Asia/Dhaka
const getCurrentDateTime = () => {
  const now = DateTime.now().setZone('Asia/Dhaka');
  return now.toFormat("yyyy-LL-dd hh:mm:ss a") + ' (' + now.offsetNameShort + ')';
};

// Format Telegram alert message
const formatAlertMessage = (action, ipAddress, userAgent, userData, rosterId) => {
  const time = getCurrentDateTime();
  const statusEmoji = action.includes('SUCCESS') ? '✅' : '❌';
  const statusText = action.includes('SUCCESS') ? 'Successful' : 'Failed';
  
  return `📅 *SOC Portal Roster ${statusText}*
  
👤 *User ID:* ${userData.id}
📧 *Email:* ${userData.email}
🌐 *IP Address:* ${ipAddress}
🔖 *EID:* ${userData.eid}
🆔 *Roster ID:* ${rosterId}
🕒 *Time:* ${time}
📱 *Device:* ${userAgent.split(' ')[0]}

${statusEmoji} *Status:* ${statusText}`;
};

// Generate roster ID
const generateRosterId = (month, year) => {
  const monthStr = month.toString().padStart(2, '0');
  return `ROS${monthStr}${year}SOCP`;
};

// Parse Excel file with exceljs
const parseExcelFile = async (file) => {
  try {
    console.log('Starting Excel file parsing...');
    console.log('File details:', file.name, file.type, file.size);
    
    const arrayBuffer = await file.arrayBuffer();
    console.log('Array buffer created, size:', arrayBuffer.byteLength);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    console.log('Workbook loaded successfully');
    
    const worksheet = workbook.worksheets[0];
    console.log('Worksheet name:', worksheet.name);
    console.log('Worksheet row count:', worksheet.rowCount);
    
    const data = [];
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const rowData = row.values;
      // Remove the first element (it's the row number in exceljs)
      rowData.shift();
      data.push(rowData);
      
      // Log first few rows for debugging
      if (rowNumber <= 5) {
        console.log(`Row ${rowNumber}:`, rowData);
      }
    });
    
    console.log('Total rows parsed:', data.length);
    return data;
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

// Generate dates for a given month and year
const generateDatesForMonth = (month, year) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const dates = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];
    
    dates.push({
      date: date,
      day: dayName
    });
  }
  
  return dates;
};

// Check if a row is a header row
const isHeaderRow = (row) => {
  if (!row || row.length === 0) return false;
  
  const teamMembers = ['Tanvir', 'Sizan', 'Nazmul', 'Maruf', 'Bishwajit', 'Borno', 'Anupom', 'Nafiz', 'Prattay', 'Siam', 'Minhadul'];
  const firstCell = String(row[0]).toUpperCase();
  
  // Check if the first cell matches any team member name
  return teamMembers.some(member => firstCell.includes(member.toUpperCase()));
};

export async function GET(request) {
  console.log('GET /api/user_dashboard/roster/roster_schedule called');
  
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  
  console.log('GET request params - month:', month, 'year:', year);
  
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
  
  try {
    let queryText = 'SELECT * FROM roster_schedule';
    let queryParams = [];
    
    if (month && year) {
      queryText += ' WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2 ORDER BY date';
      queryParams = [month, year];
      console.log('Query with month/year filter:', queryText, queryParams);
    } else {
      // Get current month if no filter provided
      const currentDate = DateTime.now().setZone('Asia/Dhaka');
      queryText += ' WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2 ORDER BY date';
      queryParams = [currentDate.month, currentDate.year];
      console.log('Query with current month filter:', queryText, queryParams);
    }
    
    const result = await query(queryText, queryParams);
    console.log('Database query successful, rows returned:', result.rows.length);
    
    // Fetch notes for all dates in the result
    const notesByDate = {};
    if (result.rows.length > 0) {
      // Extract all dates from the roster
      const dates = result.rows.map(row => row.date);
      
      // Query notes for these dates
      const notesQuery = `
        SELECT 
          rsn.*,
          ui.short_name as requested_by_name,
          TO_CHAR(rsn.created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD HH24:MI:SS.MS') as created_at_formatted
        FROM roster_schedule_note rsn
        LEFT JOIN user_info ui ON rsn.requested_by = ui.soc_portal_id
        WHERE rsn.request_date = ANY($1::date[])
        ORDER BY rsn.created_at DESC
      `;
      
      const notesResult = await query(notesQuery, [dates]);
      console.log('Notes query successful, notes found:', notesResult.rows.length);
      
      // Group notes by date
      notesResult.rows.forEach(note => {
        const dateKey = note.request_date.toISOString().split('T')[0];
        if (!notesByDate[dateKey]) {
          notesByDate[dateKey] = [];
        }
        notesByDate[dateKey].push({
          ...note,
          created_at: note.created_at_formatted // Use formatted string
        });
      });
    }
    
    // Add notes to each roster day
    const rosterDataWithNotes = result.rows.map(row => {
      const dateKey = row.date.toISOString().split('T')[0];
      return {
        ...row,
        notes: notesByDate[dateKey] || []
      };
    });
    
    return NextResponse.json({
      success: true,
      data: rosterDataWithNotes
    });
    
  } catch (error) {
    console.error('GET request failed:', error);
    logger.error('Failed to fetch roster data', {
      error: error.message,
      ipAddress,
      userAgent
    });
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch roster data' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  console.log('POST /api/user_dashboard/roster/roster_schedule called');
  
  // Get cookies from request headers
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(cookie => {
      const [key, ...rest] = cookie.trim().split('=');
      return [key, rest.join('=')];
    })
  );
  
  const sessionId = cookies.sessionId || 'Unknown';
  const eid = cookies.eid || 'Unknown';
  const userId = cookies.socPortalId || 'Unknown';
  const userEmail = cookies.email || 'Unknown';
  const ipAddress = request.headers.get('x-forwarded-for') || 'Unknown IP';
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
  
  console.log('Request details:', {
    userId,
    userEmail,
    eid,
    sessionId,
    ipAddress
  });
  
  logger.info('Roster upload initiated', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'UploadRoster',
      details: `User ${userId} uploading roster`,
      userId
    }
  });

  let client;
  
  try {
    // Get a client from the pool for transaction
    client = await getDbConnection().connect();
    await client.query('BEGIN');
    
    const formData = await request.formData();
    console.log('Form data received');
    
    const file = formData.get('file');
    const month = formData.get('month');
    const year = formData.get('year');
    
    console.log('Form data values:', { month, year, file: file ? file.name : 'No file' });
    
    if (!file || !month || !year) {
      console.error('Missing required fields:', { file: !!file, month: !!month, year: !!year });
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user info with role and short_name
    const userInfoQuery = 'SELECT short_name, role_type FROM user_info WHERE soc_portal_id = $1';
    const userInfoResult = await client.query(userInfoQuery, [userId]);
    
    if (userInfoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const userShortName = userInfoResult.rows[0].short_name;
    const userRole = userInfoResult.rows[0].role_type;

    // Check if user is allowed to upload roster
    const allowedSocUsers = ['Borno', 'Sizan', 'Tanvir', 'Nazmul'];
    if (userRole === 'SOC' && !allowedSocUsers.includes(userShortName)) {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json(
        { success: false, message: 'You are not eligible to upload roster schedule' },
        { status: 403 }
      );
    }

    if (userRole === 'OPS') {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json(
        { success: false, message: 'OPS team members are not eligible to upload roster schedule' },
        { status: 403 }
      );
    }
    
    // Generate roster ID
    const rosterId = generateRosterId(month, year);
    console.log('Generated roster ID:', rosterId);
    
    // Check if roster already exists within the transaction
    console.log('Checking for existing roster...');
    const existingRoster = await client.query(
      'SELECT roster_id FROM roster_schedule WHERE roster_id = $1',
      [rosterId]
    );
    
    console.log('Existing roster check result:', existingRoster.rows);
    
    if (existingRoster.rows.length > 0) {
      console.log('Roster already exists for this month/year');
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json(
        { success: false, message: 'Roster for this month already exists' },
        { status: 400 }
      );
    }
    
    // Read and process Excel file
    console.log('Processing Excel file...');
    const data = await parseExcelFile(file);
    
    // Generate dates for the month
    console.log('Generating dates for month:', month, year);
    const dates = generateDatesForMonth(parseInt(month), parseInt(year));
    console.log('Generated dates:', dates.length);
    
    // Process the data (skip header rows)
    console.log('Processing roster data...');
    const rosterData = [];
    let dataRowIndex = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      console.log(`Processing row ${i}:`, row);
      
      // Skip header rows
      if (isHeaderRow(row)) {
        console.log(`Skipping row ${i} - header row`);
        continue;
      }
      
      // Check if we have enough data for all dates
      if (dataRowIndex >= dates.length) {
        console.log('Warning: More data rows than dates in month');
        break;
      }
      
      // Check if we have enough columns
      if (row && row.length >= 10) {
        const currentDate = dates[dataRowIndex];
        
        rosterData.push({
          roster_id: rosterId,
          date: currentDate.date,
          day: currentDate.day,
          tanvir: row[0],
          sizan: row[1],
          nazmul: row[2],
          maruf: row[3],
          bishwajit: row[4],
          borno: row[5],
          anupom: row[6],
          nafiz: row[7],
          prattay: row[8],
          siam: row[9],
          minhadul: row[10],
          upload_by: userId
        });
        
        console.log(`Row ${i} processed successfully for date ${currentDate.date}`);
        dataRowIndex++;
      } else {
        console.warn(`Skipping row ${i} - insufficient columns:`, row);
      }
    }
    
    console.log('Total rows to insert:', rosterData.length);
    
    // Check if we have data for all dates
    if (rosterData.length !== dates.length) {
      console.warn(`Warning: Only ${rosterData.length} rows processed for ${dates.length} dates in month`);
    }
    

    // Insert data into database
    console.log('Inserting roster data...');
    for (const item of rosterData) {
      const insertQuery = `
        INSERT INTO roster_schedule 
        (roster_id, date, day, tanvir, sizan, nazmul, maruf, bishwajit, borno, anupom, nafiz, prattay, siam, minhadul, upload_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `;
      
      console.log('Inserting row:', item);
      
      await client.query(insertQuery, [
        item.roster_id, item.date, item.day, item.tanvir, item.sizan, item.nazmul,
        item.maruf, item.bishwajit, item.borno, item.anupom, item.nafiz,
        item.prattay, item.siam, item.minhadul, item.upload_by
      ]);
    }
    
    await client.query('COMMIT');
    console.log('Database transaction committed successfully');
    
    // Log activity (outside transaction)
    console.log('Logging user activity...');
    const activityLogQuery = `
      INSERT INTO user_activity_log 
      (soc_portal_id, action, description, ip_address, device_info, eid, sid)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await query(activityLogQuery, [
      userId,
      'ROSTER_UPLOAD',
      `Uploaded roster for ${month}/${year}`,
      ipAddress,
      userAgent,
      eid,
      sessionId
    ]);
    
    // Send Telegram alert
    console.log('Sending Telegram alert...');
    const alertMessage = formatAlertMessage(
      'SUCCESS', 
      ipAddress, 
      userAgent,
      { id: userId, email: userEmail, eid },
      rosterId
    );
    
    await sendTelegramAlert(alertMessage);
    
    logger.info('Roster uploaded successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'UploadRoster',
        details: `User ${userId} uploaded roster ${rosterId}`,
        rosterId,
        recordCount: rosterData.length
      }
    });
    
    console.log('Roster upload completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Roster uploaded successfully',
      rosterId: rosterId,
      recordCount: rosterData.length
    });
    
  } catch (error) {
    console.error('Roster upload failed:', error);
    
    try {
      if (client) {
        await client.query('ROLLBACK');
        console.log('Database transaction rolled back');
      }
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    } finally {
      if (client) {
        client.release();
      }
    }
    
    logger.error('Roster upload failed', {
      error: error.message,
      ipAddress,
      userAgent
    });
    
    // Send failure alert
    try {
      console.log('Sending failure alert...');
      const alertMessage = formatAlertMessage(
        'FAILURE', 
        ipAddress, 
        userAgent,
        { id: userId, email: userEmail, eid },
        'N/A'
      );
      
      await sendTelegramAlert(alertMessage);
    } catch (alertError) {
      console.error('Failed to send alert:', alertError);
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to upload roster: ' + error.message },
      { status: 500 }
    );
  }
}