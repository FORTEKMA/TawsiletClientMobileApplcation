import React, { useEffect, useState } from 'react';
import { 
  ScrollView, 
  SafeAreaView, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  StyleSheet
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { getNotification } from '../../store/notificationSlice/notificationSlice';
import { colors } from '../../utils/colors';
import { 
  trackScreenView, 
  trackNotificationReceived 
} from '../../utils/analytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Loading placeholder component
const LoadingPlaceholder = () => (
  <View style={styles.loadingPlaceholder}>
    <View style={styles.loadingCard}>
      <View style={styles.loadingHeader}>
        <View style={styles.loadingIcon} />
        <View style={styles.loadingTextContainer}>
          <View style={styles.loadingTitle} />
          <View style={styles.loadingSubtitle} />
        </View>
      </View>
      <View style={styles.loadingContent}>
        <View style={styles.loadingLine} />
        <View style={[styles.loadingLine, { width: '70%' }]} />
      </View>
    </View>
  </View>
);

// Simple notification item component
const NotificationItem = ({ notification, index }) => {
  const { t } = useTranslation();
  
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ride_completed':
        return 'check-circle';
      case 'ride_cancelled':
        return 'close-circle';
      case 'driver_assigned':
        return 'account-check';
      case 'payment':
        return 'credit-card';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'ride_completed':
        return '#34C759';
      case 'ride_cancelled':
        return '#FF3B30';
      case 'driver_assigned':
        return colors.primary;
      case 'payment':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return t('notifications.just_now', 'Just now');
    } else if (diffInHours < 24) {
      return t('notifications.hours_ago', `${Math.floor(diffInHours)}h ago`);
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <View style={styles.notificationCard}>
      <View style={styles.notificationHeader}>
        <View style={[styles.notificationIcon, { backgroundColor: getNotificationColor(notification.type) + '20' }]}>
          <MaterialCommunityIcons 
            name={getNotificationIcon(notification.type)} 
            size={20} 
            color={getNotificationColor(notification.type)} 
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle} numberOfLines={2}>
            {notification.title || t('notifications.default_title', 'New notification')}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTime(notification.createdAt)}
          </Text>
        </View>
        {!notification.read && <View style={styles.unreadDot} />}
      </View>
      {notification.description && (
        <Text style={styles.notificationDescription} numberOfLines={3}>
          {notification.description}
        </Text>
      )}
    </View>
  );
};

const Notifications = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const currentId = useSelector((state) => state?.user?.currentUser?.documentId);
  const notifications = useSelector((state) => state?.notifications?.notifications);
  const dispatch = useDispatch();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Track screen view on mount
  useEffect(() => {
    trackScreenView('Notifications');
    
    // Animate screen entrance
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (currentId) {
      loadNotifications();
    }
  }, [currentId]);
 
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

  const loadNotifications = async () => {
    setLoading(true);
    try {
      await dispatch(getNotification({ id: currentId }));
    } catch (error) {
      console.log('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleMarkAllRead = () => {
    // TODO: Implement mark all as read functionality
  };

  const renderEmptyState = () => (
    <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
      <MaterialCommunityIcons name="bell-off-outline" size={80} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>
        {t('notifications.empty.title', 'No notifications yet')}
      </Text>
      <Text style={styles.emptySubtitle}>
        {t('notifications.empty.description', 'When you have notifications, they\'ll appear here')}
      </Text>
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={handleRefresh}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
        <Text style={styles.refreshButtonText}>
          {t('notifications.refresh', 'Refresh')}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderNotification = ({ item, index }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{
          translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0],
          }),
        }],
      }}
    >
      <NotificationItem notification={item} index={index} />
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.drawerToggleButton}
          onPress={() => navigation.openDrawer()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="menu" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('notifications.title', 'Notifications')}</Text>
          <Text style={styles.headerSubtitle}>
            {notifications?.length > 0 
              ? t('notifications.count', `${notifications.length} notifications`)
              : t('notifications.no_new', 'No new notifications')
            }
          </Text>
        </View>
        
        {notifications?.length > 0 && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleMarkAllRead}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="check-all" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
        
        {!notifications?.length && <View style={styles.headerSpacer} />}
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        {loading && (!notifications || notifications.length === 0) ? (
          // Loading placeholders
          <View style={styles.placeholdersContainer}>
            {[1, 2, 3].map((index) => (
              <LoadingPlaceholder key={index} />
            ))}
          </View>
        ) : (
          <FlatList
            data={notifications || []}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderNotification}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={(!notifications || notifications.length === 0) ? styles.emptyListContainer : styles.listContainer}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  drawerToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    lineHeight: 22,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  notificationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 52,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  // Loading placeholder styles
  placeholdersContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingPlaceholder: {
    marginBottom: 12,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  loadingTextContainer: {
    flex: 1,
  },
  loadingTitle: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 6,
    width: '60%',
  },
  loadingSubtitle: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    width: '40%',
  },
  loadingContent: {
    marginLeft: 52,
    gap: 8,
  },
  loadingLine: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    width: '100%',
  },
});

export default Notifications; 