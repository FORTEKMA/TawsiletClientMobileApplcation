import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import Modal from 'react-native-modal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useTranslation } from 'react-i18next';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const VoIPCallScreen = ({
  visible,
  onClose,
  driverData,
  callType = 'outgoing', // 'outgoing' or 'incoming'
  onAccept,
  onDecline,
  onEndCall,
}) => {
  const { t } = useTranslation();
  const [callStatus, setCallStatus] = useState('connecting'); // 'connecting', 'ringing', 'connected', 'ended'
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);

  // Animation values
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const slideAnimation = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const avatarPulseAnimation = useRef(new Animated.Value(1)).current;

  // Timer for call duration
  const timerRef = useRef(null);
  const callStartTime = useRef(null);

  // Initialize animations
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

      // Start avatar pulse animation for incoming/connecting calls
      if (callType === 'incoming' || callStatus === 'connecting') {
        startAvatarPulse();
      }
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

  // Start call duration timer when connected
  useEffect(() => {
    if (callStatus === 'connected' && !timerRef.current) {
      callStartTime.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime.current) / 1000);
        setCallDuration(elapsed);
      }, 1000);
    } else if (callStatus !== 'connected' && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callStatus]);

  const startAvatarPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(avatarPulseAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(avatarPulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopAvatarPulse = () => {
    avatarPulseAnimation.stopAnimation();
    avatarPulseAnimation.setValue(1);
  };

  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAcceptCall = () => {
    setCallStatus('connected');
    stopAvatarPulse();
    if (onAccept) onAccept();
  };

  const handleDeclineCall = () => {
    setCallStatus('ended');
    stopAvatarPulse();
    if (onDecline) onDecline();
    setTimeout(() => onClose(), 1000);
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    stopAvatarPulse();
    if (onEndCall) onEndCall();
    setTimeout(() => onClose(), 1000);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Here you would integrate with Agora SDK to mute/unmute audio
    // Example: rtcEngine.muteLocalAudioStream(!isMuted);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Here you would integrate with Agora SDK to toggle speaker
    // Example: rtcEngine.setEnableSpeakerphone(!isSpeakerOn);
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    // Here you would integrate with Agora SDK to enable/disable video
    // Example: rtcEngine.enableLocalVideo(!isVideoEnabled);
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return t('call.connecting', 'Connecting...');
      case 'ringing':
        return callType === 'incoming' 
          ? t('call.incoming_call', 'Incoming call') 
          : t('call.ringing', 'Ringing...');
      case 'connected':
        return formatCallDuration(callDuration);
      case 'ended':
        return t('call.call_ended', 'Call ended');
      default:
        return '';
    }
  };

  const renderIncomingCallButtons = () => (
    <View style={styles.incomingButtonsContainer}>
      <TouchableOpacity
        style={[styles.callButton, styles.declineButton]}
        onPress={handleDeclineCall}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.callButton, styles.acceptButton]}
        onPress={handleAcceptCall}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="phone" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderConnectedCallButtons = () => (
    <View style={styles.connectedButtonsContainer}>
      <TouchableOpacity
        style={[styles.controlButton, isMuted && styles.activeControlButton]}
        onPress={toggleMute}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons 
          name={isMuted ? "microphone-off" : "microphone"} 
          size={24} 
          color={isMuted ? "#fff" : "#000"} 
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlButton, isSpeakerOn && styles.activeControlButton]}
        onPress={toggleSpeaker}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons 
          name={isSpeakerOn ? "volume-high" : "volume-medium"} 
          size={24} 
          color={isSpeakerOn ? "#fff" : "#000"} 
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlButton, isVideoEnabled && styles.activeControlButton]}
        onPress={toggleVideo}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons 
          name={isVideoEnabled ? "video" : "video-off"} 
          size={24} 
          color={isVideoEnabled ? "#fff" : "#000"} 
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.callButton, styles.endCallButton]}
        onPress={handleEndCall}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="phone-hangup" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      isVisible={visible}
      style={styles.modal}
      backdropOpacity={0.9}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropTransitionInTiming={300}
      backdropTransitionOutTiming={250}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnimation }],
            opacity: fadeAnimation,
          },
        ]}
      >
        {/* Background gradient effect */}
        <View style={styles.backgroundGradient} />

        {/* Driver Info */}
        <View style={styles.driverInfoContainer}>
          <Animated.View
            style={[
              styles.avatarContainer,
              {
                transform: [{ scale: avatarPulseAnimation }],
              },
            ]}
          >
            <Image
              source={{ uri: driverData?.avatar || 'https://via.placeholder.com/150' }}
              style={styles.driverAvatar}
            />
            {callStatus === 'connected' && (
              <View style={styles.connectedIndicator}>
                <View style={styles.connectedDot} />
              </View>
            )}
          </Animated.View>

          <Text style={styles.driverName}>
            {driverData?.name || t('call.driver', 'Driver')}
          </Text>
          
          <Text style={styles.driverInfo}>
            {driverData?.vehicle_info || t('call.taxi_driver', 'Taxi Driver')}
          </Text>

          <View style={styles.ratingContainer}>
            <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>
              {driverData?.rating || '4.8'}
            </Text>
          </View>
        </View>

        {/* Call Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {getStatusText()}
          </Text>
        </View>

        {/* Call Controls */}
        <View style={styles.controlsContainer}>
          {callType === 'incoming' && callStatus !== 'connected' && callStatus !== 'ended'
            ? renderIncomingCallButtons()
            : renderConnectedCallButtons()
          }
        </View>

        {/* Additional Info */}
        {callStatus === 'connected' && (
          <View style={styles.additionalInfo}>
            <Text style={styles.callQuality}>
              {t('call.hd_quality', 'HD Quality')}
            </Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  driverInfoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  driverAvatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  connectedIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  driverName: {
    fontSize: hp(3),
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  driverInfo: {
    fontSize: hp(1.8),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rating: {
    color: '#fff',
    fontSize: hp(1.6),
    fontWeight: '600',
    marginLeft: 4,
  },
  statusContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  statusText: {
    fontSize: hp(2.2),
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textAlign: 'center',
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  incomingButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: wp(60),
  },
  connectedButtonsContainer: {
    alignItems: 'center',
  },
  callButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  endCallButton: {
    backgroundColor: '#F44336',
    marginTop: 30,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
    marginBottom: 20,
  },
  activeControlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  additionalInfo: {
    alignItems: 'center',
  },
  callQuality: {
    fontSize: hp(1.4),
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
});

export default VoIPCallScreen;

