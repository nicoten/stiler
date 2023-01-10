import {
  ApiOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CloseOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import React, { useContext, useEffect } from 'react';
import styled from 'styled-components';
import { Layout, Button, Collapse } from 'antd';

import Colors from 'ui/Colors';
import { AppContext } from 'ui/context/AppProvider';
import Map from 'ui/components/Map';
import Layers from 'ui/components/Layers';
import SelectedRecords from 'ui/components/SelectedRecords';
import DataSourceEditor from 'ui/components/DataSourceEditor';
import { DotDivider } from 'ui/components/global/Styled';
import EnvironmentManager from 'ui/components/EnvironmentManager';
import ConfirmInput from 'ui/components/ConfirmInput';
import SiderItem from 'ui/components/SiderItem';

const { Sider } = Layout;

const StyledPanel = styled(Collapse.Panel)`
  background-color: ${Colors.gray9};
  border: none !important;

  .ant-collapse-content-box {
    padding: 0px !important;
  }
`;

const SIDEBAR_WIDTH = 300;

const Home = () => {
  const {
    getCurrentWorkspace,
    closeWorkspace,
    sidebarCollapsed,
    setSidebarCollapsed,
    dataSources,
    layers,
    setWorkspaceId,
    setLoading,
    createDataSource,
    createLayer,
    setDrawerId,
  } = useContext(AppContext);

  const currentWorkspace = getCurrentWorkspace();

  useEffect(() => {
    setLoading(!!currentWorkspace);
  }, []);

  if (!currentWorkspace) {
    setWorkspaceId(null);
    return null;
  }

  if (!dataSources || !layers) return <div>Loading...</div>;

  return (
    <Layout style={{ height: '100%' }}>
      <Button
        icon={sidebarCollapsed ? <ArrowRightOutlined /> : <ArrowLeftOutlined />}
        type="primary"
        style={{
          borderRadius: '0px 20px 20px 0px',
          boxShadow: 'rgba(14, 30, 37, 0.5) 0px 2px 4px 0px, rgba(14, 30, 37, 0.5) 0px 2px 16px 0px',
          border: 'none',
          position: 'absolute',
          left: sidebarCollapsed ? 0 : 300,
          height: '100px',
          padding: 5,
          marginTop: -50,
          width: '25px',
          top: '50%',
          zIndex: 100,
        }}
        onClick={() => {
          setSidebarCollapsed(!sidebarCollapsed);
        }}
      />
      <Sider
        width={sidebarCollapsed ? 0 : SIDEBAR_WIDTH}
        style={{
          background: Colors.gray9,
          zIndex: 10,
          height: '100vh',
          overflowY: 'scroll',
          padding: '26px 0px 20px 0px',
        }}
      >
        <EnvironmentManager />
        <DotDivider height="10px" />
        <Collapse
          style={{ marginTop: -2 }}
          bordered={false}
          defaultActiveKey={dataSources?.length === 0 ? 'dataSources' : null}
          expandIcon={() => <ApiOutlined />}
        >
          <StyledPanel header={<b style={{ color: 'white' }}>Data Sources</b>} key="dataSources">
            {dataSources.map(d => (
              <DataSourceEditor key={d.id} dataSource={d} />
            ))}
            <SiderItem>
              <ConfirmInput
                placeholder="New Data Source..."
                onConfirm={name => createDataSource({ dataSource: { name } })}
              />
            </SiderItem>
          </StyledPanel>
        </Collapse>
        <Collapse bordered={false} defaultActiveKey="layers" expandIcon={() => <EnvironmentOutlined />}>
          <StyledPanel header={<b style={{ color: 'white' }}>Layers</b>} key="layers">
            <Layers />
            <SiderItem>
              <ConfirmInput
                placeholder="New Layer..."
                onConfirm={async name => {
                  const layer = await createLayer({
                    name,
                  });

                  setDrawerId(`edit-layer-${layer.id}`);
                }}
              />
            </SiderItem>
          </StyledPanel>
        </Collapse>
        <br />
        <br />
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            padding: '10px',
            position: 'fixed',
            bottom: 0,
            overflow: 'hidden',
            width: SIDEBAR_WIDTH,
            display: sidebarCollapsed ? 'none' : 'block',
          }}
        >
          <Button type="danger" style={{ width: '100%' }} onClick={closeWorkspace} icon={<CloseOutlined />}>
            Close Project
          </Button>
        </div>
      </Sider>
      <Layout
        style={{
          position: 'relative',
          height: '100%',
          width: '100%',
        }}
      >
        <Map />
        <SelectedRecords />
      </Layout>
    </Layout>
  );
};

export default Home;
