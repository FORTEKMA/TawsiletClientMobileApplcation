import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Image, Pressable, Platform, StatusBar, SafeAreaView, ActivityIndicator, Animated } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useTranslation } from 'react-i18next';
import ImagePickerModal from "../../Profile/components/ImagePickerModal"
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import MaterialIcons from "react-native-vector-icons/MaterialIcons"
import { useDispatch, useSelector } from 'react-redux';
import api from '../../../utils/api';
import { getCurrentUser, updateUser } from '../../../store/userSlice/userSlice';
import Toast from 'react-native-toast-message';

const WomanValidationModal = ({ visible, onClose, form, setForm }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.currentUser);
  const [pickerType, setPickerType] = useState(null);
  const [isImagePickerVisible, setIsImagePickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleImagePress = (type) => {
    setPickerType(type);
    setIsImagePickerVisible(true);
  };

  const handleCameraPress = async () => {
     const result = await launchCamera({ mediaType: 'photo', quality: 0.8 });
    if (result.assets && result.assets[0]) {
      setForm({ ...form, [pickerType]: result.assets[0] });
    }
    setIsImagePickerVisible(false);
  };

  const handleGalleryPress = async () => {
     const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets && result.assets[0]) {
      setForm({ ...form, [pickerType]: result.assets[0] });
    }
    setIsImagePickerVisible(false);
  };

  // Upload and update logic
  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Prepare images to upload
      const imagesToUpload = [
        { key: 'user_with_cin', file: form?.user_with_cin },
       
      ];
      const uploadedIds = {};
      for (const img of imagesToUpload) {
        if (img.file && img.file.uri) {
          const formData = new FormData();
          formData.append('files', {
            uri: img.file.uri,
            type: img.file.type || 'image/jpeg',
            name: img.file.fileName || `${img.key}.jpg`,
          });
          const response = await api.post('upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (response.data && response.data[0] && response.data[0].id) {
            uploadedIds[img.key] = response.data[0].id;
          } else {
            throw new Error('Upload failed');
          }
        }
      }
   
    const response = await api.put(`/users/${user.id}`, {
        user_with_cin: uploadedIds.user_with_cin,
       
       
       });
       await api.post(`usersbyrole/client/woman-validation`, {
        id: user.id, 
        womanValidation: {
          validation_state: 'waiting',
          description: "checking files",
        },
       })
       
      await dispatch(getCurrentUser());
    
      setLoading(false);
      Toast.show({
        type: 'success',
        text1: t('woman_validation.success_24h', 'Your validation request was submitted and will be processed within 24 hours.'),
        visibilityTime: 4000,
      });
      onClose && onClose();
    } catch (error) {
      setLoading(false);
      Toast.show({
        type: 'error',
        text1: t('woman_validation.upload_error', 'Upload failed. Please try again.'),
        visibilityTime: 2500,
      });
      console.error('WomanValidationModal upload error:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.modalBackdrop, { opacity: fadeAnim }]}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
          <View style={styles.fullScreenOverlay}>
            <Animated.View style={[styles.fullScreenContainer, { transform: [{ scale: scaleAnim }] }]}>
              {/* Header with close button */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  disabled={loading}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Icon */}
              <View style={styles.iconContainer}>
                <View style={styles.iconBackground}>
                  <MaterialIcons name="verified-user" size={32} color="#4CAF50" />
                </View>
              </View>

              <Text style={styles.title}>{t('woman_validation.title')}</Text>
              <Text style={styles.subtitle}>{t('woman_validation.subtitle')}</Text>

              {/* User with CIN */}
              <View style={styles.uploadSection}>
                <Text style={styles.uploadLabel}>{t('woman_validation.upload_user_with_cin')}</Text>
                <TouchableOpacity
                  style={[styles.imagePicker, !form?.user_with_cin && styles.imagePickerDashed]}
                  onPress={() => handleImagePress('user_with_cin')}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  {form?.user_with_cin ? (
                    <View style={styles.imagePreviewWrapper}>
                      <Image source={{ uri: form?.user_with_cin.uri || form?.user_with_cin }} style={styles.imagePreview} />
                      <View style={styles.editIconOverlay}>
                        <MaterialIcons name="edit" size={20} color="#fff" />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.emptyImageContent}>
                      <View style={styles.uploadIconContainer}>
                        <MaterialIcons name="add-a-photo" size={28} color="#4CAF50" />
                      </View>
                      <Text style={styles.imagePickerText}>{t('woman_validation.tap_to_upload', 'Tap to upload photo')}</Text>
                      <Text style={styles.imagePickerSubtext}>{t('woman_validation.photo_requirements', 'Photo with CIN document')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Info section */}
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <MaterialIcons name="info-outline" size={16} color="#4CAF50" />
                  <Text style={styles.infoText}>{t('woman_validation.processing_time', 'Processing time: 24 hours')}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons name="security" size={16} color="#4CAF50" />
                  <Text style={styles.infoText}>{t('woman_validation.secure_upload', 'Your data is secure and encrypted')}</Text>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>{t('woman_validation.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!(form?.user_with_cin ) || loading) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={loading || !(form?.user_with_cin)}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="send" size={18} color="#fff" style={styles.submitIcon} />
                      <Text style={styles.submitButtonText}>{t('woman_validation.submit')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
          <ImagePickerModal
            isVisible={isImagePickerVisible}
            onClose={() => setIsImagePickerVisible(false)}
            onCameraPress={handleCameraPress}
            onGalleryPress={handleGalleryPress}
          />
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
    width: '100%',
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  fullScreenContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    fontSize: hp(3.4),
    marginBottom: 8,
    color: '#1a1a1a',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: hp(2.2),
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: hp(3),
    paddingHorizontal: 10,
  },
  uploadSection: {
    width: '100%',
    marginBottom: 24,
  },
  uploadLabel: {
    fontSize: hp(2.1),
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  imagePicker: {
    width: '100%',
    height: hp(20),
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
    overflow: 'hidden',
    position: 'relative',
  },
  imagePickerDashed: {
    borderStyle: 'dashed',
    borderColor: '#4CAF50',
    backgroundColor: '#f8f9fa',
  },
  emptyImageContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 20,
  },
  uploadIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePickerText: {
    color: '#4CAF50',
    fontSize: hp(2.1),
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  imagePickerSubtext: {
    color: '#888',
    fontSize: hp(1.8),
    textAlign: 'center',
  },
  imagePreviewWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 14,
  },
  editIconOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    padding: 8,
  },
  infoContainer: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: hp(1.8),
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: hp(2.1),
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: hp(2.1),
  },
  submitIcon: {
    marginRight: 8,
  },
});

export default WomanValidationModal; 