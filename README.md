<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3FCF8E?style=for-the-badge&logo=supabase" />
  <img src="https://img.shields.io/badge/Gemini%20AI-Powered-4285F4?style=for-the-badge&logo=google" />
</p>

<h1 align="center">📄 Deed AI — LLP Agreement Generator</h1>

<p align="center">
  <strong>AI-powered conversational tool that drafts legally compliant LLP Partnership Deeds for India</strong><br/>
  Built with Next.js 15, Google Gemini AI, Supabase, and a split-screen real-time editor.
</p>

---

## ✨ Features

### 🤖 AI-Powered Drafting
- **Conversational Interface** — A step-by-step chat assistant that collects partner details, capital contributions, profit-sharing ratios, business objectives, and more through natural conversation.
- **Google Gemini Integration** — Uses `gemini-2.0-flash` to intelligently parse user responses, validate inputs, and generate structured updates to the LLP agreement.
- **Aadhaar OCR** — Upload an image of an Aadhaar card and the AI extracts partner details (name, address, DOB) automatically.
- **Smart Suggestions** — Quick-select option buttons and checkboxes for common inputs like number of partners, Indian states, and designated partner selection.
- **Business Objective Generation** — AI generates comprehensive business objectives tailored to your industry.

### 📝 Live Document Preview
- **Split-Screen Editor** — Chat on the left, live deed preview on the right — updates in real time as you answer questions.
- **Template-Based Rendering** — Professional LLP deed format compliant with Section 23(4) of the LLP Act, 2008.
- **Missing Field Indicators** — See exactly which fields still need to be filled, with a collapsible badge panel.
- **Inline Editing** — Toggle edit mode to manually tweak the generated deed directly in the preview.
- **Undo/Revert** — Click the undo button on any of your past messages to revert the document to that point in time.

### 📥 Export Options
- **PDF Download** — Generates a print-ready PDF with proper formatting and page layout.
- **DOCX Download** — Creates a Microsoft Word document for further editing and legal review.
- **Copy to Clipboard** — One-click copy of the entire deed text.

### 🔐 Authentication & User Management
- **Supabase Auth** — Email/password sign-up and sign-in with session management.
- **Route Protection** — Unauthenticated users are automatically redirected to the login page.
- **Row Level Security** — Each user can only access, modify, and delete their own agreements.

### 📊 Dashboard
- **Agreement Management** — View all your past LLP agreements in a card-based dashboard.
- **Progress Tracking** — Visual progress bars showing completion percentage for each agreement.
- **Rename Agreements** — Click the pencil icon to rename any agreement inline.
- **Search & Filter** — Instantly search agreements by name.
- **Create / Continue / Delete** — Full CRUD operations on your agreements.

### ✅ Input Validation
- **AI-Level Validation** — The AI prompt instructs Gemini to validate PAN numbers, PIN codes, ages (18–100), capital amounts (≥ ₹1,000), profit percentages (must sum to 100%), partner names, LLP names (must end with "LLP"), and valid Indian states.
- **Server-Side Validation** — API route validates all AI-generated updates before applying them, catching any invalid data.

### 🌗 Dark / Light Mode
- **Theme Toggle** — Sun/moon button in the header of every page.
- **60+ CSS Variables** — Complete theming system with smooth `.3s` transitions.
- **System Preference Detection** — Auto-detects your OS dark/light preference on first visit.
- **Persistent** — Your theme choice is saved in `localStorage`.

### ⏳ Loading States & Animations
- **Skeleton Loaders** — Shimmer cards on the dashboard while agreements are loading.
- **Fade-In Animations** — Chat messages and agreement cards animate in smoothly.
- **Slide-Up Effects** — Login card and empty states slide up on mount.
- **Card Hover** — Agreement cards lift with enhanced shadow on hover.
- **Typing Indicator** — Animated dots while the AI is thinking.

### 📱 Mobile Responsive
- **Tab-Based Layout** — Chat and Preview switch via a bottom tab bar on mobile.
- **Responsive Dashboard** — Single-column grid on small screens.
- **Touch-Friendly** — All buttons and inputs are sized for touch interaction.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript 5.9](https://www.typescriptlang.org/) |
| **UI** | [React 19](https://react.dev/) + Inline Styles + CSS Variables |
| **AI** | [Google Gemini 2.0 Flash](https://ai.google.dev/) (`@google/generative-ai`) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL + Row Level Security) |
| **Auth** | [Supabase Auth](https://supabase.com/docs/guides/auth) (Email/Password) |
| **Document Export** | [`docx`](https://www.npmjs.com/package/docx) (DOCX) + Server-side HTML → PDF |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Styling** | CSS Variables + [Tailwind CSS 4](https://tailwindcss.com/) (utility layer) |

---

## 📁 Project Structure

```
llp-final/
├── app/
│   ├── api/
│   │   ├── chat/              # Gemini AI chat endpoint with validation
│   │   ├── render-deed/       # Server-side deed HTML rendering
│   │   ├── download-docx/     # DOCX file generation
│   │   ├── download-pdf/      # PDF generation via HTML
│   │   └── generate-objectives/ # AI business objective generation
│   ├── dashboard/             # Agreement management dashboard
│   ├── login/                 # Authentication page
│   ├── globals.css            # CSS variables, animations, responsive breakpoints
│   ├── layout.tsx             # Root layout with Auth + Theme providers
│   └── page.tsx               # Main app entry (auth-gated)
├── src/
│   ├── components/
│   │   ├── AuthProvider.tsx    # Supabase auth context
│   │   ├── ThemeProvider.tsx   # Dark/light mode context
│   │   ├── LLPApp.tsx         # Main app orchestrator
│   │   ├── ChatPanel.tsx      # Conversational AI interface
│   │   └── DocumentPanel.tsx  # Live deed preview & export
│   ├── lib/
│   │   ├── gemini.ts          # Gemini AI client initialization
│   │   ├── supabase.ts        # Supabase client initialization
│   │   ├── prompts.ts         # AI system prompt & question flow
│   │   ├── deed-template.ts   # LLP deed HTML template engine
│   │   └── validation.ts      # Input validation functions
│   └── types/
│       └── index.ts           # TypeScript interfaces & helpers
├── .env.local                 # Environment variables (not committed)
├── package.json
├── tsconfig.json
└── next.config.js
```

---

## 🚀 Getting Started

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

Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Supabase Setup

#### Create the `agreements` table

Run this SQL in your Supabase Dashboard → **SQL Editor**:

```sql
CREATE TABLE agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data JSONB DEFAULT '{}',
  step TEXT DEFAULT 'num_partners',
  is_done BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agreements_user_id ON agreements(user_id);
```

#### Enable Row Level Security

```sql
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own agreements"
  ON agreements FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agreements"
  ON agreements FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agreements"
  ON agreements FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agreements"
  ON agreements FOR DELETE USING (auth.uid() = user_id);
```

#### Enable Email Auth

Go to Supabase Dashboard → **Authentication** → **Providers** → ensure **Email** is enabled.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see the login page. Sign up, and you're in!

---

## 📸 Screenshots

### Light Mode — Dashboard
The main dashboard showing all your LLP agreements with progress tracking, search, and rename.

### Dark Mode — Dashboard
Full dark theme support with smooth transitions.

### Chat Interface
Split-screen with AI chat on the left and live deed preview on the right.

### Login Page
Clean, branded authentication page with sign-in/sign-up toggle.

---

## 🔄 How It Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User Chat  │────▶│  Gemini AI   │────▶│  Validation  │
│   Message    │     │  Processing  │     │  Layer       │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌──────────────┐     ┌───────▼──────┐
                     │  Live Deed   │◀────│  State       │
                     │  Preview     │     │  Update      │
                     └──────────────┘     └───────┬──────┘
                                                  │
                     ┌──────────────┐     ┌───────▼──────┐
                     │  Supabase    │◀────│  Auto-Save   │
                     │  Database    │     │  (1s delay)  │
                     └──────────────┘     └──────────────┘
```

1. **User sends a message** via the chat interface (text or Aadhaar image).
2. **Gemini AI processes** the message using a structured prompt with the current agreement state.
3. **Validation layer** checks AI-generated updates (PAN, PIN, age, capital, etc.) server-side.
4. **State updates** are applied to the agreement data model.
5. **Live preview** re-renders the deed template in real time.
6. **Auto-save** persists changes to Supabase after a 1-second debounce.

---

## 📜 Agreement Sections Covered

The generated LLP deed includes all legally required sections:

| # | Section |
|---|---|
| 1 | LLP Name & Registered Address |
| 2 | Partner Details (Name, DOB, Age, PAN, Aadhaar, Address) |
| 3 | Capital Contributions & Proportions |
| 4 | Profit & Loss Sharing Ratios |
| 5 | Designated Partners |
| 6 | Business Objectives |
| 7 | Duration & Financial Year |
| 8 | Dispute Resolution (Arbitration) |
| 9 | Rights & Duties of Partners |
| 10 | Indemnification Clauses |
| 11 | Admission & Retirement of Partners |
| 12 | Dissolution Provisions |
| 13 | Schedule 1 — Business Objectives |
| 14 | Witness & Signature Blocks |

---

## 🛠️ API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/chat` | POST | Sends user message + current state to Gemini, returns AI response with updates |
| `/api/render-deed` | POST | Renders LLP deed data into formatted HTML template |
| `/api/download-docx` | POST | Generates and returns a `.docx` file from agreement data |
| `/api/download-pdf` | POST | Generates a print-ready HTML page for PDF saving |
| `/api/generate-objectives` | POST | AI-generates business objectives for a given industry |

---

## 🔐 Security

- **Row Level Security (RLS)** — Users can only access their own agreements at the database level.
- **Server-Side Validation** — All AI-generated data is validated before being returned to the client.
- **Environment Variables** — API keys are stored in `.env.local` and never exposed to the client (except public Supabase keys).
- **Auth-Gated Routes** — All application routes redirect to `/login` if unauthenticated.

---

## 📦 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server on `localhost:3000` |
| `npm run build` | Create production build |
| `npm run start` | Start production server |

---

## 🗺️ Roadmap

- [ ] Google OAuth & social login providers
- [ ] Email confirmation flow
- [ ] Agreement version history
- [ ] Multi-language support (Hindi, regional languages)
- [ ] E-signature integration
- [ ] Agreement comparison / diff view
- [ ] PDF template customization
- [ ] Bulk agreement generation

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

<p align="center">
  Built with ❤️ using <strong>Next.js</strong>, <strong>Gemini AI</strong>, and <strong>Supabase</strong>
</p>
