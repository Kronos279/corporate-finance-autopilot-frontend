import './Skeleton.css';

export function SkeletonBlock({ width = '100%', height = 20, style }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

export function SkeletonMetricGrid() {
  return (
    <div className="skeleton-metrics-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="skeleton-metric-card skeleton" />
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return <div className="skeleton-chart skeleton" />;
}

export function SkeletonRow() {
  return (
    <div className="skeleton-bottom-row">
      <div className="skeleton" style={{ flex: 1, height: 120 }} />
      <div className="skeleton" style={{ flex: 1, height: 120 }} />
    </div>
  );
}
