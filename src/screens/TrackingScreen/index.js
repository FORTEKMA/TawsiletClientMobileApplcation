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
import Mapbox from '@rnmapbox/maps';
import { TRACKING_MAP_STYLE, MAP_PERFORMANCE_SETTINGS } from '../../utils/mapboxConfig';
import { API_GOOGLE } from '@env';
import api from '../../utils/api';
import { colors } from '../../utils/colors';
import { ref as dbRef, onValue, off } from 'firebase/database';
import db from '../../utils/firebase';
import DriverMarker from '../../components/DriverMarker';
import { RouteOptimizer, DriverMovementTracker, MapPerformanceUtils } from '../../utils/mapUtils';
import { getDistance } from 'geolib';

const { width, height } = Dimensions.get('window');

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
  
  // Map refs
  const mapRef = useRef(null);
  const cameraRef = useRef(null);
  const markerRef = useRef(null);
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Initialize utilities
  const routeOptimizer = useRef(new RouteOptimizer()).current;
  const driverTracker = useRef(new DriverMovementTracker()).current;
  
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

  // Regenerate route when order status changes
  useEffect(() => {
    if (order && driverPosition) {
      generateRouteBasedOnStatus(order, driverPosition);
    }
  }, [order?.commandStatus, driverPosition]);

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
          
          // Regenerate route based on new driver position
          if (order) {
            generateRouteBasedOnStatus(order, newPosition);
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

  const fetchOrder = async () => {
    try {
      setLoading(true);
     
      const response = await api.get(`commands/${orderId}?populate[0]=driver&populate[1]=pickUpAddress&populate[2]=dropOfAddress&populate[3]=pickUpAddress.coordonne&populate[4]=dropOfAddress.coordonne&populate[5]=driver.profilePicture&populate[6]=review&populate[7]=driver.vehicule`);
      
      if (response?.data?.data!=undefined) {
        setOrder(response.data.data); 
        setDriver(response.data.data.driver);
        
        // Generate route based on status
        generateRouteBasedOnStatus(response.data.data, driverPosition);
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

  const generateRouteBasedOnStatus = (orderData, driverPos) => {
    const pickup = orderData?.pickUpAddress?.coordonne;
    const dropoff = orderData?.dropOfAddress?.coordonne;
    const status = orderData?.commandStatus;
    
    if (!pickup || !dropoff) return;
    
    const pickupCoord = [pickup.longitude, pickup.latitude];
    const dropoffCoord = [dropoff.longitude, dropoff.latitude];
    
    let routeCoordinates = [];
    
    switch (status) {
      case 'Pending':
       case 'Go_to_pickup':
        // Route from driver position to pickup
        if (driverPos) {
          const driverCoord = [driverPos.longitude, driverPos.latitude];
          routeCoordinates = routeOptimizer.calculateOptimalRoute(
            driverCoord,
            pickupCoord
          );
        } else {
          // Fallback to simple pickup to dropoff route
          routeCoordinates = routeOptimizer.calculateOptimalRoute(
            pickupCoord,
            dropoffCoord
          );
        }
        break;
        
      case 'Arrived_at_pickup':
      case 'Picked_up':
        // Route from driver position to dropoff
        if (driverPos) {
          const driverCoord = [driverPos.longitude, driverPos.latitude];
          routeCoordinates = routeOptimizer.calculateOptimalRoute(
            driverCoord,
            dropoffCoord
          );
        } else {
          // Fallback to simple pickup to dropoff route
          routeCoordinates = routeOptimizer.calculateOptimalRoute(
            pickupCoord,
            dropoffCoord
          );
        }
        break;
        
      default:
        // Simple path between pickup and dropoff for other statuses
        routeCoordinates = routeOptimizer.calculateOptimalRoute(
          pickupCoord,
          dropoffCoord
        );
        break;
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
    
    // Calculate route distance
    let totalDistance = 0;
    for (let i = 1; i < routeCoordinates.length; i++) {
      const distance = getDistance(
        { latitude: routeCoordinates[i-1][1], longitude: routeCoordinates[i-1][0] },
        { latitude: routeCoordinates[i][1], longitude: routeCoordinates[i][0] }
      );
      totalDistance += distance;
    }
    setRouteDistance(totalDistance);
    
    setRouteCoordinates(routeShape);
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
            {routeCoordinates && (
              <View style={[styles.routeBadge, { backgroundColor: getRouteColor(order?.commandStatus) }]}>
                <MaterialCommunityIcons name="map-marker-path" size={12} color="#fff" />
                <Text style={styles.routeText}>
                  {getRouteTypeText(order?.commandStatus)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View> 

    
      <View style={styles.mapContainer}>
       <Mapbox.MapView
          ref={mapRef}
          style={styles.map}
       //  styleURL={TRACKING_MAP_STYLE}
     onMapReady={() => setMapReady(true)}
        {...MAP_PERFORMANCE_SETTINGS}
        >
            <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [
                order?.pickUpAddress?.coordonne?.longitude || 10.1815,
                order?.pickUpAddress?.coordonne?.latitude || 36.8065,
              ],
              zoomLevel: 14,
              minZoomLevel: 10,
              maxZoomLevel: 18,
            }}
          />  

       {routeCoordinates && routeCoordinates.geometry && (
            <Mapbox.ShapeSource id="routeSource" shape={routeCoordinates}>
              <Mapbox.LineLayer
                id="routeLine"
                style={{
                  lineColor: getRouteColor(order?.commandStatus),
                  lineWidth: 5,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineDasharray: getRouteDashArray(order?.commandStatus),
                }}
              />
              {/* Route direction arrows */}
              <Mapbox.SymbolLayer
                id="routeArrows"
                style={{
                  symbolPlacement: 'line',
                  symbolSpacing: 200,
                  iconImage: 'arrow',
                  iconSize: 0.8,
                  iconAllowOverlap: true,
                  iconIgnorePlacement: true,
                }}
              />
            </Mapbox.ShapeSource>
          )}  

       
        {order?.pickUpAddress?.coordonne && (
            <Mapbox.PointAnnotation
              id="pickup"
              coordinate={[
                order.pickUpAddress.coordonne.longitude,
                order.pickUpAddress.coordonne.latitude,
              ]}
            >
              <View style={styles.pickupMarker}>
                <MaterialCommunityIcons name="map-marker" size={24} color="#4CAF50" />
              </View>
              <Mapbox.Callout title={t('tracking.pickup_location', 'Pickup Location')} />
            </Mapbox.PointAnnotation>
          )}  

           
        {order?.dropOfAddress?.coordonne && (
            <Mapbox.PointAnnotation
              id="dropoff"
              coordinate={[
                order.dropOfAddress.coordonne.longitude,
                order.dropOfAddress.coordonne.latitude,
              ]}
            >
              <View style={styles.dropoffMarker}>
                <MaterialCommunityIcons name="map-marker" size={24} color="#2196F3" />
              </View>
              <Mapbox.Callout title={t('tracking.dropoff_location', 'Dropoff Location')} />
            </Mapbox.PointAnnotation>
          )}   

         
         {driverPosition && (
            <Mapbox.PointAnnotation
              id="driver"
            ref={markerRef}
              //icon={require('../../assets/eco.png')}s
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
                />  
           
            </Mapbox.PointAnnotation>
          )}  
       </Mapbox.MapView> 

        
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
        </View>  
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
});

export default TrackingScreen;

