import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { styles } from './styles';
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
import { TRACKING_MAP_STYLE, MAP_PERFORMANCE_SETTINGS, MAPBOX_ACCESS_TOKEN } from '../../utils/mapboxConfig';
import { API_GOOGLE } from '@env';
import api from '../../utils/api';
import { colors } from '../../utils/colors'; // Assuming colors are defined here, will override
import db from '../../utils/firebase';
import DriverMarker from '../../components/DriverMarker';
import { RouteOptimizer, DriverMovementTracker, MapPerformanceUtils, NavigationRouteManager } from '../../utils/mapUtils';
import { getDistance } from 'geolib';

// Ensure Mapbox access token is set
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

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
  buildingOpacity: 0.8,
  roadOpacity: 0.9,
  labelVisibility: true,
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
  
  // Safe parameter extraction to prevent ReadableNativeMap casting error
  const orderId = route?.params?.id || route?.params || null;
  
  // Ensure orderId is a string
  const safeOrderId = typeof orderId === 'string' ? orderId : 
                     typeof orderId === 'object' && orderId?.id ? orderId.id :
                     String(orderId || '');
  
  // State management
  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [driverPosition, setDriverPosition] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isFollowingDriver, setIsFollowingDriver] = useState(true);
  const [driverIsMoving, setDriverIsMoving] = useState(false);
  const [estimatedArrival, setEstimatedArrival] = useState(null);
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeUpdateKey, setRouteUpdateKey] = useState(0);
  const [streetViewMode, setStreetViewMode] = useState(true);
  const [cameraFollowBearing, setCameraFollowBearing] = useState(0);
  const [isFocusingOnAllCoordinates, setIsFocusingOnAllCoordinates] = useState(false);
  const [routeInstructions, setRouteInstructions] = useState([]);
  
  // Map refs
  const mapRef = useRef(null);
  const cameraRef = useRef(null);
  const routeUpdateTimeoutRef = useRef(null);
  const driverMarkerRef = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
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
  }, [order?.commandStatus, driverPosition, streetViewMode]);

  // Focus on all coordinates when map is ready and data is loaded
  useEffect(() => {
    if (mapReady && order && !loading) {
      // Small delay to ensure all data is properly loaded
      const timer = setTimeout(() => {
        focusOnAllCoordinates();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [mapReady, order, driverPosition, loading, focusOnAllCoordinates]);

  // Focus on coordinates when driver position updates (if not following driver)
  useEffect(() => {
    if (mapReady && driverPosition && !isFollowingDriver) {
      // Only update focus if we're not following the driver
      const timer = setTimeout(() => {
        focusOnAllCoordinates();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [driverPosition, isFollowingDriver, mapReady, focusOnAllCoordinates]);

  // Listen to driver location updates from Firebase with enhanced tracking
  useEffect(() => {
    if (driver?.documentId) {
      const driverRef = db.ref(`drivers/${driver.documentId}`);
      const unsubscribe = driverRef.on('value', snapshot => {
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
      return () => driverRef.off('value', unsubscribe);
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
      // Removed navigationPanelAnim animation
    }
  }, [loading, error]);

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

  const fetchOrder = async () => {
    try {
      setLoading(true);
     
      const response = await api.get(`commands/${safeOrderId}?populate[0]=driver&populate[1]=pickUpAddress&populate[2]=dropOfAddress&populate[3]=pickUpAddress.coordonne&populate[4]=dropOfAddress.coordonne&populate[5]=driver.profilePicture&populate[6]=review&populate[7]=driver.vehicule`);
      
      if (response?.data?.data != undefined) {
        setOrder(response.data.data); 
        setDriver(response.data.data.driver);
        
        // Generate enhanced 3D route based on status
        generateEnhanced3DRouteBasedOnStatus(response.data.data, driverPosition).catch(console.error);
      } else {
        setError(t('tracking.order_not_found'));
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      setError(t('tracking.fetch_error'));
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
        if (navigationManager && typeof navigationManager.setRoute === 'function') {
          navigationManager.setRoute(routeCoordinates, steps);
        }
      } else {
        // Enhanced fallback route generation
        routeCoordinates = generateEnhanced3DRoute(origin, destination);
        
        // Initialize navigation manager with fallback route
        if (navigationManager && typeof navigationManager.setRoute === 'function') {
          navigationManager.setRoute(routeCoordinates, []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch enhanced route:', error);
      routeCoordinates = generateEnhanced3DRoute(origin, destination);
      
      // Initialize navigation manager with fallback route
      if (navigationManager && typeof navigationManager.setRoute === 'function') {
        navigationManager.setRoute(routeCoordinates, []);
      }
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

  // Get order status color and text
  const getOrderStatusInfo = useCallback((status) => {
    const statusConfig = {
      'Pending': { color: '#FFA500', text: t('order.status.pending', 'Pending') },
      'Assigned_to_driver': { color: '#007AFF', text: t('order.status.assigned', 'Assigned') },
      'Driver_on_route_to_pickup': { color: '#007AFF', text: t('order.status.on_route', 'On Route') },
      'Arrived_at_pickup': { color: '#FF9500', text: t('order.status.arrived', 'Arrived') },
      'Picked_up': { color: '#34C759', text: t('order.status.picked_up', 'Picked Up') },
      'On_route_to_delivery': { color: '#34C759', text: t('order.status.delivering', 'Delivering') },
      'Arrived_at_delivery': { color: '#34C759', text: t('order.status.delivered', 'Delivered') },
      'Completed': { color: '#34C759', text: t('order.status.completed', 'Completed') },
      'Canceled_by_client': { color: '#FF3B30', text: t('order.status.canceled', 'Canceled') },
      'Canceled_by_partner': { color: '#FF3B30', text: t('order.status.canceled', 'Canceled') },
    };
    
    return statusConfig[status] || { color: '#666666', text: status || 'Unknown' };
  }, [t]);

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

  // Calculate optimal zoom level based on bounds
  const calculateOptimalZoom = useCallback((bounds) => {
    if (!bounds) return 15;
    
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    const maxDiff = Math.max(latDiff, lngDiff);
    
    if (maxDiff > 0.1) return 10;
    if (maxDiff > 0.05) return 12;
    if (maxDiff > 0.01) return 14;
    if (maxDiff > 0.005) return 16;
    if (maxDiff > 0.001) return 18;
    return 20;
  }, []);

  // Calculate center point from bounds
  const calculateCenterFromBounds = useCallback((bounds) => {
    if (!bounds) return null;
    
    const centerLng = (bounds.west + bounds.east) / 2;
    const centerLat = (bounds.south + bounds.north) / 2;
    
    return [centerLng, centerLat];
  }, []);

  // Focus map on all coordinates (driver, pickup, dropoff)
  const focusOnAllCoordinates = useCallback(() => {
    if (!mapRef.current || !mapReady) return;
    
    setIsFocusingOnAllCoordinates(true);
    
    const coordinates = [];
    
    // Add driver position if available
    if (driverPosition) {
      coordinates.push([driverPosition.longitude, driverPosition.latitude]);
    }
    
    // Add pickup location
    if (order?.pickUpAddress?.coordonne) {
      coordinates.push([
        order.pickUpAddress.coordonne.longitude,
        order.pickUpAddress.coordonne.latitude
      ]);
    }
    
    // Add dropoff location
    if (order?.dropOfAddress?.coordonne) {
      coordinates.push([
        order.dropOfAddress.coordonne.longitude,
        order.dropOfAddress.coordonne.latitude
      ]);
    }
    
    // If we have coordinates, fit them to the map
    if (coordinates.length > 0) {
      if (coordinates.length === 1) {
        // Single point - center on it with appropriate zoom
        cameraRef.current?.setCamera({
          centerCoordinate: coordinates[0],
          zoomLevel: streetViewMode ? STREET_STYLE_3D_CONFIG.zoom : 15,
          pitch: streetViewMode ? STREET_STYLE_3D_CONFIG.pitch : 0,
          animationDuration: 1500,
        });
      } else {
        // Multiple points - calculate bounds and set camera
        const bounds = MapPerformanceUtils.calculateBounds(coordinates, 0.2);
        if (bounds) {
          const centerCoordinate = calculateCenterFromBounds(bounds);
          const zoomLevel = calculateOptimalZoom(bounds);
          
          cameraRef.current?.setCamera({
            centerCoordinate,
            zoomLevel: streetViewMode ? Math.min(zoomLevel, STREET_STYLE_3D_CONFIG.zoom) : zoomLevel,
            pitch: streetViewMode ? STREET_STYLE_3D_CONFIG.pitch : 0,
            animationDuration: 1500,
          });
        }
      }
    }
    
    // Reset the focusing state after animation
    setTimeout(() => {
      setIsFocusingOnAllCoordinates(false);
    }, 1600);
  }, [mapReady, driverPosition, order, streetViewMode, calculateCenterFromBounds, calculateOptimalZoom]);

 
  // Calculate route progress based on driver position
  const calculateRouteProgress = useCallback((routeCoords, driverPos) => {
    if (!routeCoords || !routeCoords.geometry || !driverPos) return 0;
    
    const coordinates = routeCoords.geometry.coordinates;
    if (coordinates.length < 2) return 0;
    
    let totalDistance = 0;
    let traveledDistance = 0;
    let closestPointIndex = 0;
    let minDistance = Infinity;
    
    // Find the closest point on the route to the driver
    for (let i = 0; i < coordinates.length; i++) {
      const distance = getDistance(
        { latitude: driverPos.latitude, longitude: driverPos.longitude },
        { latitude: coordinates[i][1], longitude: coordinates[i][0] }
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPointIndex = i;
      }
    }
    
    // Calculate total route distance
    for (let i = 1; i < coordinates.length; i++) {
      totalDistance += getDistance(
        { latitude: coordinates[i-1][1], longitude: coordinates[i-1][0] },
        { latitude: coordinates[i][1], longitude: coordinates[i][0] }
      );
    }
    
    // Calculate traveled distance
    for (let i = 1; i <= closestPointIndex; i++) {
      traveledDistance += getDistance(
        { latitude: coordinates[i-1][1], longitude: coordinates[i-1][0] },
        { latitude: coordinates[i][1], longitude: coordinates[i][0] }
      );
    }
    
    return totalDistance > 0 ? traveledDistance / totalDistance : 0;
  }, []);

  // Get route color based on status and mode
  const getRouteColor = useCallback((status, is3D = false) => {
    if (is3D) {
      return '#000000'; // Black for 3D mode
    }
    
    switch (status) {
      case 'Go_to_pickup':
        return '#FF9500'; // Orange for going to pickup
      case 'Picked_up':
      case 'On_route_to_delivery':
        return '#34C759'; // Green for delivery route
      case 'Arrived_at_pickup':
        return '#007AFF'; // Blue for arrived at pickup
      default:
        return '#007AFF'; // Default blue
    }
  }, []);

  // Get route width based on mode
  const getRouteWidth = useCallback((is3D = false) => {
    return is3D ? STREET_STYLE_3D_CONFIG.routeWidth : 6;
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>{t('tracking.loading')}</Text>
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
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('tracking.title')}
        </Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Enhanced 3D Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          styleURL={streetViewMode ? "mapbox://styles/mapbox/streets-v11" : "mapbox://styles/mapbox/streets-v11"}
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
          
          {/* Additional directional light for 3D effect */}
          {streetViewMode && (
            <Light style={{
              anchor: 'viewport',
              color: '#ffffff',
              intensity: STREET_STYLE_3D_CONFIG.directionalLightIntensity,
              position: [0, 45, 45]
            }} />
          )}
          
          {/* Enhanced Camera with 3D capabilities */}
          <Camera
            ref={cameraRef}
            zoomLevel={streetViewMode ? STREET_STYLE_3D_CONFIG.zoom : 15}
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
              {/* Route background/glow effect */}
              <LineLayer
                id="routeBackground"
                style={{
                  lineColor: '#ffffff',
                  lineWidth: getRouteWidth(streetViewMode) + 4,
                  lineOpacity: 0.3,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              
              {/* Main route line */}
              <LineLayer
                id="routeLine"
                style={{
                  lineColor: getRouteColor(order?.commandStatus, streetViewMode),
                  lineWidth: getRouteWidth(streetViewMode),
                  lineOpacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineGradient: streetViewMode ? [
                    'interpolate',
                    ['linear'],
                    ['line-progress'],
                    0, '#000000',
                    0.5, '#333333',
                    1, '#000000'
                  ] : [
                    'interpolate',
                    ['linear'],
                    ['line-progress'],
                    0, getRouteColor(order?.commandStatus, false),
                    0.5, '#0056CC',
                    1, getRouteColor(order?.commandStatus, false)
                  ]
                }}
              />
              
              {/* Route shadow for 3D effect */}
              {streetViewMode && (
                <LineLayer
                  id="routeShadow"
                  style={{
                    lineColor: 'rgba(0, 0, 0, 0.3)',
                    lineWidth: getRouteWidth(streetViewMode) + 2,
                    lineOpacity: 0.5,
                    lineCap: 'round',
                    lineJoin: 'round',
                    lineTranslate: [2, 2]
                  }}
                />
              )}
              
              {/* Route direction arrows */}
              <SymbolLayer
                id="routeArrows"
                style={{
                  symbolPlacement: 'line',
                  symbolSpacing: 200,
                  symbolAvoidEdges: true,
                  iconImage: 'arrow-icon',
                  iconSize: streetViewMode ? 0.8 : 1,
                  iconAllowOverlap: false,
                  iconIgnorePlacement: false,
                  iconRotationAlignment: 'map',
                  iconTextFit: 'both',
                  iconTextFitPadding: [2, 2, 2, 2],
                  textField: '▶',
                  textSize: 12,
                  textColor: streetViewMode ? '#ffffff' : getRouteColor(order?.commandStatus, false),
                  textHaloColor: streetViewMode ? '#000000' : '#ffffff',
                  textHaloWidth: 1,
                }}
              />
            </ShapeSource>
          )}

          {/* Route progress indicator */}
          {routeCoordinates && routeCoordinates.geometry && driverPosition && (
            <ShapeSource
              id="routeProgressSource"
              shape={{
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: routeCoordinates.geometry.coordinates.slice(
                    0, 
                    Math.floor(routeCoordinates.geometry.coordinates.length * calculateRouteProgress(routeCoordinates, driverPosition))
                  )
                },
                properties: {
                  progress: calculateRouteProgress(routeCoordinates, driverPosition)
                }
              }}
            >
           
            </ShapeSource>
          )}

          {/* Enhanced Driver Marker */}
          {driverPosition && (
            <PointAnnotation
              key="driverMarker"
              id="driverMarker"
              ref={driverMarkerRef}
              coordinate={[driverPosition.longitude, driverPosition.latitude]}
            >
              <DriverMarker
                angle={driverPosition.angle || 0}
                type={driverPosition.type || 1}
                isMoving={driverIsMoving}
                is3D={streetViewMode}
                onLoad={() => {
                  driverMarkerRef.current.refresh();
               
                }}
              />
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
            {streetViewMode && (
              <View style={styles.controlButtonIndicator}>
                <Text style={styles.controlButtonIndicatorText}>{t('tracking.three_d')}</Text>
              </View>
            )}
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
            {isFollowingDriver && (
              <View style={styles.controlButtonIndicator}>
                <Text style={styles.controlButtonIndicatorText}>{t('tracking.follow')}</Text>
              </View>
            )}
          </TouchableOpacity>
         
          
          <TouchableOpacity style={styles.controlButton} onPress={focusOnAllCoordinates}>
            <MaterialCommunityIcons name="map-marker-multiple" size={24} color="#666666" />
          </TouchableOpacity>
        </View>
      </View>
 
    

      {/* Enhanced Status Indicator */}
      <View style={styles.statusIndicator}>
        <View style={[
          styles.statusDot,
          driverIsMoving ? styles.statusMoving : styles.statusStopped
        ]} />
        <Text style={styles.statusText}>
          {driverIsMoving ? t('tracking.driver_moving') : t('tracking.driver_stopped')}
        </Text>
        {streetViewMode && (
          <View style={styles.status3DIndicator}>
            <MaterialCommunityIcons name="rotate-3d-variant" size={12} color="#000000" />
            <Text style={styles.status3DText}>{t('tracking.three_d')}</Text>
          </View>
        )}
        {isFocusingOnAllCoordinates && (
          <View style={styles.statusFocusIndicator}>
            <MaterialCommunityIcons name="map-marker-multiple" size={12} color="#007AFF" />
            <Text style={styles.statusFocusText}>{t('tracking.focusing')}</Text>
          </View>
        )}
        {order?.commandStatus && (
          <View style={[
            styles.statusOrderIndicator,
            { backgroundColor: getOrderStatusInfo(order.commandStatus).color + '20' }
          ]}>
            <View style={[
              styles.statusOrderDot,
              { backgroundColor: getOrderStatusInfo(order.commandStatus).color }
            ]} />
            <Text style={[
              styles.statusOrderText,
              { color: getOrderStatusInfo(order.commandStatus).color }
            ]}>
              {getOrderStatusInfo(order.commandStatus).text}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};



export default TrackingScreen;

