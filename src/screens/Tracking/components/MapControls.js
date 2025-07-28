import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import VoIPManager from '../../../utils/VoIPManager';

const MapControls = ({
  onDriverPosition,
  onDropPosition,
  onPickupPosition,
  driverData,
  requestId,
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [showCall, setShowCall] = useState(false);
  const [callType, setCallType] = useState('voice');
  const [currentCallId, setCurrentCallId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // VoIP Manager instance
  const voipManager = VoIPManager.getInstance();

  useEffect(() => {
    // Listen for incoming calls
    const handleIncomingCall = (callData) => {
      setCurrentCallId(callData.callId);
      setCallType(callData.type);
      setShowCall(true);
    };

    voipManager.on('incomingCall', handleIncomingCall);

    return () => {
      voipManager.off('incomingCall', handleIncomingCall);
    };
  }, [voipManager]);

  const handleChatPress = () => {
    navigation.navigate('ChatScreen', {
      driverId: driverData?.id,
      requestId: requestId,
    });
  };

  const handleCallPress = async () => {
    try {
      // Show call type selection
      Alert.alert(
        t('call.select_call_type', 'Select Call Type'),
        t('call.choose_call_type', 'Choose how you want to call the driver'),
        [
          {
            text: t('call.voice_call', 'Voice Call'),
            onPress: () => initiateCall('voice'),
          },
          {
            text: t('call.video_call', 'Video Call'),
            onPress: () => initiateCall('video'),
          },
          {
            text: t('common.cancel', 'Cancel'),
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Failed to initiate call:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('call.failed_to_initiate', 'Failed to initiate call. Please try again.')
      );
    }
  };

  const initiateCall = async (type) => {
    try {
      const callId = await voipManager.initiateCall(driverData?.id, type);
      setCurrentCallId(callId);
      setCallType(type);
      
      // Navigate to VoIP call screen
      navigation.navigate('VoIPCallScreen', {
        callType: type,
        driverData: driverData,
        requestId: requestId,
        isIncoming: false,
        callId: callId
      });
    } catch (error) {
      console.error('Call initiation failed:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('call.initiation_failed', 'Failed to start call. Please try again.')
      );
    }
  };

  const handleAcceptCall = async () => {
    if (currentCallId) {
      await voipManager.acceptCall(currentCallId);
      setShowCall(false);
      setCurrentCallId(null);
    }
  };

  const handleDeclineCall = async () => {
    if (currentCallId) {
      await voipManager.declineCall(currentCallId);
      setShowCall(false);
      setCurrentCallId(null);
    }
  };

  const handleEndCall = async () => {
    if (currentCallId) {
      await voipManager.endCall(currentCallId);
      setShowCall(false);
      setCurrentCallId(null);
    }
  };

  return (
    <>
      <View style={styles.buttonContainer}>
        {/* Enhanced position buttons with modern styling */}
        <TouchableOpacity 
          style={[styles.button, styles.modernButton]} 
          onPress={onDriverPosition}
        >
          <MaterialCommunityIcons name="account-circle" size={20} color="#fff" />
          <Text style={[styles.buttonText, styles.modernButtonText]}>
            {t('tracking.driver_position', 'Driver')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.modernButton]} 
          onPress={onDropPosition}
        >
          <MaterialCommunityIcons name="map-marker" size={20} color="#fff" />
          <Text style={[styles.buttonText, styles.modernButtonText]}>
            {t('tracking.drop_position', 'Drop-off')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.modernButton]} 
          onPress={onPickupPosition}
        >
          <MaterialCommunityIcons name="map-marker-outline" size={20} color="#fff" />
          <Text style={[styles.buttonText, styles.modernButtonText]}>
            {t('tracking.pickup_position', 'Pickup')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.floatingButtons}>
        {/* Chat Button */}
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleChatPress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="chat" size={24} color="#fff" />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Call Button */}
        <TouchableOpacity
          style={styles.callButton}
          onPress={handleCallPress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="phone" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );
};

export default MapControls;

