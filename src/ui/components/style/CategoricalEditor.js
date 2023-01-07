import { Alert, Button, Table } from 'antd';
import numeral from 'numeral';
import { ReloadOutlined } from '@ant-design/icons';
import colorbrewer from 'colorbrewer';

import { DEFAULT_COLOR, FORMAT, MAX_DISTINCT_CATEGORIES, STYLE } from 'Constants';

import Colors from 'ui/Colors';
import ScalePicker from 'ui/components/style/ScalePicker';
import Echart from 'ui/components/graph/Echart';
import ColorPicker from 'ui/components/ColorPicker';

export const getScaleForNRecords = ({ scale, nRecords }) => {
  const minIndex = Object.keys(scale)
    .map(k => parseInt(k))
    .reduce((acc, k) => Math.min(acc, k), Infinity);
  const maxIndex = Object.keys(scale)
    .map(k => parseInt(k))
    .reduce((acc, k) => Math.max(acc, k), -Infinity);
  if (nRecords > maxIndex) return scale[maxIndex];
  if (nRecords < minIndex) return scale[minIndex];
  return scale[nRecords];
};

const BAR_WIDTH = 42;

const CategoricalEditor = ({ column, propertyStyle, refreshColumnMetrics, mergePropertyStyle, loading }) => {
  const { columnMetrics } = propertyStyle;

  // Set default colors if none are set
  const colors =
    propertyStyle.colors ||
    columnMetrics.map(c => ({
      field: c.field,
      value: DEFAULT_COLOR,
    }));

  // Check count
  const { total } = columnMetrics[0];
  if (total > MAX_DISTINCT_CATEGORIES) {
    return (
      <Alert
        message={
          <span>
            There are too many distinct values for column <b>{column}</b>. Max. allowed is {MAX_DISTINCT_CATEGORIES}.
          </span>
        }
        type="warning"
        style={{ marginBottom: 10 }}
      />
    );
  }

  const processedRecords = columnMetrics.map(r => ({
    ...r,
    color: colors.find(c => c.field === r.field)?.value,
  }));

  const yAxisCategory = processedRecords.map(r => r.field);
  const xAxisCategory = processedRecords.map(r => ({
    value: r.count,
    itemStyle: {
      color: r.color || DEFAULT_COLOR,
    },
  }));

  return (
    <>
      <ScalePicker
        key={columnMetrics.length}
        onChange={({ scale: selectedScale }) => {
          const scale = colorbrewer[selectedScale];
          const nColors = columnMetrics.length;
          const colorScale = getScaleForNRecords({ scale, nRecords: nColors });

          const newColors = columnMetrics.map((c, i) => {
            return {
              ...c,
              value: colorScale[i] || c.value,
            };
          });

          mergePropertyStyle({
            colors: newColors,
          });
        }}
        maxStops={12}
        nStops={processedRecords.length}
        type={STYLE.CATEGORICAL}
        groups={[
          {
            name: 'Qualitative',
            key: 'qualitative',
          },
        ]}
      />
      <div style={{ display: 'flex', position: 'relative' }}>
        <Button
          icon={<ReloadOutlined />}
          size="small"
          onClick={refreshColumnMetrics}
          style={{ position: 'absolute', right: 0, zIndex: 10, top: 5 }}
          loading={loading}
        >
          Refresh
        </Button>
        <Table
          loading={loading}
          rowKey="field"
          style={{ width: '100%' }}
          size="small"
          columns={[
            {
              title: '#',
              render: (text, record, index) => <span style={{ color: Colors.gray7 }}>{index + 1}</span>,
              width: 30,
              align: 'center',
            },
            {
              title: column,
              dataIndex: 'field',
              align: 'center',
              width: 100,
            },
            {
              title: 'Color',
              dataIndex: 'color',
              width: 50,
              align: 'center',
              render: (color, r) => {
                return (
                  <ColorPicker
                    color={color}
                    onChangeColor={newColor => {
                      console.log('newColor', newColor);
                      const newColors = colors.map(c => {
                        if (c.field === r.field) return { ...c, value: newColor };
                        return c;
                      });

                      mergePropertyStyle({
                        columnMetrics,
                        colors: newColors,
                      });
                    }}
                  />
                );
              },
            },
            {
              title: 'Record Count',
              onCell: (_, index) => {
                if (index !== 0) return { rowSpan: 0 };
                return {
                  rowSpan: processedRecords.length,
                  style: { padding: 0 },
                };
              },
              render: () => (
                <Echart
                  key={JSON.stringify(colors)}
                  colors={colors}
                  style={{
                    flex: 1,
                    height: processedRecords.length * BAR_WIDTH,
                    width: '100%',
                  }}
                  option={{
                    backgroundColor: 'transparent',
                    tooltip: {
                      trigger: 'axis',
                      axisPointer: {
                        type: 'shadow',
                      },
                    },
                    grid: {
                      top: 0,
                      bottom: 0,
                      left: 0,
                    },
                    xAxis: {
                      type: 'value',
                      position: 'top',
                      splitLine: {
                        lineStyle: {
                          type: 'dashed',
                        },
                      },
                    },
                    yAxis: {
                      inverse: true,
                      type: 'category',
                      axisLine: { show: false },
                      axisLabel: { show: false },
                      axisTick: { show: false },
                      splitLine: { show: false },
                      data: yAxisCategory,
                    },
                    series: [
                      {
                        name: 'Count',
                        animation: false,
                        type: 'bar',
                        barWidth: 20,
                        label: {
                          show: true,
                          formatter: r => numeral(r.value).format(FORMAT.NUMBER),
                        },
                        data: xAxisCategory,
                      },
                    ],
                  }}
                />
              ),
            },
          ]}
          dataSource={processedRecords}
          pagination={false}
        />
      </div>

      {/* <Button block style={{ marginTop: 20 }} onClick={clear}>
        Clear
      </Button> */}
    </>
  );
};

export default CategoricalEditor;
