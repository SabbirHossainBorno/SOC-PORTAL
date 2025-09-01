// app/api/user_dashboard/report_downtime/pre_defined_issue/route.js
import { NextResponse } from 'next/server';
import logger from '../../../../../lib/logger';

export async function GET(request) {
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';
  
  logger.info('Fetching predefined issues', {
    meta: {
      eid,
      sid: sessionId,
      taskName: 'GetPredefinedIssues',
      userId: socPortalId
    }
  });

  const currentMonthYear = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  try {
    const predefinedIssues = [
      {
        id: "delayed-app",
        title: "Delayed App Response",
        description: "Slow response times across multiple services",
        categories: [
          'SEND MONEY', 'CASHOUT', 'BILL PAYMENT', 'EMI PAYMENT',
          'TRANSFER MONEY', 'ADD MONEY', 'MOBILE RECHARGE',
          'MERCHANT PAYMENT', 'B2B', 'B2M', 'CASHIN',
          'TRANSACTION HISTORY', 'KYC', 'REGISTRATION',
          'DEVICE CHANGE', 'E-COM PAYMENT'
        ],
        template: {
          affectedChannel: "APP",
          affectedPersona: "ALL",
          affectedService: "ALL",
          impactType: "PARTIAL",
          modality: "UNPLANNED",
        }
      },
      {
        id: "db-maintenance",
        title: "DB Maintenance Activity",
        description: "Planned database maintenance affecting all services",
        categories: [
          'SEND MONEY',
          'CASHOUT',
          'BILL PAYMENT',
          'EMI PAYMENT',
          'TRANSFER MONEY',
          'TRANSACTION HISTORY',
          'E-COM PAYMENT',
          'DEVICE CHANGE',
          'CASHIN',
          'ADD MONEY',
          'MOBILE RECHARGE',
          'B2M',
          'REGISTRATION',
          'KYC',
          'B2B',
          'MERCHANT PAYMENT',
          'PROFILE VISIBILITY',
          'BLOCK OPERATION',
          'LIFTING',
          'REFUND',
          'PARTNER REGISTRATION',
          'KYC OPERATIONS',
          'REVERSAL',
          'DISBURSEMENT',
          'REMITTANCE',
          'BANK TO NAGAD'
        ],
        template: {
          affectedChannel: "ALL",
          impactType: "FULL",
          modality: "PLANNED",
          concern: "INTERNAL",
          systemUnavailability: "DATABASE",
          reason: `LIVE DB ACTIVITY - Database Purging ${currentMonthYear}`,
          resolution: "Maintenance Activity Successful"
        }
      },
      {
        id: "network-outage",
        title: "Network Outage",
        description: "Complete network failure affecting all services",
        categories: [
          'APP', 'USSD', 'WEB', 'ADD MONEY', 'BILL PAYMENT', 
          'E-COM PAYMENT', 'MOBILE RECHARGE', 'SMS', 
          'TRANSFER MONEY', 'REMITTANCE', 'REGISTRATION', 'RESUBMIT KYC'
        ],
        template: {
          impactedService: "All Services",
          impactType: "FULL",
          modality: "UNPLANNED",
          reliabilityImpacted: "YES",
          systemUnavailability: "NETWORK",
          reason: "Fiber cut in main data center",
          resolution: "Failover to backup network connection"
        }
      },
      {
        id: "payment-gateway",
        title: "Payment Gateway Failure",
        description: "Failure in third-party payment gateway",
        categories: [
          'ADD MONEY', 'BILL PAYMENT', 
          'E-COM PAYMENT', 'MOBILE RECHARGE', 
          'TRANSFER MONEY', 'REMITTANCE'
        ],
        template: {
          impactedService: "Payment Processing",
          impactType: "FULL",
          modality: "UNPLANNED",
          reliabilityImpacted: "YES",
          systemUnavailability: "EXTERNAL",
          reason: "Third-party payment gateway API failure",
          resolution: "Gateway provider resolved the issue"
        }
      }
    ];

    logger.info('Predefined issues returned', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'GetPredefinedIssues',
        count: predefinedIssues.length
      }
    });

    return NextResponse.json(predefinedIssues);
  } catch (error) {
    logger.error('Failed to fetch predefined issues', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'SystemError',
        details: error.message,
        stack: error.stack,
        userId: socPortalId
      }
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', 
        message: error.message 
      },
      { status: 500 }
    );
  }
}