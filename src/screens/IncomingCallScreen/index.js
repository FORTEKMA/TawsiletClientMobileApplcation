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
  Vibration,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { styles } from './styles';
import RNCallKeep from 'react-native-callkeep';

const IncomingCallScreen = ({ route }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const currentUser = useSelector(state => state.user?.currentUser);

  // Extract call data from route params
  const { callUUID, caller, callType = 'voice', channelName, orderData = {} } = route.params;
  
  // State management
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  // Simple fade animation
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  // Initialize screen
  useEffect(() => {
    // Simple fade in animation
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    

    return () => {
      // Stop vibration when component unmounts
      if (Platform.OS === 'android') {
        Vibration.cancel();
      }
    };
  }, []);

  const handleAcceptCall = async () => {
    
    try {
      // Answer the call via CallKeep
      RNCallKeep.answerIncomingCall(callUUID);
      
      // Navigate to VoIP call screen for actual call handling
      // navigation.navigate('VoIPCallScreen', { callUUID, caller, callType, channelName, orderData });

    } catch (error) {
     console.log('Failed to accept call:', error);
    }
  };

  const handleDeclineCall = async () => {
    if (isAccepting || isDeclining) return;

    setIsDeclining(true);

    // Stop vibration
    if (Platform.OS === 'android') {
      Vibration.cancel();
    }

    try {
      console.log('Declining call:', callUUID);
      // End the call via CallKeep
      RNCallKeep.endCall(callUUID);
      
      // Navigate back
      navigation.goBack();

    } catch (error) {
      console.error('Failed to decline call:', error);
      navigation.goBack();
    }
  };

  const getCallTypeText = () => {
    return callType === 'video'
      ? t('call.incoming_video')
      : t('call.incoming_voice');
  };

  const getCallerName = () => {
    if (caller?.firstName && caller?.lastName) {
      return `${caller.firstName} ${caller.lastName}`;
    } else if (caller?.firstName) {
      return caller.firstName;
    } else if (caller?.name) {
      return caller.name;
    }
    return t('call.unknown_caller');
  };

  const getCallerAvatar = () => {
    return caller?.avatar ||
           caller?.profilePicture?.url ||
           'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face';
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" translucent />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnimation,
            },
          ]}
        >
          {/* Caller Info */}
          <View style={styles.callerInfoContainer}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: getCallerAvatar() }}
                style={styles.callerAvatar}
              />
              <View style={styles.callTypeIndicator}>
                <MaterialCommunityIcons
                  name={callType === 'video' ? 'video' : 'phone'}
                  size={20}
                  color="#666"
                />
              </View>
            </View>

            <Text style={styles.callerName}>{getCallerName()}</Text>
            <Text style={styles.callTypeText}>{getCallTypeText()}</Text>

            {orderData?.id && (
              <View style={styles.orderInfoContainer}>
                <MaterialCommunityIcons name="receipt" size={14} color="#666" />
                <Text style={styles.orderInfoText}>
                  {t('call.order_number')} #{orderData.id}
                </Text>
              </View>
            )}
          </View>

          {/* Accept/Decline Controls */}
          <View style={styles.controlsContainer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.callButton, styles.declineButton]}
                onPress={handleDeclineCall}
                disabled={isAccepting || isDeclining}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="phone-hangup" size={32} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.callButton, styles.acceptButton]}
                onPress={handleAcceptCall}
                disabled={isAccepting || isDeclining}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="phone" size={32} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.buttonLabels}>
              <Text style={styles.declineLabel}>{t('call.decline')}</Text>
              <Text style={styles.acceptLabel}>{t('call.accept')}</Text>
            </View>
          </View>

         
        </Animated.View>
      </SafeAreaView>
    </>
  );
};

export default IncomingCallScreen;

