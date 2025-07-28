import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  SafeAreaView,
  Alert,
  Modal,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { useSelector } from 'react-redux';
import { ref, push, onValue, off, serverTimestamp, query, orderByChild, update, set, onDisconnect, get } from 'firebase/database';
import db from '../../utils/firebase';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import DocumentPicker from 'react-native-document-picker';
 import { launchCamera, launchImageLibrary } from "react-native-image-picker";

const { height: screenHeight } = Dimensions.get('window');

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { driverData, requestId, userType = 'user' } = route.params;

  const { t } = useTranslation();
  const user = useSelector(state => state.user.currentUser);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;
  const connectionAnimation = useRef(new Animated.Value(1)).current;

  // Enhanced typing indicator animation
  useEffect(() => {
    if (otherUserTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnimation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      typingAnimation.stopAnimation();
      typingAnimation.setValue(0);
    }
  }, [otherUserTyping]);

  // Connection status animation
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(connectionAnimation, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(connectionAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      connectionAnimation.stopAnimation();
      connectionAnimation.setValue(1);
    }
  }, [connectionStatus]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Enhanced Firebase listeners with real-time features
  useEffect(() => {
    if (!requestId) return;

    // Set user online status
    const userPresenceRef = ref(db, `chats/${requestId}/presence/${userType}`);
    const userLastSeenRef = ref(db, `chats/${requestId}/lastSeen/${userType}`);
    
    // Set online status
    set(userPresenceRef, true);
    set(userLastSeenRef, serverTimestamp());
    
    // Set offline when disconnected
    onDisconnect(userPresenceRef).set(false);
    onDisconnect(userLastSeenRef).set(serverTimestamp());

    // Listen to messages
    const chatRef = ref(db, `chats/${requestId}/messages`);
    const messagesQuery = query(chatRef, orderByChild('timestamp'));
    
    const unsubscribeMessages = onValue(messagesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesList = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        setMessages(messagesList);
        
        // Mark messages as read
        markMessagesAsRead(messagesList);
        
        // Auto scroll to bottom when new message arrives
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Vibrate on new message (if not from current user)
        const lastMessage = messagesList[messagesList.length - 1];
        if (lastMessage && lastMessage.senderId !== user.id && lastMessage.timestamp > Date.now() - 5000) {
          Vibration.vibrate(100);
        }
      }
    });

    // Listen for typing indicators
    const typingRef = ref(db, `chats/${requestId}/typing`);
    const unsubscribeTyping = onValue(typingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const otherUserType = userType === 'user' ? 'driver' : 'user';
        setOtherUserTyping(data[otherUserType] || false);
      }
    });

    // Listen for other user's presence
    const otherUserType = userType === 'user' ? 'driver' : 'user';
    const otherUserPresenceRef = ref(db, `chats/${requestId}/presence/${otherUserType}`);
    const unsubscribePresence = onValue(otherUserPresenceRef, (snapshot) => {
      setIsOnline(snapshot.val() || false);
    });

    // Listen for other user's last seen
    const otherUserLastSeenRef = ref(db, `chats/${requestId}/lastSeen/${otherUserType}`);
    const unsubscribeLastSeen = onValue(otherUserLastSeenRef, (snapshot) => {
      setLastSeen(snapshot.val());
    });

    // Listen for connection status
    const connectedRef = ref(db, '.info/connected');
    const unsubscribeConnection = onValue(connectedRef, (snapshot) => {
      setConnectionStatus(snapshot.val() ? 'connected' : 'disconnected');
    });

    // Listen for unread count
    const unreadRef = ref(db, `chats/${requestId}/unreadCount/${userType}`);
    const unsubscribeUnread = onValue(unreadRef, (snapshot) => {
      setUnreadCount(snapshot.val() || 0);
    });

    return () => {
      // Cleanup listeners
      off(chatRef, 'value', unsubscribeMessages);
      off(typingRef, 'value', unsubscribeTyping);
      off(otherUserPresenceRef, 'value', unsubscribePresence);
      off(otherUserLastSeenRef, 'value', unsubscribeLastSeen);
      off(connectedRef, 'value', unsubscribeConnection);
      off(unreadRef, 'value', unsubscribeUnread);
      
      // Set user offline
      set(userPresenceRef, false);
      set(userLastSeenRef, serverTimestamp());
    };
  }, [requestId, userType, user.id]);

  const markMessagesAsRead = async (messagesList) => {
    const unreadMessages = messagesList.filter(msg => 
      msg.senderId !== user.id && !msg.read
    );

    if (unreadMessages.length > 0) {
      const updates = {};
      unreadMessages.forEach(msg => {
        updates[`chats/${requestId}/messages/${msg.id}/read`] = true;
        updates[`chats/${requestId}/messages/${msg.id}/readAt`] = serverTimestamp();
      });
      
      // Reset unread count
      updates[`chats/${requestId}/unreadCount/${userType}`] = 0;
      
      try {
        await update(ref(db), updates);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
  };

  const sendMessage = async (messageData = null) => {
    const textToSend = messageData?.text || inputText.trim();
    if (!textToSend && !messageData?.attachment) return;
    if (!requestId) return;

    const message = {
      text: textToSend,
      senderId: user.id,
      senderName: user.name || 'User',
      senderType: userType,
      timestamp: serverTimestamp(),
      read: false,
      messageId: Date.now().toString(),
      ...messageData,
    };

    try {
      const chatRef = ref(db, `chats/${requestId}/messages`);
      await push(chatRef, message);
      
      // Update last message info
      const chatInfoRef = ref(db, `chats/${requestId}/info`);
      await update(chatInfoRef, {
        lastMessage: textToSend || 'Attachment',
        lastMessageTime: serverTimestamp(),
        lastMessageSender: userType,
      });

      // Increment unread count for other user
      const otherUserType = userType === 'user' ? 'driver' : 'user';
      const unreadRef = ref(db, `chats/${requestId}/unreadCount/${otherUserType}`);
      const currentUnreadSnapshot = await get(unreadRef);
      const currentUnread = currentUnreadSnapshot.val() || 0;
      await set(unreadRef, currentUnread + 1);
      
      setInputText('');
      setIsTyping(false);
      
      // Clear typing indicator
      const typingRef = ref(db, `chats/${requestId}/typing/${userType}`);
      await set(typingRef, false);
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(t('chat.error'), t('chat.send_error', 'Failed to send message'));
    }
  };

  const handleTyping = async (text) => {
    setInputText(text);
    
    if (!isTyping && text.trim()) {
      setIsTyping(true);
      // Set typing indicator in Firebase
      const typingRef = ref(db, `chats/${requestId}/typing/${userType}`);
      await set(typingRef, true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to clear typing indicator
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      const typingRef = ref(db, `chats/${requestId}/typing/${userType}`);
      await set(typingRef, false);
    }, 2000);
  };

  const handleAttachment = () => {
    setShowAttachmentModal(true);
  };

  const pickImage = () => {
    setShowAttachmentModal(false);
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
    };

    launchImageLibrary(options, async (response) => {
      if (response.assets && response.assets[0]) {
        setIsUploading(true);
        try {
          // In a real app, you would upload to Firebase Storage
          // For now, we'll simulate an upload
          setTimeout(() => {
            sendMessage({
              text: '',
              attachment: {
                type: 'image',
                uri: response.assets[0].uri,
                name: response.assets[0].fileName || 'image.jpg',
              },
            });
            setIsUploading(false);
          }, 2000);
        } catch (error) {
          setIsUploading(false);
          Alert.alert(t('chat.error'), t('chat.upload_error', 'Failed to upload image'));
        }
      }
    });
  };

  const pickDocument = async () => {
    setShowAttachmentModal(false);
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      
      if (result[0]) {
        setIsUploading(true);
        // Simulate upload
        setTimeout(() => {
          sendMessage({
            text: '',
            attachment: {
              type: 'document',
              uri: result[0].uri,
              name: result[0].name,
              size: result[0].size,
            },
          });
          setIsUploading(false);
        }, 2000);
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert(t('chat.error'), t('chat.document_error', 'Failed to pick document'));
      }
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('chat.just_now', 'Just now');
    if (diffInMinutes < 60) return t('chat.minutes_ago', `${diffInMinutes}m ago`);
    if (diffInMinutes < 1440) return t('chat.hours_ago', `${Math.floor(diffInMinutes / 60)}h ago`);
    return date.toLocaleDateString();
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.senderId === user.id;
    const showAvatar = !isMyMessage && (index === 0 || messages[index - 1]?.senderId !== item.senderId);
    const showTime = index === messages.length - 1 || 
      (messages[index + 1] && messages[index + 1].senderId !== item.senderId) ||
      (messages[index + 1] && messages[index + 1].timestamp - item.timestamp > 300000); // 5 minutes
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        {showAvatar && !isMyMessage && (
          <Image
            source={{ uri: driverData?.profilePicture?.url || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
        )}
        
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          !isMyMessage && !showAvatar && { marginLeft: 50 }
        ]}>
          {item.attachment && (
            <View style={styles.attachmentContainer}>
              {item.attachment.type === 'image' ? (
                <Image source={{ uri: item.attachment.uri }} style={styles.attachmentImage} />
              ) : (
                <View style={styles.documentContainer}>
                  <MaterialCommunityIcons name="file-document" size={24} color="#666" />
                  <Text style={styles.documentName}>{item.attachment.name}</Text>
                </View>
              )}
            </View>
          )}
          
          {item.text ? (
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText
            ]}>
              {item.text}
            </Text>
          ) : null}
          
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.otherMessageTime
            ]}>
              {formatTime(item.timestamp)}
            </Text>
            {isMyMessage && (
              <MaterialCommunityIcons 
                name={item.read ? "check-all" : "check"} 
                size={16} 
                color={item.read ? "#4CAF50" : "rgba(255, 255, 255, 0.7)"} 
                style={styles.readIndicator}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!otherUserTyping) return null;

    return (
      <View style={styles.typingContainer}>
        <Image
          source={{ uri: driverData?.profilePicture?.url || 'https://via.placeholder.com/40' }}
          style={styles.typingAvatar}
        />
        <View style={styles.typingBubble}>
          <Animated.View style={styles.typingDotsContainer}>
            {[0, 1, 2].map((index) => (
              <Animated.View
                key={index}
                style={[
                  styles.typingDot,
                  {
                    opacity: typingAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                    transform: [
                      {
                        translateY: typingAnimation.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0, -3, 0],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </Animated.View>
        </View>
      </View>
    );
  };

  const renderConnectionStatus = () => {
    if (connectionStatus === 'connected') return null;

    return (
      <Animated.View style={[styles.connectionBanner, { opacity: connectionAnimation }]}>
        <MaterialCommunityIcons name="wifi-off" size={16} color="#fff" />
        <Text style={styles.connectionText}>
          {t('chat.connecting', 'Connecting...')}
        </Text>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Connection Status Banner */}
        {renderConnectionStatus()}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <Image
                  source={{ uri: driverData?.profilePicture?.url || 'https://via.placeholder.com/40' }}
                style={styles.headerAvatar}
              />
              {isOnline && <View style={styles.onlineIndicator} />}
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>
                {driverData?.firstName + ' ' + driverData?.lastName || t('chat.driver', 'Driver')}
              </Text>
              <Text style={styles.headerStatus}>
                {isOnline 
                  ? t('chat.online', 'Online')
                  : lastSeen 
                    ? t('chat.last_seen', `Last seen ${formatLastSeen(lastSeen)}`)
                    : driverData?.vehicule?.mark + ' ' + driverData?.vehicule?.matriculation || t('chat.offline', 'Offline')
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Messages List */}
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : null}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : null}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={renderTypingIndicator}
          />

          {/* Input Container */}
          <View style={[
            styles.inputContainer,
            { marginBottom: keyboardHeight > 0 ? 10 : 20 }
          ]}>
            <View style={styles.inputWrapper}>
              <TouchableOpacity
                style={styles.attachmentButton}
                onPress={handleAttachment}
              >
                <MaterialCommunityIcons name="plus" size={24} color="#666" />
              </TouchableOpacity>
              
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={handleTyping}
                placeholder={t('chat.type_message', 'Type a message...')}
                placeholderTextColor="#999"
                multiline
                maxLength={500}
              />
              
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { opacity: inputText.trim() ? 1 : 0.5 }
                ]}
                onPress={() => sendMessage()}
                disabled={!inputText.trim() || isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Attachment Modal */}
        <Modal
          visible={showAttachmentModal}
          transparent
          onBackdropPress={() => setShowAttachmentModal(false)}
          animationType="slide"
          onRequestClose={() => setShowAttachmentModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.attachmentModal}>
              <Text style={styles.modalTitle}>{t('chat.send_attachment', 'Send Attachment')}</Text>
              
              <TouchableOpacity style={styles.attachmentOption} onPress={pickImage}>
                <MaterialCommunityIcons name="image" size={24} color="#4CAF50" />
                <Text style={styles.attachmentOptionText}>
                  {t('chat.photo', 'Photo')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.attachmentOption} onPress={pickDocument}>
                <MaterialCommunityIcons name="file-document" size={24} color="#2196F3" />
                <Text style={styles.attachmentOptionText}>
                  {t('chat.document', 'Document')}
                </Text>
              </TouchableOpacity>
               
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    fontSize: hp(1.4),
    marginLeft: 8,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    backgroundColor: '#F8F9FA',
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  headerStatus: {
    fontSize: hp(1.4),
    color: '#6C757D',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: wp(75),
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    marginVertical: 2,
  },
  myMessageBubble: {
    backgroundColor: '#000',
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    backgroundColor: '#F1F3F4',
    borderBottomLeftRadius: 6,
  },
  attachmentContainer: {
    marginBottom: 8,
  },
  attachmentImage: {
    width: wp(60),
    height: wp(40),
    borderRadius: 12,
    resizeMode: 'cover',
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  documentName: {
    marginLeft: 8,
    fontSize: hp(1.5),
    color: '#666',
    flex: 1,
  },
  messageText: {
    fontSize: hp(1.6),
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: hp(1.2),
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#6C757D',
  },
  readIndicator: {
    marginLeft: 4,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 8,
  },
  typingAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  typingBubble: {
    backgroundColor: '#F1F3F4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6C757D',
    marginHorizontal: 2,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 8,
    minHeight: 48,
  },
  attachmentButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: hp(1.6),
    color: '#000',
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  sendButton: {
    backgroundColor: '#000',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  attachmentModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  modalTitle: {
    fontSize: hp(2),
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  attachmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    marginBottom: 12,
  },
  attachmentOptionText: {
    fontSize: hp(1.7),
    color: '#000',
    marginLeft: 16,
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: hp(1.7),
    color: '#666',
    fontWeight: '500',
  },
});

export default ChatScreen;

