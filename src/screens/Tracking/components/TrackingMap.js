import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { styles } from '../styles';

// Initialize Mapbox with your access token
Mapbox.setAccessToken('pk.eyJ1IjoidGF3c2lsZXQiLCJhIjoiY2x6aGZkZGJkMGNqZjJqcGNxZGNqZGNxZCJ9.example'); // Replace with your actual token

const TrackingMap = ({
  mapRef,
  region,
  pickupCoordinate,
  dropCoordinate,
  driverPosition,
  order,
  onMapReady,
}) => {
  const cameraRef = useRef(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [driverRouteCoordinates, setDriverRouteCoordinates] = useState([]);

  // Fetch route coordinates using Mapbox Directions API
  const fetchRoute = async (origin, destination) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?geometries=geojson&access_token=${Mapbox.getAccessToken()}`
      );
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes[0].geometry.coordinates;
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
    return [];
  };

  // Update routes when coordinates change
  useEffect(() => {
    if (pickupCoordinate[0] !== 0 && dropCoordinate[0] !== 0) {
      fetchRoute(pickupCoordinate, dropCoordinate).then(setRouteCoordinates);
    }
  }, [pickupCoordinate, dropCoordinate]);

  useEffect(() => {
    if (driverPosition[0] !== 0 && driverPosition[1] !== 0) {
      const destination = order?.attributes?.commandStatus === 'Pending' 
        ? pickupCoordinate 
        : dropCoordinate;
      
      if (destination[0] !== 0 && destination[1] !== 0) {
        fetchRoute(driverPosition, destination).then(setDriverRouteCoordinates);
      }

      // Animate camera to follow driver with smooth transition
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [driverPosition[1], driverPosition[0]],
          zoomLevel: 15,
          animationDuration: 1000,
          animationMode: 'easeTo',
        });
      }
    }
  }, [driverPosition, order?.attributes?.commandStatus, pickupCoordinate, dropCoordinate]);

  const handleMapReady = () => {
    if (onMapReady) {
      onMapReady();
    }
    
    // Set initial camera position
    if (cameraRef.current && region) {
      cameraRef.current.setCamera({
        centerCoordinate: [region.longitude, region.latitude],
        zoomLevel: 12,
        animationDuration: 1000,
      });
    }
  };

  return (
    <View style={styles.map}>
      <Mapbox.MapView
        style={{ flex: 1 }}
        onDidFinishLoadingMap={handleMapReady}
        ref={mapRef}
        styleURL={Mapbox.StyleURL.Street}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={true}
        scaleBarEnabled={false}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}>
        
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={12}
          centerCoordinate={[region.longitude, region.latitude]}
          animationMode="easeTo"
          animationDuration={1000}
        />

        <Mapbox.UserLocation
          visible={true}
          showsUserHeadingIndicator={true}
          minDisplacement={1}
        />

        {/* Main route from pickup to drop */}
        {routeCoordinates.length > 0 && (
          <Mapbox.ShapeSource
            id="routeSource"
            shape={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: routeCoordinates,
              },
            }}>
            <Mapbox.LineLayer
              id="routeLayer"
              style={{
                lineColor: '#595FE5',
                lineWidth: 5,
                lineOpacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* Driver route (dynamic based on order status) */}
        {driverRouteCoordinates.length > 0 && (
          <Mapbox.ShapeSource
            id="driverRouteSource"
            shape={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: driverRouteCoordinates,
              },
            }}>
            <Mapbox.LineLayer
              id="driverRouteLayer"
              style={{
                lineColor: '#FF0000',
                lineWidth: 3,
                lineOpacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
                lineDasharray: [2, 2],
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* Driver marker with custom truck icon */}
        {driverPosition[0] !== 0 && driverPosition[1] !== 0 && (
          <Mapbox.PointAnnotation
            id="driverMarker"
            coordinate={[driverPosition[1], driverPosition[0]]}
            title="Driver Location">
            <View style={{
              width: 40,
              height: 40,
              backgroundColor: 'white',
              borderRadius: 20,
              borderWidth: 2,
              borderColor: '#595FE5',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}>
              <Image
                source={require('../../../assets/TRUCK.png')}
                style={{
                  width: 24,
                  height: 24,
                  resizeMode: 'contain',
                }}
              />
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Pickup marker */}
        {pickupCoordinate[0] !== 0 && pickupCoordinate[1] !== 0 && (
          <Mapbox.PointAnnotation
            id="pickupMarker"
            coordinate={[pickupCoordinate[1], pickupCoordinate[0]]}
            title="Adresse de ramassage">
            <View style={{
              width: 30,
              height: 30,
              backgroundColor: '#4CAF50',
              borderRadius: 15,
              borderWidth: 3,
              borderColor: 'white',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }} />
          </Mapbox.PointAnnotation>
        )}

        {/* Drop marker */}
        {dropCoordinate[0] !== 0 && dropCoordinate[1] !== 0 && (
          <Mapbox.PointAnnotation
            id="dropMarker"
            coordinate={[dropCoordinate[1], dropCoordinate[0]]}
            title="Adresse de dépot">
            <View style={{
              width: 30,
              height: 30,
              backgroundColor: '#F44336',
              borderRadius: 15,
              borderWidth: 3,
              borderColor: 'white',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }} />
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>
    </View>
  );
};

export default TrackingMap; 