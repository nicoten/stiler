import { Icon } from '@iconify/react';
import React, { useContext } from 'react';
import { Button, Dropdown, Menu } from 'antd';

import Constants from 'Constants';
import { AppContext } from 'ui/context/AppProvider';

const LayerMenu = () => {
  const { map, setMapStyle } = useContext(AppContext);

  const menu = (
    <Menu>
      <Menu.ItemGroup title="Map Style">
        {Object.entries(Constants.MAP_STYLES).map(([, s]) => (
          <Menu.Item
            key={s.id}
            onClick={() => {
              setMapStyle(s.id);
            }}
          >
            {s.label}
          </Menu.Item>
        ))}
      </Menu.ItemGroup>
      <Menu.ItemGroup title="Other Layers">
        <Menu.Item
          key="3d-buildings"
          onClick={() => {
            if (map.getLayer('3d-buildings')) {
              map.removeLayer('3d-buildings');
            } else {
              map.addLayer({
                'id': '3d-buildings',
                'source': 'composite',
                'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'],
                'type': 'fill-extrusion',
                'minzoom': 15,
                'paint': {
                  'fill-extrusion-color': '#aaa',

                  // Use an 'interpolate' expression to
                  // add a smooth transition effect to
                  // the buildings as the user zooms in.
                  'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
                  'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
                  'fill-extrusion-opacity': 0.6,
                },
              });
            }
          }}
        >
          3D Buildings
        </Menu.Item>
        <Menu.Item
          key="terrain"
          onClick={() => {
            if (map.getSource('mapbox-dem')) {
              map.setTerrain(null);
              map.removeSource('mapbox-dem');
              map.removeLayer('sky');
            } else {
              map.addSource('mapbox-dem', {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
                maxzoom: 14,
              });

              // add the DEM source as a terrain layer with exaggerated height
              map.setTerrain({ source: 'mapbox-dem', exaggeration: 1 });

              map.addLayer({
                id: 'sky',
                type: 'sky',
                paint: {
                  'sky-type': 'atmosphere',
                  'sky-atmosphere-sun': [0.0, 0.0],
                  'sky-atmosphere-sun-intensity': 15,
                },
              });
            }
          }}
        >
          Terrain
        </Menu.Item>
      </Menu.ItemGroup>
    </Menu>
  );

  return (
    <div
      style={{
        position: 'absolute',
        right: '10px',
        top: '150px',
        zIndex: 10,
      }}
      className="mapboxgl-ctrl mapboxgl-ctrl-group"
    >
      <Dropdown overlay={menu}>
        <Button icon={<Icon icon="ci:layers-alt" color="black" style={{ marginTop: 7 }} />} />
      </Dropdown>
    </div>
  );
};

export default LayerMenu;
