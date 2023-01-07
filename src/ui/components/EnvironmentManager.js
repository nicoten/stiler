import React, { useContext, useState } from 'react';
import { Icon } from '@iconify/react';
import { DeleteOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Dropdown, Form, Input, List, Menu, Modal, Popconfirm, Select, Table } from 'antd';
import { isEmpty, isNil } from 'lodash';
import styled from 'styled-components';

import Colors from 'ui/Colors';
import { AppContext } from 'ui/context/AppProvider';
import SiderItem from 'ui/components/SiderItem';
import ConfirmInput from 'ui/components/ConfirmInput';
import ColorPicker from 'ui/components/ColorPicker';
import { useEnvironment } from 'ui/hooks';
import { DotDivider, DotInput } from 'ui/components/global/Styled';

const StyledListItem = styled(List.Item)`
  border-bottom: none !important;
  border-top: 1px solid #333;
  padding: 0px;
`;

const StyledInput = styled(Input)`
  border-radius: 0px;
  border: none;
  color: ${Colors.blue7};
`;

const validateIndex = ({ index, values }) => {
  const key = `${index}-key`;
  const value = `${index}-value`;
  return !isNil(values[key]) && !isNil(values[value]) && (!isEmpty(values[key]) || !isEmpty(values[value]));
};

const SubEnvironment = ({ environmentId, subEnvironment }) => {
  const { updateSubEnvironment, deleteSubEnvironment } = useContext(AppContext);

  const dataSource = [
    ...subEnvironment.json.map((e, i) => ({
      id: i + 1,
      ...e,
    })),
    {
      id: subEnvironment.json.length + 1,
      key: '',
      value: '',
    },
  ];

  return (
    <Card
      title={subEnvironment.name}
      size="small"
      bodyStyle={{ padding: 0 }}
      style={{ marginBottom: 20 }}
      extra={
        <Button
          size="small"
          onClick={() => {
            deleteSubEnvironment({ environmentId, subEnvironment });
          }}
          icon={<DeleteOutlined />}
          type="danger"
        />
      }
    >
      <Form
        initialValues={dataSource.reduce(
          (acc, curr) => ({
            ...acc,
            [`${curr.id}-key`]: curr.key,
            [`${curr.id}-value`]: curr.value,
          }),
          {},
        )}
        onValuesChange={(_, values) => {
          const json = [];

          for (let i = 0; i < Object.keys(values).length / 2; i++) {
            const key = `${i + 1}-key`;
            const value = `${i + 1}-value`;
            if (validateIndex({ index: i + 1, values })) {
              json.push({
                key: values[key],
                value: values[value],
              });
            }
          }

          updateSubEnvironment({
            subEnvironment: { ...subEnvironment, json },
          });
        }}
      >
        <List
          className="code"
          rowKey="id"
          dataSource={dataSource}
          renderItem={item => (
            <StyledListItem>
              <div style={{ display: 'flex', width: '100%' }}>
                <Form.Item name={`${item.id}-key`} style={{ flex: 1, margin: 0 }}>
                  <StyledInput placeholder="Key" />
                </Form.Item>
                <Form.Item name={`${item.id}-value`} style={{ flex: 1, margin: 0 }}>
                  <StyledInput placeholder="Value" />
                </Form.Item>
              </div>
            </StyledListItem>
          )}
        />
      </Form>
    </Card>
  );
};

const SubEnvironments = ({ environmentId }) => {
  const { createSubEnvironment } = useContext(AppContext);
  const environment = useEnvironment({ environmentId });
  const [createVisible, setCreateVisible] = useState(environment.subEnvironments.length === 0);

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ display: 'flex' }}>
        <b style={{ flex: 1 }}>Sub Environments</b>
        <Button
          size="small"
          onClick={() => {
            setCreateVisible(true);
          }}
          icon={<PlusOutlined />}
        >
          Add
        </Button>
      </h3>
      <p>Create environment variables that can be used in your queries</p>
      {createVisible && (
        <Form
          onFinish={newValues => {
            createSubEnvironment({ environmentId, subEnvironment: newValues });
            setCreateVisible(false);
          }}
        >
          <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Please input name!' }]}>
            <Input
              suffix={
                <Button htmlType="submit" type="primary" size="small">
                  Create
                </Button>
              }
            />
          </Form.Item>
        </Form>
      )}
      {environment.subEnvironments.map(s => (
        <SubEnvironment key={s.id} environmentId={environmentId} subEnvironment={s} />
      ))}
    </div>
  );
};

const EnvironmentDataSources = ({ environmentId }) => {
  const { dataSources, setEnvironmentDataSourceConnection } = useContext(AppContext);
  const environment = useEnvironment({ environmentId });
  if (!environment) return null;

  return (
    <div style={{ padding: 20 }}>
      <h3>
        <b>Connections</b>
      </h3>
      <p>
        For each <b>Data Source</b>, choose what <b>Connection</b> should be used in this <b>Environment</b>
      </p>
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        columns={[
          {
            title: 'Data Source',
            dataIndex: 'name',
            width: '50%',
          },
          {
            title: 'Connection',
            render: dataSource => {
              // Environment-DataSource-Connection
              const edc = environment.dataSources.find(d => d.id === dataSource.id);
              return (
                <Select
                  value={edc?.connection?.id || dataSource.defaultConnectionId}
                  style={{ width: '100%' }}
                  onChange={connectionId => {
                    setEnvironmentDataSourceConnection({
                      environmentId: environment.id,
                      dataSourceId: dataSource.id,
                      connectionId,
                    });
                  }}
                >
                  {dataSource.connections.map(connection => (
                    <Select.Option key={connection.id} value={connection.id}>
                      {connection.name}
                    </Select.Option>
                  ))}
                </Select>
              );
            },
            width: '50%',
          },
        ]}
        dataSource={dataSources}
      />
    </div>
  );
};

const EnvironmentEditor = ({ environmentId, setSelectedEnvironmentId }) => {
  const { updateEnvironment, deleteEnvironment } = useContext(AppContext);

  const environment = useEnvironment({ environmentId });
  if (!environment) return null;

  const { name, color } = environment;

  return (
    <>
      <div style={{ padding: '20px' }}>
        <DotInput
          style={{ marginBottom: 20 }}
          key={environment.id}
          size="large"
          value={name}
          onChange={e => {
            updateEnvironment({
              environment: {
                ...environment,
                name: e.target.value,
              },
            });
          }}
          prefix={
            <div style={{ marginRight: 5 }}>
              {/* <ColorPicker
                color={color}
                onChangeColor={color => {
                  updateEnvironment({
                    environment: {
                      ...environment,
                      color,
                    },
                  });
                }}
              /> */}
            </div>
          }
        />
        <DotDivider height={'10px'} />
        <EnvironmentDataSources environmentId={environmentId} />
        <DotDivider height={'10px'} />
        <SubEnvironments environmentId={environmentId} />
        <Popconfirm
          title="Are you sure you want to delete this environment?"
          onConfirm={() => {
            deleteEnvironment({ environment });
            setSelectedEnvironmentId(null);
          }}
        >
          <Button icon={<DeleteOutlined />} block type="danger">
            Delete Environment
          </Button>
        </Popconfirm>
      </div>
    </>
  );
};

const EnvironmentManager = () => {
  const { sidebarCollapsed, environments, createEnvironment, setWorkspaceEnvironment, getCurrentEnvironment } =
    useContext(AppContext);

  const [visible, setVisible] = useState(false);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState(null);
  const { environment, subEnvironment } = getCurrentEnvironment();

  return (
    <>
      <Modal
        title="Configure Environments"
        visible={visible}
        footer={null}
        onCancel={() => setVisible(false)}
        width="80%"
        bodyStyle={{
          padding: 0,
        }}
      >
        <div style={{ display: 'flex' }}>
          <div style={{ width: 250, backgroundColor: Colors.gray9, height: '70vh' }}>
            {environments.map(env => (
              <SiderItem
                key={env.id}
                value={env.id}
                selected={env.id === selectedEnvironmentId}
                onClick={() => {
                  setSelectedEnvironmentId(env.id);
                }}
                prefix={<Icon icon="gis:circle" color={env.color || Colors.gray2} />}
              >
                {env.name}
              </SiderItem>
            ))}
            <div style={{ padding: '5px 15px 15px 15px' }}>
              <ConfirmInput
                placeholder="New Environment..."
                onConfirm={newEnvironmentName => {
                  return createEnvironment({
                    environment: { name: newEnvironmentName },
                  });
                }}
              />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {selectedEnvironmentId && (
              <EnvironmentEditor
                key={selectedEnvironmentId}
                environmentId={selectedEnvironmentId}
                setSelectedEnvironmentId={setSelectedEnvironmentId}
              />
            )}
          </div>
        </div>
      </Modal>
      <div style={{ padding: 10, position: sidebarCollapsed ? 'fixed' : 'relative' }}>
        <Dropdown
          overlay={
            <Menu>
              {environments
                .map(e => [
                  <Menu.Item
                    key={`env-${e.id}`}
                    value={e.id}
                    icon={<Icon icon="gis:circle" color={e.color || Colors.gray2} />}
                    onClick={() => {
                      setWorkspaceEnvironment({
                        environmentId: e.id,
                      });
                    }}
                  >
                    {e.name}
                  </Menu.Item>,
                  ...e.subEnvironments.map(s => (
                    <Menu.Item
                      style={{ paddingLeft: 40 }}
                      key={`env-${e.id}-${s.id}`}
                      value={s.id}
                      onClick={() => {
                        setWorkspaceEnvironment({
                          environmentId: e.id,
                          subEnvironmentId: s.id,
                        });
                      }}
                    >
                      {s.name}
                    </Menu.Item>
                  )),
                ])
                .flat()}
              <Menu.Divider />
              <Menu.Item
                key="new"
                icon={<SettingOutlined />}
                onClick={() => {
                  setVisible(true);
                }}
              >
                Configure Environments
              </Menu.Item>
            </Menu>
          }
          trigger={['click']}
        >
          <Button
            style={{
              backgroundColor: 'rgb(34, 34, 34)',
              boxShadow: 'rgba(14, 30, 37, 0.5) 0px 2px 4px 0px, rgba(14, 30, 37, 0.5) 0px 2px 16px 0px',
              borderRadius: 20,
              width: '100%',
            }}
            icon={
              <Icon
                icon="gis:circle"
                style={{
                  paddingTop: 3,
                  paddingRight: 5,
                }}
                color={environment?.color || Colors.gray2}
              />
            }
          >
            {environment ? [environment.name, subEnvironment?.name].filter(Boolean).join(' - ') : 'No Environment'}
          </Button>
        </Dropdown>
      </div>
    </>
  );
};

export default EnvironmentManager;
