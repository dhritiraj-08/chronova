# Chronova AI — Project Walkthrough

## ✅ Build Complete

The full Chronova AI platform is built and running at **http://localhost:3000**

---

## 🚀 How to Run

```bash
# The dev server is already running. To start it again anytime:
cd "c:\Chronova ai\chronova-ai"
npm run dev
```

---

## 🔑 Before Using AI Features — Add Your API Keys

Edit [.env.local](file:///c:/Chronova%20ai/chronova-ai/.env.local) and replace the placeholders:

```env
# 1. Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-real-key-here

# 2. Create a free project at https://supabase.com
#    Then go to: Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

> [!IMPORTANT]
> The app runs and looks perfect without keys. AI chat will show a friendly error message until you add your OpenAI key.

---

## 🗄️ Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) → Create a new project
2. Go to **SQL Editor** → **New Query**
3. Paste the entire contents of [schema.sql](file:///c:/Chronova%20ai/chronova-ai/supabase/schema.sql)
4. Click **Run** — all 10 tables + RLS policies will be created
5. Go to **Authentication** → **Providers** → Enable **Google** (for Google login)

---

## 📁 File Structure Created

```
c:\Chronova ai\chronova-ai\
├── app/
│   ├── page.tsx                    ← Landing page
│   ├── layout.tsx                  ← Root layout (fonts, metadata)
│   ├── globals.css                 ← Full design system
│   ├── (auth)/
│   │   ├── layout.tsx             ← Centered card layout
│   │   ├── login/page.tsx         ← Email + Google login
│   │   ├── signup/page.tsx        ← Registration
│   │   └── onboarding/page.tsx    ← 4-step setup wizard
│   ├── (app)/
│   │   ├── layout.tsx             ← Sidebar + Navbar shell
│   │   ├── dashboard/page.tsx     ← Main dashboard
│   │   ├── calendar/page.tsx      ← Weekly/daily calendar
│   │   ├── chat/page.tsx          ← AI chat interface
│   │   ├── analytics/page.tsx     ← Charts & insights
│   │   ├── settings/page.tsx      ← User settings
│   │   └── admin/
│   │       ├── page.tsx           ← Institution overview
│   │       ├── timetable/page.tsx ← Full timetable grid
│   │       ├── teachers/page.tsx  ← Teacher management
│   │       └── classes/page.tsx   ← Batches & classrooms
│   └── api/
│       ├── chat/route.ts                          ← OpenAI streaming
│       ├── schedule/generate/route.ts             ← AI schedule gen
│       ├── schedule/reschedule/route.ts           ← Dynamic reschedule
│       └── institution/generate-timetable/route.ts ← AI timetable
├── components/layout/
│   ├── Sidebar.tsx                ← Collapsible sidebar
│   └── Navbar.tsx                 ← Top bar with user menu
├── lib/
│   ├── supabase/client.ts         ← Browser Supabase client
│   ├── supabase/server.ts         ← Server Supabase client
│   ├── scheduling/prompts.ts      ← AI prompt templates
│   ├── scheduling/engine.ts       ← Rules-based scheduler
│   └── utils.ts                   ← Shared utilities
├── supabase/schema.sql            ← Complete DB schema
├── middleware.ts + proxy.ts       ← Route protection
└── .env.local                     ← API keys (you fill in)
```

---

## 🗺️ Pages at a Glance

| URL | Page | Key Feature |
|---|---|---|
| `/` | Landing Page | Hero, features, testimonials, CTA |
| `/signup` | Sign Up | Email + Google OAuth |
| `/login` | Sign In | Email + Google OAuth |
| `/onboarding` | Setup Wizard | 4-step profile + subject config |
| `/dashboard` | Student Dashboard | Stats, today's schedule, AI tip |
| `/calendar` | Calendar | Week/day view, add/edit sessions |
| `/chat` | AI Chat | Streaming GPT-4o assistant |
| `/analytics` | Analytics | 5 charts + goal progress |
| `/admin` | Institution Panel | AI timetable generator |
| `/admin/timetable` | Full Timetable | 5-day color-coded grid |
| `/admin/teachers` | Teachers | Add/manage availability |
| `/admin/classes` | Classes & Rooms | Batches + classrooms |
| `/settings` | Settings | Profile, sleep, notifications |

---

## 🎨 Design Highlights

- **Color palette**: Purple/blue gradients (`#7c3aed` → `#3b82f6`)
- **Glassmorphism**: Semi-transparent cards with backdrop blur
- **Animated background**: Subtle radial gradient orbs
- **Typography**: Inter (body) + Outfit (headings)
- **Animations**: `slideUp`, `fadeIn`, `float`, `shimmer`
- **Live indicator**: Red dot on calendar showing current time

---

## 🤖 AI Features

| Feature | Endpoint | Model |
|---|---|---|
| Chat assistant | `POST /api/chat` | GPT-4o (streaming) |
| Schedule generation | `POST /api/schedule/generate` | GPT-4o (JSON mode) |
| Dynamic rescheduling | `POST /api/schedule/reschedule` | GPT-4o (JSON mode) |
| Institution timetable | `POST /api/institution/generate-timetable` | GPT-4o (JSON mode) |

---

## 🔮 Future Enhancements (Already Architected For)

- Voice assistant integration
- Google Calendar sync
- Push notifications (service worker)
- Parent dashboard
- Gamification / streak system
- Competitive exam modes
- Multi-language support
