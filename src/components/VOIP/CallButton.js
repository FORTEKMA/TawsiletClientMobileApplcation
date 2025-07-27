import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { colors } from '../../utils/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import CallModal from './CallModal';

const CallButton = ({ 
  driverId, 
  tripId, 
  style, 
  appId, 
  token,
  contactName = 'Driver',
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  const { t } = useTranslation();
  const [showCall, setShowCall] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { width: 44, height: 44, borderRadius: 22, iconSize: 20 };
      case 'large':
        return { width: 64, height: 64, borderRadius: 32, iconSize: 28 };
      default:
        return { width: 56, height: 56, borderRadius: 28, iconSize: 24 };
    }
  };

  const sizeConfig = getSizeConfig();

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

    // Check if required props are provided
    if (!appId) {
      Alert.alert(
        t('call.error'),
        t('call.configuration_missing'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    if (!driverId || !tripId) {
      Alert.alert(
        t('call.error'),
        t('call.invalid_call_data'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    setShowCall(true);
  };

  const generateChannelName = () => {
    // Generate a unique channel name based on trip and participants
    return `trip_${tripId}_${driverId}`;
  };

  const generateUid = () => {
    // Generate a unique UID for the passenger
    // In a real app, this should be consistent for the same user
    return Math.floor(Math.random() * 1000000);
  };

  return (
    <>
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <TouchableOpacity
          style={[
            styles.callButton,
            {
              width: sizeConfig.width,
              height: sizeConfig.height,
              borderRadius: sizeConfig.borderRadius,
            }
          ]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <MaterialIcons 
            name="phone" 
            size={sizeConfig.iconSize} 
            color={colors.textInverse} 
          />
        </TouchableOpacity>
      </Animated.View>

      <CallModal
        visible={showCall}
        onClose={() => setShowCall(false)}
        callType="outgoing"
        contactName={contactName}
        channelName={generateChannelName()}
        token={token}
        uid={generateUid()}
        appId={appId}
      />
    </>
  );
};

const styles = StyleSheet.create({
  callButton: {
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default CallButton;

