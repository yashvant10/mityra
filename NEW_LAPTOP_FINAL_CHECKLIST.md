# New Laptop Migration Checklist

Follow these exact steps to restore the project on your new laptop and continue development in Anti-Gravity IDE without losing progress.

## 1. Extract the Project
- Unzip `PROJECT_FINAL_BACKUP_2026-08-17.zip` to your desired workspace (e.g., `Documents/update-all-in-fashion-APP-main`).

## 2. Restore Private Environment Files
Transfer these files securely from your old laptop (they were intentionally excluded from the ZIP):
- Copy `frontend/.env.local` to `frontend/.env.local`
- Copy `backend/.env` to `backend/.env`
- Copy `backend-python/.env` to `backend-python/.env`

*(If you lose them, refer to the `.env.example` file in the root directory to recreate the required keys).*

## 3. Restore AWS SSH Key
Securely transfer the AWS EC2 SSH key:
- Copy `tryit-key6.pem` to the root directory (or your preferred secure `~/.ssh` location).
- **Important:** Ensure the file retains strict permissions (e.g., `chmod 400 tryit-key6.pem` on Mac/Linux) to connect to AWS.

## 4. Install Dependencies
**Frontend:**
```bash
cd frontend
npm install
```

**Node.js Backend:**
```bash
cd backend
npm install
```

**Python Backend (Local):** *(Only if you plan to run the CatVTON pipeline locally instead of on AWS)*
```bash
cd backend-python
pip install -r requirements.txt
```

## 5. Verify Configuration
- Check `frontend/.env.local` to ensure `NEXT_PUBLIC_TRYON_BACKEND_URL` is pointing to the correct AWS instance IP.
- Ensure the AWS instance is started and running before testing Virtual Try-On.

## 6. Run the Application
Start the Node.js backend:
```bash
cd backend
npm run dev
```

Start the Next.js frontend:
```bash
cd frontend
npm run dev
```

## 7. Open Anti-Gravity IDE
- Open the root folder in the IDE.
- Open `ANTIGRAVITY_CONTINUE_PROMPT.md` and read it. Provide its contents as your first prompt to the AI to seamlessly resume work.
