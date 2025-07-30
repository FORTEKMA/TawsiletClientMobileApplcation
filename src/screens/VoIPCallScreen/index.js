import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  Image,
  StatusBar,
  Platform,
  SafeAreaView,
  BackHandler,
} from 'react-native';
import styles from './styles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createAgoraEngine } from "../../utils/AgoraConfig"
import { useSelector } from 'react-redux';
import {
  sendVoIPCallNotification,
  generateVoIPChannelName,
  validateVoIPCallParams
} from '../../utils/VoIPManager';

import { useTranslation } from 'react-i18next';
import RNCallKeep from 'react-native-callkeep';

// Import Agora SDK with error handling
let RtcLocalView, RtcRemoteView, VideoRenderMode;

try {
  const AgoraSDK = require('react-native-agora');
  RtcLocalView = AgoraSDK.RtcLocalView;
  RtcRemoteView = AgoraSDK.RtcRemoteView;
  VideoRenderMode = AgoraSDK.VideoRenderMode;
} catch (error) {
  RtcLocalView = null;
  RtcRemoteView = null;
  VideoRenderMode = { Hidden: 1 };
}

import {
  isAgoraSDKAvailable,
  getAgoraToken,
  getPlatformAudioConfig,
  CHANNEL_PROFILE,
  CLIENT_ROLE,
  VIDEO_ENCODER_CONFIG
} from '../../utils/AgoraConfig';
import { useNavigation } from '@react-navigation/native';
 
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Global Agora engine instance to prevent multiple initializations
let globalAgoraEngine = null;
let globalEngineInitialized = false;

const VoIPCallScreen = ({ route }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const currentUser = useSelector(state => state.user?.currentUser);
  
  // Extract route params
  const routeParams = route?.params || {};
  const finalDriverData = routeParams.driverData || {};
  const finalCallType = routeParams.callType || 'voice';
  const isIncoming = routeParams.isIncoming || false;
  const orderId = routeParams.orderId;
  const orderData = routeParams.orderData || {};
  const callUUID = routeParams.callUUID;
  const incomingChannelName = routeParams.channelName;
  const incomingCaller = routeParams.caller;

  // Call states
  const [callStatus, setCallStatus] = useState('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(finalCallType === 'video');
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(false);
  const [remoteUid, setRemoteUid] = useState(null);
  const [callQuality, setCallQuality] = useState('HD');
  const [networkQuality, setNetworkQuality] = useState('excellent');

  // Agora Engine Reference
  const agoraEngineRef = useRef(globalAgoraEngine);
  const channelName = useRef(incomingChannelName || `tawsilet_${orderId || Date.now()}`);

  // Animation values
  const slideAnimation = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const avatarPulseAnimation = useRef(new Animated.Value(1)).current;
  const buttonScaleAnimation = useRef(new Animated.Value(1)).current;

  // Timer for call duration
  const timerRef = useRef(null);
  const callStartTime = useRef(null);

  // Track component mount/unmount
  const componentMounted = useRef(true);

  useEffect(() => {
    componentMounted.current = true;
    
    if (callUUID) {
      RNCallKeep.setCurrentCallActive(callUUID);
    }
    
    return () => {
      componentMounted.current = false;
    };
  }, [callUUID]);

  // Track back button events
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (callStatus === 'connected' || callStatus === 'connecting') {
        return true; // Prevent default
      }
      return false; // Allow default
    });

    return () => {
      backHandler.remove();
    };
  }, [callStatus]);

  // Generate unique channel name for this call
  const generateCallChannelName = () => {
    if (incomingChannelName && isIncoming) {
      channelName.current = incomingChannelName;
      return channelName.current;
    }
    
    if (!channelName.current || channelName.current === `tawsilet_${orderId || Date.now()}`) {
      channelName.current = generateVoIPChannelName(
        orderId || 'temp',
        finalDriverData?.id || 'driver',
        currentUser?.id || 'user'
      );
    }
    return channelName.current;
  };

  // Initialize Agora Engine
  useEffect(() => {
    // For incoming calls, accept the call
    if (isIncoming) {
      acceptIncomingCall();
    } else {
      // For outgoing calls, initialize engine and send notification
      initializeAgoraEngine();
      
      if (finalDriverData?.id) {
        const callParams = {
          driverId: finalDriverData.id,
          callType: isVideoEnabled ? 'video' : 'voice',
          caller: {
            id: currentUser?.id,
            firstName: currentUser?.firstName,
            lastName: currentUser?.lastName,
            phoneNumber: currentUser?.phoneNumber,
          },
          channelName: generateCallChannelName(),
          orderData: orderData,
        };
        
        if (validateVoIPCallParams(callParams)) {
          sendVoIPCallNotification(callParams)
            .catch(error => {
              console.error('Failed to send initial call notification:', error);
            });
        }
      }
    }

    return () => {
      // Ensure cleanup when component unmounts
      if (componentMounted.current) {
        cleanupAgoraEngine();
      }
    };
  }, []);

  const initializeAgoraEngine = async () => {
    try {
      if (!isAgoraSDKAvailable()) {
        setCallStatus('connected');
        callStartTime.current = Date.now();
        return;
      }
 
      // Always create a fresh engine instance for new calls
      // This ensures clean state and prevents conflicts
      if (globalAgoraEngine) {
        try {
          await globalAgoraEngine.release();
        } catch (releaseError) {
          console.log('Error releasing previous engine:', releaseError);
        }
        globalAgoraEngine = null;
        globalEngineInitialized = false;
      }
      
      agoraEngineRef.current = await createAgoraEngine();
      globalAgoraEngine = agoraEngineRef.current;
      globalEngineInitialized = true;
       
      // Set up event handlers
      agoraEngineRef.current.addListener("Error", (err) => {
        console.error('Agora Error:', err);
        setCallStatus("error");
      });
      
      agoraEngineRef.current.addListener("JoinChannelSuccess", (channel, uid, elapsed) => {
        setCallStatus("connected");
        callStartTime.current = Date.now();
      });
      
      agoraEngineRef.current.addListener("UserJoined", (uid, elapsed) => {
        setRemoteUid(uid);
        if (isVideoEnabled) {
          setIsRemoteVideoEnabled(true);
        }
      });
      
      agoraEngineRef.current.addListener("UserOffline", (uid, reason) => {
        setRemoteUid(null);
        setIsRemoteVideoEnabled(false);
        if (reason === 0) {
          handleEndCall();
        }
      });
      
      agoraEngineRef.current.addListener("RemoteVideoStateChanged", (uid, state, reason, elapsed) => {
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
        if (stats.txKBitRate > 0 || stats.rxKBitRate > 0) {
          setCallQuality("HD");
        }
      });
      
      // Configure engine settings
      const audioConfig = getPlatformAudioConfig();
      
      await agoraEngineRef.current.setChannelProfile(CHANNEL_PROFILE.COMMUNICATION);
      await agoraEngineRef.current.setClientRole(CLIENT_ROLE.BROADCASTER);
      await agoraEngineRef.current.enableAudio();
      await agoraEngineRef.current.setAudioProfile(
        audioConfig.audioProfile,
        audioConfig.audioScenario
      );
      await agoraEngineRef.current.enableAudioVolumeIndication(
        audioConfig.audioVolumeIndicationInterval,
        3,
        false
      );
      
      if (isVideoEnabled) {
        await agoraEngineRef.current.enableVideo();
        const videoConfig = VIDEO_ENCODER_CONFIG.MOBILE_OPTIMIZED;
        await agoraEngineRef.current.setVideoEncoderConfiguration(videoConfig);
      }
      
      const uniqueChannelName = generateCallChannelName();
      const token = await getAgoraToken(uniqueChannelName, 0);
      
      const mediaOptions = {
        clientRoleType: CLIENT_ROLE.BROADCASTER,
        channelProfile: CHANNEL_PROFILE.COMMUNICATION,
        publishCameraTrack: isVideoEnabled,
        publishMicrophoneTrack: true,
        autoSubscribeAudio: true,
        autoSubscribeVideo: isVideoEnabled,
      };
      
      await agoraEngineRef.current.joinChannel(token, uniqueChannelName, 0, mediaOptions);
      
    } catch (error) {
      console.error('Agora initialization error:', error);
      setCallStatus('error');
    }
  };

  const cleanupAgoraEngine = async () => {
    try {
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Leave channel and release engine
      if (agoraEngineRef.current) {
        try {
          const leaveChannelOptions = {
            stopAudioMixing: true,
            stopAllEffect: true,
            stopMicrophoneRecording: true,
          };
          
          await agoraEngineRef.current.leaveChannel(leaveChannelOptions);
          console.log('Successfully left Agora channel');
        } catch (leaveError) {
          console.error('Error leaving channel:', leaveError);
        }
        
        try {
          // Release the engine to free up resources
          await agoraEngineRef.current.release();
          console.log('Successfully released Agora engine');
        } catch (releaseError) {
          console.error('Error releasing engine:', releaseError);
        }
        
        // Clear global references
        agoraEngineRef.current = null;
        globalAgoraEngine = null;
        globalEngineInitialized = false;
      }
    } catch (error) {
      console.error('Error during Agora cleanup:', error);
    } finally {
      // Ensure references are cleared even if errors occur
      agoraEngineRef.current = null;
      globalAgoraEngine = null;
      globalEngineInitialized = false;
    }
  };

  // Initialize animations
  useEffect(() => {
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

    if (callStatus === 'connecting') {
      startAvatarPulse();
    }
  }, []);

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

  const handleEndCall = async () => {
    animateButton(async () => {
      setCallStatus('ended');
      stopAvatarPulse();
      
      if (callUUID) {
        RNCallKeep.endCall(callUUID);
      }

      // Ensure complete cleanup
      await cleanupAgoraEngine();
      
      // Navigate back after cleanup
      if (componentMounted.current) {
        navigation.goBack();
      }
    });
  };

  const toggleMute = async () => {
    if (agoraEngineRef.current) {
      const newMutedState = !isMuted;
      await agoraEngineRef.current.muteLocalAudioStream(newMutedState);
      setIsMuted(newMutedState);
    }
  };

  const toggleSpeaker = async () => {
    if (agoraEngineRef.current) {
      const newSpeakerState = !isSpeakerOn;
      await agoraEngineRef.current.setEnableSpeakerphone(newSpeakerState);
      setIsSpeakerOn(newSpeakerState);
    }
  };

  const toggleVideo = async () => {
    if (agoraEngineRef.current) {
      const newVideoState = !isVideoEnabled;
      await agoraEngineRef.current.enableLocalVideo(newVideoState);
      setIsVideoEnabled(newVideoState);
    }
  };

  const getCallerName = () => {
    if (isIncoming && incomingCaller) {
      if (incomingCaller.firstName && incomingCaller.lastName) {
        return `${incomingCaller.firstName} ${incomingCaller.lastName}`;
      } else if (incomingCaller.firstName) {
        return incomingCaller.firstName;
      }
    }
    
    if (finalDriverData?.firstName && finalDriverData?.lastName) {
      return `${finalDriverData.firstName} ${finalDriverData.lastName}`;
    } else if (finalDriverData?.firstName) {
      return finalDriverData.firstName;
    } else if (finalDriverData?.name) {
      return finalDriverData.name;
    }
    return t('call.unknown_caller', 'Unknown Caller');
  };

  const getCallerAvatar = () => {
    if (isIncoming && incomingCaller?.avatar) {
      return incomingCaller.avatar;
    }
    
    return finalDriverData?.avatar ||
           finalDriverData?.profilePicture?.url ||
           'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face';
  };

  const getCallStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return t('call.connecting', 'Connecting...');
      case 'connected':
        return formatCallDuration(callDuration);
      case 'ended':
        return t('call.ended', 'Call Ended');
      case 'error':
        return t('call.error', 'Call Error');
      default:
        return '';
    }
  };

  // Handle incoming call acceptance
  const acceptIncomingCall = async () => {
    if (isIncoming && callStatus === 'connecting') {
      try {
        await initializeAgoraEngine();
      } catch (error) {
        console.error('Error accepting incoming call:', error);
        setCallStatus('error');
      }
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent />
      
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
          <View style={styles.backgroundGradient} />

          {/* Caller Info */}
          <View style={styles.callerInfoContainer}>
            <Animated.View
              style={[
                styles.avatarContainer,
                {
                  transform: [{ scale: avatarPulseAnimation }],
                },
              ]}
            >
              <Image
                source={{ uri: getCallerAvatar() }}
                style={styles.callerAvatar}
              />
              <View style={styles.callTypeIndicator}>
                <MaterialCommunityIcons
                  name={isVideoEnabled ? 'video' : 'phone'}
                  size={20}
                  color="#ffffff"
                />
              </View>
            </Animated.View>

            <Text style={styles.callerName}>{getCallerName()}</Text>
            
            <Text style={styles.callStatusText}>{getCallStatusText()}</Text>

            {orderData?.id && (
              <View style={styles.orderInfoContainer}>
                <MaterialCommunityIcons name="receipt" size={14} color="#6c757d" />
                <Text style={styles.orderInfoText}>
                  {t('call.order_number', 'Order')} #{orderData.id}
                </Text>
              </View>
            )}
          </View>

          {/* Call Controls */}
          <View style={styles.controlsContainer}>
            {/* Connected call controls - Mute, Speaker, Video, End Call */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleMute}
              >
                <MaterialCommunityIcons
                  name={isMuted ? 'microphone-off' : 'microphone'}
                  size={28}
                  color="#495057"
                />
               </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleSpeaker}
              >
                <MaterialCommunityIcons
                  name={isSpeakerOn ? 'volume-high' : 'volume-off'}
                  size={28}
                  color="#495057"
                />
               </TouchableOpacity>

              {finalCallType === 'video' && (
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={toggleVideo}
                >
                  <MaterialCommunityIcons
                    name={isVideoEnabled ? 'video' : 'video-off'}
                    size={28}
                    color="#495057"
                  />
                  <Text style={styles.controlButtonText}>{t('call.video', 'Video')}</Text>
                </TouchableOpacity>
              )}
            </View>

            <Animated.View style={{ transform: [{ scale: buttonScaleAnimation }] }}>
              <TouchableOpacity
                style={[styles.callButton, styles.endCallButton]}
                onPress={handleEndCall}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="phone-hangup" size={32} color="#ffffff" />
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.endCallLabel}>{t('call.end_call', 'End Call')}</Text>
          </View>

          {/* Local and Remote Video Views */}
          {isVideoEnabled && isAgoraSDKAvailable() && (
            <View style={styles.videoContainer}>
              {remoteUid !== null && (
                <RtcRemoteView.SurfaceView
                  style={styles.remoteVideo}
                  uid={remoteUid}
                  channelId={channelName.current}
                  renderMode={VideoRenderMode.Hidden}
                />
              )}
              <RtcLocalView.SurfaceView
                style={styles.localVideo}
                channelId={channelName.current}
                renderMode={VideoRenderMode.Hidden}
              />
            </View>
          )}
        </Animated.View>
      </SafeAreaView>
    </>
  );
};

export default VoIPCallScreen;

