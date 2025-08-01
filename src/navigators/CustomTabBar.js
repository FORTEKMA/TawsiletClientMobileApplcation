import React, {useEffect, useRef, useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  ActivityIndicator
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import  {colors}  from "../utils/colors"
import { useSelector,useDispatch } from 'react-redux';
import { getFocusedRouteNameFromRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { OneSignal } from 'react-native-onesignal';
import { GoogleSignin as GoogleSigninService } from '@react-native-google-signin/google-signin';
import { googleSignIn, appleSignIn } from '../services/socialAuth';
import { userRegister } from '../store/userSlice/userSlice';
import {
  trackLoginAttempt,
  trackLoginSuccess,
  trackLoginFailure,
  trackLanguageChanged
} from '../utils/analytics';
 import {changeLanguage} from "../local"
import LoginModal from '../screens/LoginModal';
import LanguageModal from '../screens/Profile/components/LanguageModal';
import LanguageConfirmationModal from '../screens/Profile/components/LanguageConfirmationModal';

const screenHideTabs = [ "ForgotPassword","ResetCodeScreen", "ResetPassword", "confirmation","NewTicketScreen","TicketScreen","Register","OrderDetails","Rating","PersonalInfo","Security","Help"];

const CustomTabBar = ({state, descriptors, navigation}) => {

    const currentUser = useSelector(state => state?.user);
    const token = useSelector(state => state?.user?.token);
    const mainScreenStep = useSelector(state => state.utilsSlice.mainScreenStep);
    const dispatch = useDispatch();
    const {t} = useTranslation();
    const animatedValues = useRef(
    state.routes.map(() => new Animated.Value(0)),
  ).current;
    const bannerAnim = useRef(new Animated.Value(-60)).current;
    const bannerOpacity = useRef(new Animated.Value(0)).current;
    const nav = useNavigation();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
    const [isConfirmationModalVisible, setIsConfirmationModalVisible] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState(null);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isAppleLoading, setIsAppleLoading] = useState(false);

  useEffect(() => {
    state.routes.forEach((_, index) => {
      Animated.spring(animatedValues[index], {
        toValue: state.index === index ? 1 : 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    });
  }, [state.index]);

  useEffect(() => {
    if (!token) {
      bannerAnim.setValue(-60);
      bannerOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(bannerAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(bannerOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
      return () => {
        bannerAnim.setValue(-60);
        bannerOpacity.setValue(0);
      };
    } else {
      bannerAnim.setValue(-60);
      bannerOpacity.setValue(0);
    }
  }, [token]);

  const currentIndex = state.index;
  const currentRoute = state.routes[currentIndex];

  const getTabBarVisible = useCallback((route) => {
     const routeName = getFocusedRouteNameFromRoute(route);
     return !screenHideTabs.includes(routeName);
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

  // Google login handler
  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      trackLoginAttempt('google');
      const result = await googleSignIn();
      try {
        GoogleSigninService.signOut();
      } catch (error) {
        console.log(error);
      }
      if (!result.user.email || !result.user.lastName || !result.user.firstName || !result.user.phoneNumber) {
        trackLoginSuccess('google', { incomplete_profile: true });
        nav.navigate('Register', { result });
      } else {
        if (result.user.blocked) {
          trackLoginFailure('google', 'account_blocked');
          Toast.show({
            type: 'error',
            text1: t('common.error'),
            text2: t('auth.account_blocked'),
            position: 'top',
            visibilityTime: 3000
          });
          return;
        }
        trackLoginSuccess('google', { complete_profile: true });
        OneSignal.login(String(result.user.id));
        dispatch(userRegister(result));
      }
    } catch (error) {
      trackLoginFailure('google', error.message || 'unknown_error');
      console.log(error, 'error');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Apple login handler
  const handleAppleLogin = async () => {
    try {
      setIsAppleLoading(true);
      trackLoginAttempt('apple');
      const result = await appleSignIn();
      if (!result.user.email || !result.user.lastName || !result.user.firstName || !result.user.phoneNumber) {
        trackLoginSuccess('apple', { incomplete_profile: true });
        nav.navigate('Register', { result });
      } else {
        if (result.user.blocked) {
          trackLoginFailure('apple', 'account_blocked');
          Toast.show({
            type: 'error',
            text1: t('common.error'),
            text2: t('auth.account_blocked'),
            position: 'bottom',
            visibilityTime: 3000
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

const hideTabBar = useMemo(() => getTabBarVisible(currentRoute), [currentRoute, getTabBarVisible]);
  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea,{backgroundColor:token?"#fff":"transparent"}]} >
      {/* Login banner at the top of the tab bar */}
      {hideTabBar && !token && mainScreenStep !== 4.5&& <>
          <Animated.View
            style={[
              styles.loginBanner,
              {
                transform: [{ translateY: bannerAnim }],
                opacity: bannerOpacity,
              }
            ]}
          >
            <View style={styles.loginBannerContent}>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => setShowLoginModal(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.loginButtonText}>{t('login.login')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleLogin}
                activeOpacity={0.85}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator size="small" color="#EA4335" />
                ) : (
                  <Ionicons name="logo-google" size={17} color="#EA4335" />
                )}
              </TouchableOpacity>
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.appleButton}
                  onPress={handleAppleLogin}
                  activeOpacity={0.85}
                  disabled={isAppleLoading}
                >
                  {isAppleLoading ? (
                    <ActivityIndicator size="small" color="#222" />
                  ) : (
                    <Ionicons name="logo-apple" size={17} color="#222" />
                  )}
                </TouchableOpacity>
              )}
              {/* Separator line */}
              <View style={styles.languageContainer}>
                <View style={styles.separator} />
                <TouchableOpacity
                  style={styles.languageButton}
                  onPress={() => setIsLanguageModalVisible(true)}
                  activeOpacity={0.8}
                  accessibilityLabel={t('profile.language.title')}
                >
                  <MaterialCommunityIcons name="translate" size={17} color={colors.primary || '#222'} />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
          {showLoginModal && (
            <LoginModal visible={showLoginModal} onClose={() => setShowLoginModal(false)} />
          )}
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
        </>}
      { 
      token&& hideTabBar&& (
          <View style={styles.tabBarContainer}>
            {state.routes.map((route, index) => {
              const {options} = descriptors[route.key];
            const label = options.tabBarLabel || route.name;
            const isFocused = state.index === index;

            const onPress = () => {
              if(!currentUser.token){
                  return
              }
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            let iconName;
            if (route.name === 'Home') {
              iconName = isFocused ? 'home' : 'home-outline';
            } else if (route.name === 'Historique') {
              iconName = isFocused ? 'list' : 'list-outline';
            } else if (route.name === 'Notifications') {
              iconName = isFocused ? 'notifications' : 'notifications-outline';
            } else if (route.name === 'Profile') {
              iconName = isFocused ? 'settings' : 'settings-outline';
            }

            const scale = animatedValues[index].interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.1],
            });

            const translateY = animatedValues[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0, -5],
            });

            return (
              <TouchableOpacity
                key={index}
                onPress={onPress}
                style={styles.tabItem}>
                <Animated.View
                  style={[
                    styles.tabItemContainer,
                    isFocused && styles.activeTab,
                    {
                      transform: [{scale}, {translateY}],
                    },
                  ]}>
                  <Ionicons
                    name={iconName}
                    size={24}
                    color={isFocused ? '#030303' : '#666'}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      {color: isFocused ? '#030303' : '#666'},
                    ]}>
                    {t("common."+label)}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
          </View>
        
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'transparent',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    height: 70,
    borderTopColor: '#ccc',
    paddingBottom: Platform.OS === 'ios' ? 5 : 0,
    paddingTop: 25,
    borderTopWidth: 1
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  activeTab: {
    width: "100%",
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  // Login banner styles
  loginBanner: {
    backgroundColor: '#fff',
    paddingVertical: 1,
    paddingHorizontal: 9,
    borderColor: '#e0e0e0',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    borderRadius: 17,
    marginHorizontal: 15,
    marginTop: 0,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  loginBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    width: '100%',
    gap: 0,
    marginBottom: 0,
    justifyContent: 'flex-start',
  },
  loginButton: {
    backgroundColor: colors.primary || '#0c0c0c',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 10,
    marginBottom: 10,
    minWidth: 110,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary || '#0c0c0c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.2
  },
  socialButton: {
    backgroundColor: '#fff',
    borderColor: '#EA4335',
    borderWidth: 1.5,
    padding: 10,
    borderRadius: 24,
    marginRight: 10,
    marginBottom: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA4335',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  appleButton: {
    backgroundColor: '#fff',
    borderColor: '#222',
    borderWidth: 1.5,
    padding: 10,
    borderRadius: 24,
    marginRight: 10,
    marginBottom: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  languageContainer: {
    flex: 1,
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  separator: {
    width: 2,
    height: 30,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 18,
    alignSelf: 'center',
    borderRadius: 1
  },
  languageButton: {
    padding: 9,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#222',
    width: 40,
    height: 40,
  },
});

export default React.memo(CustomTabBar); 