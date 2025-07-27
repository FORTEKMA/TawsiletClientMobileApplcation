import React, { useRef, useEffect, useState, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder, Dimensions, Image, I18nManager } from 'react-native';
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
  const processedDriversRef = useRef(new Set()); // Persist processed drivers
  const [redZones, setRedZones] = useState([]);
  const [inRedZone, setInRedZone] = useState(false);
  const [redZonesChecked, setRedZonesChecked] = useState(false);

  // Enhanced animation values for modern UI
  const fadeInAnimation = useRef(new Animated.Value(0)).current;
  const slideUpAnimation = useRef(new Animated.Value(50)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const searchingTextAnimation = useRef(new Animated.Value(0)).current;
  const driverCardsAnimation = useRef([]).current;

  // Initialize entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeInAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnimation, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();

    // Start searching text animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(searchingTextAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(searchingTextAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();

    // Start progress animation
    Animated.loop(
      Animated.timing(progressAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      })
    ).start();

    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  // Animate driver cards when they appear
  useEffect(() => {
    if (drivers.length > 0) {
      // Clear existing animations
      driverCardsAnimation.length = 0;
      
      // Create animations for each driver
      drivers.forEach((_, index) => {
        const cardAnimation = new Animated.Value(0);
        driverCardsAnimation.push(cardAnimation);
        
        Animated.timing(cardAnimation, {
          toValue: 1,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [drivers]);

  // Fetch red zones on mount
  useEffect(() => {
    const fetchRedZones = async () => {
      try {
        const response = await api.get('/red-zones');
        if (response?.data?.data) {
          setRedZones(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching red zones:', error);
      } finally {
        setRedZonesChecked(true);
      }
    };

    fetchRedZones();
  }, []);

  // Check if pickup location is in red zone
  useEffect(() => {
    if (redZonesChecked && formData.pickupAddress && redZones.length > 0) {
      const pickupCoords = {
        latitude: formData.pickupAddress.latitude,
        longitude: formData.pickupAddress.longitude
      };

      const isInRedZone = redZones.some(zone => {
        if (zone.coordinates && zone.coordinates.length > 0) {
          const polygon = zone.coordinates.map(coord => [coord.latitude, coord.longitude]);
          return isPointInPolygon([pickupCoords.latitude, pickupCoords.longitude], polygon);
        }
        return false;
      });

      setInRedZone(isInRedZone);

      if (isInRedZone) {
        Toast.show({
          type: 'error',
          text1: t('search_drivers.red_zone_title', 'Service Unavailable'),
          text2: t('search_drivers.red_zone_message', 'Service is temporarily unavailable in this area.'),
          visibilityTime: 4000,
        });
        
        setTimeout(() => {
          goBack();
        }, 4000);
        return;
      }
    }
  }, [redZonesChecked, formData.pickupAddress, redZones]);

  // Track step view
  useEffect(() => {
    trackBookingStepViewed(5, 'Driver Search');
  }, []);

  // Fetch parameters
  useEffect(() => {
    const fetchParameters = async () => {
      try {
        const response = await api.get('/parameters');
        if (response?.data?.data) {
          setParameters(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching parameters:', error);
      }
    };

    fetchParameters();
  }, []);

  // Search for drivers
  useEffect(() => {
    if (!inRedZone && redZonesChecked && parameters) {
      searchForDrivers();
    }

    return () => {
      // Cleanup
      if (requestRef.current) {
        const requestPath = ref(db, `requests/${requestRef.current}`);
        remove(requestPath);
      }
    };
  }, [inRedZone, redZonesChecked, parameters]);

  const searchForDrivers = async () => {
    try {
      isSearchingRef.current = true;
      
      // Create request in Firebase
      const requestsRef = ref(db, 'requests');
      const newRequestRef = push(requestsRef);
      requestRef.current = newRequestRef.key;

      const requestData = {
        user_id: user.id,
        pickup_address: formData.pickupAddress,
        drop_address: formData.dropAddress,
        vehicle_type: formData.vehicleType,
        scheduled_date: formData.selectedDate,
        status: 'searching',
        created_at: new Date().toISOString(),
        distance: formData.distance,
        time: formData.time,
        price: formData.price
      };

      await set(newRequestRef, requestData);

      // Listen for driver responses
      const requestPath = ref(db, `requests/${requestRef.current}`);
      onValue(requestPath, (snapshot) => {
        const data = snapshot.val();
        if (data && data.accepted_by) {
          setAccepted(data.accepted_by);
          isSearchingRef.current = false;
          
          trackDriverFound(data.accepted_by, {
            search_duration: Date.now() - searchStartTime,
            drivers_contacted: driversIdsNotAccepted.length + 1
          });

          // Navigate to tracking
          setTimeout(() => {
            navigation.navigate('Tracking', {
              requestId: requestRef.current,
              driverData: data.accepted_by,
              formData: formData
            });
          }, 2000);
        }
      });

      // Send notifications to nearby drivers
      await sendNotificationToDrivers(formData, user, requestRef.current);

    } catch (error) {
      console.error('Error searching for drivers:', error);
      Toast.show({
        type: 'error',
        text1: t('search_drivers.error_title', 'Search Error'),
        text2: t('search_drivers.error_message', 'Failed to search for drivers. Please try again.'),
        visibilityTime: 3000,
      });
    }
  };

  const searchStartTime = Date.now();

  const handleCancel = () => {
    trackRideCancelled('driver_search', {
      search_duration: Date.now() - searchStartTime,
      drivers_contacted: driversIdsNotAccepted.length
    });

    if (requestRef.current) {
      const requestPath = ref(db, `requests/${requestRef.current}`);
      remove(requestPath);
    }

    trackBookingStepBack(5, 'Driver Search');
    goBack();
  };

  const renderDriverCard = (driver, index) => {
    if (!driverCardsAnimation[index]) return null;

    return (
      <Animated.View
        key={driver.id}
        style={[
          localStyles.driverCard,
          {
            opacity: driverCardsAnimation[index],
            transform: [
              {
                translateY: driverCardsAnimation[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
              {
                scale: driverCardsAnimation[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={localStyles.driverInfo}>
          <Image
            source={{ uri: driver.avatar || avatarUrls[index % avatarUrls.length] }}
            style={localStyles.driverAvatar}
          />
          <View style={localStyles.driverDetails}>
            <Text style={localStyles.driverName}>{driver.name}</Text>
            <Text style={localStyles.driverVehicle}>{driver.vehicle_info}</Text>
            <View style={localStyles.ratingContainer}>
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
              <Text style={localStyles.rating}>{driver.rating || '4.8'}</Text>
            </View>
          </View>
        </View>
        <View style={localStyles.driverStats}>
          <Text style={localStyles.distance}>{driver.distance}km</Text>
          <Text style={localStyles.eta}>{driver.eta} min</Text>
        </View>
      </Animated.View>
    );
  };

  if (inRedZone) {
    return (
      <Animated.View style={[
        localStyles.container,
        {
          opacity: fadeInAnimation,
          transform: [{ translateY: slideUpAnimation }]
        }
      ]}>
        <View style={localStyles.redZoneContainer}>
          <MaterialCommunityIcons name="map-marker-off" size={64} color="#FF6B6B" />
          <Text style={localStyles.redZoneTitle}>
            {t('search_drivers.red_zone_title', 'Service Unavailable')}
          </Text>
          <Text style={localStyles.redZoneMessage}>
            {t('search_drivers.red_zone_message', 'Service is temporarily unavailable in this area.')}
          </Text>
        </View>
      </Animated.View>
    );
  }

  if (accepted) {
    return (
      <Animated.View style={[
        localStyles.container,
        {
          opacity: fadeInAnimation,
          transform: [{ translateY: slideUpAnimation }]
        }
      ]}>
        <View style={localStyles.acceptedContainer}>
          <Animated.View style={[
            localStyles.successIcon,
            { transform: [{ scale: pulseAnimation }] }
          ]}>
            <MaterialCommunityIcons name="check-circle" size={64} color="#4CAF50" />
          </Animated.View>
          <Text style={localStyles.acceptedTitle}>
            {t('search_drivers.driver_found', 'Driver Found!')}
          </Text>
          <Text style={localStyles.acceptedMessage}>
            {t('search_drivers.driver_on_way', 'Your driver is on the way')}
          </Text>
          
          <View style={localStyles.driverFoundCard}>
            <Image
              source={{ uri: accepted.avatar || avatarUrls[0] }}
              style={localStyles.acceptedDriverAvatar}
            />
            <View style={localStyles.acceptedDriverInfo}>
              <Text style={localStyles.acceptedDriverName}>{accepted.name}</Text>
              <Text style={localStyles.acceptedDriverVehicle}>{accepted.vehicle_info}</Text>
              <View style={localStyles.ratingContainer}>
                <MaterialCommunityIcons name="star" size={18} color="#FFD700" />
                <Text style={localStyles.acceptedDriverRating}>{accepted.rating || '4.8'}</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[
      localStyles.container,
      {
        opacity: fadeInAnimation,
        transform: [{ translateY: slideUpAnimation }]
      }
    ]}>
      {/* Header */}
      <View style={localStyles.header}>
        <TouchableOpacity
          style={localStyles.backButton}
          onPress={handleCancel}
        >
          <MaterialCommunityIcons 
            name={I18nManager.isRTL ? "arrow-right" : "arrow-left"} 
            size={24} 
            color="#000" 
          />
        </TouchableOpacity>
        <Text style={localStyles.headerTitle}>
          {t('search_drivers.searching', 'Finding your driver')}
        </Text>
      </View>

      {/* Search Animation */}
      <View style={localStyles.searchContainer}>
        <Animated.View style={[
          localStyles.searchIcon,
          { transform: [{ scale: pulseAnimation }] }
        ]}>
          <Ring />
        </Animated.View>
        
        <Animated.Text style={[
          localStyles.searchingText,
          {
            opacity: searchingTextAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1],
            }),
          },
        ]}>
          {t('search_drivers.searching_message', 'Looking for nearby drivers...')}
        </Animated.Text>

        {/* Progress Bar */}
        <View style={localStyles.progressContainer}>
          <Animated.View
            style={[
              localStyles.progressBar,
              {
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>

      {/* Trip Details Card */}
      <View style={localStyles.tripCard}>
        <View style={localStyles.tripRoute}>
          <View style={localStyles.routePoint}>
            <View style={[localStyles.routeDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={localStyles.routeText} numberOfLines={1}>
              {formData.pickupAddress?.description || 'Pickup location'}
            </Text>
          </View>
          <View style={localStyles.routeLine} />
          <View style={localStyles.routePoint}>
            <View style={[localStyles.routeDot, { backgroundColor: '#FF5722' }]} />
            <Text style={localStyles.routeText} numberOfLines={1}>
              {formData.dropAddress?.description || 'Drop-off location'}
            </Text>
          </View>
        </View>
        
        <View style={localStyles.tripDetails}>
          <View style={localStyles.tripDetailItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={20} color="#6C757D" />
            <Text style={localStyles.tripDetailText}>
              {formData.distance ? `${formData.distance.toFixed(1)} km` : 'Calculating...'}
            </Text>
          </View>
          <View style={localStyles.tripDetailItem}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#6C757D" />
            <Text style={localStyles.tripDetailText}>
              {formData.time ? `${formData.time} min` : 'Calculating...'}
            </Text>
          </View>
          <View style={localStyles.tripDetailItem}>
            <MaterialCommunityIcons name="car" size={20} color="#6C757D" />
            <Text style={localStyles.tripDetailText}>
              {formData.vehicleType?.label || 'Standard'}
            </Text>
          </View>
        </View>
      </View>

      {/* Driver Cards */}
      {drivers.length > 0 && (
        <View style={localStyles.driversContainer}>
          <Text style={localStyles.driversTitle}>
            {t('search_drivers.nearby_drivers', 'Nearby Drivers')}
          </Text>
          {drivers.map((driver, index) => renderDriverCard(driver, index))}
        </View>
      )}

      {/* Cancel Button */}
      <TouchableOpacity
        style={localStyles.cancelButton}
        onPress={handleCancel}
      >
        <Text style={localStyles.cancelButtonText}>
          {t('search_drivers.cancel', 'Cancel')}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    padding: 8,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: hp(2.4),
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  searchContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  searchIcon: {
    marginBottom: 20,
  },
  searchingText: {
    fontSize: hp(1.8),
    color: '#6C757D',
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 2,
  },
  tripCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tripRoute: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#DEE2E6',
    marginLeft: 5,
    marginBottom: 8,
  },
  routeText: {
    fontSize: hp(1.6),
    color: '#495057',
    fontWeight: '500',
    flex: 1,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tripDetailText: {
    fontSize: hp(1.4),
    color: '#6C757D',
    fontWeight: '500',
    marginLeft: 6,
  },
  driversContainer: {
    marginBottom: 20,
  },
  driversTitle: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  driverCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: hp(1.7),
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  driverVehicle: {
    fontSize: hp(1.4),
    color: '#6C757D',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: hp(1.4),
    color: '#6C757D',
    marginLeft: 4,
    fontWeight: '500',
  },
  driverStats: {
    alignItems: 'flex-end',
  },
  distance: {
    fontSize: hp(1.5),
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  eta: {
    fontSize: hp(1.3),
    color: '#6C757D',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  cancelButtonText: {
    fontSize: hp(1.7),
    fontWeight: '600',
    color: '#6C757D',
  },
  redZoneContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  redZoneTitle: {
    fontSize: hp(2.2),
    fontWeight: '700',
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  redZoneMessage: {
    fontSize: hp(1.7),
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 24,
  },
  acceptedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  successIcon: {
    marginBottom: 20,
  },
  acceptedTitle: {
    fontSize: hp(2.4),
    fontWeight: '700',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 12,
  },
  acceptedMessage: {
    fontSize: hp(1.7),
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 30,
  },
  driverFoundCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptedDriverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  acceptedDriverInfo: {
    flex: 1,
  },
  acceptedDriverName: {
    fontSize: hp(1.9),
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  acceptedDriverVehicle: {
    fontSize: hp(1.5),
    color: '#6C757D',
    marginBottom: 6,
  },
  acceptedDriverRating: {
    fontSize: hp(1.5),
    color: '#6C757D',
    marginLeft: 4,
    fontWeight: '600',
  },
});

export default memo(SearchDriversComponent);

