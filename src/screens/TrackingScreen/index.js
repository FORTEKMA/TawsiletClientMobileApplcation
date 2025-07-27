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
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { colors } from "../../utils/colors";
import OrderMapView from "../Order/components/MapView";
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ref as dbRef, onValue, remove } from 'firebase/database';
import db from '../../utils/firebase';
import api from '../../utils/api';
import { CommonActions } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { 
  trackScreenView, 
  trackRideStarted,
  trackRideCompleted,
  trackRideCancelled,
  trackDriverFound 
} from '../../utils/analytics';
import VoIPCallScreen from '../VoIPCallScreen';
import voipManager from '../../utils/VoIPManager';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TrackingScreen = ({ route }) => {
  const { t } = useTranslation();
  const { id } = route.params;
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const [appState, setAppState] = useState(AppState.currentState);
  
  // VoIP and Chat state
  const [showCall, setShowCall] = useState(false);
  const [currentCallId, setCurrentCallId] = useState(null);
  const [callType, setCallType] = useState('outgoing');
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Track screen view on mount
  useEffect(() => {
    trackScreenView('TrackingScreen', { order_id: id });
  }, []);

  // Animate screen entrance
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await api.get(`commands/${id}?populate[0]=driver&populate[1]=pickUpAddress&populate[2]=dropOfAddress&populate[3]=pickUpAddress.coordonne&populate[4]=dropOfAddress.coordonne&populate[5]=driver.profilePicture&populate[6]=review&populate[7]=driver.vehicule`);
      const orderData = response.data.data;
      setOrder(orderData);
      
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

  if (loading || !order) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('tracking.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('tracking.title')}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.commandStatus) }]}>
            <Text style={styles.statusText}>{getStatusText(order.commandStatus)}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Map View */}
      <Animated.View style={[styles.mapContainer, { transform: [{ translateY: slideAnim }] }]}>
        <OrderMapView order={order} />
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
          <View style={styles.driverInfo}>
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
});

export default TrackingScreen;

