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

 
  // New animation system
  const animations = useRef([]).current;

  // Update animations when vehicle options change
  useEffect(() => {
    // Clear existing animations
    animations.length = 0;
    
    // Create new animations for each vehicle option
    vehicleOptions.forEach(() => {
      animations.push({
        slide: new Animated.Value(0),
        fade: new Animated.Value(1),
        pulse: new Animated.Value(1),
        glow: new Animated.Value(0)
      });
    });
  }, [vehicleOptions]);

  // Pulse animation function
  const startPulseAnimation = (index) => {
    if (!animations[index]) return;
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(animations[index].pulse, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(animations[index].pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
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
      }
    });

    // Create new animations for each option
    const newAnimations = vehicleOptions.map((_, i) => {
      const isSelected = i === index;
      
      return Animated.parallel([
        // Slide animation
        Animated.spring(animations[i].slide, {
          toValue: isSelected ? 0 : -10,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8
        }),
        // Fade animation
        Animated.timing(animations[i].fade, {
          toValue: isSelected ? 1 : 0.7,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        // Glow animation
        Animated.timing(animations[i].glow, {
          toValue: isSelected ? 1 : 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        })
      ]);
    });

    // Run all animations
    Animated.parallel(newAnimations).start(() => {
     
    });

    if (index !== -1) {
      startPulseAnimation(index);
    }
    
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
            <ActivityIndicator size="large" color="#030303" />
            <Text style={{ fontSize: hp(1.8), color: '#030303', marginTop: 15 }}>
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
            <Text style={{ fontSize: hp(1.8), color: '#030303', marginTop: 15, textAlign: 'center' }}>
              {error}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#030303',
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                marginTop: 15
              }}
              onPress={() => {
                setIsLoadingVehicles(true);
                setError(null);
                // Retry fetching vehicles
                fetchVehicleOptions();
              }}
            >
              <Text style={{ color: '#fff', fontSize: hp(1.6) }}>
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
            <Text style={{ fontSize: hp(1.8), color: '#030303', marginTop: 15, textAlign: 'center' }}>
              No vehicles available
            </Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      {/* Main UI */}
      <View style={localStyles.container}>
        <View style={{
          
        }}>

          <View style={{gap:10, marginBottom: 18, marginTop: 10 ,flexDirection: 'row', alignItems: 'center',width:"100%" }}>
          <TouchableOpacity
        style={{  backgroundColor: '#fff', borderRadius: 20, padding: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}
        onPress={handleBack}
      >
        <MaterialCommunityIcons name={I18nManager.isRTL?"arrow-right": "arrow-left"} size={28} color="#030303" />
      </TouchableOpacity>
      <Text style={{ fontWeight: '700', fontSize: hp(2.2), color: '#030303', }}>{t('booking.step3.select_car')}</Text>

          </View>
         
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 18 }}>
            {vehicleOptions.map((option, index) => {
               // Safety check for animations - render without animations if not ready
              if (!animations[index]) {
                return (
                  <View key={option.id} style={{ flex: 1, marginHorizontal: 6 }}>
                    <TouchableOpacity
                      style={{
                        alignItems: 'center',
                        backgroundColor: option.soon ? '#F0F0F0' : (selected?.id === option.id ? '#F6F6F6' : '#fff'),
                        borderRadius: 14,
                        paddingVertical: 12,
                        borderWidth: selected?.id === option.id ? 3 : 1,
                        borderColor: option.soon ? '#E0E0E0' : (selected?.id === option.id ? '#030303' : '#E0E0E0'),
                        opacity: option.soon ? 0.6 : 1,
                       
                      }}
                      onPress={() => handleVehicleSelect(option, index)}
                      disabled={option.soon}
                    >
                      <View style={{backgroundColor:"red", borderRadius: 12, padding: 8, marginBottom: 6,}}>
                      {showLoader[option.id] ? (
                          <LottieView
                            source={loaderAnimation}
                            autoPlay
                            loop

                            speed={4}
                            resizeMode="contain"
                            style={{height:140,width:140}}
                          />
                        ) : null}
                        <Image 
                          source={option.icon} 
                          style={{ 
                            width: 72, 
                            height: 72,
                            resizeMode: "cover",
                            opacity: option.soon ? 0.5 : 1,
                            position: showLoader[option.id] ? 'absolute' : 'relative',
                            zIndex: showLoader[option.id] ? -1 : 1,
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
                        color: option.soon ? '#999' : '#000', 
                        fontSize: hp(1.8) 
                      }}>
                        {option.label}
                      </Text>
                      {option.soon ? (
                        <View style={{ 
                          backgroundColor: '#FFA500', 
                          paddingHorizontal: 8, 
                          paddingVertical: 2, 
                          borderRadius: 8, 
                          marginTop: 4 
                        }}>
                          <Text style={{ 
                            color: '#fff', 
                            fontSize: hp(1.2), 
                            fontWeight: '600' 
                          }}>
                            {t('common.coming_soon')}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
                          <MaterialCommunityIcons name="account" size={14} color="#BDBDBD" style={{ marginRight: 4 }} />
                          <Text style={{ color: '#BDBDBD', fontSize: hp(1.4) }}>{option.nearby} {t('booking.step3.nearby')}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }

              const glowColor = animations[index].glow.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(3, 3, 3, 0)', 'rgba(3, 3, 3, 0.15)']
              });

              return (
                <Animated.View
                  key={option.id}
                  style={{
                    flex: 1,
                    transform: [
                      { translateY: animations[index].slide },
                      { scale: animations[index].pulse }
                    ],
                   // opacity: animations[index].fade,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      alignItems: 'center',
                      backgroundColor: option.soon ? '#F0F0F0' : (selected?.id === option.id ? '#F6F6F6' : '#fff'),
                      borderRadius: 14,
                      marginHorizontal: 6,
                      paddingVertical: 12,
                      borderWidth: selected?.id === option.id ? 3 : 1,
                      borderColor: option.soon ? '#E0E0E0' : (selected?.id === option.id ? '#030303' : '#E0E0E0'),
                      opacity: option.soon ? 0.6 : 1,
                    }}
                    onPress={() => handleVehicleSelect(option, index)}
                    disabled={option.soon}
                  >
                    <Animated.View
                      style={{
                        //backgroundColor: glowColor,
                        borderRadius: 12,
                        padding: 8,
                        marginBottom: 6,
                        width: 72,
                        height: 72,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {showLoader[option.id] ? (
                        <LottieView
                          source={loaderAnimation}
                          autoPlay
                          speed={4}
                          loop
                          style={{ width: 140, height: 140 }}
                        />
                      ) : null}
                      <Image 
                        source={option.icon} 
                        style={{ 
                          width: 72, 
                          height: 72,
                          resizeMode: "cover",
                          opacity: option.soon ? 0.5 : 1,
                          position: showLoader[option.id] ? 'absolute' : 'relative',
                          zIndex: showLoader[option.id] ? -1 : 1,
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
                      color: option.soon ? '#999' : '#000', 
                      fontSize: hp(1.8) 
                    }}>
                      {option.label}
                    </Text>
                    {option.soon ? (
                      <View style={{ 
                        backgroundColor: '#FFA500', 
                        paddingHorizontal: 8, 
                        paddingVertical: 2, 
                        borderRadius: 8, 
                        marginTop: 4 
                      }}>
                        <Text style={{ 
                          color: '#fff', 
                          fontSize: hp(1.2), 
                          fontWeight: '600' 
                        }}>
                          {t('common.coming_soon')}
                        </Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
                        <MaterialCommunityIcons name="account" size={14} color="#BDBDBD" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#BDBDBD', fontSize: hp(1.4) }}>{option.nearby} {t('booking.step3.nearby')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>  
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '95%', backgroundColor: selectedDate?"#0c0c0c": '#F6F6F6', borderRadius: 12, padding: 12, marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="map-marker" size={18} color={selectedDate ? "#fff":"#BDBDBD"} style={{ marginRight: 4 }} />
              <Text style={{ color: selectedDate ? "#fff":'#BDBDBD', fontSize: hp(1.6) }}>{ isLoading ? "..." : (tripDetails?.distance/1000).toFixed(2)+" km"}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="clock-outline" size={18} color={selectedDate ? "#fff":"#BDBDBD"} style={{ marginRight: 4 }} />
              <Text style={{ color: selectedDate ? "#fff":'#BDBDBD', fontSize: hp(1.6) }}>{ isLoading ? "..." : tripDetails?.time}</Text>
            </View>
            {selectedDate && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="calendar" size={18} color={selectedDate ? "#fff":"#BDBDBD"} style={{ marginRight: 4 }} />
                <Text style={{ color: selectedDate ? "#fff":'#BDBDBD', fontSize: hp(1.6) }}>{ isLoading ? "..." : formatDate(selectedDate)}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8, alignItems: 'center' }}>
            <TouchableOpacity
            disabled={true}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: selectedDate ? '#FF6B6B' : '#CCC',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
                flexDirection: 'row',
              }}
              onPress={selectedDate ? () => setSelectedDate(null) : showDatePicker}
            >
              <Ionicons 
                name={selectedDate ? "close" : "calendar-number-outline"} 
                size={24} 
                color={selectedDate ? "#FFF" : "#000"} 
              />
            </TouchableOpacity>
           
            <ConfirmButton
           onPress={handleConfirm}
          text={!selectedDate ? t("location.continue"): t('booking.step3.book_now')}
          disabled={isLoading || !selected}
        />


          </View>
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="datetime"
            confirmTextIOS={t("confirm")}
            cancelTextIOS={t("cancel")}
            display="spinner"
            minimumDate={new Date(Date.now() + 60 * 60 * 1000)}
            locale={i18n.language}
            onConfirm={handleDateConfirm}
            onCancel={hideDatePicker}
          />
        </View>
      </View>
      <WomanValidationModal
        visible={showWomanValidationModal}
        onClose={() => setShowWomanValidationModal(false)}
        onSubmit={() => {
          setWomanValidationLoading(true);
          // TODO: handle submit logic (API call)
          setTimeout(() => {
            setWomanValidationLoading(false);
            setShowWomanValidationModal(false);
            Toast.show({
              type: 'success',
              text1: 'Validation info submitted! Your account is under review.',
              visibilityTime: 2500,
            });
          }, 1200);
        }}
        form={womanValidationForm}
        setForm={setWomanValidationForm}
        loading={womanValidationLoading}
      />
      <LoginModal visible={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  );
};

const localStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    margin: 16,
    
    width: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  
  },
});
export default memo(ChooseVehicleComponent); 