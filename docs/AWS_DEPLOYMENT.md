# MITYRA Native VTO AWS Deployment Guide

This guide details the exact steps for deploying the MITYRA Python FastAPI backend and the Native VTO model to an AWS GPU instance.

## 1. AWS Infrastructure Provisioning

1.  **Launch EC2 Instance:**
    *   **Instance Type:** `g6e.xlarge` (NVIDIA L40S GPU)
    *   **AMI:** Deep Learning OSS Nvidia Driver AMI — *Must be suitable for the L40S architecture.*
    *   **EBS Storage:** Min 150GB `gp3` (Models are large).
2.  **Elastic IP:**
    *   Allocate a new Elastic IP and associate it with your EC2 instance so the domain/IP doesn't change on reboot.
3.  **Security Group:**
    *   Open Port `22` (SSH) — limit to your IP if possible.
    *   Open Port `80` (HTTP)
    *   Open Port `443` (HTTPS)
    *   Open Port `8000` (FastAPI)

## 2. Server Environment Setup

SSH into your new instance:
```bash
ssh -i mityra-key.pem ubuntu@<your-elastic-ip>
```

Update system and install dependencies:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y redis-server python3-venv git
```

Start Redis:
```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

## 3. Clone and Setup MITYRA Python Backend

```bash
git clone <your-repo-url> mityra
cd mityra/backend-python

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

## 4. Download Native VTO Models (IDM-VTON)
Create the models directory and download the required weights (e.g., from HuggingFace).
```bash
mkdir -p models/idm-vton
# Download weights into models/idm-vton
```

## 5. Environment Variables
Create the `.env` file in `backend-python/`:
```bash
cp .env.example .env
nano .env
```
Ensure `REDIS_URL=redis://localhost:6379/0` and `ENV=production`.

## 6. Running as Systemd Services (Survives Reboot)

We need both FastAPI and Celery to run continuously in the background.

### FastAPI Service
`sudo nano /etc/systemd/system/fastapi.service`
```ini
[Unit]
Description=MITYRA FastAPI VTO Service
After=network.target redis-server.service

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/mityra/backend-python
ExecStart=/home/ubuntu/mityra/backend-python/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

### Celery Worker Service
`sudo nano /etc/systemd/system/celery.service`
```ini
[Unit]
Description=MITYRA Celery Worker
After=network.target redis-server.service

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/mityra/backend-python
ExecStart=/home/ubuntu/mityra/backend-python/.venv/bin/celery -A celery_worker.celery_app worker --loglevel=info -c 2
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start services:
```bash
sudo systemctl enable fastapi celery
sudo systemctl start fastapi celery
```

## 7. Connect MITYRA Node Backend
In your Node.js `.env` (or Vercel dashboard), add:
`AWS_VTO_URL=http://<your-elastic-ip>:8000`

The Node backend will now automatically route Try-On requests to your Native AWS GPU instance first!
