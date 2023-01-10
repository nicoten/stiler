import React from 'react';
import styled from 'styled-components';
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { isEmpty } from 'lodash/fp';
import { KEYS } from '../../Constants';
import { DotInput } from './global/Styled';

const InputWrapper = styled.div`
  display: flex;
  background-color: transparent;
  width: 100%;
  text-decoration: none !important;
  align-items: center;
`;

class ConfirmInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: props.defaultValue || '',
    };
  }

  // NOTE: expecting onConfirm to be a promise
  onConfirm = e => {
    e.stopPropagation();
    if (!this.props.onConfirm) return;

    if (isEmpty(this.state.value)) return;

    this.props
      .onConfirm(this.state.value)
      .then(res => {
        this.setState({ value: '' });
      })
      .catch(e => {
        console.error(e);
      });

    this.onCancel(e);
  };

  onCancel = e => {
    e.stopPropagation();
    this.setState(
      {
        value: this.getDefaultValue(),
      },
      () => {
        if (this.props.onCancel) this.props.onCancel();
        if (this.props.onChange) this.props.onChange(this.state.value);
      },
    );
  };

  onKeyDown = e => {
    if (e.keyCode === KEYS.ENTER) {
      this.onConfirm(e);
    } else if (e.keyCode === KEYS.ESCAPE) {
      this.onCancel(e);
    } else {
      this.setState(
        {
          value: e.target.value,
        },
        () => {
          if (this.props.onChange) this.props.onChange(this.state.value);
        },
      );
    }
  };

  getDefaultValue = () => this.props.defaultValue || '';

  render() {
    const { value } = this.state;
    const { showActions, style, placeholder, disableInput, prefix, onCancel } = this.props;
    const saveEnabled = (value && value.length > 0 && value !== this.getDefaultValue()) || showActions;

    return (
      <InputWrapper style={style} onCancel={onCancel}>
        <DotInput
          type="text"
          placeholder={placeholder}
          value={value}
          onKeyDown={this.onKeyDown}
          onChange={this.onKeyDown}
          prefix={prefix}
          suffix={
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <div>
                {!isEmpty(this.state.value) && (
                  <Button icon={<CheckOutlined />} size="small" onClick={this.onConfirm} disabled={!saveEnabled} />
                )}
                {onCancel && (
                  <Button icon={<CloseOutlined />} size="small" onClick={onCancel} style={{ marginLeft: '5px' }} />
                )}
              </div>
            </div>
          }
          disabled={disableInput}
        />
      </InputWrapper>
    );
  }
}

export default ConfirmInput;
