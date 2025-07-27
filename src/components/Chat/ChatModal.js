import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { ref, push, onValue, off, serverTimestamp, query, orderByChild, limitToLast } from 'firebase/database';
import db from '../../utils/firebase';
import { colors } from '../../utils/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useTranslation } from 'react-i18next';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ChatModal = ({ visible, onClose, driverId, tripId }) => {
  const { t } = useTranslation();
  const user = useSelector(state => state.user.currentUser);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [driverTyping, setDriverTyping] = useState(false);
  const flatListRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const typingTimeoutRef = useRef(null);

  const chatId = `${tripId}_${user?.id}_${driverId}`;

  useEffect(() => {
    if (visible) {
      // Animate modal in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Set up message listener
      const messagesRef = ref(db, `chats/${chatId}/messages`);
      const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(50));
      
      const unsubscribe = onValue(messagesQuery, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const messagesList = Object.keys(data).map(key => ({
            id: key,
            ...data[key],
          })).sort((a, b) => a.timestamp - b.timestamp);
          setMessages(messagesList);
        }
      });

      // Set up typing indicator listener
      const typingRef = ref(db, `chats/${chatId}/typing/${driverId}`);
      const typingUnsubscribe = onValue(typingRef, (snapshot) => {
        setDriverTyping(snapshot.val() || false);
      });

      return () => {
        off(messagesRef, 'value', unsubscribe);
        off(typingRef, 'value', typingUnsubscribe);
      };
    } else {
      // Animate modal out
      Animated.spring(slideAnim, {
        toValue: SCREEN_HEIGHT,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [visible, chatId, driverId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || !user) return;

    const messageData = {
      text: inputText.trim(),
      senderId: user.id,
      senderName: user.name || user.firstName || 'User',
      senderType: 'passenger',
      timestamp: serverTimestamp(),
      read: false,
    };

    try {
      const messagesRef = ref(db, `chats/${chatId}/messages`);
      await push(messagesRef, messageData);
      
      // Update chat metadata
      const chatMetaRef = ref(db, `chats/${chatId}/metadata`);
      await push(chatMetaRef, {
        lastMessage: inputText.trim(),
        lastMessageTime: serverTimestamp(),
        participants: {
          [user.id]: {
            name: user.name || user.firstName || 'User',
            type: 'passenger',
          },
          [driverId]: {
            name: 'Driver',
            type: 'driver',
          },
        },
      });

      setInputText('');
      stopTyping();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleInputChange = (text) => {
    setInputText(text);
    
    if (text.trim() && !isTyping) {
      startTyping();
    } else if (!text.trim() && isTyping) {
      stopTyping();
    }
  };

  const startTyping = async () => {
    setIsTyping(true);
    const typingRef = ref(db, `chats/${chatId}/typing/${user?.id}`);
    try {
      await push(typingRef, true);
    } catch (error) {
      console.error('Error setting typing status:', error);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = async () => {
    setIsTyping(false);
    const typingRef = ref(db, `chats/${chatId}/typing/${user?.id}`);
    try {
      await push(typingRef, false);
    } catch (error) {
      console.error('Error clearing typing status:', error);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleClose = () => {
    stopTyping();
    onClose();
  };

  const renderMessage = ({ item }) => (
    <ChatMessage
      message={item}
      isOwnMessage={item.senderId === user?.id}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
        <MaterialIcons name="arrow-back" size={24} color={colors.textInverse} />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>{t('chat.driver_chat')}</Text>
        <Text style={styles.headerSubtitle}>
          {driverTyping ? t('chat.typing') : t('chat.online')}
        </Text>
      </View>
      <TouchableOpacity style={styles.callButton}>
        <MaterialIcons name="phone" size={24} color={colors.textInverse} />
      </TouchableOpacity>
    </View>
  );

  const renderInputArea = () => (
    <View style={styles.inputContainer}>
      {driverTyping && <TypingIndicator />}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={handleInputChange}
          placeholder={t('chat.type_message')}
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: inputText.trim() ? colors.uberBlue : colors.borderMedium }
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <MaterialIcons 
            name="send" 
            size={20} 
            color={inputText.trim() ? colors.textInverse : colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {renderHeader()}
            
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
            />

            {renderInputArea()}
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.backgroundPrimary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.uberBlack,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  closeButton: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: hp(2.2),
    fontWeight: '700',
    color: colors.textInverse,
  },
  headerSubtitle: {
    fontSize: hp(1.6),
    color: colors.textInverse,
    opacity: 0.8,
    marginTop: 2,
  },
  callButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  messagesList: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  messagesContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  inputContainer: {
    backgroundColor: colors.backgroundPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: hp(1.8),
    color: colors.textPrimary,
    backgroundColor: colors.backgroundPrimary,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatModal;

