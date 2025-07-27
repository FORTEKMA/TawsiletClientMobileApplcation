import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  Alert,
  Dimensions,
  StatusBar 
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

// Import existing screens/navigators
import Notifications from '../screens/Notifications';
import HisoryStackNavigator from './HisoryStackNavigator';
import ProfileStack from './ProfileStack';
import HomeStackNavigator from './HomeNavigation';
import AllChatsScreen from '../screens/AllChatsScreen';
import { colors } from '../utils/colors';
import { logOut } from '../store/userSlice/userSlice';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const Drawer = createDrawerNavigator();

// Custom Drawer Content Component
const CustomDrawerContent = ({ navigation, state }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.user.currentUser);
  
  // Check if user is guest
  const isGuest = !currentUser || currentUser.isGuest || !currentUser.id;
  
  const userName = isGuest 
    ? t('drawer.guest_user', 'Guest User')
    : `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || t('drawer.user', 'User');
  
  const userAvatar = isGuest 
    ? 'https://via.placeholder.com/150/E0E0E0/666666?text=Guest'
    : currentUser?.profilePicture?.url || 'https://via.placeholder.com/150/007AFF/FFFFFF?text=' + (userName.charAt(0) || 'U');
  
  const userEmail = isGuest ? '' : currentUser?.email || '';
  const userPhone = isGuest ? '' : currentUser?.phoneNumber || '';

  const handleLogout = () => {
    if (isGuest) {
      Alert.alert(
        t('drawer.sign_in_required', 'Sign In Required'),
        t('drawer.sign_in_message', 'Please sign in to access your account features.'),
        [
          {
            text: t('common.cancel', 'Cancel'),
            style: 'cancel',
          },
          {
            text: t('common.sign_in', 'Sign In'),
            onPress: () => {
              navigation.closeDrawer();
              // Navigate to login screen
              navigation.navigate('Auth');
            },
          },
        ]
      );
    } else {
      Alert.alert(
        t('drawer.logout_confirm', 'Logout'),
        t('drawer.logout_message', 'Are you sure you want to logout?'),
        [
          {
            text: t('common.cancel', 'Cancel'),
            style: 'cancel',
          },
          {
            text: t('common.logout', 'Logout'),
            style: 'destructive',
            onPress: () => {
              dispatch(logOut());
              navigation.closeDrawer();
            },
          },
        ]
      );
    }
  };

  const handleGuestAction = (screenName, actionName) => {
    if (isGuest && ['AllChats', 'Historique', 'Profile'].includes(screenName)) {
      Alert.alert(
        t('drawer.sign_in_required', 'Sign In Required'),
        t('drawer.feature_requires_signin', `${actionName} requires you to sign in first.`),
        [
          {
            text: t('common.cancel', 'Cancel'),
            style: 'cancel',
          },
          {
            text: t('common.sign_in', 'Sign In'),
            onPress: () => {
              navigation.closeDrawer();
              navigation.navigate('Auth');
            },
          },
        ]
      );
      return false;
    }
    return true;
  };

  // Menu items with guest restrictions
  const menuItems = [
    {
      name: 'Home',
      label: t('drawer.home', 'Home'),
      icon: 'home-variant',
      iconType: 'MaterialCommunityIcons',
      guestAllowed: true,
      badge: null,
    },
    {
      name: 'AllChats',
      label: t('drawer.all_chats', 'All Chats'),
      icon: 'message-text-outline',
      iconType: 'MaterialCommunityIcons',
      guestAllowed: false,
      badge: isGuest ? null : 0, // Could be dynamic unread count
    },
    {
      name: 'Historique',
      label: t('drawer.history', 'History'),
      icon: 'history',
      iconType: 'MaterialCommunityIcons',
      guestAllowed: false,
      badge: null,
    },
    {
      name: 'Notifications',
      label: t('drawer.notifications', 'Notifications'),
      icon: 'notifications-outline',
      iconType: 'Ionicons',
      guestAllowed: true,
      badge: null,
    },
    {
      name: 'Profile',
      label: t('drawer.profile', 'Profile'),
      icon: 'account-outline',
      iconType: 'MaterialCommunityIcons',
      guestAllowed: false,
      badge: null,
    },
  ];

  const renderIcon = (iconName, iconType, isActive, isDisabled = false) => {
    let iconColor = '#8E8E93';
    if (isDisabled) {
      iconColor = '#C7C7CC';
    } else if (isActive) {
      iconColor = colors.primary;
    }
    
    const iconSize = 24;

    if (iconType === 'Ionicons') {
      return <Ionicons name={iconName} size={iconSize} color={iconColor} />;
    }
    return <MaterialCommunityIcons name={iconName} size={iconSize} color={iconColor} />;
  };

  const renderBadge = (count) => {
    if (!count || count === 0) return null;
    
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {count > 99 ? '99+' : count}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.drawerContainer}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header Section with Gradient */}
      <LinearGradient
        colors={[colors.primary, '#0066CC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.drawerHeader}
      >
        <View style={styles.userInfoContainer}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: userAvatar }} style={styles.userAvatar} />
            {isGuest && (
              <View style={styles.guestBadge}>
                <MaterialCommunityIcons name="account-question" size={16} color="#fff" />
              </View>
            )}
          </View>
          
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userName}</Text>
            {!isGuest && userEmail ? (
              <Text style={styles.userEmail} numberOfLines={1}>{userEmail}</Text>
            ) : null}
            {!isGuest && userPhone ? (
              <Text style={styles.userPhone}>{userPhone}</Text>
            ) : (
              <TouchableOpacity 
                style={styles.signInPrompt}
                onPress={() => {
                  navigation.closeDrawer();
                  navigation.navigate('Auth');
                }}
              >
                <Text style={styles.signInText}>
                  {t('drawer.tap_to_sign_in', 'Tap to sign in')}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* User Status Indicator */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isGuest ? '#FF9500' : '#34C759' }]} />
          <Text style={styles.statusText}>
            {isGuest ? t('drawer.guest_mode', 'Guest Mode') : t('drawer.signed_in', 'Signed In')}
          </Text>
        </View>
      </LinearGradient>

      {/* Menu Items */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        {menuItems.map((item, index) => {
          const isActive = state.index === index;
          const isDisabled = isGuest && !item.guestAllowed;
          
          return (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.menuItem, 
                isActive && styles.activeMenuItem,
                isDisabled && styles.disabledMenuItem
              ]}
              onPress={() => {
                if (handleGuestAction(item.name, item.label)) {
                  navigation.navigate(item.name);
                }
              }}
              activeOpacity={isDisabled ? 1 : 0.7}
              disabled={isDisabled}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.iconContainer}>
                  {renderIcon(item.icon, item.iconType, isActive, isDisabled)}
                </View>
                
                <Text style={[
                  styles.menuItemText, 
                  isActive && styles.activeMenuItemText,
                  isDisabled && styles.disabledMenuItemText
                ]}>
                  {item.label}
                </Text>
                
                {item.badge && renderBadge(item.badge)}
                
                {isDisabled && (
                  <MaterialCommunityIcons name="lock" size={16} color="#C7C7CC" />
                )}
              </View>
              
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
        
        {/* Guest Sign In Prompt */}
        {isGuest && (
          <View style={styles.guestPromptContainer}>
            <View style={styles.guestPromptCard}>
              <MaterialCommunityIcons name="account-plus" size={32} color={colors.primary} />
              <Text style={styles.guestPromptTitle}>
                {t('drawer.unlock_features', 'Unlock All Features')}
              </Text>
              <Text style={styles.guestPromptText}>
                {t('drawer.sign_in_benefits', 'Sign in to access chats, history, and personalized features.')}
              </Text>
              <TouchableOpacity 
                style={styles.signInButton}
                onPress={() => {
                  navigation.closeDrawer();
                  navigation.navigate('Auth');
                }}
              >
                <Text style={styles.signInButtonText}>
                  {t('common.sign_in', 'Sign In')}
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Section */}
      <View style={styles.drawerFooter}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons 
            name={isGuest ? "login" : "logout"} 
            size={24} 
            color={isGuest ? colors.primary : "#FF3B30"} 
          />
          <Text style={[styles.logoutText, { color: isGuest ? colors.primary : "#FF3B30" }]}>
            {isGuest ? t('common.sign_in', 'Sign In') : t('common.logout', 'Logout')}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Tawsilet v1.0.0</Text>
          <Text style={styles.appSubtext}>
            {t('drawer.powered_by', 'Powered by FORTEKMA')}
          </Text>
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
          width: Math.min(screenWidth * 0.85, 320),
        },
        overlayColor: 'rgba(0, 0, 0, 0.6)',
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: '#8E8E93',
        drawerLabelStyle: {
          fontSize: hp(1.8),
          fontWeight: '500',
        },
        swipeEnabled: true,
        swipeEdgeWidth: 50,
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
    paddingTop: hp(2),
    paddingBottom: hp(2.5),
    paddingHorizontal: wp(4),
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  
  avatarContainer: {
    position: 'relative',
  },
  
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  guestBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  
  userDetails: {
    marginLeft: wp(3),
    flex: 1,
  },
  
  userName: {
    fontSize: hp(2.4),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  
  userEmail: {
    fontSize: hp(1.5),
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  
  userPhone: {
    fontSize: hp(1.5),
    color: 'rgba(255, 255, 255, 0.9)',
  },
  
  signInPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  
  signInText: {
    fontSize: hp(1.4),
    color: 'rgba(255, 255, 255, 0.9)',
    marginRight: 4,
    fontWeight: '500',
  },
  
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  
  statusText: {
    fontSize: hp(1.4),
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  
  menuContainer: {
    flex: 1,
    paddingTop: hp(1),
  },
  
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(4),
    marginHorizontal: wp(2),
    borderRadius: 12,
    marginBottom: 2,
  },
  
  activeMenuItem: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  
  disabledMenuItem: {
    opacity: 0.5,
  },
  
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  iconContainer: {
    width: 32,
    alignItems: 'center',
  },
  
  menuItemText: {
    fontSize: hp(1.8),
    fontWeight: '500',
    color: '#374151',
    marginLeft: wp(3),
    flex: 1,
  },
  
  activeMenuItemText: {
    color: colors.primary,
    fontWeight: '600',
  },
  
  disabledMenuItemText: {
    color: '#C7C7CC',
  },
  
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  
  activeIndicator: {
    width: 4,
    height: 32,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  
  guestPromptContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  
  guestPromptCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: wp(4),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  
  guestPromptTitle: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  
  guestPromptText: {
    fontSize: hp(1.5),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  
  signInButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  
  signInButtonText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: '#fff',
    marginRight: 6,
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
    marginBottom: hp(1.5),
  },
  
  logoutText: {
    fontSize: hp(1.8),
    fontWeight: '500',
    marginLeft: wp(3),
  },
  
  appInfo: {
    alignItems: 'center',
  },
  
  appVersion: {
    fontSize: hp(1.4),
    color: '#9CA3AF',
    fontWeight: '500',
  },
  
  appSubtext: {
    fontSize: hp(1.2),
    color: '#D1D5DB',
    fontWeight: '400',
    marginTop: 2,
  },
});

export default DrawerNavigator;

