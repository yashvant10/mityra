import os
import openai
from openai import OpenAI
from ai_prompts import STYLIST_SYSTEM_PROMPT

# Lazy initialize OpenAI client
_client = None

def get_openai_client():
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        _client = OpenAI(api_key=api_key)
    return _client

async def chat_with_stylist(messages: list, user_preferences: str = None) -> str:
    client = get_openai_client()
    system_prompt = STYLIST_SYSTEM_PROMPT
    if user_preferences:
        system_prompt += f"\n\nUser's style preferences: {user_preferences}"
        
    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        formatted_messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", "")
        })
        
    model = os.getenv("OPENAI_MODEL", "gpt-4o")
    
    try:
        # Run blocking calls in executor if needed, but OpenAI client can run directly or we can use loop.run_in_executor
        import asyncio
        loop = asyncio.get_event_loop()
        completion = await loop.run_in_executor(
            None,
            lambda: client.chat.completions.create(
                model=model,
                messages=formatted_messages,
                max_tokens=1000,
                temperature=0.8
            )
        )
        return completion.choices[0].message.content or "I apologize, I could not generate a response. Please try again."
    except Exception as e:
        print(f"OpenAI chat error: {str(e)}")
        return "I apologize, I encountered an error communicating with OpenAI. Please try again."

async def analyze_fashion_image(image_url: str) -> str:
    client = get_openai_client()
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        completion = await loop.run_in_executor(
            None,
            lambda: client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a luxury fashion analyst. Analyze the clothing in this image and provide detailed insights about style, color palette, occasion suitability, and styling suggestions."
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Analyze this fashion item or outfit:"},
                            {"type": "image_url", "image_url": {"url": image_url}}
                        ]
                    }
                ],
                max_tokens=500
            )
        )
        return completion.choices[0].message.content or "Unable to analyze this image."
    except Exception as e:
        print(f"OpenAI vision error: {str(e)}")
        return f"Error analyzing image: {str(e)}"

async def generate_outfit_suggestions(wardrobe_description: str, occasion: str) -> str:
    client = get_openai_client()
    model = os.getenv("OPENAI_MODEL", "gpt-4o")
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        completion = await loop.run_in_executor(
            None,
            lambda: client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a luxury personal fashion stylist. Generate outfit suggestions based on the user's wardrobe and occasion. Be specific, creative, and consider color coordination, seasonality, and current trends."
                    },
                    {
                        "role": "user",
                        "content": f"My wardrobe includes: {wardrobe_description}\n\nI need outfit suggestions for: {occasion}"
                    }
                ],
                max_tokens=800,
                temperature=0.9
            )
        )
        return completion.choices[0].message.content or "Unable to generate suggestions."
    except Exception as e:
        print(f"OpenAI suggestion error: {str(e)}")
        return f"Error generating suggestions: {str(e)}"

async def generate_dalle_try_on(user_image_url: str, clothing_image_url: str) -> str:
    client = get_openai_client()
    import asyncio
    loop = asyncio.get_event_loop()
    
    print("Analyzing user photo with GPT-4o Vision...")
    
    def analyze_user():
        return client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional fashion image analyzer. Describe the person in this image: their gender, age group, detailed physical features, ethnicity, hair style and color, and their precise location background/setting. Do NOT describe the clothes they are currently wearing. Be highly detailed and write it in a single concise paragraph of 2-3 sentences."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe the person and setting in this photo:"},
                        {"type": "image_url", "image_url": {"url": user_image_url}}
                    ]
                }
            ],
            max_tokens=250
        )
        
    def analyze_cloth():
        return client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert luxury garment catalog describer for a virtual try-on AI system. Your description must enable EXACT visual reproduction. Analyze and describe: 1) Garment type (polo, crew-neck t-shirt, button-up shirt, hoodie, blazer, jacket, etc.) 2) EXACT colors — use specific shade names (e.g. 'navy blue', 'charcoal gray', not just 'blue') 3) All patterns, stripes, prints, or textures with their placement 4) Logo text, brand marks, and their EXACT position on the garment 5) Collar style (round neck, V-neck, button-down collar, hood, mandarin, etc.) 6) Sleeve length and cuff style 7) Zipper, buttons, or closure details 8) Fabric type and texture (cotton jersey, denim, leather, polyester, etc.) 9) Any unique design elements. Write ONE detailed paragraph. Be extremely specific — the AI must reproduce this garment with 95%+ visual accuracy."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe this garment in detail:"},
                        {"type": "image_url", "image_url": {"url": clothing_image_url}}
                    ]
                }
            ],
            max_tokens=250
        )

    print("Analyzing user photo and clothing item with GPT-4o Vision...")
    user_res, cloth_res = await asyncio.gather(
        loop.run_in_executor(None, analyze_user),
        loop.run_in_executor(None, analyze_cloth)
    )
    
    user_description = user_res.choices[0].message.content or "A stylish person in a beautiful location"
    clothing_description = cloth_res.choices[0].message.content or "A stylish garment"
    
    print("Synthesizing DALL-E 3 prompt...")
    dalle_prompt = (f"A premium photorealistic fashion photo of {user_description}. "
                    f"They are wearing EXACTLY this garment: {clothing_description}. "
                    f"CRITICAL: The garment must match the described design with exact colors, patterns, logos, collar style, and details. "
                    f"The clothing must fit naturally on the person's body with realistic fabric folds and wrinkles matching the pose. "
                    f"Sleeves align perfectly with arms. Collar sits naturally at the neckline. No floating or pasted appearance. "
                    f"Match original photo lighting and background atmosphere. "
                    f"8k resolution, cinematic lighting, ultra-detailed fabric textures, professional fashion photography.")
    
    print(f"Calling DALL-E 3 with prompt: {dalle_prompt}")
    
    def run_dalle():
        return client.images.generate(
            model="dalle-3",
            prompt=dalle_prompt,
            n=1,
            size="1024x1024",
            quality="standard"
        )
        
    dalle_res = await loop.run_in_executor(None, run_dalle)
    generated_url = dalle_res.data[0].url
    
    if not generated_url:
        raise ValueError("DALL-E 3 did not return an image URL")
        
    return generated_url


async def analyse_body_with_openai(image_url: str) -> dict:
    client = get_openai_client()
    from services.gemini_service import get_base64_from_url
    import json
    import re
    import asyncio
    
    # Download/decode image to base64 so we are immune to local URL host issues
    image_data = await get_base64_from_url(image_url)
    data_url = f"data:{image_data['mimeType']};base64,{image_data['base64']}"
    
    prompt = """Analyze this image of a person for body measurement and fashion sizing profile.
    
    1. Validation rules:
       - The image must contain a person.
       - The person must be standing and fully visible (at least upper body, preferably full body).
       - The pose should be front-facing (or close to front-facing) to determine proportions.
       - The pose and clothing should allow estimating dimensions.
       - There must not be severe occlusion or poor lighting that prevents size analysis.
       
    2. Size estimation guidelines:
       - Estimate height category relative to average standards: "tall", "average", "petite".
       - Determine body type shape: "Athletic", "Oval", "Rectangle", "Hourglass", "Triangle", or "Inverted Triangle".
       - Determine recommended shirt size: "S", "M", "L", "XL", "XXL", "XXXL".
       - Estimate trouser/waist size in inches (e.g. "30", "32", "34", "36", "38").
       - Suggest the best fit style: "Slim fit", "Regular fit", "Loose fit".
       - Provide standard fit preferences and 3 tailored style recommendations based on their body type.
       
    Return ONLY a raw JSON object with this exact structure (no markdown, no code blocks):
    {
      "isValidPose": true,
      "validationError": null,
      "heightCategory": "tall",
      "bodyType": "Athletic",
      "shirtSize": "L",
      "trouser": "32",
      "bestFit": "Slim fit",
      "fitPreference": "Slim fit",
      "styleRecommendations": ["Style 1", "Style 2", "Style 3"],
      "confidenceScore": 0.95
    }
    
    If the image does not satisfy the validation rules (e.g. it is not a person, not standing, or poorly lit/obscured), set "isValidPose" to false and fill "validationError" with a descriptive error message (e.g., 'The image must contain a person standing front-facing.'). All other sizing fields can be null in that case."""

    loop = asyncio.get_event_loop()
    
    def call_gpt4o():
        return client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional body analysis and fashion styling assistant. You must output JSON format only."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}}
                    ]
                }
            ],
            max_tokens=1000,
            temperature=0.2
        )
        
    completion = await loop.run_in_executor(None, call_gpt4o)
    text = completion.choices[0].message.content or "{}"
    print("[OPENAI] Body analysis response:", text)
    
    json_match = re.search(r"\{[\s\S]*\}", text)
    if not json_match:
        raise ValueError("No JSON structure found in OpenAI body analysis response")
    return json.loads(json_match.group(0))
