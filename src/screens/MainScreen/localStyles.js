import {StyleSheet,Platform,Dimensions} from 'react-native';
import {heightPercentageToDP as hp, widthPercentageToDP as wp} from 'react-native-responsive-screen';
import {colors} from '../../utils/colors';
const {width, height} = Dimensions.get('window');

export const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  stepContainer: {
    backgroundColor: 'transparent',
    position: 'absolute',
    left: 0,
    right: 0,
    flex: 1,
    zIndex: 2000,
    elevation: Platform.OS === 'android' ? 2000 : undefined,
  },
  stepContent: {
    width: width,
    backgroundColor: 'transparent',
    flex: 1,
  },
  
  // Modern Current Location Button (Uber-style)
  currentLocationButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#FFFFFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  currentLocationButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modern Map Markers (Uber-style)
  pickupMarker: {
    width: 24, 
    height: 24, 
    borderRadius: 12,
    backgroundColor: '#000000',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pickupMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF'
  },
  
  dropoffMarker: {
    width: 24, 
    height: 24, 
    backgroundColor: '#000000',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dropoffMarkerInner: {
    width: 8,
    height: 8,
    backgroundColor: '#FFFFFF'
  },

  clusterMarker: {
    width: 32,
    height: 32,
    backgroundColor: '#000000',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },  
  clusterText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: hp(1.4),
    textAlign: 'center'
  },

  // Modern Bottom Sheet Container (Uber-style)
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
    paddingTop: 12,
  },
  
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },

  // Modern Step Components Container
  stepComponentContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
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

  // Modern Card Styles
  modernCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },

  // Modern Button Styles
  modernButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
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
  
  modernButtonText: {
    color: '#FFFFFF',
    fontSize: hp(1.8),
    fontWeight: '600',
    marginLeft: 8,
  },

  modernSecondaryButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  
  modernSecondaryButtonText: {
    color: '#000000',
    fontSize: hp(1.8),
    fontWeight: '600',
    marginLeft: 8,
  },

  // Floating Action Button (for additional actions)
  floatingActionButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#000000',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modern Input Styles
  modernInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: hp(1.8),
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },

  modernInputFocused: {
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },

  // Modern Text Styles
  modernTitle: {
    fontSize: hp(2.4),
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },

  modernSubtitle: {
    fontSize: hp(1.8),
    fontWeight: '500',
    color: '#6C757D',
    marginBottom: 16,
  },

  modernBodyText: {
    fontSize: hp(1.6),
    fontWeight: '400',
    color: '#495057',
    lineHeight: 22,
  },

  // Animation Containers
  slideUpContainer: {
    transform: [{ translateY: 0 }],
  },

  fadeContainer: {
    opacity: 1,
  },

  // Status Bar Styles
  statusBarStyle: {
    backgroundColor: 'transparent',
  },

  // Loading States
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },

  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },

  loadingText: {
    fontSize: hp(1.8),
    fontWeight: '500',
    color: '#495057',
    marginTop: 16,
    textAlign: 'center',
  },
});

