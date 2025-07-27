import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/colors';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';

const ChatMessage = ({ message, isOwnMessage }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[
      styles.messageContainer,
      isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
    ]}>
      <View style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
      ]}>
        <Text style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {message.text}
        </Text>
        <Text style={[
          styles.timeText,
          isOwnMessage ? styles.ownTimeText : styles.otherTimeText
        ]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 4,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownMessageBubble: {
    backgroundColor: colors.uberBlack,
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    backgroundColor: colors.backgroundPrimary,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  messageText: {
    fontSize: hp(1.8),
    lineHeight: hp(2.4),
  },
  ownMessageText: {
    color: colors.textInverse,
  },
  otherMessageText: {
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: hp(1.2),
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownTimeText: {
    color: colors.textInverse,
    opacity: 0.7,
  },
  otherTimeText: {
    color: colors.textSecondary,
  },
});

export default ChatMessage;

