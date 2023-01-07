import { Button, Divider, Popover } from 'antd';
import styled from 'styled-components';
import { CustomPicker, CirclePicker } from 'react-color';
import { Hue, Saturation, EditableInput } from 'react-color/lib/components/common';
import colorbrewer from 'colorbrewer';
import Colors from '../Colors';
import chroma from 'chroma-js';

const Inputs = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px 0px 0px 0px;
`;

const HueWrap = styled.div`
  height: 10px;
  width: 100%;
  position: relative;
`;

const SaturationWrap = styled.div`
  height: 100px;
  width: 100%;
  position: relative;
  margin-top: 10px;
`;

const InputWrap = styled.div`
  color: white;
  margin: 10px 0px 0px 0px;
  border-radius: 5px;
  overflow: hidden;
  input {
    width: 100%;
    background-color: transparent;
    border: none;
    border-bottom: 1px dotted ${Colors.gray7};
  }
`;

const ColorPicker = ({ onChangeColor, color, hex, rgb, hsl, hsv, onChange, icon, children }) => {
  const colors = colorbrewer.Paired[12];

  const onChangeWrap = c => {
    if (onChangeColor) {
      onChangeColor(c.hex);
    }

    onChange(c);
  };

  return (
    <Popover
      placement="topRight"
      trigger={['click']}
      content={
        <div>
          <CirclePicker colors={colors} onChange={onChangeWrap} color={color || 'black'} />
          <Inputs>
            <Divider style={{ margin: '0px 0px 10px 0px' }} orientation="left">
              <b>Custom</b>
            </Divider>
            <HueWrap>
              <Hue
                {...{
                  hex,
                  rgb,
                  hsl,
                  hsv,
                  onChange: c => {
                    const color = chroma(`hsl(${c.h}, ${c.s * 100}%, 50%)`).hex();
                    onChangeWrap({ hex: color, ...c });
                  },
                }}
              />
            </HueWrap>
            <SaturationWrap>
              <Saturation
                {...{
                  hex,
                  rgb,
                  hsl,
                  hsv,
                  onChange: c => {
                    const color = chroma.hsv(c.h, c.s, c.v).hex();
                    onChangeWrap({ hex: color, ...c });
                  },
                }}
              />
            </SaturationWrap>
            <InputWrap>
              <EditableInput
                style={{ width: '100%' }}
                {...{
                  value: color || 'black',
                  onChange: onChangeWrap,
                }}
              />
            </InputWrap>
          </Inputs>
          {children}
        </div>
      }
    >
      <Button shape="circle" style={{ backgroundColor: color }} size="small" icon={icon}>
        {icon ? null : ' '}
      </Button>
    </Popover>
  );
};

export default CustomPicker(ColorPicker);
