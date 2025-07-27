import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  I18nManager,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';
import { localStyles } from '../localStyles';
import ConfirmButton from './ConfirmButton';
import Geolocation from 'react-native-geolocation-service';
import { getAddressFromCoordinates, getDistanceFromGoogleAPI, getDistanceFromLatLonInMeters } from '../../../utils/helpers/mapUtils';
import { Spinner, Toast } from 'native-base';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { API_GOOGLE } from "@env";
import { 
  trackBookingStepViewed,
  trackBookingStepCompleted,
  trackBookingStepBack,
  trackDropoffLocationSelected
} from '../../../utils/analytics';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

const { width: screenWidth } = Dimensions.get('window');

// Tunisia's approximate boundaries
const TUNISIA_BOUNDS = {
  north: 37.5439,
  south: 30.2302,
  east: 11.5983,
  west: 7.5248
};

const isInTunisia = (latitude, longitude) => {
  return (
    latitude >= TUNISIA_BOUNDS.south &&
    latitude <= TUNISIA_BOUNDS.north &&
    longitude >= TUNISIA_BOUNDS.west &&
    longitude <= TUNISIA_BOUNDS.east
  );
};

const DropoffLocation = ({ formData, goNext, isMapDragging, onBack, animateToRegion }) => {
  const { t } = useTranslation();
  
  const [dropoffAddress, setDropoffAddress] = useState(formData?.dropAddress || {});
  const [isLocationValid, setIsLocationValid] = useState(true);
  const [isDistanceValid, setIsDistanceValid] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const inputRef = useRef(null);
  const isInitialLoad = useRef(true);
  const previousDropoffAddress = useRef(null);

  // Animation values
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.95)).current;
  const routeAnimation = useRef(new Animated.Value(0)).current;

  // Track step view
  useEffect(() => {
    trackBookingStepViewed(2, 'Dropoff Location');
    
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

  // Validate distance when addresses change
  useEffect(() => {
    const validateDistance = async () => {
      if (formData?.pickupAddress && dropoffAddress?.latitude && hasUserInteracted) {
        setIsCalculatingDistance(true);
        
        try {
          const distance = await getDistanceFromGoogleAPI(
            formData.pickupAddress,
            dropoffAddress
          );
          
          const isValid = distance >= 0.5; // Minimum 500m distance
          setIsDistanceValid(isValid);
          
          if (isValid) {
            // Animate route visualization
            Animated.timing(routeAnimation, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }).start();
          }
        } catch (error) {
          console.error('Distance validation error:', error);
          setIsDistanceValid(true); // Default to valid if error
        } finally {
          setIsCalculatingDistance(false);
        }
      }
    };

    validateDistance();
  }, [dropoffAddress, formData?.pickupAddress, hasUserInteracted]);

  const handleLocationSelect = (data, details = null) => {
    if (details) {
      setHasUserInteracted(true);
      const newAddress = {
        address: details.formatted_address,
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
      };
      
      const isValid = isInTunisia(
        details.geometry.location.lat,
        details.geometry.location.lng
      );
      
      setDropoffAddress(newAddress);
      setIsLocationValid(isValid);
      
      // Track location selection
      trackDropoffLocationSelected(newAddress, {
        source: 'google_places',
        is_in_tunisia: isValid,
        pickup_address: formData?.pickupAddress?.address
      });
      
      if (animateToRegion && isValid) {
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

    trackBookingStepCompleted(2, 'Dropoff Location', {
      address: dropoffAddress.address,
      latitude: dropoffAddress.latitude,
      longitude: dropoffAddress.longitude,
      is_in_tunisia: isLocationValid,
      is_distance_valid: isDistanceValid
    });
    
    goNext({ dropAddress: dropoffAddress });
  };

  const handleBack = () => {
    trackBookingStepBack(2, 'Dropoff Location');
    if (onBack) onBack();
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

  const canContinue = dropoffAddress.latitude && isLocationValid && isDistanceValid && !isCalculatingDistance;

  return (
    <Animated.View style={[
      modernStyles.container,
      isMapDragging && { opacity: 0.5 },
      animatedContainerStyle
    ]}>
      <View style={modernStyles.handleBar} />
      
      <View style={modernStyles.header}>
        <TouchableOpacity style={modernStyles.backButton} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <View style={modernStyles.headerContent}>
          <Text style={modernStyles.headerTitle}>
            {t('location.where_to', 'Where to?')}
          </Text>
          <Text style={modernStyles.headerSubtitle}>
            {t('location.select_destination', 'Select your destination')}
          </Text>
        </View>
      </View>

      <View style={modernStyles.content}>
        {/* Route Summary */}
        {formData?.pickupAddress && (
          <View style={modernStyles.routeSummary}>
            <View style={modernStyles.routePoint}>
              <View style={modernStyles.pickupDot} />
              <Text style={modernStyles.routePointText} numberOfLines={1}>
                {formData.pickupAddress.address}
              </Text>
            </View>
            
            <View style={modernStyles.routeLine}>
              <Animated.View 
                style={[
                  modernStyles.routeLineActive,
                  {
                    scaleY: routeAnimation,
                  }
                ]} 
              />
            </View>
            
            <View style={modernStyles.routePoint}>
              <View style={modernStyles.dropoffDot} />
              <Text style={[
                modernStyles.routePointText,
                !dropoffAddress.address && modernStyles.routePointTextPlaceholder
              ]} numberOfLines={1}>
                {dropoffAddress.address || t('location.destination', 'Destination')}
              </Text>
            </View>
          </View>
        )}

        {/* Search Input */}
        <View style={modernStyles.searchContainer}>
          <GooglePlacesAutocomplete
            predefinedPlacesAlwaysVisible={false}
            placeholder={t('location.search_destination', 'Search for destination')}
            debounce={300} 
            onPress={handleLocationSelect}
            ref={inputRef}
            textInputProps={{
              placeholder: formData?.dropAddress?.address || t('location.search_destination', 'Search for destination'),
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

        {/* Validation Messages */}
        {hasUserInteracted && !isLocationValid && (
          <View style={modernStyles.errorContainer}>
            <MaterialCommunityIcons name="map-marker-off" size={20} color="#FF3B30" />
            <Text style={modernStyles.errorText}>
              {t('location.outside_service_area', 'This location is outside our service area')}
            </Text>
          </View>
        )}

        {hasUserInteracted && isLocationValid && !isDistanceValid && (
          <View style={modernStyles.warningContainer}>
            <MaterialCommunityIcons name="information" size={20} color="#FF9500" />
            <Text style={modernStyles.warningText}>
              {t('location.minimum_distance', 'Minimum trip distance is 500 meters')}
            </Text>
          </View>
        )}

        {isCalculatingDistance && (
          <View style={modernStyles.loadingContainer}>
            <Spinner size="sm" color="#000" />
            <Text style={modernStyles.loadingText}>
              {t('location.calculating_route', 'Calculating route...')}
            </Text>
          </View>
        )}

        {/* Quick Destinations */}
        <View style={modernStyles.quickDestinations}>
          <Text style={modernStyles.quickDestinationsTitle}>
            {t('location.quick_destinations', 'Quick destinations')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={modernStyles.quickDestinationItem}>
              <MaterialCommunityIcons name="home" size={20} color="#6C757D" />
              <Text style={modernStyles.quickDestinationText}>
                {t('location.home', 'Home')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={modernStyles.quickDestinationItem}>
              <MaterialCommunityIcons name="briefcase" size={20} color="#6C757D" />
              <Text style={modernStyles.quickDestinationText}>
                {t('location.work', 'Work')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={modernStyles.quickDestinationItem}>
              <MaterialCommunityIcons name="airplane" size={20} color="#6C757D" />
              <Text style={modernStyles.quickDestinationText}>
                {t('location.airport', 'Airport')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Continue Button */}
      <View style={modernStyles.buttonContainer}>
        <TouchableOpacity
          style={[
            modernStyles.continueButton,
            !canContinue && modernStyles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.8}
        >
          <Text style={[
            modernStyles.continueButtonText,
            !canContinue && modernStyles.continueButtonTextDisabled
          ]}>
            {t('location.continue', 'Continue')}
          </Text>
          <MaterialCommunityIcons 
            name="arrow-right" 
            size={20} 
            color={canContinue ? "#FFFFFF" : "#9CA3AF"} 
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  
  headerContent: {
    flex: 1,
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

  routeSummary: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000000',
    marginRight: 12,
  },
  
  dropoffDot: {
    width: 12,
    height: 12,
    backgroundColor: '#000000',
    marginRight: 12,
  },
  
  routePointText: {
    flex: 1,
    fontSize: hp(1.6),
    fontWeight: '500',
    color: '#000000',
  },
  
  routePointTextPlaceholder: {
    color: '#9CA3AF',
  },
  
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E9ECEF',
    marginLeft: 5,
    marginVertical: 8,
    overflow: 'hidden',
  },
  
  routeLineActive: {
    width: 2,
    height: 20,
    backgroundColor: '#000000',
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

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  
  errorText: {
    flex: 1,
    fontSize: hp(1.6),
    fontWeight: '500',
    color: '#FF3B30',
    marginLeft: 12,
  },

  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBF0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  
  warningText: {
    flex: 1,
    fontSize: hp(1.6),
    fontWeight: '500',
    color: '#FF9500',
    marginLeft: 12,
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 16,
  },
  
  loadingText: {
    fontSize: hp(1.6),
    fontWeight: '500',
    color: '#6C757D',
    marginLeft: 12,
  },

  quickDestinations: {
    marginTop: 8,
  },
  
  quickDestinationsTitle: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  
  quickDestinationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  
  quickDestinationText: {
    fontSize: hp(1.6),
    fontWeight: '500',
    color: '#495057',
    marginLeft: 8,
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
});

export default DropoffLocation;

