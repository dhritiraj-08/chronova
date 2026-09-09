# 🌌 Chronova AI

**Chronova AI** is a premium, AI-powered academic scheduling and productivity platform designed for students and educational institutions. Built with a gorgeous, dark-themed glassmorphism interface styled after high-end physical desk planners, Chronova AI helps users balance study loads, manage cognitive energy, protect sleep cycles, and design optimized learning routines.

---

## ✨ Features

### 🎓 For Students (AI Study Coach & Planner)
* **Tactile Setup Wizard**: Interactive onboarding that captures your courses, difficulty levels, target goals, sleep schedule, and university classes.
* **Rules-Based & AI Scheduling**: Automatically constructs optimized, conflict-free schedules with integrated breaks to prevent study burnout.
* **Interactive Weekly Calendar**: A dynamic weekly grid featuring live indicators, current time tracker, and easy session creation.
* **AI Study Coach**: A conversational assistant powered by Google Gemini (`gemini-1.5-flash`) that acts as an academic mentor, provides cognitive fatigue advice, and assists in rescheduling missed tasks.
* **Productivity Analytics**: Full suite of metrics and visualizations covering subject difficulty distribution, target vs. completed study hours, and weekly progress charts.

### 🏫 For Institutional Admins (Timetable Manager)
* **AI-Guided Timetable Generation**: Programmatic generation of weekly class grids mapped to subjects, teachers, and classrooms.
* **Conflict Prevention**: Embedded validation checks for teacher availability and room capacity.
* **Teacher & Class Databases**: Easy CRUD interfaces for adding teachers, linking subjects, and specifying classroom layouts.

---

## 🛠️ Technology Stack

* **Frontend & Framework**: Next.js 16 (App Router, Turbopack) & React 19
* **Styling**: Tailwind CSS v4 & custom HSL/CSS design tokens
* **State Management**: Zustand
* **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Trigger Functions)
* **AI Models**: Google Gemini API (`gemini-1.5-flash` for low-latency chat streaming)
* **Data Visualization**: Recharts

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js** (v18.x or newer recommended)
* **Supabase Account** (for Auth and PostgreSQL)
* **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))

### Installation Steps

1. **Navigate to the application folder**:
   ```bash
   cd chronova-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the environment variables template and fill in your keys:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your actual Supabase URL, keys, and Gemini API key:
   ```env
   GEMINI_API_KEY=AIzaSy...
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   ```

4. **Set Up the Supabase Database**:
   * Create a new project in your [Supabase Dashboard](https://supabase.com).
   * Open the **SQL Editor** → click **New Query**.
   * Copy the full contents of the database schema file [supabase/schema.sql](file:///c:/Chronova%20ai/chronova-ai/supabase/schema.sql) and paste it into the editor.
   * Click **Run** to generate the tables, Row Level Security (RLS) policies, and user triggers.

5. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your web browser to access the app!

---

## 📁 Project Directory Layout

```
chronova-ai/
├── app/
│   ├── page.tsx                    # Landing Page (Hero, Features, Showcase)
│   ├── layout.tsx                  # Root HTML shell & Font definitions
│   ├── globals.css                 # Primary design system, typography & variables
│   ├── (auth)/                     # Auth routes (Login, Signup, Setup Onboarding)
│   ├── (app)/                      # Core app features (Dashboard, Calendar, Chat, Analytics)
│   └── api/                        # Next.js Serverless Route Handlers
├── components/
│   ├── layout/                     # Shell UI components (Navbar, Sidebar)
│   └── ...                         # Feature cards & presentation widgets
├── lib/
│   ├── scheduling/                 # Hard constraints engine & prompt designs
│   ├── supabase/                   # Supabase client wrappers (server/client/admin)
│   └── utils.ts                    # General helper functions
├── public/                         # Static assets (logos, icons)
└── supabase/
    └── schema.sql                  # PostgreSQL database migrations & policies
```

---

## 🔒 Security (RLS & Policies)

All database tables in Supabase have **Row Level Security (RLS)** active by default. Users can only access, modify, or view their own private study records, profiles, and chats:
* **Profiles**: Users can read/write their own records using `auth.uid() = id`.
* **Schedules & Sessions**: Scope limited to `auth.uid() = user_id`.
* **Admin Controls**: Only institutional administrators associated with their respective `institution_id` can modify batch, teacher, and classroom tables.

---

## 💡 Fail-Safe Offline Engines

To ensure a seamless user experience, Chronova AI is built with robust fallback handlers:
* **Gemini Offline Mode**: If your `GEMINI_API_KEY` is not configured, the AI Chat window gracefully shifts to a friendly local simulation mode, letting users interact with the app without crashing.
* **Deterministic Scheduler**: Core scheduling and timetable calculations are processed client-side via our rules-based compiler in [lib/scheduling/engine.ts](file:///c:/Chronova%20ai/chronova-ai/lib/scheduling/engine.ts). This makes schedule generation instant and completely independent of external AI service availability.

---

## 📦 Production Readiness

To verify that the application compiles without warnings or errors, you can run:
```bash
npm run build
```
The codebase uses strict TypeScript checks, PostCSS styling compilers, and ESLint configurations. The build outputs a highly optimized static bundle ready to deploy on platforms like **Vercel** or **Netlify**.
