import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const Echart = ({ style, option, colors }) => {
  const graphRef = useRef(null);
  const echartsRef = useRef(null);

  useEffect(() => {
    if (!echartsRef.current) {
      echartsRef.current = echarts.init(graphRef.current, 'dark');
    }

    try {
      echartsRef.current.setOption(option);
    } catch (e) {
      console.log(e);
    }
  }, [colors, style, option]);

  return <div ref={graphRef} style={{ ...style }} />;
};

export default Echart;
