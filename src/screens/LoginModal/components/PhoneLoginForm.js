import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, I18nManager, Image } from 'react-native';
import PhoneInput from 'react-native-phone-input';
import CountryPicker from 'react-native-country-picker-modal';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';
import { useNavigation } from '@react-navigation/native';
import { ScrollView } from 'react-native-gesture-handler';
import api from '../../../utils/api';
import Toast from 'react-native-toast-message';
import { ActivityIndicator } from 'react-native';

const PhoneLoginForm = React.memo(() => {
  const { t } = useTranslation();
  const phoneInput = useRef(null);
  const [isFlagsVisible, setIsFlagsVisible] = useState(false);
  const navigation = useNavigation();
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const [country, setCountry] = useState({
    cca2: 'tn',
    callingCode: '216',
    flag: '🇹🇳'
  });

  const onSelectCountry = useCallback((selectedCountry) => {
    setCountry(selectedCountry);
    if (phoneInput.current) {
      phoneInput.current.selectCountry(selectedCountry.cca2.toLowerCase());
    }
    setIsFlagsVisible(false);
  }, []);

  const isPhoneNumberValid = useCallback(() => {
    if (!number) {
      Alert.alert(t('login.enterPhoneNumber'));
      return false;
    }
    const numericNumber = number.replace(/\D/g, '');
    const minimumLength = 7;
    if (numericNumber.length < minimumLength) {
      Alert.alert(t('login.invalidPhoneNumber'));
      return false;
    }
    return true;
  }, [number, t]);

  const handleContinue = useCallback(async () => {
    if (!isPhoneNumberValid()) return;
    setLoading(true);
    try {
      // Remove spaces and non-numeric characters for consistency
      console.log(`/users?filters[phoneNumber][$eq]=${"+"+number.replace(/\D/g, '')}`)
      // Query Strapi for user with this phone number
      const res = await api.get(`/users?filters[phoneNumber][$endsWith]=${number.replace(/\D/g, '')}`);
     
      const users = res.data;
      if(users.length>0){
        const user = users[0];
        if (user.blocked) {
          Toast.show({
            type: 'error',
            text1: t('common.error'),
            text2: t('auth.account_blocked'),
            position: 'top',
            visibilityTime: 3000
          });
          setLoading(false);
          return;
        }
        
      }  
   navigation.navigate('confirmation', { number });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('login.apiError'),
        position: 'top',
        visibilityTime: 3000
      });
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [number, isPhoneNumberValid, t, navigation]);

  

  return (
     
        <View style={styles.formContainer}>
       
            <View style={styles.inputContainer}>
              <View style={[styles.passwordInputWrapper, { marginBottom: 0 }]}>
                <PhoneInput
                  autoFormat
                  initialCountry="tn"
                  onPressFlag={() => setIsFlagsVisible(true)}
                  onChangePhoneNumber={setNumber}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: '#222',
                    paddingVertical: 5,
                    paddingHorizontal: 18,
                    height: 50,
                    flexDirection:I18nManager.isRTL? "row-reverse":"row",
                    textAlign: I18nManager.isRTL ? 'right' : 'left',
                  }}
                  textComponent={TextInput}
                  textProps={{
                    placeholder: t('login.phoneNumber'),
                    placeholderTextColor: '#8391A1',
                    style: { 
                      color: '#222',
                      flex: 1,
                      flexDirection:"row",
                      paddingHorizontal:10
                         }
                  }}
                  ref={phoneInput}
                  value={number}
                 
                />
              </View>
            </View>

            <CountryPicker
              withFilter
              withFlag
              withAlphaFilter
              withCallingCode
              placeholder=""
              onSelect={onSelectCountry}
              visible={isFlagsVisible}
              translation="fra"
              filterProps={{ placeholder: t('login.search') }}
            />

            <Text style={[styles.forgotPassword, { color: '#8391A1',alignSelf: 'flex-start', }]}>
              {t('login.smsInfo')}
            </Text>
          
            <TouchableOpacity
              style={styles.btn}
              onPress={handleContinue}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#222" />
              ) : (
                <Text style={styles.btnText}>{t('login.continue')}</Text>
              )}
            </TouchableOpacity>
         
        </View>
      
 
  );
});

export default PhoneLoginForm; 