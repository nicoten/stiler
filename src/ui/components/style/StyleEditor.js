import { useContext, useEffect, useState } from 'react';
import { Button, Form, message, Select, Spin } from 'antd';
import { get } from 'lodash/fp';

import { DEFAULT_COLOR, STYLE } from 'Constants';
import NumericEditor from 'ui/components/style//NumericEditor';
import CategoricalEditor from 'ui/components/style//CategoricalEditor';
import { useIsFirstRender } from 'ui/hooks';
import { AppContext } from 'ui/context/AppProvider';
import { StyledDrawer } from 'ui/components/global/Styled';

const formLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 },
};

const InnerStyleEditor = ({ layer, property }) => {
  const isFirstRender = useIsFirstRender();
  const [loading, setLoading] = useState(false);
  const { updateLayerPaint, replaceLayer, getConnectionForDataSource } = useContext(AppContext);
  const [propertyStyle, setPropertyStyle] = useState(get(`style.${property}`, layer) || {});

  const { column, type, nStops = 2 } = propertyStyle;

  const mergePropertyStyle = newPropertyStyle => {
    const mergeWith = typeof propertyStyle === 'string' ? {} : propertyStyle;

    setPropertyStyle({
      ...mergeWith,
      ...newPropertyStyle,
    });
  };

  useEffect(() => {
    // Do not update the first time
    if (isFirstRender) return;

    updateLayerPaint({
      layer,
      property,
      value: propertyStyle,
    });
  }, [propertyStyle]);

  const columnMetrics = propertyStyle.columnMetrics || null;

  const refreshColumnMetrics = ({ resetColors }) => {
    // Clear and exit
    if (!column || !type) {
      mergePropertyStyle({
        columnMetrics: null,
        colors: null,
      });
      return;
    }

    setLoading(true);

    const { connection, variables } = getConnectionForDataSource({ dataSourceId: layer.dataSourceId });

    // Refresh
    return window.api
      .getColumnMetrics({
        connectionId: connection.id,
        variables,
        sql: layer.code,
        column,
        type,
        nStops,
      })
      .then(m => {
        setLoading(false);
        mergePropertyStyle({
          columnMetrics: m.records,
        });
      })
      .catch(e => {
        setLoading(false);
        message.error('Failed to compute column metrics');
        console.log(e);
      });
  };

  useEffect(() => {
    if (isFirstRender && columnMetrics) return;

    // If we change the column, we need to replace the layer since
    // the column that drives the data needs to be re-added to the query
    // We can make this smarter though and check if it actually needs to be re-requested
    refreshColumnMetrics({ resetColors: true });
    console.log('replacing with layer', layer);
    replaceLayer({ layer });
  }, [column]);

  useEffect(() => {
    if (isFirstRender && columnMetrics) return;

    // If we change the column, we need to recalculate the metrics
    refreshColumnMetrics({ resetColors: true });
  }, [type, nStops]);

  const editorProps = {
    layer,
    property,
    propertyStyle,
    refreshColumnMetrics,
    mergePropertyStyle,
    loading,
  };

  return (
    <Form>
      <Form.Item label="Column" {...formLayout}>
        <Select
          onChange={column =>
            mergePropertyStyle({
              column,
            })
          }
          value={column}
        >
          <Select.Option value={null}>None</Select.Option>
          {layer.fields
            .filter(c => c.type !== 'geometry')
            .map(c => (
              <Select.Option key={c.columnID} value={c.name}>
                {c.name}
              </Select.Option>
            ))}
        </Select>
      </Form.Item>
      <Form.Item label="Type" {...formLayout}>
        <Select
          onChange={type =>
            mergePropertyStyle({
              type,
            })
          }
          value={type}
        >
          <Select.Option value={STYLE.CATEGORICAL}>
            <div>
              <div>Categorical</div>
              <div style={{ fontSize: 12 }}>Style based on distinct values of a given column</div>
            </div>
          </Select.Option>
          <Select.Option value={STYLE.NUMERIC}>
            <div>
              <div>Numeric</div>
              <div style={{ fontSize: 12 }}>Style based on a numeric column with stops</div>
            </div>
          </Select.Option>
        </Select>
      </Form.Item>
      {loading && <div style={{ textAlign: 'center' }}>{<Spin />}</div>}
      {!loading && columnMetrics && (
        <>
          {type === STYLE.CATEGORICAL && <CategoricalEditor {...editorProps} />}
          {type === STYLE.NUMERIC && <NumericEditor {...editorProps} />}
        </>
      )}
    </Form>
  );
};

const OuterStyleEditor = ({ children, layer, label, property, ...rest }) => {
  const { isDrawerVisible, setDrawerId, updateLayerPaint } = useContext(AppContext);

  const drawerId = `edit-layer-style-${layer.id}-${property}`;

  return (
    <>
      {children
        ? children({
            onClick: () => setDrawerId(drawerId),
          })
        : null}
      <StyledDrawer
        destroyOnClose
        key={drawerId}
        open={isDrawerVisible(drawerId)}
        title={
          <b>
            {layer.name} - {label} Style
          </b>
        }
        onClose={() => setDrawerId(null)}
        width={600}
        footer={
          <Button
            onClick={() => {
              updateLayerPaint({
                layer,
                property,
                value: DEFAULT_COLOR,
              });

              setDrawerId(false);
            }}
            type="danger"
            block
          >
            Clear
          </Button>
        }
        mask={false}
      >
        <InnerStyleEditor layer={layer} label={label} property={property} {...rest} />
        <br />
      </StyledDrawer>
    </>
  );
};

export default OuterStyleEditor;
