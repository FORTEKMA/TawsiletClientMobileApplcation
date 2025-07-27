import React, { useState,useEffect, useRef, memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated, Easing,I18nManager, ActivityIndicator } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Ionicons from "react-native-vector-icons/Ionicons"
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {calculateDistanceAndTime} from '../../../utils/CalculateDistanceAndTime';
import i18n from '../../../local';
import ConfirmButton from './ConfirmButton';
import api from '../../../utils/api';
import { 
  trackBookingStepViewed,
  trackBookingStepCompleted,
  trackBookingStepBack,
  trackVehicleSelected
} from '../../../utils/analytics';
import LottieView from 'lottie-react-native';
import loaderAnimation from '../../../utils/loader.json';
import { useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import WomanValidationModal from './WomanValidationModal';
import LoginModal from '../../LoginModal';

const ChooseVehicleComponent = ({ goNext, goBack, formData }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formData.selectedDate);
  const [tripDetails, setTripDetails] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [error, setError] = useState(null);
  const [loadingImages, setLoadingImages] = useState({}); // Track loading state for each image
  const [showLoader, setShowLoader] = useState({}); // Ensure loader shows for at least 1s
  const user = useSelector(state => state.user.currentUser);
  const [showWomanValidationModal, setShowWomanValidationModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [womanValidationForm, setWomanValidationForm] = useState({
    user_with_cin: null,
    cinFront: null,
    cinBack: null,
  });
  const [womanValidationLoading, setWomanValidationLoading] = useState(false);
  
  // Track step view
  useEffect(() => {
    trackBookingStepViewed(3, 'Vehicle Selection');
  }, []);

  // Fetch vehicle options from API
  const fetchVehicleOptions = async () => {
    try {
      setIsLoadingVehicles(true);
      setError(null);
      const response = await api.get('/settings?populate[0]=icon');
   
      if (response?.data?.data && Array.isArray(response?.data?.data)) {
        // Filter out vehicles where show is false
        const visibleVehicles = response?.data?.data.filter(vehicle => vehicle.show !== false);
       
        const processedOptions = visibleVehicles.map(vehicle => ({
          id: vehicle.id,
          key: vehicle.id,
          label: getLocalizedName(vehicle),
          nearby: vehicle.places_numbers || 4,
          icon: { uri: vehicle.icon.url },
          soon: vehicle.soon || false,
          reservation_price: vehicle.reservation_price

        }));
     
        // Sort processedOptions based on id
        const sortedOptions = processedOptions.sort((a, b) => a.id - b.id);
        setVehicleOptions(sortedOptions);
        
        // Set default selected vehicle (only non-coming-soon vehicles)
        const availableVehicles = sortedOptions.filter(vehicle => !vehicle.soon);
        const defaultVehicle = formData.vehicleType || (availableVehicles.length > 0 ? availableVehicles[0] : null);
        setSelected(defaultVehicle);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching vehicle options:', error);
      setError('Failed to load vehicle options. Please try again.');
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  useEffect(() => {
    fetchVehicleOptions();
  }, []);

  // Get localized name based on current language
  const getLocalizedName = (vehicle) => {
    const currentLang = i18nInstance.language;
    switch (currentLang) {
      case 'ar':
        return vehicle.name_ar || vehicle.name_en || 'Vehicle';
      case 'fr':
        return vehicle.name_fr || vehicle.name_en || 'Vehicle';
      default:
        return vehicle.name_en || 'Vehicle';
    }
  };

 
  // Enhanced animation system with Uber-like smooth animations
  const animations = useRef([]).current;
  const slideInAnimation = useRef(new Animated.Value(50)).current;
  const fadeInAnimation = useRef(new Animated.Value(0)).current;

  // Initialize entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideInAnimation, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeInAnimation, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Update animations when vehicle options change
  useEffect(() => {
    // Clear existing animations
    animations.length = 0;
    
    // Create new animations for each vehicle option
    vehicleOptions.forEach(() => {
      animations.push({
        scale: new Animated.Value(1),
        fade: new Animated.Value(1),
        pulse: new Animated.Value(1),
        glow: new Animated.Value(0),
        bounce: new Animated.Value(0)
      });
    });
  }, [vehicleOptions]);

  // Enhanced pulse animation with Uber-like smoothness
  const startPulseAnimation = (index) => {
    if (!animations[index]) return;
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(animations[index].pulse, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true
        }),
        Animated.timing(animations[index].pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const animateSelection = (index) => {
    if (!animations[index]) return;
    
    // Stop all pulse animations
    animations.forEach(anim => {
      if (anim) {
        anim.pulse.stopAnimation();
        anim.pulse.setValue(1);
        anim.bounce.stopAnimation();
      }
    });

    // Create enhanced animations for each option
    const newAnimations = vehicleOptions.map((_, i) => {
      const isSelected = i === index;
      
      return Animated.parallel([
        // Scale animation with bounce
        Animated.spring(animations[i].scale, {
          toValue: isSelected ? 1.05 : 0.95,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        // Fade animation
        Animated.timing(animations[i].fade, {
          toValue: isSelected ? 1 : 0.6,
          duration: 300,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true
        }),
        // Glow animation
        Animated.timing(animations[i].glow, {
          toValue: isSelected ? 1 : 0,
          duration: 300,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true
        }),
        // Bounce animation for selected item
        isSelected ? Animated.sequence([
          Animated.timing(animations[i].bounce, {
            toValue: 1,
            duration: 150,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(animations[i].bounce, {
            toValue: 0,
            duration: 150,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          })
        ]) : Animated.timing(animations[i].bounce, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true
        })
      ]);
    });

    // Run all animations
    Animated.parallel(newAnimations).start(() => {
      if (index !== -1) {
        startPulseAnimation(index);
      }
    });
  };

  // Initialize animations when selected vehicle changes
  useEffect(() => {
    if (selected && vehicleOptions.length > 0 && animations.length > 0) {
      const initialIndex = vehicleOptions.findIndex(opt => opt.id === selected.id);
      if (initialIndex !== -1) {
        animateSelection(initialIndex);
      }
    }
  }, [selected, vehicleOptions, animations.length]);

  useEffect(()=>{
    if (formData.pickupAddress && formData.dropAddress) {
      setIsLoading(true);
      calculateDistanceAndTime(formData.pickupAddress,formData.dropAddress).then(res=>{
        setTripDetails(res);
        goNext(res,false);
        setIsLoading(false);
      })
    }
  },[formData.pickupAddress, formData.dropAddress])
  
 

  const showDatePicker = () => setDatePickerVisible(true);
  const hideDatePicker = () => setDatePickerVisible(false);
  const handleDateConfirm = (date) => {
    setSelectedDate(date);
    hideDatePicker();
  };

  const formatDate = (date) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
   
  };

  const handleVehicleSelect = (option, index) => {
    // Don't allow selection of "coming soon" vehicles
    if (option.soon) {
      return;
    }
    // Special logic for 'for women' vehicle (id=4)
    if (option.id === 4) {
      if (!user) {
        setShowLoginModal(true);
        return;
      }
      console.log(user?.womanValidation);
      if (user?.womanValidation?.validation_state === 'valid') {
        setSelected(option);
        animateSelection(index);
        trackVehicleSelected(option, {
          vehicle_type: option.key,
          vehicle_id: option.id,
          step: 3
        });
        return;
      } else if (user?.womanValidation?.validation_state === 'waiting') {
        Toast.show({
          type: 'info',
          text1: t('choose_vehicle.account_under_validation', 'Your account is under validation.'),
          visibilityTime: 2500,
        });
        return;
      } else if (!user?.womanValidation) {
        setShowWomanValidationModal(true);
        return;
      } else {
        Toast.show({
          type: 'info',
          text1: t('choose_vehicle.must_complete_women_validation', 'You must complete the women validation process to select this vehicle.'),
          visibilityTime: 2500,
        });
        return;
      }
    }
    setSelected(option);
    animateSelection(index);
    // Track vehicle selection
    trackVehicleSelected(option, {
      vehicle_type: option.key,
      vehicle_id: option.id,
      step: 3
    });
  };

  const handleBack = () => {
    trackBookingStepBack(3, 'Vehicle Selection');
    goBack();
  };

  const handleConfirm = () => {
    if (!selected) return;
    
    trackBookingStepCompleted(3, 'Vehicle Selection', {
      vehicle_type: selected.key,
      vehicle_id: selected.id,
      has_scheduled_date: !!selectedDate,
      distance: tripDetails?.distance,
      time: tripDetails?.time
    });
    
    goNext({
      vehicleType: selected,
      selectedDate: selectedDate,
    });
  };

  // Show loading state while fetching vehicles
  if (isLoadingVehicles) {
    return (
      <>
        <View style={localStyles.container}>
          <View style={{ justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={{ fontSize: hp(1.8), color: '#000', marginTop: 15, fontWeight: '500' }}>
              {t('common.loading')}
            </Text>
          </View>
        </View>
      </>
    );
  }

  // Show error state if API fails
  if (error) {
    return (
      <>
        <View style={localStyles.container}>
          <View style={{ justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#FF6B6B" />
            <Text style={{ fontSize: hp(1.8), color: '#000', marginTop: 15, textAlign: 'center', fontWeight: '500' }}>
              {error}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#000',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 12,
                marginTop: 15,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => {
                setIsLoadingVehicles(true);
                setError(null);
                fetchVehicleOptions();
              }}
            >
              <Text style={{ color: '#fff', fontSize: hp(1.6), fontWeight: '600' }}>
                {t('common.retry')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  // Don't render if no vehicles are available
  if (vehicleOptions.length === 0) {
    return (
      <>
        <View style={localStyles.container}>
          <View style={{ justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <MaterialCommunityIcons name="car-off" size={48} color="#BDBDBD" />
            <Text style={{ fontSize: hp(1.8), color: '#000', marginTop: 15, textAlign: 'center', fontWeight: '500' }}>
              No vehicles available
            </Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      {/* Main UI with enhanced animations */}
      <Animated.View style={[
        localStyles.container,
        {
          transform: [{ translateY: slideInAnimation }],
          opacity: fadeInAnimation
        }
      ]}>
        <View>
          {/* Modern header with improved styling */}
          <View style={{gap:12, marginBottom: 24, marginTop: 16, flexDirection: 'row', alignItems: 'center', width:"100%" }}>
            <TouchableOpacity
              style={{ 
                backgroundColor: '#fff', 
                borderRadius: 24, 
                padding: 8, 
                shadowColor: '#000', 
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1, 
                shadowRadius: 8, 
                elevation: 4 
              }}
              onPress={handleBack}
            >
              <MaterialCommunityIcons name={I18nManager.isRTL?"arrow-right": "arrow-left"} size={24} color="#000" />
            </TouchableOpacity>
            <Text style={{ fontWeight: '700', fontSize: hp(2.4), color: '#000' }}>
              {t('booking.step3.select_car')}
            </Text>
          </View>
         
          {/* Enhanced vehicle selection grid */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 24 }}>
            {vehicleOptions.map((option, index) => {
               // Safety check for animations
              if (!animations[index]) {
                return (
                  <View key={option.id} style={{ flex: 1, marginHorizontal: 4 }}>
                    <TouchableOpacity
                      style={{
                        alignItems: 'center',
                        backgroundColor: option.soon ? '#F8F9FA' : (selected?.id === option.id ? '#F0F8FF' : '#fff'),
                        borderRadius: 16,
                        paddingVertical: 16,
                        paddingHorizontal: 8,
                        borderWidth: selected?.id === option.id ? 2 : 1,
                        borderColor: option.soon ? '#E9ECEF' : (selected?.id === option.id ? '#000' : '#E9ECEF'),
                        opacity: option.soon ? 0.6 : 1,
                        shadowColor: selected?.id === option.id ? '#000' : '#000',
                        shadowOffset: { width: 0, height: selected?.id === option.id ? 4 : 2 },
                        shadowOpacity: selected?.id === option.id ? 0.15 : 0.08,
                        shadowRadius: selected?.id === option.id ? 8 : 4,
                        elevation: selected?.id === option.id ? 6 : 2,
                      }}
                      onPress={() => handleVehicleSelect(option, index)}
                      disabled={option.soon}
                    >
                      <View style={{
                        backgroundColor: selected?.id === option.id ? '#000' : '#F8F9FA', 
                        borderRadius: 16, 
                        padding: 12, 
                        marginBottom: 8,
                        width: 80,
                        height: 80,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        {showLoader[option.id] ? (
                          <LottieView
                            source={loaderAnimation}
                            autoPlay
                            loop
                            speed={4}
                            resizeMode="contain"
                            style={{height:60, width:60}}
                          />
                        ) : null}
                        <Image 
                          source={option.icon} 
                          style={{ 
                            width: 64, 
                            height: 64,
                            resizeMode: "contain",
                            opacity: option.soon ? 0.5 : 1,
                            position: showLoader[option.id] ? 'absolute' : 'relative',
                            zIndex: showLoader[option.id] ? -1 : 1,
                            tintColor: selected?.id === option.id ? '#fff' : undefined
                          }} 
                          onLoadStart={() => {
                            setLoadingImages(prev => ({ ...prev, [option.id]: true }));
                            setShowLoader(prev => ({ ...prev, [option.id]: true }));
                          }}
                          onLoadEnd={() => {
                            setLoadingImages(prev => ({ ...prev, [option.id]: false }));
                            setShowLoader(prev => ({ ...prev, [option.id]: false }));
                          }}
                          onError={() => {
                            setLoadingImages(prev => ({ ...prev, [option.id]: false }));
                            setShowLoader(prev => ({ ...prev, [option.id]: false }));
                          }}
                        />
                      </View>
                      <Text style={{ 
                        fontWeight: '700', 
                        color: option.soon ? '#6C757D' : (selected?.id === option.id ? '#000' : '#495057'), 
                        fontSize: hp(1.6),
                        textAlign: 'center',
                        marginBottom: 4
                      }}>
                        {option.label}
                      </Text>
                      <Text style={{ 
                        fontWeight: '500', 
                        color: option.soon ? '#ADB5BD' : '#6C757D', 
                        fontSize: hp(1.3),
                        textAlign: 'center'
                      }}>
                        {option.soon ? t('choose_vehicle.coming_soon') : `${option.nearby} ${t('choose_vehicle.seats')}`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <View key={option.id} style={{ flex: 1, marginHorizontal: 4 }}>
                  <Animated.View
                    style={{
                      transform: [
                        { scale: animations[index].scale },
                        { scale: animations[index].pulse },
                        { translateY: Animated.multiply(animations[index].bounce, -10) }
                      ],
                      opacity: animations[index].fade,
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        alignItems: 'center',
                        backgroundColor: option.soon ? '#F8F9FA' : (selected?.id === option.id ? '#F0F8FF' : '#fff'),
                        borderRadius: 16,
                        paddingVertical: 16,
                        paddingHorizontal: 8,
                        borderWidth: selected?.id === option.id ? 2 : 1,
                        borderColor: option.soon ? '#E9ECEF' : (selected?.id === option.id ? '#000' : '#E9ECEF'),
                        opacity: option.soon ? 0.6 : 1,
                        shadowColor: selected?.id === option.id ? '#000' : '#000',
                        shadowOffset: { width: 0, height: selected?.id === option.id ? 4 : 2 },
                        shadowOpacity: selected?.id === option.id ? 0.15 : 0.08,
                        shadowRadius: selected?.id === option.id ? 8 : 4,
                        elevation: selected?.id === option.id ? 6 : 2,
                      }}
                      onPress={() => handleVehicleSelect(option, index)}
                      disabled={option.soon}
                    >
                      <Animated.View style={{
                        backgroundColor: selected?.id === option.id ? '#000' : '#F8F9FA', 
                        borderRadius: 16, 
                        padding: 12, 
                        marginBottom: 8,
                        width: 80,
                        height: 80,
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: selected?.id === option.id ? '#000' : 'transparent',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: Animated.multiply(animations[index].glow, 0.3),
                        shadowRadius: 8,
                        elevation: Animated.multiply(animations[index].glow, 4),
                      }}>
                        {showLoader[option.id] ? (
                          <LottieView
                            source={loaderAnimation}
                            autoPlay
                            loop
                            speed={4}
                            resizeMode="contain"
                            style={{height:60, width:60}}
                          />
                        ) : null}
                        <Image 
                          source={option.icon} 
                          style={{ 
                            width: 64, 
                            height: 64,
                            resizeMode: "contain",
                            opacity: option.soon ? 0.5 : 1,
                            position: showLoader[option.id] ? 'absolute' : 'relative',
                            zIndex: showLoader[option.id] ? -1 : 1,
                            tintColor: selected?.id === option.id ? '#fff' : undefined
                          }} 
                          onLoadStart={() => {
                            setLoadingImages(prev => ({ ...prev, [option.id]: true }));
                            setShowLoader(prev => ({ ...prev, [option.id]: true }));
                          }}
                          onLoadEnd={() => {
                            setLoadingImages(prev => ({ ...prev, [option.id]: false }));
                            setShowLoader(prev => ({ ...prev, [option.id]: false }));
                          }}
                          onError={() => {
                            setLoadingImages(prev => ({ ...prev, [option.id]: false }));
                            setShowLoader(prev => ({ ...prev, [option.id]: false }));
                          }}
                        />
                      </Animated.View>
                      <Text style={{ 
                        fontWeight: '700', 
                        color: option.soon ? '#6C757D' : (selected?.id === option.id ? '#000' : '#495057'), 
                        fontSize: hp(1.6),
                        textAlign: 'center',
                        marginBottom: 4
                      }}>
                        {option.label}
                      </Text>
                      <Text style={{ 
                        fontWeight: '500', 
                        color: option.soon ? '#ADB5BD' : '#6C757D', 
                        fontSize: hp(1.3),
                        textAlign: 'center'
                      }}>
                        {option.soon ? t('choose_vehicle.coming_soon') : `${option.nearby} ${t('choose_vehicle.seats')}`}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              );
            })}
          </View>

          {/* Enhanced schedule ride section */}
          <View style={{
            backgroundColor: '#F8F9FA',
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <Text style={{ 
              fontWeight: '600', 
              fontSize: hp(1.8), 
              color: '#000', 
              marginBottom: 12 
            }}>
              {t('choose_vehicle.schedule_ride')}
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E9ECEF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
              onPress={showDatePicker}
            >
              <Ionicons 
                name="calendar-outline" 
                size={24} 
                color="#6C757D" 
                style={{ marginRight: 12 }} 
              />
              <Text style={{ 
                flex: 1, 
                fontSize: hp(1.7), 
                color: selectedDate ? '#000' : '#6C757D',
                fontWeight: selectedDate ? '600' : '500'
              }}>
                {selectedDate ? formatDate(selectedDate) : t('choose_vehicle.select_date_time')}
              </Text>
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={20} 
                color="#6C757D" 
              />
            </TouchableOpacity>
          </View>

          {/* Enhanced confirm button */}
          <ConfirmButton 
            onPress={handleConfirm} 
            disabled={!selected || isLoading} 
            isLoading={isLoading}
            style={{
              backgroundColor: selected && !isLoading ? '#000' : '#ADB5BD',
              borderRadius: 16,
              paddingVertical: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: selected && !isLoading ? 0.2 : 0,
              shadowRadius: 8,
              elevation: selected && !isLoading ? 6 : 0,
            }}
            textStyle={{
              color: '#fff',
              fontSize: hp(1.8),
              fontWeight: '700'
            }}
          />
        </View>
      </Animated.View>

      {/* Date picker modal */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="datetime"
        onConfirm={handleDateConfirm}
        onCancel={hideDatePicker}
        minimumDate={new Date()}
        textColor="#000"
      />

      {/* Woman validation modal */}
      <WomanValidationModal
        visible={showWomanValidationModal}
        onClose={() => setShowWomanValidationModal(false)}
        formData={womanValidationForm}
        setFormData={setWomanValidationForm}
        isLoading={womanValidationLoading}
        setIsLoading={setWomanValidationLoading}
      />

      {/* Login modal */}
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
};

// Enhanced local styles with modern design
const localStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    minHeight: 400,
  }
});

export default memo(ChooseVehicleComponent);

