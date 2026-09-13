# Environment Setup

This project requires environment variables across three different directories to function properly. 
Do NOT expose private values (keys, tokens, passwords) in public repositories. 
You must securely transfer the `.env.local` (frontend), `.env` (backend), and `.env` (backend-python) files from the old machine to the new machine.

## Required Variables (See `.env.example` for details)

### Frontend (`frontend/.env.local`)
- **Firebase config:** `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, etc.
- **API URLs:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_TRYON_BACKEND_URL` (points to the AWS backend or local Python backend)

### Backend Node (`backend/.env`)
- **Server:** `PORT`, `NODE_ENV`, `FRONTEND_URL`
- **Firebase Admin:** `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- **3rd Party APIs:** `CLOUDINARY_*`, `RAPIDAPI_KEY`, `HUGGINGFACE_TOKEN`, `GEMINI_API_KEY`
- **Other:** `FORCE_MOCK_FIREBASE`

### Backend Python (`backend-python/.env`)
- **Firebase Admin:** `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- **Server:** `PORT`, `BACKEND_BASE_URL`
- **3rd Party APIs:** `CLOUDINARY_*`, `RAPIDAPI_KEY`, `HUGGINGFACE_TOKEN`, `GEMINI_API_KEY`, `REPLICATE_API_TOKEN`
- **DB/Auth/Cache:** `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET`, `REDIS_URL`

## Secure Transfer
1. Zip up the `.env` files separately if necessary.
2. Place them in their respective folders (`frontend/`, `backend/`, `backend-python/`) before running the servers.
3. Ensure the `NEXT_PUBLIC_TRYON_BACKEND_URL` and `BACKEND_BASE_URL` are correct for your new environment (e.g., if you are running the backend locally or still relying on the AWS EC2 instance).
