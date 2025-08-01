import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView, Animated, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import Modal from 'react-native-modal';
import { OtpInput } from 'react-native-otp-entry';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../../utils/api';

const { width, height } = Dimensions.get('window');

const OtpModal = ({ 
  isVisible, 
  onClose, 
  phoneNumber, 
  onSuccess, 
  onError,
  timer,
  onResend,
  isLoading,
  setIsLoading
}) => {
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Auto submit when all fields are filled
  useEffect(() => {
    if (otp.length === 4) {
      handleOtpConfirm(otp);
    }
  }, [otp]);

  // Animation on modal open
  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [isVisible]);

  // Shake animation for error
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Pulse animation for success
  const triggerPulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleOtpConfirm = async (code) => {
    if (code.length !== 4) return;
    
    setIsLoading(true);
    setError(false);
    const finalOtp = typeof code === "string" ? code : otp;
    
    try {
      console.log({
        phoneNumber: phoneNumber.replace(/\s/g, ""),
        code: finalOtp,
      });
      
      await api.post("/codes/verify-otp", {
        phoneNumber: phoneNumber.replace(/\s/g, ""),
        code: finalOtp,
      });
      
      triggerPulse();
      onSuccess();
      onClose();
    } catch (error) {
      setAttempts(prev => prev + 1);
      setError(t("profile.personal_info.otp_verify_error"));
      triggerShake();
      onError(error);
      
      Toast.show({
        type: 'error',
        text1: t("common.error"),
        text2: t("profile.personal_info.otp_verify_error"),
        visibilityTime: 3000,
      });
      console.log(error);
    } finally {
      setIsLoading(false);
      setOtp('');
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    
    // Add haptic feedback here if available
    triggerPulse();
    onResend();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

 
  // Modern OTP Modal Styles
  const styles = {
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      minHeight: height * 0.7,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 32,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressBar: {
      height: 4,
      backgroundColor: '#E5E5E5',
      borderRadius: 2,
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#000000',
      borderRadius: 2,
    },
    titleContainer: {
      marginBottom: 40,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: '#000000',
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: '#666666',
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 8,
    },
    phoneNumber: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
      textAlign: 'center',
    },
    otpContainer: {
      marginBottom: 40,
    },
    otpInputContainer: {
      justifyContent: 'center',
      marginBottom: 16,
    },
    otpInput: {
      width: 70,
      height: 70,
      borderWidth: 2,
      borderColor: '#E5E5E5',
      borderRadius: 16,
      marginHorizontal: 8,
      backgroundColor: '#FFFFFF',
    },
    otpInputFocused: {
      borderColor: '#000000',
      backgroundColor: '#FAFAFA',
    },
    otpInputError: {
      borderColor: '#FF0000',
      backgroundColor: '#FFF5F5',
    },
    otpInputText: {
      fontSize: 28,
      fontWeight: '700',
      color: '#000000',
    },
    errorContainer: {
      backgroundColor: '#FFF5F5',
      borderWidth: 1,
      borderColor: '#FFE5E5',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      flexDirection: 'row',
      alignItems: 'center',
    },
    errorIcon: {
      marginRight: 12,
    },
    errorText: {
      color: '#FF0000',
      fontSize: 14,
      fontWeight: '500',
      flex: 1,
    },
    attemptsText: {
      color: '#666666',
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 24,
    },
    bottomSection: {
      marginTop: 'auto',
    },
    resendSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    resendButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 20,
      backgroundColor: '#F5F5F5',
      borderWidth: 1,
      borderColor: '#E5E5E5',
    },
    resendButtonActive: {
      backgroundColor: '#000000',
      borderColor: '#000000',
    },
    resendButtonDisabled: {
      opacity: 0.5,
    },
    resendButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#666666',
    },
    resendButtonTextActive: {
      color: '#FFFFFF',
    },
    resendCountdown: {
      fontSize: 14,
      color: '#666666',
      marginTop: 8,
    },
    continueButton: {
      backgroundColor: '#000000',
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
    },
    continueButtonDisabled: {
      backgroundColor: '#E5E5E5',
    },
    continueButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
    },
    continueButtonTextDisabled: {
      color: '#666666',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 12,
    },
  };
  console.log("timer",timer);

  return (
    <Modal 
      isVisible={isVisible} 
      onBackdropPress={() => {
        if (timer > 0) {
          Toast.show({
            type: 'warning',
            text1: t("common.warning"),
            text2: t("profile.personal_info.cannot_close_during_timer"),
            visibilityTime: 3000,
          });
          return;
        }
        onClose();
      }} 
      style={{ margin: 0 }}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={300}
      animationOutTiming={300}
      backdropTransitionInTiming={300}
      backdropTransitionOutTiming={300}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(otp.length / 4) * 100}%` }]} />
              </View>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => {
                 
                  onClose();
                }}
              >
                <Icon name="close" size={20} color="#6C757D" />
              </TouchableOpacity>
            </View>
            
            {/* Title Section */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t('profile.personal_info.otp_title')}</Text>
              <Text style={styles.subtitle}>
                {t('profile.personal_info.otp_message',{phoneNumber: phoneNumber})}
              </Text>
              
            </View>
            
            {/* OTP Input Section */}
            <Animated.View 
              style={[
                styles.otpContainer,
                {
                  transform: [{ translateX: shakeAnim }],
                }
              ]}
            >
              <OtpInput
                numberOfDigits={4}
                onTextChange={(text) => setOtp(text)}
                focusColor="#000000"
                focusStickBlinkingDuration={500}
                theme={{
                  containerStyle: styles.otpInputContainer,
                  pinCodeContainerStyle: [
                    styles.otpInput,
                    error && styles.otpInputError
                  ],
                  pinCodeTextStyle: styles.otpInputText,
                  pinCodeContainerFocusedStyle: styles.otpInputFocused,
                }}
                keyboardType="number-pad"
                autoFocus={true}
              />
            </Animated.View>
            
            {/* Error Display */}
            {error && (
              <View style={styles.errorContainer}>
                <Icon name="alert-circle" size={20} color="#FF0000" style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            
            {/* Attempts Counter */}
            {attempts > 0 && (
              <Text style={styles.attemptsText}>
                {t('otp.attempts_remaining', { attempts: Math.max(0, 5 - attempts) })}
              </Text>
            )}
            
            {/* Bottom Section */}
            <View style={styles.bottomSection}>
              {/* Resend Section */}
              <View style={styles.resendSection}>
                <TouchableOpacity
                  style={[
                    styles.resendButton,
                    timer === 0 && styles.resendButtonActive,
                    timer > 0 && styles.resendButtonDisabled
                  ]}
                  onPress={handleResendOtp}
                  disabled={timer > 0}
                >
                  <Text style={[
                    styles.resendButtonText,
                    timer === 0 && styles.resendButtonTextActive
                  ]}>
                    {t('otp.resend_code')}
                  </Text>
                </TouchableOpacity>
                
                {timer > 0 && (
                  <Text style={styles.resendCountdown}>
                    {t('otp.resend_in', { time: formatTime(timer) })}
                  </Text>
                )}
              </View>
              
              {/* Continue Button */}
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    (isLoading || otp.length !== 4) && styles.continueButtonDisabled
                  ]}
                  onPress={() => handleOtpConfirm(otp)}
                  disabled={isLoading || otp.length !== 4}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.loadingText}>{t('otp.verifying')}</Text>
                    </View>
                  ) : (
                    <Text style={[
                      styles.continueButtonText,
                      (isLoading || otp.length !== 4) && styles.continueButtonTextDisabled
                    ]}>
                      {t('otp.continue')}
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default OtpModal; 