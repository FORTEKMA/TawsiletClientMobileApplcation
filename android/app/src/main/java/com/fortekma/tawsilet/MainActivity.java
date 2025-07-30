package com.fortekma.tawsilet;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import android.os.Bundle; // here
import com.facebook.FacebookSdk;
import org.devio.rn.splashscreen.SplashScreen;
import android.content.Intent;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.media.AudioAttributes;
import android.content.ContentResolver;
import android.net.Uri;
import android.util.Log;

public class MainActivity extends ReactActivity {

  private static final String TAG = "MainActivity";

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "Tawsilet";
  }

  /**
   * Returns the instance of the {@link ReactActivityDelegate}. Here we use a util class {@link
   * DefaultReactActivityDelegate} which allows you to easily enable Fabric and Concurrent React
   * (aka React 18) with two boolean flags.
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
        this,
        getMainComponentName(),
        // If you opted-in for the New Architecture, we enable the Fabric Renderer.
        DefaultNewArchitectureEntryPoint.getFabricEnabled());
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    try {
      SplashScreen.show(this, R.style.SplashScreen_SplashTheme, R.id.lottie);
      SplashScreen.setAnimationFinished(true);
      
      // Create notification channels for Android 8.0+
      createNotificationChannels();
    } catch (Exception e) {
      Log.e(TAG, "Error in onCreate: " + e.getMessage(), e);
    }
  }

  private void createNotificationChannels() {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        NotificationManager notificationManager = getSystemService(NotificationManager.class);
        
        if (notificationManager == null) {
          Log.e(TAG, "NotificationManager is null");
          return;
        }
        
        // VoIP Calls Channel
        NotificationChannel voipChannel = new NotificationChannel(
            "voip_calls",
            "VoIP Calls",
            NotificationManager.IMPORTANCE_HIGH
        );
        voipChannel.setDescription("Incoming voice and video calls");
        voipChannel.enableVibration(true);
        voipChannel.setVibrationPattern(new long[]{0, 1000, 500, 1000});
        // Use default notification sound
        voipChannel.setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI, 
            new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                .build());
        voipChannel.setShowBadge(true);
        voipChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        notificationManager.createNotificationChannel(voipChannel);
        
        // General Notifications Channel
        NotificationChannel generalChannel = new NotificationChannel(
            "general",
            "General Notifications",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        generalChannel.setDescription("General app notifications");
        notificationManager.createNotificationChannel(generalChannel);
        
        // CallKeep specific channel
        NotificationChannel callKeepChannel = new NotificationChannel(
            "callkeep",
            "CallKeep Notifications",
            NotificationManager.IMPORTANCE_HIGH
        );
        callKeepChannel.setDescription("CallKeep incoming call notifications");
        callKeepChannel.enableVibration(true);
        callKeepChannel.setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI,
            new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                .build());
        callKeepChannel.setShowBadge(true);
        callKeepChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        notificationManager.createNotificationChannel(callKeepChannel);
        
        Log.d(TAG, "Notification channels created successfully");
      }
    } catch (Exception e) {
      Log.e(TAG, "Error creating notification channels: " + e.getMessage(), e);
    }
  }

  @Override
  public void onNewIntent(Intent intent) {
    try {
      super.onNewIntent(intent);
      setIntent(intent);
    } catch (Exception e) {
      Log.e(TAG, "Error in onNewIntent: " + e.getMessage(), e);
    }
  }
}


