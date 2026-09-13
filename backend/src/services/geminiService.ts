import config from '../config';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getBase64FromUrl = async (url: string): Promise<{ base64: string; mimeType: string }> => {
  if (url.startsWith('data:')) {
    const [header, base64] = url.split(',');
    const mimeType = header.split(':')[1].split(';')[0];
    return { base64, mimeType };
  }

  console.log(`[GEMINI] Fetching image from: ${url}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    throw new Error(`Failed to fetch image (HTTP ${response.status}): ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0];
  return { base64: buffer.toString('base64'), mimeType };
};

// ── Image generation models (require billing) ───────────────────────────────
const IMAGE_GEN_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image-preview',
  'gemini-3-pro-image-preview',
];

const ANALYSIS_MODEL = 'gemini-2.5-flash';

// ─── Try image generation models first ──────────────────────────────────────

async function tryImageGeneration(
  apiKey: string,
  prompt: string,
  userData: { base64: string; mimeType: string },
  clothingData: { base64: string; mimeType: string }
): Promise<string | null> {
  for (const modelId of IMAGE_GEN_MODELS) {
    try {
      console.log(`[GEMINI] Trying image generation model: ${modelId}`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
      const payload = {
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: userData.mimeType, data: userData.base64 } },
            { inlineData: { mimeType: clothingData.mimeType, data: clothingData.base64 } },
          ],
        }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'], temperature: 1 },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(120000),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[GEMINI] ${modelId} failed (HTTP ${res.status}):`, errText.substring(0, 200));
        continue;
      }

      const json = (await res.json()) as any;
      const parts = json.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            console.log(`[GEMINI] ✅ ${modelId} generated image!`);
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    } catch (err: any) {
      console.error(`[GEMINI] ${modelId} error:`, err.message?.substring(0, 150));
    }
  }
  return null;
}

// ─── Body landmark detection via Gemini 2.5 Flash (FREE tier) ───────────────
// Returns precise body coordinates as normalized percentages (0-100) of the
// image dimensions. The frontend uses these to position clothing correctly.

async function detectBodyLandmarks(
  apiKey: string,
  userData: { base64: string; mimeType: string },
  clothingData: { base64: string; mimeType: string },
  clothingDesc: string
): Promise<{ analysis: string; positioning: any }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ANALYSIS_MODEL}:generateContent`;

  const prompt = `You are an expert body pose estimation AI for a virtual try-on system.

I am providing TWO images:
- IMAGE 1: A photo of a person (user photo)
- IMAGE 2: A clothing garment (${clothingDesc})

YOUR TASK: Analyze IMAGE 1 and detect the person's body landmarks. Return coordinates as PERCENTAGE values (0-100) relative to the full image width and height.

Think step by step:
1. Find the person's chin/jaw bottom — this is the BOTTOM of the face
2. Find the left shoulder edge and right shoulder edge
3. Find the base of the neck (where neck meets shoulders)
4. Find the waist/hip level
5. Determine how the clothing from IMAGE 2 should be placed

Return a JSON object with these EXACT fields:

{
  "chinBottomY": <number 0-100, Y% of the chin/jaw bottom - clothing must START BELOW this>,
  "neckBaseY": <number 0-100, Y% where neck meets the shoulders>,
  "leftShoulderX": <number 0-100, X% of the LEFT shoulder outer edge>,
  "rightShoulderX": <number 0-100, X% of the RIGHT shoulder outer edge>,
  "leftShoulderY": <number 0-100, Y% of the left shoulder>,
  "rightShoulderY": <number 0-100, Y% of the right shoulder>,
  "chestCenterX": <number 0-100, X% center of the chest>,
  "chestCenterY": <number 0-100, Y% center of the chest>,
  "waistY": <number 0-100, Y% of the waist/belt line>,
  "waistLeftX": <number 0-100, X% of the left waist edge>,
  "waistRightX": <number 0-100, X% of the right waist edge>,
  "bodyTiltDegrees": <number -10 to 10, body rotation in degrees, 0 = upright>,
  "garmentType": "tshirt" | "shirt" | "polo" | "hoodie" | "jacket" | "sweater" | "tank_top" | "other",
  "isUpperBody": true,
  "hasCollar": <boolean>,
  "personFacing": "front" | "slight_left" | "slight_right" | "side",
  "backgroundComplexity": "simple" | "moderate" | "complex"
}

CRITICAL RULES:
- chinBottomY MUST be ABOVE neckBaseY (chinBottomY < neckBaseY in image coordinates where 0=top)
- neckBaseY MUST be ABOVE or AT leftShoulderY/rightShoulderY
- The clothing MUST be placed BELOW chinBottomY to NEVER cover the face
- leftShoulderX should be LESS than rightShoulderX (left side of image)
- All values are percentages (0-100) of the full image dimensions
- 0,0 is the TOP-LEFT corner of the image
- Return ONLY the raw JSON, no markdown, no code blocks, no explanation`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: userData.mimeType, data: userData.base64 } },
        { inlineData: { mimeType: clothingData.mimeType, data: clothingData.base64 } },
      ],
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini body analysis failed (HTTP ${res.status}): ${errText.substring(0, 200)}`);
  }

  const json = (await res.json()) as any;
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('[GEMINI] Body landmark response:', text);

  try {
    // Extract JSON safely using regex from first '{' to last '}'
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON structure found in model response');
    }
    const cleanText = jsonMatch[0];
    const positioning = JSON.parse(cleanText);

    // Validate and fix common issues
    // Ensure clothing starts BELOW the chin
    if (positioning.neckBaseY && positioning.chinBottomY) {
      if (positioning.neckBaseY < positioning.chinBottomY) {
        // Swap — neckBase should be below chin in image coords (higher Y)
        const temp = positioning.neckBaseY;
        positioning.neckBaseY = positioning.chinBottomY;
        positioning.chinBottomY = temp;
      }
    }

    // Ensure shoulders are below neck
    if (positioning.leftShoulderY && positioning.neckBaseY) {
      positioning.leftShoulderY = Math.max(positioning.leftShoulderY, positioning.neckBaseY);
      positioning.rightShoulderY = Math.max(positioning.rightShoulderY || positioning.leftShoulderY, positioning.neckBaseY);
    }

    console.log('[GEMINI] Parsed landmarks:', JSON.stringify(positioning, null, 2));
    return { analysis: text, positioning };
  } catch {
    console.error('[GEMINI] Failed to parse landmarks, using safe defaults');
    return {
      analysis: text,
      positioning: {
        chinBottomY: 28,
        neckBaseY: 32,
        leftShoulderX: 25,
        rightShoulderX: 75,
        leftShoulderY: 34,
        rightShoulderY: 34,
        chestCenterX: 50,
        chestCenterY: 45,
        waistY: 65,
        waistLeftX: 30,
        waistRightX: 70,
        bodyTiltDegrees: 0,
        garmentType: 'tshirt',
        isUpperBody: true,
        hasCollar: false,
        personFacing: 'front',
        backgroundComplexity: 'moderate',
      },
    };
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export const generateGeminiTryOn = async (
  userImageUrl: string,
  clothingImageUrl: string,
  customDescription?: string
): Promise<string> => {
  const apiKey = (config.gemini?.apiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Gemini API Key is not configured.');
  }

  console.log('[GEMINI] Downloading user and clothing images...');
  const [userData, clothingData] = await Promise.all([
    getBase64FromUrl(userImageUrl),
    getBase64FromUrl(clothingImageUrl),
  ]);
  console.log('[GEMINI] Images downloaded.');

  const clothingDesc = customDescription || 'the clothing item shown in the second image';

  // Step 1: Try real image generation (requires billing)
  const imageGenPrompt = `Virtual try-on: Generate a photorealistic image of the person from Image 1 wearing the clothing from Image 2. Keep face, body, pose, background identical. Clothing (${clothingDesc}) must fit naturally. Output only the image.`;
  console.log('[GEMINI] Attempting AI image generation...');
  const generated = await tryImageGeneration(apiKey, imageGenPrompt, userData, clothingData);
  if (generated) return generated;

  // Step 2: Body landmark detection + compositing data (FREE tier)
  console.log('[GEMINI] Using AI body landmark detection for compositing...');
  const { positioning } = await detectBodyLandmarks(apiKey, userData, clothingData, clothingDesc);

  const compositingData = {
    type: 'ai_compositing',
    userImageUrl,
    clothingImageUrl,
    positioning,
  };

  const jsonStr = JSON.stringify(compositingData);
  const b64 = Buffer.from(jsonStr).toString('base64');
  return `data:application/json;base64,${b64}`;
};

export const analyseFaceWithGemini = async (faceImageUrl: string): Promise<any> => {
  const apiKey = (config.gemini?.apiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Gemini API Key is not configured.');
  }

  console.log('[GEMINI] Downloading face image...');
  const faceData = await getBase64FromUrl(faceImageUrl);
  console.log('[GEMINI] Face image downloaded.');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ANALYSIS_MODEL}:generateContent`;

  const prompt = `Analyse this person's photo for fashion styling purposes ONLY. Identify:
1. Skin tone (fair/medium/wheatish/dark)
2. Face shape (oval/round/square/heart)
3. Estimated age group (teen/20s/30s/40s+)
4. Gender

Based on these, suggest best outfit colors, styles, fits and types that would suit this person. Return as JSON:
{
  "skinTone": "Skin tone name (e.g. Wheatish warm)",
  "faceShape": "Face shape name (e.g. Oval)",
  "ageGroup": "Estimated age group (e.g. 20s)",
  "gender": "Estimated gender (e.g. male or female)",
  "recommendedColors": ["Color 1", "Color 2", "Color 3", "Color 4"],
  "recommendedStyles": ["Style 1", "Style 2", "Style 3"],
  "recommendedFits": ["Fit 1", "Fit 2", "Fit 3"],
  "recommendedOccasions": ["Occasion 1", "Occasion 2", "Occasion 3"],
  "avoidColors": ["Color 1", "Color 2"],
  "personalityStyle": "Personality Style vibe (e.g. Smart Casual)",
  "styleExplanation": "A short 1-2 sentence fashion recommendation summary explaining why these styles suit this person."
}

IMPORTANT: Keep analysis strictly fashion-focused. Do NOT infer race, religion, health, income, personality traits, or any other sensitive personal attributes.

Return ONLY the raw JSON block. No markdown, no code blocks, no other text.`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: faceData.mimeType, data: faceData.base64 } },
      ],
    }],
    generationConfig: { temperature: 0.2 },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini face analysis failed (HTTP ${res.status}): ${errText.substring(0, 200)}`);
  }

  const json = (await res.json()) as any;
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('[GEMINI] Face analysis response:', text);

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON structure found in model response');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[GEMINI] Failed to parse face analysis result as JSON:', err);
    throw new Error('Could not parse face analysis result as JSON');
  }
};

export const analyzeClothingImage = async (base64Image: string, mimeType: string) => {
  const apiKey = (config.gemini?.apiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Gemini API Key is not configured.');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ANALYSIS_MODEL}:generateContent`;
  
  const payload = {
    contents: [{
      parts: [
        { text: 'Analyze this clothing image. Return a strict JSON response with the following keys: "category" (tops, bottoms, dresses, outerwear, traditional, activewear, other), "color" (e.g., Black, Navy Blue, Red), "brand" (if a logo is clearly visible, otherwise leave empty string). Example: {"category": "tops", "color": "Blue", "brand": "Nike"}' },
        { inlineData: { mimeType, data: base64Image } }
      ]
    }],
    generationConfig: { temperature: 0.1 }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) throw new Error(`Gemini analyze failed (HTTP ${res.status})`);
  
  const json = (await res.json()) as any;
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON structure found');
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[GEMINI] Failed to parse clothing analysis', text);
    return { category: 'tops', color: 'Unknown', brand: '' };
  }
};

export const generateOutfitSuggestions = async (wardrobeItems: any[]) => {
  const apiKey = (config.gemini?.apiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Gemini API Key is not configured.');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ANALYSIS_MODEL}:generateContent`;
  
  // Format wardrobe items to save tokens
  const formattedWardrobe = wardrobeItems.map(i => `{id:"${i.id}", category:"${i.category}", color:"${i.color}", brand:"${i.brand}", subcategory:"${i.subcategory}"}`).join("\\n");

  const prompt = `You are a professional fashion stylist AI.
Given the following wardrobe items owned by the user:
${formattedWardrobe}

Create 3 DISTINCT outfit combinations (e.g., "Casual Day Out", "Office Ready", "Evening Dinner").
CRITICAL RULES:
1. Each of the 3 outfits MUST be completely different. DO NOT reuse the exact same combination of items.
2. If the user's wardrobe is too small to make 3 distinct outfits, you MUST suggest a missing item (using missingItemQuery) to create variety. 
3. For example, if they only have a Black Tee, use the Black Tee in Outfit 1, but for Outfit 2 suggest a "White Oxford Shirt" as a missing item instead of reusing the Black Tee.
4. An outfit must consist of a Top and a Bottom (or a Dress). Do not include shoes, bags, watches, or accessories.

Return a STRICT JSON response in the exact format:
{
  "outfits": [
    {
      "name": "Outfit Name",
      "occasion": "Casual/Formal/etc",
      "wardrobeItemIds": ["id1", "id2"], // IDs of the items from their wardrobe
      "missingItemQuery": "White Oxford Shirt" // (Optional) A specific, descriptive search query for a real product they should buy to complete this look.
    }
  ]
}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7 }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`Gemini outfit generation failed (HTTP ${res.status})`);
  
  const json = (await res.json()) as any;
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON structure found');
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[GEMINI] Failed to parse outfit suggestions', text);
    throw new Error('Failed to generate outfits from AI');
  }
};

export const analyzeBodyProfile = async (base64Image: string, mimeType: string) => {
  const apiKey = (config.gemini?.apiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Gemini API Key is not configured.');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ANALYSIS_MODEL}:generateContent`;

  const payload = {
    contents: [{
      parts: [
        { text: 'Analyze this full-body photo of a person. Estimate their body metrics for a fashion profile. Return a strict JSON response with the following keys: "heightCategory" (short, average, tall), "bodyType" (Slim, Athletic, Average, Plus-size), "bestFit" (Slim fit, Regular fit, Relaxed fit, Oversized). Example: {"heightCategory": "tall", "bodyType": "Athletic", "bestFit": "Slim fit"}' },
        { inlineData: { mimeType, data: base64Image } }
      ]
    }],
    generationConfig: { temperature: 0.1 }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) throw new Error(`Gemini body analysis failed (HTTP ${res.status})`);
  
  const json = (await res.json()) as any;
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON structure found');
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[GEMINI] Failed to parse body analysis', text);
    throw new Error('Failed to analyze body profile from image');
  }
};

export const analyzeOutfitWithGemini = async (base64Image: string, mimeType: string, productContext: any) => {
  const apiKey = (config.gemini?.apiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Gemini API Key is not configured.');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ANALYSIS_MODEL}:generateContent`;

  const prompt = `You are a professional AI fashion stylist and image analyst. Analyze this Virtual Try-On image of a user wearing a garment.
Product Context:
Name: ${productContext.name || 'Unknown'}
Brand: ${productContext.brand || 'Unknown'}
Price: ${productContext.price || 'Unknown'}

Provide a highly structured Outfit Review following this exact JSON schema:
{
  "score": 8, // (integer 1-10)
  "scoreExplanation": "Short explanation of the score",
  "fit": {
    "quality": "Excellent/Good/Fair/Poor",
    "shoulderAlignment": "Description of shoulder fit",
    "length": "Description of garment length",
    "silhouette": "Description of overall silhouette",
    "appearance": "Description of appearance quality"
  },
  "colorCompatibility": "Explain if clothing colors work well with the outfit",
  "styleCompatibility": "Explain if the clothing works with the overall styling",
  "occasionSuggestions": ["Casual", "College"], // Array of strings
  "pros": ["Observation 1", "Observation 2"], // 2-4 positive observations
  "cons": ["Suggestion 1"], // 1-3 useful suggestions
  "tips": {
    "bottoms": "Suggestion",
    "shoes": "Suggestion",
    "accessories": "Suggestion",
    "layering": "Suggestion"
  },
  "alternativeStyling": ["Alternative 1", "Alternative 2"], // 2-3 alternatives
  "confidence": 92 // (integer 1-100, AI estimate)
}`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: base64Image } }
      ]
    }],
    generationConfig: { 
      temperature: 0.3,
      responseMimeType: "application/json"
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini outfit review failed (HTTP ${res.status}): ${errText.substring(0, 100)}`);
  }
  
  const json = (await res.json()) as any;
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('[GEMINI] Failed to parse outfit review:', text);
    throw new Error('Failed to parse outfit review from AI');
  }
};

