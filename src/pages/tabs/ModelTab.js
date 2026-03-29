import { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { getScenarios, postForecast, postDCF } from '../../api';
import './ModelTab.css';

const SCENARIOS = ['base', 'upside', 'downside'];

const SLIDER_CONFIG = [
  { key: 'revenue_growth_rate',  label: 'Revenue Growth', min: -0.2, max: 0.5,  step: 0.005, fmt: (v) => `${(v*100).toFixed(1)}%` },
  { key: 'gross_margin',         label: 'Gross Margin',   min: 0.1,  max: 0.9,  step: 0.005, fmt: (v) => `${(v*100).toFixed(1)}%` },
  { key: 'opex_as_pct_revenue',  label: 'Opex %',         min: 0.05, max: 0.5,  step: 0.005, fmt: (v) => `${(v*100).toFixed(1)}%` },
  { key: 'capex_as_pct_revenue', label: 'Capex %',        min: 0.01, max: 0.3,  step: 0.005, fmt: (v) => `${(v*100).toFixed(1)}%` },
  { key: 'da_as_pct_revenue',    label: 'D&A %',          min: 0.01, max: 0.2,  step: 0.005, fmt: (v) => `${(v*100).toFixed(1)}%` },
  { key: 'tax_rate',             label: 'Tax Rate',       min: 0.0,  max: 0.4,  step: 0.005, fmt: (v) => `${(v*100).toFixed(1)}%` },
  { key: 'wacc',                 label: 'WACC',           min: 0.05, max: 0.25, step: 0.005, fmt: (v) => `${(v*100).toFixed(1)}%` },
  { key: 'terminal_growth_rate', label: 'Terminal Growth',min: 0.0,  max: 0.05, step: 0.001, fmt: (v) => `${(v*100).toFixed(2)}%` },
];

const FORECAST_ROWS = [
  { key: 'revenue',          label: 'Revenue' },
  { key: 'gross_profit',     label: 'Gross Profit' },
  { key: 'operating_income', label: 'Operating Income' },
  { key: 'ebitda',           label: 'EBITDA' },
  { key: 'net_income',       label: 'Net Income' },
  { key: 'free_cash_flow',   label: 'Free Cash Flow' },
];

function fmtB(n) {
  if (n == null) return '—';
  const abs = Math.abs(n), sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs/1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs/1e6).toFixed(1)}M`;
  return `${sign}$${abs.toFixed(0)}`;
}

function pct(v) { return v != null ? `${(v*100).toFixed(1)}%` : '—'; }

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

export default function ModelTab({ data, ticker }) {
  const [scenario,       setScenario]      = useState('base');
  const [assumptions,    setAssumptions]   = useState({});
  const [forecast,       setForecast]      = useState(null);
  const [allForecasts,   setAllForecasts]  = useState({});
  const [dcf,            setDcf]           = useState(null);
  // const [sensitivity,    setSensitivity]   = useState(null); // Removed: no longer used
  const [loading,        setLoading]       = useState(false);
  const scenariosRef = useRef(null);

  // Load scenarios on mount
 // Load scenarios on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await getScenarios(ticker);
        const arr = res.data;
        const dict = {};
        
        if (Array.isArray(arr)) {
          arr.forEach((s) => { 
            dict[s.scenario] = s; 
          });
        }
        
        scenariosRef.current = dict;

        // FIX: This fills the state so the chart has Upside/Downside data immediately
        setAllForecasts(dict); 
        
        const baseAssumptions = dict.base?.assumptions ?? {};
        setAssumptions(baseAssumptions);
      } catch (err) {
        console.error("Failed to load scenarios:", err);
      }
    })();
  }, [ticker]);

  // Switch scenario → load assumptions
  const handleScenarioChange = (s) => {
    setScenario(s);
    if (scenariosRef.current?.[s]?.assumptions) {
      setAssumptions({ ...scenariosRef.current[s].assumptions });
    }
  };

  const debouncedAssumptions = useDebounce(assumptions, 300);

  // Run forecast, DCF, sensitivity when assumptions settle
  useEffect(() => {
    if (!Object.keys(debouncedAssumptions).length) return;
    // Removed unused variables: wacc, rg, makeRange
    (async () => {
      setLoading(true);
      try {
        const [fRes, dcfRes] = await Promise.allSettled([
          postForecast(ticker,     { assumptions: debouncedAssumptions, years: 5 }),
          postDCF(ticker,          { assumptions: debouncedAssumptions, years: 5 })
        ]);

        if (fRes.status === 'fulfilled')   {
          const fData = fRes.value.data;
          const updated = { ...allForecasts, [scenario]: fData };
          setAllForecasts(updated);
          setForecast(fData);
        }
        if (dcfRes.status === 'fulfilled') setDcf(dcfRes.value.data?.dcf ?? dcfRes.value.data);
      } finally { setLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAssumptions, scenario]);

  // Forecast is an array of year objects: [{year, revenue, gross_profit, ...}]
  const forecastArr = forecast?.forecast ?? [];
  const years       = forecastArr.map((f) => f.year);

  // Build chart data: merge base / upside / downside revenue
  const baseArr = allForecasts.base?.forecast ?? forecastArr;
  const chartData = baseArr.map((f, i) => ({
    year:     f.year,
    base:     allForecasts.base?.forecast?.[i]?.revenue,
    upside:   allForecasts.upside?.forecast?.[i]?.revenue,
    downside: allForecasts.downside?.forecast?.[i]?.revenue,
  }));

  const handleSlider = (key, val) => setAssumptions((prev) => ({ ...prev, [key]: parseFloat(val) }));

  return (
    <div className="model-root">
      {/* Scenario + Sliders */}
      <div className="model-top">
        <div className="model-card sliders-card">
          <div className="model-card-title">Assumptions</div>
          <div className="scenario-btns">
            {SCENARIOS.map((s) => (
              <button key={s} className={`scenario-btn ${scenario === s ? 'active' : ''}`} onClick={() => handleScenarioChange(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="sliders-grid">
            {SLIDER_CONFIG.map(({ key, label, min, max, step, fmt }) => (
              <div key={key} className="slider-row">
                <div className="slider-meta">
                  <span className="slider-label">{label}</span>
                  <span className="slider-value">{fmt(assumptions[key] ?? min)}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={assumptions[key] ?? min}
                  onChange={(e) => handleSlider(key, e.target.value)}
                  className="slider"
                />
              </div>
            ))}
          </div>
        </div>

        {/* DCF Card */}
        <div className="model-card dcf-card">
          <div className="model-card-title">DCF Valuation</div>
          {dcf ? (
            <>
              {[
                { label: 'Enterprise Value',  value: fmtB(dcf.enterprise_value) },
                { label: 'Equity Value',      value: fmtB(dcf.equity_value) },
                { label: 'Current Price',     value: dcf.current_price ? `$${dcf.current_price.toFixed(2)}` : '—' },
                { label: 'Upside / Downside', value: pct(dcf.upside_pct), cls: dcf.upside_pct >= 0 ? 'positive' : 'negative' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="dcf-row">
                  <span className="dcf-label">{label}</span>
                  <span className={`dcf-value ${cls ?? ''}`}>{value}</span>
                </div>
              ))}
            </>
          ) : (
            <div className="mini-skeleton" />
          )}
        </div>
      </div>

      {/* Forecast Table */}
      <div className="model-card">
        <div className="model-card-title">5-Year Forecast {loading && <span className="loading-dot" />}</div>
        <div className="fin-table-wrap">
          <table className="fin-table">
            <thead>
              <tr>
                <th className="row-label"></th>
                {years.map((y) => <th key={y}>{y}</th>)}
              </tr>
            </thead>
            <tbody>
              {FORECAST_ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="row-label">{row.label}</td>
                  {forecastArr.map((f, i) => (
                    <td key={i} className="mono-cell">{fmtB(f[row.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scenario Chart */}
      {chartData.length > 0 && (
        <div className="model-card">
          <div className="model-card-title">Revenue Scenarios</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1e9).toFixed(0)}B`} width={50} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)' }} formatter={fmtB} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Line type="monotone" dataKey="upside"   stroke="var(--accent-success-text)" strokeWidth={2} dot={false} strokeDasharray="6 3" name="Upside" />
              <Line type="monotone" dataKey="base"     stroke="var(--accent-primary)"      strokeWidth={2} dot={false} name="Base" />
              <Line type="monotone" dataKey="downside" stroke="var(--accent-danger-text)"  strokeWidth={2} dot={false} strokeDasharray="6 3" name="Downside" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sensitivity Grid removed */}
    </div>
  );
}

