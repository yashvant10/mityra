import asyncio
import time_patch  # noqa
from services import firebase_service
from services import cloudinary_service

async def test_delete():
    # Let's create a dummy wardrobe item
    from firebase_config import db
    item_ref = db.collection("wardrobe").document()
    item_id = item_ref.id
    item_ref.set({
        "userId": "some_other_user_id",
        "name": "Intruder Shirt",
        "imageUrl": "http://example.com/intruder.jpg"
    })
    print(f"Created dummy item: {item_id}")
    
    try:
        # Now replicate the logic of DELETE /api/wardrobe/{item_id}
        # under the user "verification_test_user@look.ai" (which is different from "some_other_user_id")
        user_id = "UMTtBp1dpvZJyoQ4uw9yT1Zt5nO2" # uid from the failed test
        
        print("Fetching item...")
        item = await firebase_service.get_wardrobe_item(item_id)
        print(f"Item found: {item}")
        
        if not item:
            print("Not found")
            return
            
        if item.get("userId") != user_id:
            print("Forbidden (Expected 403 behavior)")
            # In the API, this raises HTTPException(status_code=403, detail="Forbidden")
            # But wait, why did the API return 500? Let's check if there is an exception in the actual code block:
            # Let's run it step-by-step
            
        print("Checking if it owned by user...")
        # What happens if we do own it?
        # Let's see if we delete it
        # await firebase_service.delete_wardrobe_item(item_id)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        item_ref.delete()
        print("Deleted dummy item from DB")

asyncio.run(test_delete())
