import {
  Alert,
  Button,
  Card,
  Checkbox,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Tag,
} from 'antd';

import { useContext, useState } from 'react';
import { CloseOutlined, DatabaseFilled, DeleteOutlined, PlusOutlined } from '@ant-design/icons';

import { KEYS } from 'Constants';

import { AppContext } from 'ui/context/AppProvider';
import SiderItem from 'ui/components/SiderItem';
import ConfirmInput from 'ui/components/ConfirmInput';
import { DotInput } from 'ui/components/global/Styled';

const DataSourceEditor = ({ dataSource, visible, setEditingDataSourceId }) => {
  const { updateDataSource, deleteDataSource, deleteConnection, setDataSourceDefaultConnection } =
    useContext(AppContext);
  const [createConnectionVisible, setCreateConnectionVisible] = useState(dataSource?.connections?.length === 0);
  const [expandedConnection, setExpandedConnection] = useState(null);

  const connectionEditorProps = {
    setExpandedConnection,
    setCreateConnectionVisible,
    dataSource,
  };

  const hasConnections = dataSource.connections.length > 0;

  return (
    <>
      <Modal
        destroyOnClose
        style={{ top: 40 }}
        title="Edit Data Source"
        open={visible}
        size="small"
        onCancel={() => setEditingDataSourceId(null)}
        footer={
          !expandedConnection &&
          !createConnectionVisible && (
            <div
              style={{
                display: 'flex',
                marginTop: 20,
              }}
            >
              <Popconfirm
                title="Are you sure?"
                onConfirm={async () => {
                  deleteDataSource({ dataSource });
                  setEditingDataSourceId(null);
                }}
              >
                <Button type="danger" icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
              <Button type="primary" block onClick={() => setEditingDataSourceId(null)}>
                Ok
              </Button>
            </div>
          )
        }
      >
        <Form
          onValuesChange={(_, newValues) => {
            updateDataSource({ dataSource: { ...dataSource, ...newValues } });
          }}
          initialValues={dataSource}
        >
          <Form.Item name="name" rules={[{ required: true, message: 'Please input name!' }]}>
            <DotInput placeholder="Name..." />
          </Form.Item>
        </Form>
        <>
          <h3 style={{ marginTop: 10, display: 'flex' }}>
            <b style={{ flex: 1 }}>Connections</b>
            {!createConnectionVisible && (
              <Button
                size="small"
                onClick={() => {
                  setCreateConnectionVisible(true);
                  setExpandedConnection(null);
                }}
                icon={<PlusOutlined />}
              >
                Add
              </Button>
            )}
          </h3>
          {createConnectionVisible && (
            <Card
              size="small"
              title="New Connection"
              style={{ marginBottom: 20 }}
              extra={<CloseOutlined onClick={() => setCreateConnectionVisible(false)} />}
            >
              <ConnectionEditor {...connectionEditorProps} isDefault={!hasConnections} />
            </Card>
          )}
          <Collapse
            accordion
            activeKey={expandedConnection}
            onChange={setExpandedConnection}
            expandIcon={() => <DatabaseFilled />}
          >
            {dataSource.connections.map(connection => (
              <Collapse.Panel
                key={connection.id}
                header={connection.name}
                extra={
                  <div style={{ display: 'flex' }}>
                    {connection.isDefault ? (
                      <Tag color="blue">Default</Tag>
                    ) : (
                      <Tag
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          setDataSourceDefaultConnection({
                            connectionId: connection.id,
                            dataSource,
                          });
                        }}
                      >
                        Make Default
                      </Tag>
                    )}
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <Popconfirm
                        title="Are you sure you want to delete this connection?"
                        overlayStyle={{ maxWidth: '250px' }}
                        onConfirm={async () => {
                          deleteConnection({ connection });
                          message.info('Connection Deleted');
                        }}
                      >
                        <DeleteOutlined />
                      </Popconfirm>
                    </div>
                  </div>
                }
              >
                <ConnectionEditor connection={connection} {...connectionEditorProps} />
              </Collapse.Panel>
            ))}
          </Collapse>
        </>
      </Modal>
      <SiderItem key={`dataSource-${dataSource.id}`} onClick={() => setEditingDataSourceId(dataSource.id)}>
        {dataSource.name}
      </SiderItem>
    </>
  );
};

const ConnectionEditor = ({ dataSource, connection, setExpandedConnection, setCreateConnectionVisible }) => {
  const [form] = Form.useForm();
  const [testMessage, setTestMessage] = useState(false);
  const { createConnection, updateConnection } = useContext(AppContext);

  const formLayout = {
    labelCol: { span: 6 },
    wrapperCol: { span: 18 },
  };

  return (
    <>
      <Form
        form={form}
        onKeyDown={e => {
          if (e.keyCode === KEYS.ENTER) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onFinish={async newValues => {
          if (connection) {
            updateConnection({ connection: { ...connection, ...newValues } });
          } else {
            createConnection({
              connection: {
                host: newValues?.host || 'localhost',
                port: newValues?.port || 5432,
                database: newValues?.database || 'postgres',
                username: newValues?.username || 'postgres',
                password: newValues?.password || 'postgres',
                ...newValues,
                ssl: newValues.ssl || false,
                dataSourceId: dataSource.id,
              },
            }).then(() => {
              form.resetFields();
              setTestMessage(null);
              setExpandedConnection(null);
              setCreateConnectionVisible(false);
            });
          }
        }}
        initialValues={connection}
        layout={{
          labelCol: { span: 6 },
          wrapperCol: { span: 18 },
        }}
      >
        <Form.Item name="name" label="Nickname" {...formLayout} required>
          <Input placeholder="Nickname" />
        </Form.Item>
        <Form.Item name="host" label="Host" {...formLayout} required>
          <Input placeholder="localhost" />
        </Form.Item>
        <Form.Item name="port" label="Port" {...formLayout} required>
          <InputNumber placeholder="5432" />
        </Form.Item>
        <Form.Item name="database" label="Database" {...formLayout} required>
          <Input placeholder="postgres" />
        </Form.Item>
        <Form.Item name="username" label="Username" {...formLayout} required>
          <Input placeholder="postgres" />
        </Form.Item>
        <Form.Item name="password" label="Password" {...formLayout} required>
          <Input type="password" placeholder="postgres" />
        </Form.Item>
        <Form.Item name="ssl" valuePropName="checked">
          <Checkbox>Use SSL</Checkbox>
        </Form.Item>
        {testMessage && (
          <Alert
            showIcon
            message={testMessage.success ? 'Connection Successful' : `${testMessage.error}`}
            type={testMessage.success ? 'success' : 'error'}
            style={{ marginBottom: 20 }}
          />
        )}
        <div style={{ display: 'flex' }}>
          <Button
            onClick={async () => {
              const fields = form.getFieldsValue(true);
              const { success, error } = await window.api.testConnection({
                username: fields.username,
                password: fields.password,
                host: fields.host,
                port: fields.port,
                database: fields.database,
                ssl: fields.ssl,
              });

              setTestMessage({
                success,
                error,
              });
            }}
            style={{ flex: 1, marginLeft: connection ? 5 : 0, marginRight: 5 }}
          >
            Test
          </Button>
          <Button htmlType="submit" type="primary" style={{ flex: 1 }} disabled={!testMessage?.success}>
            Save
          </Button>
        </div>
      </Form>
    </>
  );
};

const DataSources = () => {
  const { dataSources, createDataSource } = useContext(AppContext);

  const [editingDataSourceId, setEditingDataSourceId] = useState(null);

  return (
    <>
      {dataSources.length === 0 && <Alert type="warning" message="Add a data source!" style={{ margin: '0px 20px' }} />}
      {dataSources.map(d => (
        <DataSourceEditor
          key={d.id}
          dataSource={d}
          visible={editingDataSourceId === d.id}
          setEditingDataSourceId={setEditingDataSourceId}
        />
      ))}
      <SiderItem>
        <ConfirmInput
          placeholder="New Data Source..."
          onConfirm={name => {
            return createDataSource({ dataSource: { name } }).then(d => {
              setEditingDataSourceId(d?.id);
            });
          }}
        />
      </SiderItem>
    </>
  );
};

export default DataSources;
