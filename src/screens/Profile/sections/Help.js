import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert, SafeAreaView, StatusBar, Platform, I18nManager } from 'react-native';
import { styles } from '../styles';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import DeviceInfo from 'react-native-device-info';
import { checkVersion } from "react-native-check-version";

const Help = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = React.useState('1.0.0');
  const [buildNumber, setBuildNumber] = React.useState('1');
  const [latestVersion, setLatestVersion] = React.useState(null);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);

  React.useEffect(() => {
    const getVersionInfo = async () => {
      try {
        const version = await DeviceInfo.getVersion();
        const build = await DeviceInfo.getBuildNumber();
        setAppVersion(version);
        setBuildNumber(build);
        
        // Check for updates
        const versionCheck = await checkVersion();
        if (versionCheck.needsUpdate) {
          setLatestVersion(versionCheck.latestVersion);
          setUpdateAvailable(true);
        }
      } catch (error) {
        console.error('Error getting app version:', error);
      }
    };

    getVersionInfo();
  }, []);

  const handleCall = () => {
    const phoneNumber = `tel:${36848020}`;
    Linking.openURL(phoneNumber).catch((err) => {
      console.error('Failed to open phone call:', err);
      Alert.alert(t('errors.title'), t('errors.phone_call'));
    });
  };

  const handleEmail = () => {
    const email = 'mailto:support@tawsilet.com';
    Linking.openURL(email).catch((err) => {
      console.error('Failed to open email:', err);
      Alert.alert(t('errors.title'), t('help.errors.email'));
    });
  };

  const handleWhatsApp = () => {
    const whatsapp = 'whatsapp://send?phone=+21636848020';
    Linking.openURL(whatsapp).catch((err) => {
      console.error('Failed to open WhatsApp:', err);
      Alert.alert(t('errors.title'), t('help.errors.whatsapp'));
    });
  };

  const handleUpdate = async () => {
    try {
      const versionCheck = await checkVersion();
      if (versionCheck.url) {
        Linking.openURL(versionCheck.url).catch((err) => {
          console.error('Failed to open store URL:', err);
          Alert.alert(t('errors.title'), t('help.errors.update_store'));
        });
      }
    } catch (error) {
      console.error('Error handling update:', error);
      Alert.alert(t('errors.title'), t('help.errors.update_failed'));
    }
  };

  const renderHelpOption = (icon, title, description, onPress, iconColor = "#007AFF") => (
    <TouchableOpacity
      style={styles.uberHelpOption}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.uberHelpOptionIcon, { backgroundColor: `${iconColor}15` }]}>
        <Icon name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.uberHelpOptionContent}>
        <Text style={styles.uberHelpOptionTitle}>{title}</Text>
        <Text style={styles.uberHelpOptionDescription}>{description}</Text>
      </View>
      <Icon 
        name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} 
        size={20} 
        color="#8E8E93" 
      />
    </TouchableOpacity>
  );

  const renderFAQItem = (question, answer) => (
    <View style={styles.uberFAQItem}>
      <View style={styles.uberFAQHeader}>
        <Icon name="help-circle-outline" size={20} color="#007AFF" />
        <Text style={styles.uberFAQQuestion}>{question}</Text>
      </View>
      <Text style={styles.uberFAQAnswer}>{answer}</Text>
    </View>
  );

  const renderContactOption = (icon, title, subtitle, onPress, iconColor) => (
    <TouchableOpacity
      style={styles.uberContactOption}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.uberContactIcon, { backgroundColor: `${iconColor}15` }]}>
        <Icon name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.uberContactContent}>
        <Text style={styles.uberContactTitle}>{title}</Text>
        <Text style={styles.uberContactSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.uberContainer}>
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
            <Text style={styles.uberSectionTitle}>{t('help.title')}</Text>
          
          </View>
          
          <View style={styles.uberHeaderSpacer} />
        </View>

        <ScrollView
          style={styles.uberScrollView}
          contentContainerStyle={styles.uberScrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Actions Section */}
          <View style={styles.uberFormSection}>
            <View style={styles.uberSectionHeaderInline}>
              <Icon name="flash-outline" size={24} color="#000" />
              <Text style={styles.uberSectionHeaderTitle}>
                {t('help.quick_actions', 'Quick Actions')}
              </Text>
            </View>

            {renderHelpOption(
              'ticket-outline',
              t('tickets.title', 'Support Tickets'),
              t('tickets.description', 'Create and manage support tickets'),
              () => navigation.navigate("TicketScreen"),
              "#007AFF"
            )}
          </View>

          {/* Contact Support Section */}
          <View style={styles.uberFormSection}>
            <View style={styles.uberSectionHeaderInline}>
              <Icon name="headset" size={24} color="#000" />
              <Text style={styles.uberSectionHeaderTitle}>
                {t('help.contact_support', 'Contact Support')}
              </Text>
            </View>

            <View style={styles.uberContactGrid}>
            

              {renderContactOption(
                'email-outline',
                t('help.contact.email', 'Email Support'),
                'support@tawsilet.com',
                handleEmail,
                '#007AFF'
              )}

            
            </View>
          </View>

          {/* FAQ Section */}
          <View style={styles.uberFormSection}>
            <View style={styles.uberSectionHeaderInline}>
              <Icon name="frequently-asked-questions" size={24} color="#000" />
              <Text style={styles.uberSectionHeaderTitle}>
                {t('help.faq.title', 'Frequently Asked Questions')}
              </Text>
            </View>

            {renderFAQItem(
              t('help.faq.personal_info.question'),
              t('help.faq.personal_info.answer')
            )}

            {renderFAQItem(
              t('help.faq.password.question'),
              t('help.faq.password.answer')
            )}

            {renderFAQItem(
              t('help.faq.booking.question', 'How do I book a ride?'),
              t('help.faq.booking.answer', 'Open the app, set your pickup and destination, choose your vehicle type, and confirm your booking.')
            )}

            {renderFAQItem(
              t('help.faq.payment.question', 'What payment methods are accepted?'),
              t('help.faq.payment.answer', 'We accept cash payments and various digital payment methods. You can manage your payment options in the app settings.')
            )}
          </View>

          {/* App Information Section */}
          <View style={styles.uberFormSection}>
            <View style={styles.uberSectionHeaderInline}>
              <Icon name="information-outline" size={24} color="#000" />
              <Text style={styles.uberSectionHeaderTitle}>
                {t('help.app_info', 'App Information')}
              </Text>
            </View>

            <View style={styles.uberAppInfoContainer}>
              <View style={styles.uberAppInfoItem}>
                <Text style={styles.uberAppInfoLabel}>
                  {t('help.app_version', 'App Version')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.uberAppInfoValue}>{appVersion}</Text>
                  {updateAvailable && (
                    <View style={{ 
                      backgroundColor: '#FF3B30', 
                      paddingHorizontal: 8, 
                      paddingVertical: 2, 
                      borderRadius: 10, 
                      marginLeft: 8 
                    }}>
                      <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                        {t('help.update_available', 'Update Available')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
              
              
              {updateAvailable && latestVersion && (
                <>
                  <View style={styles.uberAppInfoDivider} />
                  
                  <View style={styles.uberAppInfoItem}>
                    <Text style={styles.uberAppInfoLabel}>
                      {t('help.latest_version', 'Latest Version')}
                    </Text>
                    <Text style={[styles.uberAppInfoValue, { color: '#007AFF' }]}>
                      {latestVersion}
                    </Text>
                  </View>
                  
                  <View style={styles.uberAppInfoDivider} />
                  
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#007AFF',
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                      alignItems: 'center',
                      marginTop: 10
                    }}
                    onPress={handleUpdate}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                      {t('help.update_now', 'Update Now')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              
              <View style={styles.uberAppInfoDivider} />
              
              <View style={styles.uberAppInfoItem}>
                <Text style={styles.uberAppInfoLabel}>
                  {t('help.last_updated', 'Last Updated')}
                </Text>
                <Text style={styles.uberAppInfoValue}>
                  {new Date().toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.uberBottomSpacing} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default Help; 