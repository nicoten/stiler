const { Pool } = require('pg');
const { builtins } = require('pg').types;
const { ipcMain } = require('electron');
const utilities = require('./utilities');

const { getConnection } = require('./db');

const { PG_MIN_VERSION, POSTGIS_MIN_VERSION } = require('../Constants');

const sqlConnections = {};

const checkVersion = ({ version, required, library, reject }) => {
  const error = `${library} ${required} or higher is required`;

  try {
    const parsed = parseFloat(version);

    if (parsed < required) {
      reject(`${error} - Found ${parsed}`);
    }
  } catch (e) {
    console.error(e);
    reject(error);
  }
};

const checkVersions = async ({ pool }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const {
        rows: [{ postgres, postgis }],
      } = await pool.query(`
      SELECT
        current_setting('server_version') AS postgres,
        PostGIS_Lib_Version() AS postgis
      `);

      // Check Postgres
      checkVersion({
        version: postgres,
        required: PG_MIN_VERSION,
        library: 'PostgreSQL',
        reject,
      });

      // Check Postgis
      checkVersion({
        version: postgis,
        required: POSTGIS_MIN_VERSION,
        library: 'PostGIS',
        reject,
      });

      resolve();
    } catch (e) {
      reject(e);
    }
  });
};

const testConnection = async ({ username, password, database, host, port, ssl, maxConnections }) => {
  return new Promise((resolve, reject) => {
    const pool = new Pool({
      user: username,
      password,
      host,
      port: port || 5432,
      database,
      max: maxConnections || 5,
      min: 1,
      ssl: !!ssl
        ? {
            rejectUnauthorized: false,
          }
        : false,
    });

    pool
      .connect()
      .then(async () => {
        // Check that the correct versions are in place
        try {
          await checkVersions({ pool });
        } catch (e) {
          resolve({
            success: false,
            error: e,
          });
        }

        // Worked!
        resolve({
          success: true,
        });
      })
      .catch(err => {
        // Connection Failed
        resolve({
          success: false,
          error: err.message,
        });
      })
      .finally(() => {
        // Disconnect
        pool.end();
      });
  });
};

const getRemoteConnection = connectionId => {
  return new Promise(async (resolve, reject) => {
    console.log('sqlConnections[connectionId]');
    console.log(sqlConnections[connectionId]);

    if (sqlConnections[connectionId]) {
      resolve(sqlConnections[connectionId]);
      return;
    }

    const connection = await getConnection(null, { id: connectionId });

    const pool = new Pool({
      user: connection.username,
      host: connection.host,
      database: connection.database,
      password: connection.password,
      port: connection.port || 5432,
      max: connection.maxConnections || 5,
      min: 1,
      ssl: !!connection.ssl
        ? {
            rejectUnauthorized: false,
          }
        : false,
    });

    pool
      .connect()
      .then(async client => {
        // Release client (does not disconnect)
        client.release();

        // Check Postgres/Postgis Versions
        try {
          await checkVersions({ pool });
        } catch (e) {
          reject(e);
        }

        // Retrieve the Geometry OID
        const { rows } = await pool.query(`
          SELECT typname, oid, typarray
          FROM pg_type
          WHERE typname = 'geometry'
        `);

        if (rows.length === 0) {
          reject('Could not find Geometry type in database. Is PostGIS installed?');
          return;
        }

        // Only save to cache on success
        console.log('Connected!');

        // Disconnect any previous connection
        if (sqlConnections[connectionId]) {
          await sqlConnections[connectionId].pool.end();
        }

        // Save in cache
        sqlConnections[connectionId] = {
          pool,
          geometryDataTypeId: rows[0].oid,
        };

        console.log('sqlConnections[connectionId]');
        console.log(sqlConnections[connectionId]);

        resolve(sqlConnections[connectionId]);
      })
      .catch(err => {
        // Connection Failed
        message.error(`Connection to ${connection.name} failed.`);
        reject(err.message);
        return;
      });
  });
};

const getColumnSimpleType = ({ dataTypeID, geometryDataTypeId }) => {
  const [key] = Object.entries(builtins).find(([key, value]) => value === dataTypeID) || [];

  if (dataTypeID === geometryDataTypeId) {
    return 'geometry';
  } else if (['ABSTIME', 'DATE', 'TIME', 'TIMESTAMP', 'TIMESTAMPZ', 'TIMETZ'].includes(key)) {
    return 'date';
  } else if (['NUMERIC', 'FLOAT4', 'FLOAT8', 'INT2', 'INT4', 'INT8', 'INTERVAL', 'MONEY'].includes(key)) {
    return 'number';
  } else {
    return 'string';
  }
};

const getMergedQuery = ({ variables: varArray = [], query }) => {
  const variables = varArray.reduce((acc, { key, value }) => {
    return {
      ...acc,
      [key]: value,
    };
  }, {});

  return utilities.mergeTemplateString({
    template: query,
    variables,
  });
};

const getRemoteRecords = async ({ connectionId, variables, query, removeGeometryColumns }) => {
  console.log('getRemoteRecords');

  const { pool, geometryDataTypeId } = await getRemoteConnection(connectionId);

  const mergedQuery = getMergedQuery({
    connectionId,
    variables,
    query,
  });

  console.log('QUERY');
  console.log(query);
  console.log('variables');
  console.log(variables);
  console.log('MERGED');
  console.log(mergedQuery);

  const { fields, rows } = await pool.query(mergedQuery);

  let columns = fields;
  let records = rows;

  // Remove geometry cols
  if (removeGeometryColumns) {
    columns = fields.filter(({ dataTypeID }) => dataTypeID !== geometryDataTypeId);
    records = rows.map(row => {
      return columns.reduce((acc, { name }) => {
        return {
          ...acc,
          [name]: row[name],
        };
      }, {});
    });
  }

  // Decorate columns with types
  columns = columns.map(c => {
    return {
      ...c,
      type: getColumnSimpleType({
        dataTypeID: c.dataTypeID,
        geometryDataTypeId,
      }),
    };
  });

  const result = {
    fields: columns,
    records,
  };

  return result;
};

// Setup handlers
ipcMain.handle('getRemoteRecords', async (event, arg) => getRemoteRecords(arg));

ipcMain.handle('testConnection', async (event, arg) => testConnection(arg));

ipcMain.handle('connectRemote', (event, arg) => {
  return getRemoteConnection(arg.connectionId)
    .then(() => true)
    .catch(() => false);
});

module.exports = {
  getRemoteConnection,
  getMergedQuery,
};
