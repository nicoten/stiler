import React from 'react';
import gif from 'ui/assets/loading.png';

const Loading = ({ loading }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 40,
        width: '50px',
        left: '50%',
        marginLeft: -25,
        zIndex: 9999,
        background: 'transparent',
        opacity: loading ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out',
      }}
    >
      <img src={gif} alt="loading" style={{ width: '100%' }} />
    </div>
  );
};

export default Loading;
