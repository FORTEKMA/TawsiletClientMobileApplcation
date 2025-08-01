import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import { OneSignal } from "react-native-onesignal";
import Toast from 'react-native-toast-message';
import Modal from 'react-native-modal';
import { OtpInput } from "react-native-otp-entry";
import { useTranslation } from 'react-i18next';
import EncryptedStorage from 'react-native-encrypted-storage';
import uuid from 'react-native-uuid';

// Local imports
import { styles } from './styles';
import { colors } from '../../utils/colors';
import { sendVerify, userRegister } from '../../store/userSlice/userSlice';
import api from '../../utils/api';
import {
  trackScreenView,
  trackOtpVerification,
  trackLoginSuccess,
  trackLoginFailure,
  trackRegisterSuccess,
  trackRegisterFailure
} from '../../utils/analytics';

// Add the persistent device ID generator
export const getPersistentDeviceId = async () => {
  let deviceId = await EncryptedStorage.getItem('persistentDeviceId');
  if (!deviceId) {
    deviceId =  uuid.v4();
    await EncryptedStorage.setItem('persistentDeviceId', deviceId);
  }
  return deviceId;
};

// Constants
const OTP_LENGTH = 4;
const INITIAL_TIMER = 60;
const MAX_RESEND_ATTEMPTS = 5;

const Otp = ({ route, navigation }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  // Route params
  const { number } = route.params;
  const isProfileUpdate = route?.params?.put === true;
  const isNewRegistration = route?.params?.add === true;
  
  // State management
  const [otp, setOTP] = useState('');
  const [timer, setTimer] = useState(INITIAL_TIMER);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [verificationSent, setVerificationSent] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResendModalVisible, setIsResendModalVisible] = useState(false);
  const [selectedResendMethod, setSelectedResendMethod] = useState(null);

  // Clean phone number
  const cleanPhoneNumber = useCallback(() => number.replace(/\s/g, ''), [number]);

  // Analytics tracking
  useEffect(() => {
    const actionType = isProfileUpdate ? 'update_profile' : isNewRegistration ? 'new_registration' : 'login';
    trackScreenView('OTP', {
      action_type: actionType,
      phone_number: number
    });
  }, [isProfileUpdate, isNewRegistration, number]);

  // Initial verification code send
  useEffect(() => {
    sendVerificationCode(false);
  }, []);

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otp.length === OTP_LENGTH) {
      handleVerify();
    }
  }, [otp]);

  // Timer countdown
  useEffect(() => {
    let interval;
    if (timer > 0 && verificationSent) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, verificationSent]);

  // Helper functions
  const sendVerificationCode = useCallback(async (useWhatsapp = false) => {
    try {
      await dispatch(sendVerify({
        phoneNumber: cleanPhoneNumber(),
        useWhatsapp
      })).unwrap();
      setVerificationSent(true);
      setError('');
    } catch (error) {
      console.error('Failed to send verification code:', error);
      setError(t('otp.send_failed'));
    }
  }, [dispatch, cleanPhoneNumber, t]);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const handleOneSignalLogin = useCallback((userId) => {
    try {
      OneSignal.login(String(userId));
    } catch (error) {
      console.error('OneSignal login failed:', error);
    }
  }, []);

  const handleProfileUpdate = useCallback(async () => {
    try {
      const { data } = route.params;
      const deviceId = await getPersistentDeviceId();
      const response = await api.put(`users/${data.id}`, {
        phoneNumber: number,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        device_id:deviceId,
      }, {
        headers: { Authorization: data.Authorization }
      });

      handleOneSignalLogin(data.id);
      
      const updatedUser = {
        ...data.user,
        email: data.email,
        phoneNumber: number,
        firstName: data.firstName,
        lastName: data.lastName,
      };
      
      dispatch(userRegister({
        jwt: data.Authorization,
        user: updatedUser
      }));

      trackOtpVerification(true, { action: 'profile_update' });
      
      if (data.handleLoginSuccess) {
        data.handleLoginSuccess();
      }
      
      navigation.pop(2);
    } catch (error) {
      console.error('Profile update failed:', error);
      trackOtpVerification(false, { error: 'profile_update_failed' });
      setError(t('otp.profile_update_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [route.params, number, dispatch, navigation, handleOneSignalLogin, t]);

  const handleNewRegistration = useCallback(async () => {
    try {
      const { data } = route.params;
      const deviceId = await getPersistentDeviceId();
      console.log("deviceId",deviceId)
      const response = await api.post('register/client', {
        username: data.username,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password,
        user_role: 'client',
        firstName: data.firstName,
        lastName: data.lastName,
        device_id:deviceId, // Add deviceId to registration payload
      });

      handleOneSignalLogin(response.data.user.id);
      dispatch(userRegister(response.data));
      
      trackOtpVerification(true, { action: 'registration' });
      trackRegisterSuccess({ phone_verified: true });
      
      if (data.handleLoginSuccess) {
        data.handleLoginSuccess();
      }
      
      navigation.pop(2);
    } catch (error) {
      console.error('Registration failed:', error.response);
      trackOtpVerification(false, { error: 'registration_failed' });
      trackRegisterFailure('registration_failed', error.message);
      setError(t('otp.registration_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [route.params, dispatch, navigation, handleOneSignalLogin, t]);

  const handleLogin = useCallback(async (userData) => {
    try{
    if (userData.blocked) {
      trackOtpVerification(false, { error: 'account_blocked' });
      trackLoginFailure('phone', 'account_blocked');
      
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('auth.account_blocked'),
        position: 'top',
        visibilityTime: 3000
      });
      navigation.goBack();
      return;
    }
    handleOneSignalLogin(userData.id);
    
    dispatch(userRegister({
      user: userData,
      jwt: userData.authToken
    }));

    navigation.navigate('Home');

    // trackOtpVerification(true, { action: 'login' });
    // trackLoginSuccess('phone', { phone_verified: true });
  } catch (error) {
    console.error('Login failed:', error);
  }
  }, [dispatch, navigation, handleOneSignalLogin, t]);

  // Main verification handler
  const handleVerify = useCallback(async () => {
    if (otp.length !== OTP_LENGTH) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await api.post('verify-code', {
        phoneNumber: cleanPhoneNumber(),
        code: otp
      });
      
      if (!response.data.status) {
        trackOtpVerification(false, { error: 'invalid_code' });
        setError(t('otp.invalidCode'));
        return;
      }

      if (isProfileUpdate) {
        await handleProfileUpdate();
        return;
      }
      console.log("isNewRegistration",isNewRegistration)
      if (isNewRegistration) {
        await handleNewRegistration();
        return;
      }
     
      if (response.data.success) {
        await handleLogin(response.data);
      } else {
        trackOtpVerification(false, { error: 'user_not_found' });
        navigation.navigate('Register', { number });
      }
    } catch (error) {
      console.error('Verification failed:', error.response);
      setError(t('otp.verification_failed'));
      trackOtpVerification(false, { error: 'network_error' });
    } finally {
      setIsLoading(false);
    }
  }, [otp, isProfileUpdate, isNewRegistration, cleanPhoneNumber, handleProfileUpdate, handleNewRegistration, handleLogin, navigation, number, t]);

  // Resend handlers
  const handleResend = useCallback(() => {
    setIsResendModalVisible(true);
    setSelectedResendMethod(null);
  }, []);

  const handleConfirmResend = useCallback(() => {
    if (!selectedResendMethod || resendAttempts >= MAX_RESEND_ATTEMPTS) return;
    
    setIsResendModalVisible(false);
    const nextAttempt = resendAttempts + 1;
    setResendAttempts(nextAttempt);
    setTimer(INITIAL_TIMER * Math.pow(2, nextAttempt - 1));
    
    const useWhatsapp = selectedResendMethod === 'whatsapp';
    sendVerificationCode(useWhatsapp);
    
    trackOtpVerification(false, {
      action: 'resend_requested',
      attempt: nextAttempt,
      method: selectedResendMethod
    });
  }, [selectedResendMethod, resendAttempts, sendVerificationCode]);

  const canResend = timer === 0 && resendAttempts < MAX_RESEND_ATTEMPTS;
  const canContinue = !isLoading && otp.length === OTP_LENGTH;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t('otp.enter_code')}</Text>
              <Text style={styles.subtitle}>
                {t('otp.code_sent_to')}{' '}
                <Text style={styles.phoneNumber}>{'\u200E' + number}</Text>
              </Text>
            </View>

            <OtpInput
              numberOfDigits={OTP_LENGTH}
              onTextChange={setOTP}
              focusColor={error ? colors.error : colors.primary}
              focusStickBlinkingDuration={500}
              theme={{
                containerStyle: styles.otpInputContainer,
                pinCodeContainerStyle: [
                  styles.otpInput,
                  error && styles.otpInputError
                ],
                pinCodeTextStyle: styles.otpInputText,
              }}
              keyboardType="number-pad"
            />

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <View style={styles.spacer} />
          </View>
        </ScrollView>

        <View style={styles.bottomButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.resendButton,
              !canResend && styles.resendButtonDisabled
            ]}
            onPress={handleResend}
            disabled={!canResend}
            activeOpacity={0.7}
          >
            <Text style={styles.resendButtonText}>
              {t('otp.resend_code')}
              {timer > 0 && (
                <Text style={styles.resendCountdown}>
                  {' '}{formatTime(timer)}
                </Text>
              )}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.continueButton,
              !canContinue && styles.continueButtonDisabled
            ]}
            onPress={handleVerify}
            disabled={!canContinue}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.continueButtonText}>
                {t('otp.continue')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Resend Method Modal */}
      <Modal
        isVisible={isResendModalVisible}
        onBackdropPress={() => setIsResendModalVisible(false)}
        onBackButtonPress={() => setIsResendModalVisible(false)}
        style={styles.modal}
        backdropOpacity={0.3}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHandle}>
            <View style={styles.modalHandleBar} />
          </View>
          
          <Text style={styles.modalTitle}>
            {t('otp.choose_method')}
          </Text>
          
          <Text style={styles.modalSubtitle}>
            {t('otp.method_info', { number })}
          </Text>

          <TouchableOpacity
            style={[
              styles.methodOption,
              selectedResendMethod === 'sms' && styles.methodOptionSelected
            ]}
            onPress={() => setSelectedResendMethod('sms')}
            activeOpacity={0.7}
          >
            <Icon name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
            <Text style={styles.methodText}>{t('otp.sms')}</Text>
            {selectedResendMethod === 'sms' && (
              <Icon name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodOption,
              selectedResendMethod === 'whatsapp' && styles.methodOptionSelected
            ]}
            onPress={() => setSelectedResendMethod('whatsapp')}
            activeOpacity={0.7}
          >
            <Icon name="logo-whatsapp" size={24} color="#25D366" />
            <Text style={styles.methodText}>{t('otp.whatsapp')}</Text>
            {selectedResendMethod === 'whatsapp' && (
              <Icon name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              !selectedResendMethod && styles.confirmButtonDisabled
            ]}
            onPress={handleConfirmResend}
            disabled={!selectedResendMethod}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.confirmButtonText,
              !selectedResendMethod && styles.confirmButtonTextDisabled
            ]}>
              {t('common.confirm')}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Otp; 