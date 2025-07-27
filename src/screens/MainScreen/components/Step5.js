import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, I18nManager, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import { sendActionToDrivers } from '../../../utils/CalculateDistanceAndTime';

const Step5 = ({
  goBack,
  rideData,
  handleReset
}) => {
  const { t } = useTranslation();
  const [selectedPayment, setSelectedPayment] = useState('cash');
  const navigation = useNavigation();
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  // Initialize animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const paymentOptions = [
    {
      key: 'online',
      label: t('payment.online', 'Online Payment'),
      icon: 'credit-card',
      description: t('payment.online_description', 'Pay securely with your card'),
      disabled: true,
      comingSoon: true,
    },
    {
      key: 'cash',
      label: t('payment.cash', 'Cash Payment'),
      icon: 'cash',
      description: t('payment.cash_description', 'Pay with cash to your driver'),
      disabled: false,
      comingSoon: false,
    },
  ];

  const handlePaymentSelect = (paymentKey) => {
    if (paymentOptions.find(option => option.key === paymentKey)?.disabled) return;
    
    setSelectedPayment(paymentKey);
  };

  const handleConfirmPayment = () => {
    // Animate button press
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    sendActionToDrivers(rideData?.notificationId, "can_start_ride");
    navigation.navigate('Historique', {
      screen: 'OrderDetails',
      params: {
        id: rideData?.commande?.data?.documentId
      }
    });
    handleReset();
  };

  const handleBack = () => {
    goBack();
  };

  return (
    <Animated.View 
      style={[
        localStyles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        }
      ]}
    >
      {/* Uber-style Header */}
      <Animated.View 
        style={[
          localStyles.uberHeader,
          {
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        <TouchableOpacity 
          style={localStyles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} 
            size={28} 
            color="#000" 
          />
        </TouchableOpacity>
        
        <View style={localStyles.headerContent}>
          <Text style={localStyles.uberTitle}>
            {t('booking.step5.select_payment', 'Select Payment Method')}
          </Text>
          <Text style={localStyles.uberSubtitle}>
            {t('choose_payment_method', 'Choose how you want to pay')}
          </Text>
        </View>
      </Animated.View>

      {/* Uber-style Content */}
      <View style={localStyles.uberContent}>
        {/* Payment Options */}
        <Animated.View 
          style={[
            localStyles.optionsContainer,
            {
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          {paymentOptions.map((option, index) => (
            <Animated.View
              key={option.key}
              style={[
                localStyles.optionWrapper,
                {
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 300],
                        outputRange: [0, 50 * (index + 1)],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  localStyles.optionCard,
                  selectedPayment === option.key && localStyles.selectedOption,
                  option.disabled && localStyles.disabledOption
                ]}
                onPress={() => handlePaymentSelect(option.key)}
                disabled={option.disabled}
                activeOpacity={0.8}
              >
                <View style={localStyles.optionContent}>
                  <View style={localStyles.optionLeft}>
                    <View style={[
                      localStyles.iconContainer,
                      selectedPayment === option.key && localStyles.selectedIconContainer,
                      option.disabled && localStyles.disabledIconContainer
                    ]}>
                      <MaterialCommunityIcons 
                        name={option.icon} 
                        size={28} 
                        color={
                          option.disabled 
                            ? '#BDBDBD' 
                            : selectedPayment === option.key 
                              ? '#fff' 
                              : '#000'
                        } 
                      />
                    </View>
                    
                    <View style={localStyles.optionTextContainer}>
                      <View style={localStyles.labelContainer}>
                        <Text style={[
                          localStyles.optionLabel,
                          option.disabled && localStyles.disabledText
                        ]}>
                          {option.label}
                        </Text>
                        {option.comingSoon && (
                          <View style={localStyles.comingSoonBadge}>
                            <Text style={localStyles.comingSoonText}>
                              {t('coming_soon', 'Coming Soon')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[
                        localStyles.optionDescription,
                        option.disabled && localStyles.disabledText
                      ]}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={localStyles.optionRight}>
                    <View style={[
                      localStyles.radioButton,
                      selectedPayment === option.key && localStyles.selectedRadio,
                      option.disabled && localStyles.disabledRadio
                    ]}>
                      {selectedPayment === option.key && !option.disabled && (
                        <View style={localStyles.radioInner} />
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Payment Summary */}
        <Animated.View 
          style={[
            localStyles.summaryCard,
            {
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          <View style={localStyles.summaryHeader}>
            <Text style={localStyles.summaryTitle}>
              {t('payment_summary', 'Payment Summary')}
            </Text>
          </View>
          
          <View style={localStyles.summaryContent}>
            <View style={localStyles.summaryRow}>
              <Text style={localStyles.summaryLabel}>
                {t('selected_method', 'Selected Method')}
              </Text>
              <Text style={localStyles.summaryValue}>
                {paymentOptions.find(option => option.key === selectedPayment)?.label}
              </Text>
            </View>
            
            <View style={localStyles.summaryRow}>
              <Text style={localStyles.summaryLabel}>
                {t('estimated_fare', 'Estimated Fare')}
              </Text>
              <Text style={localStyles.summaryValue}>
                {rideData?.estimatedPrice ? `${rideData.estimatedPrice.toFixed(2)} ${t('currency', 'DT')}` : t('calculating', 'Calculating...')}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Uber-style Confirm Button */}
        <Animated.View 
          style={[
            localStyles.buttonContainer,
            {
              transform: [{ scale: buttonScaleAnim }],
            }
          ]}
        >
          <TouchableOpacity
            style={localStyles.uberButton}
            onPress={handleConfirmPayment}
            activeOpacity={0.8}
          >
            <Text style={localStyles.uberButtonText}>
              {t('booking.step5.confirm_payment', 'Confirm Payment Method')}
            </Text>
            <MaterialCommunityIcons 
              name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  uberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  uberTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  uberSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  uberContent: {
    paddingHorizontal: 24,
    flex: 1,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionWrapper: {
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedOption: {
    borderColor: '#000',
    backgroundColor: '#FAFAFA',
  },
  disabledOption: {
    opacity: 0.5,
    backgroundColor: '#F8F8F8',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedIconContainer: {
    backgroundColor: '#000',
  },
  disabledIconContainer: {
    backgroundColor: '#F0F0F0',
  },
  optionTextContainer: {
    flex: 1,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  comingSoonBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#856404',
  },
  optionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  disabledText: {
    color: '#BDBDBD',
  },
  optionRight: {
    marginLeft: 16,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadio: {
    borderColor: '#000',
  },
  disabledRadio: {
    borderColor: '#BDBDBD',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryHeader: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  summaryContent: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  uberButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  uberButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default Step5;

