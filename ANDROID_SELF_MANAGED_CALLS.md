# Android Self-Managed Calls Implementation

## Overview

When `selfManaged: true` is set in CallKeep configuration on Android, the system doesn't automatically display call notifications. Instead, you need to handle the incoming call display yourself using the CallKeep listeners and a full-screen notification library.

## Implementation Details

### 1. CallKeep Configuration

```javascript
const options = {
  android: {
    selfManaged: true, // Enable self-managed mode
    // ... other options
  }
};
```

### 2. Full-Screen Notification API

The library uses the following API methods:

- `RNNotificationCall.displayNotification(uid, avatar, timeout, foregroundOptions)` - Display incoming call
- `RNNotificationCall.hideNotification()` - Hide the notification
- `RNNotificationCall.addEventListener('answer', handler)` - Listen for answer events
- `RNNotificationCall.addEventListener('endCall', handler)` - Listen for end call events
- `RNNotificationCall.removeEventListener('answer')` - Remove event listeners
- `RNNotificationCall.backToApp()` - Return to app after answering

### 2. Full-Screen Notification Library

We use `react-native-full-screen-notification-incoming-call` to display incoming calls when the app is in the background or killed.

### 3. Call Flow

1. **Incoming Call Received**: FCM message triggers `displayIncomingCall()`
2. **CallKeep Display**: CallKeep displays the native call UI first
3. **Listener Triggered**: `_onDidDisplayIncomingCall` listener is triggered
4. **Full-Screen Notification**: Show full-screen notification with answer/reject buttons
5. **User Action**: Handle answer/reject through notification callbacks
6. **Navigation**: Navigate to VoIPCallScreen when answered
7. **Cleanup**: Hide notification and clean up resources

### 4. Key Methods

#### `_onDidDisplayIncomingCall()`
- Triggered after CallKeep displays the call
- Shows full-screen notification for enhanced UI
- Retrieves call data from AsyncStorage
- Sets up event listeners for user interactions

#### `endCall()` and `endAllCalls()`
- Hide full-screen notification
- End call via CallKeep
- Clean up resources

### 5. Notification Configuration

```javascript
const foregroundOptions = {
  channelId: 'com.tawsilet.incomingcall',
  channelName: 'Incoming call',
  notificationIcon: 'ic_launcher', // mipmap icon
  notificationTitle: caller.firstName || 'Incoming Call',
  notificationBody: caller.phoneNumber || channelName,
  answerText: 'Answer',
  declineText: 'Decline',
  notificationColor: 'colorAccent',
  isVideo: false, // Set to true for video calls
  notificationSound: null, // You can add custom sound file
  payload: JSON.stringify({ callUUID, channelName, caller })
};

// Display the notification
RNNotificationCall.displayNotification(
  callUUID,
  null, // avatar URL (optional)
  30000, // timeout in milliseconds (30 seconds)
  foregroundOptions
);
```

## Testing

### Manual Test
```javascript
// Test self-managed Android call
const testCallData = {
  channelName: 'test-channel-123',
  caller: {
    phoneNumber: '+1234567890',
    firstName: 'Test Caller'
  },
  callType: 'incoming',
  orderData: { orderId: 'test-order-123' }
};

VoIPManager.displayIncomingCall(testCallData);
```

### Automated Test
```javascript
VoIPManager.testCallKeep(); // Tests appropriate method based on platform
```

## Installation Steps

### 1. Install the Library
```bash
yarn add react-native-full-screen-notification-incoming-call
```

### 2. Android Configuration

#### Add Permissions to `android/app/src/main/AndroidManifest.xml`
```xml
<!-- Permissions for react-native-full-screen-notification-incoming-call -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL" />
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
<uses-permission android:name="android.permission.DISABLE_KEYGUARD" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

#### Add Activities and Service to `android/app/src/main/AndroidManifest.xml`
```xml
<!-- Full Screen Notification Incoming Call Activities and Service -->
<activity 
  android:name="com.reactnativefullscreennotificationincomingcall.IncomingCallActivity"
  android:theme="@style/incomingCall"
  android:launchMode="singleTask"
  android:excludeFromRecents="true"
  android:exported="false"
  android:showWhenLocked="true"
  android:turnScreenOn="true" />
  
<activity 
  android:name="com.reactnativefullscreennotificationincomingcall.NotificationReceiverActivity"
  android:theme="@style/incomingCall"
  android:launchMode="singleTask"
  android:excludeFromRecents="true"
  android:exported="false"
  android:showWhenLocked="true"
  android:turnScreenOn="true" />
  
<service
  android:name="com.reactnativefullscreennotificationincomingcall.IncomingCallService"
  android:enabled="true"
  android:stopWithTask="false"
  android:foregroundServiceType="phoneCall"
  android:exported="false" />
```

#### Add Style to `android/app/src/main/res/values/styles.xml`
```xml
<!-- Full Screen Notification Incoming Call Theme -->
<style name="incomingCall" parent="Theme.AppCompat.Light.NoActionBar">
    <!-- Customize status bar color -->
    <item name="colorPrimaryDark">#000000</item>
</style>
```

### 3. Permissions Required

The following permissions are configured in `AndroidManifest.xml`:

- `MANAGE_OWN_CALLS`
- `FOREGROUND_SERVICE`
- `READ_CALL_LOG`
- `READ_PHONE_NUMBERS`
- `CALL_PHONE`
- `ANSWER_PHONE_CALLS`
- `POST_NOTIFICATIONS` (Android 12+)
- `SYSTEM_ALERT_WINDOW`
- `FOREGROUND_SERVICE_PHONE_CALL`
- `USE_FULL_SCREEN_INTENT`
- `DISABLE_KEYGUARD`
- `WAKE_LOCK`

### 4. Rebuild the App

After making these changes, you need to rebuild the Android app:

```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx react-native run-android
```

**Note**: The full-screen notification library requires these Android configuration changes to work properly. Without them, the library may not function correctly or may cause crashes.

## Troubleshooting

### Common Issues

1. **Notification not showing**: Check if `selfManaged: true` is set
2. **Call not ending**: Ensure `IncomingCall.hide()` is called
3. **Navigation not working**: Verify `navigationRef.isReady()` before navigating
4. **Permissions denied**: Check Android permissions in app settings
5. **App crashes on incoming call**: Ensure all Android configuration steps are completed
6. **Full-screen notification not appearing**: Verify activities and service are properly configured in AndroidManifest.xml
7. **Black screen on incoming call**: Check if the `incomingCall` style is properly defined in styles.xml
8. **Notification doesn't wake screen**: Ensure `showWhenLocked="true"` and `turnScreenOn="true"` are set
9. **API errors**: Ensure you're using the correct API methods (`displayNotification`, `hideNotification`) instead of `show`/`hide`
10. **Event listeners not working**: Make sure to add event listeners after displaying the notification

### Debug Logs

Enable debug logging to track call flow:
```javascript
console.log('Displaying self-managed Android call with full-screen notification');
console.log('Call answered via full-screen notification');
console.log('Call rejected via full-screen notification');
```

## Platform Differences

- **iOS**: Uses regular CallKeep with `selfManaged: false`
- **Android**: Uses self-managed mode with full-screen notifications

## Future Enhancements

1. Add custom ringtone support
2. Implement call duration tracking
3. Add call history integration
4. Support for multiple simultaneous calls
5. Enhanced notification styling options 