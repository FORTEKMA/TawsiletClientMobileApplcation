import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, SafeAreaView, StatusBar, Keyboard, TouchableWithoutFeedback ,I18nManager} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import PhoneInput from 'react-native-phone-input';
import CountryPicker from 'react-native-country-picker-modal';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles } from '../styles';
import { updateUser, getCurrentUser,updateUserSwitcher } from '../../../store/userSlice/userSlice';
import Header from '../components/Header';
import OtpModal from '../components/OtpModal';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native';
import api from '../../../utils/api';

const PersonalInfo = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
  const user = useSelector((state) => state?.user?.currentUser);
  const token = useSelector((state) => state.user.token);
  const phoneInputRef = useRef(null);
 
  const [userData, setUserData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phoneNumber: user?.phoneNumber || "",
  
  });
  const [isDataChanged, setIsDataChanged] = useState(false);
  const [isOtpModalVisible, setOtpModalVisible] = useState(false);
  const [isFlagsVisible, setFlagsVisible] = useState(false);
  
  // Timer states for preventing multiple updates
  const [timer, setTimer] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);
 
  const onSelectCountry = (country) => {
    phoneInputRef.current.selectCountry(country.cca2.toLowerCase());
    setFlagsVisible(false);
  };

  const renderCountryFilter = (props) => (
    <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20,width:"100%" }}>
      <View style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{t('profile.personal_info.select_country')}</Text>
        <TouchableOpacity onPress={() => setFlagsVisible(false)}>
          <Icon name="close" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10,height:90 }}>
        <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', marginBottom: 0, height:"100%", }]}>
          <Icon name="search" size={20} color="#ccc" style={{ marginRight: 10 }} />
          <TextInput
            {...props}
            style={{
              flex: 1,
              height:90,
              textAlign: I18nManager.isRTL ? 'right' : 'left',
               
            }}
            placeholder={t('login.search')}
            placeholderTextColor="#ccc"
            autoFocus
          />
        </View>
      </View>
    </View>
  );

  
  useEffect(() => {
    if (phoneInputRef.current) {
      phoneInputRef.current.setValue(userData.phoneNumber);
    }
  }, []);

  useEffect(() => {
    if (
      user?.phoneNumber !== userData.phoneNumber  
    ) {
      setIsDataChanged(true);
    } else {
      setIsDataChanged(false);
    }
  }, [userData, user]);

 

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleUpdate = async () => {
    try {
      setIsLoading(true);

      const payload = {
        id: user?.id,
        ...userData,
        phoneNumber: userData.phoneNumber.replace(/\s/g, ""),
      };

    

      await dispatch(updateUser(payload)).unwrap();

    

      await dispatch(getCurrentUser());

      Toast.show({
        type: 'success',
        text1: t("common.success"),
        text2: t("profile.personal_info.update_success"),
        position: 'top'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t("common.error"),
        text2: error?.message || t("profile.personal_info.update_error"),
        position: 'top'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    

    if (userData.phoneNumber !== user.phoneNumber) {
      if (phoneInputRef.current && !phoneInputRef.current.isValidNumber()) {
        Toast.show({
          type: 'error',
          text1: t("common.error"),
          text2: t("signup.step4.errors.invalid_phone"),
          position: 'top'
        });
        return;
      }
      setIsLoading(true);
      try {
        const phone = userData.phoneNumber.replace(/\s+/g, "").replace("+", "");
        const phoneResponse = await api.get(
          `/users?filters[phoneNumber][$endsWith]=${phone}`
        );

        if (Array.isArray(phoneResponse.data) && phoneResponse.data.length > 0) {
          Toast.show({
            type: 'error',
            text1: t("common.error"),
            text2: t("signup.step4.errors.phone_exists"),
            position: 'top'
          });
          return;
        }
        // This is where you would call your API to send an OTP
        // For now, we'll just open the modal
       await api.post('codes/send-otp', { phoneNumber: userData.phoneNumber.replace(/\s/g, '') });

        // Set timer to prevent multiple attempts
        setTimer(60);
        setResendAttempts(0);
        setOtpModalVisible(true);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: t("common.error"),
          text2: t("profile.personal_info.otp_send_error"),
          position: 'top'
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      handleUpdate();
    }
  };

  const handleOtpSuccess = async () => {
    await handleUpdate();
  };

  const handleOtpError = (error) => {
    console.log('OTP Error:', error);
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    
    try {
      await api.post('codes/send-otp', { phoneNumber: userData.phoneNumber.replace(/\s/g, '') });
      const nextAttempt = resendAttempts + 1;
      setResendAttempts(nextAttempt);
      setTimer(60 * Math.pow(2, nextAttempt - 1));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t("common.error"),
        text2: t("profile.personal_info.otp_send_error"),
        position: 'top'
      });
    }
  };

  const renderInput = (
    label,
    field,
    placeholder,
    keyboardType = "default",
    editable = true,
    icon = null
  ) => (
    <View style={styles.uberInputContainer}>
      <Text style={styles.uberInputLabel}>{t(label)}</Text>
      <View style={styles.uberInputWrapper}>
        {icon && (
          <View style={styles.uberInputIconContainer}>
            <MaterialCommunityIcons name={icon} size={20} color="#8E8E93" />
          </View>
        )}
        <TextInput
          style={[
            styles.uberInput,
            { color: editable ? "#000" : "#8E8E93" },
            !editable && styles.uberInputDisabled
          ]}
          placeholder={t(placeholder)}
          placeholderTextColor="#8E8E93"
          value={field === "email" ? user.email : userData[field]}
          onChangeText={(text) => setUserData({ ...userData, [field]: text })}
          keyboardType={keyboardType}
          editable={editable}
        />
        {!editable && (
          <View style={styles.uberInputLockContainer}>
            <MaterialCommunityIcons name="lock-outline" size={16} color="#8E8E93" />
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.uberContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
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
                <MaterialCommunityIcons 
                  name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} 
                  size={24} 
                  color="#000" 
                />
              </TouchableOpacity>
              
                 <Text style={styles.uberSectionTitle}>{t("profile.personal_info.title")}</Text>
                 
              <View style={styles.uberHeaderSpacer} />
            </View>
           
            <ScrollView
              style={styles.uberScrollView}
              contentContainerStyle={styles.uberScrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Personal Information Section */}
              <View style={styles.uberFormSection}>
                <View style={styles.uberSectionHeaderInline}>
                  <MaterialCommunityIcons name="account-outline" size={24} color="#000" />
                  <Text style={styles.uberSectionHeaderTitle}>
                    {t("profile.personal_info.section_title", "Personal Information")}
                  </Text>
                </View>

                {renderInput(
                  "profile.personal_info.email",
                  "email",
                  "profile.personal_info.email_placeholder",
                  "email-address",
                  false,
                  "email-outline"
                )}

                <View style={styles.uberInputContainer}>
                  <Text style={styles.uberInputLabel}>{t("profile.personal_info.phone")}</Text>
                  <View style={styles.uberInputWrapper}>
                    
                    <PhoneInput
                      ref={phoneInputRef}
                      autoFormat
                      style={[
                        styles.uberPhoneInput,
                        {
                          flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
                          textAlign: I18nManager.isRTL ? 'right' : 'left',
                        }
                      ]}
                      initialCountry="tn"
                      textStyle={{ color: "#000", fontSize: 16 }}
                      textProps={{
                        paddingHorizontal: I18nManager.isRTL ? 10 : 4,
                        placeholder: t("profile.personal_info.phone_placeholder"),
                        placeholderTextColor: "#8E8E93",
                      }}
                      value={userData.phoneNumber}
                      onChangePhoneNumber={(number) => {
                        setUserData({ ...userData, phoneNumber: number });
                      }}
                      onPressFlag={() => setFlagsVisible(true)}
                    />
                  </View>
                  <CountryPicker
                    withFilter
                    withFlag
                    withCallingCode
                    placeholder=""
                    onSelect={onSelectCountry}
                    visible={isFlagsVisible}
                    onClose={() => setFlagsVisible(false)}
                    translation={I18nManager.isRTL ? "ar" : "fr"}
                    renderCountryFilter={renderCountryFilter}
                    modalProps={{
                      presentationStyle: 'pageSheet',
                    }}
                    withCloseButton={false}
                  />
                </View>
              </View>

              {/* Information Notice */}
              <View style={styles.uberNoticeContainer}>
                <View style={styles.uberNoticeIconContainer}>
                  <MaterialCommunityIcons name="information-outline" size={20} color="#007AFF" />
                </View>
                <Text style={styles.uberNoticeText}>
                  {t("profile.personal_info.notice", "Changes to your phone number will require verification via SMS.")}
                </Text>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>

        {/* Modern Action Button */}
        <View style={styles.uberActionContainer}>
          <TouchableOpacity
            style={[
              styles.uberActionButton,
              (isLoading || !isDataChanged ) && styles.uberActionButtonDisabled
            ]}
            onPress={handleSaveChanges}
            disabled={isLoading || !isDataChanged }
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" />
                <Text style={styles.uberActionButtonText}>{t("common.save_changes", "Save Changes")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <OtpModal
        isVisible={isOtpModalVisible}
        onClose={() => setOtpModalVisible(false)}
        phoneNumber={userData.phoneNumber}
        onSuccess={handleOtpSuccess}
        onError={handleOtpError}
        timer={timer}
        onResend={handleResendOtp}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
    </SafeAreaView>
  );
};

export default PersonalInfo; 