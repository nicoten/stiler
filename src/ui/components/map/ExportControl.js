import { DownloadOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import React, { useContext } from 'react';

import { AppContext } from 'ui/context/AppProvider';

const ExportControl = () => {
  const { map } = useContext(AppContext);

  return (
    <div
      style={{
        position: 'absolute',
        right: '10px',
        top: '190px',
        zIndex: 10,
      }}
      className="mapboxgl-ctrl mapboxgl-ctrl-group"
      onClick={async () => {
        map.getCanvas().toBlob(async blob => {
          window.api.exportFile({
            name: `Stiler-map-${new Date().getTime()}.png`,
            content: new Int8Array(await blob.arrayBuffer()),
          });
        });
      }}
    >
      <Tooltip title="Export map image" placement="left">
        <Button icon={<DownloadOutlined style={{ color: 'black' }} />} />
      </Tooltip>
    </div>
  );
};

export default ExportControl;
