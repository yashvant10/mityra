import config from '../config';

export const runReplicateTryOn = async (
  userImageUrl: string,
  clothingImageUrl: string,
  description?: string
): Promise<string> => {
  console.log('[DEBUG-REPLICATE] Verifying REPLICATE_API_TOKEN presence...');
  const token = (process.env.REPLICATE_API_TOKEN || '').trim();
  console.log('[DEBUG-REPLICATE] REPLICATE_API_TOKEN exists:', !!token);
  
  if (!token) {
    throw new Error('Replicate API Token (REPLICATE_API_TOKEN) is not configured in your backend .env file.');
  }

  // Validate that URLs are public secure HTTPS URLs
  console.log('[DEBUG-VALIDATION] Validating image URLs for Replicate...');
  console.log('[DEBUG-VALIDATION] Human Image URL:', userImageUrl);
  console.log('[DEBUG-VALIDATION] Garment Image URL:', clothingImageUrl);

  // Allow HTTPS URLs, but also accept http://localhost (used for in‑memory store)
  const allowHttpLocal = (urlStr: string) => {
    try {
      const u = new URL(urlStr);
      return (
        u.protocol === 'https:' ||
        (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1'))
      );
    } catch {
      return false;
    }
  };

  if (!allowHttpLocal(userImageUrl)) {
    throw new Error(`Human image URL must be an HTTPS URL. Got: ${userImageUrl}`);
  }
  if (!allowHttpLocal(clothingImageUrl)) {
    throw new Error(`Clothing image URL must be an HTTPS URL. Got: ${clothingImageUrl}`);
  }

  const payload = {
    version: '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985',
    input: {
      human_img: userImageUrl,
      garm_img: clothingImageUrl,
      garment_des: description || 'pink polo short sleeve round neck t-shirt with black collars and BEYOND SELF written on chest',
      category: 'upper_body',
      crop: true,
    },
  };

  console.log('[DEBUG-REPLICATE] Sending request to Replicate predictions endpoint...');
  console.log('[DEBUG-REPLICATE] Request Payload:\n', JSON.stringify(payload, null, 2));

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log('[DEBUG-REPLICATE] Prediction dispatch response status:', response.status);

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as any;
    console.error('[DEBUG-REPLICATE] Prediction dispatch failed. Error response:', JSON.stringify(errorData, null, 2));
    throw new Error(errorData.detail || `Replicate API Error (HTTP ${response.status}): ${JSON.stringify(errorData)}`);
  }

  let prediction = (await response.json()) as any;
  const predictionId = prediction.id;
  console.log(`[DEBUG-REPLICATE] Prediction successfully created! ID: ${predictionId}`);
  console.log('[DEBUG-REPLICATE] Initial Prediction State:', JSON.stringify(prediction, null, 2));

  // Poll for completion (max 2 minutes, polling every 3 seconds)
  const maxAttempts = 40;
  console.log('[DEBUG-REPLICATE] Starting polling pipeline...');
  
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`[DEBUG-REPLICATE] Polling check ${i + 1}/${maxAttempts}...`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        'Authorization': `Token ${token}`,
      },
    });

    if (!pollResponse.ok) {
      console.warn(`[DEBUG-REPLICATE] Warning: Failed to fetch prediction status (HTTP ${pollResponse.status}), retrying...`);
      continue;
    }

    prediction = (await pollResponse.json()) as any;
    console.log(`[DEBUG-REPLICATE] Status update: "${prediction.status}"`);

    if (prediction.error) {
      console.error('[DEBUG-REPLICATE] Prediction reported error:', prediction.error);
    }
    
    if (prediction.logs) {
      console.log('[DEBUG-REPLICATE] Model execution progress logs excerpt:\n', prediction.logs.split('\n').slice(-3).join('\n'));
    }

    if (prediction.status === 'succeeded') {
      const output = prediction.output;
      console.log('[DEBUG-REPLICATE] Prediction succeeded! Raw Output:', JSON.stringify(output, null, 2));
      
      let finalUrl = '';
      if (Array.isArray(output) && output.length > 0) {
        finalUrl = output[0];
      } else if (typeof output === 'string') {
        finalUrl = output;
      }

      if (!finalUrl) {
        throw new Error('Prediction succeeded but output URL was empty or invalid.');
      }

      console.log('[DEBUG-REPLICATE] Verified generated image URL:', finalUrl);
      return finalUrl;
    } else if (prediction.status === 'failed') {
      throw new Error(`Replicate VTON failed: ${prediction.error || 'Check Replicate dashboard logs.'}`);
    } else if (prediction.status === 'canceled') {
      throw new Error('Replicate VTON prediction was canceled by the server.');
    }
  }

  throw new Error('Replicate prediction polling timed out after 2 minutes. Please try again.');
};
