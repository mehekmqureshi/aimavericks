/**
 * LifecycleChart Component
 * 
 * Bar chart displaying emission breakdown by lifecycle stage using recharts.
 * Uses green color theme for eco-friendly visual design.
 * 
 * Requirements: 14.1, 14.5
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { CarbonFootprintResult } from '../../../shared/types';
import './LifecycleChart.css';

interface LifecycleChartProps {
  carbonBreakdown: CarbonFootprintResult['breakdown'];
  totalCO2: number;
}

export const LifecycleChart: React.FC<LifecycleChartProps> = ({
  carbonBreakdown,
  totalCO2,
}) => {
  /**
   * Prepare data for bar chart
   */
  const chartData = [
    {
      name: 'Materials',
      emission: parseFloat(carbonBreakdown.materials.toFixed(2)),
      percentage: ((carbonBreakdown.materials / totalCO2) * 100).toFixed(1),
    },
    {
      name: 'Manufacturing',
      emission: parseFloat(carbonBreakdown.manufacturing.toFixed(2)),
      percentage: ((carbonBreakdown.manufacturing / totalCO2) * 100).toFixed(1),
    },
    {
      name: 'Packaging',
      emission: parseFloat(carbonBreakdown.packaging.toFixed(2)),
      percentage: ((carbonBreakdown.packaging / totalCO2) * 100).toFixed(1),
    },
    {
      name: 'Transport',
      emission: parseFloat(carbonBreakdown.transport.toFixed(2)),
      percentage: ((carbonBreakdown.transport / totalCO2) * 100).toFixed(1),
    },
    {
      name: 'Usage',
      emission: parseFloat(carbonBreakdown.usage.toFixed(2)),
      percentage: ((carbonBreakdown.usage / totalCO2) * 100).toFixed(1),
    },
    {
      name: 'Disposal',
      emission: parseFloat(carbonBreakdown.disposal.toFixed(2)),
      percentage: ((carbonBreakdown.disposal / totalCO2) * 100).toFixed(1),
    },
  ];

  /**
   * Green color palette for bars
   */
  const colors = [
    '#228b22', // Forest Green
    '#32cd32', // Lime Green
    '#3cb371', // Medium Sea Green
    '#2e8b57', // Sea Green
    '#66cdaa', // Medium Aquamarine
    '#90ee90', // Light Green
  ];

  /**
   * Custom tooltip
   */
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="lifecycle-tooltip">
          <p className="tooltip-label">{data.name}</p>
          <p className="tooltip-value">
            <strong>{data.emission} kg CO₂</strong>
          </p>
          <p className="tooltip-percentage">
            {data.percentage}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  /**
   * Format Y-axis label
   */
  const formatYAxis = (value: number) => {
    return `${value} kg`;
  };

  return (
    <div className="lifecycle-chart">
      <div className="chart-header">
        <h3 className="chart-title">Emission Breakdown by Lifecycle Stage</h3>
        <p className="chart-subtitle">
          Total Carbon Footprint: <strong>{totalCO2.toFixed(2)} kg CO₂</strong>
        </p>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fill: '#555', fontSize: 12 }}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fill: '#555', fontSize: 12 }}
              label={{
                value: 'CO₂ Emissions (kg)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#555', fontSize: 14 },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="square"
            />
            <Bar
              dataKey="emission"
              name="CO₂ Emissions (kg)"
              radius={[8, 8, 0, 0]}
            >
              {chartData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend with percentages */}
      <div className="chart-legend">
        {chartData.map((item, index) => (
          <div key={item.name} className="legend-item">
            <div
              className="legend-color"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="legend-name">{item.name}:</span>
            <span className="legend-value">
              {item.emission} kg ({item.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LifecycleChart;
