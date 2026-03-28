import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import MetricCard from '../../components/MetricCard';
import { getPriceHistory } from '../../api';
import './OverviewTab.css';

const PERIODS = ['1M','3M','6M','1Y','5Y'];

function fmt(n) {
  if (n == null) return '—';
  if (Math.abs(n) >= 1e12) return `$${(n/1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9)  return `$${(n/1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6)  return `$${(n/1e6).toFixed(2)}M`;
  return `$${Number(n).toLocaleString()}`;
}

function pct(v) {
  return v != null ? `${(v*100).toFixed(1)}%` : '—';
}

export default function OverviewTab({ data, ticker }) {
  const [period,       setPeriod]    = useState('1Y');
  const [priceData,    setPriceData] = useState(data?.price_history ?? []);
  const [loadingChart, setLoading]   = useState(false);
  const [expanded,     setExpanded]  = useState(false);

  const ks      = data?.key_stats      ?? {};
  const profile = data?.profile        ?? {};
  const macro   = data?.macro          ?? {};
  const income  = data?.financials?.income_statements?.[0] ?? {};

  const handlePeriod = async (p) => {
    setPeriod(p);
    setLoading(true);
    try {
      const r = await getPriceHistory(ticker, p);
      setPriceData(r.data);
    } finally {
      setLoading(false);
    }
  };

  const chartData = priceData.map((d) => ({
    date:   d.date,
    close:  d.close,
    volume: d.volume,
  }));

  const metrics = [
    { label: 'Market Cap',    value: fmt(profile.market_cap) },
    { label: 'P/E Ratio',     value: ks.pe_ratio ? `${ks.pe_ratio.toFixed(1)}x` : '—' },
    { label: 'EV/EBITDA',     value: ks.ev_to_ebitda ? `${ks.ev_to_ebitda.toFixed(1)}x` : '—' },
    { label: 'Beta',          value: ks.beta ? ks.beta.toFixed(2) : '—' },
    { label: 'Revenue',       value: fmt(income.revenue) },
    { label: 'Net Margin',    value: pct(income.net_margin) },
    { label: 'Dividend Yield',value: ks.dividend_yield ? pct(ks.dividend_yield) : '—' },
    { label: '52W Range',     value: ks.fifty_two_week_low && ks.fifty_two_week_high ? `$${ks.fifty_two_week_low.toFixed(0)}–$${ks.fifty_two_week_high.toFixed(0)}` : '—' },
  ];

  const description = profile.description ?? '';
  const descDisplay = expanded ? description : description.slice(0, 320) + (description.length > 320 ? '…' : '');

  return (
    <div className="overview-root">
      {/* Metric Cards */}
      <div className="metrics-grid">
        {metrics.map((m, i) => (
          <MetricCard key={i} {...m} style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>

      {/* Price Chart */}
      <div className="chart-card">
        <div className="chart-header">
          <span className="chart-title">Stock Price</span>
          <div className="period-selector">
            {PERIODS.map((p) => (
              <button
                key={p}
                className={`period-btn ${period === p ? 'active' : ''}`}
                onClick={() => handlePeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        {loadingChart
          ? <div className="skeleton" style={{ height: 280, borderRadius: 10 }} />
          : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--accent-primary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={55} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-secondary)', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="close" stroke="var(--accent-primary)" strokeWidth={2} fill="url(#priceGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )
        }

        {/* Volume bar */}
        <div style={{ marginTop: 8 }}>
          <ResponsiveContainer width="100%" height={48}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Bar dataKey="volume" fill="var(--text-tertiary)" opacity={0.4} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Cards */}
      <div className="bottom-cards">
        <div className="info-card">
          <div className="info-label">Company Description</div>
          <p className="info-text">{descDisplay}</p>
          {description.length > 320 && (
            <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        <div className="info-card">
          <div className="info-label">Macro Context</div>
          {[
            { label: '10Y Treasury',   value: macro.treasury_10y   != null ? `${(macro.treasury_10y * 100).toFixed(2)}%`   : '—' },
            { label: 'Fed Funds Rate', value: macro.fed_funds_rate != null ? `${(macro.fed_funds_rate * 100).toFixed(2)}%` : '—' },
            { label: 'GDP Growth',     value: macro.gdp_growth     != null ? `${(macro.gdp_growth * 100).toFixed(1)}%`     : '—' },
            { label: 'CPI Inflation',  value: macro.cpi_inflation  != null ? `${(macro.cpi_inflation * 100).toFixed(1)}%`  : '—' },
          ].map((item) => (
            <div key={item.label} className="macro-row">
              <span className="macro-label">{item.label}</span>
              <span className="macro-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
