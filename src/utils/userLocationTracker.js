import Geolocation from 'react-native-geolocation-service';
import db from './firebase';
import { Platform, PermissionsAndroid } from 'react-native';

let watchId = null;

async function requestLocationPermission() {
  if (Platform.OS === 'android') {
    const fineLocationGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'This app needs access to your location.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    let backgroundGranted = true;
    if (Platform.Version >= 29) { // Android 10+
      backgroundGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        {
          title: 'Background Location Permission',
          message: 'This app needs access to your location in the background.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      backgroundGranted = backgroundGranted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return (
      fineLocationGranted === PermissionsAndroid.RESULTS.GRANTED &&
      backgroundGranted
    );
  }
  // iOS permissions are handled by the library
  return true;
}

export async function startTrackingUserLocation(documentId) {
  if (!documentId) return;
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return;

  stopTrackingUserLocation(); // Ensure no duplicate watches

  // Set isActive true when tracking starts
  db.ref(`users/${documentId}/is_active`).set(true);

  // Set up onDisconnect to set isActive to false when the app disconnects
  db.ref(`users/${documentId}/is_active`).onDisconnect().set(false);

  watchId = Geolocation.watchPosition(
    position => {
      const { latitude, longitude, accuracy, timestamp } = position.coords;
      if(latitude && longitude){
      db.ref(`users/${documentId}`).set({
        latitude,
        longitude,
        accuracy,
        isActive: true,
      });
      }
    },
    error => {
      console.error('Location tracking error:', error);
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 10, // meters
      interval: 10000, // ms
      fastestInterval: 5000, // ms
      showsBackgroundLocationIndicator: true,
      forceRequestLocation: true,
    },
  );
}

export function stopTrackingUserLocation() {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
} 