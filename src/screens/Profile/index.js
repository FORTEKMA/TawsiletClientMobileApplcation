import React, { useEffect, useState } from "react";
import { SafeAreaView, TouchableOpacity, Image, Text, Alert, Linking, View, ScrollView, I18nManager, ActivityIndicator, Platform  } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { differenceInMonths, differenceInDays, parseISO } from "date-fns";
import { OneSignal } from "react-native-onesignal";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../utils/colors';
import { styles } from './styles';
import ProfileHeader from './components/ProfileHeader';
import LogoutModal from './components/LogoutModal';
import ImagePickerModal from './components/ImagePickerModal';
import LanguageModal from './components/LanguageModal';
import LanguageConfirmationModal from './components/LanguageConfirmationModal';
import DeleteAccountModal from './components/DeleteAccountModal';
import api from "../../utils/api";
import ImageResizer from 'react-native-image-resizer';

import { GoogleSignin } from '@react-native-google-signin/google-signin';

import {updateOffllineProfile}from "../../store/userSlice/userSlice"
import {
  getCurrentUser,
  logOut,
  uplaodImage,
} from "../../store/userSlice/userSlice";
import { changeLanguage } from '../../local';
import { 
  trackScreenView, 
  trackProfileViewed, 
  trackProfileUpdated, 
  trackLanguageChanged, 
  trackLogout 
} from '../../utils/analytics';

const Profile = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const isAuth = useSelector((state) => state.user.token);
  const user = useSelector((state) => state?.user?.currentUser);

  // State variables
  const [galleyModal, setGalleyModal] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Track screen view on mount
  useEffect(() => {
    trackScreenView('Profile');
    trackProfileViewed();
    dispatch(getCurrentUser())
  }, []);

  // Handle logout action
  const handleLogout = () => {
    trackLogout();
    try {
       GoogleSignin.signOut();
    } catch (error) {
      console.log(error)
    }

    navigation.navigate("Home")
  
    dispatch(logOut()).then(() => {
      OneSignal.logout();
      
    });
  };

  // Handle image upload
  const uploadImage = async (type) => {
    try {
      setIsUploading(true);
      const options = {
        storageOptions: {
          path: "image",
        },
      };
 
      const imagePicker =
        type === "gallery" ? launchImageLibrary : launchCamera;

     setTimeout(()=>{
      imagePicker(options, async (res) => {
         
        if (res.assets && res.assets[0]) {
          const resizedImage = await ImageResizer.createResizedImage(
            res.assets[0].uri,
            res.assets[0].width,
            res.assets[0].height,
            'JPEG',
            80
          );

           const formData = new FormData();
       
          formData.append("files", {  
            uri: resizedImage.uri,
            type: res.assets[0].type,
            name: res.assets[0].fileName,
          });
try {
 
  const imageResp=await api.post("upload",formData,{headers: {  'Content-Type': 'multipart/form-data'},})
 if(imageResp.data&&imageResp.data.length>0)
 {
  
  
 const afterUpdateRep=await api.put(`/users/${user.id}`, { profilePicture: imageResp.data[0].id });
 dispatch(getCurrentUser())
 trackProfileUpdated('profile_picture');
//find a way to update the userprofile 
}
} catch (error) {
  console.log(error)
} finally {
  setIsUploading(false);
}
         
        } else {
          setIsUploading(false);
        }
      });
     },200)
    
    } catch (error) {
      console.error("Error uploading image:", error);
      setIsUploading(false);
    }
  };

  const menuButtons = [
    { 
      title: t('profile.menu.information'), 
      screen: 'PersonalInfo',
      icon: 'person-outline',
      description: t('profile.menu.information_desc', 'Manage your personal details')
    },
    { 
      title: t('profile.menu.security'), 
      screen: 'Security',
      icon: 'shield-checkmark-outline',
      description: t('profile.menu.security_desc', 'Password and security settings')
    },
    { 
      title: t('profile.menu.help'), 
      screen: 'Help',
      icon: 'help-circle-outline',
      description: t('profile.menu.help_desc', 'Get support and assistance')
    },
  ];

  // Handle account deletion
  const handleDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const confirmDeleteAccount = () => {
     setDeleteModalVisible(false);
     trackLogout();
     try {
        GoogleSignin.signOut();
     } catch (error) {
       console.log(error)
     }
 
     navigation.navigate("Home")
   
     dispatch(logOut()).then(() => {
       OneSignal.logout();
       
     });
    // Add your account deletion logic here
  };

  const handleLanguageSelect = (language, needsConfirmation) => {
    if (needsConfirmation) {
      setSelectedLanguage(language);
      setShowConfirmationModal(true);
    } else {
      changeLanguage(language);
      trackLanguageChanged(language);
    }
  };

  const handleConfirmLanguageChange = () => {
    if (selectedLanguage) {
      changeLanguage(selectedLanguage);
      trackLanguageChanged(selectedLanguage);
      setSelectedLanguage(null);
    }
    setShowConfirmationModal(false);
  };

  const handleCancelLanguageChange = () => {
    setSelectedLanguage(null);
    setShowConfirmationModal(false);
  };

  return (
    <SafeAreaView style={styles.uberContainer}>
      {/* Modern Header */}
      <View style={styles.uberHeader}>
        <TouchableOpacity 
          style={styles.uberHeaderButton}
          onPress={() => navigation.openDrawer()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="menu" size={24} color="#000" />
        </TouchableOpacity>
        
        <View style={styles.uberHeaderContent}>
          <Text style={styles.uberHeaderTitle}>{t('profile.title')}</Text>
        </View>
        
        <View style={styles.uberHeaderSpacer} />
      </View>
      
      <ScrollView style={styles.uberScrollView} showsVerticalScrollIndicator={false}>
        {/* Enhanced Profile Header */}
        <View style={styles.uberProfileSection}>
          <View style={styles.uberProfileImageContainer}>
            <TouchableOpacity 
              onPress={() => setGalleyModal(true)}
              style={styles.uberProfileImageWrapper}
              activeOpacity={0.8}
            >
              {user?.profilePicture?.url ? (
                <Image
                  style={styles.uberProfileImage}
                  source={{ uri: user.profilePicture.url }}
                />
              ) : (
                <View style={styles.uberProfileImagePlaceholder}>
                  <Text style={styles.uberProfileImageInitials}>
                    {user?.firstName?.charAt(0)?.toUpperCase() || ''}{user?.lastName?.charAt(0)?.toUpperCase() || ''}
                  </Text>
                </View>
              )}
              
              {/* Upload Loading Overlay */}
              {isUploading && (
                <View style={styles.uberUploadingOverlay}>
                  <ActivityIndicator size="large" color="#000" />
                </View>
              )}
              
              {/* Edit Icon */}
              <View style={styles.uberEditIconContainer}>
                <MaterialCommunityIcons
                  name="camera"
                  size={18}
                  color="white"
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* User Information */}
          <View style={styles.uberUserInfoContainer}>
            <Text style={styles.uberUserName}>
              {user?.firstName || ''} {user?.lastName || ''}
            </Text>
            
            <View style={styles.uberUserDetails}>
              {user?.email && (
                <View style={styles.uberInfoRow}>
                  <MaterialCommunityIcons name="email-outline" size={16} color="#8E8E93" />
                  <Text style={styles.uberUserEmail}>{user.email}</Text>
                </View>
              )}
              
              {user?.phoneNumber && (
                <View style={styles.uberInfoRow}>
                  <MaterialCommunityIcons name="phone-outline" size={16} color="#8E8E93" />
                  <Text style={styles.uberUserPhone}>{user.phoneNumber}</Text>
                </View>
              )}
            </View>
          </View>

         
        </View>
        
        {/* Menu Section */}
        <View style={styles.uberMenuSection}>
          <Text style={styles.uberSectionTitle}>{t('profile.menu.title', 'Account Settings')}</Text>
          
          {menuButtons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={styles.uberMenuItem}
              onPress={() => navigation.navigate(button.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.uberMenuItemLeft}>
                <View style={styles.uberMenuIconContainer}>
                  <Ionicons name={button.icon} size={24} color="#000" />
                </View>
                <View style={styles.uberMenuTextContainer}>
                  <Text style={styles.uberMenuItemTitle}>{button.title}</Text>
                  <Text style={styles.uberMenuItemDescription}>{button.description}</Text>
                </View>
              </View>
              <MaterialCommunityIcons 
                name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} 
                size={24} 
                color="#8E8E93" 
              />
            </TouchableOpacity>
          ))}

          {/* Language Option */}
          <TouchableOpacity
            style={styles.uberMenuItem}
            onPress={() => setShowLanguageModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.uberMenuItemLeft}>
              <View style={styles.uberMenuIconContainer}>
                <Ionicons name="language-outline" size={24} color="#000" />
              </View>
              <View style={styles.uberMenuTextContainer}>
                <Text style={styles.uberMenuItemTitle}>{t('profile.language.title')}</Text>
                <Text style={styles.uberMenuItemDescription}>{t('profile.language.description', 'Change app language')}</Text>
              </View>
            </View>
            <MaterialCommunityIcons 
              name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} 
              size={24} 
              color="#8E8E93" 
            />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.uberActionSection}>
          <TouchableOpacity
            style={styles.uberLogoutButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="logout" size={24} color="#fff" />
            <Text style={styles.uberLogoutText}>{t('profile.logout.button')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.uberDeleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="delete-outline" size={24} color="#FF3B30" />
            <Text style={styles.uberDeleteText}>{t('profile.delete_account.button')}</Text>
          </TouchableOpacity>
        </View>
        
        {/* Bottom Spacing */}
        <View style={styles.uberBottomSpacing} />
      </ScrollView>

      <LogoutModal
        isVisible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onLogout={handleLogout}
      />

      <ImagePickerModal
        isVisible={galleyModal}
        onClose={() => setGalleyModal(false)}
        onCameraPress={() => {
          setGalleyModal(false);
          uploadImage("camera");
        }}
        onGalleryPress={() => {
          setGalleyModal(false);
          uploadImage("gallery");
        }}
      />

      <LanguageModal
        isVisible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        onLanguageSelect={handleLanguageSelect}
      />

      <LanguageConfirmationModal
        isVisible={showConfirmationModal}
        onClose={handleCancelLanguageChange}
        onConfirm={handleConfirmLanguageChange}
        selectedLanguage={selectedLanguage}
      />

      <DeleteAccountModal
        isVisible={isDeleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onDelete={confirmDeleteAccount}
      />
    </SafeAreaView>
  );
};

export default Profile;
