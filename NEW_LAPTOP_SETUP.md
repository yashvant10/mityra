# New Laptop Setup Instructions

## 1. Extract the Project
Extract the `PROJECT_COMPLETE_BACKUP_2026-08-17.zip` file to your desired location (e.g., your Desktop or Documents folder).

## 2. Restore Environment Variables
The `.env` files contain sensitive keys and were NOT included in the zip file.
You must manually transfer the following files from your old laptop and place them in their respective directories:
- `frontend/.env.local`
- `backend/.env`
- `backend-python/.env`

*If you do not have them, use the `.env.example` file in the root directory as a template to recreate them.*

## 3. Restore SSH Keys (If using AWS)
Transfer the `.ssh_key.pem` and `.ssh_key2.pem` files securely from your old laptop to the root of the extracted folder.

## 4. Install Dependencies
You will need Node.js (v18+) and npm installed on your new machine.

Open a terminal and install frontend dependencies:
```bash
cd frontend
npm install
```

Open another terminal and install backend dependencies:
```bash
cd backend
npm install
```

*(Optional)* If you are running the Python backend locally, you need Python 3.10+ installed:
```bash
cd backend-python
pip install -r requirements.txt
```

## 5. Run the Application
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

The application will be available at `http://localhost:3001`.

## 6. Verify AWS Connection
If you are using the remote AWS EC2 instance for Virtual Try-On, verify that the `NEXT_PUBLIC_TRYON_BACKEND_URL` in `frontend/.env.local` is still pointing to the correct active IP address of your EC2 instance.

## 7. Continuing Development in Anti-Gravity IDE
Open the extracted project folder in Anti-Gravity IDE.
Read the `ANTIGRAVITY_CONTINUE_PROMPT.md` file and provide its contents as your first prompt to the AI assistant to resume work seamlessly.
