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

  // Fetch red zones on mount
  useEffect(() => {
    const fetchRedZones = async () => {
      try {
        const response = await api.get('/red-zones');
        const zones = response?.data?.data || response?.data || [];
        setRedZones(zones.filter(z => z.active));
      } catch (err) {
        setRedZones([]);
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

  // Track step view
  useEffect(() => {
    trackBookingStepViewed(5, 'Searching Drivers');
  }, []);

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

  const handleCancel = () => {
    trackBookingStepBack(5, 'Searching Drivers');
    trackRideCancelled('user_cancelled', {
      step: 5,
      search_duration: Date.now() - searchStartTime.current
    });
    goBack();
  };

  const searchStartTime = useRef(Date.now());

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
        dropAddress:formData.dropAddress,
        vehicleType: formData.vehicleType,
        notifiedDrivers: {},
        price:formData.price,
        distance:formData.distance,
        reservation:formData.selectedDate!=null,
        time:formData.time
      });

      // Main listener for request status changes
      const unsubscribe = newRequestRef.on('value', (snapshot) => {
        if (!snapshot || !snapshot.exists()) {
          return;
        }
        
        const data = snapshot.val();
        if (data && data.status === 'accepted') {
          setAccepted(true);
          isSearchingRef.current = false;
          stepRef.current = 0;
          unsubscribe();
          unsubscribeNotifiedDrivers();
          if (currentDriverTimeout) {
            clearTimeout(currentDriverTimeout);
          }
         
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
        
        Toast.show({
          type: 'error',
          text1: t('common.no_driver_accepted'),
          visibilityTime: 2000,
          onPress: () => {}
        });
        
        setDriversIdsNotAccepted([]);
        goBack();
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
 
  useEffect(() => {
    console.log("SearchDrivers useEffect triggered");
    console.log("Parameters loaded:", parameters);
    console.log("Form data:", formData);
    if(inRedZone){
      console.log("In red zone, skipping searchDrivers and showing search UI for 30s");
      return;
    } 
    setDrivers(generateCenteredPositions(avatarUrls));
    
    // Only start searching when parameters are loaded
    if (parameters && !inRedZone) {
      console.log("Starting searchDrivers function");
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

  // Swipe overlay logic
 
 
  

 

  return (
    <View style={localStyles.container}>
    {/* Status Header */}
    <View style={{ alignItems: 'center', marginTop: hp(2) }}>
      <View style={localStyles.statusIconWrapper}>
        <MaterialCommunityIcons name="progress-clock" size={32} color="#030303" />
      </View>
      <Text style={localStyles.statusTitle}>{t("booking.step3.searching_ride")}</Text>
      <Text style={localStyles.statusSubtitle}>{t("booking.step3.it_may_take_some_time")}</Text>
    </View>

    {/* Waves */}
    <View style={localStyles.animationWrapper}>
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
     <Ring delay={0} />
      <Ring delay={1000} />
      <Ring delay={2000} />
      <Ring delay={2500} />
      <Ring delay={3000} />
      
    </View>

     
      
    </View>
 


<Slider
 
  onEndReached={handleCancel}
  containerStyle={{
    
    backgroundColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
    
    alignItems: 'center',
    justifyContent: 'center',
    width: '95%',
    zIndex:9999999
  }}
  sliderElement={
    <View
      style={{
        width: 50,
       // margin: 4,
        borderRadius: 5,
        height: 60,
        backgroundColor:"#0c0c0c",
        alignItems:"center",
        justifyContent:"center"
      }}
      
    >
        <MaterialCommunityIcons name={I18nManager.isRTL?"arrow-left":"arrow-right"} size={32} color="#fff" />
    </View>
  }
  
>
  <Text>{I18nManager.isRTL ? t('booking.step3.swipe_left_to_cancel') : t('booking.step3.swipe_right_to_cancel')}</Text>
</Slider>

    {/* Add 4 fake drivers with avatars in random positions */}
    <View style={{ position: 'absolute', width: '100%', height: '100%', }}>
      {drivers.map(driver => (
        <View key={driver.key} style={[localStyles.driverAvatar, driver]}>
          <Image source={{ uri: driver.avatar }} style={localStyles.avatarImg} />
        </View>
      ))}
    </View>
  </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    margin: 16,
     flex:1,
    width: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    
  },
  statusIconWrapper: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 8,
    marginBottom: 8,
  },
  statusTitle: {
    fontWeight: '700',
    fontSize: hp(2.5),
    color: '#fff',
    marginTop: 4,
  },
  statusSubtitle: {
    color: '#BDBDBD',
    fontSize: hp(1.7),
    marginTop: 2,
    marginBottom: 10,
  },
  animationWrapper: {
    flex: 1.5, // Make animation area bigger
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(2),
    minHeight: 350,
  },
  circle: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#000',
    borderStyle: 'dashed',
    borderRadius: 200,
  },
  circleLarge: {
    width: 260,
    height: 260,
    top: '10%',
    left: '50%',
    marginLeft: -130,
  },
  circleMedium: {
    width: 180,
    height: 180,
    top: '22%',
    left: '50%',
    marginLeft: -90,
  },
  circleSmall: {
    width: 110,
    height: 110,
    top: '30%',
    left: '50%',
    marginLeft: -55,
  },
  carWrapper: {
    position: 'absolute',
    top: '48%',
    left: '50%',
    marginLeft: -24,
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 12,
    zIndex: 2,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'absolute',
    zIndex: 3,
    alignItems: 'center',
  },
  driverBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: 'absolute',
    top: 50,
    left: -30,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  driverName: {
    fontWeight: '700',
    color: '#fff',
    fontSize: hp(1.7),
  },
  driverDistance: {
    color: '#BDBDBD',
    fontSize: hp(1.5),
  },
  cancelWrapper: {
    alignItems: 'center',
    marginBottom: hp(4),
    zIndex:1000,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 220,
  },
  cancelText: {
    color: '#BDBDBD',
    fontWeight: '600',
    fontSize: hp(2),
    marginLeft: 8,
  },
  swipeHint: {
    color: '#BDBDBD',
    fontSize: hp(1.5),
    marginTop: 8,
  },
  driverAvatar: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 2,
    elevation: 3,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
  },
});

export default memo(SearchDriversComponent); 