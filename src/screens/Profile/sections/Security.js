import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView, SafeAreaView, StatusBar, Keyboard, TouchableWithoutFeedback, I18nManager } from 'react-native';
import { useDispatch } from 'react-redux';
import { styles } from '../styles';
import { changePassword } from '../../../store/userSlice/userSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';

const Security = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    password: '',
    passwordConfirmation: '',
  });

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
      errors.push(t('profile.security.validation.min_length'));
    }
    if (!/[A-Z]/.test(password)) {
      errors.push(t('profile.security.validation.uppercase'));
    }
    if (!/[a-z]/.test(password)) {
      errors.push(t('profile.security.validation.lowercase'));
    }
    if (!/[0-9]/.test(password)) {
      errors.push(t('profile.security.validation.number'));
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push(t('profile.security.validation.special'));
    }
    return errors;
  };

  const validateInputs = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = t('profile.security.validation.current_required');
    }

    const passwordErrors = validatePassword(passwordData.password);
    if (passwordErrors.length > 0) {
      newErrors.password = passwordErrors;
    }

    if (passwordData.password !== passwordData.passwordConfirmation) {
      newErrors.passwordConfirmation = t('profile.security.validation.passwords_not_match');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdatePassword = async () => {
    if (!validateInputs()) {
      Toast.show({
        type: 'error',
        text1: t('profile.security.validation.title'),
        text2: Object.values(errors)
          .flat()
          .join('\n'),
        position: 'top'
      });
      return;
    }

    try {
      setIsLoading(true);
      await dispatch(changePassword(passwordData)).unwrap();
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('profile.security.update_success'),
        position: 'top'
      });
      setPasswordData({
        currentPassword: '',
        password: '',
        passwordConfirmation: '',
      });
      setErrors({});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: error?.response?.data?.error?.message ||
          t('profile.security.update_error'),
        position: 'top'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    const errors = validatePassword(password);
    const strength = 5 - errors.length;
    if (strength <= 2) return { level: 'weak', color: '#FF3B30', text: t('profile.security.strength.weak', 'Weak') };
    if (strength <= 3) return { level: 'medium', color: '#FF9500', text: t('profile.security.strength.medium', 'Medium') };
    if (strength <= 4) return { level: 'good', color: '#30D158', text: t('profile.security.strength.good', 'Good') };
    return { level: 'strong', color: '#34C759', text: t('profile.security.strength.strong', 'Strong') };
  };

  const renderPasswordInput = (label, field, placeholder, showPassword, setShowPassword) => {
    const hasError = errors[field];
    const isNewPassword = field === 'password';
    const strength = isNewPassword && passwordData[field] ? getPasswordStrength(passwordData[field]) : null;

    return (
      <View style={styles.uberInputContainer}>
        <Text style={styles.uberInputLabel}>{t(label)}</Text>
        <View style={[styles.uberPasswordWrapper, hasError && styles.uberInputError]}>
          <View style={styles.uberInputIconContainer}>
            <Icon name="lock-outline" size={20} color="#8E8E93" />
          </View>
          <TextInput
            style={styles.uberPasswordInput}
            placeholder={t(placeholder)}
            placeholderTextColor="#8E8E93"
            value={passwordData[field]}
            onChangeText={(text) => {
              setPasswordData({ ...passwordData, [field]: text });
              if (errors[field]) {
                setErrors({ ...errors, [field]: null });
              }
            }}
            secureTextEntry={!showPassword}
            textAlign={I18nManager.isRTL ? 'right' : 'left'}
          />
          <TouchableOpacity 
            style={styles.uberPasswordToggle}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            <Icon
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#8E8E93"
            />
          </TouchableOpacity>
        </View>
        
        {/* Password Strength Indicator */}
        {strength && (
          <View style={styles.uberPasswordStrengthContainer}>
            <View style={styles.uberPasswordStrengthBar}>
              <View 
                style={[
                  styles.uberPasswordStrengthFill,
                  { 
                    width: `${(5 - validatePassword(passwordData[field]).length) * 20}%`,
                    backgroundColor: strength.color 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.uberPasswordStrengthText, { color: strength.color }]}>
              {strength.text}
            </Text>
          </View>
        )}

        {hasError && (
          <View style={styles.uberErrorContainer}>
            <Icon name="alert-circle-outline" size={16} color="#FF3B30" />
            <Text style={styles.uberErrorText}>
              {Array.isArray(hasError) ? hasError.join(', ') : hasError}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderSecurityTip = (icon, title, description) => (
    <View style={styles.uberSecurityTip}>
      <View style={styles.uberSecurityTipIcon}>
        <Icon name={icon} size={20} color="#007AFF" />
      </View>
      <View style={styles.uberSecurityTipContent}>
        <Text style={styles.uberSecurityTipTitle}>{title}</Text>
        <Text style={styles.uberSecurityTipDescription}>{description}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.uberContainer}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.uberMainContainer}>
            {/* Modern Header */}
            <View style={styles.uberSectionHeader}>
              <TouchableOpacity 
                style={styles.uberBackButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Icon 
                  name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} 
                  size={24} 
                  color="#000" 
                />
              </TouchableOpacity>
              
              <View style={styles.uberHeaderContent}>
                <Text style={styles.uberSectionTitle}>{t('profile.security.title')}</Text>
              </View>
              
              <View style={styles.uberHeaderSpacer} />
            </View>

            <ScrollView
              style={styles.uberScrollView}
              contentContainerStyle={styles.uberScrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Password Change Section */}
              <View style={styles.uberFormSection}>
                <View style={styles.uberSectionHeaderInline}>
                  <Icon name="shield-check-outline" size={24} color="#000" />
                  <Text style={styles.uberSectionHeaderTitle}>
                    {t('profile.security.change_password', 'Change Password')}
                  </Text>
                </View>

                {renderPasswordInput(
                  'profile.security.current_password',
                  'currentPassword',
                  'profile.security.current_password_placeholder',
                  showCurrentPassword,
                  setShowCurrentPassword
                )}

                {renderPasswordInput(
                  'profile.security.new_password',
                  'password',
                  'profile.security.new_password_placeholder',
                  showNewPassword,
                  setShowNewPassword
                )}

                {renderPasswordInput(
                  'profile.security.confirm_password',
                  'passwordConfirmation',
                  'profile.security.confirm_password_placeholder',
                  showConfirmPassword,
                  setShowConfirmPassword
                )}
              </View>

              {/* Security Tips Section */}
              <View style={styles.uberFormSection}>
                <View style={styles.uberSectionHeaderInline}>
                  <Icon name="lightbulb-outline" size={24} color="#000" />
                  <Text style={styles.uberSectionHeaderTitle}>
                    {t('profile.security.tips_title', 'Security Tips')}
                  </Text>
                </View>

                {renderSecurityTip(
                  'key-variant',
                  t('profile.security.tip1_title', 'Strong Password'),
                  t('profile.security.tip1_desc', 'Use at least 8 characters with uppercase, lowercase, numbers, and special characters.')
                )}

                {renderSecurityTip(
                  'update',
                  t('profile.security.tip2_title', 'Regular Updates'),
                  t('profile.security.tip2_desc', 'Change your password regularly to maintain account security.')
                )}

                {renderSecurityTip(
                  'account-lock-outline',
                  t('profile.security.tip3_title', 'Keep it Private'),
                  t('profile.security.tip3_desc', 'Never share your password with others or use it on multiple accounts.')
                )}
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>

        {/* Modern Action Button */}
        <View style={styles.uberActionContainer}>
          <TouchableOpacity
            style={[
              styles.uberActionButton,
              isLoading && styles.uberActionButtonDisabled
            ]}
            onPress={handleUpdatePassword}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="shield-check-outline" size={20} color="#fff" />
                <Text style={styles.uberActionButtonText}>
                  {t('profile.security.update_button', 'Update Password')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Security; 