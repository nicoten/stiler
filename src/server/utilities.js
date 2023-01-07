const { isNil } = require('lodash/fp');

const LAYER_TYPES = [
  {
    id: 'point',
    mapboxType: 'circle',
  },
  {
    id: 'line',
    mapboxType: 'line',
  },
  {
    id: 'polygon',
    mapboxType: 'fill',
  },
  {
    id: 'extrudedPolygon',
    mapboxType: 'fill-extrusion',
  },
];

const Util = {
  isDev: () => process.env.ELECTRON_ENV === 'development',
  getQid: () => 'md5(row_to_json(innerQuery.*)::TEXT)',
  mergeTemplateString: ({ template, variables = {} }) => {
    if (!variables || !template) return template;

    return Object.entries(variables).reduce((acc, [key, value]) => {
      let escapedValue = null;

      if (isNil(value)) {
        escapedValue = 'NULL';
      } else if (typeof value === 'string') {
        escapedValue = `'${value}'`;
      } else {
        escapedValue = value;
      }

      return acc.split(`{{${key}}}`).join(escapedValue);
    }, template);
  },
  simplifyGeometry: ({ geometry, zoom }) => {
    if (zoom >= 13) return geometry;
    const factor = 1 / (zoom * zoom + 9500);
    return `ST_Simplify(${geometry}, ${factor}, true)`;
  },
  encode: s => Buffer.from(s).toString('base64'),
  decode: s => Buffer.from(s, 'base64').toString(),
  getLayerType: layer => LAYER_TYPES.find(t => t.id === layer.geometryTypeId),
};

module.exports = Util;
