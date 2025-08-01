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
  TouchableWithoutFeedback
} from 'react-native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import { ref, onValue, off, set, onDisconnect } from 'firebase/database';
import { firestoreDb, realtimeDb } from '../../utils/firebase';
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
  const { driverData, requestId } = route.params;

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
  const [isSending, setIsSending] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected'); 
  
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;
  const connectionAnimation = useRef(new Animated.Value(1)).current;
  const sendButtonScale = useRef(new Animated.Value(1)).current;

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

    const chatDocRef = firestoreDb.collection('chats').doc(requestId);

    // Initialize chat document and all subcollections if they don't exist
    const initializeChatDocument = async () => {
      try {
        const chatDoc = await chatDocRef.get();
        if (!chatDoc.exists) {
          // Create the main chat document
          await chatDocRef.set({
            requestId: requestId,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
            participants: [user.id, driverData?.id || 'driver'],
            unreadCounts: {
              [user.id]: 0,
              driver: 0
            },
            lastMessage: '',
            lastMessageSender: '',
            isActive: true
          });
        }

        // Initialize typing document
        const typingDocRef = chatDocRef.collection('typing').doc('status');
        const typingDoc = await typingDocRef.get();
        if (!typingDoc.exists) {
          await typingDocRef.set({
            user: false,
            driver: false
          });
        }

        // Initialize presence documents
        const userPresenceDocRef = chatDocRef.collection('presence').doc('user');
        const userPresenceDoc = await userPresenceDocRef.get();
        if (!userPresenceDoc.exists) {
          await userPresenceDocRef.set({
            isOnline: true,
            lastSeen: firestore.FieldValue.serverTimestamp()
          });
        }

        const driverPresenceDocRef = chatDocRef.collection('presence').doc('driver');
        const driverPresenceDoc = await driverPresenceDocRef.get();
        if (!driverPresenceDoc.exists) {
          await driverPresenceDocRef.set({
            isOnline: false,
            lastSeen: firestore.FieldValue.serverTimestamp()
          });
        }

        // Set user online status
        await userPresenceDocRef.set({ 
          isOnline: true, 
          lastSeen: firestore.FieldValue.serverTimestamp() 
        }, { merge: true });

      } catch (error) {
        console.error('Error initializing chat document:', error);
      }
    };

    // Initialize everything first, then set up listeners
    initializeChatDocument().then(() => {
      // Listen to messages
      const messagesQuery = chatDocRef.collection('messages').orderBy('timestamp');
      
      const unsubscribeMessages = messagesQuery.onSnapshot((snapshot) => {
        const messagesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(), // Convert Firestore Timestamp to Date object
        }));
        
        setMessages(messagesList);
        
        // Mark messages as read with error handling
        if (messagesList.length > 0) {
          markMessagesAsRead(messagesList).catch(error => {
            console.error('Error in markMessagesAsRead:', error);
          });
        }
        
        // Auto scroll to bottom when new message arrives
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Vibrate on new message (if not from current user)
        const lastMessage = messagesList[messagesList.length - 1];
        if (lastMessage && lastMessage.senderId !== user.id && lastMessage.timestamp > Date.now() - 5000) {
          Vibration.vibrate(100);
        }
      });

      // Listen for typing indicators
      const typingDocRef = chatDocRef.collection('typing').doc('status');
      const unsubscribeTyping = typingDocRef.onSnapshot((docSnap) => {
        if (docSnap.exists) {
          const data = docSnap.data();
          const otherUserType = 'driver';
          setOtherUserTyping(data?.[otherUserType] || false);
        }
      });

      // Listen for other user's presence
      const otherUserType = 'driver';
      const otherUserPresenceDocRef = chatDocRef.collection('presence').doc(otherUserType);
      const unsubscribePresence = otherUserPresenceDocRef.onSnapshot((docSnap) => {
        if (docSnap.exists) {
          const data = docSnap.data();
          setIsOnline(data?.isOnline || false);
          setLastSeen(data?.lastSeen?.toDate() || null);
        }
      });

      // Listen for unread count
      const unsubscribeUnread = chatDocRef.onSnapshot((docSnap) => {
        if (docSnap.exists) {
          const data = docSnap.data();
          setUnreadCount(data?.unreadCounts?.[user.id] || 0);
        }
      });

      // Listen for connection status using Realtime Database
      const connectedRef = ref(realtimeDb, '.info/connected');
      const unsubscribeConnection = onValue(connectedRef, (snapshot) => {
        setConnectionStatus(snapshot.val() ? 'connected' : 'disconnected');
      });

      // Store cleanup functions
      const cleanupFunctions = [
        unsubscribeMessages,
        unsubscribeTyping,
        unsubscribePresence,
        unsubscribeUnread,
        unsubscribeConnection
      ];

      // Return cleanup function
      return () => {
        // Cleanup listeners
        cleanupFunctions.forEach(unsubscribe => unsubscribe());
        
        // Set user offline
        const userPresenceDocRef = chatDocRef.collection('presence').doc('user');
        userPresenceDocRef.set({ 
          isOnline: false, 
          lastSeen: firestore.FieldValue.serverTimestamp() 
        }, { merge: true });
      };
    });

  }, [requestId, user.id]);

  const markMessagesAsRead = async (messagesList) => {
    if (!requestId || !user?.id) {
      console.log('Missing requestId or user ID, skipping mark as read');
      return;
    }

    const unreadMessages = messagesList.filter(msg => 
      msg.senderId !== user.id && !msg.read && msg.id
    );

    if (unreadMessages.length > 0) {
      try {
        // First, verify that the chat document exists
        const chatDocRef = firestoreDb.collection('chats').doc(requestId);
        const chatDoc = await chatDocRef.get();
        
        if (!chatDoc.exists) {
          console.log('Chat document does not exist, skipping mark as read');
          return;
        }

        // Process messages individually to handle missing documents gracefully
        const updatePromises = unreadMessages.map(async (msg) => {
          try {
            const messageRef = firestoreDb.collection('chats').doc(requestId).collection('messages').doc(msg.id);
            const messageDoc = await messageRef.get();
            
            if (messageDoc.exists) {
              await messageRef.update({
                read: true,
                readAt: firestore.FieldValue.serverTimestamp(),
              });
              return true;
            } else {
              console.log(`Message document ${msg.id} does not exist, skipping`);
              return false;
            }
          } catch (error) {
            console.error(`Error updating message ${msg.id}:`, error);
            return false;
          }
        });

        await Promise.all(updatePromises);
        
        // Reset unread count for current user in the chat document
        try {
          await chatDocRef.set({ [`unreadCounts.${user.id}`]: 0 }, { merge: true });
        } catch (error) {
          console.error('Error updating unread count:', error);
        }
        
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
  };

  const sendMessage = async (messageData = null) => {
    const textToSend = messageData?.text || inputText.trim();
    if (!textToSend && !messageData?.attachment) return;
    if (!requestId) {
      console.error('No requestId provided for sending message');
      return;
    }
    if (!user?.id) {
      console.error('No user ID available for sending message');
      return;
    }
    
    if (isSending) return; // Prevent multiple sends
    
    // Animate send button
    Animated.sequence([
      Animated.timing(sendButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(sendButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsSending(true);

    const message = {
      text: textToSend,
      senderId: user.id,
      senderName: user.firstName + ' ' + user.lastName || 'User',
      senderType: 'user',
      timestamp: firestore.FieldValue.serverTimestamp(),
      read: false,
      ...messageData,
    };

    try {
      const chatDocRef = firestoreDb.collection('chats').doc(requestId);
      
      // Ensure chat document exists before sending message
      let chatDoc = await chatDocRef.get();
      if (!chatDoc.exists) {
        await chatDocRef.set({
          requestId: requestId,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
          participants: [user.id, driverData?.id || 'driver'],

          unreadCounts: {
            [user.id]: 0,
            driver: 0
          },
          lastMessage: '',
          lastMessageSender: '',
          isActive: true
        });
        // Small delay to ensure Firestore propagates the creation
        await new Promise(resolve => setTimeout(resolve, 100));
        // Get the document again after creating it
        chatDoc = await chatDocRef.get();
      }

      const messagesCollectionRef = chatDocRef.collection('messages');
      await messagesCollectionRef.add(message);
      
      // Update last message info and increment unread count for other user
      const otherUserType = 'driver';
      const currentUnreadCount = chatDoc.exists ? (chatDoc.data()?.unreadCounts?.[otherUserType] || 0) : 0;
      const chatUpdateData = {
        lastMessage: textToSend || 'Attachment',
        updatedAt: firestore.FieldValue.serverTimestamp(),
        lastMessageSender: 'user',
        [`unreadCounts.${otherUserType}`]: currentUnreadCount + 1,

        participants: [user.id, driverData?.id || 'driver'],
      };
      
      try {
        // Verify document exists before updating
        const verifyDoc = await chatDocRef.get();
        if (!verifyDoc.exists) {
          console.log('Chat document does not exist, creating it first');
                  await chatDocRef.set({
          requestId: requestId,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
          participants: [user.id, driverData?.id || 'driver'],
          unreadCounts: {
            [user.id]: 0,
            driver: 0
          },
          lastMessage: '',
          lastMessageSender: '',
          isActive: true,
          ...chatUpdateData
        });
        } else {
          // Use set with merge to ensure the document exists
          console.log('Updating chat document with data:', chatUpdateData);
          await chatDocRef.set(chatUpdateData, { merge: true });
          console.log('Chat document updated successfully');
        }
      } catch (error) {
        console.error('Error updating chat document:', error);
        console.error('RequestId:', requestId);
        console.error('User ID:', user.id);
        // Continue execution even if chat update fails
      }

      setInputText('');
      setIsTyping(false);
      setIsSending(false);
      
      // Clear typing indicator
      if (requestId) {
        const typingDocRef = chatDocRef.collection('typing').doc('status');
        try {
          await typingDocRef.set({ user: false }, { merge: true });
        } catch (error) {
          console.error('Error clearing typing indicator:', error);
        }
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(t('chat.error'), t('chat.send_error', 'Failed to send message'));
      setIsSending(false);
    }
  };

  const handleTyping = async (text) => {
    setInputText(text);
    console.log("requestId",requestId);
    if (!isTyping && text.trim() && requestId) {
      setIsTyping(true);
      // Set typing indicator in Firebase
      const typingDocRef = firestoreDb.collection('chats').doc(requestId).collection('typing').doc('status');
      try {
        await typingDocRef.set({ user: true }, { merge: true });
      } catch (error) {
        console.error('Error setting typing indicator:', error);
      }
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to clear typing indicator
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      if (requestId) {
        const typingDocRef = firestoreDb.collection('chats').doc(requestId).collection('typing').doc('status');
        try {
          await typingDocRef.set({ user: false }, { merge: true });
        } catch (error) {
          console.error('Error clearing typing indicator:', error);
        }
      }
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
      (messages[index + 1] && item.timestamp && messages[index + 1].timestamp && (messages[index + 1].timestamp.getTime() - item.timestamp.getTime() > 300000)); // 5 minutes
    
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
                      extrapolate: 'clamp',
                    }),
                    transform: [
                      {
                        translateY: typingAnimation.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0, -5, 0],
                          extrapolate: 'clamp',
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#212529" />
        </TouchableOpacity>
        <Image
          source={{ uri: driverData?.profilePicture?.url || 'https://via.placeholder.com/50' }}
          style={styles.headerAvatar}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{driverData?.firstName + ' ' + driverData?.lastName || 'Driver'}</Text>
          <Text style={styles.headerStatus}>
            {isOnline ? t('chat.online', 'Online') : t('chat.last_seen', 'Last seen')} {isOnline ? '' : formatLastSeen(lastSeen)}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="phone" size={20} color="#212529" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="video" size={20} color="#212529" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection Status Indicator */}
      {connectionStatus === 'disconnected' && (
        <Animated.View style={[styles.connectionStatusContainer, { opacity: connectionAnimation }]}>
          <MaterialCommunityIcons name="wifi-off" size={16} color="#856404" />
          <Text style={styles.connectionStatusText}>
            {t('chat.connection_lost', 'Connection lost. Trying to reconnect...')}
          </Text>
        </Animated.View>
      )}

      {/* Loading State */}
      {messages.length === 0 && isUploading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#212529" />
          <Text style={styles.loadingText}>{t('chat.loading_messages', 'Loading messages...')}</Text>
        </View>
      )}

      {/* Empty State */}
      {messages.length === 0 && !isUploading && (
        <View style={styles.emptyStateContainer}>
          <MaterialCommunityIcons name="chat-outline" size={64} color="#ADB5BD" />
          <Text style={styles.emptyStateText}>
            {t('chat.start_conversation', 'Start a conversation with your driver')}
          </Text>
        </View>
      )}

      {/* Messages List */}
      {messages.length > 0 && (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageListContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderTypingIndicator()}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={handleAttachment} style={styles.attachmentButton}>
            <MaterialCommunityIcons name="paperclip" size={20} color="#6C757D" />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder={t('chat.type_message', 'Type a message...')}
            placeholderTextColor="#ADB5BD"
            value={inputText}
            onChangeText={handleTyping}
            multiline
            maxLength={1000}
          />
          <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
            <TouchableOpacity 
              onPress={() => sendMessage()} 
              style={[
                styles.sendButton,
                (!inputText.trim() && !isUploading && !isSending) && styles.sendButtonDisabled
              ]}
              disabled={!inputText.trim() && !isUploading || isSending}
            >
              {isUploading || isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showAttachmentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAttachmentModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAttachmentModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.attachmentModalContent}>
                <View style={{ width: 40, height: 4, backgroundColor: '#E9ECEF', borderRadius: 2, alignSelf: 'center', marginBottom: hp('3%') }} />
                
                <TouchableOpacity style={styles.attachmentOption} onPress={pickImage}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="image" size={24} color="#212529" />
                  </View>
                  <Text style={styles.attachmentOptionText}>{t('chat.photo_library', 'Photo Library')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.attachmentOption} onPress={() => launchCamera({ mediaType: 'photo' }, (response) => {
                  if (response.assets && response.assets[0]) {
                    setIsUploading(true);
                    setTimeout(() => {
                      sendMessage({
                        text: '',
                        attachment: {
                          type: 'image',
                          uri: response.assets[0].uri,
                          name: response.assets[0].fileName || 'photo.jpg',
                        },
                      });
                      setIsUploading(false);
                    }, 2000);
                  }
                  setShowAttachmentModal(false);
                })}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="camera" size={24} color="#212529" />
                  </View>
                  <Text style={styles.attachmentOptionText}>{t('chat.take_photo', 'Take Photo')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.attachmentOption} onPress={pickDocument}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="file-document" size={24} color="#212529" />
                  </View>
                  <Text style={styles.attachmentOptionText}>{t('chat.document', 'Document')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('2%'),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp('3%'),
  },
  headerAvatar: {
    width: wp('12%'),
    height: wp('12%'),
    borderRadius: wp('6%'),
    marginRight: wp('3%'),
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: hp('2.4%'),
    fontWeight: '600',
    color: '#212529',
    marginBottom: hp('0.5%'),
  },
  headerStatus: {
    fontSize: hp('1.6%'),
    color: '#6C757D',
    fontWeight: '400',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: wp('2%'),
  },
  messageListContent: {
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('4%'),
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: hp('2%'),
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: wp('8%'),
    height: wp('8%'),
    borderRadius: wp('4%'),
    marginRight: wp('2%'),
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('2%'),
    borderRadius: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  myMessageBubble: {
    backgroundColor: '#212529',
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  messageText: {
    fontSize: hp('1.8%'),
    lineHeight: hp('2.4%'),
    fontWeight: '400',
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#212529',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: hp('1%'),
  },
  messageTime: {
    fontSize: hp('1.2%'),
    fontWeight: '400',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  otherMessageTime: {
    color: '#ADB5BD',
  },
  readIndicator: {
    marginLeft: wp('1%'),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('2%'),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  attachmentButton: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp('3%'),
    marginBottom: hp('1%'),
  },
  textInput: {
    flex: 1,
    maxHeight: hp('12%'),
    minHeight: wp('10%'),
    fontSize: hp('1.8%'),
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('2%'),
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    color: '#212529',
    fontWeight: '400',
  },
  sendButton: {
    width: wp('12%'),
    height: wp('12%'),
    borderRadius: wp('6%'),
    backgroundColor: '#212529',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: wp('3%'),
    marginBottom: hp('1%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#ADB5BD',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
    marginBottom: hp('2%'),
  },
  typingAvatar: {
    width: wp('8%'),
    height: wp('8%'),
    borderRadius: wp('4%'),
    marginRight: wp('2%'),
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('2%'),
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: hp('2%'),
  },
  typingDot: {
    width: wp('2%'),
    height: wp('2%'),
    borderRadius: wp('1%'),
    backgroundColor: '#6C757D',
    marginHorizontal: wp('0.5%'),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  attachmentModalContent: {
    backgroundColor: '#FFFFFF',
    paddingTop: hp('3%'),
    paddingBottom: hp('4%'),
    paddingHorizontal: wp('4%'),
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  attachmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('2%'),
    borderRadius: 12,
    marginBottom: hp('1%'),
  },
  attachmentOptionText: {
    marginLeft: wp('4%'),
    fontSize: hp('2%'),
    color: '#212529',
    fontWeight: '500',
  },
  attachmentContainer: {
    marginBottom: hp('2%'),
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: wp('60%'),
    height: hp('25%'),
    borderRadius: 12,
    resizeMode: 'cover',
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: wp('3%'),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  documentName: {
    marginLeft: wp('3%'),
    fontSize: hp('1.6%'),
    color: '#212529',
    fontWeight: '500',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: hp('1.8%'),
    color: '#6C757D',
    marginTop: hp('2%'),
    fontWeight: '500',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('10%'),
  },
  emptyStateText: {
    fontSize: hp('2%'),
    color: '#6C757D',
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: hp('2.8%'),
  },
  connectionStatusContainer: {
    position: 'absolute',
    top: hp('12%'),
    left: wp('4%'),
    right: wp('4%'),
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFEAA7',
    borderRadius: 8,
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('1%'),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  connectionStatusText: {
    fontSize: hp('1.4%'),
    color: '#856404',
    fontWeight: '500',
    marginLeft: wp('2%'),
  },
});

export default ChatScreen;