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
} from 'react-native';
import Modal from 'react-native-modal';
import { useSelector } from 'react-redux';
import { ref, push, onValue, off, serverTimestamp, query, orderByChild } from 'firebase/database';
import db from '../utils/firebase';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useTranslation } from 'react-i18next';

const { height: screenHeight } = Dimensions.get('window');

const ChatModal = ({ 
  visible, 
  onClose, 
  driverData, 
  requestId,
  userType = 'user' // 'user' or 'driver'
}) => {
  const { t } = useTranslation();
  const user = useSelector(state => state.user.currentUser);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [driverTyping, setDriverTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const slideAnimation = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const typingAnimation = useRef(new Animated.Value(0)).current;

  // Initialize animations when modal opens
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Typing indicator animation
  useEffect(() => {
    if (driverTyping) {
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
  }, [driverTyping]);

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

  // Firebase listeners
  useEffect(() => {
    if (!visible || !requestId) return;

    const chatRef = ref(db, `chats/${requestId}/messages`);
    const messagesQuery = query(chatRef, orderByChild('timestamp'));
    
    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesList = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        setMessages(messagesList);
        
        // Auto scroll to bottom when new message arrives
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    // Listen for typing indicators
    const typingRef = ref(db, `chats/${requestId}/typing`);
    const typingUnsubscribe = onValue(typingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const otherUserType = userType === 'user' ? 'driver' : 'user';
        setDriverTyping(data[otherUserType] || false);
      }
    });

    return () => {
      off(chatRef, 'value', unsubscribe);
      off(typingRef, 'value', typingUnsubscribe);
    };
  }, [visible, requestId, userType]);

  const sendMessage = async () => {
    if (!inputText.trim() || !requestId) return;

    const messageData = {
      text: inputText.trim(),
      senderId: user.id,
      senderName: user.name || 'User',
      senderType: userType,
      timestamp: Date.now(),
      read: false,
    };

    try {
      const chatRef = ref(db, `chats/${requestId}/messages`);
      await push(chatRef, messageData);
      
      setInputText('');
      setIsTyping(false);
      
      // Clear typing indicator
      const typingRef = ref(db, `chats/${requestId}/typing/${userType}`);
      await push(typingRef, false);
      
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = (text) => {
    setInputText(text);
    
    if (!isTyping && text.trim()) {
      setIsTyping(true);
      // Set typing indicator in Firebase
      const typingRef = ref(db, `chats/${requestId}/typing/${userType}`);
      push(typingRef, true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to clear typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      const typingRef = ref(db, `chats/${requestId}/typing/${userType}`);
      push(typingRef, false);
    }, 2000);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.senderId === user.id;
    const showAvatar = !isMyMessage && (index === 0 || messages[index - 1]?.senderId !== item.senderId);
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        {showAvatar && !isMyMessage && (
          <Image
            source={{ uri: driverData?.avatar || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
        )}
        
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          !isMyMessage && !showAvatar && { marginLeft: 50 }
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.otherMessageTime
          ]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!driverTyping) return null;

    return (
      <View style={styles.typingContainer}>
        <Image
          source={{ uri: driverData?.avatar || 'https://via.placeholder.com/40' }}
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

  return (
    <Modal
      isVisible={visible}
      style={styles.modal}
      backdropOpacity={0.5}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      propagateSwipe
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnimation }],
            opacity: fadeAnimation,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={{ uri: driverData?.avatar || 'https://via.placeholder.com/40' }}
              style={styles.headerAvatar}
            />
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>
                {driverData?.name || t('chat.driver', 'Driver')}
              </Text>
              <Text style={styles.headerStatus}>
                {driverData?.vehicle_info || t('chat.online', 'Online')}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
                onPress={sendMessage}
                disabled={!inputText.trim()}
              >
                <MaterialCommunityIcons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.9,
    minHeight: screenHeight * 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
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
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E9ECEF',
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
  messageTime: {
    fontSize: hp(1.2),
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#6C757D',
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
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: hp(1.6),
    color: '#000',
    maxHeight: 100,
    paddingVertical: 8,
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
});

export default ChatModal;

