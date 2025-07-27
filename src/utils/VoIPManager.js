import { ref, push, onValue, off, remove } from 'firebase/database';
import db from './firebase';

class VoIPManager {
  constructor() {
    this.currentCallId = null;
    this.callListeners = new Map();
    this.onIncomingCall = null;
    this.onCallStatusChange = null;
  }

  // Initialize VoIP manager with user data
  initialize(userId, userType = 'user') {
    this.userId = userId;
    this.userType = userType;
    this.listenForIncomingCalls();
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
        channel_name: `call_${callId}`,
        app_id: 'your_agora_app_id', // Replace with your Agora App ID
      };

      await push(newCallRef, callData);
      this.currentCallId = callId;
      
      return { callId, channelName: callData.channel_name };
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }

  // Accept an incoming call
  async acceptCall(callId) {
    try {
      const callRef = ref(db, `calls/${callId}`);
      await push(callRef, {
        status: 'connected',
        connected_at: Date.now(),
      });
      
      this.currentCallId = callId;
      return true;
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
  }

  // Generate Agora token (this should be done on your backend in production)
  generateAgoraToken(channelName, userId) {
    // In production, this should be a secure API call to your backend
    // which generates the token using Agora's server SDK
    // For now, we'll return a placeholder
    return `temp_token_${channelName}_${userId}`;
  }
}

// Export singleton instance
const voipManager = new VoIPManager();
export default voipManager;

