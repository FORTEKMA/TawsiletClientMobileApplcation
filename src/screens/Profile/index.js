import React, { useEffect, useState } from "react";
import { SafeAreaView, TouchableOpacity, Image, Text, Alert, Linking, View, ScrollView, I18nManager, ActivityIndicator  } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { differenceInMonths, differenceInDays, parseISO } from "date-fns";
import { OneSignal } from "react-native-onesignal";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import Ionicons from 'react-native-vector-icons/Ionicons';
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
    { title: t('profile.menu.information'), screen: 'PersonalInfo' },
    { title: t('profile.menu.security'), screen: 'Security' },
    { title: t('profile.menu.help'), screen: 'Help' },
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
    <SafeAreaView style={styles.container}>
      {/* Header with Drawer Toggle */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.drawerToggleButton}
          onPress={() => navigation.openDrawer()}
        >
          <Ionicons name="menu" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        </View>
        
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView>
        <ProfileHeader
          user={user}
          onImagePress={() => setGalleyModal(true)}
          isUploading={isUploading}
        />
        
        <View style={styles.menuContainer}>
          {menuButtons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuButton}
              onPress={() => navigation.navigate(button.screen)}
            >
              <Text style={styles.menuButtonText}>{button.title}</Text>
              <Ionicons name={I18nManager.isRTL ? "chevron-back-outline" : "chevron-forward-outline"} size={24} color={"#000"} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowLanguageModal(true)}
          >
            <Text style={styles.menuButtonText}>{t('profile.language.title')}</Text>
            <Ionicons name="language-outline" size={24} color={"#000"} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="log-out-outline" size={24} color={"#fff"} />
          <Text style={[styles.logoutText,{color:"#fff"}]}>{t('profile.logout.button')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutButton, { marginTop: 10, backgroundColor: '#ffebee' }]}
          onPress={handleDeleteAccount}
        >
          <Ionicons name="trash-outline" size={24} color="#d32f2f" />
          <Text style={[styles.logoutText, { color: '#d32f2f' }]}>{t('profile.delete_account.button')}</Text>
        </TouchableOpacity>
        <View style={{height:100}}/>
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
