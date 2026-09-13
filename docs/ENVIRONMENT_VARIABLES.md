# MITYRA / TRYONX — Environment Variables Reference Guide

> **Security Notice:** This document contains technical definitions, usage locations, and architectural requirements for all environment variables in MITYRA. **No real credentials, tokens, or secret keys are stored in this document.**

---

## Master Inventory Table

| Variable Name | Service | Exposure | Status | Purpose & Consumption Location |
|---|---|---|---|---|
| `NODE_ENV` | Global | Private | **Required** | Defines application mode (`development` / `production`). Used across Node backend and Next.js. |
| `APP_NAME` | Global | Public/Private | Optional | Human-readable app name (`MITYRA`). Default: `MITYRA`. |
| `APP_VERSION` | Global | Public/Private | Optional | Application semantic version (`1.0.0`). |
| `PORT` | Node Backend | Private | **Required** | Port for Node.js Express server (`5001`). Used in `backend/src/config/index.ts`. |
| `PYTHON_PORT` | Python Backend | Private | **Required** | Port for Python FastAPI inference server (`8000`). Used in `backend-python/main.py`. |
| `NEXT_PUBLIC_APP_URL` | Frontend | **Public** | **Required** | Public URL of frontend app (`http://localhost:3000`). Used for OAuth redirects. |
| `FRONTEND_URL` | Node Backend | Private | **Required** | Allowed origin for backend CORS policy (`http://localhost:3001`). Used in `backend/src/index.ts`. |
| `NEXT_PUBLIC_API_URL` | Frontend | **Public** | **Required** | Primary Node.js API base URL (`http://localhost:5001/api`). Used in `tryonApi.ts`, `adminApi.ts`, `wardrobeApi.ts`. |
| `BACKEND_BASE_URL` | Node / Python | Private | **Required** | Internal server loopback URL (`http://127.0.0.1:5001`). Used for internal webhook/service calls. |
| `ADMIN_EMAIL` | Node Backend | Private | **Required** | Master administrator login email. Used in `backend/src/routes/adminDashboard.ts`. |
| `ADMIN_PASSWORD` | Node Backend | **Secret** | **Required** | Master administrator password. Used in `backend/src/routes/adminDashboard.ts`. |
| `ADMIN_USERNAME` | Python Backend | Private | Optional | Python admin username. Used in `backend-python/routers/admin.py`. |
| `ADMIN_PASSWORD_HASH` | Python Backend | **Secret** | Optional | Bcrypt hashed admin password. Used in `backend-python/security_utils.py`. |
| `DATABASE_URL` | Node / Python | **Secret** | Optional | PostgreSQL connection string with SSL mode (`postgresql://user:pass@host:5432/db`). |
| `DIRECT_URL` | Node / Python | **Secret** | Optional | Non-pooled direct database connection URL for schema migrations (Prisma/Drizzle). |
| `REDIS_URL` | Backend / Python | **Secret** | Optional | Upstash/Redis connection string for Celery background tasks and rate-limiting. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Frontend | **Public** | **Required** | Firebase web client API key. Used in `frontend/src/lib/firebase.ts`. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Frontend | **Public** | **Required** | Firebase auth domain (`project.firebaseapp.com`). Used in `frontend/src/lib/firebase.ts`. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Frontend | **Public** | **Required** | Firebase project identifier. Used in `frontend/src/lib/firebase.ts`. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Frontend | **Public** | **Required** | Firebase Cloud Storage bucket. Used in `frontend/src/lib/firebase.ts`. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Frontend | **Public** | **Required** | Firebase Cloud Messaging sender ID. Used in `frontend/src/lib/firebase.ts`. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Frontend | **Public** | **Required** | Firebase web application ID. Used in `frontend/src/lib/firebase.ts`. |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Frontend | **Public** | Optional | Google Analytics measurement ID for Firebase. |
| `FIREBASE_PROJECT_ID` | Node / Next Server | Private | **Required** | Server-side Firebase Admin project ID. Used in `backend/src/config/firebase.ts`, `api/tryon/secure`. |
| `FIREBASE_CLIENT_EMAIL` | Node / Next Server | Private | **Required** | Firebase Admin service account email. Used in `backend/src/config/firebase.ts`, `api/tryon/secure`. |
| `FIREBASE_PRIVATE_KEY` | Node / Next Server | **Secret** | **Required** | RSA private key for Firebase Admin authentication. Used for validating user tokens. |
| `FORCE_MOCK_FIREBASE` | Node Backend | Private | Optional | Set to `true` during offline unit testing to bypass Firebase authentication. |
| `AWS_ACCESS_KEY_ID` | AWS Cloud | **Secret** | Optional | IAM Access Key ID for managing AWS resources (EC2, S3). |
| `AWS_SECRET_ACCESS_KEY` | AWS Cloud | **Secret** | Optional | IAM Secret Access Key for managing AWS resources. |
| `AWS_REGION` | AWS Cloud | Private | Optional | AWS deployment region (`us-east-1`, `ap-south-1`). |
| `AWS_S3_BUCKET_NAME` | AWS Cloud | Private | Optional | S3 bucket name for long-term archival of high-res generated try-on imagery. |
| `AWS_EC2_GPU_INSTANCE_IP` | AWS Cloud | Private | **Required** | Public IPv4 address of the EC2 GPU instance running CatVTON (`44.220.126.206`). |
| `NEXT_PUBLIC_VTO_BACKEND_URL` | Frontend | **Public** | **Required** | GPU Backend endpoint for health checks (`http://44.220.126.206:8000`). Used in `/api/tryon/health`. |
| `VTO_BACKEND_URL` | Next Server / Node | Private | **Required** | Secure server-side target for `/api/tryon/secure` forwarding. Used in `route.ts`. |
| `VTO_TIMEOUT_MS` | Frontend / Node | Private | **Required** | GPU inference HTTP timeout (`75000` = 75 seconds). Used in `tryonApi.ts` and `route.ts`. |
| `CATVTON_MODEL_PATH` | Python Backend | Private | **Required** | Hugging Face repo path for CatVTON weights (`zhengchong/CatVTON`). |
| `BASE_DIFFUSION_MODEL` | Python Backend | Private | **Required** | Base inpainting backbone (`runwayml/stable-diffusion-inpainting`). |
| `KWS_API_URL` | Frontend / Node | Private | Optional | Keyword Spotting / Voice search endpoint (`http://localhost:5001/api/kws`). |
| `KWS_MODEL_PATH` | Node / Python | Private | Optional | Path to local landmarker/keyword detection task (`pose_landmarker.task`). |
| `KWS_CONFIDENCE_THRESHOLD` | Node / Python | Private | Optional | Minimum confidence score for voice/gesture recognition (`0.75`). |
| `SCRAPINGDOG_API_KEY` | Node Backend | **Secret** | **Required** | ScrapingDog proxy key for bypassing e-commerce CAPTCHAs. Used in `scraperService.ts`. |
| `JINA_READER_URL` | Node Backend | Private | **Required** | Public reader service for bypassing Akamai/Cloudflare 403 blocks (`https://r.jina.ai`). |
| `RAPIDAPI_KEY` | Node Backend | **Secret** | **Required** | Primary RapidAPI key for real-time e-commerce product search. Used in `rapidapiService.ts`. |
| `REACT_APP_RAPIDAPI_KEY` | Node Backend | **Secret** | Optional | Fallback alias for `RAPIDAPI_KEY`. |
| `REACT_APP_SEARCH_HOST` | Node Backend | Private | Optional | RapidAPI search host (`real-time-product-search.p.rapidapi.com`). |
| `QUICKCOMMERCE_API_KEY` | Node Backend | **Secret** | Optional | QuickCommerce catalog API key. Used in `quickCommerceService.ts`. |
| `AMAZON_AFFILIATE_TAG` | Node Backend | Private | Optional | Amazon Associates tracking ID for buy-button monetization (`tag=...`). |
| `AMAZON_RAPIDAPI_HOST` | Node Backend | Private | Optional | RapidAPI host for Amazon ASIN lookups (`real-time-amazon-data.p.rapidapi.com`). |
| `FLIPKART_AFFILIATE_ID` | Node Backend | Private | Optional | Flipkart affiliate partner ID. |
| `FLIPKART_AFFILIATE_TOKEN` | Node Backend | **Secret** | Optional | Flipkart affiliate API token. |
| `MYNTRA_AFFILIATE_ID` | Node Backend | Private | Optional | Myntra affiliate tracking identifier. |
| `AJIO_AFFILIATE_ID` | Node Backend | Private | Optional | AJIO affiliate tracking identifier. |
| `AJIO_IMAGE_CDN_BASE` | Node Backend | Private | Optional | AJIO high-res image CDN base domain (`https://assets-jiocdn.ajio.com`). |
| `MEESHO_AFFILIATE_ID` | Node Backend | Private | Optional | Meesho affiliate tracking identifier. |
| `OPENAI_API_KEY` | Node / Python | **Secret** | Optional | OpenAI API key for conversational fashion advice. Used in `backend/src/config/index.ts`. |
| `OPENAI_MODEL` | Node / Python | Private | Optional | OpenAI model selection (`gpt-4o`). |
| `HUGGINGFACE_TOKEN` | Node / Python | **Secret** | Optional | Hugging Face User Access Token for downloading private models and IDM-VTON spaces. |
| `REPLICATE_API_TOKEN` | Node / Python | **Secret** | Optional | Replicate API token used as a fallback try-on engine. Used in `replicateService.ts`. |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Frontend | **Public** | **Required** | Public Razorpay key ID for client-side checkout modal. Used in `payment.tsx`. |
| `RAZORPAY_KEY_ID` | Node / Next Server | Private | **Required** | Server-side Razorpay key ID. Used in `backend/src/routes/payments.ts`. |
| `RAZORPAY_KEY_SECRET` | Node / Next Server | **Secret** | **Required** | Razorpay secret for generating orders and verifying HMAC signatures. |
| `RAZORPAY_WEBHOOK_SECRET` | Node / Next Server | **Secret** | Optional | Secret key for verifying incoming Razorpay payment webhooks. |
| `INITIAL_FREE_CREDITS` | Node Backend | Private | **Required** | Starting credit balance awarded to newly registered users (`5`). |
| `CREDIT_COST_PER_TRYON` | Node Backend | Private | **Required** | Credits deducted per successful virtual try-on render (`1`). |
| `JWT_SECRET` | Node / Python | **Secret** | **Required** | Secret key for signing admin and internal session JWTs. |
| `RATE_LIMIT_WINDOW_MS` | Node Backend | Private | Optional | Express rate-limit window in milliseconds (`900000` = 15 minutes). |
| `RATE_LIMIT_MAX_REQUESTS` | Node Backend | Private | Optional | Maximum allowed requests per IP per window (`100`). |
| `CLOUDINARY_CLOUD_NAME` | Node / Python | Private | **Required** | Cloudinary cloud name for uploaded person photos. Used in `config/index.ts`. |
| `CLOUDINARY_API_KEY` | Node / Python | **Secret** | **Required** | Cloudinary API key. Used in `config/index.ts`. |
| `CLOUDINARY_API_SECRET` | Node / Python | **Secret** | **Required** | Cloudinary API secret. Used in `config/index.ts`. |
| `GEMINI_API_KEY` | Node / Python | **Secret** | **Required** | Google Gemini 2.5 Flash key for face shape and skin undertone analysis. |

---

## Architectural Rules for Environment Variables

### 1. Client vs. Server Exposure
* Any variable accessed in the browser MUST start with `NEXT_PUBLIC_`.
* **NEVER** prefix database credentials, AWS secrets, Razorpay secrets, or Firebase private keys with `NEXT_PUBLIC_`.

### 2. Multi-Store Scraper Integrity
* `JINA_READER_URL` (`https://r.jina.ai`) is used directly by `scraperService.ts` to bypass Akamai Bot Manager (`403 Forbidden`) on AJIO and Myntra.
* `RAPIDAPI_KEY` is strictly constrained by variant and ID matching so candidates with mismatched colors (e.g. blue instead of beige) are rejected.

### 3. VTO Inference Timeout
* Diffusion inference on GPU requires up to 18 seconds under heavy load. Ensure `VTO_TIMEOUT_MS` is set to at least `75000` (75s) across both client and server proxies.
