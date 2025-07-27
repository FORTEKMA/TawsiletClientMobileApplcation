import React, { useEffect } from 'react';
import { ScrollView, SafeAreaView, View, Text, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { getNotification } from '../../store/notificationSlice/notificationSlice';
import { colors } from '../../utils/colors';
import { styles } from './styles';
import NotificationGroup from './components/NotificationGroup';
import { 
  trackScreenView, 
  trackNotificationReceived 
} from '../../utils/analytics';

// Fake data for testing
 

const EmptyState = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyContainer}>
      <MaterialIcons 
        name="notifications-off" 
        size={80} 
        color={colors.textSecondary}
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyTitle}>{t('notifications.empty.title')}</Text>
      <Text style={styles.emptyDescription}>
        {t('notifications.empty.description')}
      </Text>
    </View>
  );
};

const Notifications = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const currentId = useSelector((state) => state?.user?.currentUser?.documentId);
  const notifications = useSelector((state) => state?.notifications?.notifications);
  const dispatch = useDispatch();

  // Track screen view on mount
  useEffect(() => {
    trackScreenView('Notifications');
  }, []);

  useEffect(() => {
    if (currentId) {
      dispatch(getNotification({ id: currentId }));
    }
  }, []);
 
  // Track notifications received
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      notifications.forEach(notification => {
        trackNotificationReceived(notification.type, {
          notification_id: notification.id,
          created_at: notification.createdAt
        });
      });
    }
  }, [notifications]);

  // Use fake data for testing
  const displayNotifications =notifications;

  // Group notifications by date
  const groupedNotifications = displayNotifications?.reduce((acc, notification) => {
    const date = new Date(notification.createdAt).toDateString();
    acc[date] = acc[date] || [];
    acc[date].push(notification);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.drawerToggleButton}
          onPress={() => navigation.openDrawer()}
        >
          <Ionicons name="menu" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        </View>
        
        <View style={styles.headerSpacer} />
      </View>
      {displayNotifications?.length !== 0 ? (
        <ScrollView style={styles.container}>
          {groupedNotifications &&
            Object.entries(groupedNotifications).map(([date, notifications]) => (
              <NotificationGroup
                key={date}
                date={date}
                notifications={notifications.map(notification => ({
                  ...notification,
                  title: notification.title
                }))}
              />
            ))}
                    <View style={{height:100}}/>
        </ScrollView>
      ) : (
        <EmptyState />
      )}
    </SafeAreaView>
  );
};

export default Notifications; 