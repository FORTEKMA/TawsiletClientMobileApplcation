import React, { useRef, useEffect, useState, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder, Dimensions, Image, I18nManager, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { OneSignal } from 'react-native-onesignal';
import api from '../../../utils/api';
import { sendNotificationToDrivers } from '../../../utils/CalculateDistanceAndTime';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useSelector } from 'react-redux';
import db from '../../../utils/firebase';
import { ref, update, off, onValue, get, child, remove, push, set } from 'firebase/database';
import Ring from './Ring';
import Slider from 'react-native-slide-to-unlock';
import { 
  trackBookingStepViewed,
  trackBookingStepCompleted,
  trackBookingStepBack,
  trackRideCancelled,
  trackDriverFound
} from '../../../utils/analytics';
import { isPointInPolygon } from '../../../utils/helpers/mapUtils';

const avatarUrls = [
  'https://randomuser.me/api/portraits/men/32.jpg',
  'https://randomuser.me/api/portraits/women/44.jpg',
  'https://randomuser.me/api/portraits/men/65.jpg',
  'https://randomuser.me/api/portraits/women/12.jpg',
];

const SearchDriversComponent = ({ goBack, formData }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useSelector(state => state.user.currentUser);
  const [drivers, setDrivers] = useState([]);
  const [driversIdsNotAccepted, setDriversIdsNotAccepted] = useState([]);
  const [accepted, setAccepted] = useState(null);
  const [parameters, setParameters] = useState(null);
  const stepRef = useRef(5);
  const isSearchingRef = useRef(true);
  const requestRef = useRef(null);
  const processedDriversRef = useRef(new Set());
  const [redZones, setRedZones] = useState([]);
  const [inRedZone, setInRedZone] = useState(false);
  const [redZonesChecked, setRedZonesChecked] = useState(false);
  const [searchStep, setSearchStep] = useState(0); // 0: initial, 1: searching, 2: found
  const [searchProgress, setSearchProgress] = useState(0);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;

  // Initialize animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
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
        useNativeDriver: true,
      }),
    ]).start();

    // Start search animations
    startSearchAnimations();
  }, []);

  const startSearchAnimations = () => {
    // Pulse animation for search indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Ripple animation
    Animated.loop(
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    // Progress animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 30000, // 30 seconds search
      useNativeDriver: false,
    }).start();
  };

  // Track step view
  useEffect(() => {
    trackBookingStepViewed('search_drivers');
  }, []);

  // Fetch red zones on mount
  useEffect(() => {
    const fetchRedZones = async () => {
      try {
        const redZonesRef = ref(db, 'red_zones');
        const snapshot = await get(redZonesRef);
        if (snapshot.exists()) {
          const redZonesData = snapshot.val();
          const redZonesArray = Object.keys(redZonesData).map(key => ({
            id: key,
            ...redZonesData[key]
          }));
          setRedZones(redZonesArray);
        }
        setRedZonesChecked(true);
      } catch (error) {
        console.error('Error fetching red zones:', error);
        setRedZonesChecked(true);
      }
    };

    fetchRedZones();
  }, []);

  // Check if pickup location is in red zone
  useEffect(() => {
    if (redZonesChecked && formData?.pickupLocation && redZones.length > 0) {
      const pickupCoords = [formData.pickupLocation.longitude, formData.pickupLocation.latitude];
      
      for (const zone of redZones) {
        if (zone.coordinates && isPointInPolygon(pickupCoords, zone.coordinates)) {
          setInRedZone(true);
          Toast.show({
            type: 'error',
            text1: t('red_zone_title', 'Service Unavailable'),
            text2: t('red_zone_message', 'Pickup service is not available in this area'),
            visibilityTime: 5000,
          });
          return;
        }
      }
      setInRedZone(false);
    }
  }, [redZonesChecked, formData?.pickupLocation, redZones]);

  // Start driver search
  useEffect(() => {
    if (!inRedZone && redZonesChecked) {
      startDriverSearch();
    }
  }, [inRedZone, redZonesChecked]);

  const startDriverSearch = async () => {
    try {
      setSearchStep(1);
      
      // Create request in database
      const requestData = {
        user_id: user.id,
        pickup_location: formData.pickupLocation,
        dropoff_location: formData.dropoffLocation,
        pickup_address: formData.pickupAddress,
        dropoff_address: formData.dropoffAddress,
        vehicle_type_id: formData.vehicleType.id,
        scheduled_time: formData.selectedDate,
        distance: formData.distance,
        duration: formData.duration,
        estimated_price: formData.estimatedPrice,
        status: 'searching',
        created_at: Date.now(),
      };

      const response = await api.post('/requests', requestData);
      
      if (response.data.success) {
        requestRef.current = response.data.request;
        
        // Start listening for driver responses
        listenForDriverResponses(response.data.request.id);
        
        // Send notifications to nearby drivers
        await sendNotificationToDrivers(
          formData.pickupLocation,
          formData.vehicleType.id,
          response.data.request.id
        );
        
        trackBookingStepCompleted('search_drivers');
      }
    } catch (error) {
      console.error('Error starting driver search:', error);
      Toast.show({
        type: 'error',
        text1: t('error', 'Error'),
        text2: t('search_failed', 'Failed to start driver search'),
      });
    }
  };

  const listenForDriverResponses = (requestId) => {
    const requestRef = ref(db, `requests/${requestId}`);
    
    const unsubscribe = onValue(requestRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data && data.status === 'accepted' && data.driver_id) {
        setAccepted(data);
        setSearchStep(2);
        trackDriverFound(data);
        
        // Navigate to tracking screen
        setTimeout(() => {
          navigation.navigate('Tracking', { 
            requestData: data,
            driverData: data.driver_data 
          });
        }, 2000);
      }
    });

    return unsubscribe;
  };

  const handleCancelSearch = async () => {
    try {
      if (requestRef.current) {
        await api.put(`/requests/${requestRef.current.id}`, {
          status: 'cancelled'
        });
        
        trackRideCancelled(requestRef.current);
      }
      
      trackBookingStepBack('search_drivers');
      goBack();
    } catch (error) {
      console.error('Error cancelling search:', error);
    }
  };

  const renderSearchContent = () => {
    switch (searchStep) {
      case 0:
        return (
          <View style={searchStyles.contentContainer}>
            <Text style={searchStyles.title}>
              {t('preparing_search', 'Preparing your request...')}
            </Text>
            <ActivityIndicator size="large" color="#000" style={searchStyles.loader} />
          </View>
        );
      
      case 1:
        return (
          <View style={searchStyles.contentContainer}>
            {/* Animated Search Indicator */}
            <View style={searchStyles.searchIndicatorContainer}>
              {/* Ripple effects */}
              {[0, 1, 2].map((index) => (
                <Animated.View
                  key={index}
                  style={[
                    searchStyles.ripple,
                    {
                      opacity: rippleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 0],
                      }),
                      transform: [
                        {
                          scale: rippleAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 2],
                          }),
                        },
                      ],
                      animationDelay: index * 700,
                    },
                  ]}
                />
              ))}
              
              {/* Central search icon */}
              <Animated.View
                style={[
                  searchStyles.searchIcon,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <MaterialCommunityIcons name="car" size={40} color="#fff" />
              </Animated.View>
            </View>

            <Text style={searchStyles.title}>
              {t('searching_drivers', 'Searching for drivers')}
            </Text>
            
            <Text style={searchStyles.subtitle}>
              {t('finding_best_driver', 'Finding the best driver for you...')}
            </Text>

            {/* Progress Bar */}
            <View style={searchStyles.progressContainer}>
              <Animated.View
                style={[
                  searchStyles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            {/* Driver Avatars Animation */}
            <View style={searchStyles.driversContainer}>
              {avatarUrls.map((url, index) => (
                <Animated.View
                  key={index}
                  style={[
                    searchStyles.driverAvatar,
                    {
                      opacity: progressAnim.interpolate({
                        inputRange: [index * 0.25, (index + 1) * 0.25],
                        outputRange: [0.3, 1],
                        extrapolate: 'clamp',
                      }),
                      transform: [
                        {
                          scale: progressAnim.interpolate({
                            inputRange: [index * 0.25, (index + 1) * 0.25],
                            outputRange: [0.8, 1],
                            extrapolate: 'clamp',
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Image source={{ uri: url }} style={searchStyles.avatarImage} />
                </Animated.View>
              ))}
            </View>
          </View>
        );
      
      case 2:
        return (
          <View style={searchStyles.contentContainer}>
            <Animated.View
              style={[
                searchStyles.successContainer,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <MaterialCommunityIcons name="check-circle" size={80} color="#4CAF50" />
              
              <Text style={searchStyles.successTitle}>
                {t('driver_found', 'Driver Found!')}
              </Text>
              
              {accepted?.driver_data && (
                <View style={searchStyles.driverInfo}>
                  <Image 
                    source={{ uri: accepted.driver_data.avatar || avatarUrls[0] }} 
                    style={searchStyles.driverImage} 
                  />
                  <Text style={searchStyles.driverName}>
                    {accepted.driver_data.name}
                  </Text>
                  <View style={searchStyles.ratingContainer}>
                    <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
                    <Text style={searchStyles.rating}>
                      {accepted.driver_data.rating || '4.8'}
                    </Text>
                  </View>
                </View>
              )}
              
              <Text style={searchStyles.successMessage}>
                {t('redirecting_tracking', 'Redirecting to tracking...')}
              </Text>
            </Animated.View>
          </View>
        );
      
      default:
        return null;
    }
  };

  if (inRedZone) {
    return (
      <Animated.View 
        style={[
          searchStyles.container,
          {
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim,
          }
        ]}
      >
        <View style={searchStyles.redZoneContainer}>
          <MaterialCommunityIcons name="map-marker-off" size={80} color="#FF5722" />
          <Text style={searchStyles.redZoneTitle}>
            {t('service_unavailable', 'Service Unavailable')}
          </Text>
          <Text style={searchStyles.redZoneMessage}>
            {t('red_zone_description', 'Pickup service is not available in this area. Please choose a different location.')}
          </Text>
          
          <TouchableOpacity
            style={searchStyles.backButton}
            onPress={goBack}
            activeOpacity={0.8}
          >
            <Text style={searchStyles.backButtonText}>
              {t('choose_different_location', 'Choose Different Location')}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[
        searchStyles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        }
      ]}
    >
      {/* Header */}
      <View style={searchStyles.header}>
        <TouchableOpacity 
          style={searchStyles.headerBackButton}
          onPress={handleCancelSearch}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} 
            size={28} 
            color="#000" 
          />
        </TouchableOpacity>
        
        <Text style={searchStyles.headerTitle}>
          {searchStep === 2 ? t('driver_found', 'Driver Found!') : t('finding_driver', 'Finding Driver')}
        </Text>
      </View>

      {/* Main Content */}
      <Animated.View
        style={[
          searchStyles.mainContent,
          {
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        {renderSearchContent()}
      </Animated.View>

      {/* Cancel Button */}
      {searchStep === 1 && (
        <View style={searchStyles.cancelContainer}>
          <TouchableOpacity
            style={searchStyles.cancelButton}
            onPress={handleCancelSearch}
            activeOpacity={0.8}
          >
            <Text style={searchStyles.cancelButtonText}>
              {t('cancel_search', 'Cancel Search')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

const searchStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  searchIndicatorContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  ripple: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#000',
  },
  searchIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 40,
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 40,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 2,
  },
  driversContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  loader: {
    marginTop: 40,
  },
  successContainer: {
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginTop: 24,
    marginBottom: 32,
  },
  driverInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  driverImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 4,
  },
  successMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  cancelContainer: {
    paddingBottom: 20,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  redZoneContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  redZoneTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF5722',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  redZoneMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  backButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default memo(SearchDriversComponent);

