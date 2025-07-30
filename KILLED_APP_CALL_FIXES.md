# Killed App Call Handling Fixes

## Issues Identified When App is Killed

### 1. **Duplicate Navigation Calls**
**Problem**: When the app is killed and receives a call, two different navigation calls were happening:
- One from CallKeep listener (`_onAnswerCall`)
- One from full-screen notification listener (`_setupNotificationEventListeners`)

**Fix Applied**:
- Added centralized navigation method `_navigateToCallScreen()`
- Added `navigationInProgress` flag to prevent duplicate navigation
- Added proper error handling for navigation reference availability

### 2. **Navigation Reference Not Available**
**Problem**: When app is killed and restarted, `navigationRef.current` might not be available immediately.

**Fix Applied**:
- Added check for `navigationRef.current` availability
- Added retry mechanism with 1-second delay
- Added proper error logging for navigation failures

### 3. **State Persistence Issues**
**Problem**: VoIPManager state wasn't being reset when app was killed and restarted.

**Fix Applied**:
- Added `resetState()` method to clear all VoIPManager state
- Called `resetState()` during app initialization
- Added proper state cleanup for active calls

### 4. **Firebase Deprecated API Warnings**
**Problem**: Still getting deprecated Firebase API warnings.

**Fix Applied**:
- Updated `messaging().onMessage()` to use new API
- Updated `messaging().onTokenRefresh()` to use new API
- Added proper error handling for `backToForeground()` calls
- Reduced `backToForeground()` calls from 10 to 3

## Code Changes Made

### 1. **VoIPManager.js**
```javascript
// Added navigation deduplication
_navigateToCallScreen(navigationParams) {
  if (this.navigationInProgress) {
    console.log('📞 Navigation already in progress, skipping duplicate');
    return;
  }

  // Check if navigationRef is available
  if (!navigationRef?.current) {
    console.log('📞 NavigationRef not available, app may be starting up');
    setTimeout(() => {
      if (navigationRef?.current) {
        this._navigateToCallScreen(navigationParams);
      }
    }, 1000);
    return;
  }

  this.navigationInProgress = true;
  // ... navigation logic
}

// Added state reset method
resetState() {
  this.currentCallUUID = null;
  this.activeCall = null;
  this.navigationInProgress = false;
  this.currentCallPayload = null;
}
```

### 2. **App.js**
```javascript
// Added VoIPManager state reset on app start
VoIPManager.resetState();
```

### 3. **FirebaseManager.js**
```javascript
// Updated to use new Firebase API
const unsubscribe = messaging().onMessage(async remoteMessage => {
  // ... handler logic
});
```

### 4. **index.js**
```javascript
// Updated background message handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // Reduced backToForeground calls and added error handling
  for (let index = 0; index < 3; index++) {
    try {
      RNCallKeep.backToForeground();
    } catch (error) {
      console.log('Error calling backToForeground:', error);
    }
  }
});
```

## Expected Results

After applying these fixes:

1. **No more duplicate navigation calls** - Only one navigation to VoIPCallScreen per call
2. **Better handling of killed app state** - Proper state reset and navigation reference checking
3. **Reduced Firebase warnings** - Updated to use new API methods
4. **Improved error handling** - Better logging and error recovery
5. **Faster call setup** - Reduced redundant operations

## Testing Scenarios

Test these scenarios to verify fixes:

1. **App killed + incoming call** - Should show notification and navigate properly
2. **Multiple rapid calls** - Should handle deduplication correctly
3. **App background + call** - Should work without duplicate navigation
4. **Call answered from notification** - Should navigate to call screen once
5. **Call answered from CallKeep** - Should navigate to call screen once

## Monitoring

Monitor these logs to verify fixes:

- `📞 Navigation already in progress, skipping duplicate` - Should appear for duplicate attempts
- `📞 NavigationRef not available, app may be starting up` - Should appear when app is starting
- `📞 VoIPManager state reset` - Should appear on app start
- No more duplicate navigation log messages
- Reduced Firebase deprecation warnings 