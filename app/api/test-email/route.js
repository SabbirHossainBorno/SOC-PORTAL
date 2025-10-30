// app/api/test-email/route.js
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET() {
  try {
    console.log('🔧 Testing SMTP Configuration from .env.local:');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_FROM:', process.env.SMTP_FROM);
    console.log('EMAIL_TO:', process.env.EMAIL_TO);

    // Validate that environment variables are set
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_FROM || !process.env.EMAIL_TO) {
      return NextResponse.json({
        success: false,
        message: 'Missing environment variables',
        details: {
          SMTP_HOST: process.env.SMTP_HOST || 'NOT SET',
          SMTP_PORT: process.env.SMTP_PORT || 'NOT SET',
          SMTP_FROM: process.env.SMTP_FROM || 'NOT SET',
          EMAIL_TO: process.env.EMAIL_TO || 'NOT SET'
        }
      }, { status: 500 });
    }

    // Create transporter using .env.local configuration
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false, // Port 25 is not secure
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
      // No authentication for internal SMTP
    });

    console.log('🔄 Verifying SMTP connection...');
    
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');

    // Test email content
    const testEmailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #004785; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .success { background-color: #d4edda; color: #155724; padding: 10px; border-radius: 4px; }
          .info { background-color: #d1ecf1; color: #0c5460; padding: 10px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SOC Portal - SMTP Test Successful</h1>
          </div>
          <div class="content">
            <div class="success">
              <strong>✅ SMTP Configuration Test - PASSED</strong>
            </div>
            
            <div class="info">
              <p>This is a test email to verify the SMTP configuration for SOC Portal.</p>
            </div>

            <h3>Configuration Details:</h3>
            <ul>
              <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
              <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT}</li>
              <li><strong>From Email:</strong> ${process.env.SMTP_FROM}</li>
              <li><strong>To Email:</strong> ${process.env.EMAIL_TO}</li>
              <li><strong>Timestamp:</strong> ${new Date().toString()}</li>
              <li><strong>Server:</strong> SOC Portal Notification System</li>
            </ul>

            <p>If you received this email, the SMTP configuration is working correctly and SOC Portal can send notifications.</p>
            
            <hr>
            <p><em>This is an automated test message from SOC Portal Notification System.</em></p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send test email
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: process.env.EMAIL_TO,
      subject: 'SOC Portal - SMTP Configuration Test',
      html: testEmailHTML,
    };

    console.log('📤 Sending test email...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Test email sent successfully:', info.messageId);

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      details: {
        messageId: info.messageId,
        from: process.env.SMTP_FROM,
        to: process.env.EMAIL_TO,
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT
      }
    });

  } catch (error) {
    console.error('❌ SMTP Test Failed:', error.message);
    
    return NextResponse.json({
      success: false,
      message: 'SMTP test failed',
      error: error.message,
      details: {
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT,
        from: process.env.SMTP_FROM,
        to: process.env.EMAIL_TO
      }
    }, { status: 500 });
  }
}