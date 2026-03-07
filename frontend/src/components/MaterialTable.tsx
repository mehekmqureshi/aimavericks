/**
 * MaterialTable Component
 * 
 * Dynamic multi-row table for raw materials entry with add/remove functionality.
 * Validates that material percentages sum to 100%.
 * 
 * Requirements: 3.1.1-3.1.9
 */

import type { Material_Row } from '../../../shared/types';
import './MaterialTable.css';

interface MaterialTableProps {
  materials: Material_Row[];
  onChange: (materials: Material_Row[]) => void;
  error?: string;
}

const COMMON_MATERIALS = [
  'Organic Cotton',
  'Conventional Cotton',
  'Polyester',
  'Recycled Polyester',
  'Nylon',
  'Wool',
  'Silk',
  'Linen',
  'Elastane',
  'Viscose',
  'Custom'
];

export default function MaterialTable({ materials, onChange, error }: MaterialTableProps) {
  const handleAdd = () => {
    const newMaterial: Material_Row = {
      name: '',
      percentage: 0,
      weight: 0,
      emissionFactor: 0,
      countryOfOrigin: '',
      recycled: false,
      certification: '',
      calculatedEmission: 0
    };
    onChange([...materials, newMaterial]);
  };

  const handleRemove = (index: number) => {
    const updated = materials.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleChange = (index: number, field: keyof Material_Row, value: any) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate emission if weight or emissionFactor changes
    if (field === 'weight' || field === 'emissionFactor') {
      updated[index].calculatedEmission = updated[index].weight * updated[index].emissionFactor;
    }

    onChange(updated);
  };

  const totalPercentage = materials.reduce((sum, m) => sum + (m.percentage || 0), 0);

  return (
    <div className="material-table-container">
      <h2>Raw Materials</h2>
      <p className="section-description">
        Add all materials used in the product. Percentages must sum to 100%.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div className="percentage-indicator">
        <span>Total Percentage: </span>
        <span className={`percentage-value ${Math.abs(totalPercentage - 100) < 0.01 ? 'valid' : 'invalid'}`}>
          {totalPercentage.toFixed(2)}%
        </span>
        <span> / 100%</span>
      </div>

      <div className="table-wrapper">
        <table className="material-table">
          <thead>
            <tr>
              <th>Material Name *</th>
              <th>% *</th>
              <th>Weight (kg) *</th>
              <th>Emission Factor (kgCO2/kg) *</th>
              <th>Origin *</th>
              <th>Type *</th>
              <th>Certification</th>
              <th>Calculated Emission</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-state">
                  No materials added yet. Click "Add Material" to get started.
                </td>
              </tr>
            ) : (
              materials.map((material, index) => (
                <tr key={index}>
                  <td>
                    <select
                      value={material.name}
                      onChange={(e) => handleChange(index, 'name', e.target.value)}
                      className="material-select"
                      required
                    >
                      <option value="">Select material</option>
                      {COMMON_MATERIALS.map(mat => (
                        <option key={mat} value={mat}>{mat}</option>
                      ))}
                    </select>
                    {material.name === 'Custom' && (
                      <input
                        type="text"
                        placeholder="Enter custom material"
                        onChange={(e) => handleChange(index, 'name', e.target.value)}
                        className="custom-input"
                        required
                      />
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="100"
                      required
                      value={material.percentage || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        handleChange(index, 'percentage', isNaN(value) ? 0 : value);
                      }}
                      className="number-input"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      required
                      value={material.weight || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        handleChange(index, 'weight', isNaN(value) ? 0 : value);
                      }}
                      className="number-input"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={material.emissionFactor || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        handleChange(index, 'emissionFactor', isNaN(value) ? 0 : value);
                      }}
                      className="number-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={material.countryOfOrigin || ''}
                      onChange={(e) => handleChange(index, 'countryOfOrigin', e.target.value)}
                      placeholder="e.g., India"
                      className="text-input"
                      required
                    />
                  </td>
                  <td>
                    <div className="type-toggle">
                      <button
                        type="button"
                        className={`type-btn ${material.recycled === true ? 'active' : ''}`}
                        onClick={() => handleChange(index, 'recycled', true)}
                      >
                        Recycled
                      </button>
                      <button
                        type="button"
                        className={`type-btn ${material.recycled === false ? 'active' : ''}`}
                        onClick={() => handleChange(index, 'recycled', false)}
                      >
                        Virgin
                      </button>
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={material.certification || ''}
                      onChange={(e) => handleChange(index, 'certification', e.target.value)}
                      placeholder="e.g., GOTS"
                      className="text-input"
                    />
                  </td>
                  <td className="calculated-emission">
                    {material.calculatedEmission.toFixed(3)} kgCO2
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="delete-btn"
                      title="Remove material"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="add-material-btn"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3.333v9.334M3.333 8h9.334" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Add Material
      </button>
    </div>
  );
}
