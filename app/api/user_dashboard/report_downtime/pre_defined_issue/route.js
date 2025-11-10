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
        id: "delay-app-login",
        title: "Delay in APP Login Response Time",
        description: "Slow login response times affecting all APP services",
        categories: [
          'SEND MONEY', 'CASHOUT', 'BILL PAYMENT', 'EMI PAYMENT', 
          'MERCHANT PAYMENT', 'MOBILE RECHARGE', 'ADD MONEY', 
          'TRANSFER MONEY', 'B2B', 'B2M', 'CASHIN', 
          'TRANSACTION HISTORY', 'RE-SUBMIT KYC', 'REGISTRATION', 'DEVICE CHANGE'
        ],
        template: {
          issueTitle: "Delay in APP Login Response Time",
          affectedChannel: ["APP"],
          affectedPersona: ["ALL"],
          affectedService: ["ALL"],
          impactType: "PARTIAL",
          modality: "UNPLANNED",
          reliabilityImpacted: "NO",
          concern: "INTERNAL",
          systemUnavailability: "SYSTEM",
          reason: "High server load causing delayed response times in APP login",
          resolution: "Server resources optimized and load balanced"
        }
      },
      {
        id: "sms-otp-all-mno",
        title: "SMS/OTP Outage For All MNO",
        description: "Complete SMS/OTP service outage affecting all mobile operators",
        categories: [
          'RE-SUBMIT KYC', 'REGISTRATION', 'DEVICE CHANGE', 'E-COM PAYMENT'
        ],
        template: {
          issueTitle: "SMS/OTP Outage For All MNO",
          affectedChannel: ["SMS"],
          affectedMNO: ["ALL"],
          affectedService: ["E-COM PAYMENT", "REGISTRATION", "KYC"],
          impactType: "FULL",
          modality: "UNPLANNED",
          reliabilityImpacted: "YES",
          concern: "INTERNAL",
          systemUnavailability: "SMS GATEWAY",
          reason: "SMS gateway service disruption affecting all MNOs",
          resolution: "SMS gateway service restored and failover implemented"
        }
      },
      {
        id: "sms-otp-robi",
        title: "SMS/OTP Outage For Robi/Airtel",
        description: "SMS/OTP service outage specific to Robi/Airtel network",
        categories: [
          'RE-SUBMIT KYC', 'REGISTRATION', 'DEVICE CHANGE', 'E-COM PAYMENT'
        ],
        template: {
          issueTitle: "SMS/OTP Outage For Robi/Airtel",
          affectedChannel: ["SMS"],
          affectedMNO: ["ROBI/AIRTEL"],
          affectedService: ["E-COM PAYMENT", "REGISTRATION", "KYC"],
          impactType: "FULL",
          modality: "UNPLANNED",
          reliabilityImpacted: "YES",
          concern: "EXTERNAL",
          systemUnavailability: "EXTERNAL",
          reason: "Robi/Airtel network issues causing SMS delivery failure",
          resolution: "Robi/Airtel network issues resolved"
        }
      },
      {
        id: "sms-otp-gp",
        title: "SMS/OTP Outage For Grameenphone",
        description: "SMS/OTP service outage specific to Grameenphone network",
        categories: [
          'RE-SUBMIT KYC', 'REGISTRATION', 'DEVICE CHANGE', 'E-COM PAYMENT'
        ],
        template: {
          issueTitle: "SMS/OTP Outage For Grameenphone",
          affectedChannel: ["SMS"],
          affectedMNO: ["GRAMEENPHONE"],
          affectedService: ["E-COM PAYMENT", "REGISTRATION", "KYC"],
          impactType: "FULL",
          modality: "UNPLANNED",
          reliabilityImpacted: "YES",
          concern: "EXTERNAL",
          systemUnavailability: "EXTERNAL",
          reason: "Grameenphone network issues causing SMS delivery failure",
          resolution: "Grameenphone network issues resolved"
        }
      },
      {
        id: "sms-otp-banglalink",
        title: "SMS/OTP Outage For Banglalink",
        description: "SMS/OTP service outage specific to Banglalink network",
        categories: [
          'RE-SUBMIT KYC', 'REGISTRATION', 'DEVICE CHANGE', 'E-COM PAYMENT'
        ],
        template: {
          issueTitle: "SMS/OTP Outage For Banglalink",
          affectedChannel: ["SMS"],
          affectedMNO: ["BANGLALINK"],
          affectedService: ["E-COM PAYMENT", "REGISTRATION", "KYC"],
          impactType: "FULL",
          modality: "UNPLANNED",
          reliabilityImpacted: "YES",
          concern: "EXTERNAL",
          systemUnavailability: "EXTERNAL",
          reason: "Banglalink network issues causing SMS delivery failure",
          resolution: "Banglalink network issues resolved"
        }
      },
      {
        id: "sms-otp-teletalk",
        title: "SMS/OTP Outage For Teletalk",
        description: "SMS/OTP service outage specific to Teletalk network",
        categories: [
          'RE-SUBMIT KYC', 'REGISTRATION', 'DEVICE CHANGE', 'E-COM PAYMENT'
        ],
        template: {
          issueTitle: "SMS/OTP Outage For Teletalk",
          affectedChannel: ["SMS"],
          affectedMNO: ["TELETALK"],
          affectedService: ["E-COM PAYMENT", "REGISTRATION", "KYC"],
          impactType: "FULL",
          modality: "UNPLANNED",
          reliabilityImpacted: "YES",
          concern: "EXTERNAL",
          systemUnavailability: "EXTERNAL",
          reason: "Teletalk network issues causing SMS delivery failure",
          resolution: "Teletalk network issues resolved"
        }
      },
      {
        id: "db-maintenance",
        title: "Database Maintenance Activity(Full DFS System Down)",
        description: "Planned database maintenance affecting all DFS services",
        categories: [
          'SEND MONEY', 'CASHOUT', 'BILL PAYMENT', 'EMI PAYMENT', 
          'MERCHANT PAYMENT', 'MOBILE RECHARGE', 'ADD MONEY', 
          'TRANSFER MONEY', 'B2B', 'B2M', 'CASHIN', 
          'TRANSACTION HISTORY', 'RE-SUBMIT KYC', 'REGISTRATION', 'E-COM PAYMENT',
          'DEVICE CHANGE', 'PROFILE VISIBILITY', 'BLOCK OPERATION', 'LIFTING',
          'REFUND', 'DISBURSEMENT', 'REVERSAL', 'CLAWBACK', 'KYC OPERATIONS', 'PARTNER REGISTRATION',
          'REMITTANCE', 'BANK TO NAGAD'
        ],
        template: {
          issueTitle: "Database Maintenance Activity(Full DFS System Down)",
          affectedChannel: ["ALL"],
          impactType: "FULL",
          modality: "PLANNED",
          reliabilityImpacted: "NO",
          concern: "INTERNAL",
          systemUnavailability: "DATABASE",
          reason: `Planned database maintenance activity for ${currentMonthYear}`,
          resolution: "Database maintenance completed successfully"
        }
      },
      {
        id: "nagad-deployment",
        title: "Nagad End Deployment Activity(Full DFS System Down)",
        description: "Planned deployment activity affecting all DFS services",
        categories: [
          'SEND MONEY', 'CASHOUT', 'BILL PAYMENT', 'EMI PAYMENT', 
          'MERCHANT PAYMENT', 'MOBILE RECHARGE', 'ADD MONEY', 
          'TRANSFER MONEY', 'B2B', 'B2M', 'CASHIN', 
          'TRANSACTION HISTORY', 'RE-SUBMIT KYC', 'REGISTRATION', 'E-COM PAYMENT',
          'DEVICE CHANGE', 'PROFILE VISIBILITY', 'BLOCK OPERATION', 'LIFTING',
          'REFUND', 'DISBURSEMENT', 'REVERSAL', 'CLAWBACK', 'KYC OPERATIONS', 'PARTNER REGISTRATION',
          'REMITTANCE', 'BANK TO NAGAD'
        ],
        template: {
          issueTitle: "Nagad End Deployment Activity(Full DFS System Down)",
          affectedChannel: ["ALL"],
          impactType: "FULL",
          modality: "PLANNED",
          reliabilityImpacted: "NO",
          concern: "INTERNAL",
          systemUnavailability: "SYSTEM",
          reason: "Planned system deployment and update activity",
          resolution: "Deployment activity completed successfully"
        }
      },
      {
        id: "mobile-recharge-all-mno",
        title: "Outage Mobile Recharge For ALL MNO",
        description: "Mobile recharge service outage affecting all operators",
        categories: [
          'MOBILE RECHARGE', 'E-COM PAYMENT'
        ],
        template: {
          issueTitle: "Outage Mobile Recharge For ALL MNO",
          affectedChannel: ["APP", "USSD"],
          affectedPersona: ["CU"],
          affectedMNO: ["ALL"],
          affectedService: ["MOBILE RECHARGE"],
          impactType: "FULL",
          modality: "UNPLANNED",
          reliabilityImpacted: "YES",
          concern: "INTERNAL",
          systemUnavailability: "SYSTEM",
          reason: "Mobile recharge gateway service disruption",
          resolution: "Recharge gateway service restored"
        }
      },
      {
        id: "mobile-recharge-robi",
        title: "Outage In Robi/Airtel Mobile Recharge",
        description: "Mobile recharge service outage for Robi/Airtel customers",
        categories: [
          'MOBILE RECHARGE', 'E-COM PAYMENT'
        ],
        template: {
          issueTitle: "Outage In Robi/Airtel Mobile Recharge",
          affectedChannel: ["APP", "USSD"],
          affectedPersona: ["CU"],
          affectedMNO: ["ROBI/AIRTEL"],
          affectedService: ["MOBILE RECHARGE"],
          impactType: "FULL",
          modality: "UNPLANNED",
          reliabilityImpacted: "YES",
          concern: "EXTERNAL",
          systemUnavailability: "EXTERNAL",
          reason: "Robi/Airtel recharge API service disruption",
          resolution: "Robi/Airtel recharge API service restored"
        }
      },
      {
        id: "mobile-recharge-gp",
        title: "Outage In Grameenphone Mobile Recharge",
        description: "Mobile recharge service outage for Grameenphone customers",
        categories: [
          'MOBILE RECHARGE', 'E-COM PAYMENT'
        ],
        template: {
          issueTitle: "Outage In Grameenphone Mobile Recharge",
          affectedChannel: ["APP", "USSD"],
          affectedPersona: ["CU"],
          affectedMNO: ["GRAMEENPHONE"],
          affectedService: ["MOBILE RECHARGE"],
          impactType: "FULL",
          modality: "UNPLANNED",
          reliabilityImpacted: "YES",
          concern: "EXTERNAL",
          systemUnavailability: "EXTERNAL",
          reason: "Grameenphone recharge API service disruption",
          resolution: "Grameenphone recharge API service restored"
        }
      },
      {
        id: "mobile-recharge-banglalink",
        title: "Outage In Banglalink Mobile Recharge",
        description: "Mobile recharge service outage for Banglalink customers",
        categories: [
          'MOBILE RECHARGE', 'E-COM PAYMENT'
        ],
        template: {
          issueTitle: "Outage In Banglalink Mobile Recharge",
          affectedChannel: ["APP", "USSD"],
          affectedPersona: ["CU"],
          affectedMNO: ["BANGLALINK"],
          affectedService: ["MOBILE RECHARGE"],
          impactType: "FULL",
          modality: "UNPLANNED",
          reliabilityImpacted: "YES",
          concern: "EXTERNAL",
          systemUnavailability: "EXTERNAL",
          reason: "Banglalink recharge API service disruption",
          resolution: "Banglalink recharge API service restored"
        }
      },
      {
        id: "mobile-recharge-teletalk",
        title: "Outage In Teletalk Mobile Recharge",
        description: "Mobile recharge service outage for Teletalk customers",
        categories: [
          'MOBILE RECHARGE', 'E-COM PAYMENT'
        ],
        template: {
          issueTitle: "Outage In Teletalk Mobile Recharge",
          affectedChannel: ["APP", "USSD"],
          affectedPersona: ["CU"],
          affectedMNO: ["TELETALK"],
          affectedService: ["MOBILE RECHARGE"],
          impactType: "FULL",
          modality: "UNPLANNED",
          reliabilityImpacted: "YES",
          concern: "EXTERNAL",
          systemUnavailability: "EXTERNAL",
          reason: "Teletalk recharge API service disruption",
          resolution: "Teletalk recharge API service restored"
        }
      },
      {
        id: "app-ussd-outage",
        title: "Outage In APP & USSD Services",
        description: "Complete service outage affecting both APP and USSD channels",
        categories: [
          'SEND MONEY', 'CASHOUT', 'BILL PAYMENT', 'EMI PAYMENT', 
          'MERCHANT PAYMENT', 'MOBILE RECHARGE', 'ADD MONEY', 
          'TRANSFER MONEY', 'B2B', 'B2M', 'CASHIN', 
          'TRANSACTION HISTORY', 'RE-SUBMIT KYC', 'REGISTRATION', 'E-COM PAYMENT',
          'DEVICE CHANGE', 'REMITTANCE', 'BANK TO NAGAD'
        ],
        template: {
          issueTitle: "Outage In APP & USSD Services",
          affectedChannel: ["APP", "USSD"],
          affectedPersona: ["ALL"],
          affectedMNO: ["ALL"],
          affectedService: ["ALL"],
          impactType: "FULL",
          modality: "UNPLANNED",
          reliabilityImpacted: "YES",
          concern: "INTERNAL",
          systemUnavailability: "SYSTEM",
          reason: "Core banking system outage affecting APP and USSD services",
          resolution: "Core banking system restored and services normalized"
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