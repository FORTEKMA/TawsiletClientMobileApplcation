import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, I18nManager } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';
import ConfirmButton from './ConfirmButton';
import Geolocation from 'react-native-geolocation-service';
import { getAddressFromCoordinates, getDistanceFromGoogleAPI, getDistanceFromLatLonInMeters } from '../../../utils/helpers/mapUtils';
import { Spinner, Toast } from 'native-base';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { API_GOOGLE } from "@env";
import { 
  trackBookingStepViewed,
  trackBookingStepCompleted,
  trackBookingStepBack,
  trackDropoffLocationSelected
} from '../../../utils/analytics';
import { colors } from '../../../utils/colors';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

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

  // Track step view
  useEffect(() => {
    trackBookingStepViewed(2, 'Dropoff Location');
  }, []);

  // Function to validate distance using Google API
  const validateDistance = async (pickupLat, pickupLng, dropoffLat, dropoffLng) => {
    try {
      setIsCalculatingDistance(true);
      const distance = await getDistanceFromGoogleAPI(pickupLat, pickupLng, dropoffLat, dropoffLng);
      setIsDistanceValid(distance >= 100);
      return distance;
    } catch (error) {
      console.error('Error calculating distance:', error);
      // If API fails, we'll keep the previous validation state
      return null;
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  useEffect(() => {
    if (formData?.dropAddress) {
      // Check if the dropoff address has actually changed
      const currentAddress = `${formData.dropAddress.latitude},${formData.dropAddress.longitude}`;
      const previousAddress = previousDropoffAddress.current;
      
      const hasAddressChanged = previousAddress !== currentAddress;
      
      setDropoffAddress(formData.dropAddress);
      previousDropoffAddress.current = currentAddress;
      
      // Only set hasUserInteracted to true if it's not the initial load
      if (!isInitialLoad.current) {
        setHasUserInteracted(true);
      } else {
        isInitialLoad.current = false;
      }
      
      const isValid = isInTunisia(formData.dropAddress.latitude, formData.dropAddress.longitude);
      setIsLocationValid(isValid);
      
      // Distance check using Google API - only if address has changed
      if (formData.pickupAddress && formData.dropAddress && hasAddressChanged) {
        validateDistance(
          formData.pickupAddress.latitude,
          formData.pickupAddress.longitude,
          formData.dropAddress.latitude,
          formData.dropAddress.longitude
        );
      } else if (!hasAddressChanged && formData.pickupAddress && formData.dropAddress) {
        // If address hasn't changed, just validate the existing distance without API call
        const dist = getDistanceFromLatLonInMeters(
          formData.pickupAddress.latitude,
          formData.pickupAddress.longitude,
          formData.dropAddress.latitude,
          formData.dropAddress.longitude
        );
        setIsDistanceValid(dist >= 100);
      } else {
        setIsDistanceValid(true);
      }
      
      inputRef.current?.clear();
    }
  }, [formData]);

  const handleLocationSelect = async (data, details = null) => {
    if (details) {
      const newAddress = {
        address: details.formatted_address,
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
      };
      
      // Check if the address has actually changed
      const currentAddress = `${newAddress.latitude},${newAddress.longitude}`;
      const previousAddress = previousDropoffAddress.current;
      const hasAddressChanged = previousAddress !== currentAddress;
      
      setDropoffAddress(newAddress);
      previousDropoffAddress.current = currentAddress;
      setHasUserInteracted(true);
      
      const isValid = isInTunisia(details.geometry.location.lat, details.geometry.location.lng);
      setIsLocationValid(isValid);
      
      // Distance check using Google API - only if address has changed
      if (formData.pickupAddress && hasAddressChanged) {
        await validateDistance(
          formData.pickupAddress.latitude,
          formData.pickupAddress.longitude,
          newAddress.latitude,
          newAddress.longitude
        );
      } else if (!hasAddressChanged && formData.pickupAddress) {
        // If address hasn't changed, just validate the existing distance without API call
        const dist = getDistanceFromLatLonInMeters(
          formData.pickupAddress.latitude,
          formData.pickupAddress.longitude,
          newAddress.latitude,
          newAddress.longitude
        );
        setIsDistanceValid(dist >= 100);
      } else {
        setIsDistanceValid(true);
      }
      
      // Track location selection
      trackDropoffLocationSelected(newAddress, {
        source: 'google_places',
        is_in_tunisia: isValid
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
    trackBookingStepCompleted(2, 'Dropoff Location', {
      address: dropoffAddress.address,
      latitude: dropoffAddress.latitude,
      longitude: dropoffAddress.longitude,
      is_in_tunisia: isLocationValid
    });
    goNext({ dropAddress: dropoffAddress });
  };

  const handleBack = () => {
    trackBookingStepBack(2, 'Dropoff Location');
    onBack();
  };

  // Check if we should show the ConfirmButton
  const shouldShowConfirmButton = dropoffAddress.latitude && isLocationValid && isDistanceValid && !isCalculatingDistance;
  
  // Check if we should show validation errors (only when user has interacted)
  const shouldShowErrors = hasUserInteracted;

  const renderGooglePlacesAutocomplete = (showError = false) => (
    <GooglePlacesAutocomplete
      predefinedPlacesAlwaysVisible={false}
      placeholder={t('location.dropOff')}
      debounce={300}
      onPress={handleLocationSelect}
      ref={inputRef}
      query={{
        key: API_GOOGLE,
        language: 'en',
        components: 'country:tn',
      }}
      textInputProps={{
        placeholder: formData?.dropAddress?.address ? formData?.dropAddress?.address : t('location.dropOff'),
        placeholderTextColor: colors.textSecondary,
        style: {
          width: "100%",
          color: colors.textPrimary,
          fontSize: hp(1.8),
        }
      }}
      styles={{
        container: {
          flex: 1,
        },
        textInputContainer: {
          borderWidth: 0,
          backgroundColor: 'transparent',
          height: hp(6),
          paddingHorizontal: 0,
        },
        listView: {
          backgroundColor: colors.backgroundPrimary,
          borderRadius: 12,
          marginTop: hp(1),
          shadowColor: colors.uberBlack,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        },
        textInput: {
          height: hp(6),
          color: colors.textPrimary,
          fontSize: hp(1.8),
          backgroundColor: 'transparent',
          paddingHorizontal: 0,
        },
        row: {
          backgroundColor: colors.backgroundPrimary,
          paddingHorizontal: wp(4),
          paddingVertical: hp(1.5),
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        },
        description: {
          color: colors.textPrimary,
          fontSize: hp(1.7),
        },
        predefinedPlacesDescription: {
          color: colors.textSecondary,
        },
      }}
      fetchDetails={true}
      enablePoweredByContainer={false}
      minLength={2}
    />
  );

  return (
    <View style={[styles.step1Wrapper, isMapDragging && { opacity: 0.5 }]}>
      <View style={localStyles.bottomSheet}>
        <View style={localStyles.bottomSheetHandle} />
        <View style={localStyles.header}>
          <TouchableOpacity onPress={handleBack} style={localStyles.backButton}>
            <MaterialCommunityIcons 
              name={I18nManager.isRTL ? "arrow-right" : "arrow-left"} 
              size={hp(2.5)} 
              color={colors.textPrimary} 
            />
          </TouchableOpacity>
          <Text style={localStyles.headerTitle}>{t('location.where_to')}</Text>
        </View>

        <View style={localStyles.content}>
          <View style={localStyles.searchContainer}>
            <View style={localStyles.locationDots}>
              <View style={localStyles.pickupDot} />
              <View style={localStyles.routeLine} />
              <View style={localStyles.dropoffDot} />
            </View>
            {renderGooglePlacesAutocomplete()}
          </View>
          
          {isCalculatingDistance && (
            <View style={localStyles.loadingContainer}>
              <Spinner size="sm" color={colors.uberBlue} />
              <Text style={localStyles.loadingText}>
                {t('location.calculating_distance') || 'Calculating distance...'}
              </Text>
            </View>
          )}
          
          {shouldShowErrors && !isLocationValid && (
            <View style={localStyles.errorContainer}>
              <MaterialIcons name="error-outline" size={hp(5)} color={colors.error} />
              <Text style={localStyles.errorText}>
                {t('location.outside_tunisia') || 'This location is outside Tunisia. Please select a location within Tunisia.'}
              </Text>
            </View>
          )}
          
          {shouldShowErrors && !isDistanceValid && !isCalculatingDistance && (
            <View style={localStyles.errorContainer}>
              <MaterialIcons name="error-outline" size={hp(5)} color={colors.error} />
              <Text style={localStyles.errorText}>
                {t('location.too_close') || 'The dropoff location must be at least 100 meters from the pickup location.'}
              </Text>
            </View>
          )}
        </View>

        {dropoffAddress.latitude && (
          <View style={localStyles.buttonContainer}>
            <ConfirmButton
              onPress={handleContinue}
              text={t('location.continue')}
              disabled={!shouldShowConfirmButton}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  bottomSheet: {
    backgroundColor: colors.backgroundPrimary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: colors.uberBlack,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    paddingBottom: hp(3),
  },
  bottomSheetHandle: {
    width: wp(10),
    height: 4,
    backgroundColor: colors.borderMedium,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: hp(1),
    marginBottom: hp(1),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: wp(3),
  },
  backButton: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: wp(5),
    padding: wp(2),
    shadowColor: colors.uberBlack,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: hp(2.5),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
  },
  searchContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.uberBlack,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationDots: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: wp(3),
  },
  pickupDot: {
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
    backgroundColor: colors.uberBlack,
    marginBottom: hp(0.5),
  },
  routeLine: {
    width: 2,
    height: hp(3),
    backgroundColor: colors.borderMedium,
    marginBottom: hp(0.5),
  },
  dropoffDot: {
    width: wp(2.5),
    height: wp(2.5),
    backgroundColor: colors.uberBlack,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: hp(2),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    marginTop: hp(2),
    gap: wp(3),
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  loadingText: {
    color: colors.uberBlue,
    fontSize: hp(1.7),
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: hp(3),
    backgroundColor: colors.errorLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    marginTop: hp(2),
  },
  errorText: {
    marginTop: hp(1.5),
    color: colors.error,
    textAlign: 'center',
    fontSize: hp(1.8),
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
  },
});

export default DropoffLocation;

