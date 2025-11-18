// app/api/user_dashboard/operational_task/fee_com_cal/route.js
import { NextResponse } from 'next/server';
import { query, getDbConnection } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';
import sendTelegramAlert from '../../../../../lib/telegramAlert';
import getClientIP from '../../../../../lib/utils/ipUtils';
import ExcelJS from 'exceljs';
import { DateTime } from 'luxon';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Get current time in Asia/Dhaka
const getCurrentDateTime = () => {
  const now = DateTime.now().setZone('Asia/Dhaka');
  return now.toFormat("yyyy-LL-dd hh:mm:ss a") + ' (' + now.offsetNameShort + ')';
};

// Format Telegram alert message
const formatAlertMessage = (action, ipAddress, userAgent, userData, fileName, feeCommType) => {
  const time = getCurrentDateTime();
  const statusEmoji = action.includes('SUCCESS') ? '✅' : '❌';
  const statusText = action.includes('SUCCESS') ? 'Successful' : 'Failed';
  
  return `💰 *SOC Portal Fee-Commission Calculation ${statusText}*
  
👤 *User ID:* ${userData.id}
👨‍💼 *User Name:* ${userData.shortName || 'N/A'}
📧 *Email:* ${userData.email}
🌐 *IP Address:* ${ipAddress}
🔖 *EID:* ${userData.eid}
📁 *File Name:* ${fileName}
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

// Generate fee_com_cal_id like FCC01SOCP, FCC02SOCP
const generateFeeComCalId = async () => {
  try {
    const result = await query('SELECT MAX(serial) AS max_serial FROM fee_commission_calculation');
    const maxSerial = result.rows[0]?.max_serial || 0;
    const nextId = (maxSerial + 1).toString().padStart(4, '0');
    return `FCC${nextId}SOCP`;
  } catch (error) {
    throw new Error(`Error generating fee_com_cal_id: ${error.message}`);
  }
};

// Check if file already exists in database by file name
const checkExistingFile = async (userId, fileName) => {
  try {
    const checkQuery = `
      SELECT fee_com_cal_id, file_name, biller_name, created_at, track_by, calculation_results
      FROM fee_commission_calculation 
      WHERE soc_portal_id = $1 AND file_name = $2
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const result = await query(checkQuery, [userId, fileName]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error('Error checking existing file', { error: error.message });
    return null;
  }
};

// Generate file hash for unique identification
const generateFileHash = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    return hash;
  } catch (error) {
    logger.error('Error generating file hash', { error: error.message });
    return null;
  }
};

// Save file to storage directory
const saveFileToStorage = async (file, feeComCalId) => {
  try {
    const storageDir = '/home/soc_portal/storage/fee_com_file';
    
    // Ensure directory exists
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    const fileName = `${feeComCalId}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = path.join(storageDir, fileName);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    fs.writeFileSync(filePath, buffer);
    
    logger.info('File saved to storage', { filePath, fileName });
    return filePath;
  } catch (error) {
    logger.error('Error saving file to storage', { error: error.message });
    throw new Error(`Failed to save file: ${error.message}`);
  }
};

// Update the storeCalculationResults function
const storeCalculationResults = async (feeComCalId, userId, billerName, feeCommType, filePath, fileName, fileHash, calculationResults, trackBy) => {
  try {
    // Format the feeCommType for storage
    let storedFeeCommType = feeCommType;
    if (feeCommType === 'Drop Point' && calculationResults.summary?.dropPointType) {
      storedFeeCommType = `Drop Point - ${calculationResults.summary.dropPointType}`;
    }

    const insertQuery = `
      INSERT INTO fee_commission_calculation 
      (fee_com_cal_id, soc_portal_id, biller_name, fee_comm_type, file_path, file_name, file_hash, calculation_results, track_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING fee_com_cal_id, created_at
    `;
    
    const result = await query(insertQuery, [
      feeComCalId,
      userId,
      billerName,
      storedFeeCommType,
      filePath,
      fileName,
      fileHash,
      JSON.stringify(calculationResults),
      trackBy
    ]);
    
    logger.info('Calculation results stored in database', { 
      feeComCalId, 
      trackBy,
      billerName,
      fileName,
      storedFeeCommType
    });
    return result.rows[0];
  } catch (error) {
    logger.error('Error storing calculation results', { error: error.message });
    throw new Error(`Failed to store calculation results: ${error.message}`);
  }
};

// Update the getCalculationHistory function to show all records, not just current user's
const getCalculationHistory = async (searchTerm = '', limit = 10) => {
  try {
    let historyQuery = `
      SELECT fee_com_cal_id, file_name, biller_name, fee_comm_type, created_at, track_by
      FROM fee_commission_calculation 
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (searchTerm) {
      historyQuery += ` AND (file_name ILIKE $${queryParams.length + 1} OR biller_name ILIKE $${queryParams.length + 1})`;
      queryParams.push(`%${searchTerm}%`);
    }
    
    historyQuery += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1}`;
    queryParams.push(limit);
    
    const result = await query(historyQuery, queryParams);
    
    // Parse the fee_comm_type to make it more readable
    const parsedHistory = result.rows.map(item => {
      let feeCommType = item.fee_comm_type;
      
      // If it's a Drop Point type, make it more readable
      if (feeCommType && feeCommType.includes('Drop Point')) {
        if (feeCommType.includes('Mixed')) {
          feeCommType = 'Drop Point - Mixed';
        } else if (feeCommType.includes('Fixed')) {
          feeCommType = 'Drop Point - Fixed';
        }
      }
      
      return {
        ...item,
        fee_comm_type: feeCommType
      };
    });
    
    return parsedHistory;
  } catch (error) {
    logger.error('Error fetching calculation history', { error: error.message });
    return [];
  }
};

// Get calculation details by ID - updated to show details regardless of user
const getCalculationDetails = async (feeComCalId) => {
  try {
    const detailsQuery = `
      SELECT fee_com_cal_id, file_name, biller_name, fee_comm_type, created_at, track_by, calculation_results
      FROM fee_commission_calculation 
      WHERE fee_com_cal_id = $1
    `;
    
    const result = await query(detailsQuery, [feeComCalId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error('Error fetching calculation details', { error: error.message });
    return null;
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




// Ultra-simple file structure validation based only on B4 cell pattern
const validateFileStructure = async (file, feeCommType) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];

    // Get the value from cell B4
    const b4Value = getCellValue(worksheet, 'B4');
    
    console.log('B4 cell analysis:', {
      value: b4Value,
      selectedType: feeCommType
    });

    // Simple check: if B4 looks like "9,999.99" (has comma and decimal), it's Drop Point
    const isDropPointFile = b4Value && b4Value.toString().includes(',') && b4Value.toString().includes('.');

    console.log('Type detection result:', {
      isDropPointFile,
      shouldBeDropPoint: feeCommType === 'Drop Point',
      validationPassed: isDropPointFile === (feeCommType === 'Drop Point')
    });

    // Validate that file structure matches selected type
    if (feeCommType === 'Regular' && isDropPointFile) {
      return { 
        isValid: false, 
        message: 'This is a Drop Point file (B4 contains amount with comma). Please select "Drop Point" type.' 
      };
    }
    
    if (feeCommType === 'Drop Point' && !isDropPointFile) {
      return { 
        isValid: false, 
        message: 'This is a Regular file (B4 does not contain amount with comma). Please select "Regular" type.' 
      };
    }

    return { isValid: true, detectedType: feeCommType };
    
  } catch (error) {
    logger.error('File structure validation error', { error: error.message });
    // If validation fails, proceed with calculation but log the error
    console.error('Validation error:', error.message);
    return { 
      isValid: true, 
      message: 'File validation completed. Proceeding with calculation.' 
    };
  }
};
// Enhanced parsing function with better validation
const parseExcelFileForDropPointMixed = async (file, fileName) => {
  try {
    logger.info('Starting Excel file parsing for Drop Point Mixed fee-commission calculation', {
      fileName: fileName,
      fileSize: file.size
    });

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Use the first worksheet (Fee-Commission sheet)
    const worksheet = workbook.worksheets[0];
    
    logger.debug('Excel worksheet loaded for Drop Point Mixed', {
      sheetName: worksheet.name,
      rowCount: worksheet.rowCount,
      columnCount: worksheet.columnCount
    });

    // Define slab ranges and their base row numbers
    const slabs = [
      { range: "0 - 10,000", baseRow: 4, exampleRow: 5 },
      { range: "10,000 - 20,000", baseRow: 8, exampleRow: 9 },
      { range: "20,000 - 50,000", baseRow: 12, exampleRow: 13 },
      { range: "50,000 - 100,001", baseRow: 16, exampleRow: 17 },
      { range: "100,001 - 200,001", baseRow: 20, exampleRow: 21 },
      { range: "200,001 - 300,001", baseRow: 24, exampleRow: 25 },
      { range: "300,001 - 400,001", baseRow: 28, exampleRow: 29 },
      { range: "400,001 - Rest", baseRow: 32, exampleRow: 33 }
    ];

    const extractedSlabs = [];

    for (const slab of slabs) {
      const baseRow = slab.baseRow;
      const exampleRow = slab.exampleRow;

      try {
        // Extract values for APP
        const appData = {
          feeRate: getCellValue(worksheet, `E${baseRow}`),
          senderAgentFixed: getCellValue(worksheet, `W${exampleRow}`),
          parentDistributorFixed: getCellValue(worksheet, `AE${exampleRow}`),
          masterDistributorRate: getCellValue(worksheet, `AU${baseRow}`),
          twtlRate: getCellValue(worksheet, `BA${baseRow}`),
          bpoRate: getCellValue(worksheet, `BC${baseRow}`),
          advanceCommissionRate: getCellValue(worksheet, `BI${baseRow}`),
          vatRate: getCellValue(worksheet, `T${baseRow}`),
          exampleAmount: getCellValue(worksheet, `D${exampleRow}`)
        };

        // Extract values for USSD
        const ussdData = {
          feeRate: getCellValue(worksheet, `E${baseRow + 2}`),
          senderAgentFixed: getCellValue(worksheet, `W${exampleRow + 2}`),
          parentDistributorFixed: getCellValue(worksheet, `AE${exampleRow + 2}`),
          masterDistributorRate: getCellValue(worksheet, `AU${baseRow + 2}`),
          twtlRate: getCellValue(worksheet, `BA${baseRow + 2}`),
          bpoRate: getCellValue(worksheet, `BC${baseRow + 2}`),
          advanceCommissionRate: getCellValue(worksheet, `BI${baseRow + 2}`),
          vatRate: getCellValue(worksheet, `T${baseRow + 2}`),
          exampleAmount: getCellValue(worksheet, `D${exampleRow + 2}`)
        };

        // Log raw extracted values for debugging
        logger.debug(`Raw extracted values for ${slab.range}`, {
          appData,
          ussdData
        });

        // Calculate Master Distributor rate using the complex formula
        const appMasterDistributor = calculateMasterDistributorForDropPoint(appData, 'app');
        const ussdMasterDistributor = calculateMasterDistributorForDropPoint(ussdData, 'ussd');

        extractedSlabs.push({
          range: slab.range,
          app: {
            ...appData,
            calculatedMasterDistributor: appMasterDistributor
          },
          ussd: {
            ...ussdData,
            calculatedMasterDistributor: ussdMasterDistributor
          }
        });

        logger.debug(`Processed slab ${slab.range}`, {
          appMasterDistributor,
          ussdMasterDistributor
        });

      } catch (slabError) {
        logger.warn(`Failed to extract slab ${slab.range}`, { error: slabError.message });
        // Continue with other slabs even if one fails
        continue;
      }
    }

    // Extract biller name from filename
    let extractedBillerName = '';
    const cleanFileName = fileName.replace('.xlsx', '');
    
    if (cleanFileName.includes('Fee-Commission Scheme for ')) {
      extractedBillerName = cleanFileName.replace('Fee-Commission Scheme for ', '').split('_')[0];
    } else if (cleanFileName.includes('Fee-Commission Scheme - ')) {
      extractedBillerName = cleanFileName.replace('Fee-Commission Scheme - ', '').split(' - ')[0];
    } else {
      extractedBillerName = cleanFileName;
    }

    return {
      extractedSlabs,
      billerName: extractedBillerName,
      rawData: {
        slabs: extractedSlabs,
        totalSlabs: extractedSlabs.length
      }
    };
  } catch (error) {
    logger.error('Excel parsing error for Drop Point Mixed', { error: error.message });
    throw new Error(`Failed to parse Excel file for Drop Point Mixed: ${error.message}`);
  }
};

// Update the Master Distributor calculation to use adjusted fixed values
const calculateMasterDistributorForDropPoint = (slabData, type) => {
  try {
    const {
      feeRate,
      senderAgentFixed,
      parentDistributorFixed,
      twtlRate,
      bpoRate,
      advanceCommissionRate,
      vatRate,
      exampleAmount
    } = slabData;

    // Validate required data
    if (!feeRate || !vatRate || !exampleAmount) {
      logger.warn('Missing required data for Master Distributor calculation', { slabData });
      return null;
    }

    // Adjust fixed values by 15%
    const adjustedSenderAgentFixed = senderAgentFixed ? senderAgentFixed * 1.15 : 0;
    const adjustedParentDistributorFixed = parentDistributorFixed ? parentDistributorFixed * 1.15 : 0;

    // Calculate E5 = D5 * E4 (example amount * fee rate)
    const E5 = exampleAmount * feeRate;

    // Calculate T5 = (E5 - E5/(1+vatRate)) + (F5 - F5/(1+vatRate))
    // Assuming F5 is 0 as per the structure
    const T5 = (E5 - E5/(1+vatRate)) + (0 - 0/(1+vatRate));

    // Calculate V5 = (E5 + F5) / (1+vatRate)
    const V5 = (E5 + 0) / (1+vatRate);

    // Calculate BA5 = BA4 * V5
    const BA5 = (twtlRate || 0) * V5;

    // Calculate BC5 = (E5 + F5)/(1+vatRate) * BC4
    const BC5 = (E5 + 0)/(1+vatRate) * (bpoRate || 0);

    // Calculate BI5 = (E5 + F5)/(1+vatRate) * BI4
    const BI5 = (E5 + 0)/(1+vatRate) * (advanceCommissionRate || 0);

    // Calculate AU5 = E5 - T5 - W5 - AE5 - BA5 - BC5 - BI5
    // Use ADJUSTED fixed values here
    const AU5 = E5 - T5 - adjustedSenderAgentFixed - adjustedParentDistributorFixed - BA5 - BC5 - BI5;

    // Calculate Master Distributor Rate = AU5 / V5
    const masterDistributorRate = AU5 / V5;

    logger.debug('Master Distributor calculation details with adjusted fixed values', {
      type,
      E5,
      T5,
      V5,
      BA5,
      BC5,
      BI5,
      AU5,
      masterDistributorRate,
      originalSenderAgentFixed: senderAgentFixed,
      adjustedSenderAgentFixed,
      originalParentDistributorFixed: parentDistributorFixed,
      adjustedParentDistributorFixed
    });

    return isNaN(masterDistributorRate) ? null : masterDistributorRate;
  } catch (error) {
    logger.error('Error calculating Master Distributor for Drop Point', { error: error.message, slabData });
    return null;
  }
};

// Update the calculateCommissionsForDropPointMixed function to handle zero values
const calculateCommissionsForDropPointMixed = (extractedData) => {
  try {
    logger.info('Starting commission calculations for Drop Point Mixed');

    const results = {
      slabs: []
    };

    for (const slab of extractedData.extractedSlabs) {
      const appFeeRate = slab.app.feeRate ? slab.app.feeRate * 100 : null; // Convert to percentage (0.002 -> 0.2)
      const ussdFeeRate = slab.ussd.feeRate ? slab.ussd.feeRate * 100 : null;

      // Adjust fixed values by adding 15% (multiplying by 1.15)
      // Handle zero values properly - if value is 0, it should remain 0 after adjustment
      const adjustedAppSenderAgentFixed = slab.app.senderAgentFixed !== null && slab.app.senderAgentFixed !== undefined 
        ? slab.app.senderAgentFixed * 1.15 
        : null;
      const adjustedAppParentDistributorFixed = slab.app.parentDistributorFixed !== null && slab.app.parentDistributorFixed !== undefined 
        ? slab.app.parentDistributorFixed * 1.15 
        : null;
      const adjustedUssdSenderAgentFixed = slab.ussd.senderAgentFixed !== null && slab.ussd.senderAgentFixed !== undefined 
        ? slab.ussd.senderAgentFixed * 1.15 
        : null;
      const adjustedUssdParentDistributorFixed = slab.ussd.parentDistributorFixed !== null && slab.ussd.parentDistributorFixed !== undefined 
        ? slab.ussd.parentDistributorFixed * 1.15 
        : null;

      // Calculate actual commission values (rate * feeRate * 100)
      const slabResult = {
        range: slab.range,
        app: {
          feeRate: appFeeRate,
          commissions: {
            uddokta: adjustedAppSenderAgentFixed, // Fixed value with 15% adjustment
            distributor: adjustedAppParentDistributorFixed, // Fixed value with 15% adjustment
            masterDistributor: slab.app.calculatedMasterDistributor ? slab.app.calculatedMasterDistributor * appFeeRate : null,
            twlt: slab.app.twtlRate ? slab.app.twtlRate * appFeeRate : null,
            bpo: slab.app.bpoRate ? slab.app.bpoRate * appFeeRate : null,
            advanceCommission: slab.app.advanceCommissionRate ? slab.app.advanceCommissionRate * appFeeRate : null
          }
        },
        ussd: {
          feeRate: ussdFeeRate,
          commissions: {
            uddokta: adjustedUssdSenderAgentFixed, // Fixed value with 15% adjustment
            distributor: adjustedUssdParentDistributorFixed, // Fixed value with 15% adjustment
            masterDistributor: slab.ussd.calculatedMasterDistributor ? slab.ussd.calculatedMasterDistributor * ussdFeeRate : null,
            twlt: slab.ussd.twtlRate ? slab.ussd.twtlRate * ussdFeeRate : null,
            bpo: slab.ussd.bpoRate ? slab.ussd.bpoRate * ussdFeeRate : null,
            advanceCommission: slab.ussd.advanceCommissionRate ? slab.ussd.advanceCommissionRate * ussdFeeRate : null
          }
        }
      };

      // Log calculation details for debugging
      logger.debug(`Calculated slab ${slab.range}`, {
        appFeeRate,
        ussdFeeRate,
        originalAppSenderAgent: slab.app.senderAgentFixed,
        adjustedAppSenderAgent: adjustedAppSenderAgentFixed,
        originalAppDistributor: slab.app.parentDistributorFixed,
        adjustedAppDistributor: adjustedAppParentDistributorFixed,
        appCommissions: slabResult.app.commissions,
        ussdCommissions: slabResult.ussd.commissions
      });

      results.slabs.push(slabResult);
    }

    logger.debug('Drop Point Mixed commission calculations completed', { 
      totalSlabs: results.slabs.length 
    });
    
    return results;
  } catch (error) {
    logger.error('Drop Point Mixed commission calculation error', { error: error.message });
    throw new Error(`Failed to calculate commissions for Drop Point Mixed: ${error.message}`);
  }
};
// Parse Excel file and extract required values
const parseExcelFile = async (file, fileName) => {
  try {
    logger.info('Starting Excel file parsing for fee-commission calculation', {
      fileName: fileName,
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

    // Extract biller name from filename
    let extractedBillerName = '';
    const cleanFileName = fileName.replace('.xlsx', '');
    
    if (cleanFileName.includes('Fee-Commission Scheme for ')) {
      extractedBillerName = cleanFileName.replace('Fee-Commission Scheme for ', '').split('_')[0];
    } else if (cleanFileName.includes('Fee-Commission Scheme - ')) {
      extractedBillerName = cleanFileName.replace('Fee-Commission Scheme - ', '').split(' - ')[0];
    } else {
      extractedBillerName = cleanFileName;
    }

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
      bpoPpUssdCustomer,
      extractedBillerName
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
      billerName: extractedBillerName,
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

// Update the POST route to handle Drop Point Mixed
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
  let fileName;
  
  try {
    const formData = await request.formData();
    console.log('Form data received');
    
    const file = formData.get('file');
    const feeCommType = formData.get('feeCommType');
    const dropPointType = formData.get('dropPointType'); // This will be null for Regular files
    fileName = file ? file.name : 'Unknown';
    
    console.log('Form data values:', { 
      feeCommType, 
      dropPointType, // This will show null for Regular files
      fileName, 
      file: file ? file.name : 'No file' 
    });
    
    if (!file || !feeCommType) {
      console.error('Missing required fields:', { 
        file: !!file, 
        feeCommType: !!feeCommType
      });
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if file already exists for this user
    const existingFile = await checkExistingFile(userId, fileName);
    if (existingFile) {
      logger.info('File already exists in database', {
        fileName,
        existingRecord: existingFile
      });

      return NextResponse.json({
        success: false,
        message: 'File has already been processed',
        existingFile: {
          fee_com_cal_id: existingFile.fee_com_cal_id,
          file_name: existingFile.file_name,
          biller_name: existingFile.biller_name,
          created_at: existingFile.created_at,
          track_by: existingFile.track_by,
          calculation_results: existingFile.calculation_results
        }
      }, { status: 400 });
    }

// In your POST function, add this logging:
console.log('Starting file structure validation...');

const structureValidation = await validateFileStructure(file, feeCommType);
console.log('Validation result:', JSON.stringify(structureValidation, null, 2));

if (!structureValidation.isValid) {
  console.log('VALIDATION FAILED:', structureValidation.message);
  return NextResponse.json(
    { 
      success: false, 
      message: structureValidation.message
    },
    { status: 400 }
  );
}

console.log('File structure validation passed');

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

    // Generate fee_com_cal_id
    const feeComCalId = await generateFeeComCalId();
    console.log('Generated fee_com_cal_id:', feeComCalId);

    // Generate file hash
    const fileHash = await generateFileHash(file);

    let parsedData;
    let calculationResults;

    // Parse Excel file based on type
    console.log('Processing Excel file for type:', feeCommType, dropPointType);
    
    if (feeCommType === 'Drop Point' && dropPointType === 'Mixed') {
      // Parse for Drop Point Mixed
      parsedData = await parseExcelFileForDropPointMixed(file, fileName);
      calculationResults = calculateCommissionsForDropPointMixed(parsedData);
    } else if (feeCommType === 'Regular') {
      // Parse for Regular type (existing code)
      parsedData = await parseExcelFile(file, fileName);
      calculationResults = calculateCommissions(parsedData.extractedValues);
    } else {
      throw new Error(`Unsupported fee commission type: ${feeCommType} - ${dropPointType}`);
    }

    
    
    // Add summary information and raw data
    calculationResults.summary = {
      totalRecords: feeCommType === 'Drop Point' ? calculationResults.slabs?.length || 0 : 1,
      calculationTime: new Date().toISOString(),
      billerName: parsedData.billerName,
      feeCommType: feeCommType,
      dropPointType: feeCommType === 'Drop Point' ? dropPointType : null, // Only set for Drop Point
      fileName: fileName,
      trackBy: userShortName
    };

    // Add raw data for details view
    calculationResults.rawData = parsedData.rawData;

    // Save file to storage
    console.log('Saving file to storage...');
    const filePath = await saveFileToStorage(file, feeComCalId);

    // Get database connection for transaction
    client = await getDbConnection().connect();
    await client.query('BEGIN');

    // Store calculation results with file details
    console.log('Storing calculation results in database...');
    await storeCalculationResults(
      feeComCalId, 
      userId, 
      parsedData.billerName, 
      // Only include dropPointType for Drop Point files
      feeCommType === 'Drop Point' ? `${feeCommType} - ${dropPointType}` : feeCommType, 
      filePath, 
      fileName,
      fileHash,
      calculationResults,
      userShortName
    );

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
      `Calculated fee-commission for ${fileName} (${feeCommType}${feeCommType === 'Drop Point' ? ` - ${dropPointType}` : ''}) - ${feeComCalId}`,
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
      `${userShortName} calculated fee-commission for ${fileName} (${feeCommType}${feeCommType === 'Drop Point' ? ` - ${dropPointType}` : ''}) - ${feeComCalId}`,
      'Unread'
    ]);

    // Create user notification
    const userNotificationQuery = `
      INSERT INTO user_notification_details (notification_id, title, status, soc_portal_id)
      VALUES ($1, $2, $3, $4)
    `;
    await client.query(userNotificationQuery, [
      userNotificationId,
      `Fee-Commission calculation completed for ${fileName} - ${feeComCalId}`,
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
      { id: userId, email: userEmail, eid, shortName: userShortName },
      fileName,
      `${feeCommType}${feeCommType === 'Drop Point' ? ` - ${dropPointType}` : ''}`
    );
    
    await sendTelegramAlert(alertMessage);

    logger.info('Fee-Commission calculation completed successfully', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'FeeCommissionCalculation',
        details: `User ${userId} (${userShortName}) completed fee-commission calculation for ${fileName} - ${feeComCalId}`,
        billerName: parsedData.billerName,
        feeCommType,
        dropPointType,
        feeComCalId,
        trackBy: userShortName,
        calculationResults: calculationResults
      }
    });
    
    console.log('Fee-Commission calculation completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Fee-Commission calculation completed successfully',
      data: calculationResults,
      feeComCalId
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
        fileName || 'Unknown',
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
// GET endpoint for fetching history - updated to show all records
export async function GET(request) {
  console.log('GET /api/user_dashboard/operational_task/fee_com_cal called');
  
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search') || '';
  const limit = parseInt(searchParams.get('limit')) || 10;
  
  console.log('History request details:', { searchTerm, limit });
  
  try {
    const history = await getCalculationHistory(searchTerm, limit);
    
    return NextResponse.json({
      success: true,
      data: history
    });
    
  } catch (error) {
    console.error('Failed to fetch history:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  console.log('🔍 PUT /api/user_dashboard/operational_task/fee_com_cal called - FULL DEBUG');
  
  // Get the full URL for debugging
  const url = new URL(request.url);
  console.log('Request URL:', url.toString());
  console.log('Request method:', request.method);
  
  // Get cookies from request headers
  const cookieHeader = request.headers.get('cookie') || '';
  console.log('Cookies received:', cookieHeader);
  
  try {
    // Parse the request body
    const body = await request.json();
    console.log('Request body:', body);
    
    const { feeComCalId } = body;
    
    if (!feeComCalId) {
      console.error('❌ Missing feeComCalId in request body');
      return NextResponse.json(
        { success: false, message: 'Missing fee_com_cal_id' },
        { status: 400 }
      );
    }

    console.log('🔍 Looking for calculation with ID:', feeComCalId);
    
    const calculationDetails = await getCalculationDetails(feeComCalId);
    
    if (!calculationDetails) {
      console.error('❌ Calculation not found for ID:', feeComCalId);
      return NextResponse.json(
        { success: false, message: 'Calculation not found' },
        { status: 404 }
      );
    }

    console.log('✅ Calculation found:', calculationDetails.fee_com_cal_id);
    
    // Parse the calculation results
    let calculationResults;
    try {
      calculationResults = typeof calculationDetails.calculation_results === 'string' 
        ? JSON.parse(calculationDetails.calculation_results)
        : calculationDetails.calculation_results;
    } catch (parseError) {
      console.error('Error parsing calculation results:', parseError);
      calculationResults = calculationDetails.calculation_results;
    }

    // Extract feeCommType and dropPointType from the stored data
    let feeCommType = calculationDetails.fee_comm_type;
    let dropPointType = null;

    // Handle both formats: "Regular" and "Drop Point - Mixed"
    if (feeCommType && feeCommType.includes('Drop Point')) {
      feeCommType = 'Drop Point';
      if (feeCommType.includes('Mixed')) {
        dropPointType = 'Mixed';
      } else if (feeCommType.includes('Fixed')) {
        dropPointType = 'Fixed';
      } else {
        dropPointType = calculationResults.summary?.dropPointType || 'Mixed';
      }
    } else {
      // For Regular files, ensure dropPointType is null
      feeCommType = 'Regular';
      dropPointType = null;
    }

    // Ensure the summary contains the correct type information
    if (calculationResults.summary) {
      calculationResults.summary.feeCommType = feeCommType;
      if (feeCommType === 'Drop Point') {
        calculationResults.summary.dropPointType = dropPointType;
      } else {
        calculationResults.summary.dropPointType = null; // Ensure it's null for Regular
      }
      
      // Add database fields to summary
      calculationResults.summary.feeComCalId = calculationDetails.fee_com_cal_id;
      calculationResults.summary.fileName = calculationDetails.file_name;
      calculationResults.summary.billerName = calculationDetails.biller_name;
      calculationResults.summary.trackBy = calculationDetails.track_by;
      calculationResults.summary.created_at = calculationDetails.created_at;
    }

    console.log('✅ Successfully returning calculation results');
    
    return NextResponse.json({
      success: true,
      data: calculationResults
    });
    
  } catch (error) {
    console.error('❌ Failed to fetch calculation details:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch calculation details: ' + error.message },
      { status: 500 }
    );
  }
}