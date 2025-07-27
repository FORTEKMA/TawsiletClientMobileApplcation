import React, { useEffect } from 'react';
import { ScrollView, SafeAreaView, View, Text, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { getNotification } from '../../store/notificationSlice/notificationSlice';
import { colors } from '../../utils/colors';
import { styles } from './styles';
import NotificationGroup from './components/NotificationGroup';
import { 
  trackScreenView, 
  trackNotificationReceived 
} from '../../utils/analytics';

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
  const currentId = useSelector((state) => state?.user?.currentUser?.documentId);
  const notifications = useSelector((state) => state?.notifications?.notifications);
  const isLoading = useSelector((state) => state?.notifications?.loading);
  const dispatch = useDispatch();

  // Track screen view on mount
  useEffect(() => {
    trackScreenView('Notifications');
  }, []);

  useEffect(() => {
    if (currentId) {
      dispatch(getNotification({ id: currentId }));
    }
  }, [currentId, dispatch]);
 
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

  const displayNotifications = notifications;

  // Group notifications by date
  const groupedNotifications = displayNotifications?.reduce((acc, notification) => {
    const date = new Date(notification.createdAt).toDateString();
    acc[date] = acc[date] || [];
    acc[date].push(notification);
    return acc;
  }, {});

  const onRefresh = () => {
    if (currentId) {
      dispatch(getNotification({ id: currentId }));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
      </View>
      {displayNotifications?.length !== 0 ? (
        <ScrollView 
          style={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {groupedNotifications &&
            Object.entries(groupedNotifications)
              .sort(([a], [b]) => new Date(b) - new Date(a)) // Sort by date descending
              .map(([date, notifications]) => (
                <NotificationGroup
                  key={date}
                  date={date}
                  notifications={notifications.map(notification => ({
                    ...notification,
                    title: notification.title
                  }))}
                />
              ))}
          <View style={{height: 100}} />
        </ScrollView>
      ) : (
        <EmptyState />
      )}
    </SafeAreaView>
  );
};

export default Notifications;

