import React from 'react';
import styled from 'styled-components';
import Colors from '../Colors';

const Item = styled.div`
  background-color: ${props => (props.selected ? Colors.blue8 : Colors.gray9)};
  color: ${props => (props.selected ? Colors.gray0 : Colors.gray4)};
  cursor: ${props => (props.onClick ? 'pointer' : 'default')};
  display: flex;
  align-items: center;
  padding: 10px 10px 10px 20px;
  transition: background-color 0.1s ease-in-out;

  &:hover {
    background-color: ${props => (props.selected ? Colors.blue7 : Colors.gray8)};
  }
`;

const Text = styled.div`
  flex: 1;
  padding: 0px 10px;
`;

const SiderItem = ({ prefix, suffix, children, onClick, selected }) => {
  return (
    <Item onClick={onClick} selected={selected}>
      {prefix}
      <Text>{children}</Text>
      {suffix}
    </Item>
  );
};

export default SiderItem;
