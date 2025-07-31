import React, {useEffect, useState} from 'react';
 
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  Platform,
  SafeAreaView,
  I18nManager,
  AppState
} from 'react-native';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import * as amplitude from '@amplitude/analytics-react-native';
import {persistStore} from 'redux-persist';
import {PersistGate} from 'redux-persist/integration/react';
import 'react-native-gesture-handler';
import { withStallion, useStallionUpdate, restart } from 'react-native-stallion';
import Toast from 'react-native-toast-message';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {  processNavigationQueue,navigationRef } from './navigators/navigationRef';
 
import { checkVersion } from "react-native-check-version";
import UpdateBlockScreen from "./components/UpdateBlockScreen"
import store from './store';
import {ONESIGNAL_APP_ID} from '@env';
import {Provider} from 'react-redux';
import {NativeBaseProvider} from 'native-base';
import MainNavigator from './navigators/Main';
import {OneSignal} from 'react-native-onesignal';
import {colors} from './utils/colors';
import './local';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import PopOver from './components/PopOver';
import {ModalPortal} from 'react-native-modals';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "./local";
import CheckConnection from './components/CheckConnection';
import LottieSplashScreen from '@attarchi/react-native-lottie-splash-screen';
import api, { setStoreReference } from './utils/api';
import chatService from './utils/chatService';

import VoIPManager from './utils/VoIPManager';
import FirebaseManager from './utils/FirebaseManager';

// Only initialize Sentry in production mode
if (!__DEV__) {
  Sentry.init({
    dsn: 'https://06ca632b0190704d22beae416f99b03e@o4509329011572736.ingest.de.sentry.io/4509329041588304',
    release: "1.4.1", // Must match versionName in build.gradle
    dist: "5", // Must match versionCode in build.gradle
    enableNative: true,
    debug: false, // Disable debug mode in production
    environment: 'production',
  });
}

amplitude.init('d977e9d7ccb4617cd9e2a90ec1d95e27');
let persistor = persistStore(store);

// Set store reference for API module
setStoreReference(store);

// Set store reference for chat service
chatService.setStore(store);

const App=()=> {
  useKeepAwake();
  const { isRestartRequired } = useStallionUpdate();
   const [isModalVisible, setModalVisible] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [updateRequired, setUpdateRequired] = useState(false);
  const [storeUrl, setStoreUrl] = useState(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const setupLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem("language");
      const language = savedLanguage || "fr";
      await i18n.changeLanguage(language);
      const isRTL = i18n.dir(language) === "rtl";
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    } catch (error) {
      console.error("Error setting up language:", error);
    }
  };

  useEffect(() => {
    if (isRestartRequired) {
      restart();
    }
  }, [isRestartRequired]);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized) return;
    setIsInitialized(true);
   
    OneSignal.initialize(ONESIGNAL_APP_ID);
    OneSignal.User.setLanguage("fr");
    OneSignal.Notifications.requestPermission(true)
    
    // Reset VoIPManager state in case app was killed
    VoIPManager.resetState();
    
    // Setup CallKeep using VoIPManager with error handling
    try {
      console.log('Setting up CallKeep...');
      VoIPManager.setupCallKeep();
      console.log('CallKeep setup completed successfully');
      
  
      
    } catch (error) {
      console.error('Error setting up CallKeep:', error);
    }
    
    try {
      console.log('Setting up FirebaseManager...');
      FirebaseManager.setTokenCallback(token => {
        console.log('FCM Device Token:', token);
        // Optionally, send this token to your backend here
      });
      FirebaseManager.setup().then(() => {
        console.log('FirebaseManager setup completed');
      }).catch(error => {
        console.error('Error setting up FirebaseManager:', error);
      });
    } catch (error) {
      console.error('Error setting up FirebaseManager:', error);
    }

    // Add notification opened handler
    OneSignal.Notifications.addEventListener('click', (event) => {
      try {
        const data = event?.notification?.additionalData || event?.notification?.data || {};
        
        // Handle regular order notifications
        const commandId = data.commandId || data.command_id || data.id;
        if (commandId ) {
          navigationRef.navigate('OrderDetails', { id: commandId });
        }

     
      } catch (e) {
        console.error('Error handling notification open:', e);
      }
    });

 

    setupLanguage()

    // Maintenance check
  
      api.get('/parameters').then((res) => {
        const params = res?.data?.data?.[0];
        if (params?.app_maintenance) {
          setMaintenanceMode(true);
        }
      }).catch(() => {});


      GoogleSignin.configure({
        iosClientId: '960462603456-vkbvlpur2nvg8t2uvo1d1dp2ja1vcoio.apps.googleusercontent.com',
        offlineAccess: false,
        "client_id":"960462603456-lea706mqdejqra584ckvd6guhi30pqmp.apps.googleusercontent.com"
      });

    checkVersion().then((res) => {
     
          if (res.needsUpdate==true) {
         setUpdateRequired(true);
          setStoreUrl(res.url);
   }
     }).catch(() => {});

  }, [isInitialized]);
 

  onReady=()=>{
    LottieSplashScreen.hide();
    setTimeout(() => {
      processNavigationQueue()

    }, 1000);

  }
 

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <View style={styles.container}>
            <NativeBaseProvider>
            {maintenanceMode ? (
              <UpdateBlockScreen storeUrl={null} isMaintenance />
            ) : updateRequired ? (
              <UpdateBlockScreen storeUrl={storeUrl} />
            ) :  ( <MainNavigator onReady={onReady} />)}
             
              <CheckConnection />
              {isModalVisible && (
                <PopOver
                  notificationBody={notificationBody}
                  isModalVisible={isModalVisible}
                  setModalVisible={setModalVisible}
                />
              )}
              
              <Toast
        position='top'
        
      />
            </NativeBaseProvider>
          </View>
          <ModalPortal />
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  updateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  updateText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  restartButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  restartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Only wrap with Sentry in production mode
export default __DEV__ ? withStallion(App) : withStallion(Sentry.wrap(App));


