import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors } from '../../utils/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ChatModal from './ChatModal';

const ChatButton = ({ driverId, tripId, style }) => {
  const [showChat, setShowChat] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePress = () => {
    // Add press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setShowChat(true);
  };

  return (
    <>
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <MaterialIcons name="chat" size={24} color={colors.textInverse} />
        </TouchableOpacity>
      </Animated.View>

      <ChatModal
        visible={showChat}
        onClose={() => setShowChat(false)}
        driverId={driverId}
        tripId={tripId}
      />
    </>
  );
};

const styles = StyleSheet.create({
  chatButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.uberBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default ChatButton;

