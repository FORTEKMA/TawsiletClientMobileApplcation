import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const OrderPlaceholder = () => {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header Placeholder */}
      <View style={styles.header}>
        <View style={styles.backButtonPlaceholder} />
        <View style={styles.headerContentPlaceholder}>
          <View style={styles.titlePlaceholder} />
          <View style={styles.orderNumberPlaceholder} />
        </View>
        <View style={styles.supportButtonPlaceholder} />
      </View>

      {/* Content Placeholders */}
      <View style={styles.content}>
        {/* Status Card Placeholder */}
        <View style={styles.statusCardPlaceholder}>
          <View style={styles.statusHeaderPlaceholder}>
            <View style={styles.statusIndicatorPlaceholder} />
            <View style={styles.statusTitlePlaceholder} />
          </View>
          <View style={styles.statusDescriptionPlaceholder} />
          <View style={styles.statusTimePlaceholder} />
        </View>

        {/* Track Button Placeholder */}
        <View style={styles.trackButtonPlaceholder} />

        {/* Driver Info Placeholder */}
        <View style={styles.cardPlaceholder}>
          <View style={styles.cardTitlePlaceholder} />
          <View style={styles.driverContainerPlaceholder}>
            <View style={styles.driverAvatarPlaceholder} />
            <View style={styles.driverDetailsPlaceholder}>
              <View style={styles.driverNamePlaceholder} />
              <View style={styles.ratingPlaceholder} />
              <View style={styles.vehiclePlaceholder} />
            </View>
          </View>
          <View style={styles.driverActionsPlaceholder}>
            <View style={styles.chatButtonPlaceholder} />
            <View style={styles.callButtonPlaceholder} />
          </View>
        </View>

        {/* Trip Details Placeholder */}
        <View style={styles.cardPlaceholder}>
          <View style={styles.cardTitlePlaceholder} />
          <View style={styles.locationContainerPlaceholder}>
            <View style={styles.locationIconPlaceholder} />
            <View style={styles.locationDetailsPlaceholder}>
              <View style={styles.locationLabelPlaceholder} />
              <View style={styles.locationAddressPlaceholder} />
              <View style={styles.locationTimePlaceholder} />
            </View>
          </View>
          <View style={styles.routeLinePlaceholder} />
          <View style={styles.locationContainerPlaceholder}>
            <View style={styles.locationIconPlaceholder} />
            <View style={styles.locationDetailsPlaceholder}>
              <View style={styles.locationLabelPlaceholder} />
              <View style={styles.locationAddressPlaceholder} />
            </View>
          </View>
        </View>

        {/* Payment Details Placeholder */}
        <View style={styles.cardPlaceholder}>
          <View style={styles.cardTitlePlaceholder} />
          <View style={styles.paymentRowPlaceholder}>
            <View style={styles.paymentLabelPlaceholder} />
            <View style={styles.paymentValuePlaceholder} />
          </View>
          <View style={styles.paymentDividerPlaceholder} />
          <View style={styles.paymentRowPlaceholder}>
            <View style={styles.totalLabelPlaceholder} />
            <View style={styles.totalValuePlaceholder} />
          </View>
          <View style={styles.paymentMethodPlaceholder} />
        </View>

        {/* Order Info Placeholder */}
        <View style={styles.cardPlaceholder}>
          <View style={styles.cardTitlePlaceholder} />
          <View style={styles.infoRowPlaceholder}>
            <View style={styles.infoLabelPlaceholder} />
            <View style={styles.infoValuePlaceholder} />
          </View>
          <View style={styles.infoRowPlaceholder}>
            <View style={styles.infoLabelPlaceholder} />
            <View style={styles.infoValuePlaceholder} />
          </View>
          <View style={styles.infoRowPlaceholder}>
            <View style={styles.infoLabelPlaceholder} />
            <View style={styles.infoValuePlaceholder} />
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButtonPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5E5',
  },
  headerContentPlaceholder: {
    flex: 1,
    marginLeft: 16,
  },
  titlePlaceholder: {
    width: 120,
    height: 18,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    marginBottom: 4,
  },
  orderNumberPlaceholder: {
    width: 80,
    height: 14,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  supportButtonPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5E5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
  },
  statusCardPlaceholder: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  statusHeaderPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicatorPlaceholder: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E5E5',
    marginRight: 12,
  },
  statusTitlePlaceholder: {
    width: 150,
    height: 18,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  statusDescriptionPlaceholder: {
    width: '80%',
    height: 16,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    marginBottom: 8,
  },
  statusTimePlaceholder: {
    width: 120,
    height: 12,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  trackButtonPlaceholder: {
    height: 56,
    backgroundColor: '#E5E5E5',
    borderRadius: 12,
    marginTop: 16,
  },
  cardPlaceholder: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cardTitlePlaceholder: {
    width: 140,
    height: 16,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    marginBottom: 16,
  },
  driverContainerPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E5E5',
    marginRight: 16,
  },
  driverDetailsPlaceholder: {
    flex: 1,
  },
  driverNamePlaceholder: {
    width: 120,
    height: 16,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    marginBottom: 4,
  },
  ratingPlaceholder: {
    width: 80,
    height: 14,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    marginBottom: 4,
  },
  vehiclePlaceholder: {
    width: 100,
    height: 14,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  driverActionsPlaceholder: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  chatButtonPlaceholder: {
    flex: 1,
    height: 44,
    backgroundColor: '#E5E5E5',
    borderRadius: 12,
  },
  callButtonPlaceholder: {
    flex: 1,
    height: 44,
    backgroundColor: '#E5E5E5',
    borderRadius: 12,
  },
  locationContainerPlaceholder: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIconPlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: '#E5E5E5',
    borderRadius: 12,
    marginRight: 16,
    marginTop: 2,
  },
  locationDetailsPlaceholder: {
    flex: 1,
  },
  locationLabelPlaceholder: {
    width: 80,
    height: 12,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    marginBottom: 4,
  },
  locationAddressPlaceholder: {
    width: '90%',
    height: 16,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    marginBottom: 4,
  },
  locationTimePlaceholder: {
    width: 100,
    height: 12,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  routeLinePlaceholder: {
    width: 2,
    height: 20,
    backgroundColor: '#E5E5E5',
    marginLeft: 11,
    marginVertical: 8,
  },
  paymentRowPlaceholder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabelPlaceholder: {
    width: 80,
    height: 14,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  paymentValuePlaceholder: {
    width: 60,
    height: 14,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  paymentDividerPlaceholder: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 12,
  },
  totalLabelPlaceholder: {
    width: 100,
    height: 16,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  totalValuePlaceholder: {
    width: 80,
    height: 16,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  paymentMethodPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  infoRowPlaceholder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabelPlaceholder: {
    width: 100,
    height: 14,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  infoValuePlaceholder: {
    width: 80,
    height: 14,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  bottomSpacing: {
    height: 32,
  },
});

export default OrderPlaceholder; 