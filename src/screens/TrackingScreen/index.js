import React, { useEffect, useState, useRef } from "react";
import {
  View,
  ActivityIndicator,
  Linking,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  AppState,
  StatusBar,
  SafeAreaView,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { colors } from "../../utils/colors";
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ref as dbRef, onValue, remove } from 'firebase/database';
import db from '../../utils/firebase';
import api from '../../utils/api';
import { CommonActions } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Mapbox, { MapView, Camera, PointAnnotation, ShapeSource, LineLayer } from '@rnmapbox/maps';
import { 
  trackScreenView, 
  trackRideStarted,
  trackRideCompleted,
  trackRideCancelled,
  trackDriverFound 
} from '../../utils/analytics';
import VoIPCallScreen from '../VoIPCallScreen';
import voipManager from '../../utils/VoIPManager';

// Initialize Mapbox
import '../../utils/mapboxConfig';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TrackingScreen = ({ route }) => {
  const { t } = useTranslation();
  const { id } = route.params;
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const [appState, setAppState] = useState(AppState.currentState);
  
  // Map state
  const mapRef = useRef(null);
  const cameraRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [followUserLocation, setFollowUserLocation] = useState(true);
  
  // VoIP and Chat state
  const [showCall, setShowCall] = useState(false);
  const [currentCallId, setCurrentCallId] = useState(null);
  const [callType, setCallType] = useState('outgoing');
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Track screen view on mount
  useEffect(() => {
    trackScreenView('TrackingScreen', { order_id: id });
  }, []);

  // Animate screen entrance
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
    ]).start();

    // Start pulse animation for driver marker
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
  }, []);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await api.get(`commands/${id}?populate[0]=driver&populate[1]=pickUpAddress&populate[2]=dropOfAddress&populate[3]=pickUpAddress.coordonne&populate[4]=dropOfAddress.coordonne&populate[5]=driver.profilePicture&populate[6]=review&populate[7]=driver.vehicule`);
      const orderData = response.data.data;
      setOrder(orderData);
      
      // Set initial locations
      if (orderData?.pickUpAddress?.coordonne) {
        setUserLocation([
          parseFloat(orderData.pickUpAddress.coordonne.longitude),
          parseFloat(orderData.pickUpAddress.coordonne.latitude)
        ]);
      }
      
      // Track driver found if order has a driver
      if (orderData?.driver?.id) {
        trackDriverFound(orderData.driver.id, { order_id: id });
      }
    } catch (error) {
      console.log('Error fetching order:', error);
      Alert.alert('Error', 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  // Listen for driver location updates
  useEffect(() => {
    if (!order?.requestId) return;

    const driverLocationRef = dbRef(db, `rideRequests/${order.requestId}/driverLocation`);
    const unsubscribe = onValue(driverLocationRef, (snapshot) => {
      const location = snapshot.val();
      if (location && location.latitude && location.longitude) {
        setDriverLocation([location.longitude, location.latitude]);
        
        // Update route if we have both pickup and driver locations
        if (userLocation) {
          fetchRoute([location.longitude, location.latitude], userLocation);
        }
      }
    });

    return () => unsubscribe();
  }, [order?.requestId, userLocation]);

  // Fetch route between two points
  const fetchRoute = async (start, end) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=sk.eyJ1IjoidGF3c2lsZXQiLCJhIjoiY21hYml4ank0MjZmMTJrc2F4OHRmZjJnNyJ9.AmrvJY-LAdU1rigLoxR6mw`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        setRouteCoordinates(data.routes[0].geometry.coordinates);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  // Center map on both user and driver locations
  const centerMapOnLocations = () => {
    if (!mapLoaded || !cameraRef.current) return;

    const locations = [];
    if (userLocation) locations.push(userLocation);
    if (driverLocation) locations.push(driverLocation);

    if (locations.length === 0) return;

    if (locations.length === 1) {
      cameraRef.current.setCamera({
        centerCoordinate: locations[0],
        zoomLevel: 15,
        animationDuration: 1000,
      });
    } else {
      // Calculate bounds for multiple locations
      const lngs = locations.map(loc => loc[0]);
      const lats = locations.map(loc => loc[1]);
      
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);

      cameraRef.current.fitBounds(
        [minLng, minLat],
        [maxLng, maxLat],
        [50, 50, 50, 200], // padding: top, right, bottom, left
        1000 // animation duration
      );
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchOrder();
    }
  }, [isFocused, id]);

  useEffect(() => {
    if (!order?.requestId) return;

    // Only set up listener if current status is not in the excluded list
    const excludedStatuses = ["Canceled_by_partner", "Completed", "Canceled_by_client"];
    if (excludedStatuses.includes(order.commandStatus)) {
      return;
    }

    const orderStatusRef = dbRef(db, `rideRequests/${order.requestId}/commandStatus`);
    onValue(orderStatusRef, async (snapshot) => {
      const status = snapshot.val();
      fetchOrder();

      if(["Canceled_by_partner", "Completed"].includes(status)){
        if (status === "Canceled_by_partner") {
          trackRideCancelled('canceled_by_partner', { order_id: id });
          remove(dbRef(db, `rideRequests/${order.requestId}`));
          Alert.alert(
            t('common.order_canceled_title'),
            t('common.order_canceled_message'),
            [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
          );
          return;
        }

        if (status === "Completed") {
          trackRideCompleted(id, { 
            driver_id: order?.driver?.id,
            request_id: order.requestId 
          });
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [
                {
                  name: 'Rating',
                  params: { order },
                },
              ],
            })
          );
        }
        remove(dbRef(db, `rideRequests/${order.requestId}`));
      }
    });

    return () => {
      // Cleanup handled by onValue
    };
  }, [order?.requestId, order?.commandStatus]);

  // Driver info
  const driver = order?.driver || {};
  const driverName = `${driver.firstName || ''} ${driver.lastName || ''}`.trim();
  const driverAvatar = driver?.profilePicture?.url || 'https://randomuser.me/api/portraits/men/1.jpg';
  const carModel = driver?.vehicule?.mark || 'Toyota Camry';
  const carPlate = driver?.vehicule?.matriculation || 'DEF 456';
  const driverRating = driver.rating || '5.0';

  // VoIP and Chat handlers
  const handleChatPress = () => {
    navigation.navigate('ChatScreen', {
      requestId: order?.requestId,
      driverData: {
        id: driver?.id,
        name: driverName,
        avatar: driverAvatar,
        vehicle_info: `${carModel} • ${carPlate}`,
        rating: driverRating,
      },
    });
  };

  const handleCallPress = async () => {
    try {
      const { callId } = await voipManager.initiateCall(
        driver?.id,
        'driver',
        order?.requestId,
        {
          name: driverName,
          avatar: driverAvatar,
          vehicle_info: `${carModel} • ${carPlate}`,
        }
      );
      
      setCurrentCallId(callId);
      setCallType('outgoing');
      setShowCall(true);
    } catch (error) {
      console.error('Error initiating call:', error);
      // Fallback to phone call
      if (driver?.phoneNumber) {
        Linking.openURL(`tel:${driver.phoneNumber}`);
      } else {
        Alert.alert("Error", "Driver's phone number is not available");
      }
    }
  };

  const handleEndCall = async () => {
    if (currentCallId) {
      await voipManager.endCall(currentCallId);
      setShowCall(false);
      setCurrentCallId(null);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'Pending': '#FFA500',
      'Assigned_to_driver': '#007AFF',
      'Driver_on_route_to_pickup': '#007AFF',
      'Arrived_at_pickup': '#FF9500',
      'Picked_up': '#34C759',
      'On_route_to_delivery': '#34C759',
      'Arrived_at_delivery': '#FF9500',
      'Completed': '#34C759',
      'Canceled_by_client': '#FF3B30',
      'Canceled_by_partner': '#FF3B30',
    };
    return statusColors[status] || '#666';
  };

  const getStatusText = (status) => {
    return t(`tracking.status.${status.toLowerCase()}`, status.replace(/_/g, ' '));
  };

  const getStatusIcon = (status) => {
    const statusIcons = {
      'Pending': 'clock-outline',
      'Assigned_to_driver': 'account-check',
      'Driver_on_route_to_pickup': 'car',
      'Arrived_at_pickup': 'map-marker-check',
      'Picked_up': 'account-arrow-up',
      'On_route_to_delivery': 'car-arrow-right',
      'Arrived_at_delivery': 'map-marker-star',
      'Completed': 'check-circle',
      'Canceled_by_client': 'close-circle',
      'Canceled_by_partner': 'close-circle',
    };
    return statusIcons[status] || 'information';
  };

  // Route GeoJSON
  const routeGeoJSON = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: routeCoordinates,
    },
  };

  if (loading || !order) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LinearGradient
          colors={[colors.primary, '#0066CC']}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>{t('tracking.loading', 'Loading tracking information...')}</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Enhanced Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, '#0066CC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Animated.View style={[styles.headerContent, { opacity: fadeAnim }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{t('tracking.title', 'Live Tracking')}</Text>
            <View style={styles.statusContainer}>
              <MaterialCommunityIcons 
                name={getStatusIcon(order.commandStatus)} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.statusText}>{getStatusText(order.commandStatus)}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.centerButton}
            onPress={centerMapOnLocations}
          >
            <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>

      {/* Enhanced Mapbox Map */}
      <Animated.View style={[styles.mapContainer, { transform: [{ translateY: slideAnim }] }]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          styleURL="mapbox://styles/mapbox/streets-v12"
          onDidFinishLoadingMap={() => setMapLoaded(true)}
          compassEnabled={true}
          compassViewPosition={3}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <Camera
            ref={cameraRef}
            zoomLevel={14}
            centerCoordinate={userLocation || [0, 0]}
            animationMode="flyTo"
            animationDuration={1000}
          />

          {/* Route Line */}
          {routeCoordinates.length > 0 && (
            <ShapeSource id="routeSource" shape={routeGeoJSON}>
              <LineLayer
                id="routeLine"
                style={{
                  lineColor: colors.primary,
                  lineWidth: 4,
                  lineOpacity: 0.8,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </ShapeSource>
          )}

          {/* User Location Marker */}
          {userLocation && (
            <PointAnnotation
              id="userLocation"
              coordinate={userLocation}
            >
              <View style={styles.userMarker}>
                <View style={styles.userMarkerInner}>
                  <MaterialCommunityIcons name="account" size={16} color="#fff" />
                </View>
              </View>
            </PointAnnotation>
          )}

          {/* Driver Location Marker */}
          {driverLocation && (
            <PointAnnotation
              id="driverLocation"
              coordinate={driverLocation}
            >
              <Animated.View style={[styles.driverMarker, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.driverMarkerInner}>
                  <MaterialCommunityIcons name="car" size={20} color="#fff" />
                </View>
                <View style={styles.driverMarkerPulse} />
              </Animated.View>
            </PointAnnotation>
          )}

          {/* Destination Marker */}
          {order?.dropOfAddress?.coordonne && (
            <PointAnnotation
              id="destination"
              coordinate={[
                parseFloat(order.dropOfAddress.coordonne.longitude),
                parseFloat(order.dropOfAddress.coordonne.latitude)
              ]}
            >
              <View style={styles.destinationMarker}>
                <MaterialCommunityIcons name="map-marker" size={24} color="#FF3B30" />
              </View>
            </PointAnnotation>
          )}
        </MapView>
      </Animated.View>

      {/* Enhanced Floating Action Buttons */}
      {driverName && (
        <Animated.View style={[styles.floatingButtons, { opacity: fadeAnim }]}>
          <TouchableOpacity 
            style={styles.chatButton}
            onPress={handleChatPress}
          >
            <MaterialCommunityIcons name="message-text" size={24} color="#fff" />
            {unreadMessages > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.callButton}
            onPress={handleCallPress}
          >
            <Ionicons name="call" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Enhanced Driver Info Card */}
      {driverName && (
        <Animated.View style={[styles.driverCard, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['#fff', '#f8f9fa']}
            style={styles.driverCardGradient}
          >
            <View style={styles.driverInfo}>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{driverName}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FFB800" />
                  <Text style={styles.rating}>{driverRating}</Text>
                  <Text style={styles.ratingLabel}>• {t('tracking.driver_rating', 'Driver')}</Text>
                </View>
              </View>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleText}>{carModel}</Text>
                <View style={styles.plateContainer}>
                  <Text style={styles.plateText}>{carPlate}</Text>
                </View>
              </View>
            </View>
            
            {/* ETA and Distance Info */}
            <View style={styles.tripInfo}>
              <View style={styles.tripInfoItem}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.primary} />
                <Text style={styles.tripInfoText}>
                  {t('tracking.eta', 'ETA')}: 5-10 {t('tracking.minutes', 'min')}
                </Text>
              </View>
              <View style={styles.tripInfoItem}>
                <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.primary} />
                <Text style={styles.tripInfoText}>
                  {t('tracking.distance', 'Distance')}: 2.3 km
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* VoIP Call Screen */}
      <VoIPCallScreen
        visible={showCall}
        onClose={() => {
          setShowCall(false);
          setCurrentCallId(null);
        }}
        driverData={{
          id: driver?.id,
          name: driverName,
          avatar: driverAvatar,
          vehicle_info: `${carModel} • ${carPlate}`,
          rating: driverRating,
        }}
        callType={callType}
        onEndCall={handleEndCall}
      />
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
    backgroundColor: '#fff',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 6,
  },
  centerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  userMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  userMarkerInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarker: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarkerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 2,
  },
  driverMarkerPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    opacity: 0.3,
    zIndex: 1,
  },
  destinationMarker: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButtons: {
    position: 'absolute',
    right: 16,
    bottom: 180,
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
    position: 'relative',
  },
  callButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  driverCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  driverCardGradient: {
    borderRadius: 20,
    padding: 20,
  },
  driverInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  ratingLabel: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  vehicleInfo: {
    alignItems: 'flex-end',
  },
  vehicleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  plateContainer: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  plateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  tripInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tripInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tripInfoText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});

export default TrackingScreen;

