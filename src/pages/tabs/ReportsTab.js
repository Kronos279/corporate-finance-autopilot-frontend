import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { postGenerateReport, getDownloadReportUrl } from '../../api';
import './ReportsTab.css';

const REPORT_TYPES = [
  {
    id:          'information_memorandum',
    title:       'Information Memorandum',
    description: 'Comprehensive company overview for potential investors, including financials, strategy, and risks.',
    icon:        '📋',
  },
  {
    id:          'shareholder_report',
    title:       'Shareholder Report',
    description: 'Periodic update for existing shareholders covering performance, outlook, and key metrics.',
    icon:        '📊',
  },
  {
    id:          'equity_research_note',
    title:       'Equity Research Note',
    description: 'Analyst-style initiation or update note with price target, valuation, and investment thesis.',
    icon:        '🔍',
  },
  {
    id:          'corporate_presentation',
    title:       'Investor Presentation',
    description: 'Slide-style presentation deck covering business model, financials, and growth strategy.',
    icon:        '📑',
  },
];

export default function ReportsTab({ data, ticker }) {
  const [selected,   setSelected]  = useState(null);
  const [generating, setGenerating] = useState(false);
  const [preview,    setPreview]    = useState(null);
  const [error,      setError]      = useState('');

  const handleGenerate = async () => {
    if (!selected) return;
    setGenerating(true);
    setPreview(null);
    setError('');
    try {
      const res = await postGenerateReport(ticker, selected);
      setPreview(res.data);
    } catch (e) {
      setError(e?.response?.data?.detail ?? 'Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    const url = getDownloadReportUrl(ticker);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = `${ticker}_${selected}_report.pdf`;
    a.click();
  };

  return (
    <div className="reports-root">
      {/* Report Type Selection */}
      <div className="reports-card">
        <div className="reports-card-title">Select Report Type</div>
        <div className="report-types-grid">
          {REPORT_TYPES.map((r) => (
            <button
              key={r.id}
              className={`report-type-card ${selected === r.id ? 'active' : ''}`}
              onClick={() => { setSelected(r.id); setPreview(null); setError(''); }}
            >
              <span className="rt-icon">{r.icon}</span>
              <span className="rt-title">{r.title}</span>
              <span className="rt-desc">{r.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="generate-row">
        <button
          className={`generate-btn ${generating ? 'loading' : ''}`}
          onClick={handleGenerate}
          disabled={!selected || generating}
        >
          {generating ? (
            <>
              <span className="gen-spinner" />
              Generating Report…
            </>
          ) : (
            'Generate Report'
          )}
        </button>
        {preview && (
          <button className="download-btn" onClick={handleDownload}>
            ⬇ Download PDF
          </button>
        )}
      </div>

      {error && <div className="report-error">{error}</div>}

      {/* Preview */}
      {preview && (
        <div className="report-preview">
          <div className="preview-toolbar">
            <span className="preview-label">Report Preview</span>
            <span className="preview-meta">
              {REPORT_TYPES.find((r) => r.id === selected)?.title} — {ticker}
            </span>
          </div>
          <div className="preview-body">
            {typeof preview === 'string' ? (
              <div className="preview-text"><ReactMarkdown>{preview}</ReactMarkdown></div>
            ) : preview?.sections ? (
              <div className="preview-text">
                {preview.sections.map((s, i) => (
                  <div key={i} className="report-section">
                    <h3 className="report-section-title">{s.title}</h3>
                    <ReactMarkdown>{s.content}</ReactMarkdown>
                  </div>
                ))}
                {preview.disclaimer && (
                  <p className="report-disclaimer">{preview.disclaimer}</p>
                )}
              </div>
            ) : (
              <pre className="preview-text">{JSON.stringify(preview, null, 2)}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
