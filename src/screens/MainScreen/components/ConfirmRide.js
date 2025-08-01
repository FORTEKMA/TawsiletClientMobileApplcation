import React, { useEffect, useState, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, I18nManager, Modal, Animated, Easing, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { styles } from '../styles';
import api from "../../../utils/api"
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { calculatePrice } from '../../../utils/CalculateDistanceAndTime';
import { 
  trackBookingStepViewed,
  trackBookingStepCompleted,
  trackBookingStepBack,
  trackRideConfirmed
} from '../../../utils/analytics';
import WomanValidationModal from './WomanValidationModal';
import LoginModal from '../../LoginModal';
import Toast from 'react-native-toast-message';

const ConfirmRideComponent = ({ goBack, formData, rideData, goNext, handleReset }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const user = useSelector(state => state.user.currentUser);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState(0);
  const [priceData, setPriceData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWomanValidationModal, setShowWomanValidationModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [womanValidationForm, setWomanValidationForm] = useState({
    user_with_cin: null,
    cinFront: null,
    cinBack: null,
  });
  
  // Animation values
  const slideAnim = React.useRef(new Animated.Value(300)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const buttonScaleAnim = React.useRef(new Animated.Value(1)).current;
 
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

  // Get vehicle info from formData
  const getVehicleInfo = () => {
    if (!formData?.vehicleType) {
      return null;
    }
    
    const vehicle = formData.vehicleType;
    return {
      icon: vehicle.icon ,
      label: vehicle.label || getLocalizedName(vehicle),
      description: vehicle.description || getDefaultDescription(vehicle.id)
    };
  };

  // Get localized name based on current language
  const getLocalizedName = (vehicle) => {
    const currentLang = i18nInstance.language;
    switch (currentLang) {
      case 'ar':
        return vehicle.name_ar || vehicle.name_en || t('confirm_ride.vehicle');
      case 'fr':
        return vehicle.name_fr || vehicle.name_en || t('confirm_ride.vehicle');
      default:
        return vehicle.name_en || t('confirm_ride.vehicle');
    }
  };

  // Get default description for vehicle
  const getDefaultDescription = (vehicleId) => {
    switch (vehicleId) {
      case 1:
        return t('confirm_ride.vehicle_economy_desc');
      case 2:
        return t('confirm_ride.vehicle_comfort_desc');
      case 3:
        return t('confirm_ride.vehicle_premium_desc');
      default:
        return t('confirm_ride.vehicle_standard_desc');
    }
  };

  // Track step view
  useEffect(() => {
    trackBookingStepViewed('confirm_ride');
  }, []);

  useEffect(() => {
    calculateRidePrice();
  }, [formData]);

  const calculateRidePrice = async () => {
    setLoading(true);
    try {
      if (formData?.distance && formData?.vehicleType) {
       
        const calculatedPriceData = await calculatePrice(formData);
        setPrice(calculatedPriceData.price);
        setPriceData(calculatedPriceData);
      }
    } catch (error) {
      console.error('Error calculating price:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    trackBookingStepCompleted(4, 'Ride Confirmation', {
      price: price,
      distance: formData.distance,
      time: formData.time,
      vehicle_type: formData?.vehicleType?.key,
      has_scheduled_date: !!formData.selectedDate
    });
    goNext({ price });
  };

  const handleReservation = async () => {
    try {
      setIsLoading(true);
      const payload = {
        payType: "Livraison",
        commandStatus: "Pending",
        totalPrice: price,
        distance: formData.distance,
        ...splitDateTime(formData.selectedDate),
      
        duration: formData.time,
        isAccepted: false,
        client: {
          id: user.id
        },
        carType:formData?.vehicleType.id,
        pickUpAddress: {
          Address: formData?.pickupAddress?.address || "Livraison",
          coordonne: {
            longitude: formData?.pickupAddress?.longitude || "17",
            latitude: formData?.pickupAddress?.latitude || "17",
          },
        },
        dropOfAddress: {
          Address: formData?.dropAddress?.address || "Livraison",
          coordonne: {
            longitude: formData?.dropAddress?.longitude || "17",
            latitude: formData?.dropAddress?.latitude || "17",
          },
        }
      }
      const res = await api.post("/commands", { data: payload });
      
      // Track successful reservation
      trackRideConfirmed({
        ...formData,
        price: price,
        reservation_id: res.data?.id
      });
      
      setShowSuccessModal(true);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }

  
  const handleConfirmRide = async () => {
    // Check if this is a women vehicle (id=4) and handle validation
    if (formData?.vehicleType?.id === 4) {
      if (!user) {
        setShowLoginModal(true);
        return;
      }
      
      if (user?.womanValidation?.validation_state === 'valid') {
        // User is validated, proceed with ride confirmation
        formData?.selectedDate != undefined ? handleReservation() : handleConfirm();
        return;
      } else if (user?.womanValidation?.validation_state === 'waiting') {
        Toast.show({
          type: 'info',
          text1: t('confirm_ride.account_under_validation', 'Your account is under validation.'),
          visibilityTime: 2500,
        });
        return;
      } else if (!user?.womanValidation) {
        setShowWomanValidationModal(true);
        return;
      } else {
        Toast.show({
          type: 'info',
          text1: t('confirm_ride.must_complete_women_validation', 'You must complete the women validation process to confirm this ride.'),
          visibilityTime: 2500,
        });
        return;
      }
    }
    
    // For non-women vehicles, proceed normally
    formData?.selectedDate != undefined ? handleReservation() : handleConfirm();
  };

  const handleBack = () => {
    trackBookingStepBack('confirm_ride');
    goBack();
  };

  const formatPrice = (price) => {
    return `${price.toFixed(2)} ${t('common.currency')}`;
  };

  const formatDateTime = (date) => {
    if (!date) return t('confirm_ride.now');
    
    const now = new Date();
    const selectedDate = new Date(date);
    const diffInMinutes = Math.floor((selectedDate - now) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return t('confirm_ride.in_minutes', { minutes: diffInMinutes });
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return hours === 1 
        ? t('confirm_ride.in_hours', { hours: hours })
        : t('confirm_ride.in_hours_plural', { hours: hours });
    } else {
      return selectedDate.toLocaleDateString() + ' ' + selectedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
  };

  const splitDateTime = (date) => {
    if (!date) return {};
    
    const selectedDate = new Date(date);
    return {
      date: selectedDate.toISOString().split('T')[0],
      time: selectedDate.toTimeString().split(' ')[0],
    };
  };

  const vehicleInfo = getVehicleInfo();

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
      {/* Professional Header */}
      <Animated.View 
        style={[
          localStyles.header,
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
            size={24} 
            color="#1a1a1a" 
          />
        </TouchableOpacity>
        
        <View style={localStyles.headerContent}>
          <Text style={localStyles.title}>
            {t('confirm_ride.title')}
          </Text>
          <Text style={localStyles.subtitle}>
            {t('confirm_ride.subtitle')}
          </Text>
        </View>
      </Animated.View>

      {/* Main Content */}
      <View style={localStyles.content}>
        {/* Trip Summary Card */}
        <Animated.View 
          style={[
            localStyles.tripCard,
            {
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          {/* Route Information */}
          <View style={localStyles.routeSection}>
            <View style={localStyles.routeIndicator}>
              <View style={localStyles.pickupDot} />
              <View style={localStyles.routeLine} />
              <View style={localStyles.dropoffDot} />
            </View>
            
            <View style={localStyles.routeDetails}>
              <View style={localStyles.locationItem}>
                <Text style={localStyles.locationLabel}>
                  {t('confirm_ride.pickup')}
                </Text>
                <Text style={localStyles.locationAddress} numberOfLines={1}>
                  {formData.pickupAddress?.address || t('confirm_ride.current_location')}
                </Text>
              </View>
              
              <View style={localStyles.locationItem}>
                <Text style={localStyles.locationLabel}>
                  {t('confirm_ride.destination')}
                </Text>
                <Text style={localStyles.locationAddress} numberOfLines={1}>
                  {formData.dropAddress?.address || t('confirm_ride.destination')}
                </Text>
              </View>
            </View>
          </View>

          {/* Trip Details */}
          <View style={localStyles.tripDetails}>
            <View style={localStyles.detailRow}>
              <MaterialCommunityIcons name="clock-outline" size={20} color="#666" />
              <Text style={localStyles.detailText}>
                {formatDateTime(formData.selectedDate)}
              </Text>
            </View>
            
            <View style={localStyles.detailRow}>
              <MaterialCommunityIcons name="map-marker-distance" size={20} color="#666" />
              <Text style={localStyles.detailText}>
                {priceData?.distance ? `${(priceData.distance).toFixed(1)} ${t('common.km')}` : t('confirm_ride.calculating')}
              </Text>
            </View>
            
            {vehicleInfo && (
              <View style={localStyles.detailRow}>
                <Image source={vehicleInfo.icon} style={localStyles.vehicleIcon} />
                <Text style={localStyles.detailText}>
                  {vehicleInfo.label}
                </Text>
              </View>
            )}
          </View>

          {/* Price Section */}
          <View style={localStyles.priceSection}>
            <Text style={localStyles.priceLabel}>
              {t('confirm_ride.total_price')}
            </Text>
            <Text style={localStyles.priceValue}>
              {loading ? t('confirm_ride.calculating') : formatPrice(price)}
            </Text>
          </View>
        </Animated.View>

        {/* Confirm Button */}
        <Animated.View 
          style={[
            localStyles.buttonContainer,
            {
              transform: [{ scale: buttonScaleAnim }],
            }
          ]}
        >
          <TouchableOpacity
            style={[
              localStyles.confirmButton,
              (isLoading || loading) && localStyles.confirmButtonDisabled
            ]}
            onPress={handleConfirmRide}
            disabled={isLoading || loading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={localStyles.confirmButtonText}>
                  {t('confirm_ride.confirm_ride')}
                </Text>
                <MaterialCommunityIcons 
                  name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} 
                  size={20} 
                  color="#fff" 
                />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={localStyles.modalOverlay}>
          <Animated.View 
            style={[
              localStyles.successModal,
              {
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            <MaterialCommunityIcons name="check-circle" size={60} color="#4CAF50" />
            <Text style={localStyles.successTitle}>
              {t('confirm_ride.ride_confirmed')}
            </Text>
            <Text style={localStyles.successMessage}>
              {t('confirm_ride.searching_driver')}
            </Text>
          </Animated.View>
        </View>
      </Modal>

      {/* Woman Validation Modal */}
      <WomanValidationModal
        visible={showWomanValidationModal}
        onClose={() => setShowWomanValidationModal(false)}
        form={womanValidationForm}
        setForm={setWomanValidationForm}
      />

      {/* Login Modal */}
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </Animated.View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '400',
  },
  content: {
    paddingHorizontal: 24,
    flex: 1,
    paddingTop: 24,
  },
  tripCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  routeSection: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  routeIndicator: {
    alignItems: 'center',
    marginRight: 16,
    paddingTop: 8,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000',
    marginBottom: 8,
  },
  routeLine: {
    width: 2,
    height: 40,
    backgroundColor: '#dee2e6',
    marginBottom: 8,
  },
  dropoffDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#000',
  },
  routeDetails: {
    flex: 1,
  },
  locationItem: {
    marginBottom: 20,
  },
  locationLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationAddress: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
    lineHeight: 22,
  },
  tripDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa',
    paddingTop: 20,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailText: {
    fontSize: 15,
    color: '#495057',
    marginLeft: 12,
    fontWeight: '500',
  },
  vehicleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  priceSection: {
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa',
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  confirmButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
});

export default memo(ConfirmRideComponent);

