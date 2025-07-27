import { ref, push, onValue, off, serverTimestamp, query, orderByChild, limitToLast, set } from 'firebase/database';
import db from './firebase';

class ChatService {
  constructor() {
    this.activeListeners = new Map();
  }

  // Create or get chat ID
  getChatId(tripId, passengerId, driverId) {
    return `${tripId}_${passengerId}_${driverId}`;
  }

  // Send a message
  async sendMessage(chatId, senderId, senderName, senderType, text) {
    try {
      const messageData = {
        text: text.trim(),
        senderId,
        senderName,
        senderType, // 'passenger' or 'driver'
        timestamp: serverTimestamp(),
        read: false,
      };

      const messagesRef = ref(db, `chats/${chatId}/messages`);
      await push(messagesRef, messageData);

      // Update chat metadata
      await this.updateChatMetadata(chatId, text.trim(), senderId, senderName, senderType);

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Update chat metadata
  async updateChatMetadata(chatId, lastMessage, senderId, senderName, senderType) {
    try {
      const chatMetaRef = ref(db, `chats/${chatId}/metadata`);
      await set(chatMetaRef, {
        lastMessage,
        lastMessageTime: serverTimestamp(),
        lastMessageSender: senderId,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating chat metadata:', error);
    }
  }

  // Listen to messages
  listenToMessages(chatId, callback, limit = 50) {
    const messagesRef = ref(db, `chats/${chatId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(limit));
    
    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesList = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
        })).sort((a, b) => a.timestamp - b.timestamp);
        callback(messagesList);
      } else {
        callback([]);
      }
    });

    // Store the listener for cleanup
    this.activeListeners.set(`messages_${chatId}`, { ref: messagesRef, unsubscribe });
    
    return unsubscribe;
  }

  // Set typing status
  async setTypingStatus(chatId, userId, isTyping) {
    try {
      const typingRef = ref(db, `chats/${chatId}/typing/${userId}`);
      await set(typingRef, isTyping);
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  }

  // Listen to typing status
  listenToTypingStatus(chatId, userId, callback) {
    const typingRef = ref(db, `chats/${chatId}/typing/${userId}`);
    
    const unsubscribe = onValue(typingRef, (snapshot) => {
      callback(snapshot.val() || false);
    });

    // Store the listener for cleanup
    this.activeListeners.set(`typing_${chatId}_${userId}`, { ref: typingRef, unsubscribe });
    
    return unsubscribe;
  }

  // Mark messages as read
  async markMessagesAsRead(chatId, userId) {
    try {
      const messagesRef = ref(db, `chats/${chatId}/messages`);
      const snapshot = await new Promise((resolve) => {
        onValue(messagesRef, resolve, { onlyOnce: true });
      });

      const data = snapshot.val();
      if (data) {
        const updates = {};
        Object.keys(data).forEach(messageId => {
          const message = data[messageId];
          if (message.senderId !== userId && !message.read) {
            updates[`${messageId}/read`] = true;
          }
        });

        if (Object.keys(updates).length > 0) {
          await set(ref(db, `chats/${chatId}/messages`), updates);
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Get unread message count
  async getUnreadCount(chatId, userId) {
    try {
      const messagesRef = ref(db, `chats/${chatId}/messages`);
      const snapshot = await new Promise((resolve) => {
        onValue(messagesRef, resolve, { onlyOnce: true });
      });

      const data = snapshot.val();
      if (!data) return 0;

      let unreadCount = 0;
      Object.values(data).forEach(message => {
        if (message.senderId !== userId && !message.read) {
          unreadCount++;
        }
      });

      return unreadCount;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Clean up listeners
  cleanup(chatId = null) {
    if (chatId) {
      // Clean up specific chat listeners
      this.activeListeners.forEach((listener, key) => {
        if (key.includes(chatId)) {
          off(listener.ref, 'value', listener.unsubscribe);
          this.activeListeners.delete(key);
        }
      });
    } else {
      // Clean up all listeners
      this.activeListeners.forEach((listener, key) => {
        off(listener.ref, 'value', listener.unsubscribe);
      });
      this.activeListeners.clear();
    }
  }

  // Initialize chat for a trip
  async initializeChat(tripId, passengerId, passengerName, driverId, driverName) {
    const chatId = this.getChatId(tripId, passengerId, driverId);
    
    try {
      // Set up initial chat metadata
      const chatMetaRef = ref(db, `chats/${chatId}/metadata`);
      await set(chatMetaRef, {
        tripId,
        participants: {
          [passengerId]: {
            name: passengerName,
            type: 'passenger',
          },
          [driverId]: {
            name: driverName,
            type: 'driver',
          },
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return chatId;
    } catch (error) {
      console.error('Error initializing chat:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export default new ChatService();

