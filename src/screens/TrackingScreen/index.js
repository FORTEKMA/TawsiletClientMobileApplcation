import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  Image,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Mapbox, {
  MapView,
  Camera,
  PointAnnotation,
  ShapeSource,
  LineLayer,
  SymbolLayer,
  FillLayer,
  CircleLayer,
  RasterLayer,
  Light
} from '@rnmapbox/maps';
import { TRACKING_MAP_STYLE, MAP_PERFORMANCE_SETTINGS } from '../../utils/mapboxConfig';
import { API_GOOGLE } from '@env';
import api from '../../utils/api';
import { colors } from '../../utils/colors'; // Assuming colors are defined here, will override
import { ref as dbRef, onValue, off } from 'firebase/database';
import db from '../../utils/firebase';
import DriverMarker from '../../components/DriverMarker';
import { RouteOptimizer, DriverMovementTracker, MapPerformanceUtils, NavigationRouteManager } from '../../utils/mapUtils';
import { getDistance } from 'geolib';

const { width, height } = Dimensions.get('window');

// Enhanced 3D Street Style Configuration
const STREET_STYLE_3D_CONFIG = {
  pitch: 60, // 3D viewing angle
  bearing: 0, // Initial compass bearing
  zoom: 17, // Close-up street level zoom
  animationDuration: 1500,
  followingZoom: 18,
  navigationZoom: 19,
  buildingExtrusionHeight: 'height', // Use building height data
  roadWidth: 8,
  routeWidth: 6,
  shadowIntensity: 0.7,
  ambientLightIntensity: 0.4,
  directionalLightIntensity: 0.6,
};

// Enhanced 3D Map Style with Street Details
const ENHANCED_3D_STREET_STYLE = {
  version: 8,
  name: 'Enhanced 3D Street Style',
  sources: {
    'mapbox-streets': {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-streets-v8'
    },
    'mapbox-satellite': {
      type: 'raster',
      url: 'mapbox://mapbox.satellite',
      tileSize: 256
    },
    'composite': {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2'
    }
  },
  layers: [
    // Satellite base layer for realistic street view
    {
      id: 'satellite',
      type: 'raster',
      source: 'mapbox-satellite',
      layout: { visibility: 'visible' },
      paint: { 'raster-opacity': 0.8 }
    },
    // Enhanced building extrusions for 3D effect
    {
      id: 'building-extrusion',
      type: 'fill-extrusion',
      source: 'composite',
      'source-layer': 'building',
      filter: ['has', 'height'],
      paint: {
        'fill-extrusion-color': [
          'interpolate',
          ['linear'],
          ['get', 'height'],
          0, '#cccccc',
          50, '#999999',
          100, '#666666',
          200, '#333333'
        ],
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.8,
        'fill-extrusion-vertical-gradient': true
      }
    },
    // Enhanced road styling
    {
      id: 'road-primary',
      type: 'line',
      source: 'composite',
      'source-layer': 'road',
      filter: ['==', 'class', 'primary'],
      paint: {
        'line-color': '#ffffff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 18, 8],
        'line-opacity': 0.9
      }
    },
    {
      id: 'road-secondary',
      type: 'line',
      source: 'composite',
      'source-layer': 'road',
      filter: ['==', 'class', 'secondary'],
      paint: {
        'line-color': '#f0f0f0',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 18, 6],
        'line-opacity': 0.8
      }
    },
    // Street labels with enhanced visibility
    {
      id: 'road-label',
      type: 'symbol',
      source: 'composite',
      'source-layer': 'road',
      layout: {
        'text-field': '{name}',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, 8, 18, 14],
        'symbol-placement': 'line',
        'text-rotation-alignment': 'map'
      },
      paint: {
        'text-color': '#333333',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2
      }
    }
  ]
};

// Helper function to decode Google's polyline format
const decodePolyline = (encoded) => {
  const poly = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let shift = 0, result = 0;

    do {
      let b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (result >= 0x20);

    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      let b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (result >= 0x20);

    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push([lng / 1E5, lat / 1E5]);
  }

  return poly;
};

// Enhanced route generation with street-level details
const generateEnhanced3DRoute = (origin, destination) => {
  const [originLat, originLng] = origin.split(',').map(Number);
  const [destLat, destLng] = destination.split(',').map(Number);
  
  // Generate more realistic curved route with street-level precision
  const numPoints = 25; // More points for smoother curves
  const coordinates = [];
  
  // Add some realistic street-level curves
  for (let i = 0; i <= numPoints; i++) {
    const ratio = i / numPoints;
    
    // Add slight curves to simulate real street paths
    const curveFactor = Math.sin(ratio * Math.PI * 2) * 0.0005;
    const lat = originLat + (destLat - originLat) * ratio + curveFactor;
    const lng = originLng + (destLng - originLng) * ratio + curveFactor * 0.5;
    
    coordinates.push([lng, lat]);
  }
  
  return coordinates;
};

const TrackingScreen = ({ route }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  
  const orderId = route.params.id;
  
  // State management
  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCall, setShowCall] = useState(false);
  const [callType, setCallType] = useState('voice');
  const [currentCallId, setCurrentCallId] = useState(null);
  const [driverPosition, setDriverPosition] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isFollowingDriver, setIsFollowingDriver] = useState(true);
  const [driverIsMoving, setDriverIsMoving] = useState(false);
  const [estimatedArrival, setEstimatedArrival] = useState(null);
  const [routeDistance, setRouteDistance] = useState(null);
  const [navigationMode, setNavigationMode] = useState(true); // Default to 3D navigation mode
  const [routeInstructions, setRouteInstructions] = useState([]);
  const [currentRouteStep, setCurrentRouteStep] = useState(0);
  const [nextTurnInstruction, setNextTurnInstruction] = useState(null);
  const [routeUpdateKey, setRouteUpdateKey] = useState(0);
  const [streetViewMode, setStreetViewMode] = useState(true);
  const [mapStyle, setMapStyle] = useState('street3d');
  const [showTrafficLayer, setShowTrafficLayer] = useState(true);
  const [cameraFollowBearing, setCameraFollowBearing] = useState(0);
  
  // Map refs
  const mapRef = useRef(null);
  const cameraRef = useRef(null);
  const markerRef = useRef(null);
  const routeUpdateTimeoutRef = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const navigationPanelAnim = useRef(new Animated.Value(-200)).current;
  
  // Initialize utilities
  const routeOptimizer = useRef(new RouteOptimizer()).current;
  const driverTracker = useRef(new DriverMovementTracker()).current;
  const navigationManager = useRef(new NavigationRouteManager()).current;
  
  // Enhanced throttled camera update with 3D capabilities
  const throttledCameraUpdate = useRef(
    MapPerformanceUtils.throttle((coordinate, options = {}) => {
      if (cameraRef.current && mapReady) {
        const defaultOptions = {
          centerCoordinate: coordinate,
          zoomLevel: streetViewMode ? STREET_STYLE_3D_CONFIG.followingZoom : 15,
          pitch: streetViewMode ? STREET_STYLE_3D_CONFIG.pitch : 0,
          bearing: options.bearing || cameraFollowBearing,
          animationDuration: STREET_STYLE_3D_CONFIG.animationDuration,
        };
        
        cameraRef.current.setCamera({ ...defaultOptions, ...options });
      }
    }, 500)
  ).current;

  // Extract driver information
  const driverName = driver?.firstName + ' ' + driver?.lastName || t('tracking.driver', 'Driver');
  const driverAvatar = driver?.profilePicture?.url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face';
  const driverRating = driver?.rating || '4.8';
  const carModel = driver?.vehicule?.mark || t('tracking.vehicle', 'Vehicle');
  const carPlate = driver?.vehicule?.matriculation || 'ABC-123';

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (routeUpdateTimeoutRef.current) {
        clearTimeout(routeUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced route regeneration with 3D street style
  useEffect(() => {
    if (order && driverPosition) {
      generateEnhanced3DRouteBasedOnStatus(order, driverPosition).catch(console.error);
    }
  }, [order?.commandStatus, driverPosition, navigationMode, streetViewMode]);

  // Listen to driver location updates from Firebase with enhanced tracking
  useEffect(() => {
    if (driver?.documentId) {
      const driverRef = dbRef(db, `drivers/${driver.documentId}`);
      const unsubscribe = onValue(driverRef, snapshot => {
        const data = snapshot.val();
        if (data?.latitude && data?.longitude) {
          const newPosition = {
            latitude: data.latitude,
            longitude: data.longitude,
            type: data.type,
            angle: data.angle || 0,
            speed: data.speed || 0,
            heading: data.heading || 0,
          };
          
          // Enhanced driver movement tracking
          const trackedPosition = driverTracker.addPosition(
            data.latitude,
            data.longitude,
            Date.now()
          );
          
          setDriverIsMoving(trackedPosition.isMoving);
          setDriverPosition(newPosition);
          
          // Update camera bearing based on driver movement direction
          if (trackedPosition.isMoving && trackedPosition.bearing !== undefined) {
            setCameraFollowBearing(trackedPosition.bearing);
          }
          
          // Update estimated arrival
          updateEstimatedArrival(newPosition);
          
          // Update turn-by-turn instructions
          updateTurnInstructions(newPosition);
          
          // Enhanced route regeneration with debouncing
          if (order) {
            if (routeUpdateTimeoutRef.current) {
              clearTimeout(routeUpdateTimeoutRef.current);
            }
            
            routeUpdateTimeoutRef.current = setTimeout(() => {
              generateEnhanced3DRouteBasedOnStatus(order, newPosition).catch(console.error);
            }, 800);
          }
          
          // Enhanced camera following with 3D street view
          if (isFollowingDriver && mapReady && streetViewMode) {
            throttledCameraUpdate([newPosition.longitude, newPosition.latitude], {
              bearing: newPosition.heading || cameraFollowBearing,
              pitch: STREET_STYLE_3D_CONFIG.pitch,
              zoomLevel: STREET_STYLE_3D_CONFIG.navigationZoom,
            });
          } else if (isFollowingDriver && mapReady) {
            throttledCameraUpdate([newPosition.longitude, newPosition.latitude]);
          }
        }
      });
      return () => off(driverRef, unsubscribe);
    }
  }, [driver?.documentId, isFollowingDriver, mapReady, order, streetViewMode, cameraFollowBearing]);

  // Enhanced UI animations
  useEffect(() => {
    if (!loading && !error) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Show navigation panel if in navigation mode
      if (navigationMode) {
        Animated.timing(navigationPanelAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [loading, error, navigationMode]);

  const updateEstimatedArrival = useCallback((driverPos) => {
    if (!order?.pickUpAddress?.coordonne) return;
    
    const pickup = order.pickUpAddress.coordonne;
    const distance = getDistance(
      { latitude: driverPos.latitude, longitude: driverPos.longitude },
      { latitude: pickup.latitude, longitude: pickup.longitude }
    );
    
    // Enhanced time estimation based on traffic and speed
    const averageSpeed = driverPos.speed > 0 ? driverPos.speed : 30; // km/h
    const estimatedTimeMinutes = Math.round((distance / 1000) / (averageSpeed / 60));
    setEstimatedArrival(Math.max(1, estimatedTimeMinutes));
  }, [order]);

  const updateTurnInstructions = useCallback((driverPos) => {
    if (navigationMode && routeInstructions.length > 0) {
      // Find the next instruction based on driver position
      const nextInstruction = routeInstructions.find((instruction, index) => {
        // Logic to determine if this is the next instruction
        return index >= currentRouteStep;
      });
      setNextTurnInstruction(nextInstruction);
    }
  }, [navigationMode, routeInstructions, currentRouteStep]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
     
      const response = await api.get(`commands/${orderId}?populate[0]=driver&populate[1]=pickUpAddress&populate[2]=dropOfAddress&populate[3]=pickUpAddress.coordonne&populate[4]=dropOfAddress.coordonne&populate[5]=driver.profilePicture&populate[6]=review&populate[7]=driver.vehicule`);
      
      if (response?.data?.data != undefined) {
        setOrder(response.data.data); 
        setDriver(response.data.data.driver);
        
        // Generate enhanced 3D route based on status
        generateEnhanced3DRouteBasedOnStatus(response.data.data, driverPosition).catch(console.error);
      } else {
        setError(t('tracking.order_not_found', 'Order not found'));
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      setError(t('tracking.fetch_error', 'Failed to load order details'));
    } finally {
      setLoading(false);
    }
  };

  // Enhanced 3D route generation with street-level details
  const generateEnhanced3DRouteBasedOnStatus = async (orderData, driverPos) => {
    const pickup = orderData?.pickUpAddress?.coordonne;
    const dropoff = orderData?.dropOfAddress?.coordonne;
    const status = orderData?.commandStatus;
    
    if (!pickup || !dropoff) return;
    
    const pickupCoord = [pickup.longitude, pickup.latitude];
    const dropoffCoord = [dropoff.longitude, dropoff.latitude];
    
    let routeCoordinates = [];
    let origin, destination;
    
    switch (status) {
      case 'Pending':
      case 'Canceled_by_client':
      case 'Canceled_by_partner':
      case 'Go_to_pickup':
        if (driverPos) {
          origin = `${driverPos.latitude},${driverPos.longitude}`;
          destination = `${pickup.latitude},${pickup.longitude}`;
        } else {
          origin = `${pickup.latitude},${pickup.longitude}`;
          destination = `${dropoff.latitude},${dropoff.longitude}`;
        }
        break;
        
      case 'Arrived_at_pickup':
      case 'Picked_up':
        if (driverPos) {
          origin = `${driverPos.latitude},${driverPos.longitude}`;
          destination = `${dropoff.latitude},${dropoff.longitude}`;
        } else {
          origin = `${pickup.latitude},${pickup.longitude}`;
          destination = `${dropoff.latitude},${dropoff.longitude}`;
        }
        break;
        
      default:
        origin = `${pickup.latitude},${pickup.longitude}`;
        destination = `${dropoff.latitude},${dropoff.longitude}`;
        break;
    }
    
    try {
      // Enhanced Google Directions API call with additional parameters
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&alternatives=false&avoid=tolls&traffic_model=best_guess&departure_time=now&key=${API_GOOGLE}`
      );
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const points = route.overview_polyline.points;
        
        // Decode the polyline to get coordinates
        routeCoordinates = decodePolyline(points);
        
        // Calculate enhanced route metrics
        const distance = route.legs[0].distance.value;
        const duration = route.legs[0].duration.value;
        const durationInTraffic = route.legs[0].duration_in_traffic?.value || duration;
        
        setRouteDistance(distance);
        
        // Enhanced turn-by-turn instructions with maneuver types
        const steps = route.legs[0].steps.map((step, index) => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
          distance: step.distance.text,
          duration: step.duration.text,
          maneuver: step.maneuver || 'straight',
          startLocation: step.start_location,
          endLocation: step.end_location,
          polyline: step.polyline.points,
          stepIndex: index,
        }));
        
        setRouteInstructions(steps);
        
        // Initialize navigation manager with enhanced route data
        if (navigationManager) {
          navigationManager.setRoute(routeCoordinates, steps);
        }
      } else {
        // Enhanced fallback route generation
        routeCoordinates = generateEnhanced3DRoute(origin, destination);
      }
    } catch (error) {
      console.error('Failed to fetch enhanced route:', error);
      routeCoordinates = generateEnhanced3DRoute(origin, destination);
    }
    
    // Convert to enhanced GeoJSON with additional properties
    const routeShape = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: routeCoordinates
      },
      properties: {
        color: '#000000',
        width: streetViewMode ? STREET_STYLE_3D_CONFIG.routeWidth : 4,
        opacity: 0.8,
        style: streetViewMode ? '3d-street' : 'standard'
      }
    };
    
    setRouteCoordinates(routeShape);
    setRouteUpdateKey(prev => prev + 1);
  };

  const handleChatPress = () => {
    navigation.navigate('ChatScreen', {
      driverId: driver?.id,
      orderId: orderId,
    });
  };

  const handleCallPress = async () => {
    try {
      Alert.alert(
        t('call.select_call_type', 'Select Call Type'),
        t('call.choose_call_type', 'Choose how you want to call the driver'),
        [
          {
            text: t('call.voice_call', 'Voice Call'),
            onPress: () => initiateCall('voice'),
          },
          {
            text: t('call.video_call', 'Video Call'),
            onPress: () => initiateCall('video'),
          },
          {
            text: t('common.cancel', 'Cancel'),
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Failed to initiate call:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('call.failed_to_initiate', 'Failed to initiate call. Please try again.')
      );
    }
  };

  const initiateCall = async (type) => {
    console.log('Initiating call:', type);
  };

  const toggleFollowDriver = () => {
    setIsFollowingDriver(!isFollowingDriver);
    if (!isFollowingDriver && driverPosition && cameraRef.current) {
      const options = streetViewMode ? {
        bearing: cameraFollowBearing,
        pitch: STREET_STYLE_3D_CONFIG.pitch,
        zoomLevel: STREET_STYLE_3D_CONFIG.navigationZoom,
      } : {};
      throttledCameraUpdate([driverPosition.longitude, driverPosition.latitude], options);
    }
  };

  const toggle3DStreetView = () => {
    setStreetViewMode(!streetViewMode);
    if (driverPosition && cameraRef.current) {
      const newPitch = !streetViewMode ? STREET_STYLE_3D_CONFIG.pitch : 0;
      const newZoom = !streetViewMode ? STREET_STYLE_3D_CONFIG.navigationZoom : 15;
      
      cameraRef.current.setCamera({
        pitch: newPitch,
        zoomLevel: newZoom,
        animationDuration: 1000,
      });
    }
  };

  const toggleNavigationMode = () => {
    setNavigationMode(!navigationMode);
    
    // Animate navigation panel
    Animated.timing(navigationPanelAnim, {
      toValue: !navigationMode ? 0 : -200,
      duration: 400,
      useNativeDriver: true,
    }).start();
    
    if (!navigationMode && cameraRef.current) {
      cameraRef.current.setCamera({
        pitch: STREET_STYLE_3D_CONFIG.pitch,
        zoomLevel: STREET_STYLE_3D_CONFIG.navigationZoom,
        animationDuration: 1000,
      });
    }
  };

  const focusOnDriver = () => {
    if (driverPosition && cameraRef.current) {
      const options = streetViewMode ? {
        bearing: cameraFollowBearing,
        pitch: STREET_STYLE_3D_CONFIG.pitch,
        zoomLevel: STREET_STYLE_3D_CONFIG.navigationZoom,
      } : {};
      throttledCameraUpdate([driverPosition.longitude, driverPosition.latitude], options);
    }
  };

  const focusOnRoute = () => {
    if (routeCoordinates && routeCoordinates.geometry && cameraRef.current) {
      const coordinates = routeCoordinates.geometry.coordinates;
      const bounds = MapPerformanceUtils.calculateBounds(coordinates, 0.2);
      if (bounds) {
        cameraRef.current.fitBounds([
          [bounds.west, bounds.south],
          [bounds.east, bounds.north],
        ], {
          paddingLeft: 50,
          paddingRight: 50,
          paddingTop: 100,
          paddingBottom: 200,
          animationDuration: 1500,
        });
      }
    }
  };

  const getManeuverIcon = (maneuver) => {
    const iconMap = {
      'turn-left': 'turn-left',
      'turn-right': 'turn-right',
      'turn-slight-left': 'turn-slight-left',
      'turn-slight-right': 'turn-slight-right',
      'turn-sharp-left': 'turn-sharp-left',
      'turn-sharp-right': 'turn-sharp-right',
      'uturn-left': 'u-turn-left',
      'uturn-right': 'u-turn-right',
      'straight': 'arrow-up',
      'ramp-left': 'merge-left',
      'ramp-right': 'merge-right',
      'merge': 'merge',
      'fork-left': 'call-split',
      'fork-right': 'call-split',
      'ferry': 'ferry',
      'roundabout-left': 'rotate-left',
      'roundabout-right': 'rotate-right',
    };
    
    return iconMap[maneuver] || 'navigation';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>{t('tracking.loading', 'Loading tracking information...')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#000000" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrder}>
            <Text style={styles.retryButtonText}>{t('common.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Enhanced 3D Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          styleURL={streetViewMode ? ENHANCED_3D_STREET_STYLE : TRACKING_MAP_STYLE}
          onDidFinishLoadingMap={() => setMapReady(true)}
          compassEnabled={true}
          compassViewPosition={3}
          compassViewMargins={{ x: 20, y: 100 }}
          scaleBarEnabled={false}
          logoEnabled={false}
          attributionEnabled={false}
          pitchEnabled={true}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
        >
          {/* Enhanced 3D Lighting */}
          <Light style={{
            anchor: 'viewport',
            color: '#ffffff',
            intensity: STREET_STYLE_3D_CONFIG.ambientLightIntensity,
            position: [1.5, 90, 80]
          }} />
          
          {/* Enhanced Camera with 3D capabilities */}
          <Camera
            ref={cameraRef}
            zoomLevel={streetViewMode ? STREET_STYLE_3D_CONFIG.navigationZoom : 15}
            pitch={streetViewMode ? STREET_STYLE_3D_CONFIG.pitch : 0}
            bearing={cameraFollowBearing}
            animationDuration={STREET_STYLE_3D_CONFIG.animationDuration}
            followUserLocation={false}
            followUserMode="none"
          />

          {/* Enhanced Route Display */}
          {routeCoordinates && routeCoordinates.geometry && (
            <ShapeSource
              key={`route-${routeUpdateKey}`}
              id="routeSource"
              shape={routeCoordinates}
            >
              <LineLayer
                id="routeLine"
                style={{
                  lineColor: streetViewMode ? '#000000' : '#000000',
                  lineWidth: streetViewMode ? STREET_STYLE_3D_CONFIG.routeWidth : 4,
                  lineOpacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineGradient: [
                    'interpolate',
                    ['linear'],
                    ['line-progress'],
                    0, '#000000',
                    0.5, '#333333',
                    1, '#000000'
                  ]
                }}
              />
              
              {/* Route shadow for 3D effect */}
              {streetViewMode && (
                <LineLayer
                  id="routeShadow"
                  style={{
                    lineColor: 'rgba(0, 0, 0, 0.3)',
                    lineWidth: STREET_STYLE_3D_CONFIG.routeWidth + 2,
                    lineOpacity: 0.5,
                    lineCap: 'round',
                    lineJoin: 'round',
                    lineTranslate: [2, 2]
                  }}
                />
              )}
            </ShapeSource>
          )}

          {/* Enhanced Driver Marker */}
          {driverPosition && (
            <PointAnnotation
              key="driverMarker"
              id="driverMarker"
              coordinate={[driverPosition.longitude, driverPosition.latitude]}
            >
              <View style={[
                styles.driverMarker,
                streetViewMode && styles.driverMarker3D,
                driverIsMoving && styles.driverMarkerMoving
              ]}>
                <View style={styles.driverMarkerInner}>
                  <MaterialCommunityIcons 
                    name="car" 
                    size={streetViewMode ? 24 : 20} 
                    color="#ffffff" 
                    style={{
                      transform: [{ rotate: `${driverPosition.angle || 0}deg` }]
                    }}
                  />
                </View>
                {streetViewMode && (
                  <View style={styles.driverMarkerShadow} />
                )}
              </View>
            </PointAnnotation>
          )}

          {/* Pickup Location Marker */}
          {order?.pickUpAddress?.coordonne && (
            <PointAnnotation
              key="pickupMarker"
              id="pickupMarker"
              coordinate={[
                order.pickUpAddress.coordonne.longitude,
                order.pickUpAddress.coordonne.latitude
              ]}
            >
              <View style={[styles.locationMarker, styles.pickupMarker]}>
                <MaterialCommunityIcons name="map-marker" size={30} color="#000000" />
              </View>
            </PointAnnotation>
          )}

          {/* Dropoff Location Marker */}
          {order?.dropOfAddress?.coordonne && (
            <PointAnnotation
              key="dropoffMarker"
              id="dropoffMarker"
              coordinate={[
                order.dropOfAddress.coordonne.longitude,
                order.dropOfAddress.coordonne.latitude
              ]}
            >
              <View style={[styles.locationMarker, styles.dropoffMarker]}>
                <MaterialCommunityIcons name="flag-checkered" size={30} color="#000000" />
              </View>
            </PointAnnotation>
          )}
        </MapView>

        {/* Enhanced Control Panel */}
        <View style={styles.controlPanel}>
          <TouchableOpacity
            style={[styles.controlButton, streetViewMode && styles.controlButtonActive]}
            onPress={toggle3DStreetView}
          >
            <MaterialCommunityIcons 
              name="rotate-3d-variant" 
              size={24} 
              color={streetViewMode ? '#000000' : '#666666'} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, navigationMode && styles.controlButtonActive]}
            onPress={toggleNavigationMode}
          >
            <MaterialCommunityIcons 
              name="navigation" 
              size={24} 
              color={navigationMode ? '#000000' : '#666666'} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, isFollowingDriver && styles.controlButtonActive]}
            onPress={toggleFollowDriver}
          >
            <MaterialCommunityIcons 
              name="crosshairs-gps" 
              size={24} 
              color={isFollowingDriver ? '#000000' : '#666666'} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton} onPress={focusOnRoute}>
            <MaterialCommunityIcons name="map-search" size={24} color="#666666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Navigation Panel */}
      {navigationMode && nextTurnInstruction && (
        <Animated.View 
          style={[
            styles.navigationPanel,
            { transform: [{ translateY: navigationPanelAnim }] }
          ]}
        >
          <View style={styles.navigationContent}>
            <MaterialCommunityIcons 
              name={getManeuverIcon(nextTurnInstruction.maneuver)} 
              size={32} 
              color="#000000" 
            />
            <View style={styles.navigationText}>
              <Text style={styles.navigationInstruction} numberOfLines={2}>
                {nextTurnInstruction.instruction}
              </Text>
              <Text style={styles.navigationDistance}>
                {nextTurnInstruction.distance}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Enhanced Driver Info Panel */}
      <Animated.View 
        style={[
          styles.driverInfoPanel,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.driverInfo}>
          <Image source={{ uri: driverAvatar }} style={styles.driverAvatar} />
          <View style={styles.driverDetails}>
            <View style={styles.driverNameRow}>
              <Text style={styles.driverName}>{driverName}</Text>
              <View style={styles.ratingContainer}>
                <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
                <Text style={styles.rating}>{driverRating}</Text>
              </View>
            </View>
            <Text style={styles.carInfo}>{carModel} • {carPlate}</Text>
            {estimatedArrival && (
              <Text style={styles.eta}>
                {t('tracking.eta', 'ETA')}: {estimatedArrival} {t('tracking.minutes', 'min')}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleChatPress}>
            <MaterialCommunityIcons name="message-text" size={24} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleCallPress}>
            <MaterialCommunityIcons name="phone" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Enhanced Status Indicator */}
      <View style={styles.statusIndicator}>
        <View style={[
          styles.statusDot,
          driverIsMoving ? styles.statusMoving : styles.statusStopped
        ]} />
        <Text style={styles.statusText}>
          {driverIsMoving ? t('tracking.driver_moving', 'Driver is moving') : t('tracking.driver_stopped', 'Driver stopped')}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  controlPanel: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  navigationPanel: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  navigationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigationText: {
    flex: 1,
    marginLeft: 12,
  },
  navigationInstruction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  navigationDistance: {
    fontSize: 14,
    color: '#666666',
  },
  driverInfoPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  driverDetails: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  carInfo: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  eta: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusMoving: {
    backgroundColor: '#000000',
  },
  statusStopped: {
    backgroundColor: '#666666',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  driverMarker3D: {
    width: 48,
    height: 48,
    borderRadius: 24,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  driverMarkerMoving: {
    borderColor: '#000000',
    borderWidth: 4,
  },
  driverMarkerInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarkerShadow: {
    position: 'absolute',
    bottom: -8,
    left: 4,
    right: 4,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    transform: [{ scaleX: 0.8 }],
  },
  locationMarker: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pickupMarker: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 20,
    padding: 8,
  },
  dropoffMarker: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 20,
    padding: 8,
  },
});

export default TrackingScreen;

