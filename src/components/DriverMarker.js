import React, { memo, useEffect, useRef } from 'react';
import { StyleSheet, Image, Animated, View } from 'react-native';
import { useSelector } from 'react-redux';
import { selectSettingsList } from '../store/utilsSlice/utilsSlice';

const DriverMarkerComponent = ({ angle = 0, type = 1, isMoving = false, onLoad=()=>{}   }) => {
  const settingsList = useSelector(selectSettingsList);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(angle)).current;
  
  // Find the settings entry for this type
  const setting = settingsList.find(s => s.id === type);
  const iconUrl = setting?.map_icon?.url;
  
 
  // Pulse animation for moving driver
  useEffect(() => {
    if (isMoving) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
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
  }, [isMoving]);

  // Smooth rotation animation
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: angle,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [angle]);

  if (!iconUrl) {
 
    // Enhanced fallback with animations
    return (
      <Animated.View style={[
        styles.container,
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
        <View style={styles.markerBackground}>
          <Image
            source={require('../assets/eco.png')}
            style={styles.icon}
            onLoad={onLoad}
          />
        </View>
        {isMoving && <View style={styles.movingIndicator} />}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[
      styles.container,
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
          style={styles.icon}
          onLoad={onLoad}
        />
    
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
  icon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
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
});

// Enhanced memo comparison for better performance
export default memo(DriverMarkerComponent, (prev, next) => {
  return (
    prev.angle === next.angle && 
    prev.type === next.type && 
    prev.isMoving === next.isMoving
  );
});
