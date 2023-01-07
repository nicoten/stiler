import { useContext, useState } from 'react';
import {
  ArrowsAltOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileZipOutlined,
  FullscreenOutlined,
  ShrinkOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Menu, message, Table } from 'antd';
import { AppContext } from 'ui/context/AppProvider';
import styled from 'styled-components';
import Colors from '../Colors';
import { fitFeatures, generateGeoJSON, generateCSV } from 'ui/util/gis';
import { LayerIcon } from './Layers';
import Util from 'ui/util/utilities';
import TableUtil from 'ui/util/table';

const Wrapper = styled.div`
  border-radius: 5px 5px 0 0;
  box-shadow: rgba(14, 30, 37, 0.5) 0px 2px 4px 0px, rgba(14, 30, 37, 0.5) 0px 2px 16px 0px;
  position: absolute;
  overflow: hidden;
  bottom: 0px;
  left: 20px;
  width: calc(100% - 40px);
  z-index: 15;
`;

const LayerTitle = styled.div`
  font-size: 14px;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  padding: 5px 10px;
`;

const StyledTable = styled(Table)`
  thead > tr > th {
    font-weight: bold !important;
  }
`;

const Actions = styled.div`
  &:hover {
    button {
      color: ${Colors.gray7} !important;
    }
  }

  button {
    color: transparent !important;
  }
`;

const Exporter = () => {
  const { selectedRecords } = useContext(AppContext);

  return (
    <div style={{ display: 'flex' }}>
      <Dropdown
        trigger="click"
        overlay={
          <Menu>
            <Menu.Item
              key="copy-geojson"
              icon={<CopyOutlined />}
              onClick={() => {
                const { records } = selectedRecords;
                const csv = generateCSV({ records });
                Util.copy(csv);
                message.success('Copied to Clipboard');
              }}
            >
              Copy to Clipboard
            </Menu.Item>
            <Menu.Item
              key="download-geojson"
              icon={<DownloadOutlined />}
              disabled={!selectedRecords || !selectedRecords.records || !selectedRecords.records.length}
              onClick={async () => {
                const { layer, records } = selectedRecords;

                window.api.exportFile({
                  name: `${layer.name}-${new Date().getTime()}.csv`,
                  content: generateCSV({ records }),
                });
              }}
            >
              Save...
            </Menu.Item>
          </Menu>
        }
      >
        <Button icon={<TableOutlined />} size="small" style={{ marginLeft: 20 }}>
          CSV
        </Button>
      </Dropdown>
      <Dropdown
        trigger="click"
        overlay={
          <Menu>
            <Menu.Item
              key="copy-csv"
              icon={<CopyOutlined />}
              onClick={() => {
                const { records } = selectedRecords;
                const geoJson = generateGeoJSON({ records });
                Util.copy(JSON.stringify(geoJson, null, 2));
                message.success('Copied to Clipboard');
              }}
            >
              Copy to Clipboard
            </Menu.Item>
            <Menu.Item
              key="download-csv"
              icon={<DownloadOutlined />}
              disabled={!selectedRecords || !selectedRecords.records || !selectedRecords.records.length}
              onClick={async () => {
                const { layer, records } = selectedRecords;
                const geoJson = generateGeoJSON({ records });

                window.api.exportFile({
                  name: `${layer.name}-${new Date().getTime()}.geojson`,
                  content: JSON.stringify(geoJson, null, 2),
                });
              }}
            >
              Save...
            </Menu.Item>
          </Menu>
        }
      >
        <Button icon={<span style={{ marginRight: 5 }}>&#123;&#125;</span>} size="small" style={{ marginLeft: 5 }}>
          GeoJSON
        </Button>
      </Dropdown>
      <Button
        size="small"
        style={{ marginLeft: 5 }}
        icon={<FileZipOutlined />}
        onClick={async () => {
          const { layer, records } = selectedRecords;
          const geoJson = generateGeoJSON({ records });

          const filePath = await window.api.exportShapefile({
            name: `${layer.name}-${new Date().getTime()}.zip`,
            content: geoJson,
          });

          if (filePath) {
            message.success(`File exported to ${filePath}`);
          }
        }}
      >
        .SHP
      </Button>
    </div>
  );
};

const SelectedRecords = () => {
  const { map, selectedRecords, setSelectedRecords } = useContext(AppContext);
  const [minimized, setMinimized] = useState(false);

  if (!selectedRecords) return null;

  const { layer, fields, records } = selectedRecords;

  if (!records || !records.length) return null;

  return (
    <Wrapper>
      <LayerTitle>
        <div
          style={{ flex: 1, alignItems: 'center', display: 'flex' }}
          onClick={e => {
            if (e.target !== e.currentTarget) return;

            setMinimized(!minimized);
          }}
        >
          <LayerIcon layer={layer} />
          {layer.name}
          <span style={{ color: Colors.gray6, marginLeft: 5 }}>
            - {records.length} Record{records.length > 1 ? 's' : ''}
          </span>
          <Button
            size="small"
            icon={<FullscreenOutlined />}
            style={{ marginLeft: 10 }}
            onClick={() => {
              fitFeatures({
                map,
                features: records,
              });
            }}
          >
            Fit
          </Button>
        </div>

        <Exporter />
        <Actions style={{ display: 'flex', marginLeft: 10 }}>
          <Button
            size="small"
            style={{ backgroundColor: Colors.yellow5, marginRight: 2, transform: 'scale(0.7)', color: 'black' }}
            shape="circle"
            icon={minimized ? <ArrowsAltOutlined /> : <ShrinkOutlined />}
            onClick={() => {
              setMinimized(!minimized);
            }}
          />
          <Button
            type="danger"
            size="small"
            shape="circle"
            style={{ transform: 'scale(0.7)' }}
            icon={<CloseOutlined />}
            onClick={() => {
              setSelectedRecords(null);
            }}
          />
        </Actions>
      </LayerTitle>
      <StyledTable
        style={{
          backgroundColor: 'transparent',
          height: minimized ? 0 : 'auto',
        }}
        showSorterTooltip={false}
        rowKey="_qkey"
        scroll={{ y: 200, x: 1000 }}
        rowClassName="selected-record"
        size="small"
        columns={[
          ...fields
            .filter(f => !['_qid', '_qgeojson', '_qbbox'].some(c => c === f.name))
            .map(f => {
              // Set up sorter based on data type
              let sorter = TableUtil.stringSort(f.name);
              if (f.type === 'number') {
                sorter = TableUtil.numberSort(f.name);
              } else if (f.type === 'date') {
                sorter = TableUtil.dateSort(f.name);
              }

              let render = v => v;
              if (f.type === 'date') {
                render = v => Util.getMoment(v)?.format('MM/DD/YYYY hh:mm:ss A');
              }

              return {
                title: f.name,
                dataIndex: f.name,
                render,
                sorter,
                ellipsis: {
                  showTitle: false,
                },
              };
            }),
          {
            title: '',
            render: (text, record) => {
              const btnProps = {
                size: 'small',
                style: {
                  margin: '0px 2.5px',
                },
              };

              return (
                <div style={{ display: 'flex' }}>
                  <Button
                    {...btnProps}
                    icon={<FullscreenOutlined />}
                    onClick={() => {
                      fitFeatures({
                        map,
                        features: [record],
                      });
                    }}
                  />
                  <Button
                    icon={<DeleteOutlined />}
                    {...btnProps}
                    onClick={() => {
                      setSelectedRecords({
                        layer,
                        ...selectedRecords,
                        records: selectedRecords.records.filter(r => r._qid !== record._qid),
                      });
                    }}
                  />
                </div>
              );
            },
            width: 75,
            fixed: 'right',
          },
        ]}
        dataSource={records.map((r, i) => ({
          ...r,
          _qkey: i,
        }))}
        pagination={false}
      />
    </Wrapper>
  );
};

export default SelectedRecords;
