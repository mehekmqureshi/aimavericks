export default function Auditor() {
  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#1e3c72', marginBottom: '24px' }}>
        Auditor
      </h1>
      <div style={{
        background: 'white',
        padding: '32px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Audit logs and history will be displayed here.
        </p>
      </div>
    </div>
  );
}
