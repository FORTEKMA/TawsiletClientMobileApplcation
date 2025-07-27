import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Image, Pressable, Platform, StatusBar, SafeAreaView, ActivityIndicator } from 'react-native';
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
  const [pickerType, setPickerType] = useState(null); // 'user_with_cin' | 'cinFront' | 'cinBack' | null
  const [isImagePickerVisible, setIsImagePickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

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
        { key: 'cinFront', file: form?.cinFront },
        { key: 'cinBack', file: form?.cinBack },
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
        cinFront: uploadedIds.cinFront,
        cinBack: uploadedIds.cinBack,
       
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
      // Optionally show error toast
      // Toast.show({ title: t('woman_validation.upload_error'), status: 'error' });
      console.error('WomanValidationModal upload error:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalBackdrop}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />
          <View style={styles.fullScreenOverlay}>
            <View style={styles.fullScreenContainer}>
              <Text style={styles.title}>{t('woman_validation.title')}</Text>
              <Text style={styles.subtitle}>{t('woman_validation.subtitle')}</Text>

              {/* User with CIN */}
              <TouchableOpacity
                style={[styles.imagePicker, !form?.user_with_cin && styles.imagePickerDashed]}
                onPress={() => handleImagePress('user_with_cin')}
                disabled={loading}
                activeOpacity={0.8}
              >
                {form?.user_with_cin ? (
                  <View style={styles.imagePreviewWrapper}>
                    <Image source={{ uri: form?.user_with_cin.uri || form?.user_with_cin }} style={styles.imagePreview} />
                    <View style={styles.editIconOverlay}>
                      <MaterialIcons name="edit" size={24} color="#fff" />
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyImageContent}>
                    <MaterialIcons name="person" size={36} color="#bbb" />
                    <Text style={styles.imagePickerText}>{t('woman_validation.upload_user_with_cin')}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* CIN Front */}
              <TouchableOpacity
                style={[styles.imagePicker, !form?.cinFront && styles.imagePickerDashed]}
                onPress={() => handleImagePress('cinFront')}
                disabled={loading}
                activeOpacity={0.8}
              >
                {form?.cinFront ? (
                  <View style={styles.imagePreviewWrapper}>
                    <Image source={{ uri: form?.cinFront.uri || form?.cinFront }} style={styles.imagePreview} />
                    <View style={styles.editIconOverlay}>
                      <MaterialIcons name="edit" size={24} color="#fff" />
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyImageContent}>
                    <MaterialIcons name="credit-card" size={36} color="#bbb" />
                    <Text style={styles.imagePickerText}>{t('woman_validation.upload_cin_front')}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* CIN Back */}
              <TouchableOpacity
                style={[styles.imagePicker, !form?.cinBack && styles.imagePickerDashed]}
                onPress={() => handleImagePress('cinBack')}
                disabled={loading}
                activeOpacity={0.8}
              >
                {form?.cinBack ? (
                  <View style={styles.imagePreviewWrapper}>
                    <Image source={{ uri: form?.cinBack.uri || form?.cinBack }} style={styles.imagePreview} />
                    <View style={styles.editIconOverlay}>
                      <MaterialIcons name="edit" size={24} color="#fff" />
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyImageContent}>
                    <MaterialIcons name="credit-card" size={36} color="#bbb" />
                    <Text style={styles.imagePickerText}>{t('woman_validation.upload_cin_back')}</Text>
                  </View>
                )}
              </TouchableOpacity>

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
                    (!(form?.user_with_cin && form?.cinFront && form?.cinBack) || loading) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={loading || !(form?.user_with_cin && form?.cinFront && form?.cinBack)}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>{t('woman_validation.submit')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <ImagePickerModal
            isVisible={isImagePickerVisible}
            onClose={() => setIsImagePickerVisible(false)}
            onCameraPress={handleCameraPress}
            onGalleryPress={handleGalleryPress}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.12)',
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
    paddingHorizontal: 0,
  },
  fullScreenContainer: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontWeight: 'bold',
    fontSize: hp(3.2),
    marginBottom: 6,
    color: '#222',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: hp(2.1),
    color: '#666',
    marginBottom: 22,
    textAlign: 'center',
    lineHeight: hp(2.8),
  },
  imagePicker: {
    width: '100%',
    height: hp(17),
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    position: 'relative',
  },
  imagePickerDashed: {
    borderStyle: 'dashed',
    borderColor: '#bbb',
    backgroundColor: '#fafbfc',
  },
  emptyImageContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  imagePickerText: {
    color: '#888',
    fontSize: hp(2),
    marginTop: 8,
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
    borderRadius: 16,
  },
  editIconOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    marginTop: 28,
  },
  cancelButton: {
    marginRight: 16,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: '#f3f3f3',
    borderWidth: 1,
    borderColor: '#eee',
  },
  cancelButtonText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
    fontSize: hp(2),
  },
  submitButton: {
    backgroundColor: '#222',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    minWidth: 110,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#bbb',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: hp(2),
  },
});

export default WomanValidationModal; 