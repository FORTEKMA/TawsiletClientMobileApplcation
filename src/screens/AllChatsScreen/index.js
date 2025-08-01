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
  Alert,
  Dimensions
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { ref, onValue, off, query as realtimeQuery, orderByChild, limitToLast } from 'firebase/database';
import { firestoreDb, realtimeDb } from '../../utils/firebase';
import { colors } from '../../utils/colors';
import api from '../../utils/api';
import {
  trackScreenView,
   
} from '../../utils/analytics';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AllChatsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [connectionStatus, setConnectionStatus] = useState('connected');

  const currentUser = useSelector((state) => state?.user?.currentUser);

  useEffect(() => {
    trackScreenView('AllChats');
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
       if (currentUser?.id) {
         setupFirestoreListeners();
         setupRealtimeDbListeners();
      }

      return () => {
        if (window.firestoreUnsubscribe) {
          window.firestoreUnsubscribe();
          window.firestoreUnsubscribe = null;
        }
        if (window.realtimeDbListeners) {
          cleanupRealtimeDbListeners();
        }
      };
    }, [currentUser?.id])
  );

  const setupFirestoreListeners = () => {
    if (!currentUser?.id) return;

    setLoading(true);

    const chatsCollectionRef = firestoreDb.collection('chats');
    const q = chatsCollectionRef
      .where('participants', 'array-contains', currentUser.id)
      .orderBy('updatedAt', 'desc');
     const unsubscribe = q.onSnapshot(async (snapshot) => {
      const chatPromises = snapshot.docs.map(async (chatDoc) => {
        const chatData = chatDoc.data();
        const chatId = chatDoc.id;
       
        const messagesCollectionRef = firestoreDb.collection(`chats/${chatId}/messages`);
       
        const lastMessageQuery = messagesCollectionRef.orderBy('timestamp', 'desc').limit(1);
        const lastMessageSnapshot = await lastMessageQuery.get();
        const lastMessage = lastMessageSnapshot.docs[0]?.data() || null;
    
        const unreadCount = chatData.unreadCounts?.[currentUser.id] || 0;

        const otherParticipantId = chatData.participants.find(id => id !== currentUser.id);
        let otherUserData = null;
    
        if (otherParticipantId) {
          try {
            const userResponse = await api.get(`users/${otherParticipantId}?populate[0]=profilePicture`);
            if (userResponse.data) {
              otherUserData = userResponse.data;
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
             
          }
        }
   
        return {
          id: chatId,
          driverName: otherUserData?.name || otherUserData?.firstName + ' ' + (otherUserData?.lastName || '') || 'Unknown Driver',
          driverAvatar: otherUserData?.profilePicture?.url || otherUserData?.avatar || 'https://via.placeholder.com/56',
          lastMessage: lastMessage?.text || 'No messages yet',
          timestamp: lastMessage?.timestamp ? lastMessage.timestamp.toDate() : new Date(),
          unreadCount: unreadCount,
          orderId: chatData.orderId || chatId,
          status: chatData.status || 'active',
          lastMessageSender: lastMessage?.senderType || '',
          lastMessageTime: lastMessage?.timestamp ? lastMessage.timestamp.toDate().getTime() : Date.now(),
          otherUserData: otherUserData,
        };
      });

      try {
        const chatItems = await Promise.all(chatPromises);
        const validChats = chatItems.filter(chat => chat !== null);
        validChats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
        setChats(validChats);
      } catch (error) {
        console.error('Error processing chats:', error);
        setChats([]);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Error fetching user chats:', error);
      setLoading(false);
    });

    window.firestoreUnsubscribe = unsubscribe;
  };

  const setupRealtimeDbListeners = () => {
    // Listen for connection status using Realtime Database
    const connectedRef = ref(realtimeDb, '.info/connected');
    const connectionListener = onValue(connectedRef, (snapshot) => {
      setConnectionStatus(snapshot.val() ? 'connected' : 'disconnected');
    });
    window.realtimeDbListeners = { connectionListener };
  };

  const cleanupRealtimeDbListeners = () => {
    if (window.realtimeDbListeners) {
      const { connectionListener } = window.realtimeDbListeners;
      if (connectionListener) {
        off(ref(realtimeDb, '.info/connected'), 'value', connectionListener);
      }
      window.realtimeDbListeners = null;
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);

    if (window.firestoreUnsubscribe) {
      window.firestoreUnsubscribe();
      window.firestoreUnsubscribe = null;
    }
    if (window.realtimeDbListeners) {
      cleanupRealtimeDbListeners();
    }

    setTimeout(() => {
      setupFirestoreListeners();
      setupRealtimeDbListeners();
      setRefreshing(false);
    }, 1000);
  };

  const handleChatPress = (chat) => {
 

    navigation.navigate('ChatScreen', {
      requestId: chat.orderId,
      driverData: {
        id: chat.otherUserData?.id,
        name: chat.driverName,
        firstName: chat.driverName.split(' ')[0],
        lastName: chat.driverName.split(' ')[1] || '',
        avatar: chat.driverAvatar,
        profilePicture: { url: chat.driverAvatar },
        vehicle_info: chat.otherUserData?.vehicule ?
          `${chat.otherUserData.vehicule.mark || ''} • ${chat.otherUserData.vehicule.matriculation || ''}`.trim() :
          'Vehicle Info',
        rating: chat.otherUserData?.rating || '5.0',
      },
      userType: currentUser?.userType || 'user',
    });
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return t('chat.just_now', 'Just now');
    if (minutes < 60) return t('chat.minutes_ago', `${minutes}m ago`);
    if (hours < 24) return t('chat.hours_ago', `${hours}h ago`);
    if (days < 7) return t('chat.days_ago', `${days}d ago`);

    return timestamp.toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#34C759';
      case 'completed': return '#8E8E93';
      case 'pending': return '#FF9500';
      default: return '#8E8E93';
    }
  };

  const renderConnectionBanner = () => {
    if (connectionStatus === 'connected') return null;

    return (
      <View style={styles.connectionBanner}>
        <MaterialCommunityIcons name="wifi-off" size={16} color="#fff" />
        <Text style={styles.connectionText}>
          {t('chat.connecting', 'Connecting...')}
        </Text>
      </View>
    );
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
          <Image
            source={{ uri: item.driverAvatar }}
            style={styles.avatar}
            defaultSource={{ uri: 'https://via.placeholder.com/56' }}
          />
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.driverName}>{item.driverName}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
          </View>

          <View style={styles.messageRow}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessageSender === (currentUser?.userType || 'user') ?
                `${t('chat.you', 'You')}: ${item.lastMessage}` :
                item.lastMessage
              }
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

        
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
      <MaterialCommunityIcons name="message-outline" size={80} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>
        {t('chat.no_chats_title', 'No conversations yet')}
      </Text>
      <Text style={styles.emptySubtitle}>
        {t('chat.no_chats_subtitle', 'Your chat conversations with drivers will appear here')}
      </Text>
      <TouchableOpacity
        style={styles.bookRideButton}
        onPress={() => navigation.navigate('Home')}
      >
        <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        <Text style={styles.bookRideButtonText}>
          {t('chat.book_ride', 'Book a Ride')}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>
        {t('chat.loading_chats', 'Loading conversations...')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {renderConnectionBanner()}

      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.drawerToggleButton}
          onPress={() => navigation.openDrawer()}
        >
          <MaterialCommunityIcons name="menu" size={24} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {t('chat.all_chats', 'All Chats')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {chats.length} {t('chat.conversations', 'conversations')}
          </Text>
        </View>
      </Animated.View>

      {loading ? (
        renderLoadingState()
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
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={true}
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
  connectionBanner: {
    backgroundColor: '#FF5722',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  connectionText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
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
    backgroundColor: '#F0F0F0',
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
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
    marginRight: 10,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderId: {
    fontSize: 12,
    color: '#C7C7CC',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: screenHeight * 0.15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  bookRideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    marginTop: 30,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  bookRideButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: screenHeight * 0.2,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
});

export default AllChatsScreen;