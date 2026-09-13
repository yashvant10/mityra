import asyncio
import os
import sys

# Insert backend directory into path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Load dotenv
import dotenv
dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

async def test():
    import time_patch
    from services import huggingface_service
    
    # Valid unsplash images
    user_img = "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=500&h=700&q=80"
    garment_img = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=500&h=700&q=80"
    
    print("Running HuggingFace tryon...")
    try:
        res = await huggingface_service.run_huggingface_tryon_from_urls(user_img, garment_img, "A white t-shirt")
        print("Success! Result URL length:", len(res))
        print("Result URL prefix:", res[:100])
    except Exception as e:
        import traceback
        print("Failed with exception:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
