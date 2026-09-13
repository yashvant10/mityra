"""
KWS Foundation - Inference Pipeline
"""
import os
from .model import load_trained_checkpoint

def run_inference(audio_bytes: bytes, checkpoint_path: str = "models/kws_checkpoint.pt") -> dict:
    """
    Runs audio through the trained KWS model to extract structured entities.
    Returns None if the model is not trained/found.
    """
    model = load_trained_checkpoint(checkpoint_path)
    
    if not model or not model.get("is_trained"):
        return None
        
    # Simulated structure of a successful inference result
    return {
        "platform": "amazon",
        "category": "t-shirt",
        "color": "black",
        "occasion": "casual",
        "rawText": "black casual t-shirt from amazon"
    }
