/**
 * Agora Video SDK v4.x Configuration File for Tawsilet VoIP Integration
 * 
 * IMPORTANT: To enable VoIP calling functionality, you need to:
 * 1. Install react-native-agora package: npm install react-native-agora
 * 2. Follow the installation guide: https://docs.agora.io/en/Voice/start_call_audio_react_native
 * 3. Replace 'YOUR_AGORA_APP_ID_HERE' with your actual Agora App ID
 * 4. Set up token generation on your backend server for production
 * 5. Configure proper permissions in AndroidManifest.xml and Info.plist
 * 
 * API Reference: https://api-ref.agora.io/en/video-sdk/react-native/4.x/API/rtc_api_overview.html
 */

import { Platform } from 'react-native';
import api from './api';  

// Import Agora SDK with fallback
  import { createAgoraRtcEngine } from 'react-native-agora';

 

// Replace with your actual Agora App ID from https://console.agora.io/
export const AGORA_APP_ID = '44e3bb6a05dd4fc18a0e34e3e653aff3';

// Agora Channel Profile (v4.x)
export const CHANNEL_PROFILE = {
  COMMUNICATION: 0, // 1-on-1 calls (recommended for taxi app)
  LIVE_BROADCASTING: 1, // Live streaming
  GAME: 2, // Gaming scenarios
};

// Agora Client Role (for Live Broadcasting)
export const CLIENT_ROLE = {
  BROADCASTER: 1, // Can send and receive streams
  AUDIENCE: 2, // Can only receive streams
};

// Audio Profile for different call scenarios (v4.x)
export const AUDIO_PROFILE = {
  DEFAULT: 0,
  SPEECH_STANDARD: 1, // Recommended for voice calls
  MUSIC_STANDARD: 2,
  MUSIC_STANDARD_STEREO: 3,
  MUSIC_HIGH_QUALITY: 4,
  MUSIC_HIGH_QUALITY_STEREO: 5,
  SPEECH_STANDARD_EDUCATION: 6, // Education scenarios
};

// Audio Scenario for different environments (v4.x)
export const AUDIO_SCENARIO = {
  DEFAULT: 0, // Recommended for taxi app
  CHATROOM_ENTERTAINMENT: 1,
  EDUCATION: 2,
  GAME_STREAMING: 3,
  SHOWROOM: 4,
  CHATROOM_GAMING: 5,
  MEETING: 8, // Meeting scenarios
};

// Video Profile configurations (v4.x)
export const VIDEO_PROFILE = {
  VIDEO_PROFILE_LANDSCAPE_120P: 0,
  VIDEO_PROFILE_LANDSCAPE_160P: 2,
  VIDEO_PROFILE_LANDSCAPE_240P: 10,
  VIDEO_PROFILE_LANDSCAPE_360P: 20, // Recommended for mobile
  VIDEO_PROFILE_LANDSCAPE_480P: 30,
  VIDEO_PROFILE_LANDSCAPE_720P: 40,
  VIDEO_PROFILE_LANDSCAPE_1080P: 50,
  VIDEO_PROFILE_LANDSCAPE_1440P: 52,
  VIDEO_PROFILE_LANDSCAPE_4K: 54,
};

// Video Encoder Configuration for optimal mobile performance (v4.x)
export const VIDEO_ENCODER_CONFIG = {
  MOBILE_OPTIMIZED: {
    dimensions: { width: 640, height: 360 },
    frameRate: 15,
    bitrate: 400,
    orientationMode: 0, // Adaptive
    degradationPreference: 0, // Maintain quality
  },
  HIGH_QUALITY: {
    dimensions: { width: 1280, height: 720 },
    frameRate: 30,
    bitrate: 1000,
    orientationMode: 0,
    degradationPreference: 0,
  },
  LOW_BANDWIDTH: {
    dimensions: { width: 320, height: 240 },
    frameRate: 10,
    bitrate: 200,
    orientationMode: 0,
    degradationPreference: 1, // Maintain framerate
  },
};

// Network quality thresholds (v4.x)
export const NETWORK_QUALITY = {
  UNKNOWN: 0,
  EXCELLENT: 1,
  GOOD: 2,
  POOR: 3,
  BAD: 4,
  VERY_BAD: 5,
  DOWN: 6,
};

// Connection state (v4.x)
export const CONNECTION_STATE = {
  DISCONNECTED: 1,
  CONNECTING: 2,
  CONNECTED: 3,
  RECONNECTING: 4,
  FAILED: 5,
};

// Default configuration optimized for taxi app calls (v4.x)
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
  enableBuiltInEncryption: false,
  enableMediaRecorder: false,
  enableAudioDevice: true,
  enableVideoDevice: false,
  enableLocalAudio: true,
  enableLocalVideo: false,
  publishCameraTrack: false,
  publishMicrophoneTrack: true,
  autoSubscribeAudio: true,
  autoSubscribeVideo: false,
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
 * Create and initialize Agora RTC Engine (v4.x)
 * @param {object} config - Engine configuration
 * @returns {Promise<object>} Initialized RTC Engine instance
 */
export const createAgoraEngine = async (config = {}) => {
  try {
    // Check if Agora SDK is available
    if (!isAgoraSDKAvailable()) {
      throw new Error('Agora SDK is not available. Please check your installation.');
    }

    // Check if App ID is configured
    if (!isAgoraConfigured()) {
      throw new Error('Agora App ID is not configured. Please set AGORA_APP_ID in AgoraConfig.js');
    }

    console.log('Creating Agora RTC Engine with App ID:', AGORA_APP_ID);
    
    const engine = createAgoraRtcEngine();
    
    // Initialize with default configuration
    const initConfig = {
      appId: AGORA_APP_ID,
      ...config,
    };
    
    console.log('Initializing Agora engine with config:', initConfig);
    engine.initialize(initConfig);
    
    console.log('Agora RTC Engine initialized successfully');
    return engine;
  } catch (error) {
    console.error('Failed to create Agora engine:', error);
    throw error;
  }
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
 * Check if Agora SDK is properly imported and available
 * @returns {boolean} True if SDK is available
 */
export const isAgoraSDKAvailable = () => {
  return createAgoraRtcEngine !== null && typeof createAgoraRtcEngine === 'function';
};

/**
 * Wait for Agora SDK to be loaded
 * @returns {Promise<boolean>} True if SDK is available
 */
export const waitForAgoraSDK = async () => {
  if (isAgoraSDKAvailable()) {
    return true;
  }
  
  // Wait for SDK to load
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (isAgoraSDKAvailable()) {
      return true;
    }
    attempts++;
  }
  
  return false;
};

/**
 * Get Agora token from your backend server (v4.x)
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
    // For development mode, return null (no token required)
   

    // For production, make API call to your backend
    const response = await api.post(`/generate-agora-token`, {
      channelName,
      uid,
      role,
      privilegeExpiredTs: privilegeExpiredTs || Math.floor(Date.now() / 1000) + 3600, // 1 hour default
    });
    
    if (response?.data?.success && response?.data?.token) {
      return response.data.token;
    } else {
      throw new Error(response?.data?.message || 'Failed to generate token');
    }
  } catch (error) {
    console.error('Error getting Agora token:', error);
    
    // For development, return null (no token required)
    
    
    throw error;
  }
};

/**
 * Join channel with media options (v4.x)
 * @param {object} engine - RTC Engine instance
 * @param {string} token - Agora token
 * @param {string} channelId - Channel ID
 * @param {number} uid - User ID
 * @param {object} options - Media options
 * @returns {Promise<number>} Result code
 */
export const joinChannel = async (engine, token, channelId, uid, options = {}) => {
  const mediaOptions = {
    clientRoleType: options.clientRole || CLIENT_ROLE.BROADCASTER,
    publishCameraTrack: options.publishCameraTrack || false,
    publishMicrophoneTrack: options.publishMicrophoneTrack || true,
    autoSubscribeAudio: options.autoSubscribeAudio !== false,
    autoSubscribeVideo: options.autoSubscribeVideo || false,
    ...options,
  };

  return engine.joinChannel(token, channelId, uid, mediaOptions);
};

/**
 * Leave channel (v4.x)
 * @param {object} engine - RTC Engine instance
 * @param {object} options - Leave options
 * @returns {Promise<number>} Result code
 */
export const leaveChannel = async (engine, options = {}) => {
  const leaveOptions = {
    stopAudioMixing: true,
    stopAllEffect: true,
    stopMicrophoneRecording: true,
    ...options,
  };

  return engine.leaveChannel(leaveOptions);
  
};

/**
 * Get optimal video encoder configuration based on network quality (v4.x)
 * @param {number} networkQuality - Network quality from 0 (unknown) to 6 (down)
 * @returns {object} Video encoder configuration
 */
export const getOptimalVideoConfig = (networkQuality) => {
  switch (networkQuality) {
    case NETWORK_QUALITY.EXCELLENT:
    case NETWORK_QUALITY.GOOD:
      return VIDEO_ENCODER_CONFIG.MOBILE_OPTIMIZED;
    case NETWORK_QUALITY.POOR:
    case NETWORK_QUALITY.BAD:
    case NETWORK_QUALITY.VERY_BAD:
      return VIDEO_ENCODER_CONFIG.LOW_BANDWIDTH;
    default:
      return VIDEO_ENCODER_CONFIG.LOW_BANDWIDTH;
  }
};

/**
 * Get platform-specific audio configuration (v4.x)
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
      enableBuiltInEncryption: false,
    };
  } else if (Platform.OS === 'android') {
    return {
      ...baseConfig,
      // Android-specific optimizations
      enableAudioVolumeIndication: true,
      audioVolumeIndicationInterval: 1000,
      enableBuiltInEncryption: false,
    };
  }

  return baseConfig;
};

/**
 * Validate call configuration (v4.x)
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
 * Get error message for Agora error codes (v4.x)
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
    1001: 'Invalid parameter',
    1002: 'SDK not initialized',
    1003: 'SDK not supported',
    1004: 'Invalid state',
    1005: 'Invalid argument',
    1006: 'Not ready',
    1007: 'Not supported',
    1008: 'Invalid operation',
    1009: 'Resource not found',
    1010: 'Invalid media type',
    1011: 'Invalid media source',
    1012: 'Invalid media sink',
    1013: 'Invalid media format',
    1014: 'Invalid media codec',
    1015: 'Invalid media device',
    1016: 'Invalid media stream',
    1017: 'Invalid media track',
    1018: 'Invalid media connection',
    1019: 'Invalid media session',
    1020: 'Invalid media channel',
  };
  
  return errorMessages[errorCode] || `Unknown error (${errorCode})`;
};

/**
 * Setup event listeners for RTC Engine (v4.x)
 * @param {object} engine - RTC Engine instance
 * @param {object} handlers - Event handlers
 */
export const setupEventListeners = (engine, handlers = {}) => {
  const defaultHandlers = {
    onJoinChannelSuccess: (connection, elapsed) => {
      console.log('Successfully joined channel', connection, elapsed);
    },
    onLeaveChannel: (connection, stats) => {
      console.log('Left channel', connection, stats);
    },
    onUserJoined: (connection, remoteUid, elapsed) => {
      console.log('Remote user joined', connection, remoteUid, elapsed);
    },
    onUserOffline: (connection, remoteUid, reason) => {
      console.log('Remote user offline', connection, remoteUid, reason);
    },
    onNetworkQuality: (connection, remoteUid, txQuality, rxQuality) => {
      console.log('Network quality', connection, remoteUid, txQuality, rxQuality);
    },
    onConnectionStateChanged: (connection, state, reason) => {
      console.log('Connection state changed', connection, state, reason);
    },
    onAudioVolumeIndication: (connection, speakers, speakerNumber, totalVolume) => {
      console.log('Audio volume indication', connection, speakers, speakerNumber, totalVolume);
    },
    ...handlers,
  };

  // Add event listeners
  Object.entries(defaultHandlers).forEach(([event, handler]) => {
    engine.addListener(event, handler);
  });

  return () => {
    // Return cleanup function
    Object.keys(defaultHandlers).forEach(event => {
      engine.removeListener(event);
    });
  };
};

/**
 * Installation and Setup Instructions (v4.x)
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
      '<key>NSLocalNetworkUsageDescription</key>',
      '<string>This app needs access to local network for voice calls</string>',
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
      '<uses-permission android:name="android.permission.INTERNET" />',
    ],
    PROGUARD_RULES: [
      '-keep class io.agora.**{*;}',
      '-keep class io.agora.rtc.**{*;}',
    ],
  },
  
  // Configuration steps
  CONFIGURATION_STEPS: [
    '1. Get your Agora App ID from https://console.agora.io/',
    '2. Replace AGORA_APP_ID in this file with your actual App ID',
    '3. Set up token generation on your backend server',
    '4. Update to use createAgoraEngine() instead of deprecated methods',
    '5. Configure permissions in AndroidManifest.xml and Info.plist',
    '6. Test the integration with a simple voice call',
    '7. Use setupEventListeners() for proper event handling',
  ],
};

// Export default configuration object
export default {
  AGORA_APP_ID,
  CHANNEL_PROFILE,
  CLIENT_ROLE,
  AUDIO_PROFILE,
  AUDIO_SCENARIO,
  VIDEO_PROFILE,
  VIDEO_ENCODER_CONFIG,
  DEFAULT_CALL_CONFIG,
  NETWORK_QUALITY,
  CONNECTION_STATE,
  CALL_QUALITY_INDICATORS,
  createAgoraEngine,
  generateChannelName,
  isAgoraConfigured,
  isAgoraSDKAvailable,
  waitForAgoraSDK,
  getAgoraToken,
  joinChannel,
  leaveChannel,
  getOptimalVideoConfig,
  getPlatformAudioConfig,
  validateCallConfig,
  getAgoraErrorMessage,
  setupEventListeners,
  INSTALLATION_INSTRUCTIONS,
};

