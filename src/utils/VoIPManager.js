import RNCallKeep from 'react-native-callkeep';
import * as navigationRef from '../navigators/navigationRef';
import uuid from 'react-native-uuid';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import RNNotificationCall from 'react-native-full-screen-notification-incoming-call';

const appName = 'Tawsilet';

class VoIPManager {
  constructor() {
    this.currentCallUUID = null;
    this.listenersInitialized = false;
    this.isSetup = false;
    this.activeCall = null;
    this.navigationInProgress = false; // Add flag to prevent duplicate navigation
    
    // Bind methods
    this._onAnswerCall = this._onAnswerCall.bind(this);
    this._onEndCall = this._onEndCall.bind(this);
    this._onDidDisplayIncomingCall = this._onDidDisplayIncomingCall.bind(this);
  }

  setupCallKeep() {
    if (this.isSetup) {
      console.log('CallKeep already setup');
      return;
    }

    const options = {
      ios: {
        appName: appName,
        handleType: 'number',
        selfManaged: true,
        supportsVideo: false,
        maximumCallGroups: '1',
        maximumCallsPerCallGroup: '1',
        includesCallsInRecents: true,
      },
      android: {
        alertTitle: 'Permissions required',
        alertDescription: 'This application needs to access your phone accounts to make calls',
        cancelButton: 'Cancel',
        okButton: 'ok',
        selfManaged: true,
        additionalPermissions: [],
        foregroundService: {
          onHold: false,
          onGoing: false,
          callback: () => {},
          disconnect: () => {},
        },
        incomingCallNotificationChannelName: 'VoIP Calls',
        incomingCallNotificationChannelDescription: 'Incoming voice and video calls',
        incomingCallNotificationChannelImportance: 'high',
        incomingCallNotificationChannelSound: 'incoming_call.mp3',
      },
    };

    try {
      RNCallKeep.setup(options);
      
      
        this._addCallKeepListeners();
      
      
      if (Platform.OS === 'android') {
        this.checkAndroidPermissions();
      }

      this.isSetup = true;
    } catch (error) {
      console.error('Error setting up CallKeep:', error);
    }
  }

  _addCallKeepListeners() {
    try {
      if (this.listenersInitialized) {
        console.log('CallKeep listeners already initialized');
        return;
      }

      this._removeCallKeepListeners();
      
      const listeners = [
        { event: 'answerCall', handler: this._onAnswerCall },
        { event: 'endCall', handler: this._onEndCall },
        { event: 'didDisplayIncomingCall', handler: this._onDidDisplayIncomingCall },
      ];
      
      listeners.forEach(({ event, handler }) => {
        try {
          RNCallKeep.addEventListener(event, handler);
        } catch (error) {
          console.error(`Failed to add listener for ${event}:`, error);
        }
      });
      
      this.listenersInitialized = true;
    } catch (error) {
      console.error('Error adding CallKeep listeners:', error);
      this.listenersInitialized = false;
    }
  }

  _removeCallKeepListeners() {
    try {
      const events = ['answerCall', 'endCall', 'didDisplayIncomingCall'];
      
      events.forEach(event => {
        try {
          RNCallKeep.removeEventListener(event);
        } catch (error) {
          // Ignore errors when removing listeners
        }
      });
    } catch (error) {
      console.error('Error removing CallKeep listeners:', error);
    }
  }

  // Centralized navigation method to prevent duplicates
  _navigateToCallScreen(navigationParams) {
    navigationRef?.reset('VoIPCallScreen', navigationParams);

  }

  _onAnswerCall = async ({ callUUID }) => {
    try {
      console.log('📞 CallKeep answer event triggered for callUUID:', callUUID);

      RNCallKeep.setCurrentCallActive(callUUID);
      if (Platform.OS === 'android' ) {
        try {
          RNNotificationCall.hideNotification();
         
        } catch (hideError) {
          console.error('Error hiding full-screen notification on answer:', hideError);
        }
      }
      
      // Use stored call payload or create default one
      const navigationParams = this.currentCallPayload && this.currentCallPayload.callUUID === callUUID 
        ? this.currentCallPayload 
        : {
            callUUID,
            driverData: { firstName: 'Unknown', phoneNumber: 'Unknown' },
            callType: 'voice',
            isIncoming: true,
            orderId: null,
            orderData: {},
            channelName: 'unknown',
            caller: { firstName: 'Unknown', phoneNumber: 'Unknown' },
          };
      
      // Mark this call as active to prevent duplicate handling
      // Preserve existing activeCall data if available
      if (this.activeCall && this.activeCall.callUUID === callUUID) {
        this.activeCall.timestamp = Date.now();
      } else {
        this.activeCall = { 
          callUUID, 
          timestamp: Date.now(),
          callKey: `${navigationParams.caller?.phoneNumber || 'unknown'}-${navigationParams.channelName || 'unknown'}`
        };
      }
      
      // Use centralized navigation method
      this._navigateToCallScreen(navigationParams);
      
      // Clear the stored payload after navigation
      if (this.currentCallPayload && this.currentCallPayload.callUUID === callUUID) {
        this.currentCallPayload = null;
      }
     
    } catch (error) {
      console.error('Error in _onAnswerCall:', error);
      
    }
  };

  _onEndCall = async ({ callUUID }) => {
    try {
      // Clear active call
      if (this.activeCall && this.activeCall.callUUID === callUUID) {
        this.activeCall = null;
      }

      if (Platform.OS === 'android') {
        try {
          RNNotificationCall.hideNotification();
          navigationRef?.reset("Main");
          console.log('Ending call:', callUUID);
          RNCallKeep.endCall(callUUID);

        } catch (hideError) {
          console.error('Error hiding full-screen notification on end call:', hideError);
        }
      }
    } catch (error) {
      console.error('Error in _onEndCall:', error);
    }
  };

  _onDidDisplayIncomingCall = ({ callUUID, handle, name }) => {
    if (Platform.OS === 'android') {
      try {
        console.log('📞 CallKeep displayed incoming call, showing full-screen notification');
        
        // Always show full-screen notification for better UX
        this._showFullScreenNotification(callUUID, handle, name);
      } catch (error) {
        console.error('Error showing full-screen notification after CallKeep:', error);
      }
    }
  };

  showPermissionSettingsDialog() {
    Alert.alert(
      'Permissions Required',
      'Some permissions are required for incoming calls to work properly. Please enable them in app settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open App Settings',
          onPress: () => {
            Linking.openSettings();
          },
        },
        {
          text: 'Try Anyway',
          onPress: () => {
            console.log('User chose to try CallKeep anyway');
          },
        },
      ]
    );
  }

  async checkRequiredPermissions() {
    if (Platform.OS !== 'android') return true;
    
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        PermissionsAndroid.PERMISSIONS.ANSWER_PHONE_CALLS,
      ];
      
      const results = await PermissionsAndroid.requestMultiple(permissions);
      const allGranted = Object.values(results).every(result => result === PermissionsAndroid.RESULTS.GRANTED);
      
      if (!allGranted) {
        const deniedPermissions = [];
        const neverAskAgainPermissions = [];
        
        Object.entries(results).forEach(([permission, result]) => {
          if (result === PermissionsAndroid.RESULTS.DENIED) {
            deniedPermissions.push(permission);
          } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            neverAskAgainPermissions.push(permission);
          }
        });
        
        if (neverAskAgainPermissions.length > 0) {
          this.showPermissionSettingsDialog();
          
          const criticalPermissions = [
            PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
            PermissionsAndroid.PERMISSIONS.CALL_PHONE,
            PermissionsAndroid.PERMISSIONS.ANSWER_PHONE_CALLS,
          ];
          
          const criticalPermissionsGranted = criticalPermissions.every(permission => 
            results[permission] === PermissionsAndroid.RESULTS.GRANTED
          );
          
          if (criticalPermissionsGranted) {
            return true;
          } else {
            return false;
          }
        }
        
        if (deniedPermissions.length > 0) {
          await this.checkAndroidPermissions();
          return false;
        }
        
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking required permissions:', error);
      return false;
    }
  }

  /**
   * Reset VoIPManager state when app is restarted
   */
  resetState() {
    this.currentCallUUID = null;
    this.activeCall = null;
    this.navigationInProgress = false;
    this.currentCallPayload = null;
    console.log('📞 VoIPManager state reset');
  }

  displayIncomingCall(callData) {
    try {
      const { channelName, caller, callType, orderData } = callData;
      
      if (!channelName) {
        console.error('Missing channelName in call data');
        return null;
      }
      
      if (!caller || !caller.phoneNumber || !caller.firstName) {
        console.error('Missing or invalid caller data:', caller);
        return null;
      }
      
      // Enhanced duplicate prevention - check for same caller and channel
      const callKey = `${caller.phoneNumber}-${channelName}`;
      if (this.activeCall && this.activeCall.callKey === callKey) {
        const timeSinceLastCall = Date.now() - this.activeCall.timestamp;
        if (timeSinceLastCall < 10000) { // 10 seconds threshold for same call
          console.log('📞 Duplicate call detected, ignoring:', {
            callKey,
            timeSinceLastCall,
            existingCallUUID: this.activeCall.callUUID
          });
          return this.activeCall.callUUID;
        }
      }
      
      const callUUID = uuid.v4();
      this.currentCallUUID = callUUID;

      // Store call payload for later use when call is answered
      this.currentCallPayload = {
        callUUID,
        driverData: caller,
        callType: callType || 'voice',
        isIncoming: true,
        orderId: orderData?.id,
        orderData: orderData || {},
        channelName: channelName,
        caller: caller,
      };

      // Track active call to prevent duplicates
      this.activeCall = {
        callUUID,
        callKey,
        timestamp: Date.now(),
        caller: caller,
        channelName: channelName
      };

      // Check if app is in background by checking if navigationRef is available
      const isAppInBackground = !navigationRef?.current;
      
      console.log('📞 App background state:', isAppInBackground ? 'Background' : 'Foreground');
      console.log('📞 Processing call with key:', callKey);

      if (Platform.OS === 'android') {
        // For Android, always try CallKeep first, then full-screen notification
        this._displayIncomingCallAndroid(callUUID, channelName, caller, isAppInBackground);
      } else {
        this._displayIncomingCallIOS(callUUID, channelName, caller);
      }
      
   
        const navigationParams = this.currentCallPayload || {
          callUUID,
          driverData: caller,
          callType: callType || 'voice',
          isIncoming: true,
          orderId: orderData?.id,
          orderData: orderData || {},
          channelName: channelName,
          caller: caller,
        };
        
        console.log('📞 Navigating to IncomingCallScreen for incoming call with params:', navigationParams);
        navigationRef?.reset('IncomingCallScreen', navigationParams);
      
     
      return callUUID;
    } catch (error) {
      console.error('Error in displayIncomingCall:', error);
      return null;
    }
  }

    _displayIncomingCallAndroid(callUUID, channelName, caller, isAppInBackground = false) {
  
      const phoneNumber = caller.phoneNumber || channelName || 'Unknown';
     
     
      console.log('📞 Displaying incoming call (Android):', {
        callUUID,
        phoneNumber,
        callerName: caller.firstName,
        isAppInBackground
      });
      
      // Update currentCallPayload with the callUUID
      if (this.currentCallPayload && this.currentCallPayload.callUUID !== callUUID) {
        this.currentCallPayload.callUUID = callUUID;
      }
      
      // Try CallKeep first
      RNCallKeep.displayIncomingCall(callUUID, phoneNumber, caller.firstName, 'number', false);
      
      
        this._showFullScreenNotification(callUUID, phoneNumber, caller.firstName);
     
       
        this._onDidDisplayIncomingCall({ callUUID, handle: phoneNumber, name: caller.firstName });
      
      
    
  }

  _showFullScreenNotification(callUUID, phoneNumber, callerName) {
    try {
      const foregroundOptions = {
        channelId: 'voip_calls',
        channelName: 'VoIP Calls',
        notificationIcon: 'ic_launcher',
        notificationTitle: callerName || 'Incoming Call',
        notificationBody: phoneNumber || 'Unknown',
        answerText: 'Answer',
        declineText: 'Decline',
        notificationColor: 'colorAccent',
        isVideo: false,
        notificationSound: null,
      };

      console.log('📞 Showing full-screen notification with options:', foregroundOptions);
      
      RNNotificationCall.displayNotification(
        callUUID,
        null,
        30000,
        foregroundOptions
      );
      
      this._setupNotificationEventListeners(callUUID);
    } catch (error) {
      console.error('Error showing full-screen notification:', error);
    }
  }

  _setupNotificationEventListeners(callUUID) {
    RNNotificationCall.addEventListener('answer', async (data) => {
        console.log('Answer event received:', this.currentCallPayload);
        RNNotificationCall.hideNotification();
         
 
        // Use centralized navigation method to prevent duplicates
        this._navigateToCallScreen(this.currentCallPayload);
        
        
        RNNotificationCall.backToApp();
     
    });


    RNNotificationCall.addEventListener('endCall', (data) => {
      console.log('End call event received:', data);
      RNNotificationCall.hideNotification();
     this._onEndCall({ callUUID });
    
    });
  }

  _displayIncomingCallIOS(callUUID, channelName, caller) {
    try {
      RNCallKeep.displayIncomingCall(callUUID, channelName, caller.firstName, 'number', true);
    } catch (displayError) {
      console.error('Error displaying incoming call (iOS):', displayError);
      try {
        RNCallKeep.displayIncomingCall(callUUID, caller.phoneNumber, caller.firstName, 'number', false);
      } catch (altError) {
        console.error('Alternative display method also failed (iOS):', altError);
      }
    }
  }

  endCall(callUUID) {
    try {
      if (Platform.OS === 'android' ) {
        try {
          RNNotificationCall.hideNotification();
        } catch (hideError) {
          console.error('Error hiding full-screen notification:', hideError);
        }
      }
      console.log('Ending call (endCall):', callUUID);
      RNCallKeep.endCall(callUUID);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }

  endAllCalls() {
    try {
      if (Platform.OS === 'android' ) {
        try {
          RNNotificationCall.hideNotification();
        } catch (hideError) {
          console.error('Error hiding full-screen notification:', hideError);
        }
      }
      
      RNCallKeep.endAllCalls();
    } catch (error) {
      console.error('Error ending all calls:', error);
    }
  }



  async checkAndroidPermissions() {
    if (Platform.OS !== 'android') return;
    
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        PermissionsAndroid.PERMISSIONS.ANSWER_PHONE_CALLS,
      ];
      
      const results = await PermissionsAndroid.requestMultiple(permissions);
      const allGranted = Object.values(results).every(result => result === PermissionsAndroid.RESULTS.GRANTED);
      
      if (!allGranted) {
        Object.entries(results).forEach(([permission, result]) => {
          if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn(`Permission ${permission} was ${result}`);
          }
        });
      }
    } catch (error) {
      console.error('Error checking Android permissions:', error);
    }
  }

  cleanupEventListeners() {
    this._removeCallKeepListeners();
    
    if (Platform.OS === 'android' ) {
      try {
        RNNotificationCall.removeEventListener('answer');
        RNNotificationCall.removeEventListener('endCall');
      } catch (error) {
        console.error('Error cleaning up full-screen notification event listeners:', error);
      }
    }
  }

 

  /**
   * Get current status for debugging
   */
  getStatus() {
    return {
      currentCallUUID: this.currentCallUUID,
      listenersInitialized: this.listenersInitialized,
      currentCallPayload: this.currentCallPayload,
      platform: Platform.OS,
      hasNavigationRef: !!navigationRef?.current
    };
  }
}

export default new VoIPManager();


