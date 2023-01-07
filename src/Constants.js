const Constants = {
  ENV: {
    LOCAL: 'local',
    PRODUCTION: 'production',
  },
  KEYS: {
    ENTER: 13,
    ESCAPE: 27,
  },
  MAPBOXGL_MAX_ZOOM: 24,
  MAPBOXGL_MIN_ZOOM: 0,
  MAP_STYLES: {
    DARK: { id: 'dark-v10', label: 'Dark' },
    LIGHT: { id: 'light-v10', label: 'Light' },
    STREET: { id: 'streets-v11', label: 'Streets' },
    SATELLITE: { id: 'satellite-v9', label: 'Satellite' },
    OUTDOORS: { id: 'outdoors-v11', label: 'Outdoors' },
  },
  PG_MIN_VERSION: 9.6,
  POSTGIS_MIN_VERSION: 2.4,
  STYLE: {
    CATEGORICAL: 'categorical',
    NUMERIC: 'numeric',
  },
  FORMAT: {
    NUMBER: '0,0.00',
    INTEGER: '0,0',
  },
  MAX_DISTINCT_CATEGORIES: 50,
  DEFAULT_COLOR: '#222',
};

module.exports = Constants;
