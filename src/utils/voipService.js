import VoipManager from '../components/VOIP/VoipManager';
import { ref, set, onValue, off, serverTimestamp } from 'firebase/database';
import db from './firebase';

class VoipService {
  constructor() {
    this.activeCallListeners = new Map();
    this.currentCall = null;
    this.isInitialized = false;
  }

  // Initialize VOIP service
  async initialize(appId) {
    try {
      if (this.isInitialized) {
        return true;
      }

      await VoipManager.initialize(appId);
      this.isInitialized = true;
      console.log('VOIP service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize VOIP service:', error);
      throw error;
    }
  }

  // Generate channel name for a trip
  generateChannelName(tripId, passengerId, driverId) {
    return `trip_${tripId}_${passengerId}_${driverId}`;
  }

  // Generate unique UID for user
  generateUid(userId) {
    // Convert user ID to a number for Agora
    // In production, you might want to use a more sophisticated mapping
    return parseInt(userId) || Math.floor(Math.random() * 1000000);
  }

  // Initiate a call
  async initiateCall(tripId, passengerId, passengerName, driverId, driverName, token = null) {
    try {
      const channelName = this.generateChannelName(tripId, passengerId, driverId);
      const callId = `${tripId}_${passengerId}_${driverId}`;
      
      // Store call information in Firebase
      const callData = {
        callId,
        tripId,
        channelName,
        initiator: passengerId,
        participants: {
          [passengerId]: {
            name: passengerName,
            type: 'passenger',
            status: 'calling',
          },
          [driverId]: {
            name: driverName,
            type: 'driver',
            status: 'ringing',
          },
        },
        status: 'ringing',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const callRef = ref(db, `calls/${callId}`);
      await set(callRef, callData);

      // Start the call
      const uid = this.generateUid(passengerId);
      await VoipManager.startCall(channelName, token, uid);

      this.currentCall = {
        callId,
        channelName,
        tripId,
        participants: [passengerId, driverId],
      };

      return { callId, channelName, uid };
    } catch (error) {
      console.error('Failed to initiate call:', error);
      throw error;
    }
  }

  // Answer a call
  async answerCall(callId, userId, userName, token = null) {
    try {
      // Get call data from Firebase
      const callRef = ref(db, `calls/${callId}`);
      const snapshot = await new Promise((resolve) => {
        onValue(callRef, resolve, { onlyOnce: true });
      });

      const callData = snapshot.val();
      if (!callData) {
        throw new Error('Call not found');
      }

      // Update call status
      const updates = {
        [`participants/${userId}/status`]: 'connected',
        status: 'connected',
        answeredAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await set(ref(db, `calls/${callId}`), { ...callData, ...updates });

      // Join the call
      const uid = this.generateUid(userId);
      await VoipManager.answerCall(callData.channelName, token, uid);

      this.currentCall = {
        callId,
        channelName: callData.channelName,
        tripId: callData.tripId,
        participants: Object.keys(callData.participants),
      };

      return { callId, channelName: callData.channelName, uid };
    } catch (error) {
      console.error('Failed to answer call:', error);
      throw error;
    }
  }

  // End a call
  async endCall(callId, userId) {
    try {
      if (this.currentCall) {
        await VoipManager.endCall();
      }

      // Update call status in Firebase
      if (callId) {
        const callRef = ref(db, `calls/${callId}`);
        const updates = {
          [`participants/${userId}/status`]: 'ended',
          status: 'ended',
          endedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const snapshot = await new Promise((resolve) => {
          onValue(callRef, resolve, { onlyOnce: true });
        });

        const callData = snapshot.val();
        if (callData) {
          await set(callRef, { ...callData, ...updates });
        }
      }

      this.currentCall = null;
      console.log('Call ended successfully');
    } catch (error) {
      console.error('Failed to end call:', error);
      throw error;
    }
  }

  // Listen for incoming calls
  listenForIncomingCalls(userId, callback) {
    const callsRef = ref(db, 'calls');
    
    const unsubscribe = onValue(callsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      // Find calls where this user is a participant and status is ringing
      Object.values(data).forEach(call => {
        if (
          call.participants &&
          call.participants[userId] &&
          call.participants[userId].status === 'ringing' &&
          call.status === 'ringing'
        ) {
          callback(call);
        }
      });
    });

    this.activeCallListeners.set(`incoming_${userId}`, { ref: callsRef, unsubscribe });
    return unsubscribe;
  }

  // Listen to call status changes
  listenToCallStatus(callId, callback) {
    const callRef = ref(db, `calls/${callId}`);
    
    const unsubscribe = onValue(callRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback(data);
      }
    });

    this.activeCallListeners.set(`status_${callId}`, { ref: callRef, unsubscribe });
    return unsubscribe;
  }

  // Get current call information
  getCurrentCall() {
    return this.currentCall;
  }

  // Check if user is in a call
  isInCall() {
    return this.currentCall !== null && VoipManager.getCallState().isInCall;
  }

  // Mute/unmute microphone
  async toggleMute() {
    try {
      return await VoipManager.toggleMute();
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      throw error;
    }
  }

  // Toggle speaker
  async toggleSpeaker() {
    try {
      return await VoipManager.toggleSpeaker();
    } catch (error) {
      console.error('Failed to toggle speaker:', error);
      throw error;
    }
  }

  // Clean up listeners
  cleanup(callId = null) {
    if (callId) {
      // Clean up specific call listeners
      this.activeCallListeners.forEach((listener, key) => {
        if (key.includes(callId)) {
          off(listener.ref, 'value', listener.unsubscribe);
          this.activeCallListeners.delete(key);
        }
      });
    } else {
      // Clean up all listeners
      this.activeCallListeners.forEach((listener, key) => {
        off(listener.ref, 'value', listener.unsubscribe);
      });
      this.activeCallListeners.clear();
    }
  }

  // Destroy the service
  async destroy() {
    try {
      if (this.currentCall) {
        await this.endCall(this.currentCall.callId, null);
      }

      await VoipManager.destroy();
      this.cleanup();
      this.isInitialized = false;
      
      console.log('VOIP service destroyed');
    } catch (error) {
      console.error('Failed to destroy VOIP service:', error);
    }
  }
}

// Export singleton instance
export default new VoipService();

