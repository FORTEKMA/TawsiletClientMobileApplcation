import Mapbox from '@rnmapbox/maps';

// Set your Mapbox access token
const MAPBOX_ACCESS_TOKEN = 'sk.eyJ1IjoidGF3c2lsZXQiLCJhIjoiY21hYml4ank0MjZmMTJrc2F4OHRmZjJnNyJ9.AmrvJY-LAdU1rigLoxR6mw';

// Initialize Mapbox
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

// Optional: Set telemetry enabled/disabled
Mapbox.setTelemetryEnabled(false);

export default Mapbox;
export { MAPBOX_ACCESS_TOKEN };

