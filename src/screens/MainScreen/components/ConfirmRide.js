import React, { useEffect, useState, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, I18nManager, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { styles } from '../styles';
import api from "../../../utils/api"
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { calculatePrice } from '../../../utils/CalculateDistanceAndTime';
import { 
  trackBookingStepViewed,
  trackBookingStepCompleted,
  trackBookingStepBack,
  trackRideConfirmed
} from '../../../utils/analytics';
import { colors } from '../../../utils/colors';

const ConfirmRideComponent = ({ goBack, formData, rideData, goNext, handleReset }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const user = useSelector(state => state.user.currentUser);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
 
  // Get vehicle info from formData
  const getVehicleInfo = () => {
    if (!formData?.vehicleType) {
      return null;
    }
    
    const vehicle = formData.vehicleType;
    return {
      icon: vehicle.icon ,
      label: vehicle.label || getLocalizedName(vehicle),
      description: vehicle.description || getDefaultDescription(vehicle.id)
    };
  };

  // Get localized name based on current language
  const getLocalizedName = (vehicle) => {
    const currentLang = i18nInstance.language;
    switch (currentLang) {
      case 'ar':
        return vehicle.name_ar || vehicle.name_en || 'Vehicle';
      case 'fr':
        return vehicle.name_fr || vehicle.name_en || 'Vehicle';
      default:
        return vehicle.name_en || 'Vehicle';
    }
  };

  // Get default description based on vehicle ID
  const getDefaultDescription = (vehicleId) => {
    switch (vehicleId) {
      case 1:
        return 'eco_description';
      case 2:
        return 'berline_description';
      case 3:
        return 'van_description';
      default:
        return 'eco_description';
    }
  };

  // Track step view
  useEffect(() => {
    trackBookingStepViewed(4, 'Ride Confirmation');
  }, []);

  useEffect(() => {
    const getData = async () => {
      try {
        setLoading(true);
      
        const response = await calculatePrice(formData)
        setPrice(response.price);
        setLoading(false);
      } catch (error) {
        console.log(error)
        goBack()
        setLoading(false);
      }
    
    }
    getData();
  }, [rideData]);

  const splitDateTime=(isoString)=> {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const departDate = `${year}-${month}-${day}`;
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    const departTime = `${hours}:${minutes}:${seconds}.${milliseconds}`;
  
    return { departDate, deparTime: departTime };
  }

  const handleBack = () => {
    trackBookingStepBack(4, 'Ride Confirmation');
    goBack();
  };

  const handleConfirm = () => {
    trackBookingStepCompleted(4, 'Ride Confirmation', {
      price: price,
      distance: formData.distance,
      time: formData.time,
      vehicle_type: formData?.vehicleType?.key,
      has_scheduled_date: !!formData.selectedDate
    });
    goNext({ price });
  };

  const handleReservation = async () => {
    try {
      setIsLoading(true);
      const payload = {
        payType: "Livraison",
        commandStatus: "Pending",
        totalPrice: price,
        distance: formData.distance,
        ...splitDateTime(formData.selectedDate),
      
        duration: formData.time,
        isAccepted: false,
        client: {
          id: user.id
        },
        carType:formData?.vehicleType.id,
        pickUpAddress: {
          Address: formData?.pickupAddress?.address || "Livraison",
          coordonne: {
            longitude: formData?.pickupAddress?.longitude || "17",
            latitude: formData?.pickupAddress?.latitude || "17",
          },
        },
        dropOfAddress: {
          Address: formData?.dropAddress?.address || "Livraison",
          coordonne: {
            longitude: formData?.dropAddress?.longitude || "17",
            latitude: formData?.dropAddress?.latitude || "17",
          },
        }
      }
      const res = await api.post("/commands", { data: payload });
      
      // Track successful reservation
      trackRideConfirmed({
        ...formData,
        price: price,
        reservation_id: res.data?.id
      });
      
      setShowSuccessModal(true);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[localStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.uberBlack} />
      </View>
    );
  }

  const vehicleInfo = getVehicleInfo();

  // Show error if no vehicle info is available
  if (!vehicleInfo) {
    return (
      <View style={[localStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialCommunityIcons name="car-off" size={hp(6)} color={colors.textSecondary} />
        <Text style={{ fontSize: hp(1.8), color: colors.textPrimary, marginTop: hp(2), textAlign: 'center' }}>
          Vehicle information not available
        </Text>
      </View>
    );
  }

  return (
    <View style={localStyles.bottomSheet}>
      <View style={localStyles.bottomSheetHandle} />
      
      {/* Header */}
      <View style={localStyles.header}>
        <TouchableOpacity
          style={localStyles.backButton}
          onPress={handleBack}
        >
          <MaterialCommunityIcons name={I18nManager.isRTL?"arrow-right":"arrow-left"} size={hp(2.5)} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={localStyles.headerTitle}>{t('booking.step4.confirm_ride')}</Text>
      </View>

      <View style={localStyles.content}>
        {/* Car Type Card */}
        <View style={localStyles.card}>
          <View style={localStyles.row}>
            <Image source={vehicleInfo.icon} style={localStyles.vehicleIcon} />
            <View style={{ flex: 1 }}>
              <Text style={localStyles.carType}>{vehicleInfo.label}</Text>
              <Text style={localStyles.carDescription}>{t(vehicleInfo.description)}</Text>
            </View>
          </View>
        </View>

        {/* Pickup & Dropoff */}
        <View style={localStyles.infoCard}>
          <View style={localStyles.pickupDropRow}>
            <View style={localStyles.locationDots}>
              <View style={localStyles.pickupDot} />
            </View>
            <View style={localStyles.locationInfo}>
              <Text style={localStyles.label}>{t('pickup_point')}</Text>
              <Text style={localStyles.boldText} numberOfLines={2}>{formData?.pickupAddress?.address}</Text>
            </View>
          </View>

          <View style={localStyles.verticalLine} />

          <View style={localStyles.pickupDropRow}>
            <View style={localStyles.locationDots}>
              <View style={localStyles.dropoffDot} />
            </View>
            <View style={localStyles.locationInfo}>
              <Text style={localStyles.label}>{t('pick_off')}</Text>
              <Text style={localStyles.boldText} numberOfLines={2}>{formData?.dropAddress?.address}</Text>
            </View>
          </View>
        </View>

        {/* Scheduled Date Card - Show only if selectedDate exists */}
        {formData?.selectedDate && (
          <View style={localStyles.dateCard}>
            <View style={localStyles.dateRow}>
              <MaterialCommunityIcons name="calendar-clock" size={hp(2.8)} color={colors.uberBlue} />
              <View style={{ flex: 1, marginLeft: wp(3) }}>
                <Text style={localStyles.dateLabel}>{t('scheduled_date')}</Text>
                <Text style={localStyles.dateText}>
                  {new Date(formData.selectedDate).toLocaleDateString(i18nInstance.language === 'ar' ? 'ar-TN' : 'en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Price Information */}
        {formData?.selectedDate && (
          <View style={localStyles.priceInfoCard}>
            <View style={localStyles.priceInfoRow}>
              <MaterialCommunityIcons name="information" size={hp(2)} color={colors.textSecondary} />
              <Text style={localStyles.priceInfoText}>
                {t('price_includes_reservation', { 
                  amount: parseFloat(formData.vehicleType.reservation_price).toFixed(2) 
                })}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
      >
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modalContent}>
            <MaterialCommunityIcons name="check-circle" size={hp(7)} color={colors.success} />
            <Text style={localStyles.modalTitle}>{t('success')}</Text>
            <Text style={localStyles.modalText}>{t('common.reservation_created_success')}</Text>
            <TouchableOpacity 
              style={localStyles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                handleReset();
              }}
            >
              <Text style={localStyles.modalButtonText}>{t('ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Next Button */}
      <View style={localStyles.buttonContainer}>
        <TouchableOpacity 
          style={[localStyles.nextButtonWrapper, isLoading && localStyles.disabledButton]} 
          onPress={() => formData?.selectedDate != undefined ? handleReservation() : handleConfirm()}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Text style={localStyles.nextButtonPrice}>{parseFloat(price).toFixed(2)} DT</Text>
              <Text style={localStyles.nextButtonText}>{t('common.confirm')}</Text>
            </>
          )}
        </TouchableOpacity>
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
    fontWeight: '700',
    fontSize: hp(2.5),
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
  },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: hp(2.5),
    marginBottom: hp(2),
    shadowColor: colors.uberBlack,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  vehicleIcon: {
    width: wp(18),
    height: wp(18),
    marginRight: wp(3),
    resizeMode: 'contain',
  },
  dateCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: hp(2.5),
    marginBottom: hp(2),
    shadowColor: colors.uberBlack,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    color: colors.textSecondary,
    fontSize: hp(1.6),
    fontWeight: '500',
    textAlign: "left",
  },
  dateText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: hp(1.8),
    marginTop: hp(0.5),
    textAlign: "left",
  },
  priceInfoCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: hp(1.5),
    marginTop: hp(1.5),
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  priceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInfoText: {
    fontSize: hp(1.6),
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: wp(2),
    textAlign: "left",
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carType: {
    fontWeight: '700',
    fontSize: hp(2.2),
    color: colors.textPrimary,
    textAlign:"left",
  },
  carDescription: {
    color: colors.textSecondary,
    fontSize: hp(1.7),
    marginTop: hp(0.5),
    textAlign:"left",
  },
  infoCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: hp(2.5),
    marginBottom: hp(2),
    shadowColor: colors.uberBlack,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pickupDropRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: hp(2),
  },
  locationDots: {
    marginRight: wp(3),
    alignItems: 'center',
    paddingTop: hp(0.5),
  },
  pickupDot: {
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
    backgroundColor: colors.uberBlack,
  },
  dropoffDot: {
    width: wp(2.5),
    height: wp(2.5),
    backgroundColor: colors.uberBlack,
  },
  locationInfo: {
    flex: 1,
  },
  label: {
    color: colors.textSecondary,
    fontSize: hp(1.6),
    fontWeight: '500',
    textAlign:"left",
    marginBottom: hp(0.5),
  },
  boldText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: hp(1.8),
    textAlign:"left",
  },
  verticalLine: {
    width: 2,
    height: hp(4),
    backgroundColor: colors.borderMedium,
    position:"absolute",
    top: hp(4.5),
    left: wp(6.2),
    marginBottom: hp(1),
  },
  buttonContainer: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
  },
  nextButtonWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.uberBlack,
    borderRadius: 12,
    paddingVertical: hp(2),
    paddingHorizontal: wp(8),
    width: '100%',
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonPrice: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: hp(2.2),
    marginRight: wp(4),
  },
  nextButtonText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: hp(2.2),
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 20,
    padding: hp(3),
    alignItems: 'center',
    width: '85%',
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: hp(2.5),
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: hp(2),
    marginBottom: hp(1),
  },
  modalText: {
    fontSize: hp(1.8),
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: hp(3),
  },
  modalButton: {
    backgroundColor: colors.uberBlack,
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(8),
    borderRadius: 12,
    width: '100%',
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    color: colors.textInverse,
    fontSize: hp(1.8),
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default memo(ConfirmRideComponent);

