import { useAuth } from '../context/AuthContext';
import { ManufacturerProfile } from '../components';

export default function Settings() {
  const { manufacturerId } = useAuth();

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#1e3c72', marginBottom: '24px' }}>
        Settings
      </h1>
      
      {manufacturerId ? (
        <ManufacturerProfile manufacturerId={manufacturerId} />
      ) : (
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}>
          <p style={{ color: '#666', fontSize: '16px' }}>
            Please log in to view and edit your manufacturer profile.
          </p>
        </div>
      )}
    </div>
  );
}
