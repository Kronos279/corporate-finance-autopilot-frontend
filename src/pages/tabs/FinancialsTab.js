import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import './FinancialsTab.css';

const TABS = ['Income Statement', 'Balance Sheet', 'Cash Flow'];

function fmt(n) {
  if (n == null) return '—';
  const sign = n < 0 ? '-' : '';
  const abs  = Math.abs(n);
  if (abs >= 1e9)  return `${sign}$${(abs/1e9).toFixed(1)}B`;
  if (abs >= 1e6)  return `${sign}$${(abs/1e6).toFixed(1)}M`;
  return `${sign}$${Number(abs).toLocaleString()}`;
}

function pct(n) { return n != null ? `${(n*100).toFixed(1)}%` : '—'; }

const INCOME_ROWS = [
  { key: 'revenue',           label: 'Revenue',              separator: false },
  { key: 'gross_profit',      label: 'Gross Profit',         separator: false, percent: 'gross_margin' },
  { key: 'ebitda',            label: 'EBITDA',               separator: false },
  { key: 'operating_income',  label: 'Operating Income',     separator: false, percent: 'operating_margin' },
  { key: 'net_income',        label: 'Net Income',           separator: true,  percent: 'net_margin' },
  { key: 'eps',               label: 'EPS (diluted)',        separator: false, fmt: (v) => v != null ? `$${v.toFixed(2)}` : '—' },
];

const BALANCE_ROWS = [
  { key: 'cash_and_equivalents',   label: 'Cash & Equivalents',     separator: false },
  { key: 'current_assets',         label: 'Total Current Assets',   separator: false },
  { key: 'total_assets',           label: 'Total Assets',           separator: true  },
  { key: 'current_liabilities',    label: 'Current Liabilities',    separator: false },
  { key: 'total_debt',             label: 'Total Debt',             separator: false },
  { key: 'total_liabilities',      label: 'Total Liabilities',      separator: true  },
  { key: 'total_equity',           label: 'Shareholders Equity',    separator: false },
  { key: 'net_debt',               label: 'Net Debt',               separator: false },
  { key: 'debt_to_equity',         label: 'Debt / Equity',          separator: false, fmt: (v) => v != null ? v.toFixed(2) + 'x' : '—' },
  { key: 'current_ratio',          label: 'Current Ratio',          separator: false, fmt: (v) => v != null ? v.toFixed(2) + 'x' : '—' },
];

const CF_ROWS = [
  { key: 'operating_cash_flow', label: 'Operating Cash Flow',  separator: false },
  { key: 'capex',               label: 'Capital Expenditure',  separator: false },
  { key: 'free_cash_flow',      label: 'Free Cash Flow',       separator: true  },
  { key: 'dividends_paid',      label: 'Dividends Paid',       separator: false },
  { key: 'share_buybacks',      label: 'Share Buybacks',       separator: false },
];

function FinancialTable({ rows, statements }) {
  const years = statements.slice(0, 5).map((s) => s.fiscal_year ?? s.year ?? '');
  return (
    <div className="fin-table-wrap">
      <table className="fin-table">
        <thead>
          <tr>
            <th className="row-label"></th>
            {years.map((y) => <th key={y}>{y}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={row.separator ? 'sep-row' : ''}>
              <td className="row-label">{row.label}</td>
              {statements.slice(0, 5).map((s, j) => {
                const rawVal = s[row.key];
                const displayed = row.fmt ? row.fmt(rawVal) : fmt(rawVal);
                const pctVal = row.percent ? s[row.percent] : null;
                const delta = pctVal != null ? (pctVal >= 0 ? 'positive' : 'negative') : null;
                return (
                  <td key={j} className="mono-cell">
                    {displayed}
                    {pctVal != null && (
                      <span className={`inline-pct ${delta}`}>
                        {pct(pctVal)}
                      </span>
                    )}
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

export default function FinancialsTab({ data }) {
  const [activeTab, setActiveTab] = useState(0);

  const income  = data?.financials?.income_statements  ?? [];
  const balance = data?.financials?.balance_sheets     ?? [];
  const cf      = data?.financials?.cash_flows          ?? [];

  const chartIncome = [...income].reverse();

  return (
    <div className="financials-root">
      {/* Sub-tab selector */}
      <div className="sub-tabs">
        {TABS.map((t, i) => (
          <button
            key={t}
            className={`sub-tab-btn ${activeTab === i ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tables */}
      {activeTab === 0 && income.length > 0 && <FinancialTable rows={INCOME_ROWS} statements={income} />}
      {activeTab === 1 && balance.length > 0 && <FinancialTable rows={BALANCE_ROWS} statements={balance} />}
      {activeTab === 2 && cf.length > 0 && <FinancialTable rows={CF_ROWS} statements={cf} />}

      {/* Charts — income only */}
      {activeTab === 0 && income.length > 0 && (
        <div className="chart-row">
          <div className="chart-card">
            <div className="sub-chart-title">Revenue vs. Net Income</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartIncome} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="fiscal_year" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1e9).toFixed(0)}B`} width={50} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                <Bar dataKey="revenue"    fill="var(--accent-primary)" radius={[4,4,0,0]} name="Revenue" />
                <Bar dataKey="net_income" fill="var(--accent-gold)"    radius={[4,4,0,0]} name="Net Income" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <div className="sub-chart-title">Margin Trends</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartIncome} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="fiscal_year" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v*100).toFixed(0)}%`} width={40} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)' }}
                  formatter={(v) => `${(v*100).toFixed(1)}%`} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                <Line type="monotone" dataKey="gross_margin"     stroke="var(--accent-primary)"       strokeWidth={2} dot={false} name="Gross" />
                <Line type="monotone" dataKey="ebitda_margin"    stroke="var(--accent-gold)"           strokeWidth={2} dot={false} name="EBITDA" />
                <Line type="monotone" dataKey="net_margin"       stroke="var(--accent-success-text)"   strokeWidth={2} dot={false} name="Net" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
