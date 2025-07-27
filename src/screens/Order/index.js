import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { colors } from "../../utils/colors";
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { 
  trackScreenView, 
  trackOrderDetailsViewed 
} from '../../utils/analytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Order = ({ route }) => {
  const { t } = useTranslation();
  const { id } = route.params;
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  // Track screen view on mount
  useEffect(() => {
    trackScreenView('OrderDetails', { order_id: id });
   // trackOrderDetailsViewed(id);
  }, []);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await api.get(`commands/${id}?populate[0]=driver&populate[1]=pickUpAddress&populate[2]=dropOfAddress&populate[3]=pickUpAddress.coordonne&populate[4]=dropOfAddress.coordonne&populate[5]=driver.profilePicture&populate[6]=review&populate[7]=driver.vehicule`);
      const orderData = response.data.data;
      setOrder(orderData);
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
    return t(`order.status.${status.toLowerCase()}`, status.replace(/_/g, ' '));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (price) => {
    return `${price?.toFixed(2) || '0.00'} TND`;
  };

  const handleTrackOrder = () => {
    navigation.navigate('TrackingScreen', { id });
  };

  const handleContactSupport = () => {
    Alert.alert(
      t('order.support_title'),
      t('order.support_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.call'), onPress: () => {} },
      ]
    );
  };

  if (loading || !order) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('order.loading')}</Text>
      </SafeAreaView>
    );
  }

  const driver = order?.driver || {};
  const driverName = `${driver.firstName || ''} ${driver.lastName || ''}`.trim();
  const driverAvatar = driver?.profilePicture?.url || 'https://randomuser.me/api/portraits/men/1.jpg';
  const carModel = driver?.vehicule?.mark || 'N/A';
  const carPlate = driver?.vehicule?.matriculation || 'N/A';
  const driverRating = driver.rating || '5.0';

  const canTrack = ["Canceled_by_client", "Canceled_by_partner", "Completed"].includes(order.commandStatus);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('order.title')}</Text>
          <Text style={styles.orderNumber}>#{order.id}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.supportButton}
          onPress={handleContactSupport}
        >
          <MaterialCommunityIcons name="headset" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(order.commandStatus) }]} />
            <Text style={styles.statusTitle}>{getStatusText(order.commandStatus)}</Text>
          </View>
          <Text style={styles.statusDescription}>
            {t(`order.status_description.${order.commandStatus.toLowerCase()}`, 'Order status updated')}
          </Text>
          <Text style={styles.statusTime}>
            {t('order.last_updated')}: {formatDate(order.updatedAt)}
          </Text>
        </View>

        {/* Track Order Button */}
        {canTrack && (
          <TouchableOpacity style={styles.trackButton} onPress={handleTrackOrder}>
            <MaterialCommunityIcons name="map-marker-path" size={24} color="#fff" />
            <Text style={styles.trackButtonText}>{t('order.track_order')}</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Driver Information */}
        {driverName && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('order.driver_info')}</Text>
            <View style={styles.driverContainer}>
              <Image source={{ uri: driverAvatar }} style={styles.driverAvatar} />
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{driverName}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FFB800" />
                  <Text style={styles.rating}>{driverRating}</Text>
                </View>
                <View style={styles.vehicleContainer}>
                  <MaterialCommunityIcons name="car" size={16} color="#666" />
                  <Text style={styles.vehicleText}>{carModel} • {carPlate}</Text>
                </View>
              </View>
            </View>
            
            {/* Chat and Call Actions */}
            {canTrack && (
              <View style={styles.driverActionsContainer}>
                <TouchableOpacity 
                  style={styles.chatButton}
                  onPress={() => navigation.navigate('ChatScreen', { 
                    requestId: order.id,
                    driverData: driver 
                  })}
                >
                  <MaterialCommunityIcons name="message-text" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>{t('order.chat')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={() => {
                    // Handle VoIP call or regular phone call
                    Alert.alert(
                      t('order.call_driver'),
                      t('order.call_driver_message'),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('order.voice_call'), onPress: () => {} },
                        { text: t('order.video_call'), onPress: () => {} },
                      ]
                    );
                  }}
                >
                  <MaterialCommunityIcons name="phone" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>{t('order.call')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Trip Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('order.trip_details')}</Text>
          
          {/* Pickup Location */}
          <View style={styles.locationContainer}>
            <View style={styles.locationIcon}>
              <View style={styles.pickupDot} />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>{t('order.pickup_location')}</Text>
              <Text style={styles.locationAddress}>
                {order.pickUpAddress?.address || t('order.address_not_available')}
              </Text>
              <Text style={styles.locationTime}>
                {formatDate(order.createdAt)}
              </Text>
            </View>
          </View>

          {/* Route Line */}
          <View style={styles.routeLine} />

          {/* Dropoff Location */}
          <View style={styles.locationContainer}>
            <View style={styles.locationIcon}>
              <View style={styles.dropoffDot} />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>{t('order.dropoff_location')}</Text>
              <Text style={styles.locationAddress}>
                {order.dropOfAddress?.address || t('order.address_not_available')}
              </Text>
              {order.commandStatus === 'Completed' && (
                <Text style={styles.locationTime}>
                  {formatDate(order.updatedAt)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('order.payment_details')}</Text>
          
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>{t('order.base_fare')}</Text>
            <Text style={styles.paymentValue}>{formatPrice(order.price)}</Text>
          </View>
          
          {order.additionalCharges > 0 && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>{t('order.additional_charges')}</Text>
              <Text style={styles.paymentValue}>{formatPrice(order.additionalCharges)}</Text>
            </View>
          )}
          
          <View style={styles.paymentDivider} />
          
          <View style={styles.paymentRow}>
            <Text style={styles.totalLabel}>{t('order.total_amount')}</Text>
            <Text style={styles.totalValue}>
              {formatPrice((order.price || 0) + (order.additionalCharges || 0))}
            </Text>
          </View>
          
          <View style={styles.paymentMethodContainer}>
            <MaterialCommunityIcons name="cash" size={20} color="#666" />
            <Text style={styles.paymentMethod}>{t('order.payment_method_cash')}</Text>
          </View>
        </View>

        {/* Order Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('order.order_info')}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('order.order_id')}</Text>
            <Text style={styles.infoValue}>#{order.id}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('order.order_date')}</Text>
            <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
          </View>
          
          {order.duration && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('order.estimated_duration')}</Text>
              <Text style={styles.infoValue}>{order.duration}</Text>
            </View>
          )}
          
          {order.distance && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('order.distance')}</Text>
              <Text style={styles.infoValue}>{order.distance} km</Text>
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
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
  },
  orderNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  supportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  statusTime: {
    fontSize: 12,
    color: '#999',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  trackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  driverContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  vehicleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  dropoffDot: {
    width: 12,
    height: 12,
    backgroundColor: '#FF3B30',
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#000',
    marginBottom: 4,
    lineHeight: 20,
  },
  locationTime: {
    fontSize: 12,
    color: '#999',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E5E5E5',
    marginLeft: 11,
    marginVertical: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  paymentDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  paymentMethod: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  bottomSpacing: {
    height: 32,
  },
  driverActionsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});

export default Order;

