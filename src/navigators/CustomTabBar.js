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
import { Toast } from 'native-base';
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
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

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
            title: t('common.error'),
            description: t('auth.account_blocked'),
            placement: 'top',
            duration: 3000,
            status: 'error',
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
            title: t('common.error'),
            description: t('auth.account_blocked'),
            placement: 'bottom',
            duration: 3000,
            status: 'error',
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
    <SafeAreaView edges={['bottom']} style={[styles.safeArea,{backgroundColor:token?colors.backgroundPrimary:"transparent"}]} >
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
                  <Ionicons name="logo-google" size={hp(2.2)} color="#EA4335" />
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
                    <ActivityIndicator size="small" color={colors.uberBlack} />
                  ) : (
                    <Ionicons name="logo-apple" size={hp(2.2)} color={colors.uberBlack} />
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
                  <MaterialCommunityIcons name="translate" size={hp(2.2)} color={colors.uberBlue} />
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
              outputRange: [1, 1.05],
            });

            const translateY = animatedValues[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0, -2],
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
                    size={hp(2.8)}
                    color={isFocused ? colors.uberBlack : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      {color: isFocused ? colors.uberBlack : colors.textSecondary},
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
    backgroundColor: colors.backgroundPrimary,
    height: hp(9),
    borderTopColor: colors.borderLight,
    paddingBottom: Platform.OS === 'ios' ? hp(0.5) : 0,
    paddingTop: hp(2.5),
    borderTopWidth: 1,
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2.5),
    borderRadius: 12,
  },
  activeTab: {
    width: "100%",
    backgroundColor: colors.backgroundSecondary,
  },
  tabLabel: {
    fontSize: hp(1.5),
    marginTop: hp(0.5),
    fontWeight: '600',
  },
  // Login banner styles
  loginBanner: {
    backgroundColor: colors.backgroundPrimary,
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2.5),
    borderColor: colors.borderLight,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    borderRadius: 16,
    marginHorizontal: wp(4),
    marginTop: 0,
    marginBottom: hp(1),
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
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
    backgroundColor: colors.uberBlack,
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.2),
    borderRadius: 24,
    marginRight: wp(2.5),
    marginBottom: hp(1.2),
    minWidth: wp(28),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: hp(1.8),
    letterSpacing: 0.2
  },
  socialButton: {
    backgroundColor: colors.backgroundPrimary,
    borderColor: '#EA4335',
    borderWidth: 1.5,
    padding: wp(2.5),
    borderRadius: 24,
    marginRight: wp(2.5),
    marginBottom: hp(1.2),
    width: wp(10),
    height: wp(10),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA4335',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  appleButton: {
    backgroundColor: colors.backgroundPrimary,
    borderColor: colors.uberBlack,
    borderWidth: 1.5,
    padding: wp(2.5),
    borderRadius: 24,
    marginRight: wp(2.5),
    marginBottom: hp(1.2),
    width: wp(10),
    height: wp(10),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.uberBlack,
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
    height: hp(3.5),
    backgroundColor: colors.borderLight,
    marginHorizontal: wp(4.5),
    alignSelf: 'center',
    borderRadius: 1
  },
  languageButton: {
    padding: wp(2.2),
    borderRadius: 20,
    backgroundColor: colors.backgroundPrimary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.uberBlue,
    width: wp(10),
    height: wp(10),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default React.memo(CustomTabBar);

