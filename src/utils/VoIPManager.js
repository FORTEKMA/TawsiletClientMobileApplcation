import RNCallKeep from 'react-native-callkeep';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '../navigators/Main';

const appName = 'Tawsilet';

class VoIPManager {
  constructor() {
    this.currentCallUUID = null;
  }

  setupCallKeep() {
    const options = {
      ios: {
        appName: appName,
        handleType: 'generic',
        selfManaged: true, // Crucial for preventing phone account permission
        supportsVideo: true,
        maximumCallGroups: '1',
        maximumCallsPerCallGroup: '1',
        ringtoneSound: 'incoming_call.mp3',
      },
      android: {
        alertTitle: 'Permissions required',
        alertDescription: 'This application needs to access your phone accounts to make calls',
        cancelButton: 'Cancel',
        okButton: 'ok',
        additionalPermissions: [],
        selfManaged: true, // Crucial for preventing phone account permission
        foregroundService: { // Required for Android 12+
          onHold: false,
          onGoing: false,
          callback: () => {},
          disconnect: () => {},
        },
      },
    };

    RNCallKeep.setup(options);

    this._addCallKeepListeners();
  }

  _addCallKeepListeners() {
    RNCallKeep.addEventListener('answerCall', this._onAnswerCall);
    RNCallKeep.addEventListener('endCall', this._onEndCall);
    RNCallKeep.addEventListener('didDisplayIncomingCall', this._onDidDisplayIncomingCall);
    RNCallKeep.addEventListener('didPerformSetMutedCallAction', this._onDidPerformSetMutedCallAction);
    RNCallKeep.addEventListener('didToggleHoldCallAction', this._onDidToggleHoldCallAction);
    RNCallKeep.addEventListener('didPerformDTMFAction', this._onDidPerformDTMFAction);
    RNCallKeep.addEventListener('didActivateAudioSession', this._onDidActivateAudioSession);
    RNCallKeep.addEventListener('didDeactivateAudioSession', this._onDidDeactivateAudioSession);
    RNCallKeep.addEventListener('didChangeAudioRoute', this._onDidChangeAudioRoute);
    RNCallKeep.addEventListener('didLoadWithEvents', this._onDidLoadWithEvents);
  }

  _onAnswerCall = async ({ callUUID }) => {
    console.log('RNCallKeep: answerCall', callUUID);
    // Retrieve call data associated with callUUID
    const callDataString = await AsyncStorage.getItem(`call_${callUUID}`);
    if (callDataString) {
      const callData = JSON.parse(callDataString);
      // Navigate to VoIPCallScreen with the retrieved data
      if (navigationRef.isReady()) {
        navigationRef.navigate('VoIPCallScreen', { ...callData, callUUID, isIncoming: true });
      }
      AsyncStorage.removeItem(`call_${callUUID}`); // Clean up stored data
    } else {
      console.warn(`No call data found for UUID: ${callUUID}`);
      // Fallback if data not found, maybe navigate to a generic call screen
      if (navigationRef.isReady()) {
        navigationRef.navigate('VoIPCallScreen', { callUUID, isIncoming: true });
      }
    }
    RNCallKeep.endCall(callUUID);
  };

  _onEndCall = async ({ callUUID }) => {
    console.log('RNCallKeep: endCall', callUUID);
    // Handle end call event
    // Clean up resources
    AsyncStorage.removeItem(`call_${callUUID}`); // Ensure data is removed on end call
  };

  _onDidDisplayIncomingCall = ({ callUUID, handle, name }) => {
    console.log('RNCallKeep: didDisplayIncomingCall', { callUUID, handle, name });
    // You might want to play a custom sound here
  };

  _onDidPerformSetMutedCallAction = ({ muted, callUUID }) => {
    console.log('RNCallKeep: didPerformSetMutedCallAction', { muted, callUUID });
    // Handle mute/unmute
  };

  _onDidToggleHoldCallAction = ({ hold, callUUID }) => {
    console.log('RNCallKeep: didToggleHoldCallAction', { hold, callUUID });
    // Handle hold/unhold
  };

  _onDidPerformDTMFAction = ({ digits, callUUID }) => {
    console.log('RNCallKeep: didPerformDTMFAction', { digits, callUUID });
    // Handle DTMF tones
  };

  _onDidActivateAudioSession = () => {
    console.log('RNCallKeep: didActivateAudioSession');
    // You might want to start audio playback here
  };

  _onDidDeactivateAudioSession = () => {
    console.log('RNCallKeep: didDeactivateAudioSession');
    // You might want to stop audio playback here
  };

  _onDidChangeAudioRoute = ({ uuid, input }) => {
    console.log('RNCallKeep: didChangeAudioRoute', { uuid, input });
    // Handle audio route changes (e.g., speaker, earpiece)
  };

  _onDidLoadWithEvents = async (events) => {
    console.log('RNCallKeep: didLoadWithEvents', events);
    // Process any pending events that occurred while the app was closed
    for (const event of events) {
      if (event.name === 'RNCallKeepDidReceiveStartCallAction') {
        // Handle incoming call when app is killed
        const { handle, callUUID, name } = event.data;
        // Assuming 'handle' contains the channelName and 'name' is the caller's first name
        // We need to reconstruct the full callData object
        const simulatedCallData = {
          channelName: handle,
          caller: { phoneNumber: handle, firstName: name },
          // Add other necessary fields if available in event.data or from a stored context
        };
        await AsyncStorage.setItem(`call_${callUUID}`, JSON.stringify(simulatedCallData));
        RNCallKeep.displayIncomingCall(callUUID, handle, name, 'generic', true);
        // Navigation will happen on 'answerCall' event
      }
    }
  };

  displayIncomingCall(callData) {
    const { channelName, caller, callType, orderData } = callData;
    const callUUID = uuidv4();
    this.currentCallUUID = callUUID;

    AsyncStorage.setItem(`call_${callUUID}`, JSON.stringify({ channelName, caller, callType, orderData }));

    RNCallKeep.displayIncomingCall(
      callUUID,
      caller.phoneNumber,
      caller.firstName,
      'generic',
      true // selfManaged
    );
    console.log('Displayed incoming call via CallKeep:', callUUID);
    return callUUID;
  }

  endCall(callUUID) {
    RNCallKeep.endCall(callUUID);
    console.log('Ended call via CallKeep:', callUUID);
  }

  endAllCalls() {
    RNCallKeep.endAllCalls();
    console.log('Ended all calls via CallKeep');
  }
}

export default new VoIPManager();


