import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import VoIPManager from './VoIPManager';

class FirebaseManager {
  constructor() {
    this.isInitialized = false;
    this.tokenCallback = null;
    this.foregroundHandlerSetup = false;
  }

  /**
   * Initialize Firebase messaging
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('FirebaseManager already initialized');
        return;
      }

      console.log('Initializing FirebaseManager...');

      // Request permission for iOS
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('Authorization status:', authStatus);
        } else {
          console.warn('Firebase messaging permission not granted');
        }
      }

      this.isInitialized = true;
      console.log('FirebaseManager initialized successfully');
    } catch (error) {
      console.error('Error initializing FirebaseManager:', error);
    }
  }

  /**
   * Setup foreground message handler using new API
   */
  setupForegroundHandler() {
    try {
      if (this.foregroundHandlerSetup) {
        console.log('Foreground handler already setup');
        return;
      }

      // Use the new onMessage API
      const unsubscribe = messaging().onMessage(async remoteMessage => {
        console.log('📱 Foreground message received:', remoteMessage);
        
        if (remoteMessage?.data?.type === 'voip_call') {
          console.log('📞 Processing VoIP call in foreground');
          this.handleVoIPCall(remoteMessage.data);
        } else {
          console.log('📱 Regular notification received:', remoteMessage);
          // Handle regular notifications here if needed
        }
      });
      
      this.foregroundHandlerSetup = true;
      console.log('Foreground message handler setup completed');
    } catch (error) {
      console.error('Error setting up foreground handler:', error);
    }
  }

 
  /**
   * Handle VoIP call data
   */
  handleVoIPCall(callData) {
    try {
      console.log('📞 Handling VoIP call data:', callData);
      
      // Parse JSON strings if they exist
      let parsedCallData = { ...callData };
      
      try {
        if (typeof callData.caller === 'string') {
          parsedCallData.caller = JSON.parse(callData.caller);
        }
        if (typeof callData.orderData === 'string') {
          parsedCallData.orderData = JSON.parse(callData.orderData);
        }
      } catch (e) {
        console.warn('Error parsing call data:', e);
      }
      
      // Validate required fields
      if (!parsedCallData.channelName) {
        console.error('Missing channelName in VoIP call data');
        return;
      }
      
      if (!parsedCallData.caller || !parsedCallData.caller.phoneNumber || !parsedCallData.caller.firstName) {
        console.error('Missing or invalid caller data in VoIP call:', parsedCallData.caller);
        return;
      }
      
      console.log('📞 Parsed VoIP call data:', parsedCallData);
      
      // Display incoming call using VoIPManager
      VoIPManager.displayIncomingCall(parsedCallData);
      
    } catch (error) {
      console.error('Error handling VoIP call:', error);
    }
  }

  /**
   * Get FCM token using new API
   */
  async getToken() {
    try {
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Listen for token refresh using new API
   */
  listenForTokenRefresh(callback) {
    try {
      const unsubscribe = messaging().onTokenRefresh(token => {
        console.log('FCM Token refreshed:', token);
        if (callback) {
          callback(token);
        }
      });
      
      console.log('Token refresh listener setup completed');
    } catch (error) {
      console.error('Error setting up token refresh listener:', error);
    }
  }

  /**
   * Setup all Firebase messaging functionality
   */
  async setup() {
    try {
      await this.initialize();
      this.setupForegroundHandler();
       
      // Get initial token
      const token = await this.getToken();
      if (token && this.tokenCallback) {
        this.tokenCallback(token);
      }
      
      console.log('FirebaseManager setup completed');
    } catch (error) {
      console.error('Error setting up FirebaseManager:', error);
    }
  }

  /**
   * Set token callback
   */
  setTokenCallback(callback) {
    this.tokenCallback = callback;
  }

  /**
   * Cleanup Firebase messaging
   */
  cleanup() {
    try {
      // Remove any listeners if needed
      this.isInitialized = false;
      this.foregroundHandlerSetup = false;
      this.tokenCallback = null;
      console.log('FirebaseManager cleanup completed');
    } catch (error) {
      console.error('Error cleaning up FirebaseManager:', error);
    }
  }
}

// Export singleton instance
export default new FirebaseManager(); 