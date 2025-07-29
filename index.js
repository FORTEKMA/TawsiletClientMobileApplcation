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

// Register VoIP push notification event listener
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

    // You might want to store callUUID and other details to manage the call later
    // For now, we'll pass them to the IncomingCallScreen
    // This part needs to be handled in App.js or a global state management
    // to navigate to IncomingCallScreen when the app is invoked.
    // The navigation logic is already in App.js useEffect for 'click' event.
    // This listener is primarily for when the app is killed or in background.
  } else {
    console.warn('VoIP notification missing caller or channelName:', callData);
  }
});

VoipPushNotification.registerVoipToken();


