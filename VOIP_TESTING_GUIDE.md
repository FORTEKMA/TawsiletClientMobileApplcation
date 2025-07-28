# VoIP Testing Guide for Tawsilet App

This guide provides comprehensive instructions for testing the VoIP calling functionality on both Android and iOS platforms.

## 🚀 Quick Start

### Prerequisites
1. **Agora Account**: Sign up at [https://console.agora.io/](https://console.agora.io/)
2. **App ID**: Get your Agora App ID from the console
3. **Real Devices**: VoIP testing requires real devices, not emulators
4. **Network**: Stable internet connection on both devices

### Configuration Steps
1. Replace `YOUR_AGORA_APP_ID_HERE` in `src/utils/AgoraConfig.js`
2. Install react-native-agora: `npm install react-native-agora`
3. Configure platform-specific permissions (see below)
4. Build and install on real devices

## 📱 Android Testing

### 1. Permissions Setup
Add these permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- VoIP Call Permissions -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.INTERNET" />
```

### 2. ProGuard Configuration
Add to `android/app/proguard-rules.pro`:
```
-keep class io.agora.**{*;}
-dontwarn io.agora.**
```

### 3. Build and Test
```bash
# Clean and build
cd android
./gradlew clean
cd ..
npx react-native run-android --variant=release
```

### 4. Android Testing Checklist
- [ ] App requests microphone permission on first call
- [ ] App requests camera permission for video calls
- [ ] Audio works in both directions
- [ ] Speaker/earpiece toggle works
- [ ] Mute/unmute functionality works
- [ ] Video enable/disable works (if applicable)
- [ ] Camera switch works (front/back)
- [ ] Call quality indicators update
- [ ] Network quality detection works
- [ ] Call ends properly
- [ ] Background/foreground transitions work
- [ ] Bluetooth headset support (if available)

## 🍎 iOS Testing

### 1. Permissions Setup
Add these to `ios/YourApp/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app needs access to microphone for voice calls with drivers</string>

<key>NSCameraUsageDescription</key>
<string>This app needs access to camera for video calls with drivers</string>

<!-- Optional: For background VoIP -->
<key>UIBackgroundModes</key>
<array>
    <string>voip</string>
    <string>audio</string>
</array>
```

### 2. Podfile Setup
Add to `ios/Podfile`:
```ruby
pod 'react-native-agora', path: '../node_modules/react-native-agora'
```

Then run:
```bash
cd ios && pod install
```

### 3. Build and Test
```bash
# Clean and build
npx react-native run-ios --configuration Release
```

### 4. iOS Testing Checklist
- [ ] App requests microphone permission on first call
- [ ] App requests camera permission for video calls
- [ ] Audio works in both directions
- [ ] Speaker/earpiece toggle works
- [ ] Mute/unmute functionality works
- [ ] Video enable/disable works (if applicable)
- [ ] Camera switch works (front/back)
- [ ] Call quality indicators update
- [ ] Network quality detection works
- [ ] Call ends properly
- [ ] Background/foreground transitions work
- [ ] CallKit integration (if implemented)
- [ ] AirPods/Bluetooth headset support

## 🧪 Test Scenarios

### Basic Call Flow Testing
1. **Outgoing Call**
   - User A initiates call to User B
   - User B receives incoming call notification
   - User B accepts call
   - Both users can hear each other
   - Either user can end the call

2. **Incoming Call**
   - User B initiates call to User A
   - User A receives incoming call notification
   - User A can accept or decline
   - Test both accept and decline flows

3. **Call Controls**
   - Mute/unmute during call
   - Speaker on/off during call
   - Video enable/disable during call
   - Camera switch during video call

### Advanced Testing
1. **Network Conditions**
   - Test on WiFi
   - Test on 4G/5G
   - Test with poor network (simulate with network tools)
   - Test network switching during call

2. **Interruption Handling**
   - Incoming phone call during VoIP call
   - App backgrounding during call
   - Device rotation during call
   - Bluetooth connect/disconnect during call

3. **Edge Cases**
   - Very short calls (< 5 seconds)
   - Long calls (> 30 minutes)
   - Multiple rapid call attempts
   - Call while another call is active

## 🔧 Debugging

### Common Issues and Solutions

#### Android Issues
1. **No Audio**
   - Check RECORD_AUDIO permission
   - Verify audio focus handling
   - Test with different audio routes

2. **Video Not Working**
   - Check CAMERA permission
   - Verify camera is not used by another app
   - Test camera switch functionality

3. **Connection Issues**
   - Verify Agora App ID is correct
   - Check network connectivity
   - Review Agora console for errors

#### iOS Issues
1. **Permission Denied**
   - Check Info.plist descriptions
   - Reset privacy settings in iOS Settings
   - Reinstall app after permission changes

2. **Audio Interruptions**
   - Configure audio session properly
   - Handle audio session interruptions
   - Test with different audio routes

3. **Background Issues**
   - Configure background modes
   - Handle app state transitions
   - Test background audio continuation

### Logging and Monitoring
1. **Enable Agora Logs**
   ```javascript
   // Add to VoIPManager initialization
   await this.agoraEngine.setLogLevel(0); // All logs
   ```

2. **Monitor Network Quality**
   - Watch network quality callbacks
   - Log quality changes
   - Adjust video quality based on network

3. **Track Call Statistics**
   - Monitor RTC stats
   - Log call duration and quality
   - Track connection success rates

## 📊 Performance Testing

### Metrics to Monitor
- Call connection time (should be < 3 seconds)
- Audio latency (should be < 200ms)
- Video frame rate (should maintain target FPS)
- CPU usage during calls
- Memory usage during calls
- Battery consumption during calls

### Testing Tools
- **Android**: Use `adb logcat` for logs
- **iOS**: Use Xcode console for logs
- **Network**: Use Charles Proxy or similar
- **Performance**: Use platform-specific profiling tools

## 🚀 Production Deployment

### Before Going Live
1. **Token Server Setup**
   - Implement secure token generation
   - Configure token expiration
   - Handle token refresh

2. **Security**
   - Enable call encryption
   - Implement user authentication
   - Secure API endpoints

3. **Monitoring**
   - Set up call quality monitoring
   - Implement error tracking
   - Monitor success rates

4. **Compliance**
   - Review privacy policies
   - Ensure GDPR/CCPA compliance
   - Test in target markets

### Load Testing
- Test with multiple concurrent calls
- Monitor server performance
- Test token generation under load
- Verify database performance

## 📞 Support and Resources

### Agora Resources
- [Agora Documentation](https://docs.agora.io/)
- [React Native SDK Guide](https://docs.agora.io/en/Voice/start_call_audio_react_native)
- [API Reference](https://docs.agora.io/en/Voice/API%20Reference/react_native/index.html)

### Troubleshooting
- [Agora FAQ](https://docs.agora.io/en/faq)
- [Common Issues](https://docs.agora.io/en/help/integration-issues)
- [Performance Optimization](https://docs.agora.io/en/help/quality-issues)

### Community
- [Agora Developer Community](https://www.agora.io/en/community/)
- [GitHub Issues](https://github.com/AgoraIO-Community/react-native-agora/issues)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/agora.io)

---

## 🎯 Testing Checklist Summary

### Pre-Testing
- [ ] Agora App ID configured
- [ ] react-native-agora installed
- [ ] Platform permissions configured
- [ ] Real devices available
- [ ] Stable network connection

### Core Functionality
- [ ] Outgoing calls work
- [ ] Incoming calls work
- [ ] Audio quality is good
- [ ] Call controls work
- [ ] Calls end properly

### Platform Specific
- [ ] Android permissions work
- [ ] iOS permissions work
- [ ] Platform-specific features tested
- [ ] Background behavior correct

### Edge Cases
- [ ] Network switching tested
- [ ] Interruption handling works
- [ ] Long calls stable
- [ ] Multiple calls handled

### Performance
- [ ] Connection time acceptable
- [ ] Audio latency low
- [ ] CPU usage reasonable
- [ ] Memory usage stable

### Production Ready
- [ ] Token server implemented
- [ ] Security measures in place
- [ ] Monitoring configured
- [ ] Load testing completed

---

**Remember**: VoIP functionality requires real devices and network conditions. Emulator testing is not sufficient for production validation.

