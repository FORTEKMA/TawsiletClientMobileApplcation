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
  const [mapPitch, setMapPitch] = useState(60); // 3D perspective angle
  const [followDriver, setFollowDriver] = useState(true); // Auto-follow driver
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
            ?.position?.coords?.latitude,
        longitude:
          order?.attributes?.driver_id?.data?.attributes?.accountOverview[0]
            ?.position?.coords?.longitude,
        latitudeDelta,
        longitudeDelta,
      });
    }
  }, [order]);

  // Auto-follow driver with 3D camera
  useEffect(() => {
    if (followDriver && driverPosition[0] !== 0 && driverPosition[1] !== 0 && mapRef.current) {
      // Update camera to follow driver with 3D perspective
      mapRef.current.setCamera({
        centerCoordinate: [driverPosition[1], driverPosition[0]],
        zoomLevel: 17,
        pitch: mapPitch,
        heading: 0,
        animationDuration: 2000,
      });
    }
  }, [driverPosition, followDriver, mapPitch]);

  const handleAnimateToDriverPosition = () => {
    setFollowDriver(true);
    if (mapRef.current && driverPosition[0] !== 0 && driverPosition[1] !== 0) {
      mapRef.current.setCamera({
        centerCoordinate: [driverPosition[1], driverPosition[0]],
        zoomLevel: 17,
        pitch: 60,
        heading: 0,
        animationDuration: 1000,
      });
    }
  };

  const handleAnimateToPickupPosition = () => {
    setFollowDriver(false);
    if (mapRef.current && pickupCoordinate[0] !== 0 && pickupCoordinate[1] !== 0) {
      mapRef.current.setCamera({
        centerCoordinate: [pickupCoordinate[1], pickupCoordinate[0]],
        zoomLevel: 16,
        pitch: 45,
        heading: 0,
        animationDuration: 1000,
      });
    }
  };

  const handleAnimateToDropPosition = () => {
    setFollowDriver(false);
    if (mapRef.current && dropCoordinate[0] !== 0 && dropCoordinate[1] !== 0) {
      mapRef.current.setCamera({
        centerCoordinate: [dropCoordinate[1], dropCoordinate[0]],
        zoomLevel: 16,
        pitch: 45,
        heading: 0,
        animationDuration: 1000,
      });
    }
  };

  // Toggle between 2D and 3D view
  const handleToggle3DView = () => {
    const newPitch = mapPitch === 0 ? 60 : 0;
    setMapPitch(newPitch);
    if (mapRef.current) {
      mapRef.current.setCamera({
        pitch: newPitch,
        animationDuration: 1000,
      });
    }
  };

  // Show overview of entire route
  const handleShowRouteOverview = () => {
    setFollowDriver(false);
    if (mapRef.current && pickupCoordinate[0] !== 0 && dropCoordinate[0] !== 0) {
      // Calculate bounds to fit both pickup and drop-off points
      const minLat = Math.min(pickupCoordinate[0], dropCoordinate[0]);
      const maxLat = Math.max(pickupCoordinate[0], dropCoordinate[0]);
      const minLng = Math.min(pickupCoordinate[1], dropCoordinate[1]);
      const maxLng = Math.max(pickupCoordinate[1], dropCoordinate[1]);
      
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      
      mapRef.current.setCamera({
        centerCoordinate: [centerLng, centerLat],
        zoomLevel: 12,
        pitch: 30,
        heading: 0,
        animationDuration: 1500,
      });
    }
  };

  const handleMapReady = () => {
    if (mapRef.current) {
      mapRef.current.setCamera({
        centerCoordinate: [region.longitude, region.latitude],
        zoomLevel: 16,
        pitch: 60,
        heading: 0,
        animationDuration: 1000,
      });
    }
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
          mapPitch={mapPitch}
          followDriver={followDriver}
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
        onToggle3D={handleToggle3DView}
        onRouteOverview={handleShowRouteOverview}
        is3DEnabled={mapPitch > 0}
        isFollowingDriver={followDriver}
      />
    </View>
  );
};

export default Tracking; 