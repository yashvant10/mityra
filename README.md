# TryOnX — AI Fashion Operating System

> The future of fashion technology. AI-powered virtual try-on, personal stylist, wardrobe management, and outfit recommendations — all in one cinematic platform.

---

## 🚀 Quick Start

### Frontend (Next.js 15)

```bash



cd frontend
cp .env.local.example .env.local  # Add your Firebase keys
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Backend (Express.js)

```bash
cd backend
cp .env.example .env  # Add your API keys
npm install
npm run dev
```

Server runs on [http://localhost:5000](http://localhost:5000)

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS v4 |
| UI Components | Shadcn UI, Motion (Framer Motion) |
| Backend | Node.js, Express.js, TypeScript |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| AI | OpenAI API (GPT-4o) |
| Image Storage | Cloudinary |
| Charts | Recharts |
| Icons | Lucide React |

---

## 📁 Project Structure

```
AI TRY ON X/
├── frontend/                   # Next.js 15 App
│   └── src/
│       ├── app/                # Route pages
│       │   ├── page.tsx        # Landing page
│       │   ├── (auth)/         # Login, Signup, Forgot Password
│       │   └── (dashboard)/    # All authenticated pages
│       ├── components/
│       │   ├── shared/         # Navbar, Footer, ParticleBackground
│       │   ├── landing/        # Landing page sections
│       │   ├── dashboard/      # Sidebar, dashboard components
│       │   └── ui/             # Shadcn UI components
│       ├── hooks/              # useAuth
│       ├── lib/                # Firebase client, utils
│       ├── types/              # TypeScript interfaces
│       └── styles/             # Global CSS
├── backend/                    # Express.js API
│   └── src/
│       ├── routes/             # API route handlers
│       ├── middleware/         # Auth, rate limiter, error handler
│       ├── services/           # Firebase, Cloudinary, OpenAI
│       ├── models/             # TypeScript types
│       ├── config/             # Firebase Admin, env config
│       └── ai/                 # AI prompt templates
└── README.md
```

---

## 🎨 Features (Phase 1 MVP)

1. **Landing Page** — Cinematic hero, AI showcase, features grid, pricing, testimonials
2. **Authentication** — Email/password, Google SSO, forgot password
3. **Dashboard** — Style score, analytics, quick actions, AI tips
4. **AI Stylist (ARIA)** — ChatGPT-style fashion advisor
5. **Virtual Try-On** — Upload photo + clothing → AI preview
6. **Smart Wardrobe** — Upload, categorize, filter, favorite items
7. **AI Recommendations** — Trending styles, personalized suggestions
8. **Profile** — Style preferences, color palette, stats
9. **Settings** — Profile, notifications, theme, AI preferences, privacy
10. **Pricing** — Free / Pro / Enterprise tiers with FAQ

---

## 🔑 Environment Variables

### Frontend (`.env.local`)

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Backend (`.env`)

```
PORT=5000
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
OPENAI_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
FRONTEND_URL=http://localhost:3000
```

---

## 📜 License

MIT
