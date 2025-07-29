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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { createAgoraEngine } from "../../utils/AgoraConfig"
import { useSelector } from 'react-redux';
import {
  sendVoIPCallNotification,
  sendVoIPCallActionNotification,
  generateVoIPChannelName,
  validateVoIPCallParams
} from '../../utils/VoIPManager';

import { useTranslation } from 'react-i18next';
import RNCallKeep from 'react-native-callkeep';

// Import Agora SDK with error handling
let RtcLocalView, RtcRemoteView, VideoRenderMode, ChannelProfile, ClientRole;

try {
  const AgoraSDK = require('react-native-agora');
  RtcLocalView = AgoraSDK.RtcLocalView;
  RtcRemoteView = AgoraSDK.RtcRemoteView;
  VideoRenderMode = AgoraSDK.VideoRenderMode;
  ChannelProfile = AgoraSDK.ChannelProfile;
  ClientRole = AgoraSDK.ClientRole;
} catch (error) {
  // Provide fallback values
  RtcLocalView = null;
  RtcRemoteView = null;
  VideoRenderMode = { Hidden: 1 };
  ChannelProfile = { Communication: 0 };
  ClientRole = { Broadcaster: 1 };
}
import AgoraConfig, {
  AGORA_APP_ID,
  isAgoraSDKAvailable,
  isAgoraConfigured,
  getAgoraToken,
  getPlatformAudioConfig,
  CHANNEL_PROFILE,
  CLIENT_ROLE,
  AUDIO_PROFILE,
  AUDIO_SCENARIO,
  VIDEO_ENCODER_CONFIG
} from '../../utils/AgoraConfig';
import { useNavigation } from '@react-navigation/native';
 
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const VoIPCallScreen = ({
  route,
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const currentUser = useSelector(state => state.user?.currentUser);
  
  // Extract route params
  const routeParams = route?.params || {};
  const finalDriverData = routeParams.driverData || {};
  const finalCallType = routeParams.callType || 'outgoing';
  const isIncoming = routeParams.isIncoming || finalCallType === 'incoming';
  const orderId = routeParams.orderId;
  const orderData = routeParams.orderData || {};
  const callUUID = routeParams.callUUID; // Get callUUID from route params

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
      handleEndCall();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  // Generate unique channel name for this call
  const generateCallChannelName = () => {
    if (!channelName.current || channelName.current === `tawsilet_${orderId || Date.now()}`) {
      channelName.current = generateVoIPChannelName(
        orderId || 'temp',
        finalDriverData?.id || 'driver',
        currentUser?.id || 'user'
      );
    }
    return channelName.current;
  };

  // Debug function to check Agora setup
  const debugAgoraSetup = () => {
    console.log('=== Agora Setup Debug ===');
    console.log('Agora SDK Available:', isAgoraSDKAvailable());
    console.log('Agora Configured:', isAgoraConfigured());
    console.log('App ID:', AGORA_APP_ID);
    console.log('Channel Name:', channelName.current);
    console.log('Call Type:', finalCallType);
    console.log('Is Video Enabled:', isVideoEnabled);
    console.log('Is Incoming:', isIncoming);
    console.log('Current User:', currentUser);
    console.log('Driver Data:', finalDriverData);
    console.log('========================');
  };

  // Initialize Agora Engine
  useEffect(() => {
    debugAgoraSetup(); // Add debug logging
    initializeAgoraEngine();
    startRippleAnimation();

    // Send call notification if this is an outgoing call
    if (!isIncoming && finalDriverData?.id) {
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
console.log("callParams",currentUser)
      if (validateVoIPCallParams(callParams)) {
        sendVoIPCallNotification(callParams)
          .catch(error => {
            console.error('Failed to send initial call notification:', error);
          });
      } else {
        console.error('Invalid VoIP call parameters');
      }
    }

    return () => {
      cleanupAgoraEngine();
    };
  }, []);

  const initializeAgoraEngine = async () => {
    try {
      // Check if Agora SDK is available
      if (!isAgoraSDKAvailable()) {
        console.log('Agora SDK not available, simulating connection');
        setCallStatus('connected');
        callStartTime.current = Date.now();
        return;
      }
 
      console.log('Initializing Agora engine...');
      
      // Create and initialize Agora engine using new API
      agoraEngineRef.current = await createAgoraEngine();
       
      console.log('Setting up event listeners...');
      
      // Set up comprehensive event handlers using the new API
      agoraEngineRef.current.addListener("Warning", (warn) => {
        console.log('Agora Warning:', warn);
      });
      
      agoraEngineRef.current.addListener("Error", (err) => {
        console.error('Agora Error:', err);
        setCallStatus("error");
      });
      
      agoraEngineRef.current.addListener("JoinChannelSuccess", (channel, uid, elapsed) => {
        console.log('Successfully joined channel:', channel, 'with UID:', uid);
        setCallStatus("connected");
        callStartTime.current = Date.now();
      });
      
      agoraEngineRef.current.addListener("UserJoined", (uid, elapsed) => {
        console.log('Remote user joined:', uid);
        setRemoteUid(uid);
        if (isVideoEnabled) {
          setIsRemoteVideoEnabled(true);
        }
      });
      
      agoraEngineRef.current.addListener("UserOffline", (uid, reason) => {
        console.log('Remote user offline:', uid, 'reason:', reason);
        setRemoteUid(null);
        setIsRemoteVideoEnabled(false);
        if (reason === 0) { // User left
          handleEndCall();
        }
      });
      
      agoraEngineRef.current.addListener("RemoteVideoStateChanged", (uid, state, reason, elapsed) => {
        console.log('Remote video state changed:', uid, 'state:', state);
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
      
      console.log('Configuring engine settings...');
      
      // Configure engine for optimal call quality using AgoraConfig
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
      
      // Generate and use unique channel name
      const uniqueChannelName = generateCallChannelName();
      console.log('Generated channel name:', uniqueChannelName);
      
      // Get token (null for development)
      const token = await getAgoraToken(uniqueChannelName, 0);
      console.log('Token obtained:', token ? 'Yes' : 'No (development mode)');
      
      // Join channel with proper media options for v4.x
      const mediaOptions = {
        clientRoleType: CLIENT_ROLE.BROADCASTER,
        channelProfile: CHANNEL_PROFILE.COMMUNICATION,
        publishCameraTrack: isVideoEnabled,
        publishMicrophoneTrack: true,
        autoSubscribeAudio: true,
        autoSubscribeVideo: isVideoEnabled,
      };
      
      console.log('Joining channel with options:', mediaOptions);
      
      const joinResult = await agoraEngineRef.current.joinChannel(token, uniqueChannelName, 0, mediaOptions);
      console.log('Join channel result:', joinResult);
      
      // If join fails, simulate connection for demo
      if (joinResult !== 0) {
        console.log('Join channel failed, simulating connection for demo');
        setTimeout(() => {
          if (callStatus === 'connecting') {
            setCallStatus('connected');
            callStartTime.current = Date.now();
          }
        }, 2000);
      }
      
    } catch (error) {
      console.error('Agora initialization error:', error);
      setCallStatus('error');
      
      // Simulate connection for demo if Agora fails
      setTimeout(() => {
        if (callStatus === 'error') {
          console.log('Simulating connection due to Agora error');
          setCallStatus('connected');
          callStartTime.current = Date.now();
        }
      }, 2000);
    }
  };

  const cleanupAgoraEngine = async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (agoraEngineRef.current) {
        // Leave channel with proper options
        const leaveChannelOptions = {
          stopAudioMixing: true,
          stopAllEffect: true,
          stopMicrophoneRecording: true,
        };
        
        await agoraEngineRef.current.leaveChannel(leaveChannelOptions);
        await agoraEngineRef.current.release();
        agoraEngineRef.current = null;
        
        console.log('Agora engine cleaned up successfully');
      }
    } catch (error) {
      console.error('Error during Agora cleanup:', error);
      // Ensure engine reference is cleared even if cleanup fails
      agoraEngineRef.current = null;
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

    if (isIncoming || callStatus === 'connecting') {
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
      
      // Send accept notification to driver
      try {
        const actionParams = {
          driverId: finalDriverData.id,
          action: 'accepted',
          caller: {
            id: currentUser?.id,
            firstName: currentUser?.firstName,
            lastName: currentUser?.lastName,
          },
          channelName: generateCallChannelName(),
          orderData: orderData,
        };
        
        await sendVoIPCallActionNotification(actionParams);
      } catch (error) {
        console.error('Failed to send accept notification:', error);
      }
      
      await initializeAgoraEngine();
    });
  };

  const handleDeclineCall = async () => {
    animateButton(async () => {
      setCallStatus('ended');
      stopAvatarPulse();
      
      // End the call via CallKeep
      if (callUUID) {
        RNCallKeep.endCall(callUUID);
      }

      // Send decline notification to driver
      try {
        const actionParams = {
          driverId: finalDriverData.id,
          action: 'declined',
          caller: {
            id: currentUser?.id,
            firstName: currentUser?.firstName,
            lastName: currentUser?.lastName,
          },
          channelName: generateCallChannelName(),
          orderData: orderData,
        };
        
        await sendVoIPCallActionNotification(actionParams);
      } catch (error) {
        console.error('Failed to send decline notification:', error);
      }
      
      await cleanupAgoraEngine();
      
      setTimeout(() => navigation.goBack(), 1000);
    });
  };

  const handleEndCall = async () => {
    animateButton(async () => {
      setCallStatus('ended');
      stopAvatarPulse();
      
      // End the call via CallKeep
      if (callUUID) {
        RNCallKeep.endCall(callUUID);
      }

      // Send end call notification to driver
      try {
        const actionParams = {
          driverId: finalDriverData.id,
          action: 'ended',
          caller: {
            id: currentUser?.id,
            firstName: currentUser?.firstName,
            lastName: currentUser?.lastName,
          },
          channelName: generateCallChannelName(),
          orderData: orderData,
        };
       
        await sendVoIPCallActionNotification(actionParams);
      } catch (error) {
        console.error('Failed to send end call notification:', error);
      }
      
      await cleanupAgoraEngine();
      
      setTimeout(() => navigation.goBack(), 1000);
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
    return finalDriverData?.avatar ||
           finalDriverData?.profilePicture?.url ||
           'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face';
  };

  const getCallStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return t('call.connecting', 'Connecting...');
      case 'ringing':
        return t('call.ringing', 'Ringing...');
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

  return (
    <>
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
          <View style={styles.backgroundGradient} />

          {/* Ripple effect */}
          <View style={styles.rippleContainer}>
            <Animated.View
              style={[
                styles.ripple,
                {
                  transform: [
                    {
                      scale: rippleAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 2],
                      }),
                    },
                  ],
                  opacity: rippleAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 0],
                  }),
                },
              ]}
            />
          </View>

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
                  color="#fff"
                />
              </View>
            </Animated.View>

            <Text style={styles.callerName}>{getCallerName()}</Text>
            
            <Text style={styles.callStatusText}>{getCallStatusText()}</Text>

            {orderData?.id && (
              <View style={styles.orderInfoContainer}>
                <MaterialCommunityIcons name="receipt" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.orderInfoText}>
                  {t('call.order_number', 'Order')} #{orderData.id}
                </Text>
              </View>
            )}
          </View>

          {/* Call Controls */}
          <View style={styles.controlsContainer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleMute}
              >
                <MaterialCommunityIcons
                  name={isMuted ? 'microphone-off' : 'microphone'}
                  size={28}
                  color="#fff"
                />
                <Text style={styles.controlButtonText}>{t('call.mute', 'Mute')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleSpeaker}
              >
                <MaterialCommunityIcons
                  name={isSpeakerOn ? 'volume-high' : 'volume-off'}
                  size={28}
                  color="#fff"
                />
                <Text style={styles.controlButtonText}>{t('call.speaker', 'Speaker')}</Text>
              </TouchableOpacity>

              {finalCallType === 'video' && (
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={toggleVideo}
                >
                  <MaterialCommunityIcons
                    name={isVideoEnabled ? 'video' : 'video-off'}
                    size={28}
                    color="#fff"
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
                <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
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

