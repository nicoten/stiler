const { app, ipcMain, dialog } = require('electron');
const { convert } = require('geojson2shp');
const fs = require('fs');
const { camelCase } = require('lodash/fp');
const { Umzug } = require('umzug');
const Database = require('better-sqlite3');
const Util = require('./utilities');
const { isNil } = require('lodash');

let db = null;

const MIGRATIONS_TABLE = 'migrations';

// When a new migration is needed, add it to the list of
// migrations under src/server/migrations and then add to this list
const MIGRATIONS = ['20190301160011-create-all'];

const initDb = async () => {
  const dbFileName = Util.isDev() ? 'db-dev' : 'db';
  const dbFilePath = `${app.getPath('userData')}/${dbFileName}.dbq`;
  db = new Database(dbFilePath);

  const umzug = new Umzug({
    migrations: MIGRATIONS.map(name => {
      const { up, down } = require(`./migrations/${name}`);
      return {
        name,
        up,
        down,
      };
    }),
    context: db,
    storage: {
      async executed({ context: db }) {
        await db.prepare(`CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE}(name TEXT)`).run();
        const results = await db.prepare(`SELECT name FROM ${MIGRATIONS_TABLE}`).all();
        return results.map(r => r.name);
      },
      async logMigration({ name, context: db }) {
        await db.prepare(`INSERT INTO ${MIGRATIONS_TABLE}(name) VALUES(:name)`).run({ name });
      },
      async unlogMigration({ name, context: db }) {
        await db.prepare(`DELETE FROM ${MIGRATIONS_TABLE} WHERE name = :name`).run({ name });
      },
    },
    logger: console,
  });

  await umzug.up();
};

const getReplacements = replacements => {
  if (isNil(replacements)) return {};

  const fixedReplacements = Object.entries(replacements).reduce((acc, [key, rawValue]) => {
    let value = rawValue;

    // SQLLite does not support these, convert to numbers
    if (typeof rawValue === 'boolean') {
      value = rawValue ? 1 : 0;
    }

    return {
      ...acc,
      [key]: value,
    };
  }, {});

  // console.log(replacements, fixedReplacements);

  return fixedReplacements;
};

const getRows = async (sql, replacements) => {
  // console.log('getRows');
  // console.log('sql', sql);
  // console.log('replacements', replacements);

  const rows = db.prepare(sql).all(getReplacements(replacements));

  const camelCased = (rows || []).map(row =>
    Object.entries(row).reduce((acc, [key, value]) => {
      acc[camelCase(key)] = value;
      return acc;
    }, {}),
  );

  return camelCased;
};

const execQuery = (sql, replacements) => {
  // console.log('getRows');
  // console.log('sql', sql);
  // console.log('replacements', replacements);

  db.prepare(sql).run(getReplacements(replacements));
};

const mutationHandler = sql => async (event, arg) => {
  if (Array.isArray(sql)) {
    for (let q = 0; q < sql.length; q++) {
      await execQuery(sql[q], arg);
    }
  } else {
    await execQuery(sql, arg);
  }
};

const getterHandler =
  ({ query, resolve }) =>
  async (event, arg) => {
    const rows = await getRows(query, arg);
    return resolve ? resolve(rows) : rows;
  };

const processLayer = layer => {
  return layer
    ? {
        ...layer,
        key: `layer-${layer.id}`,
        style: JSON.parse(layer.style || '{}'),
        fields: JSON.parse(layer.fields || '[]'),
      }
    : null;
};

const processEnvironment = environment => {
  return environment
    ? {
        ...environment,
        dataSources: JSON.parse(environment.dataSources || '[]').filter(d => !!d.id),
        subEnvironments: JSON.parse(environment.subEnvironments || '[]').filter(d => !!d.id),
      }
    : null;
};

const CRUD = {
  // Workspaces
  createWorkspace: 'INSERT INTO workspace (name) VALUES (:name)',
  renameWorkspace: `
    UPDATE workspace SET name = :name
    WHERE id = :id
  `,
  setWorkspaceEnvironment: `
    UPDATE workspace
    SET current_environment_id = :environmentId,
      current_sub_environment_id = :subEnvironmentId
    WHERE id = :id
  `,
  deleteWorkspace: [
    'DELETE FROM environment WHERE workspace_id = :id',
    'UPDATE data_source SET default_connection_id = NULL WHERE workspace_id = :id',
    'DELETE FROM connection WHERE data_source_id IN (SELECT id FROM data_source WHERE workspace_id = :id)',
    'DELETE FROM data_source WHERE workspace_id = :id',
    'DELETE FROM layer WHERE workspace_id = :id',
    'DELETE FROM workspace WHERE id = :id',
  ],
  setWorkspaceMapPosition: `
    UPDATE workspace
    SET
      map_center_lat = :latitude,
      map_center_lng = :longitude,
      map_zoom = :zoom,
      map_pitch = :pitch,
      map_bearing = :bearing
    WHERE id = :id
  `,
  setMapStyle: `
    UPDATE workspace
    SET map_style = :style
    WHERE id = :id
  `,
  // Data Sources
  createDataSource: `
    INSERT INTO data_source (
      workspace_id,
      name
    )
    VALUES (
      :workspaceId, :name
    )
  `,
  updateDataSource: `
    UPDATE data_source
    SET name = :name
    WHERE id = :id
  `,
  setDataSourceDefaultConnection: `
    UPDATE data_source
    SET
      default_connection_id = COALESCE(
        :connectionId,
        (
          SELECT id
          FROM connection
          WHERE data_source_id = :id
          ORDER BY id LIMIT 1
        )
      )
    WHERE id = :id
  `,
  deleteDataSource: [
    'DELETE FROM environment_data_source_connection WHERE data_source_id = :id',
    'DELETE FROM connection WHERE data_source_id = :id',
    'DELETE FROM data_source WHERE id = :id',
  ],
  // Connections
  createConnection: `
    INSERT INTO connection (
      data_source_id,
      name,
      host,
      port,
      database,
      username,
      password,
      ssl
    )
    VALUES (
      :dataSourceId, :name, :host, :port, :database, :username, :password, :ssl
    )
  `,
  updateConnection: `
    UPDATE connection
    SET
      name = :name,
      color = :color,
      host = :host,
      port = :port,
      database = :database,
      username = :username,
      password = :password,
      ssl = :ssl
    WHERE id = :id
  `,
  deleteConnection: [
    'UPDATE data_source SET default_connection_id = NULL WHERE default_connection_id = :id',
    'DELETE FROM connection WHERE id = :id',
  ],
  // Environments
  createEnvironment: `
    INSERT INTO environment (workspace_id, name)
    VALUES (:workspaceId, :name)
  `,
  updateEnvironment: `
  UPDATE environment
  SET
    name = :name,
    color = :color
  WHERE id = :id
  `,
  deleteEnvironment: [
    `
    UPDATE workspace
    SET
      current_environment_id = NULL,
      current_sub_environment_id = NULL
    WHERE environment_id = :id
    `,
    'DELETE FROM sub_environment WHERE environment_id = :id',
    'DELETE FROM environment_data_source_connection WHERE environment_id = :id',
    'DELETE FROM environment WHERE id = :id',
  ],
  setEnvironmentMapPosition: `
    UPDATE environment
    SET
      map_center_lat = :latitude,
      map_center_lng = :longitude,
      map_zoom = :zoom
    WHERE id = :id
  `,
  setSubEnvironmentMapPosition: `
    UPDATE sub_environment
    SET
      map_center_lat = :latitude,
      map_center_lng = :longitude,
      map_zoom = :zoom
    WHERE id = :id
  `,
  setEnvironmentDataSourceConnection: [
    `
    DELETE FROM environment_data_source_connection
    WHERE environment_id = :environmentId
      AND data_source_id = :dataSourceId
    `,
    `
    INSERT INTO environment_data_source_connection (environment_id, data_source_id, connection_id)
    VALUES (:environmentId, :dataSourceId, :connectionId)
    `,
  ],
  // Sub Environments
  createSubEnvironment: `
    INSERT INTO sub_environment (environment_id, name)
    VALUES (:environmentId, :name)
  `,
  deleteSubEnvironment: `
    DELETE FROM sub_environment
    WHERE id = :id
  `,
  // Layers
  renameLayer: `
    UPDATE layer SET name = :name
    WHERE id = :id
      AND workspace_id = :workspaceId
    `,
  setLayerVisibility: `
    UPDATE layer SET visible = :visible
    WHERE id = :id
      AND workspace_id = :workspaceId
  `,
  setLayerZoomVisibility: `
    UPDATE layer
    SET
      min_zoom = :minZoom,
      max_zoom = :maxZoom
    WHERE id = :id
      AND workspace_id = :workspaceId
  `,
  deleteLayer: [
    `
    DELETE FROM layer
    WHERE id = :id
      AND workspace_id = :workspaceId
  `,
    `
    WITH new_orders AS (
      SELECT
        id,
        row_number() OVER (ORDER BY layer_order) - 1 AS new_order
      FROM layer
    )
    UPDATE layer
    SET layer_order = new_order
    FROM new_orders
    WHERE new_orders.id = layer.id
  `,
  ],
};

const CONNECTION_JSON = `
json_object(
  'id', c.id,
  'type', c.type,
  'color', c.color,
  'name', c.name,
  'host', c.host,
  'port', c.port,
  'database', c.database,
  'username', c.username,
  'password', c.password,
  'ssl', c.ssl,
  'maxConnections', c.max_connections,
  'isDefault', c.id = d.default_connection_id
)
`;

const GETTERS = {
  getWorkspaces: {
    query: `
    SELECT
      w.*,
      (SELECT COUNT(*) FROM data_source WHERE workspace_id = w.id) AS data_source_count,
      (SELECT COUNT(*) FROM layer WHERE workspace_id = w.id) AS layer_count,
      (SELECT COUNT(*) FROM environment WHERE workspace_id = w.id) AS environment_count
    FROM workspace w
    `,
  },
  getDataSources: {
    query: `
    SELECT d.*,
    json_group_array(${CONNECTION_JSON}) AS connections
    FROM data_source d
      LEFT JOIN connection c ON c.data_source_id = d.id
    WHERE d.workspace_id = :workspaceId
    GROUP BY d.id
    `,
    resolve: rows =>
      rows.map(r => ({
        ...r,
        connections: JSON.parse(r.connections).filter(c => !!c.id),
      })),
  },
  getConnection: {
    query: 'SELECT * FROM connection WHERE id = :id',
    resolve: rows => rows[0],
  },
  getConnections: {
    query: 'SELECT * FROM connection WHERE data_source_id = :dataSourceId',
  },
  getEnvironments: {
    query: `
    WITH sub_environments AS (
      -- Get SubEnvironments by Environment
      SELECT e.id AS environment_id,
        json_group_array(
          json_object(
            'id', s.id,
            'name', s.name,
            'color', s.color,
            'json', COALESCE(json(s.json), json_array()),
            'mapCenterLat', s.map_center_lat,
            'mapCenterLng', s.map_center_lng,
            'mapZoom', s.map_zoom
          )
          ) AS sub_environments
      FROM environment e
        INNER JOIN sub_environment s ON s.environment_id = e.id
      WHERE e.workspace_id = :workspaceId
      GROUP BY e.id
    ), data_sources AS (
      -- Get Data Sources by Environment
      SELECT e.id AS environment_id,
        json_group_array(
          json_object(
            'id', d.id,
            'name', d.name,
            'connection', ${CONNECTION_JSON}
          )
        ) AS data_sources
      FROM environment e, data_source d
        LEFT JOIN environment_data_source_connection eds ON eds.environment_id = e.id
          AND d.id = eds.data_source_id
        LEFT JOIN connection c ON c.id = COALESCE(eds.connection_id, d.default_connection_id)
      WHERE e.workspace_id = :workspaceId
      GROUP BY e.id
    )
    SELECT e.*,
      COALESCE(d.data_sources, '[]') AS data_sources,
      COALESCE(s.sub_environments, '[]') AS sub_environments
    FROM environment e
      LEFT JOIN data_sources d ON d.environment_id = e.id
      LEFT JOIN sub_environments s ON s.environment_id = e.id
    WHERE e.workspace_id = :workspaceId
    ORDER BY e.id
    `,
    resolve: rows => rows.map(processEnvironment),
  },
  getLayers: {
    query: `
      SELECT *
      FROM layer
      WHERE workspace_id = :workspaceId
      ORDER BY layer_order ASC
    `,
    resolve: rows => rows.map(processLayer),
  },
  getLayer: {
    query: `
      SELECT *
      FROM layer
      WHERE id = :id
    `,
    resolve: rows => processLayer(rows[0]),
  },
};

const methods = {};

Object.entries(CRUD).forEach(([key, sql]) => {
  ipcMain.handle(key, mutationHandler(sql));
  methods[key] = mutationHandler(sql);
});

Object.entries(GETTERS).forEach(([key, { query, resolve }]) => {
  ipcMain.handle(key, getterHandler({ query, resolve }));
  methods[key] = getterHandler({ query, resolve });
});

ipcMain.handle('createLayer', async (event, arg) => {
  const [newLayer] = await getRows(
    `
  INSERT INTO layer (
    workspace_id,
    name,
    layer_order
  )
  SELECT :workspaceId, :name, (
    SELECT COALESCE(MAX(layer_order), 0) + 1
    FROM layer
    WHERE workspace_id = :workspaceId
  )
  RETURNING *
  `,
    arg,
  );

  return newLayer;
});

ipcMain.handle('updateLayer', async (event, arg) => {
  await execQuery(
    `
  UPDATE layer
  SET
    data_source_id = :dataSourceId,
    name = :name,
    code = :code,
    geometry_column = :geometryColumn,
    geometry_type_id = :geometryTypeId,
    style = :style,
    fields = :fields
  WHERE id = :id
  `,
    {
      ...arg,
      style: JSON.stringify(arg.style || {}),
      fields: JSON.stringify(arg.fields || {}),
    },
  );
});

ipcMain.handle('moveLayer', async (event, arg) => {
  const { from, to } = arg;

  if (from === to) {
    return;
  }

  if (from < to) {
    await execQuery(
      `
    UPDATE layer
    SET layer_order = layer_order - 1
    WHERE workspace_id = :workspaceId
      AND layer_order >= :from
      AND layer_order <= :to
    `,
      arg,
      true,
    );
  } else {
    await execQuery(
      `
    UPDATE layer
    SET layer_order = layer_order + 1
    WHERE workspace_id = :workspaceId
      AND layer_order >= :to
      AND layer_order <= :from
    `,
      arg,
      true,
    );
  }

  await execQuery(
    `
  UPDATE layer
  SET layer_order = :to
  WHERE id = :id
  `,
    arg,
  );
});

ipcMain.handle('updateSubEnvironment', async (event, arg) => {
  await execQuery(
    `
    UPDATE sub_environment
    SET
      name = :name,
      color = :color,
      json = :json
    WHERE id = :id
  `,
    {
      ...arg,
      json: JSON.stringify(arg.json || {}),
    },
  );
});

// Exporters
ipcMain.handle('exportFile', async (event, arg) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export',
    buttonLabel: 'Save',
    defaultPath: arg.name,
  });

  if (!canceled) {
    fs.writeFileSync(filePath, arg.content);
    return filePath;
  } else {
    return null;
  }
});

ipcMain.handle('exportShapefile', async (event, arg) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export',
    buttonLabel: 'Save',
    defaultPath: arg.name,
  });

  if (!canceled) {
    await convert(arg.content, filePath);
    return filePath;
  } else {
    return null;
  }
});

module.exports = {
  initDb,
  ...methods,
};
