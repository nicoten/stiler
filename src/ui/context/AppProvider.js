import { kebabCase, prop, uniqBy } from 'lodash/fp';
import chroma from 'chroma-js';
import useState from 'react-usestateref';
import React, { useEffect, createContext } from 'react';
import { message } from 'antd';

import { isNil} from 'lodash/fp';
import { getLayerType } from 'ui/components/LayerOptions';
import Loading from 'ui/components/Loading';
import { percentToMapboxZoom } from 'ui/util/gis';
import Colors from 'ui/Colors';
import { DEFAULT_COLOR, STYLE } from 'Constants';
import Util from 'ui/util/utilities';

const AppContextClass = createContext({});

const getOpacity = ({ key, layer, selectedRecords }) => {
  const layerType = getLayerType(layer);

  const _qidsInLayer = selectedRecords?.layer?.id === layer.id ? selectedRecords.records.map(r => r._qid) : [];

  let fallback = 1;
  let hoverIncrement = 0.1;

  if (_qidsInLayer.length > 0) {
    // If we have matches in this layer, make non-matches opaque
    fallback = 0.1;
    hoverIncrement = 0.5;
  } else if (selectedRecords && selectedRecords?.layer?.id !== layer.id) {
    // There are matches in another layer
    fallback = 0.1;
  } else {
    fallback = layer.style[key] || layerType.paintProps[key] || 1;
  }

  // Expressions not supported for extruded polygons
  if (layerType.id === 'extrudedPolygon') {
    return fallback;
  }

  const opacity = [
    'case',
    ['boolean', ['in', ['get', '_qid'], ['literal', _qidsInLayer]], false],
    1,
    ['boolean', ['feature-state', 'hover'], false],
    Math.min(1, fallback + hoverIncrement),
    fallback,
  ];

  return opacity;
};

const getColor = ({ key, layer }) => {
  const layerType = getLayerType(layer);
  const propertyStyle = layer.style[key];

  let fallback = propertyStyle || layerType.paintProps[key] || 1;
  let color = null;

  if (typeof propertyStyle === 'object') {
    const { type, column, colors } = propertyStyle;

    if (!type || !column || !colors) {
      color = DEFAULT_COLOR;
    } else if (type === STYLE.CATEGORICAL) {
      color = [
        'match',
        ['to-string', ['get', column]],
        ...colors.map(({ field, value }) => [`${field}`, `${value}`]).flat(),
        Colors.black,
      ];
    } else if (type === STYLE.NUMERIC) {
      color = [
        'interpolate',
        ['linear'],
        ['to-number', ['get', column]],
        ...colors.map(({ field, value }) => [field, value]).flat(),
      ];
    }
  } else {
    color = ['case', ['boolean', ['feature-state', 'hover'], false], chroma(fallback).brighten(0.5).hex(), fallback];
  }

  // console.log('color');
  // console.log(color);

  return color || DEFAULT_COLOR;
};

const AppProvider = ({ children }) => {
  const api = window.api;

  // State
  const [, setMap, mapRef] = useState(null);
  const [drawerId, setDrawerId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [selectedRecords, setSelectedRecords, selectedRecordsRef] = useState(null);

  // Data
  const [workspaces, setWorkspaces] = useState(null);
  const [dataSources, setDataSources] = useState(null);
  const [environments, setEnvironments] = useState(null);
  const [layers, setLayers, layersRef] = useState(null);

  useEffect(() => {
    const presetWorkspaceId = api.getStoredSetting('workspaceId');
    if (presetWorkspaceId) {
      setWorkspaceId(presetWorkspaceId);
    }
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.resize();
      }, 200);
    }
  }, [sidebarCollapsed, mapRef]);

  // Load from storage on start
  useEffect(() => {
    api.getWorkspaces().then(setWorkspaces);
  }, [api]);

  // when changing workspace, reset
  useEffect(() => {
    if (!workspaceId) {
      // State
      setMap(null);
      setDrawerId(null);
      setSidebarCollapsed(false);

      // Data
      setEnvironments(null);
      setDataSources(null);
      setLayers(null);
      return;
    }

    api.getDataSources({ workspaceId }).then(setDataSources);
    api.getEnvironments({ workspaceId }).then(setEnvironments);
    api.getLayers({ workspaceId }).then(setLayers);
  }, [workspaceId, api]);

  const getLayersInMap = () => {
    return layers.filter(l => !!mapRef.current.getLayer(l.key));
  }

  useEffect(() => {
    if (mapRef.current) {
      getLayersInMap().forEach(layer => {
        const layerType = getLayerType(layer);
        mapRef.current.setPaintProperty(
          layer.key,
          kebabCase(`${layerType.mapboxType}Opacity`),
          getOpacity({ key: `${layerType.mapboxType}Opacity`, layer, selectedRecords }),
        );
      });
    }
  }, [selectedRecords]);

  const removeLayerFromMap = layer => {
    if (!mapRef.current) return;

    // Remove layer if it exists
    if (mapRef.current.getLayer(layer.key)) {
      mapRef.current.removeLayer(layer.key);
    }

    // Remove Source if it exists
    if (mapRef.current.getSource(`source-${layer.id}`)) {
      mapRef.current.removeSource(`source-${layer.id}`);
    }
  };

  const addLayerToMap = async layer => {
    if (isNil(layer.dataSourceId)) {
      return;
    }

    const { connection, variables } = getConnectionForDataSource({ dataSourceId: layer.dataSourceId });

    // Create the remote connection first, otherwise each
    // tile request will try to create a connection individually
    const connected = await api.connectRemote({ connectionId: connection.id });
    if (!connected) {
      const dataSource = dataSources.find(c => c.id === layer.dataSourceId);
      message.info(`Failed to connect to ${dataSource.name}`);
      return;
    }

    // Find the first layer with a lower order that is visible
    const visibleLayers = layers.filter(l => l.visible);
    const thisIndex = visibleLayers.findIndex(l => l.id === layer.id);
    const beforeLayer = visibleLayers[thisIndex - 1];

    const map = mapRef.current;

    if (!map) return;

    // Remove layer if it exists
    removeLayerFromMap(layer);

    const c = {
      connectionId: connection.id,
      layerId: layer.id,
      variables,
    };

    const encrypted = Util.encode(JSON.stringify(c));

    const tileServerPort = await api.getTileServerPort();

    // Add source to map
    map.addSource(`source-${layer.id}`, {
      type: 'vector',
      promoteId: '_qid',
      tiles: [`http://localhost:${tileServerPort}/ts/{z}/{x}/{y}?c=${encrypted}`],
    });

    const layerType = getLayerType(layer);

    if (!layerType) {
      console.error(layer, 'geometry_type_id is invalid');
      return;
    }

    const { paintProps, mapboxType } = layerType;

    // Adds all the circle- / fill- / line- props to the paint
    const paint = Object.keys(paintProps).reduce((acc, key) => {
      const defaultValue = paintProps[key];

      // Adjust opacity based on feature state
      if (key.endsWith('Opacity')) {
        return {
          ...acc,
          [kebabCase(key)]: getOpacity({ key, layer }),
        };
      }

      // Adjust opacity based on feature state
      if (key.endsWith('Color')) {
        return {
          ...acc,
          [kebabCase(key)]: getColor({ key, layer }),
        };
      }

      return {
        ...acc,
        [kebabCase(key)]: layer.style[key] || defaultValue,
      };
    }, {});

    const layerConfig = {
      'id': layer.key,
      'type': mapboxType,
      'source': `source-${layer.id}`,
      'source-layer': 'vectile',
      'maxzoom': percentToMapboxZoom({
        percent: layer.maxZoom,
        fallback: 100,
      }),
      'minzoom': percentToMapboxZoom({
        percent: layer.minZoom,
        fallback: 0,
      }),
      'layout': {
        visibility: layer.visible ? 'visible' : 'none',
      },
      paint,
    };

    // If I'm adding before another layer and the before layer doesn't exist,
    // add that first
    if (beforeLayer && !map.getLayer(beforeLayer.id)) {
      await addLayerToMap(beforeLayer);
    }

    // Already exists
    if (map.getLayer(layer.id)) {
      return;
    }

    map.addLayer(layerConfig, beforeLayer?.key);
  };

  const redrawLayers = () => {
    if (!layers || layers.length === 0) {
      setLoading(false);
      return;
    }

    layers.forEach((layer, i) => {
      addLayerToMap(layer);
    });
  };

  const reorderLayers = layers => {
    if (!layers) return;

    const map = mapRef.current;

    layers.forEach((l, i) => {
      if (i === 0) {
        map.moveLayer(l.key);
      } else {
        const layerAbove = layers[i - 1];
        map.moveLayer(l.key, layerAbove.key);
      }
    });
  };

  const getCurrentEnvironment = () => {
    // No workspace selected
    if (!workspaceId) return null;
    const currentWorkspace = workspaces.find(w => w.id === workspaceId);

    // No workspace found
    if (!currentWorkspace) return null;

    const currentEnvironment = environments.find(e => e.id === currentWorkspace.currentEnvironmentId);
    if (currentEnvironment)
      return {
        environment: currentEnvironment,
        subEnvironment:
          currentEnvironment.subEnvironments.find(s => s.id === currentWorkspace.currentSubEnvironmentId) || null,
      };

    // Build the default environment
    return {
      environment: {
        id: null,
        name: 'Default Environment',
        variables: {},
        dataSources: dataSources.map(d => {
          return {
            ...d,
            connection: d.connections.find(c => c.id === d.defaultConnectionId),
          };
        }),
        subEnvironments: [],
      },
      subEnvironment: null,
    };
  };

  const getConnectionForDataSource = ({ dataSourceId }) => {
    const { environment, subEnvironment } = getCurrentEnvironment();
    const { connection } = environment.dataSources.find(ds => ds.id === dataSourceId);
    return {
      connection,
      variables: (subEnvironment || environment).json,
    };
  };

  if (!workspaces) return <div>Loading...</div>;

  return (
    <AppContextClass.Provider
      value={{
        loading,
        setLoading,
        isDrawerVisible: id => id === drawerId,
        setDrawerId,
        // Workspace Selection
        workspaceId,
        setWorkspaceId: id => {
          api.setStoredSetting('workspaceId', id);
          setWorkspaceId(id);
        },
        closeWorkspace: () => {
          setSidebarCollapsed(false);
          setDrawerId(null);
          setWorkspaceId(null);
          setSelectedRecords(null);

          setEnvironments(null);
          setDataSources(null);
          setLayers(null);
          api.setStoredSetting('workspaceId', null);
        },
        // Sidebar
        sidebarCollapsed,
        setSidebarCollapsed,
        // Workspaces ---------------------------------------------------
        workspaces,
        getCurrentWorkspace: () => workspaces.find(w => w.id === workspaceId),
        createWorkspace: async workspace => {
          await api.createWorkspace(workspace);
          api.getWorkspaces().then(setWorkspaces);
        },
        setWorkspaceEnvironment: async ({ environmentId, subEnvironmentId }) => {
          await api.setWorkspaceEnvironment({ environmentId, subEnvironmentId, id: workspaceId });
          api.getWorkspaces().then(setWorkspaces);
        },
        renameWorkspace: async ({ name, workspace }) => {
          await api.renameWorkspace({ id: workspace.id, name });
          api.getWorkspaces().then(setWorkspaces);
        },
        deleteWorkspace: async workspace => {
          await api.deleteWorkspace(workspace);
          api.getWorkspaces().then(setWorkspaces);
        },
        setMapPosition: position => {
          const { environment, subEnvironment } = getCurrentEnvironment();
          // Save to environment if one is set
          if (subEnvironment?.id) {
            api.setSubEnvironmentMapPosition({ id: subEnvironment.id, ...position });
            api.getEnvironments({ workspaceId }).then(setEnvironments);
          } else if (environment?.id) {
            api.setEnvironmentMapPosition({ id: environment.id, ...position });
            api.getEnvironments({ workspaceId }).then(setEnvironments);
          }

          // Save to workspace too
          api.setWorkspaceMapPosition({ id: workspaceId, ...position });
          api.getWorkspaces().then(setWorkspaces);
        },
        setMapStyle: async style => {
          mapRef.current.setStyle(`mapbox://styles/mapbox/${style}`);
          mapRef.current.on('style.load', () => {
            redrawLayers();
          });

          await api.setMapStyle({ id: workspaceId, style });
          api.getWorkspaces().then(setWorkspaces);
        },
        // Data Sources ---------------------------------------------------
        dataSources,
        createDataSource: async ({ dataSource }) => {
          await api.createDataSource({ ...dataSource, workspaceId });
          api.getDataSources({ workspaceId }).then(setDataSources);
        },
        updateDataSource: async ({ dataSource }) => {
          await api.updateDataSource(dataSource);
          api.getDataSources({ workspaceId }).then(setDataSources);
        },
        setDataSourceDefaultConnection: async ({ dataSource, connectionId }) => {
          await api.setDataSourceDefaultConnection({ ...dataSource, connectionId });
          api.getDataSources({ workspaceId }).then(setDataSources);
        },
        deleteDataSource: async ({ dataSource }) => {
          await api.deleteDataSource(dataSource);
          api.getDataSources({ workspaceId }).then(setDataSources);
        },
        // Connection Meta ---------------------------------------------------
        getRemoteTableColumns: async ({ dataSourceId, code }) => {
          const { connection, variables } = getConnectionForDataSource({ dataSourceId });
          return connection ? await api.getRemoteTableColumns({ connectionId: connection.id, variables, code }) : [];
        },
        // Connections --------------------------------------------------
        createConnection: async ({ connection }) => {
          await api.createConnection({ ...connection });
          api.getDataSources({ workspaceId }).then(setDataSources);
        },
        updateConnection: async ({ connection }) => {
          await api.updateConnection(connection);
          api.getDataSources({ workspaceId }).then(setDataSources);
        },
        deleteConnection: async ({ connection }) => {
          await api.deleteConnection(connection);
          api.getDataSources({ workspaceId }).then(setDataSources);
        },
        // Environments --------------------------------------------------
        environments,
        getCurrentEnvironment,
        getConnectionForDataSource,
        setEnvironmentDataSourceConnection: async ({ environmentId, dataSourceId, connectionId }) => {
          await api.setEnvironmentDataSourceConnection({ environmentId, dataSourceId, connectionId });
          api.getEnvironments({ workspaceId }).then(setEnvironments);
        },
        createEnvironment: async ({ environment }) => {
          await api.createEnvironment({ ...environment, workspaceId });
          api.getEnvironments({ workspaceId }).then(setEnvironments);
        },
        updateEnvironment: async ({ environment }) => {
          await api.updateEnvironment(environment);
          api.getEnvironments({ workspaceId }).then(setEnvironments);
        },
        deleteEnvironment: async ({ environment }) => {
          await api.deleteEnvironment(environment);
          api.getEnvironments({ workspaceId }).then(setEnvironments);
        },
        createSubEnvironment: async ({ environmentId, subEnvironment }) => {
          await api.createSubEnvironment({ ...subEnvironment, environmentId });
          api.getEnvironments({ workspaceId }).then(setEnvironments);
        },
        updateSubEnvironment: async ({ subEnvironment }) => {
          await api.updateSubEnvironment(subEnvironment);
          api.getEnvironments({ workspaceId }).then(setEnvironments);
        },
        deleteSubEnvironment: async ({ environmentId, subEnvironment }) => {
          await api.deleteSubEnvironment({ ...subEnvironment, environmentId });
          api.getEnvironments({ workspaceId }).then(setEnvironments);
        },
        // Map ------------------------------------------------------------
        map: mapRef.current,
        setMap,
        getLayersInMap,
        // Layers ---------------------------------------------------------
        layers: layersRef.current,
        getLayers: () => layersRef.current,
        createLayer: async ({ name }) => {
          const { id } = await api.createLayer({ name, workspaceId });
          const layers = await api.getLayers({ workspaceId });
          setLayers(layers);
          return layers.find(l => l.id === id);
        },
        setLayerVisibility: async ({ layer, visible }) => {
          await api.setLayerVisibility({ id: layer.id, visible, workspaceId });
          mapRef.current.setLayoutProperty(layer.key, 'visibility', visible ? 'visible' : 'none');
          api.getLayers({ workspaceId }).then(setLayers);
        },
        setLayerZoomVisibility: async ({ layer, minZoom, maxZoom }) => {
          await api.setLayerZoomVisibility({ id: layer.id, minZoom, maxZoom, workspaceId });
          // Update map
          mapRef.current.setLayerZoomRange(
            layer.key,
            percentToMapboxZoom({
              percent: minZoom,
              fallback: 0,
            }),
            percentToMapboxZoom({
              percent: maxZoom,
              fallback: 100,
            }),
          );
          api.getLayers({ workspaceId }).then(setLayers);
        },
        renameLayer: async ({ name, layer }) => {
          await api.renameLayer({ id: layer.id, name, workspaceId });
          api.getLayers({ workspaceId }).then(setLayers);
        },
        deleteLayer: async ({ layer }) => {
          removeLayerFromMap(layer);
          await api.deleteLayer({ id: layer.id, workspaceId });
          api.getLayers({ workspaceId }).then(setLayers);
        },
        replaceLayer: async ({ layer }) => {
          addLayerToMap(layer);
          await api.updateLayer(layer);
          api.getLayers({ workspaceId }).then(setLayers);
        },
        moveLayer: async ({ from, to, layer }) => {
          api.moveLayer({ from, to, id: layer.id, workspaceId });
          api.getLayers({ workspaceId }).then(l => {
            setLayers(l);
            reorderLayers(l);
          });
        },
        updateLayerPaint: async ({ layer, property, value }) => {
          const map = mapRef.current;

          // Save changes
          layer.style[property] = value;

          // Update map
          if (map && map.getLayer(layer.key)) {
            let newValue = value;

            if (property.endsWith('Opacity')) {
              newValue = getOpacity({ key: property, layer, selectedRecords });
            } else if (property.endsWith('Color')) {
              newValue = getColor({ key: property, layer });
            }

            map.setPaintProperty(layer.key, kebabCase(property), newValue);
          }

          // persist
          await api.updateLayer(layer);
          api.getLayers({ workspaceId }).then(setLayers);
        },
        redrawLayers,
        reorderLayers,
        getRemoteRecordsByBbox: ({ layerId, countOnly, northEast, southWest }) => {
          setLoading(true);
          const layer = layersRef.current.find(l => l.id === layerId);

          const { connection, variables } = getConnectionForDataSource({ dataSourceId: layer.dataSourceId });

          return api
            .getRemoteRecordsByBbox({
              connectionId: connection.id,
              variables,
              sql: layer.code,
              geometryColumn: layer.geometryColumn,
              countOnly,
              northEast,
              southWest,
            })
            .then(res => {
              setLoading(false);
              return res;
            });
        },
        getRemoteRecordsByQid: ({ layerId, qids }) => {
          const layer = layersRef.current.find(l => l.id === layerId);

          const { connection, variables } = getConnectionForDataSource({ dataSourceId: layer.dataSourceId });

          return api.getRemoteRecordsByQid({
            connectionId: connection.id,
            variables,
            sql: layer.code,
            geometryColumn: layer.geometryColumn,
            qids,
          });
        },
        selectedRecords,
        getSelectedRecords: () => selectedRecordsRef.current,
        setSelectedRecords: args => {
          if (!args) {
            setSelectedRecords(null);
          } else {
            const { layer, fields, records } = args;
            setSelectedRecords({ layer, fields, records: uniqBy('_qid', records) });
          }
        },
      }}
    >
      <Loading loading={loading} />
      {children}
    </AppContextClass.Provider>
  );
};

export { AppContextClass as AppContext };

export default AppProvider;
