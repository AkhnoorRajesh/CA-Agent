<div align="center">

<img src="src/assets/ca-logo.jpg" alt="CA Agent Logo" width="80" height="80" style="border-radius: 12px;" />

# CA Agent

### AI-Powered Chartered Accountant Assistant

An intelligent chat interface for professional accounting, taxation queries, and financial document analysis — powered by Google Gemini, Pinecone RAG, and n8n automation.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Database Schema](#-database-schema)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [n8n Workflow](#-n8n-workflow)
- [Screenshots](#-screenshots)

---

## 🧾 Overview

CA Agent is a full-stack, AI-driven chat application designed for Chartered Accountants and finance professionals. Users can ask natural language questions about Indian taxation, accounting standards, and financial compliance — or upload documents (invoices, PDFs, financial statements) for intelligent analysis.

The AI backend is entirely handled by an **n8n automation workflow** that integrates the **Google Gemini API** with a **Pinecone vector database** for retrieval-augmented generation (RAG), giving responses that are grounded in a curated CA knowledge base.

---

## ✨ Features

### 💬 AI Chat
- Ask accounting, taxation, and compliance questions in natural language
- Intelligent response formatting — handles plain text, structured JSON, and HTML output from the AI
- Responses rendered with safe HTML sanitization via **DOMPurify**

### 📁 Document Upload
- Attach multiple files per query (PDF, images, Word docs, TXT)
- Files are processed **sequentially** through the AI workflow for reliable results
- File metadata is stored per message for full conversation context

### 🎤 Voice Input & Read Aloud
- Voice-to-text query input via the browser's native **Web Speech API**
- Text-to-speech playback for AI responses

### 💾 Conversation Management
- Full chat history with per-conversation actions:
  - 📌 **Pin** important conversations to the top
  - 📦 **Archive** old conversations without deleting
  - ✏️ **Rename** conversations inline
  - 🔗 **Share** a conversation via a direct URL
  - 🗑️ **Delete** permanently
- Animated slide-in history panel (Framer Motion)

### 🔐 Authentication
- Email/password login & registration
- **Google OAuth** sign-in
- Supabase-managed sessions with auto-refresh

### 👤 User Profile
- Editable full name and avatar
- Account management page

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (React SPA)                       │
│                                                              │
│   ┌──────────┐  ┌─────────────┐  ┌────────────────────────┐ │
│   │ Sidebar   │  │ ChatHistory │  │     MessageList         │ │
│   │ (nav +    │  │ (pinned,    │  │ (bubble renderer,       │ │
│   │  profile) │  │  archived)  │  │  copy, read aloud)     │ │
│   └──────────┘  └─────────────┘  └────────────────────────┘ │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │                    QueryInput                         │  │
│   │        (text · file upload · voice input)             │  │
│   └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────┘
                            │  HTTP POST (FormData)
                            ▼
               ┌────────────────────────┐
               │    n8n Webhook         │
               │  ┌──────────────────┐  │
               │  │  Google Gemini   │  │
               │  │  (LLM Inference) │  │
               │  └────────┬─────────┘  │
               │           │ RAG        │
               │  ┌────────▼─────────┐  │
               │  │  Pinecone Vector │  │
               │  │  Database        │  │
               │  └──────────────────┘  │
               └────────────────────────┘
                            │
               ┌────────────────────────┐
               │  Supabase (PostgreSQL) │
               │  · profiles            │
               │  · conversations       │
               │  · messages            │
               └────────────────────────┘
```

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Frontend | React 18, TypeScript 5.8 |
| Build Tool | Vite 7 (SWC compiler) |
| Styling | Tailwind CSS 3.4, shadcn/ui (Radix UI) |
| Animations | Framer Motion 12 |
| Auth & Database | Supabase (PostgreSQL + RLS) |
| AI Backend | n8n (Google Gemini + Pinecone RAG) |
| Routing | React Router DOM v6 |
| Icons | Lucide React |
| Security | DOMPurify (XSS sanitization) |

---

## 🗄️ Database Schema

Three tables, all with **Row Level Security** enabled — users can only access their own data.

### `profiles`
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | References `auth.users` |
| `email` | text | User email |
| `full_name` | text | Display name |
| `avatar_url` | text | Profile picture URL |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated via trigger |

### `conversations`
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK) | Cascades on delete |
| `title` | text | First 50 chars of initial message |
| `is_pinned` | boolean | Default `false` |
| `is_archived` | boolean | Default `false` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated via trigger |

### `messages`
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `conversation_id` | UUID (FK) | Cascades on delete |
| `role` | text | `'user'` or `'assistant'` |
| `content` | text | Message text or JSON-stringified AI response |
| `files` | JSONB | Array of `{name, size, type}` metadata |
| `created_at` | timestamptz | |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)
- A [Supabase](https://supabase.com/) project
- A running [n8n](https://n8n.io/) instance with the CA Agent workflow imported

### Installation

```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd ca-agent

# 2. Install dependencies
npm install

# 3. Set up environment variables (see below)
cp .env.example .env

# 4. Start the development server
npm run dev
```

The app will be available at `http://localhost:8080`.

### Database Setup

Apply the Supabase migrations in order:

```bash
# Using Supabase CLI
supabase db push
```

Or run the SQL files manually in the Supabase SQL editor from `supabase/migrations/` in chronological order.

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance/webhook/ca-agent
```

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → Project Settings → API → `anon` key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase Dashboard → Project Settings → General |
| `VITE_N8N_WEBHOOK_URL` | Your n8n workflow's webhook trigger URL |

> **Important:** Never commit your `.env` file to version control. Add it to `.gitignore`.

### Available Scripts

```bash
npm run dev        # Start development server (port 8080)
npm run build      # Build for production
npm run build:dev  # Build in development mode
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
```

---

## 📁 Project Structure

```
ca-agent/
├── src/
│   ├── pages/
│   │   ├── Index.tsx          # Main chat page
│   │   ├── Auth.tsx           # Login & registration
│   │   ├── Account.tsx        # User profile settings
│   │   └── NotFound.tsx       # 404 page
│   │
│   ├── components/
│   │   ├── Sidebar.tsx        # Fixed navigation sidebar
│   │   ├── ChatHistory.tsx    # Conversation list panel
│   │   ├── QueryInput.tsx     # Chat input (text, files, voice)
│   │   ├── MessageList.tsx    # Message bubble renderer
│   │   ├── ProfileDropdown.tsx # User account menu
│   │   └── ui/                # shadcn/ui component library (49 components)
│   │
│   ├── hooks/
│   │   ├── useAuth.tsx        # Supabase auth state
│   │   ├── use-toast.ts       # Toast notifications
│   │   └── use-mobile.tsx     # Responsive breakpoint
│   │
│   ├── integrations/supabase/
│   │   ├── client.ts          # Supabase client
│   │   └── types.ts           # Auto-generated DB types
│   │
│   ├── lib/
│   │   └── utils.ts           # Tailwind class merger (cn)
│   │
│   ├── assets/
│   │   ├── ca-logo.jpg        # App logo
│   │   └── ca-logo-animation.mp4  # Logo animation
│   │
│   ├── App.tsx                # Route configuration
│   ├── main.tsx               # React entry point
│   └── index.css              # Global styles & design tokens
│
├── supabase/
│   └── migrations/            # PostgreSQL schema migrations
│
├── CA Agent workflow main.json  # n8n workflow export
├── CA Agent Knowledgebase.json  # RAG knowledge base configuration
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## ⚙️ n8n Workflow

The AI backend logic lives in `CA Agent workflow main.json` — import this into your n8n instance.

The workflow handles:
1. **Text queries** — Routes questions to Gemini with RAG context from Pinecone
2. **File uploads** — Parses documents and extracts relevant financial data
3. **Knowledge retrieval** — Searches the CA knowledge base (Indian taxation, accounting standards, compliance)

### Importing the Workflow

1. Open your n8n instance
2. Go to **Workflows → Import**
3. Upload `CA Agent workflow main.json`
4. Configure credentials (Google Gemini API key, Pinecone API key)
5. Activate the workflow and copy the webhook URL to your `.env`

---

## 🎨 Design System

The app uses a **premium dark theme** with glassmorphism:

- **Background**: Deep navy-blue (`hsl(225, 35%, 8%)`)
- **Primary accent**: Amber gold (`hsl(43, 96%, 56%)`) — professional CA brand identity
- **Glassmorphism**: `backdrop-blur` + translucent panels (`.glass-panel`, `.glass-panel-heavy`)
- **Animations**: Spring-physics via Framer Motion

---

## 📄 License

This project is for academic and demonstration purposes.

---

<div align="center">
  Built with ❤️ for the Chartered Accountancy community
</div>
