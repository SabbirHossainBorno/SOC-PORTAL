// app/components/downtime_chart/SummaryReport.js
import BaseChart from './BaseChart';

// Custom colors for summary chart (Service Up + 4 downtime types)
const colors = [
  '#10B981', // Service Up - Green
  '#EF4444', // Planned Full - Red
  '#F59E0B', // Planned Partial - Amber
  '#DC2626', // Unplanned Full - Dark Red
  '#F97316'  // Unplanned Partial - Orange
];

const SummaryReport = () => (
  <BaseChart 
    title="Service Availability Summary" 
    apiEndpoint="/api/user_dashboard/downtime_chart/summary"
    colors={colors}
    isSummaryChart={true}
  />
);

export default SummaryReport;