import ReactDOM from 'react-dom';
import numeral from 'numeral';
import chroma from 'chroma-js';
import { xorWith } from 'lodash/fp';
import { Table, message, Button } from 'antd';
import mapboxgl from 'mapbox-gl';
import React, { useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import { AppContext } from 'ui/context/AppProvider';
import { getVisibleLayers, setHoveredFeatures } from 'ui/util/gis';
import { useInterval } from 'ui/hooks';
import { MAPBOX_ACCESS_TOKEN } from 'ui/config';
import { LayerIcon } from 'ui/components/Layers';
import Colors from 'ui/Colors';
import { FORMAT } from 'Constants';
import LayersControl from 'ui/components/map/LayersControl';
import ExportControl from 'ui/components/map/ExportControl';

const MATCH_THRESHOLD = 500;

const MapContainer = styled.div`
  height: 100vh;
  width: 100%;

  .mapboxgl-ctrl-top-right {
    top: 40px;
  }

  .boxdraw {
    background: ${chroma(Colors.orange5).alpha(0.1).hex()};
    border: 1px dotted ${Colors.gray0};
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
  }
`;

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

let currentHoveredFeatures = [];
let movingEnvironments = false;

const Map = () => {
  const mapContainerRef = useRef();
  const popup = useRef();
  const moveEndRef = useRef();
  const [mapInitialized, setMapInitialized] = useState(false);

  const {
    map,
    setMap,
    getCurrentWorkspace,
    getCurrentEnvironment,
    setMapPosition,
    redrawLayers,
    getLayers,
    setDrawerId,
    getRemoteRecordsByBbox,
    getSelectedRecords,
    setSelectedRecords,
    getLayersInMap,
    loading,
    setLoading,
  } = useContext(AppContext);

  const workspace = getCurrentWorkspace();
  const { environment, subEnvironment } = getCurrentEnvironment();

  // Set up an interval to check if the map tiles are loaded
  const toggleMapCheck = useInterval(() => {
    if (map.areTilesLoaded()) {
      setLoading(false);
      toggleMapCheck();
    }
  }, 1000);

  const showMatchedLayers = ({ southWest, northEast, matchedLayers }) => {
    if (popup.current) {
      popup.current.remove();
    }

    popup.current = new mapboxgl.Popup()
      .setLngLat({
        lat: (southWest.latitude + northEast.latitude) / 2,
        lng: (southWest.longitude + northEast.longitude) / 2,
      })
      .setHTML('<div id="popup-content"></div>')
      .addTo(map);

    ReactDOM.render(
      <Table
        showHeader={false}
        size="small"
        pagination={false}
        dataSource={matchedLayers}
        style={{ cursor: 'pointer' }}
        onRow={layer => {
          return {
            onClick: async () => {
              popup.current.remove();

              const num = numeral(layer.matchedFeatureCount);

              if (num.value() > MATCH_THRESHOLD) {
                message.info('Too many matches to display');
                return;
              }

              showSelectedRecords({
                layer,
                matchedFeatures: await getRemoteRecordsByBbox({
                  layerId: layer.id,
                  southWest,
                  northEast,
                }),
              });
            },
          };
        }}
        columns={[
          {
            dataIndex: 'name',
            render: (name, layer) => {
              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <LayerIcon layer={layer} />
                  <div style={{ flex: 1 }}>{name}</div>
                </div>
              );
            },
          },
          {
            dataIndex: 'matchedFeatureCount',
            render: v => {
              const num = numeral(v);

              return (
                <div>
                  {num.format(FORMAT.INTEGER)} record{v === '1' ? '' : 's'}
                  {num.value() > MATCH_THRESHOLD && (
                    <div style={{ fontSize: '12px', color: Colors.gray5 }}>Too many to display</div>
                  )}
                </div>
              );
            },
          },
        ]}
      />,

      document.getElementById('popup-content'),
    );
  };

  const showSelectedRecords = async ({ removeCurrent, appendMode, layer, matchedFeatures }) => {
    const selectedRecords = getSelectedRecords() || {};
    let newRecords = [];

    if (!appendMode) {
      newRecords = matchedFeatures.records;
    } else if (removeCurrent) {
      // This is when we're toggling existing records - for example when clicking on a selected
      // feature, we want to deselect it
      newRecords = xorWith((a, b) => a._qid === b._qid, selectedRecords.records, matchedFeatures.records);
    } else {
      newRecords = [selectedRecords.records, matchedFeatures.records];
    }

    setSelectedRecords({
      layer,
      fields: matchedFeatures.fields,
      records: newRecords.flat(),
    });
  };

  const queryBoundingBox = async ({ removeCurrent, southWest, northEast }) => {
    const selectedRecords = getSelectedRecords();

    // If the user is holding metaKey|ctrlKey and there are selected records, we are appending
    const appendMode = !!((window.event.metaKey || window.event.ctrlKey) && selectedRecords);

    const visibleLayers = getVisibleLayers({ layers: getLayers(), map });

    // If we are appending, only consider the layer of the current selected records
    const layersToQuery = appendMode ? visibleLayers.filter(l => l.id === selectedRecords.layer.id) : visibleLayers;

    // If querying more than 1 layer, we need to count how many features each layer would return
    const countOnly = layersToQuery.length > 1;

    // For each layer, get matching features in the box
    const featuresByLayer = await Promise.all(
      layersToQuery.map(l =>
        getRemoteRecordsByBbox({
          countOnly,
          layerId: l.id,
          southWest,
          northEast,
        }),
      ),
    );

    // Get the matched features for each layer
    const matchedLayers = layersToQuery.reduce((acc, l, index) => {
      const { fields, records } = featuresByLayer[index];

      if (countOnly && records[0].count > 0) {
        // If we're only counting, add the layer as a match if the count is > 0
        acc.push({
          ...l,
          matchedFeatureCount: records[0].count,
        });
      } else if (!countOnly && records.length > 0) {
        // If we're not just counting, we have features returned
        acc.push({
          ...l,
          matchedFeatures: {
            records,
            fields,
          },
        });
      }

      return acc;
    }, []);

    // No matches
    if (matchedLayers.length === 0) {
      // If we're not appending and there are no matches, clear selection
      if (!appendMode) {
        setSelectedRecords(null);
      }
    } else if (matchedLayers.length === 1) {
      // Single layer match
      const [matchedLayer] = matchedLayers;
      let matchedFeatures = matchedLayer.matchedFeatures;

      if (countOnly) {
        // We need to request the actual records now to display them
        matchedFeatures = await getRemoteRecordsByBbox({
          layerId: matchedLayer.id,
          southWest,
          northEast,
        });
      }

      showSelectedRecords({
        removeCurrent,
        appendMode,
        layer: matchedLayer,
        matchedFeatures,
      });
    } else {
      // We have to ask the user what layer to show records for
      setSelectedRecords(null);
      showMatchedLayers({ southWest, northEast, matchedLayers });
    }
  };

  const updateHoveredFeatures = ({ hoveredFeatures }) => {
    // Clear
    const notHovered = currentHoveredFeatures.filter(({ id }) => !hoveredFeatures.find(f => f.id === id));

    setHoveredFeatures({
      map,
      features: notHovered,
      hover: false,
    });

    setHoveredFeatures({
      map,
      features: hoveredFeatures,
      hover: true,
    });

    currentHoveredFeatures = hoveredFeatures;
  };

  const setupDragSelect = () => {
    const canvas = map.getCanvasContainer();

    let start;
    let current;
    let box;

    const mousePos = e => {
      const rect = canvas.getBoundingClientRect();
      return new mapboxgl.Point(e.clientX - rect.left - canvas.clientLeft, e.clientY - rect.top - canvas.clientTop);
    };

    const onMouseMove = e => {
      // Capture the ongoing xy coordinates
      current = mousePos(e);

      // Append the box element if it doesnt exist
      if (!box) {
        box = document.createElement('div');
        box.classList.add('boxdraw');
        canvas.appendChild(box);
      }

      const minX = Math.min(start.x, current.x),
        maxX = Math.max(start.x, current.x),
        minY = Math.min(start.y, current.y),
        maxY = Math.max(start.y, current.y);

      // Adjust width and xy position of the box element ongoing
      const pos = `translate(${minX}px, ${minY}px)`;
      box.style.transform = pos;
      box.style.width = maxX - minX + 'px';
      box.style.height = maxY - minY + 'px';

      // Need this to highlight the features under the box
      // ([start, current]);
      const bbox = [start, current];
      const matchedFeatures = map.queryRenderedFeatures(bbox, {
        layers: getLayers().map(l => l.key),
      });

      updateHoveredFeatures({ hoveredFeatures: matchedFeatures });
    };

    const mouseDown = e => {
      if (!(e.shiftKey && e.button === 0)) return;

      map.dragPan.disable();

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('keydown', onKeyDown);

      start = mousePos(e);
    };

    canvas.addEventListener('mousedown', mouseDown, true);

    const onMouseUp = e => {
      // Capture xy coordinates
      finish([start, mousePos(e)]);
    };

    const onKeyDown = e => {
      // If the ESC key is pressed
      if (e.keyCode === 27) finish();
    };

    const finish = async bbox => {
      // Remove these events now that finish has been called.
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mouseup', onMouseUp);

      if (box) {
        box.parentNode.removeChild(box);
        box = null;
      }

      // If bbox exists. use this value as the argument for `queryRenderedFeatures`
      if (bbox) {
        const sw = map.unproject(bbox[0]);
        const southWest = { latitude: sw.lat, longitude: sw.lng };
        const ne = map.unproject(bbox[1]);
        const northEast = { latitude: ne.lat, longitude: ne.lng };

        queryBoundingBox({
          southWest,
          northEast,
        });
      }

      map.dragPan.enable();
    };
  };

  useEffect(() => {
    if (!map) return;
    // When switching envs we need to update
    // the handler, otherwise it gets stuck with the
    // same env

    // Remove old
    map.off('moveend', moveEndRef.current);
    // Add new
    moveEndRef.current = moveEnd;
    map.on('moveend', moveEndRef.current);
  }, [environment?.id, subEnvironment?.id]);

  const moveEnd = () => {
    toggleMapCheck();

    // Ignore this while moving environments
    if (movingEnvironments) {
      movingEnvironments = false;
      return;
    }

    const center = map.getCenter();

    setMapPosition({
      latitude: center.lat,
      longitude: center.lng,
      zoom: map.getZoom(),
      pitch: map.getPitch(),
      bearing: map.getBearing(),
    });
  };

  useEffect(() => {
    if (map) return;

    // Coalesce from lower to higher level
    const positionEntity = subEnvironment || environment || workspace;

    // Get map setup from either the current environment or from the workspace
    const mapSetup = {
      container: mapContainerRef.current,
      style: `mapbox://styles/mapbox/${workspace.mapStyle || 'dark-v10'}`, // style URL
      center: [positionEntity?.mapCenterLng ?? 0, positionEntity?.mapCenterLat ?? 0],
      zoom: positionEntity?.mapZoom ?? 2,
      pitch: workspace.mapPitch || 0,
      bearing: workspace.mapBearing || 0,
      compact: true,
      attributionControl: false,
      preserveDrawingBuffer: true,
    };

    const mapboxMap = new mapboxgl.Map(mapSetup);

    // Controls
    mapboxMap.addControl(
      // eslint-disable-next-line
      new mapboxgl.AttributionControl({
        compact: true,
      }),
    );

    mapboxMap.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right',
    );

    mapboxMap.addControl(new mapboxgl.ScaleControl(), 'bottom-right');

    mapboxMap.on('load', () => {
      setMap(mapboxMap);
      mapboxMap.resize();
      mapboxMap.boxZoom.disable();
      redrawLayers();
    });

    return () => {
      setMap(null);
    };
  }, []);

  useEffect(() => {
    if (!map || mapInitialized) return;

    setupDragSelect();

    // We need to keep this reference so we can
    // remove the old handler after
    moveEndRef.current = moveEnd;
    map.on('moveend', moveEndRef.current);

    // Loading state
    map.on('dataloading', e => {
      if (e?.source?.url?.startsWith('mapbox://')) return;
      setLoading(true);
    });

    map.on('data', () => {
      if (loading && map.areTilesLoaded()) {
        setLoading(false);
      }
    });

    map.on('sourcedata', () => {
      if (loading && map.areTilesLoaded()) {
        setLoading(false);
      }
    });

    map.on('click', async e => {
      // Clear edit layer drawer
      setDrawerId(null);

      const { x, y } = e.point;
      const width = 5;

      const sw = map.unproject({
        x: x - width,
        y: y - width,
      });

      const ne = map.unproject({
        x: x + width,
        y: y + width,
      });

      const southWest = { latitude: sw.lat, longitude: sw.lng };
      const northEast = { latitude: ne.lat, longitude: ne.lng };

      queryBoundingBox({
        removeCurrent: true,
        southWest,
        northEast,
      });
    });

    map.on('mousemove', e => {
      const layersInMap = getLayersInMap();

      if (layersInMap.length === 0) {
        return;
      }

      const hoveredFeatures = map.queryRenderedFeatures(e.point, {
        layers: layersInMap.map(l => l.key),
      });

      if (hoveredFeatures.length > 0) {
        map.getCanvas().style.cursor = 'pointer';
      } else {
        map.getCanvas().style.cursor = '';
      }

      updateHoveredFeatures({ hoveredFeatures });
    });

    setMapInitialized(true);
  }, [map, mapInitialized]);

  useEffect(() => {
    const positionEnv = subEnvironment || environment;

    if (!map || !positionEnv) return;

    movingEnvironments = true;

    map.flyTo({
      duration: 1000,
      center: {
        lat: positionEnv.mapCenterLat,
        lng: positionEnv.mapCenterLng,
      },
      zoom: positionEnv.mapZoom,
    });

    redrawLayers();
  }, [environment?.id, subEnvironment?.id]);

  return (
    <MapContainer ref={mapContainerRef}>
      <LayersControl />
      <ExportControl />
    </MapContainer>
  );
};

export default React.memo(Map);
