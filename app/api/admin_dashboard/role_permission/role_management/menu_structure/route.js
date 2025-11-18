// app/api/admin_dashboard/role_permission/role_management/menu_structure/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';

export async function GET() {
  try {
    // Define all available menus and submenus for user dashboard
    const menuStructure = [
      {
        path: '/user_dashboard',
        label: 'Dashboard',
        icon: 'FaHome',
        children: []
      },
      {
        path: '/user_dashboard/downtime',
        label: 'Service Downtime',
        icon: 'FaExclamationTriangle',
        children: [
          { path: '/user_dashboard/report_downtime', label: 'Report Downtime' },
          { path: '/user_dashboard/downtime_log', label: 'Downtime Logs' }
        ]
      },
      {
        path: '/user_dashboard/tasks',
        label: 'Task Management',
        icon: 'FaTasks',
        children: [
          { path: '/user_dashboard/task_management/assign_task', label: 'Assign Task' },
          { path: '/user_dashboard/task_management/my_task', label: 'My Tasks' },
          { path: '/user_dashboard/task_management/task_history', label: 'Task Archive' }
        ]
      },
      {
        path: '/user_dashboard/mail',
        label: 'Mail Center',
        icon: 'FaEnvelope',
        children: [
          { path: '/user_dashboard/track_todays_mail', label: "Track Today's Mail" },
          { path: '/user_dashboard/mail_log', label: 'Mail Log' },
          { path: '/user_dashboard/mail_queue', label: 'Mail Queue' }
        ]
      },
      {
      path: '/user_dashboard/documents',
      label: 'Document Hub',
      icon: 'FaFileAlt',
      children: [
        { path: '/user_dashboard/document_hub/access_form_tracker', label: 'Access Form Tracker' },
        { path: '/user_dashboard/document_hub/access_form_log', label: 'Access Form Log' },
        // Hidden edit routes - only for permission management (ALL BASE PATHS)
        { 
          path: '/user_dashboard/document_hub/access_form_edit', 
          label: 'Edit Access Form', 
          isHidden: true 
        },
        { path: '/user_dashboard/document_hub/other_document_tracker', label: 'Document Tracker' },
        { path: '/user_dashboard/document_hub/other_document_log', label: 'Document Log' },
        // Hidden edit routes - only for permission management (ALL BASE PATHS)
        { 
          path: '/user_dashboard/document_hub/other_document_tracker/device_tracker/edit', // CHANGED: removed [dt_id]
          label: 'Edit Device Tracker', 
          isHidden: true 
        },
        { 
          path: '/user_dashboard/document_hub/other_document_tracker/sim_tracker/edit', 
          label: 'Edit SIM Tracker', 
          isHidden: true 
        },
        { 
          path: '/user_dashboard/document_hub/other_document_tracker/portal_tracker/edit', 
          label: 'Edit Portal Tracker', 
          isHidden: true 
        }
      ]
    },
    { 
      path: '/user_dashboard/operational_task',
      label: 'Operational Task', 
      icon: 'BsMotherboardFill', 
      children: [
        { path: '/user_dashboard/operational_task/fee_com_cal', label: 'Fee-Com Calculation' },
      ]
    },
      {
        path: '/user_dashboard/reports',
        label: 'Performance Reports',
        icon: 'FaChartLine',
        children: [
          { path: '/user_dashboard/weekly_report', label: 'Weekly Analysis' },
          { path: '/user_dashboard/monthly_report', label: 'Monthly Summary' },
          { path: '/user_dashboard/annual_report', label: 'Annual Review' }
        ]
      },
      {
        path: '/user_dashboard/roster',
        label: 'Roster Management',
        icon: 'FaCalendarAlt',
        children: [
          { path: '/user_dashboard/roster/roster_schedule', label: 'Roster Schedule' },
          { path: '/user_dashboard/roster/my_roster', label: 'My Roster' },
          { path: '/user_dashboard/roster/create_roster', label: 'Create Roster' }
        ]
      },
      {
        path: '/user_dashboard/knowledge_station',
        label: 'Knowledge Station',
        icon: 'FaBook',
        children: []
      },
      {
        path: '/user_dashboard/activity_log',
        label: 'Activity Log',
        icon: 'FaHistory',
        children: []
      }
    ];

    return NextResponse.json({ success: true, menuStructure });
  } catch (error) {
    logger.error('Failed to fetch menu structure', {
      meta: {
        taskName: 'MenuStructure',
        details: `Error: ${error.message}`
      }
    });
    return NextResponse.json(
      { success: false, message: 'Failed to fetch menu structure' },
      { status: 500 }
    );
  }
}