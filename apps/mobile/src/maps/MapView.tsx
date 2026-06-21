import MapLibreGL from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme/tokens';

import { OSM_ATTRIBUTION, offlinePmtilesStyle, onlineRasterStyle } from './style';

// MapLibre needs no API key (open source). Disable telemetry.
MapLibreGL.setAccessToken(null);

export interface RahiMapProps {
  /** Local PMTiles pack path to render offline; omit for the online raster base. */
  offlinePackPath?: string;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  /** GeoJSON LineString coordinates for the active route polyline. */
  routeLine?: [number, number][];
  /** Recorded breadcrumb coordinates to replay. */
  trackLine?: [number, number][];
  children?: React.ReactNode;
}

/**
 * The shared map surface (Task 2.1). Renders the offline PMTiles pack when one is
 * supplied, else the online OSM raster fallback. OSM attribution is always shown
 * (ODbL — rahi-docs/07 §6). Route and recorded-track polylines render on top.
 */
export function RahiMap({
  offlinePackPath,
  center = [77.5946, 12.9716], // Bengaluru default
  zoom = 9,
  routeLine,
  trackLine,
  children,
}: RahiMapProps) {
  const style = useMemo(
    () => (offlinePackPath ? offlinePmtilesStyle(offlinePackPath) : onlineRasterStyle()),
    [offlinePackPath],
  );

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView style={styles.map} mapStyle={style} attributionEnabled={false}>
        <MapLibreGL.Camera centerCoordinate={center} zoomLevel={zoom} />

        {routeLine && routeLine.length > 1 ? (
          <MapLibreGL.ShapeSource
            id="route"
            shape={{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: routeLine } }}
          >
            <MapLibreGL.LineLayer id="route-line" style={routeLineStyle} />
          </MapLibreGL.ShapeSource>
        ) : null}

        {trackLine && trackLine.length > 1 ? (
          <MapLibreGL.ShapeSource
            id="track"
            shape={{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: trackLine } }}
          >
            <MapLibreGL.LineLayer id="track-line" style={trackLineStyle} />
          </MapLibreGL.ShapeSource>
        ) : null}

        {children}
      </MapLibreGL.MapView>

      {/* Required OSM attribution (ODbL). */}
      <View style={styles.attribution} pointerEvents="none">
        <Text style={styles.attributionText}>{OSM_ATTRIBUTION}</Text>
      </View>
    </View>
  );
}

const routeLineStyle = { lineColor: palette.amber, lineWidth: 4, lineCap: 'round', lineJoin: 'round' } as const;
const trackLineStyle = { lineColor: palette.trail, lineWidth: 3, lineDasharray: [2, 1] } as const;

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  attribution: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(252,251,248,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attributionText: { fontSize: 10, color: palette.ink },
});
