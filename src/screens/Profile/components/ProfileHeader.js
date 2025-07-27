import React from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { styles } from '../styles';
import { useTranslation } from 'react-i18next';
import { colors } from '../../../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ProfileHeader = ({ user, onImagePress, isUploading }) => {
  const { t } = useTranslation();
  
  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last;
  };

  const formatJoinDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  return (
    <View style={styles.profileHeaderContainer}>
      {/* Background Gradient */}
      <View style={styles.headerBackground} />
      
      {/* Profile Content */}
      <View style={styles.profileContent}>
        {/* Profile Image Section */}
        <View style={styles.profileImageContainer}>
          <TouchableOpacity 
            onPress={onImagePress}
            style={styles.profileImageWrapper}
            activeOpacity={0.8}
          >
            {user?.profilePicture?.url ? (
              <Image
                style={styles.profileImage}
                source={{ uri: user.profilePicture.url }}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImageInitials}>
                  {getInitials(user?.firstName, user?.lastName)}
                </Text>
              </View>
            )}
            
            {/* Upload Loading Overlay */}
            {isUploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
            
            {/* Edit Icon */}
            <View style={styles.editIconContainer}>
              <MaterialCommunityIcons
                name="camera"
                size={18}
                color="white"
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* User Information */}
        <View style={styles.userInfoContainer}>
          <Text style={styles.userName}>
            {user?.firstName || ''} {user?.lastName || ''}
          </Text>
          
          {user?.email && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="email-outline" size={16} color="#666" />
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          )}
          
          {user?.phoneNumber && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="phone-outline" size={16} color="#666" />
              <Text style={styles.userPhone}>{user.phoneNumber}</Text>
            </View>
          )}
          
          {user?.createdAt && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.joinDate}>
                {t('profile.member_since')} {formatJoinDate(user.createdAt)}
              </Text>
            </View>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="car" size={24} color={colors.primary} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>{t('profile.total_rides')}</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="star" size={24} color="#FFB800" />
            <Text style={styles.statNumber}>5.0</Text>
            <Text style={styles.statLabel}>{t('profile.rating')}</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="wallet" size={24} color="#34C759" />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>{t('profile.saved')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ProfileHeader;

