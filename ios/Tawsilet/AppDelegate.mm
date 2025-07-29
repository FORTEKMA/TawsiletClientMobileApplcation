#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <Firebase.h>
#import "RNSplashScreen.h"  // here
#import <GoogleMaps/GoogleMaps.h>
#import "StallionModule.h"

#import <AuthenticationServices/AuthenticationServices.h>
#import <SafariServices/SafariServices.h>
#import "RNSplashScreen.h"
#import "Tawsilet-Swift.h"

#import <RNCallKeep/RNCallKeep.h>
#import <react_native_voip_push_notification/RNVoipPushNotificationManager.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"Tawsilet";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};
  [FIRApp configure];
  [GMSServices provideAPIKey:@"AIzaSyA8oEc5WKQqAXtSKpSH4igelH5wlPDaowE"]; // add this line using the api key obtained from Google Console

  // Configure Apple Sign In
  if (@available(iOS 13.0, *)) {
    ASAuthorizationAppleIDProvider *provider = [[ASAuthorizationAppleIDProvider alloc] init];
    [provider getCredentialStateForUserID:[[NSUserDefaults standardUserDefaults] stringForKey:@"appleUserID"]
                              completion:^(ASAuthorizationAppleIDProviderCredentialState credentialState, NSError * _Nullable error) {
      if (credentialState == ASAuthorizationAppleIDProviderCredentialRevoked) {
        // Handle revoked credentials
        [[NSUserDefaults standardUserDefaults] removeObjectForKey:@"appleUserID"];
      }
    }];
  }

  [super application:application didFinishLaunchingWithOptions:launchOptions];
  UIView *rootView = self.window.rootViewController.view;
  rootView.backgroundColor = [UIColor colorWithRed:12/255.0 green:12/255.0 blue:12/255.0 alpha:1.0]; // #0c0c0c

  Dynamic *t = [Dynamic new];
  UIView *animationUIView = (UIView *)[t createAnimationViewWithRootView:rootView lottieName:@"loading"];
  [RNSplashScreen showLottieSplash:animationUIView inRootView:rootView];

  LottieAnimationView *animationView = (LottieAnimationView *) animationUIView;
  [t playWithAnimationView:animationView];
  [RNSplashScreen setAnimationFinished:true];

  // VoIP Push Notification setup
  [[RNVoipPushNotificationManager sharedInstance] didFinishLaunchingWithOptions:launchOptions];

  return YES;
}

- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  [[RNVoipPushNotificationManager sharedInstance] didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  [[RNVoipPushNotificationManager sharedInstance] didFailToRegisterForRemoteNotificationsWithError:error];
}

- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler {
  [[RNVoipPushNotificationManager sharedInstance] didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
}

- (void)pushRegistry:(PKPushRegistry *)registry didReceiveIncomingPushWithPayload:(PKPushPayload *)payload forType:(NSString *)type completion:(void (^)(void))completion {
  [[RNVoipPushNotificationManager sharedInstance] didReceiveIncomingPushWithPayload:payload forType:type completion:completion];
}

- (NSURL *)bundleURL
  {
    #if DEBUG
      return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
    #else
      return [StallionModule getBundleURL];
    #endif
  }

  - (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
      return [StallionModule getBundleURL];
#endif
}


@end


