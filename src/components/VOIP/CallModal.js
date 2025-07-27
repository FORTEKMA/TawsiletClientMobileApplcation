import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  BackHandler,
} from 'react-native';
import { colors } from '../../utils/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useTranslation } from 'react-i18next';
import VoipManager from './VoipManager';
import LottieView from 'lottie-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CallModal = ({ 
  visible, 
  onClose, 
  callType = 'outgoing', // 'outgoing' or 'incoming'
  contactName = 'Driver',
  channelName,
  token,
  uid,
  appId,
}) => {
  const { t } = useTranslation();
  const [callState, setCallState] = useState('connecting'); // 'connecting', 'connected', 'ended'
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const durationInterval = useRef(null);

  useEffect(() => {
    if (visible) {
      // Initialize Agora if not already done
      initializeVoip();
      
      // Animate modal in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Start pulse animation for connecting state
      startPulseAnimation();

      // Handle back button
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

      return () => {
        backHandler.remove();
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
  }, [visible]);

  useEffect(() => {
    // Set up VOIP event listeners
    const handleJoinChannelSuccess = () => {
      setCallState('connected');
      setIsCallActive(true);
      startDurationTimer();
      stopPulseAnimation();
    };

    const handleUserJoined = () => {
      setCallState('connected');
      setIsCallActive(true);
      startDurationTimer();
      stopPulseAnimation();
    };

    const handleUserOffline = () => {
      endCall();
    };

    const handleLeaveChannel = () => {
      setCallState('ended');
      setIsCallActive(false);
      stopDurationTimer();
      stopPulseAnimation();
    };

    const handleError = (data) => {
      console.error('Call error:', data);
      endCall();
    };

    VoipManager.addEventListener('onJoinChannelSuccess', handleJoinChannelSuccess);
    VoipManager.addEventListener('onUserJoined', handleUserJoined);
    VoipManager.addEventListener('onUserOffline', handleUserOffline);
    VoipManager.addEventListener('onLeaveChannel', handleLeaveChannel);
    VoipManager.addEventListener('onError', handleError);

    return () => {
      VoipManager.removeEventListener('onJoinChannelSuccess', handleJoinChannelSuccess);
      VoipManager.removeEventListener('onUserJoined', handleUserJoined);
      VoipManager.removeEventListener('onUserOffline', handleUserOffline);
      VoipManager.removeEventListener('onLeaveChannel', handleLeaveChannel);
      VoipManager.removeEventListener('onError', handleError);
    };
  }, []);

  const initializeVoip = async () => {
    try {
      await VoipManager.initialize(appId);
      
      if (callType === 'outgoing') {
        await VoipManager.startCall(channelName, token, uid);
      }
    } catch (error) {
      console.error('Failed to initialize VOIP:', error);
      endCall();
    }
  };

  const startPulseAnimation = () => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulse).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const startDurationTimer = () => {
    durationInterval.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBackPress = () => {
    // Prevent back button from closing the modal during active call
    return isCallActive;
  };

  const answerCall = async () => {
    try {
      await VoipManager.answerCall(channelName, token, uid);
    } catch (error) {
      console.error('Failed to answer call:', error);
      endCall();
    }
  };

  const endCall = async () => {
    try {
      await VoipManager.endCall();
      stopDurationTimer();
      stopPulseAnimation();
      setCallState('ended');
      setIsCallActive(false);
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Failed to end call:', error);
      onClose();
    }
  };

  const toggleMute = async () => {
    try {
      const muted = await VoipManager.toggleMute();
      setIsMuted(muted);
    } catch (error) {
      console.error('Failed to toggle mute:', error);
    }
  };

  const toggleSpeaker = async () => {
    try {
      const speakerOn = await VoipManager.toggleSpeaker();
      setIsSpeakerOn(speakerOn);
    } catch (error) {
      console.error('Failed to toggle speaker:', error);
    }
  };

  const getCallStatusText = () => {
    switch (callState) {
      case 'connecting':
        return callType === 'outgoing' ? t('call.calling') : t('call.incoming_call');
      case 'connected':
        return formatDuration(duration);
      case 'ended':
        return t('call.call_ended');
      default:
        return '';
    }
  };

  const renderCallActions = () => {
    if (callType === 'incoming' && callState === 'connecting') {
      return (
        <View style={styles.incomingActions}>
          <TouchableOpacity style={styles.declineButton} onPress={endCall}>
            <MaterialIcons name="call-end" size={32} color={colors.textInverse} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.answerButton} onPress={answerCall}>
            <MaterialIcons name="call" size={32} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      );
    }

    if (callState === 'connected') {
      return (
        <View style={styles.callActions}>
          <TouchableOpacity 
            style={[styles.actionButton, isMuted && styles.activeActionButton]} 
            onPress={toggleMute}
          >
            <MaterialIcons 
              name={isMuted ? "mic-off" : "mic"} 
              size={24} 
              color={isMuted ? colors.textInverse : colors.textSecondary} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
            <MaterialIcons name="call-end" size={32} color={colors.textInverse} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, isSpeakerOn && styles.activeActionButton]} 
            onPress={toggleSpeaker}
          >
            <MaterialIcons 
              name={isSpeakerOn ? "volume-up" : "volume-down"} 
              size={24} 
              color={isSpeakerOn ? colors.textInverse : colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      );
    }

    if (callState === 'connecting' && callType === 'outgoing') {
      return (
        <View style={styles.outgoingActions}>
          <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
            <MaterialIcons name="call-end" size={32} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleBackPress}
    >
      <StatusBar backgroundColor={colors.uberBlack} barStyle="light-content" />
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.contactName}>{contactName}</Text>
            <Text style={styles.callStatus}>{getCallStatusText()}</Text>
          </View>

          <View style={styles.avatarContainer}>
            <Animated.View
              style={[
                styles.avatar,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <MaterialIcons name="person" size={80} color={colors.textInverse} />
            </Animated.View>
            
            {callState === 'connecting' && (
              <View style={styles.connectingIndicator}>
                <LottieView
                  source={require('../../assets/animations/calling.json')}
                  autoPlay
                  loop
                  style={styles.callingAnimation}
                />
              </View>
            )}
          </View>

          <View style={styles.actionsContainer}>
            {renderCallActions()}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.uberBlack,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  contactName: {
    fontSize: hp(3.2),
    fontWeight: '700',
    color: colors.textInverse,
    marginBottom: 8,
  },
  callStatus: {
    fontSize: hp(2),
    color: colors.textInverse,
    opacity: 0.8,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  connectingIndicator: {
    position: 'absolute',
    width: 200,
    height: 200,
  },
  callingAnimation: {
    width: 200,
    height: 200,
  },
  actionsContainer: {
    alignItems: 'center',
  },
  callActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  incomingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '60%',
  },
  outgoingActions: {
    alignItems: 'center',
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeActionButton: {
    backgroundColor: colors.uberBlue,
    borderColor: colors.uberBlue,
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  answerButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  declineButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default CallModal;

