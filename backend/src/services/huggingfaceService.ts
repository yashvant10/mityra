import config from '../config';

// ─── HuggingFace IDM-VTON Service ────────────────────────────────────────────
// Connects to the yisol/IDM-VTON Gradio Space (v4.24.0, SSE v3 protocol).
//
// Two-step Gradio 4.x API:
//   1. POST /call/tryon  → returns { event_id }
//   2. GET  /call/tryon/{event_id} → SSE stream with result data
// ─────────────────────────────────────────────────────────────────────────────

const HF_SPACE_URL = 'https://yisol-idm-vton.hf.space';

async function toBase64Data(input: string): Promise<{ base64: string; mimeType: string }> {
  if (input.startsWith('data:')) {
    const match = input.match(/^data:([^;]+);base64,(.+)$/);
    if (match) return { mimeType: match[1], base64: match[2] };
  }
  const response = await fetch(input, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Failed to fetch image (HTTP ${response.status}): ${input}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0];
  return { base64: buffer.toString('base64'), mimeType };
}

async function uploadToSpace(base64: string, mimeType: string, filename: string, token: string): Promise<string> {
  const buffer = Buffer.from(base64, 'base64');
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const blob = new Blob([buffer], { type: mimeType });
  const formData = new FormData();
  formData.append('files', blob, `${filename}.${ext}`);

  const res = await fetch(`${HF_SPACE_URL}/upload`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HF upload failed (HTTP ${res.status}): ${err.substring(0, 200)}`);
  }
  const paths = await res.json() as string[];
  console.log(`[HF-IDMVTON] Uploaded ${filename}: ${paths[0]}`);
  return paths[0];
}

export async function runHuggingFaceTryOn(
  userImageBase64: string,
  userImageMimeType: string,
  clothingImageBase64: string,
  clothingImageMimeType: string,
  description?: string,
  useToken: boolean = true
): Promise<string> {
  const token = useToken ? (config.huggingface?.token || process.env.HUGGINGFACE_TOKEN || '').trim() : '';

  console.log(`[HF-IDMVTON] Starting IDM-VTON try-on (Auth: ${token ? 'Bearer Token' : 'None'})...`);

  try {
    // Step 1: Upload images
    const personPath = await uploadToSpace(userImageBase64, userImageMimeType, 'person', token);
    const garmentPath = await uploadToSpace(clothingImageBase64, clothingImageMimeType, 'garment', token);

    const garmentDesc = description || 'A fashion garment';
    console.log('[HF-IDMVTON] Files uploaded. Calling /call/tryon...');

    // Step 2: POST /call/tryon to start the job (Gradio 4.x SSE v3 protocol)
    const payload = {
      data: [
        // param: dict (ImageEditor) — person image
        {
          background: {
            path: personPath,
            url: `${HF_SPACE_URL}/file=${personPath}`,
            orig_name: 'person.jpg',
            mime_type: userImageMimeType,
            is_stream: false,
            meta: { _type: 'gradio.FileData' },
          },
          layers: [],
          composite: null,
        },
        // param: garm_img (Image) — garment
        {
          path: garmentPath,
          url: `${HF_SPACE_URL}/file=${garmentPath}`,
          orig_name: 'garment.jpg',
          mime_type: clothingImageMimeType,
          is_stream: false,
          meta: { _type: 'gradio.FileData' },
        },
        // param: garment_des (Textbox)
        garmentDesc,
        // param: is_checked (Checkbox) — auto-mask
        true,
        // param: is_checked_crop (Checkbox) — auto-crop person for optimal alignment
        true,
        // param: denoise_steps (Number) — higher steps for HD output
        40,
        // param: seed (Number)
        42,
      ],
    };

    let callRes = await fetch(`${HF_SPACE_URL}/call/tryon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });

    if (callRes.status === 404 || callRes.status === 503) {
      console.log(`[HF-IDMVTON] Space might be sleeping (HTTP ${callRes.status}). Sending wakeup request...`);
      try {
        await fetch('https://huggingface.co/api/spaces/yisol/IDM-VTON', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        console.log('[HF-IDMVTON] Wakeup signal sent. Waiting 8 seconds for Space startup...');
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        console.log('[HF-IDMVTON] Retrying /call/tryon...');
        callRes = await fetch(`${HF_SPACE_URL}/call/tryon`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000),
        });
      } catch (e: any) {
        console.error('[HF-IDMVTON] Wakeup attempt failed:', e.message);
      }
    }

    if (!callRes.ok) {
      const errText = await callRes.text();
      console.error(`[HF-IDMVTON] /call/tryon failed (HTTP ${callRes.status}):`, errText.substring(0, 300));
      throw new Error(`HuggingFace IDM-VTON failed (HTTP ${callRes.status}). The Space may be sleeping or overloaded. Try again in a few minutes.`);
    }

    const callData = await callRes.json() as { event_id: string };
    const eventId = callData.event_id;
    console.log(`[HF-IDMVTON] Job submitted. Event ID: ${eventId}`);

    // Step 3: GET /call/tryon/{event_id} — SSE stream for results
    // Poll until we get the "complete" event with output data
    console.log('[HF-IDMVTON] Polling for results via SSE...');

    const sseRes = await fetch(`${HF_SPACE_URL}/call/tryon/${eventId}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(300000), // 5 min for GPU inference
    });

    if (!sseRes.ok) {
      throw new Error(`HF SSE stream failed (HTTP ${sseRes.status})`);
    }

    const sseText = await sseRes.text();
    console.log('[HF-IDMVTON] SSE response length:', sseText.length);

    // Parse SSE events — format is: "event: xxx\ndata: yyy\n\n"
    const events = sseText.split('\n\n').filter(Boolean);
    let resultData: any = null;

    for (const event of events) {
      const lines = event.trim().split('\n');
      let eventType = '';
      let dataLine = '';

      for (const line of lines) {
        if (line.startsWith('event:')) eventType = line.substring(6).trim();
        if (line.startsWith('data:')) dataLine = line.substring(5).trim();
      }

      console.log(`[HF-IDMVTON] SSE event: ${eventType}`);

      if (eventType === 'error') {
        throw new Error(`HuggingFace IDM-VTON error: ${dataLine}`);
      }

      if (eventType === 'complete') {
        try {
          resultData = JSON.parse(dataLine);
        } catch {
          console.error('[HF-IDMVTON] Failed to parse complete data:', dataLine.substring(0, 200));
        }
        break;
      }
    }

    if (!resultData || !Array.isArray(resultData)) {
      throw new Error('HuggingFace IDM-VTON returned no result data');
    }

    // Extract result image — first element is the try-on output
    const outputImage = resultData[0];
    let resultUrl = '';

    if (typeof outputImage === 'string') {
      resultUrl = outputImage;
    } else if (outputImage?.url) {
      resultUrl = outputImage.url;
    } else if (outputImage?.path) {
      resultUrl = `${HF_SPACE_URL}/file=${outputImage.path}`;
    }

    if (!resultUrl) {
      console.error('[HF-IDMVTON] Cannot extract URL from:', JSON.stringify(outputImage).substring(0, 300));
      throw new Error('Could not extract result image from HuggingFace response');
    }

    console.log('[HF-IDMVTON] ✅ Result URL:', resultUrl.substring(0, 120));

    // Fetch result and convert to base64 data URL
    try {
      const imgRes = await fetch(resultUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(30000),
      });
      if (imgRes.ok) {
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
        const imgMime = (imgRes.headers.get('content-type') || 'image/png').split(';')[0];
        console.log('[HF-IDMVTON] ✅ Converted result to base64 data URL');
        return `data:${imgMime};base64,${imgBuffer.toString('base64')}`;
      }
    } catch (e: any) {
      console.warn('[HF-IDMVTON] Could not fetch result image:', e.message);
    }

    return resultUrl;
  } catch (error: any) {
    const hasConfigToken = !!(config.huggingface?.token || process.env.HUGGINGFACE_TOKEN);
    if (useToken && hasConfigToken) {
      console.warn(`[HF-IDMVTON] Try-on failed with token: "${error.message}". Retrying WITHOUT token (anonymous access)...`);
      return runHuggingFaceTryOn(
        userImageBase64,
        userImageMimeType,
        clothingImageBase64,
        clothingImageMimeType,
        description,
        false // Retry without token
      );
    }
    throw error;
  }
}

export async function runHuggingFaceTryOnFromUrls(
  userImageUrl: string,
  clothingImageUrl: string,
  description?: string
): Promise<string> {
  console.log('[HF-IDMVTON] Converting image URLs to base64...');
  const [userData, clothingData] = await Promise.all([
    toBase64Data(userImageUrl),
    toBase64Data(clothingImageUrl),
  ]);
  return runHuggingFaceTryOn(
    userData.base64, userData.mimeType,
    clothingData.base64, clothingData.mimeType,
    description
  );
}
