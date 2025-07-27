/**
 * Agora Configuration File
 * 
 * IMPORTANT: To enable VoIP calling functionality, you need to:
 * 1. Install react-native-agora package: npm install react-native-agora
 * 2. Follow the installation guide: https://docs.agora.io/en/Voice/start_call_audio_react_native
 * 3. Replace 'YOUR_AGORA_APP_ID_HERE' with your actual Agora App ID
 * 4. Set up token generation on your backend server for production
 */

// Replace with your actual Agora App ID
export const AGORA_APP_ID = 'YOUR_AGORA_APP_ID_HERE';

// Agora Channel Profile
export const CHANNEL_PROFILE = {
  COMMUNICATION: 0, // 1-on-1 calls
  LIVE_BROADCASTING: 1, // Live streaming
};

// Agora Client Role (for Live Broadcasting)
export const CLIENT_ROLE = {
  BROADCASTER: 1, // Can send and receive streams
  AUDIENCE: 2, // Can only receive streams
};

// Audio Profile
export const AUDIO_PROFILE = {
  DEFAULT: 0,
  SPEECH_STANDARD: 1,
  MUSIC_STANDARD: 2,
  MUSIC_STANDARD_STEREO: 3,
  MUSIC_HIGH_QUALITY: 4,
  MUSIC_HIGH_QUALITY_STEREO: 5,
};

// Audio Scenario
export const AUDIO_SCENARIO = {
  DEFAULT: 0,
  CHATROOM_ENTERTAINMENT: 1,
  EDUCATION: 2,
  GAME_STREAMING: 3,
  SHOWROOM: 4,
  CHATROOM_GAMING: 5,
};

// Video Profile
export const VIDEO_PROFILE = {
  VIDEO_PROFILE_LANDSCAPE_120P: 0,
  VIDEO_PROFILE_LANDSCAPE_160P: 2,
  VIDEO_PROFILE_LANDSCAPE_240P: 10,
  VIDEO_PROFILE_LANDSCAPE_360P: 20,
  VIDEO_PROFILE_LANDSCAPE_480P: 30,
  VIDEO_PROFILE_LANDSCAPE_720P: 40,
  VIDEO_PROFILE_LANDSCAPE_1080P: 50,
};

// Default configuration for taxi app calls
export const DEFAULT_CALL_CONFIG = {
  channelProfile: CHANNEL_PROFILE.COMMUNICATION,
  clientRole: CLIENT_ROLE.BROADCASTER,
  audioProfile: AUDIO_PROFILE.SPEECH_STANDARD,
  audioScenario: AUDIO_SCENARIO.DEFAULT,
  videoProfile: VIDEO_PROFILE.VIDEO_PROFILE_LANDSCAPE_360P,
  enableVideo: false, // Start with audio-only calls
  enableAudio: true,
};

/**
 * Generate a channel name for a call
 * @param {string} callId - Unique call identifier
 * @returns {string} Channel name
 */
export const generateChannelName = (callId) => {
  return `tawsilet_call_${callId}`;
};

/**
 * Validate Agora App ID
 * @returns {boolean} True if App ID is configured
 */
export const isAgoraConfigured = () => {
  return AGORA_APP_ID && AGORA_APP_ID !== 'YOUR_AGORA_APP_ID_HERE';
};

/**
 * Get Agora token from your backend server
 * In production, this should make an API call to your backend
 * which generates the token using Agora's server SDK
 * 
 * @param {string} channelName - Channel name
 * @param {number} uid - User ID (0 for auto-assignment)
 * @param {string} role - 'publisher' or 'subscriber'
 * @returns {Promise<string>} Agora token
 */
export const getAgoraToken = async (channelName, uid = 0, role = 'publisher') => {
  try {
    // TODO: Replace with your backend API endpoint
    const response = await fetch('YOUR_BACKEND_URL/generate-agora-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelName,
        uid,
        role,
      }),
    });
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error getting Agora token:', error);
    // For development, return null (no token)
    // In production, this should throw an error
    return null;
  }
};

/**
 * Installation Instructions for Agora SDK
 * 
 * 1. Install the package:
 *    npm install react-native-agora
 * 
 * 2. For iOS, add to ios/Podfile:
 *    pod 'react-native-agora', path: '../node_modules/react-native-agora'
 *    Then run: cd ios && pod install
 * 
 * 3. For Android, the package should auto-link with React Native 0.60+
 *    If manual linking is needed, follow the official guide.
 * 
 * 4. Add permissions to your app:
 *    
 *    iOS (ios/YourApp/Info.plist):
 *    <key>NSMicrophoneUsageDescription</key>
 *    <string>This app needs access to microphone for voice calls</string>
 *    <key>NSCameraUsageDescription</key>
 *    <string>This app needs access to camera for video calls</string>
 * 
 *    Android (android/app/src/main/AndroidManifest.xml):
 *    <uses-permission android:name="android.permission.RECORD_AUDIO" />
 *    <uses-permission android:name="android.permission.CAMERA" />
 *    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
 *    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
 *    <uses-permission android:name="android.permission.BLUETOOTH" />
 *    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
 * 
 * 5. Get your Agora App ID from https://console.agora.io/
 * 
 * 6. Replace 'YOUR_AGORA_APP_ID_HERE' in this file with your actual App ID
 * 
 * 7. Set up token generation on your backend server for production use
 */

export default {
  AGORA_APP_ID,
  CHANNEL_PROFILE,
  CLIENT_ROLE,
  AUDIO_PROFILE,
  AUDIO_SCENARIO,
  VIDEO_PROFILE,
  DEFAULT_CALL_CONFIG,
  generateChannelName,
  isAgoraConfigured,
  getAgoraToken,
};

