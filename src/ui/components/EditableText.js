import React, { useState } from 'react';
import styled from 'styled-components';
import { EditOutlined } from '@ant-design/icons';
import { Button, Popover } from 'antd';
import Colors from '../Colors';
import ConfirmInput from './ConfirmInput';

const Wrapper = styled.span`
  cursor: pointer;
  display: flex;
  flex: 1;
  align-items: center;
  position: relative;
  transition: all 0.2s ease-in-out;

  &:hover {
      .edit-icon {
        opacity: 1 !important;
      }
    }
  }
`;

const TitleWrapper = styled.span`
  display: flex;
`;

const EditorWrapper = styled.div`
  display: flex;
  flex: 1;
  position: relative;
`;

// From ColorBrewer
export const EditableTextColors = [
  '#a6cee3',
  '#1f78b4',
  '#b2df8a',
  '#33a02c',
  '#fb9a99',
  '#e31a1c',
  '#fdbf6f',
  '#ff7f00',
  '#cab2d6',
  '#6a3d9a',
  '#ffff99',
  '#b15928',
];

const ColorsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  max-width: 180px;
`;

const Color = styled.div`
  background-color: ${props => props.color};
  border-radius: 50%;
  cursor: pointer;
  display: block;
  margin: 2.5px;
  height: 25px;
  width: 25px;
`;

const Placeholder = styled.span`
  color: ${Colors.gray5};
  font-style: italic;
`;

const EditableText = ({
  style,
  inputStyle,
  onTextClick,
  children,
  textValue,
  colorValue,
  isColorEditable,
  onSave,
  placeholder,
}) => {
  const [editing, setEditing] = useState(false);
  const [color, setColor] = useState(colorValue);

  if (editing) {
    const colors = EditableTextColors.map(c => <Color key={c} color={c} onClick={() => setColor(c)} />);

    return (
      <EditorWrapper onClick={e => e.stopPropagation()} style={style}>
        <ConfirmInput
          style={inputStyle}
          prefix={
            isColorEditable && (
              <Popover
                placement="bottomLeft"
                disabled={!isColorEditable}
                content={<ColorsWrapper>{colors}</ColorsWrapper>}
                trigger="click"
              >
                <Button
                  size="small"
                  shape="circle"
                  style={{ border: `1px solid ${Colors.gray2}`, backgroundColor: color, margin: '5px 10px 5px 0px' }}
                >
                  {' '}
                </Button>
              </Popover>
            )
          }
          showActions
          onCancel={() => {
            setEditing(false);
          }}
          onConfirm={newValue => onSave({ newValue, newColor: color })}
          defaultValue={textValue}
        />
      </EditorWrapper>
    );
  }

  return (
    <Wrapper style={style}>
      <TitleWrapper style={inputStyle} onClick={onTextClick}>
        {children || textValue || <Placeholder>{placeholder}</Placeholder>}
      </TitleWrapper>
      <EditOutlined
        onClick={e => {
          e.stopPropagation();
          setEditing(true);
        }}
        className="edit-icon"
        style={{
          color: Colors.gray5,
          opacity: 0,
          fontSize: '16px',
          height: '20px',
          marginTop: '3px',
          marginLeft: '3px',
          marginRight: '5px',
          transition: 'all 0.2s ease-in-out',
          width: '20px',
        }}
      />
    </Wrapper>
  );
};

export default EditableText;
