import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './Landing.css';

const QUICK_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];

const FEATURES = [
  { icon: '📊', title: 'Real-Time Data', desc: 'Live data from SEC, Yahoo Finance & FRED macroeconomic feeds.' },
  { icon: '🤖', title: 'AI Agent Analysis', desc: 'Ask any question and get step-by-step traced answers.' },
  { icon: '📈', title: 'DCF & Models', desc: '3-case financial models with DCF valuation & sensitivity.' },
  { icon: '📄', title: 'Export Reports', desc: 'Generate PDF reports in 4 professional formats.' },
];

export default function Landing({ onThemeToggle, theme }) {
  const [ticker, setTicker] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (t) navigate(`/dashboard/${t}`);
  };

  const handlePill = (t) => {
    setTicker(t);
    navigate(`/dashboard/${t}`);
  };

  return (
    <div className="landing-root">
      <Navbar onThemeToggle={onThemeToggle} theme={theme} />

      <main className="landing-main">
        <div className="landing-hero">
          <h1 className="landing-title">
            Corporate Finance<br />
            <span>Autopilot</span>
          </h1>
          <p className="landing-subtitle">
            AI-powered investment analysis in seconds, not weeks.
          </p>

          <form className="search-box" onSubmit={handleSubmit}>
            <input
              className="search-input"
              type="text"
              placeholder="🔍 Enter ticker symbol…"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              autoFocus
            />
            <button type="submit" className="search-btn">Analyze</button>
          </form>

          <div className="quick-tickers">
            <span className="quick-label">Try:</span>
            {QUICK_TICKERS.map((t) => (
              <button key={t} className="ticker-pill" onClick={() => handlePill(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="feature-cards">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
