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
  SymbolLayer 
} from '@rnmapbox/maps';
import { TRACKING_MAP_STYLE, MAP_PERFORMANCE_SETTINGS } from '../../utils/mapboxConfig';
import { API_GOOGLE } from '@env';
import api from '../../utils/api';
import { colors } from '../../utils/colors';
import { ref as dbRef, onValue, off } from 'firebase/database';
import db from '../../utils/firebase';
import DriverMarker from '../../components/DriverMarker';
import { RouteOptimizer, DriverMovementTracker, MapPerformanceUtils, NavigationRouteManager } from '../../utils/mapUtils';
import { getDistance } from 'geolib';

const { width, height } = Dimensions.get('window');

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

// Fallback function to generate simple route
const generateSimpleRoute = (origin, destination) => {
  const [originLat, originLng] = origin.split(',').map(Number);
  const [destLat, destLng] = destination.split(',').map(Number);
  
  // Generate intermediate points for a more realistic route
  const numPoints = 10;
  const coordinates = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const ratio = i / numPoints;
    const lat = originLat + (destLat - originLat) * ratio;
    const lng = originLng + (destLng - originLng) * ratio;
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
  const [navigationMode, setNavigationMode] = useState(false);
  const [routeInstructions, setRouteInstructions] = useState([]);
  const [currentRouteStep, setCurrentRouteStep] = useState(0);
  const [nextTurnInstruction, setNextTurnInstruction] = useState(null);
  const [routeUpdateKey, setRouteUpdateKey] = useState(0);
  
  // Map refs
  const mapRef = useRef(null);
  const cameraRef = useRef(null);
  const markerRef = useRef(null);
  const routeUpdateTimeoutRef = useRef(null);
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Initialize utilities
  const routeOptimizer = useRef(new RouteOptimizer()).current;
  const driverTracker = useRef(new DriverMovementTracker()).current;
  const navigationManager = useRef(new NavigationRouteManager()).current;
  
  // Throttled camera update
  const throttledCameraUpdate = useRef(
    MapPerformanceUtils.throttle((coordinate, zoom = 15) => {
      if (cameraRef.current && mapReady) {
        cameraRef.current.setCamera({
          centerCoordinate: coordinate,
          zoomLevel: zoom,
          animationDuration: 1000,
        });
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

  // Regenerate route when order status changes
  useEffect(() => {
    if (order && driverPosition) {
      generateRouteBasedOnStatus(order, driverPosition).catch(console.error);
    }
  }, [order?.commandStatus, driverPosition, navigationMode]);

  // Listen to driver location updates from Firebase
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
            angle: data.angle,
          };
          
          // Track driver movement
          const trackedPosition = driverTracker.addPosition(
            data.latitude,
            data.longitude,
            Date.now()
          );
          
          setDriverIsMoving(trackedPosition.isMoving);
          setDriverPosition(newPosition);
          
          // Update estimated arrival
          updateEstimatedArrival(newPosition);
          
          // Update turn-by-turn instructions
          updateTurnInstructions(newPosition);
          
          // Regenerate route based on new driver position (debounced)
          if (order) {
            // Clear previous timeout
            if (routeUpdateTimeoutRef.current) {
              clearTimeout(routeUpdateTimeoutRef.current);
            }
            
            // Set new timeout for route update
            routeUpdateTimeoutRef.current = setTimeout(() => {
              generateRouteBasedOnStatus(order, newPosition).catch(console.error);
            }, 1000); // Wait 1 second before updating route
          }
          
          // Focus on driver if following is enabled
          if (isFollowingDriver && mapReady) {
            throttledCameraUpdate([newPosition.longitude, newPosition.latitude]);
          }
        }
      });
      return () => off(driverRef, unsubscribe);
    }
  }, [driver?.documentId, isFollowingDriver, mapReady, order]);

  // Animate UI elements on mount
  useEffect(() => {
    if (!loading && !error) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, error]);

  const updateEstimatedArrival = useCallback((driverPos) => {
    if (!order?.pickUpAddress?.coordonne) return;
    
    const pickup = order.pickUpAddress.coordonne;
    const distance = getDistance(
      { latitude: driverPos.latitude, longitude: driverPos.longitude },
      { latitude: pickup.latitude, longitude: pickup.longitude }
    );
    
    // Estimate time based on distance and average speed (30 km/h)
    const estimatedTimeMinutes = Math.round(distance / 500); // 500 meters per minute
    setEstimatedArrival(estimatedTimeMinutes);
  }, [order]);

  const updateTurnInstructions = useCallback((driverPos) => {
    if (navigationMode && navigationManager.routeSteps.length > 0) {
      const nextInstruction = navigationManager.getNextTurnInstruction(driverPos);
      setNextTurnInstruction(nextInstruction);
    }
  }, [navigationMode]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
     
      const response = await api.get(`commands/${orderId}?populate[0]=driver&populate[1]=pickUpAddress&populate[2]=dropOfAddress&populate[3]=pickUpAddress.coordonne&populate[4]=dropOfAddress.coordonne&populate[5]=driver.profilePicture&populate[6]=review&populate[7]=driver.vehicule`);
      
      if (response?.data?.data!=undefined) {
        setOrder(response.data.data); 
        setDriver(response.data.data.driver);
        
        // Generate route based on status
        generateRouteBasedOnStatus(response.data.data, driverPosition).catch(console.error);
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

  const generateOptimizedRoute = (orderData) => {
    const pickup = orderData?.pickUpAddress?.coordonne;
    const dropoff = orderData?.dropOfAddress?.coordonne;
    
    if (pickup && dropoff) {
      const pickupCoord = [pickup.longitude, pickup.latitude];
      const dropoffCoord = [dropoff.longitude, dropoff.latitude];
      
      // Generate optimized route with intermediate points
      const optimizedRoute = routeOptimizer.calculateOptimalRoute(
        pickupCoord,
        dropoffCoord
      );
      
      setRouteCoordinates(optimizedRoute);
    }
  };

  const generateRouteBasedOnStatus = async (orderData, driverPos) => {
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
        // Route from driver position to pickup
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
        // Route from driver position to dropoff
        if (driverPos) {
          origin = `${driverPos.latitude},${driverPos.longitude}`;
          destination = `${dropoff.latitude},${dropoff.longitude}`;
        } else {
          origin = `${pickup.latitude},${pickup.longitude}`;
          destination = `${dropoff.latitude},${dropoff.longitude}`;
        }
        break;
        
      default:
        // Simple path between pickup and dropoff for other statuses
        origin = `${pickup.latitude},${pickup.longitude}`;
        destination = `${dropoff.latitude},${dropoff.longitude}`;
        break;
    }
    
    try {
      // Use Google Directions API to get actual route
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${API_GOOGLE}`
      );
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const points = route.overview_polyline.points;
        
        // Decode the polyline to get coordinates
        routeCoordinates = decodePolyline(points);
        
        // Calculate distance and duration
        const distance = route.legs[0].distance.value; // meters
        const duration = route.legs[0].duration.value; // seconds
        
        setRouteDistance(distance);
        
        // Generate turn-by-turn instructions
        const steps = route.legs[0].steps.map(step => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
          distance: step.distance.text,
          duration: step.duration.text,
          maneuver: step.maneuver?.instruction || step.html_instructions.replace(/<[^>]*>/g, '')
        }));
        
        setRouteInstructions(steps);
      } else {
        // Fallback to simple straight line if API fails
        routeCoordinates = generateSimpleRoute(origin, destination);
      }
    } catch (error) {
      console.error('Failed to fetch route:', error);
      // Fallback to simple straight line
      routeCoordinates = generateSimpleRoute(origin, destination);
    }
    
    // Convert to GeoJSON LineString format for Mapbox
    const routeShape = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: routeCoordinates
      },
      properties: {}
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
    // VoIP call implementation would go here
    console.log('Initiating call:', type);
  };

  const toggleFollowDriver = () => {
    setIsFollowingDriver(!isFollowingDriver);
    if (!isFollowingDriver && driverPosition && cameraRef.current) {
      throttledCameraUpdate([driverPosition.longitude, driverPosition.latitude]);
    }
  };

  const focusOnDriver = () => {
    if (driverPosition && cameraRef.current) {
      throttledCameraUpdate([driverPosition.longitude, driverPosition.latitude]);
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
          paddingTop: 50,
          paddingBottom: 50,
        });
      }
    }
  };

  const toggleNavigationMode = () => {
    setNavigationMode(!navigationMode);
    if (!navigationMode && cameraRef.current) {
      // Enable 3D navigation view
      cameraRef.current.setCamera({
        pitch: 45,
        heading: 0,
        animationDuration: 1000,
      });
      // Regenerate route with navigation mode
      if (order && driverPosition) {
        generateRouteBasedOnStatus(order, driverPosition);
      }
    } else if (navigationMode && cameraRef.current) {
      // Return to 2D view
      cameraRef.current.setCamera({
        pitch: 0,
        heading: 0,
        animationDuration: 1000,
      });
      // Regenerate route without navigation mode
      if (order && driverPosition) {
        generateRouteBasedOnStatus(order, driverPosition);
      }
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'Pending': '#FF9800',
      'Go_to_pickup': '#2196F3',
      'Arrived_at_pickup': '#4CAF50',
      'Picked_up': '#4CAF50',
      'Completed': '#4CAF50',
      'Canceled_by_client': '#F44336',
      'Canceled_by_partner': '#F44336',
    };
    return statusColors[status] || '#666';
  };

  const getStatusText = (status) => {
    const statusTexts = {
      'Pending': t('tracking.status.pending', 'Pending'),
      'Go_to_pickup': t('tracking.status.go_to_pickup', 'Go to Pickup'),
      'Arrived_at_pickup': t('tracking.status.arrived_at_pickup', 'Arrived at Pickup'),
      'Picked_up': t('tracking.status.picked_up', 'Picked Up'),
      'Completed': t('tracking.status.completed', 'Completed'),
      'Canceled_by_client': t('tracking.status.canceled_by_client', 'Canceled by Client'),
      'Canceled_by_partner': t('tracking.status.canceled_by_partner', 'Canceled by Partner'),
    };
    return statusTexts[status] || status;
  };

  const getRouteColor = (status) => {
    const routeColors = {
      'Pending': '#FF9800', // Orange for pending
      'Go_to_pickup': '#2196F3', // Blue for going to pickup
      'Arrived_at_pickup': '#4CAF50', // Green for arrived at pickup
      'Picked_up': '#4CAF50', // Green for picked up
      'Completed': '#4CAF50', // Green for completed
      'Canceled_by_client': '#F44336', // Red for canceled
      'Canceled_by_partner': '#F44336', // Red for canceled
    };
    return routeColors[status] || colors.primary;
  };

  const getRouteDashArray = (status) => {
    const dashPatterns = {
      'Pending': [2, 2], // Dashed for pending
      'Go_to_pickup': [0], // Solid for active routes
      'Arrived_at_pickup': [0], // Solid for active routes
      'Picked_up': [0], // Solid for active routes
      'Completed': [4, 2], // Different dashed for completed
      'Canceled_by_client': [1, 1], // Dotted for canceled
      'Canceled_by_partner': [1, 1], // Dotted for canceled
    };
    return dashPatterns[status] || [0];
  };

  const getRouteTypeText = (status) => {
    const routeTypeTexts = {
      'Pending': t('tracking.route.pending', 'Pending Route'),
      'Go_to_pickup': t('tracking.route.to_pickup', 'To Pickup'),
      'Arrived_at_pickup': t('tracking.route.to_dropoff', 'To Dropoff'),
      'Picked_up': t('tracking.route.to_dropoff', 'To Dropoff'),
      'Completed': t('tracking.route.completed', 'Completed'),
      'Canceled_by_client': t('tracking.route.canceled', 'Canceled'),
      'Canceled_by_partner': t('tracking.route.canceled', 'Canceled'),
    };
    return routeTypeTexts[status] || t('tracking.route.default', 'Route');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {t('tracking.loading', 'Loading tracking information...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#F44336" />
          <Text style={styles.loadingText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrder}>
            <Text style={styles.retryButtonText}>
              {t('common.retry', 'Retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
   return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
     
      <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {t('tracking.title', 'Track Order')}
          </Text>
          <View style={styles.headerStatusRow}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order?.commandStatus) }]}>
              <Text style={styles.statusText}>
                {getStatusText(order?.commandStatus)}
              </Text>
            </View>
           
          </View>
        </View>
      </Animated.View> 

    
      <View style={styles.mapContainer}>
       <MapView
          ref={mapRef}
          style={styles.map}
          styleURL={navigationMode ? 'mapbox://styles/mapbox/navigation-night-v1' : 'mapbox://styles/mapbox/streets-v11'}
          onMapReady={() => setMapReady(true)}
          {...MAP_PERFORMANCE_SETTINGS}
          pitchEnabled={navigationMode}
          rotateEnabled={navigationMode}
        >
            <Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [
                order?.pickUpAddress?.coordonne?.longitude || 10.1815,
                order?.pickUpAddress?.coordonne?.latitude || 36.8065,
              ],
              zoomLevel: navigationMode ? 16 : 14,
              minZoomLevel: 10,
              maxZoomLevel: 18,
              pitch: navigationMode ? 45 : 0,
              heading: 0,
            }}
          />  

       {routeCoordinates && routeCoordinates.geometry && (
            <ShapeSource 
              key={`route-${order?.commandStatus}-${navigationMode ? '3d' : '2d'}-${routeUpdateKey}`}
              id={`routeSource-${order?.commandStatus}-${navigationMode ? '3d' : '2d'}`} 
              shape={routeCoordinates}
            >
              {/* Route glow effect for 3D mode */}
              {navigationMode && (
                <LineLayer
                  id={`routeGlow-${order?.commandStatus}-3d`}
                  style={{
                    lineColor: getRouteColor(order?.commandStatus),
                    lineWidth: 12,
                    lineCap: 'round',
                    lineJoin: 'round',
                    lineOpacity: 0.3,
                    lineBlur: 4,
                  }}
                />
              )}
              <LineLayer
                id={`routeLine-${order?.commandStatus}-${navigationMode ? '3d' : '2d'}`}
                style={{
                  lineColor: getRouteColor(order?.commandStatus),
                  lineWidth: navigationMode ? 6 : 3,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineDasharray: getRouteDashArray(order?.commandStatus),
                  lineOpacity: 0.8,
                }}
              />
              {/* Route direction arrows */}
              <SymbolLayer
                id={`routeArrows-${order?.commandStatus}-${navigationMode ? '3d' : '2d'}`}
                style={{
                  symbolPlacement: 'line',
                  symbolSpacing: navigationMode ? 100 : 200,
                  iconImage: 'arrow',
                  iconSize: navigationMode ? 1.2 : 0.8,
                  iconAllowOverlap: true,
                  iconIgnorePlacement: true,
                  iconRotationAlignment: 'map',
                }}
              />
            </ShapeSource>
          )}  

       
        {order?.pickUpAddress?.coordonne && (
            <PointAnnotation
              id="pickup"
              coordinate={[
                order.pickUpAddress.coordonne.longitude,
                order.pickUpAddress.coordonne.latitude,
              ]}
            >
              <View style={[styles.pickupMarker, navigationMode && styles.pickupMarker3D]}>
                <MaterialCommunityIcons name="map-marker" size={navigationMode ? 32 : 24} color="#4CAF50" />
              </View>
              <Mapbox.Callout title={t('tracking.pickup_location', 'Pickup Location')} />
            </PointAnnotation>
          )}  

           
        {order?.dropOfAddress?.coordonne && (
            <PointAnnotation
              id="dropoff"
              coordinate={[
                order.dropOfAddress.coordonne.longitude,
                order.dropOfAddress.coordonne.latitude,
              ]}
            >
              <View style={[styles.dropoffMarker, navigationMode && styles.dropoffMarker3D]}>
                <MaterialCommunityIcons name="map-marker" size={navigationMode ? 32 : 24} color="#2196F3" />
              </View>
              <Mapbox.Callout title={t('tracking.dropoff_location', 'Dropoff Location')} />
            </PointAnnotation>
          )}   

         
         {driverPosition && (
            <PointAnnotation
              id="driver"
            ref={markerRef}
              coordinate={[driverPosition.longitude, driverPosition.latitude]}
            >
              <DriverMarker 
                  angle={driverPosition.angle} 
                  type={driverPosition.type} 
                  onLoad={() => {
                    console.log('Marker loaded');
                    markerRef.current.refresh()
                  }}
                  isMoving={driverIsMoving}
                  is3D={navigationMode}
                />  
           
            </PointAnnotation>
          )}  
                </MapView> 

        
      <View style={styles.mapControls}>
        <TouchableOpacity
            style={[styles.mapControlButton, isFollowingDriver && styles.activeMapControlButton]}
            onPress={toggleFollowDriver}
          >
            <MaterialCommunityIcons 
              name={isFollowingDriver ? "crosshairs-gps" : "crosshairs"} 
              size={20} 
              color={isFollowingDriver ? "#fff" : "#333"} 
            />
          </TouchableOpacity> 
          
                    <TouchableOpacity
            style={styles.mapControlButton}
            onPress={focusOnDriver}
          >
            <MaterialCommunityIcons name="account" size={20} color="#333" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={focusOnRoute}
          >
            <MaterialCommunityIcons name="map-marker-path" size={20} color="#333" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mapControlButton, navigationMode && styles.activeMapControlButton]}
            onPress={toggleNavigationMode}
          >
            <MaterialCommunityIcons 
              name={navigationMode ? "cube" : "cube-outline"} 
              size={20} 
              color={navigationMode ? "#fff" : "#333"} 
            />
          </TouchableOpacity>
        </View>  

        {/* Turn-by-turn instruction overlay for 3D mode */}
        {navigationMode && nextTurnInstruction && (
          <Animated.View style={[styles.turnInstructionOverlay, { opacity: fadeAnim }]}>
            <View style={styles.turnInstructionContainer}>
              <MaterialCommunityIcons name="navigation" size={24} color="#fff" />
              <Text style={styles.turnInstructionText}>{nextTurnInstruction}</Text>
            </View>
          </Animated.View>
        )}
      </View>

     
  <Animated.View style={[styles.floatingButtons, { opacity: fadeAnim }]}>
        
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleChatPress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="chat" size={24} color="#fff" />
        </TouchableOpacity>

     
        <TouchableOpacity
          style={styles.callButton}
          onPress={handleCallPress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="phone" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>  

   
     {driver && (
        <Animated.View style={[styles.driverCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.driverInfo}>
            <Image source={{ uri: driverAvatar }} style={styles.driverAvatar} />
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{driverName}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFB800" />
                <Text style={styles.rating}>{driverRating}</Text>
              </View>
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleText}>{carModel}</Text>
              <Text style={styles.plateText}>{carPlate}</Text>
            </View>
          </View>
          
        
          <View style={styles.driverStatus}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: driverPosition ? '#4CAF50' : '#FF9800' }]} />
              <Text style={[styles.statusText,{color:"#000"}]}>
                {driverPosition ? t('tracking.driver_online', 'Driver Online') : t('tracking.driver_offline', 'Driver Offline')}
              </Text>
            </View>
            
            {estimatedArrival && (
              <View style={styles.etaContainer}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                <Text style={styles.etaText}>
                  {t('tracking.eta', 'ETA')}: {estimatedArrival} {t('tracking.minutes', 'min')}
                </Text>
              </View>
            )}
            
            {routeDistance && (
              <View style={styles.distanceContainer}>
                <MaterialCommunityIcons name="map-marker-distance" size={16} color="#666" />
                <Text style={styles.distanceText}>
                  {t('tracking.distance', 'Distance')}: {Math.round(routeDistance / 1000 * 10) / 10} {t('tracking.km', 'km')}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )} 
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    zIndex: 1000,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  routeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 16,
    flexDirection: 'column',
    gap: 8,
  },
  mapControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  activeMapControlButton: {
    backgroundColor: colors.primary,
  },
  pickupMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pickupMarker3D: {
    width: 50,
    height: 50,
    borderRadius: 25,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  dropoffMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dropoffMarker3D: {
    width: 50,
    height: 50,
    borderRadius: 25,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  driverMarkerContainer: {
    width: 50,
    height: 50,
  },
  floatingButtons: {
    position: 'absolute',
    right: 16,
    bottom: 170,
    flexDirection: 'column',
    gap: 12,
  },
  chatButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  callButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  driverCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  driverInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  vehicleInfo: {
    alignItems: 'flex-end',
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  plateText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  driverStatus: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  distanceText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  turnInstructionOverlay: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  turnInstructionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  turnInstructionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

export default TrackingScreen;

