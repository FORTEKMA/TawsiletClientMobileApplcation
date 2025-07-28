import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
  Animated,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { colors } from '../../utils/colors';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Mapbox, { MapView, Camera, PointAnnotation, ShapeSource, LineLayer } from '@rnmapbox/maps';
import { ref as dbRef, onValue, off } from 'firebase/database';
import db from '../../utils/firebase';
import api from '../../utils/api';
import '../../utils/mapboxConfig';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TrackingScreen = ({ route }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const orderId = route.params.id;

  // Map state
  const mapRef = useRef(null);
  const cameraRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // UI/Animation state
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Data state
  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0); // Placeholder, implement as needed

  // Extract driver information
  const driverName = driver?.firstName && driver?.lastName ? `${driver.firstName} ${driver.lastName}` : t('tracking.driver', 'Driver');
  const driverAvatar = driver?.profilePicture?.url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face';
  const driverRating = driver?.rating || '4.8';
  const carModel = driver?.vehicule?.mark || t('tracking.vehicle', 'Vehicle');
  const carPlate = driver?.vehicule?.matriculation || 'ABC-123';

  // Animation effects
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

  // Fetch order data
  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`commands/${orderId}?populate[0]=driver&populate[1]=pickUpAddress&populate[2]=dropOfAddress&populate[3]=pickUpAddress.coordonne&populate[4]=dropOfAddress.coordonne&populate[5]=driver.profilePicture&populate[6]=review&populate[7]=driver.vehicule`);
      if (response?.data?.data) {
        setOrder(response.data.data);
        setDriver(response.data.data.driver);
        // Set initial user location (pickup)
        const pickup = response.data.data.pickUpAddress?.coordonne;
        if (pickup) {
          setUserLocation([
            parseFloat(pickup.longitude),
            parseFloat(pickup.latitude)
          ]);
        }
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

  // Fetch order on mount/focus
  useEffect(() => {
    if (isFocused) {
      fetchOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, orderId]);

  // Listen for driver location updates from Firebase
  useEffect(() => {
    if (!order?.driver?.documentId) return;
    const driverRef = dbRef(db, `drivers/${order.driver.documentId}`);
    const handleUpdate = (snapshot) => {
      const data = snapshot.val();
      if (data?.latitude && data?.longitude) {
        setDriverLocation([
          parseFloat(data.longitude),
          parseFloat(data.latitude)
        ]);
        // Optionally, update route
        if (userLocation) {
          fetchRoute([
            parseFloat(data.longitude),
            parseFloat(data.latitude)
          ], userLocation);
        }
      }
    };
    onValue(driverRef, handleUpdate);
    return () => off(driverRef, handleUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.driver?.documentId, userLocation]);

  // Fetch route between two points using Mapbox Directions API
  const fetchRoute = async (start, end) => {
    try {
      const accessToken = process.env.MAPBOX_ACCESS_TOKEN || 'sk.eyJ1IjoidGF3c2lsZXQiLCJhIjoiY21hYml4ank0MjZmMTJrc2F4OHRmZjJnNyJ9.AmrvJY-LAdU1rigLoxR6mw';
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${accessToken}`
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
      const lngs = locations.map(loc => loc[0]);
      const lats = locations.map(loc => loc[1]);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      cameraRef.current.fitBounds(
        [minLng, minLat],
        [maxLng, maxLat],
        [50, 50, 50, 200],
        1000
      );
    }
  };

  // UI helpers
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
  const getStatusIcon = (status) => {
    const statusIcons = {
      'Pending': 'clock-outline',
      'Go_to_pickup': 'car',
      'Arrived_at_pickup': 'map-marker-check',
      'Picked_up': 'account-arrow-up',
      'Completed': 'check-circle',
      'Canceled_by_client': 'close-circle',
      'Canceled_by_partner': 'close-circle',
    };
    return statusIcons[status] || 'information';
  };

  // Route GeoJSON for Mapbox
  const routeGeoJSON = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: routeCoordinates,
    },
  };

  // Chat and Call handlers (implement as needed)
  const handleChatPress = () => {
    navigation.navigate('ChatScreen', {
      driverId: driver?.id,
      orderId: orderId,
    });
  };
  const handleCallPress = () => {
    Alert.alert(
      t('call.select_call_type', 'Select Call Type'),
      t('call.choose_call_type', 'Choose how you want to call the driver'),
      [
        {
          text: t('call.voice_call', 'Voice Call'),
          onPress: () => {}, // Implement call logic
        },
        {
          text: t('call.video_call', 'Video Call'),
          onPress: () => {}, // Implement call logic
        },
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel',
        },
      ]
    );
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
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      {/* Header */}
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
      {/* Mapbox Map */}
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
      {/* Floating Action Buttons */}
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
      {/* Driver Info Card */}
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
            {/* ETA and Distance Info (placeholder) */}
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
    justifyContent: 'center',
    alignItems: 'center',
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

