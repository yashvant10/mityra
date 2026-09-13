# Current Technology Stack Audit

## 1. FRONTEND
- **Frontend framework:** Next.js
- **Framework version:** 16.2.6 (App Router)
- **Programming language:** TypeScript
- **UI library:** React 19.2.4
- **CSS/styling system:** Tailwind CSS v4
- **Component library:** shadcn/ui, @base-ui/react, lucide-react
- **Animation library:** Framer Motion (`motion` package), `tw-animate-css`
- **State management:** React Context & Hooks (e.g., `useAuth` custom hook)
- **Routing:** Next.js App Router (`src/app`)
- **Build tool:** Next.js compiler
- **Package manager:** npm
- **API client:** Axios and native `fetch`
- **Authentication technology:** Firebase Authentication SDK (`firebase`)
- **Database/client SDK:** Firebase SDK for Firestore

## 2. BACKEND
This project utilizes a dual-backend architecture.

A. **PRIMARY/ACTIVE (Node.js/Express):**
- **Technology:** Node.js, Express, TypeScript.
- **Role:** Acts as the primary API gateway and orchestrator. It handles authentication verification (Firebase Admin), rate limiting, Cloudinary asset uploads, routing external API calls (RapidAPI/Gemini/OpenAI), and proxies heavy AI requests to the Python backend.

B. **SECONDARY/ACTIVE (Python/FastAPI):**
- **Technology:** Python, FastAPI, Uvicorn.
- **Role:** Dedicated AI inference server. It handles the heavy computational load for the CatVTON virtual try-on model, DensePose masking, and image processing.

C. **ONLY PRESENT IN FILES / NOT ACTUALLY USED:**
- The Python backend contains extensive manual scraping scripts (`flipkart_search.html`, `test_scrape_*.py`) that appear to be experimental or legacy alternatives to the active RapidAPI implementation in the Node backend.

## 3. AI / VIRTUAL TRY-ON
- **AI model:** CatVTON (Category-level Virtual Try-On Network)
- **Python framework:** FastAPI (with Uvicorn)
- **Inference pipeline:** HuggingFace `diffusers` (`CatVTONPipeline`), PyTorch (`torch`)
- **Image processing libraries:** Pillow (`PIL`), `pillow_avif`, `pillow_heif`, `numpy`
- **Masking libraries:** `DensePose`, `SCHP`
- **GPU requirements:** Nvidia Tesla T4 (utilizing FP16 mixed precision, `enable_mem_efficient_sdp(True)`)
- **API endpoint:** `POST /api/tryon`
- **Frontend → Backend communication:** The frontend sends base64 image data to the Node.js proxy (`/api/tryon/generate`), which forwards the multipart request to the Python FastAPI endpoint. The resulting base64 image is relayed back to the frontend.

## 4. AWS
- **AWS service:** EC2 Instance
- **EC2 configuration:** Tesla T4 16GB GPU instance
- **Operating system:** Linux (Ubuntu implied by systemd usage)
- **Server process:** `systemd` running a `catvton.service`
- **API server:** FastAPI running via Uvicorn
- **How frontend connects to it:** The frontend connects via the public IP defined in `NEXT_PUBLIC_TRYON_BACKEND_URL` in `.env.local`.
- **SSH Key:** `tryit-key6.pem`

## 5. DATABASE / AUTH
- **Authentication:** Firebase Auth (Client SDK on frontend, Firebase Admin on Node.js backend for JWT validation).
- **Database:** Cloud Firestore (`firestore.rules` and `firestore.indexes.json` present).
- **Storage:** Cloudinary (configured in the Node.js backend for image hosting) and Firebase Storage.
- **User Data:** Stored in Firestore profiles, initialized upon login.
- **Sessions:** Stateless JWT tokens issued by Firebase.

## 6. SHOPPING / API
- **Amazon, Flipkart, Myntra, Ajio:**
  - **IMPLEMENTED:** RapidAPI is actively used in the Node.js backend to fetch multi-store product data for the "Trending" and "AI Recommendations" dashboards.
- **Meesho:**
  - **PARTIAL:** Addressed in Python scrapers but not fully integrated into the live frontend RapidAPI feed.
- **Product search:**
  - **IMPLEMENTED:** Global search UI is present in `/discover`, querying the active catalog via API.
- **Product URL processing:**
  - **PLANNED / MOCKUP:** The feature to paste a raw product URL and extract images (`ProductUrlInput.tsx`) is currently just a frontend UI mockup without backend extraction logic implemented.
