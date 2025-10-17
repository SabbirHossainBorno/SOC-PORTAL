//lib/exportToExcel.js
import ExcelJS from 'exceljs';

export const exportDowntimeToExcel = async (downtimes) => {
  try {
    // Normalize input to always work with an array
    const downtimeArray = Array.isArray(downtimes) ? downtimes : [downtimes];

    // Validate input
    if (downtimeArray.length === 0) {
      throw new Error('No downtime records provided for export');
    }

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Downtime Report');

    // Define worksheet columns
    worksheet.columns = [
      { header: 'Serial', key: 'serial', width: 15 },
      { header: 'Downtime ID', key: 'downtime_id', width: 15 },
      { header: 'Issue Date', key: 'issue_date', width: 15 },
      { header: 'Issue Title', key: 'issue_title', width: 20 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Affected Channel', key: 'affected_channel', width: 20 },
      { header: 'Affected Service', key: 'affected_service', width: 20 },
      { header: 'Affected Persona', key: 'affected_persona', width: 20 },
      { header: 'Affected MNO', key: 'affected_mno', width: 15 },
      { header: 'Affected Portal', key: 'affected_portal', width: 20 },
      { header: 'Affected Type', key: 'affected_type', width: 15 },
      { header: 'Impact Type', key: 'impact_type', width: 15 },
      { header: 'Modality', key: 'modality', width: 15 },
      { header: 'Reliability Impacted', key: 'reliability_impacted', width: 20 },
      { header: 'Start Date/Time (UTC)', key: 'rawStart', width: 20 },
      { header: 'End Date/Time (UTC)', key: 'rawEnd', width: 20 },
      { header: 'Duration', key: 'duration', width: 15 },
      { header: 'Concern', key: 'concern', width: 20 },
      { header: 'Reason', key: 'reason', width: 20 },
      { header: 'Resolution', key: 'resolution', width: 20 },
      { header: 'System Unavailability', key: 'system_unavailability', width: 20 },
      { header: 'Tracked By', key: 'tracked_by', width: 15 },
      { header: 'Ticket ID', key: 'service_desk_ticket_id', width: 15 },
      { header: 'Ticket Link', key: 'service_desk_ticket_link', width: 25 },
      { header: 'Remark', key: 'remark', width: 25 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Updated At', key: 'updated_at', width: 20 },
    ];

    // Format each downtime's duration and add as a row
    downtimeArray.forEach((downtime) => {
      const formattedDowntime = {
        ...downtime,
        duration: downtime.duration 
          ? `${downtime.duration.hours || 0}h ${downtime.duration.minutes || 0}m ${downtime.duration.seconds || 0}s` 
          : downtime.formattedDuration || 'N/A', // Use formattedDuration if available
      };
      worksheet.addRow(formattedDowntime);
    });

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      try {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4CAF50' }, // Green background
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } catch (error) {
        console.warn('Failed to style header cell:', error.message);
      }
    });

    // Generate the Excel file as a Blob
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Create a download link and trigger it
    const filename = `downtime_${downtimeArray[0].downtime_id || 'report'}.xlsx`;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log(`Exported: ${filename}`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export downtime report to Excel. Please try again.');
  }
};