import React, { useEffect, useState, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, I18nManager, Modal, Animated, Easing } from 'react-native';
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

const ConfirmRideComponent = ({ goBack, formData, rideData, goNext, handleReset }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const user = useSelector(state => state.user.currentUser);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
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
        return vehicle.name_ar || vehicle.name_en || 'Vehicle';
      case 'fr':
        return vehicle.name_fr || vehicle.name_en || 'Vehicle';
      default:
        return vehicle.name_en || 'Vehicle';
    }
  };

  // Get default description for vehicle
  const getDefaultDescription = (vehicleId) => {
    switch (vehicleId) {
      case 1:
        return t('vehicle.economy_desc', 'Affordable rides for everyday trips');
      case 2:
        return t('vehicle.comfort_desc', 'More space and comfort');
      case 3:
        return t('vehicle.premium_desc', 'Premium vehicles for special occasions');
      default:
        return t('vehicle.standard_desc', 'Standard ride');
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
        const calculatedPrice = await calculatePrice(
          formData.distance,
          formData.duration,
          formData.vehicleType.id,
          formData.selectedDate
        );
        setPrice(calculatedPrice);
      }
    } catch (error) {
      console.error('Error calculating price:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRide = async () => {
    if (isLoading) return;

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

    setIsLoading(true);
    
    try {
      const requestData = {
        pickup_location: formData.pickupLocation,
        dropoff_location: formData.dropoffLocation,
        pickup_address: formData.pickupAddress,
        dropoff_address: formData.dropoffAddress,
        vehicle_type_id: formData.vehicleType.id,
        scheduled_time: formData.selectedDate,
        distance: formData.distance,
        duration: formData.duration,
        estimated_price: price,
        user_id: user.id
      };

      const response = await api.post('/requests', requestData);
      
      if (response.data.success) {
        trackRideConfirmed(requestData);
        trackBookingStepCompleted('confirm_ride');
        
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          goNext(response.data.request);
        }, 2000);
      } else {
        throw new Error(response.data.message || 'Failed to create request');
      }
    } catch (error) {
      console.error('Error confirming ride:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    trackBookingStepBack('confirm_ride');
    goBack();
  };

  const formatPrice = (price) => {
    return `${price.toFixed(2)} ${t('currency', 'DT')}`;
  };

  const formatDateTime = (date) => {
    if (!date) return t('now', 'Now');
    
    const now = new Date();
    const selectedDate = new Date(date);
    const diffInMinutes = Math.floor((selectedDate - now) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return t('in_minutes', `In ${diffInMinutes} minutes`);
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return t('in_hours', `In ${hours} hour${hours > 1 ? 's' : ''}`);
    } else {
      return selectedDate.toLocaleDateString() + ' ' + selectedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
  };

  const vehicleInfo = getVehicleInfo();

  return (
    <Animated.View 
      style={[
        confirmRideStyles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        }
      ]}
    >
      {/* Header */}
      <Animated.View 
        style={[
          confirmRideStyles.header,
          {
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        <TouchableOpacity 
          style={confirmRideStyles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} 
            size={28} 
            color="#000" 
          />
        </TouchableOpacity>
        
        <View style={confirmRideStyles.headerContent}>
          <Text style={confirmRideStyles.headerTitle}>
            {t('confirm_your_ride', 'Confirm your ride')}
          </Text>
          <Text style={confirmRideStyles.headerSubtitle}>
            {t('review_trip_details', 'Review your trip details')}
          </Text>
        </View>
      </Animated.View>

      {/* Trip Summary Card */}
      <Animated.View 
        style={[
          confirmRideStyles.tripCard,
          {
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        {/* Route Information */}
        <View style={confirmRideStyles.routeSection}>
          <View style={confirmRideStyles.routeIndicator}>
            <View style={confirmRideStyles.pickupDot} />
            <View style={confirmRideStyles.routeLine} />
            <View style={confirmRideStyles.dropoffDot} />
          </View>
          
          <View style={confirmRideStyles.routeDetails}>
            <View style={confirmRideStyles.locationItem}>
              <Text style={confirmRideStyles.locationLabel}>
                {t('pickup', 'Pickup')}
              </Text>
              <Text style={confirmRideStyles.locationAddress} numberOfLines={1}>
                {formData.pickupAddress || t('current_location', 'Current location')}
              </Text>
            </View>
            
            <View style={confirmRideStyles.locationItem}>
              <Text style={confirmRideStyles.locationLabel}>
                {t('destination', 'Destination')}
              </Text>
              <Text style={confirmRideStyles.locationAddress} numberOfLines={1}>
                {formData.dropoffAddress || t('destination', 'Destination')}
              </Text>
            </View>
          </View>
        </View>

        {/* Trip Details */}
        <View style={confirmRideStyles.tripDetails}>
          <View style={confirmRideStyles.detailRow}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#666" />
            <Text style={confirmRideStyles.detailText}>
              {formatDateTime(formData.selectedDate)}
            </Text>
          </View>
          
          <View style={confirmRideStyles.detailRow}>
            <MaterialCommunityIcons name="map-marker-distance" size={20} color="#666" />
            <Text style={confirmRideStyles.detailText}>
              {formData.distance ? `${formData.distance.toFixed(1)} km` : t('calculating', 'Calculating...')}
            </Text>
          </View>
          
          <View style={confirmRideStyles.detailRow}>
            <MaterialCommunityIcons name="timer-outline" size={20} color="#666" />
            <Text style={confirmRideStyles.detailText}>
              {formData.duration ? `${Math.round(formData.duration)} min` : t('calculating', 'Calculating...')}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Vehicle Selection Card */}
      {vehicleInfo && (
        <Animated.View 
          style={[
            confirmRideStyles.vehicleCard,
            {
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          <View style={confirmRideStyles.vehicleHeader}>
            <Text style={confirmRideStyles.vehicleTitle}>
              {t('selected_vehicle', 'Selected Vehicle')}
            </Text>
          </View>
          
          <View style={confirmRideStyles.vehicleContent}>
            <View style={confirmRideStyles.vehicleIconContainer}>
              <Image 
                source={{ uri: vehicleInfo.icon }} 
                style={confirmRideStyles.vehicleIcon}
                resizeMode="contain"
              />
            </View>
            
            <View style={confirmRideStyles.vehicleInfo}>
              <Text style={confirmRideStyles.vehicleName}>
                {vehicleInfo.label}
              </Text>
              <Text style={confirmRideStyles.vehicleDescription}>
                {vehicleInfo.description}
              </Text>
            </View>
            
            <View style={confirmRideStyles.priceContainer}>
              {loading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={confirmRideStyles.priceText}>
                  {formatPrice(price)}
                </Text>
              )}
            </View>
          </View>
        </Animated.View>
      )}

      {/* Confirm Button */}
      <Animated.View 
        style={[
          confirmRideStyles.buttonContainer,
          {
            transform: [{ scale: buttonScaleAnim }],
          }
        ]}
      >
        <TouchableOpacity
          style={[
            confirmRideStyles.confirmButton,
            isLoading && confirmRideStyles.confirmButtonDisabled
          ]}
          onPress={handleConfirmRide}
          disabled={isLoading || loading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={confirmRideStyles.confirmButtonText}>
                {t('confirm_ride', 'Confirm Ride')}
              </Text>
              <MaterialCommunityIcons 
                name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} 
                size={24} 
                color="#fff" 
              />
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={confirmRideStyles.modalOverlay}>
          <Animated.View 
            style={[
              confirmRideStyles.successModal,
              {
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            <MaterialCommunityIcons name="check-circle" size={60} color="#4CAF50" />
            <Text style={confirmRideStyles.successTitle}>
              {t('ride_confirmed', 'Ride Confirmed!')}
            </Text>
            <Text style={confirmRideStyles.successMessage}>
              {t('searching_driver', 'Searching for a driver...')}
            </Text>
          </Animated.View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const confirmRideStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  routeSection: {
    flexDirection: 'row',
    marginBottom: 20,
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
    backgroundColor: '#4CAF50',
    marginBottom: 8,
  },
  routeLine: {
    width: 2,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },
  dropoffDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#FF5722',
  },
  routeDetails: {
    flex: 1,
  },
  locationItem: {
    marginBottom: 24,
  },
  locationLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  tripDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  vehicleHeader: {
    marginBottom: 16,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  vehicleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vehicleIcon: {
    width: 40,
    height: 40,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  vehicleDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  confirmButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
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
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default memo(ConfirmRideComponent);

