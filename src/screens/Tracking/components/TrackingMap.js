import React, {useEffect, useState} from 'react';
import {Image, Platform, View, Text} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import {styles} from '../styles';

// Configure Mapbox access token
MapboxGL.setAccessToken('pk.eyJ1IjoidGF3c2lsZXQiLCJhIjoiY2x0ZXJhcXNkMGJhZzJqbzJqZWNxZWNxZSJ9.YOUR_MAPBOX_TOKEN');

const TrackingMap = ({
  mapRef,
  region,
  pickupCoordinate,
  dropCoordinate,
  driverPosition,
  order,
  onMapReady,
}) => {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [driverRouteCoordinates, setDriverRouteCoordinates] = useState([]);
  const [turnByTurnDirections, setTurnByTurnDirections] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Fetch route directions from Mapbox Directions API
  const fetchRouteDirections = async (origin, destination, isDriverRoute = false) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?geometries=geojson&steps=true&voice_instructions=true&banner_instructions=true&access_token=pk.eyJ1IjoidGF3c2lsZXQiLCJhIjoiY2x0ZXJhcXNkMGJhZzJqbzJqZWNxZWNxZSJ9.YOUR_MAPBOX_TOKEN`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        
        if (isDriverRoute) {
          setDriverRouteCoordinates(coordinates);
          // Extract turn-by-turn directions for driver
          const directions = route.legs[0].steps.map((step, index) => ({
            instruction: step.maneuver.instruction,
            distance: step.distance,
            duration: step.duration,
            index: index
          }));
          setTurnByTurnDirections(directions);
        } else {
          setRouteCoordinates(coordinates);
        }
      }
    } catch (error) {
      console.error('Error fetching route directions:', error);
    }
  };

  useEffect(() => {
    if (pickupCoordinate[0] !== 0 && dropCoordinate[0] !== 0) {
      // Fetch main route from pickup to drop-off
      fetchRouteDirections(pickupCoordinate, dropCoordinate, false);
    }
  }, [pickupCoordinate, dropCoordinate]);

  useEffect(() => {
    if (driverPosition[0] !== 0 && driverPosition[1] !== 0) {
      const destination = order?.attributes?.commandStatus === 'Pending' 
        ? pickupCoordinate 
        : dropCoordinate;
      
      if (destination[0] !== 0 && destination[1] !== 0) {
        // Fetch driver route with turn-by-turn directions
        fetchRouteDirections(driverPosition, destination, true);
      }
    }
  }, [driverPosition, pickupCoordinate, dropCoordinate, order?.attributes?.commandStatus]);

  const renderTurnByTurnDirections = () => {
    if (turnByTurnDirections.length === 0) return null;
    
    const currentDirection = turnByTurnDirections[currentStepIndex];
    if (!currentDirection) return null;

    return (
      <View style={styles.directionsOverlay}>
        <Text style={styles.directionText}>
          {currentDirection.instruction}
        </Text>
        <Text style={styles.distanceText}>
          {Math.round(currentDirection.distance)}m - {Math.round(currentDirection.duration)}s
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        ref={mapRef}
        onDidFinishLoadingMap={onMapReady}
        styleURL="mapbox://styles/mapbox/streets-v12"
        pitchEnabled={true}
        rotateEnabled={true}
        compassEnabled={true}
        zoomEnabled={true}
        scrollEnabled={true}>
        
        {/* Camera with 3D perspective */}
        <MapboxGL.Camera
          centerCoordinate={[region.longitude, region.latitude]}
          zoomLevel={16}
          pitch={60}
          heading={0}
          animationDuration={1000}
        />

        {/* User location */}
        <MapboxGL.UserLocation
          visible={true}
          showsUserHeadingIndicator={true}
        />

        {/* Main route line (pickup to drop-off) */}
        {routeCoordinates.length > 0 && (
          <MapboxGL.ShapeSource
            id="routeSource"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: routeCoordinates.map(coord => [coord[1], coord[0]])
              }
            }}>
            <MapboxGL.LineLayer
              id="routeLine"
              style={{
                lineColor: '#595FE5',
                lineWidth: 5,
                lineOpacity: 0.8
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Driver route line with real-time directions */}
        {driverRouteCoordinates.length > 0 && (
          <MapboxGL.ShapeSource
            id="driverRouteSource"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: driverRouteCoordinates.map(coord => [coord[1], coord[0]])
              }
            }}>
            <MapboxGL.LineLayer
              id="driverRouteLine"
              style={{
                lineColor: '#FF0000',
                lineWidth: 3,
                lineOpacity: 0.9,
                lineDasharray: [2, 2]
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Driver marker with 3D truck model */}
        {driverPosition[0] !== 0 && driverPosition[1] !== 0 && (
          <MapboxGL.PointAnnotation
            id="driverMarker"
            coordinate={[driverPosition[1], driverPosition[0]]}>
            <View style={styles.driverMarker}>
              <Image
                source={require('../../../assets/TRUCK.png')}
                style={styles.truckIcon}
              />
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {/* Pickup marker */}
        {pickupCoordinate[0] !== 0 && pickupCoordinate[1] !== 0 && (
          <MapboxGL.PointAnnotation
            id="pickupMarker"
            coordinate={[pickupCoordinate[1], pickupCoordinate[0]]}>
            <View style={styles.pickupMarker}>
              <Text style={styles.markerText}>📍</Text>
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {/* Drop-off marker */}
        {dropCoordinate[0] !== 0 && dropCoordinate[1] !== 0 && (
          <MapboxGL.PointAnnotation
            id="dropMarker"
            coordinate={[dropCoordinate[1], dropCoordinate[0]]}>
            <View style={styles.dropMarker}>
              <Text style={styles.markerText}>🏁</Text>
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {/* 3D Buildings layer for street view effect */}
        <MapboxGL.FillExtrusionLayer
          id="3d-buildings"
          sourceID="composite"
          sourceLayerID="building"
          filter={['==', 'extrude', 'true']}
          style={{
            fillExtrusionColor: '#aaa',
            fillExtrusionHeight: ['get', 'height'],
            fillExtrusionBase: ['get', 'min_height'],
            fillExtrusionOpacity: 0.6
          }}
        />
      </MapboxGL.MapView>

      {/* Turn-by-turn directions overlay */}
      {renderTurnByTurnDirections()}
    </View>
  );
};

export default TrackingMap; 