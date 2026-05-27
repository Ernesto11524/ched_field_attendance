export default function SplashScreen() {
  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      gap: 20,
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: '20px',
        background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(245,166,35,0.35)',
      }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 21s-7-4.5-7-10.5a7 7 0 0114 0C19 16.5 12 21 12 21z"/>
          <circle cx="12" cy="10.5" r="2.5" fill="#000" stroke="none"/>
        </svg>
      </div>
      <div className="spinner" style={{ color: 'var(--accent)', width: 24, height: 24 }} />
    </div>
  );
}
