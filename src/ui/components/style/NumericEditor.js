import { Button, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import colorbrewer from 'colorbrewer';
import Draggable from 'react-draggable';
import { useEffect, useState } from 'react';
import numeral from 'numeral';
import styled from 'styled-components';
import chroma from 'chroma-js';
import { chunk, get, isNil } from 'lodash/fp';

import { DEFAULT_COLOR, FORMAT, STYLE } from 'Constants';
import Echart from 'ui/components/graph/Echart';
import ScalePicker from 'ui/components/style/ScalePicker';
import { useIsFirstRender } from 'ui/hooks';
import Colors from 'ui/Colors';

const TRACK_WIDTH = 540;
const TRACK_HEIGHT = 20;
const HANDLE_WIDTH = 16;

const grid = {
  left: 70,
  right: 10,
  top: 40,
};

const TrackWrapper = styled.div`
  width: ${TRACK_WIDTH - grid.left - grid.right}px;
  height: ${TRACK_HEIGHT}px;
  margin: 30px 10px 0px 70px;
  position: relative;
`;

const Handle = styled.div`
  background-color: ${props => props.color};
  border-radius: 8px;
  cursor: pointer;
  position: absolute;
  top: ${({ top }) => (top ? (-HANDLE_WIDTH * 3) / 2 : HANDLE_WIDTH / 2 + TRACK_HEIGHT)}px;
  width: ${HANDLE_WIDTH}px;
  height: ${HANDLE_WIDTH}px;

  &::after {
    content: '';
    width: 0;
    height: 0;
    border-style: solid;
    border-width: ${({ top }) => {
      return top
        ? `${HANDLE_WIDTH}px ${HANDLE_WIDTH / 2}px 0 ${HANDLE_WIDTH / 2}px`
        : `0 ${HANDLE_WIDTH / 2}px ${HANDLE_WIDTH}px ${HANDLE_WIDTH / 2}px`;
    }};
    border-color: ${({ color, top }) => {
      return top ? `${color} transparent transparent transparent` : `transparent transparent ${color} transparent`;
    }};
    position: absolute;
    opacity: 0.7;
    top: ${({ top }) => (top ? HANDLE_WIDTH / 2 : -HANDLE_WIDTH / 2)}px;
    z-index: 5;
  }
`;

const isLinear = items => (items || []).length === 2;

export const Track = ({ colors, percentages, children, style }) => {
  let gradient = null;

  if (isLinear(colors)) {
    const [{ value: color1, percentage: p1 }, { value: color2, percentage: p2 }] = colors;
    gradient = [`${color1} 0%, ${color1} ${p1}%`, `${color2} ${p2}%, ${color2} 100%`];
  } else {
    gradient = percentages
      .map((p, i) => {
        if (!colors) return DEFAULT_COLOR;

        const color = colors[i]?.value || DEFAULT_COLOR;
        const previous = percentages[i - 1];

        if (i === 0) {
          return [`${color} 0%`, `${color} ${p.percentage}%`];
        } else if (i === percentages.length - 1) {
          return [`${color} ${previous?.percentage}%`, `${color} 100%`];
        } else {
          return [`${color} ${previous?.percentage + 0.01}%`, `${color} ${p.percentage}%`];
        }
      })
      .flat();
  }

  return (
    <TrackWrapper
      className="color-track"
      style={{
        background: `linear-gradient(to right, ${gradient.join(', ')})`,
        ...style,
      }}
    >
      {children}
    </TrackWrapper>
  );
};

const Slider = ({ colors, percentages, setPercentages }) => {
  const getPositionFromPercentage = p => {
    const position = (TRACK_WIDTH - grid.left - grid.right) * (p / 100) - HANDLE_WIDTH / 2;
    return { y: 0, x: position, percentage: p };
  };

  const getPercentageFromPosition = p => {
    const percentage = ((p.x + HANDLE_WIDTH / 2) / (TRACK_WIDTH - grid.left - grid.right)) * 100;
    return { percentage };
  };

  const getPositionsFromPercentages = ps => ps.map(p => getPositionFromPercentage(p.percentage));

  const [positions, setPositions] = useState(getPositionsFromPercentages(percentages));

  useEffect(() => {
    setPositions(getPositionsFromPercentages(percentages));
  }, [JSON.stringify(percentages)]);

  // When we're rendering a linear range, position handles at extremes, otherwise
  // interpolate in the middle and skip the last one
  const handlePositions = isLinear(percentages) ? positions : positions.slice(0, -1);

  if (!colors) return null;

  return (
    <>
      <Track colors={colors} percentages={percentages}>
        {handlePositions.map((c, i) => {
          const previous = positions[i - 1] || { x: 0 };
          const next = positions[i + 1] || getPositionFromPercentage(100);
          const thisPosition = positions[i];

          return (
            <Draggable
              key={i}
              axis="x"
              bounds={{
                left: previous.x + 1,
                right: next.x - 1,
              }}
              position={thisPosition}
              onDrag={(e, position) => {
                // Internal State
                const newPositions = positions.map((p, j) => (j === i ? { ...p, x: position.x } : p));
                setPositions(newPositions);

                // External State
                setPercentages(newPositions.map(getPercentageFromPosition));
              }}
              scale={1}
            >
              <Handle id={`handle-${i}`} key={i} color={get(`${i}.value`, colors) || 'red'} top={!!(i % 2)}>
                <Tooltip
                  placement={i % 2 ? 'top' : 'bottom'}
                  title={
                    <div style={{ textAlign: 'center' }}>
                      <div>{`${numeral(colors[i]?.field).format(FORMAT.NUMBER)}`}</div>
                      <div style={{ fontSize: 12, color: Colors.gray5 }}>{`(${numeral(c.percentage).format(
                        '0.0',
                      )}%)`}</div>
                    </div>
                  }
                >
                  <div
                    style={{
                      width: HANDLE_WIDTH,
                      height: HANDLE_WIDTH,
                      zIndex: 10,
                      position: 'absolute',
                    }}
                  ></div>
                </Tooltip>
              </Handle>
            </Draggable>
          );
        })}
      </Track>
    </>
  );
};

const getInitialPercentages = ({ columnMetrics, colors }) => {
  const items = Array.isArray(colors) ? colors : columnMetrics;

  // When we have just two colors, its a linear gradient so we need to position
  // the sliders at the extremes
  if (isLinear(items) && !colors) {
    return [
      {
        percentage: 0,
      },
      {
        percentage: 100,
      },
    ];
  }

  return items.map((c, i) => {
    return {
      percentage: !isNil(c.percentage) ? c.percentage : (100 * (i + 1)) / columnMetrics.length,
    };
  });
};

const DEFAULT_N_STOPS = 2;
const DEFAULT_COLOR_SCALE = 'BuGn';

const NumericEditor = ({ propertyStyle, refreshColumnMetrics, mergePropertyStyle, loading }) => {
  const isFirstRender = useIsFirstRender();
  const {
    columnMetrics: rawColumnMetrics,
    nStops = DEFAULT_N_STOPS,
    colorScale = DEFAULT_COLOR_SCALE,
    colors,
  } = propertyStyle;

  const chunkSize = Math.ceil(rawColumnMetrics.length / nStops);
  const columnMetrics = chunk(chunkSize, rawColumnMetrics).map((arr, i) => ({
    bin: i,
    low: arr[0].low,
    high: arr[arr.length - 1].high,
    frequency: arr.reduce((acc, cur) => acc + cur.frequency, 0),
  }));

  const [percentages, setPercentages] = useState(getInitialPercentages({ columnMetrics, colors }));

  // Build histogram
  const { dataAxis, data } = rawColumnMetrics.reduce(
    (acc, { bin, frequency }) => {
      return {
        dataAxis: [...acc.dataAxis, bin],
        data: [...acc.data, frequency],
      };
    },
    {
      dataAxis: [],
      data: [],
    },
  );

  const updatePropertyStyle = ({ resetPercentages } = {}) => {
    let brewerScale = null;
    if (nStops === 2) {
      // Use a linear gradient
      const tempBrewerScale = get(`${colorScale}.9`, colorbrewer);
      brewerScale = [tempBrewerScale[0], tempBrewerScale[8]];
    } else {
      brewerScale = get(`${colorScale}.${nStops}`, colorbrewer);

      if (!brewerScale) {
        console.log('No color scale found for', colorScale, nStops);
        return;
      }
    }

    let newPercentages = percentages;

    if (resetPercentages) {
      newPercentages = getInitialPercentages({ columnMetrics });
      setPercentages(newPercentages);
    }

    const min = columnMetrics[0].low;
    const max = columnMetrics[columnMetrics.length - 1].high;

    const newColors = columnMetrics.map((c, i) => {
      const percentage = newPercentages[i]?.percentage;

      return {
        field: min + ((max - min) * percentage) / 100,
        value: brewerScale[i] || c.value,
        percentage,
      };
    });

    mergePropertyStyle({
      colorScale,
      nStops,
      colors: newColors,
    });
  };

  useEffect(() => {
    if (isFirstRender) return;
    updatePropertyStyle();
  }, [percentages, colorScale]);

  useEffect(() => {
    if (isFirstRender) return;
    updatePropertyStyle({ resetPercentages: true });
  }, [rawColumnMetrics]);

  return (
    <div>
      <ScalePicker
        maxStops={12}
        scale={colorScale}
        nStops={nStops}
        type={STYLE.NUMERIC}
        groups={[
          {
            name: 'Sequential',
            key: 'sequential',
          },
          {
            name: 'Diverging',
            key: 'diverging',
          },
          {
            name: 'Single Hue',
            key: 'singlehue',
          },
        ]}
        onChange={({ scale, stops }) => {
          mergePropertyStyle({
            colorScale: scale,
            nStops: stops,
          });
        }}
      />

      <div key={JSON.stringify(columnMetrics)} style={{ position: 'relative' }}>
        <Button
          size="small"
          onClick={refreshColumnMetrics}
          style={{ position: 'absolute', right: 0, zIndex: 10, top: 5 }}
          icon={<ReloadOutlined />}
        >
          Refresh
        </Button>
        <Echart
          colors={columnMetrics}
          style={{
            flex: 1,
            height: 400,
            width: TRACK_WIDTH,
          }}
          option={{
            backgroundColor: 'transparent',
            tooltip: {
              trigger: 'axis',
              axisPointer: {
                type: 'shadow',
              },
              formatter: ([value], r) => {
                const { low, high } = rawColumnMetrics[value.dataIndex];
                return `${numeral(low).format(FORMAT.NUMBER)} to ${numeral(high).format(FORMAT.NUMBER)}<br/>${numeral(
                  value.value,
                ).format(FORMAT.NUMBER)} Records`;
              },
            },
            xAxis: {
              data: dataAxis,
              axisTick: {
                show: false,
              },
              axisLine: {
                show: false,
              },
              axisLabel: {
                show: true,
                formatter: (_, r) => {
                  if (!colors) return null;
                  const { low, high } = rawColumnMetrics[r];
                  const color = colors.find(c => c.field >= low && c.field <= high);
                  return color ? numeral(color.field).format(FORMAT.NUMBER) : null;
                },
                interval: 0,
                rotate: 30,
              },
              z: 10,
            },
            yAxis: {
              axisLine: {
                show: false,
              },
              axisTick: {
                show: false,
              },
              axisLabel: {
                color: '#999',
              },
            },
            dataZoom: [
              {
                type: 'inside',
              },
            ],
            grid,
            series: [
              {
                barWidth: '100%',
                animation: false,
                type: 'bar',
                itemStyle: {
                  borderColor: '#333',
                  color: v => {
                    if (isLinear(colors)) {
                      // For linears, generate a uniform gradient between the two extremes
                      const [low, high] = colors;
                      const scale = chroma.scale([low.value, high.value]).domain([low.percentage, high.percentage]);
                      return scale(v.dataIndex).hex();
                    }

                    const { bin } = rawColumnMetrics[v.dataIndex];
                    return (
                      (propertyStyle.colors || []).find((c, i) => {
                        if (i === 0 && bin < c.percentage) return true;
                        return bin < c.percentage;
                      })?.value || DEFAULT_COLOR
                    );
                  },
                },
                data: data,
              },
            ],
          }}
        />
        <Slider
          colorScale={colorScale}
          colors={colors}
          percentages={percentages}
          setPercentages={setPercentages}
          columnMetrics
        />
      </div>
    </div>
  );
};

export default NumericEditor;
