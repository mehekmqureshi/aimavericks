/**
 * ProgressIndicator Component
 * 
 * Horizontal progress indicator showing current step and completion status
 * for the multi-step lifecycle form.
 * 
 * Requirements: 3.2, 24.6-24.7
 */

import './ProgressIndicator.css';

interface ProgressIndicatorProps {
  steps: string[];
  currentStep: number;
  completedSteps: number[];
}

export default function ProgressIndicator({ steps, currentStep, completedSteps }: ProgressIndicatorProps) {
  return (
    <div className="progress-indicator">
      {steps.map((step, index) => (
        <div key={index} className="progress-step-wrapper">
          <div className={`progress-step ${index === currentStep ? 'active' : ''} ${completedSteps.includes(index) ? 'completed' : ''}`}>
            <div className="step-number">
              {completedSteps.includes(index) ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <div className="step-label">{step}</div>
          </div>
          {index < steps.length - 1 && (
            <div className={`progress-line ${completedSteps.includes(index) ? 'completed' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}
