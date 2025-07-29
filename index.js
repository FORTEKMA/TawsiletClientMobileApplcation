/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

import VoipPushNotification from 'react-native-voip-push-notification';
import VoIPManager from './src/utils/VoIPManager'; // Import VoIPManager

AppRegistry.registerComponent(appName, () => App);

// Register VoIP push notification event listener for iOS
VoipPushNotification.addEventListener('register', (token) => {
  console.log('VoIP Push Notification Registered:', token);
});

VoipPushNotification.addEventListener('notification', (notification) => {
  console.log('VoIP Push Notification Received:', notification);

  // Ensure the app is invoked to handle the call
  VoipPushNotification.invokeApp();

  // Extract call data from the notification
  const callData = notification.data || {};

  if (callData.type === 'voip_call') {
    VoIPManager.displayIncomingCall(callData);
  } else {
    console.warn('VoIP notification missing type voip_call:', callData);
  }
});

VoipPushNotification.registerVoipToken();

// Register Headless JS Task for Android VoIP notifications
AppRegistry.registerHeadlessTask('RNNotificationBackgroundService', () => require('./voipHeadlessTask'));


