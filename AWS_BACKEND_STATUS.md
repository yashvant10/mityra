# AWS Backend Status

## Overview
The virtual try-on core functionality relies on a HuggingFace space or an AWS EC2 instance running a Tesla T4 GPU with the CatVTON model.

## Current Setup
- **Architecture:** The Next.js frontend sends requests to the Node.js backend (`/api/tryon/generate`). The Node.js backend forwards this to the GPU provider (AWS EC2 or HuggingFace) depending on environment variables.
- **Python Backend (Local/Remote):** The `backend-python/` directory contains the FastAPI server (`catvton_files/api.py`, `app.py`) and pipeline scripts (`pipeline.py`). If running locally, you need a capable GPU. If deploying to AWS, these files are run on the EC2 instance.
- **Model:** CatVTON (Category-level Virtual Try-On Network).
- **Resolution:** Generally optimized for 512x768 or 768x1024 depending on VRAM limits.
- **Inference Settings:** Uses `diffusers` pipeline. Requires `torch` and `xformers`.

## Connection Details
- The `.ssh_key.pem` and `.ssh_key2.pem` files in the root directory are used to connect to the AWS instance.
- The `NEXT_PUBLIC_TRYON_BACKEND_URL` in `frontend/.env.local` points to the public IP of the EC2 instance (e.g., `http://44.220.126.206:8000`).
- The `HUGGINGFACE_TOKEN` in `backend/.env` is used for fallback or proxying protected image results.

## Frontend -> API Relationship
1. Frontend calls `POST /api/tryon/generate` with base64 images of the person and garment.
2. Node Backend calls the Python FastAPI endpoint (e.g., `http://44.220.126.206:8000/api/tryon`).
3. Python FastAPI returns a base64 result or a URL.
4. Node Backend proxies the result back to the frontend.

## Reconnecting
1. Ensure the AWS EC2 instance is running.
2. Verify the public IP of the EC2 instance hasn't changed. If it has, update `NEXT_PUBLIC_TRYON_BACKEND_URL` in `frontend/.env.local`.
3. SSH into the instance using the provided `.pem` keys if you need to restart the Python FastAPI server (`uvicorn api:app --host 0.0.0.0 --port 8000`).
