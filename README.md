# AI Monitor Platform 🌍 ⚡️

**AI Monitor Platform** is a comprehensive, real-time, interactive dashboard and global map designed to track the rapidly evolving Artificial Intelligence industry. It aggregates, translates, and visualizes AI news, regulatory updates, hardware releases, and market shifts from across the globe in one unified view.

🌐 **Live Demo:** [aimonitor-nine.vercel.app](https://aimonitor-nine.vercel.app/)

## ✨ Key Features & Modules

The platform is divided into several specialized modules to provide a 360-degree view of the AI landscape:

- **🌍 Overview (Interactive Map):** This core module visualizes the geographic origin and global impact level of AI events using animated, color-coded markers. It provides an immediate bird's-eye view of where the most critical technological breakthroughs and regulatory developments are happening in real-time.
- **📰 News Feed:** A clean, continuously updated data stream showing the latest AI developments across the globe. Users can dynamically filter this feed by specific industries (like Hardware or Software), severity levels, and specific timeframes to easily cut through the noise and find exactly what matters to them.
- **🧠 Models:** This dedicated section tracks the rapid pace of both open-source and proprietary foundation models. It provides comprehensive details on the latest model releases, parameter sizes, architecture updates, and performance benchmarks to keep users informed on the bleeding edge of AI capabilities.
- **📈 Market:** Designed to monitor broader market trends, this module tracks AI company stock performances and macroeconomic shifts driven by AI advancements. It offers a comprehensive look at how emerging AI technologies are actively disrupting and shaping the global financial landscape.
- **💹 Trading:** A highly specialized interface built for quantitative analysis and automated trading benchmarks. This tab focuses on interpreting AI-driven trading signals and transforming raw market sentiment into actionable, quantitative insights to help power automated, algorithmic trading strategies.
- **📚 Sources:** A transparent and robust management view displaying the diverse array of global data sources that feed the platform's intelligence. It tracks everything from major financial publications to highly specialized, localized AI research outlets from around the world.
- **🔔 Notifications:** A customizable, proactive alert system designed to ensure users never miss a critical update. Users can configure this module to push immediate notifications regarding severe AI events, sudden regulatory changes, or major hardware announcements as soon as they happen.

## 🤖 AI Quant Analysis by Claude & Data Pipeline

At the core of the platform is a sophisticated, automated data engine powered by **Anthropic's Claude** models:

- **Real-Time Automated Scraping:** Continuously fetches the latest AI news from 10+ global regions (US, China, EU, Japan, Korea, etc.) directly via native-language RSS feeds.
- **Claude-Powered Quant Processing:** Leverages **Claude (`claude-opus-4-8`)** to ingest raw, multi-lingual data and automatically:
  - **Translate** foreign articles into fluent English.
  - **Summarize** lengthy news into concise, actionable insights.
  - **Dynamically Score** the severity (Low to Critical) based on global impact.
  - **Quantify market impact** — tag the affected public tickers, assign a directional market sentiment (bullish/bearish/neutral) and a −5…+5 impact magnitude, and distill a one-line quant takeaway per event.
  - **Categorize** the news (e.g., Hardware, Regulation, Model releases) and pinpoint the exact geographic coordinates for the map.
- **Daily Quant Market Pulse:** Claude distills the last 24 hours of catalysts into a 3-bullet, markets-desk-style brief — naming the catalyst, the likely beneficiary/at-risk ticker, and the directional read.
- **AI-Driven Trading Logic:** The optional `live-trade-bench` backend interprets market shifts and news sentiment to power automated, benchmarked trading strategies.

> The model is set via `CLAUDE_MODEL` in the pipeline scripts. Switch to `claude-haiku-4-5` to cut cost/latency on this high-volume pipeline.

## 📊 Market Intelligence & Quant Engine

The **Market** and **Trading** tabs are powered by a self-contained quantitative analysis engine, implemented identically on both ends:

- **Backend:** `backend/backend/app/quant_analysis.py` + the `/api/market/*` and `/api/trading/signal` routes.
- **Frontend:** `frontend/src/lib/quant.ts`.

The engine turns a raw price series into an interpretable signal by blending four complementary factors into a single risk-adjusted composite score (−100…+100) with a confidence level and a written analyst rationale:

| Factor | What it measures |
| --- | --- |
| **Momentum** | Multi-horizon (20-day / 60-day) trend persistence |
| **Trend** | Price position relative to the 50-day moving average |
| **Mean-reversion** | RSI(14) contrarian pressure at overbought/oversold extremes |
| **Risk-adjustment** | Annualized Sharpe ratio, with a volatility conviction penalty |

The score maps to a discrete signal — `STRONG_BUY` → `BUY` → `HOLD` → `SELL` → `STRONG_SELL`.

> **Always-on demo mode:** if the live market backend is not reachable, the front-end transparently falls back to the quant engine running on deterministic, seeded data for a curated AI-sector universe (NVDA, MSFT, GOOGL, AMD, TSM, …). The Market Intelligence view therefore **always renders real analysis instead of a connection error**.

## 🛠️ Tech Stack

- **Frontend:** [Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/), Shadcn UI
- **Mapping:** [React Leaflet](https://react-leaflet.js.org/) & CartoDB tiles
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Data Pipeline:** Node.js, `rss-parser`, [Anthropic Claude API](https://docs.claude.com/) (`@anthropic-ai/sdk`)
- **Trading Backend (optional):** Python `live-trade-bench` quant engine under `backend/` (run locally for the Trading tab)

## 🚀 Getting Started (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/JackyJiang08/AI-Monitor-Platform.git
cd AI-Monitor/frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Environment Variables
Copy `frontend/.env.example` to `frontend/.env.local` and add your **Anthropic API key** (required for the automated news fetcher):
```env
ANTHROPIC_API_KEY="sk-ant-your-key-here"
```
See `.env.example` for the optional `GNEWS_API_KEY` (backfill) and `NEXT_PUBLIC_API_URL` (Trading tab backend) variables.

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 5. Start the Live News Fetcher (Optional)
To run the background worker that automatically scrapes and analyzes global news every hour:
```bash
node start_live_news.js
```

### 6. Trading Tab (optional)
The **Trading** tab is powered by the Python `live-trade-bench` engine under `backend/`. It talks to a local API server (default `http://localhost:8000`, configurable via `NEXT_PUBLIC_API_URL`). Run that backend locally to enable the tab — it is **not** deployed alongside the Vercel frontend, so on the hosted demo the Trading tab is read-only/empty. See `backend/README.md` for how to start it.

## 📄 License

The AI Monitor application code (the `frontend/` app and data pipeline) is released under the [MIT License](LICENSE). The bundled `live-trade-bench` trading benchmark under `backend/` is a third-party project with its own license — see `backend/LICENSE`.
