import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, I18nManager, Platform } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';
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

  return (
    <View style={[localStyles.container, isMapDragging && { opacity: 0.5 }]}>
      {/* Uber-style Header with Back Button */}
      <View style={localStyles.uberHeader}>
        <TouchableOpacity onPress={handleBack} style={localStyles.backButton}>
          <MaterialCommunityIcons name={I18nManager.isRTL ? "arrow-right" : "arrow-left"} size={24} color="#000" />
        </TouchableOpacity>
        
        <View style={localStyles.headerTextContainer}>
          <Text style={localStyles.uberTitle}>{t('location.set_destination', 'Set your destination')}</Text>
          <Text style={localStyles.uberSubtitle}>{t('location.drag_map_instruction', 'Drag map to move pin')}</Text>
        </View>
      </View>

      {/* Uber-style Search Input */}
      <View style={localStyles.uberContent}>
        <View style={localStyles.searchContainer}>
          <View style={localStyles.inputWrapper}>
            <View style={localStyles.iconContainer}>
              <MaterialCommunityIcons name="square" size={12} color="#000" />
            </View>
            
            <GooglePlacesAutocomplete
              predefinedPlacesAlwaysVisible={false}
              placeholder={t('location.where_to', 'Where to?')}
              debounce={300}
              onPress={handleLocationSelect}
              ref={inputRef}
              query={{
                key: API_GOOGLE,
                language: 'en',
                components: 'country:tn',
              }}
              textInputProps={{
                placeholder: formData?.dropAddress?.address ? formData?.dropAddress?.address : t('location.where_to', 'Where to?'),
                placeholderTextColor: "#8E8E93",
                style: localStyles.textInput
              }}
              styles={{
                container: localStyles.autocompleteContainer,
                textInputContainer: localStyles.textInputContainer,
                listView: localStyles.listView,
                textInput: localStyles.googleTextInput,
                row: localStyles.row,
                description: localStyles.description,
              }}
              fetchDetails={true}
              enablePoweredByContainer={false}
              minLength={2}
            />
            
            <TouchableOpacity style={localStyles.searchIconContainer}>
              <MaterialIcons name="search" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Loading State */}
        {isCalculatingDistance && (
          <View style={localStyles.loadingContainer}>
            <Spinner size="sm" color="#007AFF" />
            <Text style={localStyles.loadingText}>
              {t('location.calculating_distance') || 'Calculating distance...'}
            </Text>
          </View>
        )}
        
        {/* Error States */}
        {shouldShowErrors && !isLocationValid && (
          <View style={localStyles.errorContainer}>
            <MaterialIcons name="error-outline" size={24} color="#ff3b30" />
            <Text style={localStyles.errorText}>
              {t('location.outside_tunisia') || 'This location is outside Tunisia. Please select a location within Tunisia.'}
            </Text>
          </View>
        )}
        
        {shouldShowErrors && !isDistanceValid && !isCalculatingDistance && (
          <View style={localStyles.errorContainer}>
            <MaterialIcons name="error-outline" size={24} color="#ff3b30" />
            <Text style={localStyles.errorText}>
              {t('location.too_close') || 'The dropoff location must be at least 100 meters from the pickup location.'}
            </Text>
          </View>
        )}

        {/* Uber-style Continue Button */}
        <TouchableOpacity
          style={[
            localStyles.uberButton,
            !shouldShowConfirmButton && localStyles.uberButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!shouldShowConfirmButton}
        >
          <Text style={[
            localStyles.uberButtonText,
            !shouldShowConfirmButton && localStyles.uberButtonTextDisabled
          ]}>
            {t('location.search_destination', 'Search destination')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  uberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  uberTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  uberSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  uberContent: {
    paddingHorizontal: 24,
    flex: 1,
  },
  searchContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 56,
  },
  iconContainer: {
    marginRight: 12,
  },
  autocompleteContainer: {
    flex: 1,
  },
  textInputContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 0,
    marginHorizontal: 0,
    height: 48,
  },
  googleTextInput: {
    backgroundColor: 'transparent',
    height: 48,
    fontSize: 16,
    color: '#000',
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  textInput: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  listView: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  description: {
    color: '#000',
    fontSize: 16,
  },
  searchIconContainer: {
    marginLeft: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 16,
  },
  loadingText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF2F2',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  errorText: {
    marginLeft: 12,
    color: '#ff3b30',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  uberButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: Platform.OS === 'ios' ? 34 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  uberButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  uberButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uberButtonTextDisabled: {
    color: '#8E8E93',
  },
});

export default DropoffLocation;

