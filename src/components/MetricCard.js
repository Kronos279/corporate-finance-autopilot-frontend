import './MetricCard.css';

export default function MetricCard({ label, value, delta, deltaType, style }) {
  return (
    <div className="metric-card fade-up" style={style}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value ?? '—'}</div>
      {delta != null && (
        <span className={`metric-delta ${deltaType === 'positive' ? 'positive' : deltaType === 'negative' ? 'negative' : ''}`}>
          {deltaType === 'positive' ? '▲' : '▼'} {delta}
        </span>
      )}
    </div>
  );
}
