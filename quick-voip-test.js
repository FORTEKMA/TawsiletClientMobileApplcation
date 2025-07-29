/**
 * Quick VoIP Test Script
 * Fast and easy VoIP notification testing
 */

const axios = require('axios');
require('dotenv').config();

// Quick configuration
const QUICK_CONFIG = {
  ONESIGNAL_APP_ID: process.env.ONESIGNAL_APP_ID || 'e71c2a66-73f5-4e3b-b8a0-e58bf6f52ec0',
  ONESIGNAL_API_KEY: process.env.ONESIGNAL_API_KEY || 'YOUR_REST_API_KEY_HERE',
};

/**
 * Quick voice call test to specific user
 */
async function quickVoiceTest(userId = null, playerId = null) {
  console.log('📞 Sending quick voice call...');
  
  if (userId) {
    console.log(`👤 Targeting user: ${userId}`);
  } else if (playerId) {
    console.log(`📱 Targeting player: ${playerId}`);
  } else {
    console.log('📢 Sending to all users (no specific target)');
  }
  
  try {
    const callData = {
      type: "voip_call",
      callType: "voice",
      channelName: `tawsilet_quick_voice_${Date.now()}`,
      driverId: "quick-driver-123",
      caller: {
        id: "quick-driver-123",
        firstName: "Ahmed",
        lastName: "Driver",
        phoneNumber: "+21612345678",
        avatar: null,
      },
      orderData: {
        id: "quick-order-456",
        pickup: "Tunis, Tunisia",
        dropoff: "Sousse, Tunisia",
        status: "in_progress",
      },
      timestamp: Date.now(),
    };

    // Build notification payload
    const notificationPayload = {
      app_id: QUICK_CONFIG.ONESIGNAL_APP_ID,
      target_channel: "push",
      headings: {
        en: 'Voice Call',
        ar: 'مكالمة صوتية',
        fr: 'Appel vocal'
      },
      contents: {
        en: 'Ahmed is calling you',
        ar: 'أحمد يتصل بك',
        fr: 'Ahmed vous appelle'
      },
      mutable_content: true,
      android_channel_id: '4ff9eb18-a657-46ce-9f83-749fd9056b49',
      android_accent_color: "#4CAF50",
      android_category: "call",
      android_priority: "high",
      ios_badgeType: "Increase",
      ios_badgeCount: 1,
      priority: 10,
      data: callData,
      android_sound: "notification_sound",
      ios_sound: "notification_sound.wav",
      android_visibility: 1,
    };

    // Add targeting based on provided parameters
    if (userId) {
      notificationPayload.include_external_user_ids = [userId];
    } else if (playerId) {
      notificationPayload.include_player_ids = [playerId];
    } else {
      notificationPayload.included_segments = ["All"];
    }

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      notificationPayload,
      {
        headers: {
          Authorization: `Basic ${QUICK_CONFIG.ONESIGNAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Voice call sent successfully!');
    console.log('📱 Notification ID:', response.data.id);
    console.log('📞 Channel:', callData.channelName);
    console.log('👤 Caller:', callData.caller.firstName, callData.caller.lastName);
    
    return response.data;
  } catch (error) {
    console.error('❌ Voice call failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Quick video call test to specific user
 */
async function quickVideoTest(userId = null, playerId = null) {
  console.log('📹 Sending quick video call...');
  
  if (userId) {
    console.log(`👤 Targeting user: ${userId}`);
  } else if (playerId) {
    console.log(`📱 Targeting player: ${playerId}`);
  } else {
    console.log('📢 Sending to all users (no specific target)');
  }
  
  try {
    const callData = {
      type: "voip_call",
      callType: "video",
      channelName: `tawsilet_quick_video_${Date.now()}`,
      caller: {
        id: "quick-driver-456",
        firstName: "Sarah",
        lastName: "Driver",
        phoneNumber: "+21612345679",
        avatar: null,
      },
      orderData: {
        id: "quick-order-789",
        pickup: "Hammamet, Tunisia",
        dropoff: "Monastir, Tunisia",
        status: "in_progress",
      },
      timestamp: Date.now(),
    };

    // Build notification payload
    const notificationPayload = {
      app_id: QUICK_CONFIG.ONESIGNAL_APP_ID,
      target_channel: "push",
      headings: {
        en: 'Video Call',
        ar: 'مكالمة فيديو',
        fr: 'Appel vidéo'
      },
      contents: {
        en: 'Sarah is calling you',
        ar: 'سارة تتصل بك',
        fr: 'Sarah vous appelle'
      },
      mutable_content: true,
      android_channel_id: '4ff9eb18-a657-46ce-9f83-749fd9056b49',
      android_accent_color: "#4CAF50",
      android_category: "call",
      android_priority: "high",
      ios_badgeType: "Increase",
      ios_badgeCount: 1,
      priority: 10,
      data: callData,
      android_sound: "notification_sound",
      ios_sound: "notification_sound.wav",
      android_visibility: 1,
    };

    // Add targeting based on provided parameters
    if (userId) {
      notificationPayload.include_external_user_ids = [userId];
    } else if (playerId) {
      notificationPayload.include_player_ids = [playerId];
    } else {
      notificationPayload.included_segments = ["All"];
    }

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      notificationPayload,
      {
        headers: {
          Authorization: `Basic ${QUICK_CONFIG.ONESIGNAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Video call sent successfully!');
    console.log('📱 Notification ID:', response.data.id);
    console.log('📹 Channel:', callData.channelName);
    console.log('👤 Caller:', callData.caller.firstName, callData.caller.lastName);
    
    return response.data;
  } catch (error) {
    console.error('❌ Video call failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Quick call action test to specific user
 */
async function quickActionTest(action = 'accepted', userId = null, playerId = null) {
  console.log(`🔄 Sending quick ${action} action...`);
  
  if (userId) {
    console.log(`👤 Targeting user: ${userId}`);
  } else if (playerId) {
    console.log(`📱 Targeting player: ${playerId}`);
  } else {
    console.log('📢 Sending to all users (no specific target)');
  }
  
  try {
    const actionData = {
      type: "voip_call_action",
      action: action,
      channelName: `tawsilet_quick_action_${Date.now()}`,
      caller: {
        id: "quick-driver-123",
        firstName: "Ahmed",
        lastName: "Driver",
      },
      orderData: {
        id: "quick-order-456",
        pickup: "Tunis, Tunisia",
        dropoff: "Sousse, Tunisia",
      },
      timestamp: Date.now(),
    };

    const actionMessages = {
      accepted: {
        en: 'Call accepted',
        ar: 'تم قبول المكالمة',
        fr: 'Appel accepté'
      },
      declined: {
        en: 'Call declined',
        ar: 'تم رفض المكالمة',
        fr: 'Appel refusé'
      },
      ended: {
        en: 'Call ended',
        ar: 'تم إنهاء المكالمة',
        fr: 'Appel terminé'
      }
    };

    // Build notification payload
    const notificationPayload = {
      app_id: QUICK_CONFIG.ONESIGNAL_APP_ID,
      target_channel: "push",
      headings: {
        en: 'Call Update',
        ar: 'تحديث المكالمة',
        fr: 'Mise à jour appel'
      },
      contents: actionMessages[action] || {
        en: `Call ${action}`,
        ar: `تم ${action} المكالمة`,
        fr: `Appel ${action}`
      },
      mutable_content: true,
      android_channel_id: '4ff9eb18-a657-46ce-9f83-749fd9056b49',
      priority: 10,
      data: actionData,
    };

    // Add targeting based on provided parameters
    if (userId) {
      notificationPayload.include_external_user_ids = [userId];
    } else if (playerId) {
      notificationPayload.include_player_ids = [playerId];
    } else {
      notificationPayload.included_segments = ["All"];
    }

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      notificationPayload,
      {
        headers: {
          Authorization: `Basic ${QUICK_CONFIG.ONESIGNAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ ${action} action sent successfully!`);
    console.log('📱 Notification ID:', response.data.id);
    console.log('🔄 Action:', action);
    
    return response.data;
  } catch (error) {
    console.error(`❌ ${action} action failed:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Quick test with specific user
 */
async function quickTestWithUser(userId, callType = 'voice') {
  console.log(`📞 Quick ${callType} call test to user: ${userId}\n`);
  
  try {
    if (callType === 'voice') {
      await quickVoiceTest(userId, null);
    } else if (callType === 'video') {
      await quickVideoTest(userId, null);
    } else {
      console.log('❌ Invalid call type. Use: voice or video');
      return;
    }
    
    console.log('\n✅ Test completed!');
    console.log('📱 Check your app for the incoming call notification');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Quick all tests to specific user
 */
async function quickAllTests(userId = null, playerId = null) {
  console.log('🚀 Running all quick tests...\n');

  if (userId) {
    console.log(`👤 Targeting user: ${userId}\n`);
  } else if (playerId) {
    console.log(`📱 Targeting player: ${playerId}\n`);
  } else {
    console.log('📢 Sending to all users (no specific target)\n');
  }

  try {
    // Test 1: Voice call
    console.log('1️⃣ Voice Call Test');
    await quickVoiceTest(userId, playerId);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Video call
    console.log('\n2️⃣ Video Call Test');
    await quickVideoTest(userId, playerId);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Call actions
    console.log('\n3️⃣ Call Actions Test');
    await quickActionTest('accepted', userId, playerId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await quickActionTest('declined', userId, playerId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await quickActionTest('ended', userId, playerId);

    console.log('\n🎉 All quick tests completed successfully!');
    console.log('\n📱 Check your app for:');
    console.log('   - Incoming call notifications');
    console.log('   - Call screen navigation');
    console.log('   - Call action handling');

  } catch (error) {
    console.error('❌ Quick tests failed:', error.message);
  }
}

/**
 * Get user ID from command line or prompt
 */
function getUserTarget() {
  const args = process.argv.slice(2);
  const userId = args[1];
  const playerId = args[2];
  
  if (userId && userId !== '""') {
    return { type: 'user_id', value: userId };
  } else if (playerId && playerId !== '""') {
    return { type: 'player_id', value: playerId };
  }
  
  return null;
}

/**
 * Show usage
 */
function showUsage() {
  console.log(`
📞 Quick VoIP Test Script
=========================

Usage:
  node quick-voip-test.js <command> [user_id] [player_id]

Commands:
  voice [user_id] [player_id]     Send voice call notification
  video [user_id] [player_id]     Send video call notification
  action <type> [user_id] [player_id]  Send call action (accepted/declined/ended)
  all [user_id] [player_id]       Run all quick tests
  test <user_id> [voice|video]    Quick test with specific user

Targeting Options:
  user_id                         External user ID (recommended)
  player_id                       OneSignal player ID (alternative)

Examples:
  # Send to specific user by external user ID
  node quick-voip-test.js voice user123
  node quick-voip-test.js video user456
  node quick-voip-test.js action accepted user789
  node quick-voip-test.js all user123

  # Quick test with specific user
  node quick-voip-test.js test user123
  node quick-voip-test.js test user456 video

  # Send to specific user by player ID
  node quick-voip-test.js voice "" player123
  node quick-voip-test.js video "" player456
  node quick-voip-test.js action declined "" player789

  # Send to all users (no targeting)
  node quick-voip-test.js voice
  node quick-voip-test.js all

Setup:
  1. Add your OneSignal API key to .env:
     ONESIGNAL_API_KEY=your_api_key_here
  2. Get API key from: https://app.onesignal.com/apps/${QUICK_CONFIG.ONESIGNAL_APP_ID}/settings/keys_and_ids

Notes:
  - Make sure your app is running
  - Test in different app states (killed/background/foreground)
  - Check console logs for VoIP service initialization
  - Use external_user_id for better user targeting
  - Player ID can be found in OneSignal dashboard or app logs
`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('📞 Quick VoIP Test Script\n');

  // Check if API key is configured
  if (QUICK_CONFIG.ONESIGNAL_API_KEY === 'YOUR_REST_API_KEY_HERE') {
    console.log('❌ Error: OneSignal REST API Key not configured!');
    console.log('📝 Please add your API key to .env file:');
    console.log('   ONESIGNAL_API_KEY=your_api_key_here');
    console.log('🔑 Get your API key from: https://app.onesignal.com/apps/' + QUICK_CONFIG.ONESIGNAL_APP_ID + '/settings/keys_and_ids');
    return;
  }

  try {
    switch (command) {
      case 'voice':
        const voiceUserId = args[1] || null;
        const voicePlayerId = args[2] || null;
        await quickVoiceTest(voiceUserId, voicePlayerId);
        break;

      case 'video':
        const videoUserId = args[1] || null;
        const videoPlayerId = args[2] || null;
        await quickVideoTest(videoUserId, videoPlayerId);
        break;

      case 'action':
        const action = args[1];
        if (!action || !['accepted', 'declined', 'ended'].includes(action)) {
          console.log('❌ Invalid action. Use: accepted, declined, or ended');
          return;
        }
        const actionUserId = args[2] || null;
        const actionPlayerId = args[3] || null;
        await quickActionTest(action, actionUserId, actionPlayerId);
        break;

      case 'all':
        const allUserId = args[1] || null;
        const allPlayerId = args[2] || null;
        await quickAllTests(allUserId, allPlayerId);
        break;

      case 'test':
        const testUserId = args[1];
        const testCallType = args[2] || 'voice';
        if (!testUserId) {
          console.log('❌ Please provide a user ID for testing');
          console.log('Usage: node quick-voip-test.js test <user_id> [voice|video]');
          return;
        }
        await quickTestWithUser(testUserId, testCallType);
        break;

      default:
        showUsage();
        break;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  quickVoiceTest,
  quickVideoTest,
  quickActionTest,
  quickAllTests
}; 