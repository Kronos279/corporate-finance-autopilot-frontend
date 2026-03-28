import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { SkeletonMetricGrid, SkeletonChart, SkeletonRow } from '../components/Skeleton';
import OverviewTab     from './tabs/OverviewTab';
import FinancialsTab   from './tabs/FinancialsTab';
import ModelTab        from './tabs/ModelTab';
import AdvisoryTab     from './tabs/AdvisoryTab';
import ReportsTab      from './tabs/ReportsTab';
import { getCompanyFull, ingestCompany } from '../api';
import './Dashboard.css';

const TABS = ['Overview', 'Financials', 'Model', 'Advisory', 'Reports'];

function fmt(n) {
  if (n == null) return '—';
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

export default function Dashboard({ onThemeToggle, theme }) {
  const { ticker } = useParams();
  const navigate   = useNavigate();

  const [activeTab, setActiveTab] = useState('Overview');
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);

    getCompanyFull(ticker)
      .then((r) => setData(r.data))
      .catch(() => setError(`Could not load data for "${ticker}".`))
      .finally(() => setLoading(false));

    // Background RAG ingest — fire and forget
    ingestCompany(ticker).catch(() => {});
  }, [ticker]);

  const profile   = data?.profile ?? {};
  const keyStats  = data?.key_stats ?? {};
  const priceHist = data?.price_history ?? [];

  const latestPrice = priceHist.length ? priceHist[priceHist.length - 1]?.close : null;
  const prevPrice   = priceHist.length > 1 ? priceHist[priceHist.length - 2]?.close : null;
  const priceDelta  = latestPrice && prevPrice ? ((latestPrice - prevPrice) / prevPrice * 100).toFixed(2) : null;

  if (error) {
    return (
      <div className="dashboard-root">
        <Navbar showBack onThemeToggle={onThemeToggle} theme={theme} />
        <div className="error-center">
          <div className="error-card">
            <div className="error-icon">⚠</div>
            <h2>Error</h2>
            <p>{error}</p>
            <p className="error-sub">Please check the ticker symbol and try again.</p>
            <button className="btn-primary" onClick={() => navigate('/')}>← Back to Search</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-root">
      <Navbar showBack onThemeToggle={onThemeToggle} theme={theme} />

      {/* Company Header */}
      <div className="dashboard-header">
        {loading ? (
          <div className="company-skeleton">
            <div className="skeleton" style={{ width: 64, height: 64, borderRadius: 14 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: 240, height: 24, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 180, height: 14 }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="skeleton" style={{ width: 120, height: 32, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 80, height: 20 }} />
            </div>
          </div>
        ) : (
          <div className="company-info">
            <div className="company-logo">
              {profile.logo_url
                ? <img src={profile.logo_url} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 14 }} />
                : <span style={{ fontSize: 24 }}>🏢</span>
              }
            </div>
            <div className="company-details">
              <h2>{profile.name ?? ticker} <span className="ticker-tag">({ticker})</span></h2>
              <div className="company-meta">
                {[profile.sector, profile.industry].filter(Boolean).join(' · ')}
                {profile.ceo && ` · CEO: ${profile.ceo}`}
                {profile.employees && ` · ${Number(profile.employees).toLocaleString()} employees`}
              </div>
            </div>
            <div className="price-info">
              <div className="current-price">{latestPrice ? `$${latestPrice.toFixed(2)}` : '—'}</div>
              {priceDelta != null && (
                <span className={`price-change ${Number(priceDelta) >= 0 ? 'positive' : 'negative'}`}>
                  {Number(priceDelta) >= 0 ? '▲' : '▼'} {Math.abs(priceDelta)}%
                </span>
              )}
              <div className="mktcap-line">{fmt(profile.market_cap)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t}
            className={`dash-tab ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {loading
          ? (<><SkeletonMetricGrid /><SkeletonChart /><SkeletonRow /></>)
          : (
            <>
              {activeTab === 'Overview'   && <OverviewTab   data={data} ticker={ticker} />}
              {activeTab === 'Financials' && <FinancialsTab data={data} />}
              {activeTab === 'Model'      && <ModelTab      data={data} ticker={ticker} />}
              {activeTab === 'Advisory'   && <AdvisoryTab   data={data} ticker={ticker} />}
              {activeTab === 'Reports'    && <ReportsTab    data={data} ticker={ticker} />}
            </>
          )
        }
      </div>
    </div>
  );
}
