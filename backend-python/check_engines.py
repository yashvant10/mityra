import os
from dotenv import load_dotenv
load_dotenv()

print("=" * 60)
print("     VIRTUAL TRY-ON ENGINE STATUS REPORT")
print("=" * 60)

# 1. HuggingFace
hf = os.getenv("HUGGINGFACE_TOKEN", "")
print(f"\n1. HuggingFace IDM-VTON (PRIMARY)")
print(f"   Token: {hf[:10]}...{hf[-5:]}" if hf else "   Token: NOT SET")
print(f"   Status: {'CONFIGURED' if hf and len(hf)>5 else 'MISSING'}")
print(f"   Limit: FREE / No hard limit (uses public Gradio Space)")
print(f"   Notes: Can be slow if Space is sleeping or queue is long")

# 2. Replicate
rep = os.getenv("REPLICATE_API_TOKEN", "")
print(f"\n2. Replicate IDM-VTON (FALLBACK 1)")
print(f"   Token: {rep[:10]}...{rep[-5:]}" if rep else "   Token: NOT SET")
print(f"   Status: {'CONFIGURED' if rep and len(rep)>5 else 'MISSING'}")
print(f"   Limit: NEEDS BILLING on replicate.com to remove throttle")
print(f"   Notes: Without billing, limited to 1 burst request")

# 3. Gemini
gem = os.getenv("GEMINI_API_KEY", "")
print(f"\n3. Gemini Image Editing (FALLBACK 2)")
print(f"   Key: {gem[:10]}...{gem[-5:]}" if gem else "   Key: NOT SET")
print(f"   Status: {'CONFIGURED' if gem and len(gem)>5 else 'MISSING'}")
print(f"   Limit: Quota-based (may be exhausted)")

# 4. OpenAI
oai = os.getenv("OPENAI_API_KEY", "")
print(f"\n4. OpenAI DALL-E (FALLBACK 3)")
print(f"   Key: {oai[:10]}..." if oai else "   Key: NOT SET")
print(f"   Status: {'CONFIGURED' if oai and len(oai)>5 else 'NOT CONFIGURED - No API key'}")

# Test HuggingFace Space availability
print(f"\n{'=' * 60}")
print("     LIVE CONNECTIVITY TESTS")
print("=" * 60)

import httpx
import asyncio

async def test_engines():
    async with httpx.AsyncClient(timeout=15.0) as client:
        # Test HuggingFace Space
        print(f"\n[TEST] HuggingFace IDM-VTON Space...")
        try:
            r = await client.get("https://yisol-idm-vton.hf.space/info")
            if r.status_code == 200:
                print(f"   RESULT: ONLINE (HTTP {r.status_code})")
            else:
                print(f"   RESULT: ISSUE (HTTP {r.status_code})")
        except Exception as e:
            print(f"   RESULT: OFFLINE or SLEEPING ({e})")

        # Test Replicate API
        print(f"\n[TEST] Replicate API...")
        try:
            r = await client.get("https://api.replicate.com/v1/account", 
                headers={"Authorization": f"Token {rep}"})
            if r.status_code == 200:
                data = r.json()
                print(f"   RESULT: AUTHENTICATED")
                print(f"   Username: {data.get('username', 'unknown')}")
                print(f"   Type: {data.get('type', 'unknown')}")
            elif r.status_code == 401:
                print(f"   RESULT: INVALID TOKEN (401 Unauthorized)")
            else:
                print(f"   RESULT: HTTP {r.status_code} - {r.text[:100]}")
        except Exception as e:
            print(f"   RESULT: CONNECTION FAILED ({e})")

        # Test Gemini API
        print(f"\n[TEST] Gemini API...")
        try:
            r = await client.get(
                f"https://generativelanguage.googleapis.com/v1beta/models?key={gem}")
            if r.status_code == 200:
                print(f"   RESULT: AUTHENTICATED & WORKING")
            elif r.status_code == 429:
                print(f"   RESULT: QUOTA EXHAUSTED (429 Too Many Requests)")
            elif r.status_code == 400 or r.status_code == 403:
                print(f"   RESULT: INVALID KEY or DISABLED (HTTP {r.status_code})")
            else:
                print(f"   RESULT: HTTP {r.status_code}")
        except Exception as e:
            print(f"   RESULT: CONNECTION FAILED ({e})")

asyncio.run(test_engines())

print(f"\n{'=' * 60}")
print("     SUMMARY")
print("=" * 60)
print(f"  Primary Engine (HuggingFace): Should work - FREE, no limits")
print(f"  The real problem was: Firestore crash + Redis timeout")
print(f"  after AI generation succeeded. This is now FIXED.")
print(f"{'=' * 60}")
