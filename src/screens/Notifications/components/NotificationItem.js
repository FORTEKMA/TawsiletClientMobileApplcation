import React from 'react';
import { Image, Text, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../styles';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'processing':
      return 'hourglass-empty';
    case 'completed':
      return 'check-circle-outline';
    case 'created':
      return 'add-circle-outline';
    case 'arrived':
      return 'location-on';
    case 'updated':
      return 'update';
    case 'canceled':
      return 'cancel';
    case 'dispatched':
      return 'send';
    case 'expired':
      return 'timer-off';
    case 'accepted':
      return 'thumb-up-alt';
    case 'delivered':
      return 'local-shipping';
    case 'picked-up':
      return 'shopping-bag';
    case 'maintenance':
      return 'build';
    case 'help':
      return 'help-outline';
    case 'confirmed':
      return 'verified';
    case 'payment':
      return 'payment';
    case 'failed-payment':
      return 'money-off';
    case 'tracking':
      return 'track-changes';
    default:
      return 'notifications';
  }
};

const NotificationItem = ({ notification }) => {
  const navigation = useNavigation();

  return (
    <Pressable
      onPress={() => {
        // Example navigation, adjust based on actual app navigation structure
        // if (notification?.command?.documentId) {
        //   navigation.navigate('OrderStack', {
        //     id: notification?.command?.documentId,
        //   });
        // }
      }}
      style={styles.notificationContainer}
    >
      <View style={styles.notificationImage}>
        <MaterialIcons 
          name={getNotificationIcon(notification?.notification_type)} 
          size={24} 
          color="#fff" // White icon color for better contrast on colored background
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>
          {notification?.title}
        </Text>
        <Text style={styles.notificationDescription}>
          {notification?.description?.replace(/\s+/g, ' ')}
        </Text>
      </View>
    </Pressable>
  );
};

export default NotificationItem;


