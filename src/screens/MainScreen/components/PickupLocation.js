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
import { colors } from '../../../utils/colors';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

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
        <View style={localStyles.bottomSheet}>
          <View style={localStyles.bottomSheetHandle} />
          <View style={localStyles.header}>
            <Text style={localStyles.headerTitle}>{t('location.where_are_you')}</Text>
          </View>
          <View style={localStyles.content}>
            <View style={localStyles.errorContainer}>
              <MaterialIcons name="error-outline" size={hp(5)} color={colors.error} />
              <Text style={localStyles.errorText}>
                {t('location.outside_tunisia') || 'This location is outside of Tunisia. Please select a location within Tunisia.'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.step1Wrapper, isMapDragging && { opacity: 0.5 }]}>
      <View style={localStyles.bottomSheet}>
        <View style={localStyles.bottomSheetHandle} />
        <View style={localStyles.header}>
          <Text style={localStyles.headerTitle}>{t('location.where_are_you')}</Text>
        </View>

        <View style={localStyles.content}>
          <View style={localStyles.searchContainer}>
            <View style={localStyles.locationDots}>
              <View style={localStyles.pickupDot} />
            </View>
            <GooglePlacesAutocomplete
              predefinedPlacesAlwaysVisible={false}
              placeholder={t('location.pickUp')}
              debounce={300} 
              onPress={handleLocationSelect}
              ref={inputRef}
              textInputProps={{
                placeholder: formData?.pickupAddress?.address ? formData?.pickupAddress?.address : t('location.pickUp'),
                placeholderTextColor: colors.textSecondary,
                style: {
                  width: "100%",
                  color: colors.textPrimary,
                  fontSize: hp(1.8),
                }
              }}
              query={{
                key: API_GOOGLE,
                language: 'en',
                components: 'country:tn',
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
          </View>
        </View>

        <View style={localStyles.buttonContainer}>
          <ConfirmButton
            onPress={handleContinue}
            text={t('location.continue')}
            disabled={!pickupAddress.latitude}
          />
        </View>
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
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
    marginRight: wp(3),
    alignItems: 'center',
  },
  pickupDot: {
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
    backgroundColor: colors.uberBlack,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: hp(3),
    backgroundColor: colors.errorLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
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

export default PickupLocation;

