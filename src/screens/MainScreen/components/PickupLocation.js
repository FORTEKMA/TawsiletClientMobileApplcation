import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Animated,
  Dimensions
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';
import { localStyles } from '../localStyles';
import ConfirmButton from './ConfirmButton';
import Geolocation from 'react-native-geolocation-service';
import { getAddressFromCoordinates } from '../../../utils/helpers/mapUtils';
import { Spinner, Toast } from 'native-base';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { API_GOOGLE } from "@env";
import { 
  trackBookingStepViewed,
  trackBookingStepCompleted,
  trackPickupLocationSelected
} from '../../../utils/analytics';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

const { width: screenWidth } = Dimensions.get('window');

const isInTunisia = (latitude, longitude) => {
  const TUNISIA_BOUNDS = {
    minLat: 30.230236,
    maxLat: 37.543915,
    minLng: 7.524833,
    maxLng: 11.598278
  };
  
  return latitude >= TUNISIA_BOUNDS.minLat && 
         latitude <= TUNISIA_BOUNDS.maxLat && 
         longitude >= TUNISIA_BOUNDS.minLng && 
         longitude <= TUNISIA_BOUNDS.maxLng;
};

const PickupLocation = ({ formData, goNext, isMapDragging, animateToRegion }) => {
  const { t } = useTranslation();
  const [pickupAddress, setPickupAddress] = useState(formData?.pickupAddress || {});
  const inputRef = useRef(null);
  const [isLocationInTunisia, setIsLocationInTunisia] = useState(true);
  
  // Animation values
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.95)).current;
  
  // Track step view
  useEffect(() => {
    trackBookingStepViewed(1, 'Pickup Location');
    
    // Start entrance animations
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  useEffect(() => {
    if (formData?.pickupAddress) {
      setPickupAddress(formData.pickupAddress);
      const isInTunisiaBounds = isInTunisia(
        formData.pickupAddress.latitude,
        formData.pickupAddress.longitude
      );
      setIsLocationInTunisia(isInTunisiaBounds);
      inputRef.current?.clear();
    }
  }, [formData]);

  const handleLocationSelect = (data, details = null) => {
    if (details) {
      const newAddress = {
        address: details.formatted_address,
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
      };
      setPickupAddress(newAddress);
      setIsLocationInTunisia(isInTunisia(
        details.geometry.location.lat,
        details.geometry.location.lng
      ));
      
      // Track location selection
      trackPickupLocationSelected(newAddress, {
        source: 'google_places',
        is_in_tunisia: isInTunisia(details.geometry.location.lat, details.geometry.location.lng)
      });
      
      if (animateToRegion) {
        animateToRegion({
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    }
  };

  const handleContinue = () => {
    // Add button press animation
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    trackBookingStepCompleted(1, 'Pickup Location', {
      address: pickupAddress.address,
      latitude: pickupAddress.latitude,
      longitude: pickupAddress.longitude,
      is_in_tunisia: isLocationInTunisia
    });
    goNext({pickupAddress: pickupAddress});
  };

  const animatedContainerStyle = {
    transform: [
      {
        translateY: slideAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0],
        }),
      },
      { scale: scaleAnimation },
    ],
    opacity: fadeAnimation,
  };

  if (!isLocationInTunisia) {
    return (
      <Animated.View style={[
        modernStyles.container,
        isMapDragging && { opacity: 0.5 },
        animatedContainerStyle
      ]}>
        <View style={modernStyles.handleBar} />
        
        <View style={modernStyles.header}>
          <Text style={modernStyles.headerTitle}>
            {t('location.where_are_you', 'Where are you?')}
          </Text>
          <Text style={modernStyles.headerSubtitle}>
            {t('location.select_pickup', 'Select your pickup location')}
          </Text>
        </View>

        <View style={modernStyles.content}>
          <View style={modernStyles.errorContainer}>
            <View style={modernStyles.errorIconContainer}>
              <MaterialCommunityIcons name="map-marker-off" size={32} color="#FF3B30" />
            </View>
            <Text style={modernStyles.errorTitle}>
              {t('location.outside_service_area', 'Outside Service Area')}
            </Text>
            <Text style={modernStyles.errorText}>
              {t('location.outside_tunisia', 'This location is outside of Tunisia. Please select a location within our service area.')}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[
      modernStyles.container,
      isMapDragging && { opacity: 0.5 },
      animatedContainerStyle
    ]}>
      <View style={modernStyles.handleBar} />
      
      <View style={modernStyles.header}>
        <Text style={modernStyles.headerTitle}>
          {t('location.where_are_you', 'Where are you?')}
        </Text>
        <Text style={modernStyles.headerSubtitle}>
          {t('location.select_pickup', 'Select your pickup location')}
        </Text>
      </View>

      <View style={modernStyles.content}>
        {/* Current Location Button */}
        <TouchableOpacity style={modernStyles.currentLocationButton} activeOpacity={0.8}>
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#000" />
          <Text style={modernStyles.currentLocationText}>
            {t('location.use_current_location', 'Use current location')}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#6C757D" />
        </TouchableOpacity>

        {/* Search Input */}
        <View style={modernStyles.searchContainer}>
          <GooglePlacesAutocomplete
            predefinedPlacesAlwaysVisible={false}
            placeholder={t('location.search_pickup', 'Search for pickup location')}
            debounce={300} 
            onPress={handleLocationSelect}
            ref={inputRef}
            textInputProps={{
              placeholder: formData?.pickupAddress?.address || t('location.search_pickup', 'Search for pickup location'),
              placeholderTextColor: "#9CA3AF",
              style: modernStyles.searchInput,
            }}
            query={{
              key: API_GOOGLE,
              language: 'en',
              components: 'country:tn',
            }}
            styles={{
              container: modernStyles.autocompleteContainer,
              textInputContainer: modernStyles.searchInputContainer,
              listView: modernStyles.suggestionsList,
              row: modernStyles.suggestionRow,
              description: modernStyles.suggestionText,
              separator: modernStyles.suggestionSeparator,
            }}
            fetchDetails={true}
            enablePoweredByContainer={false}
            minLength={2}
            renderLeftButton={() => (
              <View style={modernStyles.searchIconContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color="#6C757D" />
              </View>
            )}
          />
        </View>

        {/* Selected Location Display */}
        {pickupAddress.address && (
          <View style={modernStyles.selectedLocationContainer}>
            <View style={modernStyles.selectedLocationIcon}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#000" />
            </View>
            <View style={modernStyles.selectedLocationInfo}>
              <Text style={modernStyles.selectedLocationTitle}>
                {t('location.pickup_location', 'Pickup Location')}
              </Text>
              <Text style={modernStyles.selectedLocationAddress}>
                {pickupAddress.address}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Continue Button */}
      <View style={modernStyles.buttonContainer}>
        <TouchableOpacity
          style={[
            modernStyles.continueButton,
            !pickupAddress.latitude && modernStyles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!pickupAddress.latitude}
          activeOpacity={0.8}
        >
          <Text style={[
            modernStyles.continueButtonText,
            !pickupAddress.latitude && modernStyles.continueButtonTextDisabled
          ]}>
            {t('location.continue', 'Continue')}
          </Text>
          <MaterialCommunityIcons 
            name="arrow-right" 
            size={20} 
            color={pickupAddress.latitude ? "#FFFFFF" : "#9CA3AF"} 
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const modernStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },

  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  
  headerTitle: {
    fontSize: hp(2.6),
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  
  headerSubtitle: {
    fontSize: hp(1.6),
    fontWeight: '400',
    color: '#6C757D',
  },

  content: {
    paddingHorizontal: 24,
  },

  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  
  currentLocationText: {
    flex: 1,
    fontSize: hp(1.8),
    fontWeight: '500',
    color: '#000000',
    marginLeft: 12,
  },

  searchContainer: {
    marginBottom: 20,
  },
  
  autocompleteContainer: {
    flex: 0,
  },
  
  searchInputContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    paddingHorizontal: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  searchIconContainer: {
    marginRight: 12,
  },
  
  searchInput: {
    flex: 1,
    fontSize: hp(1.8),
    color: '#000000',
    fontWeight: '400',
  },
  
  suggestionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  
  suggestionRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  
  suggestionText: {
    fontSize: hp(1.6),
    color: '#000000',
    fontWeight: '400',
  },
  
  suggestionSeparator: {
    height: 1,
    backgroundColor: '#F1F3F4',
    marginHorizontal: 16,
  },

  selectedLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  
  selectedLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  
  selectedLocationInfo: {
    flex: 1,
  },
  
  selectedLocationTitle: {
    fontSize: hp(1.4),
    fontWeight: '600',
    color: '#6C757D',
    marginBottom: 2,
  },
  
  selectedLocationAddress: {
    fontSize: hp(1.6),
    fontWeight: '500',
    color: '#000000',
  },

  buttonContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  
  continueButton: {
    backgroundColor: '#000000',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  
  continueButtonDisabled: {
    backgroundColor: '#F1F3F4',
    shadowOpacity: 0,
    elevation: 0,
  },
  
  continueButtonText: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  
  continueButtonTextDisabled: {
    color: '#9CA3AF',
  },

  // Error State Styles
  errorContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#FF3B30',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  
  errorTitle: {
    fontSize: hp(2),
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 8,
    textAlign: 'center',
  },
  
  errorText: {
    fontSize: hp(1.6),
    fontWeight: '400',
    color: '#C53030',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default PickupLocation;

