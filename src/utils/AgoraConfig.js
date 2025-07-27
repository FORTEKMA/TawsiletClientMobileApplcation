/**
 * Agora Configuration File for Tawsilet VoIP Integration
 * 
 * IMPORTANT: To enable VoIP calling functionality, you need to:
 * 1. Install react-native-agora package: npm install react-native-agora
 * 2. Follow the installation guide: https://docs.agora.io/en/Voice/start_call_audio_react_native
 * 3. Replace 'YOUR_AGORA_APP_ID_HERE' with your actual Agora App ID
 * 4. Set up token generation on your backend server for production
 * 5. Configure proper permissions in AndroidManifest.xml and Info.plist
 */

import { Platform } from 'react-native';

// Replace with your actual Agora App ID from https://console.agora.io/
export const AGORA_APP_ID = '44e3bb6a05dd4fc18a0e34e3e653aff3';

// Your backend server URL for token generation
export const TOKEN_SERVER_URL = 'YOUR_BACKEND_URL';

// Agora Channel Profile
export const CHANNEL_PROFILE = {
  COMMUNICATION: 0, // 1-on-1 calls (recommended for taxi app)
  LIVE_BROADCASTING: 1, // Live streaming
};

// Agora Client Role (for Live Broadcasting)
export const CLIENT_ROLE = {
  BROADCASTER: 1, // Can send and receive streams
  AUDIENCE: 2, // Can only receive streams
};

// Audio Profile for different call scenarios
export const AUDIO_PROFILE = {
  DEFAULT: 0,
  SPEECH_STANDARD: 1, // Recommended for voice calls
  MUSIC_STANDARD: 2,
  MUSIC_STANDARD_STEREO: 3,
  MUSIC_HIGH_QUALITY: 4,
  MUSIC_HIGH_QUALITY_STEREO: 5,
};

// Audio Scenario for different environments
export const AUDIO_SCENARIO = {
  DEFAULT: 0, // Recommended for taxi app
  CHATROOM_ENTERTAINMENT: 1,
  EDUCATION: 2,
  GAME_STREAMING: 3,
  SHOWROOM: 4,
  CHATROOM_GAMING: 5,
};

// Video Profile configurations
export const VIDEO_PROFILE = {
  VIDEO_PROFILE_LANDSCAPE_120P: 0,
  VIDEO_PROFILE_LANDSCAPE_160P: 2,
  VIDEO_PROFILE_LANDSCAPE_240P: 10,
  VIDEO_PROFILE_LANDSCAPE_360P: 20, // Recommended for mobile
  VIDEO_PROFILE_LANDSCAPE_480P: 30,
  VIDEO_PROFILE_LANDSCAPE_720P: 40,
  VIDEO_PROFILE_LANDSCAPE_1080P: 50,
};

// Video Encoder Configuration for optimal mobile performance
export const VIDEO_ENCODER_CONFIG = {
  MOBILE_OPTIMIZED: {
    dimensions: { width: 640, height: 360 },
    frameRate: 15,
    bitrate: 400,
    orientationMode: 0, // Adaptive
  },
  HIGH_QUALITY: {
    dimensions: { width: 1280, height: 720 },
    frameRate: 30,
    bitrate: 1000,
    orientationMode: 0,
  },
  LOW_BANDWIDTH: {
    dimensions: { width: 320, height: 240 },
    frameRate: 10,
    bitrate: 200,
    orientationMode: 0,
  },
};

// Default configuration optimized for taxi app calls
export const DEFAULT_CALL_CONFIG = {
  channelProfile: CHANNEL_PROFILE.COMMUNICATION,
  clientRole: CLIENT_ROLE.BROADCASTER,
  audioProfile: AUDIO_PROFILE.SPEECH_STANDARD,
  audioScenario: AUDIO_SCENARIO.DEFAULT,
  videoProfile: VIDEO_PROFILE.VIDEO_PROFILE_LANDSCAPE_360P,
  videoEncoderConfig: VIDEO_ENCODER_CONFIG.MOBILE_OPTIMIZED,
  enableVideo: false, // Start with audio-only calls
  enableAudio: true,
  enableDualStream: true, // Better network adaptation
  enableAudioVolumeIndication: true,
  audioVolumeIndicationInterval: 1000,
  enableEncryption: false, // Enable in production
};

// Network quality thresholds
export const NETWORK_QUALITY = {
  EXCELLENT: 1,
  GOOD: 2,
  POOR: 3,
  BAD: 4,
  VERY_BAD: 5,
  DOWN: 6,
};

// Call quality indicators
export const CALL_QUALITY_INDICATORS = {
  [NETWORK_QUALITY.EXCELLENT]: { label: 'HD', color: '#4CAF50' },
  [NETWORK_QUALITY.GOOD]: { label: 'Good', color: '#8BC34A' },
  [NETWORK_QUALITY.POOR]: { label: 'Fair', color: '#FF9800' },
  [NETWORK_QUALITY.BAD]: { label: 'Poor', color: '#FF5722' },
  [NETWORK_QUALITY.VERY_BAD]: { label: 'Bad', color: '#F44336' },
  [NETWORK_QUALITY.DOWN]: { label: 'No Signal', color: '#9E9E9E' },
};

/**
 * Generate a unique channel name for a call
 * @param {string} callId - Unique call identifier
 * @returns {string} Channel name
 */
export const generateChannelName = (callId) => {
  return `tawsilet_call_${callId}`;
};

/**
 * Validate Agora App ID configuration
 * @returns {boolean} True if App ID is configured
 */
export const isAgoraConfigured = () => {
  return AGORA_APP_ID && AGORA_APP_ID !== 'YOUR_AGORA_APP_ID_HERE' && AGORA_APP_ID.length > 0;
};

/**
 * Get Agora token from your backend server
 * In production, this should make an API call to your backend
 * which generates the token using Agora's server SDK
 * 
 * @param {string} channelName - Channel name
 * @param {number} uid - User ID (0 for auto-assignment)
 * @param {string} role - 'publisher' or 'subscriber'
 * @param {number} privilegeExpiredTs - Token expiration timestamp (optional)
 * @returns {Promise<string>} Agora token
 */
export const getAgoraToken = async (channelName, uid = 0, role = 'publisher', privilegeExpiredTs = 0) => {
  try {
    if (!TOKEN_SERVER_URL || TOKEN_SERVER_URL === 'YOUR_BACKEND_URL') {
      console.warn('Token server URL not configured. Using null token for development.');
      return null;
    }

    const response = await fetch(`${TOKEN_SERVER_URL}/generate-agora-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        channelName,
        uid,
        role,
        privilegeExpiredTs: privilegeExpiredTs || Math.floor(Date.now() / 1000) + 3600, // 1 hour default
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.token) {
      return data.token;
    } else {
      throw new Error(data.message || 'Failed to generate token');
    }
  } catch (error) {
    console.error('Error getting Agora token:', error);
    
    // For development, return null (no token)
    // In production, this should throw an error or implement retry logic
    if (__DEV__) {
      console.warn('Using null token for development. This may not work in production.');
      return null;
    }
    
    throw error;
  }
};

/**
 * Get optimal video encoder configuration based on network quality
 * @param {number} networkQuality - Network quality from 1 (excellent) to 6 (down)
 * @returns {object} Video encoder configuration
 */
export const getOptimalVideoConfig = (networkQuality) => {
  switch (networkQuality) {
    case NETWORK_QUALITY.EXCELLENT:
    case NETWORK_QUALITY.GOOD:
      return VIDEO_ENCODER_CONFIG.MOBILE_OPTIMIZED;
    case NETWORK_QUALITY.POOR:
    case NETWORK_QUALITY.BAD:
      return VIDEO_ENCODER_CONFIG.LOW_BANDWIDTH;
    default:
      return VIDEO_ENCODER_CONFIG.LOW_BANDWIDTH;
  }
};

/**
 * Get platform-specific audio configuration
 * @returns {object} Audio configuration optimized for current platform
 */
export const getPlatformAudioConfig = () => {
  const baseConfig = {
    audioProfile: AUDIO_PROFILE.SPEECH_STANDARD,
    audioScenario: AUDIO_SCENARIO.DEFAULT,
  };

  if (Platform.OS === 'ios') {
    return {
      ...baseConfig,
      // iOS-specific optimizations
      enableAudioVolumeIndication: true,
      audioVolumeIndicationInterval: 500,
    };
  } else if (Platform.OS === 'android') {
    return {
      ...baseConfig,
      // Android-specific optimizations
      enableAudioVolumeIndication: true,
      audioVolumeIndicationInterval: 1000,
    };
  }

  return baseConfig;
};

/**
 * Validate call configuration
 * @param {object} config - Call configuration to validate
 * @returns {boolean} True if configuration is valid
 */
export const validateCallConfig = (config) => {
  const requiredFields = ['channelProfile', 'clientRole', 'audioProfile'];
  
  for (const field of requiredFields) {
    if (config[field] === undefined || config[field] === null) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }
  
  return true;
};

/**
 * Get error message for Agora error codes
 * @param {number} errorCode - Agora error code
 * @returns {string} Human-readable error message
 */
export const getAgoraErrorMessage = (errorCode) => {
  const errorMessages = {
    0: 'No error',
    1: 'General error',
    2: 'Invalid argument',
    3: 'SDK not ready',
    4: 'SDK not supported',
    5: 'Permission denied',
    6: 'Invalid app ID',
    7: 'Invalid channel name',
    8: 'Invalid token',
    17: 'Join channel rejected',
    18: 'Leave channel rejected',
    19: 'Already in use',
    20: 'Aborted',
    101: 'Invalid app ID',
    102: 'Invalid channel name',
    103: 'No server response',
    109: 'Token expired',
    110: 'Invalid token',
    111: 'Connection interrupted',
    112: 'Connection lost',
    113: 'Not in channel',
    114: 'Size too large',
    115: 'Bitrate limited',
    116: 'Too many users',
  };
  
  return errorMessages[errorCode] || `Unknown error (${errorCode})`;
};

/**
 * Installation and Setup Instructions
 */
export const INSTALLATION_INSTRUCTIONS = {
  // Package installation
  INSTALL_COMMAND: 'npm install react-native-agora',
  
  // iOS setup
  IOS_SETUP: {
    PODFILE_ENTRY: "pod 'react-native-agora', path: '../node_modules/react-native-agora'",
    POD_INSTALL: 'cd ios && pod install',
    INFO_PLIST_PERMISSIONS: [
      '<key>NSMicrophoneUsageDescription</key>',
      '<string>This app needs access to microphone for voice calls</string>',
      '<key>NSCameraUsageDescription</key>',
      '<string>This app needs access to camera for video calls</string>',
    ],
  },
  
  // Android setup
  ANDROID_SETUP: {
    MANIFEST_PERMISSIONS: [
      '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
      '<uses-permission android:name="android.permission.CAMERA" />',
      '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
      '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
      '<uses-permission android:name="android.permission.BLUETOOTH" />',
      '<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />',
      '<uses-permission android:name="android.permission.WAKE_LOCK" />',
    ],
    PROGUARD_RULES: [
      '-keep class io.agora.**{*;}',
    ],
  },
  
  // Configuration steps
  CONFIGURATION_STEPS: [
    '1. Get your Agora App ID from https://console.agora.io/',
    '2. Replace AGORA_APP_ID in this file with your actual App ID',
    '3. Set up token generation on your backend server',
    '4. Update TOKEN_SERVER_URL with your backend URL',
    '5. Configure permissions in AndroidManifest.xml and Info.plist',
    '6. Test the integration with a simple voice call',
  ],
};

// Export default configuration object
export default {
  AGORA_APP_ID,
  TOKEN_SERVER_URL,
  CHANNEL_PROFILE,
  CLIENT_ROLE,
  AUDIO_PROFILE,
  AUDIO_SCENARIO,
  VIDEO_PROFILE,
  VIDEO_ENCODER_CONFIG,
  DEFAULT_CALL_CONFIG,
  NETWORK_QUALITY,
  CALL_QUALITY_INDICATORS,
  generateChannelName,
  isAgoraConfigured,
  getAgoraToken,
  getOptimalVideoConfig,
  getPlatformAudioConfig,
  validateCallConfig,
  getAgoraErrorMessage,
  INSTALLATION_INSTRUCTIONS,
};

