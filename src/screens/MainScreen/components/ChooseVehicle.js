import React, { useState,useEffect, useRef, memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated, Easing,I18nManager, ActivityIndicator, Platform, ScrollView } from 'react-native';
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
  const [isMinimized, setIsMinimized] = useState(false);
  
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

  // Get displayed vehicle options based on minimized state
  const getDisplayedVehicleOptions = () => {
    if (isMinimized && vehicleOptions.length > 0) {
      return [vehicleOptions[0]];
    }
    return vehicleOptions;
  };

  // Toggle minimize state
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
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
  
  const clearSelectedDate = () => {
    setSelectedDate(null);
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
        {/* Uber-style Header */}
        <View style={localStyles.uberHeader}>
          <TouchableOpacity
            style={localStyles.backButton}
            onPress={handleBack}
          >
            <MaterialCommunityIcons name={I18nManager.isRTL?"chevron-right": "chevron-left"} size={28} color="#000" />
          </TouchableOpacity>
          
                      <View style={localStyles.headerContent}>
              <Text style={localStyles.uberTitle}>{t('booking.step3.select_car', 'Choose a ride')}</Text>
              <Text style={localStyles.uberSubtitle}>{t('choose_vehicle.select_vehicle_subtitle', 'Select the vehicle that suits your needs')}</Text>
            </View>

          {/* Minimize Button */}
          <TouchableOpacity
            style={localStyles.minimizeButton}
            onPress={toggleMinimize}
          >
            <MaterialCommunityIcons
              name={isMinimized ? "arrow-expand-all" : "arrow-collapse-all"}
              size={24}
              color="#000"
            />
          </TouchableOpacity>
        </View>

        {/* Uber-style Content */}
        <View style={localStyles.uberContent}>
          {/* Vehicle Options - Vertical Layout like Uber */}
          <ScrollView 
            style={localStyles.vehicleOptionsContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={localStyles.vehicleOptionsContent}
          >
            {getDisplayedVehicleOptions().map((option, index) => {
               // Safety check for animations - render without animations if not ready
             
                return (
                  <View key={option.id} style={localStyles.vehicleOptionWrapper}>
                    <TouchableOpacity
                      style={[
                        localStyles.vehicleOptionCard,
                        option.soon && localStyles.vehicleOptionDisabled,
                        selected?.id === option.id && localStyles.vehicleOptionSelected
                      ]}
                      onPress={() => handleVehicleSelect(option, index)}
                      disabled={option.soon}
                    >
                      <View style={localStyles.vehicleOptionContent}>
                        <View style={localStyles.vehicleImageContainer}>
                          {showLoader[option.id] ? (
                            <LottieView
                              source={loaderAnimation}
                              autoPlay
                              loop
                              speed={4}
                              resizeMode="contain"
                              style={localStyles.loaderAnimation}
                            />
                          ) : null}
                          <Image 
                            source={option.icon} 
                            style={[
                              localStyles.vehicleImage,
                              option.soon && localStyles.vehicleImageDisabled,
                              showLoader[option.id] && localStyles.vehicleImageHidden
                            ]} 
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
                        
                        <View style={localStyles.vehicleInfo}>
                          <Text style={[
                            localStyles.vehicleLabel,
                            option.soon && localStyles.vehicleLabelDisabled
                          ]}>
                            {option.label}
                          </Text>
                          <Text style={[
                            localStyles.vehicleNearby,
                            option.soon && localStyles.vehicleNearbyDisabled
                          ]}>
                            {option.soon ? t('common.coming_soon', 'Coming Soon') : (
                              <Text>
                                <MaterialCommunityIcons name="account" size={14} color="#8E8E93" />
                                {' '}{option.nearby} {t('choose_vehicle.people', 'people')}
                              </Text>
                            )}
                          </Text>
                          
                        </View>
                        
                        <View style={localStyles.vehicleRightSection}>
                          
                          
                          {selected?.id === option.id && !option.soon && (
                            <View style={localStyles.selectedIndicator}>
                              <MaterialCommunityIcons name="check" size={16} color="#fff" />
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
             
            })}
          </ScrollView>

          {/* Schedule Ride Option */}
          {selectedDate && (
            <View style={localStyles.scheduleContainer}>
              <MaterialCommunityIcons name="clock-outline" size={20} color="#666" />
              <Text style={localStyles.scheduleText}>
                {t('choose_vehicle.scheduled_for')}: {formatDate(selectedDate)}
              </Text>
            </View>
          )}

          {/* Bottom Row with Date Picker and Confirm Button */}
          <View style={localStyles.bottomRow}>
            {/* Date Picker Icon Button */}
            <TouchableOpacity
              style={localStyles.datePickerIconButton}
              onPress={selectedDate ? clearSelectedDate : showDatePicker}
            >
              <MaterialCommunityIcons 
                name={selectedDate ? "calendar-remove" : "calendar"} 
                size={24} 
                color="#000" 
              />
            </TouchableOpacity>

            {/* Uber-style Continue Button */}
            <TouchableOpacity
              style={[
                localStyles.uberButton,
                !selected && localStyles.uberButtonDisabled
              ]}
              onPress={handleConfirm}
              disabled={!selected}
            >
              <Text style={[
                localStyles.uberButtonText,
                !selected && localStyles.uberButtonTextDisabled
              ]}>
                {t('choose_vehicle.confirm_vehicle', 'Confirm vehicle')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* Date Picker Modal */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="datetime"
        onConfirm={handleDateConfirm}
        onCancel={hideDatePicker}
        minimumDate={new Date()}
      />


    </>
  );
};

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:"#fff",
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
    marginRight: 16,
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
  vehicleOptionsContainer: {
    flex: 1,
    marginBottom: 24,
  },
  vehicleOptionsContent: {
    paddingBottom: 16,
  },
  vehicleOptionWrapper: {
    marginBottom: 12,
  },
  vehicleOptionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#F0F0F0',
   
  },
  vehicleOptionSelected: {
    borderColor: '#000',
    backgroundColor: '#FAFAFA',
  },
  vehicleOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#F8F8F8',
  },
  vehicleOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vehicleImage: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  vehicleImageDisabled: {
    opacity: 0.5,
  },
  vehicleImageHidden: {
    position: 'absolute',
    zIndex: -1,
  },
  loaderAnimation: {
    width: 60,
    height: 60,
  },
  vehicleInfo: {
    flex: 1,
    marginRight: 16,
  },
  vehicleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  vehicleLabelDisabled: {
    color: '#BDBDBD',
  },
  vehicleNearby: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  vehicleNearbyDisabled: {
    color: '#BDBDBD',
  },
  vehicleDescription: {
    fontSize: 13,
    color: '#BDBDBD',
    lineHeight: 18,
  },
  vehicleRightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  vehiclePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  scheduleText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: Platform.OS === 'ios' ? 34 : 24,
    gap: 12,
  },
  datePickerIconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
   
  },
  uberButton: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
   
  },
  uberButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  uberButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uberButtonTextDisabled: {
    color: '#8E8E93',
  },
  minimizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
});

export default memo(ChooseVehicleComponent); 