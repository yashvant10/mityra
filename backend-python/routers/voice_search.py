import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
from kws.inference import run_inference

router = APIRouter()

@router.post("")
async def voice_search(audio: UploadFile = File(...)):
    """
    KWS Endpoint: Takes an audio file and returns structured search criteria.
    Currently falls back to a model-not-trained warning since the KWS dataset
    and training pipeline have not yet been executed.
    """
    if not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio file")
        
    audio_bytes = await audio.read()
    
    # Run inference
    result = run_inference(audio_bytes, checkpoint_path=os.path.join(os.path.dirname(__file__), "..", "kws", "models", "kws_checkpoint.pt"))
    
    if not result:
        # Prompt explicitly requires a clear model-not-trained response rather than fake predictions.
        return {
            "error": "model_not_trained",
            "message": "The Voice Search (KWS) model has not been trained yet. Please provide a dataset and run the training pipeline."
        }
        
    return {
        "success": True,
        "data": result
    }
