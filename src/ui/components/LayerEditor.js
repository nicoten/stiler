import { useContext, useState } from 'react';
import { Alert, Divider, Form, Input, Button, Select, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import MonacoEditor from '@monaco-editor/react';
import { isEmpty } from 'lodash/fp';

import { AppContext } from 'ui/context/AppProvider';
import { LAYER_TYPES } from 'ui/components/LayerOptions';
import CodeWrapper from 'ui/components/CodeWrapper';
import { DotInput, StyledDrawer } from 'ui/components/global/Styled';

const LayerEditor = ({ layer }) => {
  const { renameLayer, replaceLayer, deleteLayer, dataSources, isDrawerVisible, setDrawerId, getRemoteTableColumns } =
    useContext(AppContext);

  const [form] = Form.useForm();

  const [sqlError, setSqlError] = useState(null);
  const [geometryTypeId, setGeometryTypeId] = useState(layer.geometryTypeId || LAYER_TYPES[0].id);
  const [geometryFields, setGeometryFields] = useState(layer.geometryFields || []);
  const [newCode, setNewCode] = useState(layer.code);

  const formLayout = {
    labelCol: { span: 7 },
    wrapperCol: { span: 19 },
  };

  return (
    <>
      <StyledDrawer
        onClose={() => setDrawerId(null)}
        title={
          <DotInput
            placeholder="Name..."
            size="large"
            value={layer.name}
            onChange={e => {
              renameLayer({ layer, name: e.target.value });
            }}
          />
        }
        visible={isDrawerVisible(`edit-layer-${layer.id}`)}
        onCancel={() => setDrawerId(null)}
        width={500}
        zIndex={20}
        footer={
          <Popconfirm
            title="Are you sure?"
            onConfirm={() => {
              deleteLayer({ layer });
            }}
          >
            <Button icon={<DeleteOutlined />} type="danger" block>
              Delete Layer
            </Button>
          </Popconfirm>
        }
        mask={false}
      >
        <Form
          form={form}
          initialValues={{
            dataSourceId: dataSources[0].id,
            geometryTypeId,
            ...layer,
          }}
          onFinish={async newValues => {
            try {
              // Clear error
              setSqlError(null);

              console.log('Running sql');

              // Nothing has changed
              if (`${newCode}` === `${layer.code}`) {
                console.log('Code has not changed');
                await replaceLayer({
                  layer: { ...layer, ...newValues },
                });
                return;
              }

              console.log('Code changes found');

              // If the code has changed, recalculate geometry columns
              const newColumns = await getRemoteTableColumns({
                code: newCode,
                dataSourceId: form.getFieldValue('dataSourceId'),
              });

              console.log('newColumns', newColumns);

              const newGeometryFields = newColumns.filter(({ type }) => type === 'geometry');

              // No geometry fields found in new SQL query
              if (isEmpty(newGeometryFields)) {
                setSqlError('No geometry fields found!');
                return;
              }

              // Set new fields in state
              setGeometryFields(newGeometryFields);

              // Check if the old field is there
              let geometryField = newGeometryFields.find(c => c.name === layer.geometryColumn);

              if (!geometryField) {
                // not found means the columns have changed and old colum is no longer there
                // default to the first one
                geometryField = newGeometryFields[0];
              }

              await replaceLayer({
                layer: {
                  ...layer,
                  ...newValues,
                  code: newCode,
                  geometryTypeId,
                  geometryColumn: geometryField.name,
                  fields: newColumns,
                },
              });
            } catch (e) {
              setSqlError(`${e}`);
            }
          }}
          {...formLayout}
        >
          <Divider style={{ marginTop: 0 }}>Data Source</Divider>
          <Form.Item name="dataSourceId" label="Data Source" rules={[{ required: true }]}>
            <Select>
              {dataSources.map(c => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <CodeWrapper>
            <MonacoEditor
              className="code"
              width="480"
              height="240px"
              theme="vs-dark"
              language="sql"
              value={newCode}
              options={{
                fontSize: 16,
                selectOnLineNumbers: true,
                minimap: {
                  enabled: false,
                },
              }}
              onChange={setNewCode}
              onMount={(editor, monaco) => {
                editor.addAction({
                  id: 'executeCurrentAndAdvance',
                  label: 'Execute Block and Advance',
                  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
                  contextMenuGroupId: '2_execution',
                  precondition:
                    'editorTextFocus && !suggestWidgetVisible && !renameInputVisible && !inSnippetMode ' +
                    '&& !quickFixWidgetVisible',
                  run: () => form.submit(),
                });
              }}
            />
            <Button block type="primary" onClick={() => form.submit()}>
              Run
            </Button>
          </CodeWrapper>
          {sqlError && (
            <Alert
              closable
              style={{ margin: '20px 0px' }}
              type="warning"
              message={sqlError}
              onClose={() => setSqlError(null)}
            />
          )}
          <Form.Item name="geometryColumn" label="Geometry Column">
            <Select
              disabled={isEmpty(geometryFields)}
              placeholder="No geometry columns selected"
              onChange={() => form.submit()}
            >
              {geometryFields.map(field => (
                <Select.Option key={field.name} value={field.name}>
                  {field.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          {!isEmpty(geometryFields) && (
            <Form.Item name="geometryTypeId" label="Type" rules={[{ required: true }]}>
              <Select
                onChange={v => {
                  setGeometryTypeId(v);
                  form.submit();
                }}
              >
                {LAYER_TYPES.map(t => (
                  <Select.Option key={t.id} value={t.id}>
                    {t.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </StyledDrawer>
    </>
  );
};

export default LayerEditor;
