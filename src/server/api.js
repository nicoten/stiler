const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
const { builtins } = require('pg').types;
const storage = require('electron-json-storage');
const { message } = require('antd');

const utilities = require('./utilities');
const { STYLE, MAX_DISTINCT_CATEGORIES } = require('../Constants');

console.log('loading api...');

storage.setDataPath(os.tmpdir());

const functions = [
  // Workspaces
  'getWorkspaces',
  'createWorkspace',
  'renameWorkspace',
  'setWorkspaceEnvironment',
  'deleteWorkspace',
  'setWorkspaceMapPosition',
  'setMapStyle',
  // Data Sources
  'getDataSources',
  'createDataSource',
  'updateDataSource',
  'setDataSourceDefaultConnection',
  'deleteDataSource',
  // Connections
  'getConnections',
  'getConnection',
  'createConnection',
  'updateConnection',
  'deleteConnection',
  // Environments
  'getEnvironments',
  'createEnvironment',
  'updateEnvironment',
  'setEnvironmentMapPosition',
  'setEnvironmentDataSourceConnection',
  'deleteEnvironment',
  // Sub Environments
  'createSubEnvironment',
  'updateSubEnvironment',
  'deleteSubEnvironment',
  'setSubEnvironmentMapPosition',
  // Layers
  'getLayers',
  'getLayer',
  'createLayer',
  'renameLayer',
  'setLayerVisibility',
  'setLayerZoomVisibility',
  'updateLayer',
  'deleteLayer',
  'moveLayer',
  // Export
  // 'exportFile',
  'exportShapefile',
  // Remote
  'testConnection',
];

const api = functions.reduce(
  (acc, fn) => ({
    ...acc,
    [fn]: args => ipcRenderer.invoke(fn, args),
  }),
  {},
);

// Exporters
api.exportFile = async args => {
  const filePath = await ipcRenderer.invoke('exportFile', args);

  if (filePath) {
    message.success(`File exported to ${filePath}`);
  }
};

// -----------------------------------------------------------------------------
// Storing User Settings
// -----------------------------------------------------------------------------
api.getStoredSetting = key => {
  const settings = storage.getSync('settings');
  return settings[key];
};

api.setStoredSetting = (key, value) => {
  const settings = storage.getSync('settings');
  storage.set('settings', {
    ...settings,
    [key]: value,
  });
};

const getRemoteRecords = ({ connectionId, variables, query, removeGeometryColumns }) => {
  console.log('getting remote records, api.js');

  return ipcRenderer.invoke('getRemoteRecords', {
    connectionId,
    variables,
    query,
    removeGeometryColumns,
  });
};

api.getRemoteTableColumns = async ({ connectionId, variables, code }) => {
  console.log('getRemoteTableColumns, api.js');
  const { fields } = await getRemoteRecords({
    connectionId,
    variables,
    query: `
    SELECT *
    FROM (${code}) x
    LIMIT 1
    `,
  });

  return fields;
};

api.getRemoteRecordsByBbox = async ({
  connectionId,
  variables,
  sql,
  geometryColumn,
  northEast,
  southWest,
  countOnly,
}) => {
  const { latitude: neLat, longitude: neLng } = northEast;
  const { latitude: swLat, longitude: swLng } = southWest;
  const select = countOnly
    ? 'COUNT(*) AS count'
    : `
    *,
    ${utilities.getQid()} AS _qid,
    ST_AsGeoJSON(${geometryColumn})::JSONB AS _qgeojson,
    ST_AsGeoJSON(ST_Envelope(${geometryColumn}))::JSONB AS _qbbox
  `;

  return getRemoteRecords({
    connectionId,
    variables,
    query: `
      WITH
        innerQuery AS MATERIALIZED (${sql})
      SELECT ${select}
      FROM innerQuery
      WHERE ST_Intersects(${geometryColumn}, ST_MakeEnvelope(${swLng}, ${swLat}, ${neLng}, ${neLat}, 4326))
    `,
    removeGeometryColumns: true,
  });
};

api.getRemoteRecordsByQid = async ({ connectionId, variables, sql, geometryColumn, qids }) => {
  return getRemoteRecords({
    connectionId,
    variables,
    query: `
      WITH
        innerQuery AS MATERIALIZED (${sql})
      SELECT DISTINCT ON (${utilities.getQid()})
        *,
        ${utilities.getQid()} AS _qid,
        ST_AsGeoJSON(${geometryColumn})::JSONB AS _qgeojson,
        ST_AsGeoJSON(ST_Envelope(${geometryColumn}))::JSONB AS _qbbox
      FROM innerQuery
      WHERE ${utilities.getQid()} IN (${qids.map(qid => `'${qid}'`).join(', ')})
    `,
    removeGeometryColumns: true,
  });
};

api.connectRemote = async ({ connectionId }) => {
  return ipcRenderer
    .invoke('connectRemote', { connectionId })
    .then(() => true)
    .catch(() => false);
};

api.getColumnMetrics = async ({ connectionId, variables, sql, column, type }) => {
  if (type === STYLE.CATEGORICAL) {
    return getRemoteRecords({
      connectionId,
      variables,
      query: `
        WITH
          innerQuery AS MATERIALIZED (${sql}),
          counts AS MATERIALIZED (
            SELECT ${column} AS field, COUNT(*) AS count
            FROM innerQuery
            GROUP BY ${column}
          )
        SELECT field, count, COUNT(*) OVER() AS total
        FROM counts
        ORDER BY count DESC
        LIMIT ${MAX_DISTINCT_CATEGORIES}
      `,
      removeGeometryColumns: true,
    });
  } else if (type === STYLE.NUMERIC) {
    const bins = 100;

    const query = `
    WITH innerQuery AS MATERIALIZED (
      ${sql}
    ), bounds AS MATERIALIZED (
      SELECT
        min(${column}) AS min,
        max(${column}) AS max
      FROM innerQuery
    ), stats AS MATERIALIZED (
      SELECT *, (max - min) / ${bins} AS bin_width
      FROM bounds
    ), histogram AS MATERIALIZED (
      SELECT
        width_bucket(${column}, stats.min, stats.max, ${bins}) AS bucket,
        numrange(
          min(${column})::NUMERIC,
          max(${column})::NUMERIC,
          '[]'
        ) AS range,
        count(${column}) AS frequency
      FROM innerQuery, stats
      WHERE ${column} IS NOT NULL
      GROUP BY bucket
      ORDER BY bucket
    )
    SELECT
      n AS bin,
      stats.min + (n - 1) * bin_width AS low,
      stats.min + n * bin_width AS high,
      COALESCE(frequency::NUMERIC, 0) AS frequency
    FROM stats, generate_series(1, ${bins}) n
      LEFT JOIN histogram h ON n = h.bucket
    ORDER BY n
  `;

    return getRemoteRecords({
      connectionId,
      variables,
      query,
      removeGeometryColumns: true,
    });
  }
};

api.getTileServerPort = () => ipcRenderer.invoke('getTileServerPort');

contextBridge.exposeInMainWorld('api', api);
