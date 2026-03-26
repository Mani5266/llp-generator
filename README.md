<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3FCF8E?style=for-the-badge&logo=supabase" />
  <img src="https://img.shields.io/badge/Gemini%20AI-Powered-4285F4?style=for-the-badge&logo=google" />
  <img src="https://img.shields.io/badge/Zod-4-3E67B1?style=for-the-badge&logo=zod" />
  <img src="https://img.shields.io/badge/DPDP%20Act-Compliant-FF6F00?style=for-the-badge" />
</p>

<h1 align="center">Deed AI  --  LLP Agreement Generator</h1>

<p align="center">
  <strong>AI-powered conversational tool that drafts legally compliant LLP Partnership Deeds for India.</strong><br/>
  Built with Next.js 15, Google Gemini AI, Supabase, and enterprise-grade security.
</p>

<p align="center">
  <code>10-layer security audit</code> | <code>RLS + IDOR protection</code> | <code>Zod validation</code> | <code>Rate limiting</code> | <code>DPDP Act compliance</code>
</p>

---

## Table of Contents

- [Features](#features)
- [Security Architecture](#security-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [How It Works](#how-it-works)
- [API Routes](#api-routes)
- [Agreement Sections Covered](#agreement-sections-covered)
- [Security Audit Details](#security-audit-details)
- [Scripts](#scripts)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

### AI-Powered Drafting
- **Conversational Interface** -- A step-by-step chat assistant that collects partner details, capital contributions, profit-sharing ratios, business objectives, and more through natural conversation.
- **Google Gemini Integration** -- Uses `gemini-2.5-flash` to intelligently parse user responses, validate inputs, and generate structured updates to the LLP agreement.
- **Aadhaar OCR** -- Upload an image of an Aadhaar card and the AI extracts partner details (name, address, DOB) automatically. Images are processed in-memory and **never persisted to the database**.
- **Smart Suggestions** -- Quick-select option buttons and checkboxes for common inputs like number of partners, Indian states, and designated partner selection.
- **Business Objective Generation** -- AI generates comprehensive business objectives tailored to your industry.

### Live Document Preview
- **Split-Screen Editor** -- Chat on the left, live deed preview on the right -- updates in real time as you answer questions.
- **Template-Based Rendering** -- Professional LLP deed format compliant with Section 23(4) of the LLP Act, 2008.
- **Missing Field Indicators** -- See exactly which fields still need to be filled, with a collapsible badge panel.
- **Inline Editing** -- Toggle edit mode to manually tweak the generated deed directly in the preview.
- **Undo/Revert** -- Click the undo button on any past message to revert the document to that point in time.

### Export Options
- **PDF Download** -- Generates a print-ready PDF with proper formatting and page layout.
- **DOCX Download** -- Creates a Microsoft Word document for further editing and legal review.
- **Copy to Clipboard** -- One-click copy of the entire deed text.

### Authentication & User Management
- **Supabase Auth** -- Email/password sign-up and sign-in with session management.
- **Server-Side Route Protection** -- `middleware.ts` intercepts every request, verifies the Supabase session via `getUser()`, and redirects unauthenticated users to `/login`.
- **Row Level Security** -- FORCE RLS at the database level -- even the table owner cannot bypass policies.

### Dashboard
- **Agreement Management** -- View all past LLP agreements in a card-based dashboard.
- **Progress Tracking** -- Visual progress bars showing completion percentage for each agreement.
- **Rename Agreements** -- Click the pencil icon to rename any agreement inline.
- **Search & Filter** -- Instantly search agreements by name.
- **Create / Continue / Delete** -- Full CRUD operations, all scoped to the authenticated user.

### Dark / Light Mode
- **Theme Toggle** -- Sun/moon button in the header of every page.
- **60+ CSS Variables** -- Complete theming system with smooth `.3s` transitions.
- **System Preference Detection** -- Auto-detects OS dark/light preference on first visit.
- **Persistent** -- Theme choice saved in `localStorage`.

### Mobile Responsive
- **Tab-Based Layout** -- Chat and Preview switch via a bottom tab bar on mobile.
- **Responsive Dashboard** -- Single-column grid on small screens.
- **Touch-Friendly** -- All buttons and inputs sized for touch interaction.

---

## Security Architecture

Deed AI handles sensitive Indian user data (Aadhaar card images, personal details, financial data). The application has been hardened with a **10-section enterprise security audit**:

```
                    REQUEST FLOW
                    ============

    Client Request
         |
         v
  +------+-------+
  |  middleware.ts |  <-- 1. Server-side auth check (Supabase session)
  |  (route guard) |      Redirects to /login if invalid
  +------+--------+
         |
         v
  +------+--------+
  |  Security      |  <-- 2. HSTS, CSP, X-Frame-Options, etc.
  |  Headers       |      (next.config.js - 8 headers)
  +------+---------+
         |
         v
  +------+---------+
  |  API Route     |  <-- 3. getAuthUser() - JWT verification
  |  Auth Check    |      Returns 401 if no valid session
  +------+---------+
         |
         v
  +------+---------+
  |  Rate Limiter  |  <-- 4. In-memory sliding window
  |  (per user)    |      Returns 429 if limit exceeded
  +------+---------+
         |
         v
  +------+---------+
  |  Zod Schema    |  <-- 5. Input validation + sanitization
  |  Validation    |      Returns 400 if schema fails
  +------+---------+
         |
         v
  +------+---------+
  |  Business      |  <-- 6. Process request (Gemini AI, render, etc.)
  |  Logic         |
  +------+---------+
         |
         v
  +------+---------+
  |  Audit Logger  |  <-- 7. Fire-and-forget log to audit_logs
  |  (service role)|      IP, user-agent, action, metadata
  +------+---------+
         |
         v
  +------+---------+
  |  Supabase DB   |  <-- 8. RLS enforced - user can only touch own rows
  |  (FORCE RLS)   |      FK cascade on user deletion
  +------+---------+
         |
         v
     Response
```

### Security Layers at a Glance

| # | Layer | What It Does |
|---|---|---|
| 1 | **RLS Policies** | `FORCE ROW LEVEL SECURITY` on `agreements` + `audit_logs`. 4 policies per table. Users can only CRUD their own data. |
| 2 | **Environment Audit** | `GEMINI_API_KEY` server-only. No `NEXT_PUBLIC_` leak. `.env.local` never committed. `.env.example` safe template. |
| 3 | **API Auth Hardening** | 4 IDOR vulnerabilities found and fixed. Server-side middleware intercepts all protected routes. |
| 4 | **Storage Infrastructure** | Private `documents` bucket with RLS. 10MB limit. User-scoped folder paths (`{user_id}/`). 5-min signed URLs. |
| 5 | **Zod Validation** | Every API route validates input with strict schemas. Max lengths, numeric bounds, array limits, `.passthrough()` stripped. |
| 6 | **Rate Limiting** | In-memory sliding-window. Chat: 20/hr, Render: 60/hr, DOCX: 30/hr, PDF: 30/hr. Per-user keying. `Retry-After` headers. |
| 7 | **Security Headers** | HSTS (2yr), CSP (script/style/font/connect-src whitelisted), X-Frame-Options DENY, nosniff, Permissions-Policy. |
| 8 | **Access Control Tests** | 35+ manual test cases across 8 categories. Smoke test script included. |
| 9 | **Audit Logging** | Immutable `audit_logs` table. Service-role INSERT only. Users can read own logs (DPDP transparency). IP + User-Agent captured. |
| 10 | **Data Retention** | DPDP Act compliance. Auto-delete inactive agreements (30 days) + old audit logs (90 days). Vercel cron at 3 AM UTC daily. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript 5.9](https://www.typescriptlang.org/) |
| **UI** | [React 19](https://react.dev/) + Inline Styles + CSS Variables |
| **AI** | [Google Gemini 2.5 Flash](https://ai.google.dev/) (`@google/generative-ai`) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL + Row Level Security) |
| **Auth** | [Supabase Auth](https://supabase.com/docs/guides/auth) (Email/Password) |
| **Validation** | [Zod 4](https://zod.dev/) (runtime schema validation) |
| **Document Export** | [`docx`](https://www.npmjs.com/package/docx) (DOCX) + Server-side HTML (PDF) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Styling** | CSS Variables + [Tailwind CSS 4](https://tailwindcss.com/) |
| **Deployment** | [Vercel](https://vercel.com/) (with Cron Jobs) |

---

## Project Structure

```
llp-final/
|
|-- app/
|   |-- api/
|   |   |-- chat/route.ts              # Gemini AI chat (Zod + rate limit + audit)
|   |   |-- render-deed/route.ts       # Server-side deed HTML rendering
|   |   |-- download-docx/route.ts     # DOCX file generation
|   |   |-- download-pdf/route.ts      # PDF generation (HTML sanitized)
|   |   +-- cron/cleanup/route.ts      # Data retention cleanup (CRON_SECRET auth)
|   |-- auth/confirm/route.ts          # Email OTP verification
|   |-- dashboard/page.tsx             # Agreement management dashboard
|   |-- login/page.tsx                 # Authentication page
|   |-- globals.css                    # CSS variables, animations, responsive
|   |-- layout.tsx                     # Root layout (Auth + Theme providers)
|   +-- page.tsx                       # Main app entry (auth-gated)
|
|-- src/
|   |-- components/
|   |   |-- AuthProvider.tsx            # Supabase auth context
|   |   |-- ChatPanel.tsx               # Conversational AI interface
|   |   |-- DocumentPanel.tsx           # Live deed preview & export
|   |   |-- LLPApp.tsx                  # Main app orchestrator + auto-save
|   |   +-- ThemeProvider.tsx           # Dark/light mode context
|   |-- lib/
|   |   |-- audit.ts                    # [S9]  Audit logger (service-role client)
|   |   |-- auth.ts                     # [S3]  Server-side auth helper
|   |   |-- deed-template.ts           #       LLP deed HTML template engine
|   |   |-- gemini.ts                   #       Gemini AI client wrapper
|   |   |-- prompts.ts                  #       AI system prompt & question flow
|   |   |-- rateLimit.ts               # [S6]  In-memory sliding-window limiter
|   |   |-- schemas.ts                 # [S5]  Zod validation schemas
|   |   |-- storage.ts                 # [S4]  Supabase Storage helpers
|   |   |-- supabase.ts                #       Supabase client singleton
|   |   +-- validation.ts              #       PAN, PIN, age, capital validators
|   +-- types/
|       +-- index.ts                    #       TypeScript interfaces & helpers
|
|-- supabase/
|   +-- migrations/
|       |-- 001_rls_agreements.sql     # [S1]  RLS + FORCE RLS + FK cascade
|       |-- 002_storage_policies.sql   # [S4]  Private bucket + storage RLS
|       |-- 003_audit_logs.sql         # [S9]  Immutable audit_logs table
|       +-- 004_data_retention.sql     # [S10] cleanup_expired_data() function
|
|-- middleware.ts                       # [S3]  Server-side route protection
|-- next.config.js                     # [S7]  8 security headers + CSP
|-- vercel.json                        # [S10] Daily cron job config
|-- .env.example                       # [S2]  Safe env template (committed)
|-- .env.local                         # [S2]  Actual secrets (gitignored)
|-- SECURITY_TESTS.md                  # [S8]  35+ manual test cases
|-- package.json
+-- tsconfig.json
```

> `[S#]` tags indicate which security audit section created/modified that file.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ installed
- A [Supabase](https://supabase.com/) project (free tier works)
- A [Google AI Studio](https://aistudio.google.com/) API key for Gemini

### 1. Clone & Install

```bash
git clone https://github.com/your-username/llp-agreement-generator.git
cd llp-agreement-generator
npm install
```

### 2. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

```env
# CLIENT-SIDE (exposed to browser -- public keys only)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# SERVER-SIDE ONLY (never prefix with NEXT_PUBLIC_)
GEMINI_API_KEY=your-gemini-api-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-random-secret          # openssl rand -hex 32
```

| Variable | Where to Get It | Exposed to Browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Settings > API | Yes (safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API | Yes (safe -- RLS enforced) |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Settings > API > service_role | No |
| `CRON_SECRET` | Self-generated (`openssl rand -hex 32`) | No |

### 3. Supabase Setup

Run these 4 SQL migrations **in order** in your Supabase Dashboard > **SQL Editor**:

```
supabase/migrations/001_rls_agreements.sql      # Agreements table + RLS + FK
supabase/migrations/002_storage_policies.sql     # Private storage bucket
supabase/migrations/003_audit_logs.sql           # Audit logging table
supabase/migrations/004_data_retention.sql       # Data retention function
```

All migrations are **idempotent** -- safe to run multiple times.

Then enable Email Auth: Supabase Dashboard > **Authentication** > **Providers** > ensure **Email** is enabled.

### 4. Vercel Deployment (Production)

Add all environment variables from `.env.local` to Vercel:

**Vercel Dashboard > Your Project > Settings > Environment Variables**

The `vercel.json` configures a daily cron job at 3:00 AM UTC for data retention cleanup.

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) -- you'll see the login page. Sign up, and you're in.

---

## How It Works

```
  User Message / Aadhaar Image
         |
         v
  +------+---------+     +----------------+     +-----------------+
  |  middleware.ts  |---->|  API Route     |---->|  Rate Limiter   |
  |  (session chk) |     |  (auth + Zod)  |     |  (20 req/hr)    |
  +----------------+     +----------------+     +--------+--------+
                                                         |
                          +----------------+     +-------v--------+
                          |  Gemini AI     |<----|  Build Prompt  |
                          |  (2.5 Flash)   |     |  (context)     |
                          +-------+--------+     +----------------+
                                  |
                          +-------v--------+     +----------------+
                          |  Validate      |---->|  Audit Log     |
                          |  AI Updates    |     |  (fire & forget)|
                          +-------+--------+     +----------------+
                                  |
                          +-------v--------+     +----------------+
                          |  Update State  |---->|  Live Preview  |
                          |  (React)       |     |  (re-render)   |
                          +-------+--------+     +----------------+
                                  |
                          +-------v--------+
                          |  Auto-Save     |
                          |  to Supabase   |
                          |  (1s debounce) |
                          +----------------+
```

1. **User sends a message** via the chat interface (text or Aadhaar image upload).
2. **Middleware** verifies the Supabase session server-side.
3. **API route** validates input with Zod, checks rate limits, verifies auth.
4. **Gemini AI** processes the message using a structured prompt with the current agreement state.
5. **Server-side validation** checks AI-generated updates (PAN, PIN, age, capital, percentages).
6. **Audit logger** records the action (user, IP, timestamp) to `audit_logs`.
7. **State updates** are applied to the React state, triggering a live preview re-render.
8. **Auto-save** persists changes to Supabase after a 1-second debounce (user-scoped).

---

## API Routes

| Endpoint | Method | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `/api/chat` | POST | Required | 20/hr | Sends user message + state to Gemini, returns AI response with updates |
| `/api/render-deed` | POST | Required | 60/hr | Renders LLP deed data into formatted HTML template |
| `/api/download-docx` | POST | Required | 30/hr | Generates and returns a `.docx` file from agreement data |
| `/api/download-pdf` | POST | Required | 30/hr | Generates a sanitized HTML page for PDF printing |
| `/api/cron/cleanup` | GET | CRON_SECRET | -- | Data retention: deletes expired agreements + audit logs |

All routes return `401` without valid auth, `400` on invalid input, `429` when rate limited.

---

## Agreement Sections Covered

The generated LLP deed includes all legally required sections per **Section 23(4) of the LLP Act, 2008**:

| # | Section |
|---|---|
| 1 | LLP Name & Registered Address |
| 2 | Partner Details (Name, DOB, Age, PAN, Aadhaar Address) |
| 3 | Capital Contributions & Proportions |
| 4 | Profit & Loss Sharing Ratios |
| 5 | Designated Partners & Managing Partners |
| 6 | Business Objectives (AI-generated) |
| 7 | Admission & Retirement of Partners |
| 8 | Death of a Partner & Succession |
| 9 | Transfer of Partnership Interest (ROFR) |
| 10 | Rights & Duties of Partners |
| 11 | Powers of Managing Partners |
| 12 | Meeting Procedures |
| 13 | Bank Account Authority |
| 14 | Remuneration |
| 15 | Loans (LLP-to-Partner & Partner-to-LLP) |
| 16 | Dispute Resolution (Arbitration) |
| 17 | Miscellaneous Provisions |
| 18 | Schedule 1 -- Ancillary Business |
| 19 | Schedule 2 -- Majority Resolution Matters |
| 20 | Witness & Signature Blocks |

---

## Security Audit Details

<details>
<summary><strong>Section 1: Row Level Security (RLS)</strong></summary>

- `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` on `agreements`
- 4 policies: SELECT, INSERT, UPDATE (with `WITH CHECK`), DELETE -- all scoped to `auth.uid() = user_id`
- `NOT NULL` constraint on `user_id`
- Foreign key to `auth.users(id)` with `ON DELETE CASCADE` (user deletion cascades to agreements)
- Migration: `001_rls_agreements.sql`

</details>

<details>
<summary><strong>Section 2: Environment Variables</strong></summary>

- Verified `GEMINI_API_KEY` is server-only (no `NEXT_PUBLIC_` prefix)
- Confirmed `.env.local` is in `.gitignore` and never committed
- Created `.env.example` as a safe-to-commit template
- Added `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` to env files

</details>

<details>
<summary><strong>Section 3: API Auth & IDOR Fixes</strong></summary>

**4 IDOR vulnerabilities found and fixed:**
- `dashboard/page.tsx` line 72: delete without `user_id` filter
- `dashboard/page.tsx` line 89: rename select without `user_id` filter
- `dashboard/page.tsx` line 92: rename update without `user_id` filter
- `LLPApp.tsx` line 77: auto-save upsert without `user_id` filter

**Server-side middleware created:**
- `middleware.ts` intercepts all protected routes (`/`, `/dashboard`, `/app`)
- Extracts Supabase session from cookies
- Verifies with `getUser()` (not `getSession()` -- prevents JWT tampering)
- Redirects to `/login` if invalid

</details>

<details>
<summary><strong>Section 4: Storage Infrastructure</strong></summary>

- Private `documents` bucket (public access OFF)
- 10MB file size limit
- 4 RLS policies scoped to `{user_id}/` folder paths
- Helper functions: `uploadFile()`, `getSignedDownloadUrl()` (5-min expiry), `deleteFile()`, `listUserFiles()`
- Migration: `002_storage_policies.sql`

</details>

<details>
<summary><strong>Section 5: Zod Input Validation</strong></summary>

Every API route validates with strict Zod schemas:
- `chatInputSchema` -- message (1-10K chars), step (0-20), data, files (max 5, base64)
- `llpDataSchema` -- numPartners (2-10), partners array, contributions, profits, addresses
- `pdfInputSchema` -- html (max 5MB), llpName (max 200 chars)
- Invalid input returns `400` with `parsed.error.flatten()` details

</details>

<details>
<summary><strong>Section 6: Rate Limiting</strong></summary>

In-memory sliding-window rate limiter (`src/lib/rateLimit.ts`):
- Per-user keying (`userId:routeName`)
- Chat: 20/hr, Render: 60/hr, DOCX: 30/hr, PDF: 30/hr
- Returns `429` with `Retry-After` header
- Periodic cleanup every 5 minutes to prevent memory leaks

</details>

<details>
<summary><strong>Section 7: Security Headers</strong></summary>

8 security headers added via `next.config.js`:

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Camera self, deny mic/geo/payment/usb |
| `Content-Security-Policy` | Full policy with Google Fonts + Supabase whitelisted |
| `X-XSS-Protection` | `1; mode=block` |
| `X-DNS-Prefetch-Control` | `off` |

</details>

<details>
<summary><strong>Section 8: Access Control Tests</strong></summary>

35+ manual test cases documented in `SECURITY_TESTS.md`:
- Authentication/middleware tests
- IDOR/RLS verification
- Zod validation edge cases
- Rate limiting threshold tests
- Security header verification
- Environment variable leak checks
- Storage security tests
- DPDP Act compliance checks
- Smoke test bash script included

</details>

<details>
<summary><strong>Section 9: Audit Logging</strong></summary>

- Immutable `audit_logs` table with `FORCE ROW LEVEL SECURITY`
- Service role can INSERT (bypasses RLS for logging)
- Users can SELECT their own logs (DPDP Act transparency)
- No UPDATE or DELETE policies (tamper-proof)
- Captures: user_id, action, resource_id, metadata, IP address, user-agent
- Fire-and-forget: audit failures never block API responses
- Migration: `003_audit_logs.sql`

</details>

<details>
<summary><strong>Section 10: Data Retention (DPDP Act)</strong></summary>

India's Digital Personal Data Protection Act compliance:
- `cleanup_expired_data()` PostgreSQL function
- Deletes agreements inactive for >30 days
- Deletes audit logs older than 90 days
- Self-logging: cleanup actions recorded in audit_logs
- Triggered via Vercel Cron Job daily at 3:00 AM UTC
- Protected by `CRON_SECRET` Bearer token
- Aadhaar images are **never stored** -- processed in-memory only
- `ON DELETE CASCADE` FK ensures user account deletion purges all data
- Migration: `004_data_retention.sql`

</details>

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server on `localhost:3000` |
| `npm run build` | Create production build |
| `npm run start` | Start production server |

---

## Roadmap

- [ ] Google OAuth & social login providers
- [ ] Email confirmation flow
- [ ] Agreement version history
- [ ] Multi-language support (Hindi, regional languages)
- [ ] E-signature integration
- [ ] Agreement comparison / diff view
- [ ] PDF template customization
- [ ] Bulk agreement generation
- [ ] Upstash Redis rate limiting (distributed)
- [ ] Supabase database trigger audit logging for dashboard CRUD

---

## License

This project is private and proprietary. All rights reserved.

---

<p align="center">
  Built with Next.js, Gemini AI, and Supabase.<br/>
  Hardened with a 10-layer security audit for DPDP Act compliance.
</p>
