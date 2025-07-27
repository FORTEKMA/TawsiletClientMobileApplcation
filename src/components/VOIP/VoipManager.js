import { createAgoraRtcEngine, ChannelProfileType, ClientRoleType } from 'react-native-agora';
import { PermissionsAndroid, Platform } from 'react-native';

class VoipManager {
  constructor() {
    this.engine = null;
    this.isInitialized = false;
    this.currentChannel = null;
    this.isInCall = false;
    this.isMuted = false;
    this.isSpeakerOn = false;
    this.listeners = new Map();
  }

  // Initialize Agora engine
  async initialize(appId) {
    try {
      if (this.isInitialized) {
        return true;
      }

      // Request permissions
      await this.requestPermissions();

      // Create engine
      this.engine = createAgoraRtcEngine();
      
      // Initialize engine
      await this.engine.initialize({
        appId: appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      // Set up event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      console.log('Agora engine initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Agora engine:', error);
      throw error;
    }
  }

  // Request necessary permissions
  async requestPermissions() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.MODIFY_AUDIO_SETTINGS,
        ]);

        const audioGranted = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
        const audioSettingsGranted = granted[PermissionsAndroid.PERMISSIONS.MODIFY_AUDIO_SETTINGS] === PermissionsAndroid.RESULTS.GRANTED;

        if (!audioGranted || !audioSettingsGranted) {
          throw new Error('Audio permissions not granted');
        }
      } catch (error) {
        console.error('Permission request failed:', error);
        throw error;
      }
    }
  }

  // Set up event handlers
  setupEventHandlers() {
    if (!this.engine) return;

    this.engine.registerEventHandler({
      onJoinChannelSuccess: (connection, elapsed) => {
        console.log('Successfully joined channel:', connection.channelId);
        this.isInCall = true;
        this.notifyListeners('onJoinChannelSuccess', { connection, elapsed });
      },
      
      onLeaveChannel: (connection, stats) => {
        console.log('Left channel:', connection.channelId);
        this.isInCall = false;
        this.currentChannel = null;
        this.notifyListeners('onLeaveChannel', { connection, stats });
      },
      
      onUserJoined: (connection, remoteUid, elapsed) => {
        console.log('User joined:', remoteUid);
        this.notifyListeners('onUserJoined', { connection, remoteUid, elapsed });
      },
      
      onUserOffline: (connection, remoteUid, reason) => {
        console.log('User offline:', remoteUid, reason);
        this.notifyListeners('onUserOffline', { connection, remoteUid, reason });
      },
      
      onError: (err, msg) => {
        console.error('Agora error:', err, msg);
        this.notifyListeners('onError', { err, msg });
      },
      
      onConnectionStateChanged: (connection, state, reason) => {
        console.log('Connection state changed:', state, reason);
        this.notifyListeners('onConnectionStateChanged', { connection, state, reason });
      },
      
      onAudioVolumeIndication: (connection, speakers, speakerNumber, totalVolume) => {
        this.notifyListeners('onAudioVolumeIndication', { connection, speakers, speakerNumber, totalVolume });
      },
    });
  }

  // Add event listener
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Remove event listener
  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Notify listeners
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // Start a call
  async startCall(channelName, token = null, uid = 0) {
    try {
      if (!this.isInitialized) {
        throw new Error('Agora engine not initialized');
      }

      if (this.isInCall) {
        await this.endCall();
      }

      // Enable audio
      await this.engine.enableAudio();
      
      // Set client role to broadcaster for voice calls
      await this.engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      // Join channel
      await this.engine.joinChannel(token, channelName, uid, {
        // Disable video for voice-only calls
        publishMicrophoneTrack: true,
        publishCameraTrack: false,
        autoSubscribeAudio: true,
        autoSubscribeVideo: false,
      });

      this.currentChannel = channelName;
      console.log('Call started successfully');
      return true;
    } catch (error) {
      console.error('Failed to start call:', error);
      throw error;
    }
  }

  // Answer an incoming call
  async answerCall(channelName, token = null, uid = 0) {
    return this.startCall(channelName, token, uid);
  }

  // End the current call
  async endCall() {
    try {
      if (!this.isInCall || !this.engine) {
        return;
      }

      await this.engine.leaveChannel();
      await this.engine.disableAudio();
      
      this.isInCall = false;
      this.currentChannel = null;
      this.isMuted = false;
      this.isSpeakerOn = false;
      
      console.log('Call ended successfully');
    } catch (error) {
      console.error('Failed to end call:', error);
      throw error;
    }
  }

  // Mute/unmute microphone
  async toggleMute() {
    try {
      if (!this.engine || !this.isInCall) {
        return false;
      }

      this.isMuted = !this.isMuted;
      await this.engine.muteLocalAudioStream(this.isMuted);
      
      console.log('Microphone', this.isMuted ? 'muted' : 'unmuted');
      return this.isMuted;
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      throw error;
    }
  }

  // Toggle speaker
  async toggleSpeaker() {
    try {
      if (!this.engine || !this.isInCall) {
        return false;
      }

      this.isSpeakerOn = !this.isSpeakerOn;
      await this.engine.setEnableSpeakerphone(this.isSpeakerOn);
      
      console.log('Speaker', this.isSpeakerOn ? 'on' : 'off');
      return this.isSpeakerOn;
    } catch (error) {
      console.error('Failed to toggle speaker:', error);
      throw error;
    }
  }

  // Get current call state
  getCallState() {
    return {
      isInCall: this.isInCall,
      currentChannel: this.currentChannel,
      isMuted: this.isMuted,
      isSpeakerOn: this.isSpeakerOn,
    };
  }

  // Enable audio volume indication
  async enableAudioVolumeIndication(interval = 200, smooth = 3, reportVad = false) {
    try {
      if (!this.engine) {
        return;
      }

      await this.engine.enableAudioVolumeIndication(interval, smooth, reportVad);
    } catch (error) {
      console.error('Failed to enable audio volume indication:', error);
    }
  }

  // Destroy the engine
  async destroy() {
    try {
      if (this.isInCall) {
        await this.endCall();
      }

      if (this.engine) {
        await this.engine.release();
        this.engine = null;
      }

      this.isInitialized = false;
      this.listeners.clear();
      
      console.log('Agora engine destroyed');
    } catch (error) {
      console.error('Failed to destroy Agora engine:', error);
    }
  }
}

// Export singleton instance
export default new VoipManager();

