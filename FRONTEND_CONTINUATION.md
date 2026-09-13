# Frontend Continuation

## Existing Setup
- **Framework:** Next.js 14+ (App Router).
- **Styling:** Tailwind CSS with a custom "Warm Ivory, Pearl White, Champagne, Soft Rose, Espresso" color palette. Avoid generic neo-brutalism or purple AI gradients.
- **Routing:**
  - `/(auth)/login`, `/(auth)/signup`, `/(auth)/forgot-password` (Authentication pages)
  - `/(dashboard)/dashboard` (Main hub, stats, recommendations, trending)
  - `/(dashboard)/ai-style-match` (3-step wizard for free AI styling based on Gemini + RapidAPI)
  - `/(dashboard)/try-on` (CatVTON virtual try-on studio interface)
  - `/(dashboard)/stylist` (AI Stylist chat interface)
  - `/(dashboard)/wardrobe`, `/(dashboard)/saved-outfits`, `/(dashboard)/favorites`
  - `/(dashboard)/profile`, `/(dashboard)/settings`
  - `/(dashboard)/pricing` (Credits & Subscriptions)
- **Components:**
  - `src/components/dashboard/Sidebar.tsx` (Main navigation)
  - `src/components/dashboard/TopNav.tsx` (Top bar, credit display)
  - `src/components/shared/Logo.tsx`
- **UI System:**
  - Employs `motion/react` (Framer Motion) for micro-interactions and route transitions.
  - Buttons have hover scaling and gradient backgrounds.
  - Cards feature soft shadows (`shadow-[0_2px_16px_rgba(0,0,0,0.03)]`) and subtle borders.
- **API Calls:**
  - Utilizes `src/lib/tryonApi.ts` for interacting with the backend.
  - RapidAPI calls are routed through the backend (`/api/tryon/products`) rather than direct frontend fetching.
  - Uses `Promise.allSettled` in `dashboard/page.tsx` for parallel store fetching.

## Existing Flows
- **Virtual Try-On:** User uploads a person image, selects/uploads a garment, and the frontend polls the backend (which hits AWS/CatVTON) for the result.
- **Shopping/Recommendations:** Fetches real products. Includes 'Heart' button to save to favorites, 'Try On' to pipe the product image into the try-on studio, and 'Shop' to open external affiliate links.
- **AI Style Match:** Upload photo -> Select Occasion/Style/Budget -> Backend Gemini Analysis -> Backend RapidAPI Fetch -> Display personalized products.

## Next Redesign Targets
- **Refinement of Cards:** The product cards in the dashboard and style match need a more premium "fashion editorial" feel (e.g., hover-to-reveal sizing/brand details, smoother image fallbacks).
- **Mobile Navigation:** The bottom tab bar on mobile needs polish to match the desktop sidebar's feature set cleanly.
- **Loading States:** Replace standard spinners with custom fashion-themed skeletons or subtle iridescent sweeps across the entire app.
- **Search Experience:** Add a global search bar or dedicated discovery page with robust filtering by category, color, and price.
