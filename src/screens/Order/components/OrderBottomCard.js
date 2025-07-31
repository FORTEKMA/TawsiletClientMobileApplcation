import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, Dimensions, Modal, TextInput, ScrollView, PanResponder, Platform, AppState, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../../utils/colors';
import OrderCancelConfirmationModal from './OrderCancelConfirmationModal';
import OrderCancellationReasonSheet from './OrderCancellationReasonSheet';
import OrderReportProblemModal from './OrderReportProblemModal';

import { useNavigation } from '@react-navigation/native';
import api from '../../../utils/api';
import BackgroundTimer from 'react-native-background-timer';
import db from '../../../utils/firebase';
import voipManager from '../../../utils/VoIPManager';
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_HEIGHT = Platform.OS === 'ios' ? SCREEN_HEIGHT * 0.55 : SCREEN_HEIGHT * 0.47;

const STATUS_COLORS = {
  Driver_on_route_to_pickup: '#f1c40f',
  Arrived_at_pickup: '#f1c40f',
  Picked_up: '#f1c40f',
  On_route_to_delivery: '#f1c40f',
  Arrived_at_delivery: '#f1c40f',
  Delivered: '#27ae60',
  Completed: '#27ae60',
  default: '#f1c40f',
};

const OrderBottomCard = ({ order, onCallDriver, refresh }) => {
   
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showReasonSheet, setShowReasonSheet] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [otherReason, setOtherReason] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [additionalCharges, setAdditionalCharges] = useState(order?.additionalCharges || 0);
  const [lastChargeTime, setLastChargeTime] = useState(order?.lastChargeTime ? Math.floor((Date.now() - new Date(order.lastChargeTime).getTime()) / 1000) : 0);
  const lastChargeTimeRef = useRef(lastChargeTime);
  const [params, setParams] = useState({});
  const timerRef = useRef(null);
  const navigation = useNavigation();
  
  // VoIP and Chat state
  const [showCall, setShowCall] = useState(false);
  const [currentCallId, setCurrentCallId] = useState(null);
  const [callType, setCallType] = useState('outgoing');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const cancellationReasons = [
    'Driver is taking too long',
    'Driver is not moving / stuck',
    'Can\'t reach the driver',
    'Driver is going the wrong way',
    'Driver asked to cancel',
    'Fare is too high / changed',
    'I no longer need a ride',
    'Waited too long at pickup',
    'Wrong pickup location',
    'Don\'t feel safe',
    'Emergency situation',
    'Other'
  ];
  const [isExpanded, setIsExpanded] = useState(true);
  const MINIMUM_HEIGHT = CARD_HEIGHT * 0.4; // 20% of the card height
   // Memoized values
  const status = order?.commandStatus || 'pending';
 console.log("status",status)
  const statusColor = useMemo(() => STATUS_COLORS[status] || STATUS_COLORS.default, [status]);
  const statusText = useMemo(() =>  t(`history.status.${status.toLowerCase()}`), [status, t]);

  // Driver info
  const driver = order?.driver || {};
 
  const driverName = useMemo(() => `${driver.firstName || ''} ${driver.lastName || ''}`.trim(), [driver.firstName, driver.lastName]);
  const driverAvatar = driver?.profilePicture?.url || 'https://randomuser.me/api/portraits/men/1.jpg';
  const carModel = driver?.vehicule?.mark || 'Toyota Camry';
  const carPlate = driver?.vehicule?.matriculation || 'DEF 456';
  const driverRating = driver.rating || '5.0';

  // VoIP and Chat handlers
  const handleChatPress = useCallback(() => {
    navigation.navigate('ChatScreen', {
      requestId: order?.requestId,
      driverData: {
        id: driver?.id,
        name: driverName,
        avatar: driverAvatar,
        vehicle_info: `${carModel} • ${carPlate}`,
        rating: driverRating,
      },
    });
  }, [navigation, order?.requestId, driver?.id, driverName, driverAvatar, carModel, carPlate, driverRating]);

  const handleCallPress = useCallback(async () => {
    try {
      // Enhanced VoIP call with fallback options
      const { callId } = await voipManager.initiateCall(
        driver?.id,
        'driver',
        order?.requestId,
        {
          name: driverName,
          avatar: driverAvatar,
          vehicle_info: `${carModel} • ${carPlate}`,
        }
      );
      
      setCurrentCallId(callId);
      setCallType('outgoing');
      setShowCall(true);
    } catch (error) {
      console.error('Error initiating VoIP call:', error);
      
      // Enhanced fallback with call type selection
      Alert.alert(
        'Call Driver',
        'Choose call type',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Voice Call', 
            onPress: () => {
              navigation.navigate('VoIPCallScreen', {
                callType: 'voice',
                driverData: {
                  id: driver?.id,
                  name: driverName,
                  avatar: driverAvatar,
                  vehicle_info: `${carModel} • ${carPlate}`,
                  rating: driverRating,
                },
                orderId: order?.requestId,
                isIncoming: false
              });
            }
          },
          { 
            text: 'Video Call', 
            onPress: () => {
              navigation.navigate('VoIPCallScreen', {
                callType: 'video',
                driverData: {
                  id: driver?.id,
                  name: driverName,
                  avatar: driverAvatar,
                  vehicle_info: `${carModel} • ${carPlate}`,
                  rating: driverRating,
                },
                orderId: order?.requestId,
                isIncoming: false
              });
            }
          },
        ]
      );
    }
  }, [driver?.id, order?.requestId, driverName, driverAvatar, carModel, carPlate, driverRating, navigation]);

  const handleAcceptCall = useCallback(async () => {
    if (currentCallId) {
      await voipManager.acceptCall(currentCallId);
    }
  }, [currentCallId]);

  const handleDeclineCall = useCallback(async () => {
    if (currentCallId) {
      await voipManager.declineCall(currentCallId);
      setShowCall(false);
      setCurrentCallId(null);
    }
  }, [currentCallId]);
 

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleCancelPress = () => {
    setShowConfirmation(true);
  };

  const handleConfirmCancel = () => {
    setShowConfirmation(false);
    setShowReasonSheet(true);
  };

  const handleReasonSelect = (reason) => {
    setSelectedReason(reason);
    if (reason !== 'Other') {
      handleSubmitCancellation(reason);
    }
  };

  const handleSubmitCancellation = async (reason) => {
            db.ref(`rideRequests/${order.requestId}`).update({commandStatus: "Canceled_by_client",});

    setShowReasonSheet(false);
    setSelectedReason(null);
    setOtherReason('');
    navigation.goBack();
    if(refresh){
      refresh();
    }

  };

  const [appState, setAppState] = useState(AppState.currentState);
  

  useEffect(()=>{
    const getParams=async ()=>{
      const paramsRes = await api.get(`parameters`);
     
      setParams(paramsRes.data.data[0]);
    }
    getParams()
  },[])
  // Handle initial status change and app coming to foreground
  useEffect(() => {
    const initializeTimer = async () => {
      const paramsRes = await api.get(`parameters`);
      
      if (order?.lastChargeTime) {
        // Calculate the exact time difference in seconds
        const lastChargeTimeMs = new Date(order.lastChargeTime).getTime();
        const currentTimeMs = Date.now();
        const gracePeriodInSeconds = paramsRes.data.data[0].WAITING_TIME_GRACE_PERIOD * 60;
        const initialWaitingTime = Math.floor((currentTimeMs - lastChargeTimeMs) / 1000)
        
        // Calculate the last charge time based on grace period

        const lastChargeTimeValue = Math.floor(initialWaitingTime / gracePeriodInSeconds) * gracePeriodInSeconds;
        
        setWaitingTime(initialWaitingTime);
        setLastChargeTime(lastChargeTimeValue);
        
        // Start timer immediately after setting initial time
        if (order?.commandStatus === "Arrived_at_pickup") {
          startTimer(initialWaitingTime, lastChargeTimeValue);
        }
      }
    };

    if (order?.commandStatus === "Arrived_at_pickup") {
      initializeTimer();
    } else {
      if (isTimerRunning) {
        stopTimer();
      } 
    }
  }, [order?.commandStatus, order?.lastChargeTime]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active' && order?.commandStatus === "Arrived_at_pickup") {
        // App has come to the foreground
        const initializeTimer = async () => {
          const paramsRes = await api.get(`parameters`);
          setParams(paramsRes.data.data[0]);
          
          if (order?.lastChargeTime) {
            const initialWaitingTime = Math.floor((Date.now() - new Date(order.lastChargeTime)) / 1000);
            const initialWaitingTimeGracePeriod = paramsRes.data.data[0].WAITING_TIME_GRACE_PERIOD * 60;
            const lastChargeTimeValue = initialWaitingTime - (initialWaitingTime % initialWaitingTimeGracePeriod);
            
            setWaitingTime(initialWaitingTime);
            setLastChargeTime(lastChargeTimeValue);
            setTimeout(() => {
              startTimer(initialWaitingTime, lastChargeTimeValue);
            }, 0);
          }
          
        
        };
        initializeTimer();
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState, order?.commandStatus, order?.lastChargeTime]);

  // Calculate initial additional charges on mount
  useEffect(() => {
    
    const calculateInitialCharges = async () => {

      if (order?.lastChargeTime && order?.commandStatus === "Arrived_at_pickup") {
        const paramsRes = await api.get(`parameters`);
        const currentParams = paramsRes.data.data[0];
        setParams(currentParams);

        const elapsedSeconds = Math.floor((Date.now() - new Date(order.lastChargeTime).getTime()) / 1000);
        const startChargeAfterTimeInSeconds = Number(currentParams.START_CHARGE_AFTERT_TIME) * 60;
        const gracePeriodInSeconds = Number(currentParams.WAITING_TIME_GRACE_PERIOD) * 60;
         if (elapsedSeconds > startChargeAfterTimeInSeconds) {
          const elapsedGracePeriods = Math.floor((elapsedSeconds - startChargeAfterTimeInSeconds) / gracePeriodInSeconds);
          const initialCharges = elapsedGracePeriods * currentParams.WAITING_TIME_CHARGE;
          setAdditionalCharges(initialCharges);
          setWaitingTime(elapsedSeconds);
          setLastChargeTime(elapsedSeconds - (elapsedSeconds % gracePeriodInSeconds));
        }
      }
    };

    calculateInitialCharges();
  }, [order?.lastChargeTime, order?.commandStatus]);

  const startTimer =async (initialTime, lastChargeTimeValue) => {
    if (isTimerRunning) {
      stopTimer();
    }
    const paramsRes = await api.get(`parameters`);
    const currentParams = paramsRes.data.data[0];

    setIsTimerRunning(true);
    
    // Calculate initial charges if there's already waiting time
    if (initialTime > 0) {
      const startChargeAfterTimeInSeconds = currentParams.START_CHARGE_AFTERT_TIME * 60;
      const gracePeriodInSeconds = currentParams.WAITING_TIME_GRACE_PERIOD * 60;
      
      if (initialTime > startChargeAfterTimeInSeconds) {
        const elapsedGracePeriods = Math.floor((initialTime - startChargeAfterTimeInSeconds) / gracePeriodInSeconds);
        const initialCharges = elapsedGracePeriods * currentParams.WAITING_TIME_CHARGE;
        setAdditionalCharges(initialCharges);
      }
    }

    // Store the start time and last tick
    const startTime = Date.now();
    const initialTimeMs = startTime - (initialTime * 1000); // Convert initial time to milliseconds
    let lastTick = startTime;
 

    lastChargeTimeRef.current = lastChargeTimeValue;
    const expectedCharges =  currentParams.WAITING_TIME_CHARGE;
     const startChargeAfterTimeInSeconds = Number(currentParams.START_CHARGE_AFTERT_TIME) * 60;
    const gracePeriodInSeconds = Number(currentParams.WAITING_TIME_GRACE_PERIOD) * 60;

    timerRef.current = BackgroundTimer.runBackgroundTimer(() => {
      const now = Date.now();
      const delta = Math.floor((now - lastTick) / 1000); // Convert to seconds
     
      if (delta >= 1) { // Only update if at least 1 second has passed
        lastTick = now;
        const elapsedSeconds = Math.floor((now - initialTimeMs) / 1000);
       
      
          // Calculate how many grace periods have passed since charging started
           
          // Calculate how many charges should have been added
           // Only add charge if we haven't added it yet
          if (elapsedSeconds >= startChargeAfterTimeInSeconds && (elapsedSeconds % gracePeriodInSeconds == 0)) {
            setAdditionalCharges(additionalCharges+expectedCharges);
            lastChargeTimeRef.current = elapsedSeconds;
            setLastChargeTime(elapsedSeconds);
          }
       

        setWaitingTime(elapsedSeconds);
      }
    }, 1000);
  };

  const stopTimer = () => {
    BackgroundTimer.stopBackgroundTimer();
    if (timerRef.current) {
      BackgroundTimer.stopBackgroundTimer();
      setIsTimerRunning(false);
      timerRef.current = null;
    }
  };

  // Add cleanup effect
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

 

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only allow downward movement
        return gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement and limit the maximum distance
        const newTranslateY = Math.max(0, Math.min(gestureState.dy, MINIMUM_HEIGHT));
        translateY.setValue(newTranslateY);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          // Slide down to minimum height
          Animated.spring(translateY, {
            toValue:  MINIMUM_HEIGHT,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }).start();
          setIsExpanded(false);
        } else {
          // Return to original position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }).start();
          setIsExpanded(true);
        }
      },
    })
  ).current;

  // Add effect to ensure translateY never goes below 0
  useEffect(() => {
    const listener = translateY.addListener(({ value }) => {
      if (value < 0) {
        translateY.setValue(0);
      }
    });

    return () => {
      translateY.removeListener(listener);
    };
  }, [translateY]);
   return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.cardContainer}>
        <View style={styles.handleContainer}>
          <View style={styles.handleBar} />
        </View>
        {isExpanded ? (
          <>
            <View style={styles.statusBanner}>
              <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
              <Text style={styles.statusText}>{statusText}</Text>
            </View>

            {driverName&&(<View style={styles.driverSection}>
              <View style={styles.driverRow}>
                <Image source={{ uri: driverAvatar }} style={styles.avatar} />
                <View style={styles.driverInfo}>
                  <View style={styles.driverNameRow}>
                    <Text style={styles.driverName}>{driverName}</Text>
                    {["Canceled_by_client", "Canceled_by_driver", "Completed"].includes(order?.commandStatus) && (
                      <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity 
                          style={styles.chatButtonCircle}
                          onPress={handleChatPress}
                          onPressIn={handlePressIn}
                          onPressOut={handlePressOut}
                        >
                          <MaterialCommunityIcons name="message-text" size={18} color="#fff" />
                          {unreadMessages > 0 && (
                            <View style={styles.unreadBadge}>
                              <Text style={styles.unreadBadgeText}>
                                {unreadMessages > 9 ? '9+' : unreadMessages}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.callButtonCircle}
                          onPress={handleCallPress}
                          onPressIn={handlePressIn}
                          onPressOut={handlePressOut}
                        >
                          <Ionicons name="call" size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#FFB800" />
                    <Text style={styles.rating}>{driverRating}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.carSection}>
                <View style={styles.carInfoRow}>
                  <View style={styles.carInfoItem}>
                    <Ionicons name="car" size={20} color="#666" />
                    <Text style={styles.carInfoText}>{carModel}</Text>
                  </View>
                  <View style={styles.carInfoDivider} />
                  <View style={styles.carInfoItem}>
                    <Ionicons name="card" size={20} color="#666" />
                    <Text style={styles.carInfoText}>{carPlate}</Text>
                  </View>
                </View>
              </View>
            </View>)}

            <View style={styles.addressContainer}>
              <View style={styles.addressLine} />
              <View style={styles.addressRow}>
                <View style={styles.dotBlack} />
                <Text style={styles.addressText}>{order?.pickUpAddress?.Address || ''}</Text>
              </View>
              <View style={styles.addressRow}>
                <View style={styles.dotBlue} />
                <Text style={[styles.addressText, { color: colors.primary }]}>{order?.dropOfAddress?.Address || ''}</Text>
              </View>
            </View>

            <View style={styles.priceContainer}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t('ride.base_price')}:</Text>
                <Text style={styles.priceValue}>{parseFloat(order?.totalPrice || 0).toFixed(2)} DT</Text>
              </View>
              {additionalCharges > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{t('ride.additional_charges')}:</Text>
                  <Text style={styles.priceValue}>{parseFloat(additionalCharges).toFixed(2)} DT</Text>
                </View>
              )}
              <View style={styles.totalPriceRow}>
                <Text style={styles.totalPriceLabel}>{t('ride.total_price')}:</Text>
                <Text style={styles.totalPriceValue}>
                  {parseFloat((order?.totalPrice || 0) + additionalCharges).toFixed(2)} DT
                </Text>
              </View>
            </View>

            {order?.commandStatus == "Arrived_at_pickup" && (<View style={styles.timerContainer}>
                      <Text style={styles.timerLabel}>
                        {t("ride.waiting_time")}:
                      </Text>
                      <Text style={styles.timerText}>
                        {formatTime(waitingTime)}
                      </Text>
                      {additionalCharges > 0 && (
                        <Text style={styles.additionalCharges}>
                          {t("ride.additional_charges")}:{" "}
                          {parseFloat(additionalCharges).toFixed(2)}{" "}
                          {"DT"}
                        </Text>
                      )}
                      <View style={styles.chargingInfoContainer}>
                        <Text style={styles.chargingInfoText}>
                          {t(
                            "ride.charging_info",
                            {
                              time: params.START_CHARGE_AFTERT_TIME,
                            }
                          )}
                        </Text>
                        <Text style={styles.chargingInfoText}>
                          {t(
                            "ride.charging_period",
                            {
                              charge: params.WAITING_TIME_CHARGE,
                              period: params.WAITING_TIME_GRACE_PERIOD,
                            }
                          )}
                        </Text>
                      </View>
                    </View>)}

           <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:10,flex:1,width:"100%"}}>
             
            {!["Canceled_by_client", "Canceled_by_driver"].includes(order?.commandStatus)&&(  <TouchableOpacity 
                style={styles.reportButton}
                onPress={() => setShowReportModal(true)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              >
                <Text style={styles.reportButtonText}>{t('history.card.report_problem')}</Text>
              </TouchableOpacity>)}
        


              {order?.commandStatus === "Completed"&&order?.review==null &&(  <TouchableOpacity 
                  disabled={order?.review}
                  style={[styles.submitReportButton, styles.rateButton,{opacity:!order?.review?1:0.2}]}
                  onPress={()=>  navigation.navigate('Rating', { order })}
                >
                  <Text style={styles.submitReportButtonText}>{t('history.card.rate_trip')}</Text>
                </TouchableOpacity>)}
            
            </View>  

        
             { ["Pending","Arrived_at_pickup","Go_to_pickup"].includes(order?.commandStatus)&&( <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleCancelPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              >
                <Text style={styles.cancelButtonText}>{t('history.card.cancel_order')}</Text>
              </TouchableOpacity>)}
     
          </>
        ) : (
          <View style={styles.collapsedContent}>
            <View style={styles.statusBanner}>
              <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
              <Text style={styles.statusText}>{statusText}</Text>
            </View>

            <View style={styles.driverSection}>
              <View style={styles.driverRow}>
                <Image source={{ uri: driverAvatar }} style={styles.avatar} />
                <View style={styles.driverInfo}>
                  <View style={styles.driverNameRow}>
                    <Text style={styles.driverName}>{driverName}</Text>
                    {!["Canceled_by_client", "Canceled_by_driver", "Completed"].includes(order?.commandStatus) && (
                      <TouchableOpacity 
                        style={styles.callButtonCircle}
                        onPress={onCallDriver}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                      >
                        <Ionicons name="call" size={20} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#FFB800" />
                    <Text style={styles.rating}>{driverRating}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.carSection}>
                <View style={styles.carInfoRow}>
                  <View style={styles.carInfoItem}>
                    <Ionicons name="car" size={20} color="#666" />
                    <Text style={styles.carInfoText}>{carModel}</Text>
                  </View>
                  <View style={styles.carInfoDivider} />
                  <View style={styles.carInfoItem}>
                    <Ionicons name="card" size={20} color="#666" />
                    <Text style={styles.carInfoText}>{carPlate}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      <OrderCancelConfirmationModal
        visible={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmCancel}
      />

      <OrderCancellationReasonSheet
        visible={showReasonSheet}
        order={order}
        onClose={() => setShowReasonSheet(false)}
        reasons={cancellationReasons}
        selectedReason={selectedReason}
        onSelectReason={handleReasonSelect}
        otherReason={otherReason}
        setOtherReason={setOtherReason}
        onSubmit={handleSubmitCancellation}
      />

      <OrderReportProblemModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
      />

      {/* VoIP Call Screen - Removed modal approach, now uses navigation */}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  timerContainer: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    alignItems: "center",
  },
  timerLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  timerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
  },
  additionalCharges: {
    fontSize: 14,
    color: "#ff4444",
    marginTop: 4,
    fontWeight: "500",
  },
  chargingInfoContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 6,
    width: "100%",
  },
  chargingInfoText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginVertical: 2,
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    //height: CARD_HEIGHT,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 24,
  },
  handleContainer: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
    width: '100%',
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E0E0E0',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  driverSection: {
    marginBottom: 20,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverInfo: {
    flex: 1,
    marginLeft: 16,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  driverName: {
    fontWeight: 'bold',
    fontSize: 22,
    color: '#222',
    flex: 1,
    textAlign:"left"
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  callButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE5B4',
    alignSelf: 'flex-start',
  },
  rating: {
    marginLeft: 4,
    color: '#B8860B',
    fontWeight: '600',
    fontSize: 14,
  },
  carSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  carInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  carInfoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  carInfoText: {
    fontSize: 14,
    color: '#444',
    marginLeft: 8,
    fontWeight: '500',
  },
  carInfoDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12,
  },
  addressContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  addressLine: {
    position: 'absolute',
    left: 8,
    top: 4,
    bottom: 15,
    width: 2,
    backgroundColor: '#E0E0E0',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 4,
  },
  dotBlack: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#222',
    marginRight: 12,
    zIndex: 1,
  },
  dotBlue: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginRight: 12,
    zIndex: 1,
  },
  addressText: {
    color: '#222',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  cancelButtonText: {
    color: '#E74C3C',
    fontWeight: '600',
    fontSize: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#f8f9fa',
  },
  reportButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 12,
    height:56,

    flex:1,
  },
  reportButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reportModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reportModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  reportTextArea: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 150,
    marginBottom: 20,
  },
  submitReportButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 12,

    flex:1,
  },
  submitReportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  priceContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#222',
    fontWeight: '500',
  },
  totalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalPriceLabel: {
    fontSize: 16,
    color: '#222',
    fontWeight: '600',
  },
  totalPriceValue: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  collapsedContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});

export default React.memo(OrderBottomCard); 