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
  const [searchStep, setSearchStep] = useState(0); // 0: initial, 1: searching, 2: found
  const [searchProgress, setSearchProgress] = useState(0);
  const searchStartTime = useRef(Date.now());
  const [avatarUrls, setAvatarUrls] = useState([]);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;

  // Generate random avatar URLs on component mount
  useEffect(() => {
    const generateRandomAvatars = () => {
      const baseUrl = 'https://randomuser.me/api/portraits/';
      const genders = ['men', 'women'];
      const randomAvatars = [];
      
      for (let i = 0; i < 4; i++) {
        const gender = genders[Math.floor(Math.random() * genders.length)];
        const randomId = Math.floor(Math.random() * 99) + 1;
        randomAvatars.push(`${baseUrl}${gender}/${randomId}.jpg`);
      }
      
      setAvatarUrls(randomAvatars);
    };

    generateRandomAvatars();
  }, []);

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
  };

  // Start progress animation when search begins
  const startProgressAnimation = () => {
    // Reset progress animation
    progressAnim.setValue(0);
    
    // Start progress animation with search duration
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 30000, // 30 seconds search - sync with search timeout
      useNativeDriver: false,
    }).start();
  };

  // Start fast progress animation when no driver found
  const startFastProgressAnimation = () => {
    // Use a simple approach - just complete the progress in 5 seconds
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000, // 5 seconds to complete
      useNativeDriver: false,
    }).start((finished) => {
      if (finished) {
        // Go back first, then show toast
        goBack();
        // Show toast after a short delay to ensure navigation is complete
        setTimeout(() => {
          Toast.show({
            type: 'error',
            text1: t('common.no_driver_accepted'),
            visibilityTime: 2000,
            onPress: () => {}
          });
        }, 500);
      }
    });
  };

  // Track step view
  useEffect(() => {
    trackBookingStepViewed('search_drivers');
  }, []);

  // Fetch red zones on mount
  useEffect(() => {
    const fetchRedZones = async () => {
      try {
        const response = await api.get('/red-zones');
        const zones = response?.data?.data || response?.data || [];
        setRedZones(zones.filter(z => z.active));
        setRedZonesChecked(true);
      } catch (err) {
        setRedZones([]);
        setRedZonesChecked(true);
      }
    };
    fetchRedZones();
  }, []);

  // Check if pickup or dropoff is in a red zone
  useEffect(() => {
    if (!redZones.length || !formData?.pickupAddress || !formData?.dropAddress) return;
    const pickup = { lat: formData.pickupAddress.latitude, lng: formData.pickupAddress.longitude };
    const drop = { lat: formData.dropAddress.latitude, lng: formData.dropAddress.longitude };
    let foundRedZone = false;
    for (const zone of redZones) {
      if (zone.polygonPath && Array.isArray(zone.polygonPath)) {
        if (isPointInPolygon(pickup, zone.polygonPath) || isPointInPolygon(drop, zone.polygonPath)) {
          foundRedZone = true;
          break;
        }
      }
    }
    setInRedZone(foundRedZone);
  }, [redZones, formData?.pickupAddress, formData?.dropAddress]);

  // If inRedZone, show search UI for 30s, then show no_driver_accepted and goBack
  useEffect(() => {
    if (!inRedZone) return;
    const timer = setTimeout(() => {
      Toast.show({
        type: 'error',
        text1: t('common.no_driver_accepted'),
        visibilityTime: 2000,
        onPress: () => {}
      });
      goBack();
    }, 30000);
    return () => clearTimeout(timer);
  }, [inRedZone]);

  // Fetch parameters from API
  useEffect(() => {
    const fetchParameters = async () => {
      try {
        const paramsRes = await api.get('parameters');
        setParameters(paramsRes.data.data[0]);
        
      } catch (error) {
        console.error('Error fetching parameters:', error);
        // Set default parameters if API fails
        setParameters({ min_radius_search: 4 });
      }
    };
    
    fetchParameters();
  }, []);

  const generateCenteredPositions = (avatarUrls) => {
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
    const verticalMin = screenHeight * 0.3;
    const verticalMax = screenHeight * 0.6;
    const horizontalMin = screenWidth * 0.25;
    const horizontalMax = screenWidth * 0.75;
  
    return avatarUrls.map((url, i) => {
      const top = Math.floor(Math.random() * (verticalMax - verticalMin)) + verticalMin;
      const left = Math.floor(Math.random() * (horizontalMax - horizontalMin)) + horizontalMin;
  
      return {
        top,
        left,
        avatar: url,
        key: i,
      };
    });
  };

  const handleCancelSearch = () => {
    // Stop progress animation
    progressAnim.stopAnimation();
    
    trackBookingStepBack('search_drivers');
    trackRideCancelled('user_cancelled', {
      step: 5,
      search_duration: Date.now() - searchStartTime.current
    });
    goBack();
  };

  const searchDrivers = async () => {
    // Reset the searching flag to ensure the while loop can start
    isSearchingRef.current = true;
    stepRef.current = 5;
    
    let radius = 1;
    // processedDriversRef is now used instead of local processedDrivers
    let currentDriverTimeout = null;
    let currentDriverId = null;
    
    try {
      // Validate required formData
      if (!formData?.pickupAddress?.latitude || !formData?.pickupAddress?.longitude) {
        throw new Error('Pickup address coordinates are required');
      }
      
      if (!formData?.dropAddress?.latitude || !formData?.dropAddress?.longitude) {
        throw new Error('Dropoff address coordinates are required');
      }
      
      if (!formData?.vehicleType?.id) {
        throw new Error('Vehicle type is required');
      }

      // Create a unique ride request reference
      const newRequestRef = db.ref('rideRequests').push();
      if (!newRequestRef) {
        throw new Error('Failed to create request reference');
      }
      requestRef.current = newRequestRef;

      // Use set to create the initial request object
      await newRequestRef.set({
        status: 'searching',
        createdAt: Date.now(),
        user: user,
        pickupAddress: formData.pickupAddress,
        dropoffAddress: formData.dropAddress,
        dropAddress: formData.dropAddress,
        vehicleType: formData.vehicleType,
        notifiedDrivers: {},
        price: formData.price,
        distance: formData.distance,
        reservation: formData.selectedDate != null,
        time: formData.time
      });

      // Main listener for request status changes
      const unsubscribe = newRequestRef.on('value', (snapshot) => {
        if (!snapshot || !snapshot.exists()) {
          return;
        }
        
        const data = snapshot.val();
        if (data && data.status === 'accepted') {
          setAccepted(true);
          setSearchStep(2);
          isSearchingRef.current = false;
          stepRef.current = 0;
          unsubscribe();
          unsubscribeNotifiedDrivers();
          if (currentDriverTimeout) {
            clearTimeout(currentDriverTimeout);
          }
          
          // Stop progress animation
          progressAnim.stopAnimation();
         
          // Track driver found
          trackDriverFound(data.driverId, {
            search_duration: Date.now() - searchStartTime.current,
            radius: radius,
            drivers_notified: Object.keys(data.notifiedDrivers || {}).length
          });
         
          navigation.reset({
            index: 0,
            routes: [
              {
                name: 'Historique',
                params: {
                  screen: 'OrderDetails',
                  params: {
                    id: data.orderId
                  }
                }
              }
            ]
          });
          goBack();
        }
      });

      // Listener for notifiedDrivers changes to detect rejections
      let unsubscribeNotifiedDrivers = null;
      let processNextDriver = null;

      const setupNotifiedDriversListener = () => {
        const notifiedDriversRef = newRequestRef.child('notifiedDrivers');
        unsubscribeNotifiedDrivers = notifiedDriversRef.on('value', async (snapshot) => {
          if (!snapshot || !snapshot.exists() || !currentDriverId) {
            return;
          }
          
          const notifiedDrivers = snapshot.val() || {};
          const currentDriverStatus = notifiedDrivers[currentDriverId];
          
          // If current driver rejected (status is false), move to next driver immediately
          if (currentDriverStatus === false) {
            if (currentDriverTimeout) {
              clearTimeout(currentDriverTimeout);
              currentDriverTimeout = null;
            }
            
            processedDriversRef.current.add(currentDriverId);
            setDriversIdsNotAccepted(prev => {
              if (!prev.includes(currentDriverId)) {
                return [...prev, currentDriverId];
              }
              return prev;
            });

            // Increment rejected_command_number for the driver
            try {
              // Fetch current driver info
              const userRes = await api.get(`users/${currentDriverId}`);
              const oldRejectedCount = userRes.data?.rejected_command_number || 0;

              // Update with incremented value using PUT
              await api.put(`users/${currentDriverId}`, {
                rejected_command_number: Number(oldRejectedCount) + 1,
              });
            } catch (err) {
              console.error('Failed to update rejected_command_number:', err);
            }
            
            // Process next driver immediately
            if (processNextDriver) {
              processNextDriver();
            }
          }
        });
      };
     
      setupNotifiedDriversListener();
      
      // Function to process drivers with immediate rejection detection
      const processDrivers = async (drivers) => {
        const newDrivers = drivers.filter(driver =>
          !processedDriversRef.current.has(driver.id) && !driversIdsNotAccepted.includes(driver.id)
        );
        console.log('Processed drivers:', Array.from(processedDriversRef.current));
        console.log('DriversIdsNotAccepted:', driversIdsNotAccepted);
        console.log('New drivers to process:', newDrivers.map(d => d.id));
        
        for (const driver of newDrivers) {
         
          if (!isSearchingRef.current || accepted !== null) {
            break;
          }
          
          if (driversIdsNotAccepted.includes(driver.id)) {
            continue;
          }

          currentDriverId = driver.id;

          try {
            if (requestRef.current) {
              await requestRef.current.child('notifiedDrivers').update({
                [driver.id]: true
              });

              // Fix the data structure to match what sendNotificationToDrivers expects
              const notificationData = {
                formData: {
                  ...formData,
                  dropAddress: formData.dropAddress, // Fix the property name
                  pickupAddress: formData.pickupAddress
                },
                driver,
                currentUser: user
              };

              const notificationRed = await sendNotificationToDrivers(notificationData);
              console.log("Notification sent successfully to driver:", driver.id);
            }
          } catch (notificationError) {
            console.log("notificationError", notificationError.response || notificationError.message);
            // Handle notification error silently and move to next driver
            processedDriversRef.current.add(driver.id);
            continue;
          }

          if (!isSearchingRef.current || accepted !== null) break;

          // Set timeout for current driver
          currentDriverTimeout = setTimeout(async () => {
            console.log('[Timeout Triggered] For driver:', driver.id);
            console.log('isSearchingRef.current:', isSearchingRef.current, 'accepted:', accepted);
            if (isSearchingRef.current && accepted === null) {
              processedDriversRef.current.add(driver.id);
              setDriversIdsNotAccepted(prev => {
                if (!prev.includes(driver.id)) {
                  return [...prev, driver.id];
                }
                return prev;
              });

              if (requestRef.current) {
                console.log('[Timeout] Setting notifiedDrivers', driver.id, 'to false');
                await requestRef.current.child('notifiedDrivers').update({
                  [driver.id]: false
                });
              }

              // Increment rejected_command_number for the driver (timeout case)
              try {
                const userRes = await api.get(`users/${driver.id}`);
                const oldRejectedCount = userRes.data?.rejected_command_number || 0;
                await api.put(`users/${driver.id}`, {
                  rejected_command_number: Number(oldRejectedCount) + 1,
                });
                console.log('[Timeout] Updated rejected_command_number for driver:', driver.id);
              } catch (err) {
                console.error('[Timeout] Failed to update rejected_command_number after timeout:', err);
              }
              
              // Process next driver after timeout
              if (processNextDriver) {
                console.log('[Timeout] Calling processNextDriver for driver:', driver.id);
                processNextDriver();
              }
            } else {
              console.log('[Timeout] Timeout fired but search stopped or driver already accepted. Driver:', driver.id);
            }
          }, 40000);

          // Wait for either rejection (handled by listener) or timeout
          await new Promise((resolve) => {
            processNextDriver = resolve;
          });

          if (!isSearchingRef.current || accepted !== null) break;
        }
      };
    
      // Main search loop
      const maxRadius = parameters?.min_radius_search || 4; // Fallback to 4 if not defined
      while (accepted === null && radius <= maxRadius && isSearchingRef.current) {
        if (!isSearchingRef.current) {
          break;
        }
        
        let drivers = [];
        if (stepRef.current !== 5 || !isSearchingRef.current) {
          return;
        }
     
        try {
          let url = `/drivers-in-radius?radius=${radius}&latitude=${formData?.pickupAddress?.latitude}&longitude=${formData?.pickupAddress?.longitude}&vehicleType=${formData?.vehicleType?.id}`;
           
          
          const response = await api.get(url);
          drivers = response.data || [];
          console.log(`Found ${drivers.length} drivers in radius ${radius}`);
        } catch (error) {
          console.error(`Error fetching drivers for radius ${radius}:`, error.response?.data || error.message);
          radius += 1;
          continue;
        }

        if (drivers.length > 0) {
          const newDrivers = drivers.filter(driver =>
            !processedDriversRef.current.has(driver.id) && !driversIdsNotAccepted.includes(driver.id)
          );
          if (newDrivers.length > 0) {
            await processDrivers(drivers);
          } else {
            // All drivers in this radius are already processed, increase radius
            radius += 1;
          }
        } else {
          radius += 1;
        }
      }
    
      if (accepted === null && isSearchingRef.current) {
        if (requestRef.current && !accepted) {
          requestRef.current.off();
        }
        
        // Track no driver found
        trackRideCancelled('no_driver_found', {
          search_duration: Date.now() - searchStartTime.current,
          max_radius: maxRadius,
          pickup_address: formData?.pickupAddress,
          drop_address: formData?.dropAddress,
          final_radius: radius,
          drivers_notified: Object.keys(processedDriversRef.current).length
        });
        
      
        setDriversIdsNotAccepted([]);
        
        // Start fast progress animation and wait for completion before going back
        startFastProgressAnimation();
      }

      unsubscribe();
      if (unsubscribeNotifiedDrivers) {
        unsubscribeNotifiedDrivers();
      }
      if (currentDriverTimeout) {
        clearTimeout(currentDriverTimeout);
      }
    } catch (error) {
      console.log("dddd",error)
      if (requestRef.current) {
        requestRef.current.off();
      }
      
      // Stop progress animation
      progressAnim.stopAnimation();
      
      // Track search error
      trackRideCancelled('search_error', {
        error_message: error.message,
        search_duration: Date.now() - searchStartTime.current
      });
      
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  // Start driver search
  useEffect(() => {
    console.log("SearchDrivers useEffect triggered");
    console.log("Parameters loaded:", parameters);
    console.log("Form data:", formData);
    if(inRedZone){
      console.log("In red zone, skipping searchDrivers and showing search UI for 30s");
      return;
    } 
    
    // Only start searching when parameters are loaded and avatarUrls are ready
    if (parameters && !inRedZone && avatarUrls.length > 0) {
      console.log("Starting searchDrivers function");
      setDrivers(generateCenteredPositions(avatarUrls));
      setSearchStep(1);
      startProgressAnimation(); // Start progress animation
      searchDrivers();
    } else {
      console.log("Parameters not loaded yet, waiting...");
    }

    return () => {
      console.log("SearchDrivers cleanup - stopping search");
      // Stop all ongoing operations
      isSearchingRef.current = false;
      stepRef.current = 0;
      // Clear any pending timeouts
      clearTimeout();
      
      // Stop progress animation
      progressAnim.stopAnimation();
      
      // Check if the request exists and its status before removing
      if (requestRef.current) {
        requestRef.current.once('value').then((snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            // Only remove if the request wasn't accepted
            if (data.status !== 'accepted') {
              requestRef.current.remove();
            }
          }
          // Always remove the listener
          requestRef.current.off();
        });
      }
    }
  }, [parameters]);

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

