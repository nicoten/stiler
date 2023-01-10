import React, { useContext, useState } from 'react';
import { Button, Form, Input, Modal, Popconfirm, Card, Tag } from 'antd';
import styled from 'styled-components';
import { DeleteOutlined } from '@ant-design/icons';

import { AppContext } from 'ui/context/AppProvider';
import Colors from 'ui/Colors';

import { DotDivider } from 'ui/components/global/Styled';
import EditableText from 'ui/components/EditableText';

const Wrapper = styled.div`
  padding: 40px 0px 0px 0px;
  background-color: transparent;
  height: 100%;
`;

const Title = styled.div`
  font-size: 26px;
`;

const StyledCard = styled(Card)`
  border-color: transparent;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border-radius: 15px;
  overflow: hidden;

  &:hover {
    border-color: ${Colors.antd.primary};
  }
`;

const Workspace = ({ workspace }) => {
  const { setWorkspaceId, deleteWorkspace, renameWorkspace } = useContext(AppContext);
  const { id, name, dataSourceCount, layerCount, environmentCount } = workspace;

  return (
    <StyledCard
      headStyle={{ border: 'none' }}
      title={
        <Title>
          <EditableText
            textValue={name}
            onTextClick={() => setWorkspaceId(id)}
            style={{
              fontSize: '26px',
              color: Colors.antd.primary,
            }}
            inputStyle={{
              width: '100%',
            }}
            onSave={({ newValue }) => {
              return renameWorkspace({
                name: newValue,
                workspace,
              });
            }}
          />
        </Title>
      }
      bodyStyle={{ paddingTop: 0 }}
      style={{ margin: 10, width: 250 }}
      actions={[
        <div
          key="open"
          onClick={() => {
            setWorkspaceId(id);
          }}
        >
          Open
        </div>,
        <Popconfirm
          key="delete"
          title="Are you sure you want to delete this project?"
          onConfirm={() => {
            deleteWorkspace(workspace);
          }}
        >
          <div>
            <DeleteOutlined style={{ marginRight: 10 }} /> Delete
          </div>
        </Popconfirm>,
      ]}
    >
      <div>
        <div style={{ marginBottom: 10 }}>
          <Tag color="blue">{dataSourceCount}</Tag> Data Source{dataSourceCount === 1 ? '' : 's'}
        </div>
        <div style={{ marginBottom: 10 }}>
          <Tag color="gold">{layerCount}</Tag> Layer
          {layerCount === 1 ? '' : 's'}
        </div>
        <div style={{ marginBottom: 10 }}>
          <Tag color="green">{environmentCount}</Tag> Environment
          {environmentCount === 1 ? '' : 's'}
        </div>
      </div>
    </StyledCard>
  );
};

const WorkspaceSelect = () => {
  const { workspaces, createWorkspace } = useContext(AppContext);
  const [createVisible, setCreateVisible] = useState(false);

  return (
    <Wrapper id="workspace-select">
      <h1 style={{ margin: '0px 30px 15px 30px' }}>
        Projects{' '}
        <Button size="small" onClick={() => setCreateVisible(true)} style={{ marginLeft: 20 }}>
          New Project
        </Button>
      </h1>
      <DotDivider height="20px" />
      <Modal title="New Project" open={createVisible} footer={null} onCancel={() => setCreateVisible(false)}>
        <Form
          onFinish={v => {
            createWorkspace({ name: v.name }).then(() => setCreateVisible(false));
          }}
        >
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Button block type="primary" htmlType="submit">
            Create
          </Button>
        </Form>
      </Modal>
      <div style={{ display: 'flex', padding: '10px 20px 20px 20px' }}>
        {workspaces.map(w => (
          <Workspace key={w.id} workspace={w} />
        ))}
      </div>
    </Wrapper>
  );
};

export default WorkspaceSelect;
