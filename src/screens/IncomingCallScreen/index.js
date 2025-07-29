import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
  StatusBar,
  Platform,
  SafeAreaView,
  BackHandler,
  Vibration,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { 
  sendVoIPCallActionNotification,
  generateVoIPChannelName,
} from '../../utils/VoIPManager';
import { createAgoraEngine } from '../../utils/AgoraConfig';
import { styles } from './styles';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const IncomingCallScreen = ({ route }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const currentUser = useSelector(state => state.user?.currentUser);
  
  // Extract call data from route params or notification data
  const callData = route?.params?.callData || {};
  const {
    caller,
    callType = 'voice',
    channelName,
    orderData = {},
    notificationId,
  } = callData;

  // State management
  const [callStatus, setCallStatus] = useState('ringing');
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  // Animation values
  const slideAnimation = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const avatarPulseAnimation = useRef(new Animated.Value(1)).current;
  const buttonScaleAnimation = useRef(new Animated.Value(1)).current;
  const rippleAnimation = useRef(new Animated.Value(0)).current;

  // Refs
  const vibrationInterval = useRef(null);
  const ringtoneTimeout = useRef(null);
  const agoraEngineRef = useRef(null);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleDeclineCall();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  // Initialize screen animations and effects
  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Start avatar pulse animation
    startAvatarPulse();
    
    // Start vibration pattern
    startVibration();
    
    // Start ripple animation
    startRippleAnimation();

    // Auto-decline after 30 seconds if not answered
    ringtoneTimeout.current = setTimeout(() => {
      if (callStatus === 'ringing') {
        handleDeclineCall();
      }
    }, 30000);

    return () => {
      stopVibration();
      if (ringtoneTimeout.current) {
        clearTimeout(ringtoneTimeout.current);
      }
    };
  }, []);

  const startAvatarPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(avatarPulseAnimation, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(avatarPulseAnimation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startVibration = () => {
    if (Platform.OS === 'android') {
      // Vibration pattern: wait 1s, vibrate 2s, wait 1s, repeat
      const pattern = [0, 1000, 2000, 1000];
      Vibration.vibrate(pattern, true);
    }
  };

  const stopVibration = () => {
    if (Platform.OS === 'android') {
      Vibration.cancel();
    }
  };

  const startRippleAnimation = () => {
    Animated.loop(
      Animated.timing(rippleAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const animateButton = (callback) => {
    Animated.sequence([
      Animated.timing(buttonScaleAnimation, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const handleAcceptCall = async () => {
    if (isAccepting || isDeclining) return;
    
    setIsAccepting(true);
    stopVibration();
    
    animateButton(async () => {
      try {
        // Send accept notification to caller
        const actionParams = {
          driverId: caller?.id,
          action: 'accepted',
          caller: {
            id: currentUser?.id,
            firstName: currentUser?.firstName,
            lastName: currentUser?.lastName,
          },
          channelName: channelName,
          orderData: orderData,
        };
        
        await sendVoIPCallActionNotification(actionParams);
        
        // Navigate to VoIP call screen
        navigation.replace('VoIPCallScreen', {
          driverData: caller,
          callType: callType,
          isIncoming: true,
          orderId: orderData?.id,
          orderData: orderData,
          channelName: channelName,
        });
        
      } catch (error) {
        console.error('Failed to accept call:', error);
        Alert.alert(
          t('call.error_title', 'Call Error'),
          t('call.accept_failed', 'Failed to accept call. Please try again.')
        );
        setIsAccepting(false);
      }
    });
  };

  const handleDeclineCall = async () => {
    if (isAccepting || isDeclining) return;
    
    setIsDeclining(true);
    stopVibration();
    
    animateButton(async () => {
      try {
        // Send decline notification to caller
        const actionParams = {
          driverId: caller?.id,
          action: 'declined',
          caller: {
            id: currentUser?.id,
            firstName: currentUser?.firstName,
            lastName: currentUser?.lastName,
          },
          channelName: channelName,
          orderData: orderData,
        };
        
        await sendVoIPCallActionNotification(actionParams);
        
        // Navigate back
        navigation.goBack();
        
      } catch (error) {
        console.error('Failed to decline call:', error);
        navigation.goBack();
      }
    });
  };

  const getCallTypeText = () => {
    return callType === 'video' 
      ? t('call.incoming_video', 'Incoming Video Call')
      : t('call.incoming_voice', 'Incoming Voice Call');
  };

  const getCallerName = () => {
    if (caller?.firstName && caller?.lastName) {
      return `${caller.firstName} ${caller.lastName}`;
    } else if (caller?.firstName) {
      return caller.firstName;
    } else if (caller?.name) {
      return caller.name;
    }
    return t('call.unknown_caller', 'Unknown Caller');
  };

  const getCallerAvatar = () => {
    return caller?.avatar || 
           caller?.profilePicture?.url || 
           'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face';
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
      
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnimation }],
              opacity: fadeAnimation,
            },
          ]}
        >
          {/* Background gradient */}
          <View style={styles.backgroundGradient} />

          {/* Ripple effect */}
          <View style={styles.rippleContainer}>
            <Animated.View
              style={[
                styles.ripple,
                {
                  transform: [
                    {
                      scale: rippleAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 2],
                      }),
                    },
                  ],
                  opacity: rippleAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 0],
                  }),
                },
              ]}
            />
          </View>

          {/* Caller Info */}
          <View style={styles.callerInfoContainer}>
            <Animated.View
              style={[
                styles.avatarContainer,
                {
                  transform: [{ scale: avatarPulseAnimation }],
                },
              ]}
            >
              <Image
                source={{ uri: getCallerAvatar() }}
                style={styles.callerAvatar}
              />
              <View style={styles.callTypeIndicator}>
                <MaterialCommunityIcons
                  name={callType === 'video' ? 'video' : 'phone'}
                  size={20}
                  color="#fff"
                />
              </View>
            </Animated.View>

            <Text style={styles.callerName}>{getCallerName()}</Text>
            
            <Text style={styles.callTypeText}>{getCallTypeText()}</Text>

            {orderData?.id && (
              <View style={styles.orderInfoContainer}>
                <MaterialCommunityIcons name="receipt" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.orderInfoText}>
                  {t('call.order_number', 'Order')} #{orderData.id}
                </Text>
              </View>
            )}
          </View>

          {/* Call Controls */}
          <View style={styles.controlsContainer}>
            <View style={styles.buttonRow}>
              <Animated.View style={{ transform: [{ scale: buttonScaleAnimation }] }}>
                <TouchableOpacity
                  style={[styles.callButton, styles.declineButton]}
                  onPress={handleDeclineCall}
                  disabled={isAccepting || isDeclining}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
                </TouchableOpacity>
              </Animated.View>
              
              <Animated.View style={{ transform: [{ scale: buttonScaleAnimation }] }}>
                <TouchableOpacity
                  style={[styles.callButton, styles.acceptButton]}
                  onPress={handleAcceptCall}
                  disabled={isAccepting || isDeclining}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="phone" size={32} color="#fff" />
                </TouchableOpacity>
              </Animated.View>
            </View>

            <Text style={styles.buttonLabels}>
              <Text style={styles.declineLabel}>{t('call.decline', 'Decline')}</Text>
              <Text style={styles.acceptLabel}>{t('call.accept', 'Accept')}</Text>
            </Text>
          </View>

          {/* Loading indicator */}
          {(isAccepting || isDeclining) && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                {isAccepting 
                  ? t('call.connecting', 'Connecting...') 
                  : t('call.declining', 'Declining...')
                }
              </Text>
            </View>
          )}
        </Animated.View>
      </SafeAreaView>
    </>
  );
};



export default IncomingCallScreen; 