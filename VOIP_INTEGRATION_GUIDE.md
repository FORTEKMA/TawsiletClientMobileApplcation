# VoIP Integration Guide for Tawsilet

## Overview

This guide explains the VoIP (Voice over IP) integration in the Tawsilet mobile application, which enables voice and video calls between clients and drivers using Agora SDK and OneSignal notifications.

## Architecture

### Components

1. **Agora SDK** - Handles real-time voice and video communication
2. **OneSignal** - Sends push notifications to drivers for incoming calls
3. **VoIPManager** - Utility functions for call notifications and management
4. **VoIPCallScreen** - Main call interface for users

### Flow Diagram

```
Client Initiates Call
       ↓
Generate Unique Channel Name
       ↓
Send OneSignal Notification to Driver
       ↓
Driver Receives Notification
       ↓
Driver Joins Agora Channel
       ↓
Establish VoIP Connection
       ↓
Handle Call Actions (Accept/Decline/End)
       ↓
Send Action Notifications
```

## Key Features

### 1. Call Notifications

The system sends OneSignal notifications to drivers when clients initiate calls:

```javascript
// Example notification payload
{
  app_id: ONESIGNAL_DRIVER_APP_ID,
  include_aliases: {
    external_id: [String(driverId)]
  },
  headings: {
    en: 'Voice Call',
    ar: 'مكالمة صوتية',
    fr: 'Appel vocal'
  },
  contents: {
    en: 'John is calling you',
    ar: 'جون يتصل بك',
    fr: 'John vous appelle'
  },
  data: {
    type: "voip_call",
    callType: "voice",
    channelName: "tawsilet_voip_123_456_789_1234567890",
    caller: {
      id: "user123",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "+1234567890"
    }
  }
}
```

### 2. Channel Name Generation

Unique channel names are generated for each call to ensure secure communication:

```javascript
// Format: tawsilet_voip_{orderId}_{driverId}_{callerId}_{timestamp}
const channelName = `tawsilet_voip_${orderId}_${driverId}_${callerId}_${timestamp}`;
```

### 3. Call Actions

The system handles three main call actions:

- **Accept** - Driver accepts the incoming call
- **Decline** - Driver declines the incoming call  
- **End** - Either party ends the active call

Each action sends a corresponding OneSignal notification to keep both parties informed.

## Implementation Details

### VoIPManager Utility

Located at `src/utils/VoIPManager.js`, this utility provides:

- `sendVoIPCallNotification()` - Send initial call notifications
- `sendVoIPCallActionNotification()` - Send action notifications
- `generateVoIPChannelName()` - Generate unique channel names
- `validateVoIPCallParams()` - Validate call parameters

### VoIPCallScreen

Located at `src/screens/VoIPCallScreen/index.js`, this component:

- Manages call state and UI
- Handles Agora SDK integration
- Sends notifications at appropriate times
- Provides call controls (mute, speaker, video toggle)

### Environment Configuration

Required environment variables in `.env`:

```env
ONESIGNAL_APP_ID=e71c2a66-73f5-4e3b-b8a0-e58bf6f52ec0
ONESIGNAL_DRIVER_APP_ID=87722266-09fa-4a1f-a5f4-e1ef4aefa03d
ONESIGNAL_DRIVER_APP_API_KEY=os_v2_app_q5zcezqj7jfb7jpu4hxuv35ahxdci3erpime6heocseppjvuztl72dqiaqjukutop3dklgilac3m53leqsvkhnjdc5tkspsarhjlaky
```

## Usage Examples

### Initiating a Call

```javascript
// Navigate to VoIP call screen
navigation.navigate('VoIPCallScreen', {
  driverData: {
    id: 'driver123',
    name: 'John Driver',
    // ... other driver data
  },
  callType: 'voice', // or 'video'
  orderId: 'order456',
  orderData: {
    // ... order information
  },
  isIncoming: false
});
```

### Handling Incoming Calls

```javascript
// For incoming calls
navigation.navigate('VoIPCallScreen', {
  driverData: driverData,
  callType: 'voice',
  isIncoming: true,
  orderId: orderId,
  orderData: orderData
});
```

## Notification Channels

### Android Notification Channel

The system uses a dedicated notification channel for VoIP calls:

```javascript
android_channel_id: 'voip_calls'
android_accent_color: "#4CAF50"
```

### iOS Notification Settings

```javascript
ios_badgeType: "Increase"
ios_badgeCount: 1
ios_sound: "notification_sound.wav"
```

## Error Handling

### Common Error Scenarios

1. **Driver ID Missing**
   ```javascript
   if (!finalDriverData?.id) {
     console.error('Driver ID not available for notification');
     return;
   }
   ```

2. **Invalid Call Parameters**
   ```javascript
   if (!validateVoIPCallParams(callParams)) {
     console.error('Invalid VoIP call parameters');
     return;
   }
   ```

3. **Agora SDK Not Available**
   ```javascript
   if (!isAgoraSDKAvailable()) {
     setCallStatus('connected');
     // Fallback to demo mode
     return;
   }
   ```

## Security Considerations

### Channel Security

- Unique channel names prevent unauthorized access
- Timestamp-based generation ensures uniqueness
- Order-specific channels limit access to relevant parties

### Token Authentication

```javascript
// Get Agora token from backend
const token = await getAgoraToken(channelName, uid);
```

### Data Validation

All call parameters are validated before processing:

```javascript
const requiredFields = ['driverId', 'caller', 'channelName'];
for (const field of requiredFields) {
  if (!params[field]) {
    console.error(`Missing required field for VoIP call: ${field}`);
    return false;
  }
}
```

## Testing

### Test Scenarios

1. **Outgoing Call Flow**
   - Client initiates call
   - Driver receives notification
   - Driver accepts/declines
   - Call connects or ends

2. **Incoming Call Flow**
   - Driver initiates call
   - Client receives notification
   - Client accepts/declines
   - Call connects or ends

3. **Call Actions**
   - Mute/unmute
   - Speaker toggle
   - Video toggle
   - End call

### Debug Logging

Enable debug logging by checking console output:

```javascript
console.log('Call notification sent successfully:', response.data);
console.log('VoIP call action notification sent successfully:', response.data);
console.log('Agora Engine initialized successfully');
```

## Troubleshooting

### Common Issues

1. **Notifications Not Received**
   - Check OneSignal App ID configuration
   - Verify driver external ID mapping
   - Check network connectivity

2. **Call Connection Issues**
   - Verify Agora App ID configuration
   - Check microphone/camera permissions
   - Ensure stable internet connection

3. **Channel Join Failures**
   - Verify token generation
   - Check channel name format
   - Ensure Agora SDK is properly initialized

### Debug Commands

```bash
# Check environment variables
echo $ONESIGNAL_DRIVER_APP_ID
echo $ONESIGNAL_DRIVER_APP_API_KEY

# Test OneSignal API
curl -X POST https://onesignal.com/api/v1/notifications \
  -H "Authorization: Basic YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"app_id":"YOUR_APP_ID","include_aliases":{"external_id":["test"]},"contents":{"en":"Test"}}'
```

## Future Enhancements

### Planned Features

1. **Call Recording** - Record calls for quality assurance
2. **Call Analytics** - Track call duration, quality metrics
3. **Group Calls** - Support for multiple participants
4. **Call Scheduling** - Schedule calls for later
5. **Call History** - Store and display call logs

### Performance Optimizations

1. **Connection Pooling** - Reuse Agora connections
2. **Notification Batching** - Batch multiple notifications
3. **Offline Support** - Handle offline scenarios gracefully
4. **Battery Optimization** - Minimize battery usage during calls

## Support

For technical support or questions about the VoIP integration:

1. Check the console logs for error messages
2. Verify environment variable configuration
3. Test with a simple call scenario
4. Contact the development team with specific error details

## Related Files

- `src/screens/VoIPCallScreen/index.js` - Main call interface
- `src/utils/VoIPManager.js` - VoIP utility functions
- `src/utils/AgoraConfig.js` - Agora SDK configuration
- `.env` - Environment variables
- `android/app/src/main/AndroidManifest.xml` - Android permissions
- `ios/Tawsilet/Info.plist` - iOS permissions 