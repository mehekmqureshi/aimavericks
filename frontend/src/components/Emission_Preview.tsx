/**
 * Emission_Preview Component
 * 
 * Real-time sidebar display showing calculated emissions as data is entered.
 * Shows emission breakdown by category and running total.
 * 
 * Requirements: 3.3, 24.8-24.9
 */

import type { Badge } from '../../../shared/types';
import './Emission_Preview.css';

interface Emission_PreviewProps {
  breakdown: {
    materials: number;
    manufacturing: number;
    packaging: number;
    transport: number;
    usage: number;
    disposal: number;
  };
  totalCO2: number;
  badge?: Badge;
}

export default function Emission_Preview({ breakdown, totalCO2, badge }: Emission_PreviewProps) {
  const categories = [
    { key: 'materials', label: 'Raw Materials', value: breakdown.materials },
    { key: 'manufacturing', label: 'Manufacturing', value: breakdown.manufacturing },
    { key: 'packaging', label: 'Packaging', value: breakdown.packaging },
    { key: 'transport', label: 'Transport', value: breakdown.transport },
    { key: 'usage', label: 'Usage Phase', value: breakdown.usage },
    { key: 'disposal', label: 'End of Life', value: breakdown.disposal }
  ];

  const getBadgeInfo = (co2: number) => {
    if (co2 < 4) {
      return { name: 'Environment Friendly', color: '#10b981', threshold: '< 4 kg' };
    } else if (co2 <= 7) {
      return { name: 'Moderate Impact', color: '#f59e0b', threshold: '4-7 kg' };
    } else {
      return { name: 'High Impact', color: '#ef4444', threshold: '> 7 kg' };
    }
  };

  const currentBadge = badge || getBadgeInfo(totalCO2);

  return (
    <div className="emission-preview">
      <div className="preview-header">
        <h3>Emission Preview</h3>
        <p className="preview-subtitle">Real-time carbon footprint calculation</p>
      </div>

      <div className="total-emission">
        <div className="total-label">Total CO2 Emissions</div>
        <div className="total-value">{totalCO2.toFixed(2)} <span className="unit">kg CO2</span></div>
      </div>

      {totalCO2 > 0 && (
        <div className="badge-preview" style={{ borderColor: currentBadge.color }}>
          <div className="badge-icon" style={{ backgroundColor: currentBadge.color }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2l2.5 5 5.5.75-4 3.75 1 5.5L10 14.5 5 17l1-5.5-4-3.75 5.5-.75L10 2z" fill="white" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="badge-info">
            <div className="badge-name">{currentBadge.name}</div>
            <div className="badge-threshold">{currentBadge.threshold}</div>
          </div>
        </div>
      )}

      <div className="breakdown-section">
        <h4>Emission Breakdown</h4>
        <div className="breakdown-list">
          {categories.map(category => (
            <div key={category.key} className="breakdown-item">
              <div className="breakdown-label">{category.label}</div>
              <div className="breakdown-bar-container">
                <div
                  className="breakdown-bar"
                  style={{
                    width: totalCO2 > 0 ? `${(category.value / totalCO2) * 100}%` : '0%'
                  }}
                />
              </div>
              <div className="breakdown-value">
                {category.value.toFixed(2)} <span className="unit">kg</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="preview-footer">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 14.667A6.667 6.667 0 1 0 8 1.333a6.667 6.667 0 0 0 0 13.334zM8 5.333V8M8 10.667h.007" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Values update as you enter data</span>
      </div>
    </div>
  );
}
