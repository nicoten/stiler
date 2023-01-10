import { Drawer, Input } from 'antd';
import Colors from '../../Colors';
import styled from 'styled-components';

export const StyledDrawer = styled(Drawer)`
  .ant-drawer-wrapper-body {
    padding-top: 10px;
  }

  .ant-drawer-content {
    background: rgba(10, 10, 10, 0.8);
    backdrop-filter: blur(7px);
  }

  .ant-drawer-header {
    border-bottom: none;
  }

  .ant-drawer-body {
    padding-top: 20px;
  }

  .ant-drawer-wrapper-body,
  .ant-drawer-body,
  .ant-drawer-header {
    background: transparent;
  }
`;

export const DotDivider = styled.div`
  background: transparent;
  background-image: radial-gradient(${Colors.gray7} 25%, transparent 0);
  background-size: 3px 3px;
  height: ${props => props.height};
  width: 100%;
`;

export const DotInput = styled(Input)`
  margin: 0;
  border: 0;
  background-color: transparent !important;
  border-bottom: 1px dotted ${Colors.gray7};
  padding-left: 10px;
  padding-right: 0;
  border-radius: 0;
  outline: none;

  input {
    background-color: transparent !important;
  }
`;
