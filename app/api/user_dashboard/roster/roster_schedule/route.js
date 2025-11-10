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

// Get team member columns from database schema
const getTeamMemberColumns = async () => {
  try {
    const result = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'roster_schedule' 
      AND table_schema = 'public'
      AND column_name NOT IN (
        'serial', 'roster_id', 'date', 'day', 'upload_by', 
        'created_at', 'updated_at'
      )
      ORDER BY ordinal_position
    `);
    
    const teamMemberColumns = {};
    result.rows.forEach(row => {
      const columnName = row.column_name;
      teamMemberColumns[columnName] = columnName;
    });
    
    console.log('Team member columns from database:', teamMemberColumns);
    return teamMemberColumns;
  } catch (error) {
    console.error('Error fetching team member columns:', error);
    return {};
  }
};

// Check if user has permission to upload roster
const checkUploadPermission = async (userId, userRole) => {
  try {
    // OPS team members are not allowed
    if (userRole === 'OPS') {
      return { allowed: false, message: 'OPS team members are not eligible to upload roster schedule' };
    }

    // Check permission from roster_schedule_permission table
    const permissionQuery = `
      SELECT permission 
      FROM roster_schedule_permission 
      WHERE soc_portal_id = $1 AND status = 'Active'
    `;
    
    const permissionResult = await query(permissionQuery, [userId]);
    
    if (permissionResult.rows.length === 0) {
      return { allowed: false, message: 'You are not eligible to upload roster schedule' };
    }
    
    const permission = permissionResult.rows[0].permission;
    if (permission !== 'ALLOW') {
      return { allowed: false, message: 'You are not eligible to upload roster schedule' };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Error checking upload permission:', error);
    return { allowed: false, message: 'Error checking upload permissions' };
  }
};

// Parse Excel file with column mapping
const parseExcelFile = async (file) => {
  try {
    console.log('Starting Excel file parsing with column mapping...');
    console.log('File details:', file.name, file.type, file.size);
    
    const arrayBuffer = await file.arrayBuffer();
    console.log('Array buffer created, size:', arrayBuffer.byteLength);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    console.log('Workbook loaded successfully');
    
    const worksheet = workbook.worksheets[0];
    console.log('Worksheet name:', worksheet.name);
    console.log('Worksheet row count:', worksheet.rowCount);
    
    // Get team member columns from database
    const teamMemberColumns = await getTeamMemberColumns();
    
    // Get header row to identify columns
    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values.slice(1); // Remove first empty element
    
    console.log('Excel headers found:', headers);
    
    // Map headers to column indices
    const columnMapping = {};
    const foundMembers = [];
    
    headers.forEach((header, index) => {
      if (header) {
        const headerName = String(header).trim().toLowerCase();
        
        // Find matching team member in database columns
        for (const [dbColumn] of Object.entries(teamMemberColumns)) {
          if (headerName.includes(dbColumn.toLowerCase())) {
            columnMapping[index] = dbColumn;
            foundMembers.push(header);
            console.log(`Mapped header "${header}" to database column "${dbColumn}" at index ${index}`);
            break;
          }
        }
      }
    });
    
    console.log('Column mapping:', columnMapping);
    console.log('Found team members in upload:', foundMembers);
    
    if (Object.keys(columnMapping).length === 0) {
      throw new Error('No valid team member columns found in the Excel file');
    }
    
    // Process data rows
    const data = [];
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rowData = row.values.slice(1); // Remove first empty element
      
      if (rowData.length === 0 || !rowData.some(cell => cell !== undefined && cell !== null && cell !== '')) {
        console.log(`Skipping empty row ${rowNumber}`);
        continue;
      }
      
      const mappedRow = {};
      
      // Map data based on column mapping
      Object.entries(columnMapping).forEach(([excelIndex, dbColumn]) => {
        const valueIndex = parseInt(excelIndex);
        if (valueIndex < rowData.length && rowData[valueIndex] !== undefined) {
          mappedRow[dbColumn] = String(rowData[valueIndex]).trim().toUpperCase() || null;
        } else {
          mappedRow[dbColumn] = null;
        }
      });
      
      data.push(mappedRow);
      
      // Log first few rows for debugging
      if (rowNumber <= 5) {
        console.log(`Row ${rowNumber} mapped data:`, mappedRow);
      }
    }
    
    console.log('Total data rows parsed:', data.length);
    return {
      data: data,
      columnMapping: columnMapping,
      foundMembers: foundMembers
    };
    
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

// Create base roster item with all team member columns set to null
const createBaseRosterItem = async (rosterId, date, day, userId) => {
  const teamMemberColumns = await getTeamMemberColumns();
  const baseItem = {
    roster_id: rosterId,
    date: date,
    day: day,
    upload_by: userId
  };
  
  // Initialize all team member columns to null
  Object.keys(teamMemberColumns).forEach(column => {
    baseItem[column] = null;
  });
  
  return baseItem;
};

// Generate insert query dynamically based on available columns
const generateInsertQuery = async () => {
  const teamMemberColumns = await getTeamMemberColumns();
  const columns = Object.keys(teamMemberColumns);
  
  // Add non-team member columns
  const allColumns = ['roster_id', 'date', 'day', ...columns, 'upload_by'];
  
  const placeholders = allColumns.map((_, index) => `$${index + 1}`).join(', ');
  
  return `
    INSERT INTO roster_schedule 
    (${allColumns.join(', ')})
    VALUES (${placeholders})
  `;
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

    // Check if user has permission to upload roster using the new permission table
    const permissionCheck = await checkUploadPermission(userId, userRole);
    if (!permissionCheck.allowed) {
      // Log the unauthorized upload attempt
      logger.warn('Unauthorized roster upload attempt', {
        meta: {
          eid,
          sid: sessionId,
          taskName: 'UploadRosterDenied',
          details: `User ${userId} (${userShortName}) attempted to upload roster but was denied. Reason: ${permissionCheck.message}`,
          userId,
          userShortName,
          userRole,
          ipAddress,
          userAgent,
          month,
          year,
          fileName: file ? file.name : 'No file',
          reason: permissionCheck.message
        }
      });

      // Log to user_activity_log table
      const activityLogQuery = `
        INSERT INTO user_activity_log 
        (soc_portal_id, action, description, ip_address, device_info, eid, sid)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await query(activityLogQuery, [
        userId,
        'ROSTER_UPLOAD_DENIED',
        `Attempted to upload roster for ${month}/${year} but was denied. Reason: ${permissionCheck.message}`,
        ipAddress,
        userAgent,
        eid,
        sessionId
      ]);

      await client.query('ROLLBACK');
        client.release();
        return NextResponse.json(
          { success: false, message: permissionCheck.message },
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
    
    // Read and process Excel file with column mapping
    console.log('Processing Excel file with column mapping...');
    const parseResult = await parseExcelFile(file);
    const { data: excelData, columnMapping, foundMembers } = parseResult;
    
    console.log('Found team members in upload:', foundMembers);
    console.log('Column mapping used:', columnMapping);
    
    // Generate dates for the month
    console.log('Generating dates for month:', month, year);
    const dates = generateDatesForMonth(parseInt(month), parseInt(year));
    console.log('Generated dates:', dates.length);
    
    // Get team member columns for creating base roster items
    const teamMemberColumns = await getTeamMemberColumns();
    
    // Process the data
    console.log('Processing roster data with column mapping...');
    const rosterData = [];
    
    // Check if we have enough data for all dates
    if (excelData.length < dates.length) {
      console.warn(`Warning: Only ${excelData.length} rows processed for ${dates.length} dates in month`);
    }
    
    for (let i = 0; i < dates.length; i++) {
      const currentDate = dates[i];
      const excelRow = excelData[i] || {}; // Use empty object if no data for this date
      
      // Create base roster item with all team members set to null initially
      const rosterItem = {
        roster_id: rosterId,
        date: currentDate.date,
        day: currentDate.day,
        upload_by: userId
      };
      
      // Initialize all team member columns to null
      Object.keys(teamMemberColumns).forEach(column => {
        rosterItem[column] = null;
      });
      
      // Override with data from Excel based on column mapping
      Object.entries(excelRow).forEach(([dbColumn, value]) => {
        if (rosterItem.hasOwnProperty(dbColumn)) {
          rosterItem[dbColumn] = value;
        }
      });
      
      rosterData.push(rosterItem);
      
      // Log first few items for debugging
      if (i < 3) {
        console.log(`Roster item ${i} for date ${currentDate.date}:`, rosterItem);
      }
    }
    
    console.log('Total roster items to insert:', rosterData.length);
    
    // Generate dynamic insert query
    const insertQuery = await generateInsertQuery();
    console.log('Generated insert query:', insertQuery);
    
    // Insert data into database
    console.log('Inserting roster data...');
    for (const item of rosterData) {
      // Get team member columns for building parameter array
      const teamMemberColumns = await getTeamMemberColumns();
      const columns = Object.keys(teamMemberColumns);
      
      // Build parameter array in the correct order
      const params = [
        item.roster_id, 
        item.date, 
        item.day,
        ...columns.map(col => item[col]),
        item.upload_by
      ];
      
      await client.query(insertQuery, params);
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
      `Uploaded roster for ${month}/${year}. Found members: ${foundMembers.join(', ')}`,
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
        details: `User ${userId} uploaded roster ${rosterId}. Found members: ${foundMembers.join(', ')}`,
        rosterId,
        recordCount: rosterData.length,
        foundMembers: foundMembers
      }
    });
    
    console.log('Roster upload completed successfully');
    console.log('Found team members:', foundMembers);
    
    return NextResponse.json({
      success: true,
      message: 'Roster uploaded successfully',
      rosterId: rosterId,
      recordCount: rosterData.length,
      foundMembers: foundMembers
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