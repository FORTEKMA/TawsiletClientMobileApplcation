import React, { memo, useEffect, useRef } from 'react';
import { StyleSheet, Image, Animated, View } from 'react-native';
import { useSelector } from 'react-redux';
import { selectSettingsList } from '../store/utilsSlice/utilsSlice';

const DriverMarkerComponent = ({ angle = 0, type = 1, isMoving = false, onLoad=()=>{}, is3D = false }) => {
  const settingsList = useSelector(selectSettingsList);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(angle)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;
  
  // Find the settings entry for this type
  const setting = settingsList.find(s => s.id === type);
  const iconUrl = setting?.map_icon?.url;
  
 
  // Pulse animation for moving driver
  useEffect(() => {
    if (isMoving) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: is3D ? 1.3 : 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isMoving, is3D]);

  // Smooth rotation animation
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: angle,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [angle]);

  // 3D shadow animation
  useEffect(() => {
    if (is3D) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shadowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(shadowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      shadowAnim.setValue(0);
    }
  }, [is3D]);

  if (!iconUrl) {
 
    // Enhanced fallback with animations
    return (
      <Animated.View style={[
        styles.container,
        is3D && styles.container3D,
        {
          transform: [
            { scale: pulseAnim },
            { rotate: rotateAnim.interpolate({
              inputRange: [0, 360],
              outputRange: ['0deg', '360deg']
            }) }
          ]
        }
      ]}>
        <View style={[styles.markerBackground, is3D && styles.markerBackground3D]}>
          <Image
            source={require('../assets/eco.png')}
            style={[styles.icon, is3D && styles.icon3D]}
            onLoad={onLoad}
          />
        </View>
        {isMoving && <View style={[styles.movingIndicator, is3D && styles.movingIndicator3D]} />}
        {is3D && (
          <Animated.View style={[
            styles.shadow3D,
            {
              opacity: shadowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 0.6]
              })
            }
          ]} />
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[
      styles.container,
      is3D && styles.container3D,
      {
        transform: [
          { scale: pulseAnim },
          { rotate: rotateAnim.interpolate({
            inputRange: [0, 360],
            outputRange: ['0deg', '360deg']
          }) }
        ]
      }
    ]}>
 
        <Image
          source={{ uri: iconUrl }}
          style={[styles.icon, is3D && styles.icon3D]}
          onLoad={onLoad}
        />
        {is3D && (
          <Animated.View style={[
            styles.shadow3D,
            {
              opacity: shadowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 0.6]
              })
            }
          ]} />
        )}
    
     </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container3D: {
    width: 60,
    height: 60,
  },
  markerBackground: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  markerBackground3D: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 12,
    borderWidth: 3,
  },
  icon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  icon3D: {
    width: 36,
    height: 36,
  },
  movingIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF5722',
    borderWidth: 2,
    borderColor: '#fff',
  },
  movingIndicator3D: {
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
  },
  shadow3D: {
    position: 'absolute',
    bottom: -8,
    width: 40,
    height: 8,
    borderRadius: 20,
    backgroundColor: '#000',
    opacity: 0.3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
});

// Enhanced memo comparison for better performance
export default memo(DriverMarkerComponent, (prev, next) => {
  return (
    prev.angle === next.angle && 
    prev.type === next.type && 
    prev.isMoving === next.isMoving &&
    prev.is3D === next.is3D
  );
});
