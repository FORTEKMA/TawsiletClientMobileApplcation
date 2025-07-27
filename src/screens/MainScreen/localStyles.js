import { StyleSheet, Dimensions, Platform } from 'react-native';
import {heightPercentageToDP as hp} from 'react-native-responsive-screen';
import {colors} from '../../utils/colors';
const {width} = Dimensions.get('window');
export const   localStyles = StyleSheet.create({
  uberHeaderButton:{
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    backgroundColor: 'white',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
    container: {
      flex: 1,
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
      // width: width,
      // backgroundColor: 'transparent',
      // flex: 1,
    },
    drawerToggleButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 60 : 40,
      left: 20,
      backgroundColor: 'white',
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      zIndex: 1000,
    },
    currentLocationButton: {
      position: 'absolute',
      right: 20,
      backgroundColor: 'white',
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    currentLocationButtonInner: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    pickupMarker: {
      width: 20, 
      height: 20, 
      borderRadius: 10,
      backgroundColor: '#030303',
      borderWidth: 2,
      borderColor: 'white',
      justifyContent: 'center',
      alignItems: 'center'
    },
    pickupMarkerInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'white'
    },
    dropoffMarker: {
      width: 20, 
      height: 20, 
      backgroundColor: '#030303',
      borderWidth: 2,
      borderColor: 'white',
      justifyContent: 'center',
      alignItems: 'center'
    },
    dropoffMarkerInner: {
      width: 8,
      height: 8,
      backgroundColor: 'white'
    },
    routeInfoContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    routeInfoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'white',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      borderWidth: 1,
      borderColor: 'rgba(0, 0, 0, 0.1)',
    },
    routeInfoText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#007AFF',
      marginLeft: 4,
    },
    clusterMarker: {
      width: 20,
      height: 20,
      backgroundColor: '#030303',
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center'
    },  
    clusterText: {
      color: 'white',
      fontWeight: 'bold',
      textAlign: 'center'
    }
  });
  