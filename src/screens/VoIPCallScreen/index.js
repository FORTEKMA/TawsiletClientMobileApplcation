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
  SafeAreaView,
  BackHandler,
} from 'react-native';
import Modal from 'react-native-modal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { RtcEngine, RtcLocalView, RtcRemoteView, VideoRenderMode, ChannelProfile, ClientRole } from 'react-native-agora';
import AgoraConfig from '../../utils/AgoraConfig';
 
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const VoIPCallScreen = ({
  visible,
  onClose,
  driverData,
  callType = 'outgoing', // 'outgoing' or 'incoming'
  onAccept,
  onDecline,
  onEndCall,
  route,
}) => {
  const { t } = useTranslation();
  
  // Extract route params if navigated directly
  const routeParams = route?.params || {};
  const finalDriverData = driverData || routeParams.driverData;
  const finalCallType = callType || routeParams.callType || 'outgoing';
  const isIncoming = routeParams.isIncoming || callType === 'incoming';
  const orderId = routeParams.orderId;

  // Call states
  const [callStatus, setCallStatus] = useState(isIncoming ? 'ringing' : 'connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(finalCallType === 'video');
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(false);
  const [remoteUid, setRemoteUid] = useState(null);
  const [callQuality, setCallQuality] = useState('HD');
  const [networkQuality, setNetworkQuality] = useState('excellent');

  // Agora Engine Reference
  const agoraEngineRef = useRef(null);
  const channelName = useRef(`tawsilet_${orderId || Date.now()}`);

  // Animation values
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const slideAnimation = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const avatarPulseAnimation = useRef(new Animated.Value(1)).current;
  const buttonScaleAnimation = useRef(new Animated.Value(1)).current;
  const rippleAnimation = useRef(new Animated.Value(0)).current;

  // Timer for call duration
  const timerRef = useRef(null);
  const callStartTime = useRef(null);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        handleEndCall();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [visible]);

  // Initialize Agora Engine
  useEffect(() => {
    if (visible) {
      initializeAgoraEngine();
      startRippleAnimation();
    }

    return () => {
      cleanupAgoraEngine();
    };
  }, [visible]);

  const initializeAgoraEngine = async () => {
    try {
      agoraEngineRef.current = await RtcEngine.create(routeParams.appId || AgoraConfig.AGORA_APP_ID);
      
      // Set up comprehensive event handlers
      agoraEngineRef.current.addListener("Warning", (warn) => {
        console.log("Agora Warning:", warn);
      });
      
      agoraEngineRef.current.addListener("Error", (err) => {
        console.error("Agora Error:", err);
        setCallStatus("error");
      });
      
      agoraEngineRef.current.addListener("JoinChannelSuccess", (channel, uid, elapsed) => {
        console.log("JoinChannelSuccess:", channel, uid, elapsed);
        setCallStatus("connected");
        callStartTime.current = Date.now();
      });
      
      agoraEngineRef.current.addListener("UserJoined", (uid, elapsed) => {
        console.log("UserJoined:", uid, elapsed);
        setRemoteUid(uid);
        if (isVideoEnabled) {
          setIsRemoteVideoEnabled(true);
        }
      });
      
      agoraEngineRef.current.addListener("UserOffline", (uid, reason) => {
        console.log("UserOffline:", uid, reason);
        setRemoteUid(null);
        setIsRemoteVideoEnabled(false);
        if (reason === 0) { // User left
          handleEndCall();
        }
      });
      
      agoraEngineRef.current.addListener("RemoteVideoStateChanged", (uid, state, reason, elapsed) => {
        console.log("RemoteVideoStateChanged:", uid, state, reason, elapsed);
        setIsRemoteVideoEnabled(state === 2);
      });
      
      agoraEngineRef.current.addListener("NetworkQuality", (uid, txQuality, rxQuality) => {
        const quality = Math.min(txQuality, rxQuality);
        const qualityMap = {
          1: "excellent",
          2: "good",
          3: "poor",
          4: "bad",
          5: "very_bad",
          6: "down"
        };
        setNetworkQuality(qualityMap[quality] || "unknown");
      });
      
      agoraEngineRef.current.addListener("RtcStats", (stats) => {
        // Update call quality based on stats
        if (stats.txKBitRate > 0 || stats.rxKBitRate > 0) {
          setCallQuality("HD");
        }
      });
      
      // Configure engine for optimal call quality
      await agoraEngineRef.current.setChannelProfile(ChannelProfile.Communication); // Communication
      await agoraEngineRef.current.setClientRole(ClientRole.Broadcaster); // Broadcaster
      await agoraEngineRef.current.enableAudio();
      await agoraEngineRef.current.setAudioProfile(AgoraConfig.AUDIO_PROFILE.SPEECH_STANDARD, AgoraConfig.AUDIO_SCENARIO.DEFAULT); // Speech standard
      await agoraEngineRef.current.enableAudioVolumeIndication(1000, 3, false);
      
      if (isVideoEnabled) {
        await agoraEngineRef.current.enableVideo();
        await agoraEngineRef.current.setVideoEncoderConfiguration({
          dimensions: { width: 640, height: 360 },
          frameRate: 15,
          bitrate: 400,
          orientationMode: 0,
        });
      }
      
      // Join channel
      const token = await AgoraConfig.getAgoraToken(channelName.current, 0); // In production, get from your server
      await agoraEngineRef.current.joinChannel(token, channelName.current, null, 0);
      
      console.log('Agora Engine initialized successfully');
      
      // Simulate connection for demo
      setTimeout(() => {
        if (callStatus === 'connecting') {
          setCallStatus('connected');
          callStartTime.current = Date.now();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Failed to initialize Agora Engine:', error);
      setCallStatus('error');
    }
  };

  const cleanupAgoraEngine = async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (agoraEngineRef.current) {
        await agoraEngineRef.current.leaveChannel();
        await agoraEngineRef.current.destroy();
        agoraEngineRef.current = null;
      }
      
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
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      if (isIncoming || callStatus === 'connecting') {
        startAvatarPulse();
      }
    } else {
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: screenHeight,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 0,
          duration: 300,
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
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(avatarPulseAnimation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopAvatarPulse = () => {
    avatarPulseAnimation.stopAnimation();
    avatarPulseAnimation.setValue(1);
  };

  const startRippleAnimation = () => {
    Animated.loop(
      Animated.timing(rippleAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const animateButton = (callback) => {
    Animated.sequence([
      Animated.timing(buttonScaleAnimation, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAcceptCall = async () => {
    animateButton(async () => {
      setCallStatus('connected');
      stopAvatarPulse();
      
      await initializeAgoraEngine();
      
      if (onAccept) onAccept();
    });
  };

  const handleDeclineCall = async () => {
    animateButton(async () => {
      setCallStatus('ended');
      stopAvatarPulse();
      
      await cleanupAgoraEngine();
      
      if (onDecline) onDecline();
      setTimeout(() => onClose && onClose(), 1000);
    });
  };

  const handleEndCall = async () => {
    animateButton(async () => {
      setCallStatus('ended');
      stopAvatarPulse();
      
      await cleanupAgoraEngine();
      
      if (onEndCall) onEndCall();
      setTimeout(() => onClose && onClose(), 1000);
    });
  };

  const toggleMute = async () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    if (agoraEngineRef.current) {
      await agoraEngineRef.current.muteLocalAudioStream(newMuteState);
    }
    
    console.log(`Audio ${newMuteState ? 'muted' : 'unmuted'} (placeholder)`);
  };

  const toggleSpeaker = async () => {
    const newSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerState);
    
    if (agoraEngineRef.current) {
      await agoraEngineRef.current.setEnableSpeakerphone(newSpeakerState);
    }
    
    console.log(`Speaker ${newSpeakerState ? 'enabled' : 'disabled'} (placeholder)`);
  };

  const toggleVideo = async () => {
    const newVideoState = !isVideoEnabled;
    setIsVideoEnabled(newVideoState);
    
    if (agoraEngineRef.current) {
      if (newVideoState) {
        await agoraEngineRef.current.enableLocalVideo(true);
        await agoraEngineRef.current.startPreview();
      } else {
        await agoraEngineRef.current.enableLocalVideo(false);
        await agoraEngineRef.current.stopPreview();
      }
    }
    
    console.log(`Video ${newVideoState ? 'enabled' : 'disabled'} (placeholder)`);
  };

  const switchCamera = async () => {
    if (agoraEngineRef.current && isVideoEnabled) {
      await agoraEngineRef.current.switchCamera();
    }
    
    console.log('Camera switched (placeholder)');
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return t('call.connecting', 'Connecting...');
      case 'ringing':
        return isIncoming 
          ? t('call.incoming_call', 'Incoming call') 
          : t('call.ringing', 'Ringing...');
      case 'connected':
        return formatCallDuration(callDuration);
      case 'ended':
        return t('call.call_ended', 'Call ended');
      case 'error':
        return t('call.connection_error', 'Connection error');
      default:
        return '';
    }
  };

  const getNetworkQualityIcon = () => {
    const qualityIcons = {
      excellent: 'signal-cellular-3',
      good: 'signal-cellular-2',
      poor: 'signal-cellular-1',
      bad: 'signal-cellular-outline',
      very_bad: 'signal-cellular-outline',
      down: 'signal-cellular-off',
    };
    return qualityIcons[networkQuality] || 'signal-cellular-3';
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
            <RtcRemoteView.SurfaceView
              style={styles.remoteVideo}
              uid={remoteUid}
              channelId={channelName.current}
              renderMode={VideoRenderMode.Hidden}
            />
            <View
              colors={['#667eea', '#764ba2']}
              style={styles.placeholderVideo}
            >
              <MaterialCommunityIcons name="video" size={60} color="rgba(255,255,255,0.7)" />
              <Text style={styles.placeholderText}>Remote Video</Text>
            </View>
          </View>
        )}
        
        {/* Local Video View */}
        {isVideoEnabled && (
          <View style={styles.localVideoContainer}>
            {/* NOTE: Actual Agora SDK would render local video here */}
            <RtcLocalView.SurfaceView
              style={styles.localVideo}
              channelId={channelName.current}
              renderMode={VideoRenderMode.Hidden}
            />
            <View
              colors={['#11998e', '#38ef7d']}
              style={styles.placeholderLocalVideo}
            >
              <MaterialCommunityIcons name="account-circle" size={40} color="rgba(255,255,255,0.8)" />
            </View>
            
            {/* Camera switch button */}
            <TouchableOpacity
              style={styles.switchCameraButton}
              onPress={switchCamera}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="camera-switch" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderRippleEffect = () => {
    if (callStatus !== 'ringing' && callStatus !== 'connecting') return null;

    return (
      <View style={styles.rippleContainer}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.ripple,
              {
                opacity: rippleAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 0],
                }),
                transform: [
                  {
                    scale: rippleAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 2],
                    }),
                  },
                ],
                animationDelay: index * 700,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderIncomingCallButtons = () => (
    <View style={styles.incomingButtonsContainer}>
      <Animated.View style={{ transform: [{ scale: buttonScaleAnimation }] }}>
        <TouchableOpacity
          style={[styles.callButton, styles.declineButton]}
          onPress={handleDeclineCall}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
      
      <Animated.View style={{ transform: [{ scale: buttonScaleAnimation }] }}>
        <TouchableOpacity
          style={[styles.callButton, styles.acceptButton]}
          onPress={handleAcceptCall}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="phone" size={32} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
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
            color={isMuted ? "#fff" : "#333"} 
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
            color={isSpeakerOn ? "#fff" : "#333"} 
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
            color={isVideoEnabled ? "#fff" : "#333"} 
          />
        </TouchableOpacity>
      </View>

      <Animated.View style={{ transform: [{ scale: buttonScaleAnimation }] }}>
        <TouchableOpacity
          style={[styles.callButton, styles.endCallButton]}
          onPress={handleEndCall}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="phone-hangup" size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const renderCallInfo = () => (
    <View style={styles.callInfoContainer}>
      <View style={styles.networkQualityContainer}>
        <MaterialIcons name={getNetworkQualityIcon()} size={16} color="#fff" />
        <Text style={styles.networkQualityText}>
          {callQuality}
        </Text>
      </View>
      
      {callStatus === 'connected' && (
        <View style={styles.encryptionContainer}>
          <MaterialCommunityIcons name="lock" size={14} color="#4CAF50" />
          <Text style={styles.encryptionText}>
            {t('call.encrypted', 'Encrypted')}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      isVisible={visible}
      style={styles.modal}
      backdropOpacity={1}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropTransitionInTiming={400}
      backdropTransitionOutTiming={300}
      onBackdropPress={null}
      onBackButtonPress={handleEndCall}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
      
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnimation }],
              opacity: fadeAnimation,
            },
          ]}
        >
          {/* Background gradient */}
          <View
           
            style={styles.backgroundGradient}
          />

          {/* Video Views */}
          {renderVideoView()}

          {/* Call Info */}
          {renderCallInfo()}

          {/* Driver Info */}
          {(!isVideoEnabled || !isRemoteVideoEnabled) && (
            <View style={styles.driverInfoContainer}>
              {renderRippleEffect()}
              
              <Animated.View
                style={[
                  styles.avatarContainer,
                  {
                    transform: [{ scale: avatarPulseAnimation }],
                  },
                ]}
              >
                <Image
                  source={{ 
                    uri: finalDriverData?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
                  }}
                  style={styles.driverAvatar}
                />
                {callStatus === 'connected' && (
                  <View style={styles.connectedIndicator}>
                    <View style={styles.connectedDot} />
                  </View>
                )}
              </Animated.View>

              <Text style={styles.driverName}>
                {finalDriverData?.name || t('call.driver', 'Driver')}
              </Text>
              
              <Text style={styles.driverInfo}>
                {finalDriverData?.vehicle_info || t('call.taxi_driver', 'Taxi Driver')}
              </Text>

              <View style={styles.ratingContainer}>
                <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
                <Text style={styles.rating}>
                  {finalDriverData?.rating || '4.8'}
                </Text>
              </View>
            </View>
          )}

          {/* Call Status */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              {getStatusText()}
            </Text>
            {callStatus === 'error' && (
              <Text style={styles.errorText}>
                {t('call.check_connection', 'Please check your connection')}
              </Text>
            )}
          </View>

          {/* Call Controls */}
          <View style={styles.controlsContainer}>
            {isIncoming && callStatus !== 'connected' && callStatus !== 'ended'
              ? renderIncomingCallButtons()
              : renderConnectedCallButtons()
            }
          </View>

          {/* Configuration Notice */}
          <View style={styles.configNotice}>
            <MaterialCommunityIcons name="information-outline" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.configNoticeText}>
              {t('call.demo_mode', 'Demo Mode - Configure Agora SDK for production')}
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    backgroundColor: '#1a1a2e',
  },
  remoteVideo: {
    flex: 1,
  },
  placeholderVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
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
    borderColor: 'rgba(255,255,255,0.3)',
  },
  localVideo: {
    flex: 1,
  },
  placeholderLocalVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchCameraButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callInfoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  networkQualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  networkQualityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  encryptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  encryptionText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  rippleContainer: {
    position: 'absolute',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  driverInfoContainer: {
    alignItems: 'center',
    marginTop: 80,
    zIndex: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  driverAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  connectedIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  driverName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  driverInfo: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  rating: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF5722',
    textAlign: 'center',
    marginTop: 8,
  },
  controlsContainer: {
    marginBottom: 40,
  },
  incomingButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  connectedButtonsContainer: {
    alignItems: 'center',
    gap: 32,
  },
  controlButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeControlButton: {
    backgroundColor: 'rgba(244,67,54,0.9)',
    borderColor: 'rgba(244,67,54,0.3)',
  },
  callButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
  configNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    gap: 8,
  },
  configNoticeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default VoIPCallScreen;

