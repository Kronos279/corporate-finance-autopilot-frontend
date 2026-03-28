import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { agentWSUrl } from '../../api';
import './AdvisoryTab.css';

export default function AdvisoryTab({ data, ticker }) {
  // Compute capital structure from the most recent balance sheet
  const sheets = data?.financials?.balance_sheets ?? [];
  const bs = sheets[sheets.length - 1] ?? {};
  const capStruct = {
    debt_to_equity: bs.debt_to_equity,
    current_ratio:  bs.current_ratio,
    net_debt:       bs.net_debt,
    total_debt:     bs.total_debt,
    total_assets:   bs.total_assets,
    debt_to_assets: bs.total_debt && bs.total_assets ? bs.total_debt / bs.total_assets : null,
  };

  const [messages,    setMessages]   = useState([]);
  const [input,       setInput]      = useState('');
  const [connecting,  setConnecting] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const wsRef      = useRef(null);
  const endRef     = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Cleanup WS on unmount
  useEffect(() => () => { wsRef.current?.close(); }, []);

  const sendQuery = useCallback(() => {
    if (!input.trim()) return;

    const query = input.trim();
    setInput('');
    setAgentLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: query }]);

    // Build conversation history for context continuity
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    // Open a new WebSocket per query, but send conversation history for context
    setConnecting(true);
    const url = agentWSUrl(ticker);
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    let responseBuffer = '';

    ws.onopen = () => {
      setConnecting(false);
      ws.send(JSON.stringify({ query, history }));
    };

    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }

      // Handle streaming tokens
      if (msg.type === 'token') {
        responseBuffer += msg.content;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return [...prev.slice(0, -1), { role: 'assistant', content: responseBuffer }];
          }
          return [...prev, { role: 'assistant', content: responseBuffer }];
        });
      }

      // Handle completion
      if (msg.type === 'done' || msg.complete != null || msg.response != null) {
        const finalText = msg.complete ?? msg.response;
        if (finalText) {
          responseBuffer = finalText;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return [...prev.slice(0, -1), { role: 'assistant', content: finalText }];
            }
            return [...prev, { role: 'assistant', content: finalText }];
          });
        }
        setAgentLoading(false);
        ws.close();
      }

      if (msg.type === 'error' || msg.error) {
        setAgentLoading(false);
        setMessages((prev) => [...prev, { role: 'error', content: msg.message ?? msg.error ?? 'Agent error.' }]);
        ws.close();
      }
    };

    ws.onerror = () => {
      setConnecting(false);
      setAgentLoading(false);
      setMessages((prev) => [...prev, { role: 'error', content: 'Connection error. Try again.' }]);
    };

    ws.onclose = () => { setConnecting(false); setAgentLoading(false); };
  }, [input, ticker, messages]);

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuery(); } };

  return (
    <div className="advisory-root">
      {/* Capital Structure */}
      <div className="advisory-card">
        <div className="advisory-card-title">Capital Structure</div>
        <div className="cap-grid">
          {[
            { label: 'Debt / Assets',    value: capStruct.debt_to_assets    != null ? `${(capStruct.debt_to_assets*100).toFixed(1)}%` : '—' },
            { label: 'Debt / Equity',    value: capStruct.debt_to_equity    != null ? capStruct.debt_to_equity.toFixed(2) : '—' },
            { label: 'Current Ratio',    value: capStruct.current_ratio     != null ? capStruct.current_ratio.toFixed(2)  : '—' },
            { label: 'Net Debt',         value: capStruct.net_debt          != null ? fmtB(capStruct.net_debt) : '—' },
            { label: 'Total Debt',       value: capStruct.total_debt        != null ? fmtB(capStruct.total_debt) : '—' },
            { label: 'Total Assets',     value: capStruct.total_assets      != null ? fmtB(capStruct.total_assets) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="cap-metric">
              <span className="cap-label">{label}</span>
              <span className="cap-value">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Chat */}
      <div className="agent-panel">
        <div className="agent-header">
          <div className="agent-title">
            <span className="agent-icon">🤖</span>
            AI Financial Advisor
            {connecting && <span className="conn-dot" />}
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-placeholder">
              Ask about {ticker}'s financials, valuation, risks, or strategic outlook.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role}`}>
              {m.role === 'assistant'
                ? <ReactMarkdown>{m.content}</ReactMarkdown>
                : <span>{m.content}</span>
              }
            </div>
          ))}
          {agentLoading && <div className="typing-indicator"><span /><span /><span /></div>}
          <div ref={endRef} />
        </div>

        <div className="chat-input-row">
          <textarea
            className="chat-input"
            placeholder="Ask a question about this company…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={2}
          />
          <button
            className="chat-send"
            onClick={sendQuery}
            disabled={agentLoading || !input.trim()}
          >
            {agentLoading ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtB(n) {
  if (n == null) return '—';
  const sign = n < 0 ? '-' : '';
  const abs  = Math.abs(n);
  if (abs >= 1e9) return `${sign}$${(abs/1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs/1e6).toFixed(1)}M`;
  return `${sign}$${abs.toFixed(0)}`;
}
