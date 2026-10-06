# ⚡ Neno Content Studio

> **Autonomous Multi-Agent AI Engine for Enterprise Technical Blogs, Case Studies & Real-Time Production Publishing.**

[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-AWS_RDS-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Modern_Dark_UI-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)](LICENSE)

---

## 🌟 Overview

**Neno Content Studio** is an end-to-end content generation and publishing suite engineered for high-growth tech companies and agencies. Unlike simple prompt-wrapper tools, it runs a collaborative **multi-agent orchestration pipeline** that plans, researches, drafts, audits, visualizes, and syncs production-ready content straight into your live website's database.

```
                  ┌─────────────────────────────────────────┐
                  │       Neno Content Studio (UI)          │
                  └────────────────────┬────────────────────┘
                                       │
                     ▼                 ▼                 ▼
          ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
          │ StrategistAgent │ │  ResearchAgent  │ │   WriterAgent   │
          └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
                   │                   │                   │
                   └───────────────────┼───────────────────┘
                                       ▼
          ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
          │    SEO Agent    │ │    QA Agent     │ │ Visual/SVG Art  │
          └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
                   │                   │                   │
                   └───────────────────┼───────────────────┘
                                       ▼
                   ┌───────────────────────────────────────┐
                   │    Live Push & Website Sync Engine    │
                   └───────────────────┬───────────────────┘
                                       ▼
            [ AWS RDS PostgreSQL ] ───► [ Live Website ]
```

---

## ✨ Key Features

### 🤖 1. Multi-Agent AI Pipeline
* **Strategist Agent**: Analyzes topic resonance, target reader personas (CTOs, Devs, Founders), and crafts unique content angles.
* **Research Agent**: Scours technical domain concepts, extracts key stats, and grounds arguments in real-world facts.
* **Writer Agent**: Produces exhaustive, high-fidelity long-form technical blogs and enterprise case studies.
* **SEO Agent**: Automatically generates keyword-rich metadata, meta descriptions, slugs, and Schema.org structured data.
* **QA & Compliance Agent**: Evaluates readability, tone-of-voice alignment, and highlights potential hallucinations.

### 💼 2. Enterprise Case Study Builder
* **Architectural Focus**: Specifically tuned for deep-dive case studies detailing technical architecture, engineering challenges, solutions, and quantifiable ROI metrics.
* **Zero-Distraction Layout**: Streamlined, professional layout without unnecessary stock placeholder noise.

### 🎨 3. Algorithmic SVG Art & Visual Engine
* Custom procedural SVG hero visualizer tailored for each article's core theme (Cybersecurity, Distributed Systems, Cloud Architecture, AI/ML).
* Zero external image hosting dependencies for clean vector graphics.

### 🔄 4. Direct Production Database Sync
* One-click instant publishing straight to AWS RDS PostgreSQL.
* Live automatic synchronization between draft workspaces and public production endpoints (`/case-studies/[slug]` and `/blogs/[slug]`).
* Dedicated **"Push All to Website"** batch syncing tool.

### 🎮 5. Interactive Background Generation
* Generates deep content asynchronously in the background.
* Includes an interactive built-in **AI Signal Mini-Game** to keep users engaged during generation runs.

### 🗑️ 6. Enterprise Trash & Lifecycle Management
* Soft-delete trash bin with one-click restore and automated cleanup.
* Full version history and snapshot rollbacks for every edit.

---

## 🚀 Quick Start

### Prerequisites
* **Node.js**: `v18.17.0` or higher
* **npm** / **pnpm** / **yarn**
* **PostgreSQL** instance (Local or AWS RDS)

### 1. Clone the repository
```bash
git clone https://github.com/MIT-17-PATEL/neno-content-genrater.git
cd neno-content-genrater
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
# AI Model Provider Keys
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration (AWS RDS or Local PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Live Website Integration
NEXT_PUBLIC_WEBSITE_URL=https://www.nenotechnology.com
WEBSITE_SYNC_SECRET=your_sync_secret_key

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3001
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to start generating content!

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router, Server Actions) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + Custom Dark Glassmorphism |
| **Components** | [Radix UI](https://www.radix-ui.com/) + [Lucide Icons](https://lucide.dev/) |
| **AI LLM Core** | Google Gemini 1.5 Pro / Flash, Groq Llama-3, OpenAI GPT-4o |
| **Database** | PostgreSQL (AWS RDS) with connection pooling |
| **Validation** | [Zod](https://zod.dev/) type-safe schemas |

---

## 📂 Project Structure

```bash
neno-content-genrater/
├── public/                # Static assets, generated SVG visuals
├── src/
│   ├── agents/            # Multi-Agent AI system (Writer, SEO, QA, Research)
│   ├── app/               # Next.js App Router (Studio UI & API Routes)
│   │   ├── api/           # Backend routes (admin, sync, generation, trash)
│   │   ├── blog/          # Blog manager & editor
│   │   ├── case-studies/  # Case studies manager & live publisher
│   │   └── trash/         # Soft-deleted item recovery center
│   ├── components/        # Reusable UI & editor components
│   ├── lib/
│   │   ├── ai/            # Model clients, SVG art generators, prompt engines
│   │   ├── analysis/      # Readability and SEO scoring algorithms
│   │   └── export/        # Live website synchronization client
│   ├── services/          # Business logic (Content, Versioning, Audit)
│   └── validation/        # Zod runtime schema validators
└── tests/                 # Unit and integration test suite
```

---

## 🔒 Security & Best Practices

- **Strict Input Sanitization**: HTML content is sanitized before database storage and preview rendering.
- **Role-Based Admin Protection**: Sync endpoints and management routes are protected via authenticated session tokens.
- **Optimized Connection Pooling**: PostgreSQL queries use resilient connection pools designed for low latency.

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <sub>Built with ❤️ by <a href="https://www.nenotechnology.com">Neno Technology</a> Engineering Team</sub>
</div>
