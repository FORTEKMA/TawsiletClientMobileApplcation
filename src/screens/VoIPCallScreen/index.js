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
  Platform,
} from 'react-native';
import Modal from 'react-native-modal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useTranslation } from 'react-i18next';

// NOTE: Agora SDK integration would be imported here
// import { RtcEngine, RtcLocalView, RtcRemoteView, VideoRenderMode } from 'react-native-agora';

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
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(false);
  const [remoteUid, setRemoteUid] = useState(null);

  // Agora Engine Reference (would be initialized with actual Agora SDK)
  const agoraEngineRef = useRef(null);

  // Animation values
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const slideAnimation = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const avatarPulseAnimation = useRef(new Animated.Value(1)).current;

  // Timer for call duration
  const timerRef = useRef(null);
  const callStartTime = useRef(null);

  // Initialize Agora Engine (Placeholder - would use actual Agora SDK)
  useEffect(() => {
    if (visible) {
      initializeAgoraEngine();
    }

    return () => {
      cleanupAgoraEngine();
    };
  }, [visible]);

  const initializeAgoraEngine = async () => {
    try {
      // NOTE: This is a placeholder for actual Agora SDK initialization
      // Actual implementation would be:
      /*
      const engine = await RtcEngine.create('YOUR_AGORA_APP_ID_HERE');
      agoraEngineRef.current = engine;
      
      // Set up event handlers
      engine.addListener('Warning', (warn) => {
        console.log('Agora Warning', warn);
      });
      
      engine.addListener('Error', (err) => {
        console.log('Agora Error', err);
      });
      
      engine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
        console.log('JoinChannelSuccess', channel, uid, elapsed);
        setCallStatus('connected');
      });
      
      engine.addListener('UserJoined', (uid, elapsed) => {
        console.log('UserJoined', uid, elapsed);
        setRemoteUid(uid);
      });
      
      engine.addListener('UserOffline', (uid, reason) => {
        console.log('UserOffline', uid, reason);
        setRemoteUid(null);
      });
      
      engine.addListener('RemoteVideoStateChanged', (uid, state, reason, elapsed) => {
        console.log('RemoteVideoStateChanged', uid, state, reason, elapsed);
        setIsRemoteVideoEnabled(state === 2); // 2 means video is enabled
      });
      
      // Configure engine
      await engine.enableAudio();
      await engine.setChannelProfile(1); // 1 for communication
      await engine.setClientRole(1); // 1 for broadcaster
      
      // Join channel
      const channelName = `call_${Date.now()}`;
      const token = null; // In production, generate token from your server
      await engine.joinChannel(token, channelName, null, 0);
      */
      
      console.log('Agora Engine initialized (placeholder)');
    } catch (error) {
      console.error('Failed to initialize Agora Engine:', error);
    }
  };

  const cleanupAgoraEngine = async () => {
    try {
      // NOTE: This is a placeholder for actual Agora SDK cleanup
      // Actual implementation would be:
      /*
      if (agoraEngineRef.current) {
        await agoraEngineRef.current.leaveChannel();
        await agoraEngineRef.current.destroy();
        agoraEngineRef.current = null;
      }
      */
      
      console.log('Agora Engine cleaned up (placeholder)');
    } catch (error) {
      console.error('Failed to cleanup Agora Engine:', error);
    }
  };

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

  const handleAcceptCall = async () => {
    setCallStatus('connected');
    stopAvatarPulse();
    
    // Initialize Agora connection for incoming call
    await initializeAgoraEngine();
    
    if (onAccept) onAccept();
  };

  const handleDeclineCall = async () => {
    setCallStatus('ended');
    stopAvatarPulse();
    
    await cleanupAgoraEngine();
    
    if (onDecline) onDecline();
    setTimeout(() => onClose(), 1000);
  };

  const handleEndCall = async () => {
    setCallStatus('ended');
    stopAvatarPulse();
    
    await cleanupAgoraEngine();
    
    if (onEndCall) onEndCall();
    setTimeout(() => onClose(), 1000);
  };

  const toggleMute = async () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    // NOTE: Actual Agora SDK integration would be:
    /*
    if (agoraEngineRef.current) {
      await agoraEngineRef.current.muteLocalAudioStream(newMuteState);
    }
    */
    
    console.log(`Audio ${newMuteState ? 'muted' : 'unmuted'} (placeholder)`);
  };

  const toggleSpeaker = async () => {
    const newSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerState);
    
    // NOTE: Actual Agora SDK integration would be:
    /*
    if (agoraEngineRef.current) {
      await agoraEngineRef.current.setEnableSpeakerphone(newSpeakerState);
    }
    */
    
    console.log(`Speaker ${newSpeakerState ? 'enabled' : 'disabled'} (placeholder)`);
  };

  const toggleVideo = async () => {
    const newVideoState = !isVideoEnabled;
    setIsVideoEnabled(newVideoState);
    
    // NOTE: Actual Agora SDK integration would be:
    /*
    if (agoraEngineRef.current) {
      if (newVideoState) {
        await agoraEngineRef.current.enableLocalVideo(true);
        await agoraEngineRef.current.startPreview();
      } else {
        await agoraEngineRef.current.enableLocalVideo(false);
        await agoraEngineRef.current.stopPreview();
      }
    }
    */
    
    console.log(`Video ${newVideoState ? 'enabled' : 'disabled'} (placeholder)`);
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

  const renderVideoView = () => {
    if (!isVideoEnabled && !isRemoteVideoEnabled) {
      return null;
    }

    return (
      <View style={styles.videoContainer}>
        {/* Remote Video View */}
        {isRemoteVideoEnabled && remoteUid && (
          <View style={styles.remoteVideoContainer}>
            {/* NOTE: Actual Agora SDK would render remote video here */}
            {/* <RtcRemoteView.SurfaceView
              style={styles.remoteVideo}
              uid={remoteUid}
              channelId={channelName}
              renderMode={VideoRenderMode.Hidden}
            /> */}
            <View style={styles.placeholderVideo}>
              <Text style={styles.placeholderText}>Remote Video</Text>
            </View>
          </View>
        )}
        
        {/* Local Video View */}
        {isVideoEnabled && (
          <View style={styles.localVideoContainer}>
            {/* NOTE: Actual Agora SDK would render local video here */}
            {/* <RtcLocalView.SurfaceView
              style={styles.localVideo}
              channelId={channelName}
              renderMode={VideoRenderMode.Hidden}
            /> */}
            <View style={styles.placeholderLocalVideo}>
              <Text style={styles.placeholderText}>Local Video</Text>
            </View>
          </View>
        )}
      </View>
    );
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
      <View style={styles.controlButtonsRow}>
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
      </View>

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

        {/* Video Views */}
        {renderVideoView()}

        {/* Driver Info */}
        {(!isVideoEnabled || !isRemoteVideoEnabled) && (
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
        )}

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

        {/* Configuration Notice */}
        <View style={styles.configNotice}>
          <Text style={styles.configNoticeText}>
            {t('call.config_notice', 'Configure Agora App ID in VoIPManager.js')}
          </Text>
        </View>
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
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  remoteVideoContainer: {
    flex: 1,
  },
  remoteVideo: {
    flex: 1,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  localVideo: {
    flex: 1,
  },
  placeholderVideo: {
    flex: 1,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderLocalVideo: {
    flex: 1,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
  controlButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
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
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
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
  configNotice: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
    borderRadius: 8,
    padding: 12,
  },
  configNoticeText: {
    fontSize: hp(1.4),
    color: '#000',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default VoIPCallScreen;

