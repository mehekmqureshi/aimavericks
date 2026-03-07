/**
 * MaterialChart Component
 * 
 * Pie chart displaying material composition percentages using recharts.
 * Uses green color theme for eco-friendly visual design.
 * 
 * Requirements: 14.2, 14.5
 */

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Material_Row } from '../../../shared/types';
import './MaterialChart.css';

interface MaterialChartProps {
  materials: Material_Row[];
}

export const MaterialChart: React.FC<MaterialChartProps> = ({ materials }) => {
  /**
   * Prepare data for pie chart
   */
  const chartData = materials.map((material) => ({
    name: material.name,
    value: material.percentage,
    weight: material.weight,
    recycled: material.recycled,
  }));

  /**
   * Green color palette for pie slices
   */
  const colors = [
    '#228b22', // Forest Green
    '#32cd32', // Lime Green
    '#3cb371', // Medium Sea Green
    '#2e8b57', // Sea Green
    '#66cdaa', // Medium Aquamarine
    '#90ee90', // Light Green
    '#98fb98', // Pale Green
    '#00fa9a', // Medium Spring Green
    '#00ff7f', // Spring Green
    '#7cfc00', // Lawn Green
  ];

  /**
   * Custom tooltip
   */
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="material-tooltip">
          <p className="tooltip-label">{data.name}</p>
          <p className="tooltip-value">
            <strong>{data.value}%</strong> of composition
          </p>
          <p className="tooltip-weight">
            Weight: {data.weight} kg
          </p>
          <p className="tooltip-type">
            {data.recycled ? '♻️ Recycled' : '🌱 Virgin'}
          </p>
        </div>
      );
    }
    return null;
  };

  /**
   * Custom label for pie slices
   */
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if percentage is significant (> 5%)
    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={14}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="material-chart">
      <div className="chart-header">
        <h3 className="chart-title">Material Composition</h3>
        <p className="chart-subtitle">
          Breakdown by material type and percentage
        </p>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Material Details Table */}
      <div className="material-details">
        <table className="material-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Percentage</th>
              <th>Weight</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material, index) => (
              <tr key={index}>
                <td>
                  <div className="material-name">
                    <div
                      className="material-color"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    {material.name}
                  </div>
                </td>
                <td className="percentage-cell">{material.percentage}%</td>
                <td className="weight-cell">{material.weight} kg</td>
                <td className="type-cell">
                  {material.recycled ? (
                    <span className="type-badge recycled">♻️ Recycled</span>
                  ) : (
                    <span className="type-badge virgin">🌱 Virgin</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="material-summary">
        <div className="summary-item">
          <span className="summary-label">Total Materials:</span>
          <span className="summary-value">{materials.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Recycled Content:</span>
          <span className="summary-value">
            {materials
              .filter((m) => m.recycled)
              .reduce((sum, m) => sum + m.percentage, 0)
              .toFixed(1)}%
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Weight:</span>
          <span className="summary-value">
            {materials.reduce((sum, m) => sum + m.weight, 0).toFixed(2)} kg
          </span>
        </div>
      </div>
    </div>
  );
};

export default MaterialChart;
