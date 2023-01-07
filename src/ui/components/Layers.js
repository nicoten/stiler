import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import React, { useContext } from 'react';
import { Icon } from '@iconify/react';
import { EditOutlined, EyeInvisibleOutlined, EyeOutlined, MenuOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { Button, Collapse, Form, Slider } from 'antd';
import { camelCase, isEmpty } from 'lodash/fp';

import { AppContext } from 'ui/context/AppProvider';
import { getLayerType, layerOptionLayout } from 'ui/components/LayerOptions';
import Colors from 'ui/Colors';
import { mapboxZoomToPercent } from 'ui/util/gis';
import LayerEditor from 'ui/components/LayerEditor';

const LayerHandle = styled.div`
  color: ${Colors.gray6};
  transition: color 0.2s ease;
  padding-right: 14px;
  &:hover {
    color: ${Colors.gray4};
  }
`;

const EditorWrapper = styled.div`
  background-color: ${Colors.gray9};
  box-shadow: inset 0px 0px 10px rgba(0, 0, 0, 0.5);
  padding: 16px;
`;

export const LayerIcon = ({ layer }) => {
  const layerType = getLayerType(layer);
  return (
    <Icon
      color={layer.style[`${camelCase(layerType?.mapboxType)}Color`]}
      icon={layerType?.icon}
      height={15}
      style={{ marginRight: 10 }}
    />
  );
};

const Layers = () => {
  const { map, layers, moveLayer, setLayerVisibility, setLayerZoomVisibility, setDrawerId } = useContext(AppContext);

  return (
    <>
      <DragDropContext
        onDragEnd={a => {
          if (!a.destination) return;

          const { destination, source } = a;
          const from = source.index;
          const to = destination.index;
          moveLayer({ from, to, layer: layers[from] });
        }}
      >
        <Droppable droppableId="layers">
          {provided => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              {layers.map((layer, index) => {
                const layerType = getLayerType(layer);

                return (
                  <Draggable key={layer.key} draggableId={layer.key} index={index}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps}>
                        <Collapse ghost expandIcon={() => null}>
                          <LayerEditor layer={layer} />
                          <Collapse.Panel
                            style={{
                              backgroundColor: 'rgba(34,34,34)',
                            }}
                            header={
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <LayerHandle {...provided.dragHandleProps}>
                                  <MenuOutlined />
                                </LayerHandle>
                                <LayerIcon layer={layer} />
                                <div>{layer.name}</div>
                              </div>
                            }
                            extra={
                              <Button
                                type="ghost"
                                ghost
                                size="small"
                                onClick={e => {
                                  e.stopPropagation();
                                  setLayerVisibility({
                                    layer,
                                    visible: !layer.visible,
                                  });
                                }}
                                icon={layer.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                              />
                            }
                          >
                            <EditorWrapper>
                              <Button
                                block
                                onClick={() => setDrawerId(`edit-layer-${layer.id}`)}
                                icon={<EditOutlined />}
                                style={{ marginBottom: 10 }}
                              >
                                Edit
                              </Button>
                              {!isEmpty(layer.fields) && (
                                <>
                                  <Form style={{ padding: '10px 10px 0px 10px' }}>
                                    {layerType?.component({ layer })}
                                    {map && (
                                      <Form.Item label="By Zoom" {...layerOptionLayout}>
                                        <Slider
                                          min={0}
                                          max={100}
                                          range
                                          value={[layer.minZoom || 0, layer.maxZoom || 100]}
                                          onChange={([minZoom, maxZoom]) => {
                                            setLayerZoomVisibility({
                                              layer,
                                              minZoom,
                                              maxZoom,
                                            });
                                          }}
                                          marks={{
                                            [mapboxZoomToPercent({ mapZoom: map.getZoom() })]: 'Current Zoom',
                                          }}
                                        />
                                      </Form.Item>
                                    )}
                                  </Form>
                                </>
                              )}
                            </EditorWrapper>
                          </Collapse.Panel>
                        </Collapse>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </>
  );
};

export default Layers;
