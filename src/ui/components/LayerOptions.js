import { useContext } from 'react';
import styled from 'styled-components';
import { Button, Divider, Form, Slider } from 'antd';
import { EditOutlined, ExperimentOutlined } from '@ant-design/icons';
import { get } from 'lodash/fp';
import { Icon } from '@iconify/react';

import Colors from 'ui/Colors';
import { AppContext } from 'ui/context/AppProvider';
import ColorPicker from 'ui/components/ColorPicker';
import StyleEditor from 'ui/components/style/StyleEditor';
import { Track } from 'ui/components/style/NumericEditor';
import { STYLE } from 'Constants';

const Column = styled.div`
  font-size: 12px;
  margin-top: 3px;
`;

export const layerOptionLayout = {
  labelCol: {
    span: 6,
  },
  wrapperCol: {
    span: 18,
  },
};

const SectionDivider = ({ children }) => (
  <Divider
    orientation="left"
    style={{
      borderColor: Colors.gray8,
      fontSize: 14,
      fontWeight: 'bold',
      margin: '0px 0px 10px 0px',
      padding: 0,
    }}
  >
    {children}
  </Divider>
);

const ColorOption = ({ layer, property, label }) => {
  const { updateLayerPaint } = useContext(AppContext);

  let inner = null;

  // Its computed in ColorLab
  const style = get(`style.${property}`, layer);
  const colors = get(`style.${property}.colors`, layer);
  if (colors) {
    inner = (
      <StyleEditor layer={layer} property={property} label={label}>
        {({ onClick }) => {
          let legendItem = null;

          // Return dots
          if (style.type === STYLE.CATEGORICAL) {
            legendItem = (
              <div style={{ display: 'flex', width: '100%' }}>
                {colors.map((c, i) => (
                  <Icon key={i} icon="gis:circle" color={c.value} style={{ marginRight: 5 }} />
                ))}
              </div>
            );
          } else {
            legendItem = (
              <Track
                colors={colors}
                percentages={colors}
                style={{
                  borderRadius: '4px',
                  width: '100%',
                  margin: 0,
                }}
              />
            );
          }

          // Numeric
          return (
            <div style={{ display: 'flex' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
                {legendItem}
                <Column>{style?.column}</Column>
              </div>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={onClick}
                style={{ marginLeft: 5, marginTop: -2 }}
                size="small"
              />
            </div>
          );
        }}
      </StyleEditor>
    );
  } else {
    const layerType = getLayerType(layer);
    const color = layer.style[property] || layerType?.paintProps[property];

    inner = (
      <ColorPicker
        color={color}
        onChangeColor={value => {
          updateLayerPaint({
            layer,
            property,
            value,
          });
        }}
      >
        <StyleEditor layer={layer} property={property} label={label}>
          {({ onClick }) => (
            <Button block style={{ marginTop: 20 }} icon={<ExperimentOutlined />} onClick={onClick}>
              Configure in Color Lab
            </Button>
          )}
        </StyleEditor>
      </ColorPicker>
    );
  }

  return (
    <Form.Item name={property} label={label} {...layerOptionLayout}>
      {inner}
    </Form.Item>
  );
};

const SliderOption = ({ layer, name, label, sliderProps }) => {
  const { updateLayerPaint } = useContext(AppContext);
  const layerType = getLayerType(layer);

  return (
    <Form.Item label={label} {...layerOptionLayout}>
      <Slider
        handleStyle={{
          border: `2px solid ${Colors.antd.primary}`,
        }}
        trackStyle={{
          backgroundColor: Colors.antd.primary,
        }}
        {...sliderProps}
        value={layer.style[name] || layerType?.paintProps[name]}
        onChange={value => {
          updateLayerPaint({
            layer,
            property: name,
            value,
          });
        }}
      />
    </Form.Item>
  );
};

export const CircleOptions = ({ layer }) => {
  // https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#circle
  return (
    <>
      <SectionDivider>Point Style</SectionDivider>
      <ColorOption layer={layer} property="circleColor" label="Color" />
      <SliderOption
        layer={layer}
        name="circleRadius"
        label="Radius"
        sliderProps={{
          min: 1,
          max: 20,
          step: 0.5,
          defaultValue: 5,
        }}
      />
      <SliderOption
        layer={layer}
        name="circleBlur"
        label="Blur"
        sliderProps={{
          min: 0,
          max: 5,
          step: 0.1,
          defaultValue: 0,
        }}
      />
      <SectionDivider>Outline</SectionDivider>
      <ColorOption layer={layer} property="circleStrokeColor" label="Color" />
      <SliderOption
        layer={layer}
        name="circleStrokeWidth"
        label="Width"
        sliderProps={{
          min: 0,
          max: 5,
          step: 0.01,
          defaultValue: 0,
        }}
      />
      <SectionDivider>Visibility</SectionDivider>
      <SliderOption
        layer={layer}
        name="circleOpacity"
        label="Opacity"
        sliderProps={{
          min: 0,
          max: 1,
          step: 0.01,
          defaultValue: 1,
        }}
      />
    </>
  );
};

export const LineOptions = ({ layer }) => {
  // https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#line
  return (
    <>
      <ColorOption layer={layer} property="lineColor" label="Color" />
      <SliderOption
        layer={layer}
        name="lineWidth"
        label="Width"
        sliderProps={{
          min: 1,
          max: 10,
          step: 0.1,
          defaultValue: 1,
        }}
      />
      <SliderOption
        layer={layer}
        name="lineBlur"
        label="Blur"
        sliderProps={{
          min: 0,
          max: 5,
          step: 0.1,
          defaultValue: 0,
        }}
      />
      <SliderOption
        layer={layer}
        name="lineOpacity"
        label="Opacity"
        sliderProps={{
          min: 0,
          max: 1,
          step: 0.01,
          defaultValue: 1,
        }}
      />
    </>
  );
};

export const PolygonOptions = ({ layer }) => {
  // https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#fill
  return (
    <>
      <SectionDivider>Polygon Style</SectionDivider>
      <ColorOption layer={layer} property="fillColor" label="Color" />
      <SectionDivider>Outline</SectionDivider>
      <ColorOption layer={layer} property="fillOutlineColor" label="Color" />
      <SectionDivider>Visibility</SectionDivider>
      <SliderOption
        layer={layer}
        name="fillOpacity"
        label="Opacity"
        sliderProps={{
          min: 0,
          max: 1,
          step: 0.01,
          defaultValue: 1,
        }}
      />
    </>
  );
};

export const ExtrudedPolygonOptions = ({ layer }) => {
  // https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#line
  return (
    <>
      <ColorOption layer={layer} property="fillExtrusionColor" label="Color" />
      <SliderOption
        layer={layer}
        name="fillExtrusionHeight"
        label="Height"
        sliderProps={{
          min: 0,
          max: 200,
          step: 0.1,
        }}
      />
      <SliderOption
        layer={layer}
        name="fillExtrusionOpacity"
        label="Opacity"
        sliderProps={{
          min: 0,
          max: 1,
          step: 0.01,
        }}
      />
    </>
  );
};

export const LAYER_TYPES = [
  {
    id: 'point',
    name: 'Point',
    component: CircleOptions,
    icon: 'gis:circle',
    mapboxType: 'circle',
    paintProps: {
      circleColor: Colors.yellow3,
      circleStrokeColor: Colors.yellow3,
      circleStrokeWidth: 0,
      circleBlur: 0,
      circleOpacity: 1,
      circleRadius: 5,
    },
  },
  {
    id: 'line',
    name: 'Line',
    component: LineOptions,
    icon: 'gis:polyline',
    mapboxType: 'line',
    paintProps: {
      lineColor: Colors.yellow3,
      lineWidth: 1,
      lineBlur: 0,
      lineOpacity: 1,
    },
  },
  {
    id: 'polygon',
    name: 'Polygon',
    component: PolygonOptions,
    icon: 'gis:polygon',
    mapboxType: 'fill',
    paintProps: {
      fillColor: Colors.yellow3,
      fillOutlineColor: Colors.yellow3,
      fillOpacity: 1,
    },
  },
  {
    id: 'extrudedPolygon',
    name: 'Extruded Polygon',
    component: ExtrudedPolygonOptions,
    icon: 'clarity:block-solid',
    mapboxType: 'fill-extrusion',
    paintProps: {
      fillExtrusionColor: Colors.yellow3,
      fillExtrusionHeight: 1,
      fillExtrusionOpacity: 1,
    },
  },
];

export const getLayerType = layer => {
  return LAYER_TYPES.find(t => t.id === layer.geometryTypeId);
};
