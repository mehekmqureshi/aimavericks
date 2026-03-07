/**
 * Lifecycle_Form Component
 * 
 * Multi-step form for structured lifecycle data entry with six sections:
 * 1. Raw Materials
 * 2. Manufacturing
 * 3. Packaging
 * 4. Transport
 * 5. Usage Phase
 * 6. End of Life
 * 
 * Requirements: 3.1-3.6, 7.1-7.3, 24.6-24.11
 */

import { useState } from 'react';
import type {
  LifecycleData,
  Manufacturing_Data,
  Packaging_Data,
  Transport_Data,
  Usage_Data,
  EndOfLife_Data,
  CarbonFootprintResult
} from '../../../shared/types';
import ProgressIndicator from './ProgressIndicator';
import MaterialTable from './MaterialTable';
import Emission_Preview from './Emission_Preview';
import LoadingSpinner from './LoadingSpinner';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import './Lifecycle_Form.css';

interface Lifecycle_FormProps {
  onSubmit: (data: LifecycleData) => Promise<void>;
  onSaveDraft: (data: Partial<LifecycleData>) => Promise<void>;
  initialData?: Partial<LifecycleData>;
}

const STEPS = [
  'Raw Materials',
  'Manufacturing',
  'Packaging',
  'Transport',
  'Usage Phase',
  'End of Life'
];

export default function Lifecycle_Form({ onSubmit, onSaveDraft, initialData }: Lifecycle_FormProps) {
  const { isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<LifecycleData>>(initialData || {
    materials: [],
    manufacturing: {} as Manufacturing_Data,
    packaging: {} as Packaging_Data,
    transport: {} as Transport_Data,
    usage: {} as Usage_Data,
    endOfLife: {} as EndOfLife_Data
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carbonBreakdown, setCarbonBreakdown] = useState<CarbonFootprintResult['breakdown']>({
    materials: 0,
    manufacturing: 0,
    packaging: 0,
    transport: 0,
    usage: 0,
    disposal: 0
  });
  
  const { toasts, removeToast, success, error: showError } = useToast();

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSaveDraft = async () => {
    if (!isAuthenticated) {
      showError('⚠️ You must be logged in to save drafts. Please log in first.');
      // Optionally redirect to login after a delay
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSaveDraft(formData);
      success('✅ Draft saved successfully!');
    } catch (error: any) {
      console.error('Failed to save draft:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response,
        request: error?.request,
        code: error?.code
      });
      
      let errorMsg = 'Failed to save draft. Please try again.';
      
      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
        errorMsg = '❌ Network error: Unable to connect to the server. Please check your internet connection and ensure you are logged in.';
      } else if (error?.response?.status === 401) {
        errorMsg = '🔒 Authentication required. Please log in again to save drafts.';
        // Trigger logout event
        window.dispatchEvent(new CustomEvent('auth:logout'));
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else if (error?.response?.status === 403) {
        errorMsg = '⛔ Access denied. You do not have permission to save drafts.';
      } else if (error?.response?.data?.error?.message) {
        errorMsg = '❌ ' + error.response.data.error.message;
      } else if (error?.message) {
        errorMsg = '❌ ' + error.message;
      }
      
      showError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    console.log('Submit button clicked');
    console.log('Form data:', formData);
    console.log('Is authenticated:', isAuthenticated);
    
    if (!isAuthenticated) {
      showError('⚠️ You must be logged in to create products. Please log in first.');
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
      return;
    }
    
    if (!validateAllSteps()) {
      console.error('Validation failed');
      showError('Please complete all required fields before submitting.');
      return;
    }

    console.log('Validation passed, submitting...');
    setIsSubmitting(true);
    try {
      await onSubmit(formData as LifecycleData);
      success('✅ Product created successfully!');
    } catch (error: any) {
      console.error('Failed to submit form:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data
      });
      
      let errorMsg = 'Failed to submit form. Please try again.';
      
      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
        errorMsg = '❌ Network error: Unable to connect to the server. Please check your internet connection.';
      } else if (error?.response?.status === 401) {
        errorMsg = '🔒 Authentication required. Please log in to create products.';
      } else if (error?.response?.data?.error?.message) {
        errorMsg = '❌ ' + error.response.data.error.message;
      } else if (error?.message) {
        errorMsg = '❌ ' + error.message;
      }
      
      showError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};

    switch (currentStep) {
      case 0: // Raw Materials
        if (!formData.materials || formData.materials.length === 0) {
          errors.materials = 'At least one material is required';
        } else {
          const totalPercentage = formData.materials.reduce((sum, m) => sum + m.percentage, 0);
          if (Math.abs(totalPercentage - 100) > 0.01) {
            errors.materials = `Material percentages must sum to 100% (current: ${totalPercentage.toFixed(2)}%)`;
          }
        }
        break;

      case 1: // Manufacturing
        if (!formData.manufacturing?.factoryLocation) {
          errors.factoryLocation = 'Factory location is required';
        }
        if (!formData.manufacturing?.energyConsumption || formData.manufacturing.energyConsumption <= 0) {
          errors.energyConsumption = 'Energy consumption must be greater than 0';
        }
        break;

      case 2: // Packaging
        if (!formData.packaging?.weight || formData.packaging.weight <= 0) {
          errors.packagingWeight = 'Packaging weight must be greater than 0';
        }
        break;

      case 3: // Transport
        if (!formData.transport?.distance || formData.transport.distance <= 0) {
          errors.distance = 'Distance must be greater than 0';
        }
        break;

      case 4: // Usage Phase
        if (!formData.usage?.avgWashCycles || formData.usage.avgWashCycles <= 0) {
          errors.avgWashCycles = 'Average wash cycles must be greater than 0';
        }
        break;

      case 5: // End of Life
        if (formData.endOfLife?.disposalEmission === undefined || formData.endOfLife.disposalEmission < 0) {
          errors.disposalEmission = 'Disposal emission must be 0 or greater';
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAllSteps = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    // Validate Raw Materials
    if (!formData.materials || formData.materials.length === 0) {
      errors.materials = 'At least one material is required';
      isValid = false;
    } else {
      // Check for NaN values in materials
      const hasInvalidMaterial = formData.materials.some(m => 
        isNaN(m.weight) || isNaN(m.percentage) || isNaN(m.emissionFactor) ||
        m.weight <= 0 || m.percentage <= 0 || m.emissionFactor < 0
      );
      if (hasInvalidMaterial) {
        errors.materials = 'All material fields must have valid numeric values greater than 0';
        isValid = false;
      } else {
        const totalPercentage = formData.materials.reduce((sum, m) => sum + m.percentage, 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
          errors.materials = `Material percentages must sum to 100% (current: ${totalPercentage.toFixed(2)}%)`;
          isValid = false;
        }
      }
    }

    // Validate Manufacturing
    if (!formData.manufacturing?.factoryLocation) {
      errors.factoryLocation = 'Factory location is required';
      isValid = false;
    }
    if (!formData.manufacturing?.energyConsumption || isNaN(formData.manufacturing.energyConsumption) || formData.manufacturing.energyConsumption <= 0) {
      errors.energyConsumption = 'Energy consumption must be a valid number greater than 0';
      isValid = false;
    }
    if (!formData.manufacturing?.energyEmissionFactor || isNaN(formData.manufacturing.energyEmissionFactor) || formData.manufacturing.energyEmissionFactor < 0) {
      errors.energyEmissionFactor = 'Energy emission factor is required and must be a valid number';
      isValid = false;
    }

    // Validate Packaging
    if (!formData.packaging?.materialType) {
      errors.packagingMaterialType = 'Packaging material type is required';
      isValid = false;
    }
    if (!formData.packaging?.weight || isNaN(formData.packaging.weight) || formData.packaging.weight <= 0) {
      errors.packagingWeight = 'Packaging weight must be a valid number greater than 0';
      isValid = false;
    }
    if (!formData.packaging?.emissionFactor || isNaN(formData.packaging.emissionFactor) || formData.packaging.emissionFactor < 0) {
      errors.packagingEmissionFactor = 'Packaging emission factor is required and must be a valid number';
      isValid = false;
    }

    // Validate Transport
    if (!formData.transport?.mode) {
      errors.transportMode = 'Transport mode is required';
      isValid = false;
    }
    if (!formData.transport?.distance || isNaN(formData.transport.distance) || formData.transport.distance <= 0) {
      errors.distance = 'Distance must be a valid number greater than 0';
      isValid = false;
    }
    if (!formData.transport?.fuelType) {
      errors.fuelType = 'Fuel type is required';
      isValid = false;
    }
    if (!formData.transport?.emissionFactorPerKm || isNaN(formData.transport.emissionFactorPerKm) || formData.transport.emissionFactorPerKm < 0) {
      errors.emissionFactorPerKm = 'Emission factor per km is required and must be a valid number';
      isValid = false;
    }

    // Validate Usage Phase
    if (!formData.usage?.avgWashCycles || isNaN(formData.usage.avgWashCycles) || formData.usage.avgWashCycles <= 0) {
      errors.avgWashCycles = 'Average wash cycles must be a valid number greater than 0';
      isValid = false;
    }
    if (!formData.usage?.washTemperature || isNaN(formData.usage.washTemperature) || formData.usage.washTemperature <= 0) {
      errors.washTemperature = 'Wash temperature must be a valid number greater than 0';
      isValid = false;
    }

    // Validate End of Life
    if (formData.endOfLife?.disposalEmission === undefined || isNaN(formData.endOfLife.disposalEmission) || formData.endOfLife.disposalEmission < 0) {
      errors.disposalEmission = 'Disposal emission must be a valid number (0 or greater)';
      isValid = false;
    }

    if (!isValid) {
      setValidationErrors(errors);
      // Find first step with error and navigate to it
      if (errors.materials) setCurrentStep(0);
      else if (errors.factoryLocation || errors.energyConsumption || errors.energyEmissionFactor) setCurrentStep(1);
      else if (errors.packagingWeight || errors.packagingMaterialType || errors.packagingEmissionFactor) setCurrentStep(2);
      else if (errors.distance || errors.transportMode || errors.fuelType || errors.emissionFactorPerKm) setCurrentStep(3);
      else if (errors.avgWashCycles || errors.washTemperature) setCurrentStep(4);
      else if (errors.disposalEmission) setCurrentStep(5);
    }

    return isValid;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <MaterialTable
            materials={formData.materials || []}
            onChange={(materials) => {
              setFormData({ ...formData, materials });
              updateCarbonBreakdown({ ...formData, materials });
            }}
            error={validationErrors.materials}
          />
        );

      case 1:
        return renderManufacturingSection();

      case 2:
        return renderPackagingSection();

      case 3:
        return renderTransportSection();

      case 4:
        return renderUsageSection();

      case 5:
        return renderEndOfLifeSection();

      default:
        return null;
    }
  };

  const renderManufacturingSection = () => (
    <div className="form-section">
      <h2>Manufacturing Details</h2>
      <div className="form-grid">
        <div className="form-field">
          <label>Factory Location *</label>
          <input
            type="text"
            value={formData.manufacturing?.factoryLocation || ''}
            onChange={(e) => {
              const manufacturing = { ...formData.manufacturing, factoryLocation: e.target.value } as Manufacturing_Data;
              setFormData({ ...formData, manufacturing });
            }}
            placeholder="e.g., Bangladesh"
          />
          {validationErrors.factoryLocation && <span className="error">{validationErrors.factoryLocation}</span>}
        </div>

        <div className="form-field">
          <label>Energy Consumption (kWh per piece) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={formData.manufacturing?.energyConsumption || ''}
            onChange={(e) => {
              const value = e.target.value === '' ? NaN : parseFloat(e.target.value);
              const manufacturing = { ...formData.manufacturing, energyConsumption: value } as Manufacturing_Data;
              setFormData({ ...formData, manufacturing });
              if (!isNaN(value)) {
                updateCarbonBreakdown({ ...formData, manufacturing });
              }
            }}
            placeholder="e.g., 2.5"
          />
          {validationErrors.energyConsumption && <span className="error">{validationErrors.energyConsumption}</span>}
        </div>

        <div className="form-field">
          <label>Energy Emission Factor (kgCO2/kWh) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={formData.manufacturing?.energyEmissionFactor || ''}
            onChange={(e) => {
              const value = e.target.value === '' ? NaN : parseFloat(e.target.value);
              const manufacturing = { ...formData.manufacturing, energyEmissionFactor: value } as Manufacturing_Data;
              setFormData({ ...formData, manufacturing });
              if (!isNaN(value)) {
                updateCarbonBreakdown({ ...formData, manufacturing });
              }
            }}
            placeholder="e.g., 0.8"
          />
          {validationErrors.energyEmissionFactor && <span className="error">{validationErrors.energyEmissionFactor}</span>}
        </div>

        <div className="form-field">
          <label>Dyeing Method</label>
          <select
            value={formData.manufacturing?.dyeingMethod || ''}
            onChange={(e) => {
              const manufacturing = { ...formData.manufacturing, dyeingMethod: e.target.value } as Manufacturing_Data;
              setFormData({ ...formData, manufacturing });
            }}
          >
            <option value="">Select method</option>
            <option value="Natural Dyes">Natural Dyes</option>
            <option value="Synthetic Dyes">Synthetic Dyes</option>
            <option value="Low-Impact Dyes">Low-Impact Dyes</option>
            <option value="No Dyeing">No Dyeing</option>
          </select>
        </div>

        <div className="form-field">
          <label>Water Consumption (litres)</label>
          <input
            type="number"
            step="0.1"
            value={formData.manufacturing?.waterConsumption || ''}
            onChange={(e) => {
              const manufacturing = { ...formData.manufacturing, waterConsumption: parseFloat(e.target.value) } as Manufacturing_Data;
              setFormData({ ...formData, manufacturing });
            }}
            placeholder="e.g., 50"
          />
        </div>

        <div className="form-field">
          <label>Waste Generated (kg)</label>
          <input
            type="number"
            step="0.01"
            value={formData.manufacturing?.wasteGenerated || ''}
            onChange={(e) => {
              const manufacturing = { ...formData.manufacturing, wasteGenerated: parseFloat(e.target.value) } as Manufacturing_Data;
              setFormData({ ...formData, manufacturing });
            }}
            placeholder="e.g., 0.02"
          />
        </div>
      </div>
    </div>
  );

  const renderPackagingSection = () => (
    <div className="form-section">
      <h2>Packaging Details</h2>
      <div className="form-grid">
        <div className="form-field">
          <label>Material Type *</label>
          <select
            value={formData.packaging?.materialType || ''}
            required
            onChange={(e) => {
              const packaging = { ...formData.packaging, materialType: e.target.value } as Packaging_Data;
              setFormData({ ...formData, packaging });
            }}
          >
            <option value="">Select material</option>
            <option value="Recycled Cardboard">Recycled Cardboard</option>
            <option value="Virgin Cardboard">Virgin Cardboard</option>
            <option value="Plastic">Plastic</option>
            <option value="Biodegradable Plastic">Biodegradable Plastic</option>
            <option value="Paper">Paper</option>
          </select>
          {validationErrors.packagingMaterialType && <span className="error">{validationErrors.packagingMaterialType}</span>}
        </div>

        <div className="form-field">
          <label>Weight (kg) *</label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            required
            value={formData.packaging?.weight || ''}
            onChange={(e) => {
              const value = e.target.value === '' ? NaN : parseFloat(e.target.value);
              const packaging = { ...formData.packaging, weight: value } as Packaging_Data;
              setFormData({ ...formData, packaging });
              if (!isNaN(value)) {
                updateCarbonBreakdown({ ...formData, packaging });
              }
            }}
            placeholder="e.g., 0.05"
          />
          {validationErrors.packagingWeight && <span className="error">{validationErrors.packagingWeight}</span>}
        </div>

        <div className="form-field">
          <label>Emission Factor (kgCO2/kg) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={formData.packaging?.emissionFactor || ''}
            onChange={(e) => {
              const value = e.target.value === '' ? NaN : parseFloat(e.target.value);
              const packaging = { ...formData.packaging, emissionFactor: value } as Packaging_Data;
              setFormData({ ...formData, packaging });
              if (!isNaN(value)) {
                updateCarbonBreakdown({ ...formData, packaging });
              }
            }}
            placeholder="e.g., 0.9"
          />
          {validationErrors.packagingEmissionFactor && <span className="error">{validationErrors.packagingEmissionFactor}</span>}
        </div>

        <div className="form-field">
          <label>Recyclable</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${formData.packaging?.recyclable === true ? 'active' : ''}`}
              onClick={() => {
                const packaging = { ...formData.packaging, recyclable: true } as Packaging_Data;
                setFormData({ ...formData, packaging });
              }}
            >
              Yes
            </button>
            <button
              type="button"
              className={`toggle-btn ${formData.packaging?.recyclable === false ? 'active' : ''}`}
              onClick={() => {
                const packaging = { ...formData.packaging, recyclable: false } as Packaging_Data;
                setFormData({ ...formData, packaging });
              }}
            >
              No
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransportSection = () => (
    <div className="form-section">
      <h2>Transport Details</h2>
      <div className="form-grid">
        <div className="form-field">
          <label>Transport Mode *</label>
          <select
            value={formData.transport?.mode || ''}
            required
            onChange={(e) => {
              const transport = { ...formData.transport, mode: e.target.value as 'Road' | 'Air' | 'Ship' } as Transport_Data;
              setFormData({ ...formData, transport });
            }}
          >
            <option value="">Select mode</option>
            <option value="Road">Road</option>
            <option value="Air">Air</option>
            <option value="Ship">Ship</option>
          </select>
          {validationErrors.transportMode && <span className="error">{validationErrors.transportMode}</span>}
        </div>

        <div className="form-field">
          <label>Distance (km) *</label>
          <input
            type="number"
            step="1"
            min="1"
            required
            value={formData.transport?.distance || ''}
            onChange={(e) => {
              const value = e.target.value === '' ? NaN : parseFloat(e.target.value);
              const transport = { ...formData.transport, distance: value } as Transport_Data;
              setFormData({ ...formData, transport });
              if (!isNaN(value)) {
                updateCarbonBreakdown({ ...formData, transport });
              }
            }}
            placeholder="e.g., 8000"
          />
          {validationErrors.distance && <span className="error">{validationErrors.distance}</span>}
        </div>

        <div className="form-field">
          <label>Fuel Type *</label>
          <select
            value={formData.transport?.fuelType || ''}
            required
            onChange={(e) => {
              const transport = { ...formData.transport, fuelType: e.target.value } as Transport_Data;
              setFormData({ ...formData, transport });
            }}
          >
            <option value="">Select fuel type</option>
            <option value="Diesel">Diesel</option>
            <option value="Petrol">Petrol</option>
            <option value="Electric">Electric</option>
            <option value="Heavy Fuel Oil">Heavy Fuel Oil</option>
            <option value="Aviation Fuel">Aviation Fuel</option>
          </select>
          {validationErrors.fuelType && <span className="error">{validationErrors.fuelType}</span>}
        </div>

        <div className="form-field">
          <label>Emission Factor (kgCO2/km) *</label>
          <input
            type="number"
            step="0.001"
            min="0"
            required
            value={formData.transport?.emissionFactorPerKm || ''}
            onChange={(e) => {
              const value = e.target.value === '' ? NaN : parseFloat(e.target.value);
              const transport = { ...formData.transport, emissionFactorPerKm: value } as Transport_Data;
              setFormData({ ...formData, transport });
              if (!isNaN(value)) {
                updateCarbonBreakdown({ ...formData, transport });
              }
            }}
            placeholder="e.g., 0.015"
          />
          {validationErrors.emissionFactorPerKm && <span className="error">{validationErrors.emissionFactorPerKm}</span>}
        </div>
      </div>
    </div>
  );

  const renderUsageSection = () => (
    <div className="form-section">
      <h2>Usage Phase Details</h2>
      <div className="form-grid">
        <div className="form-field">
          <label>Average Wash Cycles *</label>
          <input
            type="number"
            step="1"
            min="1"
            required
            value={formData.usage?.avgWashCycles || ''}
            onChange={(e) => {
              const value = e.target.value === '' ? NaN : parseInt(e.target.value);
              const usage = { ...formData.usage, avgWashCycles: value } as Usage_Data;
              setFormData({ ...formData, usage });
              if (!isNaN(value)) {
                updateCarbonBreakdown({ ...formData, usage });
              }
            }}
            placeholder="e.g., 50"
          />
          {validationErrors.avgWashCycles && <span className="error">{validationErrors.avgWashCycles}</span>}
        </div>

        <div className="form-field">
          <label>Wash Temperature (°C) *</label>
          <input
            type="number"
            step="1"
            min="1"
            required
            value={formData.usage?.washTemperature || ''}
            onChange={(e) => {
              const value = e.target.value === '' ? NaN : parseInt(e.target.value);
              const usage = { ...formData.usage, washTemperature: value } as Usage_Data;
              setFormData({ ...formData, usage });
              if (!isNaN(value)) {
                updateCarbonBreakdown({ ...formData, usage });
              }
            }}
            placeholder="e.g., 30"
          />
          {validationErrors.washTemperature && <span className="error">{validationErrors.washTemperature}</span>}
        </div>

        <div className="form-field">
          <label>Dryer Use</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${formData.usage?.dryerUse === true ? 'active' : ''}`}
              onClick={() => {
                const usage = { ...formData.usage, dryerUse: true } as Usage_Data;
                setFormData({ ...formData, usage });
                updateCarbonBreakdown({ ...formData, usage });
              }}
            >
              Yes
            </button>
            <button
              type="button"
              className={`toggle-btn ${formData.usage?.dryerUse === false ? 'active' : ''}`}
              onClick={() => {
                const usage = { ...formData.usage, dryerUse: false } as Usage_Data;
                setFormData({ ...formData, usage });
                updateCarbonBreakdown({ ...formData, usage });
              }}
            >
              No
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEndOfLifeSection = () => (
    <div className="form-section">
      <h2>End of Life Details</h2>
      <div className="form-grid">
        <div className="form-field">
          <label>Recyclable</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${formData.endOfLife?.recyclable === true ? 'active' : ''}`}
              onClick={() => {
                const endOfLife = { ...formData.endOfLife, recyclable: true } as EndOfLife_Data;
                setFormData({ ...formData, endOfLife });
              }}
            >
              Yes
            </button>
            <button
              type="button"
              className={`toggle-btn ${formData.endOfLife?.recyclable === false ? 'active' : ''}`}
              onClick={() => {
                const endOfLife = { ...formData.endOfLife, recyclable: false } as EndOfLife_Data;
                setFormData({ ...formData, endOfLife });
              }}
            >
              No
            </button>
          </div>
        </div>

        <div className="form-field">
          <label>Biodegradable</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${formData.endOfLife?.biodegradable === true ? 'active' : ''}`}
              onClick={() => {
                const endOfLife = { ...formData.endOfLife, biodegradable: true } as EndOfLife_Data;
                setFormData({ ...formData, endOfLife });
              }}
            >
              Yes
            </button>
            <button
              type="button"
              className={`toggle-btn ${formData.endOfLife?.biodegradable === false ? 'active' : ''}`}
              onClick={() => {
                const endOfLife = { ...formData.endOfLife, biodegradable: false } as EndOfLife_Data;
                setFormData({ ...formData, endOfLife });
              }}
            >
              No
            </button>
          </div>
        </div>

        <div className="form-field">
          <label>Take-back Program</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${formData.endOfLife?.takebackProgram === true ? 'active' : ''}`}
              onClick={() => {
                const endOfLife = { ...formData.endOfLife, takebackProgram: true } as EndOfLife_Data;
                setFormData({ ...formData, endOfLife });
              }}
            >
              Yes
            </button>
            <button
              type="button"
              className={`toggle-btn ${formData.endOfLife?.takebackProgram === false ? 'active' : ''}`}
              onClick={() => {
                const endOfLife = { ...formData.endOfLife, takebackProgram: false } as EndOfLife_Data;
                setFormData({ ...formData, endOfLife });
              }}
            >
              No
            </button>
          </div>
        </div>

        <div className="form-field">
          <label>Disposal Emission (kgCO2) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={formData.endOfLife?.disposalEmission ?? ''}
            onChange={(e) => {
              const value = e.target.value === '' ? NaN : parseFloat(e.target.value);
              const endOfLife = { ...formData.endOfLife, disposalEmission: value } as EndOfLife_Data;
              setFormData({ ...formData, endOfLife });
              if (!isNaN(value)) {
                updateCarbonBreakdown({ ...formData, endOfLife });
              }
            }}
            placeholder="e.g., 0.5"
          />
          {validationErrors.disposalEmission && <span className="error">{validationErrors.disposalEmission}</span>}
        </div>
      </div>
    </div>
  );

  const updateCarbonBreakdown = (data: Partial<LifecycleData>) => {
    const breakdown = { ...carbonBreakdown };

    // Calculate materials emission
    if (data.materials) {
      breakdown.materials = data.materials.reduce((sum, m) => sum + (m.weight * m.emissionFactor), 0);
    }

    // Calculate manufacturing emission
    if (data.manufacturing?.energyConsumption && data.manufacturing?.energyEmissionFactor) {
      breakdown.manufacturing = data.manufacturing.energyConsumption * data.manufacturing.energyEmissionFactor;
    }

    // Calculate packaging emission
    if (data.packaging?.weight && data.packaging?.emissionFactor) {
      breakdown.packaging = data.packaging.weight * data.packaging.emissionFactor;
    }

    // Calculate transport emission
    if (data.transport?.distance && data.transport?.emissionFactorPerKm) {
      breakdown.transport = data.transport.distance * data.transport.emissionFactorPerKm;
    }

    // Calculate usage emission (simplified formula)
    if (data.usage?.avgWashCycles && data.usage?.washTemperature) {
      const baseEmission = data.usage.avgWashCycles * 0.3; // Base emission per wash
      const tempFactor = data.usage.washTemperature / 30; // Temperature factor
      const dryerFactor = data.usage.dryerUse ? 1.5 : 1; // Dryer adds 50%
      breakdown.usage = baseEmission * tempFactor * dryerFactor;
    }

    // Disposal emission
    if (data.endOfLife?.disposalEmission !== undefined) {
      breakdown.disposal = data.endOfLife.disposalEmission;
    }

    setCarbonBreakdown(breakdown);
  };

  const totalCO2 = Object.values(carbonBreakdown).reduce((sum, val) => sum + val, 0);

  return (
    <div className="lifecycle-form-container">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {isSubmitting && <LoadingSpinner fullScreen message="Processing..." />}
      
      <div className="lifecycle-form-main">
        {!isAuthenticated && (
          <div className="auth-warning-banner">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z" fill="currentColor"/>
            </svg>
            <span>⚠️ You are not logged in. Please log in to save drafts and submit products.</span>
          </div>
        )}
        
        <ProgressIndicator
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={[]}
        />

        <div className="form-content">
          {renderStepContent()}
        </div>

        <div className="form-navigation">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 0 || isSubmitting}
            className="btn-secondary"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Previous
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSubmitting || !isAuthenticated}
            className="btn-draft"
            title={!isAuthenticated ? 'Please log in to save drafts' : 'Save your progress as a draft'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12.667 14H3.333A1.333 1.333 0 0 1 2 12.667V3.333A1.333 1.333 0 0 1 3.333 2h6l4.334 4.333v6.334A1.333 1.333 0 0 1 12.667 14z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11.333 14v-5.333H4.667V14M4.667 2v4h5.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {isSubmitting ? 'Saving...' : !isAuthenticated ? 'Login Required' : 'Save Draft'}
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="btn-primary"
            >
              Next
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !isAuthenticated}
              className="btn-primary"
              title={!isAuthenticated ? 'Please log in to submit products' : 'Submit product'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.333 4L6 11.333 2.667 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isSubmitting ? 'Submitting...' : !isAuthenticated ? 'Login Required' : 'Submit'}
            </button>
          )}
        </div>
      </div>

      <Emission_Preview
        breakdown={carbonBreakdown}
        totalCO2={totalCO2}
      />
    </div>
  );
}
