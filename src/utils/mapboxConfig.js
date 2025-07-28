import Mapbox from '@rnmapbox/maps';

// Set your Mapbox access token
const MAPBOX_ACCESS_TOKEN = 'sk.eyJ1IjoidGF3c2lsZXQiLCJhIjoiY21hYml4ank0MjZmMTJrc2F4OHRmZjJnNyJ9.AmrvJY-LAdU1rigLoxR6mw';

// Initialize Mapbox
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

// Optional: Set telemetry enabled/disabled
Mapbox.setTelemetryEnabled(false);

// Custom map style for better performance and visual appeal
export const CUSTOM_MAP_STYLE = {
  version: 8,
  sources: {
    'mapbox-streets': {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-streets-v8'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#f8f9fa'
      }
    },
    {
      id: 'landuse',
      type: 'fill',
      source: 'mapbox-streets',
      'source-layer': 'landuse',
      paint: {
        'fill-color': '#e8e8e8',
        'fill-opacity': 0.8
      }
    },
    {
      id: 'water',
      type: 'fill',
      source: 'mapbox-streets',
      'source-layer': 'water',
      paint: {
        'fill-color': '#a8d1ff',
        'fill-opacity': 0.8
      }
    },
    {
      id: 'road-streets',
      type: 'line',
      source: 'mapbox-streets',
      'source-layer': 'road',
      paint: {
        'line-color': '#ffffff',
        'line-width': 2
      }
    },
    {
      id: 'road-streets-casing',
      type: 'line',
      source: 'mapbox-streets',
      'source-layer': 'road',
      paint: {
        'line-color': '#e0e0e0',
        'line-width': 4
      }
    },
    {
      id: 'building',
      type: 'fill',
      source: 'mapbox-streets',
      'source-layer': 'building',
      paint: {
        'fill-color': '#d4d4d4',
        'fill-opacity': 0.6
      }
    },
    {
      id: 'poi-label',
      type: 'symbol',
      source: 'mapbox-streets',
      'source-layer': 'poi_label',
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.1,
        'text-offset': [0, 1.25],
        'text-anchor': 'top'
      },
      paint: {
        'text-color': '#666666',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1
      }
    }
  ]
};

// Performance optimized style for tracking
export const TRACKING_MAP_STYLE = {
  version: 8,
  sources: {
    'mapbox-streets': {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-streets-v8'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#f0f0f0'
      }
    },
    {
      id: 'landuse',
      type: 'fill',
      source: 'mapbox-streets',
      'source-layer': 'landuse',
      paint: {
        'fill-color': '#e0e0e0',
        'fill-opacity': 0.6
      }
    },
    {
      id: 'water',
      type: 'fill',
      source: 'mapbox-streets',
      'source-layer': 'water',
      paint: {
        'fill-color': '#b8d4ff',
        'fill-opacity': 0.7
      }
    },
    {
      id: 'road-primary',
      type: 'line',
      source: 'mapbox-streets',
      'source-layer': 'road',
      filter: ['in', 'class', 'primary', 'secondary'],
      paint: {
        'line-color': '#ffffff',
        'line-width': 3
      }
    },
    {
      id: 'road-streets',
      type: 'line',
      source: 'mapbox-streets',
      'source-layer': 'road',
      filter: ['!', ['in', 'class', 'primary', 'secondary']],
      paint: {
        'line-color': '#f5f5f5',
        'line-width': 1.5
      }
    }
  ]
};

// Map configuration for different use cases
export const MAP_CONFIGS = {
  tracking: {
    style: TRACKING_MAP_STYLE,
    zoomLevel: 14,
    minZoom: 10,
    maxZoom: 18,
    pitch: 0,
    bearing: 0,
    centerCoordinate: [10.1815, 36.8065], // Tunisia center
  },
  navigation: {
    style: CUSTOM_MAP_STYLE,
    zoomLevel: 16,
    minZoom: 12,
    maxZoom: 20,
    pitch: 45,
    bearing: 0,
    centerCoordinate: [10.1815, 36.8065],
  },
  overview: {
    style: CUSTOM_MAP_STYLE,
    zoomLevel: 12,
    minZoom: 8,
    maxZoom: 16,
    pitch: 0,
    bearing: 0,
    centerCoordinate: [10.1815, 36.8065],
  }
};

// Map performance settings
export const MAP_PERFORMANCE_SETTINGS = {
  // Tile loading optimization
  tileCacheSize: 100,
  maxZoomLevel: 18,
  minZoomLevel: 8,
  
  // Animation settings
  animationDuration: 1000,
  animationMode: 'flyTo',
  
  // Gesture settings
  scrollEnabled: true,
  zoomEnabled: true,
  rotateEnabled: false,
  pitchEnabled: false,
  
  // Performance optimizations
  logoEnabled: false,
  attributionEnabled: false,
  compassEnabled: false,
  scaleBarEnabled: false,
};

export default Mapbox;
export { MAPBOX_ACCESS_TOKEN };

