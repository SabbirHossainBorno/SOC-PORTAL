// app/api/user_dashboard/welcome-check/route.js
import { query } from '../../../lib/db';
import { NextResponse } from 'next/server';
import logger from '../../../lib/logger';
import { cookies } from 'next/headers';

// Import the telegram function the same way as your login API
import sendTelegramAlert from '../../../lib/telegramAlert';

// Add a simple in-memory cache to prevent rapid duplicate processing
const recentChecks = new Map();

export async function GET(request) {
  try {
    // Await cookies
    const cookieStore = await cookies();
    const eid = cookieStore.get('eid')?.value || 'N/A';
    const sid = cookieStore.get('sessionId')?.value || 'N/A';
    const socPortalId = cookieStore.get('socPortalId')?.value || 'N/A';
    const roleType = cookieStore.get('roleType')?.value || 'N/A';

    logger.info('Welcome check request received', {
      meta: {
        eid,
        sid,
        socPortalId,
        taskName: 'WelcomeCheck',
        details: `Checking welcome status for user: ${socPortalId}`
      }
    });

    // Validate required parameters
    if (!socPortalId || socPortalId === 'N/A') {
      logger.warn('Missing socPortalId in welcome check', {
        meta: {
          eid,
          sid,
          taskName: 'WelcomeCheck',
          details: 'Missing socPortalId cookie'
        }
      });
      return NextResponse.json(
        { error: 'Unauthorized: Missing user ID' },
        { status: 401 }
      );
    }

    // CHECK: If we recently processed this user, return cached result
    const cacheKey = `welcome_${socPortalId}`;
    const recentCheck = recentChecks.get(cacheKey);
    if (recentCheck && Date.now() - recentCheck.timestamp < 5000) { // 5 second cache
      logger.info('Returning cached welcome check result', {
        meta: {
          eid,
          sid,
          socPortalId,
          taskName: 'WelcomeCheck',
          details: 'Recently checked this user, returning cached result'
        }
      });
      return NextResponse.json(recentCheck.result);
    }

    // Check if this is user's first login AND welcome not shown yet
    const loginTrackerQuery = `
      SELECT total_login_count, last_login_time, welcome_shown 
      FROM user_login_tracker 
      WHERE soc_portal_id = $1
    `;
    const loginResult = await query(loginTrackerQuery, [socPortalId]);

    if (loginResult.rows.length === 0) {
      logger.warn('User login tracker not found', {
        meta: {
          eid,
          sid,
          socPortalId,
          taskName: 'WelcomeCheck',
          details: `No login tracker found for user: ${socPortalId}`
        }
      });
      
      // Cache the negative result
      const result = { showWelcome: false };
      recentChecks.set(cacheKey, {
        timestamp: Date.now(),
        result: result
      });
      
      // Clean up old entry
      setTimeout(() => {
        recentChecks.delete(cacheKey);
      }, 30000);
      
      return NextResponse.json(result);
    }

    const userLoginData = loginResult.rows[0];
    const isFirstLogin = userLoginData.total_login_count === 1;
    const welcomeAlreadyShown = userLoginData.welcome_shown;

    logger.info('Login tracker check completed', {
      meta: {
        eid,
        sid,
        socPortalId,
        taskName: 'WelcomeCheck',
        details: `User ${socPortalId} - Total logins: ${userLoginData.total_login_count}, First login: ${isFirstLogin}, Welcome shown: ${welcomeAlreadyShown}`
      }
    });

    // If not first login OR welcome already shown, return false
    if (!isFirstLogin || welcomeAlreadyShown) {
      // Cache the negative result
      const result = { showWelcome: false };
      recentChecks.set(cacheKey, {
        timestamp: Date.now(),
        result: result
      });
      
      // Clean up old entry
      setTimeout(() => {
        recentChecks.delete(cacheKey);
      }, 30000);
      
      return NextResponse.json(result);
    }

    // Get user details from user_info table
    const userInfoQuery = `
      SELECT 
        first_name,
        last_name,
        soc_portal_id,
        ngd_id,
        profile_photo_url,
        role_type,
        designation,
        email,
        phone,
        joining_date
      FROM user_info 
      WHERE soc_portal_id = $1
    `;
    const userInfoResult = await query(userInfoQuery, [socPortalId]);

    if (userInfoResult.rows.length === 0) {
      logger.error('User info not found for welcome message', {
        meta: {
          eid,
          sid,
          socPortalId,
          taskName: 'WelcomeCheck',
          details: `No user info found for: ${socPortalId}`
        }
      });
      
      // Cache the negative result
      const result = { showWelcome: false };
      recentChecks.set(cacheKey, {
        timestamp: Date.now(),
        result: result
      });
      
      // Clean up old entry
      setTimeout(() => {
        recentChecks.delete(cacheKey);
      }, 30000);
      
      return NextResponse.json(result);
    }

    const userInfo = userInfoResult.rows[0];

    // Format user info for response
    const formattedUserInfo = {
      firstName: userInfo.first_name,
      lastName: userInfo.last_name,
      socPortalId: userInfo.soc_portal_id,
      ngdId: userInfo.ngd_id,
      profilePhoto: userInfo.profile_photo_url,
      roleType: userInfo.role_type,
      designation: userInfo.designation,
      email: userInfo.email,
      phone: userInfo.phone,
      joiningDate: userInfo.joining_date
    };

    // Send Telegram alert about welcome popup - using the same format as your login API
    let telegramAlertSent = false;
    try {
      // Create welcome message in similar format to your login alerts
      const welcomeMessage = `
🎉 [ SOC PORTAL | WELCOME NEW USER ] 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 New User        : ${formattedUserInfo.firstName} ${formattedUserInfo.lastName}
📧 Email           : ${formattedUserInfo.email}
🆔 SOC Portal ID   : ${formattedUserInfo.socPortalId}
🆔 NGD ID          : ${formattedUserInfo.ngdId}
👥 Role Type       : ${formattedUserInfo.roleType}
💼 Designation     : ${formattedUserInfo.designation}
📅 Joining Date    : ${formattedUserInfo.joiningDate ? new Date(formattedUserInfo.joiningDate).toLocaleDateString() : 'N/A'}
✅ Status          : First Login - Welcome Popup Displayed
🕒 Time            : ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })} (BST)
      `;

      const telegramSent = await sendTelegramAlert(`\`\`\`\n${welcomeMessage}\n\`\`\``);
      telegramAlertSent = telegramSent;

      if (telegramSent === true) {
        logger.info('Telegram alert sent successfully for welcome popup', {
          meta: {
            eid,
            sid,
            socPortalId,
            taskName: 'WelcomeCheck',
            details: `Telegram alert sent for user: ${socPortalId}`
          }
        });
      } else if (telegramSent === false) {
        logger.warn('Telegram alert failed to send for welcome popup', {
          meta: {
            eid,
            sid,
            socPortalId,
            taskName: 'WelcomeCheck',
            details: 'Telegram alert returned false'
          }
        });
      } else {
        logger.info('Telegram alert status unknown for welcome popup', {
          meta: {
            eid,
            sid,
            socPortalId,
            taskName: 'WelcomeCheck',
            details: `Telegram function returned: ${telegramSent}`
          }
        });
      }
    } catch (telegramError) {
      logger.error('Exception occurred while sending Telegram alert for welcome popup', {
        meta: {
          eid,
          sid,
          socPortalId,
          taskName: 'WelcomeCheck',
          details: `Telegram error: ${telegramError.message}`,
          error: telegramError.message
        }
      });
    }

    logger.info('Welcome popup will be shown', {
      meta: {
        eid,
        sid,
        socPortalId,
        taskName: 'WelcomeCheck',
        telegramAlertSent,
        details: `First login welcome for: ${formattedUserInfo.firstName} ${formattedUserInfo.lastName} (${socPortalId})`
      }
    });

    // Before returning, cache the result
    const result = {
      showWelcome: true,
      userInfo: formattedUserInfo
    };
    
    recentChecks.set(cacheKey, {
      timestamp: Date.now(),
      result: result
    });

    // Clean up old entries (optional)
    setTimeout(() => {
      recentChecks.delete(cacheKey);
    }, 30000); // Clear after 30 seconds

    return NextResponse.json(result);

  } catch (error) {
    // Await cookies in catch block
    const cookieStore = await cookies();
    const eid = cookieStore.get('eid')?.value || 'N/A';
    const sid = cookieStore.get('sessionId')?.value || 'N/A';
    const socPortalId = cookieStore.get('socPortalId')?.value || 'N/A';

    logger.error('Error in welcome check API', {
      meta: {
        eid,
        sid,
        socPortalId,
        taskName: 'WelcomeCheck',
        details: `Unexpected error: ${error.message}`,
        error: error.message,
        stack: error.stack
      }
    });

    return NextResponse.json(
      { 
        error: 'Failed to check welcome status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// NEW: POST method to mark welcome as shown
export async function POST(request) {
  try {
    // Await cookies
    const cookieStore = await cookies();
    const eid = cookieStore.get('eid')?.value || 'N/A';
    const sid = cookieStore.get('sessionId')?.value || 'N/A';
    const socPortalId = cookieStore.get('socPortalId')?.value || 'N/A';

    logger.info('Mark welcome as shown request received', {
      meta: {
        eid,
        sid,
        socPortalId,
        taskName: 'MarkWelcomeShown',
        details: `Marking welcome as shown for user: ${socPortalId}`
      }
    });

    // Validate required parameters
    if (!socPortalId || socPortalId === 'N/A') {
      logger.warn('Missing socPortalId in mark welcome shown', {
        meta: {
          eid,
          sid,
          taskName: 'MarkWelcomeShown',
          details: 'Missing socPortalId cookie'
        }
      });
      return NextResponse.json(
        { error: 'Unauthorized: Missing user ID' },
        { status: 401 }
      );
    }

    // Update the welcome_shown flag in database
    const updateQuery = `
      UPDATE user_login_tracker 
      SET welcome_shown = TRUE, updated_at = NOW()
      WHERE soc_portal_id = $1
    `;
    const result = await query(updateQuery, [socPortalId]);

    if (result.rowCount === 0) {
      logger.error('Failed to update welcome_shown flag', {
        meta: {
          eid,
          sid,
          socPortalId,
          taskName: 'MarkWelcomeShown',
          details: `No rows affected for user: ${socPortalId}`
        }
      });
      return NextResponse.json(
        { error: 'Failed to update welcome status' },
        { status: 500 }
      );
    }

    // Clear the cache for this user since we updated the status
    const cacheKey = `welcome_${socPortalId}`;
    recentChecks.delete(cacheKey);

    logger.info('Welcome shown flag updated successfully', {
      meta: {
        eid,
        sid,
        socPortalId,
        taskName: 'MarkWelcomeShown',
        details: `Welcome marked as shown for user: ${socPortalId}`
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Welcome status updated successfully'
    });

  } catch (error) {
    // Await cookies in catch block
    const cookieStore = await cookies();
    const eid = cookieStore.get('eid')?.value || 'N/A';
    const sid = cookieStore.get('sessionId')?.value || 'N/A';
    const socPortalId = cookieStore.get('socPortalId')?.value || 'N/A';

    logger.error('Error in mark welcome shown API', {
      meta: {
        eid,
        sid,
        socPortalId,
        taskName: 'MarkWelcomeShown',
        details: `Unexpected error: ${error.message}`,
        error: error.message,
        stack: error.stack
      }
    });

    return NextResponse.json(
      { 
        error: 'Failed to mark welcome as shown',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}