import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import Modal from 'react-native-modal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CallTypeAlert = ({ 
  visible, 
  onClose, 
  onVoiceCall, 
  onVideoCall, 
  title, 
  message,
  voiceCallText,
  videoCallText,
  voiceCallSubtext,
  videoCallSubtext,
  cancelText 
}) => {
  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={300}
      animationOutTiming={300}
      backdropTransitionInTiming={300}
      backdropTransitionOutTiming={300}
    >
      <View style={styles.container}>
        <View style={styles.handle} />
        
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.message}>{message}</Text>
        
        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.optionButton} 
            onPress={onVoiceCall}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <MaterialCommunityIcons name="phone" size={24} color="#fff" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionText}>{voiceCallText}</Text>
              <Text style={styles.optionSubtext}>{voiceCallSubtext}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionButton} 
            onPress={onVideoCall}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <MaterialCommunityIcons name="video" size={24} color="#fff" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionText}>{videoCallText}</Text>
              <Text style={styles.optionSubtext}>{videoCallSubtext}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>
     
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 34,
    minHeight: 300,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  message: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 24,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  optionSubtext: {
    fontSize: 14,
    color: '#666',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
});

export default CallTypeAlert; 