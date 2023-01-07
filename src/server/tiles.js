const { ipcMain } = require('electron');
const { uniq } = require('lodash/fp');
const Sequelize = require('sequelize');
const cors = require('cors');
// const getPort = require('get-port').default;
const express = require('express');

const { getLayer } = require('./db');
const { getRemoteConnection, getMergedQuery } = require('./remote');
const utilities = require('./utilities');

const getPort = () => Promise.resolve(1000);

tileServerPort = null;

const initTileServer = async () => {
  tileServerPort = await getPort();

  const expressApp = express();

  expressApp.use(cors());

  expressApp.get('/ping', (req, res) => {
    res.send({
      message: 'pong',
    });
  });

  expressApp.get('/ts/:z/:x/:y.:ext?', async (req, res) => {
    const { c } = req.query;
    const { layerId, connectionId, variables } = JSON.parse(utilities.decode(c));

    const layer = await getLayer(null, { id: layerId });
    const { pool } = await getRemoteConnection(connectionId);

    const mergedQuery = getMergedQuery({
      connectionId,
      variables,
      query: layer.code,
    });

    const { x, y, z } = req.params;

    const { geometryColumn, geometryTypeId } = layer;

    if (!mergedQuery) {
      res.send(null);
      return;
    }

    let geometry = geometryColumn;

    const zoom = parseFloat(z);

    // Simplify polygons when zoomed out
    if (zoom < 15 && geometryTypeId === 'polygon') {
      geometry = `ST_SnapToGrid(${utilities.simplifyGeometry({ geometry: geometryColumn, zoom })}, 1e-5)`;
    }

    let distinctOn = '';
    if (zoom <= 13) {
      // If zoomed out far enough, cluster points using a grid that depends on
      // the zoom level
      if (geometryTypeId === 'polygon') {
        distinctOn = `DISTINCT ON (${geometryColumn})`;
      } else {
        distinctOn = `DISTINCT ON (ST_asBinary(ST_SnapToGrid(${geometryColumn}, ${0.0003 + (13 - zoom) * 0.0002})))`;
      }
    }

    res.setHeader('Content-Type', 'application/x-protobuf');

    const columns = [
      // Geometry
      `ST_AsMVTGeom(${geometry}, !bbox_4326!, 4096, 0, false) AS _qgeom`,
      // ID
      `${utilities.getQid()} AS _qid`,
    ];

    // Check if we need to pull anything else for styling
    const layerType = utilities.getLayerType(layer);

    Object.entries(layer.style).forEach(([key, value]) => {
      if (typeof value === 'object' && value.column && key.startsWith(layerType.mapboxType)) {
        columns.push(`${value.column}`);
      }
    });

    const mvtQuery = `
    WITH
      innerQuery AS MATERIALIZED (${mergedQuery}),
      js AS MATERIALIZED (
        SELECT ${distinctOn}
          ${uniq(columns).join(', ')}
        FROM innerQuery
        WHERE ST_Intersects(${geometry}, !bbox_4326!)
          AND NOT ST_IsEmpty(${geometry})
      )
    SELECT ST_AsMVT(js, 'vectile', 4096, '_qgeom') AS mvt
    FROM js
  `.split('!bbox_4326!').join(`
      ST_Transform(ST_SetSRID(ST_TileEnvelope(${z}, ${x}, ${y}), 3857), 4326)`);

    console.log('QUERY');
    console.log(mvtQuery);

    return pool.query(mvtQuery).then(
      r => {
        const [row] = r.rows;
        res.send(row.mvt);
        return row.mvt;
      },
      {
        type: Sequelize.QueryTypes.SELECT,
      },
    );
  });

  expressApp.listen(tileServerPort);
};

ipcMain.handle('getTileServerPort', () => tileServerPort);

module.exports = { initTileServer };
