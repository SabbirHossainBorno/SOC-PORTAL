// app/components/downtime_chart/UnplannedPartial.js
import BaseChart from './BaseChart';

// Custom colors for this chart type
const colors = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
  '#9966FF', '#FF9F40', '#8AC926', '#7F7F7F',
  '#BCBD22', '#17BECF', '#AEC7E8', '#FFBB78'
];

const UnplannedPartialChart = () => (
  <BaseChart 
    title="Unplanned Partial Downtime" 
    apiEndpoint="/api/user_dashboard/downtime_chart/unplanned_partial"
    colors={colors}
  />
);

export default UnplannedPartialChart;