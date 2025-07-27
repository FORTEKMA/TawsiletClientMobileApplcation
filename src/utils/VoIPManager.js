import { ref, push, onValue, off, remove, get, update } from 'firebase/database';
import db from './firebase';
import AgoraConfig from './AgoraConfig';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

// NOTE: Uncomment when react-native-agora is installed
// import { RtcEngine, RtcLocalView, RtcRemoteView, VideoRenderMode, ChannelProfile, ClientRole } from 'react-native-agora';

class VoIPManager {
  constructor() {
    this.currentCallId = null;
    this.callListeners = new Map();
    this.onIncomingCall = null;
    this.onCallStatusChange = null;
    this.agoraEngine = null;
    this.isInitialized = false;
    this.currentChannelName = null;
    this.localUid = 0;
    this.remoteUsers = new Map();
    
    // Call state management
    this.callState = {
      isConnected: false,
      isMuted: false,
      isSpeakerOn: false,
      isVideoEnabled: false,
      networkQuality: 'unknown',
      callDuration: 0,
    };
  }

  // Initialize VoIP manager with user data
  async initialize(userId, userType = 'user') {
    try {
      this.userId = userId;
      this.userType = userType;
      
      // Request permissions first
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.warn('VoIP permissions not granted');
        return false;
      }
      
      // Initialize Agora Engine
      const agoraInitialized = await this.initializeAgoraEngine();
      if (!agoraInitialized) {
        console.warn('Failed to initialize Agora Engine');
        return false;
      }
      
      // Start listening for incoming calls
      this.listenForIncomingCalls();
      
      this.isInitialized = true;
      console.log('VoIPManager initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize VoIPManager:', error);
      return false;
    }
  }

  // Request necessary permissions for VoIP calls
  async requestPermissions() {
    try {
      if (Platform.OS === 'android') {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.MODIFY_AUDIO_SETTINGS,
        ];
        
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        const allPermissionsGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );
        
        if (!allPermissionsGranted) {
          Alert.alert(
            'Permissions Required',
            'Please grant microphone and camera permissions for voice and video calls.',
            [{ text: 'OK' }]
          );
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  // Initialize Agora Engine with comprehensive configuration
  async initializeAgoraEngine() {
    try {
      if (!AgoraConfig.isAgoraConfigured()) {
        console.warn('Agora App ID not configured. Please update AgoraConfig.js');
        return false;
      }

      // NOTE: Uncomment when react-native-agora is installed
      /*
      // Create Agora Engine instance
      this.agoraEngine = await RtcEngine.create(AgoraConfig.AGORA_APP_ID);
      
      // Set up comprehensive event listeners
      this.setupAgoraEventListeners();
      
      // Configure engine for optimal performance
      await this.configureAgoraEngine();
      */
      
      console.log('Agora Engine initialized (placeholder)');
      return true;
    } catch (error) {
      console.error('Failed to initialize Agora Engine:', error);
      return false;
    }
  }

  // Setup comprehensive Agora event listeners
  setupAgoraEventListeners() {
    if (!this.agoraEngine) return;

    // NOTE: Uncomment when react-native-agora is installed
    /*
    // Connection events
    this.agoraEngine.addListener('Warning', (warn) => {
      console.log('Agora Warning:', warn);
    });
    
    this.agoraEngine.addListener('Error', (err) => {
      console.error('Agora Error:', err);
      this.handleCallError(err);
    });
    
    this.agoraEngine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
      console.log('Joined channel successfully:', channel, uid, elapsed);
      this.localUid = uid;
      this.currentChannelName = channel;
      this.callState.isConnected = true;
      this.updateCallStatus('connected');
    });
    
    this.agoraEngine.addListener('LeaveChannel', (stats) => {
      console.log('Left channel:', stats);
      this.callState.isConnected = false;
      this.currentChannelName = null;
      this.remoteUsers.clear();
    });
    
    // User events
    this.agoraEngine.addListener('UserJoined', (uid, elapsed) => {
      console.log('Remote user joined:', uid, elapsed);
      this.remoteUsers.set(uid, { uid, hasVideo: false, hasAudio: true });
      this.notifyRemoteUserJoined(uid);
    });
    
    this.agoraEngine.addListener('UserOffline', (uid, reason) => {
      console.log('Remote user left:', uid, reason);
      this.remoteUsers.delete(uid);
      this.notifyRemoteUserLeft(uid, reason);
      
      // Handle call end if user left voluntarily
      if (reason === 0) {
        this.handleRemoteCallEnd();
      }
    });
    
    // Audio events
    this.agoraEngine.addListener('RemoteAudioStateChanged', (uid, state, reason, elapsed) => {
      console.log('Remote audio state changed:', uid, state, reason, elapsed);
      const user = this.remoteUsers.get(uid);
      if (user) {
        user.hasAudio = state === 2; // 2 means audio is enabled
        this.remoteUsers.set(uid, user);
      }
    });
    
    // Video events
    this.agoraEngine.addListener('RemoteVideoStateChanged', (uid, state, reason, elapsed) => {
      console.log('Remote video state changed:', uid, state, reason, elapsed);
      const user = this.remoteUsers.get(uid);
      if (user) {
        user.hasVideo = state === 2; // 2 means video is enabled
        this.remoteUsers.set(uid, user);
      }
      this.notifyRemoteVideoStateChanged(uid, state === 2);
    });
    
    // Network quality events
    this.agoraEngine.addListener('NetworkQuality', (uid, txQuality, rxQuality) => {
      const quality = uid === this.localUid ? txQuality : rxQuality;
      const qualityMap = {
        1: 'excellent',
        2: 'good',
        3: 'poor',
        4: 'bad',
        5: 'very_bad',
        6: 'down'
      };
      
      if (uid === this.localUid) {
        this.callState.networkQuality = qualityMap[quality] || 'unknown';
        this.notifyNetworkQualityChanged(this.callState.networkQuality);
      }
    });
    
    // Statistics events
    this.agoraEngine.addListener('RtcStats', (stats) => {
      // Update call statistics
      this.callState.callDuration = stats.totalDuration;
      this.notifyCallStatsUpdated(stats);
    });
    
    // Audio volume indication
    this.agoraEngine.addListener('AudioVolumeIndication', (speakers, totalVolume) => {
      // Handle audio volume changes for UI feedback
      this.notifyAudioVolumeChanged(speakers, totalVolume);
    });
    */
  }

  // Configure Agora Engine for optimal call quality
  async configureAgoraEngine() {
    if (!this.agoraEngine) return;

    try {
      // NOTE: Uncomment when react-native-agora is installed
      /*
      // Set channel profile for 1-on-1 communication
      await this.agoraEngine.setChannelProfile(ChannelProfile.Communication);
      
      // Set client role as broadcaster (can send and receive)
      await this.agoraEngine.setClientRole(ClientRole.Broadcaster);
      
      // Enable audio
      await this.agoraEngine.enableAudio();
      
      // Configure audio for voice calls
      await this.agoraEngine.setAudioProfile(
        AgoraConfig.AUDIO_PROFILE.SPEECH_STANDARD,
        AgoraConfig.AUDIO_SCENARIO.DEFAULT
      );
      
      // Enable audio volume indication
      await this.agoraEngine.enableAudioVolumeIndication(1000, 3, false);
      
      // Configure video (disabled by default)
      if (AgoraConfig.DEFAULT_CALL_CONFIG.enableVideo) {
        await this.agoraEngine.enableVideo();
        await this.agoraEngine.setVideoEncoderConfiguration({
          dimensions: { width: 640, height: 360 },
          frameRate: 15,
          bitrate: 400,
          orientationMode: 0,
        });
      }
      
      // Enable dual stream mode for better network adaptation
      await this.agoraEngine.enableDualStreamMode(true);
      
      // Configure encryption (if needed)
      // await this.agoraEngine.enableEncryption(true, encryptionConfig);
      */
      
      console.log('Agora Engine configured (placeholder)');
    } catch (error) {
      console.error('Failed to configure Agora Engine:', error);
    }
  }

  // Join Agora channel with enhanced error handling
  async joinAgoraChannel(channelName, uid = 0) {
    try {
      if (!this.agoraEngine) {
        throw new Error('Agora Engine not initialized');
      }

      // Get token from backend (in production)
      const token = await AgoraConfig.getAgoraToken(channelName, uid);
      
      // NOTE: Uncomment when react-native-agora is installed
      /*
      // Join channel
      await this.agoraEngine.joinChannel(token, channelName, null, uid);
      */
      
      console.log(`Joined Agora channel: ${channelName} (placeholder)`);
      this.currentChannelName = channelName;
      return true;
    } catch (error) {
      console.error('Failed to join Agora channel:', error);
      this.handleCallError(error);
      return false;
    }
  }

  // Leave Agora channel with cleanup
  async leaveAgoraChannel() {
    try {
      if (this.agoraEngine && this.currentChannelName) {
        // NOTE: Uncomment when react-native-agora is installed
        /*
        await this.agoraEngine.leaveChannel();
        */
        
        console.log('Left Agora channel (placeholder)');
        this.currentChannelName = null;
        this.callState.isConnected = false;
        this.remoteUsers.clear();
      }
      return true;
    } catch (error) {
      console.error('Failed to leave Agora channel:', error);
      return false;
    }
  }

  // Enhanced audio control
  async muteLocalAudio(muted) {
    try {
      if (this.agoraEngine) {
        // NOTE: Uncomment when react-native-agora is installed
        /*
        await this.agoraEngine.muteLocalAudioStream(muted);
        */
        
        this.callState.isMuted = muted;
        console.log(`Local audio ${muted ? 'muted' : 'unmuted'} (placeholder)`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling audio mute:', error);
      return false;
    }
  }

  // Enhanced speaker control
  async enableSpeaker(enabled) {
    try {
      if (this.agoraEngine) {
        // NOTE: Uncomment when react-native-agora is installed
        /*
        await this.agoraEngine.setEnableSpeakerphone(enabled);
        */
        
        this.callState.isSpeakerOn = enabled;
        console.log(`Speaker ${enabled ? 'enabled' : 'disabled'} (placeholder)`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling speaker:', error);
      return false;
    }
  }

  // Enhanced video control
  async enableLocalVideo(enabled) {
    try {
      if (this.agoraEngine) {
        // NOTE: Uncomment when react-native-agora is installed
        /*
        if (enabled) {
          await this.agoraEngine.enableLocalVideo(true);
          await this.agoraEngine.startPreview();
        } else {
          await this.agoraEngine.enableLocalVideo(false);
          await this.agoraEngine.stopPreview();
        }
        */
        
        this.callState.isVideoEnabled = enabled;
        console.log(`Local video ${enabled ? 'enabled' : 'disabled'} (placeholder)`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling video:', error);
      return false;
    }
  }

  // Switch camera (front/back)
  async switchCamera() {
    try {
      if (this.agoraEngine && this.callState.isVideoEnabled) {
        // NOTE: Uncomment when react-native-agora is installed
        /*
        await this.agoraEngine.switchCamera();
        */
        
        console.log('Camera switched (placeholder)');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error switching camera:', error);
      return false;
    }
  }

  // Listen for incoming calls with enhanced filtering
  listenForIncomingCalls() {
    if (!this.userId) return;

    const callsRef = ref(db, `calls`);
    const listener = onValue(callsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        Object.keys(data).forEach(callId => {
          const call = data[callId];
          
          // Enhanced filtering for incoming calls
          const isIncomingCall = (
            (this.userType === 'user' && call.driver_id === this.userId && call.status === 'ringing') ||
            (this.userType === 'driver' && call.user_id === this.userId && call.status === 'ringing')
          ) && call.caller_type !== this.userType;
          
          if (isIncomingCall) {
            this.handleIncomingCall(callId, call);
          }
          
          // Handle call status changes for current call
          if (call.status && this.currentCallId === callId) {
            this.handleCallStatusChange(call.status, call);
          }
        });
      }
    });

    this.callListeners.set('incoming', listener);
  }

  // Enhanced incoming call handling
  handleIncomingCall(callId, callData) {
    console.log('Incoming call:', callId, callData);
    
    if (this.onIncomingCall) {
      this.onIncomingCall(callId, {
        ...callData,
        caller_name: callData.caller_data?.name || 'Unknown',
        caller_avatar: callData.caller_data?.avatar,
        call_type: callData.call_type || 'voice',
      });
    }
  }

  // Enhanced call status change handling
  async handleCallStatusChange(status, callData) {
    console.log('Call status changed:', status, callData);
    
    switch (status) {
      case 'connected':
        await this.joinAgoraChannel(callData.channel_name);
        break;
      case 'ended':
      case 'declined':
        await this.leaveAgoraChannel();
        this.currentCallId = null;
        break;
    }

    if (this.onCallStatusChange) {
      this.onCallStatusChange(status, callData);
    }
  }

  // Enhanced call initiation with better error handling
  async initiateCall(targetUserId, targetUserType, requestId, callerData, callType = 'voice') {
    try {
      if (!this.isInitialized) {
        throw new Error('VoIPManager not initialized');
      }

      const callsRef = ref(db, 'calls');
      const callId = push(callsRef).key;
      const channelName = AgoraConfig.generateChannelName(callId);

      const callData = {
        id: callId,
        user_id: this.userType === 'user' ? this.userId : targetUserId,
        driver_id: this.userType === 'driver' ? this.userId : targetUserId,
        request_id: requestId,
        status: 'ringing',
        caller_type: this.userType,
        caller_data: callerData,
        call_type: callType, // 'voice' or 'video'
        created_at: Date.now(),
        channel_name: channelName,
        app_id: AgoraConfig.AGORA_APP_ID,
      };

      await update(ref(db, `calls/${callId}`), callData);
      this.currentCallId = callId;
      
      // Pre-join channel for faster connection
      await this.joinAgoraChannel(channelName);
      
      return { callId, channelName };
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }

  // Enhanced call acceptance
  async acceptCall(callId) {
    try {
      const callRef = ref(db, `calls/${callId}`);
      const callSnapshot = await get(callRef);
      const callData = callSnapshot.val();
      
      if (callData) {
        await update(callRef, {
          status: 'connected',
          connected_at: Date.now(),
        });
        
        this.currentCallId = callId;
        
        // Join Agora channel
        const success = await this.joinAgoraChannel(callData.channel_name);
        
        return success;
      }
      return false;
    } catch (error) {
      console.error('Error accepting call:', error);
      return false;
    }
  }

  // Enhanced call decline
  async declineCall(callId) {
    try {
      const callRef = ref(db, `calls/${callId}`);
      await update(callRef, {
        status: 'declined',
        declined_at: Date.now(),
      });
      
      // Clean up after 5 seconds
      setTimeout(() => {
        remove(callRef).catch(console.error);
      }, 5000);
      
      return true;
    } catch (error) {
      console.error('Error declining call:', error);
      return false;
    }
  }

  // Enhanced call ending
  async endCall(callId = null) {
    try {
      const targetCallId = callId || this.currentCallId;
      if (!targetCallId) return false;

      const callRef = ref(db, `calls/${targetCallId}`);
      await update(callRef, {
        status: 'ended',
        ended_at: Date.now(),
      });

      // Leave Agora channel
      await this.leaveAgoraChannel();

      // Clean up after 5 seconds
      setTimeout(() => {
        remove(callRef).catch(console.error);
      }, 5000);

      this.currentCallId = null;
      return true;
    } catch (error) {
      console.error('Error ending call:', error);
      return false;
    }
  }

  // Error handling
  handleCallError(error) {
    console.error('Call error:', error);
    
    if (this.onCallStatusChange) {
      this.onCallStatusChange('error', { error: error.message });
    }
  }

  // Remote call end handling
  handleRemoteCallEnd() {
    if (this.currentCallId) {
      this.endCall(this.currentCallId);
    }
  }

  // Notification methods for UI updates
  notifyRemoteUserJoined(uid) {
    // Notify UI that remote user joined
    console.log('Remote user joined notification:', uid);
  }

  notifyRemoteUserLeft(uid, reason) {
    // Notify UI that remote user left
    console.log('Remote user left notification:', uid, reason);
  }

  notifyRemoteVideoStateChanged(uid, enabled) {
    // Notify UI about remote video state change
    console.log('Remote video state changed:', uid, enabled);
  }

  notifyNetworkQualityChanged(quality) {
    // Notify UI about network quality change
    console.log('Network quality changed:', quality);
  }

  notifyCallStatsUpdated(stats) {
    // Notify UI about call statistics update
    console.log('Call stats updated:', stats);
  }

  notifyAudioVolumeChanged(speakers, totalVolume) {
    // Notify UI about audio volume changes
    console.log('Audio volume changed:', speakers, totalVolume);
  }

  // Update call status in Firebase
  async updateCallStatus(status, additionalData = {}) {
    if (this.currentCallId) {
      try {
        const callRef = ref(db, `calls/${this.currentCallId}`);
        await update(callRef, {
          status,
          [`${status}_at`]: Date.now(),
          ...additionalData,
        });
      } catch (error) {
        console.error('Error updating call status:', error);
      }
    }
  }

  // Get current call state
  getCallState() {
    return { ...this.callState };
  }

  // Get remote users
  getRemoteUsers() {
    return Array.from(this.remoteUsers.values());
  }

  // Get call data
  async getCallData(callId) {
    try {
      const callRef = ref(db, `calls/${callId}`);
      const snapshot = await get(callRef);
      return snapshot.val();
    } catch (error) {
      console.error('Error getting call data:', error);
      return null;
    }
  }

  // Set event handlers
  setIncomingCallHandler(handler) {
    this.onIncomingCall = handler;
  }

  setCallStatusChangeHandler(handler) {
    this.onCallStatusChange = handler;
  }

  // Cleanup with enhanced resource management
  async cleanup() {
    try {
      // Clear all listeners
      this.callListeners.forEach((listener, key) => {
        if (key === 'incoming') {
          const callsRef = ref(db, `calls`);
          off(callsRef, 'value', listener);
        }
      });
      this.callListeners.clear();
      
      // End current call if any
      if (this.currentCallId) {
        await this.endCall(this.currentCallId);
      }
      
      // Cleanup Agora Engine
      await this.cleanupAgoraEngine();
      
      // Reset state
      this.currentCallId = null;
      this.isInitialized = false;
      this.remoteUsers.clear();
      this.callState = {
        isConnected: false,
        isMuted: false,
        isSpeakerOn: false,
        isVideoEnabled: false,
        networkQuality: 'unknown',
        callDuration: 0,
      };
      
      console.log('VoIPManager cleaned up successfully');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Cleanup Agora Engine
  async cleanupAgoraEngine() {
    try {
      if (this.agoraEngine) {
        await this.leaveAgoraChannel();
        
        // NOTE: Uncomment when react-native-agora is installed
        /*
        await this.agoraEngine.destroy();
        */
        
        this.agoraEngine = null;
        console.log('Agora Engine cleaned up (placeholder)');
      }
    } catch (error) {
      console.error('Failed to cleanup Agora Engine:', error);
    }
  }
}

// Export singleton instance
const voipManager = new VoIPManager();
export default voipManager;

  // Initialize Agora Engine (placeholder - requires actual Agora SDK)
  async initializeAgoraEngine() {
    try {
      if (!AgoraConfig.isAgoraConfigured()) {
        console.warn('Agora App ID not configured. Please update AgoraConfig.js');
        return false;
      }

      // NOTE: This would be the actual Agora SDK initialization
      // Uncomment and modify when react-native-agora is installed:
      /*
      const { RtcEngine } = require('react-native-agora');
      
      this.agoraEngine = await RtcEngine.create(AgoraConfig.AGORA_APP_ID);
      
      // Set up event listeners
      this.agoraEngine.addListener('Warning', (warn) => {
        console.log('Agora Warning:', warn);
      });
      
      this.agoraEngine.addListener('Error', (err) => {
        console.error('Agora Error:', err);
      });
      
      this.agoraEngine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
        console.log('Joined channel successfully:', channel, uid);
      });
      
      this.agoraEngine.addListener('UserJoined', (uid, elapsed) => {
        console.log('Remote user joined:', uid);
      });
      
      this.agoraEngine.addListener('UserOffline', (uid, reason) => {
        console.log('Remote user left:', uid, reason);
      });
      
      // Configure engine
      await this.agoraEngine.setChannelProfile(AgoraConfig.DEFAULT_CALL_CONFIG.channelProfile);
      await this.agoraEngine.setClientRole(AgoraConfig.DEFAULT_CALL_CONFIG.clientRole);
      await this.agoraEngine.enableAudio();
      
      if (AgoraConfig.DEFAULT_CALL_CONFIG.enableVideo) {
        await this.agoraEngine.enableVideo();
      }
      */
      
      console.log('Agora Engine initialized (placeholder)');
      return true;
    } catch (error) {
      console.error('Failed to initialize Agora Engine:', error);
      return false;
    }
  }

  // Join Agora channel
  async joinAgoraChannel(channelName, uid = 0) {
    try {
      if (!this.agoraEngine) {
        const initialized = await this.initializeAgoraEngine();
        if (!initialized) {
          throw new Error('Failed to initialize Agora Engine');
        }
      }

      // Get token from backend (in production)
      const token = await AgoraConfig.getAgoraToken(channelName, uid);
      
      // NOTE: Actual Agora SDK call would be:
      // await this.agoraEngine.joinChannel(token, channelName, null, uid);
      
      console.log(`Joined Agora channel: ${channelName} (placeholder)`);
      return true;
    } catch (error) {
      console.error('Failed to join Agora channel:', error);
      return false;
    }
  }

  // Leave Agora channel
  async leaveAgoraChannel() {
    try {
      if (this.agoraEngine) {
        // NOTE: Actual Agora SDK call would be:
        // await this.agoraEngine.leaveChannel();
        console.log('Left Agora channel (placeholder)');
      }
      return true;
    } catch (error) {
      console.error('Failed to leave Agora channel:', error);
      return false;
    }
  }

  // Cleanup Agora Engine
  async cleanupAgoraEngine() {
    try {
      if (this.agoraEngine) {
        await this.leaveAgoraChannel();
        // NOTE: Actual Agora SDK cleanup would be:
        // await this.agoraEngine.destroy();
        this.agoraEngine = null;
        console.log('Agora Engine cleaned up (placeholder)');
      }
    } catch (error) {
      console.error('Failed to cleanup Agora Engine:', error);
    }
  }

  // Listen for incoming calls
  listenForIncomingCalls() {
    if (!this.userId) return;

    const callsRef = ref(db, `calls`);
    const listener = onValue(callsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        Object.keys(data).forEach(callId => {
          const call = data[callId];
          
          // Check if this is an incoming call for current user
          if (this.userType === 'user' && call.driver_id === this.userId && call.status === 'ringing') {
            this.handleIncomingCall(callId, call);
          } else if (this.userType === 'driver' && call.user_id === this.userId && call.status === 'ringing') {
            this.handleIncomingCall(callId, call);
          }
          
          // Check for call status changes
          if (call.status && this.currentCallId === callId) {
            this.handleCallStatusChange(call.status, call);
          }
        });
      }
    });

    this.callListeners.set('incoming', listener);
  }

  // Handle incoming call
  handleIncomingCall(callId, callData) {
    if (this.onIncomingCall) {
      this.onIncomingCall(callId, callData);
    }
  }

  // Handle call status changes
  handleCallStatusChange(status, callData) {
    if (status === 'connected') {
      // Join Agora channel when call is connected
      this.joinAgoraChannel(callData.channel_name);
    } else if (status === 'ended' || status === 'declined') {
      // Leave Agora channel when call ends
      this.leaveAgoraChannel();
    }

    if (this.onCallStatusChange) {
      this.onCallStatusChange(status, callData);
    }
  }

  // Initiate an outgoing call
  async initiateCall(targetUserId, targetUserType, requestId, callerData) {
    try {
      const callsRef = ref(db, 'calls');
      const newCallRef = push(callsRef);
      const callId = newCallRef.key;
      const channelName = AgoraConfig.generateChannelName(callId);

      const callData = {
        id: callId,
        user_id: this.userType === 'user' ? this.userId : targetUserId,
        driver_id: this.userType === 'driver' ? this.userId : targetUserId,
        request_id: requestId,
        status: 'ringing',
        caller_type: this.userType,
        caller_data: callerData,
        created_at: Date.now(),
        // Agora channel configuration
        channel_name: channelName,
        app_id: AgoraConfig.AGORA_APP_ID,
      };

      await push(newCallRef, callData);
      this.currentCallId = callId;
      
      // Initialize Agora for outgoing call
      await this.initializeAgoraEngine();
      
      return { callId, channelName };
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }

  // Accept an incoming call
  async acceptCall(callId) {
    try {
      const callRef = ref(db, `calls/${callId}`);
      const callSnapshot = await get(callRef);
      const callData = callSnapshot.val();
      
      if (callData) {
        await push(callRef, {
          status: 'connected',
          connected_at: Date.now(),
        });
        
        this.currentCallId = callId;
        
        // Join Agora channel
        await this.joinAgoraChannel(callData.channel_name);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error accepting call:', error);
      return false;
    }
  }

  // Decline an incoming call
  async declineCall(callId) {
    try {
      const callRef = ref(db, `calls/${callId}`);
      await push(callRef, {
        status: 'declined',
        declined_at: Date.now(),
      });
      
      // Remove call after declining
      setTimeout(() => {
        remove(callRef);
      }, 5000);
      
      return true;
    } catch (error) {
      console.error('Error declining call:', error);
      return false;
    }
  }

  // End current call
  async endCall(callId = null) {
    try {
      const targetCallId = callId || this.currentCallId;
      if (!targetCallId) return false;

      const callRef = ref(db, `calls/${targetCallId}`);
      await push(callRef, {
        status: 'ended',
        ended_at: Date.now(),
      });

      // Leave Agora channel
      await this.leaveAgoraChannel();

      // Remove call after ending
      setTimeout(() => {
        remove(callRef);
      }, 5000);

      this.currentCallId = null;
      return true;
    } catch (error) {
      console.error('Error ending call:', error);
      return false;
    }
  }

  // Mute/unmute local audio
  async muteLocalAudio(muted) {
    try {
      if (this.agoraEngine) {
        // NOTE: Actual Agora SDK call would be:
        // await this.agoraEngine.muteLocalAudioStream(muted);
        console.log(`Local audio ${muted ? 'muted' : 'unmuted'} (placeholder)`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling audio mute:', error);
      return false;
    }
  }

  // Enable/disable speaker
  async enableSpeaker(enabled) {
    try {
      if (this.agoraEngine) {
        // NOTE: Actual Agora SDK call would be:
        // await this.agoraEngine.setEnableSpeakerphone(enabled);
        console.log(`Speaker ${enabled ? 'enabled' : 'disabled'} (placeholder)`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling speaker:', error);
      return false;
    }
  }

  // Enable/disable local video
  async enableLocalVideo(enabled) {
    try {
      if (this.agoraEngine) {
        // NOTE: Actual Agora SDK call would be:
        // await this.agoraEngine.enableLocalVideo(enabled);
        // if (enabled) {
        //   await this.agoraEngine.startPreview();
        // } else {
        //   await this.agoraEngine.stopPreview();
        // }
        console.log(`Local video ${enabled ? 'enabled' : 'disabled'} (placeholder)`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling video:', error);
      return false;
    }
  }

  // Get call data
  async getCallData(callId) {
    try {
      const callRef = ref(db, `calls/${callId}`);
      const snapshot = await get(callRef);
      return snapshot.val();
    } catch (error) {
      console.error('Error getting call data:', error);
      return null;
    }
  }

  // Set incoming call handler
  setIncomingCallHandler(handler) {
    this.onIncomingCall = handler;
  }

  // Set call status change handler
  setCallStatusChangeHandler(handler) {
    this.onCallStatusChange = handler;
  }

  // Cleanup listeners
  cleanup() {
    this.callListeners.forEach((listener, key) => {
      if (key === 'incoming') {
        const callsRef = ref(db, `calls`);
        off(callsRef, 'value', listener);
      }
    });
    this.callListeners.clear();
    this.currentCallId = null;
    
    // Cleanup Agora Engine
    this.cleanupAgoraEngine();
  }
}

// Export singleton instance
const voipManager = new VoIPManager();
export default voipManager;

