import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { styles } from '../styles';
import { useDispatch } from 'react-redux';
import {
  userLogin,
  updateUser,
  getCurrentUser,
  setRememberMe,
} from '../../../store/userSlice/userSlice';
import { useTranslation } from 'react-i18next';
import { OneSignal } from 'react-native-onesignal';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EmailLoginForm = ({ onLoginSuccess, hideForgetPassword }) => {
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [rememberMe, setRememberMeState] = useState(true);
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    defaultValues: {
      identifier: '',
      password: '',
    },
    mode: 'onChange',
  });
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigation = useNavigation();

  useEffect(() => {
    const loadRememberedUser = async () => {
      const remembered = await AsyncStorage.getItem('rememberMe');
      const identifier = await AsyncStorage.getItem('rememberedIdentifier');
      if (remembered === 'true' && identifier) {
        setValue('identifier', identifier);
        setRememberMeState(true);
        dispatch(setRememberMe({ remember: true, identifier }));
      }
    };
    loadRememberedUser();
  }, [dispatch, setValue]);

  const onSubmit = async data => {
    setIsLoading(true);
    setLoginError('');
    dispatch(setRememberMe({ remember: rememberMe, identifier: data.identifier }));
    try {
      const result = await dispatch(userLogin(data));
      if (result?.payload?.error) {
        setLoginError(t('login.invalidCredentials'));
      } else {
        navigation.goBack();
        if (onLoginSuccess) {
          onLoginSuccess();
        }

      }
    } catch (error) {
      console.log(error);
      setLoginError(t('login.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.inputContainer}>
        <Controller
          control={control}
          name="identifier"
          rules={{
            required: t('login.emailRequired'),
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: t('login.invalidEmail'),
            },
          }}
          render={({ field: { onChange, value, onBlur } }) => (
            <TextInput
              style={[styles.input, errors.identifier && styles.inputError]}
              placeholder={t('login.emailPlaceholder')}
              placeholderTextColor="#9CA3AF"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          )}
        />
        {errors.identifier && (
          <Text style={styles.errorText}>{errors.identifier.message}</Text>
        )}
      </View>

      <View style={styles.inputContainer}>
        <View
          style={[
            styles.passwordInputWrapper,
            errors.password && styles.inputError,
          ]}>
          <Controller
            control={control}
            name="password"
            rules={{
              required: t('login.passwordRequired'),
              minLength: {
                value: 6,
                message: t('login.passwordMinLength'),
              },
            }}
            render={({ field: { onChange, value, onBlur } }) => (
              <TextInput
                style={styles.passwordInput}
                placeholder={t('login.passwordPlaceholder')}
                placeholderTextColor="#9CA3AF"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                secureTextEntry={!show}
              />
            )}
          />
          <TouchableOpacity
            onPress={() => setShow(!show)}
            style={styles.eyeIcon}>
            <Ionicons
              name={show ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>
        {errors.password && (
          <Text style={[styles.errorText, { marginTop: 0 }]}>
            {errors.password.message}
          </Text>
        )}
      </View>

      {loginError ? (
        <Text style={[styles.errorText, { marginTop: 10 }]}>{loginError}</Text>
      ) : null}

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 24,
        marginTop: 8,
      }}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          onPress={() => setRememberMeState(!rememberMe)}>
          <View style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: rememberMe ? '#000000' : '#D1D5DB',
            backgroundColor: rememberMe ? '#000000' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {rememberMe && (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            )}
          </View>
          <Text style={{ color: '#6B7280', fontSize: 14, fontWeight: '500' }}>
            {t('login.rememberMe')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onForgotPassword}>
          <Text style={styles.forgotPassword}>{t('login.forgotPassword')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.btn, isLoading && styles.btnDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.btnText}>{t('login.login')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default EmailLoginForm;
