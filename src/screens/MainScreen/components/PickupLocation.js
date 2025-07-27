import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';
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
  
  // Track step view
  useEffect(() => {
    trackBookingStepViewed(1, 'Pickup Location');
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
    trackBookingStepCompleted(1, 'Pickup Location', {
      address: pickupAddress.address,
      latitude: pickupAddress.latitude,
      longitude: pickupAddress.longitude,
      is_in_tunisia: isLocationInTunisia
    });
    goNext({pickupAddress: pickupAddress});
  };

  if (!isLocationInTunisia) {
    return (
      <View style={[styles.step1Wrapper, isMapDragging && { opacity: 0.5 }]}>
        <View style={localStyles.header}>
          <Text style={localStyles.headerTitle}>{t('location.where_are_you')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={localStyles.content}>
          <View style={localStyles.errorContainer}>
            <MaterialIcons name="error-outline" size={40} color="#ff3b30" />
            <Text style={localStyles.errorText}>
              {t('location.outside_tunisia') || 'This location is outside of Tunisia. Please select a location within Tunisia.'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.step1Wrapper, isMapDragging && { opacity: 0.5 }]}>
      <View style={localStyles.header}>
        <Text style={localStyles.headerTitle}>{t('location.where_are_you')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={localStyles.content}>
        <GooglePlacesAutocomplete
          predefinedPlacesAlwaysVisible={false}
          placeholder={t('location.pickUp')}
          debounce={300} 
          onPress={handleLocationSelect}
          ref={inputRef}
          textInputProps={{
            placeholder: formData?.pickupAddress?.address ? formData?.pickupAddress?.address : "",
            placeholderTextColor: "#ccc",
            style: {
              width: "100%",
              color:"#000"
            }
          }}
          query={{
            key: API_GOOGLE,
            language: 'en',
            components: 'country:tn',
          }}
          styles={{
            container: {
              width: "100%"
            },
            textInputContainer: {
              borderWidth: 3,
              borderColor: '#ccc',
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
      </View>

      <ConfirmButton
        onPress={handleContinue}
        text={t('location.continue')}
        disabled={!pickupAddress.latitude}
      />
    </View>
  );
};

const localStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: "100%"
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
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  errorText: {
    marginTop: 10,
    color: '#ff3b30',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default PickupLocation; 