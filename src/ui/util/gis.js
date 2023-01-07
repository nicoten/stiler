import { groupBy } from 'lodash/fp';
import mapboxgl from 'mapbox-gl';
import { stringify } from 'csv-string';
import { MAPBOXGL_MAX_ZOOM, MAPBOXGL_MIN_ZOOM } from 'Constants';

export const setHoveredFeatures = ({ map, features, hover }) => {
  Object.entries(groupBy('source', features)).forEach(([source, features]) => {
    features.forEach(feature => {
      map.setFeatureState({ source, sourceLayer: 'vectile', id: feature.id }, { hover });
    });
  });
};

export const setClickedFeatures = ({ map, features, click }) => {
  Object.entries(groupBy('source', features)).forEach(([source, features]) => {
    features.forEach(feature => {
      map.setFeatureState({ source, sourceLayer: 'vectile', id: feature.id }, { click });
    });
  });
};

export const fitFeatures = ({ map, features }) => {
  if (!map || features.length === 0) return;

  const [firstFeature] = features;

  const startingCoordinates =
    firstFeature._qbbox.type === 'Point' ? firstFeature._qbbox.coordinates : firstFeature._qbbox.coordinates[0][0];

  const bounds = new mapboxgl.LngLatBounds(startingCoordinates, startingCoordinates);

  features.forEach(feature => {
    const bboxCoordinates = feature._qbbox.coordinates;

    if (feature._qbbox.type === 'Point') {
      bounds.extend(bboxCoordinates);
    } else {
      for (const coord of bboxCoordinates[0]) {
        bounds.extend(coord);
      }
    }
  });

  map.fitBounds(bounds, {
    padding: {
      top: 50,
      bottom: 250,
      left: 50,
      right: 50,
    },
  });
};

const stripRecord = record => {
  return Object.entries(record).reduce((acc, [key, value]) => {
    if (['_qid', '_qgeojson', '_qbbox'].includes(key)) {
      return acc;
    }

    return { ...acc, [key]: value };
  }, {});
};

export const generateCSV = ({ records }) => {
  if (records.length === 0) return '';

  const stripped = records.map(stripRecord);
  const data = [Object.keys(stripped[0]), ...stripped.map(record => Object.values(record))];
  return stringify(data);
};

export const generateGeoJSON = ({ records }) => {
  if (records.length === 1) {
    return generateFeatureGeoJSON({ record: records[0] });
  } else {
    return {
      type: 'FeatureCollection',
      features: records.map(record => generateFeatureGeoJSON({ record })),
    };
  }
};

export const generateFeatureGeoJSON = ({ record }) => {
  return {
    type: 'Feature',
    geometry: record._qgeojson,
    properties: stripRecord(record),
  };
};

export const percentToMapboxZoom = ({ percent, fallback }) =>
  ((percent || fallback) * (MAPBOXGL_MAX_ZOOM - MAPBOXGL_MIN_ZOOM)) / 100;

export const mapboxZoomToPercent = ({ mapZoom }) => (mapZoom * 100) / (MAPBOXGL_MAX_ZOOM - MAPBOXGL_MIN_ZOOM);

export const getVisibleLayers = ({ layers, map }) => {
  return layers.filter(layer => {
    // Layer is not visible explicitly
    if (!layer.visible) return false;

    const currentZoom = map.getZoom();

    // Layer is not visible at current zoom
    if (layer.minZoom && currentZoom < percentToMapboxZoom({ percent: layer.minZoom, fallback: MAPBOXGL_MIN_ZOOM }))
      return false;

    // Layer is not visible at current zoom
    if (layer.maxZoom && currentZoom > percentToMapboxZoom({ percent: layer.maxZoom, fallback: MAPBOXGL_MAX_ZOOM }))
      return false;

    return true;
  });
};
