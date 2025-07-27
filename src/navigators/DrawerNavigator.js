import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

// Import existing screens/navigators
import Notifications from '../screens/Notifications';
import HisoryStackNavigator from './HisoryStackNavigator';
import ProfileStack from './ProfileStack';
import HomeStackNavigator from './HomeNavigation';
import AllChatsScreen from '../screens/AllChatsScreen';
import { colors } from '../utils/colors';
import { logOut } from '../store/userSlice/userSlice';

const Drawer = createDrawerNavigator();

// Custom Drawer Content Component
const CustomDrawerContent = ({ navigation, state }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.user.currentUser);
  
  const userName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : t('drawer.guest', 'Guest');
  const userAvatar = currentUser?.profilePicture?.url || 'https://via.placeholder.com/150';
  const userEmail = currentUser?.email || '';
  const userPhone = currentUser?.phoneNumber || '';

  const handleLogout = () => {
    dispatch(logOut());
    navigation.closeDrawer();
  };

  const menuItems = [
    {
      name: 'Home',
      label: t('drawer.home', 'Home'),
      icon: 'home',
      iconType: 'MaterialCommunityIcons',
    },
    {
      name: 'AllChats',
      label: t('drawer.all_chats', 'All Chats'),
      icon: 'message-text',
      iconType: 'MaterialCommunityIcons',
    },
    {
      name: 'Historique',
      label: t('drawer.history', 'History'),
      icon: 'history',
      iconType: 'MaterialCommunityIcons',
    },
    {
      name: 'Notifications',
      label: t('drawer.notifications', 'Notifications'),
      icon: 'notifications',
      iconType: 'Ionicons',
    },
    {
      name: 'Profile',
      label: t('drawer.profile', 'Profile'),
      icon: 'account',
      iconType: 'MaterialCommunityIcons',
    },
  ];

  const renderIcon = (iconName, iconType, isActive) => {
    const iconColor = isActive ? colors.primary : '#6C757D';
    const iconSize = 24;

    if (iconType === 'Ionicons') {
      return <Ionicons name={iconName} size={iconSize} color={iconColor} />;
    }
    return <MaterialCommunityIcons name={iconName} size={iconSize} color={iconColor} />;
  };

  return (
    <SafeAreaView style={styles.drawerContainer}>
      {/* Header Section */}
      <View style={styles.drawerHeader}>
        <View style={styles.userInfoContainer}>
          <Image source={{ uri: userAvatar }} style={styles.userAvatar} />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userName}</Text>
            {userEmail ? (
              <Text style={styles.userEmail}>{userEmail}</Text>
            ) : null}
            {userPhone ? (
              <Text style={styles.userPhone}>{userPhone}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => {
          const isActive = state.index === index;
          
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.menuItem, isActive && styles.activeMenuItem]}
              onPress={() => navigation.navigate(item.name)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                {renderIcon(item.icon, item.iconType, isActive)}
                <Text style={[styles.menuItemText, isActive && styles.activeMenuItemText]}>
                  {item.label}
                </Text>
              </View>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer Section */}
      <View style={styles.drawerFooter}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={24} color="#FF3B30" />
          <Text style={styles.logoutText}>{t('drawer.logout', 'Logout')}</Text>
        </TouchableOpacity>
        
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Tawsilet v1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          backgroundColor: '#FFFFFF',
          width: wp(80),
        },
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: '#6C757D',
        drawerLabelStyle: {
          fontSize: hp(1.8),
          fontWeight: '500',
        },
      }}
    >
      <Drawer.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          drawerLabel: 'Home',
        }}
      />
      <Drawer.Screen
        name="AllChats"
        component={AllChatsScreen}
        options={{
          drawerLabel: 'All Chats',
        }}
      />
      <Drawer.Screen
        name="Historique"
        component={HisoryStackNavigator}
        options={{
          drawerLabel: 'History',
        }}
      />
      <Drawer.Screen
        name="Notifications"
        component={Notifications}
        options={{
          drawerLabel: 'Notifications',
        }}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          drawerLabel: 'Profile',
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  drawerHeader: {
    backgroundColor: colors.primary,
    paddingTop: hp(2),
    paddingBottom: hp(3),
    paddingHorizontal: wp(4),
  },
  
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  
  userDetails: {
    marginLeft: wp(3),
    flex: 1,
  },
  
  userName: {
    fontSize: hp(2.2),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  
  userEmail: {
    fontSize: hp(1.4),
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  
  userPhone: {
    fontSize: hp(1.4),
    color: 'rgba(255, 255, 255, 0.9)',
  },
  
  menuContainer: {
    flex: 1,
    paddingTop: hp(2),
  },
  
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    marginHorizontal: wp(2),
    borderRadius: 12,
    marginBottom: 4,
  },
  
  activeMenuItem: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  menuItemText: {
    fontSize: hp(1.8),
    fontWeight: '500',
    color: '#6C757D',
    marginLeft: wp(3),
  },
  
  activeMenuItemText: {
    color: colors.primary,
    fontWeight: '600',
  },
  
  activeIndicator: {
    width: 4,
    height: 24,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  
  drawerFooter: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(2),
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
    paddingTop: hp(2),
  },
  
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(2),
    borderRadius: 12,
    marginBottom: hp(2),
  },
  
  logoutText: {
    fontSize: hp(1.8),
    fontWeight: '500',
    color: '#FF3B30',
    marginLeft: wp(3),
  },
  
  appInfo: {
    alignItems: 'center',
  },
  
  appVersion: {
    fontSize: hp(1.4),
    color: '#9CA3AF',
    fontWeight: '400',
  },
});

export default DrawerNavigator;

