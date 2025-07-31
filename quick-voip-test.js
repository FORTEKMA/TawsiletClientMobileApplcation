/**
 * Quick VoIP Test Script
 * Fast and easy VoIP notification testing using Firebase Cloud Messaging
 */

const axios = require("axios");
const admin = require("firebase-admin");
const path = require("path");
require("dotenv").config();

// Initialize Firebase Admin SDK
const serviceAccount = require("./tawsiletdriver-aa5f238c9e5a.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "tawsiletdriver"
});

// Quick configuration
const QUICK_CONFIG = {
  FCM_DEVICE_TOKEN: "dWzLi3umQXeH2xp2-MGeDn:APA91bGwvgUxhwxfdnl0czObYPW_jF4czamlZgqsBUVnvTMZTWdrjc_UoRreTWDFZNjNqkGq1IUXb4wJb4F7X0ZxpQbPn1E97R-VYb4wMFMiFsMJm-1MFOY",
  FIREBASE_PROJECT_ID: "tawsiletdriver",
};

/**
 * Convert object to string-only data for FCM
 */
function convertToFCMData(obj) {
  const fcmData = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      fcmData[key] = JSON.stringify(value);
    } else {
      fcmData[key] = String(value);
    }
  }
  return fcmData;
}

/**
 * Quick voice call test to specific device
 */
async function quickVoiceTest(deviceToken = null, dataOnly = false) {
  console.log("📞 Sending quick voice call...");
  
  const targetToken = deviceToken || QUICK_CONFIG.FCM_DEVICE_TOKEN;
  console.log(`📱 Targeting device: ${targetToken.substring(0, 20)}...`);
  
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

    // Build FCM notification payload using Admin SDK
    const message = {
      token: targetToken,
      data: convertToFCMData(callData),
      ...(dataOnly ? {} : {
        notification: {
          title: "Voice Call",
          body: "Ahmed is calling you",
        },
      }),
      android: {
        priority: "high",
        ...(dataOnly ? {} : {
          notification: {
            channelId: "voip_calls",
            priority: "high",
            sound: "default",
            color: "#4CAF50",
            icon: "ic_stat_onesignal_default",
            tag: "voip_call",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        }),
        data: convertToFCMData(callData),
      },
      apns: {
        payload: {
          aps: {
            ...(dataOnly ? {} : {
              alert: {
                title: "Voice Call",
                body: "Ahmed is calling you",
              },
              sound: "notification_sound.wav",
              badge: 1,
            }),
            "content-available": 1,
            "mutable-content": 1,
            category: "voip_call",
          },
          data: convertToFCMData(callData),
        },
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert",
        },
      },
    };

    const response = await admin.messaging().send(message);

    console.log("✅ Voice call sent successfully!");
    console.log("📱 Message ID:", response);
    console.log("📞 Channel:", callData.channelName);
    console.log("👤 Caller:", callData.caller.firstName, callData.caller.lastName);
    console.log("📊 Data-only mode:", dataOnly);
    
    return response;
  } catch (error) {
    console.error("❌ Voice call failed:", error.message);
    throw error;
  }
}

/**
 * Quick video call test to specific device
 */
async function quickVideoTest(deviceToken = null, dataOnly = false) {
  console.log("📹 Sending quick video call...");
  
  const targetToken = deviceToken || QUICK_CONFIG.FCM_DEVICE_TOKEN;
  console.log(`📱 Targeting device: ${targetToken.substring(0, 20)}...`);
  
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

    // Build FCM notification payload using Admin SDK
    const message = {
      token: targetToken,
      data: convertToFCMData(callData),
      ...(dataOnly ? {} : {
        notification: {
          title: "Video Call",
          body: "Sarah is calling you",
        },
      }),
      android: {
        priority: "high",
        ...(dataOnly ? {} : {
          notification: {
            channelId: "voip_calls",
            priority: "high",
            sound: "default",
            color: "#4CAF50",
            icon: "ic_stat_onesignal_default",
            tag: "voip_call",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        }),
        data: convertToFCMData(callData),
      },
      apns: {
        payload: {
          aps: {
            ...(dataOnly ? {} : {
              alert: {
                title: "Video Call",
                body: "Sarah is calling you",
              },
              sound: "notification_sound.wav",
              badge: 1,
            }),
            "content-available": 1,
            "mutable-content": 1,
            category: "voip_call",
          },
          data: convertToFCMData(callData),
        },
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert",
        },
      },
    };

    const response = await admin.messaging().send(message);

    console.log("✅ Video call sent successfully!");
    console.log("📱 Message ID:", response);
    console.log("📹 Channel:", callData.channelName);
    console.log("👤 Caller:", callData.caller.firstName, callData.caller.lastName);
    console.log("📊 Data-only mode:", dataOnly);
    
    return response;
  } catch (error) {
    console.error("❌ Video call failed:", error.message);
    throw error;
  }
}

/**
 * Quick call action test to specific device
 */
async function quickActionTest(action = "accepted", deviceToken = null) {
  console.log(`🔄 Sending quick ${action} action...`);
  
  const targetToken = deviceToken || QUICK_CONFIG.FCM_DEVICE_TOKEN;
  console.log(`📱 Targeting device: ${targetToken.substring(0, 20)}...`);
  
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
        title: "Call Update",
        body: "Call accepted"
      },
      declined: {
        title: "Call Update", 
        body: "Call declined"
      },
      ended: {
        title: "Call Update",
        body: "Call ended"
      }
    };

    // Build FCM notification payload using Admin SDK
    const message = {
      token: targetToken,
      data: convertToFCMData(actionData),
      notification: {
        title: actionMessages[action]?.title || "Call Update",
        body: actionMessages[action]?.body || `Call ${action}`,
      },
      android: {
        priority: "high",
        notification: {
          channelId: "voip_calls",
          priority: "high",
          sound: "default",
          color: "#4CAF50",
          icon: "ic_stat_onesignal_default",
          tag: "voip_call_action",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
        data: convertToFCMData(actionData),
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: actionMessages[action]?.title || "Call Update",
              body: actionMessages[action]?.body || `Call ${action}`,
            },
            sound: "notification_sound.wav",
            badge: 1,
            "content-available": 1,
            "mutable-content": 1,
            category: "voip_call_action",
          },
          data: convertToFCMData(actionData),
        },
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert",
        },
      },
    };

    const response = await admin.messaging().send(message);

    console.log(`✅ ${action} action sent successfully!`);
    console.log("📱 Message ID:", response);
    console.log("🔄 Action:", action);
    
    return response;
  } catch (error) {
    console.error(`❌ ${action} action failed:`, error.message);
    throw error;
  }
}

/**
 * Quick test with specific device token
 */
async function quickTestWithDevice(deviceToken, callType = "voice", dataOnly = false) {
  console.log(`📞 Quick ${callType} call test to device: ${deviceToken.substring(0, 20)}...\n`);
  
  try {
    if (callType === "voice") {
      await quickVoiceTest(deviceToken, dataOnly);
    } else if (callType === "video") {
      await quickVideoTest(deviceToken, dataOnly);
    } else {
      console.log("❌ Invalid call type. Use: voice or video");
      return;
    }
    
    console.log("\n✅ Test completed!");
    console.log("📱 Check your app for the incoming call notification");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

/**
 * Quick all tests to specific device
 */
async function quickAllTests(deviceToken = null) {
  console.log("🚀 Running all quick tests...\n");

  const targetToken = deviceToken || QUICK_CONFIG.FCM_DEVICE_TOKEN;
  console.log(`📱 Targeting device: ${targetToken.substring(0, 20)}...\n`);

  try {
    // Test 1: Voice call
    console.log("1️⃣ Voice Call Test");
    await quickVoiceTest(targetToken);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Video call
    console.log("\n2️⃣ Video Call Test");
    await quickVideoTest(targetToken);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Call actions
    console.log("\n3️⃣ Call Actions Test");
    await quickActionTest("accepted", targetToken);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await quickActionTest("declined", targetToken);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await quickActionTest("ended", targetToken);

    console.log("\n🎉 All quick tests completed successfully!");
    console.log("\n📱 Check your app for:");
    console.log("   - Incoming call notifications");
    console.log("   - Call screen navigation");
    console.log("   - Call action handling");

  } catch (error) {
    console.error("❌ Quick tests failed:", error.message);
  }
}

/**
 * Get device token from command line or use default
 */
function getDeviceTarget() {
  const args = process.argv.slice(2);
  const deviceToken = args[1];
  
  if (deviceToken && deviceToken !== "\"\"") {
    return deviceToken;
  }
  
  return null;
}

/**
 * Show usage
 */
function showUsage() {
  console.log(`
📞 Quick VoIP Test Script (Firebase Admin SDK)
===============================================

Usage:
  node quick-voip-test.js <command> [device_token]

Commands:
  voice [device_token]           Send voice call notification
  video [device_token]           Send video call notification
  action <type> [device_token]   Send call action (accepted/declined/ended)
  all [device_token]             Run all quick tests
  test <device_token> [voice|video]  Quick test with specific device

Targeting Options:
  device_token                   FCM device token (optional, uses default if not provided)

Examples:
  # Send to default device
  node quick-voip-test.js voice
  node quick-voip-test.js video
  node quick-voip-test.js action accepted
  node quick-voip-test.js all

  # Send to specific device
  node quick-voip-test.js voice eddYnyh2RqGEAWI0dqFJd_:APA91bG9oif-NqFTRS7XD5XMB_tUrgsAEHSQB_BVtNrWGFIpKDRGFa_DWHq3xg8AHC3kDLx5IfU3nEvcMz4ISmU0WRu3vn8F3fFaOQpXFTE8mUMAQanWwJE
  node quick-voip-test.js video eddYnyh2RqGEAWI0dqFJd_:APA91bG9oif-NqFTRS7XD5XMB_tUrgsAEHSQB_BVtNrWGFIpKDRGFa_DWHq3xg8AHC3kDLx5IfU3nEvcMz4ISmU0WRu3vn8F3fFaOQpXFTE8mUMAQanWwJE
  node quick-voip-test.js action declined eddYnyh2RqGEAWI0dqFJd_:APA91bG9oif-NqFTRS7XD5XMB_tUrgsAEHSQB_BVtNrWGFIpKDRGFa_DWHq3xg8AHC3kDLx5IfU3nEvcMz4ISmU0WRu3vn8F3fFaOQpXFTE8mUMAQanWwJE
  
  # Data-only messages (for testing FCM handlers)
  node quick-voip-test.js voice "" dataOnly
  node quick-voip-test.js video "" dataOnly

  # Quick test with specific device
  node quick-voip-test.js test eddYnyh2RqGEAWI0dqFJd_:APA91bG9oif-NqFTRS7XD5XMB_tUrgsAEHSQB_BVtNrWGFIpKDRGFa_DWHq3xg8AHC3kDLx5IfU3nEvcMz4ISmU0WRu3vn8F3fFaOQpXFTE8mUMAQanWwJE
  node quick-voip-test.js test eddYnyh2RqGEAWI0dqFJd_:APA91bG9oif-NqFTRS7XD5XMB_tUrgsAEHSQB_BVtNrWGFIpKDRGFa_DWHq3xg8AHC3kDLx5IfU3nEvcMz4ISmU0WRu3vn8F3fFaOQpXFTE8mUMAQanWwJE video
  node quick-voip-test.js test eddYnyh2RqGEAWI0dqFJd_:APA91bG9oif-NqFTRS7XD5XMB_tUrgsAEHSQB_BVtNrWGFIpKDRGFa_DWHq3xg8AHC3kDLx5IfU3nEvcMz4ISmU0WRu3vn8F3fFaOQpXFTE8mUMAQanWwJE voice dataOnly

Setup:
  ✅ Firebase Admin SDK configured with service account
  ✅ Service account file: tawsiletdriver-aa5f238c9e5a.json
  ✅ Project ID: ${QUICK_CONFIG.FIREBASE_PROJECT_ID}

Notes:
  - Make sure your app is running
  - Test in different app states (killed/background/foreground)
  - Check console logs for FCM token registration
  - Default device token is configured in the script
  - FCM tokens can be found in app logs or Firebase console
  - Using Firebase Admin SDK for secure server-side messaging
`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log("📞 Quick VoIP Test Script (Firebase Admin SDK)\n");

  try {
    switch (command) {
      case "voice":
        const voiceDeviceToken = args[1] || null;
        const voiceDataOnly = args[2] === "dataOnly";
        await quickVoiceTest(voiceDeviceToken, voiceDataOnly);
        break;

      case "video":
        const videoDeviceToken = args[1] || null;
        const videoDataOnly = args[2] === "dataOnly";
        await quickVideoTest(videoDeviceToken, videoDataOnly);
        break;

      case "action":
        const action = args[1];
        if (!action || !["accepted", "declined", "ended"].includes(action)) {
          console.log("❌ Invalid action. Use: accepted, declined, or ended");
          return;
        }
        const actionDeviceToken = args[2] || null;
        await quickActionTest(action, actionDeviceToken);
        break;

      case "all":
        const allDeviceToken = args[1] || null;
        await quickAllTests(allDeviceToken);
        break;

      case "test":
        const testDeviceToken = args[1];
        const testCallType = args[2] || "voice";
        const testDataOnly = args[3] === "dataOnly"; // Check for dataOnly flag
        if (!testDeviceToken) {
          console.log("❌ Please provide a device token for testing");
          console.log("Usage: node quick-voip-test.js test <device_token> [voice|video] [dataOnly]");
          return;
        }
        await quickTestWithDevice(testDeviceToken, testCallType, testDataOnly);
        break;

      default:
        showUsage();
        break;
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
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

