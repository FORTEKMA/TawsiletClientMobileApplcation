import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles } from '../styles';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'processing':
      return { name: 'clock-outline', color: '#FF9500' };
    case 'completed':
      return { name: 'check-circle-outline', color: '#34C759' };
    case 'created':
      return { name: 'plus-circle-outline', color: '#007AFF' };
    case 'arrived':
      return { name: 'map-marker-check-outline', color: '#34C759' };
    case 'updated':
      return { name: 'update', color: '#007AFF' };
    case 'canceled':
      return { name: 'close-circle-outline', color: '#FF3B30' };
    case 'dispatched':
      return { name: 'truck-delivery-outline', color: '#FF9500' };
    case 'expired':
      return { name: 'clock-alert-outline', color: '#FF3B30' };
    case 'accepted':
      return { name: 'check-outline', color: '#34C759' };
    case 'delivered':
      return { name: 'package-variant-closed', color: '#34C759' };
    case 'picked-up':
      return { name: 'hand-back-left-outline', color: '#007AFF' };
    case 'maintenance':
      return { name: 'wrench-outline', color: '#FF9500' };
    case 'help':
      return { name: 'help-circle-outline', color: '#007AFF' };
    case 'confirmed':
      return { name: 'check-decagram-outline', color: '#34C759' };
    case 'payment':
      return { name: 'credit-card-outline', color: '#007AFF' };
    case 'failed-payment':
      return { name: 'credit-card-off-outline', color: '#FF3B30' };
    case 'tracking':
      return { name: 'map-marker-radius-outline', color: '#007AFF' };
    default:
      return { name: 'bell-outline', color: '#8E8E93' };
  }
};

const getTimeAgo = (createdAt) => {
  const now = new Date();
  const notificationTime = new Date(createdAt);
  const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

const NotificationItem = ({ notification, isLast }) => {
  const navigation = useNavigation();
  const iconData = getNotificationIcon(notification?.notification_type);
  const isUnread = !notification?.read; // Assuming there's a read property

  const handlePress = () => {
    // TODO: Mark as read and navigate
    // if (notification?.command?.documentId) {
    //   navigation.navigate('OrderStack', {
    //     id: notification.command.documentId,
    //   });
    // }
  };

  return (
    <TouchableOpacity
      style={[
        styles.uberNotificationItem,
        isUnread && styles.uberNotificationItemUnread,
        isLast && styles.uberNotificationItemLast
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Notification Icon */}
      <View style={[
        styles.uberNotificationIcon,
        { backgroundColor: `${iconData.color}15` }
      ]}>
        <Icon 
          name={iconData.name} 
          size={24} 
          color={iconData.color} 
        />
      </View>

      {/* Notification Content */}
      <View style={styles.uberNotificationContent}>
        <View style={styles.uberNotificationHeader}>
          <Text style={[
            styles.uberNotificationTitle,
            isUnread && styles.uberNotificationTitleUnread
          ]}>
            {notification?.title}
          </Text>
          <Text style={styles.uberNotificationTime}>
            {getTimeAgo(notification?.createdAt)}
          </Text>
        </View>
        
        <Text style={styles.uberNotificationDescription}>
          {notification?.description?.replace(/\s+/g, ' ')}
        </Text>

        {/* Action Buttons for certain notification types */}
        {(notification?.notification_type === 'created' || 
          notification?.notification_type === 'processing') && (
          <View style={styles.uberNotificationActions}>
            <TouchableOpacity 
              style={styles.uberNotificationActionButton}
              activeOpacity={0.7}
            >
              <Text style={styles.uberNotificationActionText}>
                View Details
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Unread Indicator */}
      {isUnread && <View style={styles.uberUnreadIndicator} />}
    </TouchableOpacity>
  );
};

export default NotificationItem; 