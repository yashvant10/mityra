# -*- coding: utf-8 -*-
"""
Test script to verify real Firebase Firestore connection works
after applying the time_patch module.
"""
import os
import sys

# Load env first
from dotenv import load_dotenv
load_dotenv()

# Force real Firebase for this test
os.environ["FORCE_MOCK_FIREBASE"] = "false"

print("=" * 60)
print("  Look.ai Real Firebase Connection Test")
print("=" * 60)

# Import time_patch (auto-applies)
print("\n--- Step 1: Applying Time Patch ---")
import time_patch

# Now import Firebase
print("\n--- Step 2: Initializing Real Firebase ---")
try:
    import firebase_admin
    from firebase_admin import credentials, firestore

    project_id = os.getenv("FIREBASE_PROJECT_ID")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY")

    if not project_id or not client_email or not private_key:
        print("ERROR: Missing Firebase credentials in .env")
        sys.exit(1)

    print(f"  Project ID: {project_id}")
    print(f"  Client Email: {client_email[:20]}...")

    private_key_formatted = private_key.replace("\\n", "\n")

    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": project_id,
        "private_key": private_key_formatted,
        "client_email": client_email,
        "token_uri": "https://oauth2.googleapis.com/token",
    })

    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    print("  Firestore client initialized successfully!")

    # Test 1: Simple query
    print("\n--- Step 3: Testing Firestore Query ---")
    print("  Querying 'users' collection (limit 3)...")
    users_ref = db.collection("users")
    docs = list(users_ref.limit(3).stream())
    print(f"  SUCCESS! Found {len(docs)} documents.")

    for doc in docs:
        data = doc.to_dict()
        print(f"    - Doc ID: {doc.id}")
        # Print a few fields if available
        for key in list(data.keys())[:3]:
            val = str(data[key])[:50]
            print(f"      {key}: {val}")

    # Test 2: Write a test document
    print("\n--- Step 4: Testing Firestore Write ---")
    from datetime import datetime
    test_ref = db.collection("_connection_test").document("test_ping")
    test_ref.set({
        "timestamp": datetime.utcnow().isoformat(),
        "status": "connected",
        "source": "time_patch_test"
    })
    print("  SUCCESS! Test document written to '_connection_test/test_ping'")

    # Read it back
    print("\n--- Step 5: Testing Firestore Read Back ---")
    snapshot = test_ref.get()
    if snapshot.exists:
        print(f"  SUCCESS! Read back: {snapshot.to_dict()}")
    else:
        print("  WARNING: Document not found after write")

    # Clean up
    test_ref.delete()
    print("  Cleaned up test document.")

    print("\n" + "=" * 60)
    print("  ALL TESTS PASSED - Real Firebase is working!")
    print("=" * 60)

except Exception as e:
    print(f"\n  FAILED: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
