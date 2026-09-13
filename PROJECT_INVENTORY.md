# Project Inventory

## Overview
This is a full-stack fashion web application consisting of a Next.js frontend, a Node.js backend, and a Python backend for AI integrations (CatVTON virtual try-on, Gemini/HuggingFace API).

## Directory Structure
- `frontend/` - Next.js (React) frontend application.
  - `src/app/` - Application routes (Auth, Dashboard, Try-on, Stylist, Wardrobe, Profile, Pricing, etc.).
  - `src/components/` - React components (Sidebar, TopNav, Logo, etc.).
  - `src/hooks/` - Custom React hooks (`useAuth`).
  - `src/lib/` - Utilities and API config (`firebase.ts`, `tryonApi.ts`).
  - `public/` - Images, videos, fonts, icons, manifest.
- `backend/` - Node.js Express API.
  - `src/routes/` - API routes (auth, try-on, users).
  - `src/services/` - Integration services (Firebase, Gemini, RapidAPI, HuggingFace).
- `backend-python/` - Python API (FastAPI) for advanced model integrations.
  - `catvton_files/` - Virtual Try-On specific files, pipelines, and server wrappers.
  - Models, processing scripts, dependencies (`requirements.txt`).
- `tools/` - Standalone scripts for node and python installations (Node/Python).

## Key Files
- `frontend/next.config.ts`, `frontend/tailwind.config.ts`, `frontend/package.json` - Frontend build setup.
- `backend/package.json`, `backend/tsconfig.json` - Node backend setup.
- `backend-python/requirements.txt` - Python backend dependencies.
- `firestore.rules`, `firestore.indexes.json` - Firebase database security and indexing configuration.
- `.env.example`, `.env`, `.env.local` - Environment variables.
- `.ssh_key.pem`, `.ssh_key2.pem` - SSH keys for AWS backend connection.

## Current Features
- **User Authentication:** Firebase Auth (Email/Password, Google).
- **Dashboard:** Personalized recommendations, trends, credits system.
- **AI Virtual Try-On (CatVTON):** Try on clothing virtually. Integrates with AWS EC2 GPU instance for processing.
- **AI Style Match:** Upload a photo, set preferences, get Gemini AI-driven style advice and RapidAPI product recommendations.
- **Shopping Integration:** Fetches real products from Amazon, Myntra, Flipkart, Ajio via RapidAPI.
- **Wardrobe/Favorites:** Save outfits and favorite products to Firebase Firestore.
- **Profile:** Manage user preferences (skin tone, body type, sizes).
- **Pricing:** Subscription and credit packages.

## Unfinished / Next Features
- Frontend UI/UX improvement and premium fashion design refinements.
- Product search filtering and discovery flow improvements.
- Mobile experience enhancements.
