import os
import sys

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase Admin
if not firebase_admin._apps:
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY")

    try:
        # Prefer explicit service-account credentials from env vars
        if project_id and client_email and private_key:
            # .env files often escape newlines as literal "\n" — restore them
            private_key = private_key.replace("\\n", "\n")

            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": project_id,
                "private_key": private_key,
                "client_email": client_email,
                "token_uri": "https://oauth2.googleapis.com/token",
            })
            firebase_admin.initialize_app(cred)
            print("Firebase Admin initialized using env-var service account credentials.")
        else:
            # Fallback: Application Default Credentials (requires gcloud ADC)
            cred = credentials.ApplicationDefault()
            options = {}
            if project_id:
                options["projectId"] = project_id
            firebase_admin.initialize_app(cred, options)
            print("Firebase Admin initialized using ADC.")

    except Exception as e:
        print(f"Failed to initialize Firebase Admin: {e}", file=sys.stderr)

try:
    db = firestore.client()
except Exception as e:
    print(
        f"Warning: Could not initialize Firestore client. "
        f"Firestore will be unavailable. Error: {e}",
        file=sys.stderr,
    )
    db = None

auth = firebase_auth

# Flag used by cloudinary_service and admin router to short-circuit
# real API calls when running without credentials.
is_mock = os.getenv("FORCE_MOCK_FIREBASE", "false").lower() == "true"
