# Corporate Finance Dashboard

A modern, responsive web app for financial analysis, scenario modeling, and AI-powered advisory, built with React and Recharts.

## Features

- **Company Search & Quick Tickers**: Instantly search for public companies and access quick tickers.
- **Dashboard**: Tabbed navigation for Financials, Model, Advisory, and Reports.
- **Financials Tab**: Visualize Revenue vs Net Income, Margin Trends, and view detailed financial tables (Income Statement, Balance Sheet, Cash Flow).
- **Model Tab**: Scenario analysis with interactive sliders and multi-scenario revenue chart. (Implied Price and Sensitivity analysis have been removed for simplicity.)
- **Advisory Tab**: AI-powered chat for financial questions and capital structure summary.
- **Reports Tab**: Generate and preview company reports.
- **Responsive Design**: Works great on desktop and mobile.

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Set API URL:**
   - Create a `.env` file in the `frontend` directory:
     ```env
     REACT_APP_API_URL=https://corporate-finance-autopilot-566338799391.us-central1.run.app
     ```
   - Or set the environment variable in your deployment platform (e.g., Vercel dashboard).

3. **Run the app locally:**

   ```bash
   npm start
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for production:**
   ```bash
   npm run build
   ```

## Project Structure

- `src/`
  - `components/` — Reusable UI components
  - `pages/` — Main app pages and tabs
  - `api/` — API integration
  - `App.js` — Main app entry

## Notes

- **Implied Price and Sensitivity analysis have been removed** from the Model tab for simplicity.
- All financial data is fetched from the backend API.
- For deployment, ensure your environment variables are set correctly.
