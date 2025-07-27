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
        placeholder: formData?.dropAddress?.address ? formData?.dropAddress?.address : "",
        placeholderTextColor: "#ccc",
        style: {
          width: "100%",
           color:"#000"
        }
      }}
      styles={{
        container: {
          width: "100%",
        //  marginBottom: showError ? 20 : 0,

        },
        textInputContainer: {
          borderWidth: 3,
          borderColor: showError ? '#ff3b30' : '#ccc',
          borderRadius: 8,
          backgroundColor: '#fff',
          color: "#000",
          height: 50,
          paddingHorizontal: 10,
        },
        listView: {
          marginTop: 15,
        },
        textInput: {
          height: 50,
          color: '#000',
          fontSize: 16,
          placeholderTextColor: "#ccc",
          width: "100%"
        },
        row: {
          width: "100%"
        },
        description: {
          color: '#000',
        },
      }}
      fetchDetails={true}
      enablePoweredByContainer={false}
      minLength={2}
    />
  );

  return (
    <View style={[styles.step1Wrapper, isMapDragging && { opacity: 0.5 }]}>
      <View style={localStyles.header}>
        <TouchableOpacity onPress={handleBack} style={localStyles.backButton}>
          <MaterialCommunityIcons name={I18nManager.isRTL?"arrow-right": "arrow-left"} size={28} color="#030303" />
        </TouchableOpacity>
        <Text style={localStyles.headerTitle}>{t('location.where_to')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={localStyles.content}>
        {renderGooglePlacesAutocomplete()}
        
        {isCalculatingDistance && (
          <View style={localStyles.loadingContainer}>
            <Spinner size="sm" color="#007AFF" />
            <Text style={localStyles.loadingText}>
              {t('location.calculating_distance') || 'Calculating distance...'}
            </Text>
          </View>
        )}
        
        {shouldShowErrors && !isLocationValid && (
          <View style={localStyles.errorContainer}>
            <MaterialIcons name="error-outline" size={40} color="#ff3b30" />
            <Text style={localStyles.errorText}>
              {t('location.outside_tunisia') || 'This location is outside Tunisia. Please select a location within Tunisia.'}
            </Text>
          </View>
        )}
        
        {shouldShowErrors && !isDistanceValid && !isCalculatingDistance && (
          <View style={localStyles.errorContainer}>
            <MaterialIcons name="error-outline" size={40} color="#ff3b30" />
            <Text style={localStyles.errorText}>
              {t('location.too_close') || 'The dropoff location must be at least 100 meters from the pickup location.'}
            </Text>
          </View>
        )}
      </View>

      {dropoffAddress.latitude && (
        <ConfirmButton
          onPress={handleContinue}
          text={t('location.continue')}
          disabled={!shouldShowConfirmButton}
        />
      )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:"flex-start"
,    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: "100%",
    gap:10
  },
  backButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    padding: 16,
    width: "100%"
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 15,
    gap: 10
  },
  loadingText: {
    color: '#007AFF',
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff3b30',
    marginTop:15
  },
  errorText: {
    marginTop: 10,
    color: '#ff3b30',
    textAlign: 'center',
    fontSize: 16,
  }
});

export default DropoffLocation; 