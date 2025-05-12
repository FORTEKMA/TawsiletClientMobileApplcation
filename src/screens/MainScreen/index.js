import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Image,
  Alert,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Dimensions,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import DriverMarker from '../../components/DriverMarker';
import MapView, {Marker, PROVIDER_GOOGLE, Polyline} from 'react-native-maps';
import {useDispatch, useSelector} from 'react-redux';
import polyline from '@mapbox/polyline';
import {styles} from './styles';
import {getAddressFromCoordinates} from '../../utils/helpers/mapUtils';
import WaveCircle from '../../components/WaveCircle';
import StepLocation from './components/StepLocation';
import Step2 from './components/Step2';
import Step3 from './components/Step3';
import Step4 from './components/Step4';
import Step5 from './components/Step5';
import MapStyle from '../../utils/googleMapStyle.js';
import api from '../../utils/api';
import { useToast } from 'native-base';
import { useTranslation } from 'react-i18next';
import ProgressTimer from '../../components/ProgressTimer';
import CustomAlert from '../../components/CustomAlert';
import Geolocation from '@react-native-community/geolocation';
import { getDatabase, ref as dbRef, onValue, off  } from '@react-native-firebase/database';
import { getApp } from '@react-native-firebase/app';
import {OneSignal} from 'react-native-onesignal';
import {sendNotificationToDrivers,calculatePrice,sendActionToDrivers} from '../../utils/CalculateDistanceAndTime';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

const MainScreen = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state?.user?.currentUser);
  const toast = useToast();
  const { t } = useTranslation();
  const [driversIdsNotAccepted, setDriversIdsNotAccepted] = useState([]);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [drivers, setDrivers] = useState({});
  const [accepted, setAccepted] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 36.80557596268572,
    longitude: 10.180696783260366,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const mapRef = useRef(null);
  const position = useRef(new Animated.Value(0)).current;
  const [showTimeEndAlert, setShowTimeEndAlert] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [filteredDrivers, setFilteredDrivers] = useState({});

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      Geolocation.requestAuthorization();
      getCurrentLocation();
    } else {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000);
        }
      },
      (error) => console.log(error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    console.log(getApp())
    const db = getDatabase(getApp());
    const driversRef = dbRef(db, 'drivers');

    const unsubscribe = onValue(driversRef, snapshot => {
      const data = snapshot.val() || {};
      const activeDrivers = {};

      Object.entries(data).forEach(([uid, driver]) => {
        if (
          driver.isFree === true &&
          driver.latitude &&
          driver.longitude &&
          currentLocation
        ) {
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            driver.latitude,
            driver.longitude
          );

          if (distance <= 50) {
            activeDrivers[uid] = driver;
          }
        }
      });

      setFilteredDrivers(activeDrivers);
    });

    return () => {
      driversRef.off('value', unsubscribe);
    }
  }, [currentLocation]);

  useEffect(() => {
    if(step === 3){
      searchDrivers()
       OneSignal.Notifications.addEventListener('foregroundWillDisplay', event => {
        if(event?.notification?.additionalData?.accept==true){
        setAccepted(event?.notification?.additionalData)
        animateStepTransition(step+1);
        setStep(step+1)
        OneSignal.Notifications.removeEventListener('foregroundWillDisplay');
        }
        

        });
  
    }
  
    return () => {
      OneSignal.Notifications.removeEventListener('foregroundWillDisplay');
     }
  }, [step])  

  const animateStepTransition = (newStep) => {
    const direction = newStep > step ? -1 : 1;
    position.setValue(direction * SCREEN_WIDTH);
    
    Animated.spring(position, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

   

   const searchDrivers = async () => {
    let radius = 1;
    let processedDrivers = new Set(); // Track processed drivers to prevent duplicates
    console.log('🚀 Starting driver search process');
   
    try {
      while (accepted == null && radius <= 10) {
        console.log(`\n📡 Searching drivers in radius: ${radius}km`);
        let drivers = [];
    if(accepted==null){
        try {
          let url=`/drivers-in-radius?radius=${radius}&latitude=${formData?.pickupAddress?.latitude}&longitude=${formData?.pickupAddress?.longitude}&vehicleType=${formData?.vehicleType?.id}`
          if(driversIdsNotAccepted.length>0){
            driversIdsNotAccepted.forEach((id,index)=>{
              url+=`&excludedIds[${index}]=${id}`
            })
          }
          const response = await api.get(url);
          
          drivers = response.data || [];
          console.log(`📊 Found ${drivers.length} drivers in radius ${radius}km`);
          
        } catch (error) {
          console.log(`❌ Error fetching drivers in radius ${radius}:`, error.response);
          radius += 1;
          continue;
        }

        // Filter out already processed drivers
        const newDrivers = drivers.filter(driver => !processedDrivers.has(driver.id));
        console.log(`🆕 New drivers to process: ${newDrivers.length}`);
    
        for (const driver of newDrivers) {
          // Skip if driver is already in not accepted list
          if (driversIdsNotAccepted.includes(driver.id)) {
            console.log(`⏭️ Skipping driver ${driver.id} - already in not accepted list`);
            continue;
          }

          console.log(`\n👤 Processing driver ${driver.id}`);
          try {
            const rideData = await calculatePrice(formData, driver);
            console.log(`💰 Calculated price: ${rideData.price}, distance: ${rideData.distance}km, time: ${rideData.time}min`);
            
            setFormData(prev => ({
              ...prev,
              price: rideData.price,
              distance: rideData.distance,
              time: rideData.time
            }));
            
            try {
              console.log(`📱 Sending notification to driver ${driver.id}`);
            const notificationRed=  await sendNotificationToDrivers({
                formData: {
                  ...formData,
                  price: rideData.price,
                  distance: rideData.distance,
                  time: rideData.time
                },
                driver,
                currentUser
              });
              console.log(notificationRed)
              console.log(`✅ Notification sent successfully to driver ${driver.id}`);
            } catch (notificationError) {
              console.log(`❌ Error sending notification to driver ${driver.id}:`, notificationError);
            }

            console.log(`⏳ Waiting 6 seconds before processing next driver...`);
            await new Promise(resolve => setTimeout(resolve, 60000));
            
            // Add to processed set and not accepted list
            processedDrivers.add(driver.id);
            setDriversIdsNotAccepted(prev => {
              // Prevent duplicates by checking if driver.id is not already in the array
              if (!prev.includes(driver.id)) {
                console.log(`📝 Adding driver ${driver.id} to not accepted list`);
                return [...prev, driver.id];
              }
              console.log(`ℹ️ Driver ${driver.id} already in not accepted list`);
              return prev;
            });

          } catch (driverError) {
            console.log(`❌ Error processing driver ${driver.id}:`, driverError);
            // Add to processed set even if there was an error
            processedDrivers.add(driver.id);
            continue;
          }
        }
        


    
        // If no new drivers were processed in this radius, increase it
        if (newDrivers.length === 0) {
           radius += 1;
        }
      }
        console.log(`\n📊 Current status:
          - Processed drivers: ${processedDrivers.size}
          - Not accepted drivers: ${driversIdsNotAccepted.length}
          - Current radius: ${radius}km
          - Accepted: ${accepted ? 'Yes' : 'No'}
        `);


      }
    
      if (accepted == null) {
        console.log('\n❌ No driver accepted the request after searching all radii');
        toast.show({
          title: t('common.no_driver_accepted'),
          placement: "top",
          status: "error",
          duration: 3000
        });
        setDriversIdsNotAccepted([])
        goBack();
      }
    } catch (error) {
      console.log('\n❌ Unexpected error in searchDrivers:', error);
      toast.show({
        title: t('common.error'),
        placement: "top",
        status: "error",
        duration: 3000
      });
    }
  };
  
  const goNext = async (data,handlerNext=true) => {
     try {
      setFormData({...formData,...data})
      if(handlerNext){
        animateStepTransition(step+1);
        setStep(step+1)
   
     
    
    }
  
     } catch (error) {
      console.log(error)
     }
  
    
  };

  const goBack = () => {
   
    if(step==3){
      OneSignal.Notifications.removeEventListener('foregroundWillDisplay');
      console.log("cancel the job");
    }
    animateStepTransition(step-1);
    setStep(step-1)
  
  }

  const handleTimeEnd = () => {
    setShowTimeEndAlert(true);
    sendActionToDrivers(accepted?.notificationId, "Canceled_by_client")
    handleReset
  };

  const handleGoBack = () => {
    if (step === 4 || step === 5) {
      setShowCancelAlert(true);
    } else {
      goBack();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelAlert(false);
    setStep(1)
    setFormData({})
    setAccepted(null)
    setDriversIdsNotAccepted([])
    setDrivers({})
    sendActionToDrivers(accepted?.notificationId, "Canceled_by_client")
  };

  const handleReset = () => {
    setStep(1)
    setFormData({})
    setAccepted(null)
    setDriversIdsNotAccepted([])
    setDrivers({})
  }

  const renderRoute = () => {
    if (formData?.dropAddress?.latitude && formData?.dropAddress?.longitude) {
      return (
        <Polyline
          coordinates={[
            {
              latitude: formData?.pickupAddress?.latitude,
              longitude: formData?.pickupAddress?.longitude,
            },
            {
              latitude: formData?.dropAddress?.latitude,
              longitude: formData?.dropAddress?.longitude,
            },
          ]}
          strokeWidth={4}
          strokeColor="blue"
        />
      );
    }
    return null;
  };

  const renderStep = () => {
    const translateX = position.interpolate({
      inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      outputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    });

    return (
      <Animated.View
        style={[
          localStyles.stepContainer,
          {
            transform: [{ translateX }],
          },
        ]}>
        <View style={localStyles.stepContent}>
          {(step === 4 || step === 5) && <ProgressTimer onTimeEnd={handleTimeEnd} />}
          {step === 1 && (
            <StepLocation formData={formData} goNext={goNext} />
          )}
          {step === 2 && (
            <Step2 formData={formData} goNext={goNext} goBack={handleGoBack} />
          )}
          {step === 3 && (
            <Step3 formData={formData} goNext={goNext} goBack={handleGoBack} />
          )}
          {step === 4 && (
            <Step4 formData={formData} rideData={accepted} goNext={goNext} goBack={handleGoBack} />
          )}
          {step === 5 && (
            <Step5 handleReset={handleReset} rideData={accepted} formData={formData} goNext={goNext} goBack={handleGoBack} />
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={localStyles.container}>
      <MapView
        ref={mapRef}
     provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        customMapStyle={MapStyle}
        zoomEnabled
        focusable
        region={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {Object.entries(filteredDrivers).map(([uid, driver]) => (
          <Marker
            key={uid}
            tracksViewChanges={false}
            coordinate={{
              latitude: driver.latitude,
              longitude: driver.longitude,
            }}
          >
            <DriverMarker type={driver.type} angle={driver.angle} />
          </Marker>
        ))}
        {renderRoute()}
      </MapView>
     {renderStep()}  

      <CustomAlert
        visible={showTimeEndAlert}
        title={t('common.time_ended')}
        message={t('common.please_complete_order')}
        type="warning"
        buttons={[
          {
            text: t('common.ok'),
            style: 'confirm',
            onPress: () => setShowTimeEndAlert(false),
          },
        ]}
      />

      <CustomAlert
        visible={showCancelAlert}
        title={t('common.confirm_cancel')}
        message={t('common.cancel_ride_warning')}
        type="warning"
        buttons={[
          {
            text: t('common.no'),
            style: 'cancel',
            onPress: () => setShowCancelAlert(false),
          },
          {
            text: t('common.yes'),
            style: 'confirm',
            onPress: handleConfirmCancel,
          },
        ]}
      />
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContainer: {
    
    backgroundColor: 'transparent',
    position:'absolute',
    bottom:0, 
    flex:1,
  },
  stepContent: {
    width: SCREEN_WIDTH,
    backgroundColor: 'transparent',
    flex:1,
   },
});

export default MainScreen; 