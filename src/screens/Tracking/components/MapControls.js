import React, { useState, useEffect } from 'react';
import { Pressable, Text, View, TouchableOpacity, Animated } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles } from '../styles';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import VoIPCallScreen from '../../../screens/VoIPCallScreen';
import voipManager from '../../../utils/VoIPManager';

const MapControls = ({
  onDriverPosition,
  onDropPosition,
  onPickupPosition,
  driverData,
  requestId,
}) => {
  const { t } = useTranslation();
  const user = useSelector(state => state.user.currentUser);
  const navigation = useNavigation();
  const [showCall, setShowCall] = useState(false);
  const [callType, setCallType] = useState("outgoing");
  const [currentCallId, setCurrentCallId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize VoIP manager
  useEffect(() => {
    if (user?.id) {
      voipManager.initialize(user.id, 'user');
      
      // Set incoming call handler
      voipManager.setIncomingCallHandler((callId, callData) => {
        setCurrentCallId(callId);
        setCallType('incoming');
        setShowCall(true);
      });

      // Set call status change handler
      voipManager.setCallStatusChangeHandler((status, callData) => {
        if (status === 'ended' || status === 'declined') {
          setShowCall(false);
          setCurrentCallId(null);
        }
      });
    }

    return () => {
      voipManager.cleanup();
    };
  }, [user?.id]);

  const handleChatPress = () => {
    navigation.navigate('ChatScreen', {
      driverData,
      requestId,
      userType: 'user'
    });
  };

  const handleCallPress = async () => {
    if (!driverData || !requestId) return;

    try {
      const callerData = {
        id: user.id,
        name: user.name || 'User',
        avatar: user.avatar,
      };

      const { callId } = await voipManager.initiateCall(
        driverData.id,
        'driver',
        requestId,
        callerData
      );

      setCurrentCallId(callId);
      setCallType('outgoing');
      setShowCall(true);
    } catch (error) {
      console.error('Error initiating call:', error);
    }
  };

  const handleAcceptCall = async () => {
    if (currentCallId) {
      await voipManager.acceptCall(currentCallId);
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

      {/* VoIP Call Screen */}
      <VoIPCallScreen
        visible={showCall}
        onClose={() => {
          setShowCall(false);
          setCurrentCallId(null);
        }}
        driverData={driverData}
        callType={callType}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
        onEndCall={handleEndCall}
      />
    </>
  );
};

export default MapControls;

