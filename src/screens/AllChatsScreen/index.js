import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
  RefreshControl,
  Animated,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../utils/colors';
import { 
  trackScreenView, 
  trackChatListViewed,
  trackChatOpened 
} from '../../utils/analytics';

const AllChatsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  const currentUser = useSelector((state) => state?.user?.currentUser);

  // Track screen view on mount
  useEffect(() => {
    trackScreenView('AllChats');
 //   trackChatListViewed();
    
    // Animate screen entrance
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      setLoading(true);
      // TODO: Implement Firebase Realtime Database query to get user's chats
      // For now, using mock data
      const mockChats = [
        {
          id: '1',
          driverName: 'Ahmed Ben Ali',
          driverAvatar: 'https://randomuser.me/api/portraits/men/1.jpg',
          lastMessage: 'I\'m on my way to pick you up',
          timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          unreadCount: 2,
          orderId: 'ORD001',
          status: 'active'
        },
        {
          id: '2',
          driverName: 'Mohamed Trabelsi',
          driverAvatar: 'https://randomuser.me/api/portraits/men/2.jpg',
          lastMessage: 'Thank you for choosing our service!',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          unreadCount: 0,
          orderId: 'ORD002',
          status: 'completed'
        },
        {
          id: '3',
          driverName: 'Karim Sassi',
          driverAvatar: 'https://randomuser.me/api/portraits/men/3.jpg',
          lastMessage: 'I\'ve arrived at the pickup location',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          unreadCount: 0,
          orderId: 'ORD003',
          status: 'completed'
        }
      ];
      
      setChats(mockChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadChats().finally(() => setRefreshing(false));
  };

  const handleChatPress = (chat) => {
    // trackChatOpened(chat.id, {
    //   driver_name: chat.driverName,
    //   order_id: chat.orderId,
    //   chat_status: chat.status
    // });
    
    navigation.navigate('ChatScreen', {
      requestId: chat.orderId,
      driverData: {
        firstName: chat.driverName.split(' ')[0],
        lastName: chat.driverName.split(' ')[1] || '',
        profilePicture: { url: chat.driverAvatar }
      }
    });
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return t('chat.just_now');
    if (minutes < 60) return t('chat.minutes_ago', { count: minutes });
    if (hours < 24) return t('chat.hours_ago', { count: hours });
    if (days < 7) return t('chat.days_ago', { count: days });
    
    return timestamp.toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#34C759';
      case 'completed': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const renderChatItem = ({ item, index }) => (
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
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.driverAvatar }} style={styles.avatar} />
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
        </View>
        
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.driverName}>{item.driverName}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
          </View>
          
          <View style={styles.messageRow}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={styles.orderId}>#{item.orderId}</Text>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
      <MaterialCommunityIcons name="message-outline" size={80} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>{t('chat.no_chats_title')}</Text>
      <Text style={styles.emptySubtitle}>{t('chat.no_chats_subtitle')}</Text>
      <TouchableOpacity 
        style={styles.bookRideButton}
        onPress={() => navigation.navigate('Home')}
      >
        <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        <Text style={styles.bookRideButtonText}>{t('chat.book_ride')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.drawerToggleButton}
          onPress={() => navigation.openDrawer()}
        >
          <MaterialCommunityIcons name="menu" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('chat.all_chats')}</Text>
          <Text style={styles.headerSubtitle}>
            {chats.length} {t('chat.conversations')}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => {
            // TODO: Implement search functionality
          }}
        >
          <Ionicons name="search" size={24} color={colors.primary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Chat List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('chat.loading_chats')}</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
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
          contentContainerStyle={chats.length === 0 ? styles.emptyListContainer : styles.listContainer}
        />
      )}
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  orderId: {
    fontSize: 12,
    color: '#8E8E93',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  bookRideButton: {
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
  bookRideButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
});

export default AllChatsScreen;

