import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from typing import Dict, Any, Optional, List
from middleware.auth_middleware import get_current_user
from services import firebase_service, openai_service

router = APIRouter()

# POST /api/ai/chat — Send message to AI stylist
@router.post("/chat")
async def chat_stylist_endpoint(body: Dict[str, Any], user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        message = body.get("message")
        conversation_id = body.get("conversationId")
        history = body.get("history") or []
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
            
        user_message = {
            "role": "user",
            "content": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        messages_list = history + [user_message]
        
        # Call openai_service chatWithStylist
        ai_response = await openai_service.chat_with_stylist(messages_list)
        
        assistant_message = {
            "role": "assistant",
            "content": ai_response,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Save or update conversation
        if conversation_id:
            await firebase_service.update_chat(conversation_id, messages_list + [assistant_message])
        else:
            chat_data = {
                "userId": user_id,
                "messages": [user_message, assistant_message],
                "createdAt": datetime.utcnow().isoformat(),
                "updatedAt": datetime.utcnow().isoformat()
            }
            conversation_id = await firebase_service.save_chat(chat_data)
            
        return {
            "message": ai_response,
            "conversationId": conversation_id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"AI chat error: {str(e)}")
        
        error_message = "Failed to get AI response"
        status_code = 500
        
        api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
        if not api_key:
            status_code = 401
            error_message = "OpenAI API Key is missing or unconfigured. Please add your key in the backend .env file."
        elif "quota" in str(e).lower() or "billing" in str(e).lower():
            status_code = 429
            error_message = "OpenAI API quota exceeded. Please check your billing dashboard or usage limits."
        elif "rate limit" in str(e).lower():
            status_code = 429
            error_message = "AI rate limit exceeded. Please wait a moment before trying again."
            
        raise HTTPException(status_code=status_code, detail=error_message)

# GET /api/ai/history — Get chat history
@router.get("/history")
async def get_chat_history_endpoint(limit: int = 20, cursor: Optional[str] = None, paginated: bool = Query(False), user = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        chats, nextPageToken = firebase_service.get_chat_history_paginated(user_id, limit, cursor)
        if paginated:
            return {
                "chats": chats,
                "nextPageToken": nextPageToken
            }
        return {"chats": chats}
    except Exception as e:
        print(f"Chat history error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch chat history")

# POST /api/ai/body-measurement — TEMPORARILY DISABLED for beta launch.
# Body measurement calculations were not providing visible improvement in garment fitting.
# Will be re-enabled with an improved measurement model post-beta.
@router.post("/body-measurement")
async def body_measurement_endpoint(
    image: UploadFile = File(...),
    user = Depends(get_current_user)
):
    """Body measurement feature temporarily disabled for beta launch."""
    raise HTTPException(
        status_code=503,
        detail="Body measurement feature is temporarily disabled for the beta launch. It will be re-enabled with an improved measurement model."
    )

