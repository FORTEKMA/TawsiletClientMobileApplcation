import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Alert, useWindowDimensions ,SafeAreaView,Image,View, TouchableOpacity, Text, TextInput, Animated, Easing, ActivityIndicator,Platform, I18nManager, Keyboard,TouchableWithoutFeedback} from 'react-native';
import { useDispatch } from 'react-redux';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import {Toast} from "native-base"
import * as Yup from 'yup';
 
import EmailLoginForm from './components/EmailLoginForm';
import PhoneLoginForm from './components/PhoneLoginForm';
import { styles } from './styles';
import { updateUser,getCurrentUser,userRegister} from '../../store/userSlice/userSlice';
import { useTranslation } from 'react-i18next';
import { OneSignal } from "react-native-onesignal";
import { GoogleSignin as GoogleSigninService } from '@react-native-google-signin/google-signin';

import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { googleSignIn, appleSignIn } from '../../services/socialAuth';
import LanguageModal from '../Profile/components/LanguageModal';
import LanguageConfirmationModal from '../Profile/components/LanguageConfirmationModal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { changeLanguage } from '../../local';
import { 
  trackScreenView, 
  trackLoginAttempt, 
  trackLoginSuccess, 
  trackLoginFailure, 
  trackLanguageChanged 
} from '../../utils/analytics';

const Login = ({ navigation }) => {
  const { t, i18n } = useTranslation();
   const dispatch = useDispatch();
 
  const [number, setNumber] = useState('');
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isConfirmationModalVisible, setIsConfirmationModalVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
 
  const { width } = useWindowDimensions();
  const [loginMethod, setLoginMethod] = useState('email'); 
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  // Add animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const switchWidth = width  - 40; // 90% of screen width minus margins

  // Track screen view on mount
  useEffect(() => {
    trackScreenView('Login');
  }, []);

  // Create interpolated values for smoother transitions
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, switchWidth / 2],
    extrapolate: 'clamp'
  });

  const handleSwitch = (method) => {
    const toValue = method === 'email' ?  0 : 1;
    setLoginMethod(method);
    
    // Track login method switch
    trackLoginAttempt(method, { action: 'method_switch' });
    
    Animated.timing(slideAnim, {
      toValue,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Material Design standard easing
    }).start();
  };

  // Initialize animation position
  useEffect(() => {
    slideAnim.setValue(loginMethod === 'email' ? 0 : 1);
  }, []);

  const handleLanguageSelect = (language, needsConfirmation) => {
    if (needsConfirmation) {
      setSelectedLanguage(language);
      setIsConfirmationModalVisible(true);
    } else {
      changeLanguage(language);
      trackLanguageChanged(language);
    }
  };

  const handleLanguageConfirm = () => {
    if (selectedLanguage) {
      changeLanguage(selectedLanguage);
      trackLanguageChanged(selectedLanguage);
      setIsConfirmationModalVisible(false);
      setSelectedLanguage(null);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      trackLoginAttempt('google');
      const result = await googleSignIn();
      
      try {
        GoogleSigninService.signOut();
      } catch (error) {
        console.log(error)
      }

      
      if(!result.user.email||!result.user.lastName||!result.user.firstName||!result.user.phoneNumber) {
        trackLoginSuccess('google', { incomplete_profile: true });
        navigation.navigate('Register',{result})
      } else {
        if (result.user.blocked) {
          trackLoginFailure('google', 'account_blocked');
          Toast.show({
            title: t('common.error'),
            description: t('auth.account_blocked'),
            placement: "top",
            duration: 3000,
            status: "error"
          });
         
          return;
        }
        trackLoginSuccess('google', { complete_profile: true });
        OneSignal.login(String(result.user.id));
        dispatch(userRegister(result));
      }
      
    } catch (error) {
      trackLoginFailure('google', error.message || 'unknown_error');
      console.log(error, 'error')
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setIsAppleLoading(true);
      trackLoginAttempt('apple');
      const result = await appleSignIn();
    
       if(!result.user.email||!result.user.lastName||!result.user.firstName||!result.user.phoneNumber) {
        trackLoginSuccess('apple', { incomplete_profile: true });
        navigation.navigate('Register',{result})
      } else {
        if (result.user.blocked) {
          trackLoginFailure('apple', 'account_blocked');
          Toast.show({
            title: t('common.error'),
            description: t('auth.account_blocked'),
            placement: "bottom",
            duration: 3000,
            status: "error"
          });
         
          return;
        }
        trackLoginSuccess('apple', { complete_profile: true });
        OneSignal.login(String(result.user.id));
        dispatch(userRegister(result));
      }
   
    } catch (error) {
      trackLoginFailure('apple', error.message || 'unknown_error');
      console.log(error, 'error');
    } finally {
      setIsAppleLoading(false);
    }
  };

  const getFlagSource = () => {
    const currentLang = i18n.language;
    switch(currentLang) {
      case 'fr':
        return { uri: 'https://flagcdn.com/w40/fr.png' };
      case 'ar':
        return { uri: 'https://flagcdn.com/w40/sa.png' };
      default:
        return { uri: 'https://flagcdn.com/w40/us.png' };
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} style={{flex:1}}>
    <SafeAreaView  style={[styles.container, { width }]}> 
   
 

  
 <TouchableOpacity 
          style={styles.languageButton}
          onPress={() => setIsLanguageModalVisible(true)}
        >
          <Image 
            source={getFlagSource()}
            style={styles.flagImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
        
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("login.welcomeBack")}</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      {/* Segmented Switch */}
      <View style={[styles.switchContainer, { width: switchWidth,flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }]}>
        <Animated.View 
          style={[
            styles.switchIndicator,
            {
              transform: [{ translateX }]
            }
          ]}
        />
        <TouchableOpacity
          style={[styles.switchButton, loginMethod === 'email' && styles.switchButtonActive]}
          onPress={() => handleSwitch('email')}
        >
          <Text style={[styles.switchText, loginMethod === 'email' && styles.switchTextActive]}>{t('login.email')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.switchButton, loginMethod === 'phone' && styles.switchButtonActive]}
          onPress={() => handleSwitch('phone')}
        >
          <Text style={[styles.switchText, loginMethod === 'phone' && styles.switchTextActive]}>{t('login.phoneNumber')}</Text>
        </TouchableOpacity>
      </View>
      {  loginMethod === 'phone' ? (
        <View style={styles.formContainer}>
              <PhoneLoginForm/>
            
          
          
        </View>
      ) : (
        <EmailLoginForm/>
      )}
   <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>{t('login.orLoginWith')}</Text>
        <View style={styles.divider} />
      </View> 
    <View style={styles.socialLoginContainer}>
      {Platform.OS=="ios"&&(  <TouchableOpacity 
          style={styles.socialIcon} 
          onPress={handleAppleLogin}
          disabled={isAppleLoading}
        >
          {isAppleLoading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <FontAwesome name="apple" size={30} color="#000" />
          )}
        </TouchableOpacity>)}
        <TouchableOpacity 
          style={styles.socialIcon} 
          onPress={handleGoogleLogin}
          disabled={isGoogleLoading}
        >
          {isGoogleLoading ? (
            <ActivityIndicator size="small" color="#DB4437" />
          ) : (
            <FontAwesome name="google" size={30} color="#DB4437" />
          )}
        </TouchableOpacity>
    
      </View>  
      <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
        <Text style={styles.registerText}>{t('login.noAccount')} <Text style={styles.registerNow}>{t('login.registerNow')}</Text></Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.guestBtn} onPress={() =>  dispatch(userRegister({
       user:{ username: 'Guest',
        email: 'guest@example.com',
        phoneNumber: '',
        password: '',
  
        user_role: 'client',},
        jwt: -1,
      }))}>
        <Text style={styles.guestBtnText}>{t('login.enterAsGuest') || 'Enter as Guest'}</Text>
      </TouchableOpacity>
      <LanguageModal
      isVisible={isLanguageModalVisible}
      onClose={() => setIsLanguageModalVisible(false)}
      onLanguageSelect={handleLanguageSelect}
    />
    <LanguageConfirmationModal
      isVisible={isConfirmationModalVisible}
      onClose={() => {
        setIsConfirmationModalVisible(false);
        setSelectedLanguage(null);
      }}
      onConfirm={handleLanguageConfirm}
      selectedLanguage={selectedLanguage}
    />
   
    </SafeAreaView>
 
      </TouchableWithoutFeedback>
   
  );
};

export default Login; 