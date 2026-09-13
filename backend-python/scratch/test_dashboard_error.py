import asyncio
import os
import sys

# Insert backend directory into path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import dotenv
dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

async def diag():
    import time_patch
    from routers.admin import get_dashboard_stats
    try:
        print("Running get_dashboard_stats()...")
        res = await get_dashboard_stats()
        print("Success! Result keys:", res.keys())
    except Exception as e:
        import traceback
        print("Failed with exception:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(diag())
