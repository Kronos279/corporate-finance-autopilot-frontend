import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL;
const WS_BASE = BASE.replace(/^http/, 'ws');

const api = axios.create({ baseURL: BASE });

/* ── Company ─────────────────────────────────────────────────── */
export const getCompanyFull       = (ticker)          => api.get(`/api/company/${ticker}/full`);
export const getProfile           = (ticker)          => api.get(`/api/company/${ticker}/profile`);
export const getFinancials        = (ticker)          => api.get(`/api/company/${ticker}/financials`);
export const getPriceHistory      = (ticker, period)  => api.get(`/api/company/${ticker}/price-history`, { params: { period } });
export const getMacro             = (ticker)          => api.get(`/api/company/${ticker}/macro`);
export const ingestCompany        = (ticker)          => api.post(`/api/company/${ticker}/ingest`);
export const searchCompany        = (ticker, q, top_k = 5) => api.get(`/api/company/${ticker}/search`, { params: { q, top_k } });

/* ── Analysis ────────────────────────────────────────────────── */
export const getScenarios         = (ticker)          => api.get(`/api/analysis/${ticker}/scenarios`);
export const postForecast         = (ticker, body)    => api.post(`/api/analysis/${ticker}/forecast`, body);
export const postDCF              = (ticker, body)    => api.post(`/api/analysis/${ticker}/dcf`, body);
export const postSensitivity      = (ticker, body)    => api.post(`/api/analysis/${ticker}/sensitivity`, body);

/* ── Agent ───────────────────────────────────────────────────── */
export const postAgentAsk         = (ticker, query)   => api.post(`/api/agent/${ticker}/ask`, { query });
export const agentWSUrl           = (ticker)          => `${WS_BASE}/api/agent/ws/${ticker}`;

/* ── Reports ─────────────────────────────────────────────────── */
export const postGenerateReport   = (ticker, report_type) => api.post(`/api/reports/${ticker}/generate`, { report_type });
export const getDownloadReportUrl = (ticker)          => `${BASE}/api/reports/${ticker}/download`;

export default api;
