import {StyleSheet,Platform,Dimensions} from 'react-native';
import {heightPercentageToDP as hp} from 'react-native-responsive-screen';
import {colors} from '../../utils/colors';
const {width} = Dimensions.get('window');
export const   localStyles = StyleSheet.create({
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
      width: width,
      backgroundColor: 'transparent',
      flex: 1,
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
  