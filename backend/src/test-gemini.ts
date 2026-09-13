import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const getBase64FromUrl = async (url: string): Promise<{ base64: string; mimeType: string }> => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0];
  return { base64: buffer.toString('base64'), mimeType };
};

async function run() {
  try {
    console.log('Running test...');
    const apiKey = process.env.GEMINI_API_KEY || '';
    const userImageUrl = 'http://localhost:5000/api/tryon/image/0aa70fbf-264c-488a-a6ab-2c94c983460f';
    const clothingImageUrl = 'http://localhost:5000/api/tryon/image/8ce6bee0-dbaa-4c20-ac4e-024dc16d17ef';
    
    const [userData, clothingData] = await Promise.all([
      getBase64FromUrl(userImageUrl),
      getBase64FromUrl(clothingImageUrl),
    ]);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
    const prompt = `You are an expert body pose estimation AI for a virtual try-on system.

I am providing TWO images:
- IMAGE 1: A photo of a person (user photo)
- IMAGE 2: A clothing garment (blue tshirt)

YOUR TASK: Analyze IMAGE 1 and detect the person's body landmarks. Return coordinates as PERCENTAGE values (0-100) relative to the full image width and height.

Think step by step:
1. Find the person's chin/jaw bottom — this is the BOTTOM of the face
2. Find the left shoulder edge and right shoulder edge
3. Find the base of the neck (where neck meets shoulders)
4. Find the waist/hip level
5. Determine how the clothing from IMAGE 2 should be placed

Return a JSON object with these EXACT fields:

{
  "chinBottomY": <number 0-100>,
  "neckBaseY": <number 0-100>,
  "leftShoulderX": <number 0-100>,
  "rightShoulderX": <number 0-100>,
  "leftShoulderY": <number 0-100>,
  "rightShoulderY": <number 0-100>,
  "chestCenterX": <number 0-100>,
  "chestCenterY": <number 0-100>,
  "waistY": <number 0-100>,
  "waistLeftX": <number 0-100>,
  "waistRightX": <number 0-100>,
  "bodyTiltDegrees": <number -10 to 10>,
  "garmentType": "tshirt",
  "isUpperBody": true,
  "hasCollar": false,
  "personFacing": "front",
  "backgroundComplexity": "simple"
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
    });

    const json = await res.json() as any;
    console.log('FULL RAW RESPONSE:');
    console.log(JSON.stringify(json, null, 2));

  } catch (error) {
    console.error('ERROR running test:', error);
  }
}

run();
