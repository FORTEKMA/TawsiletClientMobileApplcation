import React, {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import Card from '../../components/Card';
import MapControls from './components/MapControls';
import TimerOverlay from './components/TimerOverlay';
import TrackingMap from './components/TrackingMap';
import {styles} from './styles';
import { 
  trackScreenView, 
  trackRideStarted 
} from '../../utils/analytics';

const Tracking = ({order, timer}) => {
  const mapRef = useRef(null);
  const [pickupCoordinate, setPickupCoordinate] = useState([0, 0]);
  const [dropCoordinate, setDropCoordinateCoordinate] = useState([0, 0]);
  const [driverPosition, setDriverPosition] = useState([0, 0]);
  const latitudeDelta = 0.4;
  const longitudeDelta = 0.4;
  const [region, setRegion] = useState({
    latitude: 48.8566,
    longitude: 2.3522,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  });

  // Track screen view on mount
  useEffect(() => {
    trackScreenView('Tracking', { 
      order_id: order?.id,
      has_driver: !!order?.driver_id
    });
  }, []);

  useEffect(() => {
    if (order) {
      // Track ride started when order is loaded
      if (order?.id) {
        trackRideStarted(order.id, {
          driver_id: order?.driver_id?.id,
          pickup_address: order?.attributes?.pickUpAddress?.address,
          dropoff_address: order?.attributes?.dropOfAddress?.address
        });
      }
      
      setDriverPosition([
        order?.driver_id?.location?.latitude,
        order?.driver_id?.location?.longitude,
      ]);
      setDropCoordinateCoordinate([
        order?.attributes?.dropOfAddress?.coordonne?.latitude,
        order?.attributes?.dropOfAddress?.coordonne?.longitude,
      ]);
      setPickupCoordinate([
        order?.attributes?.pickUpAddress?.coordonne?.latitude,
        order?.attributes?.pickUpAddress?.coordonne?.longitude,
      ]);
      setRegion({
        latitude:
          order?.attributes?.driver_id?.data?.attributes?.accountOverview[0]
            ?.position?.coords?.latitude || order?.driver_id?.location?.latitude || 48.8566,
        longitude:
          order?.attributes?.driver_id?.data?.attributes?.accountOverview[0]
            ?.position?.coords?.longitude || order?.driver_id?.location?.longitude || 2.3522,
        latitudeDelta,
        longitudeDelta,
      });
    }
  }, [order]);

  const handleAnimateToDriverPosition = () => {
    if (mapRef.current && driverPosition[0] !== 0 && driverPosition[1] !== 0) {
      // For Mapbox, we'll use the camera ref from TrackingMap component
      // This will be handled by the TrackingMap component's camera animation
      const cameraUpdate = {
        centerCoordinate: [driverPosition[1], driverPosition[0]],
        zoomLevel: 16,
        animationDuration: 1000,
        animationMode: 'easeTo',
      };
      
      // Trigger camera animation through map reference
      if (mapRef.current.setCamera) {
        mapRef.current.setCamera(cameraUpdate);
      }
    }
  };

  const handleAnimateToPickupPosition = () => {
    if (mapRef.current && pickupCoordinate[0] !== 0 && pickupCoordinate[1] !== 0) {
      const cameraUpdate = {
        centerCoordinate: [pickupCoordinate[1], pickupCoordinate[0]],
        zoomLevel: 16,
        animationDuration: 1000,
        animationMode: 'easeTo',
      };
      
      if (mapRef.current.setCamera) {
        mapRef.current.setCamera(cameraUpdate);
      }
    }
  };

  const handleAnimateToDropPosition = () => {
    if (mapRef.current && dropCoordinate[0] !== 0 && dropCoordinate[1] !== 0) {
      const cameraUpdate = {
        centerCoordinate: [dropCoordinate[1], dropCoordinate[0]],
        zoomLevel: 16,
        animationDuration: 1000,
        animationMode: 'easeTo',
      };
      
      if (mapRef.current.setCamera) {
        mapRef.current.setCamera(cameraUpdate);
      }
    }
  };

  const handleMapReady = () => {
    // Map is ready, initial camera position will be set by TrackingMap component
    console.log('Mapbox map is ready');
  };

  return (
    <View style={styles.container}>
      {pickupCoordinate[0] !== 0 &&
      dropCoordinate[0] !== 0 &&
      driverPosition[0] !== 0 ? (
        <TrackingMap
          mapRef={mapRef}
          region={region}
          pickupCoordinate={pickupCoordinate}
          dropCoordinate={dropCoordinate}
          driverPosition={driverPosition}
          order={order}
          onMapReady={handleMapReady}
        />
      ) : null}
      <View style={styles.overlay2}>
        <Card order={order} />
      </View>
      <TimerOverlay timer={timer} />
      <MapControls
        onDriverPosition={handleAnimateToDriverPosition}
        onDropPosition={handleAnimateToDropPosition}
        onPickupPosition={handleAnimateToPickupPosition}
      />
    </View>
  );
};

export default Tracking; 