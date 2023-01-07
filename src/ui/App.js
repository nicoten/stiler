import React, { useContext } from 'react';
import styled from 'styled-components';
import { ConfigProvider, theme } from 'antd';

import AppProvider, { AppContext } from './context/AppProvider';
import Home from 'ui/screens/Home';
import WorkspaceSelect from 'ui/screens/WorkspaceSelect';
import Colors from 'ui/Colors';
import { MAP_STYLES } from 'Constants';
import logo from 'ui/assets/logo.png';

import './App.css';
// import 'antd/dist/antd.dark.css';
import 'mapbox-gl/dist/mapbox-gl.css';

const Dragger = styled.div`
  background-color: transparent;
  color: ${props => (props.light ? 'white' : Colors.gray9)};
  font-size: 18px;
  font-weight: bold;
  padding: 5px 15px 3px 15px;
  position: absolute;
  text-align: center;
  top: 0px;
  transition: all 0.2s ease-in-out;
  width: 100%;
  z-index: 1000;
  -webkit-app-region: drag;

  &:hover {
    background-color: rgba(0, 0, 0, 0.2);
  }
`;

const Inner = () => {
  const { getCurrentWorkspace } = useContext(AppContext);
  const workspace = getCurrentWorkspace();

  return (
    <>
      <Dragger
        light={
          !workspace ||
          !workspace?.mapStyle ||
          [MAP_STYLES.DARK, MAP_STYLES.SATELLITE].some(s => s.id === workspace?.mapStyle)
        }
      >
        <img src={logo} alt="logo" style={{ height: 20, width: 20 }} /> Stiler {workspace && `- ${workspace.name}`}
      </Dragger>
      {workspace ? <Home /> : <WorkspaceSelect />}
    </>
  );
};

const App = React.memo(() => {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
      }}
    >
      <AppProvider>
        <Inner />
      </AppProvider>
    </ConfigProvider>
  );
});

export default App;
