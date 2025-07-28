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
  Animated,
  Image,
} from 'react-native';
 import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { API_GOOGLE } from '@env';
import api from '../../utils/api';
import { colors } from '../../utils/colors';
import { ref as dbRef, onValue, off } from 'firebase/database';
import db from '../../utils/firebase';
import DriverMarker from '../../components/DriverMarker';
 
 
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
  
  // Map refs
  const mapRef = useRef(null);
 
 
  // Extract driver information
  const driverName = driver?.firstName + ' ' + driver?.lastName || t('tracking.driver', 'Driver');
  const driverAvatar = driver?.profilePicture?.url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face';
  const driverRating = driver?.rating || '4.8';
  const carModel = driver?.vehicule?.mark || t('tracking.vehicle', 'Vehicle');
  const carPlate = driver?.vehicule?.matriculation || 'ABC-123';

  useEffect(() => {
  
      fetchOrder();
   
  }, [ orderId]);

  // Listen to driver location updates from Firebase
  useEffect(() => {
    if (driver?.documentId) {
      const driverRef = dbRef(db, `drivers/${driver.documentId}`);
      const unsubscribe = onValue(driverRef, snapshot => {
        const data = snapshot.val();
        if (data?.latitude && data?.longitude) {
          setDriverPosition({
            latitude: data.latitude,
            longitude: data.longitude,
            type: data.type,
            angle: data.angle,
          });
        }
      });
      return () => off(driverRef, unsubscribe);
    }
  }, [driver?.documentId]);

 

  const fetchOrder = async () => {
    try {
      setLoading(true);
     
      const response = await api.get(`commands/${orderId}?populate[0]=driver&populate[1]=pickUpAddress&populate[2]=dropOfAddress&populate[3]=pickUpAddress.coordonne&populate[4]=dropOfAddress.coordonne&populate[5]=driver.profilePicture&populate[6]=review&populate[7]=driver.vehicule`);
      
      if (response?.data?.data!=undefined) {
        setOrder(response.data.data); 
        setDriver(response.data.data.driver);
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

  const handleChatPress = () => {
    navigation.navigate('ChatScreen', {
      driverId: driver?.id,
      orderId: orderId,
    });
  };

  const handleCallPress = async () => {
    try {
      // Show call type selection
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
    // try {
    //   const callId = await voipManager.initiateCall(driver?.id, type);
    //   setCurrentCallId(callId);
    //   setCallType(type);
      
    //   // Navigate to VoIP call screen
    //   navigation.navigate('VoIPCallScreen', {
    //     callType: type,
    //     driverData: {
    //       id: driver?.id,
    //       name: driverName,
    //       avatar: driverAvatar,
    //       vehicle_info: `${carModel} • ${carPlate}`,
    //       rating: driverRating,
    //     },
    //     orderId: orderId,
    //     isIncoming: false,
    //     callId: callId
    //   });
    // } catch (error) {
    //   console.error('Call initiation failed:', error);
    //   Alert.alert(
    //     t('common.error', 'Error'),
    //     t('call.initiation_failed', 'Failed to start call. Please try again.')
    //   );
    // }
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

  // Helper to get route origin and destination based on status
  const getRoutePoints = () => {
    const status = order?.commandStatus || order?.commandStatus;
    const pickup = order?.pickUpAddress?.coordonne;
    const dropoff = order?.dropOfAddress?.coordonne;
    if (!pickup || !dropoff) return { origin: null, destination: null };
    if (driverPosition && (status === 'Pending' || status === 'Go_to_pickup')) {
      return { origin: driverPosition, destination: pickup };
    }
    if (driverPosition && (status === 'Arrived_at_pickup' || status === 'Picked_up')) {
      return { origin: driverPosition, destination: dropoff };
    }
    return { origin: pickup, destination: dropoff };
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
      
      {/* Header */}
      <View style={styles.header}>
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
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order?.commandStatus) }]}>
            <Text style={styles.statusText}>
              {getStatusText(order?.commandStatus)}
            </Text>
          </View>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: order?.pickUpAddress?.latitude || 36.8065,
            longitude: order?.pickUpAddress?.longitude || 10.1815,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {/* Driver Marker (Realtime) */}
          {driverPosition && (
            <Marker
              identifier="driver"
              coordinate={driverPosition}
            >
              <View style={{ width: 50, height: 50 }}>
                <DriverMarker angle={driverPosition.angle} type={driverPosition.type} />
              </View>
            </Marker>
          )}

          {/* Pickup Location Marker */}
          {order?.pickUpAddress && (
            <Marker
              coordinate={{
                latitude: order?.pickUpAddress?.coordonne?.latitude,
                longitude: order?.pickUpAddress?.coordonne?.longitude,
              }}
              title={t('tracking.pickup_location', 'Pickup Location')}
              pinColor="#4CAF50"
            >
              <View style={customMarkerStyles.pickupCircle} />
            </Marker>
          )}

          {/* Dropoff Location Marker */}
          {order?.dropOfAddress && (
            <Marker
              coordinate={{
                latitude: order?.dropOfAddress?.coordonne?.latitude,
                longitude: order?.dropOfAddress?.coordonne?.longitude,
              }}
              title={t('tracking.dropoff_location', 'Dropoff Location')}
              pinColor="#2196F3"
            >
              <View style={customMarkerStyles.dropoffSquare} />
            </Marker>
          )}

          {/* Route Directions */}
          {(() => {
            const { origin, destination } = getRoutePoints();
            if (origin && destination) {
              return (
                <MapViewDirections
                  origin={origin}
                  destination={destination}
                  apikey={API_GOOGLE}
                  strokeWidth={3}
                  strokeColor="#4CAF50"
                />
              );
            }
            return null;
          })()}
        </MapView>
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.floatingButtons}>
        {/* Chat Button */}
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleChatPress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="chat" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Call Button */}
        <TouchableOpacity
          style={styles.callButton}
          onPress={handleCallPress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="phone" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Driver Info Card */}
      {driver && (
        <Animated.View style={styles.driverCard}>
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
  mapContainer: {
    flex: 1,
  },
  floatingButtons: {
    position: 'absolute',
    right: 16,
    bottom: 120,
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
    backgroundColor: colors.primary,
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
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
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

// Add custom marker styles
const customMarkerStyles = {
  pickupCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropoffSquare: {
    width: 20,
    height: 20,
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export default TrackingScreen;

