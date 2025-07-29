/**
 * @format
 */

import {AppRegistry, Platform} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);


import VoipPushNotification from 'react-native-voip-push-notification';

// Register VoIP push notification event listener
if (Platform.OS === 'ios') {
  VoipPushNotification.addEventListener('register', (token) => {
    // --- send token to your apn server ----
  });

  VoipPushNotification.addEventListener('notification', (notification) => {
    // --- when user answer the call, you should navigate to the call screen and update callKeep status ----
    // --- such as RNCallKeep.backToForeground() and RNCallKeep.endAllCalls() ----
    VoipPushNotification.invokeApp();
  });

  VoipPushNotification.registerVoipToken();
}


