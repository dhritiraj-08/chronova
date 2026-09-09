# Chronova AI — Implementation Plan

## Overview
Build a full-stack AI-powered academic scheduling platform using Next.js 14 (App Router), Supabase, and OpenAI API. Dark mode, purple/blue glassmorphism aesthetic.

---

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: CSS Modules + vanilla CSS (dark theme, glassmorphism)
- **Backend**: Supabase (Auth + PostgreSQL)
- **AI**: OpenAI API (GPT-4o)
- **Hosting**: Vercel-ready
- **Fonts**: Inter (Google Fonts)

---

## MVP Pages (Phase 1)

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Hero, features, CTA |
| Login | `/login` | Email + Google auth |
| Signup | `/signup` | Onboarding form |
| Student Dashboard | `/dashboard` | Overview, today's schedule |
| Calendar | `/dashboard/calendar` | Weekly/daily drag-drop calendar |
| AI Chat | `/dashboard/chat` | Conversational AI scheduler |
| Analytics | `/dashboard/analytics` | Productivity charts |
| Institution Admin | `/admin` | Timetable + conflict management |

---

## Folder Structure

```
/app
  layout.js
  page.js (Landing)
  /login/page.js
  /signup/page.js
  /dashboard/
    layout.js
    page.js
    /calendar/page.js
    /chat/page.js
    /analytics/page.js
  /admin/page.js
  /api/
    /chat/route.js
    /schedule/route.js
/components
  Navbar.js
  Sidebar.js
  CalendarGrid.js
  ChatWindow.js
  ScheduleCard.js
  AnalyticsChart.js
  SubjectBadge.js
/lib
  supabase.js
  openai.js
/styles
  globals.css
  (CSS Modules per component)
```

---

## Proposed Changes

### Foundation
#### [NEW] `globals.css` — Design system: CSS variables, dark theme, glassmorphism utilities
#### [NEW] `app/layout.js` — Root layout with font, metadata
#### [NEW] `lib/supabase.js` — Supabase client
#### [NEW] `lib/openai.js` — OpenAI client helper

---

### Pages & Components
#### [NEW] `app/page.js` — Landing page: Hero, Features, How It Works, CTA
#### [NEW] `app/login/page.js` — Login with email/Google
#### [NEW] `app/signup/page.js` — Multi-step onboarding
#### [NEW] `app/dashboard/layout.js` — Sidebar + topbar shell
#### [NEW] `app/dashboard/page.js` — Today's schedule overview
#### [NEW] `app/dashboard/calendar/page.js` — Weekly calendar with drag-drop
#### [NEW] `app/dashboard/chat/page.js` — AI chat interface
#### [NEW] `app/dashboard/analytics/page.js` — Charts and productivity insights
#### [NEW] `app/admin/page.js` — Institution admin panel

---

### API Routes
#### [NEW] `app/api/chat/route.js` — OpenAI chat streaming endpoint
#### [NEW] `app/api/schedule/route.js` — AI schedule generation

---

## Verification Plan
- Run `npm run dev` after scaffolding
- Verify all pages render without errors
- Check responsive layout on mobile viewport
- Verify AI chat API route returns responses
