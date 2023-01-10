import {
  Alert,
  Button,
  Card,
  Checkbox,
  Collapse,
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

import { AppContext } from 'ui/context/AppProvider';
import SiderItem from 'ui/components/SiderItem';
import { KEYS } from 'Constants';
import { DotDivider, DotInput } from 'ui/components/global/Styled';

const DataSourceEditor = ({ dataSource }) => {
  const [visible, setVisible] = useState(false);
  const { updateDataSource, deleteDataSource, deleteConnection, setDataSourceDefaultConnection } =
    useContext(AppContext);
  const [createVisible, setCreateVisible] = useState(dataSource?.connections?.length === 0);
  const [expandedConnection, setExpandedConnection] = useState(null);

  const connectionEditorProps = {
    setExpandedConnection,
    setCreateVisible,
    dataSource,
  };

  return (
    <>
      <Modal
        destroyOnClose
        style={{ top: 40 }}
        title={<div>Edit Data Source</div>}
        open={visible}
        size="small"
        onCancel={() => setVisible(false)}
        footer={
          !expandedConnection ? (
            <Popconfirm
              title="Are you sure?"
              onConfirm={async () => {
                deleteDataSource({ dataSource });
                setVisible(false);
              }}
            >
              <Button type="danger" icon={<DeleteOutlined />} block>
                Delete Data Source
              </Button>
            </Popconfirm>
          ) : null
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
          <DotDivider height={'10px'} />
          <h3 style={{ marginTop: 10, display: 'flex' }}>
            <b style={{ flex: 1 }}>Connections</b>
            <Button
              size="small"
              onClick={() => {
                setCreateVisible(true);
                setExpandedConnection(null);
              }}
              icon={<PlusOutlined />}
            >
              Add
            </Button>
          </h3>
          {createVisible && (
            <Card
              size="small"
              title="New Connection"
              style={{ marginBottom: 20 }}
              extra={<CloseOutlined onClick={() => setCreateVisible(false)} />}
            >
              <ConnectionEditor {...connectionEditorProps} isDefault={dataSource.connections.length === 0} />
            </Card>
          )}
          <Collapse
            accordion
            activeKey={expandedConnection}
            onChange={setExpandedConnection}
            expandIcon={() => <DatabaseFilled />}
          >
            {dataSource.connections.map(connection => {
              return (
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
              );
            })}
          </Collapse>
        </>
      </Modal>
      <SiderItem key={`dataSource-${dataSource.id}`} onClick={() => setVisible(true)}>
        {dataSource.name}
      </SiderItem>
    </>
  );
};

const ConnectionEditor = ({ dataSource, connection, setExpandedConnection, setCreateVisible }) => {
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
                ...newValues,
                ssl: newValues.ssl || false,
                dataSourceId: dataSource.id,
              },
            }).then(() => {
              form.resetFields();
              setTestMessage(null);
              setExpandedConnection(null);
              setCreateVisible(false);
            });
          }
        }}
        initialValues={connection}
        layout={{
          labelCol: { span: 6 },
          wrapperCol: { span: 18 },
        }}
      >
        <Form.Item name="name" label="Nickname" {...formLayout}>
          <Input placeholder="Nickname" />
        </Form.Item>
        <Form.Item name="host" label="Host" {...formLayout}>
          <Input placeholder="localhost" />
        </Form.Item>
        <Form.Item name="port" label="Port" {...formLayout}>
          <InputNumber placeholder="5432" />
        </Form.Item>
        <Form.Item name="database" label="Database" {...formLayout}>
          <Input placeholder="postgres" />
        </Form.Item>
        <Form.Item name="username" label="Username" {...formLayout}>
          <Input placeholder="postgres" />
        </Form.Item>
        <Form.Item name="password" label="Password" {...formLayout}>
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
          <Button htmlType="submit" type="primary" style={{ flex: 1 }}>
            Save
          </Button>
        </div>
      </Form>
    </>
  );
};

export default DataSourceEditor;
