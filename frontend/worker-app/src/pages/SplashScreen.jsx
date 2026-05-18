export default function SplashScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--navy)',
      gap: '20px',
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: '16px',
        background: 'linear-gradient(135deg, var(--accent), #00A886)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
      }}>
        📍
      </div>
      <div className="spinner" style={{ color: 'var(--accent)', width: 28, height: 28 }} />
    </div>
  );
}
