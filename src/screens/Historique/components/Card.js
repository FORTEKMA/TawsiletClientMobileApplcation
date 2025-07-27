import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from "react-native";
import { colors } from "../../../utils/colors";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const Card = ({ order, refresh, index }) => {
  const { t } = useTranslation();
  const scaleValue = new Animated.Value(1);
  const navigation = useNavigation();

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'pending': '#FFA500',
      'dispatched_to_partner': '#007AFF',
      'assigned_to_driver': '#007AFF',
      'driver_on_route_to_pickup': '#007AFF',
      'arrived_at_pickup': '#FF9500',
      'picked_up': '#34C759',
      'on_route_to_delivery': '#34C759',
      'arrived_at_delivery': '#FF9500',
      'delivered': '#34C759',
      'completed': '#34C759',
      'canceled_by_client': '#FF3B30',
      'canceled_by_partner': '#FF3B30',
      'failed_pickup': '#FF3B30',
      'failed_delivery': '#FF3B30',
      'go_to_pickup': '#FF9500',
    };
    return statusColors[status.toLowerCase()] || '#8E8E93';
  };

  const getStatusIcon = (status) => {
    const statusIcons = {
      'pending': 'clock-outline',
      'dispatched_to_partner': 'send-outline',
      'assigned_to_driver': 'person-outline',
      'driver_on_route_to_pickup': 'car-outline',
      'arrived_at_pickup': 'location-outline',
      'picked_up': 'checkmark-outline',
      'on_route_to_delivery': 'car-outline',
      'arrived_at_delivery': 'location-outline',
      'delivered': 'checkmark-done-outline',
      'completed': 'checkmark-circle-outline',
      'canceled_by_client': 'close-circle-outline',
      'canceled_by_partner': 'close-circle-outline',
      'failed_pickup': 'alert-circle-outline',
      'failed_delivery': 'alert-circle-outline',
      'go_to_pickup': 'navigate-outline',
    };
    return statusIcons[status.toLowerCase()] || 'help-circle-outline';
  };

  const getStatusTranslation = (status) => {
    return t(`history.status.${status.toLowerCase()}`, status.replace(/_/g, ' '));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return t('common.today');
    } else if (diffDays === 2) {
      return t('common.yesterday');
    } else if (diffDays <= 7) {
      return `${diffDays - 1} ${t('common.days_ago')}`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatPrice = (price) => {
    return `${price?.toFixed(2) || '0.00'} TND`;
  };

  const isActiveOrder = () => {
    const activeStatuses = ['pending', 'dispatched_to_partner', 'assigned_to_driver', 'driver_on_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'on_route_to_delivery', 'arrived_at_delivery', 'go_to_pickup'];
    return activeStatuses.includes(order.commandStatus.toLowerCase());
  };

  const handleCardPress = () => {
    if (isActiveOrder()) {
      navigation.navigate("TrackingScreen", { id: order.documentId });
    } else {
      navigation.navigate("OrderDetails", { id: order.documentId, refresh });
    }
  };

  return (
    <Animated.View 
      style={[
        styles.cardContainer, 
        { 
          transform: [{ scale: scaleValue }],
          marginTop: index === 0 ? 8 : 4,
        }
      ]}
    >
      <TouchableOpacity
        style={[styles.card, isActiveOrder() && styles.activeCard]}
        onPress={handleCardPress}
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Active Order Indicator */}
        {isActiveOrder() && (
          <View style={styles.activeIndicator}>
            <View style={styles.pulseIndicator} />
            <Text style={styles.activeText}>{t('history.active_ride')}</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.orderInfo}>
            <View style={styles.orderIconContainer}>
              <MaterialCommunityIcons name="receipt" size={20} color="#000000" />
            </View>
            <View>
              <Text style={styles.orderNumber}>#{order.refNumber || order.id}</Text>
              <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.commandStatus) }]}>
            <Ionicons 
              name={getStatusIcon(order.commandStatus)} 
              size={14} 
              color="#FFFFFF" 
            />
            <Text style={styles.statusText} numberOfLines={1}>
              {getStatusTranslation(order.commandStatus)}
            </Text>
          </View>
        </View>

        {/* Route Information */}
        <View style={styles.routeContainer}>
          {/* Pickup */}
          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <View style={styles.pickupDot} />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>{t('history.pickup')}</Text>
              <Text style={styles.locationAddress} numberOfLines={1}>
                {order?.pickUpAddress?.Address?.replace(/"/g, '') || t('history.address_not_available')}
              </Text>
            </View>
          </View>

          {/* Route Line */}
          <View style={styles.routeLine} />

          {/* Dropoff */}
          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <View style={styles.dropoffDot} />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>{t('history.dropoff')}</Text>
              <Text style={styles.locationAddress} numberOfLines={1}>
                {order?.dropOfAddress?.Address?.replace(/"/g, '') || t('history.address_not_available')}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            {order?.driver?.firstName && (
              <View style={styles.driverInfo}>
                <MaterialCommunityIcons name="account" size={16} color="#666666" />
                <Text style={styles.driverName}>
                  {order.driver.firstName} {order.driver.lastName}
                </Text>
              </View>
            )}
            
            {/* <View style={styles.paymentInfo}>
              <MaterialCommunityIcons 
                name={order.payType === 'cash' ? 'cash' : 'credit-card'} 
                size={16} 
                color="#666666" 
              />
              <Text style={styles.paymentMethod}>
                {t(`payment.${order.payType || 'cash'}`)}
              </Text>
            </View> */}
          </View>
          
          <View style={styles.footerRight}>
            <Text style={styles.price}>
              {formatPrice(order.totalPrice)}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#CCCCCC" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  activeCard: {
    borderColor: '#000000',
    borderWidth: 2,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  pulseIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
    marginRight: 6,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  orderInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  orderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: '#000000',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#666666',
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    maxWidth: 120,
  },
  statusText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 4,
  },
  routeContainer: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
  },
  dropoffDot: {
    width: 10,
    height: 10,
    backgroundColor: '#666666',
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 18,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#E0E0E0',
    marginLeft: 11,
    marginVertical: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  footerLeft: {
    flex: 1,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  driverName: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 6,
  },
  paymentInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentMethod: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 6,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: '#000000',
    marginRight: 8,
  },
});

