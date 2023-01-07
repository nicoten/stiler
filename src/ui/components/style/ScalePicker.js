import { Form, Select } from 'antd';
import { useEffect, useState } from 'react';
import colorbrewer from 'colorbrewer';
import { STYLE } from 'Constants';
import styled from 'styled-components';

import { useIsFirstRender } from 'ui/hooks';

const Block = styled.div`
  height: 12px;
  margin-right: 1px;
`;

const formLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 },
};

const Scale = ({ type, scale, nStops }) => {
  let blocks = null;

  if (type === STYLE.CATEGORICAL) {
    const colors = scale[Math.max(nStops, 3)];
    blocks = colors.map((color, i) => <Block key={i} style={{ width: 20, background: color }} />);
  } else if (type === STYLE.NUMERIC) {
    if (nStops === 2) {
      const colors = scale[9];
      blocks = (
        <Block
          style={{
            background: `linear-gradient(to right, ${colors[0]} 0%, ${colors[8]} 100%)`,
            flex: 1,
          }}
        />
      );
    } else {
      const colors = scale[Math.max(nStops, 3)];
      blocks = colors.map((color, i) => <Block key={i} style={{ flex: 1, background: color }} />);
    }
  }

  return <div style={{ display: 'flex', padding: '9px 0px 10px 0px' }}>{blocks}</div>;
};

const ScalePicker = ({ scale, groups, type, nStops, maxStops, onChange }) => {
  const [innerScale, setScale] = useState(scale);
  const [stops, setStops] = useState(nStops);
  const isFirstRender = useIsFirstRender();

  useEffect(() => {
    if (isFirstRender) return;
    onChange({
      scale: innerScale,
      stops,
    });
  }, [innerScale, stops]);

  return (
    <Form.Item label="Scale" {...formLayout}>
      <div style={{ display: 'flex' }}>
        {type === STYLE.NUMERIC && (
          <Select style={{ width: 150, marginRight: 10 }} placeholder="Stops" value={stops} onChange={setStops}>
            <Select.Option key="linear" value={2}>
              Linear
            </Select.Option>
            {Array.from({ length: maxStops - 5 })
              .fill(null)
              .map((_, i) => (
                <Select.Option key={i} value={i + 3}>
                  {i + 3} Stops
                </Select.Option>
              ))}
          </Select>
        )}
        <Select
          value={innerScale}
          placeholder="Select a color scale"
          onChange={setScale}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          {groups.map(group => {
            return (
              <Select.OptGroup label={group.name} key={group.key}>
                {colorbrewer.schemeGroups[group.key]
                  .filter(scaleName => {
                    return colorbrewer[scaleName] && Object.keys(colorbrewer[scaleName]).length + 2 >= nStops;
                  })
                  .map(scaleName => {
                    return (
                      <Select.Option
                        key={scaleName}
                        value={scaleName}
                        style={{ display: 'flex', alignItems: 'center', paddingRight: 20 }}
                      >
                        <Scale type={type} scale={colorbrewer[scaleName]} nStops={stops} />
                      </Select.Option>
                    );
                  })}
              </Select.OptGroup>
            );
          })}
        </Select>
      </div>
    </Form.Item>
  );
};

export default ScalePicker;
