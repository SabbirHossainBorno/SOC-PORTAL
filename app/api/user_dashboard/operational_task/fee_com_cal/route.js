// app/api/user_dashboard/operational_task/fee_com_cal/route.js
import { NextResponse } from 'next/server';
import { query, getDbConnection } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';
import sendTelegramAlert from '../../../../../lib/telegramAlert';
import getClientIP from '../../../../../lib/utils/ipUtils';
import ExcelJS from 'exceljs';
import { DateTime } from 'luxon';

// Get current time in Asia/Dhaka
const getCurrentDateTime = () => {
  const now = DateTime.now().setZone('Asia/Dhaka');
  return now.toFormat("yyyy-LL-dd hh:mm:ss a") + ' (' + now.offsetNameShort + ')';
};

// Format Telegram alert message
const formatAlertMessage = (action, ipAddress, userAgent, userData, billerName, feeCommType) => {
  const time = getCurrentDateTime();
  const statusEmoji = action.includes('SUCCESS') ? '✅' : '❌';
  const statusText = action.includes('SUCCESS') ? 'Successful' : 'Failed';
  
  return `💰 *SOC Portal Fee-Commission Calculation ${statusText}*
  
👤 *User ID:* ${userData.id}
📧 *Email:* ${userData.email}
🌐 *IP Address:* ${ipAddress}
🔖 *EID:* ${userData.eid}
🏦 *Biller Name:* ${billerName}
📊 *Fee-Comm Type:* ${feeCommType}
🕒 *Time:* ${time}
📱 *Device:* ${userAgent.split(' ')[0]}

${statusEmoji} *Status:* ${statusText}`;
};

// Generate notification ID like in mail tracking example
const generateNotificationId = async (prefix, table) => {
  try {
    const result = await query(`SELECT MAX(serial) AS max_serial FROM ${table}`);
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(4, '0');
    return `${prefix}${nextId}SOCP`;
  } catch (error) {
    throw new Error(`Error generating notification ID: ${error.message}`);
  }
};

// Extract cell value from Excel worksheet
const getCellValue = (worksheet, cellAddress) => {
  try {
    const cell = worksheet.getCell(cellAddress);
    // If cell has formula, return the calculated result
    if (cell.formula) {
      return cell.result;
    }
    return cell.value;
  } catch (error) {
    logger.warn(`Failed to get cell value for ${cellAddress}`, { error: error.message });
    return null;
  }
};

// Calculate adjustment values based on formulas
const calculateAdjustmentValues = (extractedValues) => {
  try {
    logger.info('Calculating adjustment values from formulas');
    
    const adjustments = {
      uddokta: {
        app: null,
        ussd: null
      },
      customer: {
        app: null,
        ussd: null
      }
    };

    // Calculate Uddokta APP adjustment: =100%-BC4-BA4-AU4-AE4-W4
    if (extractedValues.uddokta.app.bpoPp !== null && 
        extractedValues.uddokta.app.twltSp !== null && 
        extractedValues.uddokta.app.masterDistributor !== null && 
        extractedValues.uddokta.app.parentDistributor !== null && 
        extractedValues.uddokta.app.senderAgent !== null) {
      
      adjustments.uddokta.app = 1 - (
        extractedValues.uddokta.app.bpoPp +
        extractedValues.uddokta.app.twltSp +
        extractedValues.uddokta.app.masterDistributor +
        extractedValues.uddokta.app.parentDistributor +
        extractedValues.uddokta.app.senderAgent
      );
      
      logger.debug('Calculated Uddokta APP adjustment', {
        formula: '100% - BC4 - BA4 - AU4 - AE4 - W4',
        bpoPp: extractedValues.uddokta.app.bpoPp,
        twltSp: extractedValues.uddokta.app.twltSp,
        masterDistributor: extractedValues.uddokta.app.masterDistributor,
        parentDistributor: extractedValues.uddokta.app.parentDistributor,
        senderAgent: extractedValues.uddokta.app.senderAgent,
        result: adjustments.uddokta.app
      });
    }

    // Calculate Uddokta USSD adjustment: =100%-BC6-BA6-AU6-AE6-W6
    if (extractedValues.uddokta.ussd.bpoPp !== null && 
        extractedValues.uddokta.ussd.twltSp !== null && 
        extractedValues.uddokta.ussd.masterDistributor !== null && 
        extractedValues.uddokta.ussd.parentDistributor !== null && 
        extractedValues.uddokta.ussd.senderAgent !== null) {
      
      adjustments.uddokta.ussd = 1 - (
        extractedValues.uddokta.ussd.bpoPp +
        extractedValues.uddokta.ussd.twltSp +
        extractedValues.uddokta.ussd.masterDistributor +
        extractedValues.uddokta.ussd.parentDistributor +
        extractedValues.uddokta.ussd.senderAgent
      );
      
      logger.debug('Calculated Uddokta USSD adjustment', {
        formula: '100% - BC6 - BA6 - AU6 - AE6 - W6',
        bpoPp: extractedValues.uddokta.ussd.bpoPp,
        twltSp: extractedValues.uddokta.ussd.twltSp,
        masterDistributor: extractedValues.uddokta.ussd.masterDistributor,
        parentDistributor: extractedValues.uddokta.ussd.parentDistributor,
        senderAgent: extractedValues.uddokta.ussd.senderAgent,
        result: adjustments.uddokta.ussd
      });
    }

    // Calculate Customer APP adjustment: =100%-BC8-BA8-AU8-AE8-W8
    if (extractedValues.customer.app.bpoPp !== null && 
        extractedValues.customer.app.twltSp !== null && 
        extractedValues.customer.app.masterDistributor !== null) {
      
      // Note: For customer, AE8 and W8 are typically 0 or not used
      const parentDistributor = extractedValues.customer.app.parentDistributor || 0;
      const senderAgent = extractedValues.customer.app.senderAgent || 0;
      
      adjustments.customer.app = 1 - (
        extractedValues.customer.app.bpoPp +
        extractedValues.customer.app.twltSp +
        extractedValues.customer.app.masterDistributor +
        parentDistributor +
        senderAgent
      );
      
      logger.debug('Calculated Customer APP adjustment', {
        formula: '100% - BC8 - BA8 - AU8 - AE8 - W8',
        bpoPp: extractedValues.customer.app.bpoPp,
        twltSp: extractedValues.customer.app.twltSp,
        masterDistributor: extractedValues.customer.app.masterDistributor,
        parentDistributor,
        senderAgent,
        result: adjustments.customer.app
      });
    }

    // Calculate Customer USSD adjustment: =100%-BC10-BA10-AU10-AE10-W10
    if (extractedValues.customer.ussd.bpoPp !== null && 
        extractedValues.customer.ussd.twltSp !== null && 
        extractedValues.customer.ussd.masterDistributor !== null) {
      
      // Note: For customer, AE10 and W10 are typically 0 or not used
      const parentDistributor = extractedValues.customer.ussd.parentDistributor || 0;
      const senderAgent = extractedValues.customer.ussd.senderAgent || 0;
      
      adjustments.customer.ussd = 1 - (
        extractedValues.customer.ussd.bpoPp +
        extractedValues.customer.ussd.twltSp +
        extractedValues.customer.ussd.masterDistributor +
        parentDistributor +
        senderAgent
      );
      
      logger.debug('Calculated Customer USSD adjustment', {
        formula: '100% - BC10 - BA10 - AU10 - AE10 - W10',
        bpoPp: extractedValues.customer.ussd.bpoPp,
        twltSp: extractedValues.customer.ussd.twltSp,
        masterDistributor: extractedValues.customer.ussd.masterDistributor,
        parentDistributor,
        senderAgent,
        result: adjustments.customer.ussd
      });
    }

    return adjustments;
  } catch (error) {
    logger.error('Error calculating adjustment values', { error: error.message });
    throw new Error(`Failed to calculate adjustment values: ${error.message}`);
  }
};

// Parse Excel file and extract required values
const parseExcelFile = async (file, billerName) => {
  try {
    logger.info('Starting Excel file parsing for fee-commission calculation', {
      fileName: file.name,
      billerName,
      fileSize: file.size
    });

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Use the first worksheet (Fee-Commission sheet)
    const worksheet = workbook.worksheets[0];
    
    logger.debug('Excel worksheet loaded', {
      sheetName: worksheet.name,
      rowCount: worksheet.rowCount,
      columnCount: worksheet.columnCount
    });

    // Extract values for Uddokta Initiated
    const feeRateAppUddokta = getCellValue(worksheet, 'E4');
    const feeRateUssdUddokta = getCellValue(worksheet, 'E6');
    const senderAgentApp = getCellValue(worksheet, 'W4');
    const senderAgentUssd = getCellValue(worksheet, 'W6');
    const parentDistributorApp = getCellValue(worksheet, 'AE4');
    const parentDistributorUssd = getCellValue(worksheet, 'AE6');
    const masterDistributorApp = getCellValue(worksheet, 'AU4');
    const masterDistributorUssd = getCellValue(worksheet, 'AU6');
    const twltSpApp = getCellValue(worksheet, 'BA4');
    const twltSpUssd = getCellValue(worksheet, 'BA6');
    const bpoPpApp = getCellValue(worksheet, 'BC4');
    const bpoPpUssd = getCellValue(worksheet, 'BC6');

    // Extract values for Customer Initiated
    const feeRateAppCustomer = getCellValue(worksheet, 'E8');
    const feeRateUssdCustomer = getCellValue(worksheet, 'E10');
    const senderAgentAppCustomer = getCellValue(worksheet, 'W8') || 0; // Typically 0 for customer
    const senderAgentUssdCustomer = getCellValue(worksheet, 'W10') || 0; // Typically 0 for customer
    const parentDistributorAppCustomer = getCellValue(worksheet, 'AE8') || 0; // Typically 0 for customer
    const parentDistributorUssdCustomer = getCellValue(worksheet, 'AE10') || 0; // Typically 0 for customer
    const masterDistributorAppCustomer = getCellValue(worksheet, 'AU8');
    const masterDistributorUssdCustomer = getCellValue(worksheet, 'AU10');
    const twltSpAppCustomer = getCellValue(worksheet, 'BA8');
    const twltSpUssdCustomer = getCellValue(worksheet, 'BA10');
    const bpoPpAppCustomer = getCellValue(worksheet, 'BC8');
    const bpoPpUssdCustomer = getCellValue(worksheet, 'BC10');

    // Log all extracted values for debugging
    logger.debug('Extracted Excel values', {
      feeRateAppUddokta,
      feeRateUssdUddokta,
      senderAgentApp,
      senderAgentUssd,
      parentDistributorApp,
      parentDistributorUssd,
      masterDistributorApp,
      masterDistributorUssd,
      twltSpApp,
      twltSpUssd,
      bpoPpApp,
      bpoPpUssd,
      feeRateAppCustomer,
      feeRateUssdCustomer,
      masterDistributorAppCustomer,
      masterDistributorUssdCustomer,
      twltSpAppCustomer,
      twltSpUssdCustomer,
      bpoPpAppCustomer,
      bpoPpUssdCustomer
    });

    // Create extracted values object
    const extractedValues = {
      uddokta: {
        app: {
          feeRate: feeRateAppUddokta,
          senderAgent: senderAgentApp,
          parentDistributor: parentDistributorApp,
          masterDistributor: masterDistributorApp,
          twltSp: twltSpApp,
          bpoPp: bpoPpApp
        },
        ussd: {
          feeRate: feeRateUssdUddokta,
          senderAgent: senderAgentUssd,
          parentDistributor: parentDistributorUssd,
          masterDistributor: masterDistributorUssd,
          twltSp: twltSpUssd,
          bpoPp: bpoPpUssd
        }
      },
      customer: {
        app: {
          feeRate: feeRateAppCustomer,
          senderAgent: senderAgentAppCustomer,
          parentDistributor: parentDistributorAppCustomer,
          masterDistributor: masterDistributorAppCustomer,
          twltSp: twltSpAppCustomer,
          bpoPp: bpoPpAppCustomer
        },
        ussd: {
          feeRate: feeRateUssdCustomer,
          senderAgent: senderAgentUssdCustomer,
          parentDistributor: parentDistributorUssdCustomer,
          masterDistributor: masterDistributorUssdCustomer,
          twltSp: twltSpUssdCustomer,
          bpoPp: bpoPpUssdCustomer
        }
      }
    };

    // Calculate adjustment values from formulas
    const adjustments = calculateAdjustmentValues(extractedValues);

    // Add adjustment values to extracted data
    extractedValues.uddokta.app.adjustment = adjustments.uddokta.app;
    extractedValues.uddokta.ussd.adjustment = adjustments.uddokta.ussd;
    extractedValues.customer.app.adjustment = adjustments.customer.app;
    extractedValues.customer.ussd.adjustment = adjustments.customer.ussd;

    logger.debug('Final extracted values with adjustments', {
      adjustments
    });

    return {
      extractedValues,
      rawData: {
        feeRateAppUddokta,
        feeRateUssdUddokta,
        senderAgentApp,
        senderAgentUssd,
        parentDistributorApp,
        parentDistributorUssd,
        masterDistributorApp,
        masterDistributorUssd,
        twltSpApp,
        twltSpUssd,
        bpoPpApp,
        bpoPpUssd,
        feeRateAppCustomer,
        feeRateUssdCustomer,
        masterDistributorAppCustomer,
        masterDistributorUssdCustomer,
        twltSpAppCustomer,
        twltSpUssdCustomer,
        bpoPpAppCustomer,
        bpoPpUssdCustomer,
        adjustments
      }
    };
  } catch (error) {
    logger.error('Excel parsing error', { error: error.message });
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

// Perform commission calculations - WITH PROPER PERCENTAGE CONVERSION AND CALCULATIONS
const calculateCommissions = (extractedData) => {
  try {
    logger.info('Starting commission calculations with percentage conversion');

    const results = {
      uddokta: {
        app: { commissions: {} },
        ussd: { commissions: {} }
      },
      customer: {
        app: { commissions: {} },
        ussd: { commissions: {} }
      }
    };

    // Calculate Uddokta APP commissions
    if (extractedData.uddokta.app.feeRate) {
      // Convert fee rate to percentage (multiply by 100)
      results.uddokta.app.feeRate = extractedData.uddokta.app.feeRate * 100;
      
      // Calculate commissions as percentages of the fee rate
      results.uddokta.app.commissions = {
        senderAgent: extractedData.uddokta.app.senderAgent * results.uddokta.app.feeRate,
        parentDistributor: extractedData.uddokta.app.parentDistributor * results.uddokta.app.feeRate,
        masterDistributor: extractedData.uddokta.app.masterDistributor * results.uddokta.app.feeRate,
        twltSp: extractedData.uddokta.app.twltSp * results.uddokta.app.feeRate,
        bpoPp: extractedData.uddokta.app.bpoPp * results.uddokta.app.feeRate,
        adjustment: extractedData.uddokta.app.adjustment * results.uddokta.app.feeRate
      };
    }

    // Calculate Uddokta USSD commissions
    if (extractedData.uddokta.ussd.feeRate) {
      // Convert fee rate to percentage (multiply by 100)
      results.uddokta.ussd.feeRate = extractedData.uddokta.ussd.feeRate * 100;
      
      // Calculate commissions as percentages of the fee rate
      results.uddokta.ussd.commissions = {
        senderAgent: extractedData.uddokta.ussd.senderAgent * results.uddokta.ussd.feeRate,
        parentDistributor: extractedData.uddokta.ussd.parentDistributor * results.uddokta.ussd.feeRate,
        masterDistributor: extractedData.uddokta.ussd.masterDistributor * results.uddokta.ussd.feeRate,
        twltSp: extractedData.uddokta.ussd.twltSp * results.uddokta.ussd.feeRate,
        bpoPp: extractedData.uddokta.ussd.bpoPp * results.uddokta.ussd.feeRate,
        adjustment: extractedData.uddokta.ussd.adjustment * results.uddokta.ussd.feeRate
      };
    }

    // Calculate Customer APP commissions
    if (extractedData.customer.app.feeRate) {
      // Convert fee rate to percentage (multiply by 100)
      results.customer.app.feeRate = extractedData.customer.app.feeRate * 100;
      
      // Calculate commissions as percentages of the fee rate
      results.customer.app.commissions = {
        masterDistributor: extractedData.customer.app.masterDistributor * results.customer.app.feeRate,
        twltSp: extractedData.customer.app.twltSp * results.customer.app.feeRate,
        bpoPp: extractedData.customer.app.bpoPp * results.customer.app.feeRate,
        adjustment: extractedData.customer.app.adjustment * results.customer.app.feeRate
      };
    }

    // Calculate Customer USSD commissions
    if (extractedData.customer.ussd.feeRate) {
      // Convert fee rate to percentage (multiply by 100)
      results.customer.ussd.feeRate = extractedData.customer.ussd.feeRate * 100;
      
      // Calculate commissions as percentages of the fee rate
      results.customer.ussd.commissions = {
        masterDistributor: extractedData.customer.ussd.masterDistributor * results.customer.ussd.feeRate,
        twltSp: extractedData.customer.ussd.twltSp * results.customer.ussd.feeRate,
        bpoPp: extractedData.customer.ussd.bpoPp * results.customer.ussd.feeRate,
        adjustment: extractedData.customer.ussd.adjustment * results.customer.ussd.feeRate
      };
    }

    logger.debug('Commission calculations with percentage conversion completed', { results });
    return results;
  } catch (error) {
    logger.error('Commission calculation error', { error: error.message });
    throw new Error(`Failed to calculate commissions: ${error.message}`);
  }
};

export async function POST(request) {
  console.log('POST /api/user_dashboard/operational_task/fee_com_cal called');
  
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
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
  
  console.log('Request details:', {
    userId,
    userEmail,
    eid,
    sessionId,
    ipAddress
  });
  
  logger.info('Fee-Commission calculation initiated', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'FeeCommissionCalculation',
      details: `User ${userId} initiating fee-commission calculation`,
      userId
    }
  });

  let client;
  let billerName, feeCommType;
  
  try {
    const formData = await request.formData();
    console.log('Form data received');
    
    const file = formData.get('file');
    feeCommType = formData.get('feeCommType');
    billerName = formData.get('billerName');
    
    console.log('Form data values:', { 
      feeCommType, 
      billerName, 
      file: file ? file.name : 'No file' 
    });
    
    if (!file || !feeCommType || !billerName) {
      console.error('Missing required fields:', { 
        file: !!file, 
        feeCommType: !!feeCommType, 
        billerName: !!billerName 
      });
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user info with role and short_name
    const userInfoQuery = 'SELECT short_name, role_type FROM user_info WHERE soc_portal_id = $1';
    const userInfoResult = await query(userInfoQuery, [userId]);
    
    if (userInfoResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const userShortName = userInfoResult.rows[0].short_name;
    const userRole = userInfoResult.rows[0].role_type;

    // Parse Excel file
    console.log('Processing Excel file...');
    const { extractedValues, rawData } = await parseExcelFile(file, billerName);
    
    // Perform calculations
    console.log('Performing commission calculations...');
    const calculationResults = calculateCommissions(extractedValues);
    
    // Add summary information and raw data
    calculationResults.summary = {
      totalRecords: 1,
      calculationTime: new Date().toISOString(),
      billerName,
      feeCommType
    };

    // Add raw data for details view
    calculationResults.rawData = rawData;

    // Get database connection for transaction
    client = await getDbConnection().connect();
    await client.query('BEGIN');

    // Log activity
    console.log('Logging user activity...');
    const activityLogQuery = `
      INSERT INTO user_activity_log 
      (soc_portal_id, action, description, ip_address, device_info, eid, sid)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await client.query(activityLogQuery, [
      userId,
      'FEE_COMM_CALCULATION',
      `Calculated fee-commission for ${billerName} (${feeCommType})`,
      ipAddress,
      userAgent,
      eid,
      sessionId
    ]);

    // Generate notification IDs like in mail tracking example
    const adminNotificationId = await generateNotificationId('AN', 'admin_notification_details');
    const userNotificationId = await generateNotificationId('UN', 'user_notification_details');

    // Create admin notification
    const adminNotificationQuery = `
      INSERT INTO admin_notification_details (notification_id, title, status)
      VALUES ($1, $2, $3)
    `;
    await client.query(adminNotificationQuery, [
      adminNotificationId,
      `${userShortName} calculated fee-commission for ${billerName} (${feeCommType})`,
      'Unread'
    ]);

    // Create user notification
    const userNotificationQuery = `
      INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id)
      VALUES ($1, $2, $3, $4)
    `;
    await client.query(userNotificationQuery, [
      userNotificationId,
      `Fee-Commission calculation completed for ${billerName}`,
      'Unread',
      userId
    ]);

    await client.query('COMMIT');
    client.release();

    // Send Telegram alert
    console.log('Sending Telegram alert...');
    const alertMessage = formatAlertMessage(
      'SUCCESS', 
      ipAddress, 
      userAgent,
      { id: userId, email: userEmail, eid },
      billerName,
      feeCommType
    );
    
    await sendTelegramAlert(alertMessage);

    logger.info('Fee-Commission calculation completed successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FeeCommissionCalculation',
        details: `User ${userId} completed fee-commission calculation for ${billerName}`,
        billerName,
        feeCommType,
        calculationResults: calculationResults
      }
    });
    
    console.log('Fee-Commission calculation completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Fee-Commission calculation completed successfully',
      data: calculationResults
    });
    
  } catch (error) {
    console.error('Fee-Commission calculation failed:', error);
    
    // Rollback transaction if client exists
    if (client) {
      try {
        await client.query('ROLLBACK');
        client.release();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
    
    logger.error('Fee-Commission calculation failed', {
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
        billerName || 'Unknown',
        feeCommType || 'Unknown'
      );
      
      await sendTelegramAlert(alertMessage);
    } catch (alertError) {
      console.error('Failed to send alert:', alertError);
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to calculate fee-commission: ' + error.message },
      { status: 500 }
    );
  }
}