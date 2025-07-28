import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {styles} from '../styles';

const MapControls = ({
  onDriverPosition,
  onDropPosition,
  onPickupPosition,
  onToggle3D,
  onRouteOverview,
  is3DEnabled,
  isFollowingDriver,
}) => {
  return (
    <>
      {/* Main control buttons */}
      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.button, isFollowingDriver && styles.activeButton]} 
          onPress={onDriverPosition}>
          <Text style={[styles.buttonText, isFollowingDriver && styles.activeButtonText]}>
            Position livreur
          </Text>
        </Pressable>
        <Pressable style={styles.button} onPress={onDropPosition}>
          <Text style={styles.buttonText}>Position dépot</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={onPickupPosition}>
          <Text style={styles.buttonText}>Position ramassage</Text>
        </Pressable>
      </View>
      
      {/* Additional 3D and route controls */}
      <View style={styles.additionalControls}>
        <Pressable 
          style={[styles.controlButton, is3DEnabled && styles.activeButton]} 
          onPress={onToggle3D}>
          <Text style={[styles.controlButtonText, is3DEnabled && styles.activeButtonText]}>
            {is3DEnabled ? '2D' : '3D'}
          </Text>
        </Pressable>
        <Pressable style={styles.controlButton} onPress={onRouteOverview}>
          <Text style={styles.controlButtonText}>Vue d'ensemble</Text>
        </Pressable>
      </View>
    </>
  );
};

export default MapControls; 