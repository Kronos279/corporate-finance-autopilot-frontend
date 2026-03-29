import { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { getScenarios, postForecast, postDCF, postSensitivity } from '../../api';
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
  const [sensitivity,    setSensitivity]   = useState(null);
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
    const wacc = debouncedAssumptions.wacc ?? 0.10;
   // const tg   = debouncedAssumptions.terminal_growth_rate ?? 0.025;
    const rg   = debouncedAssumptions.revenue_growth_rate ?? 0.08;
    // Generate ranges around current values for sensitivity
    const makeRange = (center, spread, steps) => {
      const out = [];
      for (let i = 0; i < steps; i++) out.push(+(center - spread + (2 * spread * i / (steps - 1))).toFixed(4));
      return out;
    };
    (async () => {
      setLoading(true);
      try {
        const [fRes, dcfRes, senRes] = await Promise.allSettled([
          postForecast(ticker,     { assumptions: debouncedAssumptions, years: 5 }),
          postDCF(ticker,          { assumptions: debouncedAssumptions, years: 5 }),
          postSensitivity(ticker,  {
            assumptions: debouncedAssumptions,
            param_x: 'revenue_growth_rate',
            param_y: 'wacc',
            range_x: makeRange(rg, 0.04, 5),
            range_y: makeRange(wacc, 0.03, 5),
          }),
        ]);

        if (fRes.status === 'fulfilled')   {
          const fData = fRes.value.data;
          const updated = { ...allForecasts, [scenario]: fData };
          setAllForecasts(updated);
          setForecast(fData);
        }
        if (dcfRes.status === 'fulfilled') setDcf(dcfRes.value.data?.dcf ?? dcfRes.value.data);
        if (senRes.status === 'fulfilled') setSensitivity(senRes.value.data?.result ?? senRes.value.data);
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
                { label: 'Implied Price',     value: dcf.implied_price ? `$${dcf.implied_price.toFixed(2)}` : '—' },
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

      {/* Sensitivity Grid */}
      {sensitivity && (
        <div className="model-card">
          <div className="model-card-title">Sensitivity Analysis — Implied Price</div>
          <SensitivityGrid data={sensitivity} currentPrice={dcf?.current_price} />
        </div>
      )}
    </div>
  );
}

function SensitivityGrid({ data, currentPrice }) {
  // Backend returns: {param_x_name, param_y_name, output_name, cells: [{param_x_value, param_y_value, output_value}]}
  const cells = data?.cells ?? [];
  if (!cells.length) return null;

  // Extract unique x and y values
  const xVals = [...new Set(cells.map((c) => c.param_x_value))].sort((a, b) => a - b);
  const yVals = [...new Set(cells.map((c) => c.param_y_value))].sort((a, b) => a - b);
  const paramX = data?.param_x_name ?? 'Param X';
  const paramY = data?.param_y_name ?? 'Param Y';

  // Build grid lookup
  const lookup = {};
  cells.forEach((c) => { lookup[`${c.param_x_value}_${c.param_y_value}`] = c.output_value; });

  return (
    <div className="sen-wrap">
      <table className="sen-table">
        <thead>
          <tr>
            <th>{paramX} \ {paramY}</th>
            {yVals.map((y) => <th key={y}>{pct(y)}</th>)}
          </tr>
        </thead>
        <tbody>
          {xVals.map((x, i) => (
            <tr key={i}>
              <td>{pct(x)}</td>
              {yVals.map((y, j) => {
                const v = lookup[`${x}_${y}`];
                const above = currentPrice && v >= currentPrice;
                return (
                  <td key={j} className={`sen-cell ${above ? 'green' : 'red'}`}>
                    ${v != null ? v.toFixed(0) : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
