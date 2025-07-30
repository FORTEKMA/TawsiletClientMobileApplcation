/**
 * @format
 */

import {AppRegistry, Platform} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

import VoipPushNotification from 'react-native-voip-push-notification';
import VoIPManager from './src/utils/VoIPManager';
import FirebaseManager from './src/utils/FirebaseManager';
import messaging from '@react-native-firebase/messaging';
import RNCallKeep from 'react-native-callkeep';

AppRegistry.registerComponent(appName, () => App);

// Register VoIP push notification event listener for iOS
if (Platform.OS === 'ios') {
  VoipPushNotification.addEventListener('register', (token) => {
    console.log('VoIP Push Notification Registered:', token);
  });

  VoipPushNotification.addEventListener('notification', (notification) => {
    console.log('VoIP notification received:', notification);
    
    // --- when user answer the call, you should navigate to the call screen and update callKeep status ----
    // --- such as RNCallKeep.backToForeground() and RNCallKeep.endAllCalls() ----
    VoipPushNotification.invokeApp();

    // Extract call data from the notification
    const callData = notification.data || {};

    if (callData.type === 'voip_call') {
      console.log('Processing VoIP call notification:', callData);
      VoIPManager.displayIncomingCall(callData);
    } else {
      console.warn('VoIP notification missing type voip_call:', callData);
    }
  });

  // Ensure the app is invoked to handle the call
  VoipPushNotification.invokeApp();

  VoipPushNotification.registerVoipToken();
}

// Setup Firebase background message handler using new API
messaging().setBackgroundMessageHandler( remoteMessage => {
     console.log('📱 Background message received in index.js:', remoteMessage);

    // Prevent multiple foreground calls - reduced from 10 to 3
    for (let index = 0; index < 3; index++) {
      try {
        RNCallKeep.backToForeground();
      } catch (error) {
        console.log('Error calling backToForeground:', error);
      }
    }

    if (remoteMessage?.data?.type === 'voip_call') {
      console.log('📞 Processing VoIP call in background from index.js');
      
      // Only handle VoIP calls via Firebase on Android
      // iOS uses VoIP push notifications which are handled separately
      if (Platform.OS === 'android') {
        // Handle VoIP call synchronously to ensure call screen displays
        FirebaseManager.handleVoIPCall(remoteMessage.data);
      } else {
        console.log('📞 Skipping VoIP call processing on iOS - handled by VoIP push notifications');
      }
    } else {
      console.log('📱 Regular background notification received in index.js:', remoteMessage);
      // Handle regular background notifications here if needed
    }

    // Return a resolved promise to satisfy Firebase requirements
    return Promise.resolve();
});

