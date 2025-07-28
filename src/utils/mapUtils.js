import { getDistance } from 'geolib';

// Tile management for smooth map rendering
export class MapTileManager {
  constructor() {
    this.tiles = new Map();
    this.visibleTiles = new Set();
    this.tileSize = 256; // Standard tile size
  }

  // Calculate tile coordinates from lat/lng
  latLngToTile(lat, lng, zoom) {
    const n = Math.pow(2, zoom);
    const xtile = Math.floor((lng + 180) / 360 * n);
    const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
    return { x: xtile, y: ytile, z: zoom };
  }

  // Get visible tiles for current viewport
  getVisibleTiles(bounds, zoom) {
    const tiles = new Set();
    const { north, south, east, west } = bounds;
    
    const topLeft = this.latLngToTile(north, west, zoom);
    const bottomRight = this.latLngToTile(south, east, zoom);
    
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        tiles.add(`${zoom}/${x}/${y}`);
      }
    }
    
    return Array.from(tiles);
  }

  // Preload tiles for smooth panning
  preloadTiles(centerLat, centerLng, zoom, radius = 1) {
    const tiles = [];
    const centerTile = this.latLngToTile(centerLat, centerLng, zoom);
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const tileKey = `${zoom}/${centerTile.x + dx}/${centerTile.y + dy}`;
        tiles.push(tileKey);
      }
    }
    
    return tiles;
  }
}

// Route optimization and smoothing
export class RouteOptimizer {
  constructor() {
    this.smoothingFactor = 0.3;
    this.minDistance = 10; // meters
  }

  // Smooth route coordinates using moving average
  smoothRoute(coordinates, factor = this.smoothingFactor) {
    if (coordinates.length < 3) return coordinates;
    
    const smoothed = [coordinates[0]];
    
    for (let i = 1; i < coordinates.length - 1; i++) {
      const prev = coordinates[i - 1];
      const current = coordinates[i];
      const next = coordinates[i + 1];
      
      const smoothedLat = current[1] * (1 - factor) + (prev[1] + next[1]) / 2 * factor;
      const smoothedLng = current[0] * (1 - factor) + (prev[0] + next[0]) / 2 * factor;
      
      smoothed.push([smoothedLng, smoothedLat]);
    }
    
    smoothed.push(coordinates[coordinates.length - 1]);
    return smoothed;
  }

  // Remove redundant points to optimize performance
  simplifyRoute(coordinates, tolerance = this.minDistance) {
    if (coordinates.length < 3) return coordinates;
    
    const simplified = [coordinates[0]];
    
    for (let i = 1; i < coordinates.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const current = coordinates[i];
      
      const distance = getDistance(
        { latitude: prev[1], longitude: prev[0] },
        { latitude: current[1], longitude: current[0] }
      );
      
      if (distance > tolerance) {
        simplified.push(current);
      }
    }
    
    simplified.push(coordinates[coordinates.length - 1]);
    return simplified;
  }

  // Generate intermediate points for smooth animation
  generateIntermediatePoints(start, end, numPoints = 5) {
    const points = [];
    const [startLng, startLat] = start;
    const [endLng, endLat] = end;
    
    for (let i = 1; i <= numPoints; i++) {
      const ratio = i / (numPoints + 1);
      const lng = startLng + (endLng - startLng) * ratio;
      const lat = startLat + (endLat - startLat) * ratio;
      points.push([lng, lat]);
    }
    
    return points;
  }

  // Calculate optimal route with waypoints
  calculateOptimalRoute(pickup, dropoff, waypoints = []) {
    const route = [pickup];
    
    // Add waypoints if provided
    if (waypoints.length > 0) {
      route.push(...waypoints);
    }
    
    route.push(dropoff);
    
    // Smooth the route
    const smoothed = this.smoothRoute(route);
    
    // Simplify for performance
    return this.simplifyRoute(smoothed);
  }
}

// Driver movement detection and prediction
export class DriverMovementTracker {
  constructor() {
    this.previousPositions = [];
    this.maxHistory = 10;
    this.movementThreshold = 5; // meters
  }

  // Add new position and detect movement
  addPosition(lat, lng, timestamp) {
    const position = { lat, lng, timestamp };
    
    if (this.previousPositions.length > 0) {
      const lastPosition = this.previousPositions[this.previousPositions.length - 1];
      const distance = getDistance(
        { latitude: lastPosition.lat, longitude: lastPosition.lng },
        { latitude: lat, longitude: lng }
      );
      
      const isMoving = distance > this.movementThreshold;
      const speed = distance / ((timestamp - lastPosition.timestamp) / 1000); // m/s
      
      position.isMoving = isMoving;
      position.speed = speed;
    } else {
      position.isMoving = false;
      position.speed = 0;
    }
    
    this.previousPositions.push(position);
    
    // Keep only recent positions
    if (this.previousPositions.length > this.maxHistory) {
      this.previousPositions.shift();
    }
    
    return position;
  }

  // Predict next position based on current movement
  predictNextPosition() {
    if (this.previousPositions.length < 2) return null;
    
    const recent = this.previousPositions.slice(-3);
    const isMoving = recent.some(p => p.isMoving);
    
    if (!isMoving) return null;
    
    // Simple linear prediction
    const last = recent[recent.length - 1];
    const secondLast = recent[recent.length - 2];
    
    const latDiff = last.lat - secondLast.lat;
    const lngDiff = last.lng - secondLast.lng;
    
    const predictedLat = last.lat + latDiff;
    const predictedLng = last.lng + lngDiff;
    
    return { lat: predictedLat, lng: predictedLng };
  }

  // Calculate heading angle
  calculateHeading() {
    if (this.previousPositions.length < 2) return 0;
    
    const last = this.previousPositions[this.previousPositions.length - 1];
    const secondLast = this.previousPositions[this.previousPositions.length - 2];
    
    const deltaLng = last.lng - secondLast.lng;
    const deltaLat = last.lat - secondLast.lat;
    
    const heading = Math.atan2(deltaLng, deltaLat) * 180 / Math.PI;
    return (heading + 360) % 360;
  }
}

// Map performance optimization utilities
export const MapPerformanceUtils = {
  // Debounce map updates for better performance
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle camera updates
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Calculate optimal zoom level based on distance
  calculateOptimalZoom(distance) {
    if (distance < 100) return 18; // Very close
    if (distance < 500) return 16; // Close
    if (distance < 2000) return 14; // Medium
    if (distance < 10000) return 12; // Far
    return 10; // Very far
  },

  // Calculate map bounds with padding
  calculateBounds(coordinates, padding = 0.1) {
    if (coordinates.length === 0) return null;
    
    let minLat = coordinates[0][1];
    let maxLat = coordinates[0][1];
    let minLng = coordinates[0][0];
    let maxLng = coordinates[0][0];
    
    coordinates.forEach(([lng, lat]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
    
    const latPadding = (maxLat - minLat) * padding;
    const lngPadding = (maxLng - minLng) * padding;
    
    return {
      north: maxLat + latPadding,
      south: minLat - latPadding,
      east: maxLng + lngPadding,
      west: minLng - lngPadding,
    };
  }
};

export default {
  MapTileManager,
  RouteOptimizer,
  DriverMovementTracker,
  MapPerformanceUtils,
}; 