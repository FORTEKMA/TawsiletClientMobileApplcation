import { AppRegistry } from 'react-native';
import RNCallKeep from 'react-native-callkeep';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

module.exports = async (taskData) => {
  console.log('VoIP Headless Task received data:', taskData);

  // OneSignal sends data in `taskData.payload.additionalData` for data-only notifications
  const data = taskData.payload?.additionalData || taskData.payload?.data || {};

  if (data.type === 'voip_call') {
    const { channelName, caller } = data;
    if (caller && channelName) {
      const callUUID = uuidv4();

      // Store call data for later retrieval when the app is opened/answered
      await AsyncStorage.setItem(`call_${callUUID}`, JSON.stringify({ channelName, caller, callType: data.callType, orderData: data.orderData }));

      RNCallKeep.displayIncomingCall(
        callUUID,
        caller.phoneNumber,
        caller.firstName,
        'generic',
        true // selfManaged
      );
      console.log('Displayed incoming call via CallKeep from Headless Task');
    } else {
      console.warn('VoIP headless task: Missing caller or channelName in data:', data);
    }
  } else {
    console.log('VoIP headless task: Not a VoIP call notification, ignoring.');
  }
};


