/**
 * ToastContainer Component
 * 
 * Container for managing multiple toast notifications
 */

import Toast from './Toast';
import type { ToastMessage } from '../hooks/useToast';
import './ToastContainer.css';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="toast-container">
      {toasts.map((toast, index) => (
        <div key={toast.id} style={{ '--index': index } as React.CSSProperties}>
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
