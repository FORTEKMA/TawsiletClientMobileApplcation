import React, { useEffect } from 'react';
import { ScrollView, SafeAreaView, View, Text, TouchableOpacity, I18nManager } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
    <View style={styles.uberEmptyContainer}>
      <View style={styles.uberEmptyIconContainer}>
        <Icon name="bell-off-outline" size={64} color="#8E8E93" />
      </View>
      <Text style={styles.uberEmptyTitle}>
        {t('notifications.empty.title', 'No notifications yet')}
      </Text>
      <Text style={styles.uberEmptyDescription}>
        {t('notifications.empty.description', 'When you have notifications, they\'ll appear here')}
      </Text>
      <TouchableOpacity style={styles.uberEmptyButton} activeOpacity={0.7}>
        <Icon name="refresh" size={20} color="#007AFF" />
        <Text style={styles.uberEmptyButtonText}>
          {t('notifications.refresh', 'Refresh')}
        </Text>
      </TouchableOpacity>
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
  const displayNotifications = notifications;

  // Group notifications by date
  const groupedNotifications = displayNotifications?.reduce((acc, notification) => {
    const date = new Date(notification.createdAt).toDateString();
    acc[date] = acc[date] || [];
    acc[date].push(notification);
    return acc;
  }, {});

  const handleMarkAllRead = () => {
    // TODO: Implement mark all as read functionality
  };

  const handleSettings = () => {
    // TODO: Navigate to notification settings
  };

  return (
    <SafeAreaView style={styles.uberContainer}>
      <View style={styles.uberMainContainer}>
        {/* Modern Header */}
        <View style={styles.uberHeader}>
          <TouchableOpacity 
            style={styles.uberHeaderButton}
            onPress={() => navigation.openDrawer()}
            activeOpacity={0.7}
          >
            <Icon name="menu" size={24} color="#000" />
          </TouchableOpacity>
          
          <View style={styles.uberHeaderContent}>
            <Text style={styles.uberHeaderTitle}>{t('notifications.title')}</Text>
            <Text style={styles.uberHeaderSubtitle}>
              {displayNotifications?.length > 0 
                ? t('notifications.count', `${displayNotifications.length} notifications`)
                : t('notifications.no_new', 'No new notifications')
              }
            </Text>
          </View>
          
          {displayNotifications?.length > 0 && (
            <TouchableOpacity 
              style={styles.uberHeaderButton}
              onPress={handleSettings}
              activeOpacity={0.7}
            >
              <Icon name="cog-outline" size={24} color="#000" />
            </TouchableOpacity>
          )}
          
          {!displayNotifications?.length && <View style={styles.uberHeaderSpacer} />}
        </View>

        {displayNotifications?.length > 0 ? (
          <>
            {/* Action Bar */}
            <View style={styles.uberActionBar}>
              <TouchableOpacity 
                style={styles.uberActionButton}
                onPress={handleMarkAllRead}
                activeOpacity={0.7}
              >
                <Icon name="check-all" size={20} color="#007AFF" />
                <Text style={styles.uberActionButtonText}>
                  {t('notifications.mark_all_read', 'Mark all as read')}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.uberScrollView}
              contentContainerStyle={styles.uberScrollContainer}
              showsVerticalScrollIndicator={false}
            >
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
              
              {/* Bottom Spacing */}
              <View style={styles.uberBottomSpacing} />
            </ScrollView>
          </>
        ) : (
          <EmptyState />
        )}
      </View>
    </SafeAreaView>
  );
};

export default Notifications; 