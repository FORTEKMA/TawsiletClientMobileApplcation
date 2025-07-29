/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

import VoipPushNotification from 'react-native-voip-push-notification';
import RNCallKeep from 'react-native-callkeep';
import { v4 as uuidv4 } from 'uuid';

AppRegistry.registerComponent(appName, () => App);

// Register VoIP push notification event listener for iOS
VoipPushNotification.addEventListener('register', (token) => {
  // --- send token to your apn server ----
  console.log('VoIP Push Notification Registered:', token);
});

VoipPushNotification.addEventListener('notification', (notification) => {
  console.log('VoIP Push Notification Received:', notification);

  // Ensure the app is invoked to handle the call
  VoipPushNotification.invokeApp();

  // Extract call data from the notification
  const callData = notification.data || {};
  const { channelName, caller } = callData;

  if (caller && channelName) {
    const callUUID = uuidv4();
    // Display the incoming call using CallKeep
    RNCallKeep.displayIncomingCall(
      callUUID,
      caller.phoneNumber, // Use phone number as handle
      caller.firstName,   // Use first name as caller name
      'generic',
      true // selfManaged
    );
  } else {
    console.warn('VoIP notification missing caller or channelName:', callData);
  }
});

VoipPushNotification.registerVoipToken();

// Register Headless JS Task for Android VoIP notifications
AppRegistry.registerHeadlessTask('RNNotificationBackgroundService', () => require('./voipHeadlessTask'));


