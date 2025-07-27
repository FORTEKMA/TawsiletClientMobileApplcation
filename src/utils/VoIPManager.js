import { ref, push, onValue, off, remove, get } from 'firebase/database';
import db from './firebase';
import AgoraConfig from './AgoraConfig';

class VoIPManager {
  constructor() {
    this.currentCallId = null;
    this.callListeners = new Map();
    this.onIncomingCall = null;
    this.onCallStatusChange = null;
    this.agoraEngine = null;
  }

  // Initialize VoIP manager with user data
  initialize(userId, userType = 'user') {
    this.userId = userId;
    this.userType = userType;
    this.listenForIncomingCalls();
  }

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

