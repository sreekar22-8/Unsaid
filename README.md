# Unsaid - A Private, Reflective AI Companion & Emotional Space

> A quiet, judgment-free space to untangle unspoken feelings, reflect through guided conversation modes, maintain an emotional journal, and retain complete sovereignty over what the AI remembers.

---

## Overview

Unsaid is an empathetic, privacy-first web application designed to help individuals process complex emotional experiences. Rather than functioning as a generic conversational chatbot or dispensing unsolicited advice, Unsaid creates an intentional, calm environment where users can express what they are carrying, explore their emotions, and observe personal growth over time.

> **Important Note:** Unsaid is designed as a self-reflection tool and emotional companion. It is **not** a diagnostic instrument, medical device, or replacement for licensed clinical therapy and professional mental health support.

---

## The Problem It Solves

People often carry complicated, unresolved emotions that they hesitate to share with friends, family, or colleagues due to fear of judgment, fear of burdening others, or lacking clarity on how to express themselves.

While general-purpose LLM chatbots can converse on any subject, they typically have significant drawbacks in emotional contexts:
1. **Unsolicited Problem-Solving**: Defaulting to immediate checklist solutions rather than allowing the user to simply feel heard.
2. **Toxic Positivity**: Minimizing authentic distress with generic platitudes.
3. **Black-Box Memory**: Silently storing personal details in opaque context stores without user visibility, verification, or consent.
4. **Lack of Emotional Boundaries**: Failing to differentiate between casual conversation, raw private journaling, and persistent context.

Unsaid solves this by introducing **adaptive conversation modes**, an **emotional journal**, **longitudinal emotion analytics**, and a **user-governed memory model** where no AI observation is retained without explicit user approval.

---

## Key Features

- **Empathetic Companion Chat**: Four distinct conversational modes tailored to the user's immediate emotional state.
- **Strict User-Controlled Memory**: The AI suggests potential memories after a conversation, but they remain dormant until explicitly approved by the user.
- **Private Notes System**: Fully isolated reflective notes that are strictly excluded from AI prompt context and memory extraction.
- **Emotional Journal**: Guided reflective journaling with categorized mood tags and full CRUD capabilities.
- **Emotion Tracking & Dashboard**:
  - *Seven-Day Rhythm*: Visualizing weekly check-in intensity without judgment.
  - *Top Emotions*: Breakdown of recurring emotional themes.
  - *Growth View*: Emotion-specific longitudinal trajectory charts tracking emotional intensity changes over time.
- **Secure Authentication & Ownership**: Powered by Supabase Auth with server-side JWT verification for user-scoped data access.
- **Refined Editorial Aesthetic**: Designed with an editorial typography hierarchy (Fraunces display font), warm earthen palettes (terracotta, forest teal, muted sand), subtle micro-animations, and full mobile responsiveness.

---

## The Four Chat Modes

Unsaid recognizes that someone in distress does not always need advice. Users can switch between four distinct conversational stances at any moment:

| Mode | Purpose | Conversational Stance |
| :--- | :--- | :--- |
| **Listen** | Pure holding space | Validates feelings, listens actively, and avoids unsolicited advice, solutions, or interruptions. Allows the user to empty their mind without pressure. |
| **Understand** | Gentle exploration | Asks thoughtful, clarifying questions to help unpack underlying causes, recurring patterns, and unspoken tensions. |
| **Reframe** | Perspective shift | Gently introduces alternate angles, cognitive reframing, and constructive hope without minimizing or dismissing the user's authentic pain. |
| **Help** | Actionable support | Offers grounded grounding exercises, coping mechanisms, and gentle step-by-step next actions when the user explicitly requests guidance. |

---

## Private Mode vs. Normal Conversations

Unsaid maintains a strict boundary between conversational interaction and private journaling:

- **Normal Conversations**:
  - Conversational messages are analyzed at the end of the session to detect key emotional themes.
  - The AI may suggest 1 to 2 potential context facts for the user's memory inbox.
  - Future conversations pull in **only** the user's previously approved memory items to maintain continuity.
- **Private Mode / Private Notes**:
  - A completely isolated space for raw, unfiltered thoughts.
  - **Zero AI Ingestion**: Private notes and private-mode messages are **never** passed to LLM memory context, never evaluated for memory extraction, and never surfaced in companion memory.
  - Kept in a dedicated storage table (`unsaid_private_notes`) separate from companion memories.

---

## User-Controlled Memory Architecture

Most AI systems treat memory as a background automation that users cannot easily inspect or correct. Unsaid adheres to a **Human-in-the-Loop Sovereign Memory Model**:

```
[ User Chat Session ]
        |
        v (Post-session AI extraction)
[ Candidate Memory Facts ] ---> Status: UNAPPROVED (Dormant)
        |
        v (User visits /memory)
+--------------------------------------------------------+
|  User reviews suggested facts:                         |
|  * Approve ---> Status: APPROVED (Active Context)      |
|  * Reject  ---> Permanently deleted                    |
|  * Edit    ---> User modifies fact for accuracy        |
|  * Delete  ---> Permanently removed                    |
+--------------------------------------------------------+
        |
        v (Only APPROVED items passed to /api/chat)
[ AI System Prompt Context ]
```

### Core Memory Rules:
1. **Unapproved by Default**: Following a conversation, the backend calls an AI extractor to generate 1 to 2 brief factual observations (e.g., "User is navigating a difficult job transition"). These are stored with `approved = false`.
2. **Visible in the Memory Inbox**: On the `/memory` page, unapproved items are highlighted with explicit **Approve** and **Reject** controls. The UI explicitly states: *"The AI will only remember approved facts in future conversations."*
3. **Strict Context Injection**: When generating conversational responses in `/api/chat`, the backend queries **only** approved memory items (`WHERE approved = true AND user_id = current_user`).
4. **Editable & Deletable**: Users can edit the wording of any approved memory, delete facts at will, or manually input their own facts.
5. **No Private Note Leakage**: Private notes are strictly excluded from memory extraction workflows.
6. **Verified User Ownership**: The backend verifies the caller's Supabase JWT via Bearer token before returning or modifying any memory item.

---

## Dashboard & Emotion Tracking

The `/insights` dashboard provides self-reflection metrics designed around gentleness rather than gamification or productivity scoring:

- **Seven-Day Rhythm**: An intensity bar chart displaying check-in volume and emotional depth over the past week.
- **Top Emotions Breakdown**: Color-coded distribution of dominant emotional states (e.g., Tender, Hopeful, Heavy, Unsettled, Reflective).
- **Growth View**: An interactive SVG time-series visualization tracking specific emotional intensities across journal entries. Users can select an emotion to observe how its intensity has softened over time (e.g., "Eased 35%").
- **Mindful Streaks**: Reflection counters that celebrate consistency without punitive streak resets.

---

## Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [TypeScript 5.9](https://www.typescriptlang.org/)
- **Bundler & Tooling**: [Vite 7](https://vitejs.dev/) with Fast Refresh
- **Routing**: [Wouter](https://github.com/molefrog/wouter) (lightweight, client-side router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with custom design tokens, CSS variables, and fluid typography
- **State & Data Fetching**: [TanStack Query v5](https://tanstack.com/query/latest) (React Query)
- **Icons & UI Primitives**: [Lucide React](https://lucide.dev/), [Radix UI](https://www.radix-ui.com/)
- **Authentication Client**: [@supabase/supabase-js](https://supabase.com/docs/reference/javascript)

### Backend
- **Runtime**: [Node.js 20+](https://nodejs.org/) (ES Modules)
- **Framework**: [Express 5](https://expressjs.com/) with typed routers
- **Database ORM**: [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL driver
- **Schema Validation**: [Zod](https://zod.dev/) with `drizzle-zod`
- **Logging**: [Pino](https://getpino.io/) with structured HTTP logging and pretty-printing
- **API Contracts & Codegen**: [OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0) with [Orval](https://orval.dev/)

### AI & Infrastructure
- **LLM Integration**: [Google Gemini API](https://ai.google.dev/) for emotion detection, reflective dialogue generation, and memory extraction (with built-in deterministic fallback when no API key is provided)
- **Database**: PostgreSQL (Supabase / Neon)
- **Workspace**: Monorepo managed with `pnpm workspaces`

---

## Repository Structure

```
Unsaid/
|-- artifacts/
|   |-- api-server/             # Express 5 backend server
|   |   |-- src/
|   |   |   |-- routes/         # Companion, health, and memory API endpoints
|   |   |   |-- lib/            # Gemini client, emotion classifier, memory extractor
|   |   |   |-- middlewares/    # Supabase JWT authentication middleware
|   |   |   |-- app.ts          # Express application setup
|   |   |   \-- index.ts        # Server entry point
|   |   |-- build.mjs           # esbuild bundler configuration
|   |   \-- .replit-artifact/   # Multi-service API manifest
|   |
|   \-- unsaid/                 # Vite + React frontend client
|       |-- src/
|       |   |-- components/     # AppShell, LoadingSpinner, EmptyState, design primitives
|       |   |-- pages/          # Landing, Companion, Journal, Insights, Memory, Settings
|       |   |-- lib/            # Supabase browser client
|       |   \-- index.css       # Design tokens, typography, and animations
|       |-- vite.config.ts      # Vite configuration with fallback support
|       \-- .replit-artifact/   # Multi-service Web manifest
|
|-- lib/
|   |-- api-spec/               # OpenAPI spec (openapi.yaml) and Orval config
|   |-- api-zod/                # Auto-generated Zod validation schemas
|   |-- api-client-react/       # Auto-generated React Query hooks
|   \-- db/                     # Drizzle schema definitions and migrations
|
|-- .replit                     # Replit environment & autoscale deployment config
|-- pnpm-workspace.yaml         # Monorepo workspace configuration
\-- README.md                   # Project documentation
```

---

## Getting Started Locally

### Prerequisites
- **Node.js**: v20.0.0 or higher
- **pnpm**: v9.0.0 or higher (`corepack enable pnpm`)
- **PostgreSQL**: A running PostgreSQL instance (or Supabase project)

### 1. Clone the Repository
```bash
git clone https://github.com/sreekar22-8/Unsaid.git
cd Unsaid
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory (see [Environment Variables](#environment-variables) below for details):
```bash
cp .env.example .env
```

### 4. Push Database Schema
```bash
pnpm --filter @workspace/db run push
```

### 5. Start the Development Servers
In separate terminal windows (or via your workspace task runner):

**Start the API Backend (Port 5000 / 3000):**
```bash
pnpm --filter @workspace/api-server run dev
```

**Start the Web Frontend (Port 5173):**
```bash
pnpm --filter @workspace/unsaid run dev
```

Visit `http://localhost:5173` in your browser.

---

## Environment Variables

The application requires the following environment variables. **Never commit actual secret values or API keys to source control.**

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Backend | PostgreSQL connection string with SSL configuration. |
| `GEMINI_API_KEY` | Backend | Google Gemini API key used for reflection, emotion classification, and memory extraction. |
| `SUPABASE_URL` | Backend | Supabase project URL for JWT token validation. |
| `SUPABASE_ANON_KEY` | Backend | Supabase anonymous key for public API communication. |
| `VITE_SUPABASE_URL` | Frontend | Public Supabase project URL (must start with `https://`). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | Public Supabase publishable/anon key for browser client authentication. |
| `PORT` | Optional | Port for the API server (defaults to `3000` or `8080`) and Vite dev server (defaults to `5173`). |
| `BASE_PATH` | Optional | Application base path (defaults to `/`). |

---

## Deployment Guide

This project supports two primary deployment pathways: **Replit Autoscale** (recommended for full-stack monorepos) and **Split Deployment via Vercel**.

### Option A: Replit Deployment (Recommended)

The repository is natively structured for Replit's multi-service architecture via `.replit` and `.replit-artifact/artifact.toml`:
- **Routing**: Replit's internal router directs all traffic at `/` to the static Vite frontend and all traffic under `/api/*` to the Express backend.
- **Autoscale Target**: Configured in `.replit` under `[deployment]` (`deploymentTarget = "autoscale"`).
- **Health Checks**: Configured with a dedicated endpoint at `/api/healthz`.

#### Steps to Deploy on Replit:
1. Import the repository into your Replit workspace.
2. Open the **Secrets** tool in the left sidebar and add:
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. The shared frontend keys (`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`) are already set in `.replit` under `[userenv.shared]`.
4. Click the **Deploy** button in the top-right header and select **Autoscale**.
5. Replit will execute the build pipeline (`pnpm store prune` + production bundle) and provision your production URL.

### Option B: Vercel + Backend Host

If deploying frontend and backend independently:
1. **Frontend (Vercel)**:
   - Connect the repository to Vercel.
   - Set Root Directory to `artifacts/unsaid`.
   - Set Build Command to `vite build --config vite.config.ts`.
   - Set Output Directory to `dist/public`.
   - Configure Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
   - A `vercel.json` rewrite file is included in `artifacts/unsaid/` for single-page client routing.
2. **Backend**:
   - Deploy `artifacts/api-server` to a Node.js host (Render, Railway, Fly.io, or Replit).
   - Configure required environment variables (`DATABASE_URL`, `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`).
   - Configure CORS origin to match your Vercel domain.

---

## Quality Assurance & Verification

The codebase enforces strict end-to-end type safety and automated validation:

```bash
# Run typecheck across all packages, libraries, and scripts
pnpm run typecheck

# Build the complete production bundle across all packages
pnpm run build

# Run Playwright end-to-end tests
pnpm --filter @workspace/unsaid run test:e2e
```

---

## License

This project is licensed under the [MIT License](LICENSE).
